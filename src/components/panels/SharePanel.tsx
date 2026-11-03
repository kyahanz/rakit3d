import { useState } from 'react';
import { Check, Copy, Link2, Share2 } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { buildShareLink, uploadAndGetShareLink } from '@/lib/share';

type Status = 'idle' | 'loading' | 'done' | 'error';

// Di-remount (key=model.url) tiap ganti model, jadi state lokal otomatis reset.
export function SharePanel() {
  const model = useViewerStore((s) => s.model);
  const shareFile = useViewerStore((s) => s.shareFile);

  const [status, setStatus] = useState<Status>('idle');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Model yang sudah berupa URL publik (sample / hasil link / ?model=) bisa langsung dibagikan.
  const canShareDirect = !model.isObjectUrl;
  const canUpload = Boolean(shareFile);
  const canShare = canShareDirect || canUpload;

  const createLink = async () => {
    setError('');
    setCopied(false);
    if (canUpload && shareFile) {
      setStatus('loading');
      try {
        const url = await uploadAndGetShareLink(shareFile);
        setLink(url);
        setStatus('done');
      } catch {
        setStatus('error');
        setError(
          'Gagal upload. Fitur ini butuh Blob storage aktif di Vercel (Storage → Create → Blob) dan dijalankan di situs Vercel, bukan preview lokal.',
        );
      }
      return;
    }
    // Model sudah hosted → link langsung.
    setLink(buildShareLink(model.url));
    setStatus('done');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: pilih teks agar user bisa copy manual (ditangani input readOnly).
    }
  };

  if (!canShare) {
    return (
      <p className="text-xs opacity-50">
        Muat file <span className="font-mono">.glb</span> (drop atau Pilih File) untuk membuat link
        berbagi.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] opacity-60">
        Buat link agar orang lain bisa membuka model ini langsung dari browser — tanpa download &
        import manual.
      </p>

      {status !== 'done' && (
        <button
          type="button"
          onClick={createLink}
          disabled={status === 'loading'}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {status === 'loading' ? 'Mengunggah…' : 'Buat Link'}
        </button>
      )}

      {status === 'done' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-2 py-1 text-[11px] dark:border-neutral-700"
              aria-label="Link berbagi"
            />
            <button
              type="button"
              onClick={copy}
              aria-label="Salin link"
              title="Salin link"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-neutral-300 hover:bg-neutral-500/10 dark:border-neutral-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {copied && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Tersalin!</p>}
          <p className="text-[10px] leading-snug opacity-50">
            Link publik — siapa pun yang punya link bisa membuka. Otomatis kedaluwarsa setelah 7
            hari untuk menghemat storage.
          </p>
        </div>
      )}

      {status === 'error' && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
