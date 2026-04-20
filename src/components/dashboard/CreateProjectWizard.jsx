"use client";

/**
 * CreateProjectWizard.jsx
 * -----------------------
 * 5단계 프로젝트 생성 위저드.
 * VS Code + Obsidian 다크 테마 기반.
 *
 * Step 1 — 프로젝트 개요  (이름, 설명, 구현방식, 기술스택)
 * Step 2 — 문제 정의     (6개 질문)
 * Step 3 — 레퍼런스      (파일 업로드)
 * Step 4 — 타겟 유저     (페르소나 카드)
 * Step 5 — 기능 정의     (공통기능 체크 + 커스텀 MoSCoW 카드)
 */

import { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════
   상수
════════════════════════════════════════════ */
const STEPS = [
  { id: 1, label: "프로젝트 개요" },
  { id: 2, label: "문제정의"     },
  { id: 3, label: "레퍼런스"    },
  { id: 4, label: "타겟유저"    },
  { id: 5, label: "기능정의"    },
];

const IMPL_TYPES = ["웹", "앱", "웹앱"];

const COMMON_STACKS = [
  "React", "Next.js", "Vue", "Angular",
  "Spring Boot", "Django", "FastAPI", "Express", "NestJS",
  "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "React Native", "Flutter", "Docker", "AWS", "GraphQL",
];

const COMMON_FEATURES = [
  { id: "social_login",  label: "소셜 로그인"    },
  { id: "signup",        label: "회원가입 / 탈퇴" },
  { id: "notification",  label: "알림"           },
  { id: "search",        label: "검색"           },
  { id: "admin",         label: "관리자 페이지"  },
  { id: "mypage",        label: "마이 페이지"    },
  { id: "file_upload",   label: "파일 업로드"    },
  { id: "payment",       label: "결제"           },
];

const PROBLEM_QS = [
  { key: "pain",        label: "지금 어떤 불편함이 있나요?",                                         required: true  },
  { key: "solution",    label: "지금 1번의 문제를 어떻게 해결하고 있나요?",                            required: true  },
  { key: "ideal",       label: "현재 서비스가 잘 된다면 어떤 모습인가요?",                             required: true  },
  { key: "loss",        label: "1번의 문제로 인한 손실이 있나요? (시간, 비용 리소스 등)",              required: false },
  { key: "trigger",     label: "현재의 서비스를 만들게 된 계기가 있나요?",                            required: false },
  { key: "ref_exp",     label: "비슷한 서비스를 써봤을 때 좋았거나 아쉬웠던 점, 보완하고 싶은 점이 있나요?", required: false },
];

const MOSCOW_OPTIONS = [
  { key: "Must",   color: "#7C3AED", bg: "rgba(124,58,237,0.18)"  },
  { key: "Should", color: "#3B82F6", bg: "rgba(59,130,246,0.18)"  },
  { key: "Could",  color: "#10B981", bg: "rgba(16,185,129,0.18)"  },
  { key: "Won't",  color: "#475569", bg: "rgba(71,85,105,0.18)"   },
];

/* ═══════════════════════════════════════════
   초기 상태
════════════════════════════════════════════ */
function initialData() {
  return {
    image:       null,
    imagePreview:null,
    name:        "",
    description: "",
    implType:    "웹",
    techStack:   [],
    problem:     { pain: "", solution: "", ideal: "", loss: "", trigger: "", ref_exp: "" },
    references:  [],
    personas:    [{ id: Date.now(), user: "", environment: "", pain: "" }],
    commonFeatures: Object.fromEntries(COMMON_FEATURES.map(f => [f.id, { checked: false, desc: "" }])),
    customFeatures: [{ id: Date.now(), moscow: "Must", name: "", desc: "" }],
  };
}

/* ═══════════════════════════════════════════
   공통 스타일 토큰
════════════════════════════════════════════ */
const T = {
  input: {
    width: "100%",
    background: "var(--db-bg-elevated)",
    border: "1px solid var(--db-border)",
    borderRadius: 8,
    padding: "9px 13px",
    color: "var(--db-text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    background: "var(--db-bg-elevated)",
    border: "1px solid var(--db-border)",
    borderRadius: 8,
    padding: "9px 13px",
    color: "var(--db-text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: 80,
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--db-text-secondary)",
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  card: {
    background: "var(--db-bg-surface)",
    border: "1px solid var(--db-border)",
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--db-text-primary)",
    marginBottom: 20,
  },
};

