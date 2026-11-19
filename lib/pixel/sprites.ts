import { COLORS } from "./art";

// Rooftop icons come from image files in public/sprites/. Any size works: big
// pixel art (an enlarged export, a drawing from a generator) is shrunk to fit
// the street, and small pixel-exact PNGs are drawn as they are.
//
// Browser only: uses a canvas to read the image's pixels.

export const ICON_MAX_WIDTH = 26; // street pixels; a store is 72 wide
export const ICON_MAX_HEIGHT = 13;

const DARK_SHARE = 0.3; // a dark outline wins its cell if it covers this much of it
const DARK_LUMA = 60;

function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Turns a loaded image into a street-sized sprite: crops away the transparent
 * border, shrinks it to fit ICON_MAX_WIDTH x ICON_MAX_HEIGHT by picking each
 * block's main color (so edges stay hard instead of blurring), then adds a
 * 1-pixel outline in the roof-trim color so it reads against the night sky.
 */
/** Copies an image to a canvas as it is, with no shrinking or outline (the character). */
export function toCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return canvas;
}

export function toSprite(image: HTMLImageElement): HTMLCanvasElement {
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return source;
  sourceCtx.drawImage(image, 0, 0);
  const { data, width: W, height: H } = sourceCtx.getImageData(0, 0, source.width, source.height);

  const opaque = (x: number, y: number) => data[(y * W + x) * 4 + 3] >= 128;

  // Crop to the visible part of the image.
  let left = W, top = H, right = -1, bottom = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!opaque(x, y)) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return source; // fully transparent image
  const cropW = right - left + 1;
  const cropH = bottom - top + 1;

  const shrink = Math.max(cropW / ICON_MAX_WIDTH, cropH / ICON_MAX_HEIGHT, 1);
  const w = Math.max(1, Math.round(cropW / shrink));
  const h = Math.max(1, Math.round(cropH / shrink));

  // One color (or nothing) per sprite pixel.
  const pixels: (string | null)[] = [];
  const step = Math.max(1, Math.floor(shrink / 6)); // sample about 6 x 6 points per block
  for (let sy = 0; sy < h; sy += 1) {
    for (let sx = 0; sx < w; sx += 1) {
      const x0 = left + Math.floor(sx * shrink);
      const y0 = top + Math.floor(sy * shrink);
      const x1 = Math.min(right + 1, left + Math.floor((sx + 1) * shrink));
      const y1 = Math.min(bottom + 1, top + Math.floor((sy + 1) * shrink));

      const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
      let solid = 0;
      let empty = 0;
      for (let y = y0; y < Math.max(y1, y0 + 1); y += step) {
        for (let x = x0; x < Math.max(x1, x0 + 1); x += step) {
          const i = (y * W + x) * 4;
          if (data[i + 3] < 128) {
            empty += 1;
            continue;
          }
          solid += 1;
          // Group near-identical colors so slight noise doesn't split a block.
          const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
          const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
          bucket.n += 1;
          bucket.r += data[i];
          bucket.g += data[i + 1];
          bucket.b += data[i + 2];
          buckets.set(key, bucket);
        }
      }

      if (empty > solid) {
        pixels.push(null);
        continue;
      }
      const ranked = [...buckets.values()].sort((a, b) => b.n - a.n);
      const dark = ranked.find(
        (bucket) =>
          bucket.n / solid >= DARK_SHARE &&
          luma(bucket.r / bucket.n, bucket.g / bucket.n, bucket.b / bucket.n) < DARK_LUMA,
      );
      const pick = dark ?? ranked[0];
      pixels.push(
        `rgb(${Math.round(pick.r / pick.n)} ${Math.round(pick.g / pick.n)} ${Math.round(pick.b / pick.n)})`,
      );
    }
  }

  // Draw it with a 1-pixel outline around the shape.
  const sprite = document.createElement("canvas");
  sprite.width = w + 2;
  sprite.height = h + 2;
  const ctx = sprite.getContext("2d");
  if (!ctx) return sprite;
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h ? pixels[y * w + x] : null;

  ctx.fillStyle = COLORS.edge;
  for (let y = -1; y <= h; y += 1) {
    for (let x = -1; x <= w; x += 1) {
      if (at(x, y)) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }
  pixels.forEach((color, index) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect((index % w) + 1, Math.floor(index / w) + 1, 1, 1);
  });
  return sprite;
}
