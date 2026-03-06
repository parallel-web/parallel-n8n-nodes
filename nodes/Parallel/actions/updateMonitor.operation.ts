import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';
import { buildMetadata } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Update Monitor',
	value: 'updateMonitor',
	description: 'Update an existing monitor\'s query, cadence, webhook, or metadata.',
	action: 'Update a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	const updateFields = executeFunctions.getNodeParameter('monitorUpdateFields', itemIndex, {}) as IDataObject;

	const body: IDataObject = {};

	if (updateFields.query) {
		body.query = updateFields.query;
	}
	if (updateFields.cadence) {
		body.cadence = updateFields.cadence;
	}
	if (updateFields.webhookUrl) {
		const eventTypes = (updateFields.webhookEventTypes as string[]) || ['monitor.event.detected'];
		body.webhook = {
			url: updateFields.webhookUrl,
			event_types: eventTypes,
		};
	}

	const metadata = buildMetadata(updateFields);
	if (metadata) {
		body.metadata = metadata;
	}

	return await parallelApiRequest(executeFunctions, 'POST', `/v1alpha/monitors/${monitorId}`, body);
}
