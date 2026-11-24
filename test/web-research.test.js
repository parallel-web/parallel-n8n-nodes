const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeHelpers, NodeOperationError } = require('n8n-workflow');
const { version } = require('../package.json');
const { Parallel } = require('../dist/nodes/Parallel/Parallel.node');

const schema = {
	type: 'object',
	properties: { answer: { type: 'string' } },
	required: ['answer'],
	additionalProperties: false,
};
const citation = {
	url: 'https://example.com/fusion',
	title: 'Fusion',
	excerpts: ['Fusion excerpt.'],
};
const basis = [{ field: 'output', citations: [citation], reasoning: null, confidence: null }];

function researchResponse(text, responseBasis = basis) {
	return {
		id: 'research_example',
		object: 'response',
		created_at: 1700000000,
		model: 'parallel',
		status: 'completed',
		output: [
			{
				type: 'web_search_call',
				id: 'ws_example',
				status: 'completed',
				action: { type: 'search', query: 'fusion', queries: ['fusion'] },
			},
			{
				type: 'message',
				id: 'msg_example',
				role: 'assistant',
				status: 'completed',
				content: [
					{
						type: 'output_text',
						text,
						annotations: [
							{
								type: 'url_citation',
								url: citation.url,
								title: citation.title,
								start_index: 0,
								end_index: text.length,
							},
						],
					},
				],
			},
		],
		basis: responseBasis,
		incomplete_details: null,
		error: null,
		usage: null,
	};
}

function executeWebChat(savedItems, request, continueOnFail = false) {
	const node = new Parallel();
	const parameters = savedItems.map((saved) =>
		NodeHelpers.getNodeParameters(
			node.description.properties,
			{ operation: 'webChat', ...saved },
			true,
			false,
			{ typeVersion: 1 },
		),
	);
	return node.execute.call({
		getNode: () => ({ name: 'Parallel', typeVersion: 1, parameters: parameters[0] }),
		getInputData: () => savedItems.map(() => ({ json: {} })),
		getNodeParameter: (key, itemIndex, fallback) => parameters[itemIndex][key] ?? fallback,
		continueOnFail: () => continueOnFail,
		helpers: { httpRequestWithAuthentication: request },
	});
}

test('saved Web Chat settings route text and JSON to Research with the existing credential', async () => {
	const calls = [];
	const structuredBasis = [{ ...basis[0], field: 'answer' }];
	const savedItems = [
		{ chatInputPrompt: 'Explain fusion.' },
		{
			chatInputPrompt: 'Define fusion.',
			chatModel: 'base',
			chatResponseFormat: 'json',
			chatJsonSchemaName: 'answer',
			chatJsonSchema: JSON.stringify(schema),
			chatAdditionalOptions: { systemPrompt: 'Use one sentence.' },
		},
	];
	const [result] = await executeWebChat(savedItems, async (credential, options) => {
		assert.equal(credential, 'parallelApi');
		assert.equal(options.url, 'https://api.parallel.ai/v1/research');
		assert.equal(options.method, 'POST');
		assert.equal(options.headers['User-Agent'], `parallel-n8n-node/${version}`);
		calls.push(options.body);
		return calls.length === 1
			? researchResponse('Fusion combines nuclei.')
			: researchResponse('{"answer":"Nuclei combine."}', structuredBasis);
	});
	assert.deepEqual(calls, [
		{
			model: 'parallel',
			input: 'Explain fusion.',
			reasoning: { effort: 'low' },
			background: false,
			stream: false,
		},
		{
			model: 'parallel',
			input: 'Define fusion.',
			reasoning: { effort: 'medium' },
			background: false,
			stream: false,
			instructions: 'Use one sentence.',
			text: { format: { type: 'json_schema', name: 'answer', schema } },
		},
	]);
	assert.deepEqual(result[0], {
		json: {
			id: 'research_example',
			interaction_id: 'research_example',
			object: 'chat.completion',
			created: 1700000000,
			model: 'speed',
			choices: [
				{
					index: 0,
					finish_reason: 'stop',
					message: { role: 'assistant', content: 'Fusion combines nuclei.' },
				},
			],
			basis,
		},
		pairedItem: { item: 0 },
	});
	assert.equal(result[1].json.model, 'base');
	assert.deepEqual(JSON.parse(result[1].json.choices[0].message.content), {
		answer: 'Nuclei combine.',
	});
	assert.deepEqual(result[1].json.basis, structuredBasis);
	assert.deepEqual(result[1].pairedItem, { item: 1 });
});

