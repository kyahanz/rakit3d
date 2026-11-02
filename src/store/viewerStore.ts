import { create } from 'zustand';
import type { Object3D } from 'three';
import type {
  AnimationApi,
  ClipInfo,
  ManualInteraction,
  ModelSource,
  ModelStats,
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

const DEFAULT_SETTINGS: ViewerSettings = {
  environment: 'city',
  background: 'transparent',
  backgroundColor: '#1a1a1f',
  shadows: true,
  wireframe: false,
  grid: false,
  showPerf: false,
  envBlur: 0.5,
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
  stats: ModelStats | null;
  /** Radius bounding sphere model (meter) untuk batas zoom relatif. */
  modelRadius: number;
  /** Root scene model yang sedang tampil (untuk panel tree/info di luar canvas). */
  sceneRoot: Object3D | null;
  /** uuid node yang dipilih di scene tree. */
  selectedUuid: string | null;
  /** Node target fokus kamera + nonce pemicu. */
  focusTarget: Object3D | null;
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
  setStats: (stats: ModelStats | null) => void;
  setModelRadius: (r: number) => void;
  setSceneRoot: (root: Object3D | null) => void;
  setSelected: (uuid: string | null) => void;
  focusNode: (node: Object3D | null) => void;
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
  model: SAMPLE_MODEL,
  lastGoodModel: SAMPLE_MODEL,
  stats: null,
  modelRadius: 1,
  sceneRoot: null,
  selectedUuid: null,
  focusTarget: null,
  focusNonce: 0,

  clips: [],
  playback: {},
  animApi: null,
  animating: false,

  openState: {},
  manualInteractions: {},
  hovered: null,
  interacting: false,

  loading: { active: true, progress: 0, fileName: 'sample.glb' },
  error: null,
  notice: null,

  settings: DEFAULT_SETTINGS,
  sidebarOpen: true,
  cameraResetNonce: 0,
  screenshotNonce: 0,

  setModel: (model) =>
    set({
      model,
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
    }),
  setLastGoodModel: (lastGoodModel) => set({ lastGoodModel }),
  setStats: (stats) => set({ stats }),
  setModelRadius: (modelRadius) => set({ modelRadius }),
  setSceneRoot: (sceneRoot) => set({ sceneRoot }),
  setSelected: (selectedUuid) => set({ selectedUuid }),
  focusNode: (focusTarget) => set((s) => ({ focusTarget, focusNonce: s.focusNonce + 1 })),
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
