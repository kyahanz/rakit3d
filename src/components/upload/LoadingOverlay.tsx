import { useViewerStore } from '@/store/viewerStore';

/** Overlay progress loading model + nama file. */
export function LoadingOverlay() {
  const loading = useViewerStore((s) => s.loading);
  if (!loading.active) return null;

  const pct = Math.round(loading.progress * 100);
  const indeterminate = loading.progress <= 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-neutral-950/40 backdrop-blur-[2px]">
      <div className="w-64 rounded-xl bg-neutral-900/90 p-4 text-white shadow-xl">
        <p className="mb-2 truncate text-sm font-medium" title={loading.fileName}>
          Memuat {loading.fileName || 'model'}…
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full rounded-full bg-white transition-[width] duration-200 ${
              indeterminate ? 'animate-pulse' : ''
            }`}
            style={{ width: indeterminate ? '40%' : `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs tabular-nums opacity-70">
          {indeterminate ? '' : `${pct}%`}
        </p>
      </div>
    </div>
  );
}
