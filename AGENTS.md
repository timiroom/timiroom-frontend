# Project Agent Rules

## Project Context

This project is a frontend-centered prototype for a product walkthrough. The goal is not to complete a real backend, database, authentication server, infrastructure, or realtime synchronization engine. The goal is to make the interface, sample data, state transitions, and visual feedback feel like a natural and polished product flow.

Treat the product as a document-based collaboration and project management platform.

Core product flows:

- Team creation
- Team member invitation
- Project management
- Document management
- Editing PRD, feature specification, API specification, ERD, and related documents
- Manual saving of document changes
- Showing related content being reflected in connected documents after saving
- Showing results produced by separate agents
- Showing change history
- Visualizing synchronized keywords and connected documents

## Scope Rules

- Work only inside the frontend folder by default.
- Do not modify backend, database, infrastructure, auth server, or real API implementation unless explicitly requested.
- Preserve the existing structure as much as possible.
- Modify only the files needed for the current task.
- Do not scan the whole project when a narrower set of related files is enough.

## Prohibited Exposed Wording

Do not expose the following terms in user-facing UI text, code comments, variable names, component names, document titles, or commit-message-style summaries:

- 눈속임
- 가짜
- 촬영용
- 영상제출용
- 데모용
- fake
- trick
- mock trick
- recording-only
- demo-only

Frontend state transitions and sample data are allowed internally, but visible wording should read like a real product.

## Implementation Priorities

Prioritize the following over full real functionality:

- Stable scenario flow
- Natural screen transitions
- Realistic sample data
- Clear visualization of saved, reflected, synchronized, and completed states
- Polished UI
- A product story that is easy to understand when viewed as a walkthrough
- Interactions where button clicks produce clear visible results

## Document Save And Sync Presentation

Do not build a real synchronization engine unless explicitly requested. Use frontend state to present synchronization as a polished product flow.

Expected flow:

- When a document changes, enable its save button.
- After save, show "반영 중" or "동기화 중" status.
- Show status badges on connected documents, cards, or tabs.
- After a short delay, switch to "반영 완료" or "동기화 완료".
- Show related updates with new items, highlights, change badges, pulse effects, or similar visual cues.
- Add natural change history entries such as "PRD 변경사항이 관련 문서에 반영됨".

## Validation Rules

To save time and tokens, do not run heavy validation unless explicitly requested.

Do not run unless requested:

- `npm run build`
- `npm run lint`
- `npm test`
- Browser launch
- Dev server launch
- E2E tests
- Full project inspection

Allowed lightweight checks:

- Check imports in modified files
- Check component props
- Check related file connections
- Check obvious syntax-risk areas
- Summarize changed files

## Work Process

For each task:

- Briefly understand the current request.
- Inspect only related files.
- Keep the modification scope minimal.
- Ensure visible text reads like a real product.
- Summarize changed files and behavior.
- Do not run build or tests unless explicitly requested.

## Response Format

After completing work, keep the response short and include:

- Implemented flow
- Key changed files
- Visible screen changes
- Validation not run
- Useful next step
