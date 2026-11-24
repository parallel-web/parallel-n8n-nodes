import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { version } from '../../../package.json';
import { buildResearchRequest, formatResearchResponse } from '../contracts/webResearch';
import { getErrorStatusCode, parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Web Research',
	value: 'webChat',
	description: 'Answer a question using web research, with optional structured JSON output',
	action: 'Research the web',
};

const HTTP_ERROR_HINTS: Partial<Record<number, string>> = {
	401: 'Check the API key in your Parallel credential.',
	402: 'Check the credits available in your Parallel account.',
	403: 'Check that your Parallel account has access to the Research API.',
	404: 'Check that the Research API is available to your Parallel account.',
	429: 'Reduce the request rate before running this workflow again.',
};

function requestErrorMessage(error: NodeApiError): string {
	const status = getErrorStatusCode(error);
	const detail = error.description ?? error.message;
	const hint = status === undefined ? undefined : HTTP_ERROR_HINTS[status];
	return `Parallel Research request failed${status ? ` (HTTP ${status})` : ''}: ${detail}${hint ? ` ${hint}` : ''}`;
}

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const prompt = executeFunctions.getNodeParameter('chatInputPrompt', itemIndex) as string;
	const savedModel = executeFunctions.getNodeParameter('chatModel', itemIndex, 'speed') as string;
	const responseFormat = executeFunctions.getNodeParameter(
		'chatResponseFormat',
		itemIndex,
	) as string;
	const additionalOptions = executeFunctions.getNodeParameter(
		'chatAdditionalOptions',
		itemIndex,
		{},
	) as IDataObject;
	const structuredOutput =
		responseFormat === 'json'
			? {
					name: executeFunctions.getNodeParameter('chatJsonSchemaName', itemIndex) as string,
					schema: executeFunctions.getNodeParameter('chatJsonSchema', itemIndex),
				}
			: undefined;

	try {
		const body = buildResearchRequest({
			prompt,
			savedModel,
			systemPrompt: additionalOptions.systemPrompt,
			structuredOutput,
		});
		const response = await parallelApiRequest(
			executeFunctions,
			'POST',
			'/v1/research',
			body,
			undefined,
			undefined,
			{ 'User-Agent': `parallel-n8n-node/${version}` },
		);
		return formatResearchResponse(response, savedModel);
	} catch (error) {
		const message = error instanceof NodeApiError ? requestErrorMessage(error) : error;
		throw new NodeOperationError(executeFunctions.getNode(), message, { itemIndex });
	}
}
