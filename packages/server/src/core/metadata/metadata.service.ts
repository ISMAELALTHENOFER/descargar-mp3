import ytdl from 'ytdl-core';
import { metadataCache } from '../../services/cache/metadata-cache.js';
import { VideoMetadata } from '../types.js';
import { YtDlpMetadataStrategy } from './yt-dlp-metadata.js';

const ytDlpMetadata = new YtDlpMetadataStrategy();

export class MetadataService {
  async getInfo(url: string): Promise<VideoMetadata> {
    const cacheKey = `metadata:${url}`;

    const cached = metadataCache.get<VideoMetadata>(cacheKey);
    if (cached) return cached;

    let metadata: VideoMetadata;
    try {
      metadata = await this.getInfoFromYtdl(url);
    } catch {
      metadata = await ytDlpMetadata.getInfo(url);
    }

    metadataCache.set(cacheKey, metadata);
    return metadata;
  }

  private async getInfoFromYtdl(url: string): Promise<VideoMetadata> {
    const info = await ytdl.getInfo(url);

    const formats = info.formats
      .filter((f) => f.hasAudio)
      .map((f) => ({
        itag: f.itag,
        quality: f.audioQuality ?? 'unknown',
        bitrate: f.audioBitrate ?? 0,
        container: f.container ?? 'unknown',
        hasAudio: f.hasAudio,
      }));

    const related =
      info.related_videos?.map((v) => ({
        id: v.id ?? '',
        title: v.title ?? 'Unknown',
        thumbnail:
          v.thumbnails?.[0]?.url ??
          `https://i.ytimg.com/vi/${v.id}/default.jpg`,
        duration: v.length_seconds ?? 0,
        author: typeof v.author === 'string' ? v.author : v.author?.name ?? v.author?.user ?? 'Unknown',
      })) ?? [];

    return {
      id: info.videoDetails.videoId,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds, 10),
      thumbnail:
        info.videoDetails.thumbnails?.slice(-1)[0]?.url ?? '',
      author: info.videoDetails.author.name,
      url,
      formats,
      related,
    };
  }
}

export const metadataService = new MetadataService();
