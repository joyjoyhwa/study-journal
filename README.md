# 풀다이브를 향한 공부 기록

논문 읽기와 기초 공부를 남기는 한국어 개인 학습 블로그입니다. Node.js 기본 기능으로 Markdown을 정적 HTML로 빌드합니다. 운영·빌드에 필요한 외부 패키지, 데이터베이스, API 키가 없습니다.

## 시작하기

Node.js 22 이상이 필요합니다. 개발 및 GitHub Actions는 Node.js 24로 검증합니다. 패키지 설치 없이 프로젝트 폴더에서 실행합니다.

```sh
npm run dev
```

기본 주소는 `http://127.0.0.1:4173/`입니다. 글·스타일·설정 파일 변경 시 자동으로 빌드하며, 브라우저를 새로고침하면 반영됩니다. 생성기 코드를 수정한 경우 서버를 다시 실행하세요.

```sh
npm test
npm run build
npm run preview
```

배포 파일은 `dist/`에 생성됩니다. `dist/`는 빌드마다 교체되므로 직접 편집하지 않습니다. 미리보기 서버는 이 컴퓨터의 루프백 주소에만 연결됩니다. 종료는 `Ctrl+C`입니다.

## 글 쓰기

```sh
npm run new -- daily my-first-note
npm run new -- paper reading-a-paper
npm run new -- basics a-basic-concept 2026-11-04
```

날짜 생략 시 한국시간의 오늘 날짜를 사용합니다. 명령은 `content/posts/YYYY-MM-DD-slug.md` 파일을 만들며 같은 이름을 덮어쓰지 않습니다. `templates/daily.md` 또는 `templates/paper.md`를 직접 복사해도 됩니다.

메타데이터 예시:

```yaml
---
title: "오늘 공부한 주제"
date: "2026-11-04"
category: "journal"
tags: ["개념", "공부 방법"]
summary: "오늘 무엇을 어떻게 공부했는지 한두 문장으로 씁니다."
draft: true
---
```

- `category`: `journal`(공부 일지), `paper`(논문 노트), `basics`(기초 공부).
- 제목·날짜·요약은 큰따옴표로 감싸고, 태그는 JSON 배열 형식으로 씁니다.
- `draft: true`는 빌드 결과, 검색, 피드에서 제외됩니다. 글을 완성한 뒤 `draft: false`로 바꿉니다.
- **draft는 정적 사이트에서만 제외됩니다. 공개 GitHub 저장소에 올린 원본 파일과 Git 기록은 공개됩니다.** 공개하면 안 되는 초안·신상·로그인 정보는 저장소에 넣지 마세요.
- 날짜는 글의 학습일입니다. 예약 발행 기능은 없으며 `draft: false`인 글은 날짜에 관계없이 배포됩니다.
- 첫 글에는 실제로 확인된 활동인 기록 방식 결정과 블로그 준비만 담았습니다. 논문 노트와 기초 공부는 정직한 빈 상태로 시작합니다.

공부 일지 순서는 **오늘 공부한 것 → 어떻게 공부했는지 → 이해한 내용 → 막힌 점 → 다음에 할 것 → 출처**입니다. 논문 서식은 서지정보·질문·방법·결과·한계·내 이해와 질문을 구분합니다.

## Markdown 지원 범위

제목(`##`~`######`), 문단, 굵게, 기울임, 인라인 코드, 코드 블록, 인용문, 단순 순서/비순서 목록, 가로선, 링크, 이미지, 표를 지원합니다. 글 제목은 메타데이터로 표시하며 본문 `#`는 `h2`로 처리합니다.

중첩 목록, 각주, 수식 렌더링, 작업 목록, raw HTML, MDX는 지원하지 않습니다. raw HTML은 실행되지 않고 문자로 표시됩니다. 복잡한 CommonMark 문법이 필요해지면 `scripts/markdown.mjs`를 검증된 렌더러로 교체할 수 있습니다.

이미지는 `public/images/`에 넣고 `![그림 설명](/images/example.png)`처럼 참조하세요. 내부 글 링크도 `[표시 문구](/notes/YYYY-MM-DD-slug/)` 형태의 루트 상대 경로를 쓰면 프로젝트 하위 경로가 자동 적용됩니다. 직접 작성한 상대 경로는 현재 글 위치를 기준으로 합니다. 괄호/공백을 포함한 URL은 URL 인코딩하세요.

## GitHub Pages 배포

