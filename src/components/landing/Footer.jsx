"use client";

const COLS = [
  {
    title: "제품",
    links: [
      { label: "기능 소개",   href: "#agents"   },
      { label: "작동 방식",   href: "#how"      },
      { label: "기술 스택",   href: "#tech"     },
      { label: "로드맵",      href: "#"         },
    ],
  },
  {
    title: "리소스",
    links: [
      { label: "문서",           href: "#" },
      { label: "API 레퍼런스",   href: "#" },
      { label: "GitHub",         href: "https://github.com" },
      { label: "블로그",         href: "#" },
    ],
  },
  {
    title: "팀",
    links: [
      { label: "프로젝트 소개", href: "#" },
      { label: "팀 소개",       href: "#" },
      { label: "한이음 드림업", href: "https://www.iitp.kr" },
      { label: "문의하기",      href: "#" },
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
              2026 한이음 드림업 프로젝트.
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
          <div>© 2026 Align-it. 2026 한이음 드림업 프로젝트. All rights reserved.</div>
          <div className="al-footer-btm-r">
            <a href="#">개인정보처리방침</a>
            <a href="#">이용약관</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
