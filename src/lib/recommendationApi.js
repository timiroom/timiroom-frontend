import { aiFetch } from "@/lib/aiGateway";

// 추천은 백엔드 AI 게이트웨이를 거친다(사용량 한도·기록). 실패하면 null을 돌려 화면이 추천 없이 진행한다.
const BASE = "/recommendations";

async function postJson(path, body) {
  try {
    const res = await aiFetch(path, { body });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

const PLATFORM_MAP = { "웹": "WEB", "앱": "APP", "웹앱": "WEB_APP" };

export function fetchTechStackRecommendation({ projectName, projectDescription, implType }) {
  return postJson(`${BASE}/tech-stack`, {
    projectName,
    projectDescription,
    platform: PLATFORM_MAP[implType] || "WEB",
  });
}

export function fetchPersonaRecommendation({ projectName, projectDescription, problem }) {
  return postJson(`${BASE}/persona`, {
    projectName,
    projectDescription,
    problemDefinition: {
      currentPainPoint:  problem.pain,
      currentSolution:   problem.solution,
      idealState:        problem.ideal,
      businessImpact:    problem.loss,
      motivation:        problem.trigger,
      competitorGap:     problem.ref_exp,
    },
  });
}

export function fetchFeatureRecommendation({ projectName, projectDescription, implType, techStack, problem, personas }) {
  return postJson(`${BASE}/features`, {
    projectName,
    projectDescription,
    platform: PLATFORM_MAP[implType] || "WEB",
    techStack,
    problemDefinition: {
      currentPainPoint:  problem.pain,
      currentSolution:   problem.solution,
      idealState:        problem.ideal,
      businessImpact:    problem.loss,
      motivation:        problem.trigger,
      competitorGap:     problem.ref_exp,
    },
    targetUsers: (personas || [])
      .filter(p => p.user)
      .map(p => ({
        persona:          p.user,
        usageEnvironment: p.environment,
        biggestPainPoint: p.pain,
      })),
  });
}
