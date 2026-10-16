"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useUsage, USAGE_WARN_PERCENT } from "@/context/UsageContext";
import { confirmDialog } from "@/lib/feedback";
import { buyCredit, fetchBillingConfig, fetchCredits, fetchPaymentMethods, fetchSubscription, issueBillingKey } from "@/lib/billingApi";
import { FEATURE_LABELS, fetchUsageFeatures, formatKrw, formatResetDate } from "@/lib/usageApi";
import { ActionButton, Badge, EmptyState, LoadingState, SettingsHeader, SettingsSection } from "@/components/ui";

function meterTone(percent) {
  if (percent >= 100) return " is-full";
  if (percent >= USAGE_WARN_PERCENT) return " is-warn";
  return "";
}

/**
 * 설정 > 내 계정 > 사용량. Claude·ChatGPT처럼 금액은 숨기고 비율과 초기화 날짜만 보여 준다.
 * 요금제 사용량을 다 쓰면 추가 사용량에서 이어 쓴다.
 */
export function UsageSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { usage, refresh } = useUsage();
  const [credits, setCredits] = useState(null);
  const [features, setFeatures] = useState(null);
  const [pack, setPack] = useState("");
  const [buying, setBuying] = useState(false);
  const handledRedirect = useRef(false);

  const load = useCallback(async () => {
    try {
      const [nextCredits, nextFeatures] = await Promise.all([fetchCredits(), fetchUsageFeatures()]);
      setCredits(nextCredits);
      setFeatures(nextFeatures?.features ?? []);
      setPack((current) => current || nextCredits?.packs?.[1]?.id || nextCredits?.packs?.[0]?.id || "");
    } catch (e) {
      showToast("error", e.message);
    }
  }, [showToast]);

  useEffect(() => { refresh(); load(); }, [refresh, load]);

  const purchase = useCallback(async (source) => {
    setBuying(true);
    try {
      await buyCredit(pack, source);
      showToast("success", "추가 사용량을 충전했습니다.");
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBuying(false);
      load();
      refresh();
    }
  }, [load, pack, refresh, showToast]);

  // 모바일 결제창에서 돌아온 경우
  useEffect(() => {
    if (handledRedirect.current || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    if (!query.get("portone")) return;
    handledRedirect.current = true;
    window.history.replaceState(null, "", "/settings/usage");
    const billingKey = query.get("billingKey");
    const packId = query.get("pack");
    if (billingKey && packId) {
      setBuying(true);
      buyCredit(packId, { billingKey })
        .then(() => showToast("success", "추가 사용량을 충전했습니다."))
        .catch((e) => showToast("error", e.message))
        .finally(() => { setBuying(false); load(); refresh(); });
    }
  }, [load, refresh, showToast]);

  async function handleBuy() {
    const chosen = credits?.packs?.find((p) => p.id === pack);
    if (!chosen) return;
    try {
      const methods = (await fetchPaymentMethods())?.methods ?? [];
      const defaultCard = methods.find((m) => m.isDefault);
      const ok = await confirmDialog(
        defaultCard
          ? `${defaultCard.cardSummary}로 ${formatKrw(chosen.priceKrw)}을 결제할까요?`
          : `카드를 등록하고 ${formatKrw(chosen.priceKrw)}을 결제할까요?`,
        { confirmLabel: defaultCard ? "결제" : "카드 등록" });
      if (!ok) return;
      if (defaultCard) { purchase({}); return; }
      const [config, subscription] = await Promise.all([fetchBillingConfig(), fetchSubscription()]);
      const billingKey = await issueBillingKey({
        config, customerId: subscription.customerId, email: user?.email, name: user?.name,
        purpose: "credit", returnPath: `/settings/usage?pack=${encodeURIComponent(pack)}`,
      });
      if (billingKey) purchase({ billingKey });
    } catch (e) {
      showToast("error", e.message);
    }
  }

  if (!usage) return <><SettingsHeader eyebrow="내 계정" title="사용량" /><LoadingState /></>;

  const reset = formatResetDate(usage.resetAt);
  const creditPercent = credits?.balancePercent ?? usage.creditPercent ?? 0;

  return (
    <>
      <SettingsHeader eyebrow="내 계정" title="사용량" />

      <SettingsSection title="요금제 사용량">
        <div className="usage-block">
          <div className="usage-block__row">
            <div>
              <div className="usage-block__title">{usage.planName} 요금제</div>
              <div className="usage-block__meta">{reset ? `${reset}에 초기화` : ""}</div>
            </div>
            <div className="usage-block__value">{usage.usingOwnKey ? <Badge tone="info">내 AI 키 사용 중</Badge> : `${usage.percent}% 사용`}</div>
          </div>
          <div className={`usage-meter${meterTone(usage.percent)}`} role="progressbar" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={usage.percent} aria-label="요금제 사용량">
            <span style={{ width: `${Math.min(100, usage.percent)}%` }} />
          </div>
          {usage.plan !== "PRO" && (
            <div className="usage-block__foot">
              <span>더 많이 쓰려면 프로로 바꿔 보세요.</span>
              <ActionButton size="sm" variant="primary" href="/settings/billing">업그레이드</ActionButton>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="추가 사용량">
        <div className="usage-block">
          <div className="usage-block__row">
            <div>
              <div className="usage-block__title">남은 추가 사용량</div>
              <div className="usage-block__meta">요금제 사용량을 다 쓰면 여기서 이어서 씁니다.</div>
            </div>
            <div className="usage-block__value">{credits ? `${creditPercent}%` : "—"}</div>
          </div>
          {credits === null ? <LoadingState /> : (
            <>
              <div className="credit-packs" role="radiogroup" aria-label="추가 사용량 상품">
                {credits.packs.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={pack === p.id}
                    className={`credit-pack${pack === p.id ? " is-active" : ""}`} onClick={() => setPack(p.id)}>
                    <span className="credit-pack__amount">+{p.percent}%</span>
                    <span className="credit-pack__price">{formatKrw(p.priceKrw)}</span>
                  </button>
                ))}
              </div>
              <div className="usage-block__foot">
                <span>요금제 한 달 사용량 대비 비율입니다.</span>
                <ActionButton size="sm" variant="primary" disabled={!credits.enabled || !pack || buying} onClick={handleBuy}>
                  {buying ? "결제 중…" : credits.enabled ? "구매" : "준비 중"}
                </ActionButton>
              </div>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="기능별 사용">
        {features === null ? <LoadingState /> : features.length === 0 ? (
          <EmptyState compact icon="zap" title="이번 달에는 아직 사용하지 않았습니다" />
        ) : (
          <ul className="usage-shares">
            {features.map((f) => (
              <li key={f.feature}>
                <span className="usage-shares__name">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                <span className="usage-shares__bar"><span style={{ width: `${f.percent}%` }} /></span>
                <span className="usage-shares__value">{f.percent}%</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </>
  );
}
