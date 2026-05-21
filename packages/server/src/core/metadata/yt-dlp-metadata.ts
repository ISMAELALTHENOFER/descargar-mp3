import { spawn } from 'child_process';
import { VideoMetadata, AudioFormat } from '../types.js';

interface YtDlpFormat {
  format_id: string;
  ext: string;
  abr?: number;
  vcodec: string;
  acodec: string;
}

interface YtDlpOutput {
  id: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  channel?: string;
  channel_id?: string;
  uploader?: string;
  channel_url?: string;
  webpage_url?: string;
  formats?: YtDlpFormat[];
}

export class YtDlpMetadataStrategy {
  async getInfo(url: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const process = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url,
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      process.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      process.on('close', (code) => {
        if (code !== 0 || !stdout) {
          reject(new Error(`yt-dlp failed: ${stderr || 'Process exited with code ' + code}`));
          return;
        }

        try {
          const firstLine = stdout.trim().split('\n')[0];
          const data: YtDlpOutput = JSON.parse(firstLine);
          resolve(this.mapToMetadata(data, url));
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp output: ${(e as Error).message}`));
        }
      });

      process.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('yt-dlp not found. Install yt-dlp or check PATH'));
        } else {
          reject(new Error(`yt-dlp error: ${err.message}`));
        }
      });
    });
  }

  private mapToMetadata(data: YtDlpOutput, url: string): VideoMetadata {
    const formats: AudioFormat[] = (data.formats ?? [])
      .filter((f) => f.acodec !== 'none')
      .map((f) => ({
        itag: parseInt(f.format_id, 10) || 0,
        quality: f.abr ? `${f.abr}kbps` : 'unknown',
        bitrate: f.abr ?? 0,
        container: f.ext ?? 'unknown',
        hasAudio: true,
      }));

    return {
      id: data.id,
      title: data.title,
      duration: data.duration ?? 0,
      thumbnail: data.thumbnail ?? `https://i.ytimg.com/vi/${data.id}/maxresdefault.jpg`,
      author: data.channel ?? data.uploader ?? 'Unknown',
      url,
      formats,
      related: [],
    };
  }
}
