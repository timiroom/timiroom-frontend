"use client";

const COLS = [
  { title: "제품",   links: ["기능 소개","작동 방식","기술 스택","로드맵"]       },
  { title: "리소스", links: ["문서","API 레퍼런스","GitHub","블로그"]             },
  { title: "팀",     links: ["프로젝트 소개","팀 소개","한이음 드림업","문의하기"] },
];

export function Footer() {
  return (
    <footer className="al-footer">
      <div className="al-container">
        <div className="al-footer-top">
          {/* Brand */}
          <div className="al-footer-brand">
            <div className="al-footer-logo">
              <div className="al-logo-icon">A</div>
              Align-it
            </div>
            <p>
              LLM 기반 기획-개발 정합성 보장을 위한 오케스트레이션 플랫폼.<br />
              2026 한이음 드림업 프로젝트.
            </p>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div className="al-footer-col" key={col.title}>
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((l) => (
                  <li key={l}><a href="#">{l}</a></li>
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
