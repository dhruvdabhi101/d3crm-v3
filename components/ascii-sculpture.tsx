const columns = 112;
const rows = 68;
const palette = ["#dbb298", "#cf9570", "#c8794a", "#a94e25", "#833b20"];

function createSculpture() {
  const depth = new Float64Array(columns * rows).fill(-Infinity);
  const light = new Float64Array(columns * rows).fill(-1);
  const tilt = 0.78;
  const turn = -0.42;

  for (let u = 0; u < Math.PI * 2; u += 0.018) {
    for (let v = 0; v < Math.PI * 2; v += 0.025) {
      const radius = 1.65 + 0.72 * Math.cos(v);
      const x = radius * Math.cos(u);
      const y = radius * Math.sin(u);
      const z = 0.72 * Math.sin(v);
      const tiltedY = y * Math.cos(tilt) - z * Math.sin(tilt);
      const tiltedZ = y * Math.sin(tilt) + z * Math.cos(tilt);
      const rotatedX = x * Math.cos(turn) - tiltedY * Math.sin(turn);
      const rotatedY = x * Math.sin(turn) + tiltedY * Math.cos(turn);
      const column = Math.round(columns / 2 + rotatedX * 21);
      const row = Math.round(rows / 2 + rotatedY * 14);
      if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
      const index = row * columns + column;
      if (tiltedZ <= depth[index]) continue;
      depth[index] = tiltedZ;
      const nx = Math.cos(v) * Math.cos(u);
      const ny = Math.cos(v) * Math.sin(u);
      const nz = Math.sin(v);
      const normalY = ny * Math.cos(tilt) - nz * Math.sin(tilt);
      const normalZ = ny * Math.sin(tilt) + nz * Math.cos(tilt);
      const normalX = nx * Math.cos(turn) - normalY * Math.sin(turn);
      light[index] = Math.max(0, Math.min(1, 0.45 + (-normalX * 0.45 - normalY * 0.3 + normalZ * 0.7) * 0.55));
    }
  }

  const characters = ".,:;+*?%#@";
  return Array.from({ length: rows }, (_, row) => palette.map((color, shade) => {
    const line = Array.from({ length: columns }, (_, column) => {
      const brightness = light[row * columns + column];
      if (brightness < 0 || Math.min(4, Math.floor((1 - brightness) * 5)) !== shade) return " ";
      return characters[Math.min(characters.length - 1, Math.floor((1 - brightness) * characters.length))];
    }).join("");
    return line.trim() ? <text key={`${row}-${shade}`} x="0" y={row * 8.7 + 12} fill={color} xmlSpace="preserve">{line}</text> : null;
  }));
}

const sculpture = createSculpture();

export function AsciiSculpture() {
  return <div className="ascii-art" aria-hidden="true">
    <div className="ascii-art-label"><span>FIG. 01</span><span>CONNECTED BY DESIGN</span><span>+</span></div>
    <svg className="ascii-sculpture" viewBox="0 0 672 604" fill="none" focusable="false">
      <g fontFamily="monospace" fontSize="10" style={{ whiteSpace: "pre" }}>{sculpture}</g>
    </svg>
    <div className="ascii-art-label ascii-art-bottom"><span>+ EVERY CONNECTION COUNTS</span><span>FORM → FOLLOW-THROUGH</span></div>
  </div>;
}
