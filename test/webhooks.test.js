const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const test = require('node:test');

const {
	getParallelWebhookErrorMessage,
	verifyParallelWebhook,
} = require('../dist/nodes/Parallel/webhooks/verify.js');
const { ParallelTrigger } = require('../dist/nodes/ParallelTrigger/ParallelTrigger.node.js');

function signedFixture({ body, id = 'msg_123', timestamp = 1_700_000_000 }) {
	const secretBytes = Buffer.from('test webhook key');
	const secret = `whsec_${secretBytes.toString('base64')}`;
	const signature = createHmac('sha256', secretBytes)
		.update(Buffer.concat([Buffer.from(`${id}.${timestamp}.`), body]))
		.digest('base64');
	return { secret, id, timestamp, signature };
}

test('webhook verification accepts exact raw bytes and rotated signatures', () => {
	const rawBody = Buffer.from('{"value": 1}\n');
	const fixture = signedFixture({ body: rawBody });
	assert.deepEqual(
		verifyParallelWebhook({
			secret: fixture.secret,
			webhookId: fixture.id,
			webhookTimestamp: String(fixture.timestamp),
			rawBody,
			signatureHeader: `v1,bad v1,${fixture.signature}`,
			nowSeconds: fixture.timestamp,
		}),
		{ valid: true },
	);
});

test('webhook verification rejects modified, malformed, and stale requests', () => {
	const rawBody = Buffer.from('{"value":1}');
	const fixture = signedFixture({ body: rawBody });
	const common = {
		secret: fixture.secret,
		webhookId: fixture.id,
		webhookTimestamp: String(fixture.timestamp),
		signatureHeader: `v1,${fixture.signature}`,
	};
	assert.equal(
		verifyParallelWebhook({
			...common,
			rawBody: Buffer.from('{"value":2}'),
			nowSeconds: fixture.timestamp,
		}).valid,
		false,
	);
	assert.deepEqual(
		verifyParallelWebhook({ ...common, rawBody, nowSeconds: fixture.timestamp + 301 }),
		{ valid: false, reason: 'stale' },
	);
	assert.deepEqual(verifyParallelWebhook({ ...common, webhookTimestamp: 'nope', rawBody }), {
		valid: false,
		reason: 'invalid-timestamp',
	});
	assert.deepEqual(verifyParallelWebhook({ ...common, secret: 'whsec_!!!', rawBody }), {
		valid: false,
		reason: 'invalid-secret',
	});
});

test('webhook validation explains missing and invalid inputs', () => {
	const rawBody = Buffer.from('{"value":1}');
	const timestamp = String(Math.floor(Date.now() / 1000));
	const completeInput = {
		secret: `whsec_${Buffer.from('test webhook key').toString('base64')}`,
		webhookId: 'msg_123',
		webhookTimestamp: timestamp,
		signatureHeader: 'v1,not-a-valid-signature',
		rawBody,
	};

	assert.match(
		getParallelWebhookErrorMessage({ ...completeInput, secret: undefined }),
		/Add the secret from Parallel Platform Settings/,
	);
	assert.equal(
		getParallelWebhookErrorMessage({ ...completeInput, webhookId: undefined }),
		'Missing Parallel webhook headers',
	);
	assert.equal(
		getParallelWebhookErrorMessage({ ...completeInput, rawBody: {} }),
		'Raw webhook body is unavailable; signature verification cannot proceed safely',
	);
	assert.equal(
		getParallelWebhookErrorMessage(completeInput),
		'Invalid Parallel webhook signature (invalid-signature)',
	);
});

test('completed Task events encode the run ID in the result request path', async () => {
	let requestUrl;
	const context = {
		getBodyData: () => ({
			type: 'task_run.status',
			data: { run_id: 'trun/a b', status: 'completed' },
		}),
		getNodeParameter: (name) => {
			if (name === 'validateSignatures') return false;
			if (name === 'onlyCompleted') return true;
			if (name === 'includeWebhookData') return false;
			throw new Error(`Unexpected parameter ${name}`);
		},
		helpers: {
			returnJsonArray: (items) => items.map((json) => ({ json })),
			httpRequestWithAuthentication: async (_credential, options) => {
				requestUrl = options.url;
				return { result: 'complete' };
			},
		},
	};

	await ParallelTrigger.prototype.webhook.call(context);
	assert.equal(requestUrl, 'https://api.parallel.ai/v1/tasks/runs/trun%2Fa%20b/result');
});

test('failed Task events are emitted without fetching the result endpoint', async () => {
	let requestCount = 0;
	const context = {
		getBodyData: () => ({
			type: 'task_run.status',
			data: { run_id: 'trun_failed', status: 'failed', error: { message: 'boom' } },
		}),
		getNodeParameter: (name) => {
			if (name === 'validateSignatures') return false;
			if (name === 'onlyCompleted') return false;
			if (name === 'includeWebhookData') return true;
			throw new Error(`Unexpected parameter ${name}`);
		},
		helpers: {
			returnJsonArray: (items) => items.map((json) => ({ json })),
			httpRequestWithAuthentication: async () => {
				requestCount += 1;
			},
		},
	};
	const response = await ParallelTrigger.prototype.webhook.call(context);
	assert.equal(requestCount, 0);
	assert.equal(response.workflowData[0][0].json.status, 'failed');
	assert.equal(response.workflowData[0][0].json.event.error.message, 'boom');
});
