import { useLayoutEffect, useRef } from 'react';
import { invalidate } from '@react-three/fiber';
import { Box3, type Group, type Mesh, type Object3D, Sphere, Vector3 } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useViewerStore } from '@/store/viewerStore';

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

interface ModelProps {
  gltf: GLTF;
}

/**
 * Menempatkan model di tengah (sumbu X/Z) dan di atas lantai (y=0), menghitung
 * radius untuk batas zoom, dan mengaktifkan shadow. Interaksi & wireframe
 * ditambahkan pada tahap berikutnya.
 */
export function Model({ gltf }: ModelProps) {
  const scene = gltf.scene;
  const groupRef = useRef<Group>(null);
  const setModelRadius = useViewerStore((s) => s.setModelRadius);

  useLayoutEffect(() => {
    const box = new Box3().setFromObject(scene);
    const center = new Vector3();
    const sphere = new Sphere();
    box.getCenter(center);
    box.getBoundingSphere(sphere);

    if (groupRef.current) {
      // Pusatkan horizontal, turunkan agar dasar model menempel di y=0 (lantai shadow).
      groupRef.current.position.set(-center.x, -box.min.y, -center.z);
    }

    setModelRadius(sphere.radius > 0 ? sphere.radius : 1);

    // Aktifkan shadow untuk semua mesh.
    scene.traverse((o) => {
      if (isMesh(o)) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    invalidate();
  }, [scene, setModelRadius]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
