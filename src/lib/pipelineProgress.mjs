const STAGES = {
  PHASE1_START: "PHASE1", PHASE1_DONE: "PHASE1", PHASE1_SKIP: "PHASE1",
  SEARCH: "SEARCH", PRD: "PRD", PM: "PM", FEATURE_SPEC: "FEATURE_SPEC",
  DBA_API: "DBA_API", QA: "QA", PHASE3: "PHASE3", PHASE4: "PHASE4",
  STORAGE_CONFIRMATION: "PHASE4", KAFKA_PUBLISHED: "PHASE4",
};

export function pipelineFailure(error, statuses, currentKey) {
  const next = { ...statuses };
  const order = ["PHASE1", "SEARCH", "PM", "PRD", "FEATURE_SPEC", "DBA_API", "QA", "PHASE3", "PHASE4"];
  const completedIndex = order.indexOf(STAGES[error.lastCompletedStage]);
  if (completedIndex >= 0) {
    for (const stage of order.slice(0, completedIndex + 1)) next[stage] = "done";
  }
  const failed = STAGES[error.failedStage] || currentKey;
  if (currentKey && currentKey !== failed && next[currentKey] === "running") next[currentKey] = "waiting";
  for (const stage of error.skippedStages || []) {
    const key = STAGES[stage];
    if (key) next[key] = "skipped";
  }
  if (failed) next[failed] = "error";
  const blockers = Array.isArray(error.blockerDetails) ? error.blockerDetails : Object.values(error.blockerDetails || {}).flat();
  const structured = blockers.map(item => typeof item === "string" ? item : item?.message || item?.detail || item?.code);
  const details = [...new Set([
    ...(error.validationBlockers || []), ...structured,
    ...Object.values(error.qa?.blockingIssues || {}).flat(),
  ].filter(Boolean).map(String))];
  return { statuses: next, details: details.slice(0, 12),
    pendingStorage: error.storage?.status === "pending",
    retrySafe: error.retrySafe !== false && error.storage?.kafkaPublished !== true };
}

export function storageIsConfirmed(result) {
  // Compatibility for the legacy Java pipeline, which has no storage receipt.
  // A receipt-bearing producer must explicitly confirm all chunks.
  return !result?.storage || result.storage.status === "stored";
}

export function createReconnectBudget({ now = Date.now, maxAttempts = 6, maxRecoveryMs = 60000 } = {}) {
  let attempts = 0;
  let started = null;
  let latest = -Infinity;
  const seen = new Set();
  return {
    progress(event) {
      const fingerprint = JSON.stringify([event.step, event.percent, event.message, event.timestamp]);
      const timestamp = Date.parse(event.timestamp);
      if (seen.has(fingerprint) || (Number.isFinite(timestamp) && timestamp < latest)) return false;
      seen.add(fingerprint);
      if (seen.size > 512) seen.delete(seen.values().next().value);
      if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp);
      attempts = 0;
      started = null;
      return true;
    },
    failure() {
      if (started == null) started = now();
      const remaining = maxRecoveryMs - (now() - started);
      if (attempts >= maxAttempts || remaining <= 0) return null;
      attempts += 1;
      return Math.min(15000, 1000 * 2 ** attempts, remaining);
    },
  };
}

export function pollPipelineState(readState, { onStored, onFailed, onPending, onUnavailable } = {},
  { schedule = setTimeout, cancel = clearTimeout, maxAttempts = 24 } = {}) {
  let stopped = false;
  let timer;
  let attempts = 0;
  const unavailable = message => {
    stopped = true;
    onUnavailable?.(message);
  };
  const poll = async () => {
    try {
      attempts += 1;
      const response = await readState();
      if (stopped) return;
      const state = response?.data ?? response;
      if (state?.status === "COMPLETED") {
        if (state.result && storageIsConfirmed(state.result)) {
          stopped = true;
          onStored?.(state.result);
          return;
        }
        unavailable("완료 기록은 있지만 결과를 확인하지 못했습니다. 상태를 다시 확인해 주세요.");
        return;
      }
      if (state?.status === "FAILED") {
        stopped = true;
        onFailed?.(state);
        return;
      }
      if (state?.status === "STORAGE_PENDING") onPending?.(state);
      if (state?.connectionStatus === "UNAVAILABLE" || state?.status === "UNAVAILABLE") {
        unavailable(state.message || "서버 실행 상태를 확인할 수 없습니다. 다시 연결해 주세요.");
        return;
      }
    } catch { /* Only retry reads. Never start another generation. */ }
    finally {
      if (!stopped && attempts >= maxAttempts) unavailable("자동 상태 확인을 마쳤습니다. 다시 연결해 현재 상태를 확인해 주세요.");
      if (!stopped) timer = schedule(poll, 5000);
    }
  };
  timer = schedule(poll, 3000);
  return () => { stopped = true; cancel(timer); };
}

export function pollStoredResult(readState, onStored, options = {}) {
  return pollPipelineState(readState, { onStored }, options);
}
