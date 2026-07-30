"use client";

import { useCallback, useEffect, useState } from "react";
import { checkPullRequestConsistency, fetchProjectPullRequests } from "@/lib/githubApi";

const C = {
  text: "var(--text-1)",
  muted: "var(--text-3)",
  border: "var(--border)",
  surface: "var(--surface)",
  bg: "var(--bg)",
};

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function RelatedPullRequests({ pulls = [] }) {
  if (pulls.length === 0) return null;
  return (
    <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>함께 확인할 연결 레포 PR</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {pulls.map((pull) => (
          <a
            key={`${pull.repoId}-${pull.number}`}
            href={pull.htmlUrl}
            target="_blank"
            rel="noreferrer"
            style={{ padding: "4px 8px", borderRadius: 999, border: `1px solid ${C.border}`, color: "var(--text-2)", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
          >
            {pull.repoFullName} #{pull.number}
          </a>
        ))}
      </div>
    </div>
  );
}

function ConsistencyResult({ result }) {
  if (!result) return null;
  const status = result.reviewPosted
    ? "GitHub 리뷰와 Check를 남겼습니다"
    : result.skippedDuplicate
      ? "같은 head SHA는 이미 검사됐습니다"
      : "검사 결과";
  const evaluatorLabels = {
    PYTHON_EXAONE_FACT_GATE: "국내 EXAONE + Fact Gate",
    PYTHON_EXAONE: "국내 EXAONE Agent",
    SPRING_FOUNDRY: "해외 Foundry Agent",
    AGENT: "AI Agent 판정",
    RULE_FALLBACK: "규칙 fallback",
    CACHED: "기존 검사 결과",
    RULES: "규칙 판정",
  };
  const evaluator = evaluatorLabels[result.evaluator] || "규칙 판정";
  const isAgentEvaluator = ["PYTHON_EXAONE_FACT_GATE", "PYTHON_EXAONE", "SPRING_FOUNDRY", "AGENT"].includes(result.evaluator);
  const severityOrder = { WARNING: 0, INCONCLUSIVE: 1, PASS: 2, INFO: 3 };
  const findings = [...(result.findings || [])].sort(
    (left, right) => (severityOrder[left.severity] ?? 3) - (severityOrder[right.severity] ?? 3),
  );
  const warningCount = findings.filter((finding) => finding.severity === "WARNING").length;
  const inconclusiveCount = findings.filter((finding) => finding.severity === "INCONCLUSIVE").length;
  const needsAttention = warningCount > 0 || inconclusiveCount > 0;
  const accent = warningCount > 0 ? "#b45309" : inconclusiveCount > 0 ? "#6366f1" : C.text;

  return (
    <div style={{ marginTop: 13, padding: "13px 14px", borderRadius: 12, background: warningCount > 0 ? "rgba(245,158,11,.055)" : inconclusiveCount > 0 ? "rgba(99,102,241,.055)" : C.bg, border: `1px solid ${warningCount > 0 ? "rgba(217,119,6,.3)" : inconclusiveCount > 0 ? "rgba(99,102,241,.3)" : C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: accent }}>
            {warningCount > 0 ? `검토 필요 · 경고 ${warningCount}건` : inconclusiveCount > 0 ? "판정 보류 · 근거 확인 필요" : "정합성 확인 완료"}
          </div>
          <div style={{ marginTop: 3, color: C.muted, fontSize: 10.5 }}>{status}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 850, color: accent }}>
          {inconclusiveCount > 0 ? "—" : result.score}
          {inconclusiveCount === 0 && <span style={{ fontSize: 10, color: C.muted }}>/100</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
        <span style={{ padding: "2px 7px", borderRadius: 999, background: isAgentEvaluator ? "rgba(99,102,241,.1)" : C.surface, border: `1px solid ${C.border}`, color: isAgentEvaluator ? "#6366f1" : C.muted, fontSize: 10, fontWeight: 750 }}>
          {evaluator}
        </span>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {findings.map((finding, index) => (
          <div key={index} style={{ padding: "9px 10px", borderRadius: 9, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start", color: finding.severity === "WARNING" ? "#b45309" : finding.severity === "INCONCLUSIVE" ? "#6366f1" : C.text, fontSize: 11, lineHeight: 1.55 }}>
              <span style={{ flexShrink: 0, fontWeight: 850 }}>{finding.severity === "PASS" ? "✓" : finding.severity === "WARNING" ? "!" : finding.severity === "INCONCLUSIVE" ? "?" : "i"}</span>
              <div><strong>{finding.area}</strong> · {finding.message}</div>
            </div>
            {Array.isArray(finding.evidence) && finding.evidence.length > 0 && (
              <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 10.5, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>근거</strong>
                {finding.evidence.map((evidence, evidenceIndex) => <div key={evidenceIndex} style={{ marginTop: 2 }}>· {evidence}</div>)}
              </div>
            )}
            {Array.isArray(finding.references) && finding.references.length > 0 && (
              <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
                <strong style={{ color: "var(--text-2)", fontSize: 10.5 }}>원문 위치</strong>
                {finding.references.map((reference, referenceIndex) => (
                  <div key={referenceIndex} style={{ padding: "6px 8px", borderRadius: 7, background: C.bg, color: C.muted, fontSize: 10, lineHeight: 1.45 }}>
                    <code style={{ color: "var(--text-2)", fontWeight: 750 }}>{reference.source}{reference.line ? `:${reference.line}` : ""}</code>
                    {reference.quote && <div style={{ marginTop: 2, overflowWrap: "anywhere" }}>{reference.quote}</div>}
                  </div>
                ))}
              </div>
            )}
            {finding.recommendation && (
              <div style={{ marginTop: 7, color: "var(--text-2)", fontSize: 10.5, lineHeight: 1.55 }}><strong>권장 수정</strong> · {finding.recommendation}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: needsAttention ? 10 : 8 }}>
        {result.reviewUrl && <a href={result.reviewUrl} target="_blank" rel="noreferrer" style={{ color: "var(--text-2)", fontSize: 11, fontWeight: 700 }}>GitHub 리뷰 열기 →</a>}
        {result.checkRunUrl && <a href={result.checkRunUrl} target="_blank" rel="noreferrer" style={{ color: "var(--text-2)", fontSize: 11, fontWeight: 700 }}>Check 결과 열기 →</a>}
      </div>
    </div>
  );
}

function PullRequestCard({ pull, canManage, checking, onCheck, result }) {
  const key = `${pull.repoId}-${pull.number}`;
  return (
    <article style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <a href={pull.htmlUrl} target="_blank" rel="noreferrer" style={{ color: C.text, textDecoration: "none", fontSize: 14, fontWeight: 750 }}>
            #{pull.number} {pull.title}
          </a>
          <div style={{ marginTop: 7, display: "flex", gap: 7, flexWrap: "wrap", color: C.muted, fontSize: 11 }}>
            <span>{pull.repoFullName}</span><span>·</span><span>{pull.headRef} → {pull.baseRef}</span><span>·</span>
            <span>{pull.authorLogin || "알 수 없음"}</span><span>·</span><span>{dateLabel(pull.updatedAt)}</span>
            {pull.draft && <span style={{ padding: "2px 7px", borderRadius: 999, background: C.bg, border: `1px solid ${C.border}` }}>Draft</span>}
          </div>
        </div>
        {canManage && (
          <button type="button" onClick={() => onCheck(pull)} disabled={checking === key} style={{ flexShrink: 0, padding: "8px 11px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.text, color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {checking === key ? "검사 중…" : "검사 + 리뷰"}
          </button>
        )}
      </div>
      <RelatedPullRequests pulls={pull.relatedPullRequests} />
      <ConsistencyResult result={result} />
    </article>
  );
}

export function GithubPullRequestsPanel({ project, canManage }) {
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState("");
  const [results, setResults] = useState({});

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setError("");
    try {
      const loadedPulls = await fetchProjectPullRequests(project.id);
      setPulls(loadedPulls);
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

  return (
    <section style={{ flex: 1, overflowY: "auto", padding: 28, background: "linear-gradient(180deg, var(--db-bg-primary) 0%, var(--bg) 100%)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-.02em" }}>Pull requests</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>연결된 레포의 열린 PR과 명세 정합성 자동 리뷰 상태입니다.</div>
        </div>
        {!canManage && <div style={{ marginBottom: 16, color: C.muted, fontSize: 12 }}>웹훅은 PR 열기·동기화 시 자동 리뷰를 남깁니다. 수동 검사는 프로젝트 PM만 실행할 수 있어요.</div>}
        {error && <div style={{ marginBottom: 16, padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: 12 }}>{error}</div>}
        {loading ? (
          <div style={{ padding: 44, textAlign: "center", color: C.muted, fontSize: 13 }}>PR을 불러오는 중…</div>
        ) : pulls.length === 0 ? (
          <div style={{ padding: 52, textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 14, color: C.muted, fontSize: 13 }}>열린 PR이 없습니다.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pulls.map((pull) => <PullRequestCard key={`${pull.repoId}-${pull.number}`} pull={pull} canManage={canManage} checking={checking} onCheck={runCheck} result={results[`${pull.repoId}-${pull.number}`]} />)}
          </div>
        )}
      </div>
    </section>
  );
}
