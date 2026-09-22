# 북전주 광신프로그레스 — 분양 홈페이지

참고 사이트 `elyse-residence-dev.webflow.io` 의 레이아웃 골격·타이포 스케일·색 구조를 기준으로 제작했습니다.
라이브러리 의존성 없이 HTML/CSS/JS 3개 파일로만 동작합니다.

## 폴더 구조

```
Bukjeonju_Gwangshin_Progress/
├── index.html          ← 메인 (전 섹션)
├── privacy.html        ← 개인정보처리방침
├── robots.txt
├── sitemap.xml
├── css/style.css
├── js/photos.js        ← ★ 사진 목록 (여기만 고치면 홈페이지 사진이 바뀜)
├── js/main.js          ← 사진 주입 · 메뉴 · 탭 · 아코디언 · 스크롤 진행바 · 라이트박스
├── js/anim.js          ← 애니메이션 (GSAP, 자체호스팅 js/gsap.min.js · ScrollTrigger.min.js)
└── images/             ← 사진 넣는 곳 (사진-넣는-법.md 참고)
```

## 📷 사진 넣고 빼기 — `js/photos.js`

홈페이지의 모든 사진은 **`js/photos.js` 파일 하나**로 관리됩니다.
자세한 방법은 **`images/사진-넣는-법.md`** 참고. 요약:

- **사진 교체(제일 쉬움)**: `images` 폴더에 **같은 파일명**으로 새 사진 덮어쓰기 → 끝
- **다른 파일명으로**: `js/photos.js` 에서 `file: "images/..."` 부분만 수정
- **자리 비우기**: `file: ""` 로 두면 "사진 자리" 안내판만 표시
- **갤러리 사진 추가/삭제**: `js/photos.js` 의 `gallery: [ ]` 목록에서 `{ }` 줄을 추가/삭제
  (`size: "wide"` 가로 2칸 / `"tall"` 세로 2칸 / 생략 1칸)

> **현재 이미지 출처**
> - `hero-01/02` `exterior-01/02` `community-01` `location-map` `plan-84a/b` `site-plan`
>   → 광고자료(상담사 교육자료 PDF 페이지 + 투시도·조감도 원본)에서 추출한 **실제 프로젝트 이미지**.
>   교육자료가 저해상도라 화질이 아쉬우면 시행사·시공사의 **고화질 원본**으로 같은 이름 덮어쓰기 권장.
> - `community-02`(조경·놀이터), `favicon.png`, `apple-touch-icon.png` → 아직 **임시 이미지**.
> - 대형 사진 띠 2개(외관 투시도 / 조감도), 갤러리는 실제 이미지로 채워져 화면을 가득 채웁니다.

## ✨ 인터랙션 (v6에서 강화)

| 효과 | 위치 | 구현 |
|---|---|---|
| 첫 화면 스크롤 연출 | 제목이 흐려지며 사라지고 → 카피가 초점 잡히듯 등장 → 지표 상승 | `anim.js scrollHero()` (※ v6에서 `clamp` 미정의 버그 수정 — 이전엔 첫 화면 스크럽이 아예 안 돌았음) |
| 은은히 움직이는 그라데이션 | 첫 화면 배경 위 오로라 | CSS `@keyframes auroraDrift` (`.shero__pin::before/::after`) |
| 콘텐츠 페이드인 | 스크롤 시 아래에서 위로 + 살짝 흐림→또렷 | `anim.js fadeIn()` + `[data-reveal]` |
| 패럴랙스 | 첫 화면·사진 띠·CTA 배경, 섹션 대형 번호 | `anim.js parallax()` |
| 숫자 카운트업 | 352세대·20.51%·479대·90% / 첫 화면 지표 | `[data-count]` → `anim.js countUp()` |
| 버튼 호버 | 살짝 떠오름 + 확대 + 광택 스침 | CSS `.btn:hover` |
| 카드 호버 | 프리미엄·생활권·평면 카드 떠오름 | CSS `.prem__item:hover` 등 |
| 갤러리 라이트박스 | 사진 클릭 → 전체화면 확대, ← → 이동, Esc/스와이프 | `main.js` (11) |
| 스티키 헤더 | 첫 화면 지나면 흰 배경 전환 | `main.js` (2) |
| 상단 스크롤 진행 바 | 페이지 상단 얇은 띠 | `main.js` (10) |

> 브라우저·OS에 **'동작 줄이기(prefers-reduced-motion)'** 가 켜져 있으면 위 모션은 전부 꺼지고 정적으로 표시됩니다(의도된 접근성 동작). "너무 정적"으로 보이면 이 설정을 확인하세요.

## 🎬 애니메이션 (텍스트 연출 시스템)

