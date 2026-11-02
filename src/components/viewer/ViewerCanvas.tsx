import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Perf } from 'r3f-perf';
import { useViewerStore } from '@/store/viewerStore';
import { SceneSetup } from './SceneSetup';
import { CameraRig } from './CameraRig';
import { ModelLoader } from './ModelLoader';

export function ViewerCanvas() {
  const showPerf = useViewerStore((s) => s.settings.showPerf);
  const modelUrl = useViewerStore((s) => s.model.url);

  return (
    <Canvas
      // Render hanya saat ada perubahan (hemat GPU). invalidate() dipanggil saat
      // kamera bergerak, animasi/tween berjalan, atau model berubah.
      frameloop="demand"
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
    >
      {/* Turunkan resolusi otomatis saat FPS turun. */}
      <PerformanceMonitor />
      <AdaptiveDpr pixelated={false} />

      <SceneSetup />

      <CameraRig>
        <Suspense fallback={null}>
          {/* key memaksa remount loader saat URL model berganti → dispose bersih. */}
          <ModelLoader key={modelUrl} />
        </Suspense>
      </CameraRig>

      {import.meta.env.DEV && showPerf && <Perf position="bottom-right" />}
    </Canvas>
  );
}
