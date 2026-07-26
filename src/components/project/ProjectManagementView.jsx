"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProject,
  fetchProjectMembers,
  updateProject,
  deleteProject,
  updateProjectMemberRole,
  removeProjectMember,
  addProjectMember,
} from "@/lib/projectApi";
import { getTeamWorkspace } from "@/lib/teamApi";

/* ── 상수 ── */
const STATUS_OPTIONS = [
  { value: "PLANNING",    label: "기획 중" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "COMPLETED",   label: "완료"    },
];

const ROLE_OPTIONS = [
  { value: "PM",       label: "PM"         },
  { value: "BACKEND",  label: "백엔드"     },
  { value: "FRONTEND", label: "프론트엔드" },
  { value: "DESIGNER", label: "디자이너"   },
  { value: "INFRA",    label: "인프라"     },
];

function rawStatus(s) {
  const upper = String(s ?? "").toUpperCase();
  if (upper === "ACTIVE" || upper === "IN_PROGRESS") return "IN_PROGRESS";
  if (upper === "COMPLETED") return "COMPLETED";
  return "PLANNING";
}

function roleLabel(r) {
  return ROLE_OPTIONS.find(o => o.value === r)?.label ?? r;
}

const C = {
  bg:       "var(--bg)",
  surface:  "var(--surface)",
  border:   "var(--border)",
  border2:  "var(--border-2)",
  text1:    "var(--text-1)",
  text2:    "var(--text-2)",
  text3:    "var(--text-3)",
  radius:   "var(--db-radius, 12px)",
  radiusSm: "var(--db-radius-sm, 8px)",
};

/* ── UI 조각 ── */
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "2px solid var(--border)", borderTopColor: "var(--text-2)",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function FeedbackBanner({ feedback }) {
  if (!feedback) return null;
  const isErr = feedback.type === "error";
  return (
    <div style={{
      marginBottom: 16, padding: "12px 14px", borderRadius: 12,
      border: `1px solid ${isErr ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.18)"}`,
      background: C.surface, color: isErr ? "#dc2626" : "#059669",
      fontSize: 12, fontWeight: 700,
    }}>
      {feedback.message}
    </div>
  );
}

function SectionBox({ title, sRef, highlighted, children }) {
  return (
    <div
      ref={sRef}
      style={{
        marginBottom: 24, padding: "20px 24px", borderRadius: C.radius,
        border: `1px solid ${highlighted ? "rgba(26,25,22,0.22)" : C.border}`,
        background: C.surface, transition: "border-color 0.4s",
        scrollMarginTop: 104,
      }}
    >
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 800, color: C.text3,
          letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16,
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function QuickJumpBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px", borderRadius: 999,
        border: `1px solid ${active ? "rgba(26,25,22,0.16)" : "rgba(0,0,0,0.08)"}`,
        background: active ? "transparent" : C.surface,
        color: active ? C.text1 : C.text2,
        fontSize: 12, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6 }}>
      {children}
    </label>
  );
}

function TextInput({ label, value, onChange, multiline, rows = 3 }) {
  const base = {
    width: "100%", padding: "10px 12px", borderRadius: C.radiusSm,
    border: `1px solid ${C.border}`, background: C.surface,
    color: C.text1, fontSize: 13, fontFamily: "inherit",
    boxSizing: "border-box", outline: "none",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      {multiline
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} style={{ ...base, resize: "vertical" }} />
        : <input    type="text" value={value} onChange={e => onChange(e.target.value)} style={base} />
      }
    </div>
  );
}

