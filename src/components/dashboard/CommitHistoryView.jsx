"use client";

/**
 * 프로젝트의 커밋 기록 화면. 프로젝트 목록의 "커밋 기록"을 누르면 본문에 열린다.
 * 예전에는 레일의 커밋 히스토리 버튼으로 왼쪽 패널에 띄웠지만, 내용이 선택한 프로젝트
 * 기준이라 프로젝트 문서들과 같은 자리로 옮겼다.
 *   프로젝트 기록 — 티미룸 안에서 남긴 문서 변경 기록
 *   GitHub        — 연결된 레포의 브랜치별 커밋
 */

import { tint } from "@/lib/color";
import { useState, useEffect, useCallback } from "react";
import {
  fetchProjectRepositories,
  fetchRepositoryBranches,
  fetchRepositoryCommits,
} from "@/lib/githubApi";
import { createCommit, fetchCommits, fetchCommitsByProject } from "@/lib/commitApi";
import { PanelHeader } from "@/components/ui";

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: "project", label: "프로젝트 기록" },
          { id: "github", label: "GitHub" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSource(item.id)}
            style={{
              padding: "7px 8px",
              borderRadius: 8,
              border: `1px solid ${source === item.id ? C.activeBdr : C.inputBdr}`,
              background: source === item.id ? C.accentDim : C.input,
              color: source === item.id ? C.text : C.muted,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {item.label}
          </button>
        ))}
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
          <EmptyHistoryState message={selectedProject ? "아직 기록된 커밋이 없습니다." : "커밋을 보려면 프로젝트를 선택해 주세요."} />
        ) : commits.map((commit, index) => (
          <ProjectCommitItem key={commit.id} commit={commit} isLatest={index === 0} />
        ))}
      </div>

      <div style={{ padding: "16px 16px 20px", borderTop: `1px solid ${C.border}`, background: "rgba(0,0,0,0.015)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          새 커밋
        </div>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="커밋 제목"
          maxLength={80}
          style={{ width: "100%", padding: "10px 12px", background: C.input, border: `1px solid ${C.inputBdr}`, borderRadius: 10, fontSize: 12, color: C.text, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" }}
        />
        <textarea
          value={desc}
          onChange={(event) => setDesc(event.target.value)}
          placeholder="상세 설명 (선택)"
          rows={3}
          style={{ width: "100%", padding: "10px 12px", background: C.input, border: `1px solid ${C.inputBdr}`, borderRadius: 10, fontSize: 12, color: C.text, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10, lineHeight: 1.7, fontFamily: "inherit" }}
        />
        {!selectedProject && <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, textAlign: "center" }}>먼저 프로젝트를 선택해 주세요.</div>}
        <button
          type="button"
          onClick={handleCommit}
          disabled={!summary.trim() || submitting || !selectedProject}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 10,
            border: "none",
            background: committed ? "var(--text-3)" : !summary.trim() || submitting || !selectedProject ? "color-mix(in srgb, var(--text-1) 35%, transparent)" : C.commit,
            color: committed ? "#064e3b" : "var(--bg)",
            fontSize: 13,
            fontWeight: 700,
            cursor: !summary.trim() || submitting || !selectedProject ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {committed ? "커밋 완료" : submitting ? "커밋 중..." : "커밋 남기기"}
        </button>
      </div>
    </div>
  );
}

function ProjectCommitItem({ commit, isLatest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: isLatest ? C.commit : "rgba(0,0,0,0.15)", border: isLatest ? "2px solid color-mix(in srgb, var(--text-1) 40%, transparent)" : "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{commit.summary}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{commit.project}</span>
            <span style={{ fontSize: 11, color: C.sub, flexShrink: 0 }}>{commit.time}</span>
          </div>
          <div style={{ display: "inline-flex", marginTop: 8, background: "rgba(0,0,0,0.04)", borderRadius: 999, padding: "4px 8px" }}>
            <span style={{ fontSize: 10, color: C.sub, fontFamily: "monospace" }}>{commit.hash}</span>
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
          <EmptyHistoryState message="프로젝트 설정에서 GitHub 레포를 연결하면 브랜치 히스토리를 볼 수 있어요." />
        ) : !branch ? (
          <EmptyHistoryState message="조회할 브랜치를 선택해 주세요." />
        ) : commits.length === 0 ? (
          <EmptyHistoryState message="이 브랜치에 표시할 커밋이 없습니다." />
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
        <span style={{ fontSize: 10, color: C.sub, fontFamily: "monospace" }}>{String(commit.sha ?? "").slice(0, 7)}</span>
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
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <PanelHeader project={project} label="커밋 기록" />
      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ width: "min(760px, 100%)", display: "flex", flexDirection: "column", minHeight: 0, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, background: C.panel }}>
          <CommitHistoryPanel selectedProject={project} />
        </div>
      </div>
    </div>
  );
}
