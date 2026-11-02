import { useMemo, useState } from 'react';
import { DoorOpen, DoorClosed } from 'lucide-react';
import type { Object3D } from 'three';
import { useViewerStore } from '@/store/viewerStore';
import { useInteractions } from '@/hooks/useInteractions';
import { displayLabel } from '@/lib/interactions';
import type { Axis, InteractionType } from '@/types/viewer';

const TYPES: InteractionType[] = ['rotate', 'translate', 'animation'];
const AXES: Axis[] = ['x', 'y', 'z'];

function findByUuid(root: Object3D | null, uuid: string | null): Object3D | null {
  if (!root || !uuid) return null;
  let found: Object3D | null = null;
  root.traverse((o) => {
    if (o.uuid === uuid) found = o;
  });
  return found;
}

/** Form untuk menjadikan node terpilih interaktif secara manual (mode C — testing). */
function ManualForm({ uuid }: { uuid: string }) {
  const setManualInteraction = useViewerStore((s) => s.setManualInteraction);
  const [type, setType] = useState<InteractionType>('rotate');
  const [axis, setAxis] = useState<Axis>('y');
  const [amount, setAmount] = useState(90);

  return (
    <div className="mt-2 space-y-2 rounded-md bg-neutral-500/5 p-2">
      <p className="text-[11px] font-medium opacity-70">Jadikan interaktif (manual)</p>
      <div className="flex gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded px-1.5 py-1 text-[11px] ${
              type === t ? 'bg-sky-500 text-white' : 'bg-neutral-500/10 hover:bg-neutral-500/20'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {type !== 'animation' && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {AXES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAxis(a)}
                className={`rounded px-2 py-1 text-[11px] uppercase ${
                  axis === a ? 'bg-sky-500 text-white' : 'bg-neutral-500/10 hover:bg-neutral-500/20'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-20 rounded border border-neutral-300 bg-transparent px-1.5 py-1 text-[11px] dark:border-neutral-700"
            aria-label={type === 'rotate' ? 'Sudut (derajat)' : 'Jarak (meter)'}
          />
          <span className="text-[10px] opacity-50">{type === 'rotate' ? '°' : 'm'}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() =>
          setManualInteraction(uuid, {
            type,
            axis,
            angle: type === 'rotate' ? amount : undefined,
            distance: type === 'translate' ? amount : undefined,
          })
        }
        className="w-full rounded bg-neutral-900 py-1 text-[11px] font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
      >
        Terapkan
      </button>
    </div>
  );
}

export function InteractionsPanel() {
  const { entries } = useInteractions();
  const openState = useViewerStore((s) => s.openState);
  const toggleInteraction = useViewerStore((s) => s.toggleInteraction);
  const setOpenAll = useViewerStore((s) => s.setOpenAll);
  const setManualInteraction = useViewerStore((s) => s.setManualInteraction);
  const selectedUuid = useViewerStore((s) => s.selectedUuid);
  const sceneRoot = useViewerStore((s) => s.sceneRoot);
  const manualInteractions = useViewerStore((s) => s.manualInteractions);

  const uuids = useMemo(() => entries.map((e) => e.uuid), [entries]);
  const selectedObj = useMemo(() => findByUuid(sceneRoot, selectedUuid), [sceneRoot, selectedUuid]);
  const selectedIsInteractive = selectedUuid ? uuids.includes(selectedUuid) : false;
  const selectedIsManual = selectedUuid ? selectedUuid in manualInteractions : false;

  return (
    <div className="space-y-2">
      {entries.length > 0 ? (
        <>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setOpenAll(uuids, true)}
              className="flex-1 rounded bg-neutral-900 py-1.5 text-[11px] font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
            >
              Buka semua
            </button>
            <button
              type="button"
              onClick={() => setOpenAll(uuids, false)}
              className="flex-1 rounded bg-neutral-200 py-1.5 text-[11px] font-medium text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              Tutup semua
            </button>
          </div>

          <ul className="space-y-1">
            {entries.map((entry) => {
              const open = openState[entry.uuid] === true;
              return (
                <li key={entry.uuid}>
                  <button
                    type="button"
                    onClick={() => toggleInteraction(entry.uuid)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-500/10"
                  >
                    {open ? (
                      <DoorOpen className="h-3.5 w-3.5 text-sky-500" />
                    ) : (
                      <DoorClosed className="h-3.5 w-3.5 opacity-50" />
                    )}
                    <span className="flex-1 truncate text-left">
                      {entry.config.label ?? displayLabel(entry.obj)}
                    </span>
                    <span className="text-[10px] opacity-50">
                      {open ? 'terbuka' : 'tertutup'} · {entry.config.type}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-xs opacity-50">
          Tidak ada node interaktif. Pilih node di Scene Tree lalu jadikan interaktif.
        </p>
      )}

      {/* Mode manual untuk node terpilih */}
      {selectedObj && !selectedIsInteractive && <ManualForm uuid={selectedObj.uuid} />}
      {selectedObj && selectedIsManual && (
        <button
          type="button"
          onClick={() => setManualInteraction(selectedObj.uuid, null)}
          className="w-full rounded border border-neutral-300 py-1 text-[11px] hover:bg-neutral-500/10 dark:border-neutral-700"
        >
          Hapus interaksi manual: {displayLabel(selectedObj)}
        </button>
      )}
    </div>
  );
}
