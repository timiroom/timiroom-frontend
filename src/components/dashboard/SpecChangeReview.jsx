"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { specChange, proposeManualChange, reviewChange, integrationJob, approveChange, rejectChange } from "@/lib/integrationApi";
import { Badge } from "@/components/ui";

const labels = { PRD: "PRD", API_SPEC: "API 명세", DB_SCHEMA: "DB 스키마", FEATURE_LIST: "기능 명세" };
const terminal = new Set(["COMPLETED", "FAILED"]);
function pretty(value) { if (typeof value === "string") { try { value = JSON.parse(value); } catch {} } return JSON.stringify(value, null, 2); }
const statusLabels = { GENERATING: "생성 중", READY: "검토 대기", APPROVED: "승인됨", REJECTED: "거절됨", STALE: "기준 변경", FAILED: "실패" };
const statusTones = { READY: "warning", APPROVED: "success", REJECTED: "neutral", STALE: "warning", FAILED: "danger", GENERATING: "info" };
const jobLabels = { QUEUED: "접수됨", RUNNING: "진행 중", COMPLETED: "완료", FAILED: "실패" };
const severityTones = { WARNING: "warning", INCONCLUSIVE: "info", PASS: "success" };

// 문서는 JSON 문자열로 온다. 맨 위 항목 단위로 비교해 바뀐 항목만 보여 주고, 글은 줄바꿈을 살려 그대로 보여 준다.
function parseDocument(value) { if (typeof value === "string") { try { return JSON.parse(value); } catch { return value; } } return value; }
// PRD 본문처럼 HTML로 저장된 글은 태그를 걷어 내고 문단만 줄바꿈으로 남긴다(화면에 그리지 않고 글로만 보여 준다).
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
function readable(value) {
  if (value == null || value === "") return "(비어 있음)";
  if (typeof value !== "string") return JSON.stringify(value, null, 2);
  return /<\/?[a-z][^>]*>/i.test(value) ? htmlToText(value) : value;
}
function changedFields(before, after) {
  const prev = parseDocument(before), next = parseDocument(after);
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  if (!isObject(prev) || !isObject(next)) {
    return { changed: JSON.stringify(prev) === JSON.stringify(next) ? [] : [{ key: null, before: readable(prev), after: readable(next) }], unchanged: [] };
  }
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  const changed = [], unchanged = [];
  keys.forEach((key) => {
    if (JSON.stringify(prev[key]) === JSON.stringify(next[key])) unchanged.push(key);
    else changed.push({ key, before: readable(prev[key]), after: readable(next[key]) });
  });
  return { changed, unchanged };
}