승인된 배포 대상은 공개 저장소 [`joyjoyhwa/study-journal`](https://github.com/joyjoyhwa/study-journal)이며, GitHub Pages 주소는 `https://joyjoyhwa.github.io/study-journal/`입니다. 배포 성공 여부는 저장소 Actions에서 확인할 수 있습니다.

원본은 `main`, 생성된 웹사이트는 `gh-pages` 브랜치로 관리합니다. 현재 인증에 Actions workflow 업로드 권한이 없어, 계정 권한을 추가하지 않아도 사용할 수 있는 브랜치 게시 방식을 사용합니다.

1. Markdown을 수정하고 변경 내용을 `main`에 커밋·push합니다.
2. 이 폴더에서 `npm run deploy`를 실행합니다.
3. 최초 설정은 **Settings → Pages → Build and deployment → Source → Deploy from a branch**, 브랜치 **gh-pages**, 폴더 **/(root)**입니다.
4. GitHub의 Pages 배포가 완료되면 실제 공개 주소를 열어 확인합니다.

`npm run deploy`는 기존 GitHub CLI(`gh`) 인증의 계정이 저장소 소유자인지 확인하고, `main`이 깨끗하며 원격 커밋과 일치하는지 검사합니다. 테스트와 빌드가 성공하면 임시 체크아웃에서 정적 결과만 커밋·push합니다. 토큰을 만들거나 출력하지 않으며 개인 이메일 대신 GitHub noreply 주소를 사용합니다. 실패한 테스트나 미커밋·미업로드 소스가 있으면 게시를 멈춥니다. 새 게시물이 없고 생성 결과도 같으면 추가 커밋을 만들지 않습니다.

배포 대상은 `site.config.json`의 `deployment` 항목에 있습니다. `main`에 원본만 push하면 자동 빌드되지는 않으므로, 자동 게시 작업도 소스 반영 뒤 `npm run deploy`를 실행해야 합니다.

향후 Actions 사용을 승인하면 `deployment/pages-workflow.yml`을 `.github/workflows/pages.yml`로 옮기고 Pages의 Source를 **GitHub Actions**로 전환할 수 있습니다. 이 선택용 서식은 공식 [`configure-pages`](https://github.com/actions/configure-pages)의 `base_path`와 `origin`을 받아 테스트·빌드·배포합니다. [GitHub 공식 workflow 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 참고하세요.

일반 정적 호스팅이라면 `site.config.json`의 `url`(경로 없는 도메인)과 `basePath`(예: `/study-log`)를 설정합니다. `url`이 있으면 canonical·Atom 피드·사이트맵이 함께 생성됩니다. 외부 주소가 아직 정해지지 않은 로컬 빌드에서는 이를 만들지 않습니다.

하위 경로 로컬 확인(PowerShell):

```powershell
$env:BASE_PATH = '/study-log'
npm run preview -- --port 4174
# http://127.0.0.1:4174/study-log/
# 종료한 뒤 환경값 해제
Remove-Item Env:BASE_PATH
```

## 향후 자동 게시

자동 작업의 출력 대상을 `content/posts/`로 연결할 수 있습니다. 실제 공부한 대화·자료만 사용해 새 Markdown 파일을 만들고 검증한 뒤, 승인된 저장소의 `main`에 커밋·push하고 `npm run deploy`를 실행합니다. 없는 공부는 만들지 않고, 같은 날짜·slug는 덮어쓰지 않도록 합니다. 자정 자동 작업은 아직 연결하지 않았습니다.

## 파일 구조

```text
content/posts/       실제 공개용 글과 초안
templates/          공부 일지 / 논문 노트 원본 서식
public/assets/      CSS, 검색·모바일 메뉴 JS
scripts/            빌드 / Markdown / 새 글 생성 / 로컬 서버 / 배포
tests/              Node 기본 테스트
qa/                 선택적인 실제 브라우저 검증 도구
deployment/         선택용 GitHub Actions workflow 서식
dist/               생성 결과 (Git 제외)
```

## 브라우저 검증 재현

운영용 의존성과 분리된 `qa/`에서만 Playwright와 axe를 사용합니다. 이미 설치된 Edge 또는 Chrome의 별도 테스트 프로필로 실행하므로 사용자 로그인 세션을 사용하지 않습니다.

```sh
cd qa
npm ci
npm test
```

앞서 루트에서 미리보기 서버를 실행해야 합니다. `QA_BASE_URL`로 테스트 주소를 바꿀 수 있습니다. 설치된 브라우저가 다른 위치라면 `BROWSER_EXECUTABLE` 환경변수로 지정하세요. 스크린샷과 결과는 `qa/screenshots/`, `qa/browser-results.json`에 기록됩니다.

완료한 검증과 증거 파일은 [QA.md](QA.md)에 정리했습니다.

검색은 브라우저에서 동작하며 외부 서비스로 검색어를 전송하지 않습니다. 분석·광고·외부 폰트 요청은 없습니다. JavaScript 없이도 전체 목록과 본문·링크를 읽을 수 있습니다.
