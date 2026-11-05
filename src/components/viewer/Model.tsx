import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { invalidate, useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  Box3,
  type Group,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  Sphere,
  Vector3,
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
import type { ModelSource, WireframeMode } from '@/types/viewer';

const CLICK_THRESHOLD = 6; // px — di atas ini dianggap drag kamera, bukan klik.

// Warna seragam untuk garis wireframe (agar topologi mudah dibaca, tidak
// mengikuti warna/tekstur objek — mirip inspector Sketchfab).
const WIREFRAME_COLOR = '#2b6cff';
const WIREFRAME_OVERLAY = '__wireframeOverlay';
// Ambang sudut EdgesGeometry (derajat): garis hanya digambar bila dua segitiga
// bertemu di sudut > nilai ini. Menyembunyikan diagonal segitiga pada permukaan
// datar/nyaris datar → topologi bersih (mirip Sketchfab), tidak jadi "blok biru".
const WIREFRAME_EDGE_ANGLE = 25;

// Material permukaan flat netral untuk mode 'overlay' (Topologi) — meniru
// inspector Sketchfab: warna seragam terang, matte, dan OPAQUE. Opaque + tulis
// depth = garis sisi belakang teroklusi (tidak tembus pandang / "sarang laba-laba"
// di roda), dan tekstur/warna asli disembunyikan supaya garis biru mudah dibaca.
// Polygon offset mendorong permukaan sedikit ke belakang agar garis tidak z-fight.
// Dibagikan antar mesh & ditandai __wfKeep supaya tidak ikut di-dispose saat model
// berganti (lihat disposeObject).
const flatSurfaceMaterial = new MeshStandardMaterial({
  color: '#d4d6db',
  roughness: 0.95,
  metalness: 0,
  // Double-sided: geometri tipis/terbuka (panel bodi, pelat) tetap menulis depth
  // dari kedua sisi → garis sisi belakang teroklusi (mirip Sketchfab "Single Sided OFF").
  side: DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});
flatSurfaceMaterial.userData.__wfKeep = true;

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

// Properti material yang diubah mode 'colored'. Snapshot nilai asli disimpan di
// material.userData dan HANYA diambil sekali (cek undefined) — penting karena di
// GLB satu material sering dipakai banyak mesh; tanpa ini, mesh kedua akan
// men-snapshot nilai yang sudah dimutasi mesh pertama (true), lalu saat restore
// nilai "true" itu bocor → wireframe nyangkut walau sudah dimatikan.
interface WFMaterial {
  wireframe?: boolean;
  needsUpdate?: boolean;
  userData: Record<string, unknown> & { __wfWire?: boolean };
}

interface WireframeHost extends Mesh {
  userData: Record<string, unknown> & {
    __wfOverlay?: LineSegments;
    /** Material asli mesh, disimpan saat mode Topologi menukar ke material flat. */
    __wfOrigMat?: Material | Material[];
  };
}

function materialsOf(mesh: Mesh): WFMaterial[] {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as unknown as WFMaterial[];
}

// Mode 'colored': material.wireframe = true (kerangka ikut warna material).
function setMatWire(m: WFMaterial, on: boolean): void {
  if (on) {
    if (m.userData.__wfWire === undefined) m.userData.__wfWire = m.wireframe ?? false;
    m.wireframe = true;
    m.needsUpdate = true;
  } else {
    const s = m.userData.__wfWire;
    if (s !== undefined) {
      m.wireframe = s;
      m.needsUpdate = true;
      delete m.userData.__wfWire;
    }
  }
}

function addOverlay(mesh: Mesh, host: WireframeHost): void {
  if (host.userData.__wfOverlay) return;
  // Overlay berbagi koordinat geometri mesh → sejajar sempurna sebagai child.
  // EdgesGeometry (bukan WireframeGeometry) → hanya garis tepi "nyata", diagonal
  // segitiga pada permukaan datar disembunyikan supaya tidak terlalu padat.
  const lines = new LineSegments(
    new EdgesGeometry(mesh.geometry, WIREFRAME_EDGE_ANGLE),
    new LineBasicMaterial({ color: WIREFRAME_COLOR }),
  );
  lines.name = WIREFRAME_OVERLAY;
  lines.renderOrder = 1;
  lines.castShadow = false;
  lines.receiveShadow = false;
  lines.raycast = () => {}; // jangan ganggu klik/hover interaksi
  mesh.add(lines);
  host.userData.__wfOverlay = lines;
}

// Bersihkan SEMUA jejak wireframe pada satu mesh & pulihkan materialnya.
function clearMesh(mesh: Mesh): void {
  const host = mesh as WireframeHost;
  const lines = host.userData.__wfOverlay;
  if (lines) {
    lines.parent?.remove(lines);
    lines.geometry.dispose();
    (lines.material as Material).dispose();
    delete host.userData.__wfOverlay;
  }
  // Pulihkan material asli bila mode Topologi sempat menukarnya ke flat.
  const orig = host.userData.__wfOrigMat;
  if (orig !== undefined) {
    mesh.material = orig;
    delete host.userData.__wfOrigMat;
  }
  // Pulihkan flag wireframe bila mode Berwarna sempat menyalakannya.
  for (const m of materialsOf(mesh)) setMatWire(m, false);
}

// Terapkan wireframe ke seluruh scene. Selalu BERSIHKAN dulu lalu pasang mode
// yang diminta → deterministik, aman untuk ganti mode maupun material yang
// dipakai bersama banyak mesh.
function applySceneWireframe(scene: Object3D, on: boolean, mode: WireframeMode): void {
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if (isMesh(o) && o.name !== WIREFRAME_OVERLAY) meshes.push(o);
  });

  for (const mesh of meshes) clearMesh(mesh);
  if (!on) return;

  for (const mesh of meshes) {
    if (mode === 'colored') {
      // Berwarna: pertahankan material asli, cukup aktifkan material.wireframe.
      for (const m of materialsOf(mesh)) setMatWire(m, true);
    } else {
      // Topologi: ganti permukaan jadi flat opaque (oklusi benar) + garis biru.
      const host = mesh as WireframeHost;
      if (host.userData.__wfOrigMat === undefined) host.userData.__wfOrigMat = mesh.material;
      mesh.material = flatSurfaceMaterial;
      addOverlay(mesh, host);
    }
  }
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
  const wireframeMode = useViewerStore((s) => s.settings.wireframeMode);
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
    applySceneWireframe(scene, wireframe, wireframeMode);
    invalidate();
    return () => {
      // Bersihkan overlay & pulihkan material saat cleanup (model berganti / unmount).
      applySceneWireframe(scene, false, wireframeMode);
    };
  }, [scene, wireframe, wireframeMode]);

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
