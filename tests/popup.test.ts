import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPopup } from '../src/popup-ui';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

beforeEach(() => {
  document.body.innerHTML = `<form id="settings">${Object.keys(DEFAULT_SETTINGS).map((name) => `<input type="checkbox" name="${name}">`).join('')}</form><span id="status"></span><span id="message"></span>`;
});

describe('popup preferences', () => {
  it('loads global OFF and retains individual choices on re-enable', async () => {
    const write = vi.fn(async (_settings: Settings) => {});
    await mountPopup(document, {
      read: async () => ({ ...DEFAULT_SETTINGS, enabled: false, intro: false }),
      write, subscribe: () => () => {},
    });
    expect(input('enabled').checked).toBe(false);
    expect(input('intro').disabled).toBe(true);
    input('enabled').click();
    await settle();
    expect(write).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, enabled: true, intro: false });
    expect(input('intro').checked).toBe(false);
    expect(input('intro').disabled).toBe(false);
  });

  it('reverts UI and shows a useful error on a failed save', async () => {
    await mountPopup(document, {
      read: async () => ({ ...DEFAULT_SETTINGS }),
      write: async () => { throw Error('storage error'); }, subscribe: () => () => {},
    });
    input('intro').click();
    await settle();
    expect(input('intro').checked).toBe(true);
    expect(input('intro').disabled).toBe(false);
    expect(document.querySelector('#message')?.textContent).toContain('저장하지 못했어요');
  });

  it('does not expose actionable switches if initial storage read fails', async () => {
    await mountPopup(document, {
      read: async () => { throw Error('storage unavailable'); },
      write: vi.fn(), subscribe: () => () => {},
    });
    expect(input('enabled').disabled).toBe(true);
    expect(document.querySelector('#message')?.textContent).toContain('설정을 읽지 못했어요');
  });

  it('keeps a newer change event instead of overwriting it with an old initial read', async () => {
    let resolve!: (settings: Settings) => void;
    let notify!: (settings: Settings) => void;
    const mounting = mountPopup(document, {
      read: () => new Promise((r) => { resolve = r; }), write: vi.fn(),
      subscribe: (listener) => { notify = listener; return () => {}; },
    });
    notify({ ...DEFAULT_SETTINGS, enabled: false });
    resolve({ ...DEFAULT_SETTINGS });
    await mounting;
    expect(input('enabled').checked).toBe(false);
  });
});
