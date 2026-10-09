import fs from 'node:fs';
import path from 'node:path';

function normalizeBase(value) {
  const url = new URL(value);
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  const localHttp = url.protocol === 'http:' && localHosts.has(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('PUBLIC_APP_URL must use https (HTTP is allowed only for local preview hosts).');
  }
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

function deriveGitHubPagesUrl() {
  const repository = process.env.GITHUB_REPOSITORY || '';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return '';
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io/`;
  }
  return `https://${owner}.github.io/${repo}/`;
}

const configured = process.env.VITE_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || '';
const derived = deriveGitHubPagesUrl();
const base = normalizeBase(configured || derived || 'http://localhost:4173/');
const metadataDir = path.resolve('dist/metadata');

if (!fs.existsSync(metadataDir)) {
  throw new Error('dist/metadata does not exist. Run Vite build before finalizing metadata.');
}

for (let i = 1; i <= 12; i += 1) {
  const file = path.join(metadataDir, `${i}.json`);
  const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
  metadata.image = new URL(`nft/${i}.png`, base).href;
  metadata.external_url = base;
  fs.writeFileSync(file, `${JSON.stringify(metadata, null, 2)}\n`);
}

console.log(`Finalized 12 metadata files for ${base}`);
