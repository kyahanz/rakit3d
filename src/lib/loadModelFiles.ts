// Titik masuk tunggal untuk memuat model dari file (dipakai DropZone & tombol pilih file).
import { useViewerStore } from '@/store/viewerStore';
import { ModelLoadError, prepareModelFromFiles } from './modelFiles';

/** Validasi + siapkan + set model aktif dari file yang di-drop/dipilih. */
export function loadModelFromFiles(files: FileList | File[]): void {
  const { setModel, setLoading, setError, setNotice, setShareFile } = useViewerStore.getState();
  setError(null);
  setNotice(null);

  try {
    const { source, mainFile, warning } = prepareModelFromFiles(files);
    setLoading({ active: true, progress: 0, fileName: source.name });
    setModel(source); // reset shareFile null
    // Simpan file .glb mandiri untuk fitur Buat Link (upload). .gltf multi-file dilewati.
    if (/\.glb$/i.test(mainFile.name)) setShareFile(mainFile);
    if (warning) setNotice(warning);
  } catch (e) {
    const msg =
      e instanceof ModelLoadError ? e.message : 'Gagal menyiapkan berkas model.';
    setError(msg);
  }
}
