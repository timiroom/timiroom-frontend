"use client";

/**
 * 발행된 명세 기준과 변경안 흐름의 진입점을 모아 둔 안내 바.
 * 바로 위 문서 탭바와 같은 톤(--bg, 1px 구분선, 12px)을 쓰고,
 * 버튼은 AI 도구 연결 패널과 같은 규칙(보조 = 흰 바탕 테두리, 주요 = --text-1 채움)을 따른다.
 */
export function SpecChangeBar({ projectId, canPublish, publishing, onReload, onPublish }) {
  return (
    <div className="spec-bar">
      <p className="spec-bar-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        발행 후 문서 수정은 변경안 검토와 승인으로 적용합니다.
      </p>
      <div className="spec-bar-actions">
        <button type="button" onClick={onReload}>문서 다시 불러오기</button>
        <a className="spec-bar-link" href={`/spec-changes?projectId=${projectId}`}>변경안·검사 기록</a>
        {canPublish && (
          <button type="button" className="spec-bar-primary" disabled={publishing} onClick={onPublish}>
            {publishing ? "발행 중…" : "현재 명세 기준 발행"}
          </button>
        )}
      </div>
      <style jsx>{`
        .spec-bar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; flex-shrink:0; padding:6px 20px; background:var(--bg); border-bottom:1px solid var(--border); font-size:12px; color:var(--text-2); }
        .spec-bar-note { display:flex; align-items:center; gap:8px; flex:1 1 280px; min-width:0; margin:0; line-height:1.5; }
        .spec-bar-note svg { flex-shrink:0; color:var(--text-3); }
        .spec-bar-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
        button, .spec-bar-link { display:inline-flex; align-items:center; min-height:28px; padding:0 12px; border:1px solid var(--border-2); border-radius:var(--db-radius-sm); background:var(--surface); color:var(--text-2); font-family:inherit; font-size:12px; font-weight:600; line-height:1; white-space:nowrap; text-decoration:none; cursor:pointer; transition:var(--db-transition); }
        button:hover:not(:disabled), .spec-bar-link:hover { background:var(--bg); color:var(--text-1); }
        .spec-bar-primary { background:var(--text-1); border-color:var(--text-1); color:var(--bg); }
        button.spec-bar-primary:hover:not(:disabled) { background:var(--db-purple-800); color:var(--accent-fg); }
        button:disabled { opacity:.55; cursor:not-allowed; }
        button:focus-visible, .spec-bar-link:focus-visible { outline:2px solid var(--text-1); outline-offset:2px; }
      `}</style>
    </div>
  );
}
