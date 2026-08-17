import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'List Monitors',
	value: 'listMonitors',
	description: 'List all monitors with optional pagination',
	action: 'List monitors',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const additionalFields = executeFunctions.getNodeParameter(
		'listMonitorsAdditionalFields',
		itemIndex,
		{},
	) as IDataObject;

	const query: IDataObject = {};
	if (additionalFields.limit) query.limit = additionalFields.limit;
	if (additionalFields.cursorMonitorId) query.cursor = additionalFields.cursorMonitorId;
	return await parallelApiRequest(executeFunctions, 'GET', '/v1/monitors', undefined, query);
}
