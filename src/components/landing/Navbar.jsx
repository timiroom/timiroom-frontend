"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { smoothScroll } from "@/lib/smoothScroll";
import { Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "#features", label: "기능"     },
  { href: "#how",      label: "작동방식" },
  { href: "#tech",     label: "기술스택" },
  { href: "#metrics",  label: "성과"     },
];

/* ── 로그인 후 표시되는 유저 아바타 + 드롭다운 ── */
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* 아바타 버튼 */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            8,
          background:     "none",
          border:         "1.5px solid var(--border, #E5E7EB)",
          borderRadius:   40,
          padding:        "4px 12px 4px 4px",
          cursor:         "pointer",
          transition:     "all 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6B5CE7")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border, #E5E7EB)")}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width:          28,
            height:         28,
            borderRadius:   "50%",
            background:     "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       12,
            fontWeight:     700,
            color:          "#fff",
          }}>
            {initials}
          </div>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1E1B4B" }}>
          {user.name || user.email.split("@")[0]}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div style={{
          position:     "absolute",
          top:          "calc(100% + 8px)",
          right:        0,
          background:   "#fff",
          border:       "1px solid #E5E7EB",
          borderRadius: 14,
          boxShadow:    "0 8px 32px rgba(0,0,0,0.1)",
          minWidth:     180,
          overflow:     "hidden",
          zIndex:       100,
          animation:    "dd-in 0.12s ease",
        }}>
          {/* 유저 정보 */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E1B4B" }}>
              {user.name || "사용자"}
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {user.email}
            </div>
          </div>

          {/* 메뉴 아이템 */}
          {[
            { label: "대시보드",   href: "/dashboard", icon: "🏠" },
            { label: "프로필 설정", href: "/settings",  icon: "⚙️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        10,
                padding:    "10px 16px",
                fontSize:   13,
                fontWeight: 500,
                color:      "#374151",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* 로그아웃 */}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        10,
              width:      "100%",
              padding:    "10px 16px",
              border:     "none",
              background: "none",
              borderTop:  "1px solid #F3F4F6",
              fontSize:   13,
              fontWeight: 500,
              color:      "#EF4444",
              cursor:     "pointer",
              transition: "background 0.1s",
              textAlign:  "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <span>🚪</span>로그아웃
          </button>
        </div>
      )}

      <style>{`@keyframes dd-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}

/* ── Navbar (exported) ── */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, isLoading, isLoggedIn, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`al-nav${scrolled ? " scrolled" : ""}`}>
      {/* Logo */}
      <Link href="/" className="al-nav-logo">
        <div className="al-logo-icon">A</div>
        Align-it
      </Link>

      {/* Links */}
      <ul className="al-nav-links">
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <a href={href} onClick={smoothScroll(href)}>{label}</a>
          </li>
        ))}
      </ul>

      {/* CTA / Auth */}
      <div className="al-nav-cta">
        {isLoading ? (
          /* 로딩 중 — 자리 확보용 placeholder */
          <div style={{ width: 140, height: 36 }} />
        ) : isLoggedIn ? (
          /* ── 로그인 상태 ── */
          <>
            <Link href="/dashboard">
              <Button variant="outline">대시보드</Button>
            </Link>
            <UserMenu user={user} onLogout={logout} />
          </>
        ) : (
          /* ── 비로그인 상태 ── */
          <>
            <Button variant="outline" onClick={openAuthModal}>
              로그인
            </Button>
            <Button variant="primary" onClick={openAuthModal}>
              무료로 시작하기 →
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
