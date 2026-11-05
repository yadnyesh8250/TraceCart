# TraceRoyale (repository: TraceCart)

Creator-first licensing, usage reporting, and royalty lineage for a controlled network of participating AI applications.

## Run locally

Requirements: Node.js 20+, npm, and Docker Desktop or a local PostgreSQL 15+ server.

1. Install dependencies: `npm install`
2. Start PostgreSQL: `docker compose up -d postgres`
3. Copy `backend/.env.example` to `backend/.env` and replace `JWT_SECRET` with a long random secret.
4. Generate Prisma client and create the schema: `npm run db:generate && npm run db:migrate -w backend`
5. Start API and web app: `npm run dev`
6. Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/api/health`.

## MVP implemented

- Creator and licensee registration/login with role-scoped API access.
- Image asset registration for JPEG, PNG, and WebP, local private storage, and server-calculated SHA-256.
- Versioned fixed-per-use licence offers and creator approval/rejection of requests.
- Revocable licensee application keys; raw keys are shown only once and stored hashed.
- Application-authenticated usage event reporting with authorization checks and event deduplication.
- Deterministic fixed-fee royalty credits and a traceable ledger/lineage view.
- Responsive dashboards for creators and licensees.

## Not wired to external providers yet

PayPal checkout/payouts and LLM-based licence drafting are not enabled. The requirements document marks them as integrations requiring credentials, eligibility/policy choices, and additional validation. The current MVP does not represent a reported royalty as a completed payout.

## Product boundaries

Usage is reported by participating applications; TraceRoyale does not discover all use across the internet or establish that an asset influenced model training or an output. A file hash identifies file bytes, not copyright ownership. The repository name is `TraceCart`; the supplied product brief calls the product `TraceRoyale`, so public naming remains to be confirmed.

## Requirements and research

- [Problem statement](docs/requirements/problem-statement.md)
- [Product requirements](docs/requirements/requirements.md)
- [Research and design notes](docs/research/research-and-design-notes.md)
