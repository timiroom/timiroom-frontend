/**
 * app/page.jsx — 랜딩 페이지 진입점 (Next.js App Router)
 *
 * 새 페이지를 추가할 때:
 *   app/dashboard/page.jsx  → /dashboard 라우트
 *   app/about/page.jsx      → /about 라우트
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
  CoreCapabilities,
  HowItWorks,
  TechStack,
  Metrics,
  CTACards,
  FooterCTA,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  // 스크롤 애니메이션 초기화
  useScrollAnim();

  // 카드 마우스 틸트 효과
  useEffect(() => {
    const cards = document.querySelectorAll(".al-feat-card, .al-core-card, .al-metric");

    const onMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left  - rect.width  / 2;
      const y = e.clientY - rect.top   - rect.height / 2;
      const tx = -(y / rect.height) * 6;
      const ty =  (x / rect.width)  * 6;
      card.style.transform = `perspective(800px) rotateX(${tx}deg) rotateY(${ty}deg) translateY(-4px)`;
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
      <CoreCapabilities />
      <HowItWorks />
      <TechStack />
      <Metrics />
      <CTACards />
      <FooterCTA />
      <Footer />
    </>
  );
}
