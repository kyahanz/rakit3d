import { useViewerStore } from '@/store/viewerStore';

/** Slider explode 0–1. */
export function ExplodeSlider() {
  const explode = useViewerStore((s) => s.explode);
  const setExplode = useViewerStore((s) => s.setExplode);

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={explode}
        onChange={(e) => setExplode(Number(e.target.value))}
        className="h-1 flex-1 accent-[#b4541f]"
        aria-label="Explode"
      />
      <span className="w-9 text-right text-[10px] tabular-nums opacity-60">
        {Math.round(explode * 100)}%
      </span>
    </div>
  );
}
