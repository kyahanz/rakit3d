import { useViewerStore } from '@/store/viewerStore';
import { StepItem } from './StepItem';
import type { AssemblyStep } from '@/types/viewer';

/** Daftar langkah dikelompokkan per group; header group berisi nama + dimensi (aksen). */
export function StepList() {
  const assembly = useViewerStore((s) => s.assembly);
  const activeStep = useViewerStore((s) => s.activeStep);

  if (!assembly || assembly.steps.length === 0) {
    return <p className="text-xs opacity-50">Tidak ada langkah rakit.</p>;
  }

  // Kelompokkan langkah per group, pertahankan urutan kemunculan group.
  const byGroup = new Map<string, AssemblyStep[]>();
  for (const step of assembly.steps) {
    const list = byGroup.get(step.group) ?? [];
    list.push(step);
    byGroup.set(step.group, list);
  }

  return (
    <div className="space-y-3">
      {[...byGroup.entries()].map(([groupId, steps]) => {
        const group = assembly.groups.find((g) => g.id === groupId);
        return (
          <div key={groupId}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wide text-[#b4541f] uppercase">
                {group?.label ?? groupId}
              </span>
              {group?.dims && (
                <span className="font-mono text-[10px] opacity-50">{group.dims}</span>
              )}
            </div>
            <div className="space-y-0.5">
              {steps.map((step) => (
                <StepItem key={step.n} step={step} active={activeStep === step.n} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
