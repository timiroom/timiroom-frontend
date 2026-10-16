/**
 * 화면 어디서나 부를 수 있는 알림·확인 창.
 * 브라우저 기본 alert()/confirm() 대신 쓴다. 훅이 아니라서 컴포넌트 밖 함수에서도 호출할 수 있다.
 * 실제 표시는 ToastProvider와 ConfirmHost가 아래 이벤트를 받아서 한다.
 */
export const TOAST_EVENT = "timiroom:toast";
export const CONFIRM_EVENT = "timiroom:confirm";

function send(name, detail) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

export const toast = {
  success: (message) => send(TOAST_EVENT, { type: "success", message }),
  error: (message) => send(TOAST_EVENT, { type: "error", message }),
  info: (message) => send(TOAST_EVENT, { type: "info", message }),
};

/** 확인을 누르면 true, 취소하거나 닫으면 false로 끝나는 Promise를 돌려준다. */
export function confirmDialog(message, { confirmLabel = "확인", cancelLabel = "취소", danger = false } = {}) {
  return new Promise((resolve) => send(CONFIRM_EVENT, { message, confirmLabel, cancelLabel, danger, resolve }));
}
