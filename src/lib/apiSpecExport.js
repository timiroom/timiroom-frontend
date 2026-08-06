/**
 * apiSpecExport.js
 * ----------------
 * 파이프라인이 만든 API 명세를 외부 도구 형식으로 내보낸다.
 *
 *   exportToPostman  → Postman Collection v2.1
 *   exportToOpenApi  → OpenAPI 3.0 문서
 *
 * 입력은 API_SPEC 아티팩트를 파싱한 객체:
 *   { endpoints: [...], authentication: "...", prdIssues: "..." }
 */

/** "integer // 사용자 ID" → "integer" */
function cleanType(rawType) {
  if (typeof rawType !== "string") return "string";
  return rawType.replace(/\s*\/\/.*$/, "").trim().toLowerCase();
}

/** "integer // 사용자 ID" → "사용자 ID" */
function extractComment(rawType) {
  if (typeof rawType !== "string") return "";
  const idx = rawType.indexOf("//");
  return idx === -1 ? "" : rawType.slice(idx + 2).trim();
}

function sampleForType(name, rawType) {
  const type = cleanType(rawType);
  if (type.startsWith("bool")) return true;
  if (type.startsWith("int") || type.startsWith("long")) return name.toLowerCase().endsWith("id") ? 1 : 123;
  if (type.startsWith("number") || type.startsWith("float") || type.startsWith("double")) return 1234.56;
  if (type.startsWith("array") || type.startsWith("list")) return [];
  if (type.startsWith("object") || type.startsWith("map")) return {};
  return `sample_${name}`;
}

/** 필드 맵 → 샘플 객체 (중첩 처리) */
function buildSample(schema) {
  if (!schema || typeof schema !== "object") return {};
  if (Array.isArray(schema)) {
    if (!schema.length) return [];
    const first = schema[0];
    return [typeof first === "object" && first !== null ? buildSample(first) : sampleForType("item", first)];
  }
  const out = {};
  Object.entries(schema).forEach(([key, value]) => {
    if (value !== null && typeof value === "object") out[key] = buildSample(value);
    else out[key] = sampleForType(key, value);
  });
  return out;
}

/** 브라우저에서 파일 다운로드 실행 */
function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeFilename(name) {
  return (name || "api-spec").replace(/[^a-zA-Z0-9가-힣._-]+/g, "_");
}

function endpointsOf(spec) {
  if (Array.isArray(spec?.endpoints)) return spec.endpoints;
  if (Array.isArray(spec)) return spec;
  return [];
}

