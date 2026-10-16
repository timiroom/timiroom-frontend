import Link from "next/link";
import { SITE, hasBusinessInfo } from "@/lib/siteInfo";

/** 사업자 정보(전자상거래법 표시 사항). 등록 전에는 항목은 두고 "등록 후 표시"로 둔다. */
export function BusinessInfo({ compact = false }) {
  const rows = [
    ["상호", SITE.operatorName],
    ["대표자", SITE.representative],
    ["사업자등록번호", SITE.registrationNumber],
    ["통신판매업 신고번호", SITE.mailOrderNumber],
    ["주소", SITE.address],
    ["전화", SITE.phone],
    ["이메일", SITE.contactEmail],
  ];
  return (
    <div className={`biz-info${compact ? " biz-info--compact" : ""}`}>
      {hasBusinessInfo ? (
        <dl className="biz-info__rows">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      ) : (
        <p className="biz-info__pending">
          {SITE.serviceName} · 사업자 정보는 등록 후 표시합니다{SITE.contactEmail ? ` · 문의 ${SITE.contactEmail}` : ""}
        </p>
      )}
      <p className="biz-info__links">
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy"><strong>개인정보처리방침</strong></Link>
        <Link href="/refund-policy">환불 정책</Link>
      </p>
    </div>
  );
}
