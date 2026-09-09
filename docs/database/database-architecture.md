# Database Architecture (Target)

**Date:** September 2026  
**Gate:** G2 - Architecture Review  
**Focus:** MongoDB + Mongoose Collections, Schema Design, Migration

---

## 1. Database Technology Decision

### 1.1 Why MongoDB + Mongoose

| Aspect        | MongoDB                       | PostgreSQL               | Rationale                                |
| ------------- | ----------------------------- | ------------------------ | ---------------------------------------- |
| Scalability   | Native sharding               | Manual partitioning      | Document model fits password manager     |
| Flexibility   | Schema-free (with validation) | Strict schema            | Password data structure evolves          |
| Transactions  | Multi-document (v4.0+)        | Full ACID                | Sufficient for Phase 1                   |
| Relationships | References (manual joins)     | Foreign keys (automatic) | Passwords have clear ownership hierarchy |
| Embedded docs | Yes, native                   | No                       | Good for vault metadata                  |
| Querying      | Aggregation pipeline          | SQL                      | Familiar to JavaScript developers        |
| Mongoose ORM  | Excellent maturity            | N/A with Mongoose        | Not using Prisma per architecture        |

### 1.2 Connection Architecture

```typescript
// src/api/config/database.ts
import mongoose from "mongoose";
import { envConfig } from "./env";

export async function connectDatabase() {
  try {
    await mongoose.connect(envConfig.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      w: "majority",
    });

    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  await disconnectDatabase();
  process.exit(0);
});
```

---

## 2. MongoDB Schema Design

### 2.1 Collection: users

**Purpose:** User account records with authentication credentials

```typescript
db.users = {
  _id: ObjectId,                              // MongoDB ID
  email: String,                              // Unique, lowercase
  masterPasswordHash: String,                 // bcrypt hash (60 chars)
  fullName: String,

  // Account status
  emailVerified: Boolean,                     // Phase 2: Email verification
  twoFactorEnabled: Boolean,
  twoFactorSecret: String,                    // Encrypted

  // User preferences
  preferences: {
    theme: String,                            // 'light' | 'dark'
    language: String,                         // 'en', 'es', etc.
    autoLock: Number,                         // Minutes before auto-logout
    defaultVault: ObjectId                    // Vault ID
  },

  // Audit timestamps
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  lastPasswordChange: Date,                   // Phase 2: Password history

  // Soft delete
  deletedAt: Date
}

// Indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ deletedAt: 1 })
db.users.createIndex({ createdAt: -1 })

// Constraints
unique: email (case-insensitive)
immutable: _id, createdAt
```

### 2.2 Collection: vaults

**Purpose:** Password vault containers (users can have multiple vaults)

```typescript
db.vaults = {
  _id: ObjectId,
  userId: ObjectId,                           // FK to users
  name: String,                               // e.g., "Work", "Personal"
  description: String,

  // Encryption metadata
  encryptionKey: String,                      // Phase 2: Encrypted with user's pub key
  encryptionAlgorithm: String,                // 'aes-256-gcm'
  keyDerivationAlgorithm: String,             // 'argon2id'

  // Vault status
  isDefault: Boolean,
  isArchived: Boolean,

  // Audit trail
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date,

  // Soft delete
  deletedAt: Date
}

// Indexes
db.vaults.createIndex({ userId: 1, deletedAt: 1 })
db.vaults.createIndex({ userId: 1, isDefault: 1 })
db.vaults.createIndex({ createdAt: -1 })

// Constraints
FK: userId → users._id
unique: (userId, name, deletedAt=null)
immutable: userId, createdAt
```

### 2.3 Collection: vaultitems (Password Entries)

**Purpose:** Individual password entries within vaults

