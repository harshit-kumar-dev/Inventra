# StockSense — Smart Inventory & Warehouse Management System

## 🌟 Executive Summary

**StockSense** is an enterprise-grade Smart Inventory and Warehouse Management System designed to eliminate ghost inventory, prevent stock overdrafts, and maintain cryptographically traceable double-entry audit ledgers across distributed logistics networks.

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph TD
    Client[React 18 + TypeScript + Vite SPA] -->|REST API + JWT Bearer| Server[Express.js / Node.js 20 REST API]
    Server -->|Validation & Transaction Pipeline| ORM[Prisma ORM Client]
    ORM -->|Transactional Isolation| DB[(PostgreSQL Database)]
    Server -->|SMTP TLS| Mail[Brevo SMTP Email Service]
    Server -->|Health Check| Health[/api/health]
```

- **Frontend**: React 18, TypeScript, Vite, React Router v6, Tailwind / Custom Glassmorphism Design System, Lucide Icons
- **Backend**: Node.js, Express.js (TypeScript), JWT Authentication, Bcrypt Password Hashing, Nodemailer
- **Database Layer**: PostgreSQL (Local & Supabase Cloud), Prisma ORM 5 with Atomic Transactions
- **Email Infrastructure**: Brevo SMTP (Transactional OTP delivery)

---

## 📦 Key Inventory Principles & Safeguards

1. **Location-Aware Stock (`StockQuantity`)**:
   - Stock is never tracked as a naive `Product.stock` integer.
   - Physical balances exist at explicit `(productId, locationId)` storage coordinates.
2. **Immutable Audit Ledger (`StockLedger`)**:
   - Every completed inventory mutation creates a permanent ledger entry with document timestamps, operation types (`RECEIPT`, `DELIVERY`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT_GAIN`, `ADJUSTMENT_LOSS`), and user audit trails.
3. **Zero-Floor Stock Protection**:
   - Outbound deliveries and transfer movements verify real-time available balances within an interactive PostgreSQL transaction. Overdrafts are rejected with zero partial mutation.
4. **Double-Validation Protection**:
   - Documents in `DONE` or `CANCELED` state are locked and immutable.
5. **Atomic Physical Reconciliation**:
   - Physical count adjustments evaluate $\Delta = \text{Counted} - \text{Recorded}$ and update balances accurately.

---

## 🚀 Repository Structure

```
StockSense/
├── database/                   # Single Source of Truth for DB & Data
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma ORM schema
│   │   └── migrations/         # SQL migration history
│   ├── seed/
│   │   └── seed.ts             # Deterministic seed data
│   └── src/index.ts            # Prisma singleton client export
├── backend/                    # Node.js Express REST API
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, Role guards, Error handler
│   │   ├── routes/             # REST route declarations
│   │   ├── services/           # Core inventory business logic
│   │   ├── utils/              # JWT, Mail, OTP helpers
│   │   └── server.ts           # Express entrypoint
├── frontend/                   # React TypeScript SPA
│   ├── src/
│   │   ├── components/         # Reusable design system components
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── layouts/            # AppLayout, AuthLayout
│   │   ├── pages/              # Auth, Products, Warehouses, Operations, Dashboard
│   │   ├── services/           # Axios-based API client layer
│   │   ├── App.tsx             # Protected/Public route architecture
│   │   └── main.tsx            # React root
├── .env.example                # Clean environment blueprint
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- Node.js (v18+ or v20+)
- PostgreSQL installed locally or Supabase PostgreSQL instance

### 2. Installation
```bash
# Clone the repository
git clone <repo_url>
cd Inventra

# Install all workspace dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `backend/.env` and `frontend/.env`:
```bash
cp .env.example backend/.env
cp .env.example database/.env
```

Ensure `backend/.env` contains:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stocksense?schema=public"
JWT_SECRET="super-secret-jwt-key-stocksense-2026"
JWT_EXPIRES_IN="7d"

BREVO_SMTP_HOST="smtp-relay.brevo.com"
BREVO_SMTP_PORT=587
BREVO_SMTP_USER="b5ce78001@smtp-brevo.com"
BREVO_SMTP_PASSWORD="<YOUR_BREVO_KEY>"
BREVO_SENDER_EMAIL="harshitthekumar@gmail.com"
BREVO_SENDER_NAME="StockSense"
```

### 4. Database Migration & Seeding
```bash
# Apply Prisma migrations
npm run --workspace=database migrate

# Seed demonstration master data & transactions
npm run --workspace=database seed
```

### 5. Start Development Servers
```bash
# Start backend API (Port 5000)
npm run --workspace=backend dev

# Start frontend application (Port 5173)
npm run --workspace=frontend dev
```

---

## 🔑 Demo Accounts for Judges

| Role | Email / Login ID | Password | Access Level |
|---|---|---|---|
| **Inventory Manager** | `manager@stocksense.demo` | `admin123` | Full Administrative & Operations Access |
| **Warehouse Staff** | `warehouse@stocksense.demo` | `admin123` | Standard Picking, Receiving & Counts |

---

## 📡 Core API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | System health and live database connectivity |
| `/api/auth/login` | `POST` | Authenticate user & issue JWT bearer token |
| `/api/auth/forgot-password` | `POST` | Generate secure 6-digit OTP via Brevo SMTP |
| `/api/auth/reset-password` | `POST` | Verify OTP and update password hash |
| `/api/dashboard/summary` | `GET` | Live aggregated inventory & operation KPIs |
| `/api/products` | `GET/POST` | Catalog search, filter, and registration |
| `/api/stock` | `GET` | Location-wise physical balance queries |
| `/api/stock/ledger` | `GET` | Full immutable transaction ledger audit trail |
| `/api/receipts/:id/validate` | `POST` | Atomic goods receipt validation |
| `/api/deliveries/:id/validate` | `POST` | Outbound dispatch with overdraft protection |
| `/api/transfers/:id/validate` | `POST` | Dual-entry inter-location movement |
| `/api/adjustments/:id/validate`| `POST` | Physical count variance reconciliation |

---

## 🛡️ Security Review
- Passwords hashed with `bcryptjs` (salt rounds: 10).
- OTPs are cryptographically hashed in DB with expiration timestamps and attempt limits.
- Sensitive environment files (`.env`) are excluded via `.gitignore`.
- Error handler sanitizes stack traces in production mode.

---

## 🏆 Hackathon Status: Complete & Verified
- **Backend build**: Passed with 0 errors.
- **Frontend build**: Production bundle compiled successfully.