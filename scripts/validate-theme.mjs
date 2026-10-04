import { readFile } from 'node:fs/promises';

const file = 'src/template/base.xml';

const xml = await readFile(file, 'utf8').catch(() => {
  console.error(`Missing ${file}`);
  process.exit(1);
});

const countMatches = (pattern) => [...xml.matchAll(pattern)].length;

const collectIds = (tagName) => {
  const ids = [];
  const pattern = new RegExp(`<${tagName}\\b[^>]*\\bid=(['"])(.*?)\\1`, 'g');
  for (const match of xml.matchAll(pattern)) ids.push(match[2]);
  return ids;
};

const duplicates = (values) => {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
};

const sectionIds = collectIds('b:section');
const widgetIds = collectIds('b:widget');
const duplicateSectionIds = duplicates(sectionIds);
const duplicateWidgetIds = duplicates(widgetIds);

const checks = {
  xmlDeclaration: /^<\?xml\s/.test(xml),
  htmlRoot: /<html\b/i.test(xml) && /<\/html>\s*$/.test(xml),
  bloggerNamespace: /xmlns:b=(['"])http:\/\/www\.google\.com\/2005\/gml\/b\1/.test(xml),
  bloggerSkin: countMatches(/<b:skin\b/g) === 1 && countMatches(/<\/b:skin>/g) === 1,
  bloggerSections: sectionIds.length > 0,
  bloggerWidgets: widgetIds.length > 0,
  uniqueSectionIds: duplicateSectionIds.length === 0,
  uniqueWidgetIds: duplicateWidgetIds.length === 0
};

console.log('Blogger theme validation');
console.table(checks);
console.log({
  bytes: Buffer.byteLength(xml),
  lines: xml.split('\n').length,
  sections: sectionIds.length,
  widgets: widgetIds.length
});

if (duplicateSectionIds.length) {
  console.error('Duplicate b:section ids:', duplicateSectionIds);
}

if (duplicateWidgetIds.length) {
  console.error('Duplicate b:widget ids:', duplicateWidgetIds);
}

const failed = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

if (failed.length) {
  console.error('Theme validation failed:', failed.join(', '));
  process.exit(1);
}

console.log('Theme validation passed. No theme content was modified.');
