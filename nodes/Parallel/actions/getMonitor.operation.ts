import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Get Monitor',
	value: 'getMonitor',
	description: 'Retrieve details of a specific monitor by ID.',
	action: 'Get a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	return await parallelApiRequest(executeFunctions, 'GET', `/v1alpha/monitors/${monitorId}`);
}
