import { create } from 'zustand';
import type { Object3D } from 'three';
import type {
  AnimationApi,
  ClipInfo,
  ManualInteraction,
  ModelSource,
  ModelStats,
  ParsedAssembly,
  PlaybackInfo,
  ViewerSettings,
} from '@/types/viewer';

/** Info hover node interaktif (untuk tooltip & highlight). */
interface HoverInfo {
  uuid: string;
  label: string;
  x: number;
  y: number;
}

/** Model contoh bawaan yang tampil saat pertama dibuka. */
const SAMPLE_MODEL: ModelSource = {
  url: '/models/sample.glb',
  name: 'sample.glb',
  isSample: true,
  isObjectUrl: false,
  assemblyUrl: '/models/sample.assembly.json',
};

/** Model awal: dari parameter ?model=<url> (link berbagi) bila ada, selain itu sample. */
function getInitialModel(): ModelSource {
  try {
    const url = new URLSearchParams(window.location.search).get('model');
    if (url) {
      const base = url.split('?')[0].split('#')[0];
      const name = decodeURIComponent(base.split('/').pop() || 'model.glb');
      return { url, name, isObjectUrl: false };
    }
  } catch {
    // abaikan — pakai sample
  }
  return SAMPLE_MODEL;
}

const INITIAL_MODEL = getInitialModel();

const DEFAULT_SETTINGS: ViewerSettings = {
  environment: 'city',
  background: 'transparent',
  backgroundColor: '#1a1a1f',
  shadows: true,
  wireframe: false,
  grid: false,
  showPerf: false,
  envBlur: 0.5,
  assemblyHideFuture: false,
};

interface LoadingState {
  active: boolean;
  progress: number; // 0–1
  fileName: string;
}

interface ViewerState {
  // --- Model ---
  model: ModelSource;
  /** Model terakhir yang berhasil dimuat (untuk pulih saat load gagal). */
  lastGoodModel: ModelSource;
  /** File .glb mentah yang di-drop (untuk fitur Buat Link / upload). */
  shareFile: File | null;
  stats: ModelStats | null;
  /** Radius bounding sphere model (meter) untuk batas zoom relatif. */
  modelRadius: number;
  /** Root scene model yang sedang tampil (untuk panel tree/info di luar canvas). */
  sceneRoot: Object3D | null;
  /** uuid node yang dipilih di scene tree. */
  selectedUuid: string | null;
  /** Node target fokus kamera + nonce pemicu. */
  focusTarget: Object3D | null;
  /** Kotak target fokus kamera (min/max) — dipakai Mode Rakit untuk fokus ke part langkah. */
  focusBox: [number, number, number, number, number, number] | null;
  focusNonce: number;

  // --- Animasi ---
  clips: ClipInfo[];
  /** Status playback per clip (dipublish controller canvas). */
  playback: Record<string, PlaybackInfo>;
  animApi: AnimationApi | null;
  /** True saat ada animasi/transisi berjalan → Canvas memakai frameloop "always". */
  animating: boolean;

  // --- Interaksi ---
  /** Status buka/tutup per node (uuid → open). */
  openState: Record<string, boolean>;
  /** Override interaksi manual dari UI (uuid → config). */
  manualInteractions: Record<string, ManualInteraction>;
  /** Node yang sedang di-hover (tooltip + highlight). */
  hovered: HoverInfo | null;
  /** True saat ada transisi buka/tutup berjalan → frameloop "always". */
  interacting: boolean;

  // --- Mode Rakit (Assembly) ---
  /** Data assembly ter-parse (null = Mode Rakit tidak aktif). */
  assembly: ParsedAssembly | null;
  assemblyError: string | null;
  /** Nilai explode 0..1. */
  explode: number;
  /** Visibilitas per grup (id → tampil). */
  groupVisibility: Record<string, boolean>;
  /** Status toggle opsi (id → aktif). */
  assemblyToggles: Record<string, boolean>;
  /** Langkah rakit aktif (1-based), null = "Lihat semua". */
  activeStep: number | null;
  /** True saat transisi explode/langkah berjalan → frameloop "always". */
  assemblyAnimating: boolean;

  // --- Loading & error ---
  loading: LoadingState;
  error: string | null;
  /** Peringatan non-fatal (mis. file besar). */
  notice: string | null;

  // --- UI ---
  settings: ViewerSettings;
  sidebarOpen: boolean;
  /** Dinaikkan untuk memicu reset/fit kamera. */
  cameraResetNonce: number;
  /** Dinaikkan untuk memicu pengambilan screenshot (di dalam canvas). */
  screenshotNonce: number;

