"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";
import { adminRefund, adminSetPlan, fetchAdminMembers, fetchAdminOverview, fetchAdminPayments } from "@/lib/adminApi";
import { PAYMENT_STATUS } from "@/lib/billingApi";
import { formatKrw } from "@/lib/usageApi";
import { ActionButton, Badge, EmptyState, LoadingScreen, LoadingState, SearchInput } from "@/components/ui";

const TABS = [
  { key: "overview", label: "요약" },
  { key: "members", label: "회원" },
  { key: "payments", label: "결제" },
];

function dateLabel(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/** 관리자 화면. 회원 role이 ADMIN이어야 데이터를 받는다(서버가 확인). */
export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [isLoading, user, router]);

  if (isLoading || !user) return <LoadingScreen message="로그인 상태를 확인하는 중…" />;
  if (!user.admin) {
    return (
      <main className="admin">
        <EmptyState icon="key" title="관리자만 볼 수 있는 화면입니다" />
        <p className="admin__back"><Link href="/dashboard">대시보드로 돌아가기</Link></p>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin__head">
        <div>
          <Link href="/dashboard" className="admin__crumb">← 대시보드</Link>
          <h1>관리자</h1>
        </div>
        <nav className="admin__tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`admin__tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </nav>
      </header>
      {tab === "overview" && <Overview />}
      {tab === "members" && <Members />}
      {tab === "payments" && <Payments />}
    </main>
  );
}