test('all explicit saved model selections resolve to interactive Research efforts', async () => {
	const efforts = [];
	await executeWebChat(
		['speed', 'lite', 'base', 'core'].map((chatModel) => ({ chatModel })),
		async (_credential, { body }) => {
			efforts.push(body.reasoning.effort);
			return researchResponse('An answer');
		},
	);
	assert.deepEqual(efforts, ['low', 'low', 'medium', 'high']);
});

test('a saved system prompt can carry the question when the input expression is empty', async () => {
	const instructions = 'Explain fusion in one sentence.';
	const [result] = await executeWebChat(
		[{ chatInputPrompt: '', chatAdditionalOptions: { systemPrompt: instructions } }],
		async (_credential, { body }) => {
			assert.deepEqual(body.input, [{ role: 'user', content: '' }]);
			assert.equal(body.instructions, instructions);
			return researchResponse('Fusion combines nuclei.');
		},
	);
	assert.equal(result[0].json.choices[0].message.content, 'Fusion combines nuclei.');
});

function savedJsonOutput(schema) {
	return {
		chatInputPrompt: 'Find examples.',
		chatResponseFormat: 'json',
		chatJsonSchemaName: 'examples',
		chatJsonSchema: JSON.stringify(schema),
	};
}

test('a saved array schema still produces an array JSON string and usable basis paths', async () => {
	const arraySchema = { type: 'array', items: { type: 'string' }, minItems: 2 };
	const [result] = await executeWebChat([savedJsonOutput(arraySchema)], async (_, { body }) => {
		assert.deepEqual(body.text.format.schema, {
			type: 'object',
			properties: { value: arraySchema },
			required: ['value'],
			additionalProperties: false,
		});
		return researchResponse('{"value":["first","second"]}', [
			{ ...basis[0], field: 'value' },
			{ ...basis[0], field: 'value.1' },
		]);
	});
	const output = result[0].json;
	assert.equal(output.choices[0].message.content, '["first","second"]');
	assert.equal(JSON.parse(output.choices[0].message.content)[1], 'second');
	assert.deepEqual(output.basis, [basis[0], { ...basis[0], field: '1' }]);
});

test('wrapped schemas keep nested pointer targets and preserve JSON tokens on return', async () => {
	const arraySchema = {
		type: 'array',
		$defs: {
			'number/id~': { type: 'integer', minimum: 1 },
		},
		items: {
			type: 'object',
			properties: {
				values: { type: 'array', items: { $ref: '#/$defs/number~1id~0' } },
				copy: { $ref: '#/items/properties/values' },
				$ref: { type: 'string', default: '#/literal' },
			},
			required: ['values', 'copy'],
		},
	};
	const answer = '[{"values":[9007199254740993],"copy":[2],"$ref":"} literal"}]';
	const [result] = await executeWebChat([savedJsonOutput(arraySchema)], async (_, { body }) => {
		const schema = body.text.format.schema;
		assert.equal(schema.properties.value.type, 'array');
		assert.deepEqual(schema.properties.value.items.properties, {
			values: { type: 'array', items: { $ref: '#/$defs/saved0' } },
			copy: { $ref: '#/$defs/saved1' },
			$ref: { type: 'string', default: '#/literal' },
		});
		assert.deepEqual(schema.$defs, {
			saved0: { type: 'integer', minimum: 1 },
			saved1: { type: 'array', items: { $ref: '#/$defs/saved0' } },
		});
		return researchResponse(`{"value": ${answer} }`, [{ ...basis[0], field: 'value.0' }]);
	});
	assert.equal(result[0].json.choices[0].message.content, answer);
	assert.deepEqual(result[0].json.basis, [{ ...basis[0], field: '0' }]);
});

