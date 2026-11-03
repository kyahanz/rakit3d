import { useViewerStore } from '@/store/viewerStore';
import type { BackgroundMode, EnvironmentPreset } from '@/types/viewer';

const ENV_PRESETS: EnvironmentPreset[] = ['city', 'studio', 'sunset', 'warehouse', 'apartment'];
const BG_MODES: { value: BackgroundMode; label: string }[] = [
  { value: 'transparent', label: 'Transparan' },
  { value: 'color', label: 'Warna' },
  { value: 'environment', label: 'Environment' },
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1 text-xs">
      <span className="opacity-80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-sky-500' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsPanel() {
  const settings = useViewerStore((s) => s.settings);
  const update = useViewerStore((s) => s.updateSettings);
  const hasAssembly = useViewerStore((s) => s.assembly !== null);

  return (
    <div className="space-y-3">
      {/* Environment preset */}
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase opacity-50">Environment</p>
        <div className="flex flex-wrap gap-1">
          {ENV_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => update({ environment: p })}
              className={`rounded px-2 py-1 text-[11px] capitalize ${
                settings.environment === p
                  ? 'bg-sky-500 text-white'
                  : 'bg-neutral-500/10 hover:bg-neutral-500/20'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase opacity-50">Latar</p>
        <div className="flex gap-1">
          {BG_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => update({ background: m.value })}
              className={`flex-1 rounded px-1.5 py-1 text-[11px] ${
                settings.background === m.value
                  ? 'bg-sky-500 text-white'
                  : 'bg-neutral-500/10 hover:bg-neutral-500/20'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {settings.background === 'color' && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
              aria-label="Warna latar"
            />
            <span className="text-[11px] tabular-nums opacity-60">{settings.backgroundColor}</span>
          </div>
        )}
        {settings.background === 'environment' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] opacity-50">Blur</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.envBlur}
              onChange={(e) => update({ envBlur: Number(e.target.value) })}
              className="h-1 flex-1 accent-sky-500"
              aria-label="Blur environment"
            />
            <span className="w-8 text-right text-[10px] tabular-nums opacity-50">
              {settings.envBlur.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Cahaya */}
      <div className="border-t border-neutral-200 pt-2 dark:border-neutral-800">
        <p className="mb-1 text-[10px] font-medium uppercase opacity-50">Cahaya</p>
        <Toggle label="Matahari" checked={settings.sun} onChange={(v) => update({ sun: v })} />
        {settings.sun && (
        <>
        <div className="mt-1 flex items-center gap-2">
          <span className="w-12 text-[10px] opacity-50">Arah</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={settings.lightAzimuth}
            onChange={(e) => update({ lightAzimuth: Number(e.target.value) })}
            className="h-1 flex-1 accent-sky-500"
            aria-label="Arah cahaya (azimuth)"
          />
          <span className="w-9 text-right text-[10px] tabular-nums opacity-50">{settings.lightAzimuth}°</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-12 text-[10px] opacity-50">Tinggi</span>
          <input
            type="range"
            min={5}
            max={89}
            step={1}
            value={settings.lightElevation}
            onChange={(e) => update({ lightElevation: Number(e.target.value) })}
            className="h-1 flex-1 accent-sky-500"
            aria-label="Tinggi cahaya (elevasi)"
          />
          <span className="w-9 text-right text-[10px] tabular-nums opacity-50">{settings.lightElevation}°</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-12 text-[10px] opacity-50">Terang</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={settings.lightIntensity}
            onChange={(e) => update({ lightIntensity: Number(e.target.value) })}
            className="h-1 flex-1 accent-sky-500"
            aria-label="Intensitas cahaya"
          />
          <span className="w-9 text-right text-[10px] tabular-nums opacity-50">
            {settings.lightIntensity.toFixed(1)}
          </span>
        </div>
        </>
        )}
      </div>

      {/* Toggles */}
      <div className="border-t border-neutral-200 pt-1 dark:border-neutral-800">
        <Toggle label="Putar objek" checked={settings.autoRotate} onChange={(v) => update({ autoRotate: v })} />
        <Toggle label="Bayangan" checked={settings.shadows} onChange={(v) => update({ shadows: v })} />
        <Toggle label="Wireframe" checked={settings.wireframe} onChange={(v) => update({ wireframe: v })} />
        <Toggle label="Grid" checked={settings.grid} onChange={(v) => update({ grid: v })} />
        {import.meta.env.DEV && (
          <Toggle label="Statistik FPS" checked={settings.showPerf} onChange={(v) => update({ showPerf: v })} />
        )}
        {hasAssembly && (
          <Toggle
            label="Mode Rakit: sembunyikan part berikutnya"
            checked={settings.assemblyHideFuture}
            onChange={(v) => update({ assemblyHideFuture: v })}
          />
        )}
      </div>
    </div>
  );
}
