/**
 * chatApi.js
 * ----------
 * 채팅 세션 및 메시지 전송 API 레이어.
 *
 * ┌─ 백엔드 REST Endpoints ─────────────────────────────────────────┐
 * │  POST /api/v1/chat/sessions                  → 세션 생성        │
 * │  POST /api/v1/chat/sessions/{id}/messages    → 메시지 전송      │
 * │    - 파일 없음: Content-Type: application/json                  │
 * │    - 파일 있음: Content-Type: multipart/form-data               │
 * │      fields: content (string), files (File[])                   │
 * └────────────────────────────────────────────────────────────────┘
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

export async function createChatSession() {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
    method: "POST",
  });
  if (!res || !res.ok) throw new Error("채팅 세션 생성 실패");
  return res.json(); // { sessionId }
}

/**
 * 메시지 전송
 * @param {string} sessionId
 * @param {string} content   - 텍스트 메시지
 * @param {File[]} files     - 첨부 파일 배열 (선택)
 * @returns {{ message, suggestions?, isComplete?, formData? }}
 */
export async function sendChatMessage(sessionId, content, files = []) {
  const url = `${API_BASE_URL}/api/v1/chat/sessions/${sessionId}/messages`;

  let body;
  if (files.length > 0) {
    // 파일 있을 때 → multipart/form-data
    const formData = new FormData();
    formData.append("content", content);
    files.forEach(file => formData.append("files", file));
    body = formData;
  } else {
    // 텍스트만 → JSON
    body = JSON.stringify({ content });
  }

  const res = await apiFetch(url, { method: "POST", body });
  if (!res || !res.ok) throw new Error("메시지 전송 실패");
  return res.json(); // { message, isComplete, formData? }
}

/** 허용 확장자 및 아이콘 */
export const ALLOWED_EXTENSIONS = {
  "application/pdf":        { icon: "📄", label: "PDF"      },
  "text/plain":             { icon: "📝", label: "TXT"      },
  "text/markdown":          { icon: "📝", label: "MD"       },
  "application/json":       { icon: "🔧", label: "JSON"     },
  "image/png":              { icon: "🖼️", label: "PNG"      },
  "image/jpeg":             { icon: "🖼️", label: "JPG"      },
  "image/gif":              { icon: "🖼️", label: "GIF"      },
  "image/webp":             { icon: "🖼️", label: "WEBP"     },
};

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILES        = 5;

export function validateFile(file) {
  if (!ALLOWED_EXTENSIONS[file.type]) return "지원하지 않는 파일 형식입니다.";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`;
  return null;
}

export function isImageFile(file) {
  return file.type.startsWith("image/");
}
