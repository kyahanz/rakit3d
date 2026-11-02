# PROGRESS

Catatan pengerjaan 3D Model Viewer (GLB/GLTF) sesuai `PROMPT.md`.
Semua fitur dibuat **generik & data-driven** (konfigurasi dari nama node + userData GLB dan
file `*.assembly.json`); contoh model hanya untuk testing.

## Rencana Kerja (Tahap 1–9)

1. Setup project, dependency, Tailwind, ESLint/Prettier, copy decoder Draco/KTX2.
2. ViewerCanvas + SceneSetup + model contoh tampil dengan kamera auto-fit.
3. DropZone + LoadingOverlay + ErrorToast + dispose saat ganti model.
4. ModelInfoPanel + SceneTreePanel.
5. AnimationPanel.
6. Sistem interaksi (userData, konvensi `INT_`, mode manual) + highlight + tooltip.
7. Settings, Toolbar, responsive mobile.
8. Optimasi akhir: cek `frameloop="demand"`, cek memory leak ganti model 5×, bundle size.
9. Mode Rakit (Assembly Viewer): panel, explode, langkah rakit, dimension lines.

Di akhir setiap tahap: `npm run typecheck`, `npm run lint`, `npm run build` harus lulus,
update PROGRESS.md, lalu git commit.

## Versi Dependency (dikunci & cek kompatibilitas)

| Paket | Versi | Catatan kompatibilitas |
| --- | --- | --- |
| react / react-dom | ^19.3.1 | R3F v9 butuh react `>=19 <19.4` ✔ |
| three | ^0.187.0 | drei butuh `>=0.159`, fiber `>=0.156` ✔ |
| @react-three/fiber | ^9.8.2 | peer react 19, three ≥0.156 ✔ |
| @react-three/drei | ^10.7.9 | peer fiber ^9, react ^19 ✔ |
| @react-three/postprocessing | ^3.2.2 | peer fiber ≥9.7, postprocessing ^6.36 ✔ (postprocessing ^6.39.6) |
| zustand | ^5.0.16 | |
| maath | ^0.10.8 | easing/damping |
| zod | ^4.6.7 | validasi assembly.json |
| lucide-react | ^1.66.0 | ikon |
| vite | ^7.3.7 | **dipilih v7, bukan v8** (lihat keputusan) |
| @vitejs/plugin-react | ^5.2.0 | mendukung vite 7 & 8 |
| typescript | ^5.9 | **bukan TS 7** (lihat keputusan) |
| typescript-eslint | ^8.72.1 | peer TS `<6.1.0` → memaksa TS 5.x |
| eslint | ^10.14.0 | flat config |
| tailwindcss + @tailwindcss/vite | ^4.3.3 | Tailwind v4 (plugin Vite, config CSS) |
| r3f-perf | ^7.2.3 | hanya dev |
| @gltf-transform/core + /extensions | ^4.5.1 | generate sample GLB di Node |

## Keputusan Teknis (saat ada ambiguitas — tidak berhenti bertanya)

- **TypeScript 5.9, bukan 7.0 (latest).** `typescript-eslint@8.72` punya peer
  `typescript >=4.8.4 <6.1.0`; TS 7 akan membuat lint toolchain tidak kompatibel.
  Spec minta "versi stabil terbaru yang kompatibel" → 5.9 adalah pilihan kompatibel.
- **Vite 7 + plugin-react 5.2, bukan Vite 8 + plugin-react 6.** Vite 8 + plugin-react 6
  menarik peer `oxc-transform-react`/babel-react-compiler yang masih sangat baru; Vite 7
  jauh lebih teruji dan tetap stabil (bukan beta/rc). plugin-react 5.2 mendukung vite 7 & 8.
- **Tailwind v4** (plugin `@tailwindcss/vite`, konfigurasi via CSS `@theme`). Dark/light
  "ikut sistem" otomatis: varian `dark:` v4 default memakai `prefers-color-scheme`.
- **Generate sample GLB pakai `@gltf-transform/core`** (bukan three GLTFExporter) karena
  berjalan murni di Node tanpa polyfill DOM, dan konsisten dengan README (gltf-transform
  untuk kompresi). Pivot engsel dibuat lewat node parent di titik engsel.
