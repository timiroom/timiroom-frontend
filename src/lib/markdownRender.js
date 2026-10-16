import { marked } from "marked";
import DOMPurify from "dompurify";
import TurndownService from "turndown";

marked.setOptions({ gfm: true, breaks: true });

/**
 * 마크다운을 화면에 넣을 HTML로 바꾼다. 사용자가 쓴 글이므로 반드시 DOMPurify로 거른다.
 * DOMPurify는 브라우저에서만 동작해 서버 렌더링 중에는 빈 문자열을 돌려준다.
 */
export function renderMarkdown(markdown) {
  if (typeof window === "undefined" || !markdown) return "";
  return DOMPurify.sanitize(marked.parse(String(markdown)), { USE_PROFILES: { html: true } });
}

let turndown = null;
/** 예전 편집기가 남긴 HTML 문서를 마크다운으로 옮긴다. */
export function htmlToMarkdown(html) {
  if (!html) return "";
  if (!turndown) {
    turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });
  }
  return turndown.turndown(String(html)).replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** 저장된 HTML을 화면에 넣기 전에 거른다. 서버 렌더링 중에는 빈 문자열을 돌려준다. */
export function sanitizeHtml(html) {
  if (typeof window === "undefined" || !html) return "";
  return DOMPurify.sanitize(String(html), { USE_PROFILES: { html: true } });
}
