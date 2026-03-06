import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';
import { buildMetadata } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Create Monitor',
	value: 'createMonitor',
	description: 'Create a new web monitor that continuously tracks the web for changes on a schedule.',
	action: 'Create a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const query = executeFunctions.getNodeParameter('monitorQuery', itemIndex) as string;
	const cadence = executeFunctions.getNodeParameter('monitorCadence', itemIndex) as string;

	const body: IDataObject = {
		query,
		cadence,
	};

	// Webhook URL
	const webhookUrl = executeFunctions.getNodeParameter('monitorWebhookUrl', itemIndex, '') as string;
	if (webhookUrl) {
		const eventTypes = executeFunctions.getNodeParameter('monitorWebhookEventTypes', itemIndex, []) as string[];
		body.webhook = {
			url: webhookUrl,
			event_types: eventTypes.length > 0 ? eventTypes : ['monitor.event.detected'],
		};
	}

	// Output schema
	const outputSchemaType = executeFunctions.getNodeParameter('monitorOutputSchemaType', itemIndex, 'text') as string;
	if (outputSchemaType === 'json') {
		const jsonSchemaStr = executeFunctions.getNodeParameter('monitorOutputJsonSchema', itemIndex) as string;
		const jsonSchema = typeof jsonSchemaStr === 'string' ? JSON.parse(jsonSchemaStr) : jsonSchemaStr;
		body.output_schema = {
			type: 'json',
			json_schema: jsonSchema,
		};
	}

	// Metadata
	const additionalFields = executeFunctions.getNodeParameter('monitorAdditionalFields', itemIndex, {}) as IDataObject;
	const metadata = buildMetadata(additionalFields);
	if (metadata) {
		body.metadata = metadata;
	}

	return await parallelApiRequest(executeFunctions, 'POST', '/v1alpha/monitors', body);
}
