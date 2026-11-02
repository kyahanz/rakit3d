import { useViewerStore } from '@/store/viewerStore';

/** Tooltip DOM mengikuti posisi hover node interaktif (di luar canvas). */
export function InteractionTooltip() {
  const hovered = useViewerStore((s) => s.hovered);
  if (!hovered) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[130%] rounded-md bg-neutral-900/90 px-2 py-1 text-xs font-medium text-white shadow-lg"
      style={{ left: hovered.x, top: hovered.y }}
    >
      {hovered.label}
    </div>
  );
}
