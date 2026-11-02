import { useViewerStore } from '@/store/viewerStore';
import { formatBytes } from '@/lib/formatters';
import { Section } from './Section';
import { ModelInfoPanel } from '@/components/panels/ModelInfoPanel';
import { SceneTreePanel } from '@/components/panels/SceneTreePanel';
import { AnimationPanel } from '@/components/panels/AnimationPanel';
import { InteractionsPanel } from '@/components/panels/InteractionsPanel';

/**
 * Panel kiri. Berisi info model & scene tree (tahap 4). Animation, Settings, dan
 * Assembly ditambahkan pada tahap berikutnya.
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

      <div className="scrollbar-thin flex-1 overflow-y-auto">
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
      </div>
    </aside>
  );
}
