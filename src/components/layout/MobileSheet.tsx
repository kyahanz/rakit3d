import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef, useState } from 'react';
import { useViewerStore } from '@/store/viewerStore';

const COLLAPSED = 42;
const EXPANDED = 88;
const CLOSE_AT = 26; // tarik ke bawah di bawah ambang ini → tutup panel (dismiss)

/**
 * Bottom sheet mobile (<768px): bisa ditarik naik/turun & snap saat dilepas.
 * Ditarik jauh ke bawah → panel ditutup rapi (tombol tampilkan panel muncul di kiri-atas),
 * bukan menyusut jadi sisa kecil yang seolah "nge-bug".
 */
export function MobileSheet({ children }: { children: ReactNode }) {
  const setSidebarOpen = useViewerStore((s) => s.setSidebarOpen);
  const [expanded, setExpanded] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const startRef = useRef<{ y: number; h: number } | null>(null);

  const heightVh = dragHeight ?? (expanded ? EXPANDED : COLLAPSED);

  const onPointerDown = (e: ReactPointerEvent) => {
    startRef.current = { y: e.clientY, h: heightVh };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!startRef.current) return;
    const dy = startRef.current.y - e.clientY;
    const vh = Math.min(92, Math.max(10, startRef.current.h + (dy / window.innerHeight) * 100));
    setDragHeight(vh);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const h = dragHeight ?? heightVh;
    setDragHeight(null);
    startRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (h < CLOSE_AT) {
      // Ditarik jauh ke bawah → tutup panel (bisa dibuka lagi lewat tombol kiri-atas).
      setExpanded(false);
      setSidebarOpen(false);
      return;
    }
    setExpanded(h > (COLLAPSED + EXPANDED) / 2);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:hidden dark:bg-neutral-900"
      style={{ height: `${heightVh}vh`, transition: dragHeight == null ? 'height 0.25s ease' : 'none' }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="button"
        aria-label="Tarik untuk mengubah tinggi panel; tarik jauh ke bawah untuk menutup"
        tabIndex={0}
      >
        <div className="h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
