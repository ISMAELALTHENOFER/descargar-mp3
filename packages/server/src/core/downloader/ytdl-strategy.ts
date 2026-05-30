import ytdl from 'ytdl-core';
import { Readable } from 'stream';
import { DownloadQuality } from '../types.js';

const qualityMap: Record<DownloadQuality, string> = {
  '128': 'lowestaudio',
  '192': 'lowestaudio',
  '320': 'highestaudio',
};

export class YtdlStrategy {
  getAudioStream(url: string, quality: DownloadQuality = '192'): Readable {
    return ytdl(url, {
      quality: qualityMap[quality],
      filter: 'audioonly',
    });
  }
}
