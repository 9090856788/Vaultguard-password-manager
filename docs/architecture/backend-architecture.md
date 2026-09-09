# Backend Architecture (Target)

**Date:** September 2026  
**Gate:** G2 - Architecture Review  
**Focus:** Express, MVC, Services, Repositories, Validation

---

## 1. Backend Technology Stack

### 1.1 Core Dependencies

```json
{
  "dependencies": {
    "express": "^4.21+",
    "typescript": "^5.8+",
    "joi": "^17.11+",
    "bcryptjs": "^3.0+",
    "jsonwebtoken": "^9.0+",
    "pino": "^8.17+",
    "mongoose": "^8.0+",
    "cors": "^2.8+",
    "helmet": "^7.1+"
  },
  "devDependencies": {
    "tsx": "^4.7+",
    "nodemon": "^3.0+",
    "vitest": "^1.1+",
    "supertest": "^6.3+"
  }
}
```

### 1.2 Rationale

| Technology | Why                      | Alternative | Why Not                       |
| ---------- | ------------------------ | ----------- | ----------------------------- |
| Express    | Lightweight, well-tested | Fastify     | Overkill for Phase 1          |
| Joi        | Powerful validation      | Zod         | Joi more established          |
| Mongoose   | ODM for MongoDB          | Prisma      | More opinionated, unnecessary |
| pino       | Structured logging       | Winston     | Faster, simpler               |
| JWT        | Standard auth            | OAuth2      | JWT sufficient for Phase 1    |
| bcryptjs   | Password hashing         | argon2      | Phase 2+ enhancement          |

---

## 2. Folder Structure

### 2.1 Proposed Backend Organization

```
server.ts                          # Entry point (Node.js)
src/
├── api/
│   ├── app.ts                     # Express app factory
│   ├── server.ts                  # Server startup (if separate)
│   │
│   ├── config/
│   │   ├── env.ts                 # Environment config + validation
│   │   ├── database.ts            # MongoDB connection
│   │   └── constants.ts           # App constants
│   │
│   ├── middleware/
│   │   ├── cors.ts
│   │   ├── authentication.ts       # JWT verification
│   │   ├── authorization.ts       # RBAC
│   │   ├── errorHandler.ts        # Global error handler
│   │   ├── logger.ts              # Request logging
│   │   ├── rateLimiter.ts         # Rate limiting
│   │   ├── requestId.ts           # Request ID generation
│   │   ├── security.ts            # Security headers (helmet)
│   │   └── validation.ts          # Joi middleware
│   │
│   ├── routes/
│   │   ├── index.ts               # Router setup
│   │   ├── health.ts              # /health, /ready
│   │   ├── auth.ts                # /api/v1/auth/*
│   │   ├── vaults.ts              # /api/v1/vaults/*
│   │   ├── passwords.ts           # /api/v1/passwords/*
│   │   ├── categories.ts          # /api/v1/categories/*
│   │   ├── activities.ts          # /api/v1/activities/*
│   │   └── audit.ts               # /api/v1/audit/*
│   │
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── vaultController.ts
│   │   ├── passwordController.ts
│   │   ├── categoryController.ts
│   │   ├── activityController.ts
│   │   ├── auditController.ts
│   │   └── healthController.ts
│   │
│   ├── services/
│   │   ├── index.ts               # Service exports
│   │   ├── authService.ts         # Authentication logic
│   │   ├── vaultService.ts        # Vault operations
│   │   ├── passwordService.ts     # Password CRUD + analysis
│   │   ├── categoryService.ts     # Category management
│   │   ├── activityService.ts     # Activity logging
│   │   ├── auditService.ts        # Audit logging
│   │   ├── tokenRevocationService.ts  # Session management (Phase 3)
│   │   ├── encryptionService.ts   # Crypto operations (Phase 2+)
│   │   └── emailService.ts        # Email sending (Future)
│   │
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── IUserRepository.ts
│   │   │   ├── IVaultRepository.ts
│   │   │   ├── IPasswordRepository.ts
│   │   │   ├── ICategoryRepository.ts
│   │   │   ├── IActivityRepository.ts
│   │   │   ├── ISessionRepository.ts
│   │   │   └── IAuditEventRepository.ts
│   │   │
│   │   └── mongodb/
│   │       ├── userRepository.ts
│   │       ├── vaultRepository.ts
│   │       ├── passwordRepository.ts
│   │       ├── categoryRepository.ts
│   │       ├── activityRepository.ts
│   │       ├── sessionRepository.ts
│   │       └── auditEventRepository.ts
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── Vault.ts
│   │   ├── VaultItem.ts          # Individual password entry
│   │   ├── Category.ts
│   │   ├── Activity.ts
│   │   ├── SessionToken.ts       # Phase 3: Token revocation
│   │   └── AuditEvent.ts         # Phase 3+: Security events
│   │
│   ├── validators/
│   │   ├── auth.ts               # Auth endpoint schemas
│   │   ├── vault.ts              # Vault endpoint schemas
│   │   ├── password.ts           # Password endpoint schemas
│   │   ├── category.ts           # Category endpoint schemas
│   │   └── common.ts             # Shared schemas
│   │
│   ├── errors/
│   │   ├── AppError.ts           # Custom error class
│   │   ├── ErrorCodes.ts         # Standardized error codes
│   │   └── httpErrors.ts         # HTTP error mappings
│   │
│   ├── security/
│   │   ├── passwordUtils.ts      # Strength analysis, generation
│   │   ├── tokenUtils.ts         # JWT generation/verification
│   │   ├── cryptoUtils.ts        # Encryption utilities (Phase 2+)
│   │   ├── twoFactorUtils.ts     # 2FA logic (Phase 3+)
│   │   └── rateLimitUtils.ts
│   │
│   ├── utils/
│   │   ├── logger.ts             # Pino logger setup
│   │   ├── formatters.ts         # Response formatting
│   │   ├── validators.ts         # Validation helpers
│   │   └── constants.ts          # Constants
│   │
│   ├── types/
│   │   ├── api.ts                # API request/response types
│   │   ├── domain.ts             # Business domain types
│   │   ├── express.ts            # Express type augmentations
│   │   └── index.ts              # Type exports
│   │
│   └── migrations/               # (Phase 2) Data migrations
│       ├── 001-init-schema.ts
│       └── 002-add-sessions.ts
│
├── tests/                        # (Phase 7) Test suite
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── index.ts                      # Barrel export
```