export function SpecChangeReview({ project, proposalId, draft, canApprove, allowedTargets = [], onClose, onApproved, onProposalChanged }) {
  const [proposal, setProposal] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [corrections, setCorrections] = useState(null);
  const [targets, setTargets] = useState(draft ? [draft.sourceType] : []);
  const [requestKey] = useState(() => crypto.randomUUID());
  const dialog = useRef(null);
  const activeId = proposal?.proposalId || proposalId;
  const refresh = useCallback(async (id) => {
    const data = await specChange(project.id, id); setProposal(data);
    if (data.proposalId !== proposalId) onProposalChanged?.(data.proposalId);
    return data;
  }, [project.id, proposalId, onProposalChanged]);
  useEffect(() => {
    let active = true;
    if (proposalId) specChange(project.id, proposalId).then((data) => { if (active) setProposal(data); }).catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [project.id, proposalId]);
  useEffect(() => {
    if (!activeId || ["APPROVED", "REJECTED", "FAILED"].includes(proposal?.status)) return;
    let active = true, pending = false;
    const timer = window.setInterval(async () => {
      if (pending) return; pending = true;
      try { const data = await specChange(project.id, activeId); if (active) setProposal(data); }
      catch (failure) { if (active) setError(failure.message); }
      finally { pending = false; }
    }, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [activeId, project.id, proposal?.status]);
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
        const controls = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')];
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
  const ready = proposal?.status === "READY" && !proposal.stale;
  const canRevise = canApprove || (proposal && Object.keys(proposal.documents || {}).every((type) => allowedTargets.includes(type)));
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
        <p className="review-state"><Badge tone={statusTones[proposal.status] ?? "neutral"}>{statusLabels[proposal.status] ?? proposal.status}</Badge> 변경안 revision {proposal.proposalRevision} · 기준 revision {proposal.base?.revision ?? "-"}</p>
        {proposal.stale && <p role="status" className="review-error">명세 기준이 변경되었습니다. 최신 명세를 확인하고 새 변경안을 요청해 주세요. 아래 검사는 이전 기준의 기록입니다.</p>}
        <p><a href={`/spec-changes?projectId=${project.id}`}>변경안·검사 기록에서 다시 찾기</a></p>
        <p className={proposal.artifactReviewPassed ? "review-pass" : "review-note"}>문서 교차검증: {proposal.artifactReviewPassed ? "통과" : "통과 전"} · 코드의 PR 검증은 별도로 요청해야 합니다.</p>
        {proposal.artifactReview && <section aria-label="문서 교차검증 결과">
          <h3>문서 교차검증 결과 · {proposal.artifactReview.passed ? "통과" : "검토 필요"}</h3>
          <p>{proposal.artifactReview.summary}</p>
          {(proposal.artifactReview.findings || []).map((finding, index) => <article key={index}>
            <h4><Badge tone={severityTones[finding.severity] ?? "neutral"}>{finding.severity}</Badge> {finding.area}</h4><p>{finding.message}</p>
            {finding.evidence?.length > 0 && <ul>{finding.evidence.map((item, i) => <li key={i}>{item}</li>)}</ul>}
            {finding.recommendation && <p>{finding.recommendation}</p>}
          </article>)}
        </section>}
        {proposal.impact?.summary && <p>{proposal.impact.summary}</p>}
      </>}
      {corrections && <section aria-label="변경안 보완"><h3>검사 내용을 반영해 보완하세요</h3><p>이 변경안의 수정 내용을 이어 사용하며, 새 변경안으로 저장합니다. 원본은 승인 전까지 바뀌지 않습니다.</p>
        {Object.keys(corrections).map((type) => <label key={type} className="correction">{labels[type]} 보완 내용
          <textarea aria-label={`${labels[type]} 보완 내용`} rows={10} value={corrections[type]} onChange={(event) => setCorrections((current) => ({ ...current, [type]: event.target.value }))} />
        </label>)}
      </section>}
      {documentTypes.map((type) => {
        const original = (proposal?.base || draft?.snapshot)?.documents.find((doc) => doc.type === type);
        const afterValue = proposal ? proposal.documents[type] : draft.document;
        const { changed, unchanged } = changedFields(original?.content, afterValue);
        return <article key={type}><h3>{labels[type] || type} <span className="review-count">바뀐 항목 {changed.length}개</span></h3>
          {changed.length === 0 && <p className="review-note">바뀐 내용이 없습니다.</p>}
          {changed.map((field) => <div key={field.key ?? "document"} className="review-field">
            {field.key && <h4 className="review-key">{field.key}</h4>}
            <div className="review-columns">
              <div><h4>변경 전</h4><pre tabIndex={0} className="review-before">{field.before}</pre></div>
              <div><h4>변경 후</h4><pre tabIndex={0} className="review-after">{field.after}</pre></div>
            </div>
          </div>)}
          {unchanged.length > 0 && <p className="review-note">바뀌지 않은 항목 {unchanged.length}개: {unchanged.join(", ")}</p>}
          <details className="review-full"><summary>문서 전체 보기</summary><div className="review-columns">
            <div><h4>변경 전</h4><pre tabIndex={0}>{pretty(original?.content)}</pre></div>
            <div><h4>변경 후</h4><pre tabIndex={0}>{pretty(afterValue)}</pre></div>
          </div></details>
        </article>;
      })}
      {running && <p role="status">{job.kind === "ARTIFACT_REVIEW" ? "문서 교차검증" : "변경안 생성"} · {jobLabels[job.status] ?? job.status} · 화면을 닫아도 작업은 계속됩니다.</p>}
      {!draft && !proposal && !error && <p role="status">변경안을 불러오고 있습니다.</p>}
      <p role="alert" className="review-error">{error}</p>
    </div>
    <footer>
      {ready && canRevise && !corrections && <button disabled={busy || running} onClick={() => setCorrections(Object.fromEntries(Object.entries(proposal.documents).map(([type, value]) => [type, pretty(value)])))}>이 변경안 보완하기</button>}
      {ready && corrections && <><button disabled={busy || running} onClick={() => setCorrections(null)}>보완 취소</button><button disabled={busy || running} onClick={() => run(async () => {
        let documents; try { documents = Object.fromEntries(Object.entries(corrections).map(([type, value]) => [type, JSON.parse(value)])); }
        catch { throw new Error("보완 내용의 JSON 형식을 확인해 주세요."); }
        const expectedHashes = Object.fromEntries(Object.keys(documents).map((type) => [type, proposal.base.documents.find((doc) => doc.type === type)?.hash]));
        const next = await proposeManualChange(project.id, { snapshotId: proposal.snapshotId, targets: Object.keys(documents), documents, expectedHashes,
          instruction: `변경안 ${proposal.proposalId}의 수정 내용을 이어서 검사 지적을 보완한다.`, constraints: [], idempotencyKey: crypto.randomUUID() });
        setCorrections(null); setJob(next);
        if (terminal.has(next.status) && next.result?.proposalId) await refresh(next.result.proposalId);
      })}>보완안 생성</button></>}
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
      .review-backdrop { position:fixed; inset:0; z-index:1000; background:color-mix(in srgb, var(--text-1) 38%, transparent); display:flex; align-items:center; justify-content:center; padding:24px; }
      .review-dialog { width:min(1100px,100%); max-height:90vh; background:var(--bg); color:var(--text-1); border:1px solid var(--border); border-radius:16px; display:flex; flex-direction:column; box-shadow:0 24px 80px #0002; outline:none; }
      header,footer { padding:20px 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; } header { justify-content:space-between; border-bottom:1px solid var(--border); } footer { border-top:1px solid var(--border); }
      h2 { font-size:22px; margin:4px 0; } h3 { font-size:17px; margin:24px 0 8px; } h4 { font-size:12px; color:var(--text-2); } p { font-size:13px; line-height:1.7; } .eyebrow { margin:0; color:var(--text-2); }
      .review-body { overflow:auto; padding:16px 24px; } .review-columns { display:grid; grid-template-columns:1fr 1fr; gap:16px; } .review-columns>div { min-width:0; }
      pre { border:1px solid var(--border); border-radius:8px; padding:16px; background:white; overflow:auto; max-height:430px; font-size:12px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; }
      button { padding:10px 15px; border:1px solid var(--border-2); border-radius:8px; color:var(--text-1); background:white; font:inherit; font-size:13px; cursor:pointer; } button:disabled { opacity:.5; cursor:default; }
      .review-primary { background:var(--text-1); color:white; border-color:var(--text-1); } button:focus-visible,input:focus-visible,pre:focus-visible,a:focus-visible { outline:2px solid #7d4cfc; outline-offset:3px; }
      a { color:var(--text-1); text-decoration:underline; text-decoration-color:var(--border-2); text-underline-offset:3px; } a:hover { text-decoration-color:var(--text-1); }
      .review-state { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .review-count { margin-left:6px; font-size:12px; font-weight:500; color:var(--text-3); }
      .review-field { margin:12px 0 18px; } .review-key { margin:0 0 6px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:var(--text-1); }
      .review-before { background:color-mix(in srgb, var(--db-red) 4%, white); } .review-after { background:color-mix(in srgb, var(--db-green) 5%, white); }
      .review-before, .review-after { font-family:inherit; font-size:13px; }
      .review-full { margin-top:10px; font-size:13px; } .review-full summary { cursor:pointer; color:var(--text-2); }
      .review-pass { color:#0f7a53; } .review-note { color:var(--text-2); } .review-error { color:#b4413f; } .scope { display:inline-flex; align-items:center; gap:6px; margin:10px 18px 10px 0; font-size:13px; }
      fieldset { border:1px solid var(--border); border-radius:8px; } legend { font-size:13px; }
      .correction { display:block; margin:16px 0; font-size:13px; } textarea { display:block; width:100%; box-sizing:border-box; padding:12px; margin-top:8px; font-family:monospace; border:1px solid var(--border-2); border-radius:8px; }
      @media(max-width:700px) { .review-backdrop { padding:8px; } .review-columns { grid-template-columns:1fr; } header,footer,.review-body { padding:16px; } h2 { font-size:19px; } }
    `}</style>
  </section></div>;
}
