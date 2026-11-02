// Menyalin decoder Draco dan transcoder KTX2/Basis dari node_modules/three
// ke folder public agar di-host sendiri (tidak mengambil dari CDN).
// Dijalankan otomatis lewat "postinstall" dan bisa dipanggil manual: npm run copy-decoders.
import { cp, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const threeLibs = resolve(root, 'node_modules/three/examples/jsm/libs');

/** @type {{from: string, to: string, label: string}[]} */
const jobs = [
  { from: resolve(threeLibs, 'draco'), to: resolve(root, 'public/draco'), label: 'Draco' },
  { from: resolve(threeLibs, 'basis'), to: resolve(root, 'public/basis'), label: 'KTX2/Basis' },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  for (const job of jobs) {
    if (!(await exists(job.from))) {
      // Jangan gagalkan instalasi kalau three belum terpasang (mis. saat CI parsial).
      console.warn(`[copy-decoders] Lewati ${job.label}: sumber tidak ditemukan (${job.from})`);
      continue;
    }
    await mkdir(dirname(job.to), { recursive: true });
    await cp(job.from, job.to, { recursive: true });
    console.log(`[copy-decoders] ${job.label} -> ${job.to}`);
  }
}

run().catch((err) => {
  console.error('[copy-decoders] Gagal:', err);
  // Jangan hentikan postinstall karena penyalinan decoder.
  process.exitCode = 0;
});
