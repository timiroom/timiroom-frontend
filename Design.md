# Align-it Design System

> **Midnight Warm** — Obsidian × Google Anti-Gravity  
> 웜 그레이 베이스 위에 딥 블랙 포인트를 올린 미니멀 모노크롬 시스템.  
> 랜딩 페이지는 라이트 테마, 대시보드는 동일 토큰을 공유하는 반(半)다크 테마로 운용한다.

---

## 1. Color Tokens

### 1-1. Base Palette

모든 색상의 근간이 되는 6개 원시 토큰. `theme.css`와 `landing.css` 양쪽 `:root`에 동일하게 선언된다.

| Token | Value | 용도 |
|---|---|---|
| `--bg` | `#f7f6f3` | 페이지 배경 (warm off-white) |
| `--surface` | `#ffffff` | 카드·패널 표면 |
| `--border` | `#e4e2db` | 기본 구분선 |
| `--border-2` | `#d0cec6` | 강조 구분선 (hover 등) |
| `--text-1` | `#1a1916` | Primary text — 제목·CTA·아이콘 |
| `--text-2` | `#6b6960` | Secondary text — 설명·레이블 |
| `--text-3` | `#a8a69f` | Muted text — placeholder·힌트 |

```css
/* 사용 예 */
color: var(--text-1);
background: var(--bg);
border: 1px solid var(--border);
```

---

### 1-2. Gradient Presets

| Token | Value | 용도 |
|---|---|---|
| `--grad-purple` | `135deg, #6b6960 → #1a1916` | Primary CTA, 버튼, 강조 영역 |
| `--grad-hero` | `160deg, #fbfbfa → #d0cec6` | Hero 섹션 배경 |
| `--grad-dark` | `135deg, #2b2a25 → #1a1916` | 다크 카드 배경 |
| `--grad-cta` | `= grad-purple` | FooterCTA 섹션 배경 |

---

### 1-3. Status Colors (Dashboard)

대시보드 배지·상태 표시에만 사용하는 시맨틱 컬러 셋.

| Token | Hex | 배경 Token |
|---|---|---|
| `--db-green` | `#10B981` | `rgba(16,185,129,.12)` |
| `--db-blue` | `#3B82F6` | `rgba(59,130,246,.12)` |
| `--db-orange` | `#F59E0B` | `rgba(245,158,11,.12)` |
| `--db-red` | `#EF4444` | `rgba(239,68,68,.12)` |
| `--db-pink` | `#EC4899` | `rgba(236,72,153,.12)` |

> **규칙**: 상태 컬러는 `color: var(--db-green)` + `background: var(--db-green-bg)` 쌍으로만 사용한다.  
> 단독으로 배경에 full opacity 적용 금지.

---

### 1-4. Dashboard Accent Ramp

Base Palette의 `--text-1`을 루트로 하는 8단계 다크 스케일.

| Token | Value |
|---|---|
| `--db-purple-900` | `#1a1916` |
| `--db-purple-800` | `#2b2a25` |
| `--db-purple-700` | `#3c3a33` |
| `--db-purple-600` | `#4d4a42` |
| `--db-purple-500` / `400` | `= --text-2` |
| `--db-purple-300` | `= --text-3` |
| `--db-purple-200` | `= --border-2` |
| `--db-purple-100` | `= --border` |

---

## 2. Typography

### 2-1. Font Stack

```css
font-family: 'Pretendard', 'Noto Sans KR',
             -apple-system, BlinkMacSystemFont,
             'SF Pro Display', 'Segoe UI', sans-serif;
```

- **Primary**: Pretendard (가변 폰트, 한영 혼용 최적)
- **Fallback**: Noto Sans KR → 시스템 폰트 순서로 적용
- `-webkit-font-smoothing: antialiased` 전역 적용

### 2-2. Type Scale

| 용도 | Size | Weight | Letter-spacing |
|---|---|---|---|
| Hero 제목 | `clamp(48px, 7vw, 80px)` | 800 | `-0.035em` |
| Section 제목 | `clamp(32px, 4.5vw, 52px)` | 800 | `-0.025em` |
| Agent Card 제목 | `clamp(32px, 4vw, 44px)` | 800 | `-0.03em` |
| Sub Section 제목 | `clamp(28px, 4vw, 46px)` | 800 | `-0.02em` |
| Hero 통계 숫자 | `30px` | 900 | `-0.03em` |
| Metric 숫자 | `44px` | 900 | `-0.04em` |
| Body (hero sub) | `clamp(16px, 2vw, 20px)` | 400 | — |
| Body (설명) | `17px` | 400 | — |
| Small (캡션·레이블) | `13–14px` | 500–600 | — |
| Eyebrow | `13px` | 700 | `0.08em` |
| Badge | `11–12px` | 600–700 | `0.03em` |

