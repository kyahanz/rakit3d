// Jembatan antara useAnimationController (pemilik mixer) dan InteractionController
// (butuh action untuk interaksi berbasis clip). Disimpan di luar React agar tidak
// memicu re-render; di-set/clear oleh controller animasi saat model berganti.
import type { AnimationAction, AnimationMixer } from 'three';

interface MixerRuntime {
  mixer: AnimationMixer | null;
  actions: Record<string, AnimationAction | null>;
}

export const mixerRuntime: MixerRuntime = {
  mixer: null,
  actions: {},
};

export function setMixerRuntime(mixer: AnimationMixer | null, actions: Record<string, AnimationAction | null>): void {
  mixerRuntime.mixer = mixer;
  mixerRuntime.actions = actions;
}
