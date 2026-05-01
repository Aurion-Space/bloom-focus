import { Router } from 'express';
import db from '../db.js';
import QRCode from 'qrcode';
import { getPublicBaseUrl } from '../config.js';
import { createRateLimitMiddleware, qrRateLimiter } from '../lib/rate-limit.js';
import { serializeSession } from '../lib/dates.js';

const router = Router();

router.get(
  ['/qr/:slug.png', '/:slug.png'],
  createRateLimitMiddleware({
    limiter: qrRateLimiter,
  }),
  async (req, res) => {
    const { slug } = req.params;
    const baseUrl = getPublicBaseUrl();
    const url = `${baseUrl}/#/b/${slug}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: '#3B2E2A',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: 'qr_generation_failed' });
    }
  }
);

router.get('/:slug', (req, res) => {
  const { slug } = req.params;

  const session = db.prepare(`
    SELECT garden_id, intention, duration_minutes, plant_type, unique_slug, completed_at
    FROM sessions WHERE unique_slug = ?
  `).get(slug) as {
    garden_id: string;
    intention: string;
    duration_minutes: number;
    plant_type: string;
    unique_slug: string;
    completed_at: string;
  } | undefined;

  if (!session) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({ session: serializeSession(session) });
});

export default router;
