import { PanelLeftClose } from 'lucide-react';
import { useViewerStore } from '@/store/viewerStore';
import { formatBytes } from '@/lib/formatters';
import { Section } from './Section';
import { ModelInfoPanel } from '@/components/panels/ModelInfoPanel';
import { SceneTreePanel } from '@/components/panels/SceneTreePanel';
import { AnimationPanel } from '@/components/panels/AnimationPanel';
import { InteractionsPanel } from '@/components/panels/InteractionsPanel';
import { SettingsPanel } from '@/components/panels/SettingsPanel';
import { AssemblyPanel } from '@/components/panels/AssemblyPanel';

/**
 * Panel kiri. Berisi info model & scene tree (tahap 4). Animation, Settings, dan
 * Assembly ditambahkan pada tahap berikutnya.
 */
export function Sidebar() {
  const model = useViewerStore((s) => s.model);
  const hasAssembly = useViewerStore((s) => s.assembly !== null);
  const setSidebarOpen = useViewerStore((s) => s.setSidebarOpen);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Sembunyikan panel"
          title="Sembunyikan panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-500/10 hover:text-neutral-800 dark:hover:text-neutral-100"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight">3D Model Viewer</h1>
          <p className="truncate text-xs opacity-60" title={model.name}>
            {model.name}
            {model.size ? ` · ${formatBytes(model.size)}` : ''}
          </p>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {hasAssembly && <AssemblyPanel />}
        <Section title="Info Model">
          <ModelInfoPanel />
        </Section>
        <Section title="Scene Tree">
          <SceneTreePanel />
        </Section>
        <Section title="Interaksi">
          <InteractionsPanel />
        </Section>
        <Section title="Animasi">
          <AnimationPanel />
        </Section>
        <Section title="Pengaturan">
          <SettingsPanel />
        </Section>
      </div>
    </aside>
  );
}
