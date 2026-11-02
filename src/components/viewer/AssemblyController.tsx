/* eslint-disable react-hooks/immutability --
   Controller ini SENGAJA memutasi objek three.js (visible, material, posisi) yang berasal
   dari `plan` (memo). Itu operasi framework (mengubah scene graph), bukan state React. */
import { useEffect, useMemo, useRef } from 'react';
import { invalidate, useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { Box3, type Color, type Mesh, type MeshStandardMaterial, type Object3D, Vector3 } from 'three';
import { useViewerStore } from '@/store/viewerStore';
import { findByName } from '@/lib/assembly';
import { setStepMap } from '@/lib/assemblyRuntime';
import type { ParsedAssembly } from '@/types/viewer';

const EXPLODE_MULT = 1.4;
const ACCENT = 0xb4541f;
const GHOST_OPACITY = 0.14;

interface Part {
  obj: Object3D;
  base: Vector3;
  dir: Vector3;
}

interface AssemblyPlan {
  parts: Part[];
  stepNodes: Map<number, Object3D[]>;
  stepOfUuid: Map<string, number>;
}

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}
function hasStandardMat(mat: unknown): mat is MeshStandardMaterial {
  return !!mat && (mat as { emissive?: Color }).emissive !== undefined;
}

/** Bangun rencana explode (part + arah) dan peta langkah dari assembly + scene. */
function buildPlan(root: Object3D | null, assembly: ParsedAssembly | null): AssemblyPlan {
  const parts: Part[] = [];
  const stepNodes = new Map<number, Object3D[]>();
  const stepOfUuid = new Map<string, number>();
  if (!root || !assembly) return { parts, stepNodes, stepOfUuid };

  const center = new Vector3();
  for (const g of assembly.groups) {
    const groupObj = findByName(root, g.node);
    if (!groupObj) continue;
    const children = groupObj.children;
    if (children.length === 0) continue;
    center.set(0, 0, 0);
    for (const c of children) center.add(c.position);
    center.multiplyScalar(1 / children.length);
    for (const c of children) {
      const dir = c.position.clone().sub(center);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0.01, 0);
      parts.push({ obj: c, base: c.position.clone(), dir });
    }
  }

  for (const step of assembly.steps) {
    const objs: Object3D[] = [];
    for (const name of step.nodes) {
      const o = findByName(root, name);
      if (o) {
        objs.push(o);
        o.traverse((d) => stepOfUuid.set(d.uuid, step.n));
      }
    }
    stepNodes.set(step.n, objs);
  }

  return { parts, stepNodes, stepOfUuid };
}

interface Applied {
  mat: MeshStandardMaterial;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  emissiveHex: number;
  emissiveIntensity: number;
}

/**
 * Mengendalikan explode (easing), visibilitas/transparansi per langkah, highlight langkah
 * aktif, dan fokus kamera ke part langkah. Dirender di dalam group grounding Model agar
 * koordinat sama dengan mesh scene.
 */
