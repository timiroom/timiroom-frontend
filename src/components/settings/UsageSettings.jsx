"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useUsage, USAGE_WARN_PERCENT } from "@/context/UsageContext";
import { confirmDialog } from "@/lib/feedback";
import {
  buyCredit, fetchBillingConfig, fetchCredits, fetchPaymentMethods, fetchSubscription, issueBillingKey, updateCreditSettings,
} from "@/lib/billingApi";
import { FEATURE_LABELS, fetchUsageFeatures, formatKrw, formatResetDate } from "@/lib/usageApi";
import { ActionButton, Badge, EmptyState, LoadingState, SettingsHeader, SettingsSection, Switch } from "@/components/ui";

const CAP_OPTIONS = [null, 10000, 30000, 50000, 100000];

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
  const [amount, setAmount] = useState(10000);
  const [custom, setCustom] = useState("");
  const [buying, setBuying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCap, setEditingCap] = useState(false);
  const [capDraft, setCapDraft] = useState("");
  const handledRedirect = useRef(false);

  const load = useCallback(async () => {
    try {
      const [nextCredits, nextFeatures] = await Promise.all([fetchCredits(), fetchUsageFeatures()]);
      setCredits(nextCredits);
      setFeatures(nextFeatures?.features ?? []);
    } catch (e) {
      showToast("error", e.message);
    }
  }, [showToast]);

  useEffect(() => { refresh(); load(); }, [refresh, load]);

  const chargeAmount = custom ? Number(custom) : amount;

  const purchase = useCallback(async (value, source) => {
    setBuying(true);
    try {
      await buyCredit(value, source);
      showToast("success", `${formatKrw(value)}을 충전했습니다.`);
      setCustom("");
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBuying(false);
      load();
      refresh();
    }
  }, [load, refresh, showToast]);

  // 모바일 결제창에서 돌아온 경우
  useEffect(() => {
    if (handledRedirect.current || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    if (!query.get("portone")) return;
    handledRedirect.current = true;
    window.history.replaceState(null, "", "/settings/usage");
    const billingKey = query.get("billingKey");
    const value = Number(query.get("amount"));
    if (billingKey && value > 0) {
      setBuying(true);
      buyCredit(value, { billingKey })
        .then(() => showToast("success", `${formatKrw(value)}을 충전했습니다.`))
        .catch((e) => showToast("error", e.message))
        .finally(() => { setBuying(false); load(); refresh(); });
    }
  }, [load, refresh, showToast]);

  async function saveSettings(enabled, monthlyCapKrw) {
    setSaving(true);
    try {
      setCredits(await updateCreditSettings({ enabled, monthlyCapKrw }));
      refresh();
      return true;
    } catch (e) {
      showToast("error", e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveCap() {
    const value = capDraft === "" ? null : Number(capDraft);
    if (value !== null && (!Number.isInteger(value) || value < 1000)) {
      showToast("error", "월 한도는 1,000원 이상으로 정해 주세요.");
      return;
    }
    if (await saveSettings(true, value)) setEditingCap(false);
  }

  async function handleBuy() {
    if (!validAmount) return;
    try {
      const methods = (await fetchPaymentMethods())?.methods ?? [];
      const defaultCard = methods.find((m) => m.isDefault);
      const ok = await confirmDialog(
        defaultCard
          ? `${defaultCard.cardSummary}로 ${formatKrw(chargeAmount)}을 충전할까요?`
          : `카드를 등록하고 ${formatKrw(chargeAmount)}을 충전할까요?`,
        { confirmLabel: defaultCard ? "결제" : "카드 등록" });
      if (!ok) return;
      if (defaultCard) { purchase(chargeAmount, {}); return; }
      const [config, subscription] = await Promise.all([fetchBillingConfig(), fetchSubscription()]);
      const billingKey = await issueBillingKey({
        config, customerId: subscription.customerId, email: user?.email, name: user?.name,
        purpose: "credit", returnPath: `/settings/usage?amount=${chargeAmount}`,
      });
      if (billingKey) purchase(chargeAmount, { billingKey });
    } catch (e) {
      showToast("error", e.message);
    }
  }

  if (!usage) return <><SettingsHeader eyebrow="내 계정" title="사용량" /><LoadingState /></>;

  const reset = formatResetDate(usage.resetAt);
  const minKrw = credits?.minKrw ?? 5000;
  const maxKrw = credits?.maxKrw ?? 500000;
  const validAmount = Number.isInteger(chargeAmount) && chargeAmount >= minKrw && chargeAmount <= maxKrw && chargeAmount % 1000 === 0;

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

      <SettingsSection title="추가 사용량"
        actions={credits && <Switch checked={credits.enabled} disabled={saving} label="추가 사용량 사용"
          onChange={(next) => saveSettings(next, credits.monthlyCapKrw)} />}>
        {credits === null ? <LoadingState /> : (
          <>
            <div className="credit-intro">
              {credits.enabled
                ? "요금제 사용량을 다 쓰면 충전한 잔액에서 쓴 만큼 빠지고 계속 쓸 수 있습니다."
                : "꺼져 있으면 요금제 사용량을 다 썼을 때 AI 기능이 멈춥니다."}
            </div>
            <div className={`credit-stats${credits.enabled ? "" : " is-off"}`}>
              <div className="credit-stat">
                <span className="credit-stat__label">잔액</span>
                <span className="credit-stat__value">{formatKrw(credits.balanceKrw)}</span>
              </div>
              <div className="credit-stat">
                <span className="credit-stat__label">이번 달 사용</span>
                <span className="credit-stat__value">{formatKrw(credits.spentKrw)}</span>
                {credits.monthlyCapKrw != null && (
                  <span className="usage-meter usage-meter--sm">
                    <span style={{ width: `${Math.min(100, (credits.spentKrw / credits.monthlyCapKrw) * 100)}%` }} />
                  </span>
                )}
              </div>
              <div className="credit-stat">
                <span className="credit-stat__label">월 한도</span>
                {editingCap ? (
                  <div className="credit-cap-edit">
                    <select className="ui-input" value={CAP_OPTIONS.includes(capDraft === "" ? null : Number(capDraft)) ? capDraft : "custom"}
                      onChange={(e) => setCapDraft(e.target.value === "custom" ? "200000" : e.target.value)} aria-label="월 한도">
                      {CAP_OPTIONS.map((value) => (
                        <option key={value ?? "none"} value={value ?? ""}>{value == null ? "제한 없음" : formatKrw(value)}</option>
                      ))}
                      <option value="custom">직접 입력</option>
                    </select>
                    {!CAP_OPTIONS.includes(capDraft === "" ? null : Number(capDraft)) && (
                      <input className="ui-input" inputMode="numeric" value={capDraft} aria-label="월 한도 직접 입력"
                        onChange={(e) => setCapDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))} />
                    )}
                    <ActionButton size="sm" variant="primary" disabled={saving} onClick={saveCap}>저장</ActionButton>
                    <ActionButton size="sm" variant="ghost" onClick={() => setEditingCap(false)}>취소</ActionButton>
                  </div>
                ) : (
                  <span className="credit-stat__value credit-stat__value--row">
                    {credits.monthlyCapKrw == null ? "제한 없음" : formatKrw(credits.monthlyCapKrw)}
                    <ActionButton size="sm" variant="ghost" onClick={() => {
                      setCapDraft(credits.monthlyCapKrw == null ? "" : String(credits.monthlyCapKrw));
                      setEditingCap(true);
                    }}>변경</ActionButton>
                  </span>
                )}
              </div>
            </div>

            <div className="credit-charge">
              <div className="credit-charge__title">충전</div>
              <div className="credit-amounts" role="radiogroup" aria-label="충전 금액">
                {credits.presetsKrw.map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={!custom && amount === value}
                    className={`credit-amount${!custom && amount === value ? " is-active" : ""}`}
                    onClick={() => { setAmount(value); setCustom(""); }}>
                    {formatKrw(value)}
                  </button>
                ))}
                <label className={`credit-amount credit-amount--custom${custom ? " is-active" : ""}`}>
                  <input inputMode="numeric" placeholder="직접 입력" value={custom ? Number(custom).toLocaleString("ko-KR") : ""}
                    onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} aria-label="충전 금액 직접 입력" />
                  <span>원</span>
                </label>
              </div>
              <div className="usage-block__foot">
                <span>{custom && !validAmount ? `${formatKrw(minKrw)}~${formatKrw(maxKrw)}, 1,000원 단위` : "충전한 금액은 다 쓸 때까지 남습니다."}</span>
                <ActionButton size="sm" variant="primary" disabled={!credits.paymentReady || !validAmount || buying} onClick={handleBuy}>
                  {buying ? "결제 중…" : credits.paymentReady ? `${validAmount ? formatKrw(chargeAmount) + " " : ""}충전` : "준비 중"}
                </ActionButton>
              </div>
            </div>
          </>
        )}
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
