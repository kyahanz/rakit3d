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
  /** Matahari (directional light utama) nyala/mati. */
  sun: boolean;
  /** Arah cahaya utama: azimuth/putaran horizontal (derajat, 0–360). */
  lightAzimuth: number;
  /** Arah cahaya utama: tinggi/elevasi di atas horizon (derajat, 5–89). */
  lightElevation: number;
  /** Intensitas cahaya utama (directional light). */
  lightIntensity: number;
  /** Auto-putar objek (turntable) agar bayangan terlihat dari segala sisi. */
  autoRotate: boolean;
  /** Mode Rakit: part di langkah > N disembunyikan (true) atau dibuat transparan (false). */
  assemblyHideFuture: boolean;
}

/** Sumber konfigurasi interaksi sebuah node. */
export type InteractionSource = 'userData' | 'convention' | 'manual';

/** Konfigurasi interaksi yang sudah di-resolve untuk sebuah node. */
export interface InteractionConfig {
  type: InteractionType;
  axis: Axis;
  /** Derajat (untuk rotate). */
  angle?: number;
  /** Meter (untuk translate). */
  distance?: number;
  /** Nama animation clip (untuk type 'animation'). */
  clip?: string;
  /** Label tampilan (tooltip / UI). */
  label?: string;
  /** Durasi easing (detik). */
  duration: number;
  source: InteractionSource;
}

/** Override interaksi manual dari UI (SceneTreePanel). */
export interface ManualInteraction {
  type: InteractionType;
  axis: Axis;
  angle?: number;
  distance?: number;
  clip?: string;
}

// ---------------------------------------------------------------------------
// Mode Rakit (Assembly)
// ---------------------------------------------------------------------------
export type AssemblyToggleType = 'interaction' | 'dimensions' | 'visibility';

export interface AssemblyGroup {
  id: string;
  label: string;
  node: string;
  dims?: string;
}

export interface AssemblyToggle {
  id: string;
  label: string;
  type: AssemblyToggleType;
  nodes?: string[];
  states?: string[];
}

export interface AssemblyStep {
  n: number;
  group: string;
  title: string;
  desc?: string;
  nodes: string[];
}

/** Dimensi (from/to sudah dikonversi ke meter). */
export interface AssemblyDimension {
  id: string;
  group?: string;
  from: [number, number, number];
  to: [number, number, number];
  label: string;
}

export interface ParsedAssembly {
  title: string;
  subtitle?: string;
  groups: AssemblyGroup[];
  toggles: AssemblyToggle[];
  steps: AssemblyStep[];
  dimensions: AssemblyDimension[];
  /** Nama node yang dirujuk tapi tidak ada di model (untuk peringatan). */
  missingNodes: string[];
}

/** Metadata satu animation clip. */
export interface ClipInfo {
  name: string;
  duration: number;
}

/** Status playback satu clip (dipublish controller untuk UI). */
export interface PlaybackInfo {
  playing: boolean;
  paused: boolean;
  time: number;
  loop: LoopMode;
  speed: number;
}

/** API imperatif animasi yang dipanggil AnimationPanel (DOM) ke controller (canvas). */
export interface AnimationApi {
  play: (name: string) => void;
  pause: (name: string) => void;
  stop: (name: string) => void;
  stopAll: () => void;
  seek: (name: string, time: number) => void;
  setSpeed: (name: string, speed: number) => void;
  setLoop: (name: string, loop: LoopMode) => void;
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
