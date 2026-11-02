# 3D Model Viewer (GLB/GLTF)

Web app untuk menampilkan model 3D di browser: **drag & drop**, putar/zoom/geser, mainkan
**animasi bawaan**, **klik bagian model** untuk buka/tutup, panel **info & scene tree**, dan
**Mode Rakit** (explode + urutan perakitan + garis ukur). Semua fitur **generik & data-driven** —
konfigurasi berasal dari nama node + `userData` GLB dan file `*.assembly.json`, bukan hardcode.

Dibangun dengan **Vite + React 19 + TypeScript (strict)**, **three.js**, **@react-three/fiber**,
**@react-three/drei**, **zustand**, **Tailwind CSS v4**, **maath**, dan **zod**.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Saat pertama dibuka, model contoh (`public/models/sample.glb`)
langsung tampil beserta Mode Rakit (karena ada `sample.assembly.json`).

Skrip lain:

```bash
npm run build          # typecheck + build produksi
npm run preview        # pratinjau hasil build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run generate-sample  # regenerate model contoh (lemari & kotak) + assembly.json
```

> `npm install` otomatis menyalin decoder **Draco** dan **KTX2/Basis** dari `three` ke
> `public/draco` & `public/basis` (self-hosted, bukan CDN) lewat `postinstall`.

## Daftar Fitur

- **Upload**: drag & drop file ke mana saja atau tombol "Pilih File". Mendukung `.glb` dan
  `.gltf` (+ `.bin` & tekstur eksternal via drop banyak file). Validasi ekstensi & ukuran
  (peringatan > 50 MB), progress loading, penanganan error yang jelas, dan **dispose** penuh
  (geometry/material/texture) + revoke object URL saat ganti model (tanpa memory leak).
- **Viewer & performa**: `frameloop="demand"` (render hanya saat berubah; otomatis `"always"`
  saat animasi/interaksi/explode), `PerformanceMonitor` + `AdaptiveDpr`, auto-fit kamera
  (`Bounds`), OrbitControls dengan damping & batas zoom relatif ukuran model, Environment HDRI
  (lokal), `ContactShadows`.
- **Info & Scene Tree**: statistik model (mesh, triangle, material, tekstur, dimensi, animasi,
  deteksi Draco/KTX2/Meshopt) + peringatan optimasi; tree dengan search, toggle visibility,
  klik untuk fokus kamera, badge node interaktif.
- **Animasi**: daftar clip, play/pause/stop, loop (sekali/ulang/bolak-balik), kecepatan
  0.25–2×, scrubber timeline, crossfade halus.
- **Interaksi bagian model**: klik untuk buka/tutup dengan easing halus, hover highlight +
  tooltip, tombol Buka/Tutup semua, mode manual untuk menandai node interaktif dari UI.
- **Mode Rakit**: toggle visibilitas grup, slider explode, langkah perakitan bernomor (highlight
  + ghost part berikutnya + fokus kamera + keyboard ←/→), dan garis ukur 3D.
- **Settings & Toolbar**: preset environment, latar transparan/warna/environment, toggle
  bayangan/wireframe/grid/FPS, reset kamera, fullscreen, screenshot PNG, sembunyikan panel.
- **UI/UX**: sidebar kiri (desktop) / bottom sheet (mobile), dark & light mengikuti sistem,
  Bahasa Indonesia, ikon lucide, tombol beraksesibilitas (aria-label, keyboard).

## Menyiapkan Model di Blender agar Interaktif

Sistem interaksi men-resolve tiap node dengan prioritas **A → B → C**:

### A. Custom Properties (glTF `extras` → `object.userData`)

Di Blender, pilih objek → **Object Properties → Custom Properties → Add**. Saat ekspor glTF,
aktifkan **Include → Custom Properties**. Properti yang dikenali:

| Properti      | Nilai                                   | Keterangan                          |
| ------------- | --------------------------------------- | ----------------------------------- |
| `interactive` | `"rotate"` \| `"translate"` \| `"animation"` | jenis interaksi                |
| `axis`        | `"x"` \| `"y"` \| `"z"`                 | sumbu                               |
| `angle`       | number (derajat)                        | untuk `rotate`                      |
| `distance`    | number (meter)                          | untuk `translate`                   |
| `clip`        | string                                  | nama animation clip (`animation`)   |
| `label`       | string                                  | nama tampil (tooltip/UI)            |
| `duration`    | number (detik, default 0.6)             | durasi easing                       |

