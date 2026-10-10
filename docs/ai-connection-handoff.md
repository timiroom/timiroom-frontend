# AI 도구 연결 버튼

프로필은 Codex·Claude Code 행을 항상 표시한다. 활성 연결이 없으면 `연결`, 있으면 같은 위치에서 `연결 해제`를 제공한다. 같은 도구의 활성 grant가 여러 개면 해제 버튼은 이 계정의 해당 도구 grant를 모두 해제한다. 완료 여부는 서버 응답으로 판단한다.

Codex는 `codex://threads/new?prompt=...`, Claude Desktop의 Code는 `claude://code/new?q=...` 공식 deep link를 사용한다. 연결 설정을 실행하도록 요청하는 문장을 앱에 전달하며 사용자 문서·이름·토큰·OAuth state는 포함하지 않는다. 앱에서 사용자가 요청을 보내고 브라우저에서 계정·프로젝트·권한을 승인해야 한다. 링크 자체가 MCP를 설치하거나 권한을 승인하지 않는다. 앱이 없는 환경에서는 자동 설치하지 않는다.

연결 대기 중에는 최대 3분 동안 화면이 보일 때만 상태를 확인하고 앱에서 돌아오면 즉시 다시 조회한다. 앱 실행 여부를 인증 성공으로 간주하지 않는다. CLI 버전별 지원 여부는 전달한 요청에서 도움말로 확인하도록 명시하며, 새 세션이 필요한 경우 사용자에게 알리도록 한다.

Slack은 별도의 백엔드 OIDC 연결 시작 API를 사용한다. 프론트의 쿼리 파라미터만으로 연결됨을 표시하지 않는다.

공식 근거:
- https://learn.chatgpt.com/docs/reference/commands
- https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link
- https://code.claude.com/docs/en/mcp

검증 범위: 단위 테스트는 deep link 형식·요청 내용·클라이언트별 상태 묶음을 확인한다. 설치된 실제 앱의 열기, 요청 실행, OAuth 완료는 별도 수동 검증이 필요하다.
