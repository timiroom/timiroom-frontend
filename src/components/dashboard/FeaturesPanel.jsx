"use client";

/**
 * FeaturesPanel.jsx
 * -----------------
 * 기능 명세서 패널 + AI 채팅 사이드바.
 *
 * 데이터 우선순위:
 *   1순위: project.prdDocument.coreFeatures  (PRD 에이전트 상세 기능)
 *   2순위: project.featureList               (PM 에이전트 기능 목록)
 *   3순위: 빈 상태 안내
 */

import { Fragment, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AiChatDock } from "./AiChatDock";
import { updateArtifact } from "@/lib/pipelineApi";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectMembers, saveProjectDocument } from "@/lib/projectApi";
import { getTeamWorkspace } from "@/lib/teamApi";
import {
  createProjectIssue,
  fetchProjectIssues,
  fetchProjectRepositories,
  updateProjectIssue,
} from "@/lib/githubApi";
import {
  classifyRepository,
  inferFeatureRoles,
  recommendRepositoriesForFeature,
  recommendRepository,
  roleLabel,
  techStackKeysForRole,
  techStackRoles,
} from "@/lib/repoRouting";

const C = {
  bg:        "var(--surface)",
  surface:   "#f7f6f3",
  border:    "rgba(0,0,0,0.07)",
  text:      "#1a1916",
  muted:     "var(--text-3)",
  sub:       "var(--text-3)",
  accent:    "#6b6960",
  accentBg:  "rgba(107,105,96,0.1)",
  accentBdr: "rgba(107,105,96,0.25)",
  card:      "var(--surface)",
};

function asList(value) {
  if (Array.isArray(value)) {
    return value
      .filter(item => item != null && String(item).trim())
      .map(item => typeof item === "string" ? item : item?.text ?? item?.name ?? String(item));
  }
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return asList(parsed);
    } catch {}
    return [trimmed];
  }
  return [String(value)];
}

const TASK_TYPE_META = {
  GENERAL: { label: "공통", color: "#6b7280" },
  FRONTEND: { label: "프론트엔드", color: "#7c3aed" },
  BACKEND: { label: "백엔드", color: "#2563eb" },
  PIPELINE: { label: "초기 파이프라인", color: "#0891b2" },
  CONSISTENCY: { label: "정합성 AI", color: "#059669" },
  INFRA: { label: "인프라", color: "#d97706" },
};

function taskTypeFromRepo(repo) {
  return classifyRepository(repo);
}

function normalizeTask(value, featureKey, taskIndex) {
  const task = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const rawType = String(task.type ?? task.workType ?? "GENERAL").toUpperCase();
  const type = TASK_TYPE_META[rawType] ? rawType : "GENERAL";
  return {
    ...task,
    taskKey: String(task.taskKey ?? task.id ?? `${featureKey}-task-${taskIndex + 1}`),
    name: String(task.name ?? task.title ?? `${TASK_TYPE_META[type].label} 구현`),
    type,
    repoId: task.repoId == null ? "" : String(task.repoId),
    ownerMemberId: task.ownerMemberId == null ? "" : String(task.ownerMemberId),
    startDate: task.startDate ?? "",
    endDate: task.endDate ?? "",
    required: task.required !== false,
    githubIssueNumber: task.githubIssueNumber == null ? null : Number(task.githubIssueNumber),
    githubIssueUrl: task.githubIssueUrl ?? "",
    githubIssueState: task.githubIssueState ?? "",
  };
}

function normalizeFeature(value, index) {
  const feature = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : { name: String(value ?? "") };
  const featureKey = String(feature.featureKey ?? feature.id ?? feature.code ?? `feature-${index + 1}`);
  const name = String(feature.name ?? feature.title ?? feature.featureName ?? `기능 ${index + 1}`);
  const hasLegacyTask = Boolean(
    feature.ownerMemberId || feature.startDate || feature.endDate || feature.githubRepoId || feature.githubIssueNumber
  );
  const rawTasks = Array.isArray(feature.implementationTasks)
    ? feature.implementationTasks
    : hasLegacyTask ? [{
      taskKey: `${featureKey}-task-1`,
      name: `${name} 구현`,
      type: "GENERAL",
      repoId: feature.githubRepoId,
      ownerMemberId: feature.ownerMemberId,
      startDate: feature.startDate,
      endDate: feature.endDate,
      githubIssueNumber: feature.githubIssueNumber,
      githubIssueUrl: feature.githubIssueUrl,
      githubIssueState: feature.githubIssueState,
    }] : [];
  return {
    ...feature,
    featureKey,
    name,
    description: String(feature.description ?? feature.summary ?? ""),
    requirements: asList(feature.requirements),
    implementationTasks: rawTasks.map((task, taskIndex) => normalizeTask(task, featureKey, taskIndex)),
    // 이전 단일 작업 필드는 비워 저장한다. 기존 데이터는 위에서 하위 작업 한 건으로 마이그레이션된다.
    ownerMemberId: "",
    startDate: "",
    endDate: "",
    githubRepoId: "",
    githubIssueNumber: null,
    githubIssueUrl: "",
    githubIssueState: "",
  };
}

function cloneFeatures(features) {
  return features.map(feature => ({
    ...feature,
    requirements: [...feature.requirements],
    implementationTasks: feature.implementationTasks.map(task => ({ ...task })),
  }));
}

function durationDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function progressFromIssue(task, issue) {
  const state = String(issue?.state ?? task.githubIssueState ?? "").toLowerCase();
  if (state === "closed") return { value: 100, label: "완료", color: "#16a34a", background: "#dcfce7" };
  if (task.githubIssueNumber) return { value: 50, label: "진행 중", color: "#2563eb", background: "#dbeafe" };
  return { value: 0, label: "시작 전", color: "#6b7280", background: "#f3f4f6" };
}

function aggregateProgress(tasks, issueMap) {
  const requiredTasks = tasks.filter(task => task.required !== false);
  const targets = requiredTasks.length > 0 ? requiredTasks : tasks;
  const value = targets.length === 0 ? 0 : Math.round(targets.reduce((sum, task) => {
    const issue = issueMap.get(`${task.repoId}-${task.githubIssueNumber}`);
    return sum + progressFromIssue(task, issue).value;
  }, 0) / targets.length);
  if (value === 100) return { value, label: "완료", color: "#16a34a", background: "#dcfce7" };
  if (value > 0) return { value, label: "진행 중", color: "#2563eb", background: "#dbeafe" };
  return { value, label: "시작 전", color: "#6b7280", background: "#f3f4f6" };
}

/* ── 우선순위 배지 ── */
const PRIORITY_META = {
  P0: { label: "P0 · Must",   bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.3)",  text: "#f87171" },
  P1: { label: "P1 · Should", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.3)",   text: "#fbbf24" },
  P2: { label: "P2 · Could",  bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.3)",   text: "#34d399" },
};

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || {
    label: priority || "—", bg: "rgba(107,105,96,0.1)",
    border: "rgba(107,105,96,0.3)", text: "#6b6960",
  };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
      background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text,
      flexShrink: 0, whiteSpace: "nowrap",
    }}>{meta.label}</span>
  );
}

