// Serverless function (Vercel) untuk upload file model ke Vercel Blob.
// Memakai pola client-upload (@vercel/blob/client) agar file besar tidak kena
// batas body function. Butuh env BLOB_READ_WRITE_TOKEN (otomatis ada setelah
// membuat Blob store di dashboard Vercel: Storage → Create → Blob).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['model/gltf-binary', 'application/octet-stream'],
        maximumSizeInBytes: 104_857_600, // 100 MB
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Tidak ada aksi lanjutan; URL publik dikembalikan ke klien.
      },
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Upload gagal' });
  }
}
