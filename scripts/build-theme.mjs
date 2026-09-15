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

const replaceRequired = (input, search, replacement, label) => {
  if (!input.includes(search)) {
    console.error(`Build transform failed: ${label}`);
    process.exit(1);
  }
  return input.replace(search, replacement);
};

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

let output = xml.replace(']]></b:skin>', `${injection}]]></b:skin>`);

const staticOgType = "<meta content='website' property='og:type'/>";
const socialMeta = `<b:if cond='data:view.isPost'>\n<meta content='article' property='og:type'/>\n<b:else/>\n<meta content='website' property='og:type'/>\n</b:if>\n<b:if cond='data:blog.postImageUrl'>\n<meta expr:content='data:blog.postImageUrl' property='og:image'/>\n<meta expr:content='data:blog.postImageUrl' name='twitter:image'/>\n</b:if>`;
output = replaceRequired(output, staticOgType, socialMeta, 'social metadata anchor');

const analyticsInclude = "<b:include data='blog' name='google-analytics'/>";
const siteStructuredData = `<b:if cond='data:view.isHomepage'>\n<b:tag name='script' type='application/ld+json'>\n{\n  &quot;@context&quot;: &quot;https://schema.org&quot;,\n  &quot;@graph&quot;: [\n    {\n      &quot;@type&quot;: &quot;Organization&quot;,\n      &quot;@id&quot;: &quot;<data:blog.homepageUrl.jsonEscaped/>#organization&quot;,\n      &quot;name&quot;: &quot;<data:blog.title.jsonEscaped/>&quot;,\n      &quot;url&quot;: &quot;<data:blog.homepageUrl.jsonEscaped/>&quot;\n    },\n    {\n      &quot;@type&quot;: &quot;WebSite&quot;,\n      &quot;@id&quot;: &quot;<data:blog.homepageUrl.jsonEscaped/>#website&quot;,\n      &quot;url&quot;: &quot;<data:blog.homepageUrl.jsonEscaped/>&quot;,\n      &quot;name&quot;: &quot;<data:blog.title.jsonEscaped/>&quot;,\n      &quot;publisher&quot;: { &quot;@id&quot;: &quot;<data:blog.homepageUrl.jsonEscaped/>#organization&quot; }\n    }\n  ]\n}\n</b:tag>\n</b:if>\n\n${analyticsInclude}`;
output = replaceRequired(output, analyticsInclude, siteStructuredData, 'site structured data anchor');

const relatedImage = `class=\"post-thumb lazy\" alt=\"'+w+'\" src=\"'+r+'\"`;
const optimizedRelatedImage = `class=\"post-thumb lazy\" alt=\"'+w+'\" loading=\"lazy\" decoding=\"async\" src=\"'+r+'\"`;
if (!output.includes(relatedImage)) {
  console.error('Build transform failed: related-post image anchor');
  process.exit(1);
}
output = output.split(relatedImage).join(optimizedRelatedImage);

const homeCountDocumentWrite = `document.write('<script src=\"'+home_page+'feeds/posts/summary?max-results=1&alt=json-in-script&callback=totalcountdata\"><\\/script>')`;
const homeCountLoader = `(function(){var s=document.createElement(\"script\");s.src=home_page+\"feeds/posts/summary?max-results=1&alt=json-in-script&callback=totalcountdata\";document.head.appendChild(s)})()`;
output = replaceRequired(output, homeCountDocumentWrite, homeCountLoader, 'home pagination JSONP loader');

const labelCountDocumentWrite = `document.write('<script src=\"'+home_page+\"feeds/posts/summary/-/\"+postLabel+'?alt=json-in-script&callback=totalcountdata&max-results=1\" ><\\/script>')`;
const labelCountLoader = `(function(){var s=document.createElement(\"script\");s.src=home_page+\"feeds/posts/summary/-/\"+postLabel+\"?alt=json-in-script&callback=totalcountdata&max-results=1\";document.head.appendChild(s)})()`;
output = replaceRequired(output, labelCountDocumentWrite, labelCountLoader, 'label pagination JSONP loader');

const outputChecks = {
  conditionalOgType: output.includes("<meta content='article' property='og:type'/>") && output.includes("<meta content='website' property='og:type'/>") ,
  socialImage: output.includes("property='og:image'") && output.includes("name='twitter:image'"),
  siteStructuredData: output.includes('&quot;@type&quot;: &quot;WebSite&quot;') && output.includes('&quot;@type&quot;: &quot;Organization&quot;') && output.includes("cond='data:view.isHomepage'"),
  relatedImageLoading: output.includes('loading="lazy" decoding="async"'),
  paginationWithoutDocumentWrite: !output.includes(homeCountDocumentWrite) && !output.includes(labelCountDocumentWrite)
};

if (Object.values(outputChecks).some((value) => !value)) {
  console.error('Built output failed P1 checks', outputChecks);
  process.exit(1);
}

await mkdir(dirname(target), { recursive: true });
await writeFile(target, output, 'utf8');
console.log(`Built ${target} with ${orderedCssFiles.length} CSS module(s)`, outputChecks);
