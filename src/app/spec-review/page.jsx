"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchProjectMembers } from "@/lib/projectApi";
import { SpecChangeReview } from "@/components/dashboard/SpecChangeReview";

export default function SpecReviewPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/"); return; }
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
  if (process.env.NEXT_PUBLIC_INTEGRATION_ENABLED !== "true") return <main><p>연결 기능을 사용할 수 없습니다.</p></main>;
  return <main style={{ minHeight: "100vh", background: "#f7f6f3" }}>
    {error && <p role="alert">{error}</p>}
    {target && <SpecChangeReview {...target} canApprove={role === "PM"} onClose={() => router.push("/dashboard")} />}
    {!target && !error && <p role="status">변경안을 확인하고 있습니다.</p>}
  </main>;
}
