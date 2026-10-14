// Reproducible vector-style CUT marks for native icons and the web favicon.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const output = path.join(__dirname, "..", "assets", "brand");
fs.mkdirSync(output, { recursive: true });
const green = [128, 217, 160, 255];
const ink = [20, 23, 22, 255];
const white = [241, 242, 233, 255];
function mark(size, transparent = false, monochrome = false) {
  const png = new PNG({ width: size, height: size });
  const inside = (x, y, left, top, width, height) =>
    x >= left && x < left + width && y >= top && y < top + height;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const a = -0.065;
      const dx = ((px + 0.5) * 1024) / size - 512;
      const dy = ((py + 0.5) * 1024) / size - 512;
      const x = dx * Math.cos(a) - dy * Math.sin(a) + 512;
      const y = dx * Math.sin(a) + dy * Math.cos(a) + 512;
      let color = transparent ? [0, 0, 0, 0] : ink;
      if (inside(x, y, 160, 235, 704, 554)) color = white;
      if (inside(x, y, 170, 245, 684, 534)) color = green;
      const c =
        inside(x, y, 230, 337, 152, 350) && !inside(x, y, 285, 395, 105, 234);
      const u =
        inside(x, y, 422, 337, 152, 350) && !inside(x, y, 477, 330, 42, 299);
      const t =
        inside(x, y, 614, 337, 180, 58) || inside(x, y, 675, 390, 58, 297);
      if (c || u || t) color = ink;
      if (monochrome) color = c || u || t ? [0, 0, 0, 255] : [0, 0, 0, 0];
      const index = (py * size + px) * 4;
      for (let channel = 0; channel < 4; channel++)
        png.data[index + channel] = color[channel];
    }
  }
  return PNG.sync.write(png);
}
fs.writeFileSync(path.join(output, "icon.png"), mark(1024));
fs.writeFileSync(path.join(output, "adaptive.png"), mark(1024, true));
fs.writeFileSync(path.join(output, "monochrome.png"), mark(1024, true, true));
fs.writeFileSync(path.join(output, "favicon.png"), mark(64));
console.log("CUT brand assets generated.");
