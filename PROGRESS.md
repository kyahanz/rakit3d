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

### Tahap 3 — Drag & Drop + Loading + Error + Dispose ✅
- `DropZone`: listener drag global (drag file ke mana saja → overlay "Lepas file di sini"),
  tombol "Pilih File" (input tersembunyi), multi-file (.gltf + .bin + tekstur + .assembly.json).
- `lib/modelFiles.ts`: validasi ekstensi (.glb/.gltf), object URL per file, `URLModifier`
  (DefaultLoadingManager) untuk resolve dependency .gltf by basename, peringatan ukuran >50 MB
  (non-fatal), deteksi file assembly pendamping.
- `lib/loadModelFiles.ts`: titik masuk tunggal load dari file.
- `LoadingOverlay`: progress bar + nama file (progress dari DefaultLoadingManager via
  `useLoadingManager`). `ErrorToast`: error (merah) + peringatan (kuning), auto-dismiss notice.
- Dispose: `lib/disposeObject.ts` (geometry/material/texture rekursif) + `useDisposeOnChange`
  (registry level-module, StrictMode-safe: dispose model lama saat model baru terdaftar,
  `useLoader.clear`, revoke semua object URL). Hindari dispose saat unmount (aman double-mount).
- `ModelErrorBoundary`: tangkap gagal decode/parse → `handleModelError` (revoke URL gagal,
  pulihkan `lastGoodModel`, set pesan). **Bug ditemukan & diperbaiki:** `setModel` menghapus
  `error`, jadi urutan diperbaiki (revert dulu, set error terakhir).
- **Catatan debugging:** error "reading url of undefined" yang sempat muncul ternyata
  artefak HMR saat file diedit dengan halaman terbuka — di tab bersih tidak muncul; guard
  defensif tetap dipertahankan.
- Verifikasi browser: ganti model (geometries 14→7, tidak menumpuk), overlay loading muncul
  & hilang, error toast + pulih ke sample, 0 error konsol di tab bersih.
- Gate: typecheck ✔, lint ✔, build ✔.

### Tahap 4 — ModelInfoPanel + SceneTreePanel ✅
- `hooks/useModelStats.ts`: hitung mesh, triangle (index/pos), material & tekstur unik +
  resolusi terbesar, dimensi bbox (m), jumlah animasi, deteksi Draco/KTX2/Meshopt dari
  `gltf.parser.json.extensionsUsed`, peringatan (triangle>500k, tekstur>2048px, file>50MB).
- `ModelInfoPanel`: semua statistik + badge kompресi + peringatan kuning.
- `SceneTreePanel`: tree collapsible, ikon per tipe (mesh/group), search/filter (auto-expand
  cabang cocok), toggle visibility per node (mutasi `obj.visible` + `invalidate`), klik →
  select + fokus kamera, badge `INT` untuk node interaktif (`hasInteractionHint`).
- `lib/interactions.ts`: parser konvensi (INT_ prefix, userData extras), `displayLabel`,
  `findInteractiveAncestor` (dipakai tahap 6).
- Scene diekspos ke store (`sceneRoot`) agar panel di luar canvas bisa membacanya; fokus
  kamera via `focusNode` + `BoundsRefitter` (`bounds.refresh(target).fit()`).
- `layout/Section.tsx`: accordion reusable (label mono kapital).
- **Keputusan:** lint React Compiler menandai mutasi `obj.visible` (prop) → di-disable
  setempat dengan komentar, karena mutasi objek three.js memang disengaja (bukan state React).
- Verifikasi browser: statistik benar (11 mesh, 132 tri, 1 animasi, kompresi none),
  tree + badge INT, search "samping" memfilter, klik Laci → kamera fokus. 0 error baru.
- Gate: typecheck ✔, lint ✔, build ✔.

### Tahap 5 — AnimationPanel ✅
- `useAnimationController` (dalam canvas): `useAnimations` (drei) → mixer + actions;
  mengekspos `AnimationApi` ke store (play/pause/stop/stopAll/seek/setSpeed/setLoop).
  Crossfade 0.3 dtk saat mulai (`fadeIn`), beberapa clip bisa jalan bersamaan.
  Loop once/repeat/pingpong (`setLoop` + `clampWhenFinished`), event `finished` → stopped.
