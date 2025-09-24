import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionType, NodeApiError } from 'n8n-workflow';

export class ParallelTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel Task Completion Trigger',
		name: 'parallelTrigger',
		icon: 'file:parallel.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when a Parallel task completes and fetches the full result',
		defaults: {
			name: 'Parallel Task Completion',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
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
				displayName: 'Only Trigger on Completed Tasks',
				name: 'onlyCompleted',
				type: 'boolean',
				default: true,
				description: 'Whether to only trigger when tasks complete successfully (ignore failed tasks)',
			},
			{
				displayName: 'Include Webhook Data',
				name: 'includeWebhookData',
				type: 'boolean',
				default: false,
				description: 'Whether to include the original webhook payload in the output',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
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
			const credentials = await this.getCredentials('parallelApi');
			
			const options: IRequestOptions = {
				method: 'GET',
				url: `https://api.parallel.ai/v1/tasks/runs/${runId}/result`,
				headers: {
					'x-api-key': credentials.apiKey as string,
				},
				json: true,
			};

			const result = await this.helpers.request(options);

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
}
