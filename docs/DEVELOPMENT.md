# Development guide

## Install

```bash
nvm use
npm ci
cp .env.example .env.local
```

Use DocuSign Demo credentials only during development. A real
`DOCUSIGN_TOKEN_ENCRYPTION_KEY` should be a long random value and must never be
committed.

## Run

```bash
npm run dev
```

The Vite configuration starts Vinext with local Cloudflare D1 and R2 bindings.
Local binding data is stored in ignored project runtime directories.

## Commands

| Command | Result |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Produce the Cloudflare-compatible production build |
| `npm run lint` | Run ESLint |
| `npm test` | Build and run Node tests |
| `npm run db:generate` | Generate a migration from `db/schema.ts` |

## Python service

```bash
cd python_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m unittest discover -p "test_*.py"
python app.py
```

On Windows PowerShell, activate the environment with:

```powershell
.venv\Scripts\Activate.ps1
```

## Change workflow

1. Create a focused branch from `main`.
2. Make the smallest coherent change.
3. Add a migration when the schema changes.
4. Run lint, Node tests, and Python tests.
5. Open a pull request describing user-visible behavior and data changes.
6. Merge only after CI passes.

## Data and API rules

- Resolve ownership on the server from the authenticated header.
- Validate payload type and size before writing to D1 or R2.
- Keep file keys owner-scoped and unguessable where appropriate.
- Never return OAuth tokens to the browser.
- Preserve issued invoices and change orders as historical records.
- Use decimal-safe money logic and round only at defined currency boundaries.

## Adding a migration

1. Update `db/schema.ts`.
2. Run `npm run db:generate`.
3. Inspect the new SQL in `drizzle/`.
4. Confirm it is additive or has a deliberate data-migration strategy.
5. Commit the schema, SQL migration, snapshot, and journal together.

Never edit a production-applied migration in place.
