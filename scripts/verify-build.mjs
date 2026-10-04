import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const source = 'src/template/base.xml';
const target = 'dist/hocvienads.xml';

const [sourceBuffer, targetBuffer] = await Promise.all([
  readFile(source),
  readFile(target).catch(() => {
    console.error(`Missing ${target}. Run npm run build first.`);
    process.exit(1);
  })
]);

const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const sourceHash = digest(sourceBuffer);
const targetHash = digest(targetBuffer);

if (!sourceBuffer.equals(targetBuffer)) {
  console.error('Theme integrity check failed: dist output is not byte-identical to the baseline.');
  console.error({ sourceHash, targetHash });
  process.exit(1);
}

console.log('Theme integrity check passed.');
console.log({ bytes: sourceBuffer.length, sha256: sourceHash });
