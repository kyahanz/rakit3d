// Util format angka/ukuran untuk UI (bahasa Indonesia).

/** Format byte menjadi KB/MB/GB. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

/** Format angka besar dengan pemisah ribuan (id-ID). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n));
}

/** Format meter dengan 2–3 angka di belakang koma, ringkas. */
export function formatMeters(m: number): string {
  if (Math.abs(m) >= 1) return `${m.toFixed(2)} m`;
  return `${(m * 100).toFixed(1)} cm`;
}

/** Format detik → "m:ss.d" atau "s.d dtk". */
export function formatSeconds(s: number): string {
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rest = (s % 60).toFixed(1).padStart(4, '0');
    return `${m}:${rest}`;
  }
  return `${s.toFixed(2)} dtk`;
}
