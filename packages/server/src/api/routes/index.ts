import { Router } from 'express';
import { analyze } from '../controllers/analyze.controller.js';
import { startDownload, getJob, downloadFile, streamSSE, startBatchDownload, getBatch } from '../controllers/download.controller.js';
import { getPlaylist, getRelated } from '../controllers/playlist.controller.js';
import { validateUrl } from '../middleware/validate-url.js';
import { apiLimiter, downloadLimiter } from '../middleware/rate-limit.js';

const router = Router();

router.post('/analyze', apiLimiter, validateUrl, analyze);
router.post('/download', downloadLimiter, validateUrl, startDownload);
router.post('/batch', downloadLimiter, startBatchDownload);
router.get('/jobs/:id', apiLimiter, getJob);
router.get('/jobs/:id/stream', streamSSE);
router.get('/download/:id', downloadFile);
router.post('/playlist', apiLimiter, validateUrl, getPlaylist);
router.get('/related/:videoId', apiLimiter, getRelated);
router.get('/batch/:id', apiLimiter, getBatch);
router.get('/batch/:id/stream', streamSSE);

export default router;
