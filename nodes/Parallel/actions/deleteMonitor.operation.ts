import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Delete Monitor',
	value: 'deleteMonitor',
	description: 'Delete a monitor and stop all future executions.',
	action: 'Delete a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	return await parallelApiRequest(executeFunctions, 'DELETE', `/v1alpha/monitors/${monitorId}`);
}
