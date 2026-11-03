import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { loadModelFromFiles } from '@/lib/loadModelFiles';

/**
 * Overlay drag & drop fullscreen. Tombol "Pilih File" ada di dalam panel
 * (lihat FilePickerButton). Drag file ke mana saja → overlay "Lepas file di sini".
 */
export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

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

  if (!dragging) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/70 px-10 py-8 text-white">
        <Upload className="h-10 w-10" aria-hidden />
        <p className="text-lg font-semibold">Lepas file di sini</p>
        <p className="text-sm opacity-80">.glb atau .gltf (boleh beserta .bin & tekstur)</p>
      </div>
    </div>
  );
}
