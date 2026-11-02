import { useEffect } from 'react';
import { Box3, type Material, type Mesh, type Object3D, Texture, Vector3 } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ModelStats, ModelWarning } from '@/types/viewer';
import { useViewerStore } from '@/store/viewerStore';

const TRI_WARN = 500_000;
const TEX_WARN = 2048;

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

function triangleCount(mesh: Mesh): number {
  const geo = mesh.geometry;
  if (!geo) return 0;
  if (geo.index) return geo.index.count / 3;
  const pos = geo.getAttribute('position');
  return pos ? pos.count / 3 : 0;
}

/** Hitung statistik model (generik untuk model apa pun). */
export function computeModelStats(gltf: GLTF, fileSize?: number): ModelStats {
  const scene = gltf.scene;
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  let meshCount = 0;
  let triangles = 0;
  let maxTextureSize = 0;

  scene.traverse((o) => {
    if (!isMesh(o)) return;
    meshCount += 1;
    triangles += triangleCount(o);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat) continue;
      materials.add(mat);
      // Kumpulkan texture dari seluruh properti material.
      for (const value of Object.values(mat as unknown as Record<string, unknown>)) {
        if (value instanceof Texture && value.image) {
          textures.add(value);
          const img = value.image as { width?: number; height?: number };
          maxTextureSize = Math.max(maxTextureSize, img.width ?? 0, img.height ?? 0);
        }
      }
    }
  });

  const size = new Vector3();
  new Box3().setFromObject(scene).getSize(size);

  // Deteksi ekstensi kompresi dari json glTF.
  const used: string[] = gltf.parser.json.extensionsUsed ?? [];
  const usesDraco = used.includes('KHR_draco_mesh_compression');
  const usesKTX2 = used.includes('KHR_texture_basisu');
  const usesMeshopt = used.includes('EXT_meshopt_compression');

  const warnings: ModelWarning[] = [];
  if (triangles > TRI_WARN) {
    warnings.push({
      level: 'warning',
      message: `Jumlah triangle tinggi (${Math.round(triangles).toLocaleString('id-ID')}). Pertimbangkan decimate/LOD atau kompresi Draco/Meshopt.`,
    });
  }
  if (maxTextureSize > TEX_WARN) {
    warnings.push({
      level: 'warning',
      message: `Tekstur besar (${maxTextureSize}px). Pertimbangkan turunkan resolusi atau pakai KTX2/Basis.`,
    });
  }
  if (fileSize && fileSize > 50 * 1024 * 1024) {
    warnings.push({ level: 'warning', message: 'Ukuran file > 50 MB — pertimbangkan kompresi gltf-transform.' });
  }

  return {
    meshCount,
    triangleCount: Math.round(triangles),
    materialCount: materials.size,
    textureCount: textures.size,
    maxTextureSize,
    dimensions: [size.x, size.y, size.z],
    animationCount: gltf.animations.length,
    usesDraco,
    usesKTX2,
    usesMeshopt,
    warnings,
  };
}

/** Hitung statistik saat model berubah dan simpan ke store. */
export function useModelStats(gltf: GLTF, fileSize?: number): void {
  const setStats = useViewerStore((s) => s.setStats);
  useEffect(() => {
    setStats(computeModelStats(gltf, fileSize));
  }, [gltf, fileSize, setStats]);
}