참고 사이트가 쓰는 **GSAP + ScrollTrigger + SplitText** 구성을 그대로 재현했습니다.
(SplitText는 유료 플러그인이라 같은 동작을 하는 분해 함수를 `anim.js`에 직접 구현했습니다.)

GSAP + ScrollTrigger 는 **자체 호스팅**입니다 (`js/gsap.min.js`, `js/ScrollTrigger.min.js`).
CDN 의존이 없어 오프라인·사내망에서도 동작합니다.

### 텍스트 연출 시스템 — `data-anim` 속성

참고 사이트의 모든 텍스트 기법을 `data-anim` 값 하나로 쓸 수 있습니다.
아무 요소에나 `data-anim="..."` 를 붙이면 스크롤로 화면에 들어올 때 재생됩니다.

| data-anim | 효과 | 원본 대응 |
|---|---|---|
| `chars` | 글자가 마스크 안에서 아래→위로 상승 | SplitText(chars, mask) |
| `chars-3d` | 글자가 X축으로 3D 플립하며 등장 | SplitText(chars) + rotationX |
| `words` | 단어가 마스크 안에서 상승 | SplitText(words, mask) |
| `words-3d` | 단어가 살짝 기울며 페이드업 | SplitText(words) + rotationX |
| `lines` | `<br>` 단위 줄이 마스크 안에서 상승 | SplitText(lines, mask) |
| `fade` / `fade-up` | 페이드 / 페이드 + 상승 | simpleFadeIn |
| `wipe` | 아래→위 clip-path 와이프 | clipPath inset |
| `sweep` | 빛이 쓸고 지나가듯 mask-gradient 리빌 | mask-gradient 슬라이스 |
| `stagger` | 자식 요소들이 순차로 페이드업 | staggerFadeIn |

조정 속성: `data-anim-delay` `data-anim-stagger` `data-anim-duration`
`data-anim-start`(예: `"top 80%"`) `data-anim-scrub`(스크롤 진행에 연동) `data-anim-once="false"`(재진입 시 재생)

현재 적용 현황: `h2/h3.display` 는 자동으로 `lines`, `.lede` 는 `words`,
프리미엄/평면/신뢰 카드의 제목·설명·수치에 `chars`/`fade-up`/`wipe` 등을 배치.

### 그 밖의 스크롤 연출

| 원본 | 구현 | 코드 |
|---|---|---|
| 히어로 스크롤 스크럽 | 배지 → 제목 → 카피 → 지표 순으로 스크롤 진행률에 연동해 흐려지고/또렷해짐, 배경 2장(조감도→투시도) 크로스페이드 | `scrollHero()` |
| clipPath 리빌 | 이미지가 아래→위로 닦이며 등장 + 줌아웃 | `mediaWipe()` (`.media[data-wipe]`) |
| textContent snap | 숫자 카운트업 | `countUp()` (`data-count`) |
| scrub 패럴랙스 | 히어로·CTA 배경, `data-parallax` 요소가 스크롤에 따라 이동 | `parallax()` |
| simpleFadeIn / staggerFadeIn | `[data-reveal]` 블록 순차 페이드업 | `fadeIn()` |

**속도 조정**: `js/anim.js` 의 `buildFX()` 안 각 기법의 `dur`·`stagger` 기본값,
`scrollHero()` 안 각 요소의 페이드 구간(0~1 스크롤 진행률 기준).

**안전장치**: GSAP 로드 실패 시 IntersectionObserver 폴백으로 가볍게 페이드,
JS 완전 비활성 시 3.5초 뒤 전체 노출, OS '동작 줄이기' 설정 시 애니메이션 없이 즉시 표시.

**속도를 바꾸고 싶다면** `js/anim.js` 안의 `duration`, `stagger` 값을 조정하세요.
글자가 위아래로 잘려 보이면 `css/style.css` 의 `.ch { padding-block }` 값을 키우면 됩니다.

**안전장치가 3중으로 걸려 있습니다.**
1. JS가 꺼져 있으면 → 애니메이션 초기 상태 자체가 적용되지 않아 전부 그냥 보입니다
2. GSAP CDN이 막히면 → `anim.js`가 가벼운 IntersectionObserver 폴백으로 대신 동작
3. 스크립트가 끝내 로드되지 않으면 → 3.5초 뒤 자동으로 전체 노출

OS에 '동작 줄이기(prefers-reduced-motion)'가 켜진 사용자는 애니메이션 없이 바로 보게 됩니다.

> GSAP는 cdnjs에서 `defer`로 불러오므로 첫 렌더링을 막지 않습니다.
> 완전 오프라인 운영이 필요하면 `gsap.min.js` / `ScrollTrigger.min.js`를
> 내려받아 `js/` 에 두고 `index.html` 의 script 경로만 바꾸면 됩니다.

