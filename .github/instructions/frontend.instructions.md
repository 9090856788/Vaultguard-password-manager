---
applyTo: "src/**/*.{ts,tsx,css}"
---

# Frontend rules
- Prefer existing React components, context, hooks, and API abstractions.
- Keep state ownership explicit and avoid unnecessary global state.
- Treat credentials, tokens, clipboard values, and vault plaintext as sensitive.
- Do not persist secrets in localStorage/sessionStorage unless an approved security design explicitly requires it.
- Handle loading, error, empty, disabled, and destructive states.
- Preserve keyboard navigation, semantic HTML, focus management, and accessible labels.
- Run relevant checks and report evidence.
