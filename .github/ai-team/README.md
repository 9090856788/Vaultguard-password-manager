# VaultGuard AI Engineering Team

This directory defines the operating contract for the repository's Copilot engineering team.

## Team model

`engineering-lead` orchestrates work. Specialists provide independent evidence and recommendations. Implementation agents do not approve their own security-sensitive work.

### Feature lifecycle
1. **Intake** — Product Analyst clarifies the request, acceptance criteria, edge cases, and non-functional requirements.
2. **Codebase analysis** — Codebase Architect maps current behavior, dependencies, reuse opportunities, and impact.
3. **Architecture** — Solution Architect defines APIs, data flow, boundaries, failure modes, and ADRs.
4. **Security gate** — Security/Crypto Architect threat-models authentication, authorization, browser risks, secrets, cryptography, and data exposure.
5. **Plan** — Technical Planner creates a file-level implementation and verification plan.
6. **Build** — Frontend, Backend, Database, Crypto, and Integration engineers implement only their scoped work.
7. **QA** — QA Engineer validates acceptance criteria, regression behavior, negative paths, and tests.
8. **Independent security audit** — Security Auditor checks the actual diff and tests the security assumptions independently.
9. **Performance review** — Performance Engineer reviews changes with meaningful latency, throughput, memory, I/O, or scale impact.
10. **Code review** — Code Reviewer checks correctness, maintainability, scope, and evidence.
11. **Release** — Release Engineer verifies build/release readiness and records known risks.
12. **Documentation** — Documentation Engineer updates user/developer/security documentation.

### Bug lifecycle
`bug-investigator` → root cause → technical plan → scoped implementation → regression tests → security review when relevant → code review → release.

## Quality gates

Each gate should be explicitly reported as `READY`, `BLOCKED`, or `NEEDS_CLARIFICATION`.

- G0 Intake
- G1 Requirements
- G2 Architecture
- G3 Security/Crypto
- G4 Database architecture and JSON-to-Mongo migration planning
- G5 Implementation
- G6 QA
- G7 Independent security audit
- G8 Visual regression
- G9 Code review
- G10 Release readiness

A blocked gate stops downstream work unless the lead documents an explicit, justified exception.

## Artifact protocol

Use repository-native artifacts when external integrations are unavailable:

- `docs/engineering/requirements/` — requirements and acceptance criteria
- `docs/engineering/architecture/` — architecture and diagrams-as-text where useful
- `docs/engineering/threat-models/` — threat models and security assumptions
- `docs/engineering/plans/` — implementation plans
- `docs/engineering/testing/` — test strategy and evidence
- `docs/engineering/security/` — audit findings and remediation evidence
- `docs/engineering/decisions/` — ADRs
- `docs/engineering/releases/` — release readiness and known risks
- `docs/engineering/incident-reports/` — production/maintenance incidents

Use stable names such as `FEATURE-<slug>.md`, `BUG-<slug>.md`, `ADR-<number>-<slug>.md`, and `INC-<number>-<slug>.md`.

## Agent handoff contract

Every specialist response should contain:
1. Objective.
2. Evidence inspected.
3. Findings/decisions.
4. Files changed (or explicitly none).
5. Verification performed.
6. Risks/blockers.
7. Recommended next agent/gate.

Never pass a conclusion as fact when it has not been verified in the repository.

## Integration policy

See `.github/ai-team/config.yml` and `integrations.md`. MCP integrations are optional. Agents must detect available tools rather than assuming them. When Jira/Figma/database/cloud/monitoring MCP is unavailable, continue with GitHub and repository artifacts rather than inventing external state.
