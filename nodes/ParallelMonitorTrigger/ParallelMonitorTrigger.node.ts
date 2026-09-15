import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { parallelApiRequestForWebhook } from '../Parallel/transport/ParallelApi';
import { respond, validateWebhook } from '../Parallel/webhooks/response';

export class ParallelMonitorTrigger implements INodeType {
	// Parallel receives this URL in the Monitor create/update request; activation does not register a remote webhook.
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
		description:
			'Triggers when a Parallel Monitor detects events, completes an execution, or encounters an error',
		defaults: {
			name: 'Parallel Monitor Event',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'parallelApi',
				required: true,
			},
		],
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
				description:
					'Use the webhook URL that n8n provides for this trigger node when creating or updating your Parallel monitor',
			},
			{
				displayName: 'Event Types',
				name: 'eventTypeFilter',
				type: 'multiOptions',
				options: [
					{
						name: 'Event Detected',
						value: 'monitor.event.detected',
						description: 'Fired when material events are detected by the monitor',
					},
					{
						name: 'Execution Completed',
						value: 'monitor.execution.completed',
						description: 'Fired when a monitor run completes successfully with no new events',
					},
					{
						name: 'Execution Failed',
						value: 'monitor.execution.failed',
						description: 'Fired when a monitor run fails with an error',
					},
				],
				default: ['monitor.event.detected'],
				description: 'Which event types to trigger on',
			},
			{
				displayName: 'Fetch Full Event Group',
				name: 'fetchEventGroup',
				type: 'boolean',
				default: true,
				description: 'Whether to fetch the full event group details when an event is detected',
			},
			{
				displayName: 'Retry on Fetch Failure',
				name: 'retryOnFetchFailure',
				type: 'boolean',
				default: false,
				description:
					'Whether to ask Parallel to retry instead of emitting event_group_error when fetching fails. Retries can deliver the same event more than once.',
			},
			{
				displayName: 'Validate Webhook Signatures',
				name: 'validateSignatures',
				type: 'boolean',
				default: true,
				description:
					'Whether to validate the exact request body using the configured webhook secret',
			},
			{
				displayName: 'Include Webhook Data',
				name: 'includeWebhookData',
				type: 'boolean',
				default: false,
				description: 'Whether to include the complete webhook payload in the output',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const invalid = await validateWebhook(this);
		if (invalid) return invalid;
		const payload = this.getBodyData() as IDataObject;
		const eventType = String(payload.type ?? '');
		const filters = this.getNodeParameter('eventTypeFilter') as string[];
		if (!filters.includes(eventType)) return respond(this, 200);
		const data = payload.data as IDataObject | undefined;
		if (!data?.monitor_id) return respond(this, 400, 'Missing monitor_id');

		const output: IDataObject = {
			webhook_id: this.getHeaderData()['webhook-id'],
			event_type: eventType,
			monitor_id: String(data.monitor_id),
			timestamp: payload.timestamp,
			event: data.event ?? {},
			metadata: data.metadata ?? {},
		};
		const event = data.event as IDataObject | undefined;
		if (eventType === 'monitor.event.detected') {
			if (!event?.event_group_id) return respond(this, 400, 'Missing event_group_id');
			output.event_group_id = event.event_group_id;
			if (this.getNodeParameter('fetchEventGroup') as boolean) {
				try {
					output.event_group = await parallelApiRequestForWebhook(
						this,
						'GET',
						`/v1/monitors/${encodeURIComponent(String(data.monitor_id))}/events`,
						undefined,
						{ event_group_id: event.event_group_id },
					);
				} catch (error) {
					if (this.getNodeParameter('retryOnFetchFailure', false) as boolean)
						return respond(this, 503, 'Monitor events are unavailable; retry this delivery');
					output.event_group_error = error instanceof Error ? error.message : String(error);
				}
			}
		}

		if (this.getNodeParameter('includeWebhookData') as boolean) {
			output.webhook_data = payload;
		}
		return { workflowData: [this.helpers.returnJsonArray([output])] };
	}
}
