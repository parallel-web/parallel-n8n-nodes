import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Web Chat',
	value: 'webChat',
	description: 'AI-powered chat completions API with web access (<5 seconds)',
	action: 'Web Chat',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const inputPrompt = executeFunctions.getNodeParameter('chatInputPrompt', itemIndex) as string;
	const responseFormat = executeFunctions.getNodeParameter('chatResponseFormat', itemIndex) as string;
	const additionalOptions = executeFunctions.getNodeParameter('chatAdditionalOptions', itemIndex, {}) as IDataObject;

	// Build messages array
	const messages: IDataObject[] = [];
	
	// Add system prompt if provided
	if (additionalOptions.systemPrompt) {
		messages.push({
			role: 'system',
			content: additionalOptions.systemPrompt,
		});
	}

	// Add user prompt
	messages.push({
		role: 'user',
		content: inputPrompt,
	});

	// Build request body
	const body: IDataObject = {
		model: 'speed',
		messages,
		stream: false,
	};

	// Add response format if JSON is selected
	if (responseFormat === 'json') {
		const jsonSchemaName = executeFunctions.getNodeParameter('chatJsonSchemaName', itemIndex) as string;
		const jsonSchemaString = executeFunctions.getNodeParameter('chatJsonSchema', itemIndex) as string;
		
		try {
			const jsonSchema = JSON.parse(jsonSchemaString);
			body.response_format = {
				type: 'json_schema',
				json_schema: {
					name: jsonSchemaName,
					schema: jsonSchema,
				},
			};
		} catch (error) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Invalid JSON in schema: ${error.message}`,
				{ itemIndex },
			);
		}
	}

	return await parallelApiRequest(executeFunctions, 'POST', '/chat/completions', body);
}
