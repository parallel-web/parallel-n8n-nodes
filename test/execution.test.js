const assert = require('node:assert/strict');
const test = require('node:test');

const { operations } = require('../dist/nodes/Parallel/actions/index.js');
const { Parallel } = require('../dist/nodes/Parallel/Parallel.node.js');

test('multi-item execution preserves n8n pairing', async () => {
	const original = operations.getTaskRun.execute;
	operations.getTaskRun.execute = async (_context, index) => ({ index });
	try {
		const context = {
			getInputData: () => [{ json: { input: 1 } }, { json: { input: 2 } }],
			getNodeParameter: (name) => {
				if (name === 'resource') return 'task';
				if (name === 'operation') return 'getTaskRun';
				throw new Error(`Unexpected parameter ${name}`);
			},
			continueOnFail: () => false,
			getNode: () => ({ name: 'Parallel', type: 'parallel', typeVersion: 1, position: [0, 0] }),
		};
		assert.deepEqual(await Parallel.prototype.execute.call(context), [
			[
				{ json: { index: 0 }, pairedItem: { item: 0 } },
				{ json: { index: 1 }, pairedItem: { item: 1 } },
			],
		]);
	} finally {
		operations.getTaskRun.execute = original;
	}
});
