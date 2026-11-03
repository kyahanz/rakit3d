import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { invalidate, useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  Box3,
  type Group,
  LineBasicMaterial,
  LineSegments,
  type Material,
  type Mesh,
  type Object3D,
  Sphere,
  Vector3,
  WireframeGeometry,
} from 'three';
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

// Warna seragam untuk garis wireframe (agar topologi mudah dibaca, tidak
// mengikuti warna/tekstur objek — mirip inspector Sketchfab).
const WIREFRAME_COLOR = '#2b6cff';
const WIREFRAME_OVERLAY = '__wireframeOverlay';

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

// Material permukaan yang bisa diberi polygon offset (dorong ke belakang agar
// garis wireframe di atasnya tidak z-fighting).
interface OffsetMaterial {
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  needsUpdate?: boolean;
}

interface OffsetSnapshot {
  m: OffsetMaterial;
  po: boolean;
  pf: number;
  pu: number;
}

interface WireframeHost extends Mesh {
  userData: Record<string, unknown> & {
    __wfOverlay?: LineSegments;
    __wfOffset?: OffsetSnapshot[];
  };
}

// Aktifkan/matikan wireframe pada SATU mesh. Model tetap tampil solid; garis
// wireframe satu warna digambar sebagai overlay di atas permukaan (bukan
// mengubah material jadi kerangka transparan). Permukaan diberi polygon offset
// agar garis bersih tanpa z-fighting.
function setMeshWireframe(mesh: Mesh, on: boolean): void {
  const host = mesh as WireframeHost;
  if (on) {
    if (host.userData.__wfOverlay) return; // sudah aktif

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    host.userData.__wfOffset = mats.map((mm) => {
      const m = mm as OffsetMaterial;
      const snap: OffsetSnapshot = {
        m,
        po: m.polygonOffset ?? false,
        pf: m.polygonOffsetFactor ?? 0,
        pu: m.polygonOffsetUnits ?? 0,
      };
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1;
      m.polygonOffsetUnits = 1;
      m.needsUpdate = true;
      return snap;
    });

    // Overlay berbagi koordinat geometri mesh → sejajar sempurna sebagai child.
    const lines = new LineSegments(
      new WireframeGeometry(mesh.geometry),
      new LineBasicMaterial({ color: WIREFRAME_COLOR }),
    );
    lines.name = WIREFRAME_OVERLAY;
    lines.renderOrder = 1;
    lines.castShadow = false;
    lines.receiveShadow = false;
    lines.raycast = () => {}; // jangan ganggu klik/hover interaksi
    mesh.add(lines);
    host.userData.__wfOverlay = lines;
  } else {
    const lines = host.userData.__wfOverlay;
    if (lines) {
      mesh.remove(lines);
      lines.geometry.dispose();
      (lines.material as Material).dispose();
      delete host.userData.__wfOverlay;
    }
    const offs = host.userData.__wfOffset;
    if (offs) {
      for (const s of offs) {
        s.m.polygonOffset = s.po;
        s.m.polygonOffsetFactor = s.pf;
        s.m.polygonOffsetUnits = s.pu;
        s.m.needsUpdate = true;
      }
      delete host.userData.__wfOffset;
    }
  }
}

// Kumpulkan dulu daftar mesh, baru terapkan (hindari mutasi children saat traverse).
function applySceneWireframe(scene: Object3D, on: boolean): void {
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if (isMesh(o) && o.name !== WIREFRAME_OVERLAY) meshes.push(o);
  });
  for (const m of meshes) setMeshWireframe(m, on);
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

  // Terapkan wireframe saat setting berubah. Model tetap solid; garis topologi
  // satu warna digambar sebagai overlay di atasnya (lihat setMeshWireframe).
  useEffect(() => {
    applySceneWireframe(scene, wireframe);
    invalidate();
    return () => {
      // Bersihkan overlay & pulihkan material saat cleanup (model berganti / unmount).
      applySceneWireframe(scene, false);
    };
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
