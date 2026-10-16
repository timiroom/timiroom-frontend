"use client";

/**
 * 사이드바 맨 아래 계정 줄. Claude 앱처럼 [사진 이름 ˅] 을 누르면 위로 메뉴가 열리고,
 * 오른쪽에 알림 버튼을 둔다. 따로 있던 맨 왼쪽 레일의 역할을 이 줄로 옮겼다.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUsage, USAGE_WARN_PERCENT } from "@/context/UsageContext";
import { formatResetDate } from "@/lib/usageApi";
import { confirmDialog } from "@/lib/feedback";
import { Avatar, Icon } from "@/components/ui";
import { NotificationBell } from "./NotificationBell";

export function SidebarAccount() {
  const { user, logout } = useAuth();
  const { usage } = useUsage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    if (await confirmDialog("로그아웃할까요?", { confirmLabel: "로그아웃" })) logout();
  }

  const name = user?.name || user?.email || "사용자";

  return (
    <div className="ctx-foot" ref={rootRef}>
      <button
        type="button"
        className={`ctx-account${open ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={name} src={user?.avatarUrl} size={28} />
        <span className="ctx-account__name">{name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="ctx-account__chevron">
          <polyline points="6 15 12 9 18 15" />
        </svg>
      </button>
      <NotificationBell />

      {open && (
        <div className="ctx-account__menu" role="menu">
          <div className="ctx-account__who">
            <strong>{name}</strong>
            {user?.email && <span>{user.email}</span>}
          </div>
          {usage && (
            // ChatGPT·Claude처럼 메뉴 안에서 이번 달 사용량을 바로 본다. 누르면 사용량 화면으로 간다.
            <Link role="menuitem" href="/settings/usage" className="ctx-usage" onClick={() => setOpen(false)}>
              <span className="ctx-usage__row">
                <span>{usage.planName} · 이번 달 사용량</span>
                <span>{usage.usingOwnKey ? "내 키" : `${usage.percent}%`}</span>
              </span>
              <span className={`usage-meter usage-meter--sm${usage.percent >= 100 ? " is-full" : usage.percent >= USAGE_WARN_PERCENT ? " is-warn" : ""}`}>
                <span style={{ width: `${Math.min(100, usage.percent)}%` }} />
              </span>
              <span className="ctx-usage__reset">{formatResetDate(usage.resetAt)} 초기화</span>
            </Link>
          )}
          <Link role="menuitem" href="/settings/profile" className="ctx-account__item" onClick={() => setOpen(false)}>
            <Icon name="users" size={14} /> 프로필
          </Link>
          <Link role="menuitem" href="/settings" className="ctx-account__item" onClick={() => setOpen(false)}>
            <Icon name="wrench" size={14} /> 설정
          </Link>
          <Link role="menuitem" href="/settings/billing" className="ctx-account__item" onClick={() => setOpen(false)}>
            <Icon name="card" size={14} /> {usage?.plan === "PRO" ? "요금제·결제" : "프로로 업그레이드"}
          </Link>
          <div className="ctx-account__divider" />
          <button role="menuitem" type="button" className="ctx-account__item" onClick={handleLogout}>
            <Icon name="key" size={14} /> 로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