function focusStyle(e) { e.target.style.borderColor = "var(--db-border-active)"; }
function blurStyle(e)  { e.target.style.borderColor = "var(--db-border)"; }

/* ═══════════════════════════════════════════
   StepIndicator
════════════════════════════════════════════ */
function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 36, padding: "0 4px" }}>
      {STEPS.map((step, idx) => {
        const done    = step.id < current;
        const active  = step.id === current;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: idx < STEPS.length - 1 ? 1 : "none" }}>
            {/* 원 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                background: done   ? "var(--db-grad-purple)"
                          : active ? "transparent"
                          :          "transparent",
                border: done   ? "none"
                      : active ? "2px solid var(--db-purple-400)"
                      :          "2px solid var(--db-border)",
                color: done   ? "#fff"
                     : active ? "var(--db-purple-300)"
                     :          "var(--db-text-muted)",
                boxShadow: active ? "var(--db-glow-sm)" : "none",
                transition: "all 0.2s",
              }}>
                {done ? "✓" : step.id}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 600 : 400,
                color: active ? "var(--db-purple-300)" : done ? "var(--db-text-secondary)" : "var(--db-text-muted)",
                whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>
            {/* 연결선 */}
            {idx < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: "0 8px", marginTop: -18,
                background: done ? "var(--db-purple-500)" : "var(--db-border)",
                transition: "background 0.3s",
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Step 1 — 프로젝트 개요
════════════════════════════════════════════ */
function Step1({ data, onChange }) {
  const fileRef = useRef(null);
  const [stackInput, setStackInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ image: file, imagePreview: url });
  };

  const handleStackInput = (val) => {
    setStackInput(val);
    if (val.trim()) {
      setSuggestions(
        COMMON_STACKS.filter(s =>
          s.toLowerCase().includes(val.toLowerCase()) &&
          !data.techStack.includes(s)
        ).slice(0, 5)
      );
    } else {
      setSuggestions([]);
    }
  };

  const addStack = (tag) => {
    const t = tag.trim();
    if (t && !data.techStack.includes(t)) {
      onChange({ techStack: [...data.techStack, t] });
    }
    setStackInput("");
    setSuggestions([]);
  };

  const removeStack = (tag) => {
    onChange({ techStack: data.techStack.filter(s => s !== tag) });
  };

  const handleStackKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addStack(stackInput); }
    if (e.key === "Backspace" && !stackInput && data.techStack.length) {
      removeStack(data.techStack[data.techStack.length - 1]);
    }
  };

  /* 클릭 안 된 suggestion 닫기 */
  useEffect(() => {
    const handler = () => setSuggestions([]);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div>
      <div style={T.sectionTitle}>프로젝트 개요</div>

      {/* 이미지 + 기본 정보 */}
      <div style={{ display: "flex", gap: 24, marginBottom: 28 }}>
        {/* 이미지 업로드 */}
        <div style={{ flexShrink: 0 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 140, height: 140, borderRadius: 12,
              border: "1.5px dashed var(--db-border-mid)",
              background: "var(--db-bg-surface)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", gap: 8, overflow: "hidden",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--db-border-active)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--db-border-mid)"}
          >
            {data.imagePreview ? (
              <img src={data.imagePreview} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--db-text-muted)" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="m21 15-5-5L5 21"/>
                </svg>
                <span style={{ fontSize: 11, color: "var(--db-text-muted)" }}>이미지 추가</span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange}/>
          {data.imagePreview && (
            <button
              onClick={() => onChange({ image: null, imagePreview: null })}
              style={{ marginTop: 6, width: "100%", background: "none", border: "none",
                       color: "var(--db-text-muted)", fontSize: 11, cursor: "pointer" }}>
              삭제
            </button>
          )}
        </div>

        {/* 이름 + 설명 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={T.label}>프로젝트 이름 <span style={{ color: "var(--db-purple-400)" }}>*</span></label>
            <input
              style={T.input}
              placeholder="예) Align-it"
              value={data.name}
              onChange={e => onChange({ name: e.target.value })}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>
          <div>
            <label style={T.label}>프로젝트 한 줄 설명 <span style={{ color: "var(--db-purple-400)" }}>*</span></label>
            <input
              style={T.input}
              placeholder="예) LLM 기반 PRD·API·DB 정합성 자동 검증 플랫폼"
              value={data.description}
              onChange={e => onChange({ description: e.target.value })}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>
        </div>
      </div>

      {/* 구현 방식 */}
      <div style={{ marginBottom: 28 }}>
        <label style={T.label}>구현 방식</label>
        <div style={{ display: "flex", gap: 10 }}>
          {IMPL_TYPES.map(type => {
            const active = data.implType === type;
            return (
              <button
                key={type}
                onClick={() => onChange({ implType: type })}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 8, cursor: "pointer",
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  border: active ? "1.5px solid var(--db-purple-400)" : "1.5px solid var(--db-border)",
                  background: active ? "rgba(139,92,246,0.12)" : "var(--db-bg-surface)",
                  color: active ? "var(--db-purple-300)" : "var(--db-text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: active ? "4px solid var(--db-purple-400)" : "2px solid var(--db-border)",
                  background: "transparent",
                }}/>
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* 기술 스택 */}
      <div>
        <label style={T.label}>기술 스택</label>
        {/* 선택된 태그 */}
        {data.techStack.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {data.techStack.map(tag => (
              <span key={tag} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: "rgba(139,92,246,0.15)", border: "1px solid var(--db-border-mid)",
                fontSize: 12, color: "var(--db-purple-300)",
              }}>
                {tag}
                <button onClick={() => removeStack(tag)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--db-text-muted)", fontSize: 14, lineHeight: 1,
                  padding: 0,
                }}>×</button>
              </span>
            ))}
          </div>
        )}

        {/* 입력창 */}
        <div style={{ position: "relative" }}>
          <input
            style={{ ...T.input, paddingLeft: 13 }}
            placeholder="#태그 입력 (Enter 또는 클릭으로 추가)"
            value={stackInput}
            onChange={e => handleStackInput(e.target.value)}
            onKeyDown={handleStackKeyDown}
            onFocus={focusStyle} onBlur={blurStyle}
            onClick={e => e.stopPropagation()}
          />
          {suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10,
              background: "var(--db-bg-surface)", border: "1px solid var(--db-border)",
              borderRadius: 8, overflow: "hidden",
            }}>
              {suggestions.map(s => (
                <div key={s}
                  onMouseDown={e => { e.preventDefault(); addStack(s); }}
                  style={{
                    padding: "9px 13px", fontSize: 13, cursor: "pointer",
                    color: "var(--db-text-primary)",
                    borderBottom: "1px solid var(--db-border)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--db-bg-elevated)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{s}</div>
              ))}
            </div>
          )}
        </div>

        {/* 빠른 선택 칩 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {COMMON_STACKS.filter(s => !data.techStack.includes(s)).slice(0, 10).map(s => (
            <button key={s} onClick={() => addStack(s)} style={{
              padding: "4px 10px", borderRadius: 20, cursor: "pointer",
              border: "1px solid var(--db-border)", background: "var(--db-bg-surface)",
              fontSize: 11, color: "var(--db-text-muted)", transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--db-border-mid)"; e.currentTarget.style.color = "var(--db-text-secondary)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--db-border)"; e.currentTarget.style.color = "var(--db-text-muted)"; }}
            >+ {s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Step 2 — 문제 정의
════════════════════════════════════════════ */
function Step2({ data, onChange }) {
  const update = (key, val) => onChange({ problem: { ...data.problem, [key]: val } });

  return (
    <div>
      <div style={T.sectionTitle}>문제 정의</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PROBLEM_QS.map((q, i) => (
          <div key={q.key}>
            <label style={T.label}>
              {i + 1}. {q.label}
              {q.required && <span style={{ color: "var(--db-purple-400)", marginLeft: 4 }}>*</span>}
            </label>
            <textarea
              style={T.textarea}
              placeholder={
                q.key === "pain"     ? "예) 팀 간 PRD와 API 명세가 달라서 개발 완료 후에야 오류를 발견합니다." :
                q.key === "solution" ? "예) 노션에 수동으로 정리하거나 슬랙으로 공유하고 있어요." :
                q.key === "ideal"    ? "예) PRD 작성 즉시 API 명세, DB 스키마가 자동 생성되고 불일치가 실시간으로 탐지됩니다." :
                q.key === "loss"     ? "예) 설계 오류 수정에 스프린트당 평균 2일이 소요됩니다." :
                q.key === "trigger"  ? "예) 지난 분기 배포 사고의 원인이 PRD-개발 명세 불일치였습니다." :
                                       "예) Notion AI는 문서 작성만 도와주고 코드 명세와 연동이 안 됩니다."
              }
              value={data.problem[q.key]}
              onChange={e => update(q.key, e.target.value)}
              onFocus={focusStyle} onBlur={blurStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Step 3 — 레퍼런스
════════════════════════════════════════════ */
function Step3({ data, onChange }) {
  const fileRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (files) => {
    const arr = Array.from(files);
    onChange({ references: [...data.references, ...arr] });
  };

  const removeFile = (idx) => {
    onChange({ references: data.references.filter((_, i) => i !== idx) });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div style={T.sectionTitle}>레퍼런스</div>
      <p style={{ fontSize: 13, color: "var(--db-text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
        기획서, 와이어프레임, 경쟁사 스크린샷, 기존 API 문서 등<br/>
        LLM이 참고할 파일을 업로드하세요. (선택 사항)
      </p>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--db-purple-400)" : "var(--db-border-mid)"}`,
          borderRadius: 12,
          background: isDragging ? "rgba(139,92,246,0.08)" : "var(--db-bg-surface)",
          padding: "48px 24px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12, cursor: "pointer", transition: "all 0.15s",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke={isDragging ? "var(--db-purple-400)" : "var(--db-text-muted)"} strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--db-text-secondary)", fontWeight: 500 }}>
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p style={{ fontSize: 12, color: "var(--db-text-muted)", marginTop: 4 }}>
            PDF, 이미지, 문서 등 모든 형식 지원
          </p>
        </div>
      </div>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }}
        onChange={e => addFiles(e.target.files)} />

      {/* 업로드된 파일 목록 */}
      {data.references.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {data.references.map((file, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8,
              background: "var(--db-bg-surface)", border: "1px solid var(--db-border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <p style={{ fontSize: 13, color: "var(--db-text-primary)", fontWeight: 500 }}>{file.name}</p>
                  <p style={{ fontSize: 11, color: "var(--db-text-muted)" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button onClick={() => removeFile(idx)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--db-text-muted)", fontSize: 18,
              }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Step 4 — 타겟 유저
════════════════════════════════════════════ */
function Step4({ data, onChange }) {
  const update = (id, field, val) => {
    onChange({
      personas: data.personas.map(p => p.id === id ? { ...p, [field]: val } : p),
    });
  };

  const addPersona = () => {
    onChange({
      personas: [...data.personas, { id: Date.now(), user: "", environment: "", pain: "" }],
    });
  };

  const removePersona = (id) => {
    if (data.personas.length === 1) return;
    onChange({ personas: data.personas.filter(p => p.id !== id) });
  };

  return (
    <div>
      <div style={T.sectionTitle}>타겟 유저</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.personas.map((persona, idx) => (
          <div key={persona.id} style={{ ...T.card, position: "relative" }}>
            {/* 카드 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--db-purple-300)", letterSpacing: "0.06em" }}>
                타겟유저 #{idx + 1}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--db-text-muted)", cursor: "help" }} title="페르소나: 실제 사용자를 대표하는 가상의 인물">ⓘ</span>
                {data.personas.length > 1 && (
                  <button onClick={() => removePersona(persona.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--db-text-muted)", fontSize: 16,
                    display: "flex", alignItems: "center",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={T.label}>주요 사용자</label>
                <input
                  style={T.input}
                  placeholder="예) 20대 경영학과를 전공하며 디자인을 부전공하고 있는 대학생 등"
                  value={persona.user}
                  onChange={e => update(persona.id, "user", e.target.value)}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div>
                <label style={T.label}>주로 쓰는 환경</label>
                <input
                  style={T.input}
                  placeholder="예) 사무실 PC, 스프린트 회의 중 등"
                  value={persona.environment}
                  onChange={e => update(persona.id, "environment", e.target.value)}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div>
                <label style={T.label}>현재 가장 큰 불편함</label>
                <input
                  style={T.input}
                  placeholder="예) 다음 회의 전 직전 회의 내용 복기 등"
                  value={persona.pain}
                  onChange={e => update(persona.id, "pain", e.target.value)}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
            </div>
          </div>
        ))}

        {/* 유저 추가 버튼 */}
        <button onClick={addPersona} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px", borderRadius: 10,
          border: "1.5px dashed var(--db-border-mid)", background: "transparent",
          color: "var(--db-text-muted)", fontSize: 13, cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--db-border-active)"; e.currentTarget.style.color = "var(--db-purple-300)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--db-border-mid)"; e.currentTarget.style.color = "var(--db-text-muted)"; }}
        >
          + 유저 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Step 5 — 기능 정의
════════════════════════════════════════════ */
function Step5({ data, onChange }) {
  const [commonOpen, setCommonOpen] = useState(true);

  const toggleCommon = (id) => {
    onChange({
      commonFeatures: {
        ...data.commonFeatures,
        [id]: { ...data.commonFeatures[id], checked: !data.commonFeatures[id].checked },
      },
    });
  };

  const updateCommonDesc = (id, desc) => {
    onChange({
      commonFeatures: { ...data.commonFeatures, [id]: { ...data.commonFeatures[id], desc } },
    });
  };

  const updateCustom = (id, field, val) => {
    onChange({
      customFeatures: data.customFeatures.map(f => f.id === id ? { ...f, [field]: val } : f),
    });
  };

  const addCustom = () => {
    onChange({
      customFeatures: [...data.customFeatures, { id: Date.now(), moscow: "Must", name: "", desc: "" }],
    });
  };

  const removeCustom = (id) => {
    if (data.customFeatures.length === 1) return;
    onChange({ customFeatures: data.customFeatures.filter(f => f.id !== id) });
  };

  return (
    <div>
      <div style={T.sectionTitle}>기능 정의</div>

      {/* 공통 기능 아코디언 */}
      <div style={{ ...T.card, marginBottom: 20 }}>
        <button
          onClick={() => setCommonOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--db-text-primary)", fontSize: 14, fontWeight: 600,
            padding: 0,
          }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--db-purple-400)" strokeWidth="2.5"
            style={{ transform: commonOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          공통 기능
        </button>

        {commonOpen && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {COMMON_FEATURES.map(feat => {
              const state = data.commonFeatures[feat.id];
              return (
                <div key={feat.id} style={{
                  border: "1px solid var(--db-border)",
                  borderRadius: 10, padding: "14px 16px",
                  background: state.checked ? "rgba(139,92,246,0.06)" : "transparent",
                  transition: "background 0.15s",
                }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => toggleCommon(feat.id)}
                  >
                    {/* 체크박스 */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: state.checked ? "none" : "1.5px solid var(--db-border-mid)",
                      background: state.checked ? "var(--db-purple-500)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {state.checked && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2">
                          <polyline points="2 6 5 9 10 3"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: state.checked ? "var(--db-text-primary)" : "var(--db-text-secondary)" }}>
                      {feat.label}
                    </span>
                  </div>
                  {state.checked && (
                    <div style={{ marginTop: 10, paddingLeft: 26 }}>
                      <textarea
                        style={{ ...T.textarea, minHeight: 60 }}
                        placeholder="기능에 대한 상세 설명 및 기능을 구현하는데 필요한 라이브러리, 프레임워크 등"
                        value={state.desc}
                        onChange={e => updateCommonDesc(feat.id, e.target.value)}
                        onFocus={focusStyle} onBlur={blurStyle}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 커스텀 기능 카드 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.customFeatures.map((feat, idx) => (
          <div key={feat.id} style={{ ...T.card }}>
            {/* 카드 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--db-purple-300)", letterSpacing: "0.06em" }}>
                function #{idx + 1}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--db-text-muted)", cursor: "help" }}
                  title="MoSCoW: Must(필수) / Should(권장) / Could(선택) / Won't(이번 범위 제외)">ⓘ</span>
                {data.customFeatures.length > 1 && (
                  <button onClick={() => removeCustom(feat.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--db-text-muted)",
                    display: "flex", alignItems: "center",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* MoSCoW */}
            <div style={{ marginBottom: 14 }}>
              <label style={T.label}>MoSCoW</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MOSCOW_OPTIONS.map(opt => {
                  const active = feat.moscow === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => updateCustom(feat.id, "moscow", opt.key)}
                      style={{
                        flex: 1, minWidth: 70,
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                        border: active ? `1.5px solid ${opt.color}` : "1.5px solid var(--db-border)",
                        background: active ? opt.bg : "transparent",
                        color: active ? opt.color : "var(--db-text-muted)",
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                        border: active ? `3.5px solid ${opt.color}` : "1.5px solid var(--db-border-mid)",
                      }}/>
                      {opt.key}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 기능 이름 */}
            <div style={{ marginBottom: 12 }}>
              <label style={T.label}>기능 이름</label>
              <input
                style={T.input}
                placeholder="예) VIP 관람권"
                value={feat.name}
                onChange={e => updateCustom(feat.id, "name", e.target.value)}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>

            {/* 기능 설명 */}
            <div>
              <label style={T.label}>기능 설명</label>
              <textarea
                style={T.textarea}
                placeholder="기능에 대한 상세 설명 및 기능을 구현하는데 필요한 라이브러리, 프레임워크 등"
                value={feat.desc}
                onChange={e => updateCustom(feat.id, "desc", e.target.value)}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>
          </div>
        ))}

        {/* 기능 추가 버튼 */}
        <button onClick={addCustom} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px", borderRadius: 10,
          border: "1.5px dashed var(--db-border-mid)", background: "transparent",
          color: "var(--db-text-muted)", fontSize: 13, cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--db-border-active)"; e.currentTarget.style.color = "var(--db-purple-300)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--db-border-mid)"; e.currentTarget.style.color = "var(--db-text-muted)"; }}
        >
          + 기능 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   메인 — CreateProjectWizard
════════════════════════════════════════════ */
export function CreateProjectWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initialData());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);

  const update = useCallback((patch) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const canNext = () => {
    if (step === 1) return data.name.trim().length > 0 && data.description.trim().length > 0;
    if (step === 2) return data.problem.pain.trim() && data.problem.solution.trim() && data.problem.ideal.trim();
    return true;
  };

  const goNext = () => {
    if (step < 5) {
      setStep(s => s + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goPrev = () => {
    if (step > 1) {
      setStep(s => s - 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: 백엔드 연동 시 여기서 API 호출 후 onComplete 호출
      // const project = await createProject(data);
      onComplete?.(data);
    } catch (err) {
      console.error("프로젝트 생성 실패:", err);
      setIsSubmitting(false);
    }
  };

  const STEP_CONTENT = {
    1: <Step1 data={data} onChange={update} />,
    2: <Step2 data={data} onChange={update} />,
    3: <Step3 data={data} onChange={update} />,
    4: <Step4 data={data} onChange={update} />,
    5: <Step5 data={data} onChange={update} />,
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--db-bg-primary)",
    }}>
      {/* 상단 탭 바 (VS Code 스타일) */}
      <div style={{
        height: 36, background: "var(--db-bg-base)",
        borderBottom: "1px solid var(--db-border)",
        display: "flex", alignItems: "center", paddingLeft: 16,
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 14px", height: "100%",
          borderRight: "1px solid var(--db-border)",
          borderBottom: "2px solid var(--db-purple-400)",
          background: "var(--db-bg-primary)",
          fontSize: 12, color: "var(--db-text-secondary)",
        }}>
          <span style={{ fontSize: 14 }}>✦</span>
          프로젝트 생성하기
        </div>
      </div>

      {/* 본문 스크롤 영역 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "32px 40px 120px" }}>
        <StepIndicator current={step} />
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {STEP_CONTENT[step]}
        </div>
      </div>

      {/* 하단 네비게이션 바 */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "var(--db-bg-base)",
        borderTop: "1px solid var(--db-border)",
        padding: "16px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        {/* 왼쪽: 취소 or 이전 */}
        <div style={{ display: "flex", gap: 10 }}>
          {step === 1 ? (
            <button
              onClick={onCancel}
              style={{
                padding: "9px 20px", borderRadius: 8, cursor: "pointer",
                background: "none", border: "1px solid var(--db-border)",
                color: "var(--db-text-muted)", fontSize: 13,
              }}
            >
              취소
            </button>
          ) : (
            <button
              onClick={goPrev}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 20px", borderRadius: 8, cursor: "pointer",
                background: "none", border: "1px solid var(--db-border)",
                color: "var(--db-text-secondary)", fontSize: 13,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              이전
            </button>
          )}
        </div>

        {/* 오른쪽: 단계 표시 + 다음/생성 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--db-text-muted)" }}>
            {step} / {STEPS.length}
          </span>

          {step < 5 ? (
            <button
              onClick={goNext}
              disabled={!canNext()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 24px", borderRadius: 8, cursor: canNext() ? "pointer" : "not-allowed",
                background: canNext() ? "var(--db-grad-purple)" : "var(--db-bg-elevated)",
                border: "none", color: canNext() ? "#fff" : "var(--db-text-muted)",
                fontSize: 13, fontWeight: 600,
                boxShadow: canNext() ? "var(--db-glow-sm)" : "none",
                transition: "all 0.15s",
              }}
            >
              다음 단계
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 28px", borderRadius: 8, cursor: isSubmitting ? "not-allowed" : "pointer",
                background: isSubmitting ? "var(--db-bg-elevated)" : "var(--db-grad-purple)",
                border: "none", color: isSubmitting ? "var(--db-text-muted)" : "#fff",
                fontSize: 13, fontWeight: 700,
                boxShadow: isSubmitting ? "none" : "var(--db-glow-md)",
                transition: "all 0.15s",
              }}
            >
              {isSubmitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ animation: "wiz-spin 0.8s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  생성 중...
                </>
              ) : "✦ 프로젝트 생성"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wiz-spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--db-border-mid); border-radius: 3px; }
      `}</style>
    </div>
  );
}
