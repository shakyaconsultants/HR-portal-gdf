This is a Next.js monolith for the GDF Trainee Management & Hiring Portal using MongoDB.

## Stack

- Next.js App Router (single codebase frontend + backend APIs)
- MongoDB + Mongoose
- JWT cookie auth with roles: ADMIN, HR, TRAINER
- Indexed collections for query optimization

## Features implemented (MVP)

- Candidate registration
- Verification stage updates
- Batch creation
- Candidate batch assignment and transfer history
- Final mock call evaluation with score calculation
- Hiring decision updates
- Candidate timeline API
- Dashboard metrics
- Role-based protected endpoints

## Full pipeline coverage

- Registration -> verification -> batch assignment -> training -> final evaluation -> hiring decision
- Communication logs for letters/instructions
- Onboarding forms with status
- Transfer to employee records
- Pipeline and batch performance reports

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and update values:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`

If login returns 500, verify `.env.local` has valid values (especially `MONGODB_URI` and `JWT_SECRET`).

## Create portal users (one-time)

Credentials are **not** hardcoded. Configure seed accounts in `.env.local` (see `.env.example`), then run:

```bash
# Set SEED_USERS_ENABLED=true and SEED_ADMIN_EMAIL/PASSWORD (etc.) in .env.local first
npm run seed:users
```

Optional overrides: copy `scripts/.env.seed.example` to `scripts/.env.seed` (gitignored).

## Query optimization strategy

- Compound indexes on frequent filters (`status`, `verificationStage`, `batchId`, timestamps)
- Text index for candidate search by name/email/phone
- Projection in list APIs (return only required fields)
- Pagination and bounded page size
- Parallelized dashboard `countDocuments` calls
