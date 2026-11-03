// Demo MINIMAL: GLB yang membawa interaksi, sebagai TEMPLATE untuk model sendiri.
// Jalankan: node scripts/generate-demo-interaktif.mjs
// Output:   public/models/demo-interaktif.glb
//
// Tujuan file ini: menunjukkan "rahasia" kenapa sebuah GLB bisa interaktif di viewer.
// Viewer (lihat src/lib/interactions.ts) menyalakan tombol lewat 3 jalur:
//   A. userData extras  -> node.setExtras({ interactive: 'rotate'|'translate', ... })
//   B. konvensi nama    -> nama node diawali "INT_" (+ opsional clip animasi yang cocok)
//   C. override manual   -> diatur dari UI (tidak perlu disentuh di file)
//
// Demo ini = 1 lemari sederhana dengan:
//   - Pintu  : node "INT_Pintu" + extras rotate  (pakai jalur A dan B sekaligus)
//   - Laci   : node "INT_Laci"  + extras translate
// Keduanya cukup supaya tombol langsung muncul begitu di-load. Tidak ada assembly.json
// khusus — sengaja polos biar fokus ke mekanisme interaksinya saja.
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/models');

/** Buat node berisi mesh box (meter), berpusat di origin lokalnya. */
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

const WOOD = [0.62, 0.45, 0.28, 1];
const WOOD_DARK = [0.5, 0.35, 0.2, 1];
const PANEL = [0.78, 0.63, 0.45, 1];
const METAL = [0.8, 0.8, 0.82, 1];

function buildDemo() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const t = 0.02; // tebal panel 20mm

  const grp = doc.createNode('GRP_Demo');
  scene.addChild(grp);

  // --- Badan lemari (part-part biasa, TIDAK interaktif) ---
  const alas = makeBox(doc, buffer, 'Alas', [0.8, t, 0.5], WOOD).setTranslation([0, 0.1, 0]);
  const sideL = makeBox(doc, buffer, 'SampingKiri', [t, 1.2, 0.5], WOOD).setTranslation([-0.39, 0.7, 0]);
  const sideR = makeBox(doc, buffer, 'SampingKanan', [t, 1.2, 0.5], WOOD).setTranslation([0.39, 0.7, 0]);
  const top = makeBox(doc, buffer, 'Atas', [0.8, t, 0.5], WOOD).setTranslation([0, 1.3, 0]);
  const backing = makeBox(doc, buffer, 'Backing', [0.8, 1.2, 0.01], WOOD_DARK).setTranslation([0, 0.7, -0.245]);

  // --- Pintu INTERAKTIF (jalur A: extras rotate + jalur B: nama "INT_") ---
  // Engsel di tepi kiri; panel pintu jadi CHILD yang di-offset supaya rotasi berputar di engsel.
  // angle -90 = pintu membuka KELUAR ke arah penonton.
  const pintu = doc
    .createNode('INT_Pintu')
    .setTranslation([-0.39, 0.7, 0.25])
    .setExtras({ interactive: 'rotate', axis: 'y', angle: -90, label: 'Pintu', duration: 0.6 });
  const pintuPanel = makeBox(doc, buffer, 'Pintu_Panel', [0.78, 1.2, t], PANEL).setTranslation([0.39, 0, 0.01]);
  const knob = makeBox(doc, buffer, 'Knob', [0.025, 0.1, 0.025], METAL).setTranslation([0.72, 0, 0.04]);
  pintu.addChild(pintuPanel);
  pintu.addChild(knob);

  // --- Laci INTERAKTIF (jalur A: extras translate sumbu Z) ---
  const laci = makeBox(doc, buffer, 'INT_Laci', [0.74, 0.15, 0.46], WOOD_DARK)
    .setTranslation([0, 0.25, 0.02])
    .setExtras({ interactive: 'translate', axis: 'z', distance: 0.3, label: 'Laci', duration: 0.6 });

  for (const n of [alas, sideL, sideR, top, backing, pintu, laci]) grp.addChild(n);

  return doc;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const io = new NodeIO();
  await io.write(resolve(outDir, 'demo-interaktif.glb'), buildDemo());
  console.log('[demo] public/models/demo-interaktif.glb dibuat.');
}

main().catch((err) => {
  console.error('[demo] Gagal:', err);
  process.exit(1);
});
