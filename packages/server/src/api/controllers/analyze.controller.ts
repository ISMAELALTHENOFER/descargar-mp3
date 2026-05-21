import { Request, Response, NextFunction } from 'express';
import { metadataService } from '../../core/metadata/metadata.service.js';

export async function analyze(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.body;
    const metadata = await metadataService.getInfo(url);
    res.json(metadata);
  } catch (err) {
    next(err);
  }
}
