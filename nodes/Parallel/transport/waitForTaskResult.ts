import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { calculateBackoffDelay, isRetryableError, wait } from '../utils';
import { getErrorStatusCode, parallelApiRequest } from './ParallelApi';

// Keep the remote long-poll timeout and the local HTTP timeout inside one budget.
export async function waitForTaskResult(
	context: IExecuteFunctions,
	runId: string,
	minutes: number,
	itemIndex: number,
	timing = { now: Date.now, sleep: wait },
): Promise<IDataObject> {
	const deadline = timing.now() + minutes * 60_000;
	let attempt = 0;
	while (timing.now() < deadline) {
		const remaining = deadline - timing.now();
		const timeout = Math.min(240, Math.floor(remaining / 1000));
		if (timeout < 1) break;
		try {
			return await parallelApiRequest(
				context,
				'GET',
				`/v1/tasks/runs/${encodeURIComponent(runId)}/result`,
				undefined,
				{ timeout },
				Math.min(remaining, (timeout + 1) * 1000),
			);
		} catch (error) {
			if (!isRetryableError(getErrorStatusCode(error))) {
				throw new NodeOperationError(
					context.getNode(),
					`Could not retrieve Task ${runId}. Retrieve this existing run with Get Task Run Result; do not resubmit. ${error instanceof Error ? error.message : String(error)}`,
					{ itemIndex },
				);
			}
			const delay = Math.min(
				calculateBackoffDelay(++attempt),
				Math.max(0, deadline - timing.now()),
			);
			if (delay > 0) await timing.sleep(delay);
		}
	}
	throw new NodeOperationError(
		context.getNode(),
		`Timed out waiting for Task ${runId}. The Task is still remote and has not been cancelled. Use Get Task Run Result to retrieve this run or use Async for future long tasks; do not resubmit.`,
		{ itemIndex },
	);
}
