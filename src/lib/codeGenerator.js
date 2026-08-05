/**
 * codeGenerator.js
 * ----------------
 * API 명세(endpoint)를 실제 사용 가능한 클라이언트 코드로 변환.
 *
 * 입력은 파이프라인이 만든 API_SPEC 아티팩트의 endpoint 객체:
 *   { method, path, description, authRequired, parameters[], requestBody{}, successResponse{}, errorCodes }
 *
 * 명세의 타입 값은 "integer // 사용자 ID" 처럼 주석이 붙어 있어 타입만 떼어 쓴다.
 */

/** "integer // 사용자 ID" → "integer" */
function cleanType(rawType) {
  if (typeof rawType !== "string") return "string";
  return rawType.replace(/\s*\/\/.*$/, "").trim().toLowerCase();
}

/** 타입에 맞는 샘플 값 (JSON 예시용) */
function sampleForType(name, rawType) {
  const type = cleanType(rawType);
  if (type.startsWith("bool")) return true;
  if (type.startsWith("int") || type.startsWith("long")) return name.toLowerCase().endsWith("id") ? 1 : 123;
  if (type.startsWith("number") || type.startsWith("float") || type.startsWith("double")) return 1234.56;
  if (type.startsWith("array") || type.startsWith("list")) return [];
  if (type.startsWith("object") || type.startsWith("map")) return {};
  return `sample_${name}`;
}

/**
 * 필드 맵({필드명: "타입 // 설명"})으로 샘플 JSON 문자열을 만든다.
 * 중첩 객체/배열도 재귀 처리.
 */
export function generateSampleJson(schema) {
  if (!schema || typeof schema !== "object") return "{}";

  function build(node) {
    if (Array.isArray(node)) {
      if (!node.length) return [];
      const first = node[0];
      return [typeof first === "object" && first !== null ? build(first) : sampleForType("item", first)];
    }
    const out = {};
    Object.entries(node).forEach(([key, value]) => {
      if (value !== null && typeof value === "object") {
        out[key] = build(value);
      } else {
        out[key] = sampleForType(key, value);
      }
    });
    return out;
  }

  return JSON.stringify(build(schema), null, 2);
}

/**
 * method + path로 camelCase 함수명을 만든다.
 *   GET  /api/v1/users        → getUsers
 *   GET  /api/v1/users/{id}   → getUsersById
 *   POST /api/v1/auth/login   → postAuthLogin
 */
export function generateOperationId(method, path) {
  if (!path) return (method || "get").toLowerCase();

  // {id} → ById
  let clean = path.replace(/\/\{([^}]+)}/g, (_, param) =>
    "By" + param.charAt(0).toUpperCase() + param.slice(1)
  );

  // 공통 접두사(/api, /api/v1) 제거
  clean = clean.replace(/^\/api\/v\d+\//, "/").replace(/^\/api\//, "/");

  const parts = clean.split("/").filter(Boolean);
  const camel = parts
    .map((part, i) => {
      const safe = part.replace(/[^a-zA-Z0-9]/g, "");
      if (i === 0) return safe.charAt(0).toLowerCase() + safe.slice(1);
      return safe.charAt(0).toUpperCase() + safe.slice(1);
    })
    .join("");

  const verb = (method || "GET").toLowerCase();
  if (!camel) return verb;
  return verb + camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** path의 {id} 같은 변수 이름 목록 */
function pathVariables(path) {
  const found = (path || "").match(/\{([^}]+)}/g) || [];
  return found.map(v => v.slice(1, -1));
}

/** parameters 배열에서 특정 위치(in)의 항목만 */
function paramsIn(endpoint, location) {
  const list = Array.isArray(endpoint?.parameters) ? endpoint.parameters : [];
  return list.filter(p => (p.in || "query") === location);
}

function hasBody(endpoint) {
  const method = (endpoint?.method || "GET").toUpperCase();
  return ["POST", "PUT", "PATCH"].includes(method)
    && endpoint?.requestBody
    && Object.keys(endpoint.requestBody).length > 0;
}

