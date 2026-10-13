import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSkipEngine } from '../src/engine';
import { DEFAULT_SETTINGS } from '../src/settings';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
let route: string | null;
let engine: ReturnType<typeof createSkipEngine>;

function addControl(hook: string, label = '다음 화') {
  const button = document.createElement('button');
  button.dataset.uia = hook;
  button.textContent = label;
  const click = vi.fn();
  button.addEventListener('click', click);
  document.body.append(button);
  return { button, click };
}

beforeEach(() => {
  route = '/watch/123';
  document.body.replaceChildren();
  engine = createSkipEngine({ getWatchKey: () => route, actionable: (element) => !element.hasAttribute('disabled') });
});
afterEach(() => engine.stop());

describe('post-play next episode', () => {
  it.each(['next-episode-seamless-button', 'next-episode-seamless-button-draining'])('recognizes the dedicated %s hook', async (hook) => {
    engine.start();
    const { click } = addControl(hook);
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it.each(['player-next-episode', 'play-button', 'postplay-play', 'recommended-title', ''])('leaves toolbar/recommendation/unknown controls alone: %s', async (hook) => {
    engine.start();
    const { click } = addControl(hook, '다음 화 재생');
    await settle();
    expect(click).not.toHaveBeenCalled();
  });

  it('does not click the same next-episode cue when Netflix changes countdown hooks', async () => {
    const { button, click } = addControl('next-episode-seamless-button');
    engine.start();
    button.dataset.uia = 'next-episode-seamless-button-draining';
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('resumes intro detection after the next episode replaces the player', async () => {
    const next = addControl('next-episode-seamless-button');
    engine.start();
    expect(next.click).toHaveBeenCalledTimes(1);
    route = '/watch/234';
    document.body.replaceChildren();
    const intro = addControl('player-skip-intro');
    await settle();
    expect(intro.click).toHaveBeenCalledTimes(1);
  });

  it('can disable next episode without disabling intro skipping', async () => {
    engine.updateSettings({ ...DEFAULT_SETTINGS, nextEpisode: false });
    engine.start();
    const next = addControl('next-episode-seamless-button');
    const intro = addControl('player-skip-intro');
    await settle();
    expect(next.click).not.toHaveBeenCalled();
    expect(intro.click).toHaveBeenCalledTimes(1);
  });

  it('does not click a post-play-like control on a browse page', async () => {
    route = null;
    engine.start();
    const next = addControl('next-episode-seamless-button');
    await settle();
    expect(next.click).not.toHaveBeenCalled();
  });
});