function Overview() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAdminOverview().then(setData).catch((e) => showToast("error", e.message));
  }, [showToast]);

  if (!data) return <LoadingState />;
  const margin = data.revenueMonthKrw - data.refundMonthKrw - data.aiCostMonthKrw;
  const stats = [
    ["이번 달 결제", formatKrw(data.revenueMonthKrw)],
    ["이번 달 환불", formatKrw(data.refundMonthKrw)],
    ["이번 달 AI 비용", formatKrw(data.aiCostMonthKrw)],
    ["결제 - 환불 - AI 비용", formatKrw(margin)],
    ["오늘 AI 비용", `${formatKrw(data.aiCostTodayKrw)} / 경보 ${formatKrw(data.alertDailyTotalKrw)}`],
    ["남은 추가 사용량 잔액", formatKrw(data.creditOutstandingKrw)],
    ["프로(결제)", `${data.proPaying}명`],
    ["프로(관리자 부여)", `${data.proGranted}명`],
    ["해지 예정", `${data.cancelScheduled}명`],
    ["결제 실패 중", `${data.pastDue}명`],
    ["이번 달 결제 실패", `${data.failedPaymentsMonth}건`],
    ["전체 회원", `${data.members}명`],
  ];
  return (
    <>
      <div className="admin__stats">
        {stats.map(([label, value]) => (
          <div key={label} className="admin__stat">
            <span className="admin__stat-label">{label}</span>
            <span className="admin__stat-value">{value}</span>
          </div>
        ))}
      </div>
      <p className="admin__note">
        한도: 무료 {formatKrw(data.plans.FREE.limitKrw)}, 프로 {formatKrw(data.plans.PRO.limitKrw)}(요금 {formatKrw(data.plans.PRO.priceKrw)}) · 추가 사용량 차감 배율 {data.creditRate}
      </p>
      <h2 className="admin__h2">오늘 AI 비용이 많은 회원</h2>
      {data.topCostToday.length === 0 ? <EmptyState compact icon="list" title="오늘 기록이 없습니다" /> : (
        <table className="admin__table">
          <thead><tr><th>회원</th><th>이메일</th><th className="num">비용</th></tr></thead>
          <tbody>
            {data.topCostToday.map((row) => (
              <tr key={row.memberId}><td>{row.name ?? row.memberId}</td><td>{row.email}</td><td className="num">{formatKrw(Math.round(row.costKrw))}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Members() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    fetchAdminMembers(query, page).then(setData).catch((e) => showToast("error", e.message));
  }, [query, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function changePlan(member, plan) {
    const ok = await confirmDialog(plan === "PRO"
      ? `${member.email}에게 결제 없이 프로를 1개월 줄까요?`
      : `${member.email}를 무료 요금제로 바꿀까요? 정기결제도 멈춥니다.`, { confirmLabel: "바꾸기", danger: plan !== "PRO" });
    if (!ok) return;
    try {
      await adminSetPlan(member.memberId, plan, 1);
      showToast("success", "요금제를 바꿨습니다.");
      load();
    } catch (e) {
      showToast("error", e.message);
    }
  }

  return (
    <>
      <div className="admin__toolbar">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="이메일 또는 이름" />
      </div>
      {!data ? <LoadingState /> : data.content.length === 0 ? <EmptyState compact icon="users" title="회원이 없습니다" /> : (
        <table className="admin__table">
          <thead>
            <tr><th>회원</th><th>요금제</th><th className="num">사용량</th><th className="num">이번 기간 비용</th><th className="num">추가 잔액</th><th>초기화</th><th /></tr>
          </thead>
          <tbody>
            {data.content.map((m) => (
              <tr key={m.memberId}>
                <td><div className="admin__who"><strong>{m.name ?? `회원 ${m.memberId}`}</strong><span>{m.email}</span></div></td>
                <td><Badge tone={m.plan === "PRO" ? "success" : "neutral"}>{m.plan === "PRO" ? "프로" : "무료"}</Badge>{m.role === "ADMIN" && <Badge>관리자</Badge>}</td>
                <td className="num">{m.percent}%</td>
                <td className="num">{formatKrw(Number(m.usedKrw))} / {formatKrw(m.limitKrw)}</td>
                <td className="num">{formatKrw(m.creditBalanceKrw)}</td>
                <td>{dateLabel(m.periodEnd)}</td>
                <td className="admin__actions">
                  {m.plan === "PRO"
                    ? <ActionButton size="sm" variant="ghost" onClick={() => changePlan(m, "FREE")}>무료로</ActionButton>
                    : <ActionButton size="sm" variant="ghost" onClick={() => changePlan(m, "PRO")}>프로 1개월</ActionButton>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager page={page} hasNext={data?.hasNext} onChange={setPage} />
    </>
  );
}

function Payments() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    fetchAdminPayments(status, page).then(setData).catch((e) => showToast("error", e.message));
  }, [status, page, showToast]);

  useEffect(() => { load(); }, [load]);

  async function refund(p) {
    const input = window.prompt(`환불 금액(원, 최대 ${p.refundableKrw.toLocaleString("ko-KR")}). 비우면 전액`, "");
    if (input === null) return;
    const amountKrw = input.trim() === "" ? null : Number(input.replace(/[^0-9]/g, ""));
    if (amountKrw !== null && (!amountKrw || amountKrw > p.refundableKrw)) {
      showToast("error", "환불 금액을 확인해 주세요.");
      return;
    }
    const reason = window.prompt("환불 사유(회원에게 보이지 않음)", "관리자 환불");
    if (reason === null) return;
    const downgrade = p.kind === "SUBSCRIPTION"
      && await confirmDialog("프로 요금제도 바로 무료로 바꿀까요? 취소를 누르면 남은 기간은 그대로 둡니다.", { confirmLabel: "무료로 바꾸기" });
    try {
      await adminRefund(p.id, { amountKrw, reason, downgrade });
      showToast("success", "환불을 요청했습니다.");
      load();
    } catch (e) {
      showToast("error", e.message);
    }
  }

  return (
    <>
      <div className="admin__toolbar">
        <select className="ui-input admin__select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="상태">
          <option value="">전체</option>
          {Object.entries(PAYMENT_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
        </select>
      </div>
      {!data ? <LoadingState /> : data.content.length === 0 ? <EmptyState compact icon="list" title="결제가 없습니다" /> : (
        <table className="admin__table">
          <thead><tr><th>날짜</th><th>회원</th><th>내용</th><th className="num">금액</th><th>상태</th><th /></tr></thead>
          <tbody>
            {data.content.map((p) => {
              const s = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" };
              return (
                <tr key={p.id}>
                  <td>{dateLabel(p.paidAt || p.createdAt)}</td>
                  <td>{p.email ?? p.memberId}</td>
                  <td>{p.orderName}{p.failureReason ? <span className="admin__sub">{p.failureReason}</span> : null}</td>
                  <td className="num">{formatKrw(p.amountKrw)}{p.refundedKrw > 0 && <span className="admin__sub">{formatKrw(p.refundedKrw)} 환불</span>}</td>
                  <td><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td className="admin__actions">
                    {p.refundableKrw > 0 && <ActionButton size="sm" variant="ghost" onClick={() => refund(p)}>환불</ActionButton>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Pager page={page} hasNext={data ? page + 1 < data.totalPages : false} onChange={setPage} />
    </>
  );
}

function Pager({ page, hasNext, onChange }) {
  if (page === 0 && !hasNext) return null;
  return (
    <div className="admin__pager">
      <ActionButton size="sm" variant="ghost" disabled={page === 0} onClick={() => onChange(page - 1)}>이전</ActionButton>
      <span>{page + 1}쪽</span>
      <ActionButton size="sm" variant="ghost" disabled={!hasNext} onClick={() => onChange(page + 1)}>다음</ActionButton>
    </div>
  );
}
