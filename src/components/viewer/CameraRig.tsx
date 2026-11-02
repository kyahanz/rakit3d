import { type ReactNode, useEffect } from 'react';
import { Bounds, OrbitControls, useBounds } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { useViewerStore } from '@/store/viewerStore';

/** Fit Bounds ulang saat reset kamera (seluruh model) atau fokus ke node terpilih. */
function BoundsRefitter() {
  const bounds = useBounds();
  const resetNonce = useViewerStore((s) => s.cameraResetNonce);
  const focusNonce = useViewerStore((s) => s.focusNonce);

  // Reset / fit seluruh model.
  useEffect(() => {
    // refresh() mengukur ulang scene, clip() atur jarak clipping, fit() framing.
    bounds.refresh().clip().fit();
  }, [bounds, resetNonce]);

  // Fokus ke node tertentu (tree) atau ke kotak part langkah (Mode Rakit).
  useEffect(() => {
    if (focusNonce === 0) return;
    const { focusTarget, focusBox } = useViewerStore.getState();
    if (focusBox) {
      const box = new Box3(
        new Vector3(focusBox[0], focusBox[1], focusBox[2]),
        new Vector3(focusBox[3], focusBox[4], focusBox[5]),
      );
      bounds.refresh(box).clip().fit();
    } else if (focusTarget) {
      bounds.refresh(focusTarget).clip().fit();
    }
  }, [bounds, focusNonce]);

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
