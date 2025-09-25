import type {
	IExecuteFunctions,
	IWebhookFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * Makes an authenticated request to the Parallel API
 */
export async function parallelApiRequest(
	executeFunctions: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: `https://api.parallel.ai${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
	};

	if (body) {
		options.body = body;
	}

	try {
		return await executeFunctions.helpers.httpRequestWithAuthentication.call(
			executeFunctions,
			'parallelApi',
			options,
		);
	} catch (error: any) {
		throw handleApiError(executeFunctions, error);
	}
}

/**
 * Makes an authenticated request to the Parallel API with webhook headers
 */
export async function parallelApiRequestWithWebhook(
	executeFunctions: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: `https://api.parallel.ai${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			'parallel-beta': 'webhook-2025-08-12',
		},
	};

	if (body) {
		options.body = body;
	}

	try {
		return await executeFunctions.helpers.httpRequestWithAuthentication.call(
			executeFunctions,
			'parallelApi',
			options,
		);
	} catch (error: any) {
		throw handleApiError(executeFunctions, error);
	}
}

/**
 * Makes a request to the Parallel Chat API
 */
export async function parallelChatApiRequest(
	executeFunctions: IExecuteFunctions,
	body: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://api.parallel.ai/chat/completions',
		headers: {
			'Content-Type': 'application/json',
		},
		body,
	};

	try {
		const result = await executeFunctions.helpers.httpRequestWithAuthentication.call(
			executeFunctions,
			'parallelApi',
			options,
		);

		return result;
	} catch (error: any) {
		throw handleApiError(executeFunctions, error);
	}
}

/**
 * Makes a request for webhook functions (used in triggers)
 */
export async function parallelApiRequestForWebhook(
	webhookFunctions: IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: `https://api.parallel.ai${endpoint}`,
	};

	if (body) {
		options.body = body;
	}

	try {
		return await webhookFunctions.helpers.httpRequestWithAuthentication.call(
			webhookFunctions,
			'parallelApi',
			options,
		);
	} catch (error: any) {
		throw handleWebhookApiError(webhookFunctions, error);
	}
}

/**
 * Handles API errors and converts them to appropriate n8n errors
 */
function handleApiError(executeFunctions: IExecuteFunctions, error: any): Error {
	// Extract error details from API response
	const statusCode = parseInt(error.httpCode || error.status || error.statusCode || '0');
	const errorResponse = error.response?.body || error.body || error;
	
	// Get the actual error message from the API
	let errorMessage = 'Request failed';
	let errorDetail = '';
	
	// Try to extract from n8n's wrapped error first
	if (error.description) {
		errorMessage = error.description;
	}
	
	// Try to extract from messages array (raw API response)
	if (error.messages && error.messages.length > 0) {
		try {
			const rawMessage = error.messages[0];
			// Look for pattern like "400 - {json response}"
			const jsonMatch = rawMessage.match(/\d+ - (.+)/);
			if (jsonMatch) {
				const apiResponse = JSON.parse(jsonMatch[1]);
				if (apiResponse.error?.message) {
					errorMessage = apiResponse.error.message;
				}
				if (apiResponse.error?.detail) {
					errorDetail = typeof apiResponse.error.detail === 'string' 
						? apiResponse.error.detail 
						: JSON.stringify(apiResponse.error.detail);
				}
			}
		} catch (e) {
			// If parsing fails, continue with other extraction methods
		}
	}
	
	// Fallback: try to extract from nested error response
	if (errorMessage === 'Request failed' && errorResponse?.error) {
		errorMessage = errorResponse.error.message || errorMessage;
		if (errorResponse.error.detail) {
			errorDetail = typeof errorResponse.error.detail === 'string' 
				? errorResponse.error.detail 
				: JSON.stringify(errorResponse.error.detail);
		}
	}
	
	// Final fallback: use error.message if we still don't have anything
	if (errorMessage === 'Request failed' && error.message) {
		errorMessage = error.message;
	}

	// Handle different status codes appropriately
	switch (statusCode) {
		case 400:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: errorMessage,
				description: errorDetail || 'Bad request - check your parameters and configuration.',
			});
		case 401:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Authentication failed',
				description: errorMessage || 'Invalid or missing API credentials. Please verify your API key.',
			});
		case 402:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Payment required',
				description: errorMessage || 'Insufficient credits in your account. Please add credits to continue.',
			});
		case 403:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Access forbidden',
				description: errorMessage || 'Invalid processor in request or insufficient permissions.',
			});
		case 404:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Resource not found',
				description: errorMessage || 'Run ID or resource not found. Please verify the resource exists.',
			});
		case 408:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Request timeout',
				description: errorMessage || 'The request timed out. This is normal for long-running tasks.',
				httpCode: '408',
			});
		case 422:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Invalid request data',
				description: `${errorMessage}${errorDetail ? '\n\nDetails: ' + errorDetail : ''}`,
			});
		case 429:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Rate limit exceeded',
				description: errorMessage || 'Too many requests. Configure retry logic in your workflow to handle rate limits.',
				httpCode: '429',
			});
		case 500:
		case 502:
		case 503:
			return new NodeApiError(executeFunctions.getNode(), error, {
				message: 'Server error',
				description: errorMessage || 'Server-side error occurred. Use workflow retry settings to handle temporary failures.',
				httpCode: statusCode.toString(),
			});
		default:
			// If we can't extract proper error info, at least show what we have
			const fallbackMessage = errorMessage !== 'Request failed' ? errorMessage : 'An error occurred';
			const fallbackDescription = errorDetail || `Status code: ${statusCode || 'unknown'}`;
			return new NodeOperationError(executeFunctions.getNode(), error, {
				message: fallbackMessage,
				description: fallbackDescription,
			});
	}
}

/**
 * Handles API errors for webhook functions
 */
function handleWebhookApiError(webhookFunctions: IWebhookFunctions, error: any): Error {
	const apiError = error as any;
	return new NodeApiError(webhookFunctions.getNode(), apiError, {
		message: `Failed to fetch result: ${apiError.message || 'Unknown error'}`,
	});
}