## 로컬에서 미리보기

`index.html` 을 더블클릭하면 바로 열립니다.
PowerShell에서 서버로 띄우려면:

```powershell
cd "C:\Users\hh\Desktop\Bukjeonju_Gwangshin_Progress"
python -m http.server 5500
# 브라우저에서 http://localhost:5500
```

---

# ✅ 배포 전 반드시 채워야 할 항목

홈페이지에서 **노란 형광펜으로 표시된 부분**이 아직 확정되지 않은 값입니다.
(`css/style.css` 맨 아래 `.todo { ... }` 규칙을 지우면 형광펜 표시가 사라집니다.)

### 1. 연락처 · 주소

### 0. 첫 화면 이미지 — ✅ 완료

첫 화면은 **스크롤에 고정(sticky)된 채 조감도(`hero-01.jpg`) → 투시도(`hero-02.jpg`)가
스크롤 진행률에 따라 서서히 크로스페이드**되는 스크럽 연출입니다(`.shero`, `scrollHero()`).
같은 스크롤 구간에서 배지 → 제목 → 카피 → 지표가 순서대로 흐려지며 전환됩니다.

두 이미지 모두 실제 광고자료(투시도·조감도 원본)에서 추출한 이미지로 교체 완료했습니다.
`og-image.jpg`(카톡 공유 썸네일)도 조감도 기반입니다.

| 위치 | 현재 값 | 상태 |
|---|---|---|
| 담당 상담사 | 강수진 과장 | ✅ 반영됨 |
| 연락처 | 010-8114-4638 (`tel:01081144638`) | ✅ 반영됨 |
| 분양홍보관 주소 | 전북특별자치도 전주시 덕진구 호성동 2가 631-103 | ✅ 반영됨 |
| 상시 버튼 | 방문예약 · 전화통화 2개 (카카오 제거) | ✅ 반영됨 |
| 푸터 시행사 | `시행사명 입력` | ⬜ 입력 필요 |

> 상시 버튼: 데스크톱은 우측 하단에 [방문예약][전화 통화] 알약형 버튼 + 맨위로.
> 모바일은 하단 고정 바가 [전화 통화][방문예약] 를 담당하고, 플로팅은 '맨 위로'만
> 스크롤 후 표시됩니다. 카카오톡 채널은 사용하지 않으므로 제거했습니다.

### 2. 도메인 (SEO 핵심)

`index.html`, `robots.txt`, `sitemap.xml` 안의 **`https://www.example.com`** 을
실제 도메인으로 전부 바꿔야 합니다. 이 값이 틀리면 **카톡 공유 썸네일이 안 뜹니다.**

바뀌는 곳: `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image`,
JSON-LD 안의 `url` / `@id` / `image`, `robots.txt` 의 Sitemap, `sitemap.xml` 의 `<loc>`.

### 3. 법정 고지 (필수)

푸터의 **분양광고 심의필증 번호**(`제0000-00-0000호`)를 반드시 실제 번호로 교체하세요.
심의필증 없이 분양광고를 게시하면 「표시·광고의 공정화에 관한 법률」 위반 소지가 있습니다.
`privacy.html` 의 개인정보 보호책임자·수탁업체·시행일자도 함께 채워 주세요.

### 4. 이미지

`images/사진-넣는-법.md` 를 참고하세요. 사진은 **`js/photos.js`** 목록으로 관리됩니다.
`hero-01/02` · `exterior-01/02` · `community-01` · `location-map` · `mapbox` ·
`plan-84a/b` · `site-plan` · `interior-living/bedroom` 은 광고자료 실제 이미지로 채워져 있고,
전체 최적화(리사이즈·재압축)를 거쳐 `images/` 폴더가 약 3.4MB입니다.
아직 임시(가제) 이미지인 자리: `community-02`(조경·놀이터) — 시행사 원본이나 실사진으로
교체를 권장합니다. `favicon.png` / `apple-touch-icon.png` 는 브랜드 심볼("光")로 제작되어
있으며, 정식 로고가 나오면 같은 파일명으로 덮어쓰세요.

---

# 📨 방문예약 · 관심고객 등록 접수 — 구글폼

`#contact` 섹션의 신청 양식은 **구글 설문지(Google Forms)를 그대로 iframe 임베드**한 것입니다
(2026-09-22, 담당자 요청으로 자체 서버 연동 대신 구글폼으로 전환). 별도 배포·API 키·SMS 연동이
필요 없고, 응답은 구글폼 자체의 "응답" 탭 / 연결된 구글 시트에서 바로 확인할 수 있습니다.

