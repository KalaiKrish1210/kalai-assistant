const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const header = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([header, data])));
  return Buffer.concat([length, header, data, crc]);
}

function putPixel(raw, x, y, r, g, b, a) {
  const index = y * (1 + SIZE * 4) + 1 + x * 4;
  raw[index] = r;
  raw[index + 1] = g;
  raw[index + 2] = b;
  raw[index + 3] = a;
}

function inRoundedRect(x, y, radius) {
  const inner = SIZE - 1;
  const cx = x < radius ? radius : x > inner - radius ? inner - radius : x;
  const cy = y < radius ? radius : y > inner - radius ? inner - radius : y;
  if (cx === x && cy === y) {
    return true;
  }
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function nearArc(x, y) {
  const x0 = 144;
  const y0 = 340;
  const x1 = 194;
  const y1 = 252;
  const x2 = 368;
  const y2 = 148;
  let min = Infinity;
  for (let t = 0; t <= 1; t += 0.01) {
    const mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const py = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    const dx = x - px;
    const dy = y - py;
    min = Math.min(min, dx * dx + dy * dy);
  }
  return min <= 18 * 18;
}

function buildPng() {
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (1 + SIZE * 4)] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      if (!inRoundedRect(x, y, 96)) {
        putPixel(raw, x, y, 0, 0, 0, 0);
        continue;
      }
      const dx = x - 192;
      const dy = y - 192;
      if (dx * dx + dy * dy <= 40 * 40) {
        putPixel(raw, x, y, 243, 234, 223, 255);
      } else if (nearArc(x, y)) {
        putPixel(raw, x, y, 224, 164, 90, 255);
      } else {
        putPixel(raw, x, y, 20, 17, 14, 255);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), buildPng());
