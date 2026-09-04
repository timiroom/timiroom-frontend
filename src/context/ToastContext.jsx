"use client";

/**
 * ToastContext — 전역 토스트 알림
 *
 * 우측 하단에 검정 배경/흰 글씨로 뜨고, 3초 후 자동으로 사라진다.
 * 여러 개가 동시에 뜨면 최신 알림이 아래쪽에 쌓인다 (column-reverse).
 */

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);
const AUTO_DISMISS_MS = 3000;

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback((type, message) => {
    const id = ++seq;
    setToasts((prev) => [...prev, { id, type, message }]);
    timers.current[id] = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

const ACCENT = {
  success: "#34d399",
  error: "#f87171",
};

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 18,
      right: 18,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 8,
      maxWidth: 360,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 12px 12px 14px",
            borderRadius: 10,
            background: "#1a1916",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.5,
            boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
            borderLeft: `3px solid ${ACCENT[t.type] || "rgba(255,255,255,0.3)"}`,
            animation: "toast-in 0.18s ease",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="알림 닫기"
            style={{
              flexShrink: 0,
              width: 18,
              height: 18,
              borderRadius: 4,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
