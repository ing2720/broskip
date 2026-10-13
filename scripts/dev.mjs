import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve('artifacts/demo');
await mkdir(root, { recursive: true });
await cp('demo/index.html', `${root}/index.html`);
await cp('demo/demo.css', `${root}/demo.css`);
await cp('public/popup.css', `${root}/popup.css`);
await writeFile(`${root}/popup.html`, (await readFile('public/popup.html', 'utf8')).replace('src="popup.js"', 'src="demo-popup.js"'));
await build({ entryPoints: { demo: 'demo/demo.ts', 'demo-popup': 'demo/popup.ts' }, outdir: root, bundle: true, format: 'iife', target: 'chrome120' });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!file.startsWith(`${root}${sep}`)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Synthetic demo: http://127.0.0.1:4173 (not Netflix)'));
