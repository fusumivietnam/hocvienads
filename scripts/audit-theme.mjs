import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const source = 'src/template/base.xml';
const reportDir = 'reports';
const jsonReport = `${reportDir}/theme-audit.json`;
const markdownReport = `${reportDir}/theme-audit.md`;

const xml = await readFile(source, 'utf8').catch(() => {
  console.error(`Missing ${source}`);
  process.exit(1);
});

const matches = (pattern) => [...xml.matchAll(pattern)];
const unique = (items) => [...new Set(items)].sort();
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=(['"])(.*?)\\1`, 'i'))?.[2] ?? null;

const sectionTags = matches(/<b:section\b[^>]*>/gi).map(match => match[0]);
const widgetTags = matches(/<b:widget\b[^>]*>/gi).map(match => match[0]);
const includableTags = matches(/<b:includable\b[^>]*>/gi).map(match => match[0]);
const includeTags = matches(/<b:include\b[^>]*>/gi).map(match => match[0]);
const scriptTags = matches(/<script\b[^>]*>[\s\S]*?<\/script>/gi).map(match => match[0]);
const externalScripts = matches(/<script\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi).map(match => match[2]);
const stylesheetLinks = matches(/<link\b[^>]*\brel=(['"])stylesheet\1[^>]*>/gi)
  .map(match => attr(match[0], 'href'))
  .filter(Boolean);
const inlineStyleBlocks = matches(/<style\b[^>]*>[\s\S]*?<\/style>/gi);
const httpUrls = unique(matches(/http:\/\/[^\s'"<>]+/gi).map(match => match[0]));
const externalUrls = matches(/https?:\/\/[^\s'"<>]+/gi).map(match => match[0]);
const externalHosts = unique(externalUrls.flatMap(url => {
  try {
    return [new URL(url.replace(/&amp;/g, '&')).hostname];
  } catch {
    return [];
  }
}));

const sections = sectionTags.map(tag => ({
  id: attr(tag, 'id'),
  class: attr(tag, 'class'),
  maxwidgets: attr(tag, 'maxwidgets'),
  showaddelement: attr(tag, 'showaddelement')
}));

const widgets = widgetTags.map(tag => ({
  id: attr(tag, 'id'),
  type: attr(tag, 'type'),
  title: attr(tag, 'title'),
  locked: attr(tag, 'locked'),
  visible: attr(tag, 'visible')
}));

const includables = includableTags.map(tag => attr(tag, 'id')).filter(Boolean);
const includes = includeTags.map(tag => attr(tag, 'name')).filter(Boolean);
const widgetTypes = widgets.reduce((acc, widget) => {
  const type = widget.type ?? '(unknown)';
  acc[type] = (acc[type] ?? 0) + 1;
  return acc;
}, {});

const inlineScripts = scriptTags.filter(tag => !/\bsrc=(['"])/i.test(tag));
const warnings = [];
if (httpUrls.length) warnings.push(`${httpUrls.length} non-HTTPS URL(s) detected.`);
if (externalHosts.length > 10) warnings.push(`${externalHosts.length} external hosts detected; review third-party dependency cost.`);
if (externalScripts.length > 10) warnings.push(`${externalScripts.length} external script(s) detected; review loading strategy.`);
if (inlineScripts.length > 20) warnings.push(`${inlineScripts.length} inline script block(s) detected; review execution cost and duplication.`);

const report = {
  generatedAt: new Date().toISOString(),
  source,
  sha256: createHash('sha256').update(xml).digest('hex'),
  bytes: Buffer.byteLength(xml),
  lines: xml.split('\n').length,
  inventory: {
    sections: sections.length,
    widgets: widgets.length,
    includables: includables.length,
    includes: includes.length,
    scriptBlocks: scriptTags.length,
    inlineScripts: inlineScripts.length,
    externalScripts: externalScripts.length,
    inlineStyleBlocks: inlineStyleBlocks.length,
    externalStylesheets: stylesheetLinks.length,
    externalHosts: externalHosts.length,
    nonHttpsUrls: httpUrls.length
  },
  sections,
  widgets,
  widgetTypes,
  includables: unique(includables),
  includes: unique(includes),
  resources: {
    externalScripts: unique(externalScripts),
    externalStylesheets: unique(stylesheetLinks),
    externalHosts,
    nonHttpsUrls: httpUrls
  },
  warnings
};

const tableRows = Object.entries(widgetTypes)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([type, count]) => `| ${type} | ${count} |`)
  .join('\n');

const markdown = `# Blogger Theme Audit\n\n` +
  `Source: \`${source}\`  \n` +
  `SHA-256: \`${report.sha256}\`  \n` +
  `Size: ${report.bytes} bytes / ${report.lines} lines\n\n` +
  `## Inventory\n\n` +
  `- Sections: ${report.inventory.sections}\n` +
  `- Widgets: ${report.inventory.widgets}\n` +
  `- Includables: ${report.inventory.includables}\n` +
  `- Includes: ${report.inventory.includes}\n` +
  `- Script blocks: ${report.inventory.scriptBlocks} (${report.inventory.inlineScripts} inline, ${report.inventory.externalScripts} external)\n` +
  `- Inline style blocks: ${report.inventory.inlineStyleBlocks}\n` +
  `- External stylesheets: ${report.inventory.externalStylesheets}\n` +
  `- External hosts: ${report.inventory.externalHosts}\n` +
  `- Non-HTTPS URLs: ${report.inventory.nonHttpsUrls}\n\n` +
  `## Widget types\n\n| Type | Count |\n| --- | ---: |\n${tableRows || '| (none) | 0 |'}\n\n` +
  `## Warnings\n\n${warnings.length ? warnings.map(item => `- ${item}`).join('\n') : '- None'}\n\n` +
  `> Audit is read-only and informational. It does not rewrite or restructure the Blogger theme.\n`;

await mkdir(reportDir, { recursive: true });
await Promise.all([
  writeFile(jsonReport, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  writeFile(markdownReport, markdown, 'utf8')
]);

console.log(`Theme audit written to ${jsonReport} and ${markdownReport}`);
console.log(report.inventory);
if (warnings.length) console.warn({ warnings });
