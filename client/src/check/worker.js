// The photo checker. It runs CLIP's vision half (8-bit, WebAssembly) off the main thread, so the UI never freezes.
// It only turns a photo into 512 numbers; the pass/fail rule lives in shared/decide.js.
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@huggingface/transformers';

const MODEL = 'Xenova/clip-vit-base-patch32';
env.allowLocalModels = false;

let loading = null;
function load() {
  const files = {};
  loading ??= Promise.all([
    AutoProcessor.from_pretrained(MODEL),
    CLIPVisionModelWithProjection.from_pretrained(MODEL, {
      dtype: 'q8',
      device: 'wasm',
      // Per-file progress, summed (the same approach the 7 Oct test page used on the POCO).
      progress_callback: (p) => {
        if (p.status !== 'progress' || !p.total) return;
        files[p.file] = [p.loaded, p.total];
        const [loaded, total] = Object.values(files).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
        self.postMessage({ type: 'progress', loaded, total });
      },
    }),
  ]).catch((err) => {
    loading = null; // let the next attempt try again
    throw err;
  });
  return loading;
}

async function embed(file) {
  const [processor, model] = await load();
  // Shrink big camera photos first: CLIP only looks at 224 x 224 anyway.
  const bitmap = await createImageBitmap(file, { resizeWidth: 448, resizeQuality: 'medium' });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  const { image_embeds } = await model(await processor(RawImage.fromCanvas(canvas)));
  const v = Float32Array.from(image_embeds.data);
  const norm = Math.hypot(...v);
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      await load();
      self.postMessage({ id: data.id, type: 'ready' });
      return;
    }
    const embedding = await embed(data.file);
    self.postMessage({ id: data.id, type: 'embedding', embedding }, [embedding.buffer]);
  } catch (err) {
    self.postMessage({ id: data.id, type: 'error', message: err?.message ?? String(err) });
  }
};
