"use client";

import { Badge } from "@/components/ui";
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
  // PYTHON_EXAONE은 검사 서비스가 모델을 밝히지 않았을 때 백엔드가 붙이는 기본값이라 모델명을 쓰지 않는다.
  // *_FACT_GATE는 서비스 응답(evaluationMode)이 직접 밝힌 모델이다.
  const evaluatorLabels = {
    PYTHON_OPENAI_COMPATIBLE_FACT_GATE: "OpenAI 호환 모델 + Fact Gate",
    PYTHON_EXAONE_FACT_GATE: "EXAONE + Fact Gate",
    PYTHON_EXAONE: "Python 정합성 Agent",
    SPRING_FOUNDRY: "해외 Foundry Agent",
    RULE_FALLBACK: "규칙 fallback",
    RULES: "규칙 판정",
    CACHED: "기존 결과",
  };
  const evaluator = evaluatorLabels[summary.evaluator] || summary.evaluator || "검사기 미상";
  const title = `PR #${summary.pullNumber} (${summary.repoFullName}) 기준 최근 정합성 검사 · ${evaluator}`;

  return (
    <a href={summary.reviewUrl || undefined} target="_blank" rel="noopener noreferrer" title={title} style={{ textDecoration: "none", cursor: summary.reviewUrl ? "pointer" : "default" }}>
      <Badge tone={isWarning ? "warning" : isInconclusive ? "info" : "success"}>
        {isWarning ? `정합성 경고 ${warningCount}` : isInconclusive ? "정합성 판정 보류" : "정합성 확인됨"}
      </Badge>
    </a>
  );
}
