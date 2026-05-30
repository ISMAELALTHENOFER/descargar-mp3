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
    strategy: DownloaderStrategy = 'yt-dlp'
  ): Readable {
    const downloader = this.strategies[strategy];
    try {
      console.log(`[DownloaderFactory] Using strategy: ${strategy} for ${url}`);
      return downloader.getAudioStream(url, quality);
    } catch (err) {
      console.log(`[DownloaderFactory] Strategy ${strategy} failed:`, (err as Error).message);
      if (strategy === 'yt-dlp') {
        console.log('[DownloaderFactory] Falling back to ytdl-core');
        return this.strategies['ytdl'].getAudioStream(url, quality);
      }
      throw new Error('Download failed with all strategies');
    }
  }
}
