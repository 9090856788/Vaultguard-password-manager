# ADR-001: MongoDB + Mongoose Selection

**Date:** September 2026  
**Status:** APPROVED (G2 Architecture Gate)  
**Impact:** Database selection for all persistence

---

## Context

VaultGuard is a password manager that requires:

- Flexible schema for passwords, categories, activities, and audit data
- User data isolation and multi-user support
- Strong consistency guarantees for password data
- Scalability for future multi-vault support
- TypeScript type safety for API/database layer

We evaluated three persistence approaches:

1. **MongoDB + Mongoose** (recommended)
2. PostgreSQL + Prisma
3. PostgreSQL + Sequelize

---

## Decision

**ADOPT MongoDB + Mongoose for VaultGuard persistence layer.**

- MongoDB will be the primary database
- Mongoose will handle data modeling and validation
- No additional ORM (Prisma excluded per target stack)
- MongoDB Atlas for managed hosting in production
- Local MongoDB for development

---

## Rationale

### Why MongoDB > PostgreSQL

| Aspect                  | MongoDB                    | PostgreSQL                       |
| ----------------------- | -------------------------- | -------------------------------- |
| **Schema Flexibility**  | Document model, flexible   | Rigid schema                     |
| **Passwords Structure** | Natural fit (nested docs)  | Requires joins/normalization     |
| **Version History**     | Embedded arrays easy       | Separate tables, complex queries |
| **Audit Trail**         | Embedded in password doc   | Separate audit table             |
| **Multi-vault Future**  | Natural hierarchy          | Requires schema redesign         |
| **Transactions**        | Multi-doc v4.0+ sufficient | Full ACID (overkill for Phase 1) |

### Why Mongoose > ORM Abstraction

Per target stack: "Do not introduce an ORM."

Mongoose is an ODM (Object Document Mapper), not an ORM:

- **ODM:** Maps JavaScript objects to MongoDB documents
- **ORM:** Maps relational rows to objects (Prisma, Sequelize)

Mongoose is the idiomatic way to use MongoDB with Node.js:

- Type safety with TypeScript types
- Schema validation
- Middleware hooks (pre/post save)
- Query builder
- Lean queries for performance
- Mature ecosystem (10+ years)

---

## Consequences

### Positive

✅ **Type Safety:** Mongoose provides TypeScript support  
✅ **Scalability:** MongoDB sharding when needed  
✅ **Flexibility:** Embedded documents for password metadata  
✅ **Transactions:** Multi-document transactions (v4.0+)  
✅ **Development Speed:** Less schema management boilerplate  
✅ **Cost:** MongoDB Atlas free tier for development

### Negative / Risks

⚠️ **Join Complexity:** If accessing related data across collections (can use $lookup)  
⚠️ **Normalization:** Duplication possible (mitigated by careful schema design)  
⚠️ **Query Performance:** Requires proper indexing (documented in database-architecture.md)

### Mitigation Strategies

1. **Indexing:** All common queries indexed (see database-architecture.md§2)
2. **Denormalization:** Minimal duplication, documented in schema
3. **Query Optimization:** Use aggregation pipeline for complex queries
4. **Connection Pooling:** Configured for production scale
5. **Backup Strategy:** Automated backups via MongoDB Atlas

---

## Implementation

### Collections to Create

```typescript
db.users; // User accounts (unique email)
db.vaults; // Password vault containers
db.vaultitems; // Individual passwords
db.categories; // Password categories
db.activities; // Audit trail
db.sessions; // Token revocation (Phase 3)
db.auditevents; // Security events (Phase 3)
```

### Connection Configuration

```typescript
// src/api/config/database.ts
const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/vaultguard";

mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  w: "majority",
});
```

### Mongoose Model Pattern

```typescript
// src/api/models/User.ts
import { Schema, model } from "mongoose";

const userSchema = new Schema({
  email: { type: String, unique: true, index: true },
  accountPasswordVerifier: String,
  fullName: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

export const User = model("User", userSchema);
```

---

## Alternatives Considered

### PostgreSQL + Prisma

**Why Not?**

- Target stack explicitly excludes ORMs: "Do not introduce an ORM"
- Rigid schema makes password metadata structure awkward
- Requires schema migrations for each password version history change
- Overkill ACID guarantees for Phase 1 (MongoDB transactions sufficient)

### PostgreSQL + Sequelize

**Why Not?**

- Same ORM exclusion as Prisma
- More verbose than Mongoose for this use case
- Smaller community for TypeScript support
- Less idiomatic for Node.js/Express

### Firebase

**Why Not?**

- Not self-hosted option (lock-in risk)
- Real-time sync unnecessary for password manager
- Pricing unclear for large data volumes
- Less control over security/compliance

---

## Security Implications

✅ **No security disadvantage** vs. PostgreSQL for this use case

- Mongoose provides input validation (prevents injection)
- MongoDB enforces authentication (when configured)
- Transactions support consistency (ACID for critical operations)
- Indexes don't expose sensitive data

🔒 **Password data handling:**

- Plaintext stored in Phase 1 (acceptable for migration period)
- Phase 2+: Client-side AES-256-GCM encryption before upload
- Server cannot see plaintext in Phase 2+

---

## Verification

### Before Implementation Starts

- [ ] Database engineer approves schema design
- [ ] Performance benchmarks established (target: <100ms queries)
- [ ] Backup/restore procedures documented
- [ ] Index strategy reviewed

### During Implementation

- [ ] All collections created with proper indexes
- [ ] Mongoose models compile without errors
- [ ] Migration scripts tested on dry-run data
- [ ] Connection pooling tested under load

### After Implementation

- [ ] All integration tests pass
- [ ] Performance tests meet targets
- [ ] Backup/restore tested successfully
- [ ] Production MongoDB Atlas configured

---

## Related Decisions

- **ADR-002:** Encryption strategy (client-side Phase 2+)
- **ADR-003:** Service layer (data access abstraction)
- **Database Architecture:** `docs/database/database-architecture.md`
- **Migration Strategy:** `docs/database/migration-strategy.md`

---

## References

- MongoDB Documentation: https://docs.mongodb.com/
- Mongoose Documentation: https://mongoosejs.com/
- Database Architecture: `docs/database/database-architecture.md`
- Migration Strategy: `docs/database/migration-strategy.md`
