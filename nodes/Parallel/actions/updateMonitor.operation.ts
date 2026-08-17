import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildMonitorUpdateRequest, encodePathSegment } from '../contracts/requests';
import { parallelApiRequest } from '../transport/ParallelApi';
import { buildMetadata } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Update Monitor',
	value: 'updateMonitor',
	description: "Update an existing monitor's query, cadence, webhook, or metadata",
	action: 'Update a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	const updateFields = executeFunctions.getNodeParameter(
		'monitorUpdateFields',
		itemIndex,
		{},
	) as IDataObject;

	const metadata = buildMetadata(updateFields);
	let body: IDataObject;
	try {
		body = buildMonitorUpdateRequest({
			query: updateFields.query as string | undefined,
			frequency: updateFields.cadence as string | undefined,
			webhookUrl: updateFields.webhookUrl as string | undefined,
			webhookEventTypes: updateFields.webhookEventTypes as string[] | undefined,
			metadata: metadata ?? undefined,
			clearWebhook: updateFields.clearWebhook as boolean | undefined,
			clearMetadata: updateFields.clearMetadata as boolean | undefined,
		});
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			error instanceof Error ? error : String(error),
			{ itemIndex },
		);
	}
	return await parallelApiRequest(
		executeFunctions,
		'POST',
		`/v1/monitors/${encodePathSegment(monitorId)}/update`,
		body,
	);
}
