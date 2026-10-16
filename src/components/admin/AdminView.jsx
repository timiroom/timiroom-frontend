"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { confirmDialog } from "@/lib/feedback";
import {
  adminRefund, adminSetPlan, fetchAdminInsights, fetchAdminMember, fetchAdminMembers, fetchAdminOverview, fetchAdminPayments,
  fetchAdminAi, fetchAdminSystem, fetchAdminUsage,
} from "@/lib/adminApi";
import { PAYMENT_STATUS } from "@/lib/billingApi";
import { FEATURE_LABELS, formatKrw } from "@/lib/usageApi";
import {
  ActionButton, Badge, EmptyState, LoadingScreen, LoadingState, SearchInput, SettingsHeader, SettingsLayout, SettingsNav,
  SettingsSection,
} from "@/components/ui";
import { TrendChart } from "./TrendChart";

const PAGES = {
  overview: { label: "요약", href: "/admin", icon: "meter" },
  members: { label: "회원", href: "/admin/members", icon: "users" },
  payments: { label: "결제", href: "/admin/payments", icon: "card" },
  usage: { label: "AI 사용", href: "/admin/usage", icon: "chat" },
  system: { label: "시스템", href: "/admin/system", icon: "wrench" },
};

const PROVIDER_LABELS = { GOOGLE: "Google", GITHUB: "GitHub" };
const providerLabel = (p) => (p ? PROVIDER_LABELS[String(p).toUpperCase()] ?? p : "—");

function dateLabel(iso, withTime = false) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime
    ? date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function relative(iso) {
  if (!iso) return "기록 없음";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function shortDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : `${date.getMonth() + 1}.${date.getDate()}`;
}

const num = (v) => Number(v ?? 0).toLocaleString("ko-KR");
const krw = (v) => formatKrw(Math.round(Number(v ?? 0)));
const featureLabel = (f) => FEATURE_LABELS[f] ?? f;

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
  else if (page === "usage") content = <Usage />;
  else if (page === "system") content = <System />;
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
        <div className="adm-scope"><SettingsLayout nav={nav}>{content}</SettingsLayout></div>
      </div>
    </div>
  );
}

// ── 공통 ────────────────────────────────────────────────────

function Who({ name, email, id, sub }) {
  return (
    <div className="adm-who">
      <span className="adm-who__name">{name ?? email ?? `회원 ${id}`}</span>
      {(sub || (name && email)) && <span className="adm-who__sub">{sub ?? email}</span>}
    </div>
  );
}

function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, tone: "neutral" };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function Table({ columns, rows, empty = "기록이 없습니다", rowKey, onRowClick, renderAfter, compact = false }) {
  if (!rows?.length) return <div className="adm-empty">{empty}</div>;
  return (
    <div className={compact ? "adm-scroll adm-scroll--compact" : "adm-scroll"}>
      <table className="adm-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.num ? "num" : undefined}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = rowKey ? rowKey(row) : i;
            return (
              <Fragment key={key}>
                <tr className={onRowClick ? "is-clickable" : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {columns.map((c) => <td key={c.key} className={c.num ? "num" : c.className}>{c.render ? c.render(row) : row[c.key]}</td>)}
                </tr>
                {renderAfter?.(row)}
              </Fragment>
            );
          })}
        </tbody>
      </table>
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

