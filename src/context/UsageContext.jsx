"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ActionButton } from "@/components/ui";
import { USAGE_CHANGED_EVENT, USAGE_LIMIT_EVENT, fetchUsageMe, formatResetDate } from "@/lib/usageApi";

const UsageContext = createContext({ usage: null, refresh: () => {} });

/** 경고를 띄우는 사용 비율 */
export const USAGE_WARN_PERCENT = 80;

/**
 * 로그인한 사용자의 이번 달 AI 사용량. 계정 메뉴 막대, 채팅 경고, 한도 초과 안내가 같은 값을 본다.
 * AI 호출이 끝나면(usage-changed 이벤트) 잠시 뒤 다시 받아 온다.
 */
export function UsageProvider({ children }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);
  const [limitNotice, setLimitNotice] = useState(null);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) { setUsage(null); return; }
    try {
      setUsage(await fetchUsageMe());
    } catch {
      // 사용량을 못 받아도 앱 사용은 막지 않는다
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return undefined;
    const onChanged = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(refresh, 800);
    };
    const onLimit = (event) => {
      setLimitNotice(event.detail ?? {});
      refresh();
    };
    const onFocus = () => refresh();
    window.addEventListener(USAGE_CHANGED_EVENT, onChanged);
    window.addEventListener(USAGE_LIMIT_EVENT, onLimit);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener(USAGE_CHANGED_EVENT, onChanged);
      window.removeEventListener(USAGE_LIMIT_EVENT, onLimit);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refresh]);

  return (
    <UsageContext.Provider value={{ usage, refresh }}>
      {children}
      {limitNotice && (
        <div className="usage-limit" role="alertdialog" aria-labelledby="usage-limit-title" aria-describedby="usage-limit-desc">
          <strong id="usage-limit-title">이번 달 AI 사용 한도를 다 썼습니다</strong>
          <p id="usage-limit-desc">
            {formatResetDate(limitNotice.resetAt || usage?.resetAt)
              ? `${formatResetDate(limitNotice.resetAt || usage?.resetAt)}에 다시 쓸 수 있습니다. `
              : ""}
            {limitNotice.plan === "PRO"
              ? "내 AI 키를 연결하면 바로 이어서 쓸 수 있습니다."
              : "프로로 바꾸거나 내 AI 키를 연결하면 바로 이어서 쓸 수 있습니다."}
          </p>
          <div className="usage-limit__actions">
            <ActionButton size="sm" variant="ghost" onClick={() => setLimitNotice(null)}>닫기</ActionButton>
            <ActionButton size="sm" href="/settings/ai-keys" onClick={() => setLimitNotice(null)}>내 AI 키 연결</ActionButton>
            {limitNotice.plan !== "PRO" && (
              <ActionButton size="sm" variant="primary" href="/settings/billing" onClick={() => setLimitNotice(null)}>요금제 보기</ActionButton>
            )}
          </div>
        </div>
      )}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  return useContext(UsageContext);
}

/** 지금 AI 기능을 막아야 하는지(내 키를 쓰면 막지 않는다). */
export function isUsageBlocked(usage) {
  return Boolean(usage && usage.enforced && !usage.usingOwnKey && usage.percent >= 100);
}
