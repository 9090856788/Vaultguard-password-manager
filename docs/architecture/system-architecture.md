# VaultGuard System Architecture (Target)

**Date:** September 2026
**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning
**Status:** Target architecture; database details are governed by G4 documents
**Branch:** `tech-stack-migration`

> This system overview is retained as a cross-layer target. The G3 security
> baseline and G4 database documents are authoritative for security and
> persistence decisions.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VAULTGUARD SYSTEM                         │
├──────────────────────────────────────┬──────────────────────────┤
│                                      │                          │
│         WEB CLIENT (Browser)         │   MOBILE CLIENT (Future) │
│                                      │                          │
│  React 19 + TypeScript               │   React Native (Phase 4) │
│  React Router                        │                          │
│  Redux Toolkit (App State)           │  Shared business logic   │
│  TanStack Query (Server State)       │  via API                 │
│  CSS Modules + CSS Variables         │                          │
│                                      │                          │
│  ┌────────────────────────────────┐ │                          │
│  │  Layers:                       │ │                          │
│  │  - UI Components (Presentational) │ │                          │
│  │  - Feature Containers          │ │                          │
│  │  - Redux Slices                │ │                          │
│  │  - TanStack Query Hooks        │ │                          │
│  │  - Services (API, Crypto, Auth)  │ │                          │
│  └────────────────────────────────┘ │                          │
└──────────────────────────────────────┴──────────────────────────┘
           │                    │                    │
           │ REST API          │ REST API           │ gRPC (Future)
           │ (HTTPS)           │ (HTTPS)            │
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Express)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Middleware Stack:                                               │
│  - CORS                                                          │
│  - Request logging (structured pino)                            │
│  - Request ID generation                                        │
│  - Rate limiting (global + per-endpoint)                        │
│  - Body parsing                                                 │
│  - CSRF protection                                              │
│  - Security headers                                             │
│  - Error handling                                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      ROUTER LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│  ├── /health (system health)                                     │
│  ├── /ready (readiness probe)                                    │
│  ├── /metrics (Prometheus metrics)                               │
│  ├── /api/v1/auth/* (authentication)                            │
│  ├── /api/v1/vaults/* (vault operations)                        │
│  ├── /api/v1/passwords/* (password management)                  │
│  ├── /api/v1/categories/* (category management)                 │
│  ├── /api/v1/activities/* (activity logging)                    │
│  ├── /api/v1/audit/* (audit logs)                               │
│  └── /api/v1/security/* (security events)                       │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│  HTTP Concerns Only:                                             │
│  - Parse request parameters                                      │
│  - Call service methods                                          │
│  - Format HTTP responses                                         │
│  - Set HTTP status codes                                         │
│  - Handle HTTP errors                                            │
│                                                                  │
│  Controllers:                                                    │
│  ├── AuthController                                              │
│  ├── VaultController                                             │
│  ├── PasswordController                                          │
│  ├── CategoryController                                          │
│  ├── ActivityController                                          │
│  └── AuditController                                             │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
├──────────────────────────────────────────────────────────────────┤
│  Business Logic:                                                 │
│  - Authentication logic                                          │
│  - Authorization checks                                          │
│  - Validation (Joi/Zod schemas)                                 │
│  - Password strength analysis                                    │
│  - Vault encryption/decryption boundaries                        │
│  - Activity logging                                              │
│  - Error handling with AppError                                 │
│                                                                  │
│  Services:                                                       │
│  ├── AuthService (authentication, tokens)                        │
│  ├── VaultService (vault operations)                            │
│  ├── PasswordService (password CRUD + strength)                 │
│  ├── CategoryService (category management)                       │
│  ├── EncryptionService (crypto operations)                      │
│  ├── ActivityService (logging)                                   │
│  ├── AuditService (security events)                             │
│  └── TokenRevocationService (session management)                │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  REPOSITORY LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│  Data Abstraction (Interfaces):                                  │
│  - UserRepository                                                │
│  - VaultRepository                                               │
│  - PasswordRepository                                            │
│  - CategoryRepository                                            │
│  - ActivityRepository                                            │
│  - SessionRepository                                             │
│  - AuditEventRepository                                          │
│                                                                  │
│  Implementations:                                                │
│  └── MongoDB Repositories (via Mongoose)                         │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   MONGOOSE MODELS                                │
├──────────────────────────────────────────────────────────────────┤
│  Persistence Layer:                                              │
│  ├── User model (accounts + hashed master password)             │
│  ├── Vault model (encrypted vault metadata)                     │
│  ├── VaultItem model (encrypted password entries)               │
│  ├── Category model (category definitions)                      │
│  ├── Activity model (audit trail)                               │
│  ├── SessionToken model (revocation + TTL)                      │
│  └── AuditEvent model (security events)                         │
│                                                                  │
│  Indexes, uniqueness, validation at schema level                │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  MONGODB INSTANCE                                │
├──────────────────────────────────────────────────────────────────┤
│  Database: vaultguard                                            │
│  ├── users (user accounts)                                       │
│  ├── vaults (vault containers)                                   │
│  ├── vaultitems (individual password entries)                    │
│  ├── categories (password categories)                            │
│  ├── activities (activity logs)                                  │
│  ├── sessions (session tokens for revocation)                    │
│  └── auditevents (security audit trail)                          │
│                                                                  │
│  Backup strategy: Daily snapshots + transaction logs             │
│  Replication: MongoDB Atlas Replica Set (production)             │
│  Encryption at rest: KMIP-based encryption (production)          │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Principles

1. **Separation of Concerns**
   - Controllers: HTTP only
   - Services: Business logic only
   - Repositories: Data access only
   - Models: Schema + validation only

2. **Security-First Design**
   - Encryption boundaries clearly defined
   - No plaintext passwords in database
   - No secrets in source code
   - Token revocation support
   - Session management explicit

3. **State Management Discipline**
   - Redux Toolkit: Application/client state
   - TanStack Query: Server/API state
   - React local: Truly local UI state only
   - Clear data flow (unidirectional)

4. **API Contract Clarity**
   - Swagger/OpenAPI documentation
   - Consistent request/response formats
   - Explicit error codes
   - Versioning strategy

5. **Observability**
   - Structured logging (request IDs, context)
   - Health checks
   - Metrics collection
   - Audit logging for security events

---

## 2. Technology Stack (Confirmed Target)

### Frontend Stack

- **Framework:** React 19 + TypeScript 5.8+
- **Build:** Vite 6+
- **Routing:** React Router v6
- **State Management:**
  - Redux Toolkit (application state)
  - TanStack Query (server state)
- **Styling:** CSS Modules + CSS Variables (Tailwind → migrate)
- **Testing:** Vitest + React Testing Library
- **HTTP Client:** TanStack Query + fetch API
- **UI:** React components (no pre-built library)

### Backend Stack

- **Runtime:** Node.js 18+ (ES modules)
- **Framework:** Express.js 4
- **Language:** TypeScript 5.8+
- **Validation:** Joi or Zod
- **Logging:** pino (structured logging)
- **Testing:** Supertest + Vitest
- **API Docs:** Swagger/OpenAPI

### Database Stack

- **Engine:** MongoDB 5.0+
- **ORM:** Mongoose 7+ (NOT Prisma/TypeORM)
- **Connection:** mongoose.connect() with pooling
- **Features:** Transactions, TTL indexes, full text search

### Infrastructure (Initial)

- **Hosting:** Self-hosted or cloud VM (not Kubernetes)
- **Monitoring:** Structured logs → ELK/CloudWatch
- **Secrets:** Environment variables (12-factor app)
- **CI/CD:** GitHub Actions

### AI Integration (Phase 1)

- **Provider abstraction:** @google/genai v2.4+ (installed)
- **Skeleton:** LLM provider interface (no product features)
- **Phase 2:** Security recommendations + vault health

---

## 3. Architecture Layers (Detailed)

### 3.1 Presentation Layer (Browser)

**Components:**

- Presentational components (UI primitives)
- Container components (Redux/Query integration)
- Pages (route-level components)
- Layouts (navigation containers)
- Modals (overlays)

**State Management:**

- Redux Toolkit slices (auth, passwords, categories, ui, theme)
- TanStack Query hooks (server data)
- React.useState (local component state only)

**Styling:**

- CSS Modules (component scoped)
- CSS Variables (theme tokens)
- Global CSS (resets, base styles)
- Tailwind utilities converted to CSS

### 3.2 Route/API Layer

**Responsibilities:**

- HTTP request routing
- Parameter extraction
- Controller dispatch
- Response formatting
- Error handling

**Middleware Stack:**

- CORS (security)
- Request logging (observability)
- Request ID generation (traceability)
- Rate limiting (security)
- CSRF protection (security)
- Authentication (security)
- Authorization (security)
- Error handler (consistency)

### 3.3 Controller Layer

**Responsibilities:**

- Parse HTTP request parameters
- Validate request format (basic)
- Call appropriate service
- Format HTTP response
- Set HTTP status codes

**Constraint:** Controllers should be thin (~20-40 lines max)

**Example:**

```typescript
// AuthController.register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, masterPassword, fullName } = req.body;
    const result = await authService.register(email, masterPassword, fullName);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
```

### 3.4 Service Layer

**Responsibilities:**

- Business logic implementation
- Validation (Joi/Zod schemas)
- Authorization checks
- Calling repositories
- Exception handling
- Activity logging

**Services:**

- `AuthService`: Login, register, token refresh, password change
- `VaultService`: Create/read/update/delete vaults
- `PasswordService`: Password CRUD, strength analysis, deduplication
- `CategoryService`: Category management
- `EncryptionService`: Client/server encryption boundaries
- `ActivityService`: Log activity events
- `AuditService`: Log security events
- `TokenRevocationService`: Session/token management

**Example:**

```typescript
// PasswordService.createPassword
export async function createPassword(
  userId: string,
  vaultId: string,
  data: CreatePasswordInput,
): Promise<PasswordResponse> {
  // 1. Validate input
  const validated = createPasswordSchema.validate(data);

  // 2. Check authorization (user owns vault)
  await checkVaultOwnership(userId, vaultId);

  // 3. Check for duplicates
  const existing = await passwordRepo.findByHost(vaultId, data.host);
  if (existing) {
    throw new AppError("Password for this host already exists", 409);
  }

  // 4. Create record
  const password = await passwordRepo.create({
    vaultId,
    ...data,
    createdBy: userId,
    createdAt: new Date(),
  });

  // 5. Log activity
  await activityService.logPasswordCreated(userId, vaultId, password.id);

  return formatPasswordResponse(password);
}
```

### 3.5 Repository Layer

**Responsibilities:**

- Data access abstraction
- Query construction
- Transaction management
- Index usage
- Query result mapping

**Pattern:** Repository interfaces (abstraction) + MongoDB implementations

**Example Interface:**

```typescript
export interface IPasswordRepository {
  create(data: CreatePasswordInput): Promise<Password>;
  findById(id: string): Promise<Password | null>;
  findByVault(vaultId: string): Promise<Password[]>;
  update(id: string, data: UpdatePasswordInput): Promise<Password>;
  delete(id: string): Promise<void>;
  deleteByVault(vaultId: string): Promise<void>;
}
```

**Example Implementation:**

```typescript
export class MongoPasswordRepository implements IPasswordRepository {
  async create(data: CreatePasswordInput): Promise<Password> {
    const doc = new PasswordModel(data);
    await doc.save();
    return doc.toObject() as Password;
  }

  async findById(id: string): Promise<Password | null> {
    return PasswordModel.findById(id).lean().exec();
  }

  // ... other methods
}
```

### 3.6 Model Layer (Mongoose)

**Responsibilities:**

- Schema definition
- Type validation
- Indexes
- Middleware hooks
- Query helpers

**Models:**

- User (accounts + master password hash)
- Vault (container for passwords)
- VaultItem (encrypted password entry)
- Category (password categories)
- Activity (audit trail)
- SessionToken (revocation support)
- AuditEvent (security events)

**Example Schema:**

```typescript
const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  accountPasswordVerifier: { type: String, required: true }, // account authentication only
  fullName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String }, // encrypted
  preferences: {
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    language: { type: String, default: "en" },
    autoLock: { type: Number, default: 15 }, // minutes
  },
  deletedAt: { type: Date }, // soft delete
});

userSchema.index({ email: 1 });
userSchema.index({ deletedAt: 1 });
```

---

## 4. Data Flow Examples

### 4.1 User Registration Flow

```
1. User → Browser: Fill registration form
2. Browser → App: Dispatch registerUser action
3. Redux → TanStack Query: Call POST /api/v1/auth/register
4. API Gateway → Logger: Log incoming request with request ID
5. Rate Limiter → Middleware: Check auth endpoint limit
6. Router → AuthController: dispatch register()
7. AuthController → AuthService: register(email, password, name)
8. AuthService → Validator: validate input with Joi schema
9. AuthService → UserRepository: check email not exists
10. AuthService → UserRepository: create user with bcrypt(password)
11. AuthRepository → PasswordModel: save user
12. PasswordModel → MongoDB: insert document
13. MongoDB → Model: return saved user
14. AuthService → EncryptionService: derive vault encryption key (placeholder)
15. AuthService → VaultRepository: create default vault
16. AuthService → ActivityService: log user registration
17. AuthService → AuthController: return { userId, token, refreshToken }
18. AuthController → Response: 201 { userId, token, refreshToken, user }
19. Browser → Redux: Dispatch setAuth(user, token)
20. Browser → Secure, HttpOnly, SameSite-configured session cookies
21. Browser → User: Navigate to /dashboard
```

### 4.2 Password Retrieval Flow

```
1. User → Browser: Click password list in /dashboard
2. Browser → TanStack Query: usePasswords() hook (auto-fetch)
3. TanStack Query → API: GET /api/v1/passwords?vaultId=xyz
4. API Gateway → Auth Middleware: Extract and verify JWT token
5. Auth Middleware → TokenRevocationService: Check token not revoked
6. Router → PasswordController: listPasswords(vaultId)
7. PasswordController → PasswordService: getPasswordsByVault(userId, vaultId)
8. PasswordService → VaultService: checkVaultOwnership(userId, vaultId)
9. PasswordService → PasswordRepository: findByVault(vaultId)
10. PasswordRepository → PasswordModel: exec query with indexes
11. MongoDB → Model: return encrypted password documents
12. PasswordService → Response: format and filter sensitive fields
13. PasswordController → Response: 200 { passwords: [...], count: n }
14. Browser → TanStack Query: Cache response
15. Browser → Redux: Optional dispatch for UI state
16. Browser → UI: Render password list (grid/table)
```

### 4.3 Password Encryption/Decryption Flow (Phase 2+)

```
CLIENT SIDE (Browser):
1. User enters vault (after login)
2. TanStack Query: GET /api/v1/vaults/xyz/key (authenticated wrapped VEK envelope)
3. EncryptionService: Derive KEK locally and unwrap the VEK
4. Redux: Store decrypted vault key in memory (NOT localStorage)

VIEWING PASSWORD:
1. PasswordService: Fetch GET /api/v1/passwords/abc (encrypted)
2. Browser receives: { id, host, encryptedPassword, encryptedNotes, ... }
3. EncryptionService: Decrypt using vault key (AES-256-GCM)
4. Redux: Store plaintext temporarily
5. UI: Display plaintext for user
6. On logout: Redux clears vault key + plaintext passwords

SERVER SIDE (Backend - Future):
- All password data encrypted at rest
- Encryption key NOT on server
- Server stores only encrypted blobs
- Server cannot decrypt passwords
```

---

## 5. Security Boundaries

### 5.1 Account Authentication Boundary

```
REQUEST FLOW:
User password (plaintext) → TLS → Express
Express → BcryptService → Verify against DB hash
BcryptService → Return boolean
✗ Plaintext password NEVER stored
✓ Hash stored in MongoDB
✓ Comparison happens in service layer
```

### 5.2 Token Management Boundary

```
CURRENT STATE (prototype):
- Access token in localStorage (XSS risk)
- Refresh token in localStorage (XSS risk)

TARGET STATE (G3 approved; implementation at G5):
- Access token in HttpOnly cookie (Secure, SameSite=Strict)
- Refresh token in separate HttpOnly cookie
- CSRF token in headers or custom cookie
- Token revocation via SessionToken collection
```

### 5.3 Vault Encryption Boundary (Phase 2+)

```
RECOMMENDED ARCHITECTURE:

PHASE 1 (Skeleton):
- Passwords stored plaintext on server
- Encryption layer abstracted but not implemented
- Landing page updated to reflect reality

TARGET STATE (G3 approved; implementation at G5):
CLIENT SIDE:
- Vault Master Password → versioned Argon2id → KEK
- KEK → authenticated unwrap → random VEK
- Plaintext passwords in Redux memory only
- On logout: Clear everything

SERVER SIDE:
- VEK: Authenticated envelope wrapped under the browser-derived KEK
- Passwords: Encrypted with vault key (AES-256-GCM)
- Server cannot decrypt passwords
- Server returns encrypted data only
- Client decrypts and displays
```

### 5.4 Authorization Boundary

```
PATTERN:
1. Extract userId from JWT token
2. Service method checks: does userId own this resource?
3. Prevent IDOR by always checking ownership

EXAMPLE:
GET /api/v1/passwords/abc
- Extract userId from token
- Load password from DB
- Check password.vaultId exists
- Load vault from DB
- Check vault.userId === userId
- If no match: 403 Forbidden
- If match: return password
```

---

## 6. Integration Points

### 6.1 Frontend to Backend

- **Protocol:** REST over HTTPS
- **Authentication:** JWT in Authorization header
- **Request Format:** JSON
- **Response Format:** JSON with standard envelope
- **Error Format:** Consistent error codes + messages
- **Pagination:** cursor or limit/offset (TBD per endpoint)
- **Rate Limiting:** By IP address (global) + per-user (auth endpoints)

### 6.2 Backend to MongoDB

- **Connection:** Mongoose via connection pool
- **Transactions:** For multi-document consistency
- **Indexes:** Defined in schemas for performance
- **Replication:** Atlas Replica Set (production)
- **Backup:** Daily snapshots + continuous backup

### 6.3 Frontend to Local Storage/Cookies

- **Access tokens:** HttpOnly cookie (Phase 3+)
- **Refresh tokens:** HttpOnly cookie (Phase 3+)
- **Vault key:** Memory only (NOT persistent)
- **Plaintext passwords:** Memory only (NOT persistent)
- **User preference:** localStorage (theme, language)

### 6.4 Backend to External Services

- **Email:** SendGrid (future, not Phase 1)
- **Observability:** DataDog/NewRelic (future, not Phase 1)
- **AI:** Gemini API (Phase 2, skeleton only)

---

## 7. Scalability Considerations

### Horizontal Scaling

- **Stateless backend:** Can run multiple instances
- **Load balancer:** Route requests across instances
- **Database:** MongoDB Atlas handles replication + failover
- **Session storage:** SessionToken collection in MongoDB (not memory)

### Vertical Scaling

- **Database indexing:** Optimize slow queries
- **Query optimization:** Cache results where appropriate
- **Pagination:** Prevent large result sets
- **Connection pooling:** Mongoose manages connection pool

### Caching Strategy

- **TanStack Query:** Client-side cache (automatic invalidation)
- **Redis:** Not Phase 1 (keep MongoDB sufficient initially)
- **CDN:** For static assets (Vite + nginx)

---

## 8. Next Steps (Architecture Review)

1. ✅ Reviewed baseline assessment (confirmed P0 issues)
2. ⏳ Design frontend architecture in detail
3. ⏳ Design backend architecture in detail
4. ⏳ Design database architecture in detail
5. ⏳ Design authentication/session management
6. ⏳ Design vault encryption boundaries
7. ⏳ Create migration strategy
8. ⏳ Create risk register
9. ⏳ Produce architecture gate decision
