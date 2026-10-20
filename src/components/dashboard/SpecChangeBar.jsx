"use client";

import { ActionButton } from "@/components/ui";

/**
 * 명세 기준(스냅샷)의 상태에 따라 필요한 안내와 버튼만 보여 주는 바.
 *   none   — 아직 발행한 적 없음. PM에게 발행 버튼을 준다.
 *   match  — 화면의 문서가 발행 기준과 같음. 기준 번호와 기록 링크만 둔다.
 *   differ — 화면의 문서가 발행 기준과 다름(재생성 등). 다시 불러오기와 발행을 준다.
 * 상태는 문구 앞의 색 점(회색·초록·주황)으로도 구분한다.
 * 상태를 아직 모르면(status 없음) 아무것도 그리지 않는다.
 */
export function SpecChangeBar({ projectId, status, pending, canPublish, publishing, onReload, onPublish }) {
  if (!status) return null;
  const { state, revision } = status;
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
        {pending?.count > 0 && (
          <a className="spec-bar-pending" href={pending.count === 1 && pending.latestId
            ? `/spec-review?projectId=${projectId}&proposalId=${pending.latestId}`
            : `/spec-changes?projectId=${projectId}`}>
            <span className="spec-bar-pending__dot" aria-hidden="true" />
            승인 대기 변경안 {pending.count}개
          </a>
        )}
        {state === "differ" && <ActionButton size="sm" onClick={onReload}>문서 다시 불러오기</ActionButton>}
        {state !== "none" && <ActionButton size="sm" href={`/spec-changes?projectId=${projectId}`}>변경안·검사 기록</ActionButton>}
        {state !== "match" && canPublish && (
          <ActionButton size="sm" variant="primary" disabled={publishing} onClick={onPublish}>{publishing ? "발행 중…" : "현재 명세 기준 발행"}</ActionButton>
        )}
      </div>
      <style jsx>{`
        .spec-bar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; flex-shrink:0; padding:6px 20px; background:var(--bg); border-bottom:1px solid var(--border); font-size:12px; color:var(--text-2); }
        .spec-bar-note { display:flex; align-items:center; gap:8px; flex:1 1 280px; min-width:0; margin:0; line-height:1.5; }
        .spec-bar-note-strong { color:var(--text-1); }
        .spec-bar-dot { flex-shrink:0; width:8px; height:8px; margin:0 3px; border-radius:50%; background:var(--text-3); }
        .spec-bar-dot-match { background:var(--db-green); }
        .spec-bar-dot-differ { background:var(--db-orange); }
        .spec-bar-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
        .spec-bar-pending { display:inline-flex; align-items:center; gap:6px; height:26px; padding:0 10px; border-radius:999px; border:1px solid color-mix(in srgb, var(--db-orange) 45%, transparent); background:color-mix(in srgb, var(--db-orange) 10%, var(--surface)); color:var(--text-1); font-weight:600; font-size:12px; text-decoration:none; white-space:nowrap; }
        .spec-bar-pending:hover { background:color-mix(in srgb, var(--db-orange) 18%, var(--surface)); }
        .spec-bar-pending__dot { width:6px; height:6px; border-radius:50%; background:var(--db-orange); }
      `}</style>
    </div>
  );
}
