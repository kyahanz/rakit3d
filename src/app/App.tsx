import { useViewerStore } from '@/store/viewerStore';
import { useLoadingManager } from '@/hooks/useLoadingManager';
import { Sidebar } from '@/components/layout/Sidebar';
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas';
import { DropZone } from '@/components/upload/DropZone';
import { LoadingOverlay } from '@/components/upload/LoadingOverlay';
import { ErrorToast } from '@/components/upload/ErrorToast';
import { InteractionTooltip } from '@/components/viewer/InteractionTooltip';

export default function App() {
  const sidebarOpen = useViewerStore((s) => s.sidebarOpen);
  useLoadingManager();

  return (
    <div className="flex h-full w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {sidebarOpen && (
        <div className="hidden w-80 shrink-0 border-r border-neutral-200 md:block dark:border-neutral-800">
          <Sidebar />
        </div>
      )}

      <main className="relative min-w-0 flex-1">
        {/* Latar gradasi halus di belakang canvas transparan. */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-200 to-neutral-300 dark:from-neutral-900 dark:to-neutral-950" />
        <div className="absolute inset-0">
          <ViewerCanvas />
        </div>

        {/* Overlay UI (di luar canvas). */}
        <DropZone />
        <LoadingOverlay />
        <ErrorToast />
      </main>

      {/* Tooltip hover (fixed, mengikuti kursor). */}
      <InteractionTooltip />
    </div>
  );
}
