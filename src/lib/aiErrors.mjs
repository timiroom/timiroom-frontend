/**
 * AI 기능 오류를 화면에 보여 줄 형태로 정리한다.
 * 서버(백엔드·AI 서버)가 code와 한국어 message를 주면 그대로 쓰고, 없으면 상태 코드로 안내를 고른다.
 * code로 제목과 바로가기 버튼(내 AI 키, 사용량)을 정한다.
 */

export class AiRequestError extends Error {
  constructor({ message, code, status } = {}) {
    super(message || "AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
    this.name = "AiRequestError";
    this.code = code || "AI_PROVIDER_ERROR";
    this.status = status ?? null;
  }
}

const KEY_SETTINGS = { label: "내 AI 키 확인", href: "/settings/ai-keys" };
const USAGE = { label: "사용량 보기", href: "/settings/usage" };

// message는 서버가 안내 문구 없이 코드만 남긴 경우(작업 기록 등)에 쓴다
const KINDS = {
  AI_KEY_INVALID: { title: "AI 키를 확인해 주세요", action: KEY_SETTINGS, message: "연결한 AI 키가 올바르지 않거나 만료되었습니다. 설정 > 내 AI 키에서 키를 확인해 주세요." },
  AI_KEY_FORBIDDEN: { title: "AI 키 권한을 확인해 주세요", action: KEY_SETTINGS, message: "연결한 AI 키로 이 모델을 쓸 권한이 없습니다. 설정 > 내 AI 키에서 모델이나 키 권한을 확인해 주세요." },
  AI_MODEL_NOT_FOUND: { title: "AI 모델을 찾지 못했어요", action: KEY_SETTINGS, message: "연결한 AI 키에서 고른 모델을 찾지 못했습니다. 설정 > 내 AI 키에서 모델 이름을 확인해 주세요." },
  AI_KEY_QUOTA_EXCEEDED: { title: "AI 키 크레딧을 모두 썼어요", action: KEY_SETTINGS, message: "연결한 AI 키의 크레딧이나 사용 한도를 모두 썼습니다. AI 제공사 결제 화면에서 확인하거나, 설정 > 내 AI 키에서 키 사용을 끄고 티미룸 AI로 계속하세요." },
  USAGE_LIMIT_EXCEEDED: { title: "이번 달 AI 사용량을 모두 썼어요", action: USAGE, message: "이번 달 AI 사용 한도를 모두 썼습니다. 사용량 화면에서 다시 채워지는 날짜를 확인해 주세요." },
  AI_BUSY: { title: "AI가 잠시 바빠요", retry: true, message: "AI 요청이 잠시 몰렸습니다. 30초쯤 뒤에 다시 시도해 주세요." },
  AI_TIMEOUT: { title: "AI 응답이 늦어지고 있어요", retry: true, message: "AI 응답이 오래 걸려 중단했습니다. 잠시 후 다시 시도해 주세요." },
  AI_SERVICE_UNAVAILABLE: { title: "AI에 잠시 연결할 수 없어요", retry: true, message: "AI 서버에 잠시 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." },
  AI_INPUT_TOO_LONG: { title: "내용이 너무 길어요", message: "AI가 한 번에 읽을 수 있는 길이를 넘었습니다. 내용을 줄여서 다시 시도해 주세요." },
  AI_REQUEST_REJECTED: { title: "AI가 요청을 처리하지 못했어요", retry: true, message: "AI가 이 요청을 처리하지 못했습니다. 내용을 조금 바꿔서 다시 시도해 주세요." },
  AI_PROVIDER_ERROR: { title: "AI 응답을 받지 못했어요", retry: true, message: "AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요." },
};

/** code에 맞는 제목·바로가기·다시 시도 가능 여부 */
export function aiErrorKind(code) {
  return KINDS[code] || KINDS.AI_PROVIDER_ERROR;
}

function fallbackFor(status) {
  if (status === 504) return { code: "AI_TIMEOUT", message: "AI 응답이 오래 걸려 중단했습니다. 잠시 후 다시 시도해 주세요." };
  if (status === 503 || status === 502) return { code: "AI_SERVICE_UNAVAILABLE", message: "AI 서버에 잠시 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  if (status === 429) return { code: "AI_BUSY", message: "AI 요청이 잠시 몰렸습니다. 30초쯤 뒤에 다시 시도해 주세요." };
  return { code: "AI_PROVIDER_ERROR", message: "AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요." };
}

// 서버 내부 사정을 드러내는 문구는 사용자에게 그대로 보이지 않게 한다
const INTERNAL = /서버 내부 오류|Traceback|Exception|HTTP \d{3}|rag-pipeline|Internal Server Error|Not logged in/i;

/** 실패한 fetch 응답을 AiRequestError로 바꾼다. */
export async function aiErrorFromResponse(res) {
  const status = res?.status ?? null;
  const body = res ? await res.clone().json().catch(() => ({})) : {};
  return aiErrorFromBody(body, status);
}

/** {code, message|error|detail} 형태의 본문(스트림 중 오류 포함)을 AiRequestError로 바꾼다. */
export function aiErrorFromBody(body = {}, status = null) {
  const fallback = fallbackFor(status);
  const code = typeof body.code === "string" && (body.code.startsWith("AI_") || body.code === "USAGE_LIMIT_EXCEEDED") ? body.code : fallback.code;
  const raw = [body.message, body.error, body.detail].find((v) => typeof v === "string" && v.trim());
  const message = raw && !INTERNAL.test(raw) && raw.length <= 300 ? raw : fallback.message;
  return new AiRequestError({ message, code, status });
}

/** 어떤 오류든 화면용 AiRequestError로 맞춘다(네트워크 끊김, 한도 초과 포함). */
export function toAiError(error) {
  if (error instanceof AiRequestError) return error;
  if (error?.code === "USAGE_LIMIT_EXCEEDED") return new AiRequestError({ message: error.message, code: "USAGE_LIMIT_EXCEEDED", status: 429 });
  if (error instanceof TypeError) return new AiRequestError({ message: "인터넷 연결을 확인한 뒤 다시 시도해 주세요.", code: "AI_SERVICE_UNAVAILABLE" });
  return aiErrorFromBody({ message: error?.message }, null);
}
