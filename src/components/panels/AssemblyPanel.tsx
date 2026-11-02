import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { GroupToggle } from './GroupToggle';
import { ExplodeSlider } from './ExplodeSlider';
import { OptionChips } from './OptionChips';
import { StepList } from './StepList';

function Label({ children }: { children: string }) {
  return (
    <p className="mb-1.5 font-mono text-[10px] font-semibold tracking-widest uppercase opacity-60">
      {children}
    </p>
  );
}

/**
 * Panel Mode Rakit (krem). Header sticky (title/subtitle), lalu TAMPILKAN (grup), BONGKAR
 * (explode), opsi toggle, dan URUTAN RAKIT (langkah per group). Keyboard ←/→ pindah langkah.
 */
export function AssemblyPanel() {
  const assembly = useViewerStore((s) => s.assembly);
  const assemblyError = useViewerStore((s) => s.assemblyError);
  const activeStep = useViewerStore((s) => s.activeStep);
  const setActiveStep = useViewerStore((s) => s.setActiveStep);
  const stepBy = useViewerStore((s) => s.stepBy);

  useEffect(() => {
    if (!assembly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') stepBy(1);
      else if (e.key === 'ArrowLeft') stepBy(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assembly, stepBy]);

  if (!assembly) return null;

  const stepCount = assembly.steps.length;

  return (
    <div className="bg-[#f3ead9] text-[#2c2620] dark:bg-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 border-y border-black/10 bg-[#f3ead9] px-4 py-3 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-sm font-bold">{assembly.title}</h2>
        {assembly.subtitle && <p className="mt-0.5 text-[11px] opacity-60">{assembly.subtitle}</p>}
      </header>

      <div className="space-y-4 px-4 py-3">
        {assemblyError && (
          <p className="rounded-md bg-amber-500/20 p-2 text-[11px] text-amber-800 dark:text-amber-300">
            {assemblyError}
          </p>
        )}

        <section>
          <Label>Tampilkan</Label>
          <GroupToggle />
        </section>

        <section>
          <Label>Bongkar</Label>
          <ExplodeSlider />
        </section>

        {assembly.toggles.length > 0 && (
          <section>
            <Label>Opsi</Label>
            <OptionChips />
          </section>
        )}

        {stepCount > 0 && (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>Urutan Rakit</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepBy(-1)}
                  disabled={activeStep == null || activeStep <= 1}
                  aria-label="Langkah sebelumnya"
                  className="rounded p-1 hover:bg-black/10 disabled:opacity-30 dark:hover:bg-white/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepBy(1)}
                  disabled={activeStep != null && activeStep >= stepCount}
                  aria-label="Langkah berikutnya"
                  className="rounded p-1 hover:bg-black/10 disabled:opacity-30 dark:hover:bg-white/10"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveStep(null)}
              className={`mb-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition ${
                activeStep == null
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Lihat semua
            </button>

            <StepList />
          </section>
        )}
      </div>
    </div>
  );
}
