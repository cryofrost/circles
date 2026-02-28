/**
 * Measures the bounding box of a single character with the given font.
 * Returns [width, height].
 */
export function measureTextSizes(char, font) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const m = ctx.measureText(char);
  const height = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || 1;
  return [m.width, height];
}

/**
 * Renders each character of `text` into its own canvas element.
 * Returns an array of canvases, one per character.
 */
export function renderLetters(text, size) {
  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d');
  const font = `${size}px Arial`;

  return Array.from(text).map(char => {
    const [w, h] = measureTextSizes(char, font);
    scratch.width = w;
    scratch.height = h;
    scratchCtx.clearRect(0, 0, w, h);
    scratchCtx.font = font;
    scratchCtx.fillStyle = '#ffffff';
    scratchCtx.fillText(char, 0, h);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d').drawImage(scratch, 0, 0);
    return out;
  });
}