---

## 3. Request/Response Flow

### 3.1 Detailed Request Lifecycle

```
1. INCOMING REQUEST
   ├─ Express receives HTTP request
   ├─ Middleware stack processes:
   │  ├─ CORS middleware
   │  ├─ Body parser
   │  ├─ Request ID generator
   │  ├─ Logger (request start)
   │  ├─ Rate limiter
   │  ├─ Security headers (helmet)
   │  ├─ Authentication middleware (JWT verify)
   │  └─ Authorization middleware (RBAC)
   │
2. ROUTING
   ├─ Express matches route
   └─ Dispatches to controller
   │
3. CONTROLLER LAYER
   ├─ Extract and normalize request parameters
   ├─ Call validation middleware (Joi)
   ├─ Call service method with validated data
   └─ Format and send response
   │
4. SERVICE LAYER
   ├─ Implement business logic
   ├─ Check authorization (ownership)
   ├─ Call repository methods
   ├─ Log activity events
   ├─ Handle errors with AppError
   └─ Return formatted result
   │
5. REPOSITORY LAYER
   ├─ Abstract data access patterns
   ├─ Construct MongoDB queries
   ├─ Execute via Mongoose models
   ├─ Map results to domain objects
   └─ Handle persistence errors
   │
6. MONGOOSE MODEL
   ├─ Schema validation
   ├─ Pre-save hooks (encrypt fields, hash passwords)
   ├─ Database interaction
   └─ Return saved document
   │
7. RESPONSE GENERATION
   ├─ Service formats result
   ├─ Controller sends HTTP response
   ├─ Status code set appropriately
   ├─ Response body structured
   └─ CORS headers added
   │
8. MIDDLEWARE (on the way out)
   ├─ Logger (request end, duration, status)
   └─ Response sent to client
```

### 3.2 Example: POST /api/v1/passwords

```
REQUEST:
POST /api/v1/passwords
Authorization: Bearer eyJhbG...
Content-Type: application/json
X-Request-ID: req-123-456

{
  "vaultId": "vault-abc",
  "host": "github.com",
  "username": "myuser",
  "password": "secret123",
  "notes": "Personal token",
  "categoryId": "cat-dev"
}

PROCESSING:
1. AuthMiddleware: Verify JWT → extract userId
2. ValidationMiddleware: Validate request body against passwordSchema
3. PasswordController.create()
   → Call passwordService.createPassword(userId, vaultId, {...})
4. PasswordService.createPassword()
   → Check authorization (user owns vault)
   → Validate business rules (no duplicates)
   → Call passwordRepo.create({...})
   → Log activity: "Password created"
   → Return formatted PasswordResponse
5. PasswordRepository.create()
   → Create VaultItem document
   → Save to MongoDB via PasswordModel.save()
   → Return saved document
6. PasswordController: Format 201 response

RESPONSE:
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: req-123-456

{
  "success": true,
  "data": {
    "id": "pwd-xyz",
    "vaultId": "vault-abc",
    "host": "github.com",
    "username": "myuser",
    "strength": "strong",
    "createdAt": "2026-09-09T10:30:00Z",
    "updatedAt": "2026-09-09T10:30:00Z"
  }
}

NOTE: Password NOT returned in response (security)
```