test('wrapping keeps references to the document, named anchors, and nested schema resources distinct', async () => {
	const plan = {
		$id: 'https://example.com/plan',
		type: 'array',
		$defs: { key: { $anchor: 'outer', type: 'string', minLength: 2 } },
		items: {
			$id: 'item',
			type: 'object',
			$defs: { key: { type: 'string', minLength: 4 } },
			properties: {
				inner: { $ref: '#/$defs/key' },
				outer: { $ref: 'https://example.com/plan#outer' },
			},
		},
	};
	await executeWebChat([savedJsonOutput(plan)], async (_, { body }) => {
		const schema = body.text.format.schema;
		const root = schema.properties.value;
		assert.equal(root.$id, undefined);
		assert.equal(root.items.$id, undefined);
		assert.deepEqual(root.items.properties, {
			inner: { $ref: '#/$defs/saved0' },
			outer: { $ref: '#/$defs/saved1' },
		});
		assert.equal(schema.$defs.saved0.minLength, 4);
		assert.equal(schema.$defs.saved1.minLength, 2);
		return researchResponse('{"value":[{"inner":"long","outer":"ok"}]}');
	});
});

test('valid Research object schemas and their value field are passed through', async () => {
	const objectSchema = {
		type: 'object',
		properties: { value: { $ref: '#/$defs/item' } },
		$defs: { item: { type: 'string' } },
	};
	const content = '{"value":"original object"}';
	const objectBasis = [{ ...basis[0], field: 'value' }];
	const [result] = await executeWebChat([savedJsonOutput(objectSchema)], async (_, { body }) => {
		assert.deepEqual(body.text.format.schema, objectSchema);
		return researchResponse(content, objectBasis);
	});
	assert.equal(result[0].json.choices[0].message.content, content);
	assert.deepEqual(result[0].json.basis, objectBasis);
});

test('a top-level JSON union is unwrapped and invalid envelopes fail explicitly', async () => {
	const union = { anyOf: [{ type: 'string' }, { type: 'null' }] };
	const [result] = await executeWebChat([savedJsonOutput(union)], async (_, { body }) => {
		assert.deepEqual(body.text.format.schema.properties.value, union);
		return researchResponse('{"value":null}');
	});
	assert.equal(result[0].json.choices[0].message.content, 'null');
	for (const text of ['[]', '{"other":true}', '{"value":true,"value":false}', '{']) {
		await assert.rejects(
			executeWebChat([savedJsonOutput(union)], async () => researchResponse(text)),
			/Research returned an invalid structured answer.*research_example/,
		);
	}
});

test('invalid saved inputs report useful errors before sending a request', async () => {
	const noRequest = async () => assert.fail('Unexpected HTTP request');
	for (const [saved, message] of [
		[{ chatInputPrompt: '\n ' }, /Input Prompt is required/],
		[{ chatModel: 'toString' }, /Select a Research Effort/],
		[{ chatResponseFormat: 'json', chatJsonSchemaName: ' ' }, /JSON Schema Name is required/],
		[{ chatResponseFormat: 'json', chatJsonSchema: '{' }, /Invalid JSON in schema/],
		[{ chatResponseFormat: 'json', chatJsonSchema: 'null' }, /JSON Schema must be a JSON object/],
	]) {
		await assert.rejects(executeWebChat([saved], noRequest), message);
	}
});

test('Research lifecycle statuses and HTTP errors never emit a partial success', async () => {
	const partial = researchResponse('Partial answer');
	for (const [response, message] of [
		[
			{ ...partial, status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } },
			/incomplete answer.*research_example.*max_output_tokens/,
		],
		[
			{
				...partial,
				status: 'failed',
				error: { code: 'server_error', message: 'Research timed out' },
			},
			/failed.*research_example.*server_error.*Research timed out/,
		],
		[{ ...partial, status: 'cancelled' }, /did not complete.*cancelled/],
		[{ ...partial, status: 'queued' }, /did not complete.*queued/],
		[{ ...partial, status: 'in_progress' }, /did not complete.*in_progress/],
		[researchResponse(' '), /returned no answer text/],
		[{}, /missing status/],
	]) {
		await assert.rejects(
			executeWebChat([{}], async () => response),
			(error) => {
				assert.ok(error instanceof NodeOperationError);
				assert.match(error.message, message);
				assert.equal(error.context.itemIndex, 0);
				return true;
			},
		);
	}
	const [items] = await executeWebChat(
		[{}, {}],
		async () => {
			throw { httpCode: '401', response: { data: { error: { message: 'Invalid API key' } } } };
		},
		true,
	);
	assert.match(items[1].json.error, /HTTP 401.*Invalid API key.*Parallel credential/);
	assert.deepEqual(items[1].pairedItem, { item: 1 });
});
