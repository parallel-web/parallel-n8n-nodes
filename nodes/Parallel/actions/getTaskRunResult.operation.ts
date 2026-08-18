import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Get Task Run Result',
	value: 'getTaskRunResult',
	description: 'Retrieve the result of a completed Task Run',
	action: 'Get a task run result',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const runId = executeFunctions.getNodeParameter('taskRunId', itemIndex) as string;
	return await parallelApiRequest(
		executeFunctions,
		'GET',
		`/v1/tasks/runs/${encodeURIComponent(runId)}/result`,
	);
}
