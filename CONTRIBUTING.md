# 개발과 배포 흐름

`main`은 배포 기준, `dev`는 기능을 통합하는 개발 브랜치입니다.

```text
dev → feat/<작업명> → PR → dev → 배포 PR → main
dev → fix/<작업명>  → PR → dev → 배포 PR → main
```

## 작업 시작

```sh
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feat/short-description
```

기능은 `feat/`, 버그·문서·개발 도구 수정은 `fix/`를 사용합니다. 모든 작업 브랜치는 최신 `dev`에서 시작하고 PR 대상도 `dev`로 지정합니다. 다른 미병합 기능에 의존하면 선행 PR이 `dev`에 병합된 뒤 후속 브랜치를 만듭니다. PR의 base를 다른 기능 브랜치로 지정하지 않습니다.

## PR 작성과 검토

- 파일 수보다 하나의 동작·문제·설계 결정으로 범위를 나눕니다. 기능과 해당 회귀 테스트를 함께 제출합니다.
- 재현 조건, 변경 전후 동작, 구현 경계, 대안과 선택 이유를 설명합니다.
- 검증 명령과 실제 결과를 적습니다. 모의 DOM, 실제 Chrome, Netflix 재생 결과는 구분합니다.
- 지원 사이트의 비공개 UI hook 변경 가능성과 미검증 범위를 명시합니다.
- 커밋은 `feat:`, `fix:`, `docs:`, `test:`, `chore:` 등 변경 내용을 나타내는 접두사를 사용합니다.

## 병합과 배포

1. 작업 브랜치에서 `npm run check`를 통과시키고 `dev` 대상 PR을 작성합니다.
2. CI와 변경 내용을 검토한 뒤 merge commit 방식으로 `dev`에 병합합니다.
3. 통합한 `dev`에서 검사와 `npm run package`를 실행하고 설치·재생 확인 범위를 기록합니다.
4. `dev` → `main` PR에 포함 기능, 검증 결과, 알려진 제한을 정리합니다.
5. 배포 검토 후 merge commit 방식으로 `main`에 반영합니다. 다음 작업 전 `main`의 병합 커밋을 `dev`에 동기화합니다.

`main`으로 향하는 기능·수정 PR은 허용하지 않습니다. CI의 브랜치 검사는 `feat/*`·`fix/*` → `dev`, 같은 저장소의 `dev` → `main`만 허용합니다. 이는 PR 검사이며, 직접 push 금지나 필수 검사 강제는 별도의 GitHub ruleset 설정이 필요합니다.

## 제품과 검증 기준

- 인식한 Netflix·YouTube 버튼이 표시·활성 상태일 때만 클릭합니다. 일반 재생·추천 버튼을 추측으로 누르지 않습니다.
- 클릭 전 인위적 지연, 반복 polling, 영상 위 UI, 분석 서버, 영상·자막 수집을 추가하지 않습니다.
- 설정은 `chrome.storage.local`에 저장하며 필요한 권한만 요청합니다.
- 버튼 판별, observer 수명, 가시성, 중복 억제 변경에는 집중 회귀 테스트를 추가합니다.
- 비밀키·토큰·쿠키·계정 정보·시청 기록은 Git에 포함하지 않습니다.

## 로컬 실행과 스토어 패키지

```sh
npm ci
npm run check
npm run package
```

로컬 개발·검증에서는 `chrome://extensions`의 개발자 모드에서 `dist`를 로드합니다. 일반 사용자 설치 경로는 게시 후 Chrome 웹스토어입니다.

`artifacts/broskip-<version>-webstore.zip`은 `manifest.json`이 최상위에 있는 제출 전용 ZIP입니다. 아이콘 변경 시 `npm run store:assets`로 원본 도형에서 PNG를 다시 생성합니다. 스토어 등록 이미지와 문구는 `store/`, 개인정보 안내는 `PRIVACY.md`에 있습니다. 게시 전 실제 스토어 ID를 발급받고 README와 설치 안내에 동일한 설치 URL을 반영합니다.

설정 UI가 바뀌면 `npm run dev` 후 `http://127.0.0.1:4173/store.html`을 1280×800 뷰포트에서 캡처해 `store/screenshot-1280x800.jpg`를 갱신합니다. 캡처의 실제 인코딩과 확장자를 일치시킵니다. 이 화면은 실제 팝업 코드와 모의 저장소를 사용하며 Netflix 재생 검증 자료가 아닙니다.
