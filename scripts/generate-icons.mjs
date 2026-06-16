import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

const svg = readFileSync('assets/icon.svg', 'utf-8');

for (const size of [16, 32, 48, 96, 128]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  writeFileSync(`public/icon/${size}.png`, resvg.render().asPng());
  console.log(`  ${size}x${size}  →  public/icon/${size}.png`);
}
