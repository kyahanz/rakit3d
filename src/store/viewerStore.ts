import { create } from 'zustand';
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

  loading: { active: true, progress: 0, fileName: 'sample.glb' },
  error: null,
  notice: null,

  settings: DEFAULT_SETTINGS,
  sidebarOpen: true,
  cameraResetNonce: 0,

  setModel: (model) => set({ model, stats: null, error: null }),
  setLastGoodModel: (lastGoodModel) => set({ lastGoodModel }),
  setStats: (stats) => set({ stats }),
  setModelRadius: (modelRadius) => set({ modelRadius }),
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
