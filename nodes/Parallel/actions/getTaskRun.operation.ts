import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { encodePathSegment } from '../contracts/requests';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Get Task Run',
	value: 'getTaskRun',
	description: 'Retrieve the current state of a Task Run',
	action: 'Get a task run',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const runId = executeFunctions.getNodeParameter('taskRunId', itemIndex) as string;
	return await parallelApiRequest(
		executeFunctions,
		'GET',
		`/v1/tasks/runs/${encodePathSegment(runId)}`,
	);
}