---

## 4. Controller Layer Design

### 4.1 Constraints

- **Maximum 40 lines of code per controller method**
- **One responsibility per method**
- **No business logic** (delegate to services)
- **No direct database access** (use repositories)
- **HTTP-focused only** (status codes, headers, body)

### 4.2 Controller Template

```typescript
// src/api/controllers/passwordController.ts
import { Router, Request, Response, NextFunction } from "express";
import { passwordService } from "../services";
import {
  createPasswordSchema,
  updatePasswordSchema,
} from "../validators/password";
import { authenticate, authorize } from "../middleware";

const router = Router();

// Create password
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vaultId, ...passwordData } = req.body;
      const userId = req.user!.id;

      // Validation is done by middleware
      const result = await passwordService.createPassword(
        userId,
        vaultId,
        passwordData,
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get password list
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vaultId } = req.query;
      const userId = req.user!.id;

      const result = await passwordService.getPasswordsByVault(
        userId,
        vaultId as string,
      );

      res.json({
        success: true,
        data: result,
        count: result.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update password
router.put(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await passwordService.updatePassword(userId, id, req.body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete password
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await passwordService.deletePassword(userId, id);

      res.json({
        success: true,
        message: "Password deleted",
      });
    } catch (error) {
      next(error);
    }
  },
);

export { router as passwordRoutes };
```

---

## 5. Service Layer Design

### 5.1 Service Responsibilities

- Implement business logic
- Validate inputs (Joi schemas)
- Check authorization (ownership)
- Call repository methods
- Log activities
- Handle errors consistently
- Transform data between API and storage formats

### 5.2 Service Template

```typescript
// src/api/services/passwordService.ts
import { Logger } from "../utils/logger";
import { passwordRepository } from "../repositories";
import { vaultService } from "./vaultService";
import { activityService } from "./activityService";
import { AppError } from "../errors/AppError";
import { createPasswordSchema } from "../validators/password";

const logger = new Logger("PasswordService");

export const passwordService = {
  async createPassword(
    userId: string,
    vaultId: string,
    data: CreatePasswordInput,
  ): Promise<PasswordResponse> {
    // 1. Validate input
    const { error, value } = createPasswordSchema.validate(data);
    if (error) {
      throw new AppError(error.message, 400, "VALIDATION_ERROR");
    }

    // 2. Check authorization (user owns vault)
    const vault = await vaultService.getVault(userId, vaultId);
    if (!vault) {
      throw new AppError("Vault not found", 404, "VAULT_NOT_FOUND");
    }

    // 3. Check for duplicates (business rule)
    const existing = await passwordRepository.findByHostInVault(
      vaultId,
      value.host,
    );
    if (existing) {
      throw new AppError(
        "Password for this host already exists",
        409,
        "DUPLICATE_PASSWORD",
      );
    }

    // 4. Create password
    const password = await passwordRepository.create({
      vaultId,
      ...value,
      createdBy: userId,
      createdAt: new Date(),
    });

    // 5. Log activity
    await activityService.logPasswordCreated(userId, vaultId, password.id);

    // 6. Format response
    return formatPasswordResponse(password);
  },

  async getPasswordsByVault(
    userId: string,
    vaultId: string,
  ): Promise<PasswordResponse[]> {
    // 1. Check authorization
    const vault = await vaultService.getVault(userId, vaultId);
    if (!vault) {
      throw new AppError("Vault not found", 404, "VAULT_NOT_FOUND");
    }

    // 2. Retrieve passwords
    const passwords = await passwordRepository.findByVault(vaultId);

    // 3. Format response (omit plaintext passwords)
    return passwords.map(formatPasswordResponse);
  },

  async updatePassword(
    userId: string,
    passwordId: string,
    updates: UpdatePasswordInput,
  ): Promise<PasswordResponse> {
    // 1. Get password
    const password = await passwordRepository.findById(passwordId);
    if (!password) {
      throw new AppError("Password not found", 404, "PASSWORD_NOT_FOUND");
    }

    // 2. Check authorization (user owns vault)
    const vault = await vaultService.getVault(userId, password.vaultId);
    if (!vault) {
      throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }

    // 3. Validate updates
    const { error, value } = updatePasswordSchema.validate(updates);
    if (error) {
      throw new AppError(error.message, 400, "VALIDATION_ERROR");
    }

    // 4. Update password
    const updated = await passwordRepository.update(passwordId, {
      ...value,
      updatedAt: new Date(),
    });

    // 5. Log activity
    await activityService.logPasswordUpdated(
      userId,
      password.vaultId,
      passwordId,
    );

    // 6. Format response
    return formatPasswordResponse(updated);
  },

  // ... other methods
};

// Helper function
function formatPasswordResponse(password: any): PasswordResponse {
  const { password: _plaintext, ...rest } = password;
  return {
    ...rest,
    // Do NOT include plaintext password in response
    // Client will decrypt if needed
  };
}
```

