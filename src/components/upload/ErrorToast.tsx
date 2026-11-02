import { useEffect } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';

/** Notifikasi error (merah) & peringatan non-fatal (kuning), bisa ditutup. */
export function ErrorToast() {
  const error = useViewerStore((s) => s.error);
  const notice = useViewerStore((s) => s.notice);
  const setError = useViewerStore((s) => s.setError);
  const setNotice = useViewerStore((s) => s.setNotice);

  // Peringatan non-fatal hilang otomatis setelah beberapa detik.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  if (!error && !notice) return null;

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
      {error && (
        <div className="pointer-events-auto flex items-start gap-3 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Tutup pesan error"
            className="rounded p-0.5 hover:bg-white/20"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      {notice && (
        <div className="pointer-events-auto flex items-start gap-3 rounded-lg bg-amber-500 px-4 py-3 text-sm text-neutral-900 shadow-lg">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Tutup peringatan"
            className="rounded p-0.5 hover:bg-black/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
