import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

async function request(path, { method = "GET", body, fallback } = {}) {
  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || fallback || "요청을 처리하지 못했습니다");
  }
  return res.status === 204 ? null : res.json();
}

export const fetchBillingConfig = () => request("/api/v1/billing/config", { fallback: "결제 설정을 불러오지 못했습니다" });
export const fetchSubscription = () => request("/api/v1/billing/subscription", { fallback: "요금제 정보를 불러오지 못했습니다" });
/** source: { paymentMethodId } 또는 { billingKey }(방금 등록한 카드). 비우면 기본 카드 */
export const subscribePro = (source = {}) => request("/api/v1/billing/subscribe", { method: "POST", body: source, fallback: "구독하지 못했습니다" });
export const fetchPaymentMethods = () => request("/api/v1/billing/payment-methods", { fallback: "결제 수단을 불러오지 못했습니다" });
export const addPaymentMethod = (billingKey, makeDefault = false) => request("/api/v1/billing/payment-methods", { method: "POST", body: { billingKey, makeDefault }, fallback: "카드를 추가하지 못했습니다" });
export const setDefaultPaymentMethod = (id) => request(`/api/v1/billing/payment-methods/${id}/default`, { method: "POST", fallback: "기본 카드를 바꾸지 못했습니다" });
export const deletePaymentMethod = (id) => request(`/api/v1/billing/payment-methods/${id}`, { method: "DELETE", fallback: "카드를 지우지 못했습니다" });
export const fetchCredits = () => request("/api/v1/billing/credits", { fallback: "추가 사용량을 불러오지 못했습니다" });
export const updateCreditSettings = (settings) => request("/api/v1/billing/credits/settings", { method: "PATCH", body: settings, fallback: "설정을 저장하지 못했습니다" });
export const buyCredit = (amountKrw, source = {}) => request("/api/v1/billing/credits", { method: "POST", body: { amountKrw, ...source }, fallback: "충전하지 못했습니다" });
export const cancelSubscription = () => request("/api/v1/billing/cancel", { method: "POST", fallback: "해지하지 못했습니다" });
export const resumeSubscription = () => request("/api/v1/billing/resume", { method: "POST", fallback: "해지를 취소하지 못했습니다" });
export const fetchPayments = (page = 0) => request(`/api/v1/billing/payments?page=${page}&size=20`, { fallback: "결제 내역을 불러오지 못했습니다" });
export const fetchReceipt = (id) => request(`/api/v1/billing/payments/${encodeURIComponent(id)}/receipt`, { fallback: "영수증을 불러오지 못했습니다" });

export const PAYMENT_STATUS = {
  PAID: { label: "결제 완료", tone: "success" },
  PENDING: { label: "처리 중", tone: "info" },
  FAILED: { label: "실패", tone: "danger" },
  CANCELLED: { label: "취소", tone: "neutral" },
};

/**
 * PortOne 결제창에서 카드를 등록하고 빌링키를 받는다.
 * 모바일처럼 결제창이 페이지를 옮기는 경우에는 redirectUrl로 돌아오며, 그때는 이 함수가 끝나지 않는다.
 * 사용자가 창을 닫으면 null을 돌려준다.
 */
export async function issueBillingKey({ config, customerId, email, name, purpose = "card", returnPath = "/settings/billing" }) {
  const PortOne = (await import("@portone/browser-sdk/v2")).default;
  const issueId = `tmr-issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const redirect = new URL(returnPath, window.location.origin);
  redirect.searchParams.set("portone", purpose);
  const redirectUrl = redirect.toString();
  const response = await PortOne.requestIssueBillingKey({
    storeId: config.storeId,
    channelKey: config.channelKey,
    billingKeyMethod: "CARD",
    issueId,
    issueName: "티미룸 결제 카드 등록",
    customer: { customerId, ...(email ? { email } : {}), ...(name ? { fullName: name } : {}) },
    redirectUrl,
  });
  if (!response) return null;
  if (response.code) {
    // 사용자가 직접 닫은 경우는 오류로 보이지 않게 한다
    if (/cancel|취소/i.test(`${response.code} ${response.message ?? ""}`)) return null;
    throw new Error(response.message || "카드를 등록하지 못했습니다");
  }
  return response.billingKey ?? null;
}
