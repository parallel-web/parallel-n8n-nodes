import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildMonitorCreateRequest, type MonitorType } from '../contracts/requests';
import { parallelApiRequest } from '../transport/ParallelApi';
import { buildMetadata } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Create Monitor',
	value: 'createMonitor',
	description:
		'Create a new web monitor that continuously tracks the web for changes on a schedule',
	action: 'Create a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const query = executeFunctions.getNodeParameter('monitorQuery', itemIndex) as string;
	const cadence = executeFunctions.getNodeParameter('monitorCadence', itemIndex) as string;
	const type = executeFunctions.getNodeParameter(
		'monitorType',
		itemIndex,
		'event_stream',
	) as MonitorType;
	const taskRunId = executeFunctions.getNodeParameter('monitorTaskRunId', itemIndex, '') as string;
	const processor = executeFunctions.getNodeParameter(
		'monitorProcessor',
		itemIndex,
		'lite',
	) as string;

	// Webhook URL
	const webhookUrl = executeFunctions.getNodeParameter(
		'monitorWebhookUrl',
		itemIndex,
		'',
	) as string;
	const eventTypes = webhookUrl
		? (executeFunctions.getNodeParameter('monitorWebhookEventTypes', itemIndex, []) as string[])
		: undefined;

	// Output schema
	const outputSchemaType = executeFunctions.getNodeParameter(
		'monitorOutputSchemaType',
		itemIndex,
		'text',
	) as string;
	let outputSchema: IDataObject | undefined;
	if (type === 'event_stream' && outputSchemaType === 'json') {
		const jsonSchemaStr = executeFunctions.getNodeParameter(
			'monitorOutputJsonSchema',
			itemIndex,
		) as string;
		let jsonSchema: IDataObject;
		try {
			jsonSchema = typeof jsonSchemaStr === 'string' ? JSON.parse(jsonSchemaStr) : jsonSchemaStr;
		} catch {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				'Invalid JSON schema for monitor output. Please provide valid JSON.',
				{ itemIndex },
			);
		}
		outputSchema = {
			type: 'json',
			json_schema: jsonSchema,
		};
	}

	// Metadata
	const additionalFields = executeFunctions.getNodeParameter(
		'monitorAdditionalFields',
		itemIndex,
		{},
	) as IDataObject;
	const metadata = buildMetadata(additionalFields);
	let body: IDataObject;
	try {
		body = buildMonitorCreateRequest({
			type,
			frequency: cadence,
			processor,
			query,
			taskRunId,
			outputSchema,
			includeBackfill: additionalFields.includeBackfill as boolean | undefined,
			webhookUrl,
			webhookEventTypes: eventTypes,
			metadata: metadata ?? undefined,
		});
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			error instanceof Error ? error : String(error),
			{ itemIndex },
		);
	}
	return await parallelApiRequest(executeFunctions, 'POST', '/v1/monitors', body);
}
