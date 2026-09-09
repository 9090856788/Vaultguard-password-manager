---
applyTo: "**/*"
---

# Security rules
- Assume vault credentials are high-value secrets.
- Do not claim zero-knowledge, encryption-at-rest, or client-side-only security without implementation evidence.
- Do not invent cryptography; use approved primitives and libraries.
- Security-sensitive changes require independent review.
- Check XSS, CSRF, IDOR, injection, secret leakage, auth/session, exports/imports, logging, browser storage, and denial-of-service risks as relevant.
- Never include real secret values in source, fixtures, screenshots, logs, or documentation.