/** 상용 대시보드식 지표 카드: 이름, 큰 숫자, 보조 설명 */
function Kpis({ items, small = false }) {
  return (
    <div className={`adm-kpis${small ? " adm-kpis--small" : ""}`}>
      {items.map((item) => (
        <div key={item.label} className="adm-kpi">
          <span className="adm-kpi__label">{item.label}</span>
          <span className="adm-kpi__value">{item.value}</span>
          {item.sub && <span className="adm-kpi__sub">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}

// ── 요약 ────────────────────────────────────────────────────

const CHARTS = {
  money: { label: "결제·AI 비용", series: [{ key: "revenueKrw", label: "결제", tone: "primary" }, { key: "aiCostKrw", label: "AI 비용", tone: "muted" }], format: krw },
  calls: { label: "AI 호출", series: [{ key: "aiCalls", label: "AI 호출", tone: "primary" }], format: (v) => `${num(v)}회` },
  signups: { label: "가입", series: [{ key: "signups", label: "가입", tone: "primary" }], format: (v) => `${num(v)}명` },
};

function Overview() {
  const { showToast } = useToast();
  const [base, setBase] = useState(null);
  const [extra, setExtra] = useState(null);
  const [chart, setChart] = useState("money");

  useEffect(() => {
    Promise.all([fetchAdminOverview(), fetchAdminInsights()])
      .then(([o, i]) => { setBase(o); setExtra(i); })
      .catch((e) => showToast("error", e.message));
  }, [showToast]);

  if (!base || !extra) return <><SettingsHeader eyebrow="관리자" title="요약" /><LoadingState /></>;
  const k = extra.kpi;
  const net = base.revenueMonthKrw - base.refundMonthKrw - base.aiCostMonthKrw;
  const current = CHARTS[chart];

  return (
    <>
      <SettingsHeader eyebrow="관리자" title="요약" meta={<span>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 기준</span>} />

      <Kpis items={[
        { label: "월 반복 매출", value: krw(k.mrrKrw), sub: `유료 회원 ${num(k.payingMembers)}명` },
        { label: "이번 달 순수익", value: krw(net), sub: "결제 − 환불 − AI 비용" },
        { label: "활성 회원 (7일)", value: `${num(k.activeMembers7d)}명`, sub: `전체 ${num(base.members)}명 · 유료 전환 ${k.conversionPercent}%` },
        { label: "오늘 AI 비용", value: krw(base.aiCostTodayKrw), sub: `경보 기준 ${krw(base.alertDailyTotalKrw)}` },
      ]} />

      <SettingsSection title="최근 30일"
        actions={(
          <div className="adm-seg" role="tablist" aria-label="그래프">
            {Object.entries(CHARTS).map(([key, c]) => (
              <button key={key} type="button" role="tab" aria-selected={chart === key}
                className={`adm-seg__item${chart === key ? " is-active" : ""}`} onClick={() => setChart(key)}>{c.label}</button>
            ))}
          </div>
        )}>
        <TrendChart data={extra.trend} series={current.series} format={current.format} />
      </SettingsSection>

      <Kpis small items={[
        { label: "AI 호출 (7일)", value: `${num(k.aiCalls7d)}회`, sub: `내 AI 키 ${k.byokShare7dPercent}%` },
        { label: "가입 (7일)", value: `${num(k.signups7d)}명`, sub: `오늘 ${num(k.signupsToday)}명` },
        { label: "프로젝트 생성 (7일)", value: `${num(k.generations7d)}회`, sub: `전체 프로젝트 ${num(k.projects)}개` },
        { label: "PR 검사 (7일)", value: `${num(k.prReviews7d)}회`, sub: `추가 사용량 잔액 ${krw(base.creditOutstandingKrw)}` },
      ]} />

      <div className="adm-grid">
        <SettingsSection title="이번 달 기능별 비용">
          <Table compact rows={extra.features} rowKey={(r) => r.feature} columns={[
            { key: "feature", label: "기능", render: (r) => featureLabel(r.feature) },
            { key: "calls", label: "호출", num: true, render: (r) => num(r.calls) },
            { key: "members", label: "회원", num: true, render: (r) => num(r.members) },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
          ]} />
        </SettingsSection>
        <SettingsSection title="이번 달 모델별 비용">
          <Table compact rows={extra.models} rowKey={(r) => r.model} columns={[
            { key: "model", label: "모델", className: "adm-mono" },
            { key: "calls", label: "호출", num: true, render: (r) => num(r.calls) },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
          ]} />
        </SettingsSection>
      </div>

      <div className="adm-grid">
        <SettingsSection title="최근 결제">
          <Table compact rows={extra.recentPayments} rowKey={(r) => r.id} columns={[
            { key: "email", label: "회원", render: (r) => <Who name={r.email} email={null} sub={dateLabel(r.at, true)} /> },
            { key: "kind", label: "내용", render: (r) => (r.kind === "CREDIT" ? "충전" : "프로") },
            { key: "amountKrw", label: "금액", num: true, render: (r) => krw(r.amountKrw) },
            { key: "status", label: "상태", render: (r) => <PaymentBadge status={r.status} /> },
          ]} />
        </SettingsSection>
        <SettingsSection title="최근 가입">
          <Table compact rows={extra.recentSignups} rowKey={(r) => r.memberId} columns={[
            { key: "name", label: "회원", render: (r) => <Who name={r.name} email={r.email} id={r.memberId} /> },
            { key: "provider", label: "로그인", render: (r) => providerLabel(r.provider) },
            { key: "createdAt", label: "가입", num: true, render: (r) => relative(r.createdAt) },
          ]} />
        </SettingsSection>
      </div>

      <div className="adm-grid">
        <SettingsSection title="자동 결제 예정 (7일)">
          <Table compact rows={extra.upcomingRenewals} rowKey={(r) => r.memberId} empty="예정된 결제가 없습니다" columns={[
            { key: "email", label: "회원" },
            { key: "nextBillingAt", label: "결제일", render: (r) => dateLabel(r.nextBillingAt) },
            { key: "status", label: "상태", render: (r) => (r.status === "PAST_DUE"
              ? <Badge tone="danger">{`실패 ${r.failedAttempts}회`}</Badge> : <Badge tone="success">정상</Badge>) },
          ]} />
        </SettingsSection>
        <SettingsSection title="오늘 AI 비용 상위 회원">
          <Table compact rows={base.topCostToday} rowKey={(r) => r.memberId} empty="오늘 기록이 없습니다" columns={[
            { key: "name", label: "회원", render: (r) => <Who name={r.name} email={r.email} id={r.memberId} /> },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
          ]} />
        </SettingsSection>
      </div>
    </>
  );
}

// ── 회원 ────────────────────────────────────────────────────

function Members() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    fetchAdminMembers(query, page).then(setData).catch((e) => showToast("error", e.message));
  }, [query, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <SettingsHeader eyebrow="관리자" title="회원" meta={<span>회원을 누르면 사용 내역과 결제를 볼 수 있습니다.</span>} />
      <SettingsSection title="회원 목록"
        actions={<SearchInput value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="이메일 또는 이름" />}>
        {!data ? <LoadingState /> : (
          <Table rows={data.content} rowKey={(m) => m.memberId} empty="회원이 없습니다"
            onRowClick={(m) => setOpenId(openId === m.memberId ? null : m.memberId)}
            renderAfter={(m) => openId === m.memberId && (
              <tr className="adm-detail-row"><td colSpan={8}><MemberDetail memberId={m.memberId} onChanged={load} /></td></tr>
            )}
            columns={[
              { key: "name", label: "회원", render: (m) => <Who name={m.name} email={m.email} id={m.memberId} /> },
              { key: "plan", label: "요금제", render: (m) => (
                <span className="adm-badges">
                  <Badge tone={m.plan === "PRO" ? "success" : "neutral"}>{m.plan === "PRO" ? "프로" : "무료"}</Badge>
                  {m.role === "ADMIN" && <Badge>관리자</Badge>}
                </span>
              ) },
              { key: "percent", label: "사용량", num: true, render: (m) => (
                <><span className="adm-meter"><span style={{ width: `${Math.min(100, m.percent)}%` }} /></span>{m.percent}%</>
              ) },
              { key: "usedKrw", label: "비용 / 한도", num: true, render: (m) => `${krw(m.usedKrw)} / ${krw(m.limitKrw)}` },
              { key: "creditBalanceKrw", label: "추가 잔액", num: true, render: (m) => krw(m.creditBalanceKrw) },
              { key: "provider", label: "로그인", render: (m) => providerLabel(m.provider) },
              { key: "createdAt", label: "가입", render: (m) => dateLabel(m.createdAt) },
              { key: "lastActiveAt", label: "최근 AI 사용", render: (m) => relative(m.lastActiveAt) },
            ]} />
        )}
        <Pager page={page} hasNext={data?.hasNext} onChange={setPage} />
      </SettingsSection>
    </>
  );
}

function MemberDetail({ memberId, onChanged }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    fetchAdminMember(memberId).then(setData).catch((e) => showToast("error", e.message));
  }, [memberId, showToast]);

  useEffect(() => { load(); }, [load]);

  async function changePlan(plan) {
    const ok = await confirmDialog(plan === "PRO"
      ? `${data.email}에게 결제 없이 프로를 1개월 줄까요?`
      : `${data.email}를 무료 요금제로 바꿀까요? 정기결제도 멈춥니다.`, { confirmLabel: "바꾸기", danger: plan !== "PRO" });
    if (!ok) return;
    try {
      await adminSetPlan(memberId, plan, 1);
      showToast("success", "요금제를 바꿨습니다.");
      load();
      onChanged();
    } catch (e) {
      showToast("error", e.message);
    }
  }

  if (!data) return <LoadingState />;
  const u = data.usage;
  const sub = data.subscription;
  return (
    <div className="adm-detail" onClick={(e) => e.stopPropagation()}>
      <div className="adm-detail__head">
        <div className="adm-detail__meta">
          <span>회원 #{data.memberId}</span>
          <span>{providerLabel(data.provider)}</span>
          {data.githubLogin && <span>GitHub {data.githubLogin}</span>}
          <span>프로젝트 {num(data.projects)}개</span>
          <span>내 AI 키 {data.ownKey ? "등록" : "없음"}</span>
          <span>가입 {dateLabel(data.createdAt)}</span>
        </div>
        {u.plan === "PRO"
          ? <ActionButton size="sm" variant="ghost" onClick={() => changePlan("FREE")}>무료로 바꾸기</ActionButton>
          : <ActionButton size="sm" variant="ghost" onClick={() => changePlan("PRO")}>프로 1개월 주기</ActionButton>}
      </div>
      <Kpis small items={[
        { label: "요금제", value: u.plan === "PRO" ? (sub.grantedByAdmin ? "프로(부여)" : "프로") : "무료",
          sub: sub.nextBillingAt ? `다음 결제 ${dateLabel(sub.nextBillingAt)}` : `${dateLabel(u.periodEnd)} 초기화` },
        { label: "이번 기간 사용", value: `${u.percent}%`, sub: `${krw(u.usedKrw)} / ${krw(u.limitKrw)}` },
        { label: "추가 사용량 잔액", value: krw(u.creditBalanceKrw), sub: u.creditEnabled ? "켜짐" : "꺼짐" },
        { label: "사용 기간", value: `${shortDate(u.periodStart)} ~ ${shortDate(u.periodEnd)}`, sub: "이 기간 사용량으로 한도를 셉니다" },
      ]} />
      <div className="adm-detail__grid">
        <div>
          <h4 className="adm-detail__title">이번 기간 기능별</h4>
          <Table compact rows={data.features} rowKey={(r) => r.feature} empty="사용 기록이 없습니다" columns={[
            { key: "feature", label: "기능", render: (r) => featureLabel(r.feature) },
            { key: "calls", label: "호출", num: true, render: (r) => num(r.calls) },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
          ]} />
        </div>
        <div>
          <h4 className="adm-detail__title">결제</h4>
          <Table compact rows={data.payments} rowKey={(r) => r.id} empty="결제가 없습니다" columns={[
            { key: "paidAt", label: "날짜", render: (r) => dateLabel(r.paidAt || r.createdAt) },
            { key: "kind", label: "내용", render: (r) => (r.kind === "CREDIT" ? "추가 사용량" : "프로") },
            { key: "amountKrw", label: "금액", num: true, render: (r) => krw(r.amountKrw) },
            { key: "status", label: "상태", render: (r) => <PaymentBadge status={r.status} /> },
          ]} />
        </div>
      </div>
      <h4 className="adm-detail__title">최근 AI 호출</h4>
      <Table compact rows={data.recentUsage} rowKey={(r) => `${r.at}-${r.model}`} empty="AI 호출이 없습니다" columns={[
        { key: "at", label: "일시", render: (r) => dateLabel(r.at, true) },
        { key: "feature", label: "기능", render: (r) => featureLabel(r.feature) },
        { key: "model", label: "모델", className: "adm-mono" },
        { key: "tokens", label: "입력/출력", num: true, render: (r) => `${num(r.inputTokens)} / ${num(r.outputTokens)}` },
        { key: "costKrw", label: "비용", num: true, render: (r) => (r.byok ? "내 키" : krw(r.costKrw)) },
      ]} />
    </div>
  );
}

// ── 결제 ────────────────────────────────────────────────────

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
      <SettingsHeader eyebrow="관리자" title="결제" meta={<span>환불하면 결제한 카드로 취소되고, 충전 결제는 잔액에서도 빠집니다.</span>} />
      <SettingsSection title="결제 목록"
        actions={(
          <select className="ui-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="상태">
            <option value="">전체 상태</option>
            {Object.entries(PAYMENT_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        )}>
        {!data ? <LoadingState /> : (
          <Table rows={data.content} rowKey={(p) => p.id} empty="결제가 없습니다"
            renderAfter={(p) => refunding === p.id && (
              <tr className="adm-detail-row"><td colSpan={7}>
                <RefundForm payment={p} onDone={() => { setRefunding(null); load(); }} />
              </td></tr>
            )}
            columns={[
              { key: "paidAt", label: "일시", render: (p) => dateLabel(p.paidAt || p.createdAt, true) },
              { key: "email", label: "회원", render: (p) => p.email ?? `회원 ${p.memberId}` },
              { key: "kind", label: "내용", render: (p) => (
                <div className="adm-who">
                  <span className="adm-who__name">{p.kind === "CREDIT" ? "추가 사용량" : "프로 요금제"}</span>
                  {p.failureReason && <span className="adm-who__sub">{p.failureReason}</span>}
                </div>
              ) },
              { key: "card", label: "결제 수단", render: (p) => p.cardSummary ?? "—" },
              { key: "amountKrw", label: "금액", num: true, render: (p) => (
                <>{krw(p.amountKrw)}{p.refundedKrw > 0 && <span className="adm-who__sub">{krw(p.refundedKrw)} 환불</span>}</>
              ) },
              { key: "status", label: "상태", render: (p) => <PaymentBadge status={p.status} /> },
              { key: "actions", label: "", className: "adm-actions", render: (p) => (
                <span className="adm-actions__row">
                  {["PAID", "PARTIAL_CANCELLED", "CANCELLED"].includes(p.status) && p.paidAt && (
                    <ActionButton size="sm" variant="ghost" href={`/receipt/${p.id}`} target="_blank" rel="noopener">확인서</ActionButton>
                  )}
                  {p.refundableKrw > 0 && (
                    <ActionButton size="sm" variant="ghost" onClick={() => setRefunding(refunding === p.id ? null : p.id)}>
                      {refunding === p.id ? "닫기" : "환불"}
                    </ActionButton>
                  )}
                </span>
              ) },
            ]} />
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

// ── AI 사용 ─────────────────────────────────────────────────

function Usage() {
  const { showToast } = useToast();
  const [feature, setFeature] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    fetchAdminUsage(feature, query, page).then(setData).catch((e) => showToast("error", e.message));
  }, [feature, query, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <SettingsHeader eyebrow="관리자" title="AI 사용" meta={<span>비용은 원가 기준이며, 회원이 등록한 AI 키로 호출한 건은 0원입니다.</span>} />
      <AiOverview />
      <SettingsSection title="호출 기록"
        actions={(
          <div className="adm-filters">
            <select className="ui-input" value={feature} onChange={(e) => { setFeature(e.target.value); setPage(0); }} aria-label="기능">
              <option value="">전체 기능</option>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="회원 이메일" />
          </div>
        )}>
        {!data ? <LoadingState /> : (
          <Table rows={data.content} rowKey={(r) => r.id} empty="호출 기록이 없습니다" columns={[
            { key: "at", label: "일시", render: (r) => dateLabel(r.at, true) },
            { key: "email", label: "회원", render: (r) => r.email ?? `회원 ${r.memberId}` },
            { key: "feature", label: "기능", render: (r) => featureLabel(r.feature) },
            { key: "model", label: "모델", className: "adm-mono" },
            { key: "tokens", label: "입력/출력 토큰", num: true, render: (r) => `${num(r.inputTokens)} / ${num(r.outputTokens)}` },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
            { key: "flags", label: "구분", render: (r) => (
              <span className="adm-badges">
                {r.byok && <Badge>내 키</Badge>}
                {Number(r.creditKrw) > 0 && <Badge tone="info">추가 사용량</Badge>}
                {!r.counted && <Badge tone="warning">한도 제외</Badge>}
              </span>
            ) },
          ]} />
        )}
        <Pager page={page} hasNext={data?.hasNext} onChange={setPage} />
      </SettingsSection>
    </>
  );
}

const AI_CHARTS = {
  cost: { label: "비용", series: [{ key: "costKrw", label: "AI 비용", tone: "primary" }], format: krw },
  calls: { label: "호출", series: [{ key: "calls", label: "전체", tone: "primary" }, { key: "byokCalls", label: "내 AI 키", tone: "muted" }], format: (v) => `${num(v)}회` },
  tokens: { label: "토큰", series: [{ key: "tokens", label: "토큰", tone: "primary" }], format: (v) => num(v) },
  members: { label: "사용 회원", series: [{ key: "members", label: "회원", tone: "primary" }], format: (v) => `${num(v)}명` },
};

function AiOverview() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [chart, setChart] = useState("cost");
  const [hourly, setHourly] = useState("calls");

  useEffect(() => {
    fetchAdminAi().then(setData).catch((e) => showToast("error", e.message));
  }, [showToast]);

  if (!data) return <LoadingState />;
  const m = data.money;
  const current = AI_CHARTS[chart];
  const totalCost = data.features.reduce((sum, f) => sum + Number(f.costKrw || 0), 0);

  return (
    <>
      <Kpis items={[
        { label: "이번 달 AI 비용", value: krw(m.costMonthKrw), sub: `월말 예상 ${krw(m.projectedMonthKrw)}` },
        { label: "매출 대비 원가율", value: m.costRatioPercent == null ? "—" : `${m.costRatioPercent}%`, sub: `이번 달 결제 ${krw(m.revenueMonthKrw)}` },
        { label: "호출당 평균 비용", value: `${Number(m.avgCostPerCallKrw).toLocaleString("ko-KR")}원`, sub: `회원당 ${krw(m.avgCostPerMemberKrw)}` },
        { label: "이번 달 호출", value: `${num(m.callsMonth)}회`, sub: `사용 회원 ${num(m.membersMonth)}명 · 내 키 ${num(m.byokCallsMonth)}회` },
      ]} />

      <SettingsSection title="최근 30일"
        actions={(
          <div className="adm-seg" role="tablist" aria-label="30일 그래프">
            {Object.entries(AI_CHARTS).map(([key, c]) => (
              <button key={key} type="button" role="tab" aria-selected={chart === key}
                className={`adm-seg__item${chart === key ? " is-active" : ""}`} onClick={() => setChart(key)}>{c.label}</button>
            ))}
          </div>
        )}>
        <TrendChart data={data.daily} series={current.series} format={current.format} />
      </SettingsSection>

      <SettingsSection title="최근 24시간 트래픽"
        actions={(
          <div className="adm-seg" role="tablist" aria-label="24시간 그래프">
            {[["calls", "호출"], ["costKrw", "비용"]].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={hourly === key}
                className={`adm-seg__item${hourly === key ? " is-active" : ""}`} onClick={() => setHourly(key)}>{label}</button>
            ))}
          </div>
        )}>
        <TrendChart data={data.hourly} labelEvery={6} labelFormat={(d) => d.slice(6)}
          series={[{ key: hourly, label: hourly === "calls" ? "시간당 호출" : "시간당 비용", tone: "primary" }]}
          format={hourly === "calls" ? (v) => `${num(v)}회` : krw} />
      </SettingsSection>

      <div className="adm-grid">
        <SettingsSection title="이번 달 기능별 비용">
          {totalCost > 0 && (
            <div className="adm-share" aria-hidden="true">
              {data.features.filter((f) => Number(f.costKrw) > 0).map((f, i) => (
                <span key={f.feature} className={`adm-share__part adm-share__part--${i % 5}`}
                  style={{ width: `${(Number(f.costKrw) / totalCost) * 100}%` }} title={featureLabel(f.feature)} />
              ))}
            </div>
          )}
          <Table compact rows={data.features} rowKey={(r) => r.feature} columns={[
            { key: "feature", label: "기능", render: (r) => (
              <span className="adm-legend"><i className={`adm-share__part--${data.features.filter((f) => Number(f.costKrw) > 0).indexOf(r) % 5}`} />{featureLabel(r.feature)}</span>
            ) },
            { key: "calls", label: "호출", num: true, render: (r) => num(r.calls) },
            { key: "share", label: "비중", num: true, render: (r) => (totalCost > 0 ? `${Math.round((Number(r.costKrw) / totalCost) * 100)}%` : "—") },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
          ]} />
        </SettingsSection>
        <SettingsSection title="이번 달 비용 상위 회원">
          <Table compact rows={data.topMembers} rowKey={(r) => r.memberId} columns={[
            { key: "name", label: "회원", render: (r) => <Who name={r.name} email={r.email} id={r.memberId} /> },
            { key: "calls", label: "호출", num: true, render: (r) => num(r.calls) },
            { key: "costKrw", label: "비용", num: true, render: (r) => krw(r.costKrw) },
          ]} />
        </SettingsSection>
      </div>

      <Kpis small items={[
        { label: "추가 사용량 판매 (이번 달)", value: krw(m.creditSoldKrw), sub: "환불 제외" },
        { label: "추가 사용량 차감 (이번 달)", value: krw(m.creditDeductedKrw), sub: "회원 잔액에서 빠진 금액" },
        { label: "이번 달 토큰", value: num(m.tokensMonth), sub: "입력 + 출력" },
        { label: "이번 달 결제", value: krw(m.revenueMonthKrw), sub: "환불 제외" },
      ]} />
    </>
  );
}

// ── 시스템 ──────────────────────────────────────────────────

const JOB_STATE_TONE = { SUCCEEDED: "success", COMPLETED: "success", FAILED: "danger", RUNNING: "info", QUEUED: "neutral" };

function System() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAdminOverview().then(setPlans).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminSystem().then(setData).catch((e) => showToast("error", e.message)).finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <SettingsHeader eyebrow="관리자" title="시스템"
        meta={data && <span>{dateLabel(data.checkedAt, true)} 확인</span>}
        actions={<ActionButton size="sm" disabled={loading} onClick={load}>{loading ? "확인 중…" : "다시 확인"}</ActionButton>} />
      {!data ? <LoadingState /> : (
        <>
          <SettingsSection title="서비스 상태">
            <div className="adm-health">
              {data.services.map((s) => (
                <div key={s.name} className="adm-health__item">
                  <span className={`adm-dot${s.up ? " is-up" : " is-down"}`} aria-hidden="true" />
                  <span className="adm-health__name">{s.name}</span>
                  <span className="adm-health__meta">{s.up ? (s.latencyMs ? `정상 · ${s.latencyMs}ms` : "정상") : "응답 없음"}</span>
                </div>
              ))}
            </div>
          </SettingsSection>

          {data.server && <ServerMetrics server={data.server} />}

          <div className="adm-grid">
            <SettingsSection title="설정">
              <Table compact rows={data.settings} rowKey={(r) => r.name} columns={[
                { key: "name", label: "항목" },
                { key: "detail", label: "상태", render: (r) => <Badge tone={r.ok ? "success" : "warning"}>{r.detail}</Badge> },
              ]} />
            </SettingsSection>
            <SettingsSection title="요금과 한도">
              {plans ? (
                <Table compact rows={[
                  { name: "무료 월 한도", value: krw(plans.plans.FREE.limitKrw) },
                  { name: "프로 요금", value: `${krw(plans.plans.PRO.priceKrw)} / 월` },
                  { name: "프로 월 한도", value: krw(plans.plans.PRO.limitKrw) },
                  { name: "추가 사용량 차감 배율", value: `${plans.creditRate}배` },
                  { name: "진행 중인 AI 호출", value: `${num(data.activeHolds)}건` },
                ]} rowKey={(r) => r.name} columns={[
                  { key: "name", label: "항목" },
                  { key: "value", label: "값", num: true },
                ]} />
              ) : <LoadingState />}
            </SettingsSection>
          </div>

          <div className="adm-grid">
            <SettingsSection title="연동 작업" description="최근 7일">
              <Table rows={data.jobs} rowKey={(r) => `${r.kind}-${r.state}`} empty="작업이 없습니다" columns={[
                { key: "kind", label: "종류", className: "adm-mono" },
                { key: "state", label: "상태", render: (r) => <Badge tone={JOB_STATE_TONE[r.state] ?? "neutral"}>{r.state}</Badge> },
                { key: "count", label: "건수", num: true, render: (r) => num(r.count) },
              ]} />
            </SettingsSection>
            <SettingsSection title="프로젝트 생성" description="최근 7일">
              <Table rows={data.generations} rowKey={(r) => r.status} empty="생성 기록이 없습니다" columns={[
                { key: "status", label: "상태", render: (r) => <Badge tone={JOB_STATE_TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
                { key: "count", label: "건수", num: true, render: (r) => num(r.count) },
              ]} />
            </SettingsSection>
          </div>

          <SettingsSection title="최근 실패">
            <Table rows={data.recentFailures} rowKey={(r) => `${r.source}-${r.at}`} empty="최근 실패가 없습니다" columns={[
              { key: "at", label: "일시", render: (r) => dateLabel(r.at, true) },
              { key: "source", label: "구분", render: (r) => ({ generation: "프로젝트 생성", job: "연동 작업", payment: "결제" }[r.source] ?? r.source) },
              { key: "message", label: "내용", className: "adm-wrap", render: (r) => r.message || "—" },
            ]} />
          </SettingsSection>
        </>
      )}
    </>
  );
}

function uptimeLabel(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}일 ${h}시간` : h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

function ServerMetrics({ server: s }) {
  const heapPercent = s.heapMaxMb ? Math.round((s.heapUsedMb / s.heapMaxMb) * 100) : 0;
  return (
    <>
      <SettingsSection title="백엔드 서버" description={`${s.instance} · 가동 ${uptimeLabel(s.uptimeSeconds)} · 서버가 여러 대면 응답한 한 대의 값입니다`}>
        <div className="adm-gauges">
          <Gauge label="CPU" value={s.processCpuPercent} sub={`시스템 ${s.systemCpuPercent}% · ${num(s.cpuCount)}코어`} />
          <Gauge label="메모리" value={heapPercent} sub={`${num(s.heapUsedMb)} / ${num(s.heapMaxMb)}MB`} />
          <Gauge label="DB 연결" value={s.dbMax ? Math.round((s.dbActive / s.dbMax) * 100) : 0} sub={`사용 ${num(s.dbActive)} · 대기 ${num(s.dbIdle)} · 최대 ${num(s.dbMax)}`} />
          <Gauge label="스레드" value={null} raw={num(s.threads)} sub="실행 중" />
        </div>
      </SettingsSection>
      <Kpis small items={[
        { label: "요청 (가동 후)", value: num(s.requests), sub: `분당 ${s.requestsPerMinute}건` },
        { label: "평균 응답", value: `${num(s.avgMs)}ms`, sub: `최근 최대 ${num(s.maxMs)}ms` },
        { label: "서버 오류율", value: `${s.errorPercent}%`, sub: `5xx ${num(s.serverErrors)}건` },
        { label: "클라이언트 오류", value: num(s.clientErrors), sub: "4xx (로그인 만료 등)" },
      ]} />
      <SettingsSection title="많이 호출된 API">
        <Table rows={s.topEndpoints} rowKey={(r) => r.endpoint} empty="요청 기록이 없습니다" columns={[
          { key: "endpoint", label: "API", className: "adm-mono" },
          { key: "count", label: "요청", num: true, render: (r) => num(r.count) },
          { key: "avgMs", label: "평균 응답", num: true, render: (r) => `${num(r.avgMs)}ms` },
          { key: "errors", label: "5xx", num: true, render: (r) => (r.errors ? <Badge tone="danger">{num(r.errors)}</Badge> : "0") },
        ]} />
      </SettingsSection>
    </>
  );
}

function Gauge({ label, value, raw, sub }) {
  const tone = value == null ? "" : value >= 85 ? " is-danger" : value >= 65 ? " is-warn" : "";
  return (
    <div className="adm-gauge">
      <span className="adm-kpi__label">{label}</span>
      <span className="adm-kpi__value">{raw ?? `${value}%`}</span>
      {value != null && <span className={`adm-gauge__bar${tone}`}><span style={{ width: `${Math.min(100, value)}%` }} /></span>}
      <span className="adm-kpi__sub">{sub}</span>
    </div>
  );
}
