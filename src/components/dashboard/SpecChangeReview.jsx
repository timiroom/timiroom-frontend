"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { specChange, proposeManualChange, reviewChange, integrationJob, approveChange, rejectChange } from "@/lib/integrationApi";

const labels = { PRD: "PRD", API_SPEC: "API 명세", DB_SCHEMA: "DB 스키마", FEATURE_LIST: "기능 명세" };
const terminal = new Set(["COMPLETED", "FAILED"]);
function pretty(value) { if (typeof value === "string") { try { value = JSON.parse(value); } catch {} } return JSON.stringify(value, null, 2); }

export function SpecChangeReview({ project, proposalId, draft, canApprove, allowedTargets = [], onClose, onApproved }) {
  const [proposal, setProposal] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [targets, setTargets] = useState(draft ? [draft.sourceType] : []);
  const [requestKey] = useState(() => crypto.randomUUID());
  const dialog = useRef(null);
  const activeId = proposal?.proposalId || proposalId;
  const refresh = useCallback(async (id) => {
    const data = await specChange(project.id, id); setProposal(data); return data;
  }, [project.id]);
  useEffect(() => {
    let active = true;
    if (proposalId) specChange(project.id, proposalId).then((data) => { if (active) setProposal(data); }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [project.id, proposalId]);
  useEffect(() => {
    if (!job?.jobId || terminal.has(job.status)) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const next = await integrationJob(project.id, job.jobId);
        if (!active) return; setJob(next);
        const id = next.result?.proposalId || activeId;
        if (id && terminal.has(next.status)) await refresh(id);
        if (next.status === "FAILED") setError("작업을 완료하지 못했습니다. 새 요청 전에 현재 변경안 상태를 확인해 주세요.");
      } catch (failure) { if (active) { setError(failure.message); setJob(null); } }
    }, 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [job?.jobId, job?.status, project.id, activeId, refresh]);
  useEffect(() => {
    const previous = document.activeElement; const panel = dialog.current;
    panel?.focus();
    function key(event) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "Tab") {
        const controls = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];
        if (!controls.length) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === panel)) { event.preventDefault(); controls.at(-1).focus(); }
        if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
      }
    }
    panel?.addEventListener("keydown", key);
    return () => { panel?.removeEventListener("keydown", key); previous?.focus(); };
  }, [onClose]);
  async function run(action) {
    setBusy(true); setError("");
    try { await action(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const running = job && !terminal.has(job.status);
  const ready = proposal?.status === "READY";
  const documentTypes = proposal ? Object.keys(proposal.documents || {}) : draft ? [draft.sourceType] : [];
  return <div className="review-backdrop"><section className="review-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-title">
    <header><div><p className="eyebrow">{project.name || "프로젝트"} · 문서 변경안</p><h2 id="review-title">{proposal ? "변경 내용을 검토하세요" : "수정 범위를 선택하세요"}</h2></div><button onClick={onClose} aria-label="변경안 검토 닫기">닫기</button></header>
    <div className="review-body">
      {!proposal && draft && <>
        <p>원본은 승인 후 적용됩니다. 함께 수정할 수 있는 문서를 선택하면 티미룸이 선택한 범위에서 연결 문서의 영향을 분석합니다.</p>
        <fieldset disabled={busy || Boolean(job)}><legend>수정 허용 범위</legend>{draft.snapshot.documents.filter((item) => allowedTargets.includes(item.type)).map((item) => <label className="scope" key={item.type}>
          <input type="checkbox" checked={targets.includes(item.type)} disabled={item.type === draft.sourceType} onChange={(event) => setTargets((current) => event.target.checked ? [...current, item.type] : current.filter((type) => type !== item.type))} />{labels[item.type]}
        </label>)}</fieldset>
        <p>기준 revision {draft.snapshot.revision} · {draft.snapshot.snapshotId}</p>
      </>}
      {proposal && <>
        <p className="review-state">{proposal.status} · 변경안 revision {proposal.proposalRevision} · 기준 revision {proposal.base.revision}</p>
        <p className={proposal.artifactReviewPassed ? "review-pass" : "review-note"}>문서 교차검증: {proposal.artifactReviewPassed ? "PASS" : "통과 전"} · 코드의 PR 검증은 별도로 요청해야 합니다.</p>
        {proposal.artifactReview && <section aria-label="문서 교차검증 결과">
          <h3>문서 교차검증 결과 · {proposal.artifactReview.passed ? "PASS" : "검토 필요"}</h3>
          <p>{proposal.artifactReview.summary}</p>
          {(proposal.artifactReview.findings || []).map((finding, index) => <article key={index}>
            <h4>{finding.severity} · {finding.area}</h4><p>{finding.message}</p>
            {finding.evidence?.length > 0 && <ul>{finding.evidence.map((item, i) => <li key={i}>{item}</li>)}</ul>}
            {finding.recommendation && <p>{finding.recommendation}</p>}
          </article>)}
        </section>}
        {proposal.impact?.summary && <p>{proposal.impact.summary}</p>}
      </>}
      {documentTypes.map((type) => {
        const original = (proposal?.base || draft?.snapshot)?.documents.find((doc) => doc.type === type);
        return <article key={type}><h3>{labels[type] || type}</h3><div className="review-columns">
          <div><h4>변경 전</h4><pre tabIndex={0}>{pretty(original?.content)}</pre></div>
          <div><h4>변경 후</h4><pre tabIndex={0}>{pretty(proposal ? proposal.documents[type] : draft.document)}</pre></div>
        </div></article>;
      })}
      {running && <p role="status">{job.kind === "ARTIFACT_REVIEW" ? "문서 교차검증" : "변경안 생성"} · {job.status} · 화면을 닫아도 작업은 계속됩니다.</p>}
      {!draft && !proposal && !error && <p role="status">변경안을 불러오고 있습니다.</p>}
      <p role="alert" className="review-error">{error}</p>
    </div>
    <footer>
      {!proposal && draft && <button className="review-primary" disabled={busy || Boolean(job)} onClick={() => run(async () => {
        const base = draft.snapshot.documents.find((item) => item.type === draft.sourceType);
        const next = await proposeManualChange(project.id, { snapshotId: draft.snapshot.snapshotId, targets,
          instruction: "사용자가 직접 수정한 문서와 선택한 연결 문서의 정합성을 반영한다.", constraints: [],
          documents: { [draft.sourceType]: draft.document }, expectedHashes: { [draft.sourceType]: base.hash }, idempotencyKey: requestKey });
        setJob(next);
        if (terminal.has(next.status) && next.result?.proposalId) await refresh(next.result.proposalId);
      })}>변경안 생성</button>}
      {ready && <button disabled={busy || running} onClick={() => run(async () => {
        const next = await reviewChange(project.id, activeId, proposal.proposalRevision, crypto.randomUUID()); setJob(next);
        if (terminal.has(next.status)) await refresh(activeId);
      })}>문서 교차검증 요청</button>}
      {ready && canApprove && <>
        <button disabled={busy || running} onClick={() => run(async () => { await rejectChange(project.id, activeId, proposal.proposalRevision); await refresh(activeId); })}>거절</button>
        <button className="review-primary" disabled={busy || running || !proposal.artifactReviewPassed} onClick={() => run(async () => {
          await approveChange(project.id, activeId, proposal.proposalRevision); await refresh(activeId); await onApproved?.();
        })}>승인하고 기준 발행</button>
      </>}
      {ready && !canApprove && <p>PM의 검토와 승인을 기다립니다.</p>}
    </footer>
    <style jsx>{`
      .review-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(26,25,22,.38); display:flex; align-items:center; justify-content:center; padding:24px; }
      .review-dialog { width:min(1100px,100%); max-height:90vh; background:#f7f6f3; color:#1a1916; border:1px solid #dedcd5; border-radius:16px; display:flex; flex-direction:column; box-shadow:0 24px 80px #0002; outline:none; }
      header,footer { padding:20px 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; } header { justify-content:space-between; border-bottom:1px solid #dedcd5; } footer { border-top:1px solid #dedcd5; }
      h2 { font-size:22px; margin:4px 0; } h3 { font-size:17px; margin:24px 0 8px; } h4 { font-size:12px; color:#6b6960; } p { font-size:13px; line-height:1.7; } .eyebrow { margin:0; color:#6b6960; }
      .review-body { overflow:auto; padding:16px 24px; } .review-columns { display:grid; grid-template-columns:1fr 1fr; gap:16px; } .review-columns>div { min-width:0; }
      pre { border:1px solid #dedcd5; border-radius:8px; padding:16px; background:white; overflow:auto; max-height:430px; font-size:12px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; }
      button { padding:10px 15px; border:1px solid #ccc9bf; border-radius:8px; color:#1a1916; background:white; font:inherit; font-size:13px; cursor:pointer; } button:disabled { opacity:.5; cursor:default; }
      .review-primary { background:#1a1916; color:white; border-color:#1a1916; } button:focus-visible,input:focus-visible,pre:focus-visible { outline:2px solid #7d4cfc; outline-offset:3px; }
      .review-pass { color:#0f7a53; } .review-note { color:#6b6960; } .review-error { color:#b4413f; } .scope { display:inline-flex; align-items:center; gap:6px; margin:10px 18px 10px 0; font-size:13px; }
      fieldset { border:1px solid #dedcd5; border-radius:8px; } legend { font-size:13px; }
      @media(max-width:700px) { .review-backdrop { padding:8px; } .review-columns { grid-template-columns:1fr; } header,footer,.review-body { padding:16px; } h2 { font-size:19px; } }
    `}</style>
  </section></div>;
}
