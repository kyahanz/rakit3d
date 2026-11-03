import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { loadModelFromFiles } from '@/lib/loadModelFiles';

/** Tombol "Pilih File" + input tersembunyi. Dipakai di dalam panel (Sidebar). */
export function FilePickerButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) loadModelFromFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        aria-label="Pilih berkas model GLB atau GLTF"
      >
        <Upload className="h-4 w-4" aria-hidden />
        Pilih File
      </button>
      <p className="mt-1.5 text-center text-[10px] leading-snug opacity-50">
        Format: <span className="font-mono">.glb</span> atau <span className="font-mono">.gltf</span>{' '}
        (+ .bin &amp; tekstur). .obj/.mtl/.fbx belum didukung.
      </p>
    </>
  );
}
