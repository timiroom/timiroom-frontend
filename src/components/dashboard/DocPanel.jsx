"use client";

/**
 * DocPanel.jsx
 * ------------
 * 기능 명세서 / ERD 명세서 / QA 뷰에서 사용하는 범용 마크다운 에디터 패널.
 *
 * 왼쪽: 마크다운 에디터 + 미리보기 토글
 * 오른쪽: AiChatSidebar
 *
 * Props:
 *   project   현재 선택된 프로젝트
 *   view      "features" | "erd" | "qa"
 */

import { useState } from "react";
import { AiChatSidebar } from "./AiChatSidebar";

const C = {
  bg:        "#212121",
  surface:   "#1a1a1a",
  editor:    "#1e1e1e",
  border:    "rgba(255,255,255,0.07)",
  text:      "#ececec",
  muted:     "#8b8b8b",
  sub:       "#555",
  accent:    "#a78bfa",
  accentBg:  "rgba(167,139,250,0.1)",
  accentBdr: "rgba(167,139,250,0.25)",
};

/* ── 뷰별 레이블 ── */
const VIEW_META = {
  features: { label: "기능 명세서", color: "#34d399", colorBg: "rgba(52,211,153,0.1)", colorBdr: "rgba(52,211,153,0.25)" },
  erd:      { label: "ERD 명세서",  color: "#60a5fa", colorBg: "rgba(96,165,250,0.1)",  colorBdr: "rgba(96,165,250,0.25)"  },
  qa:       { label: "QA",          color: "#fb923c", colorBg: "rgba(251,146,60,0.1)",  colorBdr: "rgba(251,146,60,0.25)"  },
};

