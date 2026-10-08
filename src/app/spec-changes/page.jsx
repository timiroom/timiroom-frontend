"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { rememberAuthReturnTo } from "@/lib/authConfig";
import { specChanges, integrationJobs, integrationJob } from "@/lib/integrationApi";

const states = { GENERATING: "생성 중", READY: "검토 대기", APPROVED: "승인됨", REJECTED: "거절됨", STALE: "기준 변경", FAILED: "실패", QUEUED: "접수됨", RUNNING: "실행 중", COMPLETED: "완료" };
const kinds = { SPEC_CHANGE: "변경안 생성", ARTIFACT_REVIEW: "문서 교차검증", PR_REVIEW: "PR 정합성 검사" };
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export default function SpecChangesPage() {
  const { user, isLoading } = useAuth(); const router = useRouter();
  const [target, setTarget] = useState(null), [page, setPage] = useState(0);
  const [proposals, setProposals] = useState(null), [jobs, setJobs] = useState(null), [job, setJob] = useState(null), [error, setError] = useState("");
  useEffect(() => {
    if (isLoading) return;
    if (!user) { rememberAuthReturnTo(window.location.pathname + window.location.search); router.replace("/"); return; }
    const query = new URLSearchParams(window.location.search), project = query.get("projectId"), id = query.get("jobId");
    if (!/^[1-9][0-9]*$/.test(project || "") || (id && !uuid.test(id))) { setError("프로젝트 또는 검사 링크를 확인해 주세요."); return; }
    setTarget({ project, jobId: id });
  }, [user, isLoading, router]);
  useEffect(() => {
    if (!target || process.env.NEXT_PUBLIC_INTEGRATION_ENABLED !== "true") return;
    let active = true, pending = false;
    const refresh = async () => {
      if (pending) return; pending = true;
      try {
        const [changes, history, detail] = await Promise.all([specChanges(target.project, page), integrationJobs(target.project, page), target.jobId ? integrationJob(target.project, target.jobId) : null]);
        if (active) { setProposals(changes); setJobs(history); setJob(detail); setError(""); }
      } catch (failure) { if (active) setError(failure.message); } finally { pending = false; }
    };
    refresh(); const timer = window.setInterval(refresh, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [target, page]);
  if (process.env.NEXT_PUBLIC_INTEGRATION_ENABLED !== "true") return <main><p>연결 기능을 사용할 수 없습니다.</p></main>;
  const result = job?.result;
  const proposalId = result?.proposalId || (job?.kind === "ARTIFACT_REVIEW" ? job.bindingKey?.split(":")[0] : null);
  return <main className="history">
    <header><h1>변경안·검사 기록</h1>{target && <a href={`/dashboard?projectId=${target.project}`}>프로젝트로 돌아가기</a>}</header>
    <p>화면을 닫은 뒤에도 변경안과 검사 결과를 여기서 다시 확인할 수 있습니다.</p>
    {error && <p role="alert">{error}</p>}
    {job && <section aria-label="검사 결과"><h2>{kinds[job.kind]} · {states[job.status]}</h2>
      <p>작업 ID: {job.jobId}</p><p>검사 당시의 기준에 묶인 기록입니다. 이후 문서나 PR이 바뀌었다면 다시 검사해 주세요.</p>
      {job.error && <p role="alert">작업을 완료하지 못했습니다. ({job.error})</p>}
      {result && <>
        {typeof result.passed === "boolean" && <h3>{result.passed ? "검사 당시 PASS" : "검토 필요"}</h3>}
        <p>{result.summary}</p>
        {result.snapshotId && <p>명세 기준: {result.snapshotId}</p>}
        {result.headSha && <p>PR 커밋: {result.headSha}</p>}
        {(result.findings || []).map((f, i) => <article key={i}><h3>{f.severity} · {f.area}</h3><p>{f.message}</p>
          {f.evidence?.length > 0 && <ul>{f.evidence.map((e, n) => <li key={n}>{e}</li>)}</ul>}{f.recommendation && <p>{f.recommendation}</p>}
        </article>)}
      </>}
      {uuid.test(proposalId || "") && <a href={`/spec-review?projectId=${target.project}&proposalId=${proposalId}`}>관련 변경안 검토</a>}
    </section>}
    <section aria-label="변경안 목록"><h2>변경안</h2>{proposals?.content?.length === 0 && <p>아직 변경안이 없습니다.</p>}
      {(proposals?.content || []).map((p) => <article key={p.proposalId}><a href={`/spec-review?projectId=${target.project}&proposalId=${p.proposalId}`}>{states[p.status]} · {p.instruction || "문서 변경안"}</a><p>{p.proposalId} · {new Date(p.createdAt).toLocaleString("ko-KR")}</p></article>)}
    </section>
    <section aria-label="작업 목록"><h2>검사와 생성 작업</h2>{jobs?.content?.length === 0 && <p>아직 작업이 없습니다.</p>}
      {(jobs?.content || []).map((j) => <article key={j.jobId}><a href={`/spec-changes?projectId=${target.project}&jobId=${j.jobId}`}>{kinds[j.kind]} · {states[j.status]}</a><p>{j.jobId} · {new Date(j.createdAt).toLocaleString("ko-KR")}</p></article>)}
    </section>
    <nav aria-label="기록 페이지"><button disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button><span>{page + 1}쪽</span><button disabled={page + 1 >= Math.max(proposals?.totalPages || 1, jobs?.totalPages || 1)} onClick={() => setPage(page + 1)}>다음</button></nav>
    <style jsx>{`.history{max-width:1000px;margin:auto;padding:32px 24px;color:#1a1916}header,nav{display:flex;align-items:center;justify-content:space-between;gap:12px}section{margin:24px 0;padding:20px;border:1px solid #dedcd5;border-radius:12px;background:#f7f6f3}article{padding:12px 0;border-bottom:1px solid #dedcd5}p,li{line-height:1.7;overflow-wrap:anywhere}a{color:#633ac7}button{padding:8px 16px}h1{font-size:24px}h2{font-size:20px}h3{font-size:16px}`}</style>
  </main>;
}
