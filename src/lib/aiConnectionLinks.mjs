export const aiClients = { "timiroom-codex": "Codex", "timiroom-claude": "Claude Code" };

export function connectionRows(grants) {
  const clients = [...new Set([...Object.keys(aiClients), ...grants.filter(item => item.active).map(item => item.clientId)])];
  return clients.map(clientId => ({ clientId, grants: grants.filter(item => item.clientId === clientId && item.active) }));
}

export function aiConnectionLink(clientId, apiBase) {
  if (!Object.hasOwn(aiClients, clientId)) throw new Error("지원하지 않는 AI 도구입니다.");
  const origin = new URL(apiBase);
  if ((origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))
      || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new Error("티미룸 연결 주소를 확인하지 못했습니다.");
  }
  const endpoint = `${origin.origin}/mcp`;
  const common = `티미룸 MCP를 이 컴퓨터의 ${aiClients[clientId]}에 연결해줘. 안내만 작성하지 말고 실제 등록과 OAuth 로그인을 실행해줘.\n`
    + `서버 주소: ${endpoint}\n로컬 세션에서 진행해. 기존 같은 주소의 등록이 있으면 재사용하고 아래 예시의 timiroom 이름을 그 등록 이름에 맞춰 바꿔. 다른 MCP 설정과 인증정보는 보존해. 다른 주소의 timiroom 등록이 있으면 덮어쓰지 말고 확인해. CLI 도움말로 지원 옵션을 확인해.\n`;
  const setup = clientId === "timiroom-codex"
    ? `사용자 Codex config.toml에 아래 항목만 병합해(기존 파일 전체를 덮어쓰지 마):\n[mcp_servers.timiroom]\nurl = "${endpoint}"\n[mcp_servers.timiroom.oauth]\nclient_id = "timiroom-codex"\ncallback_url = "http://127.0.0.1:56381/callback"\ncallback_port = 56381\n그 뒤 codex mcp login timiroom을 실행해.\n`
    : `등록이 없으면 claude mcp add --transport http --scope user --client-id timiroom-claude --callback-port 56382 timiroom ${endpoint} 를 실행해. 그 뒤 claude mcp login timiroom을 실행해.\n`;
  const prompt = common + setup
    + `브라우저의 티미룸 계정·프로젝트·권한 승인은 내가 직접 선택하게 해. client secret이나 계정 비밀번호를 요구하거나 토큰을 출력하지 마. 인증 성공 후 MCP 도구 목록과 접근 가능한 프로젝트 조회를 검증해. 도구가 새 세션에서만 반영되면 정확히 알려줘. 완료하면 티미룸 마이페이지로 돌아가 연결 상태를 확인할 수 있게 해줘. 이후 개발 시 명세·수정 제안·정합성 검사는 티미룸 도구를 사용하고 PM 승인 없이 문서를 적용하지 마.`;
  return clientId === "timiroom-codex"
    ? `codex://threads/new?prompt=${encodeURIComponent(prompt)}`
    : `claude://code/new?q=${encodeURIComponent(prompt)}`;
}
