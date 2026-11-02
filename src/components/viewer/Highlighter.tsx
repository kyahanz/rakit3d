import { useEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { type Color, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { useViewerStore } from '@/store/viewerStore';
import type { InteractiveEntry } from '@/lib/interactions';

interface Applied {
  mat: MeshStandardMaterial;
  hex: number;
  intensity: number;
}

const HOVER_COLOR = 0x2a6cc0;
const SELECT_COLOR = 0x1e3a5f;

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

function hasEmissive(mat: unknown): mat is MeshStandardMaterial {
  return !!mat && (mat as { emissive?: Color }).emissive !== undefined;
}

/**
 * Highlight emissive tipis untuk node yang di-hover (lebih terang) dan yang dipilih
 * di tree (lebih redup). Menyimpan emissive asli lalu memulihkannya saat berganti.
 */
export function Highlighter({ byUuid }: { byUuid: Map<string, InteractiveEntry> }) {
  const hoveredUuid = useViewerStore((s) => s.hovered?.uuid ?? null);
  const selectedUuid = useViewerStore((s) => s.selectedUuid);
  const appliedRef = useRef<Applied[]>([]);

  useEffect(() => {
    // Pulihkan emissive sebelumnya.
    for (const a of appliedRef.current) {
      a.mat.emissive.setHex(a.hex);
      a.mat.emissiveIntensity = a.intensity;
    }
    appliedRef.current = [];

    const apply = (uuid: string | null, color: number, intensity: number) => {
      if (!uuid) return;
      const entry = byUuid.get(uuid);
      if (!entry) return;
      entry.obj.traverse((o) => {
        if (!isMesh(o)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          if (!hasEmissive(mat)) continue;
          appliedRef.current.push({ mat, hex: mat.emissive.getHex(), intensity: mat.emissiveIntensity });
          mat.emissive.setHex(color);
          mat.emissiveIntensity = intensity;
        }
      });
    };

    if (selectedUuid && selectedUuid !== hoveredUuid) apply(selectedUuid, SELECT_COLOR, 0.5);
    apply(hoveredUuid, HOVER_COLOR, 0.9);
    invalidate();
  }, [hoveredUuid, selectedUuid, byUuid]);

  return null;
}
