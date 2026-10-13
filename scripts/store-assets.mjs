import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile } from 'node:fs/promises';

const mark = '<rect x="16" y="16" width="96" height="96" rx="27" fill="#f04452"/><path d="m41 44 20 20-20 20m26-40 20 20-20 20" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${mark}</svg>`;
await mkdir('public/icons', { recursive: true });
await mkdir('store', { recursive: true });
await writeFile('store/icon.svg', icon);
for (const size of [16, 32, 48, 128]) {
  await writeFile(`public/icons/icon-${size}.png`, new Resvg(icon, { fitTo: { mode: 'width', value: size } }).render().asPng());
}
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
<rect width="440" height="280" fill="#17171d"/>
<circle cx="352" cy="38" r="142" fill="#22222b"/>
<circle cx="20" cy="260" r="155" fill="#201b24"/>
<rect x="33" y="31" width="374" height="218" rx="21" fill="#26262f" stroke="#44444f"/>
<rect x="52" y="50" width="336" height="153" rx="12" fill="#16161d"/>
<g transform="translate(143 62) scale(1.2)">${mark}</g>
<rect x="55" y="220" width="300" height="4" rx="2" fill="#51515e"/>
<rect x="55" y="220" width="158" height="4" rx="2" fill="#f04452"/>
<circle cx="213" cy="222" r="6" fill="#fff"/>
</svg>`;
await writeFile('store/promo.svg', tile);
await writeFile('store/promo-440x280.png', new Resvg(tile).render().asPng());
console.log('Generated original skip-control icons and 440×280 store tile.');
