import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

/*
 * 내 알림 (백엔드 /api/v1/notifications)
 * 문서 생성 완료·실패, PR 정합성 경고 때 서버가 만든다. 최신순으로 온다.
 * 엔티티의 boolean isRead는 JSON에서 "read"로 나가므로 화면에서는 read로 맞춘다.
 */
const BASE = `${API_BASE_URL}/api/v1/notifications`;

async function request(url, options) {
  const res = await apiFetch(url, options);
  if (!res?.ok) throw new Error(`알림 요청 실패 (HTTP ${res?.status})`);
  return res;
}

export async function fetchNotifications() {
  const list = await (await request(BASE)).json();
  return (Array.isArray(list) ? list : []).map((n) => ({ ...n, read: Boolean(n.read ?? n.isRead) }));
}

export async function fetchUnreadCount() {
  const body = await (await request(`${BASE}/unread-count`)).json();
  return Number(body?.count) || 0;
}

export const markNotificationRead = (id) => request(`${BASE}/${id}/read`, { method: "PATCH" });
export const markAllNotificationsRead = () => request(`${BASE}/read-all`, { method: "PATCH" });
