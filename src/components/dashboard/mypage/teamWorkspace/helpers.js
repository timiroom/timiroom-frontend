import { APP_URL } from "@/lib/authConfig";

export function getTeamId(team) {
  return team?.teamId ?? team?.id ?? null;
}

export function buildInviteLink(inviteCode) {
  const code = (inviteCode || "").trim();
  if (!code) return "";

  try {
    const baseUrl = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : APP_URL;
    const url = new URL(`/invite/${encodeURIComponent(code)}`, baseUrl);
    return url.toString();
  } catch {
    return `${String(APP_URL).replace(/\/$/, "")}/invite/${encodeURIComponent(code)}`;
  }
}

export function formatJoinedAt(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function getDefaultTransferTarget(members = []) {
  const nextTarget = members.find((member) => member.teamRole !== "OWNER")?.memberId ?? "";
  return nextTarget ? String(nextTarget) : "";
}
