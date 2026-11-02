import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useViewerStore } from '@/store/viewerStore';
import { configureGLTFLoader } from '@/lib/loaders';
import { Model } from './Model';

/**
 * Memuat GLB/GLTF dari URL aktif (object URL atau path publik) memakai GLTFLoader
 * yang dikonfigurasi DRACO/KTX2/Meshopt (self-hosted). Suspense ditangani pemanggil.
 *
 * Memakai useLoader dari fiber (bukan drei useGLTF) agar tipe loader konsisten dengan
 * @types/three dan kita bisa memasang decoder sendiri.
 */
export function ModelLoader() {
  const source = useViewerStore((s) => s.model);
  const gl = useThree((s) => s.gl);

  const gltf = useLoader(GLTFLoader, source.url, (loader) => {
    configureGLTFLoader(loader, gl);
  });

  return <Model gltf={gltf} source={source} />;
}
