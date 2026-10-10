"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/authConfig";
import { connections, revokeConnection, slackConnection, connectSlack, unlinkSlack, configureSlackChannel, removeSlackChannel } from "@/lib/integrationApi";
const clientNames = { "timiroom-codex": "Codex", "timiroom-claude": "Claude Code" };
const scopeNames = { "projects:read": "프로젝트 조회", "specs:read": "명세 조회", "specs:propose": "문서 수정 제안", "consistency:run": "정합성 검사 요청", "consistency:read": "검사 결과 조회" };

export function AiToolConnectionsPanel({ projects = [] }) {
  const [items, setItems] = useState([]);
  const [slack, setSlack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
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
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("slack");
    if (!result) return;
    if (result === "cancelled") setFeedback("Slack 연결을 취소했습니다.");
    else if (result === "failed") setFeedback("Slack 연결을 완료하지 못했습니다. 다시 시도해 주세요.");
    // Connection badges always come from the server, never from this URL parameter.
    url.searchParams.delete("slack");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  async function startSlackConnection() {
    setBusy(true); setFeedback("");
    try {
      const { url } = await connectSlack();
      const target = new URL(url);
      if (target.origin !== "https://slack.com" || target.pathname !== "/openid/connect/authorize") throw new Error("Slack 연결 주소를 확인하지 못했습니다.");
      window.location.assign(target.href);
    } catch (error) { setFeedback(error.message); setBusy(false); }
  }
  async function run(action, message) {
    setBusy(true); setFeedback("");
    try { await action(); await load(); setFeedback(message); }
    catch (error) { setFeedback(error.message); }
    finally { setBusy(false); }
  }
  function projectName(id) {
    const item = projects.find((entry) => String(entry.projectId ?? entry.id) === String(id));
    return item?.projectName ?? item?.name ?? `프로젝트 ${id}`;
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
          <div className="connection-detail">
            <div className="connection-title"><strong>{clientNames[item.clientId] || item.clientId}</strong>
              <span className={`connection-status ${item.active ? "active" : ""}`}>{item.active ? "연결됨" : "만료·해제됨"}</span>
            </div>
            <p className="connection-meta">{item.projectIds.map(projectName).join(", ")}</p>
            <p className="connection-meta">{item.scopes.map((scope) => scopeNames[scope] || scope).join(", ")}</p>
          </div>
          {item.active && <button disabled={busy} onClick={() => run(() => revokeConnection(item.connectionId), "AI 도구 연결을 해제했습니다.")}>연결 해제</button>}
        </li>)}</ul>
      )}
      {slackEnabled && <div className="integration-slack">
        <h3>Slack 연결</h3>
        <p>Slack 계정을 연결하면 프로젝트 알림을 받고 명세 조회와 검사를 요청할 수 있습니다.</p>
        <div className="integration-row">
          <div className="connection-detail"><div className="connection-title"><strong>Slack 계정</strong><span className={`connection-status ${slack?.connected ? "active" : ""}`}>{loading ? "확인 중" : slack?.connected ? "연결됨" : slack ? "미연결" : "확인 실패"}</span></div>
            {slack?.connected && <p className="connection-meta">{slack.account.user_id}</p>}
          </div>
          {slack?.connected ? <button disabled={busy || loading} onClick={() => run(unlinkSlack, "Slack 연결과 설정한 알림 채널을 해제했습니다.")}>연결 해제</button>
            : <button disabled={busy || loading || !slack} onClick={startSlackConnection}>{busy ? "연결 중…" : "연결"}</button>}
        </div>
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
            <div className="connection-detail"><strong>{projectName(item.project_id)}</strong><p className="connection-meta">{item.channel_id}</p></div>
            <button disabled={busy} onClick={() => run(() => removeSlackChannel(item.project_id), "알림 채널을 해제했습니다.")}>채널 해제</button>
          </li>)}</ul>
          <p><code>/timiroom spec</code>으로 명세를 조회하고 <code>/timiroom help</code>에서 검사 명령을 확인하세요. 승인은 티미룸에서 처리합니다.</p>
        </>}
      </div>}
      <p className="integration-feedback" role="status" aria-live="polite">{feedback}</p>
      <style jsx>{`
        .integration-card { margin:16px 0; min-width:0; background:var(--surface); border:1px solid var(--border); border-radius:var(--db-radius-lg); padding:24px 28px; color:var(--text-1); }
        h2,h3 { font-size:11px; font-weight:700; color:var(--text-3); letter-spacing:.07em; margin:0 0 16px; }
        h4 { font-size:13px; font-weight:600; margin:24px 0 8px; }
        p,li { font-size:13px; line-height:1.7; overflow-wrap:anywhere; }
        p { color:var(--text-2); margin:0 0 16px; }
        strong { font-size:14px; font-weight:600; }
        code { font-size:12px; color:var(--text-1); }
        .integration-label { display:flex; flex-direction:column; gap:8px; font-size:12px; font-weight:600; color:var(--text-2); flex:1; min-width:0; }
        input,select { width:100%; min-width:0; min-height:40px; box-sizing:border-box; padding:9px 12px; border:1px solid var(--border-2); border-radius:var(--db-radius-sm); background:var(--surface); color:var(--text-1); font-family:inherit; font-size:13px; font-weight:400; }
        input[readonly] { background:var(--bg); margin-bottom:12px; }
        button { flex-shrink:0; min-height:40px; padding:9px 14px; border:1px solid var(--border-2); border-radius:var(--db-radius-sm); background:var(--surface); color:var(--text-2); font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; }
        form button { align-self:end; background:var(--text-1); color:var(--bg); border-color:var(--text-1); font-size:13px; }
        button:hover:not(:disabled) { background:var(--bg); color:var(--text-1); }
        form button:hover:not(:disabled) { background:var(--db-purple-800); color:var(--accent-fg); }
        button:disabled { opacity:.55; cursor:not-allowed; }
        button:focus-visible,input:focus-visible,select:focus-visible { outline:2px solid var(--text-1); outline-offset:3px; }
        form,.integration-row,li { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        form { margin:16px 0; }
        ul { padding:0; margin:16px 0 0; list-style:none; }
        li { justify-content:space-between; padding:16px 0; border-bottom:1px solid var(--border); }
        li:last-child { border-bottom:0; padding-bottom:0; }
        .connection-detail { flex:1; min-width:0; overflow-wrap:anywhere; }
        .connection-title { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:4px; }
        .connection-status { display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:var(--db-radius-sm); background:var(--bg); color:var(--text-2); font-size:11px; font-weight:600; }
        .connection-status.active::before { content:""; width:5px; height:5px; border-radius:50%; background:var(--db-green); }
        .connection-meta { margin:0; font-size:12px; }
        .integration-row { justify-content:space-between; padding:16px; background:var(--bg); border-radius:var(--db-radius); }
        .integration-slack { margin-top:24px; border-top:1px solid var(--border); padding-top:24px; }
        .integration-slack ul + p { margin-top:16px; margin-bottom:0; }
        .integration-feedback { margin:16px 0 0; padding:12px 14px; background:var(--bg); border-radius:var(--db-radius-sm); }
        .integration-feedback:empty { display:none; }
        @media(max-width:640px) {
          .integration-card { padding:20px; }
          form { align-items:stretch; flex-direction:column; }
          form button { align-self:stretch; }
          li,.integration-row { align-items:flex-start; }
          input,select { font-size:16px; }
          button { min-height:44px; }
        }
        @media(max-width:380px) { li,.integration-row { flex-direction:column; } }
      `}</style>
    </section>
  );
}
