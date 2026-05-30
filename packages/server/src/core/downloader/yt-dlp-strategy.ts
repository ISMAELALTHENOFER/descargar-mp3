import { spawn } from 'child_process';
import { Readable } from 'stream';
import { DownloadQuality } from '../types.js';

export class YtDlpStrategy {
  getAudioStream(
    url: string,
    quality: DownloadQuality = '192'
  ): Readable {
    const args = [
      '-f',
      'bestaudio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      quality,
      '-o',
      '-',
      url,
    ];

    const process = spawn('yt-dlp', args);

    let destroyed = false;

    const stream = new Readable({
      read() {},
      destroy(err, cb) {
        destroyed = true;
        process.kill();
        cb(err as Error | null);
      },
    });

    process.stdout.on('data', (chunk: Buffer) => {
      if (!destroyed) stream.push(chunk);
    });
    process.stdout.on('end', () => {
      if (!destroyed) stream.push(null);
    });
    process.stderr.on('data', () => {});

    process.on('error', (err) => {
      if (!destroyed) stream.destroy(err);
    });

    process.on('close', () => {
      if (!destroyed) stream.push(null);
    });

    return stream;
  }

  static async getPlaylistInfo(
    url: string
  ): Promise<{ title: string; items: { id: string; title: string; url: string }[] }> {
    return new Promise((resolve, reject) => {
      const args = [
        '--flat-playlist',
        '--dump-json',
        '--no-warnings',
        url,
      ];

      const process = spawn('yt-dlp', args);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      process.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      process.on('close', (code) => {
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
          return;
        }

        const lines = stdout.trim().split('\n').filter(Boolean);
        const items: { id: string; title: string; url: string }[] = [];
        let title = 'Playlist';

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.playlist_title) {
              title = entry.playlist_title;
            }
            if (entry.id && entry.title) {
              items.push({
                id: entry.id,
                title: entry.title,
                url: entry.url || entry.webpage_url || `https://youtube.com/watch?v=${entry.id}`,
              });
            }
          } catch {
            // skip non-JSON lines
          }
        }

        resolve({ title, items });
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }
}
