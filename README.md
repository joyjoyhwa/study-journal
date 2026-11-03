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
theme: "forest"
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

## 글마다 색감 고르기

Markdown 맨 위의 `---` 사이에 `theme`를 적으면 그 글의 페이지에만 적용됩니다. 예를 들어 바다빛은 다음 한 줄을 추가합니다.

```yaml
theme: "ocean"
```

| 값 | 색감 | 미리보기 |
| --- | --- | --- |
| `forest` | 숲빛: 기존 종이색과 깊은 초록 | [숲빛 페이지](https://joyjoyhwa.github.io/study-journal/guide/themes/forest/) |
| `ocean` | 바다빛: 서늘한 푸른 바탕과 남색 | [바다빛 페이지](https://joyjoyhwa.github.io/study-journal/guide/themes/ocean/) |
| `clay` | 흙빛: 따뜻한 살구색 바탕과 적갈색 | [흙빛 페이지](https://joyjoyhwa.github.io/study-journal/guide/themes/clay/) |

**생략하면 기존 기본색 `forest`를 유지합니다.** 분류와 무관하게 글마다 선택할 수 있고, 제목·본문·목차·인용문·표·링크가 같은 팔레트를 사용합니다. 목록이나 다음에 읽는 다른 글의 색을 바꾸거나 브라우저에 취향을 저장하지 않습니다. 테마는 빌드할 때 HTML/CSS에 적용되므로 JavaScript 없이도 보입니다.

지원하지 않는 이름이나 빈 값을 넣으면 빌드가 오류를 알려 줍니다. 기본색으로 돌아가려면 `theme` 줄을 지우거나 `theme: "forest"`로 바꾸세요. [색감 선택 안내](https://joyjoyhwa.github.io/study-journal/guide/themes/)에서 실제 글 서식으로 비교할 수 있습니다. 미리보기 페이지는 학습 기록 목록·검색·Atom 피드에 포함되지 않습니다.

팔레트 값은 `scripts/themes.mjs`, 테마별 본문·미리보기 스타일은 `public/assets/themes.css`에서 관리합니다. 색을 추가하거나 조정할 때는 `npm test`와 브라우저의 명도 대비 검사를 함께 확인하세요.

## 화면 디자인과 움직임

첫 화면은 돌문 너머의 호수·폭포·공중 정원을 담은 **AI 생성 상상 풍경**입니다. 실제 장소나 공부의 성과를 나타내지 않으며, 이미지 아래에도 생성 이미지임을 표시합니다. 얼굴·개인 사진·외부 작품의 참고 이미지는 사용하지 않았습니다. [생성 방식과 전체 프롬프트](art/README.md)에 원본과 배포 파일을 기록했습니다.

홈·목록·글 표지·작성 안내·푸터는 같은 잉크빛 배경, 큰 제목과 궤도 그래픽으로 이어집니다. 글 상세의 본문은 별도의 종이색 영역에 놓이며 `forest`, `ocean`, `clay`의 기존 본문 팔레트를 유지합니다. 바깥 배경과 그래픽도 선택한 글 테마에 맞춰 초록·파랑·흙빛으로 바뀝니다.

브라우저는 화면 크기와 해상도에 따라 24KB / 81KB / 214KB JPEG 중 적절한 파일을 선택합니다. 작은 화면은 제목과 이미지를 분리하고, 큰 화면은 짙은 그라데이션 위에 제목을 표시합니다. 원본 PNG는 `art/`에 보관하며 사이트에서 내려받지 않습니다.

홈의 스크롤 문구, 목록 카드, 글 표지의 그래픽이 이어지는 인터랙션을 사용합니다. 제목과 카드는 화면에 들어올 때 한 번 올라오고, 그래픽은 보이는 동안 48초 주기로 천천히 회전합니다. 화면 밖이나 숨겨진 탭에서는 멈춥니다. 정밀 포인터 환경에서는 그래픽만 커서에 따라 조금 기울어지며 본문 글자는 움직이지 않습니다. 첫 이미지의 스크롤 이동은 최대 24px, 스크롤 문구 이동은 최대 12px입니다. 목차는 읽는 위치를 표시합니다. 스크롤을 가로채거나 외부 모션 라이브러리를 사용하지 않습니다.

항상 보이는 상단 **움직임** 버튼으로 모든 그래픽 움직임을 즉시 끄고 켤 수 있습니다. 이 선택만 해당 브라우저의 `localStorage`에 저장합니다. 기기의 동작 줄이기 설정, 데이터 절약 모드, 2G 연결은 사용자의 켜기 선택보다 우선합니다. 터치 화면에서는 포인터 효과와 스크롤 이미지 이동을 사용하지 않습니다. JavaScript 미실행·오류·늦은 로딩에도 콘텐츠는 처음부터 보이고, 반복 그래픽은 기본적으로 정지해 있습니다. 텍스트 투명도를 낮추지 않아 효과 도중에도 대비를 유지합니다.

궤도 그래픽은 프로젝트 안에서 작성한 SVG/CSS이며 외부 이미지·영상·폰트·모션 패키지를 추가하지 않았습니다. 이미지 생성 출처와 프롬프트는 [art/README.md](art/README.md)에 있습니다.

구성은 `scripts/experience.mjs`, 전체 화면 디자인은 `public/assets/editorial.css`, 모션은 `public/assets/motion.js`에서 관리합니다. 대표 이미지를 기술적으로 다시 인코딩하려면 Windows PowerShell에서 다음을 실행합니다. 원본 구도를 편집하지 않고 크기와 JPEG 압축만 바꿉니다.

```powershell
./scripts/prepare-hero.ps1 -Source art/threshold-original.png
```

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
public/images/      화면 크기별 대표 이미지
art/                AI 이미지 원본과 생성 출처
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
npm run test:motion
```

앞서 루트에서 미리보기 서버를 실행해야 합니다. `QA_BASE_URL`로 테스트 주소를 바꿀 수 있습니다. 설치된 브라우저가 다른 위치라면 `BROWSER_EXECUTABLE` 환경변수로 지정하세요. 스크린샷과 결과는 `qa/screenshots/`, `qa/browser-results.json`, `qa/motion-results.json`에 기록됩니다. `QA_REPORT_PATH`와 `QA_MOTION_REPORT_PATH`로 보고서 위치를 지정할 수 있습니다.

완료한 검증과 증거 파일은 [QA.md](QA.md)에 정리했습니다.

검색은 브라우저에서 동작하며 외부 서비스로 검색어를 전송하지 않습니다. 분석·광고·외부 폰트 요청은 없습니다. JavaScript 없이도 전체 목록과 본문·링크를 읽을 수 있습니다.
