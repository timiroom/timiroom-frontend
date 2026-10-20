"use client";

import { ActionButton, Badge, EmptyState, Icon, LoadingState, PanelHeader, AiWorking } from "@/components/ui";
import { useCallback, useEffect, useState } from "react";
import { navigateDashboard } from "@/lib/dashboardUrl";
import { checkPullRequestConsistency, fetchProjectPullRequests, fetchProjectRepositories } from "@/lib/githubApi";

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// PYTHON_EXAONE은 검사 서비스가 모델을 밝히지 않았을 때 백엔드가 붙이는 기본값이라 모델명을 쓰지 않는다.
// *_FACT_GATE는 서비스 응답(evaluationMode)이 직접 밝힌 모델이다.
const EVALUATOR_LABELS = {
  PYTHON_OPENAI_COMPATIBLE_FACT_GATE: "AI 판정 · OpenAI 호환 + 근거 확인",
  PYTHON_EXAONE_FACT_GATE: "AI 판정 · EXAONE + 근거 확인",
  PYTHON_EXAONE: "AI 판정",
  SPRING_FOUNDRY: "AI 판정 · Foundry",
  AGENT: "AI 판정",
  RULE_FALLBACK: "규칙 판정 (AI 응답 없음)",
  CACHED: "이전 검사 결과",
  RULES: "규칙 판정",
};
const SEVERITY = {
  WARNING: { tone: "warning", label: "경고" },
  INCONCLUSIVE: { tone: "info", label: "판정 보류" },
  PASS: { tone: "success", label: "통과" },
  INFO: { tone: "neutral", label: "참고" },
};
const SEVERITY_ORDER = { WARNING: 0, INCONCLUSIVE: 1, PASS: 2, INFO: 3 };

function RelatedPullRequests({ pulls = [] }) {
  if (pulls.length === 0) return null;
  return (
    <div className="pr-related">
      <span className="pr-related__label">함께 확인할 연결 레포 PR</span>
      {pulls.map((pull) => (
        <a key={`${pull.repoId}-${pull.number}`} href={pull.htmlUrl} target="_blank" rel="noreferrer" className="pr-related__link">
          {pull.repoFullName} #{pull.number}
        </a>
      ))}
    </div>
  );
}

