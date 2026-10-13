import { build } from 'esbuild';
import { cp, mkdir, rm, stat } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await build({
  entryPoints: ['src/content.ts', 'src/popup.ts'],
  outdir: 'dist',
  bundle: true,
  minify: true,
  target: 'chrome120',
  format: 'iife',
  legalComments: 'none',
});
console.log(`content.js: ${(await stat('dist/content.js')).size} bytes (no runtime dependencies)`);
console.log(`popup.js: ${(await stat('dist/popup.js')).size} bytes (loaded only when opened)`);