  // --- Actions ---
  setModel: (model: ModelSource) => void;
  setLastGoodModel: (model: ModelSource) => void;
  setShareFile: (file: File | null) => void;
  setStats: (stats: ModelStats | null) => void;
  setModelRadius: (r: number) => void;
  setSceneRoot: (root: Object3D | null) => void;
  setSelected: (uuid: string | null) => void;
  focusNode: (node: Object3D | null) => void;
  focusBounds: (min: [number, number, number], max: [number, number, number]) => void;
  setClips: (clips: ClipInfo[]) => void;
  setPlayback: (playback: Record<string, PlaybackInfo>) => void;
  setAnimApi: (api: AnimationApi | null) => void;
  setAnimating: (animating: boolean) => void;
  toggleInteraction: (uuid: string) => void;
  setOpen: (uuid: string, open: boolean) => void;
  setOpenAll: (uuids: string[], open: boolean) => void;
  setManualInteraction: (uuid: string, manual: ManualInteraction | null) => void;
  setHovered: (hovered: HoverInfo | null) => void;
  setInteracting: (interacting: boolean) => void;
  setAssembly: (assembly: ParsedAssembly | null) => void;
  setAssemblyError: (error: string | null) => void;
  setExplode: (explode: number) => void;
  toggleGroupVisibility: (groupId: string) => void;
  setAssemblyToggle: (toggleId: string, on: boolean) => void;
  setActiveStep: (step: number | null) => void;
  stepBy: (delta: number) => void;
  setAssemblyAnimating: (animating: boolean) => void;
  setLoading: (loading: Partial<LoadingState>) => void;
  setError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  updateSettings: (patch: Partial<ViewerSettings>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  resetCamera: () => void;
  requestScreenshot: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  model: INITIAL_MODEL,
  lastGoodModel: INITIAL_MODEL,
  shareFile: null,
  stats: null,
  modelRadius: 1,
  sceneRoot: null,
  selectedUuid: null,
  focusTarget: null,
  focusBox: null,
  focusNonce: 0,

  clips: [],
  playback: {},
  animApi: null,
  animating: false,

  openState: {},
  manualInteractions: {},
  hovered: null,
  interacting: false,

  assembly: null,
  assemblyError: null,
  explode: 0,
  groupVisibility: {},
  assemblyToggles: {},
  activeStep: null,
  assemblyAnimating: false,

  loading: { active: true, progress: 0, fileName: INITIAL_MODEL.name },
  error: null,
  notice: null,

  settings: DEFAULT_SETTINGS,
  sidebarOpen: true,
  cameraResetNonce: 0,
  screenshotNonce: 0,

  setModel: (model) =>
    set({
      model,
      shareFile: null,
      stats: null,
      error: null,
      sceneRoot: null,
      selectedUuid: null,
      focusTarget: null,
      clips: [],
      playback: {},
      animApi: null,
      animating: false,
      openState: {},
      manualInteractions: {},
      hovered: null,
      interacting: false,
      assembly: null,
      assemblyError: null,
      explode: 0,
      groupVisibility: {},
      assemblyToggles: {},
      activeStep: null,
      assemblyAnimating: false,
    }),
  setLastGoodModel: (lastGoodModel) => set({ lastGoodModel }),
  setShareFile: (shareFile) => set({ shareFile }),
  setStats: (stats) => set({ stats }),
  setModelRadius: (modelRadius) => set({ modelRadius }),
  setSceneRoot: (sceneRoot) => set({ sceneRoot }),
  setSelected: (selectedUuid) => set({ selectedUuid }),
  focusNode: (focusTarget) =>
    set((s) => ({ focusTarget, focusBox: null, focusNonce: s.focusNonce + 1 })),
  focusBounds: (min, max) =>
    set((s) => ({
      focusTarget: null,
      focusBox: [min[0], min[1], min[2], max[0], max[1], max[2]],
      focusNonce: s.focusNonce + 1,
    })),
  setClips: (clips) => set({ clips }),
  setPlayback: (playback) => set({ playback }),
  setAnimApi: (animApi) => set({ animApi }),
  setAnimating: (animating) => set({ animating }),
  toggleInteraction: (uuid) =>
    set((s) => ({ openState: { ...s.openState, [uuid]: !s.openState[uuid] }, interacting: true })),
  setOpen: (uuid, open) =>
    set((s) => ({ openState: { ...s.openState, [uuid]: open }, interacting: true })),
  setOpenAll: (uuids, open) =>
    set((s) => {
      const openState = { ...s.openState };
      for (const uuid of uuids) openState[uuid] = open;
      return { openState, interacting: true };
    }),
  setManualInteraction: (uuid, manual) =>
    set((s) => {
      const manualInteractions = { ...s.manualInteractions };
      if (manual) manualInteractions[uuid] = manual;
      else delete manualInteractions[uuid];
      return { manualInteractions };
    }),
  setHovered: (hovered) => set({ hovered }),
  setInteracting: (interacting) => set({ interacting }),
  setAssembly: (assembly) =>
    set({
      assembly,
      assemblyError: null,
      explode: 0,
      activeStep: null,
      // Default: semua grup tampil, toggle mati (kecuali bisa diatur kemudian).
      groupVisibility: assembly ? Object.fromEntries(assembly.groups.map((g) => [g.id, true])) : {},
      assemblyToggles: assembly ? Object.fromEntries(assembly.toggles.map((t) => [t.id, false])) : {},
    }),
  setAssemblyError: (assemblyError) => set({ assemblyError }),
  setExplode: (explode) => set({ explode, assemblyAnimating: true }),
  toggleGroupVisibility: (groupId) =>
    set((s) => ({ groupVisibility: { ...s.groupVisibility, [groupId]: !s.groupVisibility[groupId] } })),
  setAssemblyToggle: (toggleId, on) =>
    set((s) => ({ assemblyToggles: { ...s.assemblyToggles, [toggleId]: on } })),
  setActiveStep: (activeStep) => set({ activeStep, assemblyAnimating: true }),
  stepBy: (delta) =>
    set((s) => {
      if (!s.assembly || s.assembly.steps.length === 0) return {};
      const count = s.assembly.steps.length;
      const current = s.activeStep ?? 0;
      const next = Math.min(count, Math.max(1, current + delta));
      return { activeStep: next, assemblyAnimating: true };
    }),
  setAssemblyAnimating: (assemblyAnimating) => set({ assemblyAnimating }),
  setLoading: (loading) =>
    set((s) => ({ loading: { ...s.loading, ...loading } })),
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  resetCamera: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),
  requestScreenshot: () => set((s) => ({ screenshotNonce: s.screenshotNonce + 1 })),
}));

export { SAMPLE_MODEL };
