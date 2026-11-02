// Membuat model contoh GLB untuk menguji SEMUA fitur (interaksi, animasi, Mode Rakit).
// Dijalankan: npm run generate-sample
//
// Dua model dibuat agar terbukti generik (tidak ada hardcode nama/jenis objek di app):
//   1. public/models/sample.glb  -> lemari dari banyak part + sample.assembly.json
//   2. public/models/box.glb     -> kotak dengan tutup (clip) & laci + box.assembly.json
//
// Catatan desain:
// - Geometri box dibuat lewat three.BoxGeometry (murni matematika, aman di Node),
//   lalu attribute-nya dimasukkan ke accessor @gltf-transform (tanpa polyfill DOM).
// - Satuan model = meter (sesuai spec). assembly.json memakai mm lalu dikonversi di app.
// - Pivot engsel pintu/tutup dibuat lewat node "INT_*" di titik engsel; mesh panel jadi
//   child yang di-offset, sehingga rotasi default (konvensi) berputar pada engsel.
// - userData interaktif ditulis via node.setExtras(...) -> jadi object.userData di three.
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/models');

/** Buat node berisi mesh box (dimensi dalam meter), berpusat di origin lokalnya. */
function makeBox(doc, buffer, name, [w, h, d], color, extras) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const posArr = new Float32Array(geo.attributes.position.array);
  const nrmArr = new Float32Array(geo.attributes.normal.array);
  const idxArr = new Uint16Array(geo.index.array);
  geo.dispose();

  const position = doc.createAccessor().setType('VEC3').setArray(posArr).setBuffer(buffer);
  const normal = doc.createAccessor().setType('VEC3').setArray(nrmArr).setBuffer(buffer);
  const indices = doc.createAccessor().setType('SCALAR').setArray(idxArr).setBuffer(buffer);

  const material = doc
    .createMaterial(`${name}_mat`)
    .setBaseColorFactor(color)
    .setMetallicFactor(0)
    .setRoughnessFactor(0.75)
    .setDoubleSided(true);

  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setIndices(indices)
    .setMaterial(material);

  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  if (extras) node.setExtras(extras);
  return node;
}

/** Quaternion (array [x,y,z,w]) dari sudut (radian) pada sumbu tertentu. */
function quat(axis, angleRad) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), angleRad);
  return [q.x, q.y, q.z, q.w];
}

/** Buat animasi rotasi pada satu node dengan deret keyframe (times + sudut derajat). */
function makeRotationClip(doc, buffer, clipName, targetNode, axis, times, anglesDeg) {
  const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
  const flat = [];
  for (const deg of anglesDeg) flat.push(...quat(axis, (deg * Math.PI) / 180));
  const output = doc.createAccessor().setType('VEC4').setArray(new Float32Array(flat)).setBuffer(buffer);
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler);
  return doc.createAnimation(clipName).addSampler(sampler).addChannel(channel);
}

// Palet warna kayu/aksen (linear-ish, cukup untuk demo).
const WOOD = [0.62, 0.45, 0.28, 1];
const WOOD_DARK = [0.5, 0.35, 0.2, 1];
const PANEL = [0.78, 0.63, 0.45, 1];
const ACCENT = [0.71, 0.33, 0.12, 1];
const METAL = [0.8, 0.8, 0.82, 1];

