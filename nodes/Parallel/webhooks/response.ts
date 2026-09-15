import type { IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { getParallelWebhookErrorMessage } from './verify';

// noWebhookResponse means n8n must not send again, not that it should ignore the event.
export function respond(
	context: IWebhookFunctions,
	status: number,
	message?: string,
): IWebhookResponseData {
	context
		.getResponseObject()
		.status(status)
		.json(message ? { error: message } : { received: true });
	return { noWebhookResponse: true };
}

export async function validateWebhook(
	context: IWebhookFunctions,
): Promise<IWebhookResponseData | undefined> {
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
	if (message) return respond(context, 401, message);
	return undefined;
}
