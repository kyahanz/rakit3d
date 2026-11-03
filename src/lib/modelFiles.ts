// Menyiapkan ModelSource dari file yang di-drop / dipilih user.
// Dukungan: .glb (mandiri) dan .gltf (+ .bin + tekstur eksternal via URLModifier).
import { DefaultLoadingManager } from 'three';
import type { ModelSource } from '@/types/viewer';
import { formatBytes } from './formatters';

const MODEL_RE = /\.(glb|gltf)$/i;
const ASSEMBLY_RE = /\.assembly\.json$/i;
const SIZE_WARN_BYTES = 50 * 1024 * 1024; // 50 MB

/** Error pemuatan model yang pesannya ramah ditampilkan ke user. */
export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export interface PreparedModel {
  source: ModelSource;
  /** File model utama (untuk fitur Buat Link; upload hanya didukung .glb mandiri). */
  mainFile: File;
  /** Peringatan non-fatal (mis. ukuran besar). */
  warning?: string;
}

/** Ambil basename dari URL/path apa pun (tahan separator / dan \). */
function basename(url: string): string {
  const decoded = decodeURIComponent(url);
  const parts = decoded.split(/[\\/]/);
  return parts[parts.length - 1] ?? decoded;
}

/**
 * Siapkan model dari daftar File. Membuat object URL untuk tiap file dan, untuk .gltf,
 * memasang URLModifier agar dependency (.bin/tekstur) di-resolve ke object URL.
 */
export function prepareModelFromFiles(fileList: FileList | File[]): PreparedModel {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new ModelLoadError('Tidak ada file yang diterima.');
  }

  const main = files.find((f) => MODEL_RE.test(f.name));
  if (!main) {
    throw new ModelLoadError('Format tidak didukung. Pilih berkas .glb atau .gltf.');
  }

  const isGltf = /\.gltf$/i.test(main.name);

  // Buat object URL untuk semua file; map berdasarkan nama untuk resolve dependency.
  const urlMap = new Map<string, string>();
  const objectUrls: string[] = [];
  for (const f of files) {
    const u = URL.createObjectURL(f);
    urlMap.set(f.name, u);
    objectUrls.push(u);
  }

  const mainUrl = urlMap.get(main.name);
  if (!mainUrl) throw new ModelLoadError('Gagal membuat URL untuk model.');

  // URLModifier: untuk .gltf, resolve path relatif (basename) ke object URL yang dibuat.
  // Untuk URL lain (HDRI, decoder, assembly) basename tidak ada di map → dikembalikan apa adanya.
  if (isGltf) {
    DefaultLoadingManager.setURLModifier((url) => {
      const mapped = urlMap.get(basename(url));
      return mapped ?? url;
    });
  } else {
    // .glb mandiri — pastikan modifier identitas (bersihkan sisa dari load .gltf sebelumnya).
    DefaultLoadingManager.setURLModifier((url) => url);
  }

  // Deteksi file assembly pendamping (cocokkan basis nama, atau ambil yang pertama ada).
  const baseName = main.name.replace(MODEL_RE, '');
  const assemblyFile =
    files.find((f) => f.name === `${baseName}.assembly.json`) ??
    files.find((f) => ASSEMBLY_RE.test(f.name));
  let assemblyUrl: string | undefined;
  let assemblyFromFile = false;
  if (assemblyFile) {
    assemblyUrl = urlMap.get(assemblyFile.name);
    assemblyFromFile = true;
  }

  const warning =
    main.size > SIZE_WARN_BYTES
      ? `Ukuran file ${formatBytes(main.size)} melebihi 50 MB — pemuatan mungkin lambat.`
      : undefined;

  const source: ModelSource = {
    url: mainUrl,
    name: main.name,
    size: main.size,
    isObjectUrl: true,
    objectUrls,
    assemblyUrl,
    assemblyFromFile,
  };

  return { source, mainFile: main, warning };
}

/** Cek cepat apakah daftar file mengandung model yang didukung. */
export function hasSupportedModel(files: FileList | File[]): boolean {
  return Array.from(files).some((f) => MODEL_RE.test(f.name));
}
