import { readFile } from 'node:fs/promises';

const file = 'src/template/base.xml';
let xml = '';
try {
  xml = await readFile(file, 'utf8');
} catch {
  console.error(`Missing ${file}`);
  process.exitCode = 1;
}

if (xml) {
  const checks = {
    xmlDeclaration: xml.startsWith('<?xml'),
    bloggerNamespace: xml.includes('http://www.google.com/2005/gml/b'),
    bloggerSkin: xml.includes('<b:skin>') && xml.includes('</b:skin>'),
    htmlClose: xml.includes('</html>')
  };

  console.log(checks);
  console.log({ bytes: Buffer.byteLength(xml), lines: xml.split('\n').length });

  if (Object.values(checks).some(value => !value)) process.exitCode = 1;
}
