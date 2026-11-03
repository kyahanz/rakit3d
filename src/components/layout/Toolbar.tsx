import { useEffect, useState } from 'react';
import { Camera, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Scan } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-900 dark:bg-neutral-800/90 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);
  const sidebarOpen = useViewerStore((s) => s.sidebarOpen);
  const resetCamera = useViewerStore((s) => s.resetCamera);
  const requestScreenshot = useViewerStore((s) => s.requestScreenshot);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="absolute top-3 right-3 z-20 flex gap-1.5">
      <IconButton
        label={sidebarOpen ? 'Sembunyikan panel' : 'Tampilkan panel'}
        onClick={toggleSidebar}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </IconButton>
      <IconButton label="Reset kamera" onClick={resetCamera}>
        <Scan className="h-4 w-4" />
      </IconButton>
      <IconButton label="Screenshot PNG" onClick={requestScreenshot}>
        <Camera className="h-4 w-4" />
      </IconButton>
      <IconButton label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'} onClick={toggleFullscreen}>
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </IconButton>
    </div>
  );
}
