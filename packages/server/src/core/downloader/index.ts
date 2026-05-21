import { Readable } from 'stream';
import { DownloadQuality } from '../types.js';
import { YtdlStrategy } from './ytdl-strategy.js';
import { YtDlpStrategy } from './yt-dlp-strategy.js';

export type DownloaderStrategy = 'ytdl' | 'yt-dlp';

export class DownloaderFactory {
  private static strategies = {
    ytdl: new YtdlStrategy(),
    'yt-dlp': new YtDlpStrategy(),
  };

  static getStream(
    url: string,
    quality: DownloadQuality = '192',
    strategy: DownloaderStrategy = 'ytdl'
  ): Readable {
    const downloader = this.strategies[strategy];
    try {
      return downloader.getAudioStream(url, quality);
    } catch {
      if (strategy === 'ytdl') {
        return this.strategies['yt-dlp'].getAudioStream(url, quality);
      }
      throw new Error('Download failed with all strategies');
    }
  }
}
