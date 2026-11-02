# Project: 3D Model Viewer Web (GLB/GLTF) dengan Drag & Drop dan Interaksi

## Tujuan
Bangun web app untuk menampilkan model 3D (GLB/GLTF) di browser. User bisa drag & drop file,
model langsung tampil, bisa diputar/zoom/geser, animasi bawaan model bisa dimainkan, dan
bagian model tertentu (misalnya pintu, laci) bisa diklik untuk dibuka/ditutup secara halus.
Prioritas utama: performa smooth (60fps di laptop, stabil di HP kelas menengah), kode rapi
berbasis komponen, dan mudah dikembangkan.

## Tech Stack (wajib)
- Vite + React + TypeScript (strict mode)
- three.js
- @react-three/fiber (R3F)
- @react-three/drei
- @react-three/postprocessing (hanya untuk outline/highlight, opsional dan bisa dimatikan)
- zustand untuk global state
- Tailwind CSS untuk styling UI
- maath untuk easing/damping animasi
- r3f-perf hanya di mode development
Gunakan versi stabil terbaru yang kompatibel satu sama lain. Cek kompatibilitas versi
R3F dengan React dan three sebelum install. Jangan pakai versi beta/rc.

## Struktur Folder
src/
  app/
    App.tsx                 # layout utama: sidebar + canvas
    main.tsx
  components/
    layout/
      Sidebar.tsx           # panel kiri: info model, scene tree, animasi, setting
      Toolbar.tsx           # tombol atas: reset kamera, fullscreen, screenshot, toggle panel
    upload/
      DropZone.tsx          # area drag & drop fullscreen overlay + tombol pilih file
      LoadingOverlay.tsx    # progress bar loading + nama file
      ErrorToast.tsx        # notifikasi error
    viewer/
      ViewerCanvas.tsx      # <Canvas> R3F + setting performa
      SceneSetup.tsx        # lighting, Environment HDRI, ground shadow
      ModelLoader.tsx       # load GLB dari object URL, Suspense, dispose
      Model.tsx             # render scene, setup interaksi per-node
      CameraRig.tsx         # OrbitControls + auto-fit ke model (Bounds) + reset
      InteractivePart.tsx   # logic hover/klik untuk node interaktif
      Highlighter.tsx       # outline/emissive saat hover
    panels/
      ModelInfoPanel.tsx    # ukuran file, jumlah mesh, triangle, material, tekstur, dimensi
      SceneTreePanel.tsx    # tree node hierarchy, klik untuk fokus/select, toggle visibility
      AnimationPanel.tsx    # daftar clip: play/pause/stop, loop, speed, scrubber
      SettingsPanel.tsx     # pilih environment preset, toggle shadow, wireframe, background
  hooks/
    useModelStats.ts        # hitung statistik model
    useAnimationController.ts
    useInteractions.ts      # mapping node -> aksi interaksi
    useDisposeOnChange.ts   # bersihin memori saat ganti model
  store/
    viewerStore.ts          # zustand store
  lib/
    loaders.ts              # konfigurasi GLTFLoader + DRACO + KTX2 + Meshopt
    interactions.ts         # parser konvensi interaksi (lihat bawah)
    disposeObject.ts        # dispose geometry, material, texture secara rekursif
    formatters.ts           # format bytes, angka
  types/
    viewer.ts
public/
  draco/                    # decoder Draco di-host sendiri
  basis/                    # transcoder KTX2/Basis di-host sendiri
  models/sample.glb         # model contoh default (buat model sederhana kalau perlu)

## Fitur Detail

### 1. Upload / Drag & Drop
- User bisa drag file ke mana saja di halaman; tampilkan overlay "Lepas file di sini" saat drag.
- Juga ada tombol "Pilih File" (input file tersembunyi).
- Terima .glb dan .gltf. Untuk .gltf yang punya file eksternal (.bin, tekstur), dukung drop
  banyak file sekaligus dan resolve path via LoadingManager.setURLModifier ke object URL.
- Validasi ekstensi dan ukuran (peringatan jika > 50 MB, tapi tetap boleh lanjut).
- Load file via URL.createObjectURL, dan WAJIB revokeObjectURL setelah selesai/ganti model.
- Tampilkan progress loading (persentase) dan nama file.
- Error handling jelas: file rusak, format tidak didukung, gagal decode Draco/KTX2.
- Saat pertama dibuka, tampilkan model contoh dari /public/models/sample.glb.