// ----------------------------------------------------------------------------
// Model 1: Lemari (sample.glb)
// ----------------------------------------------------------------------------
function buildLemari() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const t = 0.02; // tebal panel 20mm

  const grp = doc.createNode('GRP_Lemari');
  scene.addChild(grp);

  const plint = makeBox(doc, buffer, 'Lemari_Plint', [0.96, 0.09, 0.5], WOOD_DARK).setTranslation([0, 0.045, -0.011]);
  const alas = makeBox(doc, buffer, 'Lemari_Alas', [0.96, t, 0.56], WOOD).setTranslation([0, 0.1, 0]);
  const sideL = makeBox(doc, buffer, 'Lemari_SampingKiri', [t, 1.88, 0.56], WOOD).setTranslation([-0.49, 1.04, 0]);
  const sideR = makeBox(doc, buffer, 'Lemari_SampingKanan', [t, 1.88, 0.56], WOOD).setTranslation([0.49, 1.04, 0]);
  const top = makeBox(doc, buffer, 'Lemari_Atas', [0.96, t, 0.56], WOOD).setTranslation([0, 1.99, 0]);
  const backing = makeBox(doc, buffer, 'Lemari_Backing', [0.96, 1.88, 0.01], WOOD_DARK).setTranslation([0, 1.04, -0.285]);

  const grpIsi = doc.createNode('GRP_Isi_Lemari');
  const rak = makeBox(doc, buffer, 'Lemari_Rak', [0.92, t, 0.54], PANEL).setTranslation([0, 1.0, 0]);
  grpIsi.addChild(rak);

  // Pintu: node engsel INT_Pintu di tepi kiri; panel pintu sebagai child yang di-offset.
  const hinge = doc
    .createNode('INT_Pintu')
    .setTranslation([-0.49, 1.04, 0.29])
    .setExtras({ label: 'Pintu Lemari' }); // interaktif via konvensi INT_ (default rotate Y)
  const panel = makeBox(doc, buffer, 'Pintu_Panel', [0.98, 1.88, t], PANEL).setTranslation([0.49, 0, 0.01]);
  const knob = makeBox(doc, buffer, 'Knob', [0.03, 0.12, 0.03], METAL).setTranslation([0.92, 0, 0.04]);
  hinge.addChild(panel);
  hinge.addChild(knob);

  // Laci: translate sumbu Z via userData extras (jalur A).
  const laci = makeBox(doc, buffer, 'INT_Laci', [0.9, 0.18, 0.5], WOOD_DARK)
    .setTranslation([0, 0.3, 0.02])
    .setExtras({ interactive: 'translate', axis: 'z', distance: 0.3, label: 'Laci', duration: 0.6 });

  // Spinner kecil di atas lemari untuk clip animasi sederhana.
  const spinner = makeBox(doc, buffer, 'Spinner', [0.12, 0.12, 0.12], ACCENT).setTranslation([0.35, 2.07, 0]);

  for (const n of [plint, alas, sideL, sideR, top, backing, grpIsi, hinge, laci, spinner]) {
    grp.addChild(n);
  }

  // Clip animasi "Spin": memutar spinner 360° pada sumbu Y (keyframe tiap 90°).
  makeRotationClip(doc, buffer, 'Spin', spinner, [0, 1, 0], [0, 0.5, 1, 1.5, 2], [0, 90, 180, 270, 360]);

  return doc;
}

// ----------------------------------------------------------------------------
// Model 2: Kotak dengan tutup (clip) & laci (box.glb) — membuktikan sistem generik
// ----------------------------------------------------------------------------
function buildKotak() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const grp = doc.createNode('GRP_Kotak');
  scene.addChild(grp);

  const badan = makeBox(doc, buffer, 'Kotak_Badan', [0.6, 0.4, 0.5], [0.3, 0.5, 0.65, 1]).setTranslation([0, 0.2, 0]);

  // Tutup: engsel di tepi belakang-atas. Interaksi lewat CLIP (konvensi B).
  const lidHinge = doc
    .createNode('INT_Tutup')
    .setTranslation([0, 0.4, -0.25])
    .setExtras({ label: 'Tutup Kotak' });
  const lidPanel = makeBox(doc, buffer, 'Tutup_Panel', [0.6, 0.04, 0.5], [0.35, 0.55, 0.7, 1]).setTranslation([0, 0.02, 0.25]);
  lidHinge.addChild(lidPanel);

  // Laci kotak: translate Z via userData (jalur A) — objek berbeda, konfigurasi sama.
  const laci = makeBox(doc, buffer, 'INT_LaciKotak', [0.5, 0.12, 0.44], [0.25, 0.42, 0.55, 1])
    .setTranslation([0, 0.1, 0.03])
    .setExtras({ interactive: 'translate', axis: 'z', distance: 0.28, label: 'Laci Kotak' });

  grp.addChild(badan);
  grp.addChild(lidHinge);
  grp.addChild(laci);

  // Clip "INT_Tutup_Open": namanya mengandung nama node -> dipakai interaksi buka/tutup.
  makeRotationClip(doc, buffer, 'INT_Tutup_Open', lidHinge, [1, 0, 0], [0, 1], [0, -70]);

  return doc;
}

