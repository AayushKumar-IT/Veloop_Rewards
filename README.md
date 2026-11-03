# VELOOP Rewards · Giveaway experience

A responsive giveaway storefront and modular Node/Express API for VELOOP Rewards. This project is a development implementation based on the supplied brief: sample prize configuration is stored by the API, participation fees are verified and deducted on the server, and winner claims are private and encrypted at rest.

> **Demo / launch boundary:** The giveaway values, participant totals, previous winner records and non-production signup balances are illustrative. They are not live VELOOP events or activity. The supplied Drive artwork is included, but production credentials, live authentication integration and hosting are not configured. Do not use this project to collect real payments or personal information until the production-readiness items below have been completed.

## Experience

- Reward collection with responsive prize cards, individual detail routes, a live visual countdown, clear entry fees and VEs / SVEs / Token balance checks.
- Login and signup for local development; user-facing participation is authenticated and one-per-user-per-giveaway.
- Server-verified fee and currency, idempotent join requests, balance deduction and ledger entry within a MongoDB transaction.
- Previous-winner history, private winner-specific claim forms, accessible FAQ and expandable rules, reduced-motion support, loading / retry / empty states.
- Protected admin endpoints for giveaway configuration, lifecycle transitions, winner selection and claim processing.
- Role-gated admin dashboard for giveaway lifecycle actions, draw finalization, and audited claim review/status updates.
- Supplied giveaway artwork for the phone, watch, earbuds, gift box, ticket and Amazon voucher rewards.

## Stack

- **Frontend:** React 18, Vite, React Router, Bootstrap 5, Lucide React, CSS Modules and React Hooks.
- **API:** Node.js, Express, MongoDB, Mongoose, Zod, JWT, bcrypt, Helmet, CORS and express-rate-limit.
- **Claim privacy:** AES-256-GCM encrypted claim details. Public winner endpoints return masked IDs and never include submitted claim details.

## Requirements

- Node.js 20+ and npm.
- MongoDB configured as a **replica set**. Giveaway joins and winner finalization use MongoDB transactions; standalone MongoDB is not sufficient.
- No secrets are needed by the browser. API settings belong in `backend/.env`.

## Install and run

1. Install workspace dependencies from the repository root:

   ```bash
   npm install
   ```

2. Start the local development experience:

   ```bash
   npm run dev
   ```

   The launcher uses the installed MongoDB Server and `mongosh` to start an isolated, single-node replica set on `127.0.0.1:27018`. It leaves an existing MongoDB service untouched, stores the project database under `%LOCALAPPDATA%\Veloop\MongoDB`, generates ignored local secrets in `backend/.env`, and seeds the sample giveaways if the database is empty. The web app is at `http://localhost:5173`; the API health check is `http://localhost:4000/api/health`. Signup grants clearly demo-only balances for exercising VEs, SVEs and Tokens. Production signups receive no balance grant.

   The launcher requires MongoDB Server (`mongod.exe`) and MongoDB Shell (`mongosh.exe`) to be installed. If either is not on `PATH`, it checks common Windows installation paths. `backend/.env` is created only when absent; keep its values private and never commit it. The sample seed is guarded against production use.

   To create a dedicated local admin account, run `npm run admin:setup --workspace backend` in an interactive terminal. The password is entered without echo and only its hash is stored. Then sign in at `/login` and open `/admin`.

3. Build the production frontend:

   ```bash
   npm run build
   ```

   When the API is hosted on a different origin, set the non-secret frontend build variable `VITE_API_BASE_URL` to the API origin. Never place database credentials or signing/encryption keys in `VITE_*` values.

4. Run backend unit tests:

   ```bash
   npm test
   ```

   The MongoDB-backed account, giveaway entry, draw and claim lifecycle test is included when `MONGO_URI` is configured; it is skipped otherwise. Run it explicitly against the local replica set with:

   ```bash
   npm run test:integration --workspace backend
   ```

## Project structure

