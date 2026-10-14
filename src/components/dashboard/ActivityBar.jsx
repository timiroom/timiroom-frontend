"use client";

/**
 * ActivityBar — 맨 왼쪽 레일. 어디서든 쓰는 것만 둔다.
 *   위: 로고, 프로젝트
 *   아래: 설정, 알림, 프로필(메뉴: 설정·로그아웃)
 * 워크스페이스 전환은 프로젝트 패널 맨 위(WorkspaceSwitcher)로, 커밋 기록은 프로젝트 안으로 옮겼다.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { confirmDialog } from "@/lib/feedback";
import { NotificationBell } from "./NotificationBell";

function IconProjects() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="9" height="9" rx="2"/>
      <rect x="13" y="3" width="9" height="9" rx="2"/>
      <rect x="2" y="14" width="9" height="9" rx="2" opacity="0.5"/>
      <rect x="13" y="14" width="9" height="9" rx="2" opacity="0.5"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** 레일 아이콘 버튼. href가 있으면 링크로 그린다. 이름은 title·aria-label로 알려 준다. */
function RailButton({ label, href, active = false, onClick, children }) {
  const className = `rail-btn${active ? " is-active" : ""}`;
  if (href) return <Link href={href} className={className} title={label} aria-label={label} aria-current={active ? "page" : undefined}>{children}</Link>;
  return <button type="button" className={className} title={label} aria-label={label} onClick={onClick}>{children}</button>;
}

export function ActivityBar() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return undefined;
    const onPointer = (e) => { if (!menuRef.current?.contains(e.target)) setShowMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setShowMenu(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [showMenu]);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "A";

  async function handleLogout() {
    setShowMenu(false);
    if (await confirmDialog("로그아웃할까요?", { confirmLabel: "로그아웃" })) logout();
  }

  return (
    <div className="rail">
      <div className="rail-logo" aria-hidden="true">A</div>
      <div className="rail-divider" />

      <RailButton label="프로젝트" href="/dashboard" active><IconProjects /></RailButton>

      <div style={{ flex: 1 }} />

      <RailButton label="설정" href="/settings"><IconSettings /></RailButton>
      <NotificationBell />

      <div className="rail-profile" ref={menuRef}>
        <button
          type="button"
          className="rail-avatar"
          onClick={() => setShowMenu(p => !p)}
          title={user?.name || "프로필"}
          aria-label="프로필 메뉴"
          aria-haspopup="menu"
          aria-expanded={showMenu}
        >
          {user?.avatarUrl
            ? <Image src={user.avatarUrl} alt="" fill sizes="32px" style={{ objectFit: "cover" }} />
            : initials}
        </button>

        {showMenu && (
          <div className="rail-menu" role="menu">
            <div className="rail-menu__who">
              <strong>{user?.name || "사용자"}</strong>
              <span>{user?.email}</span>
            </div>
            <Link role="menuitem" href="/settings/profile" className="rail-menu__item" onClick={() => setShowMenu(false)}>프로필</Link>
            <Link role="menuitem" href="/settings" className="rail-menu__item" onClick={() => setShowMenu(false)}>설정</Link>
            <button role="menuitem" type="button" className="rail-menu__item" onClick={handleLogout}>로그아웃</button>
          </div>
        )}
      </div>
    </div>
  );
}
