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
npm audit --audit-level=high
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

The security updates in #23, #20, #21 and #22 remove the existing high-severity
findings. `npm run validate` checks production dependencies and rejects high or
critical findings anywhere in the installed tree, including development tooling.
CI and the release wrapper both run this command. Moderate tooling findings stay
visible in the audit output and the full JSON report retained by CI; passing the
severity gate does not accept their risk. Do not hide advisories or force
unsupported major overrides to produce a green audit.

### Unresolved development dependency findings

As of September 14, 2026, the production audit is clean but development tooling
still brings vulnerable `uuid@10.0.0`, `qs@6.15.2` and `stream-json@1.9.1`.
Track GHSA-w5hq-g745-h8pq, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g and
GHSA-528h-pc64-c93x in the full audit report. The latest inspected n8n backend
packages still pin the affected qs and stream-json versions. This repository's
package validator prohibits overrides, including scoped overrides. A tested qs
6.16.0 override therefore cannot be shipped under the current package contract.

Source inspection and bounded local checks found:

- `stream-json`: backend-common uses its parser and CommonJS
  `stream-json/Assembler`, not the filter APIs implicated by the advisory. A
  circular-data roundtrip through the actual consumer passed. Forcing version 3
  would change the module/export contract.
- `uuid`: the inspected LangChain callers use v1/v4 without external buffers.
  Those calls returned valid IDs. Installed uuid 10 silently accepts undersized
  external buffers in both v4 and v5, so other call signatures are not cleared.
- `qs`: backend-network calls stringify for query and form serialization.
  Ordinary serialization passed, but a crafted JSON object with a non-callable
  `constructor.isBuffer` reproduced the error through its actual query
  serializer. That trigger does not require a preceding qs.parse call. The
  separate array-limit parse advisory also reproduced in a small fixture.

The CLI's executable source does not directly import its AI SDK dependency;
scaffolding templates reference it. A CommonJS module-load trace during build,
validation and release rehearsal did not load the vulnerable uuid 10, qs or
stream-json copies. This is evidence for those commands, not proof about ESM
loads, interactive development, scaffolding, or every possible input.

These packages are development dependencies, not libraries shipped in this
node's tarball; the separately installed n8n host has its own dependency tree.
No release owner has accepted the remaining risk. The npm release owner must
record a disposition of these findings or wait for compatible upstream repairs
before publishing. Reevaluate when n8n tooling updates its pinned dependencies,
when these packages become reachable through a changed command or consumer, or
when advisory severity changes. Retain current audit and consumer evidence in
the maintenance PR.
