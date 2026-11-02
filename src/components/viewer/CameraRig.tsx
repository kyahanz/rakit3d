import { type ReactNode, useEffect } from 'react';
import { Bounds, OrbitControls, useBounds } from '@react-three/drei';
import { useViewerStore } from '@/store/viewerStore';

/** Memanggil fit Bounds ulang saat ada permintaan reset kamera dari toolbar. */
function BoundsRefitter() {
  const bounds = useBounds();
  const resetNonce = useViewerStore((s) => s.cameraResetNonce);

  useEffect(() => {
    // refresh() mengukur ulang scene, clip() atur jarak clipping, fit() framing.
    bounds.refresh().clip().fit();
  }, [bounds, resetNonce]);

  return null;
}

interface CameraRigProps {
  children: ReactNode;
}

/**
 * OrbitControls (damping, makeDefault) + auto-fit kamera via <Bounds fit clip observe>.
 * Batas zoom relatif terhadap ukuran model (modelRadius).
 */
export function CameraRig({ children }: CameraRigProps) {
  const radius = useViewerStore((s) => s.modelRadius);

  return (
    <>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={Math.max(0.05, radius * 0.3)}
        maxDistance={Math.max(5, radius * 12)}
        // Jangan biarkan kamera menembus lantai.
        maxPolarAngle={Math.PI / 2 + 0.15}
      />
      <Bounds fit clip observe margin={1.2}>
        <BoundsRefitter />
        {children}
      </Bounds>
    </>
  );
}
