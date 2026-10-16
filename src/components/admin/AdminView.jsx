"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";
import { adminRefund, adminSetPlan, fetchAdminMembers, fetchAdminOverview, fetchAdminPayments } from "@/lib/adminApi";
import { PAYMENT_STATUS } from "@/lib/billingApi";
import { formatKrw } from "@/lib/usageApi";
import {
  ActionButton, Badge, EmptyState, LoadingScreen, LoadingState, SearchInput, SettingsHeader, SettingsLayout, SettingsNav,
  SettingsSection, StatGrid,
} from "@/components/ui";

const PAGES = {
  overview: { label: "요약", href: "/admin", icon: "meter" },
  members: { label: "회원", href: "/admin/members", icon: "users" },
  payments: { label: "결제", href: "/admin/payments", icon: "card" },
};

function dateLabel(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/**
 * 관리자 화면. 설정 화면과 같은 틀(상단 바, 왼쪽 메뉴, 섹션 카드)을 쓴다.
 * 데이터는 서버가 role=ADMIN일 때만 준다.
 */
export function AdminView() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const page = useMemo(() => {
    const key = pathname?.split("/")[2];
    return PAGES[key] ? key : "overview";
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [isLoading, user, router]);

  if (isLoading || !user) return <LoadingScreen message="로그인 상태를 확인하는 중…" />;

  const nav = (
    <SettingsNav label="관리자 메뉴" active={page}
      groups={[{ label: "관리자", items: Object.entries(PAGES).map(([key, p]) => ({ key, ...p })) }]} />
  );

  let content;
  if (!user.admin) content = <EmptyState icon="key" title="관리자만 볼 수 있는 화면입니다" />;
  else if (page === "members") content = <Members />;
  else if (page === "payments") content = <Payments />;
  else content = <Overview />;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div className="ui-panel-header">
        <div className="ui-panel-header__crumb">
          <ActionButton variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            대시보드
          </ActionButton>
          <span className="ui-panel-header__sep" aria-hidden="true">›</span>
          <span>관리자</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "var(--content-bg)" }}>
        <SettingsLayout nav={nav}>{content}</SettingsLayout>
      </div>
    </div>
  );
}

