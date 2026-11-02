import { AlertTriangle } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { formatBytes, formatMeters, formatNumber } from '@/lib/formatters';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-xs opacity-60">{label}</span>
      <span className="text-right text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Badge({ active, children }: { active: boolean; children: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        active
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-neutral-500/10 text-neutral-400 line-through'
      }`}
    >
      {children}
    </span>
  );
}

export function ModelInfoPanel() {
  const stats = useViewerStore((s) => s.stats);
  const model = useViewerStore((s) => s.model);

  if (!stats) {
    return <p className="text-xs opacity-50">Memuat statistik…</p>;
  }

  const [dx, dy, dz] = stats.dimensions;

  return (
    <div className="space-y-2">
      <div>
        <Row label="Nama file" value={model.name} />
        {model.size ? <Row label="Ukuran" value={formatBytes(model.size)} /> : null}
        <Row label="Mesh" value={formatNumber(stats.meshCount)} />
        <Row label="Triangle" value={formatNumber(stats.triangleCount)} />
        <Row label="Material" value={formatNumber(stats.materialCount)} />
        <Row
          label="Tekstur"
          value={
            stats.textureCount > 0
              ? `${formatNumber(stats.textureCount)} · maks ${stats.maxTextureSize}px`
              : '—'
          }
        />
        <Row label="Dimensi" value={`${formatMeters(dx)} × ${formatMeters(dy)} × ${formatMeters(dz)}`} />
        <Row label="Animasi" value={formatNumber(stats.animationCount)} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] opacity-50">Kompresi:</span>
        <Badge active={stats.usesDraco}>Draco</Badge>
        <Badge active={stats.usesKTX2}>KTX2</Badge>
        <Badge active={stats.usesMeshopt}>Meshopt</Badge>
      </div>

      {stats.warnings.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {stats.warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
