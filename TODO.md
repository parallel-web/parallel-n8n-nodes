# Creation of initial MVP (2025-09-02, 2025-09-03)

- ✅ Make n8n node https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/
- ✅ Initial draft spec: https://letmeprompt.com/rules-httpsuithu-wwlvvv0
- ✅ Test this node within the n8n interface and see if it works as expected
  - ✅ Timeout: added description to processor parameter
  - ✅ Improve form for `outputSchema`
- ✅ Copy change for the APIs -- "Web Enrichment" for Task API and "Web Search" for Search API
- ✅ Publish package `n8n-nodes-parallel`
- ✅ Confirm everything is according to guidelines
  - ✅ https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/
  - ✅ https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes
  - ✅ Make sure the linter passes (in other words, make sure running `npx @n8n/scan-community-package n8n-nodes-parallel` passes).
- ✅ Create much better README that links to relevant playground and docs
- ✅ Source policy is found under 'additional fields' to keep initial form simple (good UX)
- ✅ Note: Although provided, link to docs doesn't appear anywhere, but should be solved after approval

# Testing and submission (2025-09-03, 2025-09-04)

- ✅ Test locally
  - ✅ text
  - ✅ base
  - ❌ core (theoretically can still timeout so removed for now)
  - ❌ pro (sometimes works, sometimes times out)
  - ❌ can we still set up the node to retry on failure, so that the result blocknig call is retried as many times as needed for task completion? **No, this will create a new task**
  - ✅ Test `search` with both options
  - ✅ Test `json` with JSON schema for output
  - ❌ Test `auto` deep research. **Doesn't work with core and below**
- ✅ invite `parallel-developers` to maintain package
- ✅ Put code into https://github.com/parallel-web/paralllel-n8n-nodes and link to that
- ✅ Submit: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes (support@parallel.ai + `Parallel Web Systems` as author)
- Wait for approval (may take 6-12 weeks) https://wilmake.slack.com/archives/C09807JBB26/p1757066189095099

# After approval: early access testing

> See: https://docs.n8n.io/hosting/ and https://docs.n8n.io/integrations/community-nodes/installation/gui-install/.
>
> Seems I need to either self-host or get approved first
>
> People COULD already use it locally or on self-hosted before approval

Test with people who wanted early access. Take some time to collect feedback and determine the next steps.

# How to popularize the integration

Think about outsourcing this to n8n dev agency or someone with big network in n8n community

- Create blogpost / thread about n8n integration?
- With n8n influencers: work with people deep in the n8n community
- Meeting Maurice
- Get it featured by n8n
- Making templates and blogs
- Search for n8n folks getting lot of traction

# Potential areas of improvement

## Avoiding Timeout

The max timeout for a workfow depends on where the server is hosted. The user can configure the timeout for a particular workflow, but the server also has a max timeout configured, which is defaulted to 5 minutes on n8n hosted. https://www.reddit.com/r/n8n/comments/1kye4fx/please_increase_timeout_limit_for_deep_research/

If the timeout is just up to 5 minutes, only the "lite", "base", and "core" processors would work. The most important aspect is that we should inform the user about this as soon as possible. There are a few potential ways to do this:

- ✅ Clarify timeout in description, which is available via an '(i)' tooltip
- ❌ Respond with an error if a processor is chosen that may not have enough time given the timeout (for this, we need to know the workflow timeout, but it's unclear how this can be found)

## Use setup with task creation + retrieval (or webhook)

If I understand correctly, the "**action**" that creates the task should be passed the webhook URL from the "**trigger**" in order to use them in the same workflow. This creates a pattern where the user needs to create the trigger first, get the URL, then create the run. From the n8n UX it's not immediately clear how this is done. But it may be the only way for longer running tasks! Should find a good example of this pattern first.

Another option is splitting up the task creation and result node, and instructing the user to retry the result node with waiting time in between.

Both of these options make it more complex for the end-user to execute a task and get results back, potentially reducing user experience and increasing error rate. Creating it this way does increasae capability but is against the goal of creating an easy way to start using parallel.

An option would be to leave the current single-node pattern as it is, and create a separate category called "deep research" that clearly shows there's a `Start Deep Research` operation, and a `Retrieve Deep Research Result` operation. It somehow should be clearly documented these need to be used together with a retry on the retrieval operation.

## How to reduce TTFI (time to first integration)

- oauth
- simplify I/O
- move points people could get confused to additional fields

## To MCP or not to MCP?

- MCP tools are potentially very powerful, but hard to really setup within n8n. Not allowing MCPs reduces capability of our product, but there's too much friction to add it and no easy way to test, likely resulting in frustration with low-coders.

## Chat completions

Add `/chat/completions` with text output.

## Better instructions and guiding of people

- Auto mode likely isn't preferable here since we are flattening the output and auto-mode creates deeply nested result
- Idea: link to playground for creating output schema and recommended processor using ingest API

## Authentication

Example authentication via oauth2: https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/credentials/BoxOAuth2Api.credentials.ts.

Authentication via oauth is may significantly reduce churn, especially for people that don't have an account with Parallel yet. [Deep research that confirms this](https://claude.ai/public/artifacts/52c28da0-85b2-4fc8-9ca9-712cf949cbbb)

N8n UX guidelines recommend using oauth if available: https://docs.n8n.io/integrations/creating-nodes/build/reference/ux-guidelines/#oauth
