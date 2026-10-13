# 002 — 엔딩 스킵의 경계

## 결정

'엔딩 스킵'은 엔딩 영상을 판별하거나 특정 시점으로 이동하는 기능이 아니다. Netflix가 다음 회차로 이동하는 전용 post-play 버튼을 보여주면 그 버튼을 클릭한다.

허용하는 hook은 `next-episode-seamless-button` 및 `next-episode-seamless-button-draining`이다. 같은 버튼이 카운트다운 상태로 바뀌어도 클릭은 반복하지 않는다.

일반 재생 버튼, 추천 작품 카드, 상시 표시될 수 있는 플레이어 도구 모음의 다음 회차 버튼은 포함하지 않는다. 그렇지 않으면 본편을 보는 도중 다음 화로 넘어갈 수 있다.

회차 경로가 바뀌면 중복 방지 상태를 초기화하고 새 플레이어의 오프닝·줄거리 버튼 감지를 이어간다. 새 경로 진입은 DOM 변경과 popstate/pageshow 시점에 확인하며 Netflix의 내부 API를 호출하거나 history 메서드를 덮어쓰지 않는다.

## 한계와 검증

- 서비스가 버튼의 의미나 식별자를 바꾸면 코드 갱신이 필요하다. 이 식별자가 현재 모든 계정·국가에서 같은 의미라는 보장은 없다.
- 마지막 회차의 추천작 버튼은 별도 대상에 넣지 않는다. 모의 테스트는 허용하지 않은 hook이 클릭되지 않는지만 증명한다.
- 엔딩 뒤 추가 장면을 감지하는 기능은 없다. 해당 장면을 보고 싶으면 다음 회차 자동 이동을 꺼야 한다.
- 실제 Netflix 계정의 마지막 회차·일반 회차에서 별도 확인하기 전에는 실서비스 검증 완료로 표시하지 않는다.

## 식별자 참고

- [Netflix Auto Skip README](https://github.com/sajjad-ahmed/netflix-auto-skip)
- [Netflix Skipper hook 기록](https://gist.github.com/AniruddhaHumane/8292fdc007ee1a0cae181df767543eb2)

외부 코드 복사 없이 식별자만 참고했다.
