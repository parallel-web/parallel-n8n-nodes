import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { encodePathSegment } from '../Parallel/contracts/requests';
import { parallelApiRequestForWebhook } from '../Parallel/transport/ParallelApi';
import { verifyParallelWebhook } from '../Parallel/webhooks/verify';

async function validateWebhook(context: IWebhookFunctions): Promise<void> {
	if (!(context.getNodeParameter('validateSignatures') as boolean)) return;
	const credentials = await context.getCredentials('parallelApi');
	const secret = credentials.webhookSecret as string;
	if (!secret) {
		throw new NodeApiError(
			context.getNode(),
			{},
			{
				message: 'Webhook signature validation requires a webhook secret',
			},
		);
	}
	const headers = context.getHeaderData();
	const webhookId = headers['webhook-id'] as string | undefined;
	const webhookTimestamp = headers['webhook-timestamp'] as string | undefined;
	const signatureHeader = headers['webhook-signature'] as string | undefined;
	if (!webhookId || !webhookTimestamp || !signatureHeader) {
		throw new NodeApiError(context.getNode(), {}, { message: 'Missing Parallel webhook headers' });
	}
	const rawBody = context.getRequestObject().rawBody;
	if (!Buffer.isBuffer(rawBody)) {
		throw new NodeApiError(
			context.getNode(),
			{},
			{
				message: 'Raw webhook body is unavailable; signature verification cannot proceed safely',
			},
		);
	}
	const verification = verifyParallelWebhook({
		secret,
		webhookId,
		webhookTimestamp,
		rawBody,
		signatureHeader,
	});
	if (!verification.valid) {
		throw new NodeApiError(
			context.getNode(),
			{},
			{
				message: `Invalid Parallel webhook signature (${verification.reason})`,
			},
		);
	}
}

export class ParallelMonitorTrigger implements INodeType {
	// Parallel receives this URL in the Monitor create/update request; activation has no remote registration.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Parallel Monitor Event Trigger',
		name: 'parallelMonitorTrigger',
		icon: { light: 'file:../parallel.svg', dark: 'file:../Parallel/parallel.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["eventTypeFilter"].join(", ")}}',
		description: 'Triggers when a Parallel Monitor emits a selected event',
		defaults: { name: 'Parallel Monitor Event' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'parallelApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'parallel-monitor-event',
			},
		],
		properties: [
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'notice',
				default: '',
				description: 'Use this n8n webhook URL when creating or updating the Parallel Monitor',
			},
			{
				displayName: 'Event Types',
				name: 'eventTypeFilter',
				type: 'multiOptions',
				options: [
					{ name: 'Event Detected', value: 'monitor.event.detected' },
					{ name: 'Execution Completed', value: 'monitor.execution.completed' },
					{ name: 'Execution Failed', value: 'monitor.execution.failed' },
				],
				default: ['monitor.event.detected'],
				description: 'Event types that should start the workflow',
			},
			{
				displayName: 'Fetch Full Event Group',
				name: 'fetchEventGroup',
				type: 'boolean',
				default: true,
				description: 'Whether to fetch all events from the detected execution',
			},
			{
				displayName: 'Include Webhook Data',
				name: 'includeWebhookData',
				type: 'boolean',
				default: false,
				description: 'Whether to include the complete webhook payload in the output',
			},
			{
				displayName: 'Validate Webhook Signatures',
				name: 'validateSignatures',
				type: 'boolean',
				default: true,
				description:
					'Whether to validate the exact request body using the configured webhook secret',
			},
		],
		usableAsTool: true,
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		await validateWebhook(this);
		const payload = this.getBodyData() as IDataObject;
		const eventType = String(payload.type ?? '');
		const filters = this.getNodeParameter('eventTypeFilter') as string[];
		if (!filters.includes(eventType)) return { noWebhookResponse: true };
		const data = payload.data as IDataObject | undefined;
		if (!data?.monitor_id) return { noWebhookResponse: true };

		const output: IDataObject = {
			event_type: eventType,
			monitor_id: String(data.monitor_id),
			timestamp: payload.timestamp,
			event: data.event ?? {},
			metadata: data.metadata ?? {},
		};
		const event = data.event as IDataObject | undefined;
		if (
			eventType === 'monitor.event.detected' &&
			(this.getNodeParameter('fetchEventGroup') as boolean) &&
			event?.event_group_id
		) {
			output.event_group_id = event.event_group_id;
			output.event_group = await parallelApiRequestForWebhook(
				this,
				'GET',
				`/v1/monitors/${encodePathSegment(String(data.monitor_id))}/events`,
				undefined,
				{ event_group_id: event.event_group_id },
			);
		}
		if (this.getNodeParameter('includeWebhookData') as boolean) output.webhook_data = payload;
		return { workflowData: [this.helpers.returnJsonArray([output])] };
	}
}
