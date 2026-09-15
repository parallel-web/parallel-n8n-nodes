const assert = require('node:assert/strict');
const test = require('node:test');
const { createHmac } = require('node:crypto');
const { NodeHelpers } = require('n8n-workflow');
const { Parallel } = require('../dist/nodes/Parallel/Parallel.node');
const { ParallelTrigger } = require('../dist/nodes/ParallelTrigger/ParallelTrigger.node');
const {
	ParallelMonitorTrigger,
} = require('../dist/nodes/ParallelMonitorTrigger/ParallelMonitorTrigger.node');
const { buildMonitorEventsQuery } = require('../dist/nodes/Parallel/contracts/requests');
const { verifyParallelWebhook } = require('../dist/nodes/Parallel/webhooks/verify');

function context(payload, parameters = {}, request = async () => ({})) {
	const replies = [];
	const headers = { 'webhook-id': 'delivery_1' };
	const ctx = {
		getNode: () => ({ name: 'Parallel', typeVersion: 1, parameters: {} }),
		getBodyData: () => payload,
		getHeaderData: () => headers,
		getNodeParameter: (name, fallback) =>
			({
				validateSignatures: false,
				onlyCompleted: true,
				includeWebhookData: false,
				fetchEventGroup: true,
				retryOnFetchFailure: false,
				eventTypeFilter: ['monitor.event.detected'],
				...parameters,
			})[name] ?? fallback,
		getResponseObject: () => ({
			status(code) {
				replies.push(code);
				return this;
			},
			json(body) {
				replies.push(body);
				return this;
			},
		}),
		helpers: {
			returnJsonArray: (items) => items.map((json) => ({ json })),
			httpRequestWithAuthentication: request,
		},
	};
	return { ctx, replies };
}

test('legacy full-secret signatures preserve exact-byte verification', () => {
	const rawBody = Buffer.from('{"a": 1}\n');
	const secret = `whsec_${Buffer.from('legacy-key').toString('base64')}`;
	const timestamp = 1700000000;
	const signature = createHmac('sha256', secret)
		.update(Buffer.concat([Buffer.from(`id.${timestamp}.`), rawBody]))
		.digest('base64');
	const input = {
		secret,
		rawBody,
		webhookId: 'id',
		webhookTimestamp: String(timestamp),
		nowSeconds: timestamp,
		signatureHeader: `v1,${signature}`,
	};
	assert.equal(verifyParallelWebhook(input).valid, true);
	assert.equal(verifyParallelWebhook({ ...input, rawBody: Buffer.from('{"a":1}') }).valid, false);
});

test('saved omitted Search mode retains the basic tier', () => {
	const values = NodeHelpers.getNodeParameters(
		new Parallel().description.properties,
		{ resource: 'task', operation: 'webSearch' },
		true,
		false,
		{ typeVersion: 1 },
	);
	assert.equal(values.searchProcessor, 'basic');
});

test('legacy Monitor lookback is retained by parameter loading and fails explicitly', () => {
	const values = NodeHelpers.getNodeParameters(
		new Parallel().description.properties,
		{
			resource: 'monitor',
			monitorOperation: 'listMonitorEvents',
			monitorEventsAdditionalFields: { lookbackPeriod: '7d' },
		},
		true,
		false,
		{ typeVersion: 1 },
	);
	assert.equal(values.monitorEventsAdditionalFields.lookbackPeriod, '7d');
	assert.throws(
		() => buildMonitorEventsQuery(values.monitorEventsAdditionalFields),
		/lookbackPeriod.*pagination/i,
	);
	assert.deepEqual(buildMonitorEventsQuery({ cursor: 'next', limit: 20 }), {
		cursor: 'next',
		limit: 20,
	});
});

test('valid filtered Task and Monitor events are acknowledged without workflow execution', async () => {
	for (const [Node, payload] of [
		[ParallelTrigger, { type: 'task_run.status', data: { run_id: 'r1', status: 'failed' } }],
		[ParallelMonitorTrigger, { type: 'monitor.execution.completed', data: { monitor_id: 'm1' } }],
	]) {
		const { ctx, replies } = context(payload);
		const result = await Node.prototype.webhook.call(ctx);
		assert.equal(result.workflowData, undefined);
		assert.deepEqual(replies, [200, { received: true }]);
	}
});