### 2. Loader (lib/loaders.ts)
- Satu instance GLTFLoader yang dipakai ulang.
- DRACOLoader dengan decoder path /draco/ (self-hosted, bukan CDN).
- KTX2Loader dengan transcoder path /basis/, panggil detectSupport(gl).
- MeshoptDecoder.
- Copy file decoder dari node_modules/three/examples/jsm/libs ke public saat setup
  (buat script npm "copy-decoders" dan jalankan di postinstall).

### 3. Viewer & Performa (WAJIB diterapkan)
- <Canvas> dengan:
  - frameloop="demand" (render hanya saat ada perubahan); panggil invalidate()
    saat animasi/tween berjalan atau kamera bergerak.
  - dpr={[1, 2]} dan pakai <PerformanceMonitor> + <AdaptiveDpr> dari drei untuk menurunkan
    resolusi otomatis kalau FPS turun.
  - gl: antialias true, powerPreference "high-performance", toneMapping ACESFilmic,
    outputColorSpace SRGB.
- Lighting: <Environment> preset (default "city"), satu directional light untuk shadow.
  Shadow pakai <ContactShadows> atau <AccumulativeShadows> (pilih yang paling ringan,
  bisa dimatikan di setting).
- Kamera: <Bounds fit clip observe> agar model otomatis pas di layar berapa pun ukurannya.
  Pusatkan model dengan <Center>.
- OrbitControls dengan damping aktif, batasi zoom min/max relatif ke ukuran model,
  makeDefault.
- Saat model berganti: dispose semua geometry, material, texture model lama secara rekursif,
  clear cache loader, revoke object URL. Pastikan tidak ada memory leak
  (cek renderer.info.memory sebelum dan sesudah ganti model).
- Kalau model punya animasi, render loop otomatis jalan selama animasi aktif lalu kembali ke
  demand saat berhenti.
- Gunakan Suspense untuk loading model.
- Hindari re-render React tiap frame: semua update per-frame lewat useFrame dan ref,
  jangan lewat setState.

### 4. Animasi Bawaan Model (AnimationPanel)
- Pakai useAnimations dari drei.
- Tampilkan semua clip dengan nama dan durasi.
- Kontrol: play, pause, stop, loop (once/repeat/pingpong), speed (0.25x sampai 2x),
  scrubber timeline.
- Bisa memainkan beberapa clip bersamaan; crossfade halus (0.3 detik) saat ganti clip.

### 5. Interaksi Bagian Model (fitur utama)
Klik bagian model untuk toggle (buka/tutup). Dukung tiga cara, urut prioritas:

A. Custom properties dari Blender (glTF extras -> object.userData):
   - interactive: "rotate" | "translate" | "animation"
   - axis: "x" | "y" | "z"
   - angle: number (derajat, untuk rotate)
   - distance: number (meter, untuk translate)
   - clip: string (nama animation clip, untuk "animation")
   - label: string (nama tampil di UI, misal "Pintu Depan")
   - duration: number (detik, default 0.6)

B. Konvensi nama node:
   - Nama diawali "INT_" dianggap interaktif.
   - Kalau ada animation clip yang namanya mengandung nama node tersebut
     (misal node "INT_PintuDepan" dan clip "INT_PintuDepan_Open"), klik akan
     memainkan clip itu maju (buka) dan mundur (tutup).
   - Kalau tidak ada clip, default rotate 90 derajat di sumbu Y.

C. Mode manual dari UI: di SceneTreePanel, user bisa pilih node mana saja dan menjadikannya
   interaktif (pilih tipe, sumbu, sudut) untuk keperluan testing.

Perilaku interaksi:
- Hover: cursor jadi pointer, bagian di-highlight (outline atau emissive tipis), tampilkan
  tooltip label.
- Klik: toggle state buka/tutup dengan easing halus (maath easing.damp), bukan lompat.
- Event raycast harus kena ke node interaktif terdekat ke atas di hierarchy (kalau user
  klik child mesh, cari parent yang interaktif). Pakai e.stopPropagation().
- Simpan state open/closed per node di zustand.
- Tombol "Tutup Semua" dan "Buka Semua" di sidebar.
- Bedakan klik dan drag kamera: jangan trigger interaksi kalau pointer bergerak
  lebih dari beberapa pixel (user sedang memutar kamera).
