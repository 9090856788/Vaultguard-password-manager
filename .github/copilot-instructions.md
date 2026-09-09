# VaultGuard Password Manager — Copilot Engineering Rules

## Mission
Build and maintain VaultGuard as a production-minded password manager. Optimize for correctness, security, maintainability, testability, and clear evidence—not speed alone.

## Repository context
- Frontend: React + TypeScript + Vite + Tailwind.
- Backend: Express + TypeScript.
- Current persistence is file-based JSON under `.vault_data/` and is prototype-grade.
- Authentication currently uses JWT access/refresh tokens.
- Treat all current cryptographic/storage claims as untrusted until verified against implementation.

## Non-negotiable security rules
1. Never expose, print, commit, or reproduce secrets, tokens, passwords, private keys, `.env` values, or real user data.
2. Never claim VaultGuard is zero-knowledge or end-to-end encrypted unless the implementation and threat model substantiate that claim.
3. Do not introduce custom cryptography when a well-reviewed standard primitive/library is appropriate.
4. Security-sensitive changes require independent review by `security-crypto-architect` and/or `security-auditor`.
5. Never weaken authentication, authorization, encryption, validation, rate limiting, logging hygiene, or session security to make a test pass.
6. Treat browser XSS as a credential-compromise threat. Avoid unsafe HTML and accidental secret persistence.
7. Do not log passwords, vault plaintext, authentication secrets, access tokens, refresh tokens, encryption keys, or sensitive request bodies.

## Engineering rules
- Inspect existing code before changing it.
- Reuse existing abstractions where sound; do not rewrite unrelated areas.
- Keep frontend, backend, data, crypto, and integration responsibilities explicit.
- Preserve behavior unless the requested change intentionally changes it.
- Validate inputs at trust boundaries.
- Prefer small, reviewable changes over broad rewrites.
- Update types when contracts change; avoid `any` unless justified.
- Run the narrowest relevant tests first, then broader validation.
- Run `npm run lint` and `npm run build` when practical for implementation changes.
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