/* ── 기능 카드 (상세, 인라인 편집 가능) ── */
function FeatureCard({ feature, index, onUpdate }) {
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null); // "name" | "description" | null
  const requirements = asList(feature.requirements);

  function update(field, val) {
    onUpdate(index, { ...feature, [field]: val });
  }

  function EditableText({ field, value, style, multiline }) {
    const isEditing = editing === field;
    if (!isEditing) {
      return (
        <span
          onClick={e => { e.stopPropagation(); setEditing(field); }}
          title="클릭하여 편집"
          style={{ ...style, cursor: "text", borderRadius: 3,
            ":hover": { background: "rgba(0,0,0,0.03)" } }}
        >{value || <span style={{ color: C.sub, fontStyle: "italic" }}>내용 없음</span>}</span>
      );
    }
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={value}
          onChange={e => update(field, e.target.value)}
          onBlur={() => setEditing(null)}
          style={{
            width: "100%", resize: "vertical", border: `1px solid rgba(107,105,96,0.3)`,
            borderRadius: 5, padding: "6px 8px", fontSize: style?.fontSize || 13,
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
            background: "rgba(107,105,96,0.04)", outline: "none", color: C.text,
          }}
          rows={3}
        />
      );
    }
    return (
      <input
        autoFocus
        value={value}
        onChange={e => update(field, e.target.value)}
        onBlur={() => setEditing(null)}
        onKeyDown={e => e.key === "Enter" && setEditing(null)}
        style={{
          border: `1px solid rgba(107,105,96,0.3)`,
          borderRadius: 5, padding: "4px 8px",
          fontSize: style?.fontSize || 14, fontWeight: style?.fontWeight || 600,
          fontFamily: "inherit", background: "rgba(107,105,96,0.04)",
          outline: "none", color: C.text, width: "100%",
        }}
      />
    );
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${open ? "rgba(107,105,96,0.2)" : C.border}`,
      background: open ? C.surface : C.card,
      marginBottom: 8, overflow: "hidden", transition: "all 0.15s",
    }}>
      {/* 헤더 */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: "rgba(107,105,96,0.1)", border: "1px solid rgba(107,105,96,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: C.accent,
        }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>
          {feature.name}
        </span>
        {feature.priority && <PriorityBadge priority={feature.priority} />}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.muted} strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* 상세 내용 + 편집 */}
      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.border}` }}>

          {/* 기능명 편집 */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.sub,
              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4,
            }}>기능명</div>
            <EditableText
              field="name"
              value={feature.name}
              style={{ fontSize: 14, fontWeight: 600, color: C.text }}
            />
          </div>

          {/* 설명 편집 */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.sub,
              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4,
            }}>설명</div>
            <EditableText
              field="description"
              value={feature.description || ""}
              style={{ fontSize: 13, color: C.muted }}
              multiline
            />
          </div>

          {/* 요구사항 */}
          <div style={{ marginTop: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.sub,
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
              }}>요구사항</div>
              {requirements.length === 0 && (
                <div style={{ fontSize: 12, color: C.sub, padding: "4px 0 8px" }}>등록된 요구사항이 없습니다.</div>
              )}
              {requirements.map((req, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 0",
                  borderBottom: i < requirements.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#34d399" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  </div>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => {
                      const newReqs = [...requirements];
                      newReqs[i] = e.currentTarget.innerText;
                      update("requirements", newReqs);
                    }}
                    style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, flex: 1, outline: "none",
                      borderRadius: 3, padding: "1px 3px",
                    }}
                  >
                    {req}
                  </span>
                </div>
              ))}
              {/* 요구사항 추가 */}
              <button
                onClick={() => update("requirements", [...requirements, "새 요구사항"])}
                style={{
                  marginTop: 6, fontSize: 11, color: C.accent, background: "none",
                  border: `1px dashed ${C.accentBdr}`, borderRadius: 5, padding: "4px 10px",
                  cursor: "pointer",
                }}
              >+ 요구사항 추가</button>
            </div>
        </div>
      )}
    </div>
  );
}

/* ── 심플 기능 행 (featureList만 있을 때) ── */
function SimpleFeatureRow({ name, index, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(name);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
      borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, marginBottom: 6,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: "rgba(107,105,96,0.1)", border: "1px solid rgba(107,105,96,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: C.accent,
      }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); onUpdate(index, draft); }}
          onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onUpdate(index, draft); } }}
          style={{
            flex: 1, border: `1px solid rgba(107,105,96,0.3)`, borderRadius: 5,
            padding: "3px 8px", fontSize: 14, fontFamily: "inherit",
            background: "rgba(107,105,96,0.04)", outline: "none", color: C.text,
          }}
        />
      ) : (
        <span
          style={{ flex: 1, fontSize: 14, color: C.text, cursor: "text" }}
          onClick={() => { setDraft(name); setEditing(true); }}
          title="클릭하여 편집"
        >{name}</span>
      )}
    </div>
  );
}

const scheduleInputStyle = {
  width: "100%", minWidth: 0, boxSizing: "border-box", border: `1px solid ${C.border}`,
  borderRadius: 7, background: C.bg, color: C.text, padding: "7px 8px",
  fontSize: 11, fontFamily: "inherit", outline: "none",
};

function ProgressCell({ progress }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 750, color: progress.color }}>{progress.label}</span>
        <span style={{ fontSize: 10, color: C.sub }}>{progress.value}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ width: `${progress.value}%`, height: "100%", background: progress.color, transition: "width .2s" }} />
      </div>
    </div>
  );
}

