import type { IDataObject } from 'n8n-workflow';

/**
 * Builds a source policy object from additional fields
 */
export function buildSourcePolicy(additionalFields: IDataObject): IDataObject | null {
	const sourcePolicy: IDataObject = {};

	if (additionalFields.includeDomains) {
		const domains = (additionalFields.includeDomains as string)
			.split(',')
			.map((d) => d.trim())
			.filter((d) => d.length > 0);
		if (domains.length > 0) {
			sourcePolicy.include_domains = domains;
		}
	}

	if (additionalFields.excludeDomains) {
		const domains = (additionalFields.excludeDomains as string)
			.split(',')
			.map((d) => d.trim())
			.filter((d) => d.length > 0);
		if (domains.length > 0) {
			sourcePolicy.exclude_domains = domains;
		}
	}

	return Object.keys(sourcePolicy).length > 0 ? sourcePolicy : null;
}

/**
 * Builds metadata object from additional fields
 */
export function buildMetadata(additionalFields: IDataObject): IDataObject | null {
	if (
		additionalFields.metadata &&
		Array.isArray((additionalFields.metadata as IDataObject).metadataFields)
	) {
		const metadata: IDataObject = {};
		const metadataFields = (additionalFields.metadata as IDataObject)
			.metadataFields as IDataObject[];
		for (const field of metadataFields) {
			if (field.key && field.value) {
				metadata[field.key as string] = field.value;
			}
		}
		return Object.keys(metadata).length > 0 ? metadata : null;
	}
	return null;
}

/**
 * Waits for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = 2000, maxDelay: number = 60000): number {
	// Calculate exponential backoff delay (base 2 seconds, max 60 seconds)
	const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
	
	// Add jitter to prevent thundering herd
	const jitter = Math.random() * 1000;
	return delay + jitter;
}

/**
 * Checks if an error is retryable based on status code
 */
export function isRetryableError(statusCode: number | string): boolean {
	const code = parseInt(statusCode.toString());
	return [408, 429, 500, 502, 503].includes(code);
}