- `AnimationPanel` (DOM): daftar clip + durasi, play/pause, stop, loop (1×/∞/⇄), slider
  kecepatan 0.25–2×, scrubber timeline; tombol "Hentikan semua".
- **Keputusan penting (render loop):** `invalidate()` di dalam `useFrame` TIDAK menjaga
  loop demand tetap jalan (animasi membeku setelah ~1 dtk). Solusi: Canvas `frameloop`
  dinamis — `"always"` saat ada clip bermain (`store.animating`), kembali `"demand"` saat
  berhenti. Posisi scrubber dipublish throttle (~12 fps), bukan tiap frame (hindari re-render berat).
- Verifikasi browser: Spin berputar (time 0→0.62 dalam 700ms), stop → animating false &
  reset, panel lengkap tampil. 0 error baru.
- Gate: typecheck ✔, lint ✔, build ✔.

### Tahap 6 — Sistem Interaksi + Highlight + Tooltip ✅
- `lib/interactions.ts`: `resolveInteraction` prioritas C manual → A userData → B konvensi
  INT_ (clip cocok via `findMatchingClip`, atau default rotate 90° Y). `buildInteractiveList`.
- `hooks/useInteractions.ts`:
  - `useInteractions`: daftar node interaktif (memo scene+clips+manual) + Set/Map lookup.
  - `useInteractionTransitions`: useFrame menggerakkan buka/tutup halus dengan `maath
    easing.damp` — rotate/translate (damp transform ke base+delta×open), animation (damp
    progress 0..1 → set `action.time`, action di-`paused` agar tak maju sendiri). Set
    `store.interacting` → Canvas `frameloop="always"` saat transisi, kembali demand saat selesai.
- Raycast: `findInteractiveAncestor` (klik child mesh → cari parent interaktif), `stopPropagation`.
  Bedakan klik vs drag kamera (ambang 6px). Hover → tooltip (`InteractionTooltip`, DOM) +
  highlight emissive (`Highlighter`, menyimpan & memulihkan emissive asli). Mobile: tap = klik.
- `InteractionsPanel`: Buka/Tutup semua, daftar node + status (terbuka/tertutup · tipe),
  **mode manual C** (pilih node di tree → form tipe/sumbu/sudut/jarak → `setManualInteraction`).
- State buka/tutup per node (uuid) di zustand; `mixerRegistry` berbagi actions ke interaksi clip.
- **Verifikasi browser (tab bersih):** pintu rotate ke 1.570 rad (klik & panel), laci translate
  0.02→0.32 m, tutup kotak **clip** buka (quat 0→-0.571) & tutup balik (≈0), hover "Laci" +
  highlight biru, interacting kembali false (demand). Generik: box.glb jalan tanpa ubah kode.
  0 error konsol.
- **Catatan:** kegagalan sempat terlihat (semua diam) ternyata state HMR rusak di tab lama;
  tab bersih normal. `window.__gl` bisa basi → verifikasi via transform node, bukan frame count.
- Gate: typecheck ✔, lint ✔, build ✔.

### Tahap 7 — Settings, Toolbar, Responsive ✅
- `SettingsPanel`: preset environment (city/studio/sunset/warehouse/apartment), latar
  (transparan/warna+color picker/environment+blur), toggle bayangan/wireframe/grid/statistik
  FPS (FPS hanya dev). Wireframe diterapkan ke semua material via effect di `Model`.
- `Toolbar` (mengambang kanan-atas): toggle sidebar, reset kamera (`cameraResetNonce`),
  screenshot PNG, fullscreen (Fullscreen API). Semua tombol `aria-label`.
- `ScreenshotController`: render scene ke `WebGLRenderTarget` lalu `readRenderTargetPixels` →
  canvas 2D (balik Y) → unduh PNG. **Tanpa `preserveDrawingBuffer`** di canvas utama
  (sesuai spec), sRGB disamakan.
- Responsive: `MobileSheet` (<768px) bottom sheet yang bisa ditarik (pointer drag, snap
  collapsed/expanded); sidebar kiri disembunyikan di mobile. Dark/light ikut sistem (Tailwind v4).
- Verifikasi browser: wireframe & grid aktif, environment sunset, screenshot tanpa error,
  reset kamera, bottom sheet drag → expand. 0 error konsol.
- Gate: typecheck ✔, lint ✔, build ✔.

