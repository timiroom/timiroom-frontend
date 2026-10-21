"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/authConfig";
import { LoadingState } from "@/components/ui";

const SCOPE_ORDER = ["projects:read", "specs:read", "specs:propose", "consistency:run", "consistency:read"];

/**
 * AI 도구(Codex·Claude Code) 연결 요청 승인 카드. 설정 → 연결된 도구 화면 맨 위에 뜬다.
 * API 서버(/oauth2/authorize)가 승인이 필요하면 /settings/connections?client_id=…&state=… 로 보낸다.
 * 그릴 내용은 /api/v1/integrations/consent에서 받고, 고른 결과는 같은 API 서버로 폼 POST해서
 * 승인 처리와 토큰 발급은 지금처럼 API 서버가 한다.
 */
export function AiToolConsentCard({ clientId, state, onDismiss }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [scopes, setScopes] = useState([]);

  useEffect(() => {
    const url = `${API_BASE_URL}/api/v1/integrations/consent?client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}`;
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("이 연결 요청을 찾을 수 없거나 이미 끝났습니다. AI 도구에서 연결을 다시 시작해 주세요.");
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

  if (error) {
    return (
      <section className="consent-card is-error" role="alert">
        <div className="consent-card__head"><strong>연결 요청</strong></div>
        <p className="consent-card__desc">{error}</p>
        <button type="button" className="consent-btn" onClick={onDismiss}>닫기</button>
      </section>
    );
  }
  if (!data) return <section className="consent-card"><LoadingState label="연결 요청을 불러오는 중…" /></section>;

  const allScopes = scopes.length === data.scopes.length;
  return (
    <section className="consent-card" aria-labelledby="consent-title">
      <div className="consent-card__head">
        <span className="consent-card__badge">연결 요청</span>
        <h2 id="consent-title">{data.clientName} 연결</h2>
      </div>
      <p className="consent-card__desc"><strong>{data.clientName}</strong>가 쓸 프로젝트와 기능을 고르세요. 연결한 뒤에도 아래 목록에서 언제든 해제할 수 있습니다.</p>

      <form method="post" action={data.authorizeUrl}>
        <input type="hidden" name="client_id" value={data.clientId} />
        <input type="hidden" name="state" value={data.state} />
        <input type="hidden" name={data.csrf.parameterName} value={data.csrf.token} />

        <div className="consent-grid">
          <fieldset className="consent-group">
            <legend>연결할 프로젝트</legend>
            <div className="consent-list">
              {data.projects.length === 0 && <div className="consent-empty">연결할 수 있는 프로젝트가 없습니다. 프로젝트를 먼저 만드세요.</div>}
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
              허용할 기능
              <button type="button" className="consent-link" onClick={() => setScopes(allScopes ? [] : data.scopes.map((s) => s.value))}>
                {allScopes ? "모두 해제" : "모두 선택"}
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

        <p className="consent-notice">수정안은 원본에 바로 반영되지 않습니다. 티미룸의 교차검증을 거쳐 PM이 승인해야 적용됩니다.</p>
        <div className="consent-actions">
          <span className="consent-hint">
            {projects.length === 0 ? "프로젝트를 하나 이상 고르세요." : scopes.length === 0 ? "기능을 하나 이상 고르세요." : ""}
          </span>
          <button type="submit" name="cancel" value="1" formNoValidate className="consent-btn">거절</button>
          <button type="submit" className="consent-btn consent-btn--primary" disabled={projects.length === 0 || scopes.length === 0}>선택한 범위로 연결</button>
        </div>
      </form>
    </section>
  );
}
