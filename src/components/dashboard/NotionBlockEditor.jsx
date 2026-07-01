"use client";

import {
  useState, useCallback, useRef, useEffect,
  forwardRef, useImperativeHandle,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";

/* ── 색상 ── */
const C = {
  bg:     "var(--surface)",
  border: "rgba(0,0,0,0.07)",
  text:   "#1a1916",
  muted:  "rgba(55,53,47,0.45)",
  accent: "#6b6960",
};

/* ── 슬래시 커맨드 목록 ── */
const SLASH_CMDS = [
  { id: "text",    icon: "¶",    label: "텍스트",          desc: "일반 텍스트",      keys: ["텍스트","text"],
    run: (e) => e.chain().focus().setParagraph().run() },
  { id: "h1",      icon: "H1",   label: "제목 1",           desc: "큰 섹션 제목",    keys: ["제목1","h1","heading1"],
    run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { id: "h2",      icon: "H2",   label: "제목 2",           desc: "중간 섹션 제목",  keys: ["제목2","h2","heading2"],
    run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "h3",      icon: "H3",   label: "제목 3",           desc: "소 섹션 제목",    keys: ["제목3","h3","heading3"],
    run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "bullet",  icon: "•",    label: "글머리 기호 목록", desc: "순서 없는 목록",  keys: ["글머리","불릿","bullet","list"],
    run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "ordered", icon: "1.",   label: "번호 목록",         desc: "번호 붙은 목록",  keys: ["번호","숫자","ordered","number"],
    run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "todo",    icon: "☑",   label: "할 일 목록",        desc: "체크 가능한 목록", keys: ["할일","todo","check"],
    run: (e) => e.chain().focus().toggleTaskList().run() },
  { id: "quote",   icon: "❝",   label: "인용",              desc: "인용 블록",       keys: ["인용","quote","blockquote"],
    run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "code",    icon: "<>",  label: "코드 블록",          desc: "코드 블록",       keys: ["코드","code"],
    run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: "hr",      icon: "──",  label: "구분선",             desc: "가로 구분선",     keys: ["구분선","hr","divider"],
    run: (e) => e.chain().focus().setHorizontalRule().run() },
];

/* ── 슬래시 메뉴 컴포넌트 ── */
function SlashMenu({ visible, left, top, query, onSelect, selectedIdx, setSelectedIdx }) {
  const listRef = useRef(null);
  const filtered = SLASH_CMDS.filter(cmd =>
    !query ||
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.keys.some(k => k.includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (listRef.current && filtered[selectedIdx]) {
      const item = listRef.current.children[selectedIdx];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx, filtered]);

  if (!visible || !filtered.length) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: "fixed", left, top, zIndex: 9999,
        background: "white", border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        minWidth: 260, maxHeight: 360, overflowY: "auto", padding: "6px 4px",
      }}
    >
      <div style={{ padding: "2px 12px 6px", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        블록
      </div>
      {filtered.map((cmd, idx) => (
        <div
          key={cmd.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(cmd); }}
          onMouseEnter={() => setSelectedIdx(idx)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 10px", borderRadius: 7, cursor: "pointer",
            background: idx === selectedIdx ? "rgba(107,105,96,0.1)" : "transparent",
            transition: "background 0.1s",
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 7, flexShrink: 0,
            background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: C.accent,
          }}>{cmd.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{cmd.label}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{cmd.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 버블 메뉴 (텍스트 선택 시) ── */
function BubbleToolbar({ editor }) {
  if (!editor) return null;

  const BtnB = ({ active, onMouseDown, children, title }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onMouseDown(); }}
      title={title}
      style={{
        height: 28, minWidth: 28, padding: "0 6px",
        background: active ? "rgba(255,255,255,0.25)" : "transparent",
        border: "none", borderRadius: 5, cursor: "pointer",
        color: "white", fontSize: 12, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: active ? 1 : 0.75, transition: "all 0.1s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(255,255,255,0.25)" : "transparent"; }}
    >{children}</button>
  );
  const Sep = () => <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.3)", margin: "0 2px", flexShrink: 0 }} />;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 1,
      background: "#2d2d2d", borderRadius: 10, padding: "4px 8px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    }}>
      <BtnB active={editor.isActive("bold")}      onMouseDown={() => editor.chain().focus().toggleBold().run()}      title="굵게 (Ctrl+B)">
        <b>B</b>
      </BtnB>
      <BtnB active={editor.isActive("italic")}    onMouseDown={() => editor.chain().focus().toggleItalic().run()}    title="기울임 (Ctrl+I)">
        <i>I</i>
      </BtnB>
      <BtnB active={editor.isActive("underline")} onMouseDown={() => editor.chain().focus().toggleUnderline().run()} title="밑줄 (Ctrl+U)">
        <u>U</u>
      </BtnB>
      <BtnB active={editor.isActive("strike")}    onMouseDown={() => editor.chain().focus().toggleStrike().run()}    title="취소선">
        <s>S</s>
      </BtnB>
      <BtnB active={editor.isActive("highlight")} onMouseDown={() => editor.chain().focus().toggleHighlight().run()} title="형광펜">
        <span style={{ background: "#fef08a", color: "#1a1916", padding: "0 3px", borderRadius: 2 }}>H</span>
      </BtnB>
      <Sep />
      <BtnB active={editor.isActive("heading", { level: 1 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="제목 1">H1</BtnB>
      <BtnB active={editor.isActive("heading", { level: 2 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="제목 2">H2</BtnB>
      <BtnB active={editor.isActive("heading", { level: 3 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="제목 3">H3</BtnB>
      <Sep />
      <BtnB active={editor.isActive("bulletList")}  onMouseDown={() => editor.chain().focus().toggleBulletList().run()}  title="글머리 기호 목록">• ≡</BtnB>
      <BtnB active={editor.isActive("orderedList")} onMouseDown={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록">1. ≡</BtnB>
      <Sep />
      <BtnB active={editor.isActive("link")} onMouseDown={() => {
        if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); return; }
        const url = prompt("링크 URL:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }} title="링크">🔗</BtnB>
    </div>
  );
}

/* ══════════════════════════════════════
   NotionBlockEditor (forwardRef)
   ref.getHtml()   → 현재 HTML 반환
   ref.getText()   → 현재 텍스트 반환
   ref.setContent(html) → 내용 설정
══════════════════════════════════════ */
export const NotionBlockEditor = forwardRef(function NotionBlockEditor(
  { onChange, placeholder = "내용을 작성하세요... '/' 를 입력하면 명령어를 사용할 수 있습니다" },
  ref
) {
  const [slashMenu, setSlashMenu] = useState({
    visible: false, left: 0, top: 0, slashDocPos: null, query: "",
  });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const slashMenuRef = useRef(slashMenu);
  slashMenuRef.current = slashMenu;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
    ],
    editorProps: {
      attributes: {
        class: "notion-block-editor",
        spellcheck: "true",
      },
      handleKeyDown(view, event) {
        const menu = slashMenuRef.current;
        if (!menu.visible) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIdx(prev => {
            const filtered = SLASH_CMDS.filter(cmd =>
              !menu.query || cmd.label.toLowerCase().includes(menu.query.toLowerCase()) ||
              cmd.keys.some(k => k.includes(menu.query.toLowerCase()))
            );
            return Math.min(prev + 1, filtered.length - 1);
          });
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIdx(prev => Math.max(prev - 1, 0));
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const filtered = SLASH_CMDS.filter(cmd =>
            !menu.query || cmd.label.toLowerCase().includes(menu.query.toLowerCase()) ||
            cmd.keys.some(k => k.includes(menu.query.toLowerCase()))
          );
          if (filtered[selectedIdx]) applyCmd(view.state.tr, filtered[selectedIdx]);
          return true;
        }
        if (event.key === "Escape") {
          setSlashMenu(p => ({ ...p, visible: false }));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getText());
      checkSlash(e);
    },
    onSelectionUpdate: ({ editor: e }) => {
      checkSlash(e);
    },
  });

  /* ── 에디터 ref 노출 ── */
  useImperativeHandle(ref, () => ({
    getHtml:    () => editor?.getHTML() ?? "",
    getText:    () => editor?.getText() ?? "",
    setContent: (html) => {
      if (!editor) return;
      editor.commands.setContent(html || "<p></p>", false);
    },
    focus: () => editor?.commands.focus(),
  }), [editor]);

  /* ── 슬래시 감지 ── */
  function checkSlash(e) {
    const { state } = e;
    const { from, $from } = state.selection;
    const nodeStart = $from.start();
    const textBeforeCursor = state.doc.textBetween(nodeStart, from, "\n", "\0");

    const slashIdx = textBeforeCursor.lastIndexOf("/");
    if (slashIdx !== -1) {
      const beforeSlash = textBeforeCursor.slice(0, slashIdx).trim();
      if (beforeSlash === "") {
        const query = textBeforeCursor.slice(slashIdx + 1);
        const slashDocPos = nodeStart + slashIdx;
        const coords = e.view.coordsAtPos(slashDocPos + 1);
        setSlashMenu({
          visible: true,
          left: coords.left,
          top: coords.bottom + 6,
          slashDocPos,
          query,
        });
        setSelectedIdx(0);
        return;
      }
    }
    setSlashMenu(p => p.visible ? { ...p, visible: false } : p);
  }

  /* ── 커맨드 적용 ── */
  function applyCmd(_, cmd) {
    if (!editor) return;
    const menu = slashMenuRef.current;
    const from = menu.slashDocPos;
    const to = editor.state.selection.from;
    editor.chain().focus().deleteRange({ from, to }).run();
    cmd.run(editor);
    setSlashMenu(p => ({ ...p, visible: false }));
  }

  function handleSlashSelect(cmd) {
    applyCmd(null, cmd);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* 버블 메뉴 */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, placement: "top" }}
          shouldShow={({ editor: e, state }) => {
            const { from, to } = state.selection;
            return from !== to && !e.isActive("codeBlock");
          }}
        >
          <BubbleToolbar editor={editor} />
        </BubbleMenu>
      )}

      {/* 에디터 본문 */}
      <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 56px 120px" }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 슬래시 메뉴 */}
      <SlashMenu
        visible={slashMenu.visible}
        left={slashMenu.left}
        top={slashMenu.top}
        query={slashMenu.query}
        selectedIdx={selectedIdx}
        setSelectedIdx={setSelectedIdx}
        onSelect={handleSlashSelect}
      />

      <style>{`
        .notion-block-editor { outline: none; min-height: 200px; }
        .notion-block-editor > * + * { margin-top: 2px; }

        .notion-block-editor h1 {
          font-size: 2em; font-weight: 900; color: #1a1916;
          margin: 28px 0 6px; line-height: 1.2;
        }
        .notion-block-editor h2 {
          font-size: 1.5em; font-weight: 700; color: #1a1916;
          margin: 24px 0 4px; line-height: 1.3;
        }
        .notion-block-editor h3 {
          font-size: 1.2em; font-weight: 600; color: #1a1916;
          margin: 18px 0 4px; line-height: 1.4;
        }
        .notion-block-editor p {
          margin: 1px 0; line-height: 1.8; color: #374151;
          font-size: 15px;
        }
        .notion-block-editor p.is-empty::before {
          content: attr(data-placeholder);
          float: left; color: rgba(55,53,47,0.35);
          pointer-events: none; height: 0;
        }
        .notion-block-editor ul {
          padding-left: 1.5em; margin: 4px 0; list-style-type: disc;
        }
        .notion-block-editor ol {
          padding-left: 1.5em; margin: 4px 0; list-style-type: decimal;
        }
        .notion-block-editor li {
          margin: 2px 0; line-height: 1.8; color: #374151; font-size: 15px;
        }
        .notion-block-editor ul[data-type="taskList"] {
          list-style: none; padding-left: 0.25em;
        }
        .notion-block-editor ul[data-type="taskList"] li {
          display: flex; align-items: flex-start; gap: 8px;
        }
        .notion-block-editor ul[data-type="taskList"] li > label {
          flex-shrink: 0; margin-top: 3px; cursor: pointer;
        }
        .notion-block-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 16px; height: 16px; cursor: pointer; accent-color: #6b6960;
        }
        .notion-block-editor ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through; color: rgba(55,53,47,0.45);
        }
        .notion-block-editor blockquote {
          border-left: 3px solid #6b6960; margin: 8px 0;
          padding: 6px 0 6px 16px;
          color: rgba(55,53,47,0.65);
        }
        .notion-block-editor pre {
          background: #f0eeeb; border: 1px solid rgba(0,0,0,0.08);
          border-radius: 8px; padding: 16px 20px; margin: 8px 0;
          overflow-x: auto;
        }
        .notion-block-editor pre code {
          font-family: 'JetBrains Mono','Fira Code','Menlo',monospace;
          font-size: 13px; color: #6b6960; background: none;
          padding: 0; border-radius: 0;
        }
        .notion-block-editor code {
          font-family: 'JetBrains Mono','Fira Code','Menlo',monospace;
          font-size: 0.875em;
          background: rgba(135,131,120,0.15);
          color: #eb5757;
          padding: 2px 6px; border-radius: 4px;
        }
        .notion-block-editor hr {
          border: none; border-top: 1px solid rgba(0,0,0,0.1);
          margin: 20px 0;
        }
        .notion-block-editor a {
          color: #6b6960; text-decoration: underline;
          text-underline-offset: 2px;
        }
        .notion-block-editor mark {
          background: #fef9c3; color: inherit; border-radius: 2px;
          padding: 0 1px;
        }
        /* 첫 p의 placeholder */
        .notion-block-editor > p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(55,53,47,0.35); pointer-events: none;
          float: left; height: 0;
        }
      `}</style>
    </div>
  );
});
