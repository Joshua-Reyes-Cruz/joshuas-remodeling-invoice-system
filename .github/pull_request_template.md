## Summary

Describe the user-visible result and why this change is needed.

## Data and security

- [ ] No secrets, customer exports, or signed documents are included
- [ ] Owner scoping is preserved for every D1 and R2 operation
- [ ] A new additive migration is included if the schema changed
- [ ] DocuSign tokens and webhook payloads are handled safely, if applicable

## Verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `python -m unittest discover -s python_backend -p "test_*.py"`
- [ ] Relevant invoice and change-order flow checked

## Deployment notes

List new environment variables, migrations, callback changes, or manual release
steps. Write `None` when there are no special steps.