---

## 6. Repository Layer Design

### 6.1 Repository Interfaces

```typescript
// src/api/repositories/interfaces/IPasswordRepository.ts
export interface IPasswordRepository {
  create(data: CreatePasswordInput): Promise<Password>;
  findById(id: string): Promise<Password | null>;
  findByVault(vaultId: string): Promise<Password[]>;
  findByHostInVault(vaultId: string, host: string): Promise<Password | null>;
  update(id: string, data: UpdatePasswordInput): Promise<Password>;
  delete(id: string): Promise<void>;
  deleteByVault(vaultId: string): Promise<number>; // Returns count deleted
}
```

### 6.2 MongoDB Repository Implementation

```typescript
// src/api/repositories/mongodb/passwordRepository.ts
import { PasswordModel, IPassword } from "../../models/Password";
import { IPasswordRepository } from "../interfaces/IPasswordRepository";
import { AppError } from "../../errors/AppError";

export const passwordRepository: IPasswordRepository = {
  async create(data): Promise<IPassword> {
    const doc = new PasswordModel(data);
    await doc.save();
    return doc.toObject() as IPassword;
  },

  async findById(id: string): Promise<IPassword | null> {
    return PasswordModel.findById(id).select("-__v").lean().exec();
  },

  async findByVault(vaultId: string): Promise<IPassword[]> {
    return PasswordModel.find({ vaultId, deletedAt: null })
      .select("-__v")
      .lean()
      .exec();
  },

  async findByHostInVault(
    vaultId: string,
    host: string,
  ): Promise<IPassword | null> {
    return PasswordModel.findOne({ vaultId, host, deletedAt: null })
      .lean()
      .exec();
  },

  async update(id: string, data: UpdatePasswordInput): Promise<IPassword> {
    const doc = await PasswordModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      throw new AppError("Password not found", 404, "PASSWORD_NOT_FOUND");
    }

    return doc.toObject() as IPassword;
  },

  async delete(id: string): Promise<void> {
    // Soft delete
    const result = await PasswordModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    );

    if (!result) {
      throw new AppError("Password not found", 404, "PASSWORD_NOT_FOUND");
    }
  },

  async deleteByVault(vaultId: string): Promise<number> {
    const result = await PasswordModel.updateMany(
      { vaultId, deletedAt: null },
      { deletedAt: new Date() },
    );
    return result.modifiedCount;
  },
};
```

---

## 7. Validation Layer (Joi Schemas)

### 7.1 Validation Pattern

```typescript
// src/api/validators/password.ts
import Joi from "joi";

export const createPasswordSchema = Joi.object({
  host: Joi.string().required().trim().min(1).max(255).messages({
    "string.empty": "Host is required",
    "string.max": "Host must not exceed 255 characters",
  }),

  username: Joi.string().required().trim().min(1).max(255),

  password: Joi.string().required().min(8).max(1000).messages({
    "string.min": "Password must be at least 8 characters",
  }),

  notes: Joi.string().optional().trim().max(1000),

  categoryId: Joi.string().optional().hex().length(24),

  url: Joi.string().optional().uri(),

  tags: Joi.array().optional().items(Joi.string().trim().max(50)).max(10),
});

export const updatePasswordSchema = createPasswordSchema.fork(
  Object.keys(createPasswordSchema.describe().keys),
  (schema) => schema.optional(),
);
```

### 7.2 Validation Middleware

```typescript
// src/api/middleware/validation.ts
export function validate(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      throw new AppError(messages.join(", "), 400, "VALIDATION_ERROR");
    }

    req.body = value;
    next();
  };
}

// Usage in routes
router.post("/", validate(createPasswordSchema), passwordController.create);
```

---

## 8. Error Handling

### 8.1 AppError Class

