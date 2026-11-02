// Parser konvensi interaksi (generik, data-driven — tidak ada nama model/part hardcode).
// Prioritas resolusi (lihat resolveInteraction di hooks/useInteractions pada tahap 6):
//   A. userData extras dari glTF (object.userData.interactive, axis, angle, dst.)
//   B. konvensi nama node diawali "INT_" (+ clip yang mengandung nama node)
//   C. override manual dari UI
import type { Object3D } from 'three';
import type {
  Axis,
  InteractionConfig,
  InteractionType,
  ManualInteraction,
} from '@/types/viewer';

/** Default sudut rotate (derajat) & jarak translate (meter) bila tidak ditentukan. */
export const DEFAULT_ANGLE = 90;
export const DEFAULT_DISTANCE = 0.3;

export const INT_PREFIX = 'INT_';

const VALID_TYPES: InteractionType[] = ['rotate', 'translate', 'animation'];
const VALID_AXES: Axis[] = ['x', 'y', 'z'];

function asAxis(value: unknown, fallback: Axis): Axis {
  return typeof value === 'string' && VALID_AXES.includes(value as Axis) ? (value as Axis) : fallback;
}

function asType(value: unknown): InteractionType | null {
  return typeof value === 'string' && VALID_TYPES.includes(value as InteractionType)
    ? (value as InteractionType)
    : null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Apakah node punya petunjuk interaksi (userData atau konvensi nama) — untuk badge UI. */
export function hasInteractionHint(obj: Object3D): boolean {
  const ud = obj.userData as Record<string, unknown>;
  if (ud && typeof ud.interactive === 'string') return true;
  return obj.name.startsWith(INT_PREFIX);
}

/**
 * A. Baca konfigurasi interaksi dari userData extras.
 * Mengembalikan null bila tidak ada properti `interactive` yang valid.
 */
export function parseUserDataInteraction(obj: Object3D): InteractionConfig | null {
  const ud = obj.userData as Record<string, unknown>;
  if (!ud) return null;
  const type = asType(ud.interactive);
  if (!type) return null;

  return {
    type,
    axis: asAxis(ud.axis, type === 'rotate' ? 'y' : 'z'),
    angle: asNumber(ud.angle),
    distance: asNumber(ud.distance),
    clip: asString(ud.clip),
    label: asString(ud.label),
    duration: asNumber(ud.duration) ?? 0.6,
    source: 'userData',
  };
}

/** Label tampilan node: userData.label → nama tanpa prefix INT_ → nama asli. */
export function displayLabel(obj: Object3D): string {
  const ud = obj.userData as Record<string, unknown>;
  const label = asString(ud?.label);
  if (label) return label;
  if (obj.name.startsWith(INT_PREFIX)) return obj.name.slice(INT_PREFIX.length).replace(/_/g, ' ');
  return obj.name || '(tanpa nama)';
}

/** Cari clip yang namanya mengandung nama node (konvensi B, mis. "INT_Pintu_Open"). */
export function findMatchingClip(obj: Object3D, clipNames: string[]): string | undefined {
  return clipNames.find((c) => c.includes(obj.name));
}

/** C. Ubah override manual menjadi InteractionConfig. */
export function manualToConfig(m: ManualInteraction, label: string): InteractionConfig {
  return {
    type: m.type,
    axis: m.axis,
    angle: m.angle,
    distance: m.distance,
    clip: m.clip,
    label,
    duration: 0.6,
    source: 'manual',
  };
}

/**
 * Resolusi konfigurasi interaksi sebuah node dengan prioritas: C manual → A userData →
 * B konvensi INT_ (+ clip cocok, atau default rotate). Null bila tidak interaktif.
 */
export function resolveInteraction(
  obj: Object3D,
  clipNames: string[],
  manual: Record<string, ManualInteraction>,
): InteractionConfig | null {
  const m = manual[obj.uuid];
  if (m) return manualToConfig(m, displayLabel(obj));

  const ud = parseUserDataInteraction(obj);
  if (ud) {
    // type 'animation' tanpa clip eksplisit → coba cocokkan dari nama node.
    if (ud.type === 'animation' && !ud.clip) ud.clip = findMatchingClip(obj, clipNames);
    return ud;
  }

  if (obj.name.startsWith(INT_PREFIX)) {
    const clip = findMatchingClip(obj, clipNames);
    if (clip) {
      return { type: 'animation', axis: 'y', clip, label: displayLabel(obj), duration: 0.6, source: 'convention' };
    }
    // Tanpa clip → default rotate 90° pada sumbu Y.
    return {
      type: 'rotate',
      axis: 'y',
      angle: DEFAULT_ANGLE,
      label: displayLabel(obj),
      duration: 0.6,
      source: 'convention',
    };
  }

  return null;
}

export interface InteractiveEntry {
  uuid: string;
  obj: Object3D;
  config: InteractionConfig;
}

/** Bangun daftar node interaktif pada sebuah scene (generik, data-driven). */
export function buildInteractiveList(
  root: Object3D,
  clipNames: string[],
  manual: Record<string, ManualInteraction>,
): InteractiveEntry[] {
  const list: InteractiveEntry[] = [];
  root.traverse((o) => {
    const config = resolveInteraction(o, clipNames, manual);
    if (config) list.push({ uuid: o.uuid, obj: o, config });
  });
  return list;
}

/**
 * Cari node interaktif terdekat ke ATAS hierarchy mulai dari obj.
 * Dipakai saat raycast mengenai child mesh — aksi dikenakan ke parent interaktif.
 * `isInteractive` mencakup userData, konvensi INT_, dan override manual (diteruskan pemanggil).
 */
export function findInteractiveAncestor(
  obj: Object3D,
  isInteractive: (o: Object3D) => boolean,
): Object3D | null {
  let current: Object3D | null = obj;
  while (current) {
    if (isInteractive(current)) return current;
    current = current.parent;
  }
  return null;
}
