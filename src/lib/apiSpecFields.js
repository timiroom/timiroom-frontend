/**
 * API 명세 엔드포인트의 요청·응답 본문 입력값을 저장 형식으로 바꾼다.
 * 생성 파이프라인은 "없음", "success: boolean" 같은 일반 텍스트 계약을 쓰므로
 * JSON으로 쓴 입력만 파싱하고 나머지 텍스트는 그대로 보존한다.
 */
export function parseSpecBodyInput(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { value: null };
  if (/^[{[]/.test(trimmed)) {
    try { return { value: JSON.parse(trimmed) }; }
    catch (e) { return { error: e.message }; }
  }
  return { value: trimmed };
}

/** 편집 화면에 없는 필드(featureId, action 등)를 잃지 않도록 원본 위에 편집값을 덮어쓴다. */
export function mergeEditedEndpoint(original, edited) {
  return { ...(original || {}), ...edited };
}
