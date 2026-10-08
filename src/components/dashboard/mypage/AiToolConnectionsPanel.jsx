"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/authConfig";
import { connections, revokeConnection, slackConnection, linkSlack, unlinkSlack, configureSlackChannel, removeSlackChannel } from "@/lib/integrationApi";
const clientNames = { "timiroom-codex": "Codex", "timiroom-claude": "Claude Code" };
const scopeNames = { "projects:read": "프로젝트 조회", "specs:read": "명세 조회", "specs:propose": "문서 수정 제안", "consistency:run": "정합성 검사 요청", "consistency:read": "검사 결과 조회" };

export function AiToolConnectionsPanel({ projects = [] }) {
  const [items, setItems] = useState([]);
  const [slack, setSlack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [code, setCode] = useState("");
  const [project, setProject] = useState("");
  const [channel, setChannel] = useState("");
  const slackEnabled = process.env.NEXT_PUBLIC_SLACK_ENABLED === "true";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [grants, account] = await Promise.all([connections(), slackEnabled ? slackConnection() : Promise.resolve(null)]);
      setItems(grants); setSlack(account);
    } catch (error) { setFeedback(error.message); }
    finally { setLoading(false); }
  }, [slackEnabled]);
  useEffect(() => { load(); }, [load]);
  async function run(action, message) {
    setBusy(true); setFeedback("");
    try { await action(); await load(); setFeedback(message); }
    catch (error) { setFeedback(error.message); }
    finally { setBusy(false); }
  }
  return (
    <section className="integration-card" aria-labelledby="integration-heading">
      <h2 id="integration-heading">AI 도구 연결</h2>
      <p>Codex·Claude Code에서 명세를 조회하고 티미룸 검사를 요청할 수 있습니다. 연결할 때 프로젝트와 권한을 직접 선택합니다.</p>
      <label className="integration-label">MCP 연결 주소
        <input readOnly aria-label="MCP 연결 주소" value={`${API_BASE_URL}/mcp`} onFocus={(event) => event.target.select()} />
      </label>
      <p>연결된 도구가 만든 문서 변경안은 PM의 검토와 승인 후 적용됩니다.</p>
      {loading ? <p role="status">연결을 확인하고 있습니다.</p> : items.length === 0 ? <p>연결된 AI 도구가 없습니다.</p> : (
        <ul>{items.map((item) => <li key={item.connectionId}>
          <div><strong>{clientNames[item.clientId] || item.clientId}</strong> · {item.active ? "연결됨" : "만료·해제됨"}<br />
            <span>{item.projectIds.map((id) => { const project = projects.find((p) => String(p.projectId ?? p.id) === String(id)); return project?.projectName ?? project?.name ?? `프로젝트 ${id}`; }).join(", ")}
              {" · "}{item.scopes.map((scope) => scopeNames[scope] || scope).join(", ")}</span></div>
          {item.active && <button disabled={busy} onClick={() => run(() => revokeConnection(item.connectionId), "AI 도구 연결을 해제했습니다.")}>연결 해제</button>}
        </li>)}</ul>
      )}
      {slackEnabled && <div className="integration-slack">
        <h3>Slack 연결</h3>
        <p>Slack에서 <code>/timiroom connect</code>를 실행하고 본인에게 표시된 연결 코드를 입력하세요. 코드는 5분간 유효합니다.</p>
        {slack?.connected ? <div className="integration-row">
          <span>Slack 계정 연결됨 · {slack.account.user_id}</span>
          <button disabled={busy} onClick={() => run(unlinkSlack, "Slack 연결과 설정한 알림 채널을 해제했습니다.")}>연결 해제</button>
        </div> : <form onSubmit={(event) => { event.preventDefault(); run(async () => { await linkSlack(code.trim()); setCode(""); }, "Slack 계정을 연결했습니다."); }}>
          <label className="integration-label">연결 코드<input value={code} onChange={(event) => setCode(event.target.value)} maxLength={24} required autoComplete="off" /></label>
          <button disabled={busy || !code.trim()}>계정 연결</button>
        </form>}
        {slack?.connected && <>
          <h4>프로젝트 알림 채널</h4>
          <p>PM이 프로젝트별 채널을 지정합니다. 알림에는 검사 상태와 티미룸 링크가 표시됩니다.</p>
          <form onSubmit={(event) => { event.preventDefault(); run(() => configureSlackChannel(Number(project), channel.trim()), "알림 채널을 설정했습니다."); }}>
            <label className="integration-label">프로젝트<select value={project} onChange={(event) => setProject(event.target.value)} required>
              <option value="">프로젝트 선택</option>{projects.map((item) => <option key={item.projectId ?? item.id} value={item.projectId ?? item.id}>{item.projectName ?? item.name}</option>)}
            </select></label>
            <label className="integration-label">채널 ID<input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="C0123456789" pattern="[CG][A-Z0-9]+" maxLength={64} required /></label>
            <button disabled={busy}>채널 연결</button>
          </form>
          <ul>{(slack.channels || []).map((item) => <li key={item.project_id}>
            <span>프로젝트 {item.project_id} · {item.channel_id}</span>
            <button disabled={busy} onClick={() => run(() => removeSlackChannel(item.project_id), "알림 채널을 해제했습니다.")}>채널 해제</button>
          </li>)}</ul>
          <p><code>/timiroom spec</code>으로 명세를 조회하고 <code>/timiroom help</code>에서 검사 명령을 확인하세요. 승인은 티미룸에서 처리합니다.</p>
        </>}
      </div>}
      <p role="status" aria-live="polite">{feedback}</p>
      <style jsx>{`
        .integration-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--db-radius-lg); padding:24px 28px; color:var(--text-1); }
        h2 { font-size:18px; margin:0 0 12px; } h3 { font-size:16px; } h4 { font-size:14px; }
        p,li { font-size:13px; line-height:1.7; } p,li span { color:var(--text-2); }
        .integration-label { display:flex; flex-direction:column; gap:6px; font-size:12px; font-weight:600; flex:1; min-width:0; }
        input,select { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text-1); font:inherit; }
        button { padding:9px 14px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text-1); font:inherit; cursor:pointer; align-self:end; }
        button:disabled { opacity:.55; cursor:wait; } button:focus-visible,input:focus-visible,select:focus-visible { outline:2px solid #7d4cfc; outline-offset:3px; }
        form,.integration-row,li { display:flex; align-items:center; gap:12px; flex-wrap:wrap; } form { margin:16px 0; }
        ul { padding:0; list-style:none; } li { justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border); }
        .integration-slack { margin-top:24px; border-top:1px solid var(--border); padding-top:12px; }
        @media(max-width:640px) { .integration-card { padding:20px; } form { align-items:stretch; flex-direction:column; } button { align-self:start; } }
      `}</style>
    </section>
  );
}
