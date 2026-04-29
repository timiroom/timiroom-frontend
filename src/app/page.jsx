/**
 * app/page.jsx — Align-it 랜딩 페이지
 * TIMIROOM 디자인 시스템 적용
 */

"use client";

import { useEffect } from "react";
import { useScrollAnim } from "@/hooks";
import {
  ScrollProgress,
  Navbar,
  Hero,
  TrustSection,
  Features,
  HowItWorks,
  TechStack,
  FooterCTA,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  useScrollAnim();

  // 카드 마우스 틸트 효과
  useEffect(() => {
    const cards = document.querySelectorAll(".al-agent-card, .al-step, .al-metric");

    const onMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left  - rect.width  / 2;
      const y = e.clientY - rect.top   - rect.height / 2;
      const tx = -(y / rect.height) * 4;
      const ty =  (x / rect.width)  * 4;
      card.style.transform = `perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg) translateY(-4px)`;
    };
    const onLeave = (e) => { e.currentTarget.style.transform = ""; };

    cards.forEach((c) => {
      c.addEventListener("mousemove", onMove);
      c.addEventListener("mouseleave", onLeave);
    });
    return () => cards.forEach((c) => {
      c.removeEventListener("mousemove", onMove);
      c.removeEventListener("mouseleave", onLeave);
    });
  }, []);

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <Hero />
      <TrustSection />
      <Features />
      <HowItWorks />
      <TechStack />
      <FooterCTA />
      <Footer />
    </>
  );
}
