import { useViewerStore } from '@/store/viewerStore';
import { findByName } from '@/lib/assembly';

/**
 * Chip untuk toggles assembly:
 * - interaction: menampilkan state (mis. "Pintu: tutup") & membuka/menutup node interaktif.
 * - visibility/dimensions: on/off (mengatur visibilitas node atau garis ukur).
 */
export function OptionChips() {
  const assembly = useViewerStore((s) => s.assembly);
  const sceneRoot = useViewerStore((s) => s.sceneRoot);
  const openState = useViewerStore((s) => s.openState);
  const assemblyToggles = useViewerStore((s) => s.assemblyToggles);
  const setOpen = useViewerStore((s) => s.setOpen);
  const setAssemblyToggle = useViewerStore((s) => s.setAssemblyToggle);

  if (!assembly || assembly.toggles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {assembly.toggles.map((t) => {
        if (t.type === 'interaction') {
          const uuids = (t.nodes ?? [])
            .map((name) => (sceneRoot ? findByName(sceneRoot, name)?.uuid : undefined))
            .filter((u): u is string => Boolean(u));
          const isOpen = uuids.some((u) => openState[u]);
          const stateLabel = t.states
            ? (isOpen ? t.states[1] : t.states[0]) ?? (isOpen ? 'buka' : 'tutup')
            : isOpen
              ? 'buka'
              : 'tutup';
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => uuids.forEach((u) => setOpen(u, !isOpen))}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                isOpen
                  ? 'bg-[#b4541f] text-white'
                  : 'border border-neutral-400 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300'
              }`}
            >
              {t.label}: {stateLabel}
            </button>
          );
        }
        const on = assemblyToggles[t.id] === true;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setAssemblyToggle(t.id, !on)}
            aria-pressed={on}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              on
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'border border-neutral-400 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
