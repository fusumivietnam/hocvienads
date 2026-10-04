import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const source = resolve('src/template/base.xml');
const target = resolve('dist/hocvienads.xml');

const sourceBuffer = await readFile(source).catch(() => {
  console.error('Missing src/template/base.xml. Import the current Blogger XML baseline first.');
  process.exit(1);
});

const xml = sourceBuffer.toString('utf8');
if (!xml.includes('<b:skin>') || !xml.includes('</html>')) {
  console.error('Source does not look like a complete Blogger theme XML.');
  process.exit(1);
}

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);

const targetBuffer = await readFile(target);
if (!sourceBuffer.equals(targetBuffer)) {
  console.error('Build failed integrity check: output differs from src/template/base.xml.');
  process.exit(1);
}

const sha256 = createHash('sha256').update(sourceBuffer).digest('hex');
console.log(`Built ${target}`);
console.log(`Integrity: byte-identical (${sourceBuffer.length} bytes, sha256:${sha256})`);