// ----------------------------------------------------------------------------
// File assembly.json (satuan mm)
// ----------------------------------------------------------------------------
const lemariAssembly = {
  title: 'Lemari Contoh',
  subtitle: 'Model uji Mode Rakit. Semua ukuran mm.',
  groups: [{ id: 'lemari', label: 'Lemari', node: 'GRP_Lemari', dims: '1000×580×2000' }],
  toggles: [
    { id: 'pintu', label: 'Pintu', type: 'interaction', nodes: ['INT_Pintu'], states: ['tutup', 'buka'] },
    { id: 'ukuran', label: 'Ukuran', type: 'dimensions' },
    { id: 'isi', label: 'Isi lemari', type: 'visibility', nodes: ['GRP_Isi_Lemari'] },
  ],
  steps: [
    { n: 1, group: 'lemari', title: 'Plint (kaki lemari)', desc: 'Tinggi 90, depan mundur 22', nodes: ['Lemari_Plint'] },
    { n: 2, group: 'lemari', title: 'Alas', desc: 'Panel dasar di atas plint', nodes: ['Lemari_Alas'] },
    { n: 3, group: 'lemari', title: 'Samping kiri & kanan', desc: 'Dua panel vertikal', nodes: ['Lemari_SampingKiri', 'Lemari_SampingKanan'] },
    { n: 4, group: 'lemari', title: 'Atas', desc: 'Panel penutup atas', nodes: ['Lemari_Atas'] },
    { n: 5, group: 'lemari', title: 'Backing', desc: 'Panel belakang tipis', nodes: ['Lemari_Backing'] },
    { n: 6, group: 'lemari', title: 'Pintu', desc: 'Dipasang di engsel kiri', nodes: ['INT_Pintu'] },
  ],
  dimensions: [
    { id: 'lemari_tinggi', group: 'lemari', from: [-600, 0, 0], to: [-600, 2000, 0], label: '2000' },
    { id: 'lemari_lebar', group: 'lemari', from: [-500, 2100, 0], to: [500, 2100, 0], label: '1000' },
    { id: 'lemari_dalam', group: 'lemari', from: [600, 0, -290], to: [600, 0, 290], label: '580' },
  ],
};

const kotakAssembly = {
  title: 'Kotak Contoh',
  subtitle: 'Model kedua untuk membuktikan sistem generik. Ukuran mm.',
  groups: [{ id: 'kotak', label: 'Kotak', node: 'GRP_Kotak', dims: '600×500×400' }],
  toggles: [
    { id: 'tutup', label: 'Tutup', type: 'interaction', nodes: ['INT_Tutup'], states: ['tutup', 'buka'] },
    { id: 'ukuran', label: 'Ukuran', type: 'dimensions' },
  ],
  steps: [
    { n: 1, group: 'kotak', title: 'Badan kotak', desc: 'Kotak utama', nodes: ['Kotak_Badan'] },
    { n: 2, group: 'kotak', title: 'Laci', desc: 'Laci tarik depan', nodes: ['INT_LaciKotak'] },
    { n: 3, group: 'kotak', title: 'Tutup', desc: 'Engsel belakang', nodes: ['INT_Tutup'] },
  ],
  dimensions: [{ id: 'kotak_tinggi', group: 'kotak', from: [-350, 0, 0], to: [-350, 400, 0], label: '400' }],
};

async function main() {
  await mkdir(outDir, { recursive: true });
  const io = new NodeIO();

  await io.write(resolve(outDir, 'sample.glb'), buildLemari());
  await writeFile(resolve(outDir, 'sample.assembly.json'), JSON.stringify(lemariAssembly, null, 2));
  console.log('[generate-sample] sample.glb + sample.assembly.json');

  await io.write(resolve(outDir, 'box.glb'), buildKotak());
  await writeFile(resolve(outDir, 'box.assembly.json'), JSON.stringify(kotakAssembly, null, 2));
  console.log('[generate-sample] box.glb + box.assembly.json');
}

main().catch((err) => {
  console.error('[generate-sample] Gagal:', err);
  process.exit(1);
});
