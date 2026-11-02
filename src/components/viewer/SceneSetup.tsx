import { useEffect, useReducer } from 'react';
import { ContactShadows, Environment, Grid } from '@react-three/drei';
import { useViewerStore } from '@/store/viewerStore';
import type { EnvironmentPreset } from '@/types/viewer';

// Lazy import tiap HDRI (data URI EXR dari @pmndrs/assets) → di-host lokal, bukan CDN.
// Setiap preset jadi chunk terpisah yang dimuat saat dipilih.
const HDRI_LOADERS: Record<EnvironmentPreset, () => Promise<{ default: string }>> = {
  city: () => import('@pmndrs/assets/hdri/city.exr'),
  studio: () => import('@pmndrs/assets/hdri/studio.exr'),
  sunset: () => import('@pmndrs/assets/hdri/sunset.exr'),
  warehouse: () => import('@pmndrs/assets/hdri/warehouse.exr'),
  apartment: () => import('@pmndrs/assets/hdri/apartment.exr'),
};

// Cache data URI agar tidak di-import ulang saat berganti bolak-balik.
const hdriCache = new Map<EnvironmentPreset, string>();

interface EnvironmentSetupProps {
  preset: EnvironmentPreset;
  background: boolean;
  blur: number;
}

function EnvironmentSetup({ preset, background, blur }: EnvironmentSetupProps) {
  // uri diturunkan dari cache tiap render; re-render dipicu setelah import async selesai.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const uri = hdriCache.get(preset) ?? null;

  useEffect(() => {
    if (hdriCache.has(preset)) return;
    let active = true;
    void HDRI_LOADERS[preset]().then((mod) => {
      hdriCache.set(preset, mod.default);
      if (active) forceUpdate();
    });
    return () => {
      active = false;
    };
  }, [preset]);

  if (!uri) return null;
  // drei mengenali data URI EXR (prefix data:application/exr) dan memakai EXRLoader.
  return <Environment files={uri} background={background} blur={blur} />;
}

export function SceneSetup() {
  const settings = useViewerStore((s) => s.settings);
  const radius = useViewerStore((s) => s.modelRadius);

  // Skala shadow/grid/light mengikuti ukuran model (generik untuk model apa pun).
  const shadowScale = Math.max(2, radius * 3);
  const shadowCam = Math.max(2, radius * 2);
  // ContactShadows membuat render target di useMemo([resolution,width,height,scale,color])
  // dan TIDAK men-dispose-nya → mengubah `scale` per model membocorkan texture. Maka props
  // ContactShadows dibuat KONSTAN dan penskalaan dilakukan lewat <group scale> pembungkus.
  const shadowGroupScale = Math.max(1, radius * 1.5);

  return (
    <>
      <EnvironmentSetup
        preset={settings.environment}
        background={settings.background === 'environment'}
        blur={settings.envBlur}
      />

      {settings.background === 'color' && <color attach="background" args={[settings.backgroundColor]} />}

      <ambientLight intensity={0.25} />
      <directionalLight
        castShadow={settings.shadows}
        position={[shadowCam, shadowCam * 2, shadowCam]}
        intensity={2.2}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-shadowCam, shadowCam, shadowCam, -shadowCam, 0.1, shadowCam * 6]}
        />
      </directionalLight>

      {settings.shadows && (
        // Props ContactShadows konstan (RT dibuat sekali); ukuran via group scale.
        <group scale={shadowGroupScale}>
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.5}
            scale={4}
            blur={2.6}
            far={2}
            resolution={1024}
            color="#000000"
          />
        </group>
      )}

      {settings.grid && (
        <Grid
          position={[0, 0, 0]}
          args={[shadowScale, shadowScale]}
          cellSize={Math.max(0.1, radius / 10)}
          cellThickness={0.6}
          sectionSize={Math.max(0.5, radius / 2)}
          sectionThickness={1}
          infiniteGrid
          fadeDistance={radius * 12}
          fadeStrength={1}
          cellColor="#6b7280"
          sectionColor="#9ca3af"
        />
      )}
    </>
  );
}
