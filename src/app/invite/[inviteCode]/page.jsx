import { WorkspaceInviteLanding } from "@/components/dashboard/invite/WorkspaceInviteLanding";

export const metadata = {
  title: "워크스페이스 초대 — Align-it",
};

export default function InvitePage({ params }) {
  return <WorkspaceInviteLanding inviteCode={params?.inviteCode} />;
}
