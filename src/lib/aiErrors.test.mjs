import test from "node:test";
import assert from "node:assert/strict";
import { aiErrorFromBody, aiErrorKind, toAiError, AiRequestError } from "./aiErrors.mjs";

test("server codes and Korean messages are kept, with a fix-it link for key problems", () => {
  const error = aiErrorFromBody({ code: "AI_KEY_INVALID", message: "연결한 AI 키가 올바르지 않습니다." }, 400);
  assert.equal(error.code, "AI_KEY_INVALID");
  assert.equal(error.message, "연결한 AI 키가 올바르지 않습니다.");
  assert.deepEqual(aiErrorKind(error.code).action, { label: "내 AI 키 확인", href: "/settings/ai-keys" });
  assert.equal(aiErrorKind("USAGE_LIMIT_EXCEEDED").action.href, "/settings/usage");
});

test("internal error text never reaches the screen", () => {
  assert.equal(aiErrorFromBody({ error: "서버 내부 오류가 발생했습니다." }, 500).message.includes("서버 내부"), false);
  assert.equal(aiErrorFromBody({ detail: "Traceback (most recent call last)" }, 500).code, "AI_PROVIDER_ERROR");
  assert.equal(aiErrorFromBody({ code: "COMMON_002", message: "x" }, 503).code, "AI_SERVICE_UNAVAILABLE");
  assert.equal(aiErrorFromBody({}, 504).code, "AI_TIMEOUT");
});

test("busy and timeout errors offer a retry, network failures get a plain hint", () => {
  assert.equal(aiErrorKind(aiErrorFromBody({}, 429).code).retry, true);
  assert.equal(aiErrorKind("AI_KEY_INVALID").retry, undefined);
  const offline = toAiError(new TypeError("Failed to fetch"));
  assert.ok(offline instanceof AiRequestError);
  assert.match(offline.message, /인터넷 연결/);
  assert.equal(toAiError({ code: "USAGE_LIMIT_EXCEEDED", message: "한도" }).code, "USAGE_LIMIT_EXCEEDED");
});
