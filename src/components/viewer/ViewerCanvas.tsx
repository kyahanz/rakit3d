import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Perf } from 'r3f-perf';
import { useViewerStore } from '@/store/viewerStore';
import { SceneSetup } from './SceneSetup';
import { CameraRig } from './CameraRig';
import { ModelLoader } from './ModelLoader';
import { ModelErrorBoundary } from './ModelErrorBoundary';

/** Tangani kegagalan load: tampilkan error, revoke URL gagal, pulihkan model baik terakhir. */
function handleModelError(message: string): void {
  const st = useViewerStore.getState();
  st.setLoading({ active: false });

  const failed = st.model;
  const urls = failed.objectUrls ?? (failed.isObjectUrl ? [failed.url] : []);
  for (const u of urls) URL.revokeObjectURL(u);
  if (failed.assemblyFromFile && failed.assemblyUrl) URL.revokeObjectURL(failed.assemblyUrl);

  // Pulihkan model baik terakhir DULU (setModel menghapus error), lalu set pesan error.
  if (failed.url !== st.lastGoodModel.url) {
    st.setModel(st.lastGoodModel);
  }
  st.setError(message);
}

export function ViewerCanvas() {
  const showPerf = useViewerStore((s) => s.settings.showPerf);
  const modelUrl = useViewerStore((s) => s.model.url);
  const animating = useViewerStore((s) => s.animating);
  const interacting = useViewerStore((s) => s.interacting);

  return (
    <Canvas
      // Render on-demand (hemat GPU): invalidate() saat kamera/tween berubah.
      // Saat animasi berjalan, beralih ke "always" agar mixer ter-update tiap frame,
      // lalu kembali "demand" otomatis saat semua clip berhenti.
      frameloop={animating || interacting ? 'always' : 'demand'}
      dpr={[1, 2]}
      shadows
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
        // preserveDrawingBuffer hanya diaktifkan sesaat saat screenshot (tahap 7).
        preserveDrawingBuffer: false,
      }}
      camera={{ position: [3, 2, 5], fov: 45, near: 0.01, far: 2000 }}
      onCreated={({ gl }) => {
        if (import.meta.env.DEV) {
          // Bantuan debugging/uji memory-leak (lihat PROGRESS tahap 8). Hanya di dev.
          (window as unknown as { __gl?: unknown }).__gl = gl;
        }
      }}
    >
      {/* Turunkan resolusi otomatis saat FPS turun. */}
      <PerformanceMonitor />
      <AdaptiveDpr pixelated={false} />

      <SceneSetup />

      <CameraRig>
        {/* key memaksa remount & reset error boundary saat URL model berganti. */}
        <ModelErrorBoundary key={modelUrl} onError={handleModelError}>
          <Suspense fallback={null}>
            <ModelLoader />
          </Suspense>
        </ModelErrorBoundary>
      </CameraRig>

      {import.meta.env.DEV && showPerf && <Perf position="bottom-right" />}
    </Canvas>
  );
}
