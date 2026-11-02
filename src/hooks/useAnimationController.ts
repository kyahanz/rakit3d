import { useEffect, useRef } from 'react';
import { useAnimations } from '@react-three/drei';
import { invalidate, useFrame } from '@react-three/fiber';
import {
  LoopOnce,
  LoopPingPong,
  LoopRepeat,
  type AnimationAction,
  type AnimationActionLoopStyles,
  type Object3D,
} from 'three';
import type { AnimationApi, LoopMode, PlaybackInfo } from '@/types/viewer';
import { useViewerStore } from '@/store/viewerStore';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CROSSFADE = 0.3;
type ClipState = 'stopped' | 'playing' | 'paused';

const LOOP_MAP: Record<LoopMode, AnimationActionLoopStyles> = {
  once: LoopOnce,
  repeat: LoopRepeat,
  pingpong: LoopPingPong,
};

function applyLoop(action: AnimationAction, mode: LoopMode): void {
  action.setLoop(LOOP_MAP[mode], mode === 'once' ? 1 : Infinity);
  action.clampWhenFinished = mode === 'once';
}

/**
 * Mengelola AnimationMixer untuk model aktif dan mengekspos API ke store agar
 * AnimationPanel (DOM) bisa mengendalikannya. Menjaga render loop tetap jalan
 * (invalidate) selama ada clip yang bermain, lalu kembali idle saat berhenti.
 */
export function useAnimationController(gltf: GLTF, scene: Object3D): void {
  const { actions, mixer, names } = useAnimations(gltf.animations, scene);

  const setClips = useViewerStore((s) => s.setClips);
  const setPlayback = useViewerStore((s) => s.setPlayback);
  const setAnimApi = useViewerStore((s) => s.setAnimApi);
  const setAnimating = useViewerStore((s) => s.setAnimating);

  const stateRef = useRef<Record<string, ClipState>>({});
  const loopRef = useRef<Record<string, LoopMode>>({});
  const speedRef = useRef<Record<string, number>>({});
  const animatingRef = useRef(false);
  const accRef = useRef(0);

  useEffect(() => {
    const clips = gltf.animations.map((c) => ({ name: c.name, duration: c.duration }));
    setClips(clips);

    // Inisialisasi state & publish awal.
    for (const c of clips) {
      stateRef.current[c.name] = 'stopped';
      loopRef.current[c.name] = 'repeat';
      speedRef.current[c.name] = 1;
    }

    const publish = () => {
      const pb: Record<string, PlaybackInfo> = {};
      for (const name of names) {
        const a = actions[name];
        pb[name] = {
          playing: stateRef.current[name] === 'playing',
          paused: stateRef.current[name] === 'paused',
          time: a ? a.time : 0,
          loop: loopRef.current[name],
          speed: speedRef.current[name],
        };
      }
      setPlayback(pb);
    };

    // Set frameloop "always" saat ada clip bermain, kembali "demand" saat berhenti.
    const syncAnimating = () => {
      const any = names.some((n) => stateRef.current[n] === 'playing');
      if (any !== animatingRef.current) {
        animatingRef.current = any;
        setAnimating(any);
      }
    };

    const play = (name: string) => {
      const a = actions[name];
      if (!a) return;
      applyLoop(a, loopRef.current[name]);
      a.timeScale = speedRef.current[name];
      a.enabled = true;
      if (stateRef.current[name] === 'paused') {
        a.paused = false; // resume
      } else if (stateRef.current[name] === 'stopped') {
        a.reset();
        a.fadeIn(CROSSFADE); // crossfade halus saat mulai
        a.play();
      }
      stateRef.current[name] = 'playing';
      invalidate();
      publish();
      syncAnimating();
    };

    const pause = (name: string) => {
      const a = actions[name];
      if (!a) return;
      a.paused = true;
      stateRef.current[name] = 'paused';
      invalidate();
      publish();
      syncAnimating();
    };

    const stop = (name: string) => {
      const a = actions[name];
      if (!a) return;
      a.fadeOut(CROSSFADE);
      stateRef.current[name] = 'stopped';
      // Setelah fade selesai, hentikan & reset.
      window.setTimeout(() => {
        if (stateRef.current[name] === 'stopped') {
          a.stop();
          a.reset();
          publish();
          invalidate();
        }
      }, CROSSFADE * 1000 + 20);
      invalidate();
      publish();
      syncAnimating();
    };

    const seek = (name: string, time: number) => {
      const a = actions[name];
      if (!a) return;
      if (stateRef.current[name] === 'stopped') {
        // Aktifkan dalam mode paused agar pose bisa di-preview.
        a.reset();
        a.play();
        a.paused = true;
        a.enabled = true;
        stateRef.current[name] = 'paused';
      }
      a.time = time;
      mixer.update(0); // terapkan pose pada waktu baru
      invalidate();
      publish();
      syncAnimating();
    };

    const setSpeed = (name: string, speed: number) => {
      speedRef.current[name] = speed;
      const a = actions[name];
      if (a) a.timeScale = speed;
      invalidate();
      publish();
    };

    const setLoop = (name: string, loop: LoopMode) => {
      loopRef.current[name] = loop;
      const a = actions[name];
      if (a && stateRef.current[name] !== 'stopped') applyLoop(a, loop);
      publish();
    };

    const api: AnimationApi = {
      play,
      pause,
      stop,
      stopAll: () => names.forEach(stop),
      seek,
      setSpeed,
      setLoop,
    };

    setAnimApi(api);
    publish();

    // Clip 'once' yang selesai → tandai stopped.
    const onFinished = (e: { action: AnimationAction }) => {
      const name = names.find((n) => actions[n] === e.action);
      if (name) {
        stateRef.current[name] = 'stopped';
        publish();
        syncAnimating();
      }
    };
    mixer.addEventListener('finished', onFinished);

    return () => {
      mixer.removeEventListener('finished', onFinished);
      setAnimApi(null);
      if (animatingRef.current) {
        animatingRef.current = false;
        setAnimating(false);
      }
    };
  }, [actions, mixer, names, gltf.animations, setClips, setPlayback, setAnimApi, setAnimating]);

  // Saat animasi berjalan (frameloop "always"), publish posisi scrubber secara throttle.
  useFrame((_, delta) => {
    if (!animatingRef.current) return;
    accRef.current += delta;
    if (accRef.current < 0.08) return;
    accRef.current = 0;
    const pb: Record<string, PlaybackInfo> = {};
    for (const name of names) {
      const a = actions[name];
      pb[name] = {
        playing: stateRef.current[name] === 'playing',
        paused: stateRef.current[name] === 'paused',
        time: a ? a.time : 0,
        loop: loopRef.current[name],
        speed: speedRef.current[name],
      };
    }
    setPlayback(pb);
  });
}
