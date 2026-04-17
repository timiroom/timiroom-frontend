"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { smoothScroll } from "@/lib/smoothScroll";
import { Button } from "@/components/ui";

const NAV_LINKS = [
  { href: "#features", label: "기능"     },
  { href: "#how",      label: "작동방식" },
  { href: "#tech",     label: "기술스택" },
  { href: "#metrics",  label: "성과"     },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

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

      {/* CTA */}
      <div className="al-nav-cta">
        <Button variant="outline" href="#start" onClick={smoothScroll("#start")}>
          데모 보기
        </Button>
        <Button variant="primary" href="#start" onClick={smoothScroll("#start")}>
          무료로 시작하기 →
        </Button>
      </div>
    </nav>
  );
}
