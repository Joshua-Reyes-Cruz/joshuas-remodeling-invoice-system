# Joshua's Remodeling Invoice System

A private, job-centered invoicing application for creating customer invoices,
tracking change orders, and keeping signed documents with the correct job.

[Open the hosted application](https://joshuas-remodeling.joshuareyes09876.chatgpt.site)

## Current MVP

- Job dashboard with customer, property, and project status
- Customizable company and invoice defaults
- Service and material line items with automatic totals
- Discounts, taxes, tips, payment terms, and due dates
- Per-job invoice and change-order history
- Branded invoice and change-order customer views
- Persistent workspace state in Cloudflare D1
- Company-logo and signed-PDF storage in Cloudflare R2
- Private owner authentication through ChatGPT Sites
- DocuSign Authorization Code OAuth connection foundation
- Python calculation engine and isolated DocuSign adapter

The OAuth connection flow is implemented, but production signature sending is
not complete. See [DocuSign integration](docs/DOCUSIGN.md) for the exact status
and remaining work.

## Technology

| Area | Technology |
| --- | --- |
| Web application | React 19, Next.js-compatible App Router, Vinext, TypeScript |
| Styling | Tailwind CSS 4 and vendored Shadcn UI primitives |
| Runtime | Cloudflare Worker through ChatGPT Sites |
| Structured storage | Cloudflare D1 with Drizzle ORM migrations |
| File storage | Cloudflare R2 |
| Authentication | ChatGPT Sites authenticated-user headers |
| Optional service | Python 3.12, Flask, Decimal-based invoice calculations |
| E-signature | DocuSign OAuth foundation; envelopes and webhooks pending |

## Repository layout

```text
app/                    React UI, server routes, and DocuSign OAuth flow
components/ui/          Reusable UI primitives
db/                     Drizzle schema and database access
drizzle/                Versioned D1 migrations
public/                 Static brand assets
python_backend/         Optional Python calculation/signature adapter
scripts/                Reproducible install and production-build scripts
tests/                  Node rendering and component tests
worker/                 Cloudflare Worker entry point
docs/                   Architecture, development, deployment, and DocuSign notes
.openai/hosting.json    Sites project identity and logical D1/R2 bindings
```

## Local setup

### Requirements

- Node.js 22.13 or newer
- npm 11 or compatible
- Python 3.12 or newer for the optional Python service

### Web application

```bash
git clone https://github.com/Joshua-Reyes-Cruz/joshuas-remodeling-invoice-system.git
cd joshuas-remodeling-invoice-system
npm ci
cp .env.example .env.local
npm run dev
```

The local Cloudflare runtime creates development D1 and R2 bindings. Hosted
authentication headers are supplied by Sites in production, so authenticated
storage routes should be validated in a Sites environment before release.

### Python service

```bash
cd python_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m unittest discover -p "test_*.py"
python app.py
```

The Python service listens on `http://127.0.0.1:5050` and exposes:

- `GET /health`
- `POST /api/calculate`
- `POST /api/signatures/send`

The hosted web application currently calculates totals in its own application
flow. The Python service is an optional boundary for a later split deployment.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DOCUSIGN_CLIENT_ID` | For OAuth | DocuSign Integration Key |
| `DOCUSIGN_CLIENT_SECRET` | For OAuth | Secret for the Integration Key |
| `DOCUSIGN_TOKEN_ENCRYPTION_KEY` | For OAuth | App-owned key used to encrypt stored tokens |
| `DOCUSIGN_REDIRECT_URI` | For OAuth | Exact registered callback URL |
| `DOCUSIGN_ENVIRONMENT` | For OAuth | `demo` during testing, then `production` |
| `DOCUSIGN_ACCOUNT_ID` | Python only | Account used by the standalone adapter |
| `DOCUSIGN_ACCESS_TOKEN` | Python only | Temporary adapter access token |
| `DOCUSIGN_BASE_URL` | Python only | Demo or production REST API base URL |

Never commit real values. Use `.env.local` locally and protected Sites runtime
settings for the hosted application.

## Database migrations

The checked-in migrations define four application tables:

- `workspace_states`
- `stored_documents`
- `docusign_connections`
- `docusign_oauth_states`

After changing `db/schema.ts`, generate and inspect a new migration:

```bash
npm run db:generate
```

Do not rewrite a migration that has already reached production. Add a new one.

## Quality checks

```bash
npm run lint
npm test

cd python_backend
python -m unittest discover -p "test_*.py"
```

GitHub Actions runs the same web and Python checks for pushes and pull
requests to `main`.

## Deployment

Production is hosted through ChatGPT Sites. The repository intentionally keeps
the Sites manifest and generated D1 migrations under version control. Follow
[Deployment](docs/DEPLOYMENT.md) for the release checklist.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [DocuSign integration](docs/DOCUSIGN.md)
- [Security policy](SECURITY.md)

## Deferred backlog

- Complete DocuSign envelope sending and authenticated completion webhooks
- Download and archive signed PDFs and certificates automatically
- Online payments
- QuickBooks synchronization
- SMS and automated reminders
- Multi-user roles and permissions
- Recurring invoices
- Drag-and-drop invoice template builder

## Ownership

Private business software for Joshua's Remodeling. All rights reserved.
