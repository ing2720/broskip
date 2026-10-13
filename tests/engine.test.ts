import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSkipEngine } from '../src/engine';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings';
import { classifyControl } from '../src/netflix';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
let engine: ReturnType<typeof createSkipEngine>;
let clock: number;
let route: string | null;
const rectangle = { x: 0, y: 0, width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40, toJSON() {} };

function cue(hook = 'player-skip-intro') {
  const button = document.createElement('button');
  button.dataset.uia = hook;
  button.textContent = '테스트 버튼';
  const click = vi.fn();
  button.addEventListener('click', click);
  return { button, click };
}

beforeEach(() => {
  document.body.innerHTML = '';
  clock = 0;
  route = '/watch/123';
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([rectangle] as unknown as DOMRectList);
  engine = createSkipEngine({ now: () => clock, getWatchKey: () => route });
});
afterEach(() => { engine.stop(); });

describe('event-driven skip detection', () => {
  it('clicks an already active intro at startup without a timer', () => {
    const { button, click } = cue();
    document.body.append(button);
    const timeout = vi.spyOn(window, 'setTimeout');
    const interval = vi.spyOn(window, 'setInterval');
    engine.start();
    expect(click).toHaveBeenCalledTimes(1);
    expect(timeout).not.toHaveBeenCalled();
    expect(interval).not.toHaveBeenCalled();
  });

  it('clicks a newly inserted recap in the mutation microtask', async () => {
    engine.start();
    const { button, click } = cue('player-skip-recap');
    document.body.append(button);
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('waits for native disabled to clear', async () => {
    const { button, click } = cue();
    button.disabled = true;
    document.body.append(button);
    engine.start();
    expect(click).not.toHaveBeenCalled();
    button.disabled = false;
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it.each(['hidden', 'aria-hidden', 'aria-disabled', 'inert'])('waits for an ancestor %s barrier to clear', async (attribute) => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute(attribute, 'true');
    const { button, click } = cue();
    wrapper.append(button);
    document.body.append(wrapper);
    engine.start();
    expect(click).not.toHaveBeenCalled();
    wrapper.removeAttribute(attribute);
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it.each(['display: none', 'visibility: hidden', 'opacity: 0', 'pointer-events: none'])('does not click CSS-inactive controls: %s', async (css) => {
    const { button, click } = cue();
    button.style.cssText = css;
    document.body.append(button);
    engine.start();
    expect(click).not.toHaveBeenCalled();
    button.style.cssText = '';
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('does not click offscreen controls', () => {
    const { button, click } = cue();
    vi.spyOn(button, 'getClientRects').mockReturnValue([{ ...rectangle, left: -200, right: -100 }] as unknown as DOMRectList);
    document.body.append(button);
    engine.start();
    expect(click).not.toHaveBeenCalled();
  });

  it('detects a hook applied after insertion', async () => {
    const { button, click } = cue('unrecognized');
    document.body.append(button);
    engine.start();
    button.dataset.uia = 'player-skip-intro';
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('does not repeat clicks on the same visible element, even after unrelated mutations', async () => {
    const { button, click } = cue();
    document.body.append(button);
    engine.start();
    clock = 10_000;
    document.body.append(document.createElement('span'));
    button.className = 'new-style';
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('does not measure candidates again for unrelated subtitle changes', async () => {
    const actionable = vi.fn(() => true);
    engine = createSkipEngine({ actionable, getWatchKey: () => route });
    const { button } = cue();
    document.body.append(button);
    engine.start();
    actionable.mockClear();
    const subtitle = document.createElement('span');
    subtitle.textContent = '대사';
    document.body.append(subtitle);
    await settle();
    subtitle.textContent = '새로운 대사';
    await settle();
    expect(actionable).not.toHaveBeenCalled();
  });

  it('suppresses a replacement control immediately following a click', async () => {
    const first = cue();
    document.body.append(first.button);
    engine.start();
    const second = cue();
    first.button.replaceWith(second.button);
    await settle();
    expect(first.click).toHaveBeenCalledTimes(1);
    expect(second.click).not.toHaveBeenCalled();
  });

  it('allows the same element after a later hide/show cycle (rewatch)', async () => {
    const { button, click } = cue();
    document.body.append(button);
    engine.start();
    button.hidden = true;
    await settle();
    clock = 2000;
    button.hidden = false;
    await settle();
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('ignores arbitrary buttons and noninteractive hook wrappers', () => {
    const { button, click } = cue('next-episode');
    button.textContent = '다음 화';
    const wrapper = document.createElement('div');
    wrapper.dataset.uia = 'player-skip-intro';
    document.body.append(button, wrapper);
    engine.start();
    expect(click).not.toHaveBeenCalled();
    expect(classifyControl(wrapper)).toBeNull();
  });

  it('does nothing outside watch routes and recovers on SPA entry', async () => {
    route = null;
    engine.start();
    const { button, click } = cue();
    document.body.append(button);
    await settle();
    expect(click).not.toHaveBeenCalled();
    route = '/watch/234';
    document.body.append(document.createElement('span'));
    await settle();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('resets duplicate state for a new episode', async () => {
    const { button, click } = cue();
    document.body.append(button);
    engine.start();
    route = '/watch/234';
    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('honors type settings and reconnects after global OFF', async () => {
    engine.updateSettings({ ...DEFAULT_SETTINGS, enabled: false });
    engine.start();
    const { button, click } = cue();
    document.body.append(button);
    await settle();
    expect(click).not.toHaveBeenCalled();
    engine.updateSettings({ ...DEFAULT_SETTINGS, intro: false });
    expect(click).not.toHaveBeenCalled();
    engine.updateSettings({ ...DEFAULT_SETTINGS });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('stops observing after disposal', async () => {
    engine.start();
    engine.stop();
    const { button, click } = cue();
    document.body.append(button);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();
    expect(click).not.toHaveBeenCalled();
  });
});

describe('settings validation', () => {
  it('keeps valid false preferences and rejects malformed values', () => {
    expect(normalizeSettings({ enabled: false, intro: 'false', recap: null })).toEqual({ ...DEFAULT_SETTINGS, enabled: false });
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
