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

export class ParallelTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel Task Run Completion Trigger',
		name: 'parallelTrigger',
		icon: 'file:parallel.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when a Parallel Task Run completes and fetches the full result',
		defaults: {
			name: 'Parallel Task Run Completion',
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
				path: 'parallel-task-completion',
			},
		],
		properties: [
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'notice',
				default: '',
				description: 'Use the webhook URL that n8n provides for this trigger node when configuring your Parallel task webhook.',
			},
			{
				displayName: 'Validate Webhook Signatures',
				name: 'validateSignatures',
				type: 'boolean',
				default: false,
				description: 'Whether to validate webhook signatures using your webhook secret. Note: Due to JSON serialization differences, signature validation may fail even with correct secrets. Disable for testing.',
			},
			{
				displayName: 'Only Trigger on Successful Tasks',
				name: 'onlyCompleted',
				type: 'boolean',
				default: true,
				description: 'When enabled (default), only triggers on successful task completions. When disabled, also triggers on failed tasks for custom error handling.',
			},
			{
				displayName: 'Include Webhook Data',
				name: 'includeWebhookData',
				type: 'boolean',
				default: false,
				description: 'Adds the raw webhook payload to the output as webhook_data. Useful for debugging or accessing additional metadata from Parallel.',
			},
		],
	};

	/**
	 * Verifies webhook signature using HMAC-SHA256 following Standard Webhooks format
	 */
	private static verifyWebhookSignature(
		secret: string,
		webhookId: string,
		webhookTimestamp: string,
		body: string,
		signatureHeader: string,
	): boolean {
		// Compute expected signature
		const payload = `${webhookId}.${webhookTimestamp}.${body}`;
		const expectedSignature = createHmac('sha256', secret)
			.update(payload)
			.digest('base64');

		// Check each signature in the header (space-delimited)
		const signatures = signatureHeader.split(' ');
		for (const sig of signatures) {
			if (sig.startsWith('v1,')) {
				const providedSignature = sig.substring(3); // Remove "v1," prefix
				// Use timing-safe comparison
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

	/**
	 * Validates webhook signature if enabled
	 */
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

			// Try to get the raw body first, fallback to re-serialized JSON
			// Note: n8n's webhook functions may not provide access to raw body
			// This is a known limitation for webhook signature validation
			let body: string;
			try {
				// Attempt to access raw body if available (this may not work in all n8n versions)
				body = (this as any).getRequest?.()?.rawBody || JSON.stringify(this.getBodyData());
			} catch {
				// Fallback to re-serialized JSON with consistent formatting
				body = JSON.stringify(this.getBodyData(), null, 0);
			}

			const isValidSignature = ParallelTrigger.verifyWebhookSignature(
				webhookSecret,
				webhookId,
				webhookTimestamp,
				body,
				webhookSignature,
			);

			if (!isValidSignature) {
				// For debugging: Log the computed signature (remove in production)
				console.warn('[Parallel Webhook] Signature validation failed. This may be due to JSON serialization differences.');
				throw new NodeApiError(this.getNode(), {}, {
					message: 'Invalid webhook signature',
					description: 'The webhook signature could not be verified. This may be due to JSON serialization differences between the raw body and parsed body. Consider disabling signature validation for testing.',
				});
			}
		} catch (error) {
			// Re-throw NodeApiError as-is, wrap other errors
			if (error instanceof NodeApiError) {
				throw error;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: `Webhook signature validation failed: ${(error as Error).message}`,
			});
		}
	}

	/**
	 * Processes the webhook payload and fetches task results
	 */
	private async processWebhookPayload(this: IWebhookFunctions, bodyData: IDataObject): Promise<IWebhookResponseData> {
		const onlyCompleted = this.getNodeParameter('onlyCompleted') as boolean;
		const includeWebhookData = this.getNodeParameter('includeWebhookData') as boolean;

		// Validate webhook payload from Parallel
		if (!bodyData || !bodyData.type || bodyData.type !== 'task_run.status') {
			return {
				noWebhookResponse: true,
			};
		}

		const taskData = bodyData.data as IDataObject;
		if (!taskData || !taskData.run_id) {
			return {
				noWebhookResponse: true,
			};
		}

		const status = taskData.status as string;
		const runId = taskData.run_id as string;

		// If onlyCompleted is true, skip failed tasks
		if (onlyCompleted && status !== 'completed') {
			return {
				noWebhookResponse: true,
			};
		}

		try {
			// Get the full result from Parallel API
			const result = await parallelApiRequestForWebhook(
				this,
				'GET',
				`/v1/tasks/runs/${runId}/result`,
			);

			// Prepare output data
			const outputData: IDataObject = {
				run_id: runId,
				status: status,
				result: result,
			};

			// Include webhook data if requested
			if (includeWebhookData) {
				outputData.webhook_data = bodyData;
			}

			return {
				workflowData: [
					this.helpers.returnJsonArray([outputData]),
				],
			};
		} catch (error) {
			// Handle API errors gracefully
			const apiError = error as JsonObject;
			throw new NodeApiError(this.getNode(), apiError, {
				message: `Failed to fetch result for task run ${runId}: ${apiError.message || 'Unknown error'}`,
			});
		}
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;

		// Validate webhook signature if enabled
		await ParallelTrigger.prototype.validateWebhook.call(this);

		// Process the webhook payload
		return await ParallelTrigger.prototype.processWebhookPayload.call(this, bodyData);
	}
}
