# VaultGuard Tech Stack Migration Roadmap

**Purpose:** Phased implementation plan to migrate VaultGuard from current architecture to finalized target stack.

**Baseline Reference:** [baseline-assessment.md](baseline-assessment.md)

**Branch:** `tech-stack-migration`

---

## Migration Strategy Overview

### Approach: Safe, Incremental Migration

**Principle:** Minimize risk by migrating one architectural layer at a time, with clear testing and validation gates between phases.

**Key Constraints:**

- Preserve premium UI/UX (visual parity)
- Maintain application availability where possible
- Keep backend and frontend migrations independent where feasible
- Require explicit approval before high-risk phases

**Success Metrics:**

- All acceptance criteria met per phase
- No regressions in existing functionality
- Tests pass (new test coverage added progressively)
- Security audit passed before production release

---

## Phase 0: Foundation & Configuration

**Objective:** Establish secure foundation for all phases.

**Timeline:** 1-2 weeks

**Changes Required:**

### 0.1 Environment Configuration Hardening

**Current Issues:**

- Hardcoded JWT secrets with fallback values
- No .env.example file
- Missing GEMINI_API_KEY setup
- No MongoDB connection configuration

**Changes:**

```bash
# Create .env.example
PORT=3000
NODE_ENV=development
JWT_SECRET=<your-jwt-secret-here>
JWT_REFRESH_SECRET=<your-jwt-refresh-secret-here>
MONGODB_URI=mongodb://localhost:27017/vaultguard
GEMINI_API_KEY=<your-gemini-api-key-here>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
AUTH_RATE_LIMIT_MAX_REQUESTS=15
```

**Code Changes:**

```typescript
// src/api/config/env.ts
import { config } from "dotenv";
config(); // Load .env file

export const envConfig = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // REQUIRED - fail if missing
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  MONGODB_URI: requireEnv("MONGODB_URI"),

  // OPTIONAL
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,

  // Constants
  DATA_DIR: path.join(process.cwd(), ".vault_data"),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "200",
  ),
  AUTH_RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "15",
  ),
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable missing: ${key}. Check .env file.`,
    );
  }
  return value;
}
```

**Dependencies:**

- Add `dotenv` (already installed)

**Risks:**

- Application fails to start if env vars missing (intentional - fail-loud)
- Requires deployment environment setup

**Verification:**

- [ ] Application starts with proper .env
- [ ] Application fails with clear message if .env missing
- [ ] No hardcoded secrets in code
- [ ] .env.example created and documented

---

### 0.2 Input Validation Layer

**Current Issues:**

- Manual string checks in controllers
- No validation library
- Inconsistent error messages
- Vulnerable to injection

**Changes:**

```typescript
// src/api/validators/schemas.ts
import Joi from "joi";

export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(1).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),
};

export const passwordSchemas = {
  create: Joi.object({
    title: Joi.string().required(),
    websiteUrl: Joi.string().uri().optional(),
    username: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().required(),
    category: Joi.string().required(),
    notes: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()),
    colorLabel: Joi.string().valid(
      "blue",
      "purple",
      "emerald",
      "amber",
      "rose",
      "indigo",
      "cyan",
      "slate",
    ),
    isFavorite: Joi.boolean().optional(),
  }),

  // ... other schemas
};
```

```typescript
// src/api/middlewares/validation.ts
export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((d) => ({
          field: d.path.join("."),
          message: d.message,
        })),
      });
    }

    req.body = value;
    next();
  };
}
```

```typescript
// Updated routes with validation
authRoutes.post(
  "/register",
  validateRequest(authSchemas.register),
  authController.register,
);
authRoutes.post(
  "/login",
  validateRequest(authSchemas.login),
  authController.login,
);
```

**Dependencies:**

- Add `joi` package

**Risks:**

- Validation failures might expose legitimate data patterns
- Migration effort to wrap all endpoints

**Verification:**

- [ ] All auth endpoints validated
- [ ] All password CRUD endpoints validated
- [ ] All category endpoints validated
- [ ] Error responses consistent and informative
- [ ] Tests confirm valid data accepted, invalid data rejected

---

### 0.3 Structured Logging

**Current Issues:**

- console.log/error only
- No log levels
- No context (request ID, user, etc.)
- Difficult to parse/monitor

**Changes:**

```typescript
// src/api/utils/logger.ts
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
});

export { logger };

