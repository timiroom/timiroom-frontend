/**
 * API 명세 엔드포인트의 요청·응답 본문 입력값을 저장 형식으로 바꾼다.
 * 생성 파이프라인은 "없음", "success: boolean" 같은 일반 텍스트 계약을 쓰므로
 * JSON으로 쓴 입력만 파싱하고 나머지 텍스트는 그대로 보존한다.
 * 바꾸지 않은 기존 텍스트는 형태와 무관하게 항상 그대로 저장된다.
 */
export function parseSpecBodyInput(text, original) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { value: null };
  if (typeof original === "string" && original.trim() === trimmed) return { value: original };
  if (/^[{[]/.test(trimmed)) {
    try { return { value: JSON.parse(trimmed) }; }
    catch (e) { return { error: e.message }; }
  }
  return { value: trimmed };
}

/** 현재 형식(requestBody 등)이 없으면 구형 request.body / response.success·error에서 읽는다. */
export function endpointContractFields(endpoint) {
  return {
    requestBody: endpoint?.requestBody ?? endpoint?.request?.body ?? null,
    successResponse: endpoint?.successResponse ?? endpoint?.response?.success ?? null,
    errorCodes: endpoint?.errorCodes ?? endpoint?.response?.error ?? null,
  };
}

/**
 * 편집 화면에 없는 필드(featureId, action 등)를 잃지 않도록 원본 위에 편집값을 덮어쓴다.
 * 편집값이 대체한 구형 본문 필드는 지운다. 남겨 두면 비운 값이 화면에 다시 나타난다.
 */
export function mergeEditedEndpoint(original, edited) {
  const merged = { ...(original || {}), ...edited };
  if (merged.request && typeof merged.request === "object") {
    merged.request = { ...merged.request };
    delete merged.request.body;
  }
  if (merged.response && typeof merged.response === "object") {
    merged.response = { ...merged.response };
    delete merged.response.success;
    delete merged.response.error;
  }
  return merged;
}
