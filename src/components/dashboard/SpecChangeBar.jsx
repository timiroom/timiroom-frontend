"use client";

/**
 * 명세 기준(스냅샷)의 상태에 따라 필요한 안내와 버튼만 보여 주는 바.
 *   none   — 아직 발행한 적 없음. PM에게 발행 버튼을 준다.
 *   match  — 화면의 문서가 발행 기준과 같음. 기준 번호와 기록 링크만 둔다.
 *   differ — 화면의 문서가 발행 기준과 다름(재생성 등). 다시 불러오기와 발행을 준다.
 * 상태는 문구 앞의 색 점(회색·초록·주황)으로도 구분한다.
 * 상태를 아직 모르면(status 없음) 아무것도 그리지 않는다.
 */
export function SpecChangeBar({ projectId, status, canPublish, publishing, onReload, onPublish }) {
  if (!status) return null;
  const { state, revision } = status;
  const publishButton = canPublish && (
    <button type="button" className="spec-bar-primary" disabled={publishing} onClick={onPublish}>
      {publishing ? "발행 중…" : "현재 명세 기준 발행"}
    </button>
  );
  return (
    <div className="spec-bar">
      <p className={`spec-bar-note${state === "differ" ? " spec-bar-note-strong" : ""}`}>
        <span className={`spec-bar-dot spec-bar-dot-${state}`} aria-hidden="true" />
        {state === "none" && (canPublish
          ? "아직 명세 기준을 발행하지 않았습니다. 발행하면 이후 수정은 변경안 검토와 승인으로 적용됩니다."
          : "아직 명세 기준이 발행되지 않았습니다. PM이 발행하면 변경안 검토를 쓸 수 있습니다.")}
        {state === "match" && `기준 revision ${revision} 발행됨. 문서 수정은 변경안 검토와 승인으로 적용합니다.`}
        {state === "differ" && `화면의 문서가 발행 기준(revision ${revision})과 다릅니다.`}
      </p>
      <div className="spec-bar-actions">
        {state === "differ" && <button type="button" onClick={onReload}>문서 다시 불러오기</button>}
        {state !== "none" && <a className="spec-bar-link" href={`/spec-changes?projectId=${projectId}`}>변경안·검사 기록</a>}
        {state !== "match" && publishButton}
      </div>
      <style jsx>{`
        .spec-bar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; flex-shrink:0; padding:6px 20px; background:var(--bg); border-bottom:1px solid var(--border); font-size:12px; color:var(--text-2); }
        .spec-bar-note { display:flex; align-items:center; gap:8px; flex:1 1 280px; min-width:0; margin:0; line-height:1.5; }
        .spec-bar-note-strong { color:var(--text-1); }
        .spec-bar-dot { flex-shrink:0; width:8px; height:8px; margin:0 3px; border-radius:50%; background:var(--text-3); }
        .spec-bar-dot-match { background:var(--db-green); }
        .spec-bar-dot-differ { background:var(--db-orange); }
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