Contoh laci: `interactive="translate"`, `axis="z"`, `distance=0.3`, `label="Laci"`.

### B. Konvensi Nama Node

- Node yang namanya **diawali `INT_`** dianggap interaktif.
- Jika ada **animation clip yang namanya mengandung nama node** (mis. node `INT_Pintu` dan clip
  `INT_Pintu_Open`), klik memainkan clip itu maju (buka) dan mundur (tutup).
- Jika tidak ada clip, default **rotate 90° pada sumbu Y**. Letakkan **pivot di engsel**
  (origin objek di titik engsel) agar rotasi benar.

### C. Mode Manual (UI)

Di panel **Interaksi**, pilih node di Scene Tree lalu "Jadikan interaktif" (pilih tipe, sumbu,
sudut/jarak) — berguna untuk testing tanpa mengubah model.

> **Raycast** selalu mengenai node interaktif terdekat ke atas hierarchy, jadi klik pada child
> mesh tetap memicu parent interaktifnya.

## Mode Rakit: `*.assembly.json`

Letakkan file dengan **nama sama** seperti modelnya (mis. `kamar.glb` → `kamar.assembly.json`)
di folder yang sama; Mode Rakit otomatis aktif. **Satuan dalam mm** (dikonversi ke meter di
kode). Divalidasi dengan zod; node yang tidak ada di model dilaporkan sebagai peringatan.

```json
{
  "title": "Lemari · Meja · Kursi",
  "subtitle": "Semua ukuran mm.",
  "groups": [{ "id": "lemari", "label": "Lemari", "node": "GRP_Lemari", "dims": "1000×580×2000" }],
  "toggles": [
    { "id": "pintu", "label": "Pintu", "type": "interaction", "nodes": ["INT_Pintu"], "states": ["tutup", "buka"] },
    { "id": "ukuran", "label": "Ukuran", "type": "dimensions" },
    { "id": "isi", "label": "Isi lemari", "type": "visibility", "nodes": ["GRP_Isi_Lemari"] }
  ],
  "steps": [
    { "n": 1, "group": "lemari", "title": "Plint", "desc": "Tinggi 90", "nodes": ["Lemari_Plint"] }
  ],
  "dimensions": [
    { "id": "lemari_tinggi", "group": "lemari", "from": [0, 0, 0], "to": [0, 2000, 0], "label": "2000" }
  ]
}
```

## Kompресi Model (gltf-transform)

Kecilkan ukuran model dengan [gltf-transform](https://gltf-transform.dev/):

```bash
npm i -g @gltf-transform/cli

# Geometri: Draco
gltf-transform draco input.glb output.glb

# atau Meshopt (dekompresi lebih cepat di runtime)
gltf-transform meshopt input.glb output.glb

# Tekstur: KTX2 / Basis (UASTC/ETC1S)
gltf-transform uastc input.glb output.glb            # kualitas tinggi
gltf-transform etc1s input.glb output.glb --quality 180   # ukuran kecil

# Gabungan umum
gltf-transform optimize input.glb output.glb --compress draco --texture-compress ktx2
```

Viewer sudah mengkonfigurasi `GLTFLoader` dengan DRACO (`/draco/`), KTX2 (`/basis/`,
`detectSupport`), dan MeshoptDecoder, sehingga model terkompресi langsung bisa dimuat.

## Struktur Singkat

```
src/
  app/            App.tsx (layout), main.tsx
  components/
    layout/       Sidebar, Toolbar, Section, MobileSheet
    upload/       DropZone, LoadingOverlay, ErrorToast
    viewer/       ViewerCanvas, SceneSetup, CameraRig, ModelLoader, Model,
                  Highlighter, InteractionTooltip, ScreenshotController,
                  AssemblyController, DimensionLines, ModelErrorBoundary
    panels/       ModelInfo, SceneTree, Animation, Interactions, Settings,
                  Assembly (GroupToggle, ExplodeSlider, OptionChips, StepList, StepItem)
  hooks/          useModelStats, useAnimationController, useInteractions,
                  useDisposeOnChange, useLoadingManager, useAssembly
  lib/            loaders, interactions, assembly, disposeObject, formatters,
                  modelFiles, loadModelFiles, mixerRegistry, assemblyRuntime
  store/          viewerStore (zustand)
  types/          viewer.ts
scripts/          copy-decoders.mjs, generate-sample.mjs
public/           models/ (contoh), draco/ & basis/ (decoder self-hosted)
```

Lihat `PROGRESS.md` untuk catatan keputusan teknis & verifikasi tiap tahap.
