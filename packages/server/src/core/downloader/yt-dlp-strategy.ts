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

    const stream = new Readable({
      read() {
        process.stdout.on('data', (chunk: Buffer) => {
          this.push(chunk);
        });
        process.stdout.on('end', () => this.push(null));
        process.stderr.on('data', () => {});
      },
    });

    process.on('error', () => {
      stream.destroy(new Error('yt-dlp failed'));
    });

    return stream;
  }
}