### Tahap 8 — Optimasi Akhir ✅
- **frameloop demand** diverifikasi: saat idle (tanpa animasi/interaksi/gerak kamera),
  `gl.info.render.frame` TIDAK bertambah (0/detik). Saat animasi/interaksi → `always`.
- **Memory leak ditemukan & diperbaiki (penting):** uji ganti model 5× berturut menunjukkan
  `textures` naik +2 tiap ganti model berukuran beda. Penyebab: drei `ContactShadows` membuat
  2 WebGLRenderTarget di `useMemo([resolution,width,height,scale,color])` dan **tidak pernah
  dispose**; `scale` kami ikut `modelRadius` → bocor. **Perbaikan:** props ContactShadows
  dibuat konstan (RT dibuat sekali), penskalaan lewat `<group scale>` pembungkus. Hasil uji
  5× ganti model: textures tetap 8, geometries tetap 13 (tidak menumpuk). Geometry model lama
  juga ter-dispose (sudah dari tahap 3).
- **Bundle (production):** dipisah vendor untuk caching — app `index` 51 kB (gzip **17 kB**),
  `vendor-three` 893 kB (gzip 241 kB), `vendor-r3f` 500 kB (gzip 160 kB). HDRI & decoder Draco/
  KTX2 lazy per-kebutuhan. `r3f-perf` ter-tree-shake dari produksi (DEV-guard). Tidak ada
  `console.log` tertinggal.
- **Catatan:** `@react-three/postprocessing` terpasang (stack wajib) tetapi tidak dipakai —
  highlight memakai emissive (diizinkan spec sebagai alternatif outline), jadi tidak ikut bundle.
- Gate: typecheck ✔, lint ✔, build ✔.

### Tahap 9 — Mode Rakit (Assembly Viewer) ✅
- **Data:** `lib/assembly.ts` validasi `*.assembly.json` dengan **zod**; mm → meter untuk
  dimensi; node yang dirujuk tapi tak ada dicatat `missingNodes` (peringatan). `useAssembly`
  memuat otomatis bila `model.assemblyUrl` ada (cocok nama) → Mode Rakit aktif.
- **Controller (`AssemblyController`, dalam group grounding Model):**
  - Explode: tiap part (anak langsung grup) punya posisi asli; offset = arah dari pusat grup
    × slider, easing `easing.damp`; `frameloop=always` saat transisi.
  - Langkah N: part < N normal, part N highlight emissive aksen + "turun" (drop-in eased),
    part > N disembunyikan/transparan (opsi `assemblyHideFuture`); kamera fokus ke kotak
    part langkah (`focusBounds` + margin agar panel tipis tak over-zoom); keluar langkah → refit.
  - Visibilitas grup + toggle `visibility`; peta uuid→langkah untuk klik part.
- **DimensionLines:** garis ukur 3D (drei `<Line>` + tick) + label `<Html>` (menghadap kamera,
  `pointerEvents:none` agar tak memblok klik), muncul saat toggle `dimensions` aktif.
- **Panel (krem, sticky header):** `AssemblyPanel` + `GroupToggle` (chip pill hitam/outline),
  `ExplodeSlider`, `OptionChips` (interaction tampil state "Pintu: tutup/buka"), `StepList`/
  `StepItem` (nomor kotak, judul tebal, desc abu), "Lihat semua", prev/next + **keyboard ←/→**.
- Klik part di model (mode rakit) → pilih langkah pemasangannya.
- **Model contoh:** `generate-sample` menghasilkan lemari multi-part + `sample.assembly.json`
  (6 langkah) dan kotak + `box.assembly.json` (3 langkah) — membuktikan sistem **generik**.
- **Verifikasi browser:** panel krem tampil otomatis, explode memisah part, langkah 3 highlight
  samping + ghost part berikut + kamera fokus, "Lihat semua" refit, dimensi 1000/2000/580
  dengan tick, chip "Pintu" buka pintu, klik panel → pilih langkah 3, box.glb assembly generik,
  0 error konsol.
- **Perbaikan saat uji:** fokus langkah ke panel tipis sempat membuat kamera over-zoom (layar
  hitam) & "Lihat semua" tak refit → ditambah margin kotak fokus + refit saat keluar langkah.
- Gate: typecheck ✔, lint ✔, build ✔.
