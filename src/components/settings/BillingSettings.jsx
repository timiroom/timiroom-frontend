"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useUsage } from "@/context/UsageContext";
import { confirmDialog } from "@/lib/feedback";
import {
  PAYMENT_STATUS, addPaymentMethod, cancelSubscription, deletePaymentMethod, fetchBillingConfig, fetchPaymentMethods,
  fetchPayments, fetchRefundOptions, fetchSubscription, issueBillingKey, refundSubscription, resumeSubscription,
  setDefaultPaymentMethod, subscribePro,
} from "@/lib/billingApi";
import { BusinessInfo } from "@/components/legal/BusinessInfo";
import { PaymentConsent } from "./PaymentConsent";
import { fetchPlans, formatKrw } from "@/lib/usageApi";
import { ActionButton, Badge, EmptyState, Icon, LoadingState, SettingsHeader, SettingsSection } from "@/components/ui";

function dateLabel(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/** 설정 > 내 계정 > 요금제·결제. Claude 설정처럼 요금제, 결제 수단, 결제 내역을 한 화면에 둔다. */
export function BillingSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { refresh: refreshUsage } = useUsage();
  const [config, setConfig] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [methods, setMethods] = useState(null);
  const [payments, setPayments] = useState(null);
  const [busy, setBusy] = useState("");
  const [refunds, setRefunds] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const handledRedirect = useRef(false);

  const load = useCallback(async () => {
    try {
      const [nextConfig, nextSubscription, nextPlans, nextMethods, nextPayments, nextRefunds] = await Promise.all([
        fetchBillingConfig(), fetchSubscription(), fetchPlans(), fetchPaymentMethods(), fetchPayments(0),
        fetchRefundOptions().catch(() => null),
      ]);
      setRefunds(nextRefunds);
      setConfig(nextConfig);
      setSubscription(nextSubscription);
      setPlans(nextPlans?.plans ?? []);
      setMethods(nextMethods?.methods ?? []);
      setPayments(nextPayments?.content ?? []);
    } catch (e) {
      showToast("error", e.message);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const run = useCallback(async (key, action, success) => {
    setBusy(key);
    try {
      await action();
      if (success) showToast("success", success);
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusy("");
      await load();
      refreshUsage();
    }
  }, [load, refreshUsage, showToast]);

  // 모바일처럼 결제창이 페이지를 옮긴 경우, 돌아온 주소의 billingKey로 마저 처리한다.
  useEffect(() => {
    if (handledRedirect.current || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const purpose = query.get("portone");
    if (!purpose) return;
    handledRedirect.current = true;
    window.history.replaceState(null, "", "/settings/billing");
    const billingKey = query.get("billingKey");
    if (query.get("code") || !billingKey) {
      if (query.get("code")) showToast("error", query.get("message") || "카드를 등록하지 못했습니다.");
      return;
    }
    if (purpose === "subscribe") run("subscribe", () => subscribePro({ billingKey }), "프로를 시작했습니다.");
    else run("card", () => addPaymentMethod(billingKey), "카드를 추가했습니다.");
  }, [run, showToast]);

  const openCardWindow = useCallback((purpose) => issueBillingKey({
    config, customerId: subscription?.customerId, email: user?.email, name: user?.name, purpose,
  }), [config, subscription?.customerId, user?.email, user?.name]);

  async function handleAddCard() {
    setBusy("card");
    try {
      const billingKey = await openCardWindow("card");
      if (!billingKey) { setBusy(""); return; }
      await run("card", () => addPaymentMethod(billingKey), "카드를 추가했습니다.");
    } catch (e) {
      showToast("error", e.message);
      setBusy("");
    }
  }

  async function handleUpgrade() {
    const defaultCard = methods?.find((m) => m.isDefault);
    const ok = await confirmDialog(
      defaultCard
        ? `${defaultCard.cardSummary}로 ${formatKrw(config.priceKrw)}을 결제하고 프로를 시작할까요? 매달 같은 날 결제됩니다.`
        : `카드를 등록하면 ${formatKrw(config.priceKrw)}이 결제되고 프로가 시작됩니다. 매달 같은 날 결제됩니다.`,
      { confirmLabel: defaultCard ? "결제" : "카드 등록" });
    if (!ok) return;
    if (defaultCard) {
      run("subscribe", () => subscribePro({}), "프로를 시작했습니다.");
      return;
    }
    setBusy("subscribe");
    try {
      const billingKey = await openCardWindow("subscribe");
      if (!billingKey) { setBusy(""); return; }
      await run("subscribe", () => subscribePro({ billingKey }), "프로를 시작했습니다.");
    } catch (e) {
      showToast("error", e.message);
      setBusy("");
    }
  }

  async function handleRefund() {
    const ok = await confirmDialog(`${formatKrw(refunds.subscription.amountKrw)}을 환불하고 바로 무료 요금제로 바꿀까요?`,
      { confirmLabel: "환불", danger: true });
    if (ok) run("refund", refundSubscription, "환불을 요청했습니다. 카드사에 따라 3~7영업일 걸릴 수 있습니다.");
  }

  async function handleCancel() {
    const ok = await confirmDialog(`${dateLabel(subscription.periodEnd)}까지 프로를 쓰고 무료로 바뀝니다. 해지할까요?`, { confirmLabel: "해지", danger: true });
    if (ok) run("cancel", cancelSubscription, "해지를 예약했습니다.");
  }

  async function handleDeleteCard(method) {
    const ok = await confirmDialog(`${method.cardSummary}를 삭제할까요?`, { confirmLabel: "삭제", danger: true });
    if (ok) run(`del-${method.id}`, () => deletePaymentMethod(method.id), "카드를 삭제했습니다.");
  }

  if (!subscription || methods === null) return <><SettingsHeader eyebrow="내 계정" title="요금제·결제" /><LoadingState /></>;

  const isPro = subscription.plan === "PRO";
  const pastDue = subscription.status === "PAST_DUE";
  const ready = Boolean(config?.enabled);
  const pro = plans.find((p) => p.plan === "PRO");

  let planMeta = "기본 사용량";
  if (isPro && subscription.grantedByAdmin) planMeta = `${dateLabel(subscription.periodEnd)}까지`;
  else if (isPro && subscription.cancelAtPeriodEnd) planMeta = `${dateLabel(subscription.periodEnd)}에 종료`;
  else if (isPro && !pastDue) planMeta = `다음 결제 ${dateLabel(subscription.nextBillingAt)} · ${formatKrw(subscription.priceKrw)}`;

  return (
    <>
      <SettingsHeader eyebrow="내 계정" title="요금제·결제" />
      <SettingsSection title="요금제">
        <div className="bill-plan">
          <div className="bill-plan__icon" aria-hidden="true"><Icon name={isPro ? "star" : "box"} size={18} /></div>
          <div className="bill-plan__text">
            <div className="bill-plan__name">
              {isPro ? "프로" : "무료"}
              {isPro && <Badge tone={pastDue ? "danger" : subscription.cancelAtPeriodEnd ? "warning" : "success"}>
                {pastDue ? "결제 실패" : subscription.cancelAtPeriodEnd ? "해지 예정" : "이용 중"}
              </Badge>}
            </div>
            <div className="bill-plan__meta">{pastDue ? "결제에 실패했습니다. 결제 수단을 확인해 주세요." : planMeta}</div>
          </div>
          <div className="bill-plan__actions">
            {!isPro && <ActionButton variant="primary" disabled={!ready || !agreed || Boolean(busy)} onClick={handleUpgrade}>
              {busy === "subscribe" ? "결제 중…" : ready ? "프로로 업그레이드" : "준비 중"}
            </ActionButton>}
            {isPro && !subscription.grantedByAdmin && (subscription.cancelAtPeriodEnd
              ? <ActionButton disabled={Boolean(busy)} onClick={() => run("resume", resumeSubscription, "해지를 취소했습니다.")}>해지 취소</ActionButton>
              : <ActionButton variant="ghost" disabled={Boolean(busy)} onClick={handleCancel}>구독 해지</ActionButton>)}
          </div>
        </div>
        {!isPro && pro && (
          <div className="bill-upsell">
            <strong>프로 · {formatKrw(pro.priceKrw)}/월</strong>
            <span>무료의 {pro.usageMultiplier}배 사용량</span>
          </div>
        )}
        {!isPro && ready && (
          <PaymentConsent kind="subscription" priceLabel={formatKrw(config.priceKrw)} checked={agreed} onChange={setAgreed}
            refundDays={config.subscriptionRefundDays} />
        )}
        {isPro && refunds?.subscription?.eligible && (
          <div className="bill-refund">
            <span>결제 후 {refunds.subscriptionRefundDays}일 안이고 아직 AI 기능을 쓰지 않아 전액 환불받을 수 있습니다.</span>
            <ActionButton size="sm" variant="ghost" disabled={Boolean(busy)} onClick={handleRefund}>
              {busy === "refund" ? "환불 중…" : `${formatKrw(refunds.subscription.amountKrw)} 환불`}
            </ActionButton>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="결제 수단"
        actions={<ActionButton size="sm" disabled={!ready || Boolean(busy) || methods.length >= 5} onClick={handleAddCard}>
          <Icon name="plus" size={13} /> {busy === "card" ? "등록 중…" : "추가"}
        </ActionButton>}>
        {methods.length === 0 ? (
          <EmptyState compact icon="card" title="등록된 카드가 없습니다" />
        ) : methods.map((method) => (
          <div key={method.id} className="bill-card">
            <div className="bill-card__icon" aria-hidden="true"><Icon name="card" size={16} /></div>
            <div className="bill-card__text">
              <span className="bill-card__name">{method.cardSummary}</span>
              <span className="bill-card__meta">{dateLabel(method.createdAt)} 등록</span>
            </div>
            {method.isDefault
              ? <Badge>기본</Badge>
              : <ActionButton size="sm" variant="ghost" disabled={Boolean(busy)}
                  onClick={() => run(`def-${method.id}`, () => setDefaultPaymentMethod(method.id), "기본 카드를 바꿨습니다.")}>기본으로</ActionButton>}
            <ActionButton size="sm" variant="ghost" iconOnly title="삭제" aria-label={`${method.cardSummary} 삭제`}
              disabled={Boolean(busy)} onClick={() => handleDeleteCard(method)}>
              <Icon name="trash" size={14} />
            </ActionButton>
          </div>
        ))}
      </SettingsSection>

      <SettingsSection title="결제 내역">
        {payments === null ? <LoadingState /> : payments.length === 0 ? (
          <EmptyState compact icon="list" title="결제 내역이 없습니다" />
        ) : payments.map((p) => {
          const status = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" };
          return (
            <div key={p.id} className="pay-row">
              <div className="pay-row__main">
                <span className="pay-row__title">{p.kind === "CREDIT" ? "추가 사용량" : "프로 요금제"}</span>
                <span className="pay-row__meta">{dateLabel(p.paidAt || p.createdAt)}{p.cardSummary ? ` · ${p.cardSummary}` : ""}</span>
              </div>
              <span className="pay-row__amount">
                {formatKrw(p.amountKrw)}
                {p.refundedKrw > 0 && <small className="pay-row__refund">{formatKrw(p.refundedKrw)} 환불</small>}
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
              {["PAID", "PARTIAL_CANCELLED", "CANCELLED"].includes(p.status) && p.paidAt
                ? <ActionButton size="sm" variant="ghost" href={`/receipt/${p.id}`} target="_blank" rel="noopener">영수증</ActionButton>
                : <span className="pay-row__spacer" />}
            </div>
          );
        })}
      </SettingsSection>

      <BusinessInfo compact />
    </>
  );
}
