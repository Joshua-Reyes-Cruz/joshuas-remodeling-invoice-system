# Security policy

This repository contains a private business application. Do not put customer
records, completed invoices, access tokens, OAuth secrets, signing keys, or
production database exports in GitHub.

## Reporting a vulnerability

Use a private GitHub security advisory or contact the repository owner
directly. Do not open a public issue containing exploit details, customer data,
or credentials.

## Secrets

- Keep local secrets in `.env.local`; all `.env*` files except
  `.env.example` are ignored.
- Store hosted secrets in the Sites environment-variable manager.
- Rotate a credential immediately if it is ever committed, even if the commit
  is later removed.
- Use separate DocuSign Demo and production credentials.
- Never log decrypted DocuSign access or refresh tokens.

## Data handling

- D1 stores workspace state, document metadata, OAuth state, and encrypted
  DocuSign connection data.
- R2 stores private logos and signed PDF documents.
- Every storage query and object key must remain scoped to the authenticated
  owner.
- Webhook payloads must be authenticated before they can update a job or save
  a signed document.
