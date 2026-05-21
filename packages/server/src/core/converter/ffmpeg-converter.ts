import { Readable, PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { DownloadQuality } from '../types.js';

export class FFmpegConverter {
  convert(
    inputStream: Readable,
    quality: DownloadQuality = '192',
    onProgress?: (percent: number) => void
  ): PassThrough {
    const outputStream = new PassThrough();

    const bitrate = `${quality}k`;

    ffmpeg(inputStream)
      .audioBitrate(parseInt(quality, 10))
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('progress', (info) => {
        if (onProgress && info.percent) {
          onProgress(Math.min(info.percent, 100));
        }
      })
      .on('end', () => {
        outputStream.end();
      })
      .on('error', (err) => {
        outputStream.destroy(err);
      })
      .pipe(outputStream, { end: true });

    return outputStream;
  }
}

export const ffmpegConverter = new FFmpegConverter();
