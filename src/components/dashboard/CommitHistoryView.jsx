"use client";

/**
 * 프로젝트의 커밋 기록 화면. 프로젝트 목록의 "커밋 기록"을 누르면 본문에 열린다.
 * 예전에는 레일의 커밋 히스토리 버튼으로 왼쪽 패널에 띄웠지만, 내용이 선택한 프로젝트
 * 기준이라 프로젝트 문서들과 같은 자리로 옮겼다.
 *   프로젝트 기록 — 티미룸 안에서 남긴 문서 변경 기록
 *   GitHub        — 연결된 레포의 브랜치별 커밋
 */

import { RepoConnectEmpty } from "./RepoConnectEmpty";
import { useState, useEffect, useCallback } from "react";
import {
  fetchProjectRepositories,
  fetchRepositoryBranches,
  fetchRepositoryCommits,
} from "@/lib/githubApi";
import { createCommit, fetchCommits, fetchCommitsByProject } from "@/lib/commitApi";
import { getTeamWorkspace } from "@/lib/teamApi";
import { ActionButton, EmptyState, PanelHeader } from "@/components/ui";

/* ── 색상 토큰 ── */
const C = {
  panel:      "var(--bg)",
  border:     "rgba(0,0,0,0.07)",
  text:       "var(--text-1)",
  muted:      "#7a7a7a",
  sub:        "var(--text-3)",
  hover:      "rgba(0,0,0,0.04)",
  active:     "color-mix(in srgb, var(--text-1) 12%, transparent)",
  activeBdr:  "color-mix(in srgb, var(--text-1) 25%, transparent)",
  accent:     "var(--text-2)",
  accentDim:  "color-mix(in srgb, var(--text-2) 15%, transparent)",
  input:      "var(--surface)",
  inputBdr:   "rgba(0,0,0,0.09)",
  commit:     "var(--text-1)",
  itemHover:  "var(--surface)",
};