- **Decoder self-hosted**: `scripts/copy-decoders.mjs` menyalin `draco/` & `basis/` dari
  `three/examples/jsm/libs` ke `public/` saat `postinstall` (dan `npm run copy-decoders`).
  Folder `public/draco` & `public/basis` di-`.gitignore` (hasil generate, bukan sumber).
- **MeshoptDecoder tidak perlu file publik** — modulnya di-bundle dari three.
- **tsconfig** dipecah `app` (DOM) + `node` (vite.config). Strict penuh + `noUnusedLocals`,
  `erasableSyntaxOnly` (hindari enum/namespace), `verbatimModuleSyntax` (pakai `import type`).

## Log Tahap

### Tahap 1 — Setup ✅
- Scaffold manual (bukan `npm create vite`): package.json, tsconfig app/node, vite.config,
  eslint flat config, prettier, index.html, Tailwind v4 CSS, main.tsx, App.tsx placeholder.
- Alias `@/*` → `src/*` (vite + tsconfig).
- Script `copy-decoders` berjalan di postinstall → `public/draco`, `public/basis` terisi.
- **Perbaikan saat setup:**
  - Tambah `@types/node` + `types:["node"]` di tsconfig.node (vite.config butuh `node:url`).
  - ESLint flat config: `eslint-plugin-react-hooks@7` config `recommended-latest` memakai
    `plugins` bergaya array (eslintrc) yang ditolak flat config bila dipakai di `extends`;
    solusinya daftarkan plugin manual + spread `.rules` saja.
- Gate: typecheck ✔, lint ✔, build ✔ (JS 223 kB / gzip 69.5 kB — baseline sebelum 3D).

### Tahap 2 — Viewer + Scene + Auto-fit ✅
- **Model contoh dibuat lebih awal** (`scripts/generate-sample.mjs`, pakai gltf-transform):
  - `public/models/sample.glb` — lemari multi-part (plint, alas, samping, atas, backing,
    rak dalam `GRP_Isi_Lemari`, pintu `INT_Pintu` engsel kiri, laci `INT_Laci` translate,
    spinner animasi `Spin`) + `sample.assembly.json` (6 langkah).
  - `public/models/box.glb` — kotak dengan tutup `INT_Tutup` (clip `INT_Tutup_Open`) & laci
    `INT_LaciKotak` + `box.assembly.json`. Model kedua untuk bukti sistem generik.
  - Divalidasi: nama node, userData extras, dan animasi terbaca benar.
- `lib/loaders.ts`: GLTFLoader + DRACO (`/draco/`) + KTX2 (`/basis/`, `detectSupport(gl)`)
  + MeshoptDecoder; instance decoder dipakai ulang.
- `ViewerCanvas`: `frameloop="demand"`, `dpr=[1,2]`, `PerformanceMonitor` + `AdaptiveDpr`,
  gl ACESFilmic + SRGB + high-performance. `Perf` (r3f-perf) hanya dev & saat diaktifkan.
- `SceneSetup`: Environment HDRI (**@pmndrs/assets**, data URI EXR lokal — bukan CDN; tiap
  preset lazy chunk), directional light shadow + ambient, `ContactShadows`, `Grid` opsional.
  Skala shadow/grid/light mengikuti `modelRadius` (generik).
- `CameraRig`: `OrbitControls` damping + `makeDefault`, batas zoom relatif `modelRadius`,
  `maxPolarAngle` agar tak menembus lantai; `<Bounds fit clip observe>` auto-fit +
  `BoundsRefitter` untuk reset kamera (via `cameraResetNonce`).
- `Model`: pusatkan X/Z & grounding ke y=0 (pengganti `<Center>` yang juga menapak lantai),
  hitung `modelRadius`, aktifkan shadow semua mesh, `invalidate()`.
- `ModelLoader`: pakai `useLoader(GLTFLoader)` dari fiber (bukan drei `useGLTF`) agar tipe
  loader konsisten dengan @types/three dan decoder self-hosted bisa dipasang.
- **Keputusan:** drei `useGLTF`/three-stdlib bentrok tipe dengan @types/three → pakai
  `useLoader`. `<Center>` diganti grounding manual agar model menapak lantai shadow.
- Verifikasi visual di browser: lemari tampil, auto-fit, shadow, environment; **0 error konsol**.
- Gate: typecheck ✔, lint ✔, build ✔ (index 1.39 MB / gzip 400 kB; HDRI & decoder lazy).