```typescript
db.vaultitems = {
  _id: ObjectId,
  vaultId: ObjectId,                          // FK to vaults
  createdBy: ObjectId,                        // FK to users (who created)

  // Basic fields
  host: String,                               // e.g., "github.com", "AWS"
  username: String,
  password: String,                           // Plain (Phase 1), encrypted (Phase 2+)

  // Optional metadata
  url: String,                                // e.g., "https://github.com/login"
  notes: String,                              // Up to 1000 chars
  categoryId: ObjectId,                       // FK to categories (optional)
  tags: [String],                             // Up to 10 tags

  // Security assessment
  strength: String,                           // 'weak' | 'good' | 'strong'
  lastBreachCheck: Date,                      // Phase 2: If breached

  // Soft delete
  deletedAt: Date,

  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.vaultitems.createIndex({ vaultId: 1, deletedAt: 1 })
db.vaultitems.createIndex({ host: 1, vaultId: 1 }, { unique: true, sparse: true })
db.vaultitems.createIndex({ strength: 1 })
db.vaultitems.createIndex({ tags: 1 })
db.vaultitems.createIndex({ createdBy: 1 })
db.vaultitems.createIndex({ createdAt: -1 })

// Constraints
FK: vaultId → vaults._id
FK: createdBy → users._id
FK: categoryId → categories._id (optional)
unique: (host, vaultId) per user
immutable: vaultId, createdBy, createdAt
```

### 2.4 Collection: categories

**Purpose:** Password categories (user-defined or system)

```typescript
db.categories = {
  _id: ObjectId,
  vaultId: ObjectId,                          // FK to vaults
  name: String,                               // e.g., "Work", "Banking", "Social"
  description: String,
  color: String,                              // Hex color for UI
  icon: String,                               // Icon name (lucide-react)

  // System vs user-defined
  isSystem: Boolean,                          // System categories: "Websites", "Banking", etc.

  // Audit
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date
}

// Indexes
db.categories.createIndex({ vaultId: 1, deletedAt: 1 })
db.categories.createIndex({ name: 1, vaultId: 1 })
db.categories.createIndex({ createdAt: -1 })

// Constraints
FK: vaultId → vaults._id
unique: (name, vaultId) per vault
```

### 2.5 Collection: activities

**Purpose:** Audit trail of user activities (for the Activity timeline)

```typescript
db.activities = {
  _id: ObjectId,
  userId: ObjectId,                           // FK to users
  vaultId: ObjectId,                          // FK to vaults (if vault-related)
  resourceId: ObjectId,                       // FK to password/category (if applicable)
  resourceType: String,                       // 'password' | 'vault' | 'category'

  // Event details
  action: String,                             // 'created' | 'updated' | 'deleted' | 'viewed'
  timestamp: Date,
  ipAddress: String,                          // For login events
  userAgent: String,                          // For login events

  // Change tracking (Phase 2)
  changes: {
    field: String,
    oldValue: String,
    newValue: String
  },

  // Metadata
  description: String                         // Human-readable summary
}

// Indexes
db.activities.createIndex({ userId: 1, timestamp: -1 })
db.activities.createIndex({ vaultId: 1, timestamp: -1 })
db.activities.createIndex({ action: 1, timestamp: -1 })
db.activities.createIndex({ timestamp: -1 })

// TTL for retention (Phase 2)
db.activities.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }) // 90 days

// Constraints
FK: userId → users._id
FK: vaultId → vaults._id (optional)
immutable: userId, timestamp, createdAt
```

### 2.6 Collection: sessions (Phase 3)

**Purpose:** Token revocation and session management

```typescript
db.sessions = {
  _id: ObjectId,
  userId: ObjectId,                           // FK to users

  // Token tracking
  tokenHash: String,                          // Hash of refresh token (not plaintext)
  accessTokenExpiry: Date,
  refreshTokenExpiry: Date,

  // Device/session tracking
  userAgent: String,
  ipAddress: String,
  deviceName: String,                         // e.g., "Chrome on macOS"

  // Revocation
  revokedAt: Date,                            // NULL if active, set if revoked
  revocationReason: String,                   // e.g., 'logout' | 'password_change' | 'logout_all'

  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.sessions.createIndex({ userId: 1, revokedAt: 1 })
db.sessions.createIndex({ refreshTokenExpiry: 1 }, { expireAfterSeconds: 0 }) // Auto-delete expired
db.sessions.createIndex({ createdAt: -1 })

// Constraints
FK: userId → users._id
unique: tokenHash
immutable: tokenHash, createdAt
```

