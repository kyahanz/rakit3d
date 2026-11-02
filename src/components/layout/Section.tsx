import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  /** Elemen kecil di kanan header (mis. jumlah item). */
  adornment?: ReactNode;
  children: ReactNode;
}

/** Panel accordion yang bisa dibuka/tutup. Header label memakai font mono kapital kecil. */
export function Section({ title, defaultOpen = true, adornment, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden
          />
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase opacity-70">
            {title}
          </span>
        </span>
        {adornment}
      </button>
      {open && <div className="px-4 pt-1 pb-3">{children}</div>}
    </section>
  );
}
