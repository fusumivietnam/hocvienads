import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = resolve('src/template/base.xml');
const target = resolve('dist/hocvienads.xml');

const xml = await readFile(source, 'utf8').catch(() => {
  console.error('Missing src/template/base.xml. Import the current Blogger XML baseline first.');
  process.exit(1);
});

if (!xml.includes('<b:skin>') || !xml.includes('</html>')) {
  console.error('Source does not look like a complete Blogger theme XML.');
  process.exit(1);
}

await mkdir(dirname(target), { recursive: true });
await writeFile(target, xml, 'utf8');
console.log(`Built ${target}`);
