import { createSkipEngine } from './engine';
import { normalizeSettings } from './settings';

async function start() {
  // Read settings before clicking anything, including a saved global OFF.
  let revision = 0;
  let engine: ReturnType<typeof createSkipEngine> | undefined;
  const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !changes.settings) return;
    revision++;
    const settings = normalizeSettings(changes.settings.newValue);
    if (engine) engine.updateSettings(settings);
    else {
      engine = createSkipEngine({ settings });
      engine.start();
    }
  };
  chrome.storage.onChanged.addListener(onChanged);
  try {
    const initial = await chrome.storage.local.get('settings');
    if (revision === 0) {
      engine = createSkipEngine({ settings: normalizeSettings(initial.settings) });
      engine.start();
    }
  } catch {
    // Fail closed instead of overriding a possibly saved OFF preference.
    engine?.stop();
    chrome.storage.onChanged.removeListener(onChanged);
    console.warn('[Netflix Supporter] 설정을 읽지 못해 자동 스킵을 시작하지 않았습니다. 페이지를 새로고침하세요.');
  }
}

void start();
