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
npm audit --omit=dev
npm run check-package
git diff --check
```

Tests use Node's built-in test runner against clean compiled output. Add contract fixtures for request-shape, compatibility, webhook, or execution-semantics changes. Do not put credentials or live customer payloads in fixtures.

## Pull requests

Explain the user impact, compatibility boundary, and validation performed. Distinguish fixture/schema validation from authenticated live API validation. Do not publish a package from a pull-request branch.

## Release checks

Run `npm run validate` for the same checks as CI. Run `npm run release:rehearse`
to execute validation and publish lifecycle hooks without writing to npm. The
local package checker deliberately performs real temporary pack/install operations
even during this rehearsal. It also loads every declared node and credential.

After an independent PR review, both CI jobs and the required Eng approval, merge
through the normal GitHub process. Finish the sequential dependency queue and
rerun the audit on final main before choosing an unpublished package version.
Update package.json and package-lock.json together if a version change is needed.
The reviewed release tag must be `v` followed by that version, on the tested main
commit. Never move a published tag or reuse a published version.

Publishing runs only through `.github/workflows/publish.yml`, with npm trusted
publishing configured for this repository and workflow. An npm package owner must
verify that trust and accept any remaining development-tool security exposure.
A local npm login is not required by trusted publishing, but GitHub write access
alone does not establish npm publishing authority. Do not bypass lifecycle checks
or repository approval rules. Verify npm provenance, tarball integrity and a fresh
registry install after publishing. Rehearsal does not prove OIDC permission.

The current dependency queue is #23, #20, #21, then #22. Refresh and test each PR
after the preceding merge. #22 subsumes the vulnerable brace-expansion path;
verify the final lockfile rather than assuming an overlapping PR is unnecessary.
Use `npm audit --json` to inspect the full tooling tree as well as the production
audit in validate. CI retains that report. Require a full-tree high/critical audit
gate once the existing queue clears; do not hide advisories or force unsupported
major overrides to produce a green audit.

### Unresolved development dependency findings

As of September 14, 2026, the production audit is clean but development tooling
still brings vulnerable `uuid@10.0.0`, `qs@6.15.2` and `stream-json@1.9.1`.
Track GHSA-w5hq-g745-h8pq, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g and
GHSA-528h-pc64-c93x in the full audit report. The latest inspected n8n backend
packages still pin the affected qs and stream-json versions. This repository's
package validator prohibits overrides, including scoped overrides. A tested qs
6.16.0 override therefore cannot be shipped under the current package contract.

The stream-json consumer imports its parser and `stream-json/Assembler` through
CommonJS; forcing version 3 would change the module/export contract. The uuid
consumers include LangChain v1/v4 usage in both CommonJS and ESM. These packages
are development dependencies, not libraries shipped in this node's tarball;
the separately installed n8n host has its own dependency tree. This distinction
is not risk acceptance. The release owner must disposition these findings or
wait for compatible upstream repairs before publishing. Reevaluate when the
n8n tooling updates its pinned dependencies; retain audit evidence in the PR.
