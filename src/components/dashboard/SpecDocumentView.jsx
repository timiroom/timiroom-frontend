"use client";

import { humanizeSpecKey, isSpecValueChanged, parseStructuredValue } from "@/lib/specPresentation.mjs";

// 앱 공통 색을 따른다. 바뀐 부분만 경고 톤(노랑)으로 강조한다.
const palette = {
  border: "var(--border)",
  subtleBorder: "var(--border)",
  text: "var(--text-1)",
  muted: "var(--text-3)",
  surface: "var(--surface)",
  itemBg: "var(--bg)",
  changedBg: "color-mix(in srgb, #f59e0b 6%, var(--surface))",
  changedBorder: "color-mix(in srgb, #d97706 45%, transparent)",
};

// PRD 본문처럼 HTML로 저장된 글은 태그를 걷어 내고 문단만 줄바꿈으로 남긴다.
function htmlToText(html) {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "· ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scalarLabel(value) {
  if (value === true) return "예";
  if (value === false) return "아니요";
  if (value == null || value === "") return "입력된 내용 없음";
  const text = String(value);
  return /<\/?[a-z][^>]*>/i.test(text) ? htmlToText(text) : text;
}

function itemTitle(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return `항목 ${index + 1}`;
  if (item.name) return item.name;
  if (item.method || item.path) return [item.method, item.path].filter(Boolean).join(" ");
  if (item.metric) return item.metric;
  if (item.milestone) return item.milestone;
  if (item.featureId) return item.featureId;
  return `항목 ${index + 1}`;
}

function ValueNode({ value, depth = 0 }) {
  const parsed = parseStructuredValue(value);

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return <p style={{ margin: 0, color: palette.muted }}>등록된 항목이 없습니다.</p>;
    const scalarOnly = parsed.every((item) => item == null || typeof item !== "object");
    if (scalarOnly) {
      return <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
        {parsed.map((item, index) => <li key={index} style={{ lineHeight: 1.65 }}>{scalarLabel(item)}</li>)}
      </ul>;
    }
    return <div style={{ display: "grid", gap: 8 }}>
      {parsed.map((item, index) => <article key={index} style={{
        padding: depth > 1 ? "8px 10px" : "10px 12px",
        border: `1px solid ${palette.subtleBorder}`,
        background: palette.itemBg,
      }}>
        <div style={{ marginBottom: 7, fontSize: 12, fontWeight: 800, color: palette.text }}>
          <span style={{ color: palette.muted, marginRight: 6 }}>{String(index + 1).padStart(2, "0")}</span>
          {itemTitle(item, index)}
        </div>
        <ValueNode value={item} depth={depth + 1} />
      </article>)}
    </div>;
  }

  if (parsed && typeof parsed === "object") {
    const entries = Object.entries(parsed);
    if (entries.length === 0) return <p style={{ margin: 0, color: palette.muted }}>입력된 내용이 없습니다.</p>;
    return <dl style={{ margin: 0, display: "grid", gap: 8 }}>
      {entries.map(([key, child]) => <div key={key} style={{
        display: "grid",
        gridTemplateColumns: depth > 1 ? "110px minmax(0, 1fr)" : "130px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start",
      }}>
        <dt style={{ fontSize: 11, lineHeight: 1.6, fontWeight: 700, color: palette.muted }}>
          {humanizeSpecKey(key)}
        </dt>
        <dd style={{ margin: 0, minWidth: 0, fontSize: 12, lineHeight: 1.65, color: palette.text, wordBreak: "keep-all", overflowWrap: "anywhere" }}>
          <ValueNode value={child} depth={depth + 1} />
        </dd>
      </div>)}
    </dl>;
  }

  return <span style={{ whiteSpace: "pre-line", wordBreak: "keep-all", overflowWrap: "anywhere" }}>{scalarLabel(parsed)}</span>;
}

export function SpecDocumentView({ value, compareValue, emptyLabel = "문서 내용이 없습니다." }) {
  const parsed = parseStructuredValue(value);
  const compared = parseStructuredValue(compareValue);

  if (parsed == null || parsed === "") {
    return <div style={{ padding: 18, color: palette.muted }}>{emptyLabel}</div>;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return <div style={{ padding: 14 }}><ValueNode value={parsed} /></div>;
  }

  return <div style={{ display: "grid", gap: 10 }}>
    {Object.entries(parsed).map(([key, sectionValue]) => {
      const comparison = compared && typeof compared === "object" && !Array.isArray(compared)
        ? compared[key]
        : undefined;
      const changed = compareValue !== undefined && isSpecValueChanged(sectionValue, comparison);
      return <section key={key} style={{
        border: `1px solid ${changed ? palette.changedBorder : palette.border}`,
        borderLeftWidth: changed ? 3 : 1,
        background: changed ? palette.changedBg : palette.surface,
      }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "9px 12px", borderBottom: `1px solid ${palette.subtleBorder}`,
        }}>
          <strong style={{ fontSize: 13, color: palette.text }}>{humanizeSpecKey(key)}</strong>
          {changed && <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309" }}>변경됨</span>}
        </header>
        <div style={{ padding: "11px 12px", fontSize: 13, lineHeight: 1.7 }}>
          <ValueNode value={sectionValue} depth={0} />
        </div>
      </section>;
    })}
  </div>;
}
