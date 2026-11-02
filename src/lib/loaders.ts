// Konfigurasi GLTFLoader dengan DRACO + KTX2 + Meshopt.
// Decoder di-host sendiri (lihat scripts/copy-decoders.mjs) — bukan dari CDN.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { WebGLRenderer } from 'three';

// Instance decoder dipakai ulang antar-load (hemat memori & inisialisasi worker).
let dracoLoader: DRACOLoader | null = null;
let ktx2Loader: KTX2Loader | null = null;

function getDraco(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
  }
  return dracoLoader;
}

function getKTX2(gl: WebGLRenderer): KTX2Loader {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('/basis/');
  }
  // detectSupport butuh renderer untuk memilih format tekstur terkompresi.
  ktx2Loader.detectSupport(gl);
  return ktx2Loader;
}

/**
 * Pasang DRACO/KTX2/Meshopt ke sebuah GLTFLoader.
 * Dipanggil lewat callback `extensions` dari useLoader(GLTFLoader, ...).
 */
export function configureGLTFLoader(loader: GLTFLoader, gl: WebGLRenderer): GLTFLoader {
  loader.setDRACOLoader(getDraco());
  loader.setKTX2Loader(getKTX2(gl));
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

/** Lepas decoder (worker) saat aplikasi dibongkar. */
export function disposeLoaders(): void {
  dracoLoader?.dispose();
  dracoLoader = null;
  ktx2Loader?.dispose();
  ktx2Loader = null;
}
