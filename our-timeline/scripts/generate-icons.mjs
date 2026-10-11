// Frozen CPU rendering of the modified Paper mesh gradient used by AnimatedBackground.
// Adapted from @paper-design/shaders (Apache-2.0); see LICENSE-paper-shaders.txt.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { openSync } from "fontkit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const size = 1024;
const pixels = Buffer.alloc(size * size * 3);
const fract = (v) => v - Math.floor(v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
function hash(x, y) {
  x = fract(x * 0.3183099) + 0.1;
  y = fract(y * 0.3678794) + 0.1;
  const dot = x * (x + 19.19) + y * (y + 19.19);
  return fract((x + dot) * (y + dot));
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), smooth(fract(x))),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), smooth(fract(x))), smooth(fract(y)));
}
const rotate = (x, y, a) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
const time = 20.75; // Shader's original first-frame offset.
const colors = [[244, 122, 31], [158, 219, 69]];
const positions = colors.map((_, i) => [
  0.5 + 0.5 * Math.sin(time * (0.6 + fract(i / 3) * 0.9) + i * 0.37),
  0.5 + 0.5 * Math.cos(time * (0.8 + fract((i + 1) / 4)) + i * 0.37 * 1.5),
]);
for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
  let x = px / size, y = 1 - py / size;
  const gx = x * 1000, gy = y * 1000;
  const grain = 0.06 * (noise(gx, gy) - 0.5);
  const radius = smooth(Math.hypot(x - 0.5, y - 0.5));
  for (let i = 1; i <= 2; i++) {
    x += 0.75 * (1 - radius) / i * Math.sin(time + i * 0.4 * smooth(y)) * Math.cos(0.2 * time + i * 2.4 * smooth(y));
    y += 0.75 * (1 - radius) / i * Math.cos(time + i * 2 * smooth(x));
  }
  [x, y] = rotate(x - 0.5, y - 0.5, -1.2 * radius);
  x += 0.5; y += 0.5;
  const weights = positions.map(([cx, cy]) => 1 / (Math.hypot(x - cx - grain, y - cy - grain) ** 6 + 1e-4));
  const total = weights[0] + weights[1];
  const luminance = 0.94 + 0.035 * (1 - Math.max(...weights) / total);
  const [nx, ny] = rotate(gx, gy, 1), [mx, my] = rotate(gx, gy, 2);
  const overlay = mix(noise(nx + 3, ny + 3), noise(mx - 1, my - 1), 0.5) ** 1.3 * 2 - 1;
  const strength = 0.35 * (0.01 * Math.abs(overlay)) ** 0.8;
  for (let c = 0; c < 3; c++) pixels[(py * size + px) * 3 + c] = Math.round(mix(
    (colors[0][c] * weights[0] + colors[1][c] * weights[1]) / total * luminance,
    overlay >= 0 ? 255 : 0, strength));
}

const font = openSync(path.join(root, "public/fonts/Caveat-Latin.woff2"));
const run = font.layout("S & K");
const bounds = run.glyphs.map((glyph) => glyph.bbox);
let advance = 0;
const paths = run.glyphs.map((glyph, i) => {
  const pos = run.positions[i];
  const result = `<path transform="translate(${advance + pos.xOffset},${-pos.yOffset}) scale(1,-1)" d="${glyph.path.toSVG()}"/>`;
  advance += pos.xAdvance;
  return result;
}).join("");
const scale = 640 / advance;
const top = Math.max(...bounds.map((box) => box.maxY));
const bottom = Math.min(...bounds.map((box) => box.minY));
const baseline = size / 2 + (top + bottom) * scale / 2;
const lettering = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs><filter id="shadow" x="-40%" y="-60%" width="180%" height="220%">
    <feDropShadow dx="0" dy="5" stdDeviation="2" flood-color="#261a16" flood-opacity=".8"/>
    <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#261a16" flood-opacity=".6"/>
  </filter></defs>
  <g fill="#fffaf2" stroke="#fffaf2" stroke-width="10" stroke-linejoin="round" filter="url(#shadow)" transform="translate(${(size - advance * scale) / 2},${baseline}) scale(${scale})">${paths}</g>
</svg>`;
const master = await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
  .composite([{ input: Buffer.from(lettering) }]).png().toBuffer();
const icons = path.join(root, "public/icons");
await fs.writeFile(path.join(icons, "icon-master.png"), master);
for (const [name, dimension] of [["icon-192x192.png", 192], ["icon-512x512.png", 512],
  ["icon-maskable-512x512.png", 512], ["apple-touch-icon.png", 180]]) {
  await sharp(master).resize(dimension).png().toFile(path.join(icons, name));
}
const frames = await Promise.all([32, 48, 64].map((dimension) => sharp(master).resize(dimension).png().toBuffer()));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const entry = 6 + i * 16;
  header[entry] = header[entry + 1] = [32, 48, 64][i];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
const ico = Buffer.concat([header, ...frames]);
await fs.writeFile(path.join(root, "public/favicon.ico"), ico);
await fs.writeFile(path.join(root, "src/app/favicon.ico"), ico);
console.log("Generated app icons with the timeline gradient and Caveat lettering.");
