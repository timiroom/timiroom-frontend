"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchProjectIssues,
  fetchProjectPullRequests,
  fetchProjectRepositories,
  fetchRepositoryBranches,
  fetchRepositoryCommits,
} from "@/lib/githubApi";

const C = {
  text: "var(--text-1)",
  text2: "var(--text-2)",
  muted: "var(--text-3)",
  border: "var(--border)",
  surface: "var(--surface)",
  bg: "var(--bg)",
};

const ROLE_LABELS = {
  FRONTEND: "프론트엔드",
  BACKEND: "백엔드",
  PIPELINE: "AI 파이프라인",
  CONSISTENCY: "정합성 서비스",
  INFRA: "인프라",
  GENERAL: "공통",
};

function dateTimeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function shortRepoName(fullName) {
  return fullName?.split("/").at(-1) || fullName || "Repository";
}

function StatusBadge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { background: C.bg, color: C.muted, border: C.border },
    blue: { background: "rgba(59,130,246,.09)", color: "#2563eb", border: "rgba(59,130,246,.2)" },
    green: { background: "rgba(34,197,94,.09)", color: "#16a34a", border: "rgba(34,197,94,.2)" },
    purple: { background: "rgba(99,102,241,.09)", color: "#6366f1", border: "rgba(99,102,241,.2)" },
  };
  const selected = tones[tone] || tones.neutral;
  return <span style={{ padding: "3px 7px", borderRadius: 999, border: `1px solid ${selected.border}`, background: selected.background, color: selected.color, fontSize: 10, fontWeight: 750, whiteSpace: "nowrap" }}>{children}</span>;
}