```typescript
// src/api/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

### 8.2 Error Handler Middleware

```typescript
// src/api/middleware/errorHandler.ts
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = req.id || "unknown";

  // Log error
  logger.error({
    requestId,
    message: error.message,
    code: error.code,
    stack: error.stack,
    method: req.method,
    path: req.path,
  });

  // Format response
  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_ERROR";

  // Never expose stack trace in production
  const message =
    process.env.NODE_ENV === "production" ? "An error occurred" : error.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId,
      // timestamp: new Date().toISOString()
    },
  });
}
```

---

## 9. Mongoose Models

### 9.1 User Model Example

```typescript
// src/api/models/User.ts
import { Schema, Model, Document } from "mongoose";
import * as bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  masterPasswordHash: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  preferences: {
    theme: "light" | "dark";
    language: string;
    autoLock: number; // minutes
  };
  deletedAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  masterPasswordHash: {
    type: String,
    required: true,
    minlength: 60, // bcrypt hash length
  },

  fullName: {
    type: String,
    required: true,
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  lastLogin: Date,

  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },

  twoFactorSecret: String, // encrypted

  preferences: {
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    language: {
      type: String,
      default: "en",
    },
    autoLock: {
      type: Number,
      default: 15, // minutes
    },
  },

  deletedAt: Date, // soft delete
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save hook (password hashing handled in service, not here)
userSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

// Post-save hook (never return password hash)
userSchema.post("findOne", function (doc) {
  if (doc) {
    doc.masterPasswordHash = undefined;
  }
});

// Instance method
userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.masterPasswordHash);
};

export const UserModel = mongoose.model<IUser>("User", userSchema);
```

### 9.2 Password/VaultItem Model

```typescript
// src/api/models/VaultItem.ts
export interface IVaultItem extends Document {
  vaultId: ObjectId;
  host: string;
  username: string;
  password: string; // encrypted (Phase 2+)
  notes?: string;
  url?: string;
  categoryId?: ObjectId;
  tags?: string[];
  strength: "weak" | "good" | "strong";
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const vaultItemSchema = new Schema<IVaultItem>({
  vaultId: {
    type: Schema.Types.ObjectId,
    ref: "Vault",
    required: true,
  },

  host: {
    type: String,
    required: true,
    trim: true,
  },

  username: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
    // Note: Will be encrypted before saving (Phase 2+)
  },

  notes: String,
  url: String,

  categoryId: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },

  tags: [String],

  strength: {
    type: String,
    enum: ["weak", "good", "strong"],
    default: "good",
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  deletedAt: Date, // soft delete
});

// Indexes (critical for queries)
vaultItemSchema.index({ vaultId: 1, deletedAt: 1 });
vaultItemSchema.index({ host: 1, vaultId: 1 });
vaultItemSchema.index({ createdBy: 1 });
vaultItemSchema.index({ strength: 1 });

// Post-find hook (never return plaintext password)
vaultItemSchema.post("find", function (docs) {
  if (Array.isArray(docs)) {
    docs.forEach((doc) => {
      if (doc) {
        doc.password = undefined;
      }
    });
  }
});

export const VaultItemModel = mongoose.model<IVaultItem>(
  "VaultItem",
  vaultItemSchema,
);
```

---

## 10. Logging & Observability

### 10.1 Structured Logging with Pino

```typescript
// src/api/utils/logger.ts
import pino from "pino";

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export class Logger {
  constructor(private namespace: string) {}

  info(data: any) {
    pinoLogger.info({ namespace: this.namespace, ...data });
  }

  error(data: any) {
    pinoLogger.error({ namespace: this.namespace, ...data });
  }

  warn(data: any) {
    pinoLogger.warn({ namespace: this.namespace, ...data });
  }

  debug(data: any) {
    pinoLogger.debug({ namespace: this.namespace, ...data });
  }
}

// Usage in services
const logger = new Logger("PasswordService");
logger.info({ event: "password_created", passwordId, userId });
```

### 10.2 Request Logging Middleware

```typescript
// src/api/middleware/logger.ts
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.id || generateRequestId();

  req.requestId = requestId;

  // Log request
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    event: "request_start",
  });

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      event: "request_end",
    });
  });

  next();
}
```

---

## 11. Health Checks

### 11.1 Health Endpoints

```typescript
// src/api/routes/health.ts
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", async (req, res, next) => {
  try {
    // Check database connection
    await mongoose.connection.db!.admin().ping();

    res.json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
      error: error.message,
    });
  }
});
```

---

## Next Steps (Architecture Review)

1. ✅ Frontend architecture designed
2. ✅ Backend architecture designed
3. ⏳ Database architecture to follow
4. ⏳ Authentication/security architecture to follow
5. ⏳ Migration strategy to follow