function CommitHistoryPanel({ selectedProject }) {
  const [source, setSource] = useState("project");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div className="gh-filter" role="tablist" aria-label="기록 종류">
          {[
            { id: "project", label: "프로젝트 기록" },
            { id: "github", label: "GitHub 커밋" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={source === item.id}
              className={`gh-filter__item${source === item.id ? " is-active" : ""}`}
              onClick={() => setSource(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {source === "project"
          ? <ProjectCommitPanel selectedProject={selectedProject} />
          : <BranchHistoryPanel selectedProject={selectedProject} />}
      </div>
    </div>
  );
}

function ProjectCommitPanel({ selectedProject }) {
  const [summary, setSummary] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberNames, setMemberNames] = useState({});

  // 서버 기록에는 memberId만 있어 워크스페이스 멤버 목록에서 이름을 찾는다.
  useEffect(() => {
    if (!selectedProject?.teamId) return undefined;
    let active = true;
    getTeamWorkspace(selectedProject.teamId).then((workspace) => {
      if (active) setMemberNames(Object.fromEntries((workspace?.members ?? []).map((m) => [m.memberId, m.memberName || m.email])));
    }).catch(() => {});
    return () => { active = false; };
  }, [selectedProject?.teamId]);

  const loadCommits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = selectedProject?.id
        ? await fetchCommitsByProject(selectedProject.id)
        : await fetchCommits();
      setCommits(data);
    } catch {
      setError("커밋 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => { loadCommits(); }, [loadCommits]);

  async function handleCommit() {
    if (!summary.trim() || !selectedProject?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const newCommit = await createCommit({
        projectId: selectedProject.id,
        message: summary.trim(),
        description: desc.trim(),
      });
      setCommits((current) => [newCommit, ...current]);
      setCommitted(true);
      setSummary("");
      setDesc("");
      window.setTimeout(() => setCommitted(false), 2000);
    } catch {
      setError("커밋에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          프로젝트 커밋 기록
        </div>
        {selectedProject && (
          <div style={{ fontSize: 13, color: C.accent, marginTop: 6, fontWeight: 600, lineHeight: 1.5 }}>
            {selectedProject.name}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px" }}>
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <svg style={{ animation: "ctx-spin 0.9s linear infinite", color: C.sub }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
          </div>
        ) : error ? (
          <div style={{ padding: "20px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{error}</div>
            <button type="button" onClick={loadCommits} style={{ fontSize: 11, color: C.accent, background: "none", border: `1px solid ${C.inputBdr}`, borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>다시 시도</button>
          </div>
        ) : commits.length === 0 ? (
          selectedProject ? <EmptyState compact icon="list" title="아직 남긴 기록이 없습니다" description="문서를 크게 바꾼 뒤 아래에서 무엇을 바꿨는지 남겨 두면 팀이 흐름을 따라가기 쉽습니다." /> : <EmptyHistoryState message="커밋을 보려면 프로젝트를 선택해 주세요." />
        ) : commits.map((commit, index) => (
          <ProjectCommitItem key={commit.id} commit={commit} author={memberNames[commit.memberId]} isLatest={index === 0} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>새 기록 남기기</div>
        <input className="ui-input" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="무엇을 바꿨나요? (예: 결제 API 응답 형식 정리)" maxLength={80} aria-label="기록 제목" />
        <textarea className="ui-input" value={desc} onChange={(event) => setDesc(event.target.value)} placeholder="자세한 설명 (선택)" rows={3} aria-label="기록 설명" style={{ minHeight: 0 }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButton variant="primary" onClick={handleCommit} disabled={!summary.trim() || submitting || !selectedProject}>
            {committed ? "남겼습니다" : submitting ? "남기는 중…" : "기록 남기기"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ProjectCommitItem({ commit, author, isLatest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: isLatest ? C.commit : "rgba(0,0,0,0.15)", border: isLatest ? "2px solid color-mix(in srgb, var(--text-1) 40%, transparent)" : "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{commit.summary}</div>
          {commit.description && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6, color: "var(--text-2)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{commit.description}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{author || ""}</span>
            <span style={{ fontSize: 12, color: C.sub, flexShrink: 0 }}>{commit.time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   GITHUB BRANCH HISTORY PANEL
══════════════════════════════════════ */
function BranchHistoryPanel({ selectedProject }) {
  const [repos, setRepos] = useState([]);
  const [repoId, setRepoId] = useState("");
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [commits, setCommits] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [error, setError] = useState("");

  const selectedRepo = repos.find((repo) => String(repo.id) === String(repoId)) ?? null;

  const loadRepos = useCallback(async () => {
    if (!selectedProject?.id) {
      setRepos([]);
      setRepoId("");
      return;
    }
    setLoadingRepos(true);
    setError("");
    try {
      const nextRepos = await fetchProjectRepositories(selectedProject.id);
      setRepos(nextRepos);
      setRepoId((current) => (
        nextRepos.some((repo) => String(repo.id) === String(current))
          ? current
          : String(nextRepos[0]?.id ?? "")
      ));
    } catch (loadError) {
      setRepos([]);
      setRepoId("");
      setError(loadError instanceof Error ? loadError.message : "연결된 레포를 불러오지 못했습니다.");
    } finally {
      setLoadingRepos(false);
    }
  }, [selectedProject?.id]);

  const loadBranches = useCallback(async () => {
    if (!selectedProject?.id || !repoId) {
      setBranches([]);
      setBranch("");
      return;
    }
    setLoadingBranches(true);
    setError("");
    try {
      const nextBranches = await fetchRepositoryBranches(selectedProject.id, repoId);
      setBranches(nextBranches);
      setBranch((current) => (
        nextBranches.some((item) => item.name === current)
          ? current
          : (nextBranches.find((item) => item.name === selectedRepo?.defaultBranch)?.name ?? nextBranches[0]?.name ?? "")
      ));
    } catch (loadError) {
      setBranches([]);
      setBranch("");
      setError(loadError instanceof Error ? loadError.message : "브랜치 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingBranches(false);
    }
  }, [repoId, selectedProject?.id, selectedRepo?.defaultBranch]);

  const loadCommits = useCallback(async () => {
    if (!selectedProject?.id || !repoId || !branch) {
      setCommits([]);
      return;
    }
    setLoadingCommits(true);
    setError("");
    try {
      setCommits(await fetchRepositoryCommits(selectedProject.id, repoId, branch));
    } catch (loadError) {
      setCommits([]);
      setError(loadError instanceof Error ? loadError.message : "커밋 히스토리를 불러오지 못했습니다.");
    } finally {
      setLoadingCommits(false);
    }
  }, [branch, repoId, selectedProject?.id]);

  useEffect(() => { loadRepos(); }, [loadRepos]);
  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadCommits(); }, [loadCommits]);

  function retryHistory() {
    if (!selectedProject?.id || repos.length === 0) return loadRepos();
    if (!branch) return loadBranches();
    return loadCommits();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          브랜치 히스토리
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 6, lineHeight: 1.6 }}>
          {selectedProject ? `${selectedProject.name} · GitHub 읽기 전용` : "프로젝트를 선택해 주세요"}
        </div>
      </div>

      <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${C.border}`, display: "grid", gap: 8 }}>
        <select value={repoId} disabled={loadingRepos || repos.length === 0} onChange={(event) => { setRepoId(event.target.value); setBranch(""); }} style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${C.inputBdr}`, background: C.input, color: C.text, fontSize: 12, fontFamily: "inherit" }}>
          {loadingRepos ? <option>연결된 레포를 불러오는 중…</option> : repos.length === 0 ? <option value="">연결된 레포 없음</option> : repos.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}
        </select>
        <select value={branch} disabled={loadingBranches || branches.length === 0} onChange={(event) => setBranch(event.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${C.inputBdr}`, background: C.input, color: C.text, fontSize: 12, fontFamily: "inherit" }}>
          {loadingBranches ? <option>브랜치를 불러오는 중…</option> : branches.length === 0 ? <option value="">브랜치 없음</option> : branches.map((item) => <option key={item.name} value={item.name}>{item.name}{item.isProtected ? " · 보호됨" : ""}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px" }}>
        {error ? (
          <div style={{ padding: "22px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.6, marginBottom: 10 }}>{error}</div>
            <button type="button" onClick={retryHistory} style={{ fontSize: 11, color: C.accent, background: "none", border: `1px solid ${C.inputBdr}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}>다시 시도</button>
          </div>
        ) : loadingCommits ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <svg style={{ animation: "ctx-spin 0.9s linear infinite", color: C.sub }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
          </div>
        ) : !selectedProject ? (
          <EmptyHistoryState message="커밋을 보려면 프로젝트를 선택해 주세요." />
        ) : repos.length === 0 ? (
          <RepoConnectEmpty compact projectId={selectedProject?.id} message="레포를 연결하면 브랜치별 커밋 기록을 볼 수 있습니다." />
        ) : !branch ? (
          <EmptyHistoryState message="조회할 브랜치를 선택해 주세요." />
        ) : commits.length === 0 ? (
          <EmptyState compact icon="list" title="이 브랜치에 커밋이 없습니다" description="다른 브랜치를 골라 보세요." />
        ) : commits.map((commit, index) => <GithubCommitItem key={commit.sha} commit={commit} isLatest={index === 0} />)}
      </div>
    </div>
  );
}

function EmptyHistoryState({ message }) {
  return <div style={{ padding: "40px 12px", textAlign: "center", color: C.sub, fontSize: 12, lineHeight: 1.7 }}>{message}</div>;
}

function GithubCommitItem({ commit, isLatest }) {
  const [hovered, setHovered] = useState(false);
  const subject = String(commit.message ?? "").split("\n")[0] || "커밋 메시지 없음";
  const author = commit.authorLogin || commit.authorName || "알 수 없음";
  const committedAt = commit.committedAt ? new Date(commit.committedAt) : null;
  const time = committedAt && !Number.isNaN(committedAt.getTime())
    ? committedAt.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "시간 정보 없음";

  const content = (
    <>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{author}</span>
        <span style={{ fontSize: 11, color: C.sub, flexShrink: 0 }}>{time}</span>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, background: "rgba(0,0,0,0.04)", borderRadius: 999, padding: "4px 8px" }}>
        <span style={{ fontSize: 10, color: C.sub, fontFamily: "var(--font-mono)" }}>{String(commit.sha ?? "").slice(0, 7)}</span>
      </div>
    </>
  );

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: "flex", gap: 8, padding: "12px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.05)", background: hovered ? C.itemHover : "rgba(0,0,0,0.015)", marginBottom: 8, transition: "background 0.12s" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: isLatest ? C.commit : "rgba(0,0,0,0.15)", border: isLatest ? "2px solid color-mix(in srgb, var(--text-1) 40%, transparent)" : "none" }} />
      {commit.htmlUrl ? <a href={commit.htmlUrl} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>{content}</a> : <div style={{ flex: 1, minWidth: 0 }}>{content}</div>}
    </div>
  );
}

/* ══════════════════════════════════════
   CONTEXT PANEL (exported)
══════════════════════════════════════ */

export function CommitHistoryView({ project }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--content-bg)" }}>
      <PanelHeader project={project} label="커밋 기록" />
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <div className="panel-inner panel-inner--fill">
          <div className="commit-card">
            <CommitHistoryPanel selectedProject={project} />
          </div>
        </div>
      </div>
    </div>
  );
}
