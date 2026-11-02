// Parsing & validasi file *.assembly.json (zod). Satuan JSON = mm, dikonversi ke meter.
import { z } from 'zod';
import type { Object3D } from 'three';
import type { ParsedAssembly } from '@/types/viewer';

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

const GroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  node: z.string(),
  dims: z.string().optional(),
});

const ToggleSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['interaction', 'dimensions', 'visibility']),
  nodes: z.array(z.string()).optional(),
  states: z.array(z.string()).optional(),
});

const StepSchema = z.object({
  n: z.number(),
  group: z.string(),
  title: z.string(),
  desc: z.string().optional(),
  nodes: z.array(z.string()),
});

const DimensionSchema = z.object({
  id: z.string(),
  group: z.string().optional(),
  from: Vec3,
  to: Vec3,
  label: z.string(),
});

const AssemblySchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  groups: z.array(GroupSchema).default([]),
  toggles: z.array(ToggleSchema).default([]),
  steps: z.array(StepSchema).default([]),
  dimensions: z.array(DimensionSchema).default([]),
});

export type RawAssembly = z.infer<typeof AssemblySchema>;

export class AssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblyError';
  }
}

const MM_TO_M = 0.001;

/** Kumpulkan semua nama node yang ada di model untuk validasi referensi. */
function collectNodeNames(root: Object3D): Set<string> {
  const names = new Set<string>();
  root.traverse((o) => {
    if (o.name) names.add(o.name);
  });
  return names;
}

/**
 * Validasi + konversi RawAssembly menjadi ParsedAssembly.
 * Dimensi dikonversi mm → meter. Node yang tidak ada dicatat di `missingNodes`.
 */
export function parseAssembly(raw: unknown, sceneRoot: Object3D): ParsedAssembly {
  const data = AssemblySchema.parse(raw);
  const available = collectNodeNames(sceneRoot);
  const missing = new Set<string>();

  const check = (name: string) => {
    if (!available.has(name)) missing.add(name);
  };

  for (const g of data.groups) check(g.node);
  for (const t of data.toggles) t.nodes?.forEach(check);
  for (const s of data.steps) s.nodes.forEach(check);

  const dimensions = data.dimensions.map((d) => ({
    id: d.id,
    group: d.group,
    from: d.from.map((v) => v * MM_TO_M) as [number, number, number],
    to: d.to.map((v) => v * MM_TO_M) as [number, number, number],
    label: d.label,
  }));

  return {
    title: data.title,
    subtitle: data.subtitle,
    groups: data.groups,
    toggles: data.toggles,
    steps: data.steps.slice().sort((a, b) => a.n - b.n),
    dimensions,
    missingNodes: Array.from(missing),
  };
}

/** Ambil Object3D berdasarkan nama (pertama yang cocok). */
export function findByName(root: Object3D, name: string): Object3D | null {
  let found: Object3D | null = null;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}
