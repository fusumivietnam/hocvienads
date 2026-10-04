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

const matches = pattern => [...xml.matchAll(pattern)];
const unique = items => [...new Set(items)].sort();
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=(['"])(.*?)\\1`, 'i'))?.[2] ?? null;
const finding = (severity, code, message, details = {}) => ({ severity, code, message, ...details });

const sectionTags = matches(/<b:section\b[^>]*>/gi).map(match => match[0]);
const widgetTags = matches(/<b:widget\b[^>]*>/gi).map(match => match[0]);
const includableTags = matches(/<b:includable\b[^>]*>/gi).map(match => match[0]);
const includeTags = matches(/<b:include\b[^>]*>/gi).map(match => match[0]);
const scriptTags = matches(/<script\b[^>]*>[\s\S]*?<\/script>/gi).map(match => match[0]);
const externalScriptTags = matches(/<script\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi).map(match => match[0]);
const externalScripts = externalScriptTags.map(tag => attr(tag, 'src')).filter(Boolean);
const blockingExternalScripts = externalScriptTags
  .filter(tag => !/\b(?:async|defer)(?:\s|=|>)/i.test(tag))
  .map(tag => attr(tag, 'src'))
  .filter(Boolean);
const stylesheetTags = matches(/<link\b[^>]*\brel=(['"])stylesheet\1[^>]*>/gi).map(match => match[0]);
const stylesheetLinks = stylesheetTags.map(tag => attr(tag, 'href')).filter(Boolean);
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
const unusedIncludables = unique(includables.filter(id => !includes.includes(id)));
const unresolvedIncludes = unique(includes.filter(name => !includables.includes(name)));
const findings = [];

if (httpUrls.length) findings.push(finding('high', 'mixed-content', `${httpUrls.length} non-HTTPS URL(s) detected.`, { count: httpUrls.length }));
if (blockingExternalScripts.length) findings.push(finding('warning', 'blocking-external-scripts', `${blockingExternalScripts.length} external script(s) have no async/defer attribute.`, { count: blockingExternalScripts.length }));
if (externalHosts.length > 10) findings.push(finding('warning', 'external-host-count', `${externalHosts.length} external hosts detected; review third-party connection cost.`, { count: externalHosts.length }));
if (externalScripts.length > 10) findings.push(finding('warning', 'external-script-count', `${externalScripts.length} external script(s) detected; review dependency and loading strategy.`, { count: externalScripts.length }));
if (inlineScripts.length > 20) findings.push(finding('info', 'inline-script-count', `${inlineScripts.length} inline script block(s) detected; review execution cost and duplication.`, { count: inlineScripts.length }));
if (unusedIncludables.length) findings.push(finding('info', 'unused-includables', `${unusedIncludables.length} includable(s) are not referenced by b:include.`, { count: unusedIncludables.length }));
if (unresolvedIncludes.length) findings.push(finding('warning', 'unresolved-includes', `${unresolvedIncludes.length} b:include name(s) do not match a discovered b:includable id.`, { count: unresolvedIncludes.length }));

const severityOrder = { high: 0, warning: 1, info: 2 };
findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.code.localeCompare(b.code));
const severityCounts = findings.reduce((acc, item) => {
  acc[item.severity] += 1;
  return acc;
}, { high: 0, warning: 0, info: 0 });

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'read-only',
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
    blockingExternalScripts: blockingExternalScripts.length,
    inlineStyleBlocks: inlineStyleBlocks.length,
    externalStylesheets: stylesheetLinks.length,
    externalHosts: externalHosts.length,
    nonHttpsUrls: httpUrls.length
  },
  quality: {
    findingCount: findings.length,
    severityCounts,
    unusedIncludables: unusedIncludables.length,
    unresolvedIncludes: unresolvedIncludes.length
  },
  sections,
  widgets,
  widgetTypes,
  includables: unique(includables),
  includes: unique(includes),
  resources: {
    externalScripts: unique(externalScripts),
    blockingExternalScripts: unique(blockingExternalScripts),
    externalStylesheets: unique(stylesheetLinks),
    externalHosts,
    nonHttpsUrls: httpUrls
  },
  relationships: {
    unusedIncludables,
    unresolvedIncludes
  },
  findings
};

const tableRows = Object.entries(widgetTypes)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([type, count]) => `| ${type} | ${count} |`)
  .join('\n');

const findingRows = findings.length
  ? findings.map(item => `| ${item.severity.toUpperCase()} | \`${item.code}\` | ${item.message.replaceAll('|', '\\|')} |`).join('\n')
  : '| - | - | No findings |';

const markdown = `# Blogger Theme Audit\n\n` +
  `> Read-only report. This audit never rewrites or restructures the Blogger theme.\n\n` +
  `Source: \`${source}\`  \n` +
  `SHA-256: \`${report.sha256}\`  \n` +
  `Size: ${report.bytes} bytes / ${report.lines} lines\n\n` +
  `## Quality summary\n\n` +
  `- High: ${severityCounts.high}\n` +
  `- Warning: ${severityCounts.warning}\n` +
  `- Info: ${severityCounts.info}\n` +
  `- Total findings: ${findings.length}\n\n` +
  `| Severity | Code | Finding |\n| --- | --- | --- |\n${findingRows}\n\n` +
  `## Inventory\n\n` +
  `- Sections: ${report.inventory.sections}\n` +
  `- Widgets: ${report.inventory.widgets}\n` +
  `- Includables: ${report.inventory.includables}\n` +
  `- Includes: ${report.inventory.includes}\n` +
  `- Script blocks: ${report.inventory.scriptBlocks} (${report.inventory.inlineScripts} inline, ${report.inventory.externalScripts} external)\n` +
  `- Blocking external scripts: ${report.inventory.blockingExternalScripts}\n` +
  `- Inline style blocks: ${report.inventory.inlineStyleBlocks}\n` +
  `- External stylesheets: ${report.inventory.externalStylesheets}\n` +
  `- External hosts: ${report.inventory.externalHosts}\n` +
  `- Non-HTTPS URLs: ${report.inventory.nonHttpsUrls}\n\n` +
  `## Widget types\n\n| Type | Count |\n| --- | ---: |\n${tableRows || '| (none) | 0 |'}\n`;

await mkdir(reportDir, { recursive: true });
await Promise.all([
  writeFile(jsonReport, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  writeFile(markdownReport, markdown, 'utf8')
]);

console.log(`Theme audit written to ${jsonReport} and ${markdownReport}`);
console.log({ inventory: report.inventory, quality: report.quality });