function EmptyColumn({ children }) {
  return <div style={{ padding: "26px 12px", border: `1px dashed ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 11, lineHeight: 1.55, textAlign: "center" }}>{children}</div>;
}

function ColumnHeader({ title, count, onOpen }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <strong style={{ color: C.text, fontSize: 12.5 }}>{title}</strong>
        <span style={{ color: C.muted, fontSize: 10.5 }}>{count}</span>
      </div>
      {onOpen && <button type="button" onClick={onOpen} style={{ padding: 0, border: "none", background: "transparent", color: C.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>전체 →</button>}
    </div>
  );
}

function CommitList({ commits, error }) {
  if (error) return <EmptyColumn>커밋을 불러오지 못했습니다.<br />{error}</EmptyColumn>;
  if (!commits?.length) return <EmptyColumn>표시할 커밋이 없습니다.</EmptyColumn>;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {commits.slice(0, 6).map((commit) => (
        <a key={commit.sha} href={commit.htmlUrl} target="_blank" rel="noreferrer" style={{ display: "block", padding: "9px 10px", borderRadius: 9, color: C.text, textDecoration: "none" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{commit.message?.split("\n")[0] || "메시지 없는 커밋"}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 4, color: C.muted, fontSize: 10 }}><code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{commit.sha?.slice(0, 7)}</code><span>·</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{commit.authorLogin || commit.authorName || "알 수 없음"}</span><span>·</span><span style={{ whiteSpace: "nowrap" }}>{dateTimeLabel(commit.committedAt)}</span></div>
        </a>
      ))}
    </div>
  );
}

function IssueList({ issues }) {
  if (!issues.length) return <EmptyColumn>등록된 이슈가 없습니다.</EmptyColumn>;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {issues.slice(0, 6).map((issue) => (
        <a key={`${issue.repoId}-${issue.number}`} href={issue.htmlUrl} target="_blank" rel="noreferrer" style={{ display: "block", minWidth: 0, maxWidth: "100%", overflow: "hidden", boxSizing: "border-box", padding: "9px 10px", borderRadius: 9, color: C.text, textDecoration: "none", opacity: issue.state === "closed" ? .65 : 1 }}>
          <div style={{ display: "flex", width: "100%", minWidth: 0, overflow: "hidden", alignItems: "flex-start", gap: 7 }}><span style={{ color: issue.state === "closed" ? "#16a34a" : "#2563eb", fontSize: 11, fontWeight: 850 }}>{issue.state === "closed" ? "✓" : "○"}</span><div style={{ flex: "1 1 0", minWidth: 0, maxWidth: "100%", fontSize: 11.5, fontWeight: 700, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.title}</div></div>
          <div style={{ marginTop: 4, paddingLeft: 18, color: C.muted, fontSize: 10 }}>#{issue.number} · {issue.authorLogin || "알 수 없음"} · {dateTimeLabel(issue.createdAt)}</div>
        </a>
      ))}
    </div>
  );
}

function PullRequestList({ pulls }) {
  if (!pulls.length) return <EmptyColumn>열린 PR이 없습니다.</EmptyColumn>;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {pulls.slice(0, 6).map((pull) => (
        <a key={`${pull.repoId}-${pull.number}`} href={pull.htmlUrl} target="_blank" rel="noreferrer" style={{ display: "block", minWidth: 0, maxWidth: "100%", overflow: "hidden", boxSizing: "border-box", padding: "9px 10px", borderRadius: 9, color: C.text, textDecoration: "none" }}>
          <div style={{ display: "flex", width: "100%", minWidth: 0, overflow: "hidden", alignItems: "flex-start", gap: 7 }}><span style={{ color: "#6366f1", fontSize: 11, fontWeight: 850 }}>⇄</span><div style={{ flex: "1 1 0", minWidth: 0, maxWidth: "100%", fontSize: 11.5, fontWeight: 700, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pull.title}</div></div>
          <div style={{ marginTop: 4, paddingLeft: 18, color: C.muted, fontSize: 10 }}>#{pull.number} · {pull.headRef} → {pull.baseRef}{pull.draft ? " · Draft" : ""}</div>
        </a>
      ))}
    </div>
  );
}

function RepoCard({ repo, commitsState, issues, pulls, onSelectView }) {
  const openIssues = issues.filter((issue) => issue.state !== "closed");
  const orderedIssues = [...openIssues, ...issues.filter((issue) => issue.state === "closed")];
  return (
    <article style={{ overflow: "hidden", border: `1px solid ${C.border}`, borderRadius: 16, background: C.surface, boxShadow: "0 8px 24px rgba(15,23,42,.035)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, padding: "16px 18px", borderBottom: `1px solid ${C.border}`, background: "linear-gradient(135deg, var(--surface), var(--bg))" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ color: C.text, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis" }}>{repo.fullName}</strong>
            <StatusBadge tone="purple">{ROLE_LABELS[repo.roleHint] || repo.roleHint || "공통"}</StatusBadge>
            {repo.isPrivate && <StatusBadge>Private</StatusBadge>}
          </div>
          <div style={{ marginTop: 6, color: C.muted, fontSize: 10.5 }}>기본 브랜치 · {commitsState?.branch || repo.defaultBranch || "main"}</div>
        </div>
        <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer" style={{ flexShrink: 0, color: C.text2, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>GitHub ↗</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        <div style={{ minWidth: 0, padding: 15, borderRight: `1px solid ${C.border}` }}><ColumnHeader title="최근 커밋" count={commitsState?.commits?.length || 0} /><CommitList commits={commitsState?.commits || []} error={commitsState?.error} /></div>
        <div style={{ minWidth: 0, padding: 15, borderRight: `1px solid ${C.border}` }}><ColumnHeader title="Issues" count={`${openIssues.length} open / ${issues.length}`} onOpen={() => onSelectView("issues")} /><IssueList issues={orderedIssues} /></div>
        <div style={{ minWidth: 0, padding: 15 }}><ColumnHeader title="Pull requests" count={`${pulls.length} open`} onOpen={() => onSelectView("pulls")} /><PullRequestList pulls={pulls} /></div>
      </div>
    </article>
  );
}

export function GithubWorkspacePanel({ project, onSelectView }) {
  const [repos, setRepos] = useState([]);
  const [issues, setIssues] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [histories, setHistories] = useState({});
  const [selectedRepoId, setSelectedRepoId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setError("");
    try {
      const nextRepos = await fetchProjectRepositories(project.id);
      setRepos(nextRepos);
      const [issuesResult, pullsResult, historyResults] = await Promise.all([
        fetchProjectIssues(project.id).then((value) => ({ value })).catch((reason) => ({ reason })),
        fetchProjectPullRequests(project.id).then((value) => ({ value })).catch((reason) => ({ reason })),
        Promise.all(nextRepos.map(async (repo) => {
          const repoId = String(repo.id);
          try {
            const branches = await fetchRepositoryBranches(project.id, repo.id);
            const branch = branches.find((item) => item.name === repo.defaultBranch)?.name || repo.defaultBranch || branches[0]?.name;
            if (!branch) return [repoId, { branch: "", commits: [] }];
            const commits = await fetchRepositoryCommits(project.id, repo.id, branch);
            return [repoId, { branch, commits }];
          } catch (historyError) {
            return [repoId, { branch: repo.defaultBranch || "main", commits: [], error: historyError instanceof Error ? historyError.message : "조회 실패" }];
          }
        })),
      ]);
      setIssues(issuesResult.value || []);
      setPulls(pullsResult.value || []);
      setHistories(Object.fromEntries(historyResults));
      const partialErrors = [issuesResult.reason, pullsResult.reason].filter(Boolean).map((reason) => reason instanceof Error ? reason.message : "GitHub 데이터를 일부 불러오지 못했습니다.");
      if (partialErrors.length) setError(partialErrors.join(" "));
    } catch (loadError) {
      setRepos([]);
      setIssues([]);
      setPulls([]);
      setHistories({});
      setError(loadError instanceof Error ? loadError.message : "GitHub 작업 현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelectedRepoId("all"); }, [project?.id]);

  const visibleRepos = useMemo(() => selectedRepoId === "all" ? repos : repos.filter((repo) => String(repo.id) === selectedRepoId), [repos, selectedRepoId]);
  const openIssueCount = issues.filter((issue) => issue.state !== "closed").length;
  const recentCommitCount = Object.values(histories).reduce((sum, history) => sum + (history.commits?.length || 0), 0);

  return (
    <section style={{ flex: 1, overflowY: "auto", padding: 28, background: "linear-gradient(180deg, var(--db-bg-primary) 0%, var(--bg) 100%)" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div><div style={{ color: C.text, fontSize: 22, fontWeight: 850, letterSpacing: "-.02em" }}>GitHub 작업</div><div style={{ marginTop: 6, color: C.muted, fontSize: 13 }}>프로젝트의 여러 레포에서 최근 커밋, Issue, PR 흐름을 한눈에 확인합니다.</div></div>
          <button type="button" onClick={load} disabled={loading} style={{ padding: "8px 11px", border: `1px solid ${C.border}`, borderRadius: 9, background: C.surface, color: C.text2, fontSize: 11.5, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "inherit" }}>{loading ? "동기화 중…" : "새로고침"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 9, marginBottom: 16 }}>
          {[{ label: "연결 레포", value: repos.length, tone: "purple" }, { label: "최근 커밋", value: recentCommitCount, tone: "neutral" }, { label: "열린 Issue", value: openIssueCount, tone: "blue" }, { label: "열린 PR", value: pulls.length, tone: "green" }].map((stat) => <div key={stat.label} style={{ padding: "13px 14px", border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface }}><div style={{ color: C.muted, fontSize: 10.5 }}>{stat.label}</div><div style={{ marginTop: 5, color: C.text, fontSize: 20, fontWeight: 850 }}>{stat.value}</div></div>)}
        </div>

        {repos.length > 1 && <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 15 }}><button type="button" onClick={() => setSelectedRepoId("all")} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${selectedRepoId === "all" ? C.text : C.border}`, background: selectedRepoId === "all" ? C.text : C.surface, color: selectedRepoId === "all" ? C.bg : C.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>전체 레포</button>{repos.map((repo) => { const selected = selectedRepoId === String(repo.id); return <button key={repo.id} type="button" onClick={() => setSelectedRepoId(String(repo.id))} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${selected ? C.text : C.border}`, background: selected ? C.text : C.surface, color: selected ? C.bg : C.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{shortRepoName(repo.fullName)}</button>; })}</div>}

        {error && <div style={{ marginBottom: 15, padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: 12 }}>{error}</div>}
        {loading ? <div style={{ padding: 54, textAlign: "center", color: C.muted, fontSize: 13 }}>GitHub 작업 현황을 불러오는 중…</div> : repos.length === 0 ? <div style={{ padding: 54, border: `1px dashed ${C.border}`, borderRadius: 15, textAlign: "center", color: C.muted, fontSize: 13 }}>프로젝트 설정에서 GitHub 레포를 먼저 연결해 주세요.</div> : <div style={{ display: "grid", gap: 14 }}>{visibleRepos.map((repo) => <RepoCard key={repo.id} repo={repo} commitsState={histories[String(repo.id)]} issues={issues.filter((issue) => String(issue.repoId) === String(repo.id))} pulls={pulls.filter((pull) => String(pull.repoId) === String(repo.id))} onSelectView={onSelectView} />)}</div>}
      </div>
    </section>
  );
}
