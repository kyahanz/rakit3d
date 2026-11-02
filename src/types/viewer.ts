// Tipe inti viewer. Semua fitur generik & data-driven — tidak ada nama model/part hardcode.

export type Axis = 'x' | 'y' | 'z';

/** Jenis interaksi sebuah node (dari userData extras atau konfigurasi manual). */
export type InteractionType = 'rotate' | 'translate' | 'animation';

export type EnvironmentPreset = 'city' | 'studio' | 'sunset' | 'warehouse' | 'apartment';

/** Mode latar: transparan, warna solid, atau environment (blur). */
export type BackgroundMode = 'transparent' | 'color' | 'environment';

export type LoopMode = 'once' | 'repeat' | 'pingpong';

/** Sumber model yang sedang dimuat. */
export interface ModelSource {
  /** URL untuk dimuat GLTFLoader (object URL blob atau path publik). */
  url: string;
  /** Nama file untuk ditampilkan. */
  name: string;
  /** Ukuran file dalam byte (jika diketahui). */
  size?: number;
  /** True jika model contoh bawaan. */
  isSample?: boolean;
  /** True jika `url` adalah object URL yang harus di-revoke saat ganti model. */
  isObjectUrl?: boolean;
  /** Semua object URL yang dibuat (gltf + .bin + tekstur) agar bisa di-revoke semua. */
  objectUrls?: string[];
  /** URL file *.assembly.json pendamping (jika ada → Mode Rakit aktif). */
  assemblyUrl?: string;
  /** Data assembly yang di-drop langsung (object URL json), dipakai Mode Rakit. */
  assemblyFromFile?: boolean;
}

/** Pengaturan tampilan & environment. */
export interface ViewerSettings {
  environment: EnvironmentPreset;
  background: BackgroundMode;
  backgroundColor: string;
  shadows: boolean;
  wireframe: boolean;
  grid: boolean;
  /** Statistik FPS (r3f-perf) — hanya berpengaruh di mode development. */
  showPerf: boolean;
  /** Blur environment saat dipakai sebagai background (0–1). */
  envBlur: number;
}

/** Peringatan kualitas model (triangle/tekstur berlebih). */
export interface ModelWarning {
  level: 'warning';
  message: string;
}

/** Statistik hasil analisis model. */
export interface ModelStats {
  meshCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  /** Resolusi tekstur terbesar (px), 0 jika tanpa tekstur. */
  maxTextureSize: number;
  /** Dimensi bounding box dalam meter [x, y, z]. */
  dimensions: [number, number, number];
  animationCount: number;
  usesDraco: boolean;
  usesKTX2: boolean;
  usesMeshopt: boolean;
  warnings: ModelWarning[];
}
