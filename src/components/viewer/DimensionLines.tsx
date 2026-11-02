import { Html, Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { useViewerStore } from '@/store/viewerStore';

const COLOR = '#b4541f';
const UP = new Vector3(0, 1, 0);
const ALT = new Vector3(1, 0, 0);

/**
 * Garis ukur 3D (drei <Line>) dengan tick di ujung + label angka (<Html>).
 * Label selalu menghadap kamera (terbaca dari sudut mana pun) dan `pointerEvents:none`
 * agar tidak memblok klik. Muncul saat toggle bertipe 'dimensions' aktif.
 */
export function DimensionLines() {
  const assembly = useViewerStore((s) => s.assembly);
  const toggles = useViewerStore((s) => s.assemblyToggles);
  const radius = useViewerStore((s) => s.modelRadius);

  if (!assembly) return null;
  const show = assembly.toggles.some((t) => t.type === 'dimensions' && toggles[t.id]);
  if (!show || assembly.dimensions.length === 0) return null;

  const tick = Math.max(0.02, radius * 0.05);

  return (
    <>
      {assembly.dimensions.map((d) => {
        const from = new Vector3(...d.from);
        const to = new Vector3(...d.to);
        const dir = to.clone().sub(from);
        let perp = new Vector3().crossVectors(dir, UP);
        if (perp.lengthSq() < 1e-6) perp = new Vector3().crossVectors(dir, ALT);
        perp.normalize().multiplyScalar(tick);
        const mid = from.clone().add(to).multiplyScalar(0.5);

        return (
          <group key={d.id}>
            <Line points={[from.toArray(), to.toArray()]} color={COLOR} lineWidth={1.5} />
            <Line
              points={[from.clone().add(perp).toArray(), from.clone().sub(perp).toArray()]}
              color={COLOR}
              lineWidth={1.5}
            />
            <Line
              points={[to.clone().add(perp).toArray(), to.clone().sub(perp).toArray()]}
              color={COLOR}
              lineWidth={1.5}
            />
            <Html position={mid.toArray()} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
              <div className="rounded bg-[#b4541f] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white select-none">
                {d.label}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
