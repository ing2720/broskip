import { DEFAULT_SETTINGS, type Settings } from './settings';

export interface SettingsStore {
  savedMessage?: string;
  read(): Promise<Settings>;
  write(settings: Settings): Promise<void>;
  subscribe(listener: (settings: Settings) => void): () => void;
}

export async function mountPopup(root: Document, store: SettingsStore): Promise<() => void> {
  const form = root.querySelector<HTMLFormElement>('#settings')!;
  const status = root.querySelector<HTMLElement>('#status')!;
  const message = root.querySelector<HTMLElement>('#message')!;
  const inputs = [...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  let settings = { ...DEFAULT_SETTINGS };
  let ready = false;
  let saving = false;
  let revision = 0;

  function render() {
    for (const input of inputs) {
      input.checked = settings[input.name as keyof Settings];
      input.disabled = !ready || saving || (input.name !== 'enabled' && !settings.enabled);
    }
    status.textContent = !ready ? '설정 읽는 중' : settings.enabled ? '자동 스킵 켜짐' : '자동 스킵 꺼짐';
    status.dataset.active = String(ready && settings.enabled);
    form.setAttribute('aria-busy', String(!ready || saving));
  }

  const unsubscribe = store.subscribe((next) => {
    revision++;
    settings = next;
    render();
  });
  render();
  try {
    const initial = await store.read();
    if (revision === 0) settings = initial;
    ready = true;
  } catch {
    message.textContent = '설정을 읽지 못했어요. 창을 닫고 다시 열어주세요.';
  }
  render();

  const onChange = async (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.disabled || saving || !ready ||
        !(input.name in DEFAULT_SETTINGS)) return;
    const previous = settings;
    settings = { ...settings, [input.name]: input.checked };
    saving = true;
    message.textContent = '저장 중…';
    render();
    try {
      await store.write(settings);
      message.textContent = store.savedMessage ?? '저장했어요. 열려 있는 Netflix에도 적용돼요.';
    } catch {
      settings = previous;
      message.textContent = '저장하지 못했어요. 다시 시도해주세요.';
    } finally {
      saving = false;
      render();
    }
  };
  form.addEventListener('change', onChange);
  return () => { unsubscribe(); form.removeEventListener('change', onChange); };
}
