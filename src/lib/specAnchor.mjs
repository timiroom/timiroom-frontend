// 명세 발행 블록체인 기록(앵커) 화면 표시용 순수 함수. 백엔드 응답 형태는 integrationApi.js와 같이 본다.

const BADGES = {
  CONFIRMED: { tone: "success", label: "블록체인 기록됨" },
  PENDING: { tone: "info", label: "기록 대기 중" },
  SENDING: { tone: "info", label: "기록 대기 중" },
  SUBMITTED: { tone: "info", label: "기록 대기 중" },
  UNKNOWN: { tone: "warning", label: "기록 확인 중" },
  FAILED: { tone: "danger", label: "기록 실패" },
};
const SETTLED = new Set(["CONFIRMED", "FAILED", "NONE"]);
const EXPLORERS = { 11155111: "https://sepolia.etherscan.io" };
const STEPS = [
  ["DOCUMENTS", "문서 본문이 발행 때와 같음"],
  ["MANIFEST", "지문과 revision 사슬이 이어짐"],
  ["CHAIN", "블록체인 기록과 같음"],
];
const RESULTS = {
  PASS: { tone: "success", status: "일치" },
  FAIL: { tone: "danger", status: "불일치" },
  SKIPPED: { tone: "neutral", status: "체인 기록 전" },
  ERROR: { tone: "warning", status: "확인 실패" },
};

/** 상태 배지. 체인 기록이 꺼져 있거나 기록할 행이 없으면 null(배지를 그리지 않음). */
export function anchorBadge(anchor) {
  if (!anchor || anchor.chainEnabled === false) return null;
  return BADGES[anchor.state] ?? null;
}

/** 더 기다려도 상태가 바뀌지 않는가(폴링 중단 기준). */
export function isAnchorSettled(state) {
  return SETTLED.has(state);
}

/** 블록 탐색기 링크. kind는 "tx" | "address". 모르는 체인이나 값이 없으면 null. */
export function explorerUrl(chainId, kind, value) {
  const base = EXPLORERS[chainId];
  if (!base || !value || !["tx", "address"].includes(kind)) return null;
  return `${base}/${kind}/${encodeURIComponent(value)}`;
}

/** 검증 결과를 단계 순서대로 3줄로. 응답에 없는 단계는 확인 실패로 보여 준다. */
export function verificationRows(result) {
  const checks = Array.isArray(result?.checks) ? result.checks : [];
  return STEPS.map(([step, label]) => {
    const found = checks.find((check) => check?.step === step);
    const { tone, status } = RESULTS[found?.status] ?? RESULTS.ERROR;
    return { step, label, status, tone };
  });
}

/** 0x1234ab…cdef 처럼 앞 6자와 뒤 4자만. 짧으면 그대로. */
export function shortHex(hex) {
  if (typeof hex !== "string") return "";
  return hex.length > 10 ? `${hex.slice(0, 6)}…${hex.slice(-4)}` : hex;
}
