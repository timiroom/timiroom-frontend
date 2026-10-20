"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIRM_EVENT } from "@/lib/feedback";
import { ActionButton } from "./ActionButton";

/**
 * confirmDialog() 요청을 받아 네이티브 <dialog>로 확인 창을 띄운다.
 * <dialog>.showModal()이 포커스 가두기, Esc 닫기, 뒤 화면 비활성화를 브라우저 차원에서 처리한다.
 * 앱 최상단(layout)에 한 번만 둔다.
 */
export function ConfirmHost() {
  const [request, setRequest] = useState(null);
  const dialog = useRef(null);

  useEffect(() => {
    const open = (event) => setRequest(event.detail);
    window.addEventListener(CONFIRM_EVENT, open);
    return () => window.removeEventListener(CONFIRM_EVENT, open);
  }, []);

  useEffect(() => {
    if (request && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [request]);

  function finish(result) {
    request?.resolve(result);
    dialog.current?.close();
    setRequest(null);
  }

  if (!request) return null;
  return (
    <dialog ref={dialog} className="ui-confirm" onCancel={(event) => { event.preventDefault(); finish(false); }}>
      <p className="ui-confirm__message">{request.message}</p>
      <div className="ui-confirm__actions">
        <ActionButton size="lg" onClick={() => finish(false)}>{request.cancelLabel}</ActionButton>
        <ActionButton size="lg" variant={request.danger ? "danger" : "primary"} autoFocus onClick={() => finish(true)}>{request.confirmLabel}</ActionButton>
      </div>
    </dialog>
  );
}