test('malformed matching events return HTTP 400 without workflow execution', async () => {
	for (const [Node, type] of [
		[ParallelTrigger, 'task_run.status'],
		[ParallelMonitorTrigger, 'monitor.event.detected'],
	]) {
		const { ctx, replies } = context({ type, data: {} });
		const result = await Node.prototype.webhook.call(ctx);
		assert.equal(result.workflowData, undefined);
		assert.equal(replies[0], 400);
	}
});

test('Monitor keeps published top-level fields on no-fetch, success and failure paths', async () => {
	const payload = {
		type: 'monitor.event.detected',
		data: { monitor_id: 'm1', event: { event_group_id: 'eg1' } },
	};
	for (const fetch of [false, true]) {
		const { ctx } = context(payload, { fetchEventGroup: fetch }, async (_credential, options) => {
			assert.equal(options.timeout, 5000);
			return { events: [{ event_id: 'e1' }] };
		});
		const result = await ParallelMonitorTrigger.prototype.webhook.call(ctx);
		assert.equal(result.workflowData[0][0].json.event_group_id, 'eg1');
		assert.equal(result.workflowData[0][0].json.webhook_id, 'delivery_1');
	}
	const { ctx } = context(payload, {}, async () => {
		throw { statusCode: 503, message: 'temporary failure' };
	});
	const result = await ParallelMonitorTrigger.prototype.webhook.call(ctx);
	assert.equal(result.workflowData[0][0].json.event_group_id, 'eg1');
	assert.match(result.workflowData[0][0].json.event_group_error, /Parallel API/);
});

test('Monitor retry mode and Task enrichment failures send 503 without output', async () => {
	for (const [Node, payload] of [
		[ParallelTrigger, { type: 'task_run.status', data: { run_id: 'r1', status: 'completed' } }],
		[
			ParallelMonitorTrigger,
			{
				type: 'monitor.event.detected',
				data: { monitor_id: 'm1', event: { event_group_id: 'eg1' } },
			},
		],
	]) {
		const { ctx, replies } = context(payload, { retryOnFetchFailure: true }, async () => {
			throw { statusCode: 503 };
		});
		const result = await Node.prototype.webhook.call(ctx);
		assert.equal(result.workflowData, undefined);
		assert.equal(replies[0], 503);
	}
});

test('Task polling caps each request and backoff and preserves the run ID on expiry', async () => {
	const { waitForTaskResult } = require('../dist/nodes/Parallel/transport/waitForTaskResult');
	let now = 0;
	let calls = 0;
	const ctx = {
		getNode: () => ({ name: 'Task', typeVersion: 1, parameters: {} }),
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				calls++;
				assert.ok(options.timeout <= 60000 - now);
				assert.ok(options.qs.timeout * 1000 <= 60000 - now);
				now += options.timeout;
				throw { statusCode: 408, message: 'pending' };
			},
		},
	};
	await assert.rejects(
		waitForTaskResult(ctx, 'existing/run', 1, 0, {
			now: () => now,
			sleep: async (ms) => {
				assert.ok(ms <= 60000 - now);
				now += ms;
			},
		}),
		/existing\/run.*Get Task Run Result/,
	);
	assert.equal(calls, 1);
	assert.equal(now, 60000);
});

test('Task polling returns successful results and never recreates a task', async () => {
	const { waitForTaskResult } = require('../dist/nodes/Parallel/transport/waitForTaskResult');
	let now = 0;
	let calls = 0;
	const ctx = {
		getNode: () => ({ name: 'Task', typeVersion: 1, parameters: {} }),
		helpers: {
			httpRequestWithAuthentication: async (_credential, options) => {
				assert.equal(options.method, 'GET');
				assert.match(options.url, /existing%2Frun\/result$/);
				if (++calls === 1) {
					now += 1000;
					throw { statusCode: 408 };
				}
				return { output: 'complete' };
			},
		},
	};
	assert.deepEqual(
		await waitForTaskResult(ctx, 'existing/run', 1, 0, {
			now: () => now,
			sleep: async (ms) => {
				now += ms;
			},
		}),
		{ output: 'complete' },
	);
	assert.equal(calls, 2);
});
