import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { invalidate, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Box3, type Group, type Mesh, type Object3D, Sphere, Vector3 } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useViewerStore } from '@/store/viewerStore';
import { useDisposeOnChange } from '@/hooks/useDisposeOnChange';
import { useModelStats } from '@/hooks/useModelStats';
import { useAnimationController } from '@/hooks/useAnimationController';
import { useInteractions, useInteractionTransitions } from '@/hooks/useInteractions';
import { displayLabel, findInteractiveAncestor } from '@/lib/interactions';
import { assemblyRuntime } from '@/lib/assemblyRuntime';
import { Highlighter } from './Highlighter';
import { AssemblyController } from './AssemblyController';
import { DimensionLines } from './DimensionLines';
import type { ModelSource } from '@/types/viewer';

const CLICK_THRESHOLD = 6; // px — di atas ini dianggap drag kamera, bukan klik.

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

interface ModelProps {
  gltf: GLTF;
  source: ModelSource;
}

export function Model({ gltf, source }: ModelProps) {
  const scene = gltf.scene;
  const groupRef = useRef<Group>(null);
  const setModelRadius = useViewerStore((s) => s.setModelRadius);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setLastGoodModel = useViewerStore((s) => s.setLastGoodModel);
  const setSceneRoot = useViewerStore((s) => s.setSceneRoot);
  const toggleInteraction = useViewerStore((s) => s.toggleInteraction);
  const setHovered = useViewerStore((s) => s.setHovered);
  const setActiveStep = useViewerStore((s) => s.setActiveStep);
  const wireframe = useViewerStore((s) => s.settings.wireframe);
  const autoRotate = useViewerStore((s) => s.settings.autoRotate);

  // Dispose model lama + clear cache + revoke URL saat model berganti.
  useDisposeOnChange(source, scene);
  // Statistik model.
  useModelStats(gltf, source.size);
  // Animasi bawaan model (mixer) + API ke store.
  useAnimationController(gltf, scene);

  // Interaksi: resolusi node interaktif + transisi buka/tutup halus.
  const interactions = useInteractions();
  useInteractionTransitions(interactions.entries);

  // Ekspos root scene ke store untuk panel di luar canvas.
  useEffect(() => {
    setSceneRoot(scene);
  }, [scene, setSceneRoot]);

  // Auto-putar objek (turntable): memutar grup pada sumbu Y agar bayangan
  // terlihat menyapu dari segala sisi. Frameloop di-set "always" oleh ViewerCanvas.
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  // Terapkan wireframe ke semua material saat setting berubah.
  useEffect(() => {
    scene.traverse((o) => {
      if (!isMesh(o)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const wf = m as { wireframe?: boolean };
        if ('wireframe' in wf) wf.wireframe = wireframe;
      }
    });
    invalidate();
  }, [scene, wireframe]);

  // Model berhasil tampil → matikan overlay & catat sebagai model baik terakhir.
  useEffect(() => {
    setLoading({ active: false, progress: 1 });
    setLastGoodModel(source);
  }, [source, setLoading, setLastGoodModel]);

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

    scene.traverse((o) => {
      if (isMesh(o)) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    invalidate();
  }, [scene, setModelRadius]);

  // --- Pointer handlers (klik toggle, hover highlight + tooltip) ---
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const findEntry = useCallback(
    (obj: Object3D) => {
      const ancestor = findInteractiveAncestor(obj, (o) => interactions.uuidSet.has(o.uuid));
      return ancestor ? (interactions.byUuid.get(ancestor.uuid) ?? null) : null;
    },
    [interactions],
  );

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    downPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const d = downPos.current;
    // Bedakan klik vs drag kamera: abaikan bila pointer bergerak jauh.
    if (d && Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) > CLICK_THRESHOLD) {
      return;
    }
    // Mode Rakit: klik part → pilih langkah tempat part dipasang.
    const assembly = useViewerStore.getState().assembly;
    if (assembly) {
      let step = assemblyRuntime.stepOfUuid.get(e.object.uuid);
      if (step == null) {
        // telusuri ke atas bila yang kena child mesh.
        let cur: Object3D | null = e.object.parent;
        while (cur && step == null) {
          step = assemblyRuntime.stepOfUuid.get(cur.uuid);
          cur = cur.parent;
        }
      }
      if (step != null) {
        e.stopPropagation();
        setActiveStep(step);
        return;
      }
    }

    const entry = findEntry(e.object);
    if (!entry) return;
    e.stopPropagation(); // kena node interaktif terdekat ke atas
    toggleInteraction(entry.uuid);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const entry = findEntry(e.object);
    const cur = useViewerStore.getState().hovered;
    if (entry) {
      e.stopPropagation();
      if (!cur || cur.uuid !== entry.uuid) {
        setHovered({
          uuid: entry.uuid,
          label: entry.config.label ?? displayLabel(entry.obj),
          x: e.nativeEvent.clientX,
          y: e.nativeEvent.clientY,
        });
        document.body.style.cursor = 'pointer';
      }
    } else if (cur) {
      setHovered(null);
      document.body.style.cursor = '';
    }
  };

  const handlePointerLeave = () => {
    if (useViewerStore.getState().hovered) setHovered(null);
    document.body.style.cursor = '';
  };

  return (
    <>
      <group ref={groupRef}>
        <primitive
          object={scene}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
        {/* Mode Rakit: explode/langkah + garis ukur (dalam frame grounding model). */}
        <AssemblyController sceneRoot={scene} />
        <DimensionLines />
      </group>
      <Highlighter byUuid={interactions.byUuid} />
    </>
  );
}
