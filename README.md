# n8n-nodes-parallel

An [n8n community node](https://docs.n8n.io/integrations/community-nodes/) for the Parallel web research platform.

## Install

Install `n8n-nodes-parallel` from **Settings → Community Nodes** in a self-hosted n8n instance, or install it in the n8n community-nodes directory with npm:

```bash
npm install n8n-nodes-parallel
```

Create a **Parallel API** credential with an API key from [Parallel Platform](https://platform.parallel.ai/). Add the webhook secret from Platform Settings when using either trigger.

## Included nodes

The package registers three nodes while preserving the node names used by existing workflows.

### Parallel

The regular node supports:

- **Task:** synchronous and asynchronous Task Runs, Task Run status, and completed Task Run result retrieval.
- **Search:** GA `/v1/search` with Turbo, Fast, Basic, and Advanced modes, required query handling, result budgets, and domain policy.
- **Chat:** OpenAI-compatible chat completions using Speed, Lite, Base, or Core.
- **Monitor:** event-stream and snapshot creation, retrieval, listing, update, cancellation, immediate triggering, and cursor-paginated events.

Current Task processors include Lite, Base, Core, Core 2x, Pro, Ultra, Ultra 2x, Ultra 4x, Ultra 8x, and their documented fast variants.

### Parallel Task Run Completion Trigger

Receives `task_run.status` webhooks. Successful events fetch the completed result; failed events preserve the failure payload without requesting a result that does not exist.

### Parallel Monitor Event Trigger

Receives detected, completed, and failed Monitor events. Detected events can fetch the full event group through the GA events endpoint.

## Webhook security

Signature validation is enabled by default. Both triggers verify the exact raw request bytes using the Standard Webhooks headers, the Base64-decoded `whsec_` secret, HMAC-SHA256, timing-safe comparison, and a five-minute timestamp tolerance.

To connect a trigger:

1. Add the trigger and copy its n8n webhook URL.
2. Supply that URL in the Task or Monitor webhook field when creating the resource.
3. Configure the Parallel webhook secret in the n8n credential.

The trigger lifecycle does not register a remote webhook itself; the URL is part of the Task/Monitor create or update request.

## Compatibility notes for 0.3

- Search now uses the GA endpoint and request shape. Saved `base` and `pro` values map to `basic` and `advanced`.
- Monitor now uses `/v1/monitors`. Saved `hourly`, `daily`, `weekly`, and `every_two_weeks` cadences map to `1h`, `1d`, `1w`, and `2w`.
- The former **Delete Monitor** operation keeps its saved operation value but now calls the GA cancellation endpoint.
- Signature validation now defaults to secure. Workflows that intentionally receive unsigned test calls must turn validation off explicitly.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm audit --omit=dev
npm run check-package
```

`npm run check-package` packs the project, verifies every declared n8n path, installs the tarball in a clean temporary consumer, and requires its public entry point.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.

## Release

Releases are published only by the tag-triggered GitHub Actions workflow. Configure npm trusted publishing for `.github/workflows/publish.yml`, then use the n8n release command to prepare and push an intentional version tag. The workflow publishes with npm provenance.

## Resources

- [Parallel documentation](https://docs.parallel.ai/)
- [Search API](https://docs.parallel.ai/search/search-quickstart)
- [Task API](https://docs.parallel.ai/task-api/task-quickstart)
- [Monitor API](https://docs.parallel.ai/monitor-api/monitor-quickstart)
- [Chat API](https://docs.parallel.ai/chat-api/chat-quickstart)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

## Upgrading from 0.2.0

Back up your n8n database and exported workflows before updating. Test the upgrade
in a disposable instance first, using Node 22.22 or newer. Existing node,
credential and operation identifiers remain unchanged.

- Search defaults to Basic, equivalent to the previous Base setting. Explicit
  Base and Pro values still map to Basic and Advanced.
- Webhook signature validation defaults to enabled. Workflows that omitted the
  old default now require the Parallel webhook secret in their credentials.
  Configure it before reactivating callbacks. An explicitly saved disabled setting
  remains disabled. Both Standard and legacy signing formats are supported.
- Monitor callbacks retain `event_group_id` at the top level. Fetch failures still
  emit `event_group_error` by default. Enable **Retry on Fetch Failure** to return
  a retryable HTTP failure instead. Accepted events may be delivered repeatedly;
  use the additive `webhook_id` to identify redelivery. With signature validation
  disabled, this header is untrusted caller input.
- The GA Monitor events endpoint returns an `events` array and `next_cursor`.
  Update expressions that consumed the old alpha event-group response accordingly.
  Saved **Lookback Period** options are rejected explicitly because the current
  API cannot guarantee that historical window. Remove that option and use cursor
  pagination, handling unavailable older history in your workflow.
- Synchronous Tasks have a configurable total result-wait budget of 1–120 minutes,
  defaulting to 75 minutes to accommodate the old 15 four-minute polls plus
  backoff. This is now a hard local bound; host execution limits can be shorter.
  A timeout does not cancel the Task. Use the reported run ID with **Get Task Run
  Result**, rather than submitting another Task. Prefer Async for long processors.
- Authenticated events excluded by a trigger's filter receive HTTP 200 without
  starting the workflow. Malformed matching events receive 400; invalid signatures
  receive 401. Task result fetch failures and opted-in Monitor fetch failures
  receive 503. Enrichment requests have a five-second local timeout.

See [CONTRIBUTING.md](CONTRIBUTING.md) for validation and the reviewed release process.
