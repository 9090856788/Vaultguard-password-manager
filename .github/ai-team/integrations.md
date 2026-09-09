# Integration Contract

The AI team is intentionally integration-aware but not integration-dependent.

## Current
- GitHub: available; use it for repository source, branches, pull requests, and review evidence when supported by the active environment.

## Future optional integrations
- Jira: requirements, tickets, status, sprint planning.
- Figma: design source, UX review, design-to-code context.
- Database: schema inspection, query validation, migrations.
- Monitoring: runtime errors, metrics, traces, alerts.
- Cloud: deployment, infrastructure, environment verification.

## Rules
1. Never claim an integration was used unless the tool was actually available and invoked.
2. Never invent ticket IDs, design links, dashboards, environments, incidents, or deployment status.
3. If an integration is unavailable, create or update the corresponding repository artifact under `docs/engineering/`.
4. When an integration becomes available later, agents should use it where useful without redesigning the team workflow.
5. External state must not override repository evidence for the actual implementation.