/**
 * Axios 함수 코드 생성.
 * path 변수는 함수 인자로, query는 params로, body는 data로 넘긴다.
 */
export function generateAxiosCode(endpoint) {
  if (!endpoint) return "";

  const method = (endpoint.method || "GET").toUpperCase();
  const path = endpoint.path || "/";
  const funcName = generateOperationId(method, path);
  const pathVars = pathVariables(path);
  const queryParams = paramsIn(endpoint, "query");
  const includeBody = hasBody(endpoint);

  // 함수 시그니처 인자 구성
  const args = [...pathVars];
  if (includeBody) args.push("data");
  if (queryParams.length) args.push("params");

  // 템플릿 리터럴로 path 변수 치환
  const urlPath = path.replace(/\{([^}]+)}/g, (_, p) => "${" + p + "}");

  const lines = [];
  lines.push(`import axios from "axios";`);
  lines.push("");
  lines.push(`const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;`);
  lines.push("");
  lines.push(`/**`);
  if (endpoint.description) lines.push(` * ${endpoint.description}`);
  lines.push(` * ${method} ${path}`);
  if (endpoint.authRequired) lines.push(` * 인증 필요 (Authorization 헤더)`);
  if (endpoint.errorCodes) lines.push(` * 에러: ${endpoint.errorCodes}`);
  lines.push(` */`);
  lines.push(`export async function ${funcName}(${args.join(", ")}) {`);
  lines.push(`  const response = await axios({`);
  lines.push(`    method: "${method.toLowerCase()}",`);
  lines.push(`    url: \`\${API_BASE_URL}${urlPath}\`,`);
  if (includeBody) lines.push(`    data,`);
  if (queryParams.length) lines.push(`    params,`);
  lines.push(`    withCredentials: true,`);
  lines.push(`  });`);
  lines.push(`  return response.data;`);
  lines.push(`}`);

  // 요청 본문 예시를 주석으로 덧붙임
  if (includeBody) {
    lines.push("");
    lines.push(`/* 요청 본문 예시`);
    lines.push(generateSampleJson(endpoint.requestBody));
    lines.push(`*/`);
  }

  return lines.join("\n");
}

/**
 * React Query(TanStack Query) 훅 코드 생성.
 * GET은 useQuery, 나머지는 useMutation.
 */
export function generateReactQueryCode(endpoint) {
  if (!endpoint) return "";

  const method = (endpoint.method || "GET").toUpperCase();
  const path = endpoint.path || "/";
  const funcName = generateOperationId(method, path);
  const hookName = "use" + funcName.charAt(0).toUpperCase() + funcName.slice(1);
  const isMutation = method !== "GET";
  const pathVars = pathVariables(path);

  const lines = [];
  lines.push(
    `import { ${isMutation ? "useMutation, useQueryClient" : "useQuery"} } from "@tanstack/react-query";`
  );
  lines.push(`import { ${funcName} } from "./api";`);
  lines.push("");
  lines.push(`/**`);
  if (endpoint.description) lines.push(` * ${endpoint.description}`);
  lines.push(` * ${method} ${path}`);
  lines.push(` */`);

  if (isMutation) {
    lines.push(`export function ${hookName}() {`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push("");
    lines.push(`  return useMutation({`);
    // mutate에 넘길 인자 형태 결정
    if (pathVars.length) {
      const destructure = [...pathVars, "data"].join(", ");
      lines.push(`    mutationFn: ({ ${destructure} }) => ${funcName}(${destructure}),`);
    } else {
      lines.push(`    mutationFn: (data) => ${funcName}(data),`);
    }
    lines.push(`    onSuccess: () => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ["${funcName}"] });`);
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);
  } else {
    // Axios 함수 시그니처와 인자를 일치시킨다 — query 파라미터가 없으면 params도 넘기지 않음
    const args = [...pathVars];
    if (paramsIn(endpoint, "query").length) args.push("params");

    lines.push(`export function ${hookName}(${args.join(", ")}) {`);
    lines.push(`  return useQuery({`);
    lines.push(`    queryKey: [${[`"${funcName}"`, ...args].join(", ")}],`);
    lines.push(`    queryFn: () => ${funcName}(${args.join(", ")}),`);
    if (pathVars.length) {
      lines.push(`    enabled: ${pathVars.map(v => `Boolean(${v})`).join(" && ")},`);
    }
    lines.push(`  });`);
    lines.push(`}`);
  }

  return lines.join("\n");
}

