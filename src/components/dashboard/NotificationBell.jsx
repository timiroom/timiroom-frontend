"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, Icon } from "@/components/ui";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "@/lib/notificationApi";

// 화면을 보고 있을 때만 안 읽은 개수를 주기적으로 확인한다.
const POLL_MS = 60_000;

const TYPE_LABEL = {
  PIPELINE_COMPLETE: "문서 생성",
  PIPELINE_FAILED: "문서 생성 실패",
  PR_CONSISTENCY_REVIEW: "PR 정합성",
  TEAM_INVITE: "팀 초대",
  MENTION: "멘션",
};

function timeAgo(value) {
  const time = value ? new Date(value).getTime() : NaN;
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((Date.now() - time) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}일 전` : new Date(time).toLocaleDateString("ko-KR");
}

/** 레일 하단의 알림 버튼. 누르면 레일 오른쪽에 최근 알림 목록이 열린다. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const rootRef = useRef(null);

  const refreshCount = useCallback(() => {
    fetchUnreadCount().then(setUnread).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const onVisible = () => { if (document.visibilityState === "visible") refreshCount(); };
    const timer = setInterval(onVisible, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setError("");
    fetchNotifications()
      .then((list) => { if (active) { setItems(list); setUnread(list.filter((n) => !n.read).length); } })
      .catch(() => { if (active) setError("알림을 불러오지 못했습니다."); });
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      active = false;
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (item) => {
    if (item.read) return;
    setItems((list) => list.map((n) => (n.notificationId === item.notificationId ? { ...n, read: true } : n)));
    setUnread((n) => Math.max(0, n - 1));
    try { await markNotificationRead(item.notificationId); } catch { refreshCount(); }
  };

  const markAll = async () => {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list);
    setUnread(0);
    try { await markAllNotificationsRead(); } catch { refreshCount(); }
  };

  return (
    <div className="notice" ref={rootRef}>
      <button type="button" className={`notice-btn${open ? " is-open" : ""}`} title="알림"
        aria-label={unread > 0 ? `알림, 안 읽은 알림 ${unread}개` : "알림"}
        aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        <Icon name="bell" size={19} strokeWidth={1.7} />
        {unread > 0 && <span className="notice-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="notice-pop" role="dialog" aria-label="알림">
          <div className="notice-head">
            <strong>알림</strong>
            <ActionButton size="sm" variant="ghost" disabled={unread === 0} onClick={markAll}>모두 읽음</ActionButton>
          </div>
          <div className="notice-list">
            {error && <p className="notice-empty" role="alert">{error}</p>}
            {!error && items === null && <p className="notice-empty">불러오는 중…</p>}
            {!error && items?.length === 0 && <p className="notice-empty">받은 알림이 없습니다.</p>}
            {!error && items?.map((n) => (
              <button type="button" key={n.notificationId} className={`notice-item${n.read ? "" : " is-unread"}`} onClick={() => markRead(n)}>
                <span className="notice-dot" aria-hidden="true" />
                <span className="notice-body">
                  <span className="notice-meta">{TYPE_LABEL[n.type] ?? "알림"} · {timeAgo(n.createdAt)}</span>
                  <span className="notice-title">{n.title}</span>
                  {n.content && <span className="notice-text">{n.content}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
