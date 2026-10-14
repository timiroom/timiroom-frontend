"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectMembers } from "@/lib/projectApi";
import { SpecChangeReview } from "@/components/dashboard/SpecChangeReview";
import { rememberAuthReturnTo } from "@/lib/authConfig";

// 오류·로딩·기능 꺼짐 안내처럼 문구만 보이는 상태 화면용
const note = { margin: 0, padding: "32px 24px", fontSize: 13, lineHeight: 1.7, color: "var(--text-2)" };

export default function SpecReviewPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState("");
  const onProposalChanged = useCallback((proposalId) => {
    if (!target) return;
    window.history.replaceState(null, "", `/spec-review?projectId=${target.project.id}&proposalId=${proposalId}`);
    setTarget((current) => ({ ...current, proposalId }));
  }, [target]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { rememberAuthReturnTo(window.location.pathname + window.location.search); router.replace("/"); return; }
    const query = new URLSearchParams(window.location.search);
    const project = query.get("projectId"), proposal = query.get("proposalId");
    if (!/^[1-9][0-9]*$/.test(project || "") || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(proposal || "")) { setError("변경안 링크를 확인해 주세요."); return; }
    let active = true;
    setTarget({ project: { id: project, name: "티미룸" }, proposalId: proposal });
    fetchProjectMembers(project).then((members) => {
      if (active) setRole(members.find((item) => String(item.memberId) === String(user.memberId ?? user.id))?.projectRole ?? null);
    }).catch(() => { if (active) setRole(null); });
    return () => { active = false; };
  }, [isLoading, user, router]);
  if (process.env.NEXT_PUBLIC_INTEGRATION_ENABLED !== "true") return <main style={{ minHeight: "100vh", background: "var(--bg)" }}><p style={note}>연결 기능을 사용할 수 없습니다.</p></main>;
  return <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
    {error && <p role="alert" style={{ ...note, color: "#b4413f" }}>{error}</p>}
    {target && <SpecChangeReview {...target} canApprove={role === "PM"}
      onProposalChanged={onProposalChanged}
      allowedTargets={role === "BACKEND" ? ["API_SPEC", "DB_SCHEMA"] : role === "FRONTEND" ? ["API_SPEC", "FEATURE_LIST"] : role === "DESIGNER" ? ["PRD", "FEATURE_LIST"] : role === "INFRA" ? ["DB_SCHEMA"] : []}
      onClose={() => router.push(`/spec-changes?projectId=${target.project.id}`)} />}
    {!target && !error && <p role="status" style={note}>변경안을 확인하고 있습니다.</p>}
  </main>;
}