**현재 연결된 폼**: `https://docs.google.com/forms/d/e/1FAIpQLSc6CUSFr0uLEXmbCYdDDhVcHROMbLLaH27gu60OR7q8IOqphg/viewform`
(질문 5개 — 성함·연락처·희망 방문일시·개인정보 동의[필수]·광고성 정보 수신 동의[선택])

**폼을 바꾸려면** `index.html` 의 `.gform__frame` `src` 값과, 바로 아래 `formnote`의
"새 창에서 열기" 링크 href 두 곳을 새 폼 주소로 교체하세요
(주소 끝에 `?embedded=true` 를 붙인 값을 `src` 에 사용).

**응답을 문자(SMS)로도 받고 싶다면**: 구글폼 우측 상단 종 모양 아이콘으로 이메일 알림을 켜거나,
구글폼의 "응답 → 스프레드시트에서 보기"로 연결한 구글 시트에 Apps Script 트리거를 달아
`api/apps-script.gs`(알리고 SMS 연동 참고용, 현재는 미사용)를 응용해 문자 발송을 붙일 수 있습니다.
자세한 절차는 `api/폼연동-안내.md` 참고(예전 자체 폼 연동용으로 작성된 문서라 현재 구조와는 일부 다릅니다).

---

# 🔍 SEO 체크리스트

코드에 이미 반영된 것:

- [x] 타이틀·메타디스크립션에 `북전주 광신프로그레스`, `전주 고랑동 아파트 분양`, `덕진구 아파트` 등 실검색 키워드 조합
- [x] 오픈그래프(OG) + 트위터 카드 → 카톡·문자 공유 시 썸네일
- [x] JSON-LD 구조화 데이터 (ApartmentComplex / RealEstateAgent / FAQPage / Organization)
- [x] `geo.*` 메타 (지역 검색 대응)
- [x] robots.txt · sitemap.xml (이미지 사이트맵 포함)
- [x] 모바일 우선 반응형 + 하단 고정 CTA 바
- [x] 라이브러리 0개, 이미지 `loading="lazy"`, 폰트 `preconnect`
- [x] 이미지 전체 리사이즈·재압축 완료 (`images/` 약 3.4MB, 장당 대부분 400KB 이하)
- [x] 시맨틱 마크업 (h1 1개 · section별 h2) + 모든 이미지 `alt`

직접 하셔야 하는 것:

- [ ] **네이버 서치어드바이저** 사이트 등록 + 사이트맵 제출 → `naver-site-verification` 값 입력
- [ ] **구글 서치콘솔** 등록 → `google-site-verification` 값 입력
- [ ] **네이버 플레이스**에 분양홍보관을 업체로 등록 ← *지역 검색 유입의 가장 큰 통로*
- [ ] **카카오맵**에 장소 등록 (`geo.position` 좌표와 일치시킬 것)
- [ ] 네이버 블로그·카페 포스팅에서 홈페이지로 링크 (지역 부동산 검색은 네이버 비중이 절대적)

> ⚠️ **키워드 한 가지 확인 필요**
> 요청 주신 키워드 중 **"평화동"** 은 전주시 *완산구*이고, 본 사업지는 *덕진구 고랑동*입니다.
> 실제 위치와 다른 지역명을 키워드에 넣으면 검색 품질 평가에서 불리하고
> 표시·광고 심의에서도 문제가 될 수 있어 **의도적으로 제외**했습니다.
> 광신종합건설의 다른 사업지(전주 평화동)와 혼동하신 것이라면 알려주세요.
> 대신 `북전주`, `고랑동`, `덕진구`, `반월동`, `여의동`, `전주IC`, `탄소산단` 계열을 넣었습니다.

---

# 🎨 디자인 커스터마이징

색상·폰트는 `css/style.css` 최상단 `:root` 에 모여 있습니다.

```css
--ink:   #121717;   /* 기본 다크 */
--green: #254441;   /* 딥 그린 섹션 */
--sand:  #e7e1dc;   /* 웜 베이지 배경 */
--brand: #f5c400;   /* 광신 시그니처 옐로우 (버튼·강조) */
```

한 줄만 바꾸면 사이트 전체에 반영됩니다.

---

# 📌 참고

- 본 홈페이지의 수치·문구는 `(26.03.31) 북전주광신프로그레스 공동주택 상담사 교육자료.pdf` 를 근거로 작성했습니다.
- PDF 19p 헤더의 “29층 고층설계” 표기는 사업개요(4p)의 “지상 22층”과 상충하여, **사업개요 기준(22층)**을 채택했습니다. 확인 후 필요 시 수정하세요.
- 주변 개발계획(탄소산단·도시숲·MICE)은 모두 “예정/계획” 표기와 면책 문구를 함께 넣었습니다. 임의로 단정 표현으로 바꾸지 마세요 — 허위·과장광고 소지가 있습니다.
