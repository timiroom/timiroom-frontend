"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProjectIssue,
  fetchProjectIssues,
  fetchProjectRepositories,
} from "@/lib/githubApi";

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1)",
  fontSize: 13, fontFamily: "inherit", outline: "none",
};

function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function GithubIssuesPanel({ project, canManage }) {
  const [issues, setIssues] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setError("");
    try {
      const [nextIssues, nextRepos] = await Promise.all([
        fetchProjectIssues(project.id),
        fetchProjectRepositories(project.id),
      ]);
      setIssues(nextIssues);
      setRepos(nextRepos);
      setRepoId((current) => nextRepos.some((repo) => String(repo.id) === String(current))
        ? current : String(nextRepos[0]?.id ?? ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "이슈 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  async function createIssue() {
    if (!repoId || !title.trim()) return;
    setCreating(true);
    try {
      const created = await createProjectIssue(project.id, {
        repoId: Number(repoId),
        title: title.trim(),
        body: body.trim(),
        labels: labels.split(",").map((label) => label.trim()).filter(Boolean),
      });
      setIssues((current) => [created, ...current]);
      setTitle("");
      setBody("");
      setLabels("");
      setComposerOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "이슈 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{
        height: 52, flexShrink: 0, borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", padding: "0 24px",
        justifyContent: "space-between", background: "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {project && (
            <>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: `${project.color || "var(--text-1)"}22`,
                border: `1px solid ${project.color || "var(--text-1)"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 900, color: project.color || "#6b6960",
              }}>
                {(project.name || "P").charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{project.name}</span>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>›</span>
            </>
          )}
          <span style={{
            fontSize: 13, fontWeight: 500, color: "#f472b6",
            padding: "2px 8px", borderRadius: 6,
            background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)",
          }}>Issues 전체</span>
        </div>
        {canManage && <button type="button" onClick={() => setComposerOpen((open) => !open)} disabled={repos.length === 0} style={{ padding: "6px 12px", border: "none", borderRadius: 8, background: "var(--text-1)", color: "var(--bg)", fontSize: 12, fontWeight: 700, cursor: repos.length ? "pointer" : "not-allowed", fontFamily: "inherit" }}>{composerOpen ? "취소" : "이슈 만들기"}</button>}
      </div>

      <section style={{ flex: 1, overflowY: "auto", padding: 28, background: "linear-gradient(180deg, var(--db-bg-primary) 0%, var(--bg) 100%)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 22, color: "var(--text-3)", fontSize: 13 }}>연결된 GitHub 레포의 진행 중·완료 이슈를 한 곳에서 봅니다.</div>

        {composerOpen && (
          <div style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", marginBottom: 18, display: "grid", gap: 10 }}>
            <select value={repoId} onChange={(event) => setRepoId(event.target.value)} style={inputStyle}>{repos.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}</select>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="이슈 제목" style={inputStyle} />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="설명 (선택)" rows={5} style={{ ...inputStyle, resize: "vertical" }} />
            <input value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="라벨 (쉼표로 구분, 선택)" style={inputStyle} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={createIssue} disabled={creating || !repoId || !title.trim()} style={{ padding: "9px 14px", border: "none", borderRadius: 9, background: "var(--text-1)", color: "var(--bg)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{creating ? "생성 중…" : "GitHub 이슈 생성"}</button></div>
          </div>
        )}

        {!canManage && <div style={{ marginBottom: 16, color: "var(--text-3)", fontSize: 12 }}>이슈 생성은 프로젝트 PM만 할 수 있어요.</div>}
        {error && <div style={{ marginBottom: 16, padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: 12 }}>{error}</div>}
        {loading ? <div style={{ padding: 44, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>이슈를 불러오는 중…</div> : issues.length === 0 ? <div style={{ padding: 52, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 14, color: "var(--text-3)", fontSize: 13 }}>{repos.length ? "등록된 이슈가 없습니다." : "프로젝트 설정에서 GitHub 레포를 먼저 연결해 주세요."}</div> : <div style={{ display: "grid", gap: 10 }}>{issues.map((issue) => <article key={`${issue.repoId}-${issue.number}`} style={{ padding: "15px 16px", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", opacity: issue.state === "closed" ? .72 : 1 }}><div style={{ display: "flex", alignItems: "start", gap: 10 }}><a href={issue.htmlUrl} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, color: "var(--text-1)", textDecoration: "none", fontSize: 14, fontWeight: 750 }}>{issue.title}</a><span style={{ padding: "2px 7px", borderRadius: 999, background: issue.state === "closed" ? "#dcfce7" : "#dbeafe", color: issue.state === "closed" ? "#16a34a" : "#2563eb", fontSize: 10, fontWeight: 750, whiteSpace: "nowrap" }}>{issue.state === "closed" ? "완료" : "진행 중"}</span><span style={{ color: "var(--text-3)", fontSize: 11, whiteSpace: "nowrap" }}>#{issue.number}</span></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8, color: "var(--text-3)", fontSize: 11 }}><span>{issue.repoFullName}</span><span>·</span><span>{issue.authorLogin || "알 수 없음"}</span><span>·</span><span>{relativeTime(issue.createdAt)}</span>{(issue.labels || []).map((label) => <span key={label} style={{ padding: "2px 7px", borderRadius: 999, background: "var(--bg)", border: "1px solid var(--border)" }}>{label}</span>)}</div></article>)}</div>}
      </div>
      </section>
    </div>
  );
}
