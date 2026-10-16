/**
 * 불러오는 중 표시. 어긋난 막대 세 개가 왼쪽 끝으로 맞춰졌다 흩어지기를 되풀이한다(Align-it의 "정렬").
 * 색은 모노크롬 토큰만 쓰고, 동작 줄이기 설정에서는 맞춰진 채로 멈춘다.
 *   <AlignMark size="sm" />  — 문구 옆 (sm · md · lg)
 */
export function AlignMark({ size = "md" }) {
  return (
    <span className={`ui-align ui-align--${size}`} aria-hidden="true">
      <span className="ui-align__bar" />
      <span className="ui-align__bar" />
      <span className="ui-align__bar" />
    </span>
  );
}

/**
 * 페이지 전체를 차지하는 불러오는 중 화면(로그인 처리, 로그인 상태 확인).
 * 금방 끝나는 경우 깜빡이지 않도록 조금 늦게 나타난다.
 */
export function LoadingScreen({ title, message }) {
  return (
    <main className="ui-status-page" role="status" aria-live="polite">
      <div className="ui-status-page__box ui-loading-screen">
        <AlignMark size="lg" />
        {title && <h1 className="ui-status-page__title">{title}</h1>}
        {message && <p className="ui-status-page__message">{message}</p>}
      </div>
    </main>
  );
}
