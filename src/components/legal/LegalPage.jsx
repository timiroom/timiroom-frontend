import Link from "next/link";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/siteInfo";
import { BusinessInfo } from "./BusinessInfo";

const DOCS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund-policy", label: "환불 정책" },
];

/** 약관·방침 공통 틀. 로그인 없이 볼 수 있다. */
export function LegalPage({ title, current, children }) {
  return (
    <div className="legal">
      <header className="legal__top">
        <Link href="/" className="legal__brand">Align-it</Link>
        <nav className="legal__nav" aria-label="약관과 정책">
          {DOCS.map((doc) => (
            <Link key={doc.href} href={doc.href} aria-current={doc.href === current ? "page" : undefined}
              className={`legal__navlink${doc.href === current ? " is-active" : ""}`}>{doc.label}</Link>
          ))}
        </nav>
      </header>
      <main className="legal__body">
        <h1 className="legal__title">{title}</h1>
        <p className="legal__date">시행일 {LEGAL_EFFECTIVE_DATE}</p>
        <article className="legal__content">{children}</article>
      </main>
      <footer className="legal__foot">
        <BusinessInfo />
      </footer>
    </div>
  );
}
