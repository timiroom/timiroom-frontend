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

export function pollStoredResult(readState, onStored, { schedule = setTimeout, cancel = clearTimeout } = {}) {
  let stopped = false;
  let timer;
  const poll = async () => {
    try {
      const state = await readState();
      if (stopped) return;
      if (state?.status === "COMPLETED" && state.result && storageIsConfirmed(state.result)) {
        stopped = true;
        onStored(state.result);
        return;
      }
      if (state?.status === "FAILED") stopped = true;
    } catch { /* A status read never starts another generation. */ }
    finally { if (!stopped) timer = schedule(poll, 5000); }
  };
  timer = schedule(poll, 3000);
  return () => { stopped = true; cancel(timer); };
}
