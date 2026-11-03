# 문 너머의 세계 — 대표 이미지 기록

전체 화면 재설계에서도 이 생성 이미지를 그대로 사용합니다. 홈·목록·글 표지·안내 카드에 추가한 궤도 그래픽은 `scripts/experience.mjs`의 원·타원·선으로 직접 작성한 SVG와 CSS입니다. 외부 이미지, 영상, 폰트 또는 타사 애니메이션 에셋을 추가하지 않았습니다.

- 생성: OpenAI 내장 이미지 생성 도구(`image_gen`), 2026-11-03 작업 세션. CLI나 외부 이미지 다운로드를 사용하지 않음.
- 용도: 개인 공부 블로그의 상상 풍경. 실제 장소·실험 결과·이미 공부한 내용을 나타내지 않음.
- 입력: 아래 텍스트만 사용. 얼굴, 개인 사진, 기존 작품, 타사 이미지, 비공개 연구 자료를 입력하지 않음.
- 화면 확인: 사람·얼굴·개인 정보·로고·워터마크·식별 가능한 기존 캐릭터 없음. 일반적인 판타지 건축과 자연을 묘사함.
- 공개 표기: 홈페이지 이미지 아래 `AI 생성 이미지 · 상상한 가상 세계`.
- 권리: 사용자 요청에 따라 생성한 자산이며 타사 원본의 별도 라이선스에 의존하지 않음. 생성물의 독점성이나 저작권 보호 여부를 보장하는 표시는 하지 않음.

## 파일

| 파일 | 용도 | 크기 |
| --- | --- | --- |
| `threshold-original.png` | 생성 원본, 사이트에서는 전송하지 않음 | 1672 × 941 |
| `../public/images/threshold-480.jpg` | 작은 화면 후보 | 480 × 270 · 23,868 bytes |
| `../public/images/threshold-960.jpg` | 모바일·중간 화면 후보 | 960 × 540 · 81,058 bytes |
| `../public/images/threshold-1672.jpg` | 큰 화면 후보 | 1672 × 941 · 213,706 bytes |

JPEG는 Windows System.Drawing으로 크기 조절과 품질 82 인코딩만 수행했습니다. EXIF 등 원본 메타데이터를 복사하지 않습니다. 반응형 `srcset`과 고정 비율로 용량과 레이아웃 이동을 줄입니다. 모바일은 이미지 아래의 단색 영역에서 제목을 읽으며, 데스크톱은 충분한 어두운 덮개 위에 글을 표시합니다.

## 사용한 전체 프롬프트

```text
Use case: stylized-concept. Asset type: original cinematic hero image for a Korean personal study journal about understanding and the dream of entering virtual worlds. Generate a wide 16:9 landscape, high detail, no typography. A believable quiet stone corridor in the foreground opens through a monumental rectangular doorway into an impossibly beautiful world: a glass-still turquoise lake, distant floating sandstone gardens and elegant waterfalls dissolving into low cloud, an enormous subtle pale moon and warm golden dawn. No people, no faces. The threshold and continuous stone path invite the viewer to walk from ordinary reality into the magical landscape. Sophisticated architectural photography meets original cinematic worldbuilding, tactile stone, atmospheric depth, restrained teal, sage and soft gold, extraordinary beauty without neon sci-fi clichés. Composition: doorway and extraordinary vista dominate the right 60 percent, main portal centered at roughly 68 percent of image width; the left 35 percent is dark quiet stone and natural shadow with minimal detail to leave room for a website headline. Preserve a strong central-right crop that also works on a portrait mobile screen. Elegant, immersive, physically plausible light, not a video game screenshot. No logos, no watermark, no words, no recognizable existing IP, no brain imagery, no real identifying location.
```
