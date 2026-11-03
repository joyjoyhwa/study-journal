# 로컬 검증 결과

검증일: 2026-11-03. 외부 배포 전의 로컬 결과입니다.

## 완료한 검증

- Node.js 기본 테스트 5개 통과: Markdown 안전 처리, 한국어 목차, 목록·표, 메타데이터 오류, 프로젝트 하위 경로, 초안 제외, 전체 내부 링크, 피드·사이트맵, 글이 없는 상태.
- 실제 설치된 Edge의 분리된 임시 프로필에서 브라우저 시나리오 20개 통과.
- 같은 20개 시나리오를 `/study-log/` 하위 경로에서도 통과.
- 홈·목록·글 상세·작성 안내·두 서식·소개·404의 링크와 자산 요청 확인.
- 검색 결과/검색 없음/초기화, 카테고리 빈 상태, 태그 필터, 직접 URL 진입과 새로고침, 뒤로가기·앞으로가기, 목록↔상세 반복 이동 확인.
- 모바일 메뉴 열기/닫기/Escape/이동, Markdown 다운로드, JavaScript를 끈 상태의 글 읽기 확인.
- 가로폭 320 / 390 / 768 / 1440px에서 홈·글·논문 서식의 가로 넘침 없음.
- axe의 WCAG 2 A/AA 및 2.1 A/AA 자동 검사에서 최종 검출 오류 0개. 모든 접근성 요구사항을 보증하는 수동 감사 결과는 아닙니다.
- 페이지 JavaScript 오류와 실패한 자산 요청 없음.
- 데스크톱 홈과 글, 모바일 홈과 글의 스크린샷을 직접 검토했습니다.

## 증거 파일

- `qa/browser-results-root.json`: 루트 주소 결과.
- `qa/browser-results-subpath.json`: 하위 주소 결과.
- `qa/screenshots/desktop-home.png`
- `qa/screenshots/desktop-article.png`
- `qa/screenshots/desktop-empty-state.png`
- `qa/screenshots/mobile-home.png`
- `qa/screenshots/mobile-article.png`
- `qa/screenshots/mobile-menu.png`

스크린샷은 하위 경로 배포를 재현한 마지막 실행의 화면입니다. 테스트용 URL을 설정한 실행이므로 푸터에 Atom 링크도 보입니다. 기본 로컬 빌드는 외부 주소가 정해지기 전까지 Atom·사이트맵을 생성하지 않습니다.

브라우저 테스트 도구는 `qa/` 안에만 설치되어 있습니다. 빌드·운영에는 npm 설치가 필요하지 않습니다. 검증에 사용한 로컬 서버는 종료했습니다. 재실행은 README를 따르세요.

## 남은 실제 배포 확인

이 보고서는 최초 로컬 검증 시점의 결과입니다. 이후의 원격 배포 상태는 저장소의 GitHub Actions 실행 기록에서 별도로 확인합니다. 로컬 검증 성공이 원격 배포 성공을 의미하지는 않습니다. 자정 자동 게시 연결은 별도 작업입니다.
