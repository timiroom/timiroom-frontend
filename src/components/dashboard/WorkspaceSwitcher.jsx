"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, Icon } from "@/components/ui";

const ROLE_LABEL = { OWNER: "소유자", MEMBER: "멤버", GUEST: "게스트" };

function workspaceId(workspace) {
  return workspace?.teamId ?? workspace?.id ?? null;
}

function workspaceName(workspace) {
  return workspace?.teamName ?? workspace?.name ?? "워크스페이스";
}

/**
 * 워크스페이스 전환 드롭다운. 사이드바 맨 위와 설정 메뉴에 둔다.
 * 누르면 내가 속한 워크스페이스 목록과 설정·새로 만들기 메뉴가 열린다.
 * onCreate가 없으면 새로 만들기 항목을 숨긴다(설정 화면처럼 만들기 창이 없는 곳).
 */
export function WorkspaceSwitcher({ workspaces = [], activeId, onSelect, onCreate, settingsHref = "/settings/workspace/general", subtitle, loading = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = workspaces.find((workspace) => String(workspaceId(workspace)) === String(activeId)) ?? null;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!loading && workspaces.length === 0) {
    return onCreate ? (
      <button type="button" className="ws-switch__trigger" onClick={onCreate}>
        <span className="ws-switch__empty-icon" aria-hidden="true"><Icon name="plus" size={14} /></span>
        <span className="ws-switch__text">
          <span className="ws-switch__name">워크스페이스 시작하기</span>
          <span className="ws-switch__sub">새로 만들거나 초대 코드로 참여</span>
        </span>
      </button>
    ) : null;
  }

  return (
    <div className="ws-switch" ref={rootRef}>
      <button
        type="button"
        className={`ws-switch__trigger${open ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={workspaceName(active)} src={active?.iconUrl} size={32} square />
        <span className="ws-switch__text">
          <span className="ws-switch__name">{loading && !active ? "불러오는 중…" : workspaceName(active)}</span>
          <span className="ws-switch__sub">{subtitle ?? (active ? ROLE_LABEL[active.viewerRole] ?? "멤버" : "")}</span>
        </span>
        <svg className="ws-switch__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 9l4-4 4 4" /><path d="M16 15l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div className="ws-switch__menu" role="menu">
          <div className="ws-switch__label">워크스페이스</div>
          {workspaces.map((workspace) => {
            const id = workspaceId(workspace);
            const selected = String(id) === String(activeId);
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className="ws-switch__option"
                onClick={() => { setOpen(false); if (!selected) onSelect(id); }}
              >
                <Avatar name={workspaceName(workspace)} src={workspace.iconUrl} size={24} square />
                <span className="ws-switch__option-name">{workspaceName(workspace)}</span>
                {selected && <Icon name="check" size={14} />}
              </button>
            );
          })}
          <div className="ws-switch__divider" />
          <Link role="menuitem" href={settingsHref} className="ws-switch__option" onClick={() => setOpen(false)}>
            <Icon name="wrench" size={14} /> <span className="ws-switch__option-name">워크스페이스 설정</span>
          </Link>
          {onCreate && (
            <button type="button" role="menuitem" className="ws-switch__option" onClick={() => { setOpen(false); onCreate(); }}>
              <Icon name="plus" size={14} /> <span className="ws-switch__option-name">새로 만들기 또는 참여</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
