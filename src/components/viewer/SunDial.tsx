import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useViewerStore } from '@/store/viewerStore';

// Dial indikator matahari di layar: tarik titik matahari untuk mengatur
// arah (azimuth = sudut keliling) dan tinggi (elevasi = jarak dari pusat;
// pusat = tepat di atas kepala, tepi = dekat horizon).
const R = 40; // jari-jari dial (px)
const CX = 52;
const CY = 52;
const EL_MIN = 5;
const EL_MAX = 89;

export function SunDial() {
  const sun = useViewerStore((s) => s.settings.sun);
  const azimuth = useViewerStore((s) => s.settings.lightAzimuth);
  const elevation = useViewerStore((s) => s.settings.lightElevation);
  const update = useViewerStore((s) => s.updateSettings);
  const svgRef = useRef<SVGSVGElement>(null);

  const setFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = clientX - (rect.left + CX);
      const dy = clientY - (rect.top + CY);
      let az = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° = atas, searah jarum jam
      if (az < 0) az += 360;
      const dist = Math.min(Math.hypot(dx, dy), R);
      const el = EL_MAX - (dist / R) * (EL_MAX - EL_MIN); // pusat → tinggi, tepi → rendah
      update({ lightAzimuth: Math.round(az), lightElevation: Math.round(el) });
    },
    [update],
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setFromPoint(e.clientX, e.clientY);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.buttons !== 1) return; // hanya saat tombol ditahan
    setFromPoint(e.clientX, e.clientY);
  };

  if (!sun) return null;

  const r = (1 - (elevation - EL_MIN) / (EL_MAX - EL_MIN)) * R;
  const azRad = (azimuth * Math.PI) / 180;
  const sx = CX + r * Math.sin(azRad);
  const sy = CY - r * Math.cos(azRad);

  return (
    <div className="absolute right-4 bottom-4 z-20 flex flex-col items-center rounded-xl bg-white/80 p-2 shadow-md backdrop-blur dark:bg-neutral-800/80">
      <svg
        ref={svgRef}
        width={104}
        height={104}
        className="cursor-pointer touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role="slider"
        aria-label="Arah & tinggi matahari"
        aria-valuetext={`Arah ${Math.round(azimuth)} derajat, tinggi ${Math.round(elevation)} derajat`}
      >
        {/* cincin langit */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          className="fill-sky-100/60 stroke-neutral-300 dark:fill-sky-900/30 dark:stroke-neutral-600"
          strokeWidth={1}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R * 0.5}
          className="fill-none stroke-neutral-300/60 dark:stroke-neutral-600/60"
          strokeWidth={1}
        />
        {/* salib arah */}
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} className="stroke-neutral-300/50 dark:stroke-neutral-600/50" strokeWidth={0.75} />
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="stroke-neutral-300/50 dark:stroke-neutral-600/50" strokeWidth={0.75} />
        {/* garis dari pusat ke matahari */}
        <line x1={CX} y1={CY} x2={sx} y2={sy} className="stroke-amber-400" strokeWidth={1.5} />
        {/* titik matahari */}
        <circle cx={sx} cy={sy} r={7} className="fill-amber-400 stroke-amber-500" strokeWidth={1} />
      </svg>
      <p className="mt-0.5 text-[9px] tabular-nums opacity-60">
        {Math.round(azimuth)}° · {Math.round(elevation)}°
      </p>
    </div>
  );
}
