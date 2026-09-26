# Inventra Database Package (`@stocksense/database`)

The single source of truth for the database schema, Prisma migrations, and deterministic seed data for **Inventra — Smart Inventory Management System**.

---

## 🏗️ Architecture

- **Database**: PostgreSQL (Local Postgres & Cloud Supabase PostgreSQL)
- **ORM**: Prisma ORM
- **Export**: Shared typed Prisma client singleton consumed by the backend.

---

## 📁 Structure

```
database/
├── prisma/
│   └── schema.prisma      # Core schema & relational models
├── seed/
│   └── seed.ts            # Deterministic, idempotent seed data
├── src/
│   └── index.ts           # Centralized PrismaClient instance export
├── .env.example           # Connection string template
├── package.json           # Database tooling scripts
├── tsconfig.json          # TypeScript build config
└── README.md
```

---

## 🚀 Available Scripts

From the repository root or the `database/` directory:

| Command | Description |
| :--- | :--- |
| `npm run db:generate` | Generates the Prisma Client types |
| `npm run db:migrate` | Runs database migrations in development mode |
| `npm run db:push` | Pushes the Prisma schema state directly to the database |
| `npm run db:seed` | Runs the idempotent seed script |
| `npm run db:studio` | Opens Prisma Studio UI |
| `npm run db:reset` | Resets the database and re-runs seed |

---

## 📊 Core Data Models

- **Auth & Access**: `User`, `PasswordResetOTP`
- **Master Catalog**: `Product`, `Category`, `UnitOfMeasure`, `Supplier`
- **Warehouse & Stock**: `Warehouse`, `Location`, `StockQuantity` (`@@unique([productId, locationId])`)
- **Operations**: `Receipt`, `ReceiptLine`, `Delivery`, `DeliveryLine`, `InternalTransfer`, `TransferLine`, `StockAdjustment`, `AdjustmentLine`
- **Audit Ledger**: `StockLedger` (Immutable log of all IN/OUT/TRANSFER/ADJUST stock movements)
- **Alerts**: `Notification`
