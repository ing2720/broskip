# 001 — 대기 없는 클릭과 보수적인 대상 판별

## 요구

사용자는 Netflix가 버튼을 활성화하는 시점에 클릭하기를 원한다. 인위적인 대기·토스트·영상 위 추가 UI는 필요하지 않다.

## 결정

- 실행 코드에 외부 런타임 라이브러리를 넣지 않는다. TypeScript와 esbuild는 개발 도구로만 사용한다.
- 반복 타이머 대신 MutationObserver로 버튼 삽입과 활성화 관련 속성 변경을 감지한다.
- 문서 전체의 변경 알림은 받되, 추가된 하위 트리만 검색한다. 관계없는 속성 변경·자막 텍스트 변경에는 버튼의 레이아웃을 다시 계산하지 않는다.
- 최초 로드, 설정 재활성화, 경로·전체 화면 전환 시에는 한 번 재탐색한다.
- Netflix의 정확한 data-uia 식별자로만 대상을 판별한다. 일반적인 '다음', '재생' 문구 검색은 사용하지 않는다.
- DOM에 존재하는 것만으로 클릭하지 않는다. 비활성·숨김·투명·화면 밖 상태와 조상 요소의 숨김도 확인한다.
- 같은 요소는 표시된 동안 한 번만 클릭한다. 클릭 직후 1.5초 내 같은 종류의 재생성 버튼은 중복으로 본다. 첫 클릭을 기다리게 하는 지연은 아니다.
- 저장된 OFF 설정을 무시하지 않도록 최초 설정 로드가 완료된 후 엔진을 시작한다. 설정 읽기에 실패하면 동작하지 않는다.

## 비용과 한계

- Netflix 내부 UI 식별자는 공개 API가 아니므로 변경될 수 있다. 알 수 없는 버튼에는 동작하지 않는 것이 잘못된 클릭보다 낫다.
- Observer는 메인 스레드가 실행 가능한 시점에 호출된다. 0ms 또는 일정한 반응 시간을 보장하지 않는다.
- CSS 전환 완료 이벤트를 보완적으로 사용한다. DOM/관련 이벤트가 전혀 없는 상태 변화까지 지속 탐지하기 위한 polling은 추가하지 않는다.
- 자동 클릭이 서비스에서 무시되더라도 무한 재시도를 하지 않는다. 실제 Netflix에서의 동작 확인이 필요하다.
- 종류별 설정은 클릭 전에 메모리에서 확인한다. 클릭 순간 네트워크나 디스크 읽기를 하지 않는다.

## 근거

- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [외부 구현에서 관찰된 Netflix UI hook](https://github.com/sajjad-ahmed/netflix-auto-skip): 식별자 참고만 했으며 코드를 복사하지 않았다. 실제 계정 환경 검증을 대체하지 않는다.
