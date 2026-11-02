import { create } from 'zustand';
import type { Object3D } from 'three';
import type { ModelSource, ModelStats, ViewerSettings } from '@/types/viewer';

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

  // --- Actions ---
  setModel: (model: ModelSource) => void;
  setLastGoodModel: (model: ModelSource) => void;
  setStats: (stats: ModelStats | null) => void;
  setModelRadius: (r: number) => void;
  setSceneRoot: (root: Object3D | null) => void;
  setSelected: (uuid: string | null) => void;
  focusNode: (node: Object3D | null) => void;
  setLoading: (loading: Partial<LoadingState>) => void;
  setError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  updateSettings: (patch: Partial<ViewerSettings>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  resetCamera: () => void;
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

  loading: { active: true, progress: 0, fileName: 'sample.glb' },
  error: null,
  notice: null,

  settings: DEFAULT_SETTINGS,
  sidebarOpen: true,
  cameraResetNonce: 0,

  setModel: (model) =>
    set({ model, stats: null, error: null, sceneRoot: null, selectedUuid: null, focusTarget: null }),
  setLastGoodModel: (lastGoodModel) => set({ lastGoodModel }),
  setStats: (stats) => set({ stats }),
  setModelRadius: (modelRadius) => set({ modelRadius }),
  setSceneRoot: (sceneRoot) => set({ sceneRoot }),
  setSelected: (selectedUuid) => set({ selectedUuid }),
  focusNode: (focusTarget) => set((s) => ({ focusTarget, focusNonce: s.focusNonce + 1 })),
  setLoading: (loading) =>
    set((s) => ({ loading: { ...s.loading, ...loading } })),
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  resetCamera: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),
}));

export { SAMPLE_MODEL };