// Middleware to attach request ID
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
```

```typescript
// Updated logger middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const requestId = (req as any).requestId;
    const userId = (req as any).user?.id;

    logger.info({
      requestId,
      userId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}
```

**Dependencies:**

- Add `pino` and `pino-pretty` packages

**Risks:**

- Performance overhead (minimal with pino)
- Log volume in production (need storage strategy)

**Verification:**

- [ ] Structured logs emitted for all requests
- [ ] Request IDs trackable through logs
- [ ] User actions logged with userId
- [ ] Errors logged with full context
- [ ] No sensitive data in logs (passwords, tokens)

---

### 0.4 Error Classification & Codes

**Current Issues:**

- Generic error messages
- No error codes for client disambiguation
- Stack traces potentially exposed

**Changes:**

```typescript
// src/api/utils/errors.ts
export enum ErrorCode {
  // Auth errors
  AUTH_INVALID_CREDENTIALS = "AUTH_001",
  AUTH_ACCOUNT_NOT_FOUND = "AUTH_002",
  AUTH_ACCOUNT_EXISTS = "AUTH_003",
  AUTH_TOKEN_INVALID = "AUTH_004",
  AUTH_TOKEN_EXPIRED = "AUTH_005",

  // Validation errors
  VALIDATION_FAILED = "VAL_001",

  // Resource errors
  RESOURCE_NOT_FOUND = "RES_001",
  RESOURCE_FORBIDDEN = "RES_002",

  // Server errors
  INTERNAL_ERROR = "SRV_001",
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

```typescript
// Updated error handler
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    logger.warn({ requestId, error: err.code, message: err.message });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      requestId,
    });
  }

  // Unexpected error
  logger.error({ requestId, error: err });
  res.status(500).json({
    error: "Internal server error",
    code: ErrorCode.INTERNAL_ERROR,
    requestId,
  });
}
```

**Risks:**

- Error codes need documentation
- Changes to error classification affect clients

**Verification:**

- [ ] All errors use AppError or subclass
- [ ] Error codes documented
- [ ] No stack traces in responses
- [ ] Sensitive data not exposed in error messages
- [ ] Logs capture full errors internally

---

### 0.5 Health Checks & Readiness

**Current:**

```
GET /api/v1/health → { status: 'ok', service, version, timestamp }
```

**Improvements:**

```typescript
// src/api/routes/health.ts
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "VaultGuard API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get("/ready", async (req, res) => {
  try {
    // Check database connectivity
    // Check critical dependencies
    res.json({ ready: true });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});
```

**Verification:**

- [ ] /health endpoint available
- [ ] /ready endpoint checks dependencies
- [ ] Readiness used by deployment/orchestration

---

### Phase 0 Deliverables

**Files Created/Modified:**

- `src/api/config/env.ts` (modified)
- `src/api/validators/schemas.ts` (new)
- `src/api/middlewares/validation.ts` (new)
- `src/api/utils/logger.ts` (new)
- `src/api/utils/errors.ts` (new)
- `src/api/middlewares/errorHandler.ts` (modified)
- `.env.example` (new)

**Dependencies Added:**

- `dotenv` (already present)
- `joi`
- `pino`
- `pino-pretty`

**Tests Required:**

- [ ] Validation middleware tests
- [ ] Error handler tests
- [ ] Logger tests
- [ ] Health endpoint tests

**Approval Gate:** ✅ G0 - Configuration Foundation

---

## Phase 1: Backend MVC Restructuring

**Objective:** Improve backend architecture before database migration.

**Timeline:** 2-3 weeks

**Why Before MongoDB:** Cleaner separation makes migration easier.

**Changes Required:**

### 1.1 Service Layer Extraction

**Current Issue:** Controllers directly access store (data access mixed with HTTP concerns).

**Target:**

```
Controller (HTTP) → Service (Business Logic) → Repository (Data Access)
```

**Example - Password Service:**

```typescript
// src/api/services/passwordService.ts
import { store } from "../config/store";
import { PasswordItem, AuthenticatedRequest } from "../types";
import { calculatePasswordStrength } from "../utils/passwordUtils";

export const passwordService = {
  async listPasswords(
    userId: string,
    filters: {
      status?: string;
      category?: string;
      search?: string;
      tag?: string;
      favorite?: boolean;
      strength?: string;
      sortBy?: string;
    },
  ): Promise<PasswordItem[]> {
    let items = store.getPasswords().filter((p) => p.userId === userId);

    // Apply filters
    if (filters.status === "trash") {
      items = items.filter((p) => p.isDeleted);
    } else {
      items = items.filter((p) => !p.isDeleted);
    }

    if (filters.category && filters.category !== "All") {
      items = items.filter(
        (p) => p.category.toLowerCase() === filters.category.toLowerCase(),
      );
    }

    // ... more filtering logic

    // Sort
    items.sort((a, b) => {
      if (filters.sortBy === "newest")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      // ... other sorts
    });

    return items;
  },

  async createPassword(
    userId: string,
    data: {
      title: string;
      websiteUrl?: string;
      username?: string;
      email?: string;
      password: string;
      category?: string;
      notes?: string;
      tags?: string[];
      colorLabel?: string;
      isFavorite?: boolean;
    },
  ): Promise<PasswordItem> {
    const strength = calculatePasswordStrength(data.password);
    const newPassword: PasswordItem = {
      id: `pwd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: data.title,
      websiteUrl: data.websiteUrl || "",
      username: data.username || "",
      email: data.email || "",
      password: data.password,
      category: data.category || "Personal",
      notes: data.notes || "",
      tags: data.tags || [],
      colorLabel: (data.colorLabel as any) || "indigo",
      isFavorite: data.isFavorite || false,
      isDeleted: false,
      strengthScore: strength.score,
      strengthLevel: strength.level,
      entropyBits: strength.entropyBits,
      estimatedCrackTime: strength.estimatedCrackTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionNumber: 1,
      versionHistory: [],
    };

    const passwords = store.getPasswords();
    passwords.unshift(newPassword);
    store.savePasswords(passwords);

    return newPassword;
  },

  // ... other methods
};
```

**Updated Controller:**

```typescript
// src/api/controllers/passwordController.ts
import { passwordService } from "../services/passwordService";

