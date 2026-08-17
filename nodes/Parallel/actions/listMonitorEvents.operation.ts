import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';
import { buildMonitorEventsQuery, encodePathSegment } from '../contracts/requests';

export const description: INodePropertyOptions = {
	name: 'List Monitor Events',
	value: 'listMonitorEvents',
	description: 'List events detected by a monitor within a lookback period',
	action: 'List monitor events',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	const additionalFields = executeFunctions.getNodeParameter(
		'monitorEventsAdditionalFields',
		itemIndex,
		{},
	) as IDataObject;

	return await parallelApiRequest(
		executeFunctions,
		'GET',
		`/v1/monitors/${encodePathSegment(monitorId)}/events`,
		undefined,
		buildMonitorEventsQuery(additionalFields),
	);
}
