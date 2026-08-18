const assert = require('node:assert/strict');
const test = require('node:test');

const {
	assertTaskOutputSchemaCompatibility,
	buildMonitorCreateRequest,
	buildMonitorEventsQuery,
	buildMonitorUpdateRequest,
	buildSearchRequest,
} = require('../dist/nodes/Parallel/contracts/requests.js');

test('Auto Task output is limited to supported processors', () => {
	assert.doesNotThrow(() => assertTaskOutputSchemaCompatibility('pro-fast', 'auto'));
	assert.throws(
		() => assertTaskOutputSchemaCompatibility('core', 'auto'),
		/Pro or Ultra processor/,
	);
});

test('Search V1 builder maps legacy values and nests advanced settings', () => {
	assert.deepEqual(
		buildSearchRequest({
			objective: 'Parallel updates',
			mode: 'base',
			searchQueries: '',
			maxCharsTotal: 50000,
			maxCharsPerResult: 2000,
			maxResults: 8,
			includeDomains: 'parallel.ai, docs.parallel.ai',
		}),
		{
			objective: 'Parallel updates',
			search_queries: ['Parallel updates'],
			mode: 'basic',
			max_chars_total: 50000,
			advanced_settings: {
				source_policy: { include_domains: ['parallel.ai', 'docs.parallel.ai'] },
				excerpt_settings: { max_chars_per_result: 2000 },
				max_results: 8,
			},
		},
	);
	assert.equal(buildSearchRequest({ mode: 'pro', searchQueries: 'one' }).mode, 'advanced');
});

test('Search V1 builder requires a query', () => {
	assert.throws(() => buildSearchRequest({ mode: 'advanced' }), /search query or objective/);
});

test('Monitor V1 builder supports event streams, snapshots, and legacy cadences', () => {
	assert.deepEqual(
		buildMonitorCreateRequest({
			type: 'event_stream',
			frequency: 'daily',
			processor: 'lite',
			query: 'funding announcements',
			includeBackfill: true,
			webhookUrl: 'https://example.test/hook',
			webhookEventTypes: ['monitor.event.detected'],
		}),
		{
			type: 'event_stream',
			frequency: '1d',
			processor: 'lite',
			settings: { query: 'funding announcements', include_backfill: true },
			webhook: {
				url: 'https://example.test/hook',
				event_types: ['monitor.event.detected'],
			},
		},
	);
	assert.deepEqual(
		buildMonitorCreateRequest({
			type: 'snapshot',
			frequency: 'weekly',
			taskRunId: 'trun_123',
		}),
		{
			type: 'snapshot',
			frequency: '1w',
			settings: { task_run_id: 'trun_123' },
		},
	);
});

test('Monitor update can explicitly clear nullable fields', () => {
	assert.deepEqual(buildMonitorUpdateRequest({ clearWebhook: true, clearMetadata: true }), {
		webhook: null,
		metadata: null,
	});
	assert.throws(() => buildMonitorUpdateRequest({}), /at least one monitor field/);
});

test('Monitor event query uses GA cursor fields', () => {
	assert.deepEqual(
		buildMonitorEventsQuery({
			eventGroupId: 'group/one',
			cursor: 'next cursor',
			limit: 25,
			includeCompletions: true,
		}),
		{
			event_group_id: 'group/one',
			cursor: 'next cursor',
			limit: 25,
			include_completions: true,
		},
	);
});
