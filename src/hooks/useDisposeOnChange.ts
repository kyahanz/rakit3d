import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Object3D } from 'three';
import type { ModelSource } from '@/types/viewer';
import { disposeObject } from '@/lib/disposeObject';

interface LiveModel {
  source: ModelSource;
  scene: Object3D;
}

// Referensi model yang sedang hidup (di luar lifecycle React agar aman untuk StrictMode).
let live: LiveModel | null = null;

/** Revoke semua object URL milik sebuah sumber model. */
function revokeSource(source: ModelSource): void {
  const urls = source.objectUrls ?? (source.isObjectUrl ? [source.url] : []);
  for (const u of urls) URL.revokeObjectURL(u);
  if (source.assemblyFromFile && source.assemblyUrl) {
    URL.revokeObjectURL(source.assemblyUrl);
  }
}

/** Dispose resource GPU model lama + clear cache loader + revoke object URL. */
function disposeLive(): void {
  if (!live) return;
  disposeObject(live.scene);
  // Clear cache useLoader agar URL yang sama dimuat ulang segar bila dipakai lagi.
  useLoader.clear(GLTFLoader, live.source.url);
  revokeSource(live.source);
}

/**
 * Mendaftarkan model yang sedang tampil. Saat model BARU (url berbeda) terdaftar,
 * model lama otomatis dibersihkan (dispose + clear cache + revoke URL).
 * Tidak membersihkan di cleanup unmount → aman terhadap double-mount StrictMode.
 */
export function useDisposeOnChange(source: ModelSource, scene: Object3D): void {
  useEffect(() => {
    if (live && live.source && live.source.url !== source.url) {
      disposeLive();
    }
    live = { source, scene };
  }, [source, scene]);
}
