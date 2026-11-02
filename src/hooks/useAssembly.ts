import { useEffect } from 'react';
import { z } from 'zod';
import { useViewerStore } from '@/store/viewerStore';
import { parseAssembly } from '@/lib/assembly';

/**
 * Memuat file *.assembly.json pendamping model (jika ada → Mode Rakit aktif),
 * memvalidasi dengan zod, dan menyimpan hasil ke store. Node yang tidak ada di
 * model dilaporkan sebagai peringatan.
 */
export function useAssembly(): void {
  const assemblyUrl = useViewerStore((s) => s.model.assemblyUrl);
  const sceneRoot = useViewerStore((s) => s.sceneRoot);
  const setAssembly = useViewerStore((s) => s.setAssembly);
  const setAssemblyError = useViewerStore((s) => s.setAssemblyError);

  useEffect(() => {
    if (!assemblyUrl || !sceneRoot) {
      setAssembly(null);
      return;
    }
    let active = true;

    void fetch(assemblyUrl)
      .then((r) => {
        if (!r.ok) throw new Error('not-found');
        return r.json();
      })
      .then((json) => {
        if (!active) return;
        const parsed = parseAssembly(json, sceneRoot);
        setAssembly(parsed);
        if (parsed.missingNodes.length > 0) {
          setAssemblyError(
            `Mode Rakit: node tidak ada di model → ${parsed.missingNodes.join(', ')}`,
          );
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof z.ZodError) {
          const first = err.issues[0];
          setAssembly(null);
          setAssemblyError(
            `assembly.json tidak valid${first ? `: ${first.path.join('.')} — ${first.message}` : ''}`,
          );
        } else {
          // Tidak ada file assembly (404) atau gagal fetch → cukup nonaktifkan Mode Rakit.
          setAssembly(null);
        }
      });

    return () => {
      active = false;
    };
  }, [assemblyUrl, sceneRoot, setAssembly, setAssemblyError]);
}
