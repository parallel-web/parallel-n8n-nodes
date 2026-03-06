import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'List Monitors',
	value: 'listMonitors',
	description: 'List all monitors with optional pagination.',
	action: 'List monitors',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const additionalFields = executeFunctions.getNodeParameter('listMonitorsAdditionalFields', itemIndex, {}) as IDataObject;

	let endpoint = '/v1alpha/monitors';
	const queryParams: string[] = [];

	if (additionalFields.limit) {
		queryParams.push(`limit=${additionalFields.limit}`);
	}
	if (additionalFields.cursorMonitorId) {
		queryParams.push(`monitor_id=${additionalFields.cursorMonitorId}`);
	}

	if (queryParams.length > 0) {
		endpoint += `?${queryParams.join('&')}`;
	}

	const result = await parallelApiRequest(executeFunctions, 'GET', endpoint);

	// The API returns an array directly; wrap it for consistent n8n output
	if (Array.isArray(result)) {
		return { monitors: result } as IDataObject;
	}
	return result;
}
