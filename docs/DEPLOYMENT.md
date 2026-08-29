# Deployment guide

The production application is managed by ChatGPT Sites at:

<https://joshuas-remodeling.joshuareyes09876.chatgpt.site>

## Runtime resources

The logical resource names are defined in `.openai/hosting.json`:

- D1 binding: `DB`
- R2 binding: `BUCKET`

Sites owns the physical Cloudflare resource identifiers. Do not replace the
logical names in application code or commit local Wrangler resource IDs.

## Required production settings

For DocuSign OAuth, configure protected runtime values:

```text
DOCUSIGN_CLIENT_ID
DOCUSIGN_CLIENT_SECRET
DOCUSIGN_TOKEN_ENCRYPTION_KEY
DOCUSIGN_REDIRECT_URI
DOCUSIGN_ENVIRONMENT
```

The current production redirect URI is:

```text
https://joshuas-remodeling.joshuareyes09876.chatgpt.site/api/docusign/callback
```

Use `DOCUSIGN_ENVIRONMENT=demo` until the full envelope and webhook path has
passed end-to-end testing. Switch both the credentials and environment to
production together after DocuSign go-live.

## Release checklist

1. Confirm the intended commit is on `main`.
2. Confirm GitHub Actions passes.
3. Run the local production build.
4. Inspect any new D1 migration before publishing.
5. Verify no secrets or customer exports are in the commit.
6. Publish an immutable Sites checkpoint from that exact commit.
7. Wait for terminal deployment success and record the production URL.
8. Verify D1 table creation when a migration was added.

## Rollback principle

Code can be rolled back to a previously saved Sites version. Database changes
require a forward repair migration; do not assume a code rollback reverses a D1
migration or removes newly written data.

## Post-release verification

- The job dashboard loads for the authenticated owner.
- Existing workspace data appears.
- A workspace edit saves and survives reload.
- The company logo loads from R2.
- A test PDF can be uploaded and downloaded from the correct job.
- DocuSign Settings accurately reports configured and connection status.
