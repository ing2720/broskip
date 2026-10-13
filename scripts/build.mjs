import { build } from 'esbuild';
import { cp, mkdir, rm, stat } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await build({
  entryPoints: ['src/content.ts'],
  outfile: 'dist/content.js',
  bundle: true,
  minify: true,
  target: 'chrome120',
  format: 'iife',
  legalComments: 'none',
});
console.log(`content.js: ${(await stat('dist/content.js')).size} bytes (no runtime dependencies)`);
