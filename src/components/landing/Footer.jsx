"use client";

// 실제로 갈 곳이 있는 링크만 둔다. 갈 곳이 없는 "#" 링크는 눌러도 맨 위로만 가서 뺐다.
const COLS = [
  {
    title: "제품",
    links: [
      { label: "핵심 기능", href: "#agents" },
      { label: "작동 방식", href: "#how"    },
      { label: "기술 스택", href: "#tech"   },
    ],
  },
  {
    title: "바로가기",
    links: [
      { label: "시작하기", href: "/dashboard" },
      { label: "GitHub",   href: "https://github.com/timiroom" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="al-footer">
      <div className="al-footer-inner">
        <div className="al-footer-top">
          {/* 브랜드 */}
          <div className="al-footer-brand">
            <div className="al-footer-logo">
              <div className="al-logo-icon">A</div>
              Align-it
            </div>
            <p>
              LLM 기반 기획·개발 정합성 자동화 플랫폼.<br />
              2026 Timiroom 프로젝트.
            </p>
          </div>

          {/* 링크 컬럼 */}
          {COLS.map((col) => (
            <div className="al-footer-col" key={col.title}>
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="al-footer-btm">
          <div>© 2026 Align-it. 2026 Timiroom 프로젝트. All rights reserved.</div>
          <div className="al-footer-btm-r">
            <a href="/privacy"><strong>개인정보처리방침</strong></a>
            <a href="/terms">이용약관</a>
            <a href="/refund-policy">환불 정책</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
