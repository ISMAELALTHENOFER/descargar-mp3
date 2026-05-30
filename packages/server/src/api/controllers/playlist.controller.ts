import { Request, Response, NextFunction } from 'express';
import ytdl from 'ytdl-core';
import { metadataService } from '../../core/metadata/metadata.service.js';
import { YtDlpStrategy } from '../../core/downloader/yt-dlp-strategy.js';
import type { PlaylistItem } from '../../core/types.js';

export async function getPlaylist(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.body;

    try {
      const playlistData = await YtDlpStrategy.getPlaylistInfo(url);

      const results = await Promise.allSettled(
        playlistData.items.map(async (item) => {
          try {
            const metadata = await metadataService.getInfo(
              item.url || `https://youtube.com/watch?v=${item.id}`
            );
            return {
              id: item.id,
              title: metadata.title,
              thumbnail: metadata.thumbnail,
              url: item.url || `https://youtube.com/watch?v=${item.id}`,
              duration: metadata.duration,
            };
          } catch {
            return {
              id: item.id,
              title: item.title,
              thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
              url: item.url || `https://youtube.com/watch?v=${item.id}`,
            };
          }
        })
      );

      const resolvedItems: PlaylistItem[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          resolvedItems.push(r.value);
        }
      }

      res.json({
        title: playlistData.title,
        items: resolvedItems,
        totalItems: resolvedItems.length,
      });
    } catch {
      if (!url.includes('list=')) {
        return res.status(400).json({ error: 'URL is not a playlist' });
      }

      const info = await ytdl.getInfo(url);
      const details = info.videoDetails;
      const rawDetails = details as unknown as Record<string, unknown>;
      const playlistTitle = (rawDetails.playlist_title as string | undefined)
        || details.title
        || 'Playlist';

      res.json({
        title: playlistTitle,
        items: [
          {
            id: details.videoId,
            title: details.title,
            thumbnail: details.thumbnails?.slice(-1)[0]?.url ?? '',
            url: `https://youtube.com/watch?v=${details.videoId}`,
            duration: parseInt(String(details.lengthSeconds ?? '0')),
          },
        ],
        totalItems: 1,
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function getRelated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { videoId } = req.params;
    const url = `https://youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(url);

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

    res.json({ items: related });
  } catch (err) {
    next(err);
  }
}
