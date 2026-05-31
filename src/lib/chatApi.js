import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

export async function createChatSession() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
    method: "POST",
  });
  if (!res || !res.ok) throw new Error("채팅 세션 생성 실패");
  return res.json(); // { sessionId }
}

export async function sendChatMessage(sessionId, content) {
  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
  if (!res || !res.ok) throw new Error("메시지 전송 실패");
  return res.json(); // { message, isComplete, formData? }
}