### 2-3. Line Height

| 상황 | `line-height` |
|---|---|
| 제목 (Hero·Section) | `1.12 – 1.2` |
| 본문 설명 | `1.75 – 1.8` |
| 컴팩트 UI (배지·태그) | `1` |
| 전역 기본값 | `1.6` |

---

## 3. Spacing & Layout

### 3-1. Container

```css
.al-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;   /* mobile: 0 20px */
}
```

### 3-2. Section Padding

| 컴포넌트 | `padding` |
|---|---|
| 기본 섹션 (`.al-section`) | `100px 0` |
| Features (에이전트 카드) | `120px 0` |
| How It Works | `100px 0` |
| Mobile `≤ 640px` | `64px 0` |

### 3-3. Border Radius

| Token | Value | 용도 |
|---|---|---|
| `--radius` / `--db-radius` | `12px` | 기본 카드·입력창 |
| `--radius-lg` / `--db-radius-lg` | `16–24px` | 대형 카드·모달 |
| `--radius-xl` / `--db-radius-xl` | `24px` | 대형 팝업 |
| `--radius-pill` | `33px` | Pill 버튼 |
| `100px` | 인라인 값 | 배지·태그·칩 (원형) |

---

## 4. Shadows & Effects

### 4-1. Shadow Scale

```css
--shadow-sm:  0 2px 8px rgba(0,0,0,.05);
--shadow-md:  0 8px 32px rgba(0,0,0,.08);
--shadow-lg:  0 20px 60px rgba(0,0,0,.10);

/* 버튼 전용 */
--shadow-btn-purple: 0 4px 8px rgba(0,0,0,.10),
                     0 12px 17px rgba(0,0,0,.05);
--shadow-btn-white:  0 2px 4px rgba(0,0,0,.05),
                     0 12px 17px rgba(0,0,0,.08);

/* Hero 목업 */
box-shadow: 0 40px 100px rgba(26,25,22,.18),
            0 0 0 1px rgba(26,25,22,.07);
```

### 4-2. Dashboard Shadow Scale

```css
--db-glow-sm:   0 2px 8px rgba(0,0,0,.05);
--db-glow-md:   0 4px 16px rgba(0,0,0,.08);
--db-glow-lg:   0 8px 32px rgba(0,0,0,.10);
--db-glow-node: 0 2px 12px rgba(0,0,0,.10);
```

### 4-3. Glassmorphism

다크 배경 위 오버레이·플로팅 패널에 사용.

```css
.db-glass {
  background: rgba(247, 246, 243, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--db-border);
  border-radius: var(--db-radius-lg);
}
```

FooterCTA의 글래스 버튼:
```css
.al-pill-glass {
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.5);
}
```

---

## 5. Components

### 5-1. Buttons

#### Pill Primary (주요 CTA)
```css
.al-pill-purple {
  padding: 18px 36px;
  border-radius: var(--radius-pill);   /* 33px */
  background: var(--grad-purple);
  color: white;
  font-size: 16px; font-weight: 700;
  box-shadow: var(--shadow-btn-purple);
}
.al-pill-purple:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(26,25,22,.5);
}
```

#### Pill White (보조 CTA)
```css
.al-pill-white {
  padding: 18px 36px;
  border-radius: var(--radius-pill);
  background: white;
  border: 1.5px solid var(--border);
  color: var(--text-1);
  font-size: 16px; font-weight: 600;
}
.al-pill-white:hover {
  transform: translateY(-2px);
  background: var(--bg);
  border-color: var(--border-2);
}
```

#### Pill Glass (다크 배경 위)
```css
.al-pill-glass {
  padding: 18px 40px;
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.5);
  color: var(--text-1);
  font-size: 18px; font-weight: 700;
}
```

#### Outline Button (Navbar)
```css
.al-btn-outline {
  padding: 10px 22px;
  border-radius: 10px;
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--text-1);
  font-size: 14px; font-weight: 600;
}
```