export const passwordController = {
  async getPasswords(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const { status, category, search, tag, favorite, strength, sortBy } =
        req.query;

      const items = await passwordService.listPasswords(userId, {
        status: status as string,
        category: category as string,
        search: search as string,
        tag: tag as string,
        favorite: favorite === "true",
        strength: strength as string,
        sortBy: sortBy as string,
      });

      res.json({ items });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch passwords." });
    }
  },

  async createPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id!;
      const password = await passwordService.createPassword(userId, req.body);
      res.status(201).json(password);
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err.message || "Failed to create password." });
    }
  },
};
```

**Benefits:**

- Controllers focus on HTTP concerns
- Services focus on business logic
- Easier to test (mock services)
- Easier to change data access layer later

### 1.2 Repository Layer

**For MongoDB Migration:** Create abstraction for data access.

```typescript
// src/api/repositories/passwordRepository.ts
export interface PasswordRepository {
  findByUser(userId: string): Promise<PasswordItem[]>;
  findById(id: string, userId: string): Promise<PasswordItem | null>;
  create(userId: string, data: CreatePasswordDTO): Promise<PasswordItem>;
  update(
    id: string,
    userId: string,
    data: UpdatePasswordDTO,
  ): Promise<PasswordItem>;
  delete(id: string, userId: string): Promise<void>;
  permanentDelete(id: string, userId: string): Promise<void>;
}

// Current implementation (file-based)
export const jsonPasswordRepository: PasswordRepository = {
  async findByUser(userId: string): Promise<PasswordItem[]> {
    return store.getPasswords().filter((p) => p.userId === userId);
  },

  async findById(id: string, userId: string): Promise<PasswordItem | null> {
    return (
      store.getPasswords().find((p) => p.id === id && p.userId === userId) ||
      null
    );
  },

  // ... other methods
};

