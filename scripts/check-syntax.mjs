import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts', 'test'];
const files = ['vite.config.js', 'hardhat.config.cjs'];

for (const root of roots) {
  for (const name of fs.readdirSync(root)) {
    const full = path.join(root, name);
    if (fs.statSync(full).isFile() && /\.(js|mjs|cjs)$/.test(name)) files.push(full);
  }
}

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `Syntax check failed: ${file}\n`);
    process.exit(result.status || 1);
  }
  console.log(`OK: ${file}`);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
