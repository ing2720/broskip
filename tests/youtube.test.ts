import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSkipEngine } from '../src/engine';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings';
import { youtubeAdapter, youtubeWatchKey } from '../src/youtube';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const rect = { x: 0, y: 0, width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40, toJSON() {} };
let engine: ReturnType<typeof createSkipEngine>;
let player: HTMLElement;
let route: string | null;
let clock: number;

function cue() {
  const button = document.createElement('button');
  button.className = 'ytp-skip-ad-button ytp-ad-component--clickable';
  button.innerHTML = '<div class="ytp-skip-ad-button__text">건너뛰기</div>';
  const click = vi.fn();
  button.addEventListener('click', click);
  player.append(button);
  return { button, click };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="movie_player" class="html5-video-player ad-showing"></div>';
  player = document.querySelector('#movie_player')!;
  route = '/watch?v=first';
  clock = 0;
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([rect] as unknown as DOMRectList);
  engine = createSkipEngine({ adapter: youtubeAdapter, getWatchKey: () => route, now: () => clock });
});
afterEach(() => { engine.stop(); });

describe('YouTube ad skip', () => {
  it('clicks an inserted real-control-shaped button without a timer', async () => {
    engine.start();
    const timeout = vi.spyOn(window, 'setTimeout');
    const interval = vi.spyOn(window, 'setInterval');
    const { click } = cue();
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
    expect(timeout).not.toHaveBeenCalled();
    expect(interval).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'hidden', 'aria-disabled'])('waits for %s to clear', async (barrier) => {
    const { button, click } = cue();
    button.setAttribute(barrier, 'true');
    engine.start();
    expect(click).not.toHaveBeenCalled();
    button.removeAttribute(barrier);
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('waits for the skip container to become visible after the countdown', async () => {
    const { button, click } = cue();
    const container = document.createElement('div');
    container.style.display = 'none';
    button.replaceWith(container);
    container.append(button);
    engine.start();
    expect(click).not.toHaveBeenCalled();
    container.style.display = '';
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('requires the ad-showing state even if a stale skip button remains', async () => {
    player.classList.remove('ad-showing');
    const { click } = cue();
    engine.start();
    expect(click).not.toHaveBeenCalled();
    player.classList.add('ad-showing');
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('ignores toolbar Next, advertiser links, countdowns and matching text', async () => {
    player.innerHTML = `
      <button class="ytp-next-button">다음</button>
      <a href="https://example.com" class="ytp-skip-ad-button">광고주 방문</a>
      <div class="ytp-skip-ad-button__text">건너뛰기</div>
      <span class="ytp-ad-preview-text">5초 후 광고 건너뛰기</span>
      <button>광고 건너뛰기</button>
      <button data-uia="player-skip-intro">오프닝</button>`;
    const click = vi.fn();
    player.addEventListener('click', click);
    engine.start();
    await settle();
    expect(click).not.toHaveBeenCalled();
  });

  it('never clicks a matching button outside the main player', () => {
    const { button, click } = cue();
    document.body.append(button);
    engine.start();
    expect(click).not.toHaveBeenCalled();
  });

  it('clicks once per visible cue and suppresses immediate replacements', async () => {
    const first = cue();
    engine.start();
    first.button.classList.add('updated');
    await settle();
    expect(first.click).toHaveBeenCalledTimes(1);
    first.button.remove();
    const replacement = cue();
    await settle();
    expect(replacement.click).not.toHaveBeenCalled();
  });

  it('rearms a reused button across two ad breaks on the same video', async () => {
    const { click } = cue();
    engine.start();
    player.classList.remove('ad-showing');
    await settle();
    clock = 10_000;
    player.classList.add('ad-showing');
    await settle();
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('handles SPA home-to-watch and watch-to-watch transitions', () => {
    route = null;
    const { click } = cue();
    engine.start();
    expect(click).not.toHaveBeenCalled();
    route = '/watch?v=first';
    document.dispatchEvent(new Event('yt-navigate-finish'));
    expect(click).toHaveBeenCalledTimes(1);
    route = '/watch?v=second';
    document.dispatchEvent(new Event('yt-navigate-finish'));
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('honors the independent toggle and global OFF, then stops on disposal', async () => {
    const { click } = cue();
    engine.updateSettings({ ...DEFAULT_SETTINGS, youtubeAd: false });
    engine.start();
    expect(click).not.toHaveBeenCalled();
    engine.updateSettings({ ...DEFAULT_SETTINGS, enabled: false });
    expect(click).not.toHaveBeenCalled();
    engine.updateSettings({ ...DEFAULT_SETTINGS, intro: false, recap: false, nextEpisode: false });
    expect(click).toHaveBeenCalledTimes(1);
    engine.stop();
    route = '/watch?v=third';
    const next = cue();
    document.dispatchEvent(new Event('yt-navigate-finish'));
    await settle();
    expect(next.click).not.toHaveBeenCalled();
  });

  it('migrates old preferences without losing saved Netflix or global OFF values', () => {
    expect(normalizeSettings({ enabled: false, intro: false, recap: true, nextEpisode: false }))
      .toEqual({ enabled: false, intro: false, recap: true, nextEpisode: false, youtubeAd: true });
    expect(normalizeSettings({ youtubeAd: false }).youtubeAd).toBe(false);
  });
});

describe('YouTube route and permission boundary', () => {
  it('keys watch routes by video ID, ignoring playlists and timestamps', () => {
    history.replaceState(null, '', '/watch?v=abc&list=playlist&t=10');
    expect(youtubeWatchKey()).toBe('/watch?v=abc');
    for (const path of ['/', '/watch', '/watch?v=', '/shorts/abc', '/embed/abc']) {
      history.replaceState(null, '', path);
      expect(youtubeWatchKey()).toBeNull();
    }
    history.replaceState(null, '', '/');
  });

  it('limits site access and runtime permissions to the two supported desktop sites and storage', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.content_scripts[0].matches).toEqual(['https://www.netflix.com/*', 'https://www.youtube.com/*']);
    expect(manifest.content_scripts[0].all_frames).toBeUndefined();
  });
});
