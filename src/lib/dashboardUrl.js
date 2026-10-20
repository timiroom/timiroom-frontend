/**
 * 대시보드 주소 ↔ 화면 상태.
 *   /dashboard?projectId=1&view=prd
 *   /dashboard?projectId=1&view=settings&tab=members
 * 문서를 열 때마다 주소를 바꿔 두면 브라우저 뒤로·앞으로가 그대로 동작하고,
 * 새로고침하거나 링크를 보내도 같은 화면이 열린다.
 */

export function buildDashboardUrl({ projectId, view, tab } = {}) {
  const query = new URLSearchParams();
  if (projectId != null) query.set("projectId", String(projectId));
  if (view) query.set("view", view);
  if (tab) query.set("tab", tab);
  const search = query.toString();
  return `/dashboard${search ? `?${search}` : ""}`;
}

export function readDashboardUrl() {
  if (typeof window === "undefined") return {};
  const query = new URLSearchParams(window.location.search);
  return { projectId: query.get("projectId"), view: query.get("view"), tab: query.get("tab") };
}

/** 주소만 바꾼다. 같은 주소면 기록을 늘리지 않는다. */
export function writeDashboardUrl(state, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  const url = buildDashboardUrl(state);
  if (url === window.location.pathname + window.location.search) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

/** 대시보드 안의 다른 화면(예: 빈 화면의 "레포 연결하러 가기")에서 이동할 때 쓴다. */
export function navigateDashboard(state) {
  writeDashboardUrl(state);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
