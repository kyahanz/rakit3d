// Fitur "Buat Link": upload file .glb ke Vercel Blob lalu bangun link berbagi.
// Link berbentuk <origin>/?model=<url-publik>, dibuka oleh orang lain tanpa download manual.
import { upload } from '@vercel/blob/client';

/** Bangun link berbagi dari URL model publik (relatif di-resolve ke absolut). */
export function buildShareLink(modelUrl: string): string {
  const absolute = new URL(modelUrl, window.location.origin).href;
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?model=${encodeURIComponent(absolute)}`;
}

/** Upload .glb ke Vercel Blob (client upload) dan kembalikan link berbagi. */
export async function uploadAndGetShareLink(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: 'model/gltf-binary',
  });
  return buildShareLink(blob.url);
}
