import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { type Camera, type Scene, SRGBColorSpace, type WebGLRenderer, WebGLRenderTarget } from 'three';
import { useViewerStore } from '@/store/viewerStore';

/** Render scene ke render target lalu unduh sebagai PNG (tanpa preserveDrawingBuffer). */
function captureAndDownload(gl: WebGLRenderer, scene: Scene, camera: Camera): void {
  const canvasEl = gl.domElement;
  const w = canvasEl.width;
  const h = canvasEl.height;

  const rt = new WebGLRenderTarget(w, h);
  rt.texture.colorSpace = SRGBColorSpace; // samakan dengan tampilan layar

  const prevTarget = gl.getRenderTarget();
  gl.setRenderTarget(rt);
  gl.render(scene, camera);

  const buffer = new Uint8Array(w * h * 4);
  gl.readRenderTargetPixels(rt, 0, 0, w, h, buffer);
  gl.setRenderTarget(prevTarget);
  rt.dispose();

  // Tulis ke canvas 2D (balik sumbu Y karena WebGL bottom-up).
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const rowBytes = w * 4;
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * rowBytes;
    img.data.set(buffer.subarray(src, src + rowBytes), y * rowBytes);
  }
  ctx.putImageData(img, 0, 0);

  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function ScreenshotController() {
  const nonce = useViewerStore((s) => s.screenshotNonce);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (nonce === 0) return;
    captureAndDownload(gl, scene, camera);
  }, [nonce, gl, scene, camera]);

  return null;
}
