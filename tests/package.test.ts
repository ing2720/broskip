// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const script = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url));
describe('Chrome Web Store package', () => {
  it('puts manifest at root, includes nested icons and excludes files outside dist', () => {
    const directory = mkdtempSync(join(tmpdir(), 'netflix-store-'));
    try {
      mkdirSync(join(directory, 'dist/icons'), { recursive: true });
      writeFileSync(join(directory, 'dist/manifest.json'), JSON.stringify({ manifest_version: 3, version: '0.1.0', icons: { '128': 'icons/icon-128.png' } }));
      writeFileSync(join(directory, 'dist/content.js'), '/* bundled code */');
      writeFileSync(join(directory, 'dist/icons/icon-128.png'), new Uint8Array([1, 2, 3]));
      writeFileSync(join(directory, 'private-token.txt'), 'must not ship');
      const run = () => execFileSync(process.execPath, [script], { cwd: directory, stdio: 'pipe' });
      run();
      const archive = join(directory, 'artifacts/netflix-supporter-0.1.0-webstore.zip');
      const first = readFileSync(archive);
      const files = unzipSync(first);
      expect(Object.keys(files).sort()).toEqual(['content.js', 'icons/icon-128.png', 'manifest.json']);
      expect(JSON.parse(strFromU8(files['manifest.json']!)).version).toBe('0.1.0');
      run();
      expect(readFileSync(archive)).toEqual(first);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it('fails without a root manifest instead of creating an invalid upload', () => {
    const directory = mkdtempSync(join(tmpdir(), 'netflix-store-'));
    try {
      mkdirSync(join(directory, 'dist'));
      expect(() => execFileSync(process.execPath, [script], { cwd: directory, stdio: 'pipe' })).toThrow();
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
