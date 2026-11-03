import { PanelLeftOpen } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { useLoadingManager } from '@/hooks/useLoadingManager';
import { useAssembly } from '@/hooks/useAssembly';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toolbar } from '@/components/layout/Toolbar';
import { MobileSheet } from '@/components/layout/MobileSheet';
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas';
import { DropZone } from '@/components/upload/DropZone';
import { LoadingOverlay } from '@/components/upload/LoadingOverlay';
import { ErrorToast } from '@/components/upload/ErrorToast';
import { InteractionTooltip } from '@/components/viewer/InteractionTooltip';

export default function App() {
  const sidebarOpen = useViewerStore((s) => s.sidebarOpen);
  const setSidebarOpen = useViewerStore((s) => s.setSidebarOpen);
  useLoadingManager();
  useAssembly();

  return (
    <div className="flex h-full w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Sidebar kiri (desktop). Disembunyikan di mobile — diganti bottom sheet. */}
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

        {/* Tombol tampilkan panel — muncul di kiri-atas saat panel disembunyikan. */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Tampilkan panel"
            title="Tampilkan panel"
            className="absolute top-3 left-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-900 dark:bg-neutral-800/90 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Overlay UI (di luar canvas). */}
        <Toolbar />
        <DropZone />
        <LoadingOverlay />
        <ErrorToast />
      </main>

      {/* Bottom sheet (mobile) — ikut toggle sidebar yang sama (hide/show). */}
      {sidebarOpen && (
        <MobileSheet>
          <Sidebar />
        </MobileSheet>
      )}

      {/* Tooltip hover (fixed, mengikuti kursor). */}
      <InteractionTooltip />
    </div>
  );
}
