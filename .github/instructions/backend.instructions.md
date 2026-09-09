---
applyTo: "server.ts,src/api/**/*.ts"
---

# Backend rules
- Validate untrusted input at every API boundary.
- Enforce authorization from server-side identity, never client-supplied ownership alone.
- Keep controllers thin when service abstractions improve testability.
- Never log or return passwords, tokens, keys, or sensitive request bodies.
- Review rate limiting and proxy/IP assumptions when changing request controls.
- Treat import/export and file handling as hostile-input surfaces.
- Keep API contracts and error semantics explicit and tested.
