"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { rememberAuthReturnTo } from "@/lib/authConfig";
import { PAYMENT_STATUS, fetchReceipt } from "@/lib/billingApi";
import { formatKrw } from "@/lib/usageApi";
import { ActionButton, Badge, LoadingState } from "@/components/ui";

function dateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function day(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR");
}

/**
 * 결제 확인서(인쇄용). 법적 영수증은 카드사·PG가 발급하는 매출전표이므로, 있으면 그 주소를 함께 연다.
 * 설정 > 요금제·결제 > 결제 내역의 "영수증"에서 새 창으로 연다.
 */
export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) { rememberAuthReturnTo(window.location.pathname); router.replace("/"); return; }
    fetchReceipt(id).then(setReceipt).catch((e) => setError(e.message));
  }, [id, user, isLoading, router]);

  if (error) return <main className="receipt-page"><p role="alert" className="gh-error">{error}</p></main>;
  if (!receipt) return <main className="receipt-page"><LoadingState /></main>;

  const status = PAYMENT_STATUS[receipt.status] ?? { label: receipt.status, tone: "neutral" };

  return (
    <main className="receipt-page">
      <div className="receipt-toolbar">
        <ActionButton variant="ghost" size="sm" href="/settings/billing">요금제·결제로 돌아가기</ActionButton>
        <div className="receipt-toolbar__right">
          {receipt.receiptUrl && <ActionButton size="sm" href={receipt.receiptUrl} target="_blank" rel="noopener noreferrer">카드 매출전표 보기</ActionButton>}
          <ActionButton size="sm" variant="primary" onClick={() => window.print()}>인쇄·PDF 저장</ActionButton>
        </div>
      </div>

      <article className="receipt" aria-labelledby="receipt-title">
        <header className="receipt__head">
          <div>
            <p className="receipt__brand">Align-it · 티미룸</p>
            <h1 id="receipt-title">결제 확인서</h1>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </header>

        <div className="receipt__amount">{formatKrw(receipt.amountKrw)}</div>

        <dl className="receipt__rows">
          <div><dt>결제 내용</dt><dd>{receipt.orderName}</dd></div>
          {receipt.kind !== "CREDIT" && (
            // 기간 끝은 다음 결제 시각이라, 마지막 이용일은 그 전날이다(결제 내용 문구와 같게).
            <div><dt>이용 기간</dt><dd>{day(receipt.periodStart)} ~ {day(receipt.periodEnd ? new Date(new Date(receipt.periodEnd).getTime() - 86400000).toISOString() : null)}</dd></div>
          )}
          <div><dt>결제 일시</dt><dd>{dateTime(receipt.paidAt)}</dd></div>
          <div><dt>결제 수단</dt><dd>{receipt.cardSummary || "카드"}</dd></div>
          <div><dt>구매자</dt><dd>{[receipt.buyerName, receipt.buyerEmail].filter(Boolean).join(" · ") || "—"}</dd></div>
          <div><dt>결제 번호</dt><dd><code>{receipt.paymentId}</code></dd></div>
        </dl>

        <dl className="receipt__rows receipt__rows--sum">
          <div><dt>공급가액</dt><dd>{formatKrw(receipt.supplyKrw)}</dd></div>
          <div><dt>부가세</dt><dd>{formatKrw(receipt.vatKrw)}</dd></div>
          <div className="is-total"><dt>합계</dt><dd>{formatKrw(receipt.amountKrw)}</dd></div>
        </dl>

        <p className="receipt__note">
          이 문서는 결제 사실을 확인하는 용도입니다. 카드 매출전표가 필요하면 위의 &lsquo;카드 매출전표 보기&rsquo;를 이용해 주세요.
        </p>
      </article>
    </main>
  );
}
