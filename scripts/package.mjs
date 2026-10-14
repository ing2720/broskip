import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync } from 'fflate';

export async function createStoreArchive(directory) {
  const root = resolve(directory);
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  const files = {};
  async function collect(relative = '') {
    const entries = await readdir(join(root, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await collect(name);
      else if (entry.isFile()) files[name] = [new Uint8Array(await readFile(join(root, name))), { mtime: new Date('2026-01-01T00:00:00Z') }];
      else throw new Error(`Unsupported package entry: ${name}`);
    }
  }
  await collect();
  return { bytes: zipSync(files, { level: 9 }), version: manifest.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { bytes, version } = await createStoreArchive('dist');
  const filename = `broskip-${version}-webstore.zip`;
  await mkdir('artifacts', { recursive: true });
  await writeFile(`artifacts/${filename}`, bytes);
  await writeFile('artifacts/SHA256SUMS', `${createHash('sha256').update(bytes).digest('hex')}  ${filename}\n`);
  console.log(`artifacts/${filename}: ${bytes.length} bytes (manifest.json at ZIP root)`);
}