function Overview() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAdminOverview().then(setData).catch((e) => showToast("error", e.message));
  }, [showToast]);

  if (!data) return <><SettingsHeader eyebrow="관리자" title="요약" /><LoadingState /></>;
  const net = data.revenueMonthKrw - data.refundMonthKrw - data.aiCostMonthKrw;

  return (
    <>
      <SettingsHeader eyebrow="관리자" title="요약"
        meta={<span>한도 무료 {formatKrw(data.plans.FREE.limitKrw)} · 프로 {formatKrw(data.plans.PRO.limitKrw)} · 추가 사용량 배율 {data.creditRate}</span>} />

      <SettingsSection title="이번 달">
        <div className="adm-stats">
          <StatGrid items={[
            { label: "결제", value: formatKrw(data.revenueMonthKrw) },
            { label: "환불", value: formatKrw(data.refundMonthKrw) },
            { label: "AI 비용", value: formatKrw(data.aiCostMonthKrw) },
            { label: "결제 - 환불 - 비용", value: formatKrw(net) },
          ]} />
        </div>
      </SettingsSection>

      <SettingsSection title="오늘" description={`AI 비용이 ${formatKrw(data.alertDailyTotalKrw)}을 넘으면 운영자에게 메일로 알립니다.`}>
        <div className="adm-stats">
          <StatGrid items={[
            { label: "AI 비용", value: formatKrw(data.aiCostTodayKrw) },
            { label: "남은 추가 사용량 잔액", value: formatKrw(data.creditOutstandingKrw) },
            { label: "이번 달 결제 실패", value: `${data.failedPaymentsMonth}건` },
          ]} />
        </div>
        {data.topCostToday.length > 0 && (
          <table className="adm-table">
            <thead><tr><th>오늘 비용이 많은 회원</th><th className="num">비용</th></tr></thead>
            <tbody>
              {data.topCostToday.map((row) => (
                <tr key={row.memberId}>
                  <td><Who name={row.name} email={row.email} id={row.memberId} /></td>
                  <td className="num">{formatKrw(Math.round(row.costKrw))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SettingsSection>

      <SettingsSection title="구독">
        <div className="adm-stats">
          <StatGrid items={[
            { label: "프로(결제)", value: `${data.proPaying}명` },
            { label: "프로(관리자 부여)", value: `${data.proGranted}명` },
            { label: "해지 예정", value: `${data.cancelScheduled}명` },
            { label: "결제 실패 중", value: `${data.pastDue}명` },
            { label: "전체 회원", value: `${data.members}명` },
          ]} />
        </div>
      </SettingsSection>
    </>
  );
}

function Who({ name, email, id }) {
  return (
    <div className="adm-who">
      <span className="adm-who__name">{name ?? `회원 ${id}`}</span>
      {email && <span className="adm-who__sub">{email}</span>}
    </div>
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
      <SettingsHeader eyebrow="관리자" title="회원" meta={<span>사용량과 비용은 각 회원의 이번 기간 기준입니다.</span>} />
      <SettingsSection title="회원 목록"
        actions={<SearchInput value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="이메일 또는 이름" />}>
        {!data ? <LoadingState /> : data.content.length === 0 ? <EmptyState compact icon="users" title="회원이 없습니다" /> : (
          <div className="adm-scroll">
            <table className="adm-table">
              <thead>
                <tr><th>회원</th><th>요금제</th><th className="num">사용량</th><th className="num">비용 / 한도</th><th className="num">추가 잔액</th><th>초기화</th><th /></tr>
              </thead>
              <tbody>
                {data.content.map((m) => (
                  <tr key={m.memberId}>
                    <td><Who name={m.name} email={m.email} id={m.memberId} /></td>
                    <td>
                      <span className="adm-badges">
                        <Badge tone={m.plan === "PRO" ? "success" : "neutral"}>{m.plan === "PRO" ? "프로" : "무료"}</Badge>
                        {m.role === "ADMIN" && <Badge>관리자</Badge>}
                      </span>
                    </td>
                    <td className="num">
                      <span className="adm-meter"><span style={{ width: `${Math.min(100, m.percent)}%` }} /></span>
                      {m.percent}%
                    </td>
                    <td className="num">{formatKrw(Number(m.usedKrw))} / {formatKrw(m.limitKrw)}</td>
                    <td className="num">{formatKrw(m.creditBalanceKrw)}</td>
                    <td>{dateLabel(m.periodEnd)}</td>
                    <td className="adm-actions">
                      {m.plan === "PRO"
                        ? <ActionButton size="sm" variant="ghost" onClick={() => changePlan(m, "FREE")}>무료로</ActionButton>
                        : <ActionButton size="sm" variant="ghost" onClick={() => changePlan(m, "PRO")}>프로 1개월</ActionButton>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} hasNext={data?.hasNext} onChange={setPage} />
      </SettingsSection>
    </>
  );
}

function Payments() {
  const { showToast } = useToast();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [refunding, setRefunding] = useState(null);

  const load = useCallback(() => {
    fetchAdminPayments(status, page).then(setData).catch((e) => showToast("error", e.message));
  }, [status, page, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <SettingsHeader eyebrow="관리자" title="결제" meta={<span>환불은 결제한 카드로 취소합니다. 추가 사용량은 잔액에서도 뺍니다.</span>} />
      <SettingsSection title="결제 목록"
        actions={(
          <select className="ui-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="상태">
            <option value="">전체 상태</option>
            {Object.entries(PAYMENT_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        )}>
        {!data ? <LoadingState /> : data.content.length === 0 ? <EmptyState compact icon="list" title="결제가 없습니다" /> : (
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>날짜</th><th>회원</th><th>내용</th><th className="num">금액</th><th>상태</th><th /></tr></thead>
              <tbody>
                {data.content.map((p) => {
                  const s = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" };
                  const open = refunding === p.id;
                  return [
                    <tr key={p.id} className={open ? "is-open" : undefined}>
                      <td>{dateLabel(p.paidAt || p.createdAt)}</td>
                      <td><Who email={p.email} name={null} id={p.memberId} /></td>
                      <td>
                        <span className="adm-who__name">{p.kind === "CREDIT" ? "추가 사용량" : "프로 요금제"}</span>
                        {p.failureReason && <span className="adm-who__sub">{p.failureReason}</span>}
                      </td>
                      <td className="num">
                        {formatKrw(p.amountKrw)}
                        {p.refundedKrw > 0 && <span className="adm-who__sub">{formatKrw(p.refundedKrw)} 환불</span>}
                      </td>
                      <td><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className="adm-actions">
                        {p.refundableKrw > 0 && (
                          <ActionButton size="sm" variant="ghost" onClick={() => setRefunding(open ? null : p.id)}>
                            {open ? "닫기" : "환불"}
                          </ActionButton>
                        )}
                      </td>
                    </tr>,
                    open && (
                      <tr key={`${p.id}-refund`} className="adm-refund-row">
                        <td colSpan={6}>
                          <RefundForm payment={p} onDone={() => { setRefunding(null); load(); }} />
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} hasNext={data ? page + 1 < data.totalPages : false} onChange={setPage} />
      </SettingsSection>
    </>
  );
}

function RefundForm({ payment, onDone }) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState(String(payment.refundableKrw));
  const [reason, setReason] = useState("");
  const [downgrade, setDowngrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= 1 && value <= payment.refundableKrw;

  async function submit() {
    const ok = await confirmDialog(`${payment.email ?? `회원 ${payment.memberId}`}에게 ${formatKrw(value)}을 환불할까요?`,
      { confirmLabel: "환불", danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      await adminRefund(payment.id, { amountKrw: value, reason: reason.trim() || "관리자 환불", downgrade });
      showToast("success", "환불을 요청했습니다.");
      onDone();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-refund">
      <label className="adm-refund__field">
        <span>금액 (최대 {formatKrw(payment.refundableKrw)})</span>
        <input className="ui-input" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} />
      </label>
      <label className="adm-refund__field adm-refund__field--grow">
        <span>사유 (회원에게 보이지 않음)</span>
        <input className="ui-input" value={reason} placeholder="예: 서비스 장애 보상" maxLength={200}
          onChange={(e) => setReason(e.target.value)} />
      </label>
      {payment.kind === "SUBSCRIPTION" && (
        <label className="adm-refund__check">
          <input type="checkbox" checked={downgrade} onChange={(e) => setDowngrade(e.target.checked)} />
          <span>바로 무료 요금제로 바꾸기</span>
        </label>
      )}
      <ActionButton size="sm" variant="primary" disabled={!valid || busy} onClick={submit}>
        {busy ? "환불 중…" : "환불"}
      </ActionButton>
    </div>
  );
}

function Pager({ page, hasNext, onChange }) {
  if (page === 0 && !hasNext) return null;
  return (
    <div className="adm-pager">
      <ActionButton size="sm" variant="ghost" disabled={page === 0} onClick={() => onChange(page - 1)}>이전</ActionButton>
      <span>{page + 1}쪽</span>
      <ActionButton size="sm" variant="ghost" disabled={!hasNext} onClick={() => onChange(page + 1)}>다음</ActionButton>
    </div>
  );
}
