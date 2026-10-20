/**
 * 페이지 전체를 차지하는 안내 화면. 없는 주소(404)나 화면 오류처럼
 * 본문 대신 짧은 설명과 이동 버튼만 보여 줄 때 쓴다. 버튼은 children으로 넘긴다.
 */
export function StatusPage({ code, title, message, children }) {
  return (
    <main className="ui-status-page">
      <div className="ui-status-page__box">
        {code && <p className="ui-status-page__code">{code}</p>}
        <h1 className="ui-status-page__title">{title}</h1>
        {message && <p className="ui-status-page__message">{message}</p>}
        {children && <div className="ui-status-page__actions">{children}</div>}
      </div>
    </main>
  );
}
