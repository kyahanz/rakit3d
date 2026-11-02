import { useViewerStore } from '@/store/viewerStore';

/** Chip pill per grup: hitam (tampil) / outline (disembunyikan). Toggle visibility grup. */
export function GroupToggle() {
  const assembly = useViewerStore((s) => s.assembly);
  const groupVisibility = useViewerStore((s) => s.groupVisibility);
  const toggleGroupVisibility = useViewerStore((s) => s.toggleGroupVisibility);

  if (!assembly) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {assembly.groups.map((g) => {
        const visible = groupVisibility[g.id] !== false;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => toggleGroupVisibility(g.id)}
            aria-pressed={visible}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              visible
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'border border-neutral-400 text-neutral-500 dark:border-neutral-600'
            }`}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
