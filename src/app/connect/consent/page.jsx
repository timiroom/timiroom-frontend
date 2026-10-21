"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/authConfig";
import { LoadingState } from "@/components/ui";
import { ConnectShell } from "@/components/connect/ConnectShell";

/**
 * AI 도구 연결 권한 승인 화면.
 * API 서버(/oauth2/authorize)가 승인이 필요하면 이 화면으로 보낸다(client_id, state).
 * 그릴 내용은 /api/v1/integrations/consent에서 받고, 고른 결과는 같은 API 서버로 폼 POST해서
 * 승인 처리·토큰 발급은 지금처럼 API 서버가 한다.
 */
function ConsentForm() {
  const params = useSearchParams();
  const clientId = params.get("client_id") || "";
  const state = params.get("state") || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [scopes, setScopes] = useState([]);

  useEffect(() => {
    if (!clientId || !state) { setError("연결 요청 정보가 없습니다. AI 도구에서 연결을 다시 시작해 주세요."); return; }
    const url = `${API_BASE_URL}/api/v1/integrations/consent?client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}`;
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("티미룸 로그인이 풀렸습니다. AI 도구에서 연결을 다시 시작해 주세요.");
        if (!res.ok) throw new Error("이 연결 요청을 찾을 수 없거나 이미 끝났습니다. AI 도구에서 연결을 다시 시작해 주세요.");
        return res.json();
      })
      .then((body) => {
        // 읽기 → 쓰기 순서로 보여 준다(서버는 이름순으로 준다)
        const order = ["projects:read", "specs:read", "specs:propose", "consistency:run", "consistency:read"];
        body.scopes = [...(body.scopes || [])].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
        setData(body);
        setProjects(body.projects?.length === 1 ? [String(body.projects[0].projectId)] : []);
        setScopes((body.scopes || []).filter((s) => s.defaultChecked).map((s) => s.value));
      })
      .catch((e) => setError(e.message));
  }, [clientId, state]);

  const toggle = (setter) => (value) => (event) =>
    setter((current) => (event.target.checked ? [...current, value] : current.filter((v) => v !== value)));
  const toggleProject = toggle(setProjects);
  const toggleScope = toggle(setScopes);

  if (error) {
    return (
      <ConnectShell title="AI 도구 연결" description={error}>
        <a className="connect-btn connect-btn--primary" href="/settings/connections">연결된 도구 화면으로</a>
      </ConnectShell>
    );
  }
  if (!data) {
    return <ConnectShell title="AI 도구 연결"><LoadingState label="연결 요청을 불러오는 중…" /></ConnectShell>;
  }

  return (
    <ConnectShell
      title={`${data.clientName} 연결`}
      description={<><strong>{data.clientName}</strong>가 쓸 프로젝트와 기능을 고르세요. 연결은 설정 → 연결된 도구에서 언제든 해제할 수 있습니다.</>}
    >
      <form method="post" action={data.authorizeUrl}>
        <input type="hidden" name="client_id" value={data.clientId} />
        <input type="hidden" name="state" value={data.state} />
        <input type="hidden" name={data.csrf.parameterName} value={data.csrf.token} />

        <section className="connect-section">
          <div className="connect-section__title">연결할 프로젝트</div>
          <div className="connect-list">
            {data.projects.length === 0 && <div className="connect-empty">연결할 수 있는 프로젝트가 없습니다. 티미룸에서 프로젝트를 먼저 만드세요.</div>}
            {data.projects.map((p) => (
              <label key={p.projectId} className="connect-check">
                <input type="checkbox" name="project_id" value={p.projectId} checked={projects.includes(String(p.projectId))} onChange={toggleProject(String(p.projectId))} />
                <span><b>{p.name}</b></span>
              </label>
            ))}
          </div>
        </section>

        <section className="connect-section">
          <div className="connect-section__title">
            허용할 기능
            <button type="button" className="connect-link" onClick={() => setScopes(scopes.length === data.scopes.length ? [] : data.scopes.map((s) => s.value))}>
              {scopes.length === data.scopes.length ? "모두 해제" : "모두 선택"}
            </button>
          </div>
          <div className="connect-list">
            {data.scopes.map((s) => (
              <label key={s.value} className="connect-check">
                <input type="checkbox" name="scope" value={s.value} checked={scopes.includes(s.value)} onChange={toggleScope(s.value)} />
                <span><b>{s.label}</b><small>{s.description}</small></span>
              </label>
            ))}
          </div>
        </section>

        <p className="connect-notice">수정안은 원본에 바로 반영되지 않습니다. 티미룸의 교차검증을 거쳐 PM이 승인해야 적용됩니다.</p>

        <div className="connect-actions">
          <button type="submit" name="cancel" value="1" formNoValidate className="connect-btn">취소</button>
          <button type="submit" className="connect-btn connect-btn--primary" disabled={projects.length === 0 || scopes.length === 0}>
            선택한 범위로 연결
          </button>
        </div>
        {(projects.length === 0 || scopes.length === 0) && (
          <p className="connect-hint">{projects.length === 0 ? "프로젝트를 하나 이상 고르세요." : "기능을 하나 이상 고르세요."}</p>
        )}
      </form>
    </ConnectShell>
  );
}

export default function ConnectConsentPage() {
  return <Suspense fallback={null}><ConsentForm /></Suspense>;
}
