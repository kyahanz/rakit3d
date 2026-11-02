import { useReducer, useState } from 'react';
import { invalidate } from '@react-three/fiber';
import { Box, Boxes, ChevronDown, ChevronRight, Circle, Eye, EyeOff, Search } from 'lucide-react';
import type { Mesh, Object3D } from 'three';
import { useViewerStore } from '@/store/viewerStore';
import { displayLabel, hasInteractionHint } from '@/lib/interactions';

function isMesh(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true;
}

function matches(obj: Object3D, q: string): boolean {
  return obj.name.toLowerCase().includes(q);
}

function subtreeMatches(obj: Object3D, q: string): boolean {
  if (q === '') return true;
  if (matches(obj, q)) return true;
  return obj.children.some((c) => subtreeMatches(c, q));
}

interface RowProps {
  obj: Object3D;
  depth: number;
  query: string;
  bump: () => void;
}

function TreeRow({ obj, depth, query, bump }: RowProps) {
  const selectedUuid = useViewerStore((s) => s.selectedUuid);
  const setSelected = useViewerStore((s) => s.setSelected);
  const focusNode = useViewerStore((s) => s.focusNode);
  const [openState, setOpenState] = useState(depth < 1);

  if (!subtreeMatches(obj, query)) return null;

  const children = obj.children.filter((c) => subtreeMatches(c, query));
  const hasChildren = children.length > 0;
  // Saat mencari, buka otomatis cabang yang cocok.
  const open = query !== '' ? true : openState;
  const selected = selectedUuid === obj.uuid;
  const interactive = hasInteractionHint(obj);

  const Icon = isMesh(obj) ? Box : hasChildren ? Boxes : Circle;

  const toggleVisibility = () => {
    // Mutasi langsung objek three.js disengaja (bukan state React); bump() memaksa
    // re-render baris agar ikon mata ikut berubah.
    // eslint-disable-next-line react-hooks/immutability
    obj.visible = !obj.visible;
    invalidate();
    bump();
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded px-1 py-1 text-xs ${
          selected ? 'bg-sky-500/15' : 'hover:bg-neutral-500/10'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpenState((v) => !v)}
            className="shrink-0 rounded p-0.5 hover:bg-neutral-500/20"
            aria-label={open ? 'Tutup' : 'Buka'}
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />

        <button
          type="button"
          onClick={() => {
            setSelected(obj.uuid);
            focusNode(obj);
          }}
          className="flex-1 truncate text-left"
          title={obj.name}
        >
          {displayLabel(obj)}
        </button>

        {interactive && (
          <span className="rounded bg-sky-500/20 px-1 text-[9px] font-semibold text-sky-600 dark:text-sky-400">
            INT
          </span>
        )}

        <button
          type="button"
          onClick={toggleVisibility}
          className="shrink-0 rounded p-0.5 opacity-0 hover:bg-neutral-500/20 group-hover:opacity-100"
          aria-label={obj.visible ? 'Sembunyikan' : 'Tampilkan'}
        >
          {obj.visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 opacity-50" />
          )}
        </button>
      </div>

      {open &&
        children.map((child) => (
          <TreeRow key={child.uuid} obj={child} depth={depth + 1} query={query} bump={bump} />
        ))}
    </div>
  );
}

export function SceneTreePanel() {
  const sceneRoot = useViewerStore((s) => s.sceneRoot);
  const [rawQuery, setRawQuery] = useState('');
  const [, bump] = useReducer((x: number) => x + 1, 0);

  if (!sceneRoot) {
    return <p className="text-xs opacity-50">Belum ada model.</p>;
  }

  const query = rawQuery.trim().toLowerCase();
  const roots = sceneRoot.children.length > 0 ? sceneRoot.children : [sceneRoot];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 opacity-40" />
        <input
          type="text"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder="Cari node…"
          className="w-full rounded-md border border-neutral-300 bg-transparent py-1 pr-2 pl-7 text-xs outline-none focus:border-sky-500 dark:border-neutral-700"
          aria-label="Cari node di scene tree"
        />
      </div>
      <div className="scrollbar-thin max-h-72 overflow-y-auto">
        {roots.map((obj) => (
          <TreeRow key={obj.uuid} obj={obj} depth={0} query={query} bump={bump} />
        ))}
      </div>
    </div>
  );
}
