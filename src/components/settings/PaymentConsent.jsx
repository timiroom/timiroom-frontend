"use client";

/**
 * 결제 전 동의. 무엇이 얼마에 언제 결제되는지, 해지·환불 조건을 결제 버튼 바로 위에 보여 주고 동의를 받는다.
 * kind: "subscription" | "credit"
 */
export function PaymentConsent({ kind, priceLabel, checked, onChange, refundDays = 7 }) {
  return (
    <div className="pay-consent">
      <ul className="pay-consent__terms">
        {kind === "subscription" ? (
          <>
            <li>오늘 {priceLabel}(부가세 포함)이 결제되고, 매달 같은 날 등록한 카드로 자동 결제됩니다.</li>
            <li>언제든 해지할 수 있고, 해지해도 결제한 기간이 끝날 때까지 프로를 씁니다.</li>
            <li>결제 후 {refundDays}일 안에 AI 기능을 쓰지 않았으면 전액 환불됩니다. 사용한 뒤에는 환불되지 않습니다.</li>
          </>
        ) : (
          <>
            <li>{priceLabel}(부가세 포함)이 한 번 결제되고 잔액으로 충전됩니다.</li>
            <li>쓰지 않은 잔액은 결제일로부터 1년 안에 환불받을 수 있고, 쓴 금액은 환불되지 않습니다.</li>
          </>
        )}
      </ul>
      <label className="pay-consent__check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>
          위 내용과 <a href="/terms" target="_blank" rel="noopener">이용약관</a>,{" "}
          <a href="/refund-policy" target="_blank" rel="noopener">환불 정책</a>에 동의합니다
        </span>
      </label>
    </div>
  );
}

/** 테스트 결제 환경 안내 */
export function TestModeNotice() {
  return (
    <div className="pay-testmode" role="note">
      지금은 테스트 결제 환경입니다. 카드를 등록하고 결제해도 실제로 돈이 빠져나가지 않습니다.
    </div>
  );
}