> **공통 규칙**: 모든 버튼은 `transition: all .25s ease` 적용.  
> hover 시 `translateY(-2px)` + shadow 강화가 기본 패턴.

---

### 5-2. Badges & Chips

#### Status Badge (대시보드)
```css
.db-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 700; letter-spacing: .03em;
}
/* 사용 예 */
<span class="db-badge db-badge-green">
  <span class="db-badge-dot"></span>진행중
</span>
```

#### Eyebrow Label (섹션 헤더)
```css
.al-section-eyebrow {
  font-size: 13px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase;
  color: var(--text-1);
}
/* ::before — 24px × 2px 라인 장식 자동 삽입 */
```

#### Tech Chip (TrustSection)
```css
.al-tech-chip {
  padding: 8px 20px; border-radius: 100px;
  border: 1.5px solid var(--border);
  font-size: 13px; font-weight: 600; color: var(--text-2);
}
```

#### Agent Card Badge
```css
.al-agent-card-badge {
  background: #0b0f14; color: white;
  padding: 7px 16px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
}
```

---

### 5-3. Cards

#### Agent Card (Features 섹션)
```css
.al-agent-card {
  display: grid;
  grid-template-columns: 480px 1fr;   /* 텍스트 | 비주얼 */
  min-height: 380px;
  border-radius: var(--radius-lg);    /* 24px */
  box-shadow: 0 8px 40px rgba(26,25,22,.10);
  border: 1px solid rgba(26,25,22,.08);
}
.al-agent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(26,25,22,.18);
}
```

비주얼 영역 배경 프리셋:
```css
.v-purple { background: linear-gradient(135deg, #e4e2db, #d0cec6); }
.v-blue   { background: linear-gradient(135deg, #dbeafe, #93c5fd); }
.v-green  { background: linear-gradient(135deg, #d1fae5, #6ee7b7); }
```

#### Step Card (HowItWorks)
```css
.al-step {
  background: white;
  border-radius: var(--radius-lg);
  padding: 36px 28px;
  border: 1.5px solid var(--border);
}
.al-step:hover {
  border-color: var(--border-2);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}
```

Step 번호 아이콘:
```css
.al-step-num {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--grad-purple);
  color: white; font-size: 16px; font-weight: 800;
}
```

#### Dashboard Surface Card
```css
.db-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--db-radius-lg);
}
.db-card:hover {
  border-color: var(--border-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,.3);
}
```

---

### 5-4. Navbar

```
높이: 68px | position: fixed | z-index: 1000
배경: rgba(255,255,255,0.90) + backdrop-filter: blur(24px)
스크롤 시 (.scrolled): border-bottom 활성화 + subtle shadow
```

로고 아이콘: `34×34px`, `border-radius: 10px`, `background: var(--grad-purple)`

---

### 5-5. Hero Mockup

파이프라인 시뮬레이션 UI 구조:

```
al-hero-mockup
├── al-mockup-bar         — macOS 트래픽 신호등 + 제목 바
│   ├── al-dot-r (#ff5f57)
│   ├── al-dot-y (#ffbd2e)
│   └── al-dot-g (#28ca41)
├── al-mockup-body        — background: #fafafe
│   ├── al-pipeline       — 파이프라인 행 목록
│   │   └── al-pipe-row   — [레이블 56px] + [노드들]
│   ├── al-mock-prog      — 정합성 스코어 프로그레스 바
│   └── al-mock-tags      — 기술 태그 뱃지
```

---

### 5-6. Scroll Progress Bar

```css
.al-progress {
  position: fixed; top: 0; left: 0; height: 3px;
  background: var(--grad-purple);
  z-index: 2000;
}
```

---

## 6. Animation System

### 6-1. Scroll Reveal (Landing)

```css
/* 초기 상태 */
.al-anim {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity .65s ease, transform .65s ease;
}
/* 트리거 후 */
.al-anim.visible {
  opacity: 1;
  transform: none;
}

/* 방향 변형 */
.al-anim.slide-l  { transform: translateX(-30px); }
.al-anim.slide-r  { transform: translateX(30px); }
.al-anim.fade-only{ transform: none; }

/* 딜레이 클래스 */
.al-d1 { transition-delay: .08s; }
.al-d2 { transition-delay: .16s; }
.al-d3 { transition-delay: .24s; }
.al-d4 { transition-delay: .32s; }
.al-d5 { transition-delay: .40s; }
```

