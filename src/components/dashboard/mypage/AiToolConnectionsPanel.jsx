"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/authConfig";
import { aiClients, aiConnectionLink, connectionRows } from "@/lib/aiConnectionLinks.mjs";
import { connections, revokeConnection, updateConnection, slackConnection, connectSlack, unlinkSlack, configureSlackChannel, removeSlackChannel } from "@/lib/integrationApi";
// 채널마다 골라 받을 수 있는 알림 종류
const SLACK_EVENTS = [
  { id: "CHANGE", label: "변경안 승인 요청" },
  { id: "REVIEW", label: "교차검증 결과" },
  { id: "PR", label: "PR 검사 결과" },
];
const scopeNames = { "projects:read": "프로젝트 정보 조회", "specs:read": "명세 조회", "specs:propose": "수정안 작성", "consistency:run": "검사 요청", "consistency:read": "검사 결과 조회" };

export function AiToolConnectionsPanel({ projects = [] }) {
  const [items, setItems] = useState([]);
  const [slack, setSlack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingClient, setPendingClient] = useState(null);
  const [editing, setEditing] = useState(null);   // 연결 범위 수정 중인 도구 { clientId, projectIds, scopes }
  const [project, setProject] = useState("");
  const [channel, setChannel] = useState("");
  const loadGeneration = useRef(0);
  const slackEnabled = process.env.NEXT_PUBLIC_SLACK_ENABLED === "true";
  const load = useCallback(async ({ quiet = false } = {}) => {
    const generation = ++loadGeneration.current;
    if (!quiet) setLoading(true);
    // AI 도구 연결과 Slack 연결은 서로 다른 서비스라, 한쪽이 실패해도 다른 쪽 상태는 보여 준다.
    const [grants, account] = await Promise.allSettled([connections(), slackEnabled ? slackConnection() : Promise.resolve(null)]);
    if (generation !== loadGeneration.current) return;
    if (grants.status === "fulfilled") { setItems(grants.value); setLoaded(true); }
    else if (!quiet) setFeedback(grants.reason?.message ?? "AI 도구 연결 상태를 확인하지 못했습니다.");
    setSlack(account.status === "fulfilled" ? account.value : null);
    setLoading(false);
  }, [slackEnabled]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") load({ quiet: true }); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => {
    if (!pendingClient) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load({ quiet: true }); }, 3000);
    const timeout = window.setTimeout(() => {
      setPendingClient(null); setFeedback("아직 연결이 확인되지 않았습니다. 앱에서 연결 요청을 실행했는지 확인한 뒤 다시 시도해 주세요.");
    }, 180000);
    return () => { window.clearInterval(timer); window.clearTimeout(timeout); };
  }, [pendingClient, load]);
  useEffect(() => {
    if (pendingClient && items.some(item => item.clientId === pendingClient && item.active)) {
      setFeedback(`${aiClients[pendingClient]} 연결을 확인했습니다.`); setPendingClient(null);
    }
  }, [items, pendingClient]);
  function startAiConnection(clientId) {
    try {
      const link = aiConnectionLink(clientId, API_BASE_URL);
      setPendingClient(clientId);
      setFeedback(`${aiClients[clientId]} 앱에서 준비된 연결 요청을 보내 주세요. 인증이 끝나면 연결 상태가 자동으로 갱신됩니다. 앱이 설치되어 있어야 합니다.`);
      window.location.assign(link);
    } catch (error) { setPendingClient(null); setFeedback(error.message); }
  }
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
    ++loadGeneration.current;
    setBusy(true); setFeedback("");
    try { await action(); await load(); setFeedback(message); }
    catch (error) { await load(); setFeedback(error.message); }
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
      {loading ? <p role="status">연결을 확인하고 있습니다.</p> : (
        <ul>{connectionRows(items).map(({ clientId, grants }) => <li key={clientId}>
          <div className="connection-detail">
            <div className="connection-title"><strong>{aiClients[clientId] || clientId}</strong>
              <span className={`connection-status ${grants.length ? "active" : ""}`}>{grants.length ? "연결됨" : !loaded ? "확인 실패" : pendingClient === clientId ? "연결 확인 중" : "미연결"}</span>
            </div>
            {grants.length > 0 && <><p className="connection-meta">{[...new Set(grants.flatMap(item => item.projectIds))].map(projectName).join(", ")}</p>
              <p className="connection-meta">{[...new Set(grants.flatMap(item => item.scopes))].map(scope => scopeNames[scope] || scope).join(", ")}</p></>}
          </div>
          {grants.length > 0 ? <div className="connection-actions">
            <button disabled={busy} onClick={() => setEditing(editing?.clientId === clientId ? null : {
              clientId,
              projectIds: [...new Set(grants.flatMap(item => item.projectIds))].map(String),
              scopes: [...new Set(grants.flatMap(item => item.scopes))],
            })}>{editing?.clientId === clientId ? "닫기" : "권한 변경"}</button>
            <button disabled={busy} onClick={() => run(async () => {
              for (const grant of grants) await revokeConnection(grant.connectionId);
            }, "AI 도구 연결을 해제했습니다.")}>연결 해제</button>
          </div>
            : <button disabled={busy || !loaded} onClick={() => startAiConnection(clientId)}>연결</button>}
          {editing?.clientId === clientId && grants.length > 0 && (
            <div className="connection-edit">
              <fieldset><legend>프로젝트</legend>
                {projects.map((p) => { const id = String(p.projectId ?? p.id); return (
                  <label key={id}><input type="checkbox" checked={editing.projectIds.includes(id)}
                    onChange={(e) => setEditing({ ...editing, projectIds: e.target.checked ? [...editing.projectIds, id] : editing.projectIds.filter((v) => v !== id) })} />{p.projectName ?? p.name}</label>
                ); })}
              </fieldset>
              <fieldset><legend>권한</legend>
                {Object.entries(scopeNames).map(([scope, label]) => (
                  <label key={scope}><input type="checkbox" checked={editing.scopes.includes(scope)}
                    onChange={(e) => setEditing({ ...editing, scopes: e.target.checked ? [...editing.scopes, scope] : editing.scopes.filter((v) => v !== scope) })} />{label}</label>
                ))}
              </fieldset>
              <p className="connection-meta">저장하면 다시 연결하지 않아도 바로 적용됩니다.</p>
              <div className="connection-actions">
                <button disabled={busy} onClick={() => setEditing(null)}>취소</button>
                <button className="primary" disabled={busy || !editing.projectIds.length || !editing.scopes.length} onClick={() => run(async () => {
                  for (const grant of grants) await updateConnection(grant.connectionId, editing.projectIds.map(Number), editing.scopes);
                  setEditing(null);
                }, "연결 권한을 변경했습니다.")}>저장</button>
              </div>
            </div>
          )}
        </li>)}</ul>
      )}
      {slackEnabled && <div className="integration-slack">
        <h3>Slack 연결</h3>
        <p>Slack 계정을 연결하면 프로젝트 알림을 받고, Slack에서 바로 검토 대기 확인과 검사를 요청할 수 있습니다. 같은 Slack 워크스페이스의 팀원이라면 누구나 각자 연결할 수 있습니다.</p>
        <div className="integration-row">
          <div className="connection-detail"><div className="connection-title"><strong>Slack 계정</strong><span className={`connection-status ${slack?.connected ? "active" : ""}`}>{loading ? "확인 중" : slack?.connected ? "연결됨" : slack ? "미연결" : "확인 실패"}</span></div>
            {slack?.connected && <p className="connection-meta">{slack.account.linked_at ? `${new Date(slack.account.linked_at).toLocaleDateString("ko-KR")}에 연결` : "연결되어 있습니다"} · Slack에서 /timiroom 명령을 쓸 수 있습니다</p>}
          </div>
          {slack?.connected ? <button disabled={busy || loading} onClick={() => run(unlinkSlack, "Slack 연결과 설정한 알림 채널을 해제했습니다.")}>연결 해제</button>
            : <button disabled={busy || loading || !slack} onClick={startSlackConnection}>{busy ? "연결 중…" : "연결"}</button>}
        </div>
        {slack?.connected && <>
          <h4>프로젝트 알림 채널</h4>
          <p>한 프로젝트에 채널을 여러 개 연결하고, 채널마다 받을 알림을 고를 수 있습니다. 예를 들어 기획 채널은 변경안·교차검증, 개발 채널은 PR 검사 결과만 받게 할 수 있습니다.</p>
          <p>알림을 받을 Slack 채널에서 <code>/timiroom 채널연결 프로젝트이름</code>을 입력하면 바로 연결됩니다(PM만). 그다음 그 채널에 티미룸 앱을 초대하세요.</p>
          {(slack.channels || []).length === 0 ? <p className="connection-meta">아직 연결한 채널이 없습니다.</p> : (
            <ul className="slack-channels">{(slack.channels || []).map((item) => {
              const events = String(item.events || "CHANGE,REVIEW,PR").split(",");
              const toggle = (id) => {
                const next = events.includes(id) ? events.filter((e) => e !== id) : [...events, id];
                if (!next.length) { setFeedback("알림을 모두 끄려면 채널을 해제하세요."); return; }
                run(() => configureSlackChannel(item.project_id, item.channel_id, next), "받을 알림을 바꿨습니다.");
              };
              return <li key={`${item.project_id}-${item.channel_id}`}>
                <div className="connection-detail">
                  <strong>{projectName(item.project_id)}</strong>
                  <p className="connection-meta"><a href={`https://app.slack.com/client/${slack.account.team_id}/${item.channel_id}`} target="_blank" rel="noreferrer">Slack에서 채널 열기 ({item.channel_id})</a></p>
                  <div className="slack-events" role="group" aria-label="받을 알림">
                    {SLACK_EVENTS.map((event) => (
                      <button key={event.id} type="button" aria-pressed={events.includes(event.id)} disabled={busy}
                        className={`slack-event${events.includes(event.id) ? " is-on" : ""}`} onClick={() => toggle(event.id)}>
                        {events.includes(event.id) ? "✓ " : ""}{event.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button disabled={busy} onClick={() => run(() => removeSlackChannel(item.project_id, item.channel_id), "알림 채널을 해제했습니다.")}>채널 해제</button>
              </li>;
            })}</ul>
          )}
          <details className="integration-manual"><summary>채널 ID로 직접 연결하기</summary>
          <p>채널 이름을 눌러 열리는 채널 정보 맨 아래에서 채널 ID(C로 시작)를 복사할 수 있습니다.</p>
          <form onSubmit={(event) => { event.preventDefault(); run(() => configureSlackChannel(Number(project), channel.trim()), "알림 채널을 설정했습니다."); }}>
            <label className="integration-label">프로젝트<select value={project} onChange={(event) => setProject(event.target.value)} required>
              <option value="">프로젝트 선택</option>{projects.map((item) => <option key={item.projectId ?? item.id} value={item.projectId ?? item.id}>{item.projectName ?? item.name}</option>)}
            </select></label>
            <label className="integration-label">채널 ID<input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="C0123456789" pattern="[CG][A-Z0-9]+" maxLength={64} required /></label>
            <button disabled={busy}>채널 연결</button>
          </form>
          </details>
          <h4>자주 쓰는 Slack 명령</h4>
          <dl className="slack-commands">
            <dt><code>/timiroom</code></dt><dd>이 채널 프로젝트의 현황 (기준 명세, 승인 대기 수)</dd>
            <dt><code>/timiroom 대기</code></dt><dd>승인을 기다리는 변경안 목록과 바로가기</dd>
            <dt><code>/timiroom 검증</code></dt><dd>가장 최근 대기 변경안의 문서 교차검증</dd>
            <dt><code>/timiroom pr 12</code></dt><dd>연결된 레포의 PR #12 정합성 검사</dd>
            <dt><code>/timiroom 상태</code></dt><dd>최근 작업 결과</dd>
            <dt><code>/timiroom 알림 pr</code></dt><dd>이 채널은 PR 검사 결과만 받기 (<code>알림 전체</code>로 되돌리기)</dd>
            <dt><code>/timiroom 도움말</code></dt><dd>전체 명령</dd>
          </dl>
          <p className="connection-meta">승인과 거절은 티미룸 화면에서 합니다.</p>
        </>}
      </div>}
      <p className="integration-feedback" role="status" aria-live="polite">{feedback}</p>
      <style jsx>{`
        .integration-card { margin:16px 0; min-width:0; background:var(--surface); border:1px solid var(--border); border-radius:var(--db-radius-lg); padding:24px 28px; color:var(--text-1); }
        h2,h3 { font-size:11px; font-weight:700; color:var(--text-3); letter-spacing:.07em; margin:0 0 16px; }
        h4 { font-size:13px; font-weight:600; margin:24px 0 8px; }
        .slack-channels { list-style:none; padding:0; margin:8px 0 12px; display:grid; gap:8px; }
        .slack-events { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .slack-event { padding:4px 10px; border-radius:999px; border:1px solid var(--border-2); background:var(--surface); color:var(--text-2); font-size:12px; cursor:pointer; }
        .slack-event.is-on { border-color:var(--text-1); color:var(--text-1); font-weight:600; background:color-mix(in srgb, var(--text-1) 6%, var(--surface)); }
        .slack-event:disabled { opacity:.6; cursor:default; }
        .integration-manual { margin:4px 0 12px; } .integration-manual summary { cursor:pointer; font-size:13px; color:var(--text-2); }
        .slack-commands { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:6px 16px; margin:0 0 8px; font-size:13px; line-height:1.6; }
        .slack-commands dt { white-space:nowrap; } .slack-commands dd { margin:0; color:var(--text-2); }
        @media (max-width:520px) { .slack-commands { grid-template-columns:1fr; gap:2px; } .slack-commands dd { margin-bottom:8px; } }
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
        .connection-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .connection-edit { flex-basis:100%; display:grid; gap:12px; padding:16px; border-radius:var(--db-radius); background:var(--bg); }
        .connection-edit fieldset { display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; border:0; min-width:0; }
        .connection-edit legend { width:100%; margin-bottom:6px; font-size:12px; font-weight:700; color:var(--text-3); }
        .connection-edit label { display:inline-flex; align-items:center; gap:6px; min-height:36px; padding:0 12px; border:1px solid var(--border-2); border-radius:999px; background:var(--surface); font-size:13px; cursor:pointer; }
        .connection-edit label:has(input:checked) { border-color:var(--text-1); font-weight:600; }
        .connection-edit input[type=checkbox] { width:15px; min-height:0; height:15px; margin:0; padding:0; accent-color:var(--text-1); }
        .connection-edit .connection-actions { justify-content:flex-end; }
        .connection-edit button.primary { background:var(--text-1); border-color:var(--text-1); color:var(--bg); }
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
