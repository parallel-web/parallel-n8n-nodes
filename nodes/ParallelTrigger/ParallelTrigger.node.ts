import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { parallelApiRequestForWebhook } from '../Parallel/transport/ParallelApi';
import { getParallelWebhookErrorMessage } from '../Parallel/webhooks/verify';

async function validateWebhook(context: IWebhookFunctions): Promise<void> {
	if (!(context.getNodeParameter('validateSignatures') as boolean)) return;
	const credentials = await context.getCredentials('parallelApi');
	const headers = context.getHeaderData();
	const message = getParallelWebhookErrorMessage({
		secret: credentials.webhookSecret as string | undefined,
		webhookId: headers['webhook-id'] as string | undefined,
		webhookTimestamp: headers['webhook-timestamp'] as string | undefined,
		signatureHeader: headers['webhook-signature'] as string | undefined,
		rawBody: context.getRequestObject().rawBody,
	});
	if (message) {
		throw new NodeApiError(context.getNode(), {}, { message });
	}
}

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
		usableAsTool: true,
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		await validateWebhook(this);
		const payload = this.getBodyData() as IDataObject;
		if (payload.type !== 'task_run.status') return { noWebhookResponse: true };
		const data = payload.data as IDataObject | undefined;
		if (!data?.run_id || !data.status) return { noWebhookResponse: true };
		const status = String(data.status);
		if (!['completed', 'failed'].includes(status)) return { noWebhookResponse: true };
		if ((this.getNodeParameter('onlyCompleted') as boolean) && status !== 'completed') {
			return { noWebhookResponse: true };
		}

		const output: IDataObject = {
			run_id: String(data.run_id),
			status,
			event: data,
		};
		if (status === 'completed') {
			output.result = await parallelApiRequestForWebhook(
				this,
				'GET',
				`/v1/tasks/runs/${encodeURIComponent(String(data.run_id))}/result`,
			);
		}
		if (this.getNodeParameter('includeWebhookData') as boolean) {
			output.webhook_data = payload;
		}
		return { workflowData: [this.helpers.returnJsonArray([output])] };
	}
}
