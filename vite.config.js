import { defineConfig } from 'vite';

function normalizeBasePath(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const pathname = url.pathname || '/';
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    return '';
  }
}

function githubPagesBase() {
  const repository = process.env.GITHUB_REPOSITORY || '';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return '/';
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) return '/';
  return `/${repo}/`;
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS
    ? (normalizeBasePath(process.env.VITE_PUBLIC_APP_URL) || githubPagesBase())
    : '/',
});
