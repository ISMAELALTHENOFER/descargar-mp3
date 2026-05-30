import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { metadataService } from '../../core/metadata/metadata.service.js';
import { DownloaderFactory } from '../../core/downloader/index.js';
import { ffmpegConverter } from '../../core/converter/ffmpeg-converter.js';
import { jobQueue } from '../../services/queue/job-queue.js';
import { sseManager } from '../../infra/sse/sse-manager.js';
import type {
  Job,
  JobStatus,
  DownloadQuality,
  BatchDownloadRequest,
} from '../../core/types.js';

const jobs = new Map<string, Job>();
const batches = new Map<string, string[]>();

export async function startDownload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url, quality = '192' as DownloadQuality } = req.body;
    console.log(`[Download] Single download requested: ${url} (${quality}kbps)`);

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

    processJob(jobId, url, quality);

    res.json({ jobId });
  } catch (err) {
    next(err);
  }
}

export async function startBatchDownload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { urls, quality = '192' as DownloadQuality } = req.body as BatchDownloadRequest;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    console.log(`[Batch] Starting batch download: ${urls.length} items at ${quality}kbps`);

    const batchId = randomUUID();
    const jobEntries: { jobId: string; url: string }[] = [];

    for (const url of urls.slice(0, 100)) {
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
      jobEntries.push({ jobId, url });

      processJob(jobId, url, quality, batchId);
    }

    batches.set(batchId, jobEntries.map((j) => j.jobId));
    console.log(`[Batch] Batch ${batchId.slice(0, 8)} created with ${jobEntries.length} jobs`);

    res.json({ batchId, jobs: jobEntries });
  } catch (err) {
    next(err);
  }
}

function processJob(jobId: string, url: string, quality: DownloadQuality, batchId?: string) {
  jobQueue.add(async () => {
    const job = jobs.get(jobId);
    if (!job) return;

    console.log(`[Job ${jobId.slice(0, 8)}] Starting processing for: ${url}`);

    try {
      updateJob(jobId, 'analyzing', 0);
      console.log(`[Job ${jobId.slice(0, 8)}] Analyzing metadata...`);
      sseManager.send({ type: 'status', jobId, data: { status: 'analyzing', batchId } });

      const metadata = await metadataService.getInfo(url);
      job.metadata = metadata;
      console.log(`[Job ${jobId.slice(0, 8)}] Metadata loaded: "${metadata.title}"`);

      updateJob(jobId, 'downloading', 10);
      console.log(`[Job ${jobId.slice(0, 8)}] Downloading audio stream...`);
      sseManager.send({ type: 'status', jobId, data: { status: 'downloading', batchId } });

      const audioStream = DownloaderFactory.getStream(url, quality);

      const convertedStream = ffmpegConverter.convert(
        audioStream,
        quality,
        (progress) => {
          const p = 10 + Math.round(progress * 0.85);
          updateJob(jobId, 'converting', p);
          sseManager.send({
            type: 'progress',
            jobId,
            data: { progress: p, batchId },
          });
        }
      );

      console.log(`[Job ${jobId.slice(0, 8)}] Converting to MP3 (${quality}kbps)...`);
      const chunks: Buffer[] = [];
      for await (const chunk of convertedStream) {
        chunks.push(chunk as Buffer);
      }

      const buffer = Buffer.concat(chunks);
      const filename = `${metadata.title.replace(/[^\w\s]/g, '')}.mp3`;

      job.buffer = buffer;
      job.filename = filename;
      job.status = 'done';
      job.progress = 100;

      console.log(`[Job ${jobId.slice(0, 8)}] Done! File: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

      sseManager.send({
        type: 'done',
        jobId,
        data: { filename, batchId, downloadUrl: `/api/v1/download/${jobId}` },
      });

      if (batchId) {
        sseManager.send({
          type: 'batch-progress',
          jobId: batchId,
          data: getBatchProgress(batchId),
        });
      }
    } catch (err) {
      console.error(`[Job ${jobId.slice(0, 8)}] Error:`, (err as Error).message);
      job.status = 'error';
      job.error = (err as Error).message;
      sseManager.send({
        type: 'error',
        jobId,
        data: { error: job.error, batchId },
      });

      if (batchId) {
        sseManager.send({
          type: 'batch-progress',
          jobId: batchId,
          data: getBatchProgress(batchId),
        });
      }
    }
  });
}

function getBatchProgress(batchId: string) {
  const batchJobIds = batches.get(batchId);
  if (!batchJobIds) return { total: 0, done: 0, error: 0 };

  let done = 0;
  let errors = 0;
  for (const id of batchJobIds) {
    const j = jobs.get(id);
    if (j?.status === 'done') done++;
    if (j?.status === 'error') errors++;
  }

  return {
    total: batchJobIds.length,
    done,
    error: errors,
    jobs: batchJobIds.map((id) => {
      const j = jobs.get(id);
      return {
        id,
        status: j?.status ?? 'queued',
        progress: j?.progress ?? 0,
        title: j?.metadata?.title,
        error: j?.error,
      };
    }),
  };
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

export async function getBatch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const progress = getBatchProgress(id);
    if (progress.total === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(progress);
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

    if (job.buffer) {
      const filename = job.filename || `${job.metadata.title.replace(/[^\w\s]/g, '')}.mp3`;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`
      );
      res.end(job.buffer);
      jobs.delete(id);
      return;
    }

    const audioStream = DownloaderFactory.getStream(job.url);
    const convertedStream = ffmpegConverter.convert(audioStream);

    const filename = `${job.metadata.title.replace(/[^\w\s]/g, '')}.mp3`;
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