/** path 첫 세그먼트로 그룹핑 (/api/v1/users/{id} → users) */
function groupKey(path) {
  const clean = (path || "")
    .replace(/^\/api\/v\d+\//, "")
    .replace(/^\/api\//, "")
    .replace(/^\//, "");
  const first = clean.split("/")[0];
  return first || "default";
}

/* ══════════════════════════════════════
   Postman Collection v2.1
══════════════════════════════════════ */

/**
 * @param spec        API_SPEC 파싱 객체
 * @param projectName 컬렉션 이름
 * @param baseUrl     기본 URL (Mock 서버 URL을 넣으면 바로 호출 가능)
 */
export function exportToPostman(spec, projectName = "API 명세", baseUrl = "") {
  const endpoints = endpointsOf(spec);
  if (!endpoints.length) throw new Error("내보낼 엔드포인트가 없습니다");

  // path 그룹 단위로 폴더 구성
  const groups = {};
  endpoints.forEach(ep => {
    const key = groupKey(ep.path);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ep);
  });

  const collection = {
    info: {
      name: projectName,
      description: spec?.authentication
        ? `인증 방식: ${spec.authentication}`
        : "TIMIROOM이 생성한 API 명세",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: Object.entries(groups).map(([groupName, eps]) => ({
      name: groupName,
      item: eps.map(ep => {
        const method = (ep.method || "GET").toUpperCase();
        // Postman 경로 변수 표기: {id} → :id
        const postmanPath = (ep.path || "/").replace(/\{([^}]+)}/g, ":$1");
        const queryParams = (ep.parameters || []).filter(p => (p.in || "query") === "query");
        const headerParams = (ep.parameters || []).filter(p => p.in === "header");
        const pathParams = (ep.parameters || []).filter(p => p.in === "path");

        const headers = headerParams.map(p => ({
          key: p.name,
          value: String(p.example ?? ""),
          description: p.description || "",
          type: "text",
        }));
        headers.push({ key: "Content-Type", value: "application/json", type: "text" });
        if (ep.authRequired) {
          headers.push({ key: "Authorization", value: "Bearer {{token}}", type: "text" });
        }

        const hasBody = ["POST", "PUT", "PATCH"].includes(method)
          && ep.requestBody && Object.keys(ep.requestBody).length > 0;

        return {
          name: ep.description || `${method} ${ep.path}`,
          request: {
            method,
            header: headers,
            url: {
              raw: `{{baseUrl}}${postmanPath}`,
              host: ["{{baseUrl}}"],
              path: postmanPath.split("/").filter(Boolean),
              query: queryParams.map(p => ({
                key: p.name,
                value: String(p.example ?? ""),
                description: p.description || "",
              })),
              variable: pathParams.map(p => ({
                key: p.name,
                value: String(p.example ?? "1"),
                description: p.description || "",
              })),
            },
            body: hasBody
              ? {
                  mode: "raw",
                  raw: JSON.stringify(buildSample(ep.requestBody), null, 2),
                  options: { raw: { language: "json" } },
                }
              : undefined,
            description: [ep.description, ep.errorCodes && `에러: ${ep.errorCodes}`]
              .filter(Boolean)
              .join("\n\n"),
          },
          response: [],
        };
      }),
    })),
    variable: [
      { key: "baseUrl", value: baseUrl, type: "string" },
      { key: "token", value: "", type: "string" },
    ],
  };

  downloadJson(collection, `${safeFilename(projectName)}_postman_collection.json`);
  return collection;
}

/* ══════════════════════════════════════
   OpenAPI 3.0
══════════════════════════════════════ */

/** 필드 맵 → OpenAPI schema 객체 */
function toOpenApiSchema(fieldMap) {
  if (!fieldMap || typeof fieldMap !== "object") return undefined;

  if (Array.isArray(fieldMap)) {
    const first = fieldMap[0];
    return {
      type: "array",
      items: typeof first === "object" && first !== null
        ? toOpenApiSchema(first)
        : { type: openApiType(first) },
    };
  }

  const properties = {};
  Object.entries(fieldMap).forEach(([key, value]) => {
    if (value !== null && typeof value === "object") {
      properties[key] = toOpenApiSchema(value);
    } else {
      const desc = extractComment(value);
      properties[key] = {
        type: openApiType(value),
        example: sampleForType(key, value),
        ...(desc ? { description: desc } : {}),
      };
    }
  });

  return { type: "object", properties };
}

function openApiType(rawType) {
  const type = cleanType(rawType);
  if (type.startsWith("bool")) return "boolean";
  if (type.startsWith("int") || type.startsWith("long")) return "integer";
  if (type.startsWith("number") || type.startsWith("float") || type.startsWith("double")) return "number";
  if (type.startsWith("array") || type.startsWith("list")) return "array";
  if (type.startsWith("object") || type.startsWith("map")) return "object";
  return "string";
}

/**
 * @param spec        API_SPEC 파싱 객체
 * @param projectName 문서 제목
 * @param baseUrl     servers 항목에 넣을 URL
 */
export function exportToOpenApi(spec, projectName = "API 명세", baseUrl = "") {
  const endpoints = endpointsOf(spec);
  if (!endpoints.length) throw new Error("내보낼 엔드포인트가 없습니다");

  const paths = {};

  endpoints.forEach(ep => {
    const path = ep.path || "/";
    const method = (ep.method || "GET").toLowerCase();
    if (!paths[path]) paths[path] = {};

    const parameters = (ep.parameters || []).map(p => ({
      name: p.name,
      in: p.in || "query",
      required: p.in === "path" ? true : Boolean(p.required),
      description: p.description || "",
      schema: { type: openApiType(p.type) },
      ...(p.example !== undefined && p.example !== null ? { example: p.example } : {}),
    }));

    const hasBody = ["post", "put", "patch"].includes(method)
      && ep.requestBody && Object.keys(ep.requestBody).length > 0;

    const successCode = method === "post" ? "201" : "200";
    const responses = {
      [successCode]: {
        description: "성공",
        ...(ep.successResponse && Object.keys(ep.successResponse).length
          ? { content: { "application/json": { schema: toOpenApiSchema(ep.successResponse) } } }
          : {}),
      },
    };
    if (ep.errorCodes) {
      responses.default = { description: String(ep.errorCodes) };
    }

    paths[path][method] = {
      summary: ep.description || `${ep.method} ${path}`,
      operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
      tags: [groupKey(path)],
      ...(parameters.length ? { parameters } : {}),
      ...(hasBody
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: toOpenApiSchema(ep.requestBody) } },
            },
          }
        : {}),
      responses,
      ...(ep.authRequired ? { security: [{ bearerAuth: [] }] } : {}),
    };
  });

  const doc = {
    openapi: "3.0.3",
    info: {
      title: projectName,
      version: "1.0.0",
      description: spec?.authentication
        ? `인증 방식: ${spec.authentication}`
        : "TIMIROOM이 생성한 API 명세",
    },
    ...(baseUrl ? { servers: [{ url: baseUrl }] } : {}),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  };

  downloadJson(doc, `${safeFilename(projectName)}_openapi.json`);
  return doc;
}