export function AssemblyController({ sceneRoot }: { sceneRoot: Object3D }) {
  const assembly = useViewerStore((s) => s.assembly);
  const activeStep = useViewerStore((s) => s.activeStep);
  const hideFuture = useViewerStore((s) => s.settings.assemblyHideFuture);
  const radius = useViewerStore((s) => s.modelRadius);
  const groupVisibility = useViewerStore((s) => s.groupVisibility);
  const assemblyToggles = useViewerStore((s) => s.assemblyToggles);

  const plan = useMemo(() => buildPlan(sceneRoot, assembly), [sceneRoot, assembly]);

  // Daftarkan peta langkah untuk handler klik di Model.
  useEffect(() => {
    setStepMap(plan.stepOfUuid);
    return () => setStepMap(new Map());
  }, [plan]);

  const eRef = useRef({ v: 0 });
  const dropRef = useRef({ v: 1 });
  const prevStepRef = useRef<number | null>(null);
  const movingRef = useRef(false);

  useFrame((_, dt) => {
    if (!assembly) return;
    const st = useViewerStore.getState();
    const targetE = st.explode;
    easing.damp(eRef.current, 'v', targetE, 0.18, dt);
    const e = eRef.current.v;

    if (st.activeStep !== prevStepRef.current) {
      prevStepRef.current = st.activeStep;
      dropRef.current.v = st.activeStep != null ? 0 : 1; // mulai dari "terangkat"
    }
    easing.damp(dropRef.current, 'v', 1, 0.18, dt);
    const drop = (1 - dropRef.current.v) * Math.max(0.1, radius) * 0.25;

    const moving = Math.abs(e - targetE) > 0.0008 || dropRef.current.v < 0.999;
    const managing = e > 0.0008 || st.activeStep != null || moving;

    if (managing) {
      for (const p of plan.parts) {
        const ox = p.dir.x * e * EXPLODE_MULT;
        const oy = p.dir.y * e * EXPLODE_MULT;
        const oz = p.dir.z * e * EXPLODE_MULT;
        const isActive = st.activeStep != null && plan.stepOfUuid.get(p.obj.uuid) === st.activeStep;
        p.obj.position.set(p.base.x + ox, p.base.y + oy + (isActive ? drop : 0), p.base.z + oz);
      }
    }

    if (moving !== movingRef.current) {
      movingRef.current = moving;
      st.setAssemblyAnimating(moving);
    }
  });

  // Visibilitas/transparansi + highlight langkah (bukan per-frame).
  const appliedRef = useRef<Applied[]>([]);
  useEffect(() => {
    // Pulihkan material sebelumnya.
    for (const a of appliedRef.current) {
      a.mat.opacity = a.opacity;
      a.mat.transparent = a.transparent;
      a.mat.depthWrite = a.depthWrite;
      a.mat.emissive.setHex(a.emissiveHex);
      a.mat.emissiveIntensity = a.emissiveIntensity;
    }
    appliedRef.current = [];
    for (const [, objs] of plan.stepNodes) for (const o of objs) (o.visible = true);

    const eachMat = (o: Object3D, fn: (m: MeshStandardMaterial) => void) => {
      o.traverse((n) => {
        if (!isMesh(n)) return;
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        for (const m of mats) if (hasStandardMat(m)) fn(m);
      });
    };

    if (assembly && activeStep != null) {
      for (const [n, objs] of plan.stepNodes) {
        if (n > activeStep) {
          for (const o of objs) {
            if (hideFuture) {
              o.visible = false;
            } else {
              eachMat(o, (m) => {
                appliedRef.current.push({
                  mat: m,
                  opacity: m.opacity,
                  transparent: m.transparent,
                  depthWrite: m.depthWrite,
                  emissiveHex: m.emissive.getHex(),
                  emissiveIntensity: m.emissiveIntensity,
                });
                m.transparent = true;
                m.opacity = GHOST_OPACITY;
                m.depthWrite = false;
              });
            }
          }
        } else if (n === activeStep) {
          for (const o of objs) {
            eachMat(o, (m) => {
              appliedRef.current.push({
                mat: m,
                opacity: m.opacity,
                transparent: m.transparent,
                depthWrite: m.depthWrite,
                emissiveHex: m.emissive.getHex(),
                emissiveIntensity: m.emissiveIntensity,
              });
              m.emissive.setHex(ACCENT);
              m.emissiveIntensity = 0.5;
            });
          }
        }
      }
    }
    invalidate();
  }, [assembly, activeStep, hideFuture, plan]);

  // Visibilitas grup (chip TAMPILKAN) + toggle bertipe 'visibility'.
  useEffect(() => {
    if (!assembly) return;
    for (const g of assembly.groups) {
      const o = findByName(sceneRoot, g.node);
      if (o) o.visible = groupVisibility[g.id] !== false;
    }
    for (const t of assembly.toggles) {
      if (t.type !== 'visibility' || !t.nodes) continue;
      const visible = assemblyToggles[t.id] === true;
      for (const name of t.nodes) {
        const o = findByName(sceneRoot, name);
        if (o) o.visible = visible;
      }
    }
    invalidate();
  }, [assembly, groupVisibility, assemblyToggles, sceneRoot]);

  // Fokus kamera ke part langkah aktif; kembali fit seluruh model saat keluar mode langkah.
  const prevFocusStep = useRef<number | null>(null);
  useEffect(() => {
    if (!assembly) return;
    const prev = prevFocusStep.current;
    prevFocusStep.current = activeStep;

    if (activeStep == null) {
      // Hanya refit saat benar-benar keluar dari sebuah langkah (bukan saat load awal).
      if (prev != null) useViewerStore.getState().resetCamera();
      return;
    }

    const objs = plan.stepNodes.get(activeStep);
    if (!objs || objs.length === 0) return;
    const box = new Box3();
    for (const o of objs) box.expandByObject(o);
    if (box.isEmpty()) return;

    // Beri margin agar part tipis (mis. panel) tidak membuat kamera over-zoom.
    const size = new Vector3();
    box.getSize(size);
    box.expandByScalar(Math.max(size.x, size.y, size.z, 0.1) * 0.6);
    useViewerStore
      .getState()
      .focusBounds([box.min.x, box.min.y, box.min.z], [box.max.x, box.max.y, box.max.z]);
  }, [assembly, activeStep, plan]);

  return null;
}