/**
 * curl 명령 생성 — Mock 서버로 바로 던져볼 수 있게.
 *
 * @param endpoint 명세 엔드포인트
 * @param baseUrl  호출 대상 (예: http://localhost:8080/mock/7)
 */
export function generateCurlCommand(endpoint, baseUrl = "") {
  if (!endpoint) return "";

  const method = (endpoint.method || "GET").toUpperCase();

  // path 변수는 예시 값으로 채운다
  let url = (endpoint.path || "/").replace(/\{([^}]+)}/g, (_, name) => {
    const spec = paramsIn(endpoint, "path").find(p => p.name === name);
    if (spec?.example !== undefined && spec.example !== null) return String(spec.example);
    return "1";
  });

  const queryParams = paramsIn(endpoint, "query");
  if (queryParams.length) {
    const qs = queryParams
      .map(p => `${p.name}=${p.example !== undefined && p.example !== null ? p.example : "value"}`)
      .join("&");
    url += `?${qs}`;
  }

  const parts = [`curl -X ${method} "${baseUrl}${url}"`];
  parts.push(`  -H "Content-Type: application/json"`);
  if (endpoint.authRequired) parts.push(`  -H "Authorization: Bearer <TOKEN>"`);
  paramsIn(endpoint, "header").forEach(p => {
    parts.push(`  -H "${p.name}: ${p.example ?? "value"}"`);
  });
  if (hasBody(endpoint)) {
    const body = generateSampleJson(endpoint.requestBody).replace(/'/g, "\\'");
    parts.push(`  -d '${body}'`);
  }

  return parts.join(" \\\n");
}

/** TypeScript 인터페이스 생성 — 응답 타입을 프론트에서 바로 쓰도록 */
export function generateTypeScriptTypes(endpoint) {
  if (!endpoint) return "";

  const funcName = generateOperationId(endpoint.method, endpoint.path);
  const pascal = funcName.charAt(0).toUpperCase() + funcName.slice(1);

  function tsType(rawType) {
    const type = cleanType(rawType);
    if (type.startsWith("bool")) return "boolean";
    if (type.startsWith("int") || type.startsWith("long") || type.startsWith("number")
        || type.startsWith("float") || type.startsWith("double")) return "number";
    if (type.startsWith("array") || type.startsWith("list")) return "unknown[]";
    if (type.startsWith("object") || type.startsWith("map")) return "Record<string, unknown>";
    return "string";
  }

  function buildInterface(name, schema) {
    if (!schema || typeof schema !== "object" || !Object.keys(schema).length) return "";
    const rows = Object.entries(schema).map(([key, value]) => {
      if (Array.isArray(value)) return `  ${key}: unknown[];`;
      if (value !== null && typeof value === "object") return `  ${key}: Record<string, unknown>;`;
      const comment = typeof value === "string" && value.includes("//")
        ? ` // ${value.split("//")[1].trim()}`
        : "";
      return `  ${key}: ${tsType(value)};${comment}`;
    });
    return `export interface ${name} {\n${rows.join("\n")}\n}`;
  }

  const blocks = [];
  const reqBlock = buildInterface(`${pascal}Request`, endpoint.requestBody);
  const resBlock = buildInterface(`${pascal}Response`, endpoint.successResponse);
  if (reqBlock) blocks.push(reqBlock);
  if (resBlock) blocks.push(resBlock);

  return blocks.length ? blocks.join("\n\n") : `// ${pascal}: 정의된 요청/응답 스키마가 없습니다`;
}
