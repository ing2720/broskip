import type { SkipAdapter } from './adapter';
import { isActionable } from './actionable';

// Observed on desktop YouTube on 2026-10-20. Deliberately excludes countdowns,
// advertiser links, toolbar Next and generic buttons whose text says "skip".
export const YOUTUBE_SKIP_SELECTOR = 'button.ytp-skip-ad-button';

export function youtubeWatchKey(): string | null {
  if (location.pathname !== '/watch') return null;
  const id = new URLSearchParams(location.search).get('v');
  return id ? `/watch?v=${id}` : null;
}

export const youtubeAdapter: SkipAdapter = {
  selector: YOUTUBE_SKIP_SELECTOR,
  watchKey: youtubeWatchKey,
  classifyControl: (element) => element.matches(YOUTUBE_SKIP_SELECTOR) ? 'youtubeAd' : null,
  isActionable: (element) =>
    element.closest('#movie_player.ad-showing') !== null && isActionable(element),
  routeEvents: ['yt-navigate-finish'],
};