// MongoDB implementation will implement same interface (Phase 2)
```

**Benefits:**

- Easy to swap implementations
- Cleaner dependency injection
- Services don't know about data layer

### 1.3 Extract Authentication Service

```typescript
// src/api/services/authService.ts
export const authService = {
  async register(
    email: string,
    fullName: string,
    password: string,
  ): Promise<{ user: User; tokens: Tokens }> {
    // Validation (moved from controller)
    if (password.length < 8) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        400,
        "Password must be at least 8 characters",
      );
    }

    // Check existing user
    const existingUser = userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError(
        ErrorCode.AUTH_ACCOUNT_EXISTS,
        400,
        "Account with this email already exists",
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({ email, fullName, passwordHash });

    // Create default categories
    const categories = createDefaultCategories(user.id);

    // Log activity
    await activityService.logActivity(
      user.id,
      "Account Created",
      "Account registration",
    );

    // Generate tokens
    const tokens = tokenService.generateTokens(user.id, user.email);

    return { user, tokens };
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; tokens: Tokens }> {
    const user = await userRepository.findByEmail(email);
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new AppError(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        401,
        "Invalid email or password",
      );
    }

    const tokens = tokenService.generateTokens(user.id, user.email);
    await activityService.logActivity(
      user.id,
      "User Logged In",
      "Successful login",
    );

    return { user, tokens };
  },

  // ... other methods
};
```

### 1.4 Exception Handling Consistency

All services throw AppError (or subclasses) with proper codes/status.

**Risks:**

- Services layer adds indirection
- Need comprehensive testing to verify behavior unchanged

**Verification:**

- [ ] All endpoints still work (behavior unchanged)
- [ ] Services properly isolated
- [ ] Controllers only handle HTTP concerns
- [ ] Services tested in isolation
- [ ] No behavioral regressions

---

### Phase 1 Deliverables

**Files Created:**

- `src/api/services/passwordService.ts`
- `src/api/services/authService.ts`
- `src/api/services/categoryService.ts`
- `src/api/services/activityService.ts`
- `src/api/services/auditService.ts`
- `src/api/repositories/passwordRepository.ts`
- `src/api/repositories/userRepository.ts`
- `src/api/repositories/categoryRepository.ts`
- `src/api/repositories/activityRepository.ts`

**Files Modified:**

- `src/api/controllers/*` (all controllers refactored)
- `src/api/routes/*` (validation added to routes)

**Tests Required:**

- [ ] Service unit tests
- [ ] Repository interface tests
- [ ] Controller integration tests
- [ ] End-to-end API tests

**Approval Gate:** ✅ G1 - Backend Architecture

---

## Phase 2: MongoDB & Mongoose Migration

**Objective:** Migrate from file-based JSON to MongoDB with Mongoose.

**Timeline:** 3-4 weeks

**Dependencies:** Phase 1 (Service/Repository layers required)

**Approach:**

1. Set up MongoDB connection
2. Define Mongoose schemas
3. Implement MongoDB repositories
4. Migrate data (script)
5. Validate migration
6. Switch implementation

### 2.1 MongoDB Connection Setup

```typescript
// src/api/config/database.ts
import mongoose from "mongoose";
import { envConfig } from "./env";
import { logger } from "../utils/logger";

export async function connectDatabase() {
  try {
    await mongoose.connect(envConfig.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error("MongoDB connection failed", err);
    throw err;
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
```

### 2.2 Mongoose Schemas

```typescript
// src/api/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  fullName: string;
  passwordHash: string;
  avatarUrl: string;
  autoLogoutMinutes: number;
  clipboardClearSeconds: number;
  is2FAEnabled: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  fullName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  autoLogoutMinutes: { type: Number, default: 15 },
  clipboardClearSeconds: { type: Number, default: 30 },
  is2FAEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
});

export const User = mongoose.model<IUser>("User", userSchema);
```

```typescript
// src/api/models/Password.ts
import mongoose, { Schema, Document } from "mongoose";

interface IPasswordVersion {
  password: string;
  updatedAt: Date;
  updatedBy: string;
  versionNumber: number;
}

export interface IPassword extends Document {
  userId: string;
  title: string;
  websiteUrl: string;
  username: string;
  email: string;
  password: string; // Will be encrypted in Phase 2
  category: string;
  notes?: string;
  tags: string[];
  colorLabel: string;
  websiteLogo?: string;
  isFavorite: boolean;
  isPinned?: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  strengthScore: number;
  strengthLevel: string;
  entropyBits: number;
  estimatedCrackTime: string;
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt?: Date;
  lastCopiedAt?: Date;
  versionNumber: number;
  versionHistory: IPasswordVersion[];
}

const passwordSchema = new Schema<IPassword>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  websiteUrl: String,
  username: String,
  email: String,
  password: { type: String, required: true },
  category: { type: String, default: "Personal" },
  notes: String,
  tags: [String],
  colorLabel: String,
  websiteLogo: String,
  isFavorite: { type: Boolean, default: false },
  isPinned: Boolean,
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: Date,
  strengthScore: Number,
  strengthLevel: String,
  entropyBits: Number,
  estimatedCrackTime: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
  lastViewedAt: Date,
  lastCopiedAt: Date,
  versionNumber: Number,
  versionHistory: [
    {
      password: String,
      updatedAt: Date,
      updatedBy: String,
      versionNumber: Number,
    },
  ],
});

// Indexes for common queries
passwordSchema.index({ userId: 1, createdAt: -1 });
passwordSchema.index({ userId: 1, category: 1 });
passwordSchema.index({ userId: 1, tags: 1 });
passwordSchema.index({ isDeleted: 1 }, { expireAfterSeconds: 2592000 }); // 30-day soft delete TTL

export const Password = mongoose.model<IPassword>("Password", passwordSchema);
```

### 2.3 MongoDB Repositories

```typescript
// src/api/repositories/mongoPasswordRepository.ts
import { Password, IPassword } from "../models/Password";
import {
  PasswordRepository,
  CreatePasswordDTO,
  UpdatePasswordDTO,
} from "./types";

export const mongoPasswordRepository: PasswordRepository = {
  async findByUser(userId: string): Promise<IPassword[]> {
    return Password.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
  },

  async findById(id: string, userId: string): Promise<IPassword | null> {
    return Password.findOne({ _id: id, userId });
  },

  async create(userId: string, data: CreatePasswordDTO): Promise<IPassword> {
    const password = new Password({
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      versionNumber: 1,
      versionHistory: [],
    });
    return password.save();
  },

  async update(
    id: string,
    userId: string,
    data: UpdatePasswordDTO,
  ): Promise<IPassword> {
    const password = await Password.findOneAndUpdate(
      { _id: id, userId },
      { ...data, updatedAt: new Date() },
      { new: true },
    );
    if (!password) throw new Error("Password not found");
    return password;
  },

  async delete(id: string, userId: string): Promise<void> {
    await Password.updateOne(
      { _id: id, userId },
      { isDeleted: true, deletedAt: new Date() },
    );
  },

  async permanentDelete(id: string, userId: string): Promise<void> {
    await Password.deleteOne({ _id: id, userId });
  },
};
```

### 2.4 Data Migration Script

```typescript
// scripts/migrateToMongoDB.ts
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { User } from "../src/api/models/User";
import { Password } from "../src/api/models/Password";
import { Category } from "../src/api/models/Category";
import { Activity } from "../src/api/models/Activity";

async function migrate() {
  // Load JSON files
  const usersData = JSON.parse(
    fs.readFileSync(path.join(".vault_data", "users.json"), "utf-8"),
  );
  const passwordsData = JSON.parse(
    fs.readFileSync(path.join(".vault_data", "passwords.json"), "utf-8"),
  );
  const categoriesData = JSON.parse(
    fs.readFileSync(path.join(".vault_data", "categories.json"), "utf-8"),
  );
  const activitiesData = JSON.parse(
    fs.readFileSync(path.join(".vault_data", "activities.json"), "utf-8"),
  );

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);

    // Migrate users
    await User.insertMany(usersData);
    console.log(`Migrated ${usersData.length} users`);

    // Migrate passwords
    await Password.insertMany(passwordsData);
    console.log(`Migrated ${passwordsData.length} passwords`);

    // Migrate categories
    await Category.insertMany(categoriesData);
    console.log(`Migrated ${categoriesData.length} categories`);

    // Migrate activities
    await Activity.insertMany(activitiesData);
    console.log(`Migrated ${activitiesData.length} activities`);

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
```

### 2.5 Rollback Strategy

- Keep `.vault_data/` JSON files as backup
- Keep both JSON and MongoDB repositories functional during transition
- Gradually switch clients over
- Verify data consistency before removing JSON support

### Phase 2 Deliverables

**Files Created:**

- `src/api/config/database.ts`
- `src/api/models/User.ts`
- `src/api/models/Password.ts`
- `src/api/models/Category.ts`
- `src/api/models/Activity.ts`
- `src/api/repositories/mongoUserRepository.ts`
- `src/api/repositories/mongoPasswordRepository.ts`
- `src/api/repositories/mongoCategoryRepository.ts`
- `src/api/repositories/mongoActivityRepository.ts`
- `scripts/migrateToMongoDB.ts`

**Files Modified:**

- `src/api/config/env.ts` (add MONGODB_URI)
- Service layer (switch repository implementations)

**Dependencies Added:**

- `mongoose`
- `mongodb` (peer of mongoose)

**Tests Required:**

- [ ] MongoDB connection tests
- [ ] Schema validation tests
- [ ] Repository CRUD tests
- [ ] Migration script tests
- [ ] Data integrity verification
- [ ] Rollback verification

**Approval Gate:** ✅ G4 - Database Migration

---

## Phase 3: Authentication & Security Hardening

**Objective:** Fix security gaps identified in baseline assessment.

**Timeline:** 2-3 weeks

**Dependencies:** Phase 0 (error handling), Phase 2 (MongoDB)

### 3.1 Session Revocation & Token Blacklist

```typescript
// src/api/models/SessionToken.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISessionToken extends Document {
  userId: string;
  token: string;
  type: "access" | "refresh";
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

const sessionTokenSchema = new Schema<ISessionToken>({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  type: { type: String, enum: ["access", "refresh"], required: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: Date,
});

// TTL index - automatically delete expired tokens
sessionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionToken = mongoose.model<ISessionToken>(
  "SessionToken",
  sessionTokenSchema,
);
```

```typescript
// src/api/services/sessionService.ts
export const sessionService = {
  async revokeToken(token: string, userId: string): Promise<void> {
    await SessionToken.updateOne({ token, userId }, { revokedAt: new Date() });
  },

  async revokeAllUserTokens(userId: string): Promise<void> {
    await SessionToken.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  },

  async isTokenRevoked(token: string): Promise<boolean> {
    const doc = await SessionToken.findOne({ token });
    return !doc || !!doc.revokedAt;
  },

  async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    type: "access" | "refresh",
  ): Promise<void> {
    await SessionToken.create({ userId, token, type, expiresAt });
  },
};
```

```typescript
// Updated authMiddleware
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    throw new AppError(
      ErrorCode.AUTH_TOKEN_INVALID,
      401,
      "Authentication token missing",
    );
  }

  // Check if token is revoked
  const isRevoked = await sessionService.isTokenRevoked(token);
  if (isRevoked) {
    throw new AppError(
      ErrorCode.AUTH_TOKEN_INVALID,
      401,
      "Token has been revoked",
    );
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    throw new AppError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      401,
      "Token invalid or expired",
    );
  }

  req.user = decoded;
  next();
}
```

### 3.2 Logout Endpoint with Token Revocation

```typescript
// src/api/routes/authRoutes.ts (new endpoint)
authRoutes.post('/logout', authenticateToken, authController.logout);

// src/api/controllers/authController.ts
async logout(req: AuthenticatedRequest, res: Response) {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const userId = req.user!.id;

    if (token) {
      await sessionService.revokeToken(token, userId);
    }

    // Optionally revoke all user sessions (for "logout all devices")
    // await sessionService.revokeAllUserTokens(userId);

    await activityService.logActivity(userId, 'User Logged Out', 'Logout');

    res.json({ message: 'Logout successful' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
```

### 3.3 Secure Refresh Token Storage

**Option 1: HttpOnly Cookies** (Recommended)

```typescript
// In login controller
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

res.json({
  token: accessToken,
  user: userProfile,
  // refreshToken not sent in body
});
```

**Option 2: Secure Session Store** (If cookies not viable)

```typescript
// Store refresh tokens server-side only
// Return opaque session ID instead
res.json({
  token: accessToken,
  sessionId: sessionId, // Client stores this, not the token
  user: userProfile,
});

// Client sends sessionId with /refresh-token request
// Server verifies sessionId and issues new tokens
```

### 3.4 Rate Limiting on Auth Endpoints

```typescript
// src/api/middlewares/rateLimiter.ts (updated)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 15, // 15 attempts per 15 min per IP
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failures too
});

// src/api/routes/authRoutes.ts
authRoutes.post(
  "/login",
  authRateLimiter,
  validateRequest(authSchemas.login),
  authController.login,
);
authRoutes.post(
  "/register",
  authRateLimiter,
  validateRequest(authSchemas.register),
  authController.register,
);
```

### 3.5 Account Lockout (Optional for Phase 3)

```typescript
// src/api/models/FailedLoginAttempt.ts
export interface IFailedLoginAttempt extends Document {
  email: string;
  ipAddress: string;
  attemptedAt: Date;
}

export const failedLoginAttemptSchema = new Schema<IFailedLoginAttempt>({
  email: { type: String, required: true, index: true },
  ipAddress: { type: String, required: true, index: true },
  attemptedAt: { type: Date, default: Date.now },
});

// TTL index - clean up after 24 hours
failedLoginAttemptSchema.index(
  { attemptedAt: 1 },
  { expireAfterSeconds: 86400 },
);
```

### Phase 3 Deliverables

**Files Created:**

- `src/api/models/SessionToken.ts`
- `src/api/services/sessionService.ts`
- `scripts/migrateSessionTokens.ts`

**Files Modified:**

- `src/api/routes/authRoutes.ts` (add logout endpoint)
- `src/api/controllers/authController.ts` (implement logout, update login)
- `src/api/middlewares/authMiddleware.ts` (check revocation)
- `src/api/config/env.ts` (add cookie/session config)

**Tests Required:**

- [ ] Token revocation tests
- [ ] Logout endpoint tests
- [ ] Session management tests
- [ ] Refresh token tests
- [ ] Rate limiting tests
- [ ] Account lockout tests (if implemented)

**Approval Gate:** ✅ G3 - Security Review

---

## Phase 4: Frontend Routing (React Router)

**Objective:** Add URL-driven navigation to replace tab-based routing.

**Timeline:** 1-2 weeks

**Changes:**

```typescript
// src/main.tsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

```typescript
// src/router.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PasswordsPage } from './pages/PasswordsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ActivityPage } from './pages/ActivityPage';
import { TrashPage } from './pages/TrashPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/passwords" element={<PasswordsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/trash" element={<TrashPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

**Benefits:**

- Browser history support
- Bookmarkable URLs
- Better accessibility
- Standard React pattern

### Phase 4 Deliverables

**Files Created:**

- `src/router.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/PasswordsPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/ActivityPage.tsx`
- `src/pages/TrashPage.tsx`

**Files Modified:**

- `src/App.tsx` (simplified to use router)
- `src/components/layout/Sidebar.tsx` (use Link instead of click handlers)
- `src/main.tsx` (add BrowserRouter)

**Dependencies Added:**

- `react-router-dom`

**Tests Required:**

- [ ] Route rendering tests
- [ ] Protected route tests
- [ ] Navigation tests
- [ ] URL sync tests

**Approval Gate:** Architecture update

---

## Phase 5: State Management (Redux Toolkit + TanStack Query)

**Objective:** Replace React Context with Redux (client state) + TanStack Query (server state).

**Timeline:** 3-4 weeks

**Complexity:** High - requires significant refactoring

### 5.1 Redux Store Setup

```typescript
// src/redux/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import passwordsReducer from "./slices/passwordsSlice";
import uiReducer from "./slices/uiSlice";
import activityReducer from "./slices/activitySlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    passwords: passwordsReducer,
    ui: uiReducer,
    activity: activityReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 5.2 Auth Slice

```typescript
// src/redux/slices/authSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../services/api";

export const loginAsync = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }) => {
    return api.login(email, password);
  },
);

export const registerAsync = createAsyncThunk(
  "auth/register",
  async ({
    email,
    fullName,
    password,
  }: {
    email: string;
    fullName: string;
    password: string;
  }) => {
    return api.register(email, fullName, password);
  },
);

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Login failed";
      });
    // ... other cases
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
```

### 5.3 TanStack Query Setup

```typescript
// src/services/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

```typescript
// src/hooks/usePasswords.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";

export function usePasswords(filters?: PasswordFilters) {
  return useQuery({
    queryKey: ["passwords", filters],
    queryFn: () => api.getPasswords(filters),
  });
}

export function useSavePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PasswordInput) => api.savePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
    },
  });
}
```

### 5.4 Component Migration Example

```typescript
// Before: React Context
function PasswordList() {
  const { passwords, isLoading, savePassword } = useVault();
  // ...
}

// After: Redux + React Query
function PasswordList() {
  const { data: passwords, isLoading } = usePasswords();
  const savePasswordMutation = useSavePassword();

  const handleSave = (data) => {
    savePasswordMutation.mutate(data);
  };

  // ...
}
```

### Phase 5 Deliverables

**Files Created:**

- `src/redux/store.ts`
- `src/redux/slices/authSlice.ts`
- `src/redux/slices/passwordsSlice.ts`
- `src/redux/slices/uiSlice.ts`
- `src/redux/slices/activitySlice.ts`
- `src/hooks/useAppDispatch.ts`
- `src/hooks/useAppSelector.ts`
- `src/hooks/usePasswords.ts`
- `src/hooks/useAuth.ts`
- `src/hooks/useActivity.ts`
- `src/services/queryClient.ts`

**Files Modified:**

- All component files (migrate from Context to hooks)
- `src/main.tsx` (add Redux Provider + QueryClientProvider)

**Dependencies Added:**

- `@reduxjs/toolkit`
- `react-redux`
- `@tanstack/react-query`

**Tests Required:**

- [ ] Redux slice tests
- [ ] Redux thunk tests
- [ ] React Query hook tests
- [ ] Component integration tests
- [ ] State synchronization tests

**Approval Gate:** Architecture update

---

## Phase 6: Styling Migration (Tailwind → CSS Modules)

**Objective:** Migrate from Tailwind CSS to CSS Modules + CSS Variables.

**Timeline:** 2-3 weeks

**Approach:** Gradual, component-by-component

**See:** [ui-visual-parity.md](ui-visual-parity.md) for detailed strategy

---

## Phase 7: Testing Infrastructure

**Objective:** Add comprehensive test coverage.

**Timeline:** 4-6 weeks (ongoing)

**Test Types:**

- Unit tests (Vitest)
- Component tests (React Testing Library)
- API tests (Supertest)
- E2E tests (Playwright)

---

## Phase 8: AI Skeleton (Phase 1)

**Objective:** Create AI provider abstraction (not full features).

**Timeline:** 1-2 weeks

**See:** baseline-assessment.md section 11.3 for design

---

## Phase 9: Security Audit

**Objective:** Independent security review of migrated system.

**Timeline:** 1-2 weeks

**Conducted by:** security-auditor agent

---

## Phase 10: Production Readiness

**Objective:** Final verification and deployment prep.

**Timeline:** 1 week

**Checklist:**

- [ ] All P0/P1 issues resolved
- [ ] Test coverage >80%
- [ ] Security audit passed
- [ ] Performance testing completed
- [ ] Load testing completed
- [ ] Deployment documented
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Logging configured

---

## Summary: Phased Migration Sequence

```
Phase 0: Foundation (1-2w)
├── Environment config
├── Validation layer
├── Structured logging
├── Error classification
└── Health checks
    ↓
Phase 1: Backend MVC (2-3w)
├── Service layer
├── Repository pattern
├── Exception handling
└── Service isolation
    ↓
Phase 2: MongoDB (3-4w)
├── Connection setup
├── Mongoose schemas
├── MongoDB repos
├── Data migration
└── Rollback verification
    ↓
Phase 3: Auth Hardening (2-3w)
├── Session revocation
├── Token blacklist
├── Secure token storage
├── Rate limiting on auth
└── Account lockout
    ↓
Phase 4: React Router (1-2w)
├── Router setup
├── Protected routes
├── Page components
└── URL synchronization
    ↓
Phase 5: Redux + TanStack Query (3-4w)
├── Redux setup
├── Redux slices
├── TanStack Query hooks
└── Component migration
    ↓
Phase 6: CSS Modules (2-3w)
├── Component-scoped styles
├── CSS variables
├── Design tokens
└── Visual parity testing
    ↓
Phase 7: Testing (4-6w)
├── Unit tests
├── Component tests
├── API tests
└── E2E tests
    ↓
Phase 8: AI Skeleton (1-2w)
├── Provider abstraction
├── Gemini implementation
└── Documentation
    ↓
Phase 9: Security Audit (1-2w)
├── Code review
├── Penetration testing
└── Compliance check
    ↓
Phase 10: Production (1w)
├── Final verification
├── Deployment prep
└── Release
```

**Total Timeline:** 20-32 weeks (~5-8 months)

---

## Risk Mitigation

### Data Loss Risk

- **Mitigation:** Backup JSON files throughout migration, test rollback
- **Verification:** Data consistency checks after migration

### Behavioral Regression Risk

- **Mitigation:** Comprehensive testing at each phase
- **Verification:** Regression test suite, manual testing

### Security Risk

- **Mitigation:** Security review before each gate
- **Verification:** Security audit before production

### Performance Risk

- **Mitigation:** Load testing with MongoDB
- **Verification:** Performance benchmarks vs. baseline

---

## Approval Decision Points

**Before Each Phase:**

1. Review deliverables from previous phase
2. Verify all tests pass
3. Verify no regressions
4. Approve architecture (specialists if needed)
5. Approve security implications
6. Proceed or remediate

**Go/No-Go Gates:**

- G0: Foundation complete
- G1: Backend architecture solid
- G2: Database migration verified
- G3: Security hardening reviewed
- G4-G7: Progressive approval
- G8: Final security audit
- G9: Production readiness

---

**Next Step:** Proceed to Phase 0 - Foundation & Configuration

See: [baseline-assessment.md](baseline-assessment.md) for complete context
