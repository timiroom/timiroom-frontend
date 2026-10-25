import assert from "node:assert/strict";
import test from "node:test";
import { pipelineFailure, pollStoredResult, storageIsConfirmed } from "./pipelineProgress.mjs";

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
