import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'List Monitor Events',
	value: 'listMonitorEvents',
	description: 'List events detected by a monitor within a lookback period.',
	action: 'List monitor events',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	const additionalFields = executeFunctions.getNodeParameter('monitorEventsAdditionalFields', itemIndex, {}) as IDataObject;

	let endpoint = `/v1alpha/monitors/${monitorId}/events`;

	if (additionalFields.lookbackPeriod) {
		endpoint += `?lookback_period=${additionalFields.lookbackPeriod}`;
	}

	return await parallelApiRequest(executeFunctions, 'GET', endpoint);
}
