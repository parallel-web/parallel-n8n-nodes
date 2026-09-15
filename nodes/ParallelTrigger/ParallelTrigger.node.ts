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

export class ParallelTrigger implements INodeType {
	// Parallel receives this URL in the Task creation request; activation does not register a remote webhook.
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
		displayName: 'Parallel Task Run Completion Trigger',
		name: 'parallelTrigger',
		icon: { light: 'file:../parallel.svg', dark: 'file:../Parallel/parallel.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["onlyCompleted"] ? "Completed" : "All terminal states"}}',
		description: 'Triggers when a Parallel Task Run reaches a terminal state',
		defaults: {
			name: 'Parallel Task Run Completion',
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
				path: 'parallel-task-completion',
			},
		],
		properties: [
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'notice',
				default: '',
				description:
					'Use the webhook URL that n8n provides for this trigger node when configuring your Parallel task webhook',
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
				displayName: 'Only Trigger on Successful Tasks',
				name: 'onlyCompleted',
				type: 'boolean',
				default: true,
				description: 'Whether to ignore failed Task Runs',
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
		if (payload.type !== 'task_run.status') return respond(this, 200);
		const data = payload.data as IDataObject | undefined;
		if (!data?.run_id || !data.status) return respond(this, 400, 'Missing Task run_id or status');
		const status = String(data.status);
		if (!['completed', 'failed'].includes(status)) return respond(this, 200);
		if ((this.getNodeParameter('onlyCompleted') as boolean) && status !== 'completed') {
			return respond(this, 200);
		}

		const output: IDataObject = {
			webhook_id: this.getHeaderData()['webhook-id'],
			run_id: String(data.run_id),
			status,
			event: data,
		};
		if (status === 'completed') {
			try {
				output.result = await parallelApiRequestForWebhook(
					this,
					'GET',
					`/v1/tasks/runs/${encodeURIComponent(String(data.run_id))}/result`,
					undefined,
					{ timeout: 4 },
				);
			} catch {
				return respond(this, 503, 'Task result is unavailable; retry this delivery');
			}
		}

		if (this.getNodeParameter('includeWebhookData') as boolean) {
			output.webhook_data = payload;
		}
		return { workflowData: [this.helpers.returnJsonArray([output])] };
	}
}
