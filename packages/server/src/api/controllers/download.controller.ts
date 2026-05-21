import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { metadataService } from '../../core/metadata/metadata.service.js';
import { DownloaderFactory } from '../../core/downloader/index.js';
import { ffmpegConverter } from '../../core/converter/ffmpeg-converter.js';
import { jobQueue } from '../../services/queue/job-queue.js';
import { sseManager } from '../../infra/sse/sse-manager.js';
import { Job, JobStatus } from '../../core/types.js';

const jobs = new Map<string, Job>();

export async function startDownload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url, quality = '192' } = req.body;

    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      url,
      status: 'queued',
      progress: 0,
      metadata: null,
      error: null,
      createdAt: new Date(),
    };
    jobs.set(jobId, job);

    jobQueue.add(async () => {
      try {
        updateJob(jobId, 'analyzing', 0);
        sseManager.send({ type: 'status', jobId, data: { status: 'analyzing' } });

        const metadata = await metadataService.getInfo(url);
        job.metadata = metadata;

        updateJob(jobId, 'downloading', 10);
        sseManager.send({ type: 'status', jobId, data: { status: 'downloading' } });

        const audioStream = DownloaderFactory.getStream(url, quality);

        const convertedStream = ffmpegConverter.convert(
          audioStream,
          quality,
          (progress) => {
            const p = 10 + Math.round(progress * 0.85);
            updateJob(jobId, 'converting', p);
            sseManager.send({ type: 'progress', jobId, data: { progress: p } });
          }
        );

        const chunks: Buffer[] = [];
        for await (const chunk of convertedStream) {
          chunks.push(chunk as Buffer);
        }

        const buffer = Buffer.concat(chunks);
        job.status = 'done';
        job.progress = 100;

        sseManager.send({ type: 'done', jobId, data: { buffer, filename: `${metadata.title}.mp3` } });
      } catch (err) {
        job.status = 'error';
        job.error = (err as Error).message;
        sseManager.send({ type: 'error', jobId, data: { error: job.error } });
      }
    });

    res.json({ jobId });
  } catch (err) {
    next(err);
  }
}

export async function getJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const job = jobs.get(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function downloadFile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const job = jobs.get(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'done' || !job.metadata) {
      return res.status(400).json({ error: 'Job not ready' });
    }

    const metadata = job.metadata;
    const audioStream = DownloaderFactory.getStream(job.url);
    const convertedStream = ffmpegConverter.convert(audioStream);

    const filename = `${metadata.title.replace(/[^\w\s]/g, '')}.mp3`;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    convertedStream.pipe(res);
    jobs.delete(id);
  } catch (err) {
    next(err);
  }
}

export async function streamSSE(
  req: Request,
  res: Response
) {
  const { id } = req.params;
  const clientId = randomUUID();
  sseManager.addClient(clientId, id, res);
}

function updateJob(jobId: string, status: JobStatus, progress: number) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    job.progress = progress;
  }
}
