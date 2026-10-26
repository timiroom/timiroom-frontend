import assert from "node:assert/strict";
import test from "node:test";
import { createReconnectBudget, pipelineFailure, pollPipelineState, pollStoredResult, storageIsConfirmed } from "./pipelineProgress.mjs";

test("PRD failure marks PM complete but never marks PRD complete", () => {
  const result = pipelineFailure({ failedStage: "PRD", lastCompletedStage: "PM",
    skippedStages: ["FEATURE_SPEC", "DBA_API", "QA", "PHASE3", "PHASE4"] }, {}, "PRD");
  assert.equal(result.statuses.PM, "done");
  assert.equal(result.statuses.PRD, "error");
  assert.equal(result.statuses.FEATURE_SPEC, "skipped");
});

test("marks the actual failed stage and skipped downstream steps", () => {
  const result = pipelineFailure({ failedStage: "FEATURE_SPEC", skippedStages: ["DBA_API", "QA", "PHASE3", "PHASE4"] },
    { FEATURE_SPEC: "done", PHASE3: "running" }, "PHASE3");
  assert.equal(result.statuses.FEATURE_SPEC, "error");
  assert.equal(result.statuses.PHASE3, "skipped");
  assert.equal(result.statuses.DBA_API, "skipped");
});

test("published but unconfirmed storage cannot restart or finish", () => {
  const result = pipelineFailure({ failedStage: "STORAGE_CONFIRMATION", storage: { status: "pending", kafkaPublished: true } }, {}, "PHASE4");
  assert.equal(result.retrySafe, false);
  assert.equal(result.pendingStorage, true);
  assert.equal(storageIsConfirmed({ storage: { status: "pending" } }), false);
  assert.equal(storageIsConfirmed({ storage: { status: "stored" } }), true);
});

test("deduplicates root-cause messages and supports legacy events", () => {
  const result = pipelineFailure({ validationBlockers: ["root"], blockerDetails: [{ message: "root" }] }, {}, "QA");
  assert.deepEqual(result.details, ["root"]);
  assert.equal(result.statuses.QA, "error");
  assert.equal(storageIsConfirmed({}), true);
});

test("pending storage retries reads and delivers a confirmed result exactly once", async () => {
  const callbacks = [];
  const received = [];
  let reads = 0;
  pollStoredResult(async () => {
    reads++;
    if (reads === 1) throw new Error("temporary status failure");
    return reads === 2 ? { status: "STORAGE_PENDING" }
      : { status: "COMPLETED", result: { storage: { status: "stored" } } };
  }, value => received.push(value), { schedule: callback => callbacks.push(callback), cancel() {} });
  await callbacks.shift()();
  await callbacks.shift()();
  assert.equal(received.length, 0);
  await callbacks.shift()();
  assert.equal(received.length, 1);
  assert.equal(callbacks.length, 0);
});

test("unmount during a status read cannot update the UI or reschedule", async () => {
  let tick;
  let resolve;
  let received = false;
  const stop = pollStoredResult(() => new Promise(done => { resolve = done; }), () => { received = true; },
    { schedule: callback => { tick = callback; }, cancel() {} });
  const pending = tick();
  stop();
  resolve({ status: "COMPLETED", result: {} });
  await pending;
  assert.equal(received, false);
});


test("replaying buffered progress never resets the reconnect budget", () => {
  const budget = createReconnectBudget({ now: () => 0 });
  const first = { step: "PM", percent: 40, timestamp: "2026-10-26T00:00:01Z" };
  const second = { step: "PRD", percent: 50, timestamp: "2026-10-26T00:00:02Z" };
  assert.equal(budget.progress(first), true);
  assert.equal(budget.progress(second), true);
  for (let attempt = 0; attempt < 6; attempt++) {
    assert.notEqual(budget.failure(), null);
    assert.equal(budget.progress(first), false);
    assert.equal(budget.progress(second), false);
  }
  assert.equal(budget.failure(), null);
  assert.equal(budget.progress({ step: "FEATURE_SPEC", percent: 55, timestamp: "2026-10-26T00:00:03Z" }), true);
  assert.notEqual(budget.failure(), null);
});

test("recovery has a wall clock limit even if transports keep opening", () => {
  let time = 0;
  const budget = createReconnectBudget({ now: () => time });
  assert.notEqual(budget.failure(), null);
  time = 60000;
  assert.equal(budget.failure(), null);
});

test("failed state delivers a visible failure instead of silently stopping", async () => {
  let tick;
  let failed;
  pollPipelineState(async () => ({ status: "FAILED", message: "계약 검증 실패", retrySafe: true }),
    { onFailed: state => { failed = state; } }, { schedule: callback => { tick = callback; }, cancel() {} });
  await tick();
  assert.equal(failed.message, "계약 검증 실패");
  assert.equal(failed.retrySafe, true);
});

test("repeated pending reads stop with a recovery action and never regenerate", async () => {
  const ticks = [];
  let unavailable = 0;
  let reads = 0;
  pollPipelineState(async () => { reads++; return { status: "STORAGE_PENDING" }; },
    { onUnavailable: () => { unavailable++; } },
    { maxAttempts: 2, schedule: callback => ticks.push(callback), cancel() {} });
  await ticks.shift()();
  await ticks.shift()();
  assert.equal(reads, 2);
  assert.equal(unavailable, 1);
  assert.equal(ticks.length, 0);
});

test("a completed row without a result cannot poll forever", async () => {
  let tick;
  let unavailable = 0;
  pollPipelineState(async () => ({ status: "COMPLETED" }), { onUnavailable: () => { unavailable++; } },
    { schedule: callback => { tick = callback; }, cancel() {} });
  await tick();
  assert.equal(unavailable, 1);
});