/* ══════════════════════════════════════
   뷰별 AI 초안 마크다운
══════════════════════════════════════ */
const MOCK_DRAFTS = {
  features: `# 기능 명세서 v1.0

작성일: 2025-03-05 | 작성자: 기획팀 | 상태: AI 초안

---

## 1. 인증 및 사용자 관리

### 1.1 소셜 로그인 [Must]

- Google OAuth 2.0을 통한 소셜 로그인
- JWT 액세스 토큰 발급 (만료: 1시간)
- 리프레시 토큰 발급 (만료: 7일)
- 로그아웃 및 토큰 무효화

### 1.2 사용자 프로필 [Must]

- 프로필 정보 조회 (이름, 이메일, 프로필 이미지)
- 프로필 이미지 소셜 계정에서 자동 동기화

---

## 2. 프로젝트 관리

### 2.1 프로젝트 CRUD [Must]

- 프로젝트 생성 (이름, 설명, 색상 설정)
- 프로젝트 목록 조회 (생성일 최신순)
- 프로젝트 상세 정보 조회
- 프로젝트 수정 (이름, 설명, 상태, 색상)
- 프로젝트 삭제 (소프트 삭제)

### 2.2 프로젝트 상태 관리 [Must]

- 상태 구분: draft / active / completed / archived
- 상태별 필터링 및 정렬
- 정합성 스코어(0-100) 표시

---

## 3. 멀티 에이전트 파이프라인

### 3.1 파이프라인 실행 [Must]

- Search Agent: 시장 조사 및 경쟁사 분석 자동화
- PM Agent: 기능 목록 추출 및 MoSCoW 분류
- PRD Agent: 요구사항 정의서 자동 생성
- API Agent: OpenAPI 3.0 명세 자동 생성
- DB Agent: ERD 스키마 자동 설계
- QA Agent: 테스트 케이스 자동 생성

### 3.2 실행 상태 추적 [Must]

- 에이전트별 진행 상태 실시간 업데이트
- 전체 파이프라인 진행률 표시 (0-100%)
- 실행 로그 및 오류 메시지 제공

---

## 4. 명세서 편집 및 내보내기

### 4.1 마크다운 에디터 [Must]

- 마크다운 직접 편집 지원
- 실시간 미리보기
- AI 초안 자동 삽입

### 4.2 내보내기 [Should]

- Markdown (.md) 내보내기
- PDF 내보내기
- JSON (API 명세) 내보내기

---

## 5. 정합성 검증

### 5.1 자동 검증 [Must]

- 기능 명세 ↔ API 명세 정합성 체크
- API 명세 ↔ DB 스키마 정합성 체크
- 정합성 스코어 산출 및 이슈 리포트 생성

### 5.2 이슈 관리 [Should]

- 이슈 목록 조회 및 심각도 분류
- 수정 제안 자동 생성
- 이슈 해결 후 재검증
`,

  erd: `# ERD 명세서 v1.0

작성일: 2025-03-05 | 작성자: 개발팀 | 상태: AI 초안

---

## 1. 데이터베이스 개요

- **RDBMS**: PostgreSQL 16
- **그래프 DB**: Neo4j Community Edition
- **Charset**: UTF-8

---

## 2. 테이블 정의

### 2.1 users

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 사용자 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 |
| name | VARCHAR(100) | NOT NULL | 이름 |
| oauth_provider | VARCHAR(50) | NOT NULL | OAuth 제공사 (google) |
| oauth_id | VARCHAR(255) | NOT NULL | OAuth 고유 ID |
| profile_image_url | TEXT | NULL | 프로필 이미지 URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일 |

### 2.2 projects

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 프로젝트 ID |
| user_id | BIGINT | FK → users.id | 소유 사용자 |
| name | VARCHAR(200) | NOT NULL | 프로젝트 이름 |
| description | TEXT | NULL | 설명 |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | 상태 |
| color | VARCHAR(10) | DEFAULT '#7C3AED' | 대표 색상 |
| consistency_score | INT | DEFAULT 0 | 정합성 스코어 (0-100) |
| progress | INT | DEFAULT 0 | 진행률 (0-100) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일 |

### 2.3 documents

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 문서 ID |
| project_id | BIGINT | FK → projects.id | 소속 프로젝트 |
| type | VARCHAR(20) | NOT NULL | prd / features / api / erd / qa |
| content | TEXT | NULL | 마크다운 내용 |
| version | INT | NOT NULL, DEFAULT 1 | 버전 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정일 |

### 2.4 pipeline_runs

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | VARCHAR(36) | PK | UUID |
| project_id | BIGINT | FK → projects.id | 소속 프로젝트 |
| status | VARCHAR(20) | NOT NULL | pending / running / completed / failed |
| progress | INT | DEFAULT 0 | 진행률 (0-100) |
| current_agent | VARCHAR(50) | NULL | 현재 실행 중인 에이전트 |
| started_at | TIMESTAMP | NULL | 시작 시각 |
| completed_at | TIMESTAMP | NULL | 완료 시각 |

---

## 3. 관계 정의

- **users** 1 : N **projects** (user_id FK)
- **projects** 1 : N **documents** (project_id FK)
- **projects** 1 : N **pipeline_runs** (project_id FK)

---

## 4. 인덱스

- users: email (UNIQUE), oauth_provider + oauth_id (UNIQUE)
- projects: user_id, status, created_at DESC
- documents: project_id + type (UNIQUE)
- pipeline_runs: project_id, status, started_at DESC

---

## 5. Neo4j 그래프 스키마

### 5.1 노드 레이블

- **Feature**: 기능 노드 (id, name, priority)
- **Endpoint**: API 엔드포인트 노드 (id, method, path)
- **Entity**: DB 엔티티 노드 (id, tableName)
- **TestCase**: QA 테스트 케이스 노드 (id, title)

### 5.2 관계 타입

- Feature -[IMPLEMENTS]→ Endpoint
- Endpoint -[READS | WRITES]→ Entity
- Feature -[TESTED_BY]→ TestCase
- TestCase -[COVERS]→ Endpoint
`,

  qa: `# QA 시나리오 v1.0

작성일: 2025-03-08 | 작성자: QA팀 | 상태: AI 초안

---

## 1. 인증 테스트

### TC-001: Google OAuth 로그인 성공

- **전제조건**: 유효한 Google 계정 보유
- **입력**: Google 로그인 버튼 클릭 → Google 인증 완료
- **기대 결과**: JWT 토큰 발급, /dashboard 리다이렉트
- **우선순위**: 높음

### TC-002: 유효하지 않은 JWT 토큰으로 API 접근

- **전제조건**: 만료된 또는 변조된 JWT 토큰 보유
- **입력**: Authorization: Bearer {invalid_token} 헤더로 /api/projects 요청
- **기대 결과**: 401 Unauthorized 응답
- **우선순위**: 높음

### TC-003: JWT 토큰 만료 후 재발급

- **전제조건**: 만료된 액세스 토큰, 유효한 리프레시 토큰 보유
- **입력**: 만료된 토큰으로 API 요청 → 토큰 갱신 요청
- **기대 결과**: 새 액세스 토큰 발급 성공
- **우선순위**: 높음

---

## 2. 프로젝트 관리 테스트

### TC-004: 프로젝트 생성 성공

- **전제조건**: 인증된 사용자
- **입력**: name: "테스트 프로젝트", description: "설명", status: "draft"
- **기대 결과**: 201 Created, 생성된 프로젝트 객체 반환
- **우선순위**: 높음

### TC-005: 프로젝트 이름 없이 생성 시도

- **전제조건**: 인증된 사용자
- **입력**: name: "" (빈 문자열)
- **기대 결과**: 400 Bad Request, 오류 메시지 포함
- **우선순위**: 중간

### TC-006: 타인의 프로젝트 수정 시도

- **전제조건**: 다른 사용자의 프로젝트 ID 보유
- **입력**: PATCH /api/projects/{otherId}
- **기대 결과**: 403 Forbidden 또는 404 Not Found
- **우선순위**: 높음

### TC-007: 프로젝트 삭제 후 조회

- **전제조건**: 기존 프로젝트 존재
- **입력**: DELETE /api/projects/{id} 후 GET /api/projects/{id}
- **기대 결과**: 204 No Content 후 404 Not Found
- **우선순위**: 중간

---

## 3. 파이프라인 테스트

### TC-008: 파이프라인 실행 성공

- **전제조건**: 유효한 프로젝트, LLM API 키 설정
- **입력**: POST /api/pipeline/run (projectId, agents, prdContent)
- **기대 결과**: 202 Accepted, pipelineId 반환
- **우선순위**: 높음

### TC-009: 빈 PRD로 파이프라인 실행

- **전제조건**: 유효한 프로젝트
- **입력**: prdContent: "" (빈 문자열)
- **기대 결과**: 400 Bad Request 또는 빈 결과 반환
- **우선순위**: 중간

### TC-010: 파이프라인 실행 상태 폴링

- **전제조건**: 실행 중인 파이프라인 존재
- **입력**: GET /api/pipeline/{pipelineId}/status (5초 간격 5회)
- **기대 결과**: status 값이 pending → running → completed 순으로 변화
- **우선순위**: 높음

---

## 4. 정합성 검증 테스트

### TC-011: 기능-API 정합성 검증

- **전제조건**: 기능 명세서 및 API 명세서 존재
- **입력**: 정합성 검증 실행
- **기대 결과**: 정합성 스코어 0-100 반환, 이슈 목록 포함
- **우선순위**: 높음

### TC-012: 명세서 불일치 시 이슈 탐지

- **전제조건**: API 명세에 없는 기능이 기능 명세에 존재
- **입력**: 정합성 검증 실행
- **기대 결과**: 해당 불일치 이슈가 이슈 목록에 포함
- **우선순위**: 높음

---

## 5. 회귀 테스트 체크리스트

- [ ] Google OAuth 로그인 플로우 정상 동작
- [ ] 프로젝트 CRUD 전체 플로우 정상 동작
- [ ] 파이프라인 실행 및 상태 추적 정상 동작
- [ ] API 응답 스키마 변경 없음 확인
- [ ] 정합성 스코어 계산 로직 회귀 없음
`,
};

