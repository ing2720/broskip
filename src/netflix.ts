import type { SkipKind } from './settings';
import type { SkipAdapter } from './adapter';
import { isActionable } from './actionable';
export { isActionable } from './actionable';

/** Undocumented Netflix UI hooks. Keep this integration boundary isolated. */
const HOOKS: Readonly<Record<string, SkipKind>> = {
  'player-skip-intro': 'intro',
  'player-skip-recap': 'recap',
  // Post-play episode controls only. Never match the persistent toolbar Next button.
  'next-episode-seamless-button': 'nextEpisode',
  'next-episode-seamless-button-draining': 'nextEpisode',
};
export const CONTROL_SELECTOR = Object.keys(HOOKS)
  .map((hook) => `[data-uia="${hook}"]`).join(',');

export function classifyControl(element: HTMLElement): SkipKind | null {
  const isControl = element.matches('button, a[href], [role="button"]');
  return isControl ? HOOKS[element.dataset.uia ?? ''] ?? null : null;
}

export function watchKey(): string | null {
  return /^\/watch\/\d+(?:\/|$)/.test(location.pathname) ? location.pathname : null;
}

export const netflixAdapter: SkipAdapter = {
  selector: CONTROL_SELECTOR, classifyControl, isActionable, watchKey,
};
