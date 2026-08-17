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
				description: 'Add the secret from Parallel Platform Settings to the credential.',
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

export class ParallelTrigger implements INodeType {
	// Parallel receives this URL in the Task creation request, so activation has no remote registration.
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
		defaults: { name: 'Parallel Task Run Completion' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'parallelApi', required: true }],
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
				description: 'Use this n8n webhook URL when creating the Parallel Task Run',
			},
			{
				displayName: 'Include Webhook Data',
				name: 'includeWebhookData',
				type: 'boolean',
				default: false,
				description: 'Whether to include the complete webhook payload in the output',
			},
			{
				displayName: 'Only Trigger on Successful Tasks',
				name: 'onlyCompleted',
				type: 'boolean',
				default: true,
				description: 'Whether to ignore failed Task Runs',
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
				`/v1/tasks/runs/${encodePathSegment(String(data.run_id))}/result`,
			);
		}
		if (this.getNodeParameter('includeWebhookData') as boolean) output.webhook_data = payload;
		return { workflowData: [this.helpers.returnJsonArray([output])] };
	}
}
