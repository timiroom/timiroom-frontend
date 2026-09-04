/**
 * graphApi.js
 * -----------
 * 지식 그래프 조회.
 *
 * GET /api/v1/projects/{projectId}/graph
 *   → { nodes: [...], edges: [...], summary: {...} }
 *
 * 서버가 저장된 그래프를 읽는 게 아니라 최신 명세에서 매번 계산해 내려주므로,
 * 문서를 고치고 다시 부르면 바뀐 관계가 그대로 반영된다.
 */

import { API_BASE_URL, apiFetch } from "@/lib/authConfig";

export async function fetchProjectGraph(projectId) {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/projects/${projectId}/graph`);
  if (!res || !res.ok) {
    let message = "지식 그래프를 불러오지 못했습니다";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

/** 이보다 긴 API 라벨은 꼬리만 남긴다 */
const LABEL_LIMIT = 20;

/**
 * 그림에 실을 짧은 이름.
 *
 * "GET /api/v1/reviews/{reviewId}/score" 같은 전체 경로를 그대로 두면
 * 라벨이 옆 노드까지 뻗어 서로 덮어버린다. 어차피 프로젝트 안에서
 * /api/v1 은 모두 같으므로 떼어내도 구분에 지장이 없다.
 *
 * 그래도 긴 경로는 남는데, 배치가 라벨 폭까지 계산해 자리를 잡기 때문에
 * 긴 라벨 하나가 주변을 통째로 밀어내 화면이 휑해진다. 그래서 한도를 넘으면
 * 맨 끝 마디만 남긴다 — 같은 리소스 안에서 엔드포인트를 가르는 건 대개 꼬리다.
 * 전체 경로는 fullLabel에 남겨 상세 패널에서 보여준다.
 */
function shortLabel(node) {
  if (node.type !== "api") return node.label;

  const label = node.label.replace(/\s\/api\/v\d+\//, " /");
  if (label.length <= LABEL_LIMIT) return label;

  const [method, ...rest] = label.split(" ");
  const segments = rest.join(" ").split("/").filter(Boolean);
  if (segments.length < 2) return label;

  return `${method} …/${segments[segments.length - 1]}`;
}

/**
 * 서버 응답을 Cytoscape가 먹는 elements 배열로 바꾼다.
 *
 * 연결 수(degree)를 미리 세어 넣는다 — 노드 크기를 여기에 매어
 * 무엇이 중심인지 크기만으로 먼저 읽히게 하려는 것이다.
 */
export function toCytoscapeElements(graph) {
  if (!graph) return [];

  const degree = {};
  (graph.edges || []).forEach((e) => {
    degree[e.source] = (degree[e.source] || 0) + 1;
    degree[e.target] = (degree[e.target] || 0) + 1;
  });

  const nodes = (graph.nodes || []).map((n) => ({
    data: {
      id: n.id,
      label: shortLabel(n),
      fullLabel: n.label,
      type: n.type,
      parent: n.parent || undefined,
      orphan: n.orphan ? "yes" : "no",
      // Cytoscape 선택자는 문자열 비교가 안전하다
      change: n.change || "none",
      impacted: n.impacted ? "yes" : "no",
      degree: degree[n.id] || 0,
      meta: n.meta || {},
    },
  }));

  /**
   * 변경이 타고 번져 나간 선을 미리 표시해 둔다.
   *
   * 양 끝이 모두 "바뀐 것" 또는 "그 여파가 닿은 것"인 선이 곧 번짐의 경로다.
   * 노드에만 표시를 남기면 왜 그것이 영향을 받았는지가 안 보이므로,
   * 지나간 선까지 살려야 경로가 이어져 읽힌다.
   *
   * 이걸 클래스가 아니라 데이터로 계산하는 이유 — 영향 경로는 클릭 같은
   * 상호작용 상태가 아니라 명세에서 나온 사실이다. 데이터로 두면 그릴 때
   * 바로 색이 정해져, 나중에 클래스를 붙였다 떼는 것보다 단순하다.
   */
  // PR도 출발점으로 친다. 그래프에 올라온 PR은 이미 명세의 무언가를 건드린 것만
  // 남긴 것이라, 그 자체가 변경의 출처다. 여기서 빼면 코드에서 명세로 넘어가는
  // 첫 칸만 색이 끊겨 경로가 도중에 사라진 것처럼 보인다.
  const involved = new Set(
    (graph.nodes || [])
      .filter((n) => n.change || n.impacted || n.type === "pr")
      .map((n) => n.id)
  );

  const edges = (graph.edges || []).map((e) => ({
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      onImpactPath: involved.has(e.source) && involved.has(e.target) ? "yes" : "no",
    },
  }));

  return [...nodes, ...edges];
}