function ConsistencyResult({ result }) {
  if (!result) return null;
  const findings = [...(result.findings || [])].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));
  const warningCount = findings.filter((finding) => finding.severity === "WARNING").length;
  const inconclusiveCount = findings.filter((finding) => finding.severity === "INCONCLUSIVE").length;
  const tone = warningCount > 0 ? "warning" : inconclusiveCount > 0 ? "info" : "success";
  const headline = warningCount > 0 ? `검토 필요 · 경고 ${warningCount}건` : inconclusiveCount > 0 ? "판정 보류 · 근거 확인 필요" : "명세와 맞습니다";
  const status = result.reviewPosted ? "GitHub에 리뷰와 Check를 남겼습니다" : result.skippedDuplicate ? "같은 커밋은 이미 검사했습니다" : "";

  return (
    <section className={`pr-result pr-result--${tone}`} aria-label="정합성 검사 결과">
      <div className="pr-result__head">
        <div>
          <div className="pr-result__title">{headline}</div>
          <div className="pr-result__meta">
            <span>{EVALUATOR_LABELS[result.evaluator] || "규칙 판정"}</span>
            {status && <span>{status}</span>}
          </div>
        </div>
        {inconclusiveCount === 0 && typeof result.score === "number" && (
          <div className="pr-result__score">{result.score}<span>/100</span></div>
        )}
      </div>
      {findings.length > 0 && (
        <ul className="pr-findings">
          {findings.map((finding, index) => {
            const severity = SEVERITY[finding.severity] ?? SEVERITY.INFO;
            return (
              <li key={index} className="pr-finding">
                <div className="pr-finding__head"><Badge tone={severity.tone}>{severity.label}</Badge><strong>{finding.area}</strong></div>
                <p>{finding.message}</p>
                {finding.evidence?.length > 0 && (
                  <div className="pr-finding__block"><span>근거</span><ul>{finding.evidence.map((evidence, i) => <li key={i}>{evidence}</li>)}</ul></div>
                )}
                {finding.references?.length > 0 && (
                  <div className="pr-finding__block"><span>원문 위치</span>
                    {finding.references.map((reference, i) => (
                      <div key={i} className="pr-finding__ref">
                        <code>{reference.source}{reference.line ? `:${reference.line}` : ""}</code>
                        {reference.quote && <div>{reference.quote}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {finding.recommendation && <p className="pr-finding__fix"><span>권장 수정</span> {finding.recommendation}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {(result.reviewUrl || result.checkRunUrl) && (
        <div className="pr-result__links">
          {result.reviewUrl && <a href={result.reviewUrl} target="_blank" rel="noreferrer">GitHub 리뷰 열기 →</a>}
          {result.checkRunUrl && <a href={result.checkRunUrl} target="_blank" rel="noreferrer">Check 결과 열기 →</a>}
        </div>
      )}
    </section>
  );
}

function PullRequestCard({ pull, canManage, checking, onCheck, result }) {
  const key = `${pull.repoId}-${pull.number}`;
  return (
    <article className="pr-card">
      <div className="pr-card__head">
        <Icon name="shuffle" size={15} strokeWidth={1.8} className="gh-row__icon" />
        <div className="gh-row__body">
          <a className="gh-row__title pr-card__title" href={pull.htmlUrl} target="_blank" rel="noreferrer">
            <span className="pr-card__number">#{pull.number}</span> {pull.title}
          </a>
          <span className="gh-row__meta">
            {pull.repoFullName} · {pull.headRef} → {pull.baseRef} · {pull.authorLogin || "알 수 없음"} · {dateLabel(pull.updatedAt)}
            {pull.draft && <> <Badge>초안</Badge></>}
          </span>
        </div>
        {canManage && (
          <ActionButton size="sm" variant={result ? "secondary" : "primary"} disabled={checking === key} onClick={() => onCheck(pull)} title="명세와 맞는지 검사하고 GitHub에 리뷰를 남깁니다">
            {checking === key ? "검사 중…" : result ? "다시 검사" : "정합성 검사"}
          </ActionButton>
        )}
      </div>
      <RelatedPullRequests pulls={pull.relatedPullRequests} />
      {checking === key && (
        <div style={{ marginTop: 10 }}>
          <AiWorking label="PR 변경을 명세와 비교하고 있습니다" hint="변경 파일이 많으면 1~3분 걸릴 수 있습니다. 끝나면 GitHub에도 리뷰가 남습니다." />
        </div>
      )}
      <ConsistencyResult result={result} />
    </article>
  );
}

/** 연결된 레포의 열린 PR과 명세 정합성 검사 결과. 웹훅이 PR마다 자동 검사하고, PM은 다시 검사할 수 있다. */
export function GithubPullRequestsPanel({ project, canManage }) {
  const [pulls, setPulls] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState("");
  const [results, setResults] = useState({});

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setError("");
    try {
      const [loadedPulls, loadedRepos] = await Promise.all([
        fetchProjectPullRequests(project.id),
        fetchProjectRepositories(project.id),
      ]);
      setPulls(loadedPulls);
      setRepos(loadedRepos);
      setResults(Object.fromEntries(
        loadedPulls
          .filter((pull) => pull.consistencyResult)
          .map((pull) => [`${pull.repoId}-${pull.number}`, pull.consistencyResult]),
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "PR 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  async function runCheck(pull) {
    const key = `${pull.repoId}-${pull.number}`;
    setChecking(key);
    setError("");
    try {
      const result = await checkPullRequestConsistency(project.id, pull.repoId, pull.number);
      setResults((current) => ({ ...current, [key]: result }));
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "PR 정합성 검사에 실패했습니다.");
    } finally {
      setChecking("");
    }
  }

  let content;
  if (loading) {
    content = <LoadingState label="PR을 불러오는 중…" />;
  } else if (error && pulls.length === 0) {
    content = (
      <EmptyState icon="warning" title="PR을 불러오지 못했습니다" description={error}>
        <ActionButton onClick={load}><Icon name="refresh" size={13} /> 다시 시도</ActionButton>
      </EmptyState>
    );
  } else if (repos.length === 0) {
    content = (
      <EmptyState icon="link" title="연결된 GitHub 레포가 없습니다" description="레포를 연결하면 PR이 열릴 때마다 명세와 맞는지 자동으로 검사해 여기에 보여 줍니다.">
        <ActionButton variant="primary" onClick={() => navigateDashboard({ projectId: project.id, view: "settings", tab: "repositories" })}>레포 연결하기</ActionButton>
      </EmptyState>
    );
  } else if (pulls.length === 0) {
    content = (
      <EmptyState icon="shuffle" title="열린 PR이 없습니다" description={`연결된 레포 ${repos.length}개에 열린 PR이 없습니다. PR이 열리면 자동으로 정합성 검사를 하고 결과를 여기에 남깁니다.`}>
        <ActionButton onClick={load}><Icon name="refresh" size={13} /> 새로고침</ActionButton>
      </EmptyState>
    );
  } else {
    content = (
      <div className="gh-cards">
        {pulls.map((pull) => <PullRequestCard key={`${pull.repoId}-${pull.number}`} pull={pull} canManage={canManage} checking={checking} onCheck={runCheck} result={results[`${pull.repoId}-${pull.number}`]} />)}
      </div>
    );
  }

  return (
    <div className="gh-panel">
      <PanelHeader project={project} label="PRs 전체">
        <ActionButton variant="ghost" iconOnly title="새로고침" aria-label="새로고침" disabled={loading} onClick={load}><Icon name="refresh" size={14} /></ActionButton>
      </PanelHeader>
      <div className="gh-body">
        <div className="gh-body__inner">
          {!canManage && pulls.length > 0 && <p className="gh-note">PR이 열리거나 바뀌면 자동으로 검사합니다. 다시 검사는 프로젝트 PM만 할 수 있습니다.</p>}
          {error && pulls.length > 0 && <div className="gh-error" role="alert">{error}</div>}
          {content}
        </div>
      </div>
    </div>
  );
}
