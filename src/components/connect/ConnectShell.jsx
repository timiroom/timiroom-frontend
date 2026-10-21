"use client";

import Link from "next/link";
import { Icon } from "@/components/ui";

/**
 * AI 도구(Codex·Claude Code) 연결 중에 보이는 로그인·권한 승인 화면의 틀.
 * 예전에는 API 서버가 따로 그린 화면이라 티미룸과 모양이 달랐고 돌아갈 길이 없었다.
 * 위쪽에 로고와 "티미룸으로 돌아가기"를 늘 두고, 가운데 카드 하나에 내용을 담는다.
 */
export function ConnectShell({ title, description, backHref = "/settings/connections", children }) {
  return (
    <div className="connect-root">
      <header className="connect-top">
        <Link href="/" className="connect-brand" aria-label="Align-it 첫 화면">
          <span className="connect-brand__mark" aria-hidden="true">A</span>
          Align-it
        </Link>
        <Link href={backHref} className="connect-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          티미룸으로 돌아가기
        </Link>
      </header>
      <main className="connect-card">
        <div className="connect-card__icon" aria-hidden="true"><Icon name="link" size={18} /></div>
        <h1 className="connect-card__title">{title}</h1>
        {description && <p className="connect-card__desc">{description}</p>}
        {children}
      </main>
    </div>
  );
}
