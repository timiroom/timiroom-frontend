import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

async function request(path, { method = "GET", body, fallback } = {}) {
  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || fallback || "요청을 처리하지 못했습니다");
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const fetchAdminOverview = () => request("/api/v1/admin/billing/overview", { fallback: "요약을 불러오지 못했습니다" });

export const fetchAdminMembers = (query = "", page = 0) =>
  request(`/api/v1/admin/billing/members?query=${encodeURIComponent(query)}&page=${page}&size=20`, { fallback: "회원 목록을 불러오지 못했습니다" });

export const fetchAdminPayments = (status = "", page = 0) =>
  request(`/api/v1/admin/billing/payments?status=${encodeURIComponent(status)}&page=${page}&size=20`, { fallback: "결제 목록을 불러오지 못했습니다" });

export const adminRefund = (id, { amountKrw, reason, downgrade }) =>
  request(`/api/v1/admin/billing/payments/${id}/refund`, { method: "POST", body: { amountKrw, reason, downgrade }, fallback: "환불하지 못했습니다" });

/** plan: "FREE" | "PRO", months: 프로를 줄 개월 수 */
export const adminSetPlan = (memberId, plan, months = 1) =>
  request(`/api/v1/admin/members/${memberId}/plan`, { method: "PATCH", body: { plan, months }, fallback: "요금제를 바꾸지 못했습니다" });

export const fetchAdminInsights = () => request("/api/v1/admin/billing/insights", { fallback: "지표를 불러오지 못했습니다" });
export const fetchAdminMember = (id) => request(`/api/v1/admin/billing/members/${id}`, { fallback: "회원 정보를 불러오지 못했습니다" });
export const fetchAdminUsage = (feature = "", query = "", page = 0) =>
  request(`/api/v1/admin/billing/usage?feature=${encodeURIComponent(feature)}&query=${encodeURIComponent(query)}&page=${page}&size=30`,
    { fallback: "AI 사용 기록을 불러오지 못했습니다" });
export const fetchAdminSystem = () => request("/api/v1/admin/billing/system", { fallback: "시스템 상태를 불러오지 못했습니다" });
export const fetchAdminAi = () => request("/api/v1/admin/billing/ai", { fallback: "AI 사용 현황을 불러오지 못했습니다" });
