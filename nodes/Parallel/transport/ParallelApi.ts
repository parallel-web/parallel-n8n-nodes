import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const API_BASE_URL = 'https://api.parallel.ai';

function normalizeResponse(value: unknown): IDataObject {
	if (value === undefined || value === null || value === '') return {};
	if (Array.isArray(value)) return { items: value };
	if (typeof value === 'object') return value as IDataObject;
	return { value } as IDataObject;
}

function errorObject(error: unknown): JsonObject {
	if (error && typeof error === 'object') return error as JsonObject;
	return { message: String(error) };
}

function requestOptions(
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): IHttpRequestOptions {
	const options: IHttpRequestOptions = {
		method,
		url: `${API_BASE_URL}${endpoint}`,
		headers: { 'Content-Type': 'application/json' },
		json: true,
	};
	if (body !== undefined) options.body = body;
	if (qs && Object.keys(qs).length > 0) options.qs = qs;
	return options;
}

export async function parallelApiRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	try {
		const response: unknown = await context.helpers.httpRequestWithAuthentication.call(
			context,
			'parallelApi',
			requestOptions(method, endpoint, body, qs),
		);
		return normalizeResponse(response);
	} catch (error) {
		throw new NodeApiError(context.getNode(), errorObject(error), {
			message: 'Parallel API request failed',
		});
	}
}

export async function parallelApiRequestForWebhook(
	context: IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	try {
		const response: unknown = await context.helpers.httpRequestWithAuthentication.call(
			context,
			'parallelApi',
			requestOptions(method, endpoint, body, qs),
		);
		return normalizeResponse(response);
	} catch (error) {
		throw new NodeApiError(context.getNode(), errorObject(error), {
			message: 'Parallel API request failed while processing a webhook',
		});
	}
}

export function getErrorStatusCode(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') return undefined;
	const value = error as Record<string, unknown>;
	const candidate = value.httpCode ?? value.statusCode ?? value.status;
	const parsed = Number(candidate);
	return Number.isFinite(parsed) ? parsed : undefined;
}
