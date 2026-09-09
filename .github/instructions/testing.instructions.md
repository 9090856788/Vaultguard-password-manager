---
applyTo: "**/*"
---

# Testing rules
- Test acceptance criteria and failure paths, not only happy paths.
- Add regression coverage for fixed bugs.
- Prefer deterministic tests and isolated fixtures.
- Never use real credentials, tokens, or production data in tests.
- Do not weaken assertions to make a failing implementation pass.
- Record meaningful commands and outcomes in engineering artifacts when useful.
- Run `npm run lint` and `npm run build` for broad changes when practical.
