import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { type Euler, LoopOnce, MathUtils, type Vector3 } from 'three';
import { useViewerStore } from '@/store/viewerStore';
import {
  buildInteractiveList,
  DEFAULT_ANGLE,
  DEFAULT_DISTANCE,
  type InteractiveEntry,
} from '@/lib/interactions';
import { mixerRuntime } from '@/lib/mixerRegistry';

const EPS_ROT = 0.0015; // rad
const EPS_POS = 0.0008; // m
const EPS_PROG = 0.002;

interface ResolvedInteractions {
  entries: InteractiveEntry[];
  uuidSet: Set<string>;
  byUuid: Map<string, InteractiveEntry>;
}

/** Resolusi daftar node interaktif untuk scene aktif (memo pada scene + manual + clips). */
export function useInteractions(): ResolvedInteractions {
  const sceneRoot = useViewerStore((s) => s.sceneRoot);
  const clips = useViewerStore((s) => s.clips);
  const manual = useViewerStore((s) => s.manualInteractions);

  return useMemo(() => {
    const clipNames = clips.map((c) => c.name);
    const entries = sceneRoot ? buildInteractiveList(sceneRoot, clipNames, manual) : [];
    return {
      entries,
      uuidSet: new Set(entries.map((e) => e.uuid)),
      byUuid: new Map(entries.map((e) => [e.uuid, e])),
    };
  }, [sceneRoot, clips, manual]);
}

interface BaseTransform {
  pos: Vector3;
  rot: Euler;
}

/**
 * Menggerakkan transisi buka/tutup tiap frame dengan easing halus (maath easing.damp):
 * - rotate/translate: damp transform node ke base + delta×open.
 * - animation (clip): damp progress 0..1 lalu set action.time (action paused agar tidak
 *   maju sendiri oleh mixer panel), pose diterapkan mixer.update.
 * Menjaga frameloop "always" (store.interacting) selama masih ada yang bergerak.
 */
export function useInteractionTransitions(entries: InteractiveEntry[]): void {
  const baseRef = useRef<Map<string, BaseTransform>>(new Map());
  const progRef = useRef<Map<string, { v: number }>>(new Map());
  const clipInitRef = useRef<Set<string>>(new Set());
  const setInteracting = useViewerStore((s) => s.setInteracting);
  const movingRef = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // batasi lonjakan delta saat tab kembali aktif
    const openState = useViewerStore.getState().openState;
    let moving = false;

    for (const { uuid, obj, config } of entries) {
      // Tangkap pose dasar (rest/closed) sekali.
      let base = baseRef.current.get(uuid);
      if (!base) {
        base = { pos: obj.position.clone(), rot: obj.rotation.clone() };
        baseRef.current.set(uuid, base);
      }
      const open = openState[uuid] === true;
      const smooth = (config.duration || 0.6) * 0.4;

      if (config.type === 'rotate') {
        const axis = config.axis;
        const target = base.rot[axis] + (open ? (config.angle ?? DEFAULT_ANGLE) * MathUtils.DEG2RAD : 0);
        easing.damp(obj.rotation, axis, target, smooth, dt);
        if (Math.abs(obj.rotation[axis] - target) > EPS_ROT) moving = true;
      } else if (config.type === 'translate') {
        const axis = config.axis;
        const target = base.pos[axis] + (open ? (config.distance ?? DEFAULT_DISTANCE) : 0);
        easing.damp(obj.position, axis, target, smooth, dt);
        if (Math.abs(obj.position[axis] - target) > EPS_POS) moving = true;
      } else if (config.type === 'animation' && config.clip) {
        const action = mixerRuntime.actions[config.clip];
        if (action) {
          const dur = action.getClip().duration;
          // Inisialisasi action sebagai paused+enabled agar hanya pose yang diterapkan.
          if (!clipInitRef.current.has(uuid)) {
            action.reset();
            action.setLoop(LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
            action.paused = true;
            action.enabled = true;
            action.setEffectiveWeight(1);
            clipInitRef.current.add(uuid);
            progRef.current.set(uuid, { v: 0 });
          }
          const prog = progRef.current.get(uuid) ?? { v: 0 };
          const targetV = open ? 1 : 0;
          easing.damp(prog, 'v', targetV, smooth, dt);
          progRef.current.set(uuid, prog);
          action.time = MathUtils.clamp(prog.v, 0, 1) * dur;
          if (Math.abs(prog.v - targetV) > EPS_PROG) moving = true;
        }
      }
    }

    if (moving !== movingRef.current) {
      movingRef.current = moving;
      setInteracting(moving);
    }
  });
}
