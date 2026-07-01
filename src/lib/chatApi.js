import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_EXTENSIONS = {
  "application/pdf":  { icon: "📄", label: "PDF" },
  "image/jpeg":       { icon: "🖼️", label: "JPG" },
  "image/png":        { icon: "🖼️", label: "PNG" },
  "image/gif":        { icon: "🖼️", label: "GIF" },
  "image/webp":       { icon: "🖼️", label: "WEBP" },
  "text/plain":       { icon: "📝", label: "TXT" },
  "application/json": { icon: "📋", label: "JSON" },
};

export function isImageFile(file) {
  return file.type.startsWith("image/");
}

export function validateFile(file) {
  if (!ALLOWED_EXTENSIONS[file.type]) {
    return `${file.name}: 지원하지 않는 형식입니다 (PDF·이미지·TXT·JSON만 가능)`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: 파일 크기가 10MB를 초과합니다`;
  }
  return null;
}

export async function createChatSession() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
    method: "POST",
  });
  if (!res || !res.ok) throw new Error("채팅 세션 생성 실패");
  return res.json();
}

// files: File[] — 백엔드 파일 수신 구현 전까지 파일명을 메시지에 포함
export async function sendChatMessage(sessionId, content, files = []) {
  let fullContent = content;
  if (files && files.length > 0) {
    const fileNames = files.map((f) => f.name).join(", ");
    fullContent = (content ? content + "\n\n" : "") + `[첨부파일: ${fileNames}]`;
  }

  const res = await apiFetch(
    `${API_BASE_URL}/api/v1/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content: fullContent }),
    }
  );
  if (!res || !res.ok) throw new Error("메시지 전송 실패");
  return res.json();
}
