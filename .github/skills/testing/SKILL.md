# Testing Skill

For every change, derive tests from acceptance criteria and risk.

## Layers
- Unit: pure logic and transformations.
- Integration: API, persistence, auth, and boundaries.
- UI: critical user flows and accessibility where practical.
- Regression: every confirmed bug gets a durable test when feasible.
- Security: negative cases for auth, authorization, validation, secret leakage, and tampering.

Prefer deterministic fixtures and sanitized test data. Never use real credentials or tokens.
