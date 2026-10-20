"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { specChange, proposeManualChange, reviewChange, integrationJob, approveChange, rejectChange } from "@/lib/integrationApi";
import { AiWorking, Badge } from "@/components/ui";
import { confirmDialog } from "@/lib/feedback";
import { SpecDocumentView } from "./SpecDocumentView";

const labels = { PRD: "PRD", API_SPEC: "API 명세", DB_SCHEMA: "DB 스키마", FEATURE_LIST: "기능 명세" };
const terminal = new Set(["COMPLETED", "FAILED"]);
function prettyJson(value) { if (typeof value === "string") { try { value = JSON.parse(value); } catch {} } return JSON.stringify(value, null, 2); }
const statusLabels = { GENERATING: "생성 중", READY: "검토 대기", APPROVED: "승인됨", REJECTED: "거절됨", STALE: "기준 변경", FAILED: "실패" };
const statusTones = { READY: "warning", APPROVED: "success", REJECTED: "neutral", STALE: "warning", FAILED: "danger", GENERATING: "info" };
const jobLabels = { QUEUED: "접수됨", RUNNING: "진행 중", COMPLETED: "완료", FAILED: "실패" };
const severityTones = { WARNING: "warning", INCONCLUSIVE: "info", PASS: "success" };

// 문서는 JSON 문자열로 온다. 맨 위 항목 단위로 비교해 바뀐 항목만 골라 문서 모양으로 보여 준다.
function parseDocument(value) { if (typeof value === "string") { try { return JSON.parse(value); } catch { return value; } } return value; }
const PRESENTATION_KEYS = new Set(["markdown", "htmlContent"]);
function changedParts(before, after) {
  const prev = parseDocument(before), next = parseDocument(after);
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  if (!isObject(prev) || !isObject(next)) {
    const same = JSON.stringify(prev) === JSON.stringify(next);
    return { count: same ? 0 : 1, before: same ? null : prev, after: same ? null : next, unchanged: [] };
  }
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  const allChanged = keys.filter((key) => JSON.stringify(prev[key]) !== JSON.stringify(next[key]));
  // markdown·htmlContent는 구조화 항목을 보여 주기 위한 사본이다. 다른 항목이 바뀌었으면 세지 않는다.
  const meaningful = allChanged.filter((key) => !PRESENTATION_KEYS.has(key));
  const changedKeys = meaningful.length ? meaningful : allChanged;
  const pick = (source) => Object.fromEntries(changedKeys.map((key) => [key, source[key] ?? null]));
  return { count: changedKeys.length, before: pick(prev), after: pick(next), unchanged: keys.filter((key) => !changedKeys.includes(key) && !PRESENTATION_KEYS.has(key)) };
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
  // 교차검증이 끝까지 돌았으면(경고가 있어도) PM이 확인하고 승인할 수 있다. 검증을 안 돌렸으면 승인할 수 없다.
  const reviewCompleted = Boolean(proposal?.artifactReview && proposal.artifactReview.inputComplete !== false && Array.isArray(proposal.artifactReview.findings));
  const reviewWarnings = (proposal?.artifactReview?.findings || []).filter((finding) => !["PASS", "INFO"].includes(finding.severity)).length;
  const ready = proposal?.status === "READY" && !proposal.stale;
  const canRevise = canApprove || (proposal && Object.keys(proposal.documents || {}).every((type) => allowedTargets.includes(type)));
  const documentTypes = proposal ? Object.keys(proposal.documents || {}) : draft ? [draft.sourceType] : [];
  return <div className="review-backdrop"><section className="review-dialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-title">
    <header><div><p className="eyebrow">{project.name || "프로젝트"} · 문서 변경안</p><h2 id="review-title">{proposal ? "변경 내용을 검토하세요" : "수정 범위를 선택하세요"}</h2></div><button onClick={onClose} aria-label="변경안 검토 닫기">닫기</button></header>
    <div className="review-body">
      {/* 진행 표시는 문서 비교보다 위에 둬서 열자마자 보이게 한다 */}
      {running && <div className="review-progress"><AiWorking key={job.jobId} startedAt={job.createdAt}
        label={`${job.kind === "ARTIFACT_REVIEW" ? "문서 교차검증" : "변경안 생성"} ${jobLabels[job.status] ?? job.status}`}
        hint={job.kind === "ARTIFACT_REVIEW" ? "바뀐 문서와 연결 문서가 서로 맞는지 AI가 확인합니다. 보통 1~2분 걸리고, 화면을 닫아도 계속됩니다." : "선택한 범위의 연결 문서까지 AI가 고칩니다. 보통 1~3분 걸리고, 화면을 닫아도 계속됩니다."} /></div>}
      {proposal?.status === "GENERATING" && !running && <div className="review-progress"><AiWorking startedAt={proposal.createdAt} label="변경안을 만들고 있습니다" hint="화면을 닫아도 계속되며, 끝나면 이 화면이 자동으로 바뀝니다." /></div>}
      {!proposal && draft && <>
        <p>원본은 승인 후 적용됩니다. 함께 수정할 수 있는 문서를 선택하면 티미룸이 선택한 범위에서 연결 문서의 영향을 분석합니다.</p>
        <fieldset disabled={busy || Boolean(job)}><legend>수정 허용 범위</legend>{draft.snapshot.documents.filter((item) => allowedTargets.includes(item.type)).map((item) => <label className="scope" key={item.type}>
          <input type="checkbox" checked={targets.includes(item.type)} disabled={item.type === draft.sourceType} onChange={(event) => setTargets((current) => event.target.checked ? [...current, item.type] : current.filter((type) => type !== item.type))} />{labels[item.type]}
        </label>)}</fieldset>
        <p>기준 명세 {draft.snapshot.revision}차 발행본에서 시작합니다.</p>
      </>}
      {proposal && <>
        <p className="review-state"><Badge tone={statusTones[proposal.status] ?? "neutral"}>{statusLabels[proposal.status] ?? proposal.status}</Badge> 변경안 {proposal.proposalRevision}번째 안 · 기준 명세 {proposal.base?.revision ?? "-"}차 발행본</p>
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
        const diff = changedParts(original?.content, afterValue);
        return <article key={type}><h3>{labels[type] || type} <span className="review-count">바뀐 항목 {diff.count}개</span></h3>
          {diff.count === 0 ? <p className="review-note">바뀐 내용이 없습니다.</p> : <div className="review-columns">
            <div><h4>변경 전</h4><div className="review-preview review-before" tabIndex={0}><SpecDocumentView value={diff.before} emptyLabel="(없던 항목)" /></div></div>
            <div><h4>변경 후</h4><div className="review-preview review-after" tabIndex={0}><SpecDocumentView value={diff.after} emptyLabel="(지운 항목)" /></div></div>
          </div>}
          {diff.unchanged.length > 0 && <p className="review-note">바뀌지 않은 항목 {diff.unchanged.length}개는 접어 두었습니다.</p>}
          <details className="review-full"><summary>문서 전체 보기</summary><div className="review-columns">
            <div><h4>변경 전</h4><div className="review-preview" tabIndex={0}><SpecDocumentView value={original?.content} compareValue={afterValue} /></div></div>
            <div><h4>변경 후</h4><div className="review-preview" tabIndex={0}><SpecDocumentView value={afterValue} compareValue={original?.content} /></div></div>
          </div></details>
        </article>;
      })}
      {!draft && !proposal && !error && <p role="status">변경안을 불러오고 있습니다.</p>}
      <p role="alert" className="review-error">{error}</p>
    </div>
    <footer>
      {ready && canRevise && !corrections && <button disabled={busy || running} onClick={() => setCorrections(Object.fromEntries(Object.entries(proposal.documents).map(([type, value]) => [type, prettyJson(value)])))}>이 변경안 보완하기</button>}
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
        <button className="review-primary" disabled={busy || running || (!proposal.artifactReviewPassed && !reviewCompleted)} onClick={() => run(async () => {
          const acknowledge = !proposal.artifactReviewPassed;
          if (acknowledge && !await confirmDialog(`교차검증에서 확인할 항목 ${reviewWarnings}개가 있습니다. 내용을 확인했고 이대로 기준에 반영할까요?`, { confirmLabel: "확인하고 승인" })) return;
          await approveChange(project.id, activeId, proposal.proposalRevision, acknowledge); await refresh(activeId); await onApproved?.();
        })}>{proposal.artifactReviewPassed || !reviewCompleted ? "승인하고 기준 발행" : "확인하고 승인"}</button>
      </>}
      {ready && !canApprove && <p>PM의 검토와 승인을 기다립니다.</p>}
      {ready && canApprove && !proposal.artifactReviewPassed && !running && <p className="review-gate">
        {reviewCompleted
          ? `교차검증에서 확인할 항목 ${reviewWarnings}개가 나왔습니다. 처음 만든 문서에 원래 있던 문제일 수도 있습니다. 위 결과를 보고 고칠 필요가 없으면 '확인하고 승인'으로 반영하세요.`
          : "승인하려면 먼저 '문서 교차검증 요청'으로 검증을 한 번 돌려야 합니다."}
      </p>}
    </footer>
  </section>
    {/* styled-jsx(SWC)는 style 태그가 있는 요소부터 범위를 잡으므로 바깥 요소 바로 아래에 둔다 */}
    <style jsx>{`
      .review-backdrop { position:fixed; inset:0; z-index:1000; background:color-mix(in srgb, var(--text-1) 38%, transparent); display:flex; align-items:center; justify-content:center; padding:24px; }
      .review-dialog { width:min(1100px,100%); max-height:90vh; background:var(--bg); color:var(--text-1); border:1px solid var(--border); border-radius:16px; display:flex; flex-direction:column; box-shadow:0 24px 80px #0002; outline:none; }
      header,footer { padding:20px 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; } header { justify-content:space-between; border-bottom:1px solid var(--border); } footer { border-top:1px solid var(--border); }
      h2 { font-size:22px; margin:4px 0; } h3 { font-size:16px; margin:24px 0 8px; } h4 { font-size:12px; color:var(--text-2); } p { font-size:13px; line-height:1.7; } .eyebrow { margin:0; color:var(--text-2); }
      .review-body { overflow:auto; padding:16px 24px; } .review-columns { display:grid; grid-template-columns:1fr 1fr; gap:16px; } .review-columns>div { min-width:0; }
      .review-preview { border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--surface); overflow:auto; max-height:520px; }
      button { padding:10px 15px; border:1px solid var(--border-2); border-radius:8px; color:var(--text-1); background:var(--surface); font:inherit; font-size:13px; cursor:pointer; } button:disabled { opacity:.5; cursor:default; }
      .review-primary { background:var(--text-1); color:white; border-color:var(--text-1); } button:focus-visible,input:focus-visible,.review-preview:focus-visible,a:focus-visible { outline:2px solid var(--text-1); outline-offset:3px; }
      a { color:var(--text-1); text-decoration:underline; text-decoration-color:var(--border-2); text-underline-offset:3px; } a:hover { text-decoration-color:var(--text-1); }
      .review-progress { margin:8px 0 14px; }
      .review-gate { flex-basis:100%; margin:0; font-size:13px; color:var(--text-2); }
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
  </div>;
}
