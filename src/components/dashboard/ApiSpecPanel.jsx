"use client";

import { useState, useMemo, useEffect } from "react";
import { AiChatSidebar } from "./AiChatSidebar";
import { updateArtifact } from "@/lib/pipelineApi";

const C = {
  bg:       "var(--surface)",
  surface:  "#f7f6f3",
  card:     "var(--surface)",
  cardOpen: "var(--bg)",
  border:   "rgba(0,0,0,0.07)",
  text:     "#1a1916",
  muted:    "var(--text-3)",
  sub:      "var(--text-3)",
  accent:   "#6b6960",
  code:     "var(--surface)",
};

const METHOD_COLOR = {
  GET:    { bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)",  text: "#34d399" },
  POST:   { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.35)",  text: "#60a5fa" },
  PUT:    { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  text: "#fbbf24" },
  PATCH:  { bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.35)",  text: "#fb923c" },
  DELETE: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", text: "#f87171" },
};

const METHODS    = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PARAM_INS  = ["path", "query", "header", "cookie"];
const PARAM_TYPES = ["string", "integer", "number", "boolean", "array", "object"];

/* ══════════════════════════════════════
   엔드포인트 편집 드로어
══════════════════════════════════════ */
function EndpointEditDrawer({ initial, isNew, onSave, onCancel, saving }) {
  const [method,      setMethod]      = useState(initial?.method || "GET");
  const [path,        setPath]        = useState(initial?.path || "/api/");
  const [description, setDescription] = useState(initial?.description || "");
  const [auth,        setAuth]        = useState(Boolean(initial?.authRequired ?? initial?.auth));
  const [params,      setParams]      = useState(() =>
    Array.isArray(initial?.parameters) && initial.parameters.length
      ? initial.parameters.map(p => ({ in: p.in || "query", name: p.name || "", type: p.type || "string", required: !!p.required, description: p.description || "" }))
      : []
  );
  const [bodyText,    setBodyText]    = useState(() => {
    const b = initial?.requestBody;
    if (!b) return "";
    return typeof b === "string" ? b : JSON.stringify(b, null, 2);
  });
  const [successText, setSuccessText] = useState(() => {
    const s = initial?.successResponse;
    if (!s) return "";
    return typeof s === "string" ? s : JSON.stringify(s, null, 2);
  });
  const [errorText,   setErrorText]   = useState(initial?.errorCodes || "");
  const [errors,      setErrors]      = useState({});

  function addParam() {
    setParams(p => [...p, { in: "query", name: "", type: "string", required: false, description: "" }]);
  }
  function removeParam(i) { setParams(p => p.filter((_, j) => j !== i)); }
  function setParam(i, key, val) {
    setParams(p => p.map((row, j) => j === i ? { ...row, [key]: val } : row));
  }

  function handleSubmit() {
    const errs = {};
    if (!path.trim()) errs.path = "경로를 입력하세요";
    let parsedBody = null, parsedSuccess = null;
    if (bodyText.trim()) {
      try { parsedBody = JSON.parse(bodyText); }
      catch (e) { errs.body = "Body JSON 오류: " + e.message; }
    }
    if (successText.trim()) {
      try { parsedSuccess = JSON.parse(successText); }
      catch (e) { errs.success = "응답 JSON 오류: " + e.message; }
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      method,
      path: path.trim(),
      description: description.trim(),
      authRequired: auth,
      parameters: params.filter(p => p.name.trim()),
      requestBody: parsedBody,
      successResponse: parsedSuccess,
      errorCodes: errorText.trim() || null,
    });
  }

  const inp = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
  };
  const lbl = {
    fontSize: 11, fontWeight: 700, color: "#9ca3af",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };
  const mc = METHOD_COLOR[method] || METHOD_COLOR.GET;

  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, width: 560, height: "100vh",
        background: "#16181c", zIndex: 201,
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>
            {isNew ? "API 엔드포인트 추가" : "API 엔드포인트 수정"}
          </span>
          <button onClick={onCancel} style={{
            background: "none", border: "none", color: "#6b7280",
            cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px",
          }}>×</button>
        </div>

        {/* 폼 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* 메서드 + 경로 */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>메서드 & 경로</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                style={{
                  ...inp, width: 100, flexShrink: 0, cursor: "pointer",
                  color: mc.text, background: mc.bg,
                  border: `1px solid ${mc.border}`,
                  fontWeight: 700, fontSize: 12, textAlign: "center",
                }}
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                value={path}
                onChange={e => { setPath(e.target.value); setErrors(p => ({ ...p, path: "" })); }}
                placeholder="/api/v1/resource/{id}"
                style={{
                  ...inp, flex: 1, fontFamily: "'JetBrains Mono','Fira Code',monospace",
                  borderColor: errors.path ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
                }}
              />
            </div>
            {errors.path && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{errors.path}</div>}
          </div>

          {/* 설명 */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>설명</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="이 엔드포인트에 대한 설명을 입력하세요"
              rows={2}
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* 인증 */}
          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox" id="drawer-auth"
              checked={auth} onChange={e => setAuth(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#fbbf24" }}
            />
            <label htmlFor="drawer-auth" style={{ fontSize: 13, color: "#e2e8f0", cursor: "pointer" }}>
              JWT 인증 필요 (🔒)
            </label>
          </div>

          {/* 파라미터 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>파라미터</label>
              <button
                onClick={addParam}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 5,
                  background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)",
                  color: "#60a5fa", cursor: "pointer",
                }}
              >+ 추가</button>
            </div>
            {params.length === 0 && (
              <div style={{ fontSize: 12, color: "#4b5563", padding: "6px 0" }}>파라미터 없음</div>
            )}
            {/* 헤더 라벨 */}
            {params.length > 0 && (
              <div style={{
                display: "grid", gridTemplateColumns: "80px 100px 80px 1fr 20px 20px",
                gap: 6, marginBottom: 4, padding: "0 2px",
              }}>
                {["위치","이름","타입","설명","*",""].map((h, i) => (
                  <span key={i} style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                ))}
              </div>
            )}
            {params.map((p, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "80px 100px 80px 1fr 20px 20px",
                gap: 6, marginBottom: 6, alignItems: "center",
              }}>
                <select
                  value={p.in} onChange={e => setParam(i, "in", e.target.value)}
                  style={{ ...inp, padding: "6px 8px", fontSize: 11 }}
                >
                  {PARAM_INS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input
                  value={p.name} onChange={e => setParam(i, "name", e.target.value)}
                  placeholder="name"
                  style={{ ...inp, fontFamily: "monospace", fontSize: 12 }}
                />
                <select
                  value={p.type} onChange={e => setParam(i, "type", e.target.value)}
                  style={{ ...inp, padding: "6px 8px", fontSize: 11 }}
                >
                  {PARAM_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input
                  value={p.description} onChange={e => setParam(i, "description", e.target.value)}
                  placeholder="설명"
                  style={{ ...inp, fontSize: 12 }}
                />
                <input
                  type="checkbox" checked={p.required}
                  onChange={e => setParam(i, "required", e.target.checked)}
                  title="필수 여부"
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#ef4444" }}
                />
                <button
                  onClick={() => removeParam(i)}
                  style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* Request Body */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Request Body (JSON)</label>
            <textarea
              value={bodyText}
              onChange={e => { setBodyText(e.target.value); setErrors(p => ({ ...p, body: "" })); }}
              placeholder={'{\n  "key": "value"\n}'}
              rows={5} spellCheck={false}
              style={{
                ...inp, resize: "vertical", fontFamily: "'JetBrains Mono','Fira Code',monospace",
                fontSize: 12, lineHeight: 1.6,
                borderColor: errors.body ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
              }}
            />
            {errors.body && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{errors.body}</div>}
          </div>

          {/* 성공 응답 */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>성공 응답 (JSON)</label>
            <textarea
              value={successText}
              onChange={e => { setSuccessText(e.target.value); setErrors(p => ({ ...p, success: "" })); }}
              placeholder={'{\n  "id": 1,\n  "name": "string"\n}'}
              rows={5} spellCheck={false}
              style={{
                ...inp, resize: "vertical", fontFamily: "'JetBrains Mono','Fira Code',monospace",
                fontSize: 12, lineHeight: 1.6,
                borderColor: errors.success ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
              }}
            />
            {errors.success && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{errors.success}</div>}
          </div>

          {/* 에러 설명 */}
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>에러 설명</label>
            <input
              value={errorText}
              onChange={e => setErrorText(e.target.value)}
              placeholder="400: 유효하지 않은 요청, 404: 리소스 없음"
              style={inp}
            />
          </div>
        </div>

        {/* 푸터 */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#9ca3af", cursor: "pointer",
            }}
          >취소</button>
          <button
            onClick={handleSubmit} disabled={saving}
            style={{
              padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.4)",
              color: "#60a5fa", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "저장 중..." : isNew ? "추가" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   경로 파라미터 하이라이트
══════════════════════════════════════ */
function PathDisplay({ path }) {
  const parts = (path || "").split(/(\{[^}]+\})/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{") ? (
          <span key={i} style={{
            color: "#fb923c", background: "rgba(251,146,60,0.12)",
            borderRadius: 3, padding: "0 3px",
          }}>{part}</span>
        ) : <span key={i}>{part}</span>
      )}
    </>
  );
}

/* ── Swagger 스타일 파라미터 행 ── */
const IN_STYLE = {
  path:   { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   text: "#ef4444" },
  query:  { bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.3)",  text: "#60a5fa" },
  header: { bg: "rgba(107,105,96,0.08)", border: "rgba(107,105,96,0.25)", text: "#6b6960" },
  cookie: { bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.3)",  text: "#fb923c" },
};
const TYPE_COLOR = {
  integer: "#818cf8", number: "#818cf8", int: "#818cf8", long: "#818cf8",
  string: "#34d399", uuid: "#34d399",
  boolean: "#f59e0b", bool: "#f59e0b",
  array: "#fb923c", object: "#fb923c",
};

function ParamRow({ param, isLast }) {
  const ic = IN_STYLE[param.in] || IN_STYLE.query;
  const typeKey = (param.type || "").toLowerCase();
  const typeColor = TYPE_COLOR[typeKey] || "#9ca3af";
  return (
    <div style={{
      display: "flex", gap: 12, padding: "11px 14px",
      borderBottom: isLast ? "none" : `1px solid ${C.border}`, alignItems: "flex-start",
    }}>
      <div style={{ minWidth: 130, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <code style={{ fontSize: 12.5, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
            {param.name}
          </code>
          {param.required && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>*</span>}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
            background: ic.bg, border: `1px solid ${ic.border}`, color: ic.text,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>{param.in}</span>
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 4,
            background: `${typeColor}14`, border: `1px solid ${typeColor}35`, color: typeColor,
            fontFamily: "monospace",
          }}>{param.type || "string"}</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: param.required ? "#ef4444" : C.sub, marginBottom: 4, display: "block" }}>
          {param.required ? "required" : "optional"}
        </span>
        {param.description && (
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{param.description}</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SchemaBlock({ data }) {
  const text = typeof data === "string"
    ? data
    : JSON.stringify(data, null, 2).replace(/"/g, "").replace(/,$/gm, "");
  return (
    <pre style={{
      margin: 0, padding: "10px 12px", background: C.code, borderRadius: 6,
      border: `1px solid ${C.border}`, fontSize: 11.5, color: "#a8a69f",
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>{text}</pre>
  );
}

function StatusBadge({ status }) {
  const color = status < 300 ? "#34d399" : status < 400 ? "#fbbf24" : status < 500 ? "#fb923c" : "#f87171";
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
      background: `${color}18`, border: `1px solid ${color}40`, color,
      fontFamily: "monospace", flexShrink: 0,
    }}>{status}</span>
  );
}

/* ══════════════════════════════════════
   엔드포인트 카드 (편집/삭제 버튼 포함)
══════════════════════════════════════ */
function EndpointCard({ endpoint, canEdit, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const mc = METHOD_COLOR[endpoint.method] || METHOD_COLOR.GET;

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${open ? "rgba(107,105,96,0.2)" : C.border}`,
      background: open ? C.cardOpen : C.card,
      marginBottom: 6, overflow: "hidden", transition: "all 0.15s",
    }}>
      {/* 헤더 행 */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", background: "none", border: "none",
            cursor: "pointer", textAlign: "left", minWidth: 0,
          }}
        >
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
            padding: "3px 8px", borderRadius: 5,
            background: mc.bg, border: `1px solid ${mc.border}`, color: mc.text,
            minWidth: 56, textAlign: "center", flexShrink: 0,
          }}>{endpoint.method}</span>

          <code style={{
            fontSize: 13, fontWeight: 500, color: C.text,
            fontFamily: "'JetBrains Mono','Fira Code',monospace", flex: 1, minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            <PathDisplay path={endpoint.path} />
          </code>

          <span style={{
            fontSize: 12, color: C.muted, flexShrink: 0,
            maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{endpoint.summary}</span>

          {endpoint.auth && (
            <span style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 4,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24", flexShrink: 0,
            }}>🔒 JWT</span>
          )}

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth="2" strokeLinecap="round"
            style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* 편집/삭제 버튼 */}
        {canEdit && (
          <div style={{ display: "flex", gap: 4, padding: "0 12px", flexShrink: 0 }}>
            <button
              onClick={() => onEdit(endpoint.specIdx)}
              title="편집"
              style={{
                padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                color: "#fbbf24", cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => onDelete(endpoint.specIdx)}
              title="삭제"
              style={{
                padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                color: "#f87171", cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 상세 내용 */}
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          {endpoint.description && (
            <p style={{ fontSize: 13, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
              {endpoint.description}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
            <div>
              {endpoint.parameters.length > 0 && (
                <Section title="Parameters">
                  <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "var(--bg)", overflow: "hidden" }}>
                    {endpoint.parameters.map((p, i) => (
                      <ParamRow key={p.name + i} param={p} isLast={i === endpoint.parameters.length - 1} />
                    ))}
                  </div>
                </Section>
              )}
              {endpoint.requestBody && (
                <Section title={`Request Body — ${endpoint.requestBody.contentType || "application/json"}`}
                  style={{ marginTop: endpoint.parameters.length > 0 ? 12 : 0 }}>
                  <SchemaBlock data={endpoint.requestBody.schema ?? endpoint.requestBody} />
                </Section>
              )}
              {!endpoint.requestBody && endpoint.parameters.length === 0 && (
                <div style={{ fontSize: 12, color: C.sub, padding: "8px 0" }}>파라미터 없음</div>
              )}
            </div>
            <div>
              <Section title="Responses">
                {endpoint.responses.map((res, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <StatusBadge status={res.status} />
                      <span style={{ fontSize: 12, color: C.muted }}>{res.description}</span>
                    </div>
                    {res.schema && <SchemaBlock data={res.schema} />}
                  </div>
                ))}
                {endpoint.responses.length === 0 && (
                  <div style={{ fontSize: 12, color: C.sub }}>응답 정보 없음</div>
                )}
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   태그 그룹
══════════════════════════════════════ */
function TagGroup({ tag, canEdit, onEdit, onDelete, onAdd }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0", marginBottom: 8,
            background: "none", border: "none", borderBottom: `2px solid ${C.border}`,
            cursor: "pointer", textAlign: "left",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "transform 0.15s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{tag.name}</span>
          <span style={{
            marginLeft: "auto", fontSize: 11, color: C.sub,
            padding: "2px 7px", borderRadius: 10, background: "rgba(0,0,0,0.05)",
          }}>{tag.endpoints.length}</span>
        </button>
        {canEdit && (
          <button
            onClick={() => onAdd()}
            style={{
              marginLeft: 10, marginBottom: 8, fontSize: 11, padding: "4px 10px", borderRadius: 6,
              background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)",
              color: "#60a5fa", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
            }}
          >+ 추가</button>
        )}
      </div>

      {!collapsed && (
        <div>
          {tag.endpoints.map(ep => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── API 명세 → 텍스트 (AI 컨텍스트용) ── */
function apiSpecToText(tags) {
  return tags.flatMap(tag =>
    tag.endpoints.map(ep => `[${ep.method}] ${ep.path} — ${ep.summary || ""}`)
  ).join("\n");
}

/* ──────────────────────────────────────
   백엔드 apiSpec → 태그 형식 변환 (specIdx 포함)
──────────────────────────────────────── */
function buildTagsFromApiSpec(apiSpec) {
  if (!apiSpec || !Array.isArray(apiSpec.endpoints) || apiSpec.endpoints.length === 0) return null;

  const grouped = {};
  apiSpec.endpoints.forEach((ep, i) => {
    const parts = (ep.path || "/api/unknown").replace(/^\//, "").split("/");
    const tag = parts.length >= 2 ? parts[parts.length >= 3 ? 2 : 1] : parts[0] || "General";
    if (!grouped[tag]) grouped[tag] = [];

    const hasAuth = ep.authRequired !== undefined
      ? Boolean(ep.authRequired)
      : !!(ep.request?.headers?.Authorization);

    const bodyContent = ep.requestBody || ep.request?.body || null;
    const successContent = ep.successResponse || ep.response?.success || null;
    const errorContent   = ep.errorCodes    || ep.response?.error  || null;

    // path 파라미터 자동 추출
    const urlPathParams = [];
    const pathParamRe = /\{(\w+)\}/g;
    let pm;
    while ((pm = pathParamRe.exec(ep.path || "")) !== null) {
      const name = pm[1];
      urlPathParams.push({ in: "path", name, type: /id$/i.test(name) ? "integer" : "string", required: true, description: `${name} 값` });
    }

    let mergedParams;
    if (ep.parameters && ep.parameters.length > 0) {
      const explicitNames = new Set(ep.parameters.map(p => p.name));
      const missing = urlPathParams.filter(p => !explicitNames.has(p.name));
      mergedParams = [...ep.parameters, ...missing];
    } else {
      const legacyQuery = (ep.queryParams || []).map(q =>
        typeof q === "string" ? { in: "query", name: q, type: "string", required: false } : { in: "query", ...q }
      );
      mergedParams = [...urlPathParams, ...legacyQuery];
    }

    grouped[tag].push({
      id:       `ep-${i}`,
      specIdx:  i,
      method:   (ep.method || "GET").toUpperCase(),
      path:     ep.path || "/",
      summary:  ep.description || ep.summary || "",
      description: ep.description || "",
      auth:     hasAuth,
      parameters: mergedParams,
      requestBody: bodyContent && bodyContent !== "없음"
        ? { contentType: "application/json", schema: bodyContent }
        : null,
      responses: [
        successContent ? { status: 200, description: "성공", schema: successContent } : null,
        errorContent   ? { status: 400, description: String(errorContent) }           : null,
      ].filter(Boolean),
    });
  });

  return Object.entries(grouped).map(([name, endpoints]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    endpoints,
  }));
}

/* ══════════════════════════════════════
   API SPEC PANEL
══════════════════════════════════════ */
export function ApiSpecPanel({ project }) {
  const [search,       setSearch]       = useState("");
  const [localApiSpec, setLocalApiSpec] = useState(null);
  const [editingSpec,  setEditingSpec]  = useState(null); // null | { idx: number|"new", raw: {...}|null }
  const [opSaving,     setOpSaving]     = useState(false);
  const [saved,        setSaved]        = useState(false);

  useEffect(() => { setLocalApiSpec(null); }, [project?.id]);

  const rawApiSpec = localApiSpec ?? project?.apiSpec;
  const canEdit    = !!project?.artifactIds?.API_SPEC;

  const specTags = useMemo(() => buildTagsFromApiSpec(rawApiSpec) || [], [rawApiSpec]);
  const specTitle = project?.name ? `${project.name} API` : "API 명세서";

  /* ── 저장 공통 헬퍼 ── */
  async function persistSpec(newSpec) {
    const artifactId = project?.artifactIds?.API_SPEC;
    if (!artifactId) return;
    await updateArtifact(artifactId, JSON.stringify(newSpec));
    setLocalApiSpec(newSpec);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  /* ── 추가 ── */
  function handleAddEndpoint() {
    setEditingSpec({ idx: "new", raw: null });
  }

  /* ── 편집 열기 ── */
  function handleEditEndpoint(specIdx) {
    const endpoints = rawApiSpec?.endpoints || [];
    setEditingSpec({ idx: specIdx, raw: endpoints[specIdx] || null });
  }

  /* ── 삭제 ── */
  async function handleDeleteEndpoint(specIdx) {
    if (!window.confirm("이 API 엔드포인트를 삭제할까요?")) return;
    const currentSpec = rawApiSpec ?? { endpoints: [] };
    const endpoints = [...(currentSpec.endpoints || [])];
    endpoints.splice(specIdx, 1);
    const newSpec = { ...currentSpec, endpoints };
    setOpSaving(true);
    try {
      await persistSpec(newSpec);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setOpSaving(false);
    }
  }

  /* ── 드로어 저장 ── */
  async function handleDrawerSave(data) {
    const currentSpec = rawApiSpec ?? { endpoints: [] };
    const endpoints   = [...(currentSpec.endpoints || [])];
    if (editingSpec.idx === "new") {
      endpoints.push(data);
    } else {
      endpoints[editingSpec.idx] = data;
    }
    const newSpec = { ...currentSpec, endpoints };
    setOpSaving(true);
    try {
      await persistSpec(newSpec);
      setEditingSpec(null);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setOpSaving(false);
    }
  }

  const filteredTags = useMemo(() =>
    specTags.map(tag => ({
      ...tag,
      endpoints: tag.endpoints.filter(ep =>
        !search ||
        ep.path.toLowerCase().includes(search.toLowerCase()) ||
        (ep.summary || "").toLowerCase().includes(search.toLowerCase()) ||
        ep.method.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter(tag => tag.endpoints.length > 0),
    [specTags, search]
  );

  const currentContent = useMemo(() => apiSpecToText(specTags), [specTags]);

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 드로어 */}
      {editingSpec && (
        <EndpointEditDrawer
          initial={editingSpec.raw}
          isNew={editingSpec.idx === "new"}
          onSave={handleDrawerSave}
          onCancel={() => setEditingSpec(null)}
          saving={opSaving}
        />
      )}

      {/* ── 왼쪽: 명세 뷰어 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{
          height: 52, flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
          background: C.surface,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {project && (
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: `${project.color || "var(--text-1)"}22`,
                border: `1px solid ${project.color || "var(--text-1)"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 900, color: project.color || "#6b6960",
              }}>
                {(project.name || "P").charAt(0).toUpperCase()}
              </div>
            )}
            {project && <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>}
            <span style={{ fontSize: 13, color: C.sub }}>›</span>
            <span style={{
              fontSize: 13, fontWeight: 500, color: "#60a5fa",
              padding: "2px 8px", borderRadius: 6,
              background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
            }}>API 명세서</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saved && (
              <span style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 5,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399", fontWeight: 600,
              }}>✓ 저장됨</span>
            )}
            {canEdit && (
              <button
                onClick={handleAddEndpoint}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.35)",
                  color: "#60a5fa", cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                API 추가
              </button>
            )}
          </div>
        </div>

        {/* 검색 바 */}
        <div style={{ padding: "12px 28px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div style={{ position: "relative", maxWidth: 420 }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="엔드포인트 검색 (경로, 메서드, 요약)"
              style={{
                width: "100%", padding: "8px 12px 8px 32px",
                background: "var(--bg)", border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 13, color: C.text, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>{specTitle}</h1>
            {rawApiSpec?.authentication ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
                {rawApiSpec.authentication}
              </p>
            ) : (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
                RESTful API · JSON
              </p>
            )}
          </div>

          {specTags.length === 0 ? (
            /* 빈 상태 */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "80px 0", gap: 16,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              }}>📋</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  API 명세가 없습니다
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                  파이프라인을 실행하거나 직접 API를 추가하세요
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={handleAddEndpoint}
                  style={{
                    padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.35)",
                    color: "#60a5fa", cursor: "pointer",
                  }}
                >+ 첫 번째 API 추가</button>
              )}
            </div>
          ) : filteredTags.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.sub, fontSize: 14 }}>
              검색 결과가 없습니다
            </div>
          ) : (
            filteredTags.map(tag => (
              <TagGroup
                key={tag.name}
                tag={tag}
                canEdit={canEdit}
                onEdit={handleEditEndpoint}
                onDelete={handleDeleteEndpoint}
                onAdd={handleAddEndpoint}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 오른쪽: AI 채팅 ── */}
      <AiChatSidebar
        contextType="api"
        project={project}
        currentContent={currentContent}
        onApplyContent={undefined}
      />
    </div>
  );
}