```text
frontend/
  src/
    App.jsx                  Routes, page composition and UI states
    data/demoGiveaways.js    Currency labels and non-transactional FAQ copy
    services/api.js          API client and request identifiers
    styles/Giveaway.module.css
    styles/global.css
backend/
  src/
    config/                  Environment and MongoDB setup
    controllers/             Auth, giveaway, participation, claim and admin handlers
    data/giveawayData.js     Development seed configuration
    middleware/              Authentication, request IDs and error handling
    models/                  User, giveaway, participation, ledger, winner, claim and audit models
    routes/index.js
    services/                Atomic join, winner draw and encrypted claim helpers
    validators/              Request schemas
scripts/
  dev-local.ps1              Windows local MongoDB/bootstrap launcher
```

## API overview

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/auth/signup`, `/api/auth/login` | Public, rate limited |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/giveaways`, `/api/giveaways/:id` | Public |
| `GET` | `/api/giveaways/previous/winners` | Public; masked winner IDs only |
| `GET` | `/api/giveaways/:id/my-status`, `/my-claim` | Authenticated |
| `GET` | `/api/giveaways/:id/winners` | Public; empty until finalized |
| `POST` | `/api/giveaways/:id/join` | Authenticated, rate limited, idempotent |
| `POST` | `/api/giveaways/:id/claim` | Authenticated winner only, rate limited |
| `POST` | `/api/admin/giveaways` | Authenticated admin only |
| `GET` | `/api/admin/giveaways` | Authenticated admin only |
| `GET` | `/api/admin/claims` | Authenticated admin only; summaries only |
| `PATCH` | `/api/admin/giveaways/:id/status` | Authenticated admin only |
| `POST` | `/api/admin/giveaways/:id/select-winners` | Authenticated admin only, after end time |
| `GET`, `PATCH` | `/api/admin/claims/:claimId` and `/status` | Authenticated admin only |

The client submits no amount, currency, balance, user ID, winner status or prize-type authority in a join request. The database fee and authenticated account are authoritative. `Idempotency-Key` is scoped to the authenticated user, while compound unique indexes protect both the participation and ledger from duplicate joins. Balances, participation, transaction history, participant counts and audit records are committed atomically.

The device signal is an HMAC hash of an optional browser identifier; the raw identifier is not stored. A shared device is logged as a review signal, not treated as proof of fraud or an automatic ban. Detailed claim information is collected only from a winner and encrypted before persistence.

## Sample configuration

Giveaways are database records seeded from `backend/src/data/giveawayData.js`. Configure fees there for local demonstration or create records through the protected admin API:

| Reward | Entry fee |
|---|---:|
| iPhone 15 Pro | 250 VEs |
| Apple Watch Series 9 | 200 VEs |
| AirPods Pro | 500 SVEs |
| ₹2,000 Amazon voucher | 500 VEs |
| ₹500 Amazon voucher | 300 VEs |
| ₹20 voucher | 2,000 Tokens |

The seed data includes illustrative historical winners. Do not interpret these records or sample participant counts as real activity. Production winner lists must come from completed, authorized draws. To enable the local admin dashboard, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the ignored `backend/.env`, then run `npm run seed --workspace backend`; sign in at `/login` with that account and open `/admin`.

## Future integration / production checklist

- Connect the existing VELOOP identity and wallet/ledger services; remove local signup demo grants and decide which token issuer and refresh strategy the platform uses.
- Have VELOOP product/legal teams approve entry eligibility, actual fee policy, currency semantics, refund handling, draw method, claim deadlines, privacy notice, and dispute/fraud actions. Sample rule text is not legal advice or a confirmed platform policy.
- Put admin access behind the organization’s identity provider, MFA and least-privilege roles. Review/audit the protected PII claim access path.
- Configure production CORS, TLS, key rotation and secret management; add monitoring, backups, retention/deletion policy, wallet-service reconciliation, and abuse/risk review procedures.
- Review random draw fairness, reproducibility and audit evidence with the business before using the sample admin draw service for live prizes.
- Replace demo data and supplied artwork with approved production catalog/assets; provide actual support, privacy and terms URLs.
- Deploy frontend and API to approved Vercel/Netlify and backend infrastructure, configure MongoDB replica set and production environment secrets, then run end-to-end tests against the real auth and wallet services. No live deployment URL or screenshots are available from this local workspace.

## Screenshots

Add approved desktop, tablet, mobile, ended-giveaway, winner-tab and claim-flow screenshots after running the development app with seeded sample data.