### 2.7 Collection: auditevents (Phase 3+)

**Purpose:** Security audit trail for compliance

```typescript
db.auditevents = {
  _id: ObjectId,
  userId: ObjectId,                           // FK to users (can be null for system events)

  // Event classification
  eventType: String,                          // 'login' | 'failed_login' | 'logout' | 'password_change' | 'export' | 'import'
  severity: String,                           // 'info' | 'warning' | 'error'

  // Event details
  description: String,
  ipAddress: String,
  userAgent: String,

  // Outcome
  success: Boolean,
  errorMessage: String,

  // Compliance metadata
  timestamp: Date,
  organizationId: String                      // Phase 2: Multi-tenant
}

// Indexes
db.auditevents.createIndex({ userId: 1, timestamp: -1 })
db.auditevents.createIndex({ eventType: 1, timestamp: -1 })
db.auditevents.createIndex({ timestamp: -1 })
db.auditevents.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 }) // 1 year retention

// Constraints
FK: userId → users._id (optional)
immutable: _id, timestamp
```

---

## 3. Data Relationships

### 3.1 Entity Relationship Diagram

```
User
  ├── 1:N Vaults (multiple vaults per user)
  ├── 1:N Activities (activity log)
  ├── 1:N Sessions (active sessions)
  └── 1:N AuditEvents (security events)

Vault (per user)
  ├── 1:N VaultItems (passwords)
  └── 1:N Categories (categories)

VaultItem (within vault)
  ├── N:1 Vault
  ├── N:1 Category (optional)
  └── 1 createdBy User

Category (within vault)
  └── 1:N VaultItems
```

### 3.2 Access Control Pattern

All data queries must verify ownership:

```
GET /api/v1/passwords/:id
1. Extract userId from JWT token
2. Load password from vaultitems collection
3. Load vault from vaults collection
4. Verify vault.userId === userId
5. If match: return password (with password field omitted)
6. If not match: 403 Forbidden
```

---

## 4. Mongoose Model Files Structure

```
src/api/models/
├── User.ts
├── Vault.ts
├── VaultItem.ts
├── Category.ts
├── Activity.ts
├── SessionToken.ts
└── AuditEvent.ts
```

### Example: User Model

```typescript
// src/api/models/User.ts
import mongoose, { Schema, Document } from "mongoose";
import * as bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  masterPasswordHash: string;
  fullName: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  preferences: {
    theme: "light" | "dark";
    language: string;
    autoLock: number;
    defaultVault?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  lastPasswordChange?: Date;
  deletedAt?: Date;

  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      validate: {
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email address",
      },
    },

    masterPasswordHash: {
      type: String,
      required: true,
      select: false, // Don't load by default
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: String,

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
        default: 15,
      },
      defaultVault: mongoose.Types.ObjectId,
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
    lastPasswordChange: Date,
    deletedAt: Date, // Soft delete
  },
  {
    collection: "users",
    timestamps: false, // Manual timestamp control
  },
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ createdAt: -1 });

// Methods
userSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.masterPasswordHash);
};

// Pre-save hook
userSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  if (this.isModified("masterPasswordHash")) {
    const salt = await bcrypt.genSalt(10);
    this.masterPasswordHash = await bcrypt.hash(this.masterPasswordHash, salt);
  }

  next();
});

// Post query hook (privacy: never return password hash)
userSchema.post(/^find/, function (docs) {
  if (!Array.isArray(docs)) docs = [docs];
  docs.forEach((doc) => {
    if (doc) {
      delete doc.masterPasswordHash;
    }
  });
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
```

---

## 5. Query Patterns & Optimization

### 5.1 Common Queries

```typescript
// Get user with all vaults and password counts
db.vaults.aggregate([
  { $match: { userId: ObjectId("..."), deletedAt: null } },
  {
    $lookup: {
      from: "vaultitems",
      localField: "_id",
      foreignField: "vaultId",
      as: "passwordCount",
    },
  },
  {
    $addFields: {
      passwordCount: { $size: "$passwordCount" },
    },
  },
]);

// Get passwords by strength
db.vaultitems
  .find({
    vaultId: ObjectId("..."),
    strength: "weak",
    deletedAt: null,
  })
  .sort({ createdAt: -1 });

// Get activity timeline
db.activities
  .find({
    userId: ObjectId("..."),
    timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
  })
  .sort({ timestamp: -1 })
  .limit(50);

// Find duplicate passwords across vaults
db.vaultitems.aggregate([
  { $match: { deletedAt: null } },
  {
    $group: {
      _id: "$password",
      count: { $sum: 1 },
      instances: { $push: { host: "$host", vaultId: "$vaultId" } },
    },
  },
  { $match: { count: { $gt: 1 } } },
]);
```

### 5.2 Index Strategy

**Indexes are critical for:**

- User lookup by email (authentication)
- Vault queries by user
- Password queries by vault
- Activity timeline queries
- Soft-delete filtering

**NOT indexed (to save space):**

- `notes` field (rarely queried)
- `description` field (rarely queried)
- `url` field (rarely queried)

---

## 6. Data Migration Strategy (JSON → MongoDB)

### 6.1 Migration Phases

**Phase 1: Backup**

- Export existing JSON files to external storage
- Take MongoDB snapshot

**Phase 2: Dry-run**

- Load JSON data
- Transform to MongoDB schema
- Validate all documents
- Don't commit to production DB

**Phase 3: Full Migration**

- Transform data
- Insert into production MongoDB
- Verify record counts
- Spot-check data

**Phase 4: Verification**

- Run API against new data
- Test all password operations
- Verify activity logging
- Check authorization still works

**Phase 5: Rollback Plan**

- If failures: stop insertion
- Delete from MongoDB
- Revert to JSON
- Fix issues
- Retry

### 6.2 Transformation Logic

```typescript
// src/api/migrations/001-json-to-mongodb.ts
import fs from "fs";
import path from "path";
import * as bcrypt from "bcryptjs";
import {
  UserModel,
  VaultModel,
  VaultItemModel,
  CategoryModel,
  ActivityModel,
} from "../models";

export async function migrateJsonToMongoDB() {
  const dataDir = path.join(process.cwd(), ".vault_data");

  try {
    // Load existing JSON data
    const usersData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "users.json"), "utf8"),
    );
    const passwordsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "passwords.json"), "utf8"),
    );
    const categoriesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "categories.json"), "utf8"),
    );
    const activitiesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "activities.json"), "utf8"),
    );

    // Map to track old IDs → new MongoDB IDs
    const userIdMap = new Map();

    // Migrate users
    for (const user of usersData) {
      const newUser = new UserModel({
        email: user.email,
        masterPasswordHash: user.password, // Already bcrypted in demo
        fullName: user.name || user.email,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      });

      const saved = await newUser.save();
      userIdMap.set(user.id, saved._id);
    }

    // Create default vault for each user
    const vaultMap = new Map();
    for (const [oldUserId, newUserId] of userIdMap) {
      const vault = new VaultModel({
        userId: newUserId,
        name: "Default Vault",
        isDefault: true,
        createdAt: new Date(),
      });

      const saved = await vault.save();
      vaultMap.set(oldUserId, saved._id);
    }

    // Migrate categories
    const categoryMap = new Map();
    for (const category of categoriesData) {
      const userId = userIdMap.get(category.userId);
      if (!userId) continue;

      const vaultId = vaultMap.get(category.userId);

      const newCategory = new CategoryModel({
        vaultId,
        name: category.name,
        createdAt: category.createdAt || new Date(),
      });

      const saved = await newCategory.save();
      categoryMap.set(category.id, saved._id);
    }

    // Migrate passwords
    for (const password of passwordsData) {
      const userId = userIdMap.get(password.userId);
      if (!userId) continue;

      const vaultId = vaultMap.get(password.userId);

      const newPassword = new VaultItemModel({
        vaultId,
        host: password.host || password.site || "Unknown",
        username: password.username || "",
        password: password.password, // Plaintext for now
        notes: password.notes,
        categoryId: categoryMap.get(password.categoryId) || undefined,
        strength: password.strength || "good",
        createdBy: userId,
        createdAt: password.createdAt || new Date(),
        updatedAt: password.updatedAt || new Date(),
      });

      await newPassword.save();
    }

    // Migrate activities
    for (const activity of activitiesData) {
      const userId = userIdMap.get(activity.userId);
      if (!userId) continue;

      const vaultId = vaultMap.get(activity.userId);

      const newActivity = new ActivityModel({
        userId,
        vaultId,
        action: activity.action || "created",
        timestamp: activity.timestamp || new Date(),
        description: activity.description,
      });

      await newActivity.save();
    }

    console.log("✓ Migration complete");
    return {
      usersCreated: userIdMap.size,
      vaultsCreated: vaultMap.size,
      passwordsCreated: passwordsData.length,
      categoriesCreated: categoryMap.size,
      activitiesCreated: activitiesData.length,
    };
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  }
}
```

