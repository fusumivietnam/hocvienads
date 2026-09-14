import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const source = resolve('src/template/base.xml');
const cssDir = resolve('src/css');
const target = resolve('dist/hocvienads.xml');

const xml = await readFile(source, 'utf8').catch(() => {
  console.error('Missing src/template/base.xml. Import the current Blogger XML baseline first.');
  process.exit(1);
});

if (!xml.includes('<b:skin><![CDATA[') || !xml.includes(']]></b:skin>') || !xml.includes('</html>')) {
  console.error('Source does not look like a complete Blogger theme XML.');
  process.exit(1);
}

const cssFiles = await readdir(cssDir).catch(() => []);
const orderedCssFiles = cssFiles.filter((name) => name.endsWith('.css')).sort();
const cssModules = [];

for (const file of orderedCssFiles) {
  const content = await readFile(join(cssDir, file), 'utf8');
  cssModules.push(`/* HVA MODULE: ${file} */\n${content.trim()}`);
}

const injection = cssModules.length
  ? `\n\n/* ===== HVA V3 BUILD MODULES ===== */\n${cssModules.join('\n\n')}\n/* ===== END HVA V3 BUILD MODULES ===== */\n`
  : '';

const output = xml.replace(']]></b:skin>', `${injection}]]></b:skin>`);

await mkdir(dirname(target), { recursive: true });
await writeFile(target, output, 'utf8');
console.log(`Built ${target} with ${orderedCssFiles.length} CSS module(s)`);
