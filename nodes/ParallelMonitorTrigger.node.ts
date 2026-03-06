import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'crypto';
import { parallelApiRequestForWebhook } from './Parallel/transport/ParallelApi';

export class ParallelMonitorTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel Monitor Event Trigger',
		name: 'parallelMonitorTrigger',
		icon: 'file:parallel.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when a Parallel Monitor detects events, completes an execution, or encounters an error',
		defaults: {
			name: 'Parallel Monitor Event',
		},
		inputs: [],
		outputs: ['main'],
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
				description: 'Use the webhook URL that n8n provides for this trigger node when creating or updating your Parallel monitor.',
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
				description: 'Whether to fetch the full event group details when an event is detected. Only applies to monitor.event.detected events.',
			},
			{
				displayName: 'Validate Webhook Signatures',
				name: 'validateSignatures',
				type: 'boolean',
				default: false,
				description: 'Whether to validate webhook signatures using your webhook secret. Note: Due to JSON serialization differences, signature validation may fail even with correct secrets. Disable for testing.',
			},
			{
				displayName: 'Include Webhook Data',
				name: 'includeWebhookData',
				type: 'boolean',
				default: false,
				description: 'Adds the raw webhook payload to the output as webhook_data. Useful for debugging.',
			},
		],
	};

	private static verifyWebhookSignature(
		secret: string,
		webhookId: string,
		webhookTimestamp: string,
		body: string,
		signatureHeader: string,
	): boolean {
		const payload = `${webhookId}.${webhookTimestamp}.${body}`;
		const expectedSignature = createHmac('sha256', secret)
			.update(payload)
			.digest('base64');

		const signatures = signatureHeader.split(' ');
		for (const sig of signatures) {
			if (sig.startsWith('v1,')) {
				const providedSignature = sig.substring(3);
				const expectedBuffer = Buffer.from(expectedSignature);
				const providedBuffer = Buffer.from(providedSignature);

				if (expectedBuffer.length === providedBuffer.length &&
					timingSafeEqual(expectedBuffer, providedBuffer)) {
					return true;
				}
			}
		}

		return false;
	}

	private async validateWebhook(this: IWebhookFunctions): Promise<void> {
		const validateSignatures = this.getNodeParameter('validateSignatures') as boolean;

		if (!validateSignatures) {
			return;
		}

		try {
			const credentials = await this.getCredentials('parallelApi');
			const webhookSecret = credentials.webhookSecret as string;

			if (!webhookSecret) {
				throw new NodeApiError(this.getNode(), {}, {
					message: 'Webhook signature validation is enabled but no webhook secret is configured. Please add your webhook secret to the Parallel API credentials.',
					description: 'Get your webhook secret from https://platform.parallel.ai/settings',
				});
			}

			const headers = this.getHeaderData();
			const webhookId = headers['webhook-id'] as string;
			const webhookTimestamp = headers['webhook-timestamp'] as string;
			const webhookSignature = headers['webhook-signature'] as string;

			if (!webhookId || !webhookTimestamp || !webhookSignature) {
				throw new NodeApiError(this.getNode(), {}, {
					message: 'Missing required webhook headers (webhook-id, webhook-timestamp, or webhook-signature)',
					description: 'This webhook request does not appear to be from Parallel or is malformed.',
				});
			}

			let body: string;
			try {
				body = (this as any).getRequest?.()?.rawBody || JSON.stringify(this.getBodyData());
			} catch {
				body = JSON.stringify(this.getBodyData(), null, 0);
			}

			const isValidSignature = ParallelMonitorTrigger.verifyWebhookSignature(
				webhookSecret,
				webhookId,
				webhookTimestamp,
				body,
				webhookSignature,
			);

			if (!isValidSignature) {
				throw new NodeApiError(this.getNode(), {}, {
					message: 'Invalid webhook signature',
					description: 'The webhook signature could not be verified. Consider disabling signature validation for testing.',
				});
			}
		} catch (error) {
			if (error instanceof NodeApiError) {
				throw error;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: `Webhook signature validation failed: ${(error as Error).message}`,
			});
		}
	}

	private async processWebhookPayload(this: IWebhookFunctions, bodyData: IDataObject): Promise<IWebhookResponseData> {
		const eventTypeFilter = this.getNodeParameter('eventTypeFilter') as string[];
		const includeWebhookData = this.getNodeParameter('includeWebhookData') as boolean;
		const fetchEventGroup = this.getNodeParameter('fetchEventGroup') as boolean;

		const eventType = bodyData.type as string;

		// Filter by event type
		if (!eventType || !eventTypeFilter.includes(eventType)) {
			return { noWebhookResponse: true };
		}

		const data = bodyData.data as IDataObject;
		if (!data) {
			return { noWebhookResponse: true };
		}

		const outputData: IDataObject = {
			event_type: eventType,
			monitor_id: data.monitor_id as string,
			timestamp: bodyData.timestamp as string,
			metadata: data.metadata || {},
		};

		// For event.detected, optionally fetch full event group
		if (eventType === 'monitor.event.detected' && fetchEventGroup) {
			const eventData = data.event as IDataObject;
			if (eventData?.event_group_id) {
				try {
					const eventGroup = await parallelApiRequestForWebhook(
						this,
						'GET',
						`/v1alpha/monitors/${data.monitor_id}/event_groups/${eventData.event_group_id}`,
					);
					outputData.event_group_id = eventData.event_group_id;
					outputData.event_group = eventGroup;
				} catch (error) {
					// Include the error but don't fail the webhook
					outputData.event_group_id = eventData.event_group_id;
					outputData.event_group_error = (error as Error).message;
				}
			}
		} else if (eventType === 'monitor.event.detected') {
			const eventData = data.event as IDataObject;
			if (eventData) {
				outputData.event_group_id = eventData.event_group_id;
			}
		} else {
			// For completion/failure events, include the event data directly
			outputData.event = data.event || {};
		}

		if (includeWebhookData) {
			outputData.webhook_data = bodyData;
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray([outputData]),
			],
		};
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;

		await ParallelMonitorTrigger.prototype.validateWebhook.call(this);

		return await ParallelMonitorTrigger.prototype.processWebhookPayload.call(this, bodyData);
	}
}
