import { useEffect, useRef } from 'react';
import { useViewerStore } from '@/store/viewerStore';
import type { AssemblyStep } from '@/types/viewer';

/** Satu item langkah: nomor dalam kotak, judul tebal, deskripsi abu-abu. */
export function StepItem({ step, active }: { step: AssemblyStep; active: boolean }) {
  const setActiveStep = useViewerStore((s) => s.setActiveStep);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setActiveStep(step.n)}
      className={`flex w-full items-start gap-2.5 rounded-md p-1.5 text-left transition ${
        active ? 'bg-[#b4541f]/15 ring-1 ring-[#b4541f]/40' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
          active ? 'bg-[#b4541f] text-white' : 'bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
        }`}
      >
        {step.n}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{step.title}</span>
        {step.desc && <span className="block text-[11px] opacity-60">{step.desc}</span>}
      </span>
    </button>
  );
}
