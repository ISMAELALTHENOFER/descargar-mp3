import { Request, Response, NextFunction } from 'express';
import ytdl from 'ytdl-core';

export async function getPlaylist(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.body;

    if (!url.includes('list=')) {
      return res.status(400).json({ error: 'URL is not a playlist' });
    }

    const info = await ytdl.getInfo(url);
    const playlist = info.videoDetails;

    res.json({
      title: playlist.title,
      items: [
        {
          id: playlist.videoId,
          title: playlist.title,
          thumbnail: playlist.thumbnails?.slice(-1)[0]?.url ?? '',
          url: `https://youtube.com/watch?v=${playlist.videoId}`,
        },
      ],
    });
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
