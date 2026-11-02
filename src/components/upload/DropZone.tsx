import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { loadModelFromFiles } from '@/lib/loadModelFiles';

/**
 * Drag & drop fullscreen + tombol "Pilih File".
 * - Drag file ke mana saja → overlay "Lepas file di sini".
 * - Mendukung drop banyak file (.gltf + .bin + tekstur + .assembly.json).
 */
export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    loadModelFromFiles(files);
  }, []);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFiles]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Tombol pilih file (mengambang kiri-bawah; Toolbar juga bisa memicu input ini). */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-lg bg-neutral-900/90 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:bg-neutral-900 dark:bg-white/90 dark:text-neutral-900 dark:hover:bg-white"
        aria-label="Pilih berkas model GLB atau GLTF"
      >
        <Upload className="h-4 w-4" aria-hidden />
        Pilih File
      </button>

      {/* Overlay drag */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/70 px-10 py-8 text-white">
            <Upload className="h-10 w-10" aria-hidden />
            <p className="text-lg font-semibold">Lepas file di sini</p>
            <p className="text-sm opacity-80">.glb atau .gltf (boleh beserta .bin & tekstur)</p>
          </div>
        </div>
      )}
    </>
  );
}
