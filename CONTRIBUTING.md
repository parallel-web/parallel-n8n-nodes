# Contributing

## Development setup

Use a supported Node version from the CI matrix and install the locked dependency tree:

```bash
npm ci
```

Keep changes focused and preserve the persisted `name`, resource, and operation values used by saved n8n workflows. API-version and legacy-value translations belong in the request-contract boundary rather than being duplicated across actions.

## Validation

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run prerelease
npm audit --omit=dev
npm run check-package
git diff --check
```

Tests use Node's built-in test runner against clean compiled output. Add contract fixtures for request-shape, compatibility, webhook, or execution-semantics changes. Do not put credentials or live customer payloads in fixtures.

## Pull requests

Explain the user impact, compatibility boundary, and validation performed. Distinguish fixture/schema validation from authenticated live API validation. Do not publish a package from a pull-request branch.
