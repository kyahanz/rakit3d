// Cron Vercel: hapus blob yang umurnya > 7 hari agar storage tidak membludak.
// Dijadwalkan harian lewat vercel.json ("crons"). Dilindungi CRON_SECRET bila di-set.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del, list } from '@vercel/blob';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Proteksi endpoint: cron Vercel mengirim Authorization: Bearer <CRON_SECRET>.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  const expired: string[] = [];
  let cursor: string | undefined;

  try {
    do {
      const result = await list({ cursor, limit: 1000 });
      for (const blob of result.blobs) {
        if (now - new Date(blob.uploadedAt).getTime() > MAX_AGE_MS) {
          expired.push(blob.url);
        }
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    // Hapus bertahap (hindari payload terlalu besar).
    for (let i = 0; i < expired.length; i += 100) {
      await del(expired.slice(i, i + 100));
    }

    return res.status(200).json({ deleted: expired.length });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Cleanup gagal' });
  }
}
