"use client";

/**
 * 사이드바 맨 아래 계정 줄. Claude 앱처럼 [사진 이름 ˅] 을 누르면 위로 메뉴가 열리고,
 * 오른쪽에 알림 버튼을 둔다. 따로 있던 맨 왼쪽 레일의 역할을 이 줄로 옮겼다.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { confirmDialog } from "@/lib/feedback";
import { Avatar, Icon } from "@/components/ui";
import { NotificationBell } from "./NotificationBell";

export function SidebarAccount() {
  const { user, logout } = useAuth();
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
          <Link role="menuitem" href="/settings/profile" className="ctx-account__item" onClick={() => setOpen(false)}>
            <Icon name="users" size={14} /> 프로필
          </Link>
          <Link role="menuitem" href="/settings" className="ctx-account__item" onClick={() => setOpen(false)}>
            <Icon name="wrench" size={14} /> 설정
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
