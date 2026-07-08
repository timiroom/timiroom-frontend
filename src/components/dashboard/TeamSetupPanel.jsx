"use client";

import { useState } from "react";

const C = {
  text: "#1a1916",
  muted: "var(--text-3)",
  subtle: "var(--text-2)",
  border: "rgba(0,0,0,0.08)",
  panel: "var(--surface)",
  bg: "var(--bg)",
  accent: "var(--text-1)",
  accentSoft: "rgba(26,25,22,0.08)",
  success: "#10B981",
  warning: "#F59E0B",
};

const ROLE_OPTIONS = ["PM", "기획", "개발", "디자인", "QA"];

function Pill({ children, tone = "default" }) {
  const toneMap = {
    default: { color: C.subtle, background: "rgba(0,0,0,0.04)" },
    active: { color: C.accent, background: "rgba(26,25,22,0.1)" },
    success: { color: C.success, background: "rgba(16,185,129,0.1)" },
    warning: { color: C.warning, background: "rgba(245,158,11,0.1)" },
  };
  const style = toneMap[tone] ?? toneMap.default;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 9px",
      borderRadius: 100,
      fontSize: 11,
      fontWeight: 700,
      color: style.color,
      background: style.background,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 12, color: C.subtle, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

function inputStyle() {
  return {
    width: "100%",
    height: 40,
    padding: "0 12px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.panel,
    color: C.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };
}

function TeamHeader({ team, invitations }) {
  const acceptedCount = invitations.filter(invitation => invitation.status === "참여 완료").length;

  return (
    <section className="db-card" style={{
      padding: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Pill tone={team.created ? "success" : "warning"}>
            {team.created ? "팀 설정 완료" : "팀 생성 대기"}
          </Pill>
          <Pill tone="active">워크스페이스 Step 1</Pill>
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: C.text,
          lineHeight: 1.2,
        }}>
          {team.created ? team.name : "팀 생성과 초대"}
        </h1>
        <p style={{
          margin: "8px 0 0",
          fontSize: 14,
          color: C.subtle,
          lineHeight: 1.7,
          maxWidth: 720,
        }}>
          {team.created
            ? team.description
            : "먼저 협업 팀을 만들고, 문서와 프로젝트를 함께 관리할 멤버를 초대합니다."}
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 96px)",
        gap: 10,
        flexShrink: 0,
      }}>
        {[
          { label: "팀", value: team.created ? "1" : "0" },
          { label: "초대", value: invitations.length },
          { label: "참여", value: acceptedCount },
        ].map(item => (
          <div key={item.label} style={{
            padding: "14px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            background: C.bg,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{item.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CreateTeamCard({ team, onCreateTeam }) {
  const [teamName, setTeamName] = useState(team.name);
  const [description, setDescription] = useState(team.description);

  return (
    <section className="db-card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            {team.created ? "팀 정보 설정" : "팀 생성"}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>문서와 프로젝트를 함께 관리할 협업 공간</div>
        </div>
        <Pill tone={team.created ? "success" : "warning"}>{team.created ? "완료" : "필수"}</Pill>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <Field label="팀 이름">
          <input value={teamName} onChange={event => setTeamName(event.target.value)} style={inputStyle()} />
        </Field>
        <Field label="팀 설명">
          <textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            rows={4}
            style={{ ...inputStyle(), height: 96, paddingTop: 11, resize: "none", lineHeight: 1.6 }}
          />
        </Field>
        <button
          onClick={() => onCreateTeam({ name: teamName.trim(), description: description.trim() })}
          disabled={!teamName.trim()}
          style={{
            height: 42,
            border: "none",
            borderRadius: 8,
            background: teamName.trim() ? C.accent : "rgba(26,25,22,0.35)",
            color: "var(--bg)",
            fontSize: 13,
            fontWeight: 800,
            cursor: teamName.trim() ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          {team.created ? "팀 정보 업데이트" : "팀 생성하기"}
        </button>
      </div>
    </section>
  );
}

function InviteCard({ team, invitations, onInviteMember, onAcceptInvite }) {
  const [inviteName, setInviteName] = useState("김민서");
  const [inviteEmail, setInviteEmail] = useState("minseo@alignit.demo");
  const [inviteRole, setInviteRole] = useState("PM");

  function handleInvite() {
    if (!team.created || !inviteName.trim() || !inviteEmail.trim()) return;
    onInviteMember({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteName("정하윤");
    setInviteEmail("hayoon@alignit.demo");
    setInviteRole("개발");
  }

  return (
    <section className="db-card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>팀원 초대</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>초대 발송 후 참여 완료까지 한 번에 연출</div>
        </div>
        <Pill tone={invitations.length > 0 ? "success" : "default"}>{invitations.length}명</Pill>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 104px", gap: 10, marginBottom: 10 }}>
        <Field label="이름">
          <input value={inviteName} onChange={event => setInviteName(event.target.value)} style={inputStyle()} />
        </Field>
        <Field label="이메일">
          <input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} style={inputStyle()} />
        </Field>
        <Field label="역할">
          <select value={inviteRole} onChange={event => setInviteRole(event.target.value)} style={inputStyle()}>
            {ROLE_OPTIONS.map(role => <option key={role}>{role}</option>)}
          </select>
        </Field>
      </div>

      <button
        onClick={handleInvite}
        disabled={!team.created || !inviteName.trim() || !inviteEmail.trim()}
        style={{
          width: "100%",
          height: 42,
          border: "none",
          borderRadius: 8,
          background: team.created && inviteName.trim() && inviteEmail.trim() ? C.accent : "rgba(26,25,22,0.35)",
          color: "var(--bg)",
          fontSize: 13,
          fontWeight: 800,
          cursor: team.created ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          marginBottom: 16,
        }}
      >
        초대 발송
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {invitations.length === 0 ? (
          <div style={{
            padding: "22px 12px",
            border: `1px dashed ${C.border}`,
            borderRadius: 10,
            color: C.muted,
            textAlign: "center",
            fontSize: 13,
          }}>
            팀 생성 후 초대 목록이 여기에 표시됩니다.
          </div>
        ) : (
          invitations.map(invitation => (
            <div key={invitation.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              background: invitation.status === "참여 완료" ? "rgba(16,185,129,0.06)" : C.bg,
            }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: C.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 900,
                color: C.accent,
                flexShrink: 0,
              }}>
                {invitation.name.slice(0, 1)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{invitation.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{invitation.email} · {invitation.role}</div>
              </div>
              <Pill tone={invitation.status === "참여 완료" ? "success" : "warning"}>{invitation.status}</Pill>
              {invitation.status !== "참여 완료" && (
                <button
                  onClick={() => onAcceptInvite(invitation.id)}
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: `1px solid ${C.border}`,
                    background: C.panel,
                    color: C.text,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  참여 처리
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function FlowPreview({ team, invitations }) {
  const steps = [
    { title: "팀 생성", done: team.created, detail: team.created ? team.name : "대기 중" },
    { title: "초대 발송", done: invitations.length > 0, detail: invitations.length > 0 ? `${invitations.length}명 초대` : "초대 전" },
    {
      title: "협업 준비",
      done: invitations.some(invitation => invitation.status === "참여 완료"),
      detail: invitations.some(invitation => invitation.status === "참여 완료") ? "문서 공유 가능" : "참여 확인 필요",
    },
  ];

  return (
    <section className="db-card" style={{ padding: 22 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>워크스페이스 진행 상태</div>
      <div style={{ display: "grid", gap: 12 }}>
        {steps.map((step, index) => (
          <div key={step.title} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: step.done ? C.accent : C.bg,
              color: step.done ? "var(--bg)" : C.muted,
              border: `1px solid ${step.done ? C.accent : C.border}`,
              fontSize: 12,
              fontWeight: 900,
              flexShrink: 0,
            }}>
              {step.done ? "✓" : index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{step.title}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TeamSetupPanel({ team, invitations, onCreateTeam, onInviteMember, onAcceptInvite }) {
  return (
    <main style={{
      flex: 1,
      height: "100vh",
      overflowY: "auto",
      background: "var(--bg)",
      padding: 24,
    }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <TeamHeader team={team} invitations={invitations} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <CreateTeamCard team={team} onCreateTeam={onCreateTeam} />
            <FlowPreview team={team} invitations={invitations} />
          </div>
          <InviteCard
            team={team}
            invitations={invitations}
            onInviteMember={onInviteMember}
            onAcceptInvite={onAcceptInvite}
          />
        </div>
      </div>
    </main>
  );
}
