# VaultGuard Password Manager — Copilot Engineering Rules

## Mission
Build and maintain VaultGuard as a production-minded password manager. Optimize for correctness, security, maintainability, testability, and clear evidence—not speed alone.

## Final target stack
- Frontend: React + TypeScript + Vite + React Router.
- Styling: CSS Modules + CSS variables + standard CSS/media queries. Do not introduce Tailwind CSS.
- Client state: Redux Toolkit.
- Server state: TanStack Query.
- Backend: Node.js + Express + TypeScript using a simple MVC architecture.
- API: REST with Swagger/OpenAPI documentation.
- Database: MongoDB accessed through Mongoose. Do not introduce an ORM.
- Cache/session/rate-limit infrastructure: MongoDB initially; keep boundaries replaceable so Redis can be introduced later when justified by scale.
- AI: Phase 1 is only an AI skeleton/provider abstraction with Gemini support. Full AI product features are Phase 2.
- Testing: Vitest, React Testing Library, Supertest, and Playwright.
- Tooling: ESLint, Prettier, Docker, GitHub Actions.
- Observability: structured logging and health checks initially; OpenTelemetry/error tracking can be added later.

## Architecture principles
- Prefer a simple, understandable modular monolith over premature microservices.
- Backend request flow should normally be route → controller → service → model/data access.
- Keep controllers focused on HTTP concerns and services focused on business logic.
- Keep Mongoose models focused on persistence/schema concerns.
- Do not access MongoDB directly from controllers.
- Keep frontend API/server state separate from client-only state.
- Keep AI, crypto, security, and persistence boundaries explicit.
- Use industry-standard naming consistently: kebab-case filenames, PascalCase React components/classes/types, camelCase functions/variables, and descriptive names.
- Keep code clean, readable, small, and understandable. Avoid unnecessary abstractions, duplication, deep nesting, and clever implementations.

## Environment and secrets
- MongoDB connection details must come from environment variables, never source code.
- `.env` and real credentials must never be committed.
- `.env.example` must contain only dummy/example values.
- The repository may use a dummy MongoDB URI until the real URI is supplied by the project owner.

## Non-negotiable security rules
1. Never expose, print, commit, or reproduce secrets, tokens, passwords, private keys, `.env` values, real database credentials, or real user data.
2. Never claim VaultGuard is zero-knowledge or end-to-end encrypted unless the implementation and threat model substantiate that claim.
3. Do not introduce custom cryptography when a well-reviewed standard primitive/library is appropriate.
4. Security-sensitive changes require independent review by `security-crypto-architect` and/or `security-auditor`.
5. Never weaken authentication, authorization, encryption, validation, rate limiting, logging hygiene, or session security to make a test pass.
6. Treat browser XSS as a credential-compromise threat. Avoid unsafe HTML and accidental secret persistence.
7. Do not log passwords, vault plaintext, authentication secrets, access tokens, refresh tokens, encryption keys, or sensitive request bodies.

## Engineering rules
- Inspect existing code before changing it.
- Reuse existing abstractions where sound; do not rewrite unrelated areas.
- Preserve behavior unless the requested change intentionally changes it.
- Validate inputs at trust boundaries.
- Prefer small, reviewable changes over broad rewrites.
- Update types/contracts when they change; avoid `any` unless justified.
- Swagger/OpenAPI must remain aligned with actual API behavior.
- Run the narrowest relevant tests first, then broader validation.
- Run lint, type checking, and build when practical for implementation changes.
- Never mark work complete without reporting verification evidence and remaining risks.

## AI team workflow
Use the specialized agents in `.github/agents/` and the workflow in `.github/ai-team/README.md`.
Artifacts belong under `docs/engineering/`.

For a new feature: requirements → codebase analysis → architecture → security/crypto review → implementation plan → implementation → QA → security audit → performance review when relevant → code review → release/docs.

For a bug: reproduce/evidence → root cause → plan → implementation → regression tests → security review when relevant → code review → release.

## Integration policy
Read `.github/ai-team/config.yml` and `.github/ai-team/integrations.md`. Never invent Jira, Figma, database, monitoring, cloud, or other MCP access. If an integration is unavailable, use repository-native artifacts and clearly record the fallback.

## Completion standard
A task is complete only when:
- acceptance criteria are met;
- relevant tests/checks pass;
- security implications are reviewed when applicable;
- changed files are known;
- no unrelated changes were introduced;
- remaining risks or follow-ups are explicitly documented.
