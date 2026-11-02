import { useViewerStore } from '@/store/viewerStore';
import { formatBytes } from '@/lib/formatters';

/**
 * Panel kiri. Diisi bertahap dengan ModelInfo, SceneTree, Animation, Settings,
 * dan Assembly pada tahap-tahap berikutnya.
 */
export function Sidebar() {
  const model = useViewerStore((s) => s.model);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h1 className="text-sm font-semibold tracking-tight">3D Model Viewer</h1>
        <p className="mt-0.5 truncate text-xs opacity-60" title={model.name}>
          {model.name}
          {model.size ? ` · ${formatBytes(model.size)}` : ''}
        </p>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 text-sm opacity-70">
        Panel akan terisi pada tahap berikutnya.
      </div>
    </aside>
  );
}