function FeatureScheduleTable({
  entries, members, repos, onTaskUpdate, onAddTask, onAddRepoTasks, onRemoveTask,
  issueMap, canEdit, canCreateIssues, creatingIssueKeys, bulkCreating,
  onCreateIssue, onCreateMissingIssues, onRefresh, refreshing, techStack,
}) {
  const missingCount = entries.reduce((count, { feature }) => count +
    feature.implementationTasks.filter(task => task.repoId && !task.githubIssueNumber).length, 0);
  const routingRoles = [...new Set([
    ...techStackRoles(techStack),
    ...repos.map(taskTypeFromRepo).filter(role => role !== "GENERAL"),
  ])];
  const routingSummary = routingRoles.map(role => ({
    role,
    repo: recommendRepository(repos, role),
    stackKeys: techStackKeysForRole(techStack, role),
  }));

  return (
    <section style={{ marginBottom: 26, border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: C.surface }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 750, color: C.text }}>기능별 구현 작업 · 일정 · GitHub</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
            PRD 기술 스택과 기능 내용을 기준으로 레포를 추천합니다. 담당자·일정은 직접 지정하고, 진척률은 필수 작업의 Issue 상태로 자동 계산됩니다.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <button type="button" onClick={onRefresh} disabled={refreshing} style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 11, fontWeight: 650, cursor: refreshing ? "wait" : "pointer", fontFamily: "inherit" }}>
            {refreshing ? "동기화 중…" : "진척률 새로고침"}
          </button>
          {canCreateIssues && missingCount > 0 && (
            <button type="button" onClick={onCreateMissingIssues} disabled={bulkCreating} style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid rgba(37,99,235,.25)", background: "#eff6ff", color: "#2563eb", fontSize: 11, fontWeight: 750, cursor: bulkCreating ? "wait" : "pointer", fontFamily: "inherit" }}>
              {bulkCreating ? "Issue 생성 중…" : `미생성 Issue ${missingCount}개 만들기`}
            </button>
          )}
        </div>
      </div>

      {routingSummary.length > 0 && (
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", background: "#fbfdff" }}>
          <span style={{ marginRight: 2, color: C.sub, fontSize: 10, fontWeight: 750 }}>PRD 자동 매칭</span>
          {routingSummary.map(({ role, repo, stackKeys }) => (
            <span key={role} style={{ padding: "4px 8px", borderRadius: 999, border: `1px solid ${repo ? "rgba(37,99,235,.18)" : "rgba(217,119,6,.22)"}`, background: repo ? "#eff6ff" : "#fffbeb", color: repo ? "#2563eb" : "#b45309", fontSize: 9.5, fontWeight: 700 }}>
              {stackKeys.length ? `${stackKeys.slice(0, 2).join(" · ")} → ` : ""}{roleLabel(role)} → {repo?.fullName?.split("/").at(-1) || "연결 레포 없음"}
            </span>
          ))}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 970, borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ background: "#eef3fb" }}>
              {[["코드", 65], ["기능 / 구현 작업 / 레포", 285], ["담당자", 140], ["시작일", 105], ["종료일", 105], ["기간", 55], ["진척률", 105], ["GitHub", 75], ["", 35]].map(([label, width]) => (
                <th key={`${label}-${width}`} style={{ width, padding: "9px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "left", fontSize: 10, letterSpacing: ".02em", color: C.muted, fontWeight: 750 }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(({ feature, index }) => {
              const tasks = feature.implementationTasks;
              const recommendedRoles = inferFeatureRoles(feature, techStack, repos);
              const automaticPlacements = recommendRepositoriesForFeature(feature, techStack, repos);
              const usedRepoIds = new Set(tasks.map(task => String(task.repoId)).filter(Boolean));
              const canAutoPlace = automaticPlacements.some(({ repo }) => !usedRepoIds.has(String(repo.id)));
              const missingRoleLabels = recommendedRoles
                .filter(role => !recommendRepository(repos, role))
                .map(roleLabel);
              const parentProgress = aggregateProgress(tasks, issueMap);
              const starts = tasks.map(task => task.startDate).filter(Boolean).sort();
              const ends = tasks.map(task => task.endDate).filter(Boolean).sort();
              const parentStart = starts[0] ?? "";
              const parentEnd = ends.at(-1) ?? "";
              const completedIssues = tasks.filter(task => progressFromIssue(task,
                issueMap.get(`${task.repoId}-${task.githubIssueNumber}`)).value === 100).length;
              return (
                <Fragment key={`${feature.featureKey}-${index}`}>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#f8fafc" }}>
                    <td style={{ padding: "11px 10px", fontSize: 11, fontWeight: 800, color: "#334155" }}>F-{String(index + 1).padStart(2, "0")}</td>
                    <td style={{ padding: "10px" }}>
                      <div title={feature.name} style={{ fontSize: 12, fontWeight: 750, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feature.name}</div>
                      <div style={{ marginTop: 5, color: missingRoleLabels.length ? "#b45309" : C.sub, fontSize: 9.5, lineHeight: 1.45 }}>
                        추천 역할 · {recommendedRoles.map(roleLabel).join(" · ") || "공통"}{missingRoleLabels.length ? ` · 연결 레포 없음: ${missingRoleLabels.join(", ")}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                        <button type="button" disabled={!canEdit || !canAutoPlace} title={!canAutoPlace ? (missingRoleLabels.length ? "추천 역할의 연결 레포가 없습니다." : "추천 레포 작업이 이미 배치됐습니다.") : ""} onClick={() => onAddRepoTasks(index)} style={{ padding: "4px 7px", borderRadius: 6, border: "1px solid rgba(37,99,235,.2)", background: "#eff6ff", color: "#2563eb", fontSize: 9, fontWeight: 700, cursor: !canEdit || !canAutoPlace ? "not-allowed" : "pointer", fontFamily: "inherit" }}>PRD 기준 자동 배치</button>
                        <button type="button" disabled={!canEdit} onClick={() => onAddTask(index)} style={{ padding: "4px 7px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 9, fontWeight: 700, cursor: canEdit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>+ 구현 작업</button>
                      </div>
                    </td>
                    <td style={{ padding: "10px", fontSize: 10, color: C.muted }}>{new Set(tasks.map(task => task.ownerMemberId).filter(Boolean)).size}명</td>
                    <td style={{ padding: "10px", fontSize: 10, color: C.muted }}>{parentStart || "—"}</td>
                    <td style={{ padding: "10px", fontSize: 10, color: C.muted }}>{parentEnd || "—"}</td>
                    <td style={{ padding: "10px", textAlign: "center", fontSize: 10, color: C.muted }}>{durationDays(parentStart, parentEnd) ?? "—"}{parentStart && parentEnd ? "일" : ""}</td>
                    <td style={{ padding: "10px" }}><ProgressCell progress={parentProgress} /></td>
                    <td style={{ padding: "10px", textAlign: "center", fontSize: 10, fontWeight: 700, color: parentProgress.color }}>{completedIssues}/{tasks.length}</td>
                    <td />
                  </tr>

                  {tasks.length === 0 && (
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td />
                      <td colSpan={8} style={{ padding: "13px 10px", fontSize: 11, color: C.sub }}>구현 작업이 없습니다. PRD 기준 자동 배치로 추천 작업을 만들거나 직접 추가하세요.</td>
                    </tr>
                  )}

                  {tasks.map((task, taskIndex) => {
                    const issue = issueMap.get(`${task.repoId}-${task.githubIssueNumber}`);
                    const progress = progressFromIssue(task, issue);
                    const issueUrl = issue?.htmlUrl || task.githubIssueUrl;
                    const isCreating = creatingIssueKeys.has(task.taskKey);
                    const owner = members.find(member => String(member.memberId) === String(task.ownerMemberId));
                    const recommendedRepo = recommendRepository(repos, task.type);
                    const orderedRepos = recommendedRepo
                      ? [recommendedRepo, ...repos.filter(repo => String(repo.id) !== String(recommendedRepo.id))]
                      : repos;
                    const selectedRepoIsRecommended = recommendedRepo && String(recommendedRepo.id) === String(task.repoId);
                    return (
                      <tr key={task.taskKey} style={{ borderBottom: `1px solid ${C.border}`, background: C.card, verticalAlign: "top" }}>
                        <td style={{ padding: "13px 10px", fontSize: 10, fontWeight: 700, color: C.sub }}>F-{String(index + 1).padStart(2, "0")}.{taskIndex + 1}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <input value={task.name} disabled={!canEdit} onChange={event => onTaskUpdate(index, taskIndex, "name", event.target.value)} aria-label={`${feature.name} ${taskIndex + 1} 구현 작업명`} style={{ ...scheduleInputStyle, fontWeight: 650, marginBottom: 5 }} />
                          <div style={{ display: "grid", gridTemplateColumns: "104px minmax(0, 1fr)", gap: 5 }}>
                            <select value={task.type} disabled={!canEdit || !!task.githubIssueNumber} onChange={event => onTaskUpdate(index, taskIndex, "type", event.target.value)} aria-label={`${task.name} 작업 유형`} style={scheduleInputStyle}>
                              {Object.entries(TASK_TYPE_META).map(([type, meta]) => <option key={type} value={type}>{meta.label}</option>)}
                            </select>
                            <select value={task.repoId} disabled={!canEdit || !!task.githubIssueNumber} onChange={event => onTaskUpdate(index, taskIndex, "repoId", event.target.value)} aria-label={`${task.name} GitHub 저장소`} style={scheduleInputStyle}>
                              <option value="">레포 미지정</option>
                              {orderedRepos.map(repo => <option key={repo.id} value={repo.id}>{recommendedRepo && String(repo.id) === String(recommendedRepo.id) ? "추천 · " : ""}{roleLabel(taskTypeFromRepo(repo))} · {repo.fullName}</option>)}
                            </select>
                          </div>
                          {recommendedRepo && (
                            <div style={{ marginTop: 5, color: selectedRepoIsRecommended ? "#2563eb" : C.sub, fontSize: 9 }}>
                              {selectedRepoIsRecommended ? "PRD·작업 유형에 맞는 추천 레포" : `추천 레포: ${recommendedRepo.fullName}`}
                            </div>
                          )}
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 9, color: C.sub, cursor: canEdit ? "pointer" : "default" }}>
                            <input type="checkbox" checked={task.required !== false} disabled={!canEdit} onChange={event => onTaskUpdate(index, taskIndex, "required", event.target.checked)} /> 필수 작업
                          </label>
                        </td>
                        <td style={{ padding: "8px 7px" }}>
                          <select value={task.ownerMemberId} onChange={event => onTaskUpdate(index, taskIndex, "ownerMemberId", event.target.value)} disabled={!canEdit} aria-label={`${task.name} 담당자`} style={scheduleInputStyle}>
                            <option value="">미지정</option>
                            {members.map(member => <option key={member.memberId} value={member.memberId}>{member.displayName}{member.githubLogin ? ` (@${member.githubLogin})` : ""}</option>)}
                          </select>
                          {owner && <div style={{ fontSize: 9, marginTop: 5, color: owner.githubLogin ? "#059669" : "#d97706" }}>{owner.githubLogin ? `Issue 담당자 @${owner.githubLogin}` : "GitHub 계정 미등록 · 미할당 생성"}</div>}
                        </td>
                        <td style={{ padding: "8px 7px" }}><input type="date" value={task.startDate} disabled={!canEdit} onInput={event => onTaskUpdate(index, taskIndex, "startDate", event.currentTarget.value)} aria-label={`${task.name} 시작일`} style={scheduleInputStyle} /></td>
                        <td style={{ padding: "8px 7px" }}><input type="date" value={task.endDate} disabled={!canEdit} onInput={event => onTaskUpdate(index, taskIndex, "endDate", event.currentTarget.value)} aria-label={`${task.name} 종료일`} style={scheduleInputStyle} /></td>
                        <td style={{ padding: "13px 8px", textAlign: "center", fontSize: 10, color: C.muted }}>{durationDays(task.startDate, task.endDate) == null ? "—" : `${durationDays(task.startDate, task.endDate)}일`}</td>
                        <td style={{ padding: "13px 10px" }}><ProgressCell progress={progress} /></td>
                        <td style={{ padding: "11px 7px", textAlign: "center" }}>
                          {task.githubIssueNumber ? (
                            <a href={issueUrl || "#"} target={issueUrl ? "_blank" : undefined} rel="noreferrer" style={{ display: "inline-flex", padding: "5px 8px", borderRadius: 7, textDecoration: "none", background: progress.background, color: progress.color, fontSize: 11, fontWeight: 750 }}>#{task.githubIssueNumber}</a>
                          ) : (
                            <button type="button" onClick={() => onCreateIssue(index, taskIndex)} disabled={!canCreateIssues || !task.repoId || isCreating || bulkCreating} title={!task.repoId ? "작업 레포를 먼저 지정하세요." : !canCreateIssues ? "Issue 생성은 프로젝트 PM만 가능합니다." : ""} style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 9, fontWeight: 700, cursor: !canCreateIssues || !task.repoId || isCreating ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{isCreating ? "생성 중…" : "Issue 생성"}</button>
                          )}
                        </td>
                        <td style={{ padding: "10px 5px", textAlign: "center" }}>
                          <button type="button" disabled={!canEdit || !!task.githubIssueNumber} onClick={() => onRemoveTask(index, taskIndex)} title={task.githubIssueNumber ? "연결된 Issue가 있는 작업은 삭제할 수 없습니다." : "구현 작업 삭제"} style={{ border: "none", background: "transparent", color: task.githubIssueNumber ? "#cbd5e1" : "#ef4444", fontSize: 14, cursor: !canEdit || task.githubIssueNumber ? "not-allowed" : "pointer" }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FeaturePlanningCard({
  feature, index, members, repos, issueMap, techStack,
  canEdit, canCreateIssues, creatingIssueKeys, bulkCreating,
  onFeatureUpdate, onTaskUpdate, onAddTask, onAddRepoTasks, onRemoveTask,
  onCreateIssue, onCreateFeatureIssues,
}) {
  const requirements = asList(feature.requirements);
  const tasks = feature.implementationTasks;
  const progress = aggregateProgress(tasks, issueMap);
  const recommendedRoles = inferFeatureRoles(feature, techStack, repos);
  const placements = recommendRepositoriesForFeature(feature, techStack, repos);
  const usedRepoIds = new Set(tasks.map(task => String(task.repoId)).filter(Boolean));
  const canAutoPlace = placements.some(({ repo }) => !usedRepoIds.has(String(repo.id)));
  const missingRoles = recommendedRoles
    .filter(role => !recommendRepository(repos, role))
    .map(roleLabel);
  const missingIssueRefs = tasks.map((task, taskIndex) => ({
    featureIndex: index,
    taskIndex,
    task,
  })).filter(({ task }) => task.repoId && !task.githubIssueNumber);

  const updateFeature = (field, value) => onFeatureUpdate(index, {
    ...feature,
    [field]: value,
  });

  const updateRequirement = (requirementIndex, value) => {
    const next = [...requirements];
    next[requirementIndex] = value;
    updateFeature("requirements", next);
  };

  const removeRequirement = requirementIndex => {
    updateFeature("requirements", requirements.filter((_, currentIndex) => currentIndex !== requirementIndex));
  };

  return (
    <section className="feature-planning-card" style={{
      marginBottom: 18,
      border: "1px solid rgba(15,23,42,.09)",
      borderRadius: 16,
      background: C.card,
      boxShadow: "0 8px 28px rgba(15,23,42,.045)",
      overflow: "hidden",
      containerType: "inline-size",
      containerName: "feature-card",
    }}>
      <div className="feature-card-header" style={{
        display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
        borderBottom: `1px solid ${C.border}`, background: "linear-gradient(135deg, #fbfcfe 0%, #f7f6f3 100%)",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#111827", color: "#fff", fontSize: 13, fontWeight: 850,
          letterSpacing: ".04em",
        }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="feature-card-title" style={{ flex: 1, minWidth: 0 }}>
          <input
            value={feature.name}
            disabled={!canEdit}
            onChange={event => updateFeature("name", event.target.value)}
            aria-label={`${String(index + 1).padStart(2, "0")} 기능명`}
            style={{
              width: "100%", padding: 0, border: "none", outline: "none", background: "transparent",
              color: C.text, fontFamily: "inherit", fontSize: 16, fontWeight: 800,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{ color: C.sub, fontSize: 10.5 }}>
              구현 작업 {tasks.length}개 · Issue {tasks.filter(task => task.githubIssueNumber).length}개
            </span>
            {recommendedRoles.map(role => (
              <span key={role} style={{
                padding: "3px 7px", borderRadius: 999, background: "#eef2ff",
                color: "#4f46e5", fontSize: 9, fontWeight: 750,
              }}>{roleLabel(role)}</span>
            ))}
            {missingRoles.length > 0 && (
              <span style={{ color: "#b45309", fontSize: 9.5 }}>연결 레포 필요: {missingRoles.join(", ")}</span>
            )}
          </div>
        </div>
        {feature.priority && <PriorityBadge priority={feature.priority} />}
        <div className="feature-card-progress" style={{ width: 132, flexShrink: 0 }}><ProgressCell progress={progress} /></div>
      </div>

      <div className="feature-card-body" style={{ padding: "18px 20px 20px", minWidth: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.sub, marginBottom: 7, letterSpacing: ".06em" }}>기능 설명</div>
            <textarea
              value={feature.description}
              disabled={!canEdit}
              onChange={event => updateFeature("description", event.target.value)}
              placeholder="이 기능이 해결하는 문제와 동작을 적어주세요."
              rows={4}
              style={{
                ...scheduleInputStyle, minHeight: 98, resize: "vertical", fontSize: 12,
                lineHeight: 1.6, padding: "10px 11px",
              }}
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.sub, letterSpacing: ".06em" }}>요구사항 {requirements.length}개</div>
              {canEdit && (
                <button type="button" onClick={() => updateFeature("requirements", [...requirements, ""])} style={{
                  border: "none", background: "transparent", color: "#2563eb", padding: 0,
                  fontFamily: "inherit", fontSize: 10, fontWeight: 750, cursor: "pointer",
                }}>+ 요구사항</button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {requirements.length === 0 && (
                <div style={{
                  minHeight: 98, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px dashed ${C.accentBdr}`, borderRadius: 9, color: C.sub, fontSize: 11,
                }}>등록된 요구사항이 없습니다.</div>
              )}
              {requirements.map((requirement, requirementIndex) => (
                <div key={`${feature.featureKey}-requirement-${requirementIndex}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 800 }}>✓</span>
                  <input
                    value={requirement}
                    disabled={!canEdit}
                    onChange={event => updateRequirement(requirementIndex, event.target.value)}
                    aria-label={`${feature.name} 요구사항 ${requirementIndex + 1}`}
                    placeholder="완료 조건이나 필요한 동작을 입력하세요."
                    style={{ ...scheduleInputStyle, flex: 1, fontSize: 11.5 }}
                  />
                  {canEdit && (
                    <button type="button" onClick={() => removeRequirement(requirementIndex)} aria-label="요구사항 삭제" style={{
                      width: 25, height: 25, borderRadius: 7, border: `1px solid ${C.border}`,
                      background: C.card, color: "#ef4444", cursor: "pointer",
                    }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>구현 작업 · 담당자 · 일정 · GitHub</div>
              <div style={{ marginTop: 4, color: C.sub, fontSize: 10.5 }}>
                필요한 레포별 작업을 만든 뒤 담당자와 일정을 지정하세요. Issue 상태로 진척률이 자동 반영됩니다.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!canEdit || !canAutoPlace}
                onClick={() => onAddRepoTasks(index)}
                title={!canAutoPlace ? "추천 레포 작업이 이미 배치됐거나 연결된 레포가 없습니다." : "PRD 기술 스택과 기능 내용으로 필요한 레포를 자동 배치합니다."}
                style={{
                  padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(37,99,235,.2)",
                  background: "#eff6ff", color: "#2563eb", fontSize: 10, fontWeight: 750,
                  cursor: !canEdit || !canAutoPlace ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: !canEdit || !canAutoPlace ? .55 : 1,
                }}
              >필요 레포 자동 배치</button>
              <button type="button" disabled={!canEdit} onClick={() => onAddTask(index)} style={{
                padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.card, color: C.muted, fontSize: 10, fontWeight: 750,
                cursor: canEdit ? "pointer" : "not-allowed", fontFamily: "inherit",
              }}>+ 작업 직접 추가</button>
              {canCreateIssues && missingIssueRefs.length > 1 && (
                <button type="button" disabled={bulkCreating} onClick={() => onCreateFeatureIssues(missingIssueRefs)} style={{
                  padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(5,150,105,.22)",
                  background: "#ecfdf5", color: "#047857", fontSize: 10, fontWeight: 800,
                  cursor: bulkCreating ? "wait" : "pointer", fontFamily: "inherit",
                }}>{bulkCreating ? "Issue 생성 중…" : `이 기능 Issue ${missingIssueRefs.length}개 생성`}</button>
              )}
            </div>
          </div>

          {tasks.length === 0 && (
            <div style={{
              padding: "24px 16px", borderRadius: 10, border: `1px dashed ${C.accentBdr}`,
              background: "#fcfcfb", textAlign: "center", color: C.sub, fontSize: 11,
            }}>
              구현 작업이 없습니다. <b style={{ color: "#2563eb" }}>필요 레포 자동 배치</b>를 누르면 이 기능에 맞는 작업이 바로 추가됩니다.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {tasks.map((task, taskIndex) => {
              const issue = issueMap.get(`${task.repoId}-${task.githubIssueNumber}`);
              const taskProgress = progressFromIssue(task, issue);
              const issueUrl = issue?.htmlUrl || task.githubIssueUrl;
              const owner = members.find(member => String(member.memberId) === String(task.ownerMemberId));
              const recommendedRepo = recommendRepository(repos, task.type);
              const orderedRepos = recommendedRepo
                ? [recommendedRepo, ...repos.filter(repo => String(repo.id) !== String(recommendedRepo.id))]
                : repos;
              const isCreating = creatingIssueKeys.has(task.taskKey);
              return (
                <div key={task.taskKey} className="feature-task-card" style={{
                  display: "grid",
                  gridTemplateColumns: "42px repeat(2, minmax(0, 1fr)) 30px",
                  gridTemplateAreas: '"code task task remove" ". repo owner ." ". schedule status ."',
                  gap: 9, alignItems: "start", padding: "12px", borderRadius: 11,
                  border: `1px solid ${C.border}`, background: "#fcfcfb",
                }}>
                  <div style={{ gridArea: "code", paddingTop: 8, color: "#64748b", fontSize: 10, fontWeight: 850 }}>
                    {String(index + 1).padStart(2, "0")}.{taskIndex + 1}
                  </div>
                  <div style={{ gridArea: "task" }}>
                    <input
                      value={task.name}
                      disabled={!canEdit}
                      onChange={event => onTaskUpdate(index, taskIndex, "name", event.target.value)}
                      aria-label={`${feature.name} ${taskIndex + 1} 구현 작업명`}
                      style={{ ...scheduleInputStyle, fontWeight: 700, marginBottom: 6 }}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "115px minmax(0, 1fr)", gap: 6 }}>
                      <select
                        value={task.type}
                        disabled={!canEdit || !!task.githubIssueNumber}
                        onChange={event => onTaskUpdate(index, taskIndex, "type", event.target.value)}
                        aria-label={`${task.name} 작업 유형`}
                        style={scheduleInputStyle}
                      >
                        {Object.entries(TASK_TYPE_META).map(([type, meta]) => <option key={type} value={type}>{meta.label}</option>)}
                      </select>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.sub, fontSize: 9.5 }}>
                        <input type="checkbox" checked={task.required !== false} disabled={!canEdit} onChange={event => onTaskUpdate(index, taskIndex, "required", event.target.checked)} /> 필수 작업
                      </label>
                    </div>
                  </div>
                  <div style={{ gridArea: "repo" }}>
                    <div style={{ marginBottom: 5, color: C.sub, fontSize: 9, fontWeight: 750 }}>대상 레포</div>
                    <select
                      value={task.repoId}
                      disabled={!canEdit || !!task.githubIssueNumber}
                      onChange={event => onTaskUpdate(index, taskIndex, "repoId", event.target.value)}
                      aria-label={`${task.name} GitHub 저장소`}
                      style={scheduleInputStyle}
                    >
                      <option value="">레포를 선택하세요</option>
                      {orderedRepos.map(repo => (
                        <option key={repo.id} value={repo.id}>
                          {recommendedRepo && String(repo.id) === String(recommendedRepo.id) ? "추천 · " : ""}{repo.fullName}
                        </option>
                      ))}
                    </select>
                    {recommendedRepo && !task.githubIssueNumber && (
                      <div style={{ marginTop: 5, color: String(recommendedRepo.id) === String(task.repoId) ? "#2563eb" : C.sub, fontSize: 8.5 }}>
                        {String(recommendedRepo.id) === String(task.repoId) ? "PRD에 맞는 추천 레포" : `추천: ${recommendedRepo.fullName}`}
                      </div>
                    )}
                  </div>
                  <div style={{ gridArea: "owner" }}>
                    <div style={{ marginBottom: 5, color: C.sub, fontSize: 9, fontWeight: 750 }}>담당자</div>
                    <select
                      value={task.ownerMemberId}
                      disabled={!canEdit}
                      onChange={event => onTaskUpdate(index, taskIndex, "ownerMemberId", event.target.value)}
                      aria-label={`${task.name} 담당자`}
                      style={scheduleInputStyle}
                    >
                      <option value="">미지정</option>
                      {members.map(member => (
                        <option key={member.memberId} value={member.memberId}>
                          {member.displayName}{member.githubLogin ? ` (@${member.githubLogin})` : ""}
                        </option>
                      ))}
                    </select>
                    {owner && <div style={{ marginTop: 5, color: owner.githubLogin ? "#059669" : "#d97706", fontSize: 8.5 }}>
                      {owner.githubLogin ? `Issue에 @${owner.githubLogin} 지정` : "GitHub 계정 미등록 · 미할당 생성"}
                    </div>}
                  </div>
                  <div style={{ gridArea: "schedule" }}>
                    <div style={{ marginBottom: 5, color: C.sub, fontSize: 9, fontWeight: 750 }}>일정</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(120px, 100%), 1fr))", gap: 6 }}>
                      <input type="date" value={task.startDate} disabled={!canEdit} onInput={event => onTaskUpdate(index, taskIndex, "startDate", event.currentTarget.value)} aria-label={`${task.name} 시작일`} style={scheduleInputStyle} />
                      <input type="date" value={task.endDate} disabled={!canEdit} onInput={event => onTaskUpdate(index, taskIndex, "endDate", event.currentTarget.value)} aria-label={`${task.name} 종료일`} style={scheduleInputStyle} />
                    </div>
                    <div style={{ marginTop: 5, color: C.sub, fontSize: 8.5 }}>
                      {durationDays(task.startDate, task.endDate) == null ? "시작일과 종료일을 선택하세요." : `${durationDays(task.startDate, task.endDate)}일 일정`}
                    </div>
                  </div>
                  <div style={{ gridArea: "status", paddingTop: 3 }}>
                    <ProgressCell progress={taskProgress} />
                    <div style={{ marginTop: 9 }}>
                      {task.githubIssueNumber ? (
                        <a href={issueUrl || "#"} target={issueUrl ? "_blank" : undefined} rel="noreferrer" style={{
                          display: "flex", justifyContent: "center", padding: "7px 9px", borderRadius: 8,
                          textDecoration: "none", background: taskProgress.background, color: taskProgress.color,
                          fontSize: 10, fontWeight: 800,
                        }}>Issue #{task.githubIssueNumber} ↗</a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCreateIssue(index, taskIndex)}
                          disabled={!canCreateIssues || !task.repoId || isCreating || bulkCreating}
                          title={!task.repoId ? "대상 레포를 먼저 선택하세요." : !canCreateIssues ? "Issue 생성은 프로젝트 PM만 가능합니다." : "선택한 레포에 Issue를 생성합니다."}
                          style={{
                            width: "100%", padding: "7px 8px", borderRadius: 8,
                            border: "1px solid rgba(37,99,235,.22)", background: "#eff6ff", color: "#2563eb",
                            fontFamily: "inherit", fontSize: 10, fontWeight: 800,
                            cursor: !canCreateIssues || !task.repoId || isCreating ? "not-allowed" : "pointer",
                            opacity: !canCreateIssues || !task.repoId ? .55 : 1,
                          }}
                        >{isCreating ? "생성 중…" : "Issue 생성"}</button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit || !!task.githubIssueNumber}
                    onClick={() => onRemoveTask(index, taskIndex)}
                    title={task.githubIssueNumber ? "연결된 Issue가 있는 작업은 삭제할 수 없습니다." : "구현 작업 삭제"}
                    aria-label={`${task.name} 삭제`}
                    style={{
                      gridArea: "remove",
                      width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.card, color: task.githubIssueNumber ? "#cbd5e1" : "#ef4444",
                      cursor: !canEdit || task.githubIssueNumber ? "not-allowed" : "pointer",
                    }}
                  >×</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════
   피처 목록 → 텍스트 (AI 컨텍스트용)
══════════════════════════════════════ */
function featuresToText(coreFeatures, simpleList) {
  if (coreFeatures?.length) {
    return coreFeatures.map((f, i) => {
      const reqs = asList(f.requirements).map(r => `  - ${r}`).join("\n");
      const tasks = (f.implementationTasks ?? []).map((task, taskIndex) =>
        `  ${i + 1}.${taskIndex + 1} ${task.name} (${TASK_TYPE_META[task.type]?.label ?? task.type}, 담당: ${task.ownerMemberId || "미정"})`).join("\n");
      return `${i + 1}. ${f.name} [${f.priority || ""}]\n${f.description || ""}\n${reqs}\n${tasks}`;
    }).join("\n\n");
  }
  if (simpleList?.length) {
    return simpleList.map((n, i) => `${i + 1}. ${n}`).join("\n");
  }
  return "";
}

/* ══════════════════════════════════════
   FEATURES PANEL (exported)
══════════════════════════════════════ */
export function FeaturesPanel({ project, readOnly = false, onDocumentSaved, onDocumentEditingChange }) {
  const { user } = useAuth();
  const [search,          setSearch]          = useState("");
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [editedFeatures,  setEditedFeatures]  = useState([]);
  const [members,         setMembers]         = useState([]);
  const [repos,           setRepos]           = useState([]);
  const [issues,          setIssues]          = useState([]);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningError,   setPlanningError]   = useState("");
  const [creatingIssueKeys, setCreatingIssueKeys] = useState(new Set());
  const [bulkCreating,    setBulkCreating]    = useState(false);
  const savedFeaturesRef = useRef([]);

  const coreFeatures = useMemo(() => {
    // featureList가 객체 배열이면 우선 사용 (사용자가 저장한 데이터)
    const list = project?.featureList;
    if (Array.isArray(list) && list.length > 0 && typeof list[0] === "object")
      return list.map(normalizeFeature);
    // prdDocument.coreFeatures 폴백
    const doc = project?.prdDocument;
    if (doc && Array.isArray(doc.coreFeatures) && doc.coreFeatures.length > 0)
      return doc.coreFeatures.map(normalizeFeature);
    // 상세 PRD가 없는 기존 프로젝트의 문자열 기능 목록도 동일한 작업 모델로 승격한다.
    if (Array.isArray(list) && list.length > 0) return list.map(normalizeFeature);
    return [];
  }, [project?.featureList, project?.prdDocument]);

  // 프로젝트 변경 또는 데이터 로드 완료 시 편집 상태 동기화
  useEffect(() => {
    const nextFeatures = cloneFeatures(coreFeatures);
    setEditedFeatures(nextFeatures);
    savedFeaturesRef.current = cloneFeatures(nextFeatures);
  }, [project?.id, coreFeatures]);

  useEffect(() => {
    const isEditing = JSON.stringify(editedFeatures) !== JSON.stringify(savedFeaturesRef.current);
    onDocumentEditingChange?.("FEATURE_LIST", isEditing);
  }, [editedFeatures, onDocumentEditingChange]);

  const loadPlanningContext = useCallback(async () => {
    if (!project?.id) return;
    setPlanningLoading(true);
    setPlanningError("");
    try {
      const [projectMembers, workspace] = await Promise.all([
        fetchProjectMembers(project.id),
        project.teamId ? getTeamWorkspace(project.teamId).catch(() => null) : Promise.resolve(null),
      ]);
      const teamMembers = workspace?.members ?? [];
      setMembers(projectMembers.map(member => {
        const detail = teamMembers.find(item => String(item.memberId) === String(member.memberId));
        return {
          ...member,
          displayName: detail?.memberName ?? detail?.email ?? `멤버 ${member.memberId}`,
          email: detail?.email ?? "",
          githubLogin: detail?.githubLogin ?? "",
        };
      }));

      const [repoResult, issueResult] = await Promise.allSettled([
        fetchProjectRepositories(project.id),
        fetchProjectIssues(project.id),
      ]);
      const nextRepos = repoResult.status === "fulfilled" ? repoResult.value : [];
      const nextIssues = issueResult.status === "fulfilled" ? issueResult.value : [];
      setRepos(nextRepos);
      setIssues(nextIssues);
      if (repoResult.status === "rejected" || issueResult.status === "rejected") {
        const reason = repoResult.status === "rejected" ? repoResult.reason : issueResult.reason;
        setPlanningError(reason instanceof Error ? reason.message : "GitHub 연동 정보를 불러오지 못했습니다.");
      }
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "일정 관리 정보를 불러오지 못했습니다.");
    } finally {
      setPlanningLoading(false);
    }
  }, [project?.id, project?.teamId]);

  useEffect(() => { loadPlanningContext(); }, [loadPlanningContext]);

  // GitHub에서 issue가 닫히거나 다시 열리면 사용자가 문서를 편집하지 않아도 진척률을 갱신한다.
  useEffect(() => {
    if (!project?.id) return undefined;
    const intervalId = window.setInterval(() => {
      fetchProjectIssues(project.id).then(setIssues).catch(() => {});
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [project?.id]);

  const issueMap = useMemo(() => new Map(
    issues.map(issue => [`${issue.repoId}-${issue.number}`, issue])
  ), [issues]);

  const myProjectRole = members.find(member => String(member.memberId) === String(user?.id))?.projectRole;
  const canCreateIssues = myProjectRole === "PM" && repos.length > 0;
  const projectTechStack = project?.prdDocument?.techStack && typeof project.prdDocument.techStack === "object"
    ? project.prdDocument.techStack
    : {};

  function handleFeatureUpdate(index, updated) {
    setEditedFeatures(prev => prev.map((feature, i) => i === index
      ? normalizeFeature(updated, index)
      : feature));
  }

  function handleTaskUpdate(featureIndex, taskIndex, field, value) {
    setEditedFeatures(prev => prev.map((feature, i) => i === featureIndex
      ? {
        ...feature,
        implementationTasks: feature.implementationTasks.map((task, j) => {
          if (j !== taskIndex) return task;
          if (field !== "type" || task.githubIssueNumber) return { ...task, [field]: value };
          const recommendedRepo = recommendRepository(repos, value);
          const defaultName = task.name === `${TASK_TYPE_META[task.type]?.label ?? task.type} 구현`;
          return {
            ...task,
            type: value,
            repoId: recommendedRepo ? String(recommendedRepo.id) : task.repoId,
            name: defaultName ? `${TASK_TYPE_META[value]?.label ?? value} 구현` : task.name,
          };
        }),
      }
      : feature));
  }

  /* 저장 대상과 내용을 결정한다.

     FEATURE_LIST 아티팩트가 있으면 거기에 기능 배열을 그대로 저장한다.
     없을 때 PRD 아티팩트로 폴백하는데, 예전에는 기능 배열을 PRD 아티팩트에
     통째로 덮어써서 PRD 문서 전체(개요·KPI·페르소나 등)가 날아갔다.
     PRD에 쓸 때는 반드시 문서 안의 coreFeatures 필드만 갱신해야 한다. */
  function buildSavePayload(list) {
    const featureListId = project?.artifactIds?.FEATURE_LIST;
    if (featureListId) {
      return { artifactId: featureListId, content: JSON.stringify(list) };
    }

    const prdId = project?.artifactIds?.PRD;
    const doc = project?.prdDocument;
    const isObjectList = list.length > 0 && typeof list[0] === "object";
    if (prdId && doc && typeof doc === "object" && isObjectList) {
      return { artifactId: prdId, content: JSON.stringify({ ...doc, coreFeatures: list }) };
    }
    return null;
  }

  function taskDraft(feature, taskIndex, repo = null, preferredType = null) {
    const type = preferredType && TASK_TYPE_META[preferredType] ? preferredType : taskTypeFromRepo(repo);
    return normalizeTask({
      taskKey: `${feature.featureKey}-task-${Date.now()}-${taskIndex + 1}`,
      name: `${TASK_TYPE_META[type].label} 구현`,
      type,
      repoId: repo?.id ?? "",
      required: true,
    }, feature.featureKey, taskIndex);
  }

  function handleAddTask(featureIndex) {
    setEditedFeatures(prev => prev.map((feature, index) => {
      if (index !== featureIndex) return feature;
      const usedRepoIds = new Set(feature.implementationTasks.map(task => String(task.repoId)).filter(Boolean));
      const recommendedRoles = inferFeatureRoles(feature, projectTechStack, repos);
      const recommended = recommendRepositoriesForFeature(feature, projectTechStack, repos)
        .find(({ repo }) => !usedRepoIds.has(String(repo.id)));
      const missingRole = recommendedRoles.find(role => !recommendRepository(repos, role));
      const preferredType = recommended?.role ?? missingRole ?? recommendedRoles[0] ?? "GENERAL";
      const repo = recommended?.repo ?? null;
      return {
        ...feature,
        implementationTasks: [...feature.implementationTasks,
          taskDraft(feature, feature.implementationTasks.length, repo, preferredType)],
      };
    }));
  }

  function handleAddRepoTasks(featureIndex) {
    setEditedFeatures(prev => prev.map((feature, index) => {
      if (index !== featureIndex) return feature;
      const usedRepoIds = new Set(feature.implementationTasks.map(task => String(task.repoId)).filter(Boolean));
      const recommendations = recommendRepositoriesForFeature(feature, projectTechStack, repos)
        .filter(({ repo }) => !usedRepoIds.has(String(repo.id)));
      if (recommendations.length === 0) return feature;
      const offset = feature.implementationTasks.length;
      return {
        ...feature,
        implementationTasks: [
          ...feature.implementationTasks,
          ...recommendations.map(({ repo, role }, repoIndex) => taskDraft(feature, offset + repoIndex, repo, role)),
        ],
      };
    }));
  }

  function handleRemoveTask(featureIndex, taskIndex) {
    setEditedFeatures(prev => prev.map((feature, index) => index === featureIndex ? {
      ...feature,
      implementationTasks: feature.implementationTasks.filter((_, currentIndex) => currentIndex !== taskIndex),
    } : feature));
  }

  function markSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  async function persistFeatures(features) {
    if (!project?.id) throw new Error("프로젝트가 선택되지 않았습니다.");

    /* FEATURE_LIST 아티팩트가 아직 없으면 PRD 아티팩트로 폴백한다.
       이때 buildSavePayload가 PRD 문서의 coreFeatures 필드만 갱신해 주므로
       PRD 전체(개요·KPI·페르소나 등)를 덮어쓰지 않는다. */
    if (!project?.artifactIds?.FEATURE_LIST) {
      const payload = buildSavePayload(features);
      if (!payload) {
        throw new Error("저장할 아티팩트를 찾을 수 없습니다. 파이프라인을 먼저 실행하세요.");
      }
      await updateArtifact(payload.artifactId, payload.content);
      return;
    }

    await saveProjectDocument(project.id, "FEATURE_LIST", JSON.stringify(features));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updatedIssues = await syncLinkedIssues(editedFeatures);
      await persistFeatures(editedFeatures);
      if (updatedIssues.length > 0) {
        setIssues(current => [
          ...updatedIssues,
          ...current.filter(issue => !updatedIssues.some(updated =>
            String(updated.repoId) === String(issue.repoId) && updated.number === issue.number
          )),
        ]);
      }
      savedFeaturesRef.current = cloneFeatures(editedFeatures);
      onDocumentEditingChange?.("FEATURE_LIST", false);
      onDocumentSaved?.({ sourceType: "FEATURE_LIST", document: editedFeatures });
      markSaved();
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ── AI 수정안 적용 ──
     기능 목록은 객체 배열(coreFeatures)만 지원한다.
     AI가 형태를 바꿔버리면 렌더링이 깨지므로(f.name이 undefined) 적용 전에 막는다. */
  async function handleApplyEdits(edits) {
    const edit = edits.find(e => e.section === "features");
    if (!edit || !Array.isArray(edit.after) || edit.after.length === 0) return;

    const next = edit.after;
    if (next.some(feature => typeof feature !== "object" || feature === null)) {
      throw new Error("AI가 기능 목록의 형식을 바꾸려 해서 적용하지 않았습니다. 다시 요청해 주세요.");
    }

    const payload = buildSavePayload(next);
    if (!payload) {
      throw new Error("저장 대상 기능 명세서를 찾을 수 없습니다. 파이프라인을 먼저 실행해 주세요.");
    }

    await updateArtifact(payload.artifactId, payload.content);
    savedFeaturesRef.current = cloneFeatures(next);
    setEditedFeatures(next.map(normalizeFeature));
    onDocumentEditingChange?.("FEATURE_LIST", false);
    onDocumentSaved?.({ sourceType: "FEATURE_LIST", document: next });
    markSaved();
  }

  const displayFeatures = coreFeatures ? editedFeatures : null;
  function memberName(memberId) {
    if (!memberId) return "미지정";
    return members.find(member => String(member.memberId) === String(memberId))?.displayName ?? `멤버 ${memberId}`;
  }

  function issueBody(feature, featureIndex, task, taskIndex) {
    const requirements = asList(feature.requirements);
    const duration = durationDays(task.startDate, task.endDate);
    const repoName = repos.find(repo => String(repo.id) === String(task.repoId))?.fullName ?? "미지정";
    return [
      "## 작업 요약",
      `**${task.name}**`,
      "",
      `> 상위 기능: F-${String(featureIndex + 1).padStart(2, "0")} ${feature.name}`,
      "",
      "### 기능 설명",
      feature.description || "상세 설명 없음",
      "",
      "### 요구사항",
      ...(requirements.length ? requirements.map(item => `- ${item}`) : ["- 등록된 요구사항 없음"]),
      "",
      "### 구현 범위",
      `- 작업 코드: F-${String(featureIndex + 1).padStart(2, "0")}.${taskIndex + 1}`,
      `- 작업 유형: ${TASK_TYPE_META[task.type]?.label ?? task.type}`,
      `- 대상 레포: ${repoName}`,
      `- 필수 여부: ${task.required === false ? "선택" : "필수"}`,
      "",
      "### 담당 및 일정",
      `- 담당자: ${memberName(task.ownerMemberId)}`,
      `- 시작일: ${task.startDate || "미정"}`,
      `- 종료일: ${task.endDate || "미정"}`,
      `- 기간: ${duration == null ? "미정" : `${duration}일`}`,
      "",
      "### 완료 조건",
      "- 구현 및 자체 검증을 완료합니다.",
      "- 관련 Pull Request에서 상위 기능 요구사항과의 정합성을 확인합니다.",
      "- 작업 완료 후 이 Issue를 닫으면 timiroom 진척률에 자동 반영됩니다.",
      "",
      "---",
      "timiroom 기능명세서에서 자동 생성된 Issue입니다.",
    ].join("\n");
  }

  function issueTitle(feature, task) {
    return `[${TASK_TYPE_META[task.type]?.label ?? "기능"}] ${feature.name} · ${task.name}`;
  }

  function issueUpdatePayload(feature, featureIndex, task, taskIndex) {
    return {
      title: issueTitle(feature, task),
      body: issueBody(feature, featureIndex, task, taskIndex),
      ownerMemberId: task.ownerMemberId ? Number(task.ownerMemberId) : null,
    };
  }

  async function syncLinkedIssues(features) {
    const savedByFeature = new Map(savedFeaturesRef.current.map(feature => [feature.featureKey, feature]));
    const updates = [];
    for (const [featureIndex, feature] of features.entries()) {
      const savedFeature = savedByFeature.get(feature.featureKey);
      for (const [taskIndex, task] of feature.implementationTasks.entries()) {
        if (!task.repoId || !task.githubIssueNumber) continue;
        const savedTask = savedFeature?.implementationTasks.find(candidate =>
          candidate.taskKey === task.taskKey || (
            String(candidate.repoId) === String(task.repoId)
            && candidate.githubIssueNumber === task.githubIssueNumber
          )
        );
        const payload = issueUpdatePayload(feature, featureIndex, task, taskIndex);
        const savedPayload = savedTask
          ? issueUpdatePayload(savedFeature, featureIndex, savedTask,
            savedFeature.implementationTasks.indexOf(savedTask))
          : null;
        if (savedPayload && JSON.stringify(savedPayload) === JSON.stringify(payload)) continue;
        updates.push({ task, payload });
      }
    }

    const updatedIssues = [];
    for (const { task, payload } of updates) {
      updatedIssues.push(await updateProjectIssue(
        project.id,
        Number(task.repoId),
        task.githubIssueNumber,
        payload,
      ));
    }
    return updatedIssues;
  }

  async function requestTaskIssue(feature, featureIndex, task, taskIndex) {
    return createProjectIssue(project.id, {
      repoId: Number(task.repoId),
      title: issueTitle(feature, task),
      body: issueBody(feature, featureIndex, task, taskIndex),
      labels: [],
      ownerMemberId: task.ownerMemberId ? Number(task.ownerMemberId) : null,
    });
  }

  function withCreatedIssue(features, featureIndex, taskIndex, created) {
    return features.map((feature, index) => index === featureIndex ? {
      ...feature,
      implementationTasks: feature.implementationTasks.map((task, currentTaskIndex) =>
        currentTaskIndex === taskIndex ? {
          ...task,
          repoId: String(created.repoId),
          githubIssueNumber: created.number,
          githubIssueUrl: created.htmlUrl ?? "",
          githubIssueState: created.state ?? "open",
        } : task),
    } : feature);
  }

  async function createTaskIssue(featureIndex, taskIndex) {
    const feature = editedFeatures[featureIndex];
    const task = feature?.implementationTasks?.[taskIndex];
    if (!feature || !task?.repoId || !canCreateIssues) return;
    setCreatingIssueKeys(current => new Set(current).add(task.taskKey));
    setPlanningError("");
    try {
      const created = await requestTaskIssue(feature, featureIndex, task, taskIndex);
      const nextFeatures = withCreatedIssue(editedFeatures, featureIndex, taskIndex, created);
      setEditedFeatures(nextFeatures);
      setIssues(current => [created, ...current.filter(issue =>
        !(String(issue.repoId) === String(created.repoId) && issue.number === created.number)
      )]);
      await persistFeatures(nextFeatures);
      savedFeaturesRef.current = cloneFeatures(nextFeatures);
      markSaved();
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Issue 생성에 실패했습니다.");
    } finally {
      setCreatingIssueKeys(current => {
        const next = new Set(current);
        next.delete(task.taskKey);
        return next;
      });
    }
  }

  async function createMissingIssues(taskRefs) {
    if (!canCreateIssues) return;
    setBulkCreating(true);
    setPlanningError("");
    let nextFeatures = [...editedFeatures];
    const createdIssues = [];
    let failure = null;
    try {
      for (const { featureIndex, taskIndex } of taskRefs) {
        const feature = nextFeatures[featureIndex];
        const task = feature?.implementationTasks?.[taskIndex];
        if (!feature || !task?.repoId || task.githubIssueNumber) continue;
        const created = await requestTaskIssue(feature, featureIndex, task, taskIndex);
        nextFeatures = withCreatedIssue(nextFeatures, featureIndex, taskIndex, created);
        createdIssues.push(created);
      }
    } catch (error) {
      failure = error;
    }

    try {
      if (createdIssues.length > 0) {
        setEditedFeatures(nextFeatures);
        setIssues(current => [...createdIssues, ...current]);
        await persistFeatures(nextFeatures);
        savedFeaturesRef.current = cloneFeatures(nextFeatures);
        markSaved();
      }
      if (failure) throw failure;
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Issue 일괄 생성에 실패했습니다.");
    } finally {
      setBulkCreating(false);
    }
  }

  const filteredEntries = useMemo(() => {
    const entries = editedFeatures.map((feature, index) => ({ feature, index }));
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(({ feature }) =>
      feature.name.toLowerCase().includes(q)
      || feature.description.toLowerCase().includes(q)
      || feature.implementationTasks.some(task => task.name.toLowerCase().includes(q))
    );
  }, [editedFeatures, search]);

  const total = editedFeatures.length;
  const currentContent = featuresToText(editedFeatures, null);
  const canSave = !readOnly && !!project?.id && editedFeatures.length > 0;

  return (
    <div className="features-panel-shell" style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      position: "relative", minWidth: 0, containerType: "inline-size", containerName: "features-panel",
    }}>
      {/* ── 왼쪽: 기능 목록 ── */}
      <div className="features-panel-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 헤더 */}
        <div className="features-panel-header" style={{
          height: 52, flexShrink: 0, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", padding: "0 28px",
          justifyContent: "space-between", background: C.surface,
        }}>
          <div className="features-panel-title" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
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
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>
                <span style={{ fontSize: 13, color: C.sub }}>›</span>
              </>
            )}
            <span style={{
              fontSize: 13, fontWeight: 500, color: "#a78bfa",
              padding: "2px 8px", borderRadius: 6,
              background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
            }}>기능 명세서</span>
            {total > 0 && (
              <span style={{
                fontSize: 11, color: C.muted, padding: "2px 8px", borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
              }}>{total}개</span>
            )}
          </div>

          <div className="features-panel-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saved && (
              <span style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 5,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399", fontWeight: 600,
              }}>✓ 저장됨</span>
            )}

            {/* 저장 버튼 */}
            {total > 0 && (
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                title={!canSave ? "현재 역할에서는 기능 명세를 저장할 수 없습니다" : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: canSave ? "rgba(96,165,250,0.12)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${canSave ? "rgba(96,165,250,0.35)" : "rgba(0,0,0,0.08)"}`,
                  color: canSave ? "#60a5fa" : "#9ca3af",
                  cursor: saving || !canSave ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1, transition: "all 0.15s",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                {saving ? "저장 중..." : "저장"}
              </button>
            )}

            {/* 검색 */}
            <div className="features-panel-search" style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="기능 검색..."
                style={{
                  padding: "7px 12px 7px 28px", width: 200,
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 8, fontSize: 12, color: C.text, outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div className="features-panel-content" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 28px 60px", minWidth: 0 }}>

            {total === 0 && <EmptyState />}

            {planningError && (
              <div style={{
                marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                border: "1px solid rgba(220,38,38,.2)", background: "rgba(254,242,242,.8)",
                color: "#dc2626", fontSize: 11,
              }}>{planningError}</div>
            )}

            {total > 0 && (
              filteredEntries.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontSize: 14 }}>검색 결과가 없습니다</div>
                : <>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    marginBottom: 14, padding: "12px 14px", borderRadius: 11,
                    border: `1px solid ${C.border}`, background: "#fbfcfe", flexWrap: "wrap",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>기능별 개발 계획</div>
                      <div style={{ marginTop: 3, color: C.sub, fontSize: 10.5 }}>
                        각 기능 아래에서 필요한 레포를 나누고 담당자·일정·Issue를 한 번에 관리합니다.
                      </div>
                    </div>
                    <button type="button" onClick={loadPlanningContext} disabled={planningLoading} style={{
                      padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.card, color: C.muted, fontFamily: "inherit", fontSize: 10, fontWeight: 750,
                      cursor: planningLoading ? "wait" : "pointer",
                    }}>{planningLoading ? "동기화 중…" : "GitHub 진척률 새로고침"}</button>
                  </div>
                  {filteredEntries.map(({ feature, index }) => (
                    <FeaturePlanningCard
                      key={`${feature.featureKey}-${index}`}
                      feature={feature}
                      index={index}
                      members={members}
                      repos={repos}
                      issueMap={issueMap}
                      techStack={projectTechStack}
                      canEdit={!readOnly}
                      canCreateIssues={!readOnly && canCreateIssues}
                      creatingIssueKeys={creatingIssueKeys}
                      bulkCreating={bulkCreating}
                      onFeatureUpdate={handleFeatureUpdate}
                      onTaskUpdate={handleTaskUpdate}
                      onAddTask={handleAddTask}
                      onAddRepoTasks={handleAddRepoTasks}
                      onRemoveTask={handleRemoveTask}
                      onCreateIssue={createTaskIssue}
                      onCreateFeatureIssues={createMissingIssues}
                    />
                  ))}
                </>
            )}
          </div>
        </div>
      </div>

      {/* ── 오른쪽: AI 채팅 ── */}
      <AiChatDock
        contextType="features"
        project={project}
        currentContent={currentContent}
        document={canSave && total > 0 ? { features: displayFeatures } : null}
        onApplyEdits={canSave && total > 0 ? handleApplyEdits : undefined}
      />
      <style>{`
        @container features-panel (max-width: 640px) {
          .features-panel-header {
            height: auto !important;
            min-height: 52px;
            padding: 9px 14px !important;
            align-items: center !important;
            gap: 8px;
            flex-wrap: wrap;
          }
          .features-panel-title { flex: 1; overflow: hidden; }
          .features-panel-title > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .features-panel-actions { width: 100%; }
          .features-panel-search { flex: 1; min-width: 100px; }
          .features-panel-search input { width: 100% !important; box-sizing: border-box; }
          .features-panel-content { padding: 14px 12px 44px !important; }
        }

        @container feature-card (max-width: 600px) {
          .feature-card-header { flex-wrap: wrap; padding: 14px !important; gap: 10px !important; }
          .feature-card-progress {
            width: calc(100% - 52px) !important;
            margin-left: 52px;
            box-sizing: border-box;
          }
          .feature-card-body { padding: 14px !important; }
          .feature-task-card {
            grid-template-columns: 34px minmax(0, 1fr) 30px !important;
            grid-template-areas:
              "code task remove"
              ". repo ."
              ". owner ."
              ". schedule ."
              ". status ." !important;
          }
        }

        @container feature-card (max-width: 380px) {
          .feature-card-header { align-items: flex-start !important; }
          .feature-card-title { width: calc(100% - 52px); flex-basis: calc(100% - 52px) !important; }
          .feature-card-progress { width: 100% !important; margin-left: 0; }
          .feature-task-card {
            grid-template-columns: minmax(0, 1fr) 30px !important;
            grid-template-areas:
              "code remove"
              "task task"
              "repo repo"
              "owner owner"
              "schedule schedule"
              "status status" !important;
          }
        }
      `}</style>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 0", gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
      }}>⚡</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1916", marginBottom: 6 }}>
          기능 명세가 없습니다
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>
          파이프라인을 실행하면 기능 목록이 자동으로 생성됩니다
        </div>
      </div>
    </div>
  );
}