- Di HP: tap untuk klik, tanpa hover.

### 6. Panel Info & Scene Tree
- ModelInfoPanel: nama file, ukuran file, jumlah mesh, total triangle, jumlah material,
  jumlah tekstur dan resolusi terbesar, dimensi bounding box (meter), jumlah animasi,
  apakah pakai Draco/KTX2/Meshopt. Beri peringatan kuning jika triangle > 500k atau
  tekstur > 2048px, beserta saran optimasi singkat.
- SceneTreePanel: tree collapsible dengan ikon tipe node, search/filter nama,
  toggle visibility per node, klik untuk select (highlight + kamera fokus ke node tersebut),
  tandai node interaktif dengan badge.

### 7. Settings & Toolbar
- Environment preset (city, studio, sunset, warehouse, apartment), background:
  transparan/warna solid/environment blur.
- Toggle: shadow, wireframe, grid, tampilkan statistik FPS (r3f-perf hanya dev).
- Toolbar: reset kamera, fullscreen, screenshot PNG (pakai preserveDrawingBuffer hanya
  saat capture atau render ke target), sembunyikan/tampilkan sidebar.

### 8. UI/UX
- Layout: sidebar kiri (bisa collapse), canvas memenuhi sisa layar.
- Di HP (<768px): sidebar jadi bottom sheet yang bisa ditarik.
- Dukung dark dan light mode mengikuti sistem.
- Bahasa UI: Indonesia.
- Tampilan bersih dan modern; pakai ikon dari lucide-react.
- Aksesibilitas: tombol punya aria-label, bisa dioperasikan keyboard.

## Kualitas Kode
- TypeScript strict, tanpa any kecuali benar-benar perlu (beri komentar alasannya).
- Komponen kecil dan fokus satu tanggung jawab.
- Logic dipisah ke hooks/lib, komponen hanya untuk render.
- ESLint + Prettier dikonfigurasi.
- Komentar singkat di bagian yang tidak obvious (dispose, invalidate, raycast parent lookup).
- Tidak ada console.log tertinggal di production.

## Langkah Pengerjaan (kerjakan bertahap, verifikasi tiap tahap)
1. Setup project, install dependency, konfigurasi Tailwind, ESLint, copy decoder.
2. ViewerCanvas + SceneSetup + model contoh tampil dengan kamera auto-fit.
3. DropZone + LoadingOverlay + ErrorToast + dispose saat ganti model.
4. ModelInfoPanel + SceneTreePanel.
5. AnimationPanel.
6. Sistem interaksi (userData, konvensi INT_, mode manual) + highlight + tooltip.
7. Settings, Toolbar, responsive mobile.
8. Optimasi akhir: cek frameloop demand berjalan benar, cek memory leak saat ganti model
   5 kali berturut-turut, build production dan cek ukuran bundle (lazy-load panel jika perlu).
Setelah tiap tahap, jalankan typecheck dan lint, perbaiki semua error sebelum lanjut.

## Model Contoh
Kalau tidak ada model contoh, buat skrip Node kecil (scripts/generate-sample.ts) yang
menghasilkan sample.glb berisi lemari/rumah sederhana dengan:
- satu pintu bernama "INT_Pintu" dengan pivot di engsel,
- satu laci bernama "INT_Laci" dengan userData { interactive: "translate", axis: "z",
  distance: 0.3, label: "Laci" },
- satu animation clip sederhana,
agar semua fitur bisa langsung dites.

## Deliverable
- Project berjalan dengan `npm install` lalu `npm run dev`.
- README.md berisi: cara menjalankan, cara menyiapkan model di Blender agar interaktif
  (custom properties dan konvensi nama INT_), cara kompres model (gltf-transform:
  draco/meshopt + ktx2), dan daftar fitur.
- Ringkasan akhir: apa saja yang sudah dibuat, keputusan teknis penting, dan saran
  pengembangan berikutnya.

  ## Fitur Tambahan: Mode Rakit (Assembly Viewer)

Referensi UI: panel samping berisi toggle grup, slider explode, toggle opsi, dan daftar
langkah rakit bernomor. Implementasikan sebagai panel baru `AssemblyPanel.tsx`.