function Btn({ onClick, disabled, loading, children, danger, secondary }) {
  const bg = danger    ? "rgba(254,242,242,0.8)"
           : secondary ? C.surface
           : disabled || loading ? C.border : C.text1;
  const fg = danger    ? "#dc2626"
           : secondary ? C.text2
           : disabled || loading ? C.text3 : "#fff";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "9px 18px", borderRadius: C.radiusSm,
        border: danger ? "1px solid rgba(239,68,68,0.3)" : secondary ? `1px solid ${C.border}` : "none",
        background: bg, color: fg, fontSize: 13, fontWeight: 700,
        cursor: disabled || loading ? "default" : "pointer",
        fontFamily: "inherit", transition: "all 0.15s",
      }}
    >
      {loading ? "처리 중…" : children}
    </button>
  );
}

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
export function ProjectManagementView({ projectId }) {
  const router = useRouter();
  const { user } = useAuth();
  const isScreenSpecView =
    typeof window !== "undefined" && window.location.pathname.startsWith("/screen-spec-capture/");

  /* ── 상태 ── */
  const [project,        setProject]        = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [teamMembers,    setTeamMembers]    = useState([]);
  const [teamName,       setTeamName]       = useState("");
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [feedback,       setFeedback]       = useState(null);

  const [nameDraft,   setNameDraft]   = useState("");
  const [descDraft,   setDescDraft]   = useState("");
  const [statusDraft, setStatusDraft] = useState("PLANNING");
  const [saving,      setSaving]      = useState(false);

  const [removingId,   setRemovingId]   = useState(null);
  const [changingRole, setChangingRole] = useState(null);
  const [addMemberId,  setAddMemberId]  = useState("");
  const [addRole,      setAddRole]      = useState("BACKEND");
  const [adding,       setAdding]       = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const [activeSection,      setActiveSection]      = useState("settings");
  const [highlightedSection, setHighlightedSection] = useState(null);
  const settingsRef = useRef(null);
  const membersRef  = useRef(null);
  const dangerRef   = useRef(null);
  const highlightTO = useRef(null);

  /* ── 데이터 로드 ── */
  const load = useCallback(async () => {
    if (isScreenSpecView) {
      const previewProject = {
        id: projectId,
        name: "Align-it MVP",
        description: "문서 변경사항과 연결 산출물을 함께 관리하는 프로젝트",
        status: "IN_PROGRESS",
        teamId: "screen-spec-workspace",
      };
      setProject(previewProject);
      setNameDraft(previewProject.name);
      setDescDraft(previewProject.description);
      setStatusDraft(previewProject.status);
      setProjectMembers([
        { memberId: "screen-spec-user", name: "최은솔", projectRole: "PM" },
        { memberId: "screen-spec-backend", name: "정하윤", projectRole: "BACKEND" },
        { memberId: "screen-spec-front", name: "김민서", projectRole: "FRONTEND" },
      ]);
      setTeamMembers([
        { memberId: "screen-spec-user", name: "최은솔" },
        { memberId: "screen-spec-backend", name: "정하윤" },
        { memberId: "screen-spec-front", name: "김민서" },
      ]);
      setTeamName("문서정합성 TF");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const proj = await fetchProject(projectId);
      if (!proj) { setError("프로젝트를 찾을 수 없습니다."); return; }

      setProject(proj);
      setNameDraft(proj.name ?? "");
      setDescDraft(proj.description ?? "");
      setStatusDraft(rawStatus(proj.status));

      const [members, workspace] = await Promise.all([
        fetchProjectMembers(projectId),
        proj.teamId ? getTeamWorkspace(proj.teamId).catch(() => null) : null,
      ]);

      setProjectMembers(Array.isArray(members) ? members : []);
      setTeamMembers(workspace?.members ?? []);
      setTeamName(workspace?.team?.teamName ?? workspace?.team?.name ?? "");
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [isScreenSpecView, projectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (highlightTO.current) clearTimeout(highlightTO.current); }, []);

  /* ── 현재 유저의 프로젝트 역할 ── */
  const myMemberId = user?.id ? String(user.id) : null;
  const myProjectRole = projectMembers.find(m => String(m.memberId) === myMemberId)?.projectRole ?? null;
  const isPm = myProjectRole === "PM";

  /* ── 탭 스크롤 ── */
  function focusSection(key) {
    const map = { settings: settingsRef, members: membersRef, danger: dangerRef };
    map[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(key);
    setHighlightedSection(key);
    if (highlightTO.current) clearTimeout(highlightTO.current);
    highlightTO.current = setTimeout(() => setHighlightedSection(null), 1600);
  }

  /* ── 저장 ── */
  async function handleSave() {
    try {
      setSaving(true);
      setFeedback(null);
      const updated = await updateProject(projectId, {
        projectName: nameDraft.trim(),
        description: descDraft.trim(),
        status:      statusDraft,
      });
      setProject(updated);
      setNameDraft(updated.name ?? nameDraft);
      setDescDraft(updated.description ?? descDraft);
      setStatusDraft(rawStatus(updated.status));
      setFeedback({ type: "success", message: "저장했어요." });
    } catch {
      setFeedback({ type: "error", message: "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  }

  /* ── 역할 변경 ── */
  async function handleRoleChange(targetMemberId, newRole) {
    try {
      setChangingRole(targetMemberId);
      await updateProjectMemberRole(projectId, targetMemberId, newRole);
      setProjectMembers(prev =>
        prev.map(m => String(m.memberId) === String(targetMemberId) ? { ...m, projectRole: newRole } : m)
      );
      setFeedback({ type: "success", message: "역할을 변경했어요." });
    } catch {
      setFeedback({ type: "error", message: "역할 변경에 실패했습니다." });
    } finally {
      setChangingRole(null);
    }
  }

  /* ── 멤버 제거 ── */
  async function handleRemoveMember(targetMemberId) {
    try {
      setRemovingId(targetMemberId);
      await removeProjectMember(projectId, targetMemberId);
      setProjectMembers(prev => prev.filter(m => String(m.memberId) !== String(targetMemberId)));
      setFeedback({ type: "success", message: "멤버를 제거했어요." });
    } catch {
      setFeedback({ type: "error", message: "멤버 제거에 실패했습니다." });
    } finally {
      setRemovingId(null);
    }
  }

  /* ── 멤버 추가 ── */
  async function handleAddMember() {
    if (!addMemberId) return;
    try {
      setAdding(true);
      await addProjectMember(projectId, Number(addMemberId), addRole);
      await load();
      setAddMemberId("");
      setFeedback({ type: "success", message: "멤버를 추가했어요." });
    } catch (e) {
      setFeedback({ type: "error", message: e.message ?? "멤버 추가에 실패했습니다." });
    } finally {
      setAdding(false);
    }
  }

  /* ── 삭제 ── */
  async function handleDelete() {
    try {
      setDeleting(true);
      await deleteProject(projectId);
      router.push("/dashboard");
    } catch {
      setFeedback({ type: "error", message: "삭제에 실패했습니다." });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  /* ── 데이터 합성 ── */
  const enrichedMembers = projectMembers.map(pm => {
    const tm = teamMembers.find(t => String(t.memberId) === String(pm.memberId));
    return { ...pm, displayName: tm?.memberName ?? "알 수 없음", email: tm?.email ?? "" };
  });

  const projectMemberIds = new Set(projectMembers.map(m => String(m.memberId)));
  const addableMembers   = teamMembers.filter(tm => !projectMemberIds.has(String(tm.memberId)));

  const hasChanges = project && (
    nameDraft.trim()   !== (project.name ?? "")        ||
    descDraft.trim()   !== (project.description ?? "") ||
    statusDraft        !== rawStatus(project.status)
  );

  /* ── 렌더 ── */
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "inherit" }}>

      {/* 상단 바 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10, height: 52,
        borderBottom: `1px solid ${C.border}`, background: C.surface,
        display: "flex", alignItems: "center", padding: "0 28px", gap: 10,
      }}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none",
            border: "none", cursor: "pointer", color: C.text3,
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.text1}
          onMouseLeave={e => e.currentTarget.style.color = C.text3}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          대시보드
        </button>
        <span style={{ fontSize: 13, color: C.text3 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>
          {loading ? "…" : (project?.name ?? "프로젝트")}
        </span>
        <span style={{ fontSize: 13, color: C.text3 }}>›</span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: C.text2,
          padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.border}`,
        }}>
          설정
        </span>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 48px" }}>
        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.text3, fontSize: 14 }}>
            {error}
          </div>
        )}

        {!loading && !error && project && (
          <>
            {/* ── 프로젝트 개요 헤더 ── */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 800, color: C.text1,
                margin: "0 0 8px",
                letterSpacing: "-.02em",
              }}>
                {project.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {myProjectRole && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: isPm ? "rgba(26,25,22,0.08)" : C.border,
                    color: isPm ? C.text1 : C.text2,
                  }}>
                    {roleLabel(myProjectRole)}
                  </span>
                )}
                {(() => {
                  const raw = rawStatus(project.status);
                  const meta = { PLANNING: { label: "기획 중", color: "#6B7280", bg: "rgba(107,114,128,0.1)" }, IN_PROGRESS: { label: "진행 중", color: "#2563EB", bg: "rgba(59,130,246,0.08)" }, COMPLETED: { label: "완료", color: "#059669", bg: "rgba(5,150,105,0.1)" } };
                  const m = meta[raw] ?? meta.PLANNING;
                  return (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: m.bg, color: m.color }}>
                      {m.label}
                    </span>
                  );
                })()}
                {teamName && (
                  <span style={{ fontSize: 12, color: C.text3 }}>· {teamName}</span>
                )}
              </div>
              {project.description && (
                <p style={{ fontSize: 13, color: C.text3, margin: 0, lineHeight: 1.6 }}>
                  {project.description}
                </p>
              )}
            </div>

            <FeedbackBanner feedback={feedback} />

            {/* 탭 네비게이션 */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
              {[
                { key: "settings", label: "기본 정보" },
                { key: "members",  label: "멤버"     },
                { key: "danger",   label: "위험 구역" },
              ].map(({ key, label }) => (
                <QuickJumpBtn key={key} active={activeSection === key} onClick={() => focusSection(key)}>
                  {label}
                </QuickJumpBtn>
              ))}
            </div>

            {/* ── 기본 정보 ── */}
            <SectionBox title="기본 정보" sRef={settingsRef} highlighted={highlightedSection === "settings"}>
              <TextInput label="프로젝트 이름" value={nameDraft} onChange={setNameDraft} />
              <TextInput label="설명" value={descDraft} onChange={setDescDraft} multiline rows={3} />

              <div style={{ marginBottom: 14 }}>
                <FieldLabel>상태</FieldLabel>
                <select
                  value={statusDraft}
                  onChange={e => setStatusDraft(e.target.value)}
                  style={{
                    padding: "10px 12px", borderRadius: C.radiusSm,
                    border: `1px solid ${C.border}`, background: C.surface,
                    color: C.text1, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                  }}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Btn onClick={handleSave} disabled={!hasChanges || !isPm} loading={saving}>저장</Btn>
                {!isPm && (
                  <span style={{ fontSize: 11, color: C.text3 }}>PM만 수정할 수 있어요.</span>
                )}
                {isPm && !hasChanges && (
                  <span style={{ fontSize: 11, color: C.text3 }}>변경 사항 없음</span>
                )}
              </div>
            </SectionBox>

            {/* ── 멤버 ── */}
            <SectionBox title="멤버" sRef={membersRef} highlighted={highlightedSection === "members"}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: addableMembers.length > 0 && isPm ? 16 : 0 }}>
                {enrichedMembers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: C.text3, fontSize: 13 }}>
                    멤버가 없습니다.
                  </div>
                ) : enrichedMembers.map(m => {
                  const isSelf = String(m.memberId) === myMemberId;
                  return (
                    <div
                      key={m.memberId}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 12, padding: "10px 14px",
                        borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
                        background: C.bg,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>
                          {m.displayName}{isSelf && <span style={{ fontSize: 10, color: C.text3, marginLeft: 6 }}>나</span>}
                        </div>
                        {m.email && (
                          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{m.email}</div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {isPm ? (
                          <select
                            value={m.projectRole}
                            onChange={e => handleRoleChange(m.memberId, e.target.value)}
                            disabled={!!changingRole}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "3px 8px",
                              borderRadius: 999, border: `1px solid ${C.border}`,
                              background: "transparent", color: C.text2,
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                            background: m.projectRole === "PM" ? "rgba(26,25,22,0.08)" : C.border,
                            color: m.projectRole === "PM" ? C.text1 : C.text2,
                          }}>
                            {roleLabel(m.projectRole)}
                          </span>
                        )}

                        {isPm && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.memberId)}
                            disabled={removingId === m.memberId}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "4px 10px",
                              borderRadius: C.radiusSm,
                              border: "1px solid rgba(239,68,68,0.25)",
                              background: "transparent", color: "#dc2626",
                              cursor: removingId === m.memberId ? "default" : "pointer",
                              fontFamily: "inherit",
                              opacity: removingId === m.memberId ? 0.5 : 1,
                            }}
                          >
                            {removingId === m.memberId ? "…" : "제거"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 멤버 추가 — PM + 추가 가능한 팀 멤버가 있을 때만 */}
              {isPm && addableMembers.length > 0 && (
                <div style={{
                  padding: "14px 16px", borderRadius: C.radiusSm,
                  border: `1px dashed ${C.border}`, background: C.bg,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10 }}>
                    팀 멤버 추가
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      value={addMemberId}
                      onChange={e => setAddMemberId(e.target.value)}
                      style={{
                        padding: "8px 10px", borderRadius: C.radiusSm,
                        border: `1px solid ${C.border}`, background: C.surface,
                        color: C.text1, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                      }}
                    >
                      <option value="">멤버 선택</option>
                      {addableMembers.map(tm => (
                        <option key={tm.memberId} value={tm.memberId}>
                          {tm.memberName} ({tm.email})
                        </option>
                      ))}
                    </select>
                    <select
                      value={addRole}
                      onChange={e => setAddRole(e.target.value)}
                      style={{
                        padding: "8px 10px", borderRadius: C.radiusSm,
                        border: `1px solid ${C.border}`, background: C.surface,
                        color: C.text1, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                      }}
                    >
                      {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Btn onClick={handleAddMember} disabled={!addMemberId} loading={adding}>
                      추가
                    </Btn>
                  </div>
                </div>
              )}
            </SectionBox>

            {/* ── 위험 구역 ── */}
            <SectionBox title="위험 구역" sRef={dangerRef} highlighted={highlightedSection === "danger"}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", gap: 16, flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>
                    프로젝트 삭제
                  </div>
                  <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
                    멤버, 요구사항, 파이프라인 결과물이 모두 삭제되며 복구할 수 없습니다.
                  </div>
                  {!isPm && (
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 6 }}>
                      PM만 삭제할 수 있어요.
                    </div>
                  )}
                </div>
                {isPm && (
                  confirmDelete ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn secondary onClick={() => setConfirmDelete(false)}>취소</Btn>
                      <Btn danger onClick={handleDelete} loading={deleting}>정말 삭제</Btn>
                    </div>
                  ) : (
                    <Btn danger onClick={() => setConfirmDelete(true)}>삭제하기</Btn>
                  )
                )}
              </div>
            </SectionBox>
          </>
        )}
      </div>
    </div>
  );
}