### 6-2. Keyframe Library

| 이름 | 효과 | 주요 사용처 |
|---|---|---|
| `pulseDot` | scale + opacity 펄스 | Hero 배지 점 |
| `logoScroll` | translateX 무한 스크롤 | TrustSection 기술 칩 |
| `db-fade-up` | 위로 페이드인 | 대시보드 카드 |
| `db-slide-in` | 왼쪽에서 슬라이드 | 대시보드 패널 |
| `db-float` | 위아래 부유 | 배경 Orb |
| `db-pulse` | scale + opacity | 상태 표시 점 |
| `db-spin` | 360° 회전 | 로딩 스피너 |
| `db-shimmer` | 배경 위치 이동 | 스켈레톤 로딩 |
| `db-edge-flow` | stroke-dashoffset | KnowledgeGraph 엣지 |
| `db-node-appear` | opacity + r(circle) | KnowledgeGraph 노드 |

### 6-3. Transition Presets (Dashboard)

```css
--db-transition:      all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--db-transition-slow: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 7. Layout System

### 7-1. Dashboard 4-Panel Layout

```
┌─────────────────────────────────────────────────────┐
│ ActivityBar │  ContextPanel  │     Main Content      │
│   56px      │    260px       │       flex: 1         │
│  (아이콘)   │  (프로젝트 목록│  AgentPanel / PrdPanel│
│             │   / 커밋)      │  / ApiSpecPanel       │
│             │                │  / DocPanel           │
└─────────────────────────────────────────────────────┘
```

- `height: 100vh`, `overflow: hidden`
- `font-family`: 전역 Pretendard 스택 적용

### 7-2. Document View Split Layout (PrdPanel 등)

```
┌──────────────────────────┬──────────────┐
│   Markdown Editor        │  AI Chat     │
│   (flex: 1)              │  Sidebar     │
│                          │  (340px)     │
└──────────────────────────┴──────────────┘
```

### 7-3. Landing Page Grid

| 섹션 | 그리드 |
|---|---|
| Features (에이전트 카드) | `flex column` (full-width 카드 × 3) |
| HowItWorks (스텝) | `grid 4열` → `2열 → 1열` |
| TechStack | `2열 (텍스트 | 그리드)` → `1열` |
| Metrics | `4열` → `2열` |
| Footer | `2fr 1fr 1fr 1fr` → `1fr 1fr` → `1fr` |

---

## 8. Responsive Breakpoints

| Breakpoint | 적용 변경 |
|---|---|
| `≤ 1024px` | Agent 카드 1열, HowItWorks 2열, Metrics 2열, Footer 2열 |
| `≤ 768px` | Agent 카드 body 패딩 축소, HowItWorks 1열 |
| `≤ 640px` | Container padding `20px`, Navbar 링크 숨김, Section padding `64px` |

---

## 9. Scrollbar Style

```css
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: #3c3a33; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-2); }
```

---

## 10. Design Principles

1. **모노크롬 우선** — 색상 포인트 없이 명도·농도 차이만으로 계층을 표현한다. 시맨틱 컬러(green·blue·red)는 상태 전달 목적으로만 제한 사용.

2. **Warm Neutral** — 순백·순흑 대신 웜 오프화이트(`#f7f6f3`)와 웜 블랙(`#1a1916`)을 기반으로 전체 팔레트를 구성. 차갑고 딱딱한 느낌을 방지.

3. **Elevation = Border + Shadow** — 컴포넌트 계층은 배경색 변화가 아닌 border(opacity 조절)와 shadow(강도 조절)의 조합으로 표현.

4. **Hover = lift** — 인터랙티브 요소의 hover 상태는 `translateY(-2px ~ -4px)` + shadow 강화 패턴을 일관되게 적용.

5. **Pill CTA** — 주요 행동 유도 버튼은 항상 `border-radius: 33px` pill 형태. 보조 액션은 `border-radius: 10–12px` 사각형.

6. **Glassmorphism은 다크 배경 한정** — `backdrop-filter: blur`는 FooterCTA·대시보드 오버레이처럼 어두운 배경 위에서만 사용. 라이트 배경 위에서는 사용하지 않는다.
