"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { rememberAuthReturnTo } from "@/lib/authConfig";
import { buildDashboardUrl } from "@/lib/dashboardUrl";
import { specChanges, integrationJobs, integrationJob } from "@/lib/integrationApi";
import { ActionButton, Badge, EmptyState, LoadingState, SettingsHeader, SettingsSection } from "@/components/ui";

const states = { GENERATING: "생성 중", READY: "검토 대기", APPROVED: "승인됨", REJECTED: "거절됨", STALE: "기준 변경", FAILED: "실패", QUEUED: "접수됨", RUNNING: "실행 중", COMPLETED: "완료" };
const stateTone = { READY: "warning", APPROVED: "success", COMPLETED: "success", REJECTED: "neutral", STALE: "warning", FAILED: "danger", GENERATING: "info", QUEUED: "info", RUNNING: "info" };
const kinds = { SPEC_CHANGE: "변경안 생성", ARTIFACT_REVIEW: "문서 교차검증", PR_REVIEW: "PR 정합성 검사" };
const severityTone = { WARNING: "warning", INCONCLUSIVE: "info", PASS: "success" };
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
// 서버 작업 실패 코드(IntegrationJobWorker) → 사람이 읽을 설명
const jobErrors = {
  JOB_FAILED: "작업 중 알 수 없는 오류가 났습니다. 잠시 후 다시 요청해 주세요.",
  JOB_TIMEOUT: "작업이 제한 시간 안에 끝나지 않았습니다.",
  PR_CHANGED: "검사하는 동안 PR이 바뀌었습니다. 최신 커밋으로 다시 검사해 주세요.",
  SPEC_CONFLICT: "검사하는 동안 명세 기준이 바뀌었습니다. 최신 기준으로 다시 요청해 주세요.",
  NO_SPEC_CHANGES: "바뀐 문서 내용이 없어 변경안을 만들지 않았습니다.",
  CONSISTENCY_PROVIDER_FAILED: "정합성 검사 AI가 응답하지 않았습니다. 잠시 후 다시 요청해 주세요.",
  ACCESS_DENIED: "이 작업을 실행할 권한이 없습니다.",
};

// 서버는 페이지 객체({ content, totalPages })를 준다. 배열로 와도 같은 모양으로 다룬다.
const rows = (pageData) => (Array.isArray(pageData) ? pageData : pageData?.content) ?? null;
const dateTime = (value) => (value ? new Date(value).toLocaleString("ko-KR") : "");

function StatusBadge({ status }) {
  return <Badge tone={stateTone[status] ?? "neutral"}>{states[status] ?? status}</Badge>;
}

