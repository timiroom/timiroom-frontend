"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/authConfig";
import { LoadingState } from "@/components/ui";

const SCOPE_ORDER = ["projects:read", "specs:read", "specs:propose", "consistency:run", "consistency:read"];

/**
 * AI 도구(Codex·Claude Code) 연결 요청 승인 창. 설정 → 연결된 도구 화면 위에 모달로 뜬다.
 * 바깥을 눌러도 닫히지 않게 하고(실수로 놓치지 않게), ✕·Esc로 닫으면 결정을 미룬 것으로 본다.
 * API 서버(/oauth2/authorize)가 승인이 필요하면 /settings/connections?client_id=…&state=… 로 보낸다.
 * 그릴 내용은 /api/v1/integrations/consent에서 받고, 고른 결과는 같은 API 서버로 폼 POST해서
 * 승인 처리와 토큰 발급은 지금처럼 API 서버가 한다.
 */
export function AiToolConsentCard({ clientId, state, onDismiss }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [scopes, setScopes] = useState([]);
  const dialogRef = useRef(null);

  // 화면에 붙자마자 모달로 연다(포커스 가두기·Esc·뒤 화면 비활성화는 브라우저가 한다)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    const url = `${API_BASE_URL}/api/v1/integrations/consent?client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}`;
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("연결 요청을 찾을 수 없거나 이미 처리되었습니다. AI 도구에서 연결을 다시 시작해 주세요.");
        return res.json();
      })
      .then((body) => {
        body.scopes = [...(body.scopes || [])].sort((a, b) => SCOPE_ORDER.indexOf(a.value) - SCOPE_ORDER.indexOf(b.value));
        setData(body);
        setProjects(body.projects?.length === 1 ? [String(body.projects[0].projectId)] : []);
        setScopes(body.scopes.filter((s) => s.defaultChecked).map((s) => s.value));
      })
      .catch((e) => setError(e.message));
  }, [clientId, state]);

  const toggle = (setter, value) => (event) =>
    setter((current) => (event.target.checked ? [...current, value] : current.filter((v) => v !== value)));

  const shell = (title, body) => (
    <dialog ref={dialogRef} className="consent-dialog" aria-labelledby="consent-title"
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
      <div className="consent-card__head">
        <span className="consent-card__badge">연결 요청</span>
        <h2 id="consent-title">{title}</h2>
        <button type="button" className="consent-close" onClick={onDismiss} aria-label="닫기">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {body}
    </dialog>
  );

  if (error) {
    return shell("AI 도구 연결", <>
      <p className="consent-card__desc" role="alert">{error}</p>
      <div className="consent-actions"><button type="button" className="consent-btn" onClick={onDismiss}>닫기</button></div>
    </>);
  }
  if (!data) return shell("AI 도구 연결", <LoadingState label="연결 요청을 불러오는 중…" />);

  const allScopes = scopes.length === data.scopes.length;
  return shell(`${data.clientName} 연결 승인`, <>
      <p className="consent-card__desc"><strong>{data.clientName}</strong>에서 사용할 프로젝트와 권한을 선택하세요. 연결한 뒤에도 설정 → 연결된 도구에서 언제든 바꾸거나 해제할 수 있습니다.</p>

      <form method="post" action={data.authorizeUrl}>
        <input type="hidden" name="client_id" value={data.clientId} />
        <input type="hidden" name="state" value={data.state} />
        <input type="hidden" name={data.csrf.parameterName} value={data.csrf.token} />

        <div className="consent-grid">
          <fieldset className="consent-group">
            <legend>프로젝트</legend>
            <div className="consent-list">
              {data.projects.length === 0 && <div className="consent-empty">연결할 수 있는 프로젝트가 없습니다. 먼저 프로젝트를 만들어 주세요.</div>}
              {data.projects.map((p) => (
                <label key={p.projectId} className="consent-check">
                  <input type="checkbox" name="project_id" value={p.projectId} checked={projects.includes(String(p.projectId))} onChange={toggle(setProjects, String(p.projectId))} />
                  <span><b>{p.name}</b></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="consent-group">
            <legend>
              권한
              <button type="button" className="consent-link" onClick={() => setScopes(allScopes ? [] : data.scopes.map((s) => s.value))}>
                {allScopes ? "전체 해제" : "전체 선택"}
              </button>
            </legend>
            <div className="consent-list">
              {data.scopes.map((s) => (
                <label key={s.value} className="consent-check">
                  <input type="checkbox" name="scope" value={s.value} checked={scopes.includes(s.value)} onChange={toggle(setScopes, s.value)} />
                  <span><b>{s.label}</b><small>{s.description}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <p className="consent-notice">AI 도구가 작성한 수정안은 바로 반영되지 않으며, 교차검증과 PM 승인을 거쳐 적용됩니다.</p>
        <div className="consent-actions">
          <span className="consent-hint">
            {projects.length === 0 ? "프로젝트를 하나 이상 선택하세요." : scopes.length === 0 ? "권한을 하나 이상 선택하세요." : ""}
          </span>
          <button type="submit" name="cancel" value="1" formNoValidate className="consent-btn">거절</button>
          <button type="submit" className="consent-btn consent-btn--primary" disabled={projects.length === 0 || scopes.length === 0}>연결 허용</button>
        </div>
      </form>
  </>);
}