### 6.3 Rollback Procedure

```typescript
export async function rollbackMigration() {
  // Delete all documents
  await UserModel.deleteMany({});
  await VaultModel.deleteMany({});
  await VaultItemModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await ActivityModel.deleteMany({});

  console.log("✓ Rollback complete - all collections cleared");
}
```

---

## 7. Backup & Recovery Strategy

### 7.1 Automated Backups (Production)

```typescript
// Daily snapshot at 2 AM UTC
// MongoDB Atlas: Automated daily backups with 35-day retention
// Manual snapshots: Before any migration
```

### 7.2 Disaster Recovery

```
1. Detect data loss
2. Stop write operations
3. Restore from most recent snapshot
4. Verify data integrity
5. Resume write operations
6. Verify with sample queries
7. Post-incident review
```

---

## 8. Performance Considerations

### 8.1 Connection Pooling

```typescript
// Mongoose manages connection pool
minPoolSize: 5; // Minimum open connections
maxPoolSize: 10; // Maximum open connections
maxIdleTimeMS: 60000; // Idle connection timeout
```

### 8.2 Query Optimization

```
Before: O(n) filtering in memory
After: Indexed MongoDB queries

Example: Find all "weak" passwords
Before: Load all passwords, filter in Node
After: db.vaultitems.find({ strength: "weak" }) with index
```

### 8.3 Pagination

```typescript
// API should paginate large result sets
GET /api/v1/passwords?vaultId=...&limit=50&skip=0

Implementation:
  .find({...})
  .skip(skip)
  .limit(limit)
  .lean()
  .exec()
```

---

## 9. MongoDB Deployment (Production - Future)

### 9.1 Atlas Setup

```
Cluster: vaultguard-prod
Regions: US East, EU West (replica set)
Backup: Daily automated snapshots
Monitoring: Real-time alerts
Encryption: KMIP (at rest) + TLS (in transit)
```

### 9.2 Mongoose Configuration (Production)

```typescript
await mongoose.connect(process.env.MONGODB_ATLAS_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: "majority",
  readPreference: "primary",
  ssl: true,
  authMechanism: "SCRAM-SHA-1",
});
```

---

## Next Steps (Architecture Review)

1. ✅ Database architecture designed
2. ⏳ Authentication/security architecture to follow
3. ⏳ Vault encryption architecture to follow
4. ⏳ Risk register and ADRs to follow