/** 변경안과 검사·생성 작업 기록. 대시보드의 명세 기준 바에서 "변경안·검사 기록"으로 연다. */
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

  const backHref = target ? buildDashboardUrl({ projectId: target.project, view: "prd" }) : "/dashboard";
  const shell = (children) => (
    <div className="history">
      <div className="ui-panel-header">
        <div className="ui-panel-header__crumb">
          <ActionButton variant="ghost" size="sm" href={backHref}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            프로젝트로 돌아가기
          </ActionButton>
          <span className="ui-panel-header__sep" aria-hidden="true">›</span>
          <span>변경안·검사 기록</span>
        </div>
      </div>
      <main className="history__body"><div className="ui-set-page">{children}</div></main>
      <style jsx>{`
        .history { height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
        .history__body { flex: 1; overflow-y: auto; background: var(--content-bg); }
      `}</style>
    </div>
  );

  if (process.env.NEXT_PUBLIC_INTEGRATION_ENABLED !== "true") {
    return shell(<EmptyState icon="lock" title="연결 기능을 사용할 수 없습니다" description="이 서버에서는 변경안 검토와 검사 기록 기능이 꺼져 있습니다." />);
  }

  const result = job?.result;
  const proposalId = result?.proposalId || (job?.kind === "ARTIFACT_REVIEW" ? job.bindingKey?.split(":")[0] : null);
  const proposalRows = rows(proposals), jobRows = rows(jobs);
  const totalPages = Math.max(proposals?.totalPages || 1, jobs?.totalPages || 1);

  return shell(<>
    <SettingsHeader title="변경안·검사 기록" meta={<span>화면을 닫은 뒤에도 변경안과 검사 결과를 여기서 다시 확인할 수 있습니다. 4초마다 새로 고칩니다.</span>} />
    {error && <div className="gh-error" role="alert">{error}</div>}

    {job && (
      <SettingsSection title={`${kinds[job.kind] ?? "작업"} 결과`} description="검사 당시의 기준에 묶인 기록입니다. 이후 문서나 PR이 바뀌었다면 다시 검사해 주세요.">
        <div className="detail">
          <div className="detail__row"><StatusBadge status={job.status} />{typeof result?.passed === "boolean" && <Badge tone={result.passed ? "success" : "warning"}>{result.passed ? "검사 당시 통과" : "검토 필요"}</Badge>}</div>
          {job.error && <p role="alert" className="detail__error">{jobErrors[job.error] ?? `작업을 완료하지 못했습니다. (${job.error})`}</p>}
          {result?.summary && <p>{result.summary}</p>}
          <p className="detail__meta">
            작업 ID {job.jobId}
            {result?.snapshotId && <> · 명세 기준 {result.snapshotId}</>}
            {result?.headSha && <> · PR 커밋 {result.headSha}</>}
          </p>
          {(result?.findings || []).map((f, i) => (
            <article key={i} className="finding">
              <div className="detail__row"><Badge tone={severityTone[f.severity] ?? "neutral"}>{f.severity}</Badge><strong>{f.area}</strong></div>
              <p>{f.message}</p>
              {f.evidence?.length > 0 && <ul>{f.evidence.map((e, n) => <li key={n}>{e}</li>)}</ul>}
              {f.recommendation && <p className="detail__meta">권장 수정 · {f.recommendation}</p>}
            </article>
          ))}
          {uuid.test(proposalId || "") && <div><ActionButton href={`/spec-review?projectId=${target.project}&proposalId=${proposalId}`}>관련 변경안 검토</ActionButton></div>}
        </div>
      </SettingsSection>
    )}

    <SettingsSection title="변경안" description="문서를 바꾸자는 제안입니다. PM이 검토하고 승인하면 명세에 반영됩니다.">
      {proposalRows === null && !error ? <LoadingState /> : !proposalRows?.length ? (
        <EmptyState compact icon="pencil" title="아직 변경안이 없습니다" description="문서를 고치거나 AI 도구가 수정을 제안하면 여기에 쌓입니다." />
      ) : proposalRows.map((p) => (
        <a key={p.proposalId} className="history-row" href={`/spec-review?projectId=${target.project}&proposalId=${p.proposalId}`}>
          <span className="history-row__body">
            <span className="history-row__title">{p.instruction || "문서 변경안"}</span>
            <span className="history-row__meta">{dateTime(p.createdAt)}</span>
          </span>
          <StatusBadge status={p.status} />
        </a>
      ))}
    </SettingsSection>

    <SettingsSection title="검사와 생성 작업" description="문서 교차검증, PR 정합성 검사, 변경안 생성 같은 작업의 진행 기록입니다.">
      {jobRows === null && !error ? <LoadingState /> : !jobRows?.length ? (
        <EmptyState compact icon="checklist" title="아직 작업이 없습니다" description="명세 검사나 PR 정합성 검사를 실행하면 여기에 기록됩니다." />
      ) : jobRows.map((j) => (
        <a key={j.jobId} className="history-row" href={`/spec-changes?projectId=${target.project}&jobId=${j.jobId}`}>
          <span className="history-row__body">
            <span className="history-row__title">{kinds[j.kind] ?? j.kind}</span>
            <span className="history-row__meta">{dateTime(j.createdAt)}</span>
          </span>
          <StatusBadge status={j.status} />
        </a>
      ))}
    </SettingsSection>

    {totalPages > 1 && (
      <nav aria-label="기록 페이지" className="pager">
        <ActionButton disabled={page === 0} onClick={() => setPage(page - 1)}>이전</ActionButton>
        <span>{page + 1} / {totalPages}쪽</span>
        <ActionButton disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>다음</ActionButton>
      </nav>
    )}
    <style jsx>{`
      .detail { display: flex; flex-direction: column; gap: 10px; padding: 16px 20px; font-size: 13px; line-height: 1.7; color: var(--text-1); }
      .detail p, .detail ul { margin: 0; overflow-wrap: anywhere; }
      .detail__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .detail__meta { font-size: 12px; color: var(--text-3); }
      .detail__error { color: #b91c1c; }
      .finding { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--border); }
      .pager { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13px; color: var(--text-2); }
    `}</style>
  </>);
}
