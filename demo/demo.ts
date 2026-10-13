import { createSkipEngine } from '../src/engine';
import { DEFAULT_SETTINGS } from '../src/settings';

const stage = document.querySelector<HTMLElement>('#cue-stage')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const results = document.querySelector<HTMLOListElement>('#results')!;
const summary = document.querySelector<HTMLElement>('#summary')!;
const counter = document.querySelector<HTMLElement>('#counter')!;
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
let engine: ReturnType<typeof createSkipEngine>;
let clockOffset = 0;
let total = 0;
let clicks: number[] = [];
let route: string | null = '/watch/123';

function reset() {
  engine?.stop();
  stage.replaceChildren();
  clicks = [];
  clockOffset = 0;
  route = '/watch/123';
  engine = createSkipEngine({ getWatchKey: () => route, now: () => performance.now() + clockOffset });
  engine.start();
}

function cue(hook = 'player-skip-intro', disabled = false) {
  const button = document.createElement('button');
  button.textContent = hook.includes('next-episode') ? '다음 회차' : hook.includes('recap') ? '줄거리 건너뛰기' : '오프닝 건너뛰기';
  button.dataset.uia = hook;
  button.disabled = disabled;
  button.addEventListener('click', () => {
    clicks.push(performance.now());
    counter.textContent = `클릭 ${++total}회`;
  });
  return button;
}

run.addEventListener('click', async () => {
  run.disabled = true;
  results.replaceChildren();
  total = 0;
  counter.textContent = '클릭 0회';
  let passed = 0;
  let count = 0;
  const timings: number[] = [];
  const record = (name: string, ok: boolean, detail = '') => {
    count++;
    if (ok) passed++;
    const row = document.createElement('li');
    row.dataset.pass = String(ok);
    const label = document.createElement('span');
    label.textContent = name;
    const status = document.createElement('b');
    status.textContent = `${ok ? 'PASS' : 'FAIL'}${detail ? ` · ${detail}` : ''}`;
    row.append(label, status);
    results.append(row);
  };
  try {
    reset();
    const intro = cue();
    let start = performance.now();
    stage.append(intro);
    await frame();
    let elapsed = (clicks[0] ?? Infinity) - start;
    timings.push(elapsed);
    record('활성 오프닝 버튼 삽입 → 클릭', clicks.length === 1, `${elapsed.toFixed(2)}ms`);

    reset();
    const disabled = cue('player-skip-recap', true);
    stage.append(disabled);
    await frame();
    record('비활성 버튼은 클릭하지 않음', clicks.length === 0);
    start = performance.now();
    disabled.disabled = false;
    await frame();
    elapsed = (clicks[0] ?? Infinity) - start;
    timings.push(elapsed);
    record('줄거리 버튼 활성화 → 클릭', clicks.length === 1, `${elapsed.toFixed(2)}ms`);

    reset();
    const wrapper = document.createElement('div');
    wrapper.hidden = true;
    wrapper.append(cue());
    stage.append(wrapper);
    await frame();
    record('조상이 숨겨진 버튼 제외', clicks.length === 0);
    start = performance.now();
    wrapper.hidden = false;
    await frame();
    elapsed = (clicks[0] ?? Infinity) - start;
    timings.push(elapsed);
    record('숨김 해제 → 클릭', clicks.length === 1, `${elapsed.toFixed(2)}ms`);

    reset();
    const original = cue();
    stage.append(original);
    await frame();
    original.className = 'rerender';
    await frame();
    original.replaceWith(cue());
    await frame();
    record('동일 버튼·즉시 재생성 버튼 연타 방지', clicks.length === 1);

    reset();
    stage.append(cue('play-button'), cue('player-next-episode'));
    await frame();
    record('추천작·상시 다음 버튼 제외', clicks.length === 0);

    reset();
    stage.append(cue('next-episode-seamless-button'));
    await frame();
    record('엔딩의 전용 다음 회차 버튼 클릭', clicks.length === 1);
    route = '/watch/234';
    stage.replaceChildren(cue());
    await frame();
    record('회차 전환 뒤 오프닝 감지 복구', clicks.length === 2);

    reset();
    engine.updateSettings({ ...DEFAULT_SETTINGS, enabled: false });
    stage.append(cue());
    await frame();
    record('전체 OFF에서 클릭 없음', clicks.length === 0);
    engine.updateSettings({ ...DEFAULT_SETTINGS });
    await frame();
    record('전체 ON으로 복구', clicks.length === 1);

    reset();
    const fade = document.createElement('div');
    fade.className = 'fade';
    fade.append(cue());
    stage.append(fade);
    await frame();
    record('투명한 버튼 제외', clicks.length === 0);
    fade.classList.add('ready');
    // Let a real CSS transition finish; no production polling is used.
    await new Promise((resolve) => setTimeout(resolve, 180));
    record('CSS 전환 후 표시된 버튼 감지', clicks.length === 1);

    const finite = timings.filter(Number.isFinite);
    summary.dataset.pass = String(passed === count);
    summary.textContent = `${passed}/${count} 통과 · 이 실행의 삽입/활성화→클릭 ${Math.min(...finite).toFixed(2)}–${Math.max(...finite).toFixed(2)}ms. 모의 DOM에서 측정한 결과이며 Netflix 반응 시간 보장이 아닙니다.`;
  } catch (error) {
    summary.dataset.pass = 'false';
    summary.textContent = `검증 실행 실패: ${String(error)}`;
  } finally {
    engine?.stop();
    run.disabled = false;
  }
});
