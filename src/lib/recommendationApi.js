import { API_BASE_URL } from "@/lib/authConfig";

const BASE = `${API_BASE_URL}/api/v1/recommendation`;

async function postJson(url, body) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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
