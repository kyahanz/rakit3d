// Dispose rekursif geometry, material, dan texture agar tidak terjadi memory leak
// pada GPU saat model diganti.
import { type Material, type Mesh, type Object3D, Texture } from 'three';

function disposeMaterial(material: Material): void {
  // Dispose semua texture yang menempel pada properti material (map, normalMap, dll).
  const record = material as unknown as Record<string, unknown>;
  for (const value of Object.values(record)) {
    if (value instanceof Texture) {
      value.dispose();
    }
  }
  material.dispose();
}

/** Dispose seluruh resource GPU dari sebuah subtree Object3D. */
export function disposeObject(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    // geometry & material hanya ada pada mesh; node lain diabaikan.
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial);
    } else {
      disposeMaterial(material);
    }
  });
}
