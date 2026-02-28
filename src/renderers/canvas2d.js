import { MANTRA_TEXT } from '../config.js';

// ── circles ───────────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx         foreground context
 * @param {CanvasRenderingContext2D} bgCtx       background context
 * @param {{ speed, spin, number }} layer
 * @param {number} time  performance.now()
 */
export function renderCircles(ctx, bgCtx, layer, time) {
  const { canvas } = ctx;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.4;
  const bgRadius = Math.max(canvas.width, canvas.height);

  for (let i = 0; i < 20; i++) {
    const angle = layer.spin * (i * Math.PI / 10 + time * 0.001 * layer.speed);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const size = 10 + i * 5;

    const bgGradient = bgCtx.createRadialGradient(centerX, centerY, 0, x, y, bgRadius);
    bgGradient.addColorStop(0, 'darkblue');
    bgGradient.addColorStop(1, 'black');
    bgCtx.fillStyle = bgGradient;
    bgCtx.fillRect(0, 0, bgCtx.canvas.width, bgCtx.canvas.height);

    const color = `hsl(${i * 19}, 100%, 50%)`;
    const gradient = ctx.createRadialGradient(x, y, size, x + size, y + size, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'blue');

    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

// ── lines ─────────────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ speed, spin }} layer
 * @param {number} time  performance.now()
 */
export function renderLines(ctx, layer, time) {
  const { canvas } = ctx;
  const lineCount = 30;
  const length = Math.min(canvas.width, canvas.height) * 0.4;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let i = 0; i < lineCount; i++) {
    const angle = layer.spin * (i * Math.PI / 15 + time * 0.001 * layer.speed);
    const x = centerX + length * Math.cos(angle);
    const y = centerY + length * Math.sin(angle);

    ctx.strokeStyle = `hsl(${i * 12}, 100%, 50%)`;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

// ── mantras (2D canvas fallback) ──────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ speed, spin, number }} layer
 * @param {number} time  performance.now()
 */
export function renderMantras(ctx, layer, time) {
  const { canvas } = ctx;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.4;
  const textLength = MANTRA_TEXT.length;
  const lengthFactor = Math.PI / textLength / 2;
  const speedFactor = 0.001 * layer.speed;
  const angleStep = (2 * Math.PI) / textLength;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < layer.number; i++) {
    const radiusOffset = radius - i;
    const color = `hsl(${i * 18}, 100%, 50%)`;
    const animAngle = layer.spin * (i * lengthFactor + time * speedFactor);

    ctx.font = `${Math.max(6, 18 - i)}px Arial`;

    for (let c = 0; c < textLength; c++) {
      const angle = c * angleStep * layer.speed;
      const x = centerX + radiusOffset * Math.cos(angle + animAngle);
      const y = centerY + radiusOffset * Math.sin(angle + animAngle);

      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = color;
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(MANTRA_TEXT[c], 0, 0);
      ctx.restore();
    }
  }
}
