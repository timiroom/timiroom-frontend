"use client";

import { useEffect, useState } from "react";
import { fetchLatestConsistencySummary } from "@/lib/githubApi";

/**
 * 프로젝트에서 가장 최근에 검사된 PR의 정합성 결과 중, 이 패널이 다루는 영역(area)에
 * 해당하는 findings만 골라 배지로 보여준다. 검사 이력이 없거나 이 영역에 대한
 * 유의미한 결과(PASS/WARNING/INCONCLUSIVE)가 없으면 아무것도 렌더링하지 않는다.
 */
export function ConsistencyBadge({ projectId, areaKeyword }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!projectId) { setSummary(null); return; }
    let cancelled = false;
    fetchLatestConsistencySummary(projectId)
      .then(data => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (!summary) return null;

  const bucket = (summary.findings || []).filter(f =>
    (f.area || "").toUpperCase().includes(areaKeyword.toUpperCase())
  );
  const warningCount = bucket.filter(f => f.severity === "WARNING").length;
  const passCount = bucket.filter(f => f.severity === "PASS").length;
  const inconclusiveCount = bucket.filter(f => f.severity === "INCONCLUSIVE").length;
  if (warningCount === 0 && passCount === 0 && inconclusiveCount === 0) return null;

  const isWarning = warningCount > 0;
  const isInconclusive = !isWarning && inconclusiveCount > 0;
  const evaluatorLabels = {
    PYTHON_EXAONE_FACT_GATE: "국내 EXAONE + Fact Gate",
    PYTHON_EXAONE: "국내 EXAONE Agent",
    SPRING_FOUNDRY: "해외 Foundry Agent",
    RULE_FALLBACK: "규칙 fallback",
    RULES: "규칙 판정",
    CACHED: "기존 결과",
  };
  const evaluator = evaluatorLabels[summary.evaluator] || summary.evaluator || "검사기 미상";
  const title = `PR #${summary.pullNumber} (${summary.repoFullName}) 기준 최근 정합성 검사 · ${evaluator}`;

  return (
    <a
      href={summary.reviewUrl || undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      style={{
        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
        textDecoration: "none", cursor: summary.reviewUrl ? "pointer" : "default",
        background: isWarning ? "rgba(245,158,11,0.1)" : isInconclusive ? "rgba(99,102,241,0.1)" : "rgba(52,211,153,0.1)",
        border: `1px solid ${isWarning ? "rgba(245,158,11,0.25)" : isInconclusive ? "rgba(99,102,241,0.25)" : "rgba(52,211,153,0.25)"}`,
        color: isWarning ? "#d97706" : isInconclusive ? "#6366f1" : "#34d399",
      }}
    >
      {isWarning ? `⚠️ 정합성 경고 ${warningCount}` : isInconclusive ? "? 정합성 판정 보류" : "✓ 정합성 확인됨"}
    </a>
  );
}
