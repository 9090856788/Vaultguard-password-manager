# Release Skill

Before release, verify:
- clean build and relevant tests;
- required environment configuration exists without exposing values;
- migrations/backfills are understood;
- startup/health behavior is valid;
- no secrets or generated sensitive data are committed;
- security blockers are resolved or explicitly documented;
- rollback and compatibility considerations are known.

Never claim deployment success without actual deployment evidence.