/* ══════════════════════════════════════
   마크다운 렌더러 (PrdPanel과 동일)
══════════════════════════════════════ */
function esc(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function inlineFormat(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       `<code style="background:rgba(167,139,250,0.15);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em;color:#c4b5fd;">$1</code>`)
    .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" style="color:#a78bfa;">$1</a>`);
}
function renderMarkdown(raw) {
  const lines  = raw.split("\n");
  const out    = [];
  let inUL     = false;
  let inOL     = false;
  let inCode   = false;
  let codeBuf  = [];

  function closeList() {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (!inCode) { closeList(); inCode = true; codeBuf = []; continue; }
      out.push(`<pre style="background:#1a1a1a;padding:12px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);overflow-x:auto;margin:12px 0;"><code style="font-family:monospace;font-size:13px;color:#c4b5fd;">${esc(codeBuf.join("\n"))}</code></pre>`);
      inCode = false; codeBuf = []; continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (/^---+$/.test(line.trim())) { closeList(); out.push(`<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;"/>`); continue; }
    if (line.trim() === "") { closeList(); out.push("<br/>"); continue; }

    if (line.startsWith("### ")) { closeList(); out.push(`<h3 style="font-size:16px;font-weight:600;color:#d4d4d4;margin:16px 0 6px;">${inlineFormat(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## "))  { closeList(); out.push(`<h2 style="font-size:20px;font-weight:700;color:#ececec;margin:22px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.07);">${inlineFormat(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# "))   { closeList(); out.push(`<h1 style="font-size:28px;font-weight:900;color:#ececec;margin:0 0 12px;line-height:1.25;">${inlineFormat(line.slice(2))}</h1>`); continue; }

    if (line.startsWith("> ")) { closeList(); out.push(`<blockquote style="border-left:3px solid #a78bfa;margin:8px 0;padding:8px 14px;background:rgba(167,139,250,0.07);border-radius:0 6px 6px 0;font-style:italic;color:#9ca3af;">${inlineFormat(line.slice(2))}</blockquote>`); continue; }

    if (/^[-*] /.test(line)) {
      if (inOL) { out.push("</ol>"); inOL = false; }
      if (!inUL) { out.push(`<ul style="padding-left:20px;margin:6px 0;">`); inUL = true; }
      out.push(`<li style="color:#d4d4d4;font-size:14px;line-height:1.75;margin:2px 0;">${inlineFormat(line.replace(/^[-*] /,""))}</li>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      if (inUL) { out.push("</ul>"); inUL = false; }
      if (!inOL) { out.push(`<ol style="padding-left:22px;margin:6px 0;">`); inOL = true; }
      out.push(`<li style="color:#d4d4d4;font-size:14px;line-height:1.75;margin:2px 0;">${inlineFormat(line.replace(/^\d+\. /,""))}</li>`);
      continue;
    }

    /* 테이블 행 */
    if (line.startsWith("|")) {
      closeList();
      if (/^\|[-| ]+\|$/.test(line)) { continue; } // 구분선 행 스킵
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      out.push(`<tr>${cells.map(c => `<td style="padding:6px 12px;border:1px solid rgba(255,255,255,0.1);font-size:13px;color:#d4d4d4;">${inlineFormat(c)}</td>`).join("")}</tr>`);
      continue;
    }

    closeList();
    out.push(`<p style="color:#d4d4d4;font-size:14px;line-height:1.75;margin:4px 0;">${inlineFormat(line)}</p>`);
  }

  closeList();

  // 테이블 행 감싸기
  let html = out.join("");
  html = html.replace(/(<tr>.*?<\/tr>)+/gs, match =>
    `<table style="border-collapse:collapse;width:100%;margin:12px 0;">${match}</table>`
  );
  return html;
}

/* ══════════════════════════════════════
   마크다운 에디터
══════════════════════════════════════ */
function MarkdownEditor({ value, onChange, editorId }) {
  const [preview, setPreview] = useState(false);

  function insertAt(before, after = "") {
    const ta = document.getElementById(editorId);
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    }, 0);
  }

  const toolbarBtns = [
    { label: "H1", action: () => insertAt("# ")    },
    { label: "H2", action: () => insertAt("## ")   },
    { label: "H3", action: () => insertAt("### ")  },
    { label: "B",  action: () => insertAt("**","**"), bold: true   },
    { label: "I",  action: () => insertAt("*","*"),   italic: true },
    { label: "`",  action: () => insertAt("`","`"),   mono: true   },
    { label: "—",  action: () => insertAt("\n---\n") },
    { label: "• ", action: () => insertAt("- ")    },
    { label: "1.", action: () => insertAt("1. ")   },
    { label: "> ", action: () => insertAt("> ")    },
  ];

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 툴바 */}
      <div style={{
        height: 38, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 2,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        {toolbarBtns.map((btn, i) => (
          <button
            key={i}
            onMouseDown={e => { e.preventDefault(); btn.action(); }}
            style={{
              minWidth: 28, height: 26, borderRadius: 5,
              border: "none", background: "none", cursor: "pointer",
              color: C.muted, fontSize: btn.bold ? 13 : 12,
              fontWeight: btn.bold ? 800 : 600,
              fontStyle: btn.italic ? "italic" : "normal",
              fontFamily: btn.mono ? "monospace" : "inherit",
              padding: "0 4px", transition: "all 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.muted; }}
          >
            {btn.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: C.sub, marginRight: 8 }}>
          {wordCount} 단어
        </span>

        <button
          onClick={() => setPreview(v => !v)}
          style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: preview ? C.accentBg : "rgba(255,255,255,0.05)",
            border: `1px solid ${preview ? C.accentBdr : C.border}`,
            color: preview ? C.accent : C.muted,
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {preview ? "✏️ 편집" : "👁 미리보기"}
        </button>
      </div>

      {/* 에디터 or 미리보기 */}
      {preview ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "36px 56px", background: C.bg }}>
          <div
            style={{ maxWidth: 700, margin: "0 auto" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value || "") }}
          />
        </div>
      ) : (
        <textarea
          id={editorId}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`# 제목\n\n내용을 마크다운으로 작성하세요...\n\n## 섹션 제목\n\n- 목록 항목\n\n> 인용구\n\n**굵게** *기울임* \`코드\``}
          spellCheck={false}
          style={{
            flex: 1, background: C.editor, border: "none", outline: "none",
            color: "#cdd3db",
            fontSize: 14, lineHeight: 1.8,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            resize: "none", padding: "36px 56px",
            boxSizing: "border-box", overflowY: "auto", tabSize: 2,
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   DOC PANEL (exported)
══════════════════════════════════════ */
export function DocPanel({ project, view }) {
  const meta = VIEW_META[view] || VIEW_META.features;
  const draft = MOCK_DRAFTS[view] || "";

  const [markdown, setMarkdown] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  function applyDraft() {
    setMarkdown(draft.trim());
    setHasDraft(true);
  }

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg,
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 왼쪽: 마크다운 에디터 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 상단 바 */}
        <div style={{
          height: 48, flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 8,
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}>
          {project && (
            <>
              <div style={{
                width: 20, height: 20, borderRadius: 5,
                background: `${project.color || "#7C3AED"}22`,
                border: `1px solid ${project.color || "#7C3AED"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900, color: project.color || "#a78bfa",
              }}>
                {(project.name || "P").charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{project.name}</span>
              <span style={{ fontSize: 13, color: C.sub }}>›</span>
            </>
          )}
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: meta.color,
            padding: "2px 8px", borderRadius: 6,
            background: meta.colorBg,
            border: `1px solid ${meta.colorBdr}`,
          }}>
            {meta.label}
          </span>

          <div style={{ flex: 1 }} />

          {hasDraft && (
            <span style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 5,
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.25)",
              color: "#34d399", fontWeight: 600,
            }}>
              ✓ AI 초안 적용됨
            </span>
          )}

          <button style={{
            padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: C.accentBg, border: `1px solid ${C.accentBdr}`,
            color: C.accent, cursor: "pointer",
          }}>
            내보내기
          </button>
        </div>

        <MarkdownEditor
          value={markdown}
          onChange={setMarkdown}
          editorId={`doc-editor-${view}`}
        />
      </div>

      {/* 오른쪽: AI 채팅 */}
      <AiChatSidebar contextType={view} onApplyDraft={applyDraft} />
    </div>
  );
}
