import { useEffect } from 'react';
import { DefaultLoadingManager } from 'three';
import { useViewerStore } from '@/store/viewerStore';

/**
 * Menyambungkan progress DefaultLoadingManager (dipakai GLTFLoader) ke store.
 * Overlay loading diaktifkan/dimatikan secara eksplisit (saat ganti model & saat
 * model selesai mount); hook ini hanya memasok persentase.
 */
export function useLoadingManager(): void {
  const setLoading = useViewerStore((s) => s.setLoading);

  useEffect(() => {
    const manager = DefaultLoadingManager;
    const prevProgress = manager.onProgress;

    manager.onProgress = (url, loaded, total) => {
      if (total > 0) {
        setLoading({ progress: Math.min(1, loaded / total) });
      }
      prevProgress?.(url, loaded, total);
    };

    return () => {
      manager.onProgress = prevProgress;
    };
  }, [setLoading]);
}
