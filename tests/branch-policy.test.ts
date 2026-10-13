// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-pr-target.mjs', import.meta.url));
function check(head: string, base: string, fork = false) {
  const directory = mkdtempSync(join(tmpdir(), 'netflix-pr-route-'));
  try {
    const event = join(directory, 'event.json');
    writeFileSync(event, JSON.stringify({ pull_request: {
      head: { ref: head, repo: { full_name: fork ? 'contributor/netflix-supporter' : 'ing2720/netflix-supporter' } },
      base: { ref: base, repo: { full_name: 'ing2720/netflix-supporter' } },
    } }));
    return execFileSync(process.execPath, [script], {
      env: { ...process.env, GITHUB_EVENT_PATH: event }, encoding: 'utf8', stdio: 'pipe',
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

describe('pull request branch routes', () => {
  it.each([['feat/instant-skip', 'dev'], ['fix/storage-race', 'dev'], ['dev', 'main']])(
    'accepts %s → %s', (head, base) => expect(check(head, base)).toContain('is valid'),
  );
  it.each([['feat/skip', 'main'], ['fix/skip', 'main'], ['main', 'dev'], ['feature/skip', 'dev'],
    ['feat/skip', 'feat/other'], ['dev', 'dev'], ['feat/', 'dev']])(
    'rejects %s → %s', (head, base) => expect(() => check(head, base)).toThrow(),
  );
  it('allows a contributor feature PR into dev', () => expect(check('feat/skip', 'dev', true)).toContain('is valid'));
  it('rejects a fork dev branch masquerading as the release branch', () => expect(() => check('dev', 'main', true)).toThrow());
});
