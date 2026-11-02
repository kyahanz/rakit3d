import { Pause, Play, Square } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { formatSeconds } from '@/lib/formatters';
import type { ClipInfo, LoopMode, PlaybackInfo } from '@/types/viewer';

const LOOP_OPTIONS: { value: LoopMode; label: string; title: string }[] = [
  { value: 'once', label: '1×', title: 'Sekali' },
  { value: 'repeat', label: '∞', title: 'Ulang' },
  { value: 'pingpong', label: '⇄', title: 'Bolak-balik' },
];

const DEFAULT_PB: PlaybackInfo = { playing: false, paused: false, time: 0, loop: 'repeat', speed: 1 };

function ClipRow({ clip }: { clip: ClipInfo }) {
  const api = useViewerStore((s) => s.animApi);
  const pb = useViewerStore((s) => s.playback[clip.name]) ?? DEFAULT_PB;
  if (!api) return null;

  const active = pb.playing || pb.paused;

  return (
    <div className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium" title={clip.name}>
          {clip.name}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums opacity-50">
          {formatSeconds(clip.duration)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => (pb.playing ? api.pause(clip.name) : api.play(clip.name))}
          className="flex h-7 w-7 items-center justify-center rounded bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          aria-label={pb.playing ? `Jeda ${clip.name}` : `Mainkan ${clip.name}`}
        >
          {pb.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => api.stop(clip.name)}
          disabled={!active}
          className="flex h-7 w-7 items-center justify-center rounded bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-40 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          aria-label={`Hentikan ${clip.name}`}
        >
          <Square className="h-3 w-3" />
        </button>

        {/* Loop mode */}
        <div className="ml-auto flex overflow-hidden rounded border border-neutral-300 dark:border-neutral-700">
          {LOOP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => api.setLoop(clip.name, opt.value)}
              title={opt.title}
              aria-label={`Loop: ${opt.title}`}
              aria-pressed={pb.loop === opt.value}
              className={`px-1.5 py-0.5 text-[11px] leading-none ${
                pb.loop === opt.value
                  ? 'bg-sky-500 text-white'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={clip.duration}
          step={0.01}
          value={Math.min(pb.time, clip.duration)}
          onChange={(e) => api.seek(clip.name, Number(e.target.value))}
          className="h-1 flex-1 accent-sky-500"
          aria-label={`Timeline ${clip.name}`}
        />
        <span className="w-10 shrink-0 text-right text-[10px] tabular-nums opacity-50">
          {pb.time.toFixed(1)}s
        </span>
      </div>

      {/* Speed */}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[10px] opacity-50">Kecepatan</span>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.25}
          value={pb.speed}
          onChange={(e) => api.setSpeed(clip.name, Number(e.target.value))}
          className="h-1 flex-1 accent-sky-500"
          aria-label={`Kecepatan ${clip.name}`}
        />
        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums opacity-50">
          {pb.speed.toFixed(2)}×
        </span>
      </div>
    </div>
  );
}

export function AnimationPanel() {
  const clips = useViewerStore((s) => s.clips);
  const api = useViewerStore((s) => s.animApi);

  if (clips.length === 0) {
    return <p className="text-xs opacity-50">Model tidak punya animasi.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => api?.stopAll()}
          className="rounded px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Hentikan semua
        </button>
      </div>
      {clips.map((clip) => (
        <ClipRow key={clip.name} clip={clip} />
      ))}
    </div>
  );
}
