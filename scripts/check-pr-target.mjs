import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validatePullRequest(pr) {
  const head = pr.head.ref;
  const base = pr.base.ref;
  if (base === 'dev' && /^(feat|fix)\/[a-z0-9][a-z0-9-]*$/.test(head)) return;
  if (base === 'main' && head === 'dev' &&
      pr.head.repo?.full_name && pr.head.repo.full_name === pr.base.repo?.full_name) return;
  throw new Error(`Invalid PR route: ${head} → ${base}. Use feat/* or fix/* → dev, then dev → main.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (!event.pull_request) throw new Error('Expected a pull_request event.');
  validatePullRequest(event.pull_request);
  console.log('PR branch route is valid.');
}
