import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

if (path.dirname(DIST) !== ROOT) {
  throw new Error('Refusing to build outside the project root.');
}

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

const entries = ['index.html', 'src', 'LICENSE'];

for (const entry of entries) {
  await fs.cp(path.join(ROOT, entry), path.join(DIST, entry), { recursive: true });
}

console.log(`Built static site into ${path.relative(ROOT, DIST)}`);
