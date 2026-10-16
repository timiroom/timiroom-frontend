"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdownRender";

const MODES = [
  { id: "write", label: "쓰기" },
  { id: "split", label: "나란히" },
  { id: "preview", label: "미리보기" },
];
const SPLIT_MIN_WIDTH = 820;

/**
 * 마크다운 편집기. 왼쪽에 쓰고 오른쪽에서 결과를 바로 본다.
 * 좁은 화면에서는 "나란히"를 빼고 쓰기·미리보기를 오간다.
 *   value / onChange   마크다운 원문
 *   notice             편집기 위에 띄울 안내(틀 밖 섹션 경고 등)
 */
export function MarkdownEditor({ value, onChange, placeholder = "마크다운으로 작성하세요", notice, ariaLabel = "문서 본문" }) {
  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  const [mode, setMode] = useState("split");
  const [wide, setWide] = useState(true);
  const html = useMemo(() => renderMarkdown(value), [value]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= SPLIT_MIN_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const activeMode = !wide && mode === "split" ? "write" : mode;

  // 선택 영역을 감싸거나 줄 앞에 표시를 붙인 뒤 커서를 되돌려 놓는다.
  function edit(transform) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const result = transform(value, start, end);
    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.start, result.end);
    });
  }
  const wrap = (before, after = before, fallback = "") => edit((text, start, end) => {
    const selected = text.slice(start, end) || fallback;
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    return { value: next, start: start + before.length, end: start + before.length + selected.length };
  });
  const prefixLines = (prefix) => edit((text, start, end) => {
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const block = text.slice(lineStart, end);
    const lines = block.split("\n");
    const numbered = typeof prefix === "function";
    const updated = lines.map((line, index) => (numbered ? prefix(index) : prefix) + line.replace(/^(#{1,6}\s+|[-*+]\s+|\d+\.\s+)/, "")).join("\n");
    const next = text.slice(0, lineStart) + updated + text.slice(end);
    return { value: next, start: lineStart, end: lineStart + updated.length };
  });

  const tools = [
    { label: "제목", title: "제목 (##)", run: () => prefixLines("## ") },
    { label: "소제목", title: "소제목 (###)", run: () => prefixLines("### ") },
    { label: "B", title: "굵게 (Ctrl+B)", strong: true, run: () => wrap("**", "**", "굵은 글") },
    { label: "I", title: "기울임 (Ctrl+I)", italic: true, run: () => wrap("*", "*", "기울인 글") },
    { label: "목록", title: "글머리 목록", run: () => prefixLines("- ") },
    { label: "번호", title: "번호 목록", run: () => prefixLines((index) => `${index + 1}. `) },
    { label: "인용", title: "인용", run: () => prefixLines("> ") },
    { label: "코드", title: "코드", run: () => wrap("`", "`", "코드") },
    { label: "링크", title: "링크", run: () => wrap("[", "](https://)", "링크 글") },
    { label: "표", title: "표 넣기", run: () => wrap("\n| 항목 | 내용 |\n| --- | --- |\n| ", " |  |\n", "") },
  ];

  function handleKeyDown(event) {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "b") { event.preventDefault(); wrap("**", "**", "굵은 글"); return; }
    if (mod && event.key.toLowerCase() === "i") { event.preventDefault(); wrap("*", "*", "기울인 글"); return; }
    const textarea = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const line = value.slice(lineStart, start);

    // 목록에서 Tab은 들여쓰기, Shift+Tab은 내어쓰기
    if (event.key === "Tab" && /^\s*([-*+]|\d+\.)\s/.test(line)) {
      event.preventDefault();
      if (event.shiftKey) {
        const removed = value.slice(lineStart).match(/^ {1,2}/)?.[0].length ?? 0;
        if (!removed) return;
        onChange(value.slice(0, lineStart) + value.slice(lineStart + removed));
        requestAnimationFrame(() => textarea.setSelectionRange(start - removed, end - removed));
      } else {
        onChange(`${value.slice(0, lineStart)}  ${value.slice(lineStart)}`);
        requestAnimationFrame(() => textarea.setSelectionRange(start + 2, end + 2));
      }
      return;
    }
    // 목록에서 Enter를 누르면 다음 항목 표시를 이어 준다. 빈 항목에서 누르면 목록을 끝낸다.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && start === end) {
      const match = /^(\s*)([-*+]|(\d+)\.)\s(.*)$/.exec(line);
      if (!match) return;
      event.preventDefault();
      if (!match[4].trim()) {
        onChange(value.slice(0, lineStart) + value.slice(start));
        requestAnimationFrame(() => textarea.setSelectionRange(lineStart, lineStart));
        return;
      }
      const marker = match[3] ? `${Number(match[3]) + 1}.` : match[2];
      const insert = `\n${match[1]}${marker} `;
      onChange(value.slice(0, start) + insert + value.slice(end));
      requestAnimationFrame(() => textarea.setSelectionRange(start + insert.length, start + insert.length));
    }
  }

  return (
    <div ref={rootRef} className="md-editor">
      <div className="md-editor__bar">
        <div className="md-editor__tools" role="toolbar" aria-label="서식">
          {tools.map((tool) => (
            <button key={tool.label} type="button" className="md-editor__tool" title={tool.title} aria-label={tool.title}
              disabled={activeMode === "preview"} onClick={tool.run}
              style={tool.strong ? { fontWeight: 700 } : tool.italic ? { fontStyle: "italic" } : undefined}>
              {tool.label}
            </button>
          ))}
        </div>
        <div className="md-editor__modes" role="tablist" aria-label="보기 방식">
          {MODES.filter((item) => wide || item.id !== "split").map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={activeMode === item.id}
              className={`md-editor__mode${activeMode === item.id ? " is-active" : ""}`} onClick={() => setMode(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {notice && <div className="md-editor__notice" role="status">{notice}</div>}
      <div className={`md-editor__body md-editor__body--${activeMode}`}>
        {activeMode !== "preview" && (
          <textarea ref={textareaRef} className="md-editor__input" value={value} placeholder={placeholder} aria-label={ariaLabel}
            spellCheck={false} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown} />
        )}
        {activeMode !== "write" && (
          <div className="md-editor__preview" aria-label="미리보기">
            {html ? <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="md-editor__empty">미리 볼 내용이 없습니다.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
