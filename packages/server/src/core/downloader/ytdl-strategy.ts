import ytdl from 'ytdl-core';
import { Readable } from 'stream';
import { DownloadQuality } from '../types.js';

export class YtdlStrategy {
  getAudioStream(url: string, quality: DownloadQuality = '192'): Readable {
    return ytdl(url, {
      quality: 'lowestaudio',
      filter: 'audioonly',
    });
  }
}
