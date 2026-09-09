# G4 API and Database Contract

**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning
**Status:** Target contract for G5 implementation; not current runtime behavior

The current API is a JSON-store prototype. This contract defines the target
service boundaries and security behavior for MongoDB implementation.

## Common Rules

- Controllers handle HTTP parsing and response mapping only.
- Services enforce business rules and ownership.
- Repositories perform Mongoose access.
- Request identity comes from validated access-token claims, never a request
  body `userId`.
- State-changing cookie requests require CSRF protection.
- Secret-bearing input is accepted only as a client-encrypted envelope after
  the vault key workflow exists. The server must not calculate password
  strength or inspect plaintext secrets.
- Responses never return account verifiers, TOTP secrets, recovery hashes,
  raw refresh tokens, KEKs, VEKs, or plaintext vault fields.

## Endpoint Map

| Area | Target routes | Collections | Ownership and transaction behavior |
|---|---|---|---|
| `/auth` | register, login, refresh, logout, me, change password | users, sessions, auditEvents | Login/2FA/session creation; refresh rotation is atomic; password change revokes sessions |
| `/vaults` | list, create, update key metadata, delete | vaults, auditEvents | Authenticated user owns vault; key changes require envelope validation and transaction |
| `/passwords` | list, create, update, trash, restore, purge, view/copy event | vaultItems, vaults, categories, activities, auditEvents | Resolve owned vault before item access; item mutation is revision checked |
| `/categories` | list, create, rename, delete | categories, vaults, activities | Unique active normalized name per vault; no cross-vault category references |
| `/activities` | timeline, clear if product retains feature | activities, auditEvents | User-owned safe activity only; clearing activity cannot erase audit evidence |
| `/audit` | restricted security event query | auditEvents | User may see allowed own events; administrative access is separate |
| `/security` | stats, 2FA enrollment/verify/disable, recovery | users, sessions, auditEvents | Sensitive lifecycle operations require current auth and step-up verification |
| `/health` | liveness/readiness | none or infrastructure metadata | Must not expose database credentials or secret configuration |
| `/import-export` | encrypted import/export, explicit plaintext CSV mode | vaults, vaultItems, categories, activities, auditEvents | Stage and verify atomically; plaintext export stays client-side |

## Response Shapes

Collection endpoints return `{ items, nextCursor? }`. Mutations return `{ item,
revision }` or a typed status object. Errors use `{ error: { code, message,
requestId } }` and do not echo secret input. Authorization failures do not
reveal whether another user's resource ID exists.

## Import and Export Boundary

Encrypted export is a versioned authenticated portable envelope generated from
client-decrypted data. Plaintext CSV is a separate explicitly confirmed mode;
the client generates the file and the server does not persist plaintext merely
to export it. Encrypted import is size-bounded, schema-validated, staged, and
committed only after duplicate and envelope verification. Legacy plaintext
import enters quarantine and follows the G4 migration boundary.

## Current-to-Target Gap

The current source has `/api/v1/passwords`, `/categories`, `/activity`,
`/security`, and `/vault` routes backed directly by the JSON store. It accepts
plaintext password fields, sends refresh tokens in request bodies, and has no
sessions collection. Those are legacy observations, not this target contract.
