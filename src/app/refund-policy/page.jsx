import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "환불 정책 — Align-it" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="환불 정책" current="/refund-policy">
      <p>환불은 설정 &gt; 요금제·결제(프로) 또는 설정 &gt; 사용량(추가 사용량)에서 직접 신청할 수 있습니다. 환불은 결제한 카드로 결제를 취소하는 방식으로 하며, 카드사에 따라 반영까지 3~7영업일이 걸릴 수 있습니다.</p>

      <h2>프로 요금제</h2>
      <table className="legal__table">
        <thead><tr><th>경우</th><th>처리</th></tr></thead>
        <tbody>
          <tr><td>결제 후 7일 안이고, 그 기간에 AI 기능을 쓰지 않았을 때</td><td>전액 환불하고 바로 무료 요금제로 바꿉니다.</td></tr>
          <tr><td>결제 후 7일이 지났거나, AI 기능을 썼을 때</td><td>환불하지 않습니다. 해지하면 다음 결제부터 청구되지 않고, 결제한 기간이 끝날 때까지 프로를 씁니다.</td></tr>
          <tr><td>정기결제가 된 날부터 7일 안이고, 새 기간에 AI 기능을 쓰지 않았을 때</td><td>그 달 결제를 전액 환불합니다.</td></tr>
        </tbody>
      </table>
      <p>AI 기능은 사용하는 즉시 비용이 생기는 디지털 서비스이므로, 사용한 뒤에는 전자상거래법 제17조 제2항에 따라 청약철회가 제한됩니다. 이 내용은 결제 전에 안내합니다.</p>

      <h2>추가 사용량</h2>
      <table className="legal__table">
        <thead><tr><th>경우</th><th>처리</th></tr></thead>
        <tbody>
          <tr><td>쓰지 않은 잔액</td><td>결제일로부터 1년 안의 충전분에서, 최근에 충전한 것부터 남은 잔액만큼 결제를 취소합니다.</td></tr>
          <tr><td>이미 쓴 금액</td><td>환불하지 않습니다.</td></tr>
          <tr><td>결제일로부터 1년이 지난 충전분</td><td>카드 결제 취소가 어려워 문의를 받아 따로 처리합니다.</td></tr>
        </tbody>
      </table>

      <h2>운영자 책임으로 이용하지 못한 경우</h2>
      <p>서비스 장애 등 운영자의 책임으로 이용하지 못한 경우에는 위 기준과 관계없이 이용하지 못한 만큼 환불하거나 사용량으로 보상합니다.</p>

      <h2>미성년자</h2>
      <p>미성년자가 법정대리인의 동의 없이 결제한 경우, 본인 또는 법정대리인은 결제를 취소할 수 있습니다.</p>
    </LegalPage>
  );
}