### Data
- Buat file `public/models/<nama-model>.assembly.json` yang dimuat bersama GLB
  (jika ada file dengan nama sama, otomatis aktifkan Mode Rakit). Format:
  {
    "title": "Lemari · Meja · Kursi",
    "subtitle": "Dari model kamar 250×300 v7. Semua ukuran mm.",
    "groups": [
      { "id": "lemari", "label": "Lemari", "node": "GRP_Lemari", "dims": "1000×580×2000" }
    ],
    "toggles": [
      { "id": "pintu", "label": "Pintu", "type": "interaction", "nodes": ["INT_Pintu_Kiri", "INT_Pintu_Kanan"], "states": ["tutup", "buka"] },
      { "id": "ukuran", "label": "Ukuran", "type": "dimensions" },
      { "id": "isi", "label": "Isi lemari", "type": "visibility", "nodes": ["GRP_Isi_Lemari"] }
    ],
    "steps": [
      { "n": 1, "group": "lemari", "title": "Plint (kaki lemari)", "desc": "Tinggi 90, depan mundur 22", "nodes": ["Lemari_Plint"] }
    ],
    "dimensions": [
      { "id": "lemari_tinggi", "group": "lemari", "from": [0,0,0], "to": [0,2000,0], "label": "2000" }
    ]
  }
- Satuan di JSON dalam mm; konversi ke meter di kode (model GLB dalam meter).
- Validasi JSON dengan zod; tampilkan error jelas jika node yang disebut tidak ada di model.

### Komponen
- `AssemblyPanel.tsx`: header (title, subtitle), section TAMPILKAN, BONGKAR, toggle opsi,
  URUTAN RAKIT dikelompokkan per group dengan header berisi nama dan dimensi.
- `GroupToggle.tsx`: chip pill hitam (aktif) / outline (nonaktif), toggle visibility grup.
- `ExplodeSlider.tsx`: slider 0–1.
- `OptionChips.tsx`: chip untuk toggles (interaction menampilkan state, mis. "Pintu: tutup").
- `StepList.tsx` + `StepItem.tsx`: nomor dalam kotak, judul tebal, deskripsi abu-abu.
- `DimensionLines.tsx`: garis ukur 3D dengan tick di ujung + label angka (drei <Line> dan <Html>),
  label tetap terbaca dari sudut kamera mana pun, tidak memblok klik.

### Perilaku
- Explode: tiap mesh punya posisi asli tersimpan; offset = arah dari pusat bounding box
  grupnya ke pusat mesh × nilai slider × faktor jarak (relatif ukuran grup). Gerak halus
  dengan maath easing.damp; panggil invalidate() selama transisi.
- Klik langkah N:
  - part di langkah 1..N-1 tampil normal,
  - part di langkah N di-highlight (outline/warna aksen) dan sedikit "turun" ke posisinya
    dengan animasi masuk,
  - part di langkah > N disembunyikan atau dibuat transparan (opsi di setting),
  - kamera animasi fokus ke part langkah N (Bounds/ CameraControls fitToBox, halus),
  - item langkah aktif ditandai di list dan di-scroll ke view.
- Tombol "Lihat semua" untuk keluar dari mode langkah; tombol prev/next dan
  dukungan keyboard panah kiri/kanan.
- Toggle grup dan explode tetap berfungsi saat mode langkah aktif.
- Klik part di model saat mode rakit: pilih langkah tempat part itu dipasang.

### Gaya
- Panel krem terang (dark mode menyesuaikan), font sans untuk isi, font monospace kecil
  huruf kapital untuk label section (TAMPILKAN, BONGKAR, URUTAN RAKIT), header grup
  warna aksen oranye-coklat.
- Panel scroll sendiri, header tetap di atas.

### Model Contoh
Perluas skrip generate-sample agar menghasilkan lemari sederhana dari beberapa part
terpisah (plint, alas, samping kiri/kanan, atas, backing, pintu) + file assembly.json
contoh dengan 5–6 langkah, supaya Mode Rakit bisa langsung dites.

PENTING: Semua fitur (interaksi, explode, mode rakit, ukuran) harus generik dan
data-driven. Jangan hardcode nama model, nama part, atau jenis objek tertentu di kode.
Semua konfigurasi berasal dari GLB (nama node + userData) dan file assembly.json.
Contoh lemari hanya untuk testing. Tambahkan juga model contoh kedua yang berbeda
(misal kotak dengan tutup dan laci) untuk membuktikan sistemnya generik.