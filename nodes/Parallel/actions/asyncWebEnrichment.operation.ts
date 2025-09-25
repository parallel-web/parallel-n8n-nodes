import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parallelApiRequestWithWebhook } from '../transport/ParallelApi';
import { buildSourcePolicy, buildMetadata } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Async Web Enrichment',
	value: 'asyncWebEnrichment',
	description: 'Create a Task with the Parallel Task API and retrieve its Run ID for async retrieval.',
	action: 'Async Web Enrichment',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const inputType = executeFunctions.getNodeParameter('inputType', itemIndex) as string;
	
	// Get input based on type
	let input: string | object;
	if (inputType === 'json') {
		const jsonInputString = executeFunctions.getNodeParameter('jsonInput', itemIndex) as string;
		try {
			input = JSON.parse(jsonInputString);
		} catch (error) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Invalid JSON in input: ${error.message}`,
				{ itemIndex },
			);
		}
	} else {
		input = executeFunctions.getNodeParameter('textInput', itemIndex) as string;
	}
	
	const outputSchemaType = executeFunctions.getNodeParameter(
		'asyncOutputSchemaType',
		itemIndex,
	) as string;
	const processor = executeFunctions.getNodeParameter('asyncProcessor', itemIndex) as string;
	const webhookUrl = executeFunctions.getNodeParameter('webhookUrl', itemIndex, '') as string;
	const additionalFields = executeFunctions.getNodeParameter(
		'additionalFields',
		itemIndex,
		{},
	) as IDataObject;

	// Prepare task specification
	const taskSpec: IDataObject = {};

	// Build output schema based on type
	if (outputSchemaType === 'auto') {
		taskSpec.output_schema = {
			type: 'auto',
		};
	} else if (outputSchemaType === 'text') {
		taskSpec.output_schema = {
			type: 'text',
		};
	} else if (outputSchemaType === 'json') {
		const jsonSchemaString = executeFunctions.getNodeParameter('asyncOutputJsonSchema', itemIndex) as string;
		try {
			const jsonSchema = JSON.parse(jsonSchemaString);
			taskSpec.output_schema = {
				type: 'json',
				json_schema: jsonSchema,
			};
		} catch (error) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Invalid JSON in output schema: ${error.message}`,
				{ itemIndex },
			);
		}
	}

	// For async tasks, no text output descriptions are needed
	// Text outputs will use the default markdown format with citations

	// Prepare request body
	const body: IDataObject = {
		input: input, // input is already parsed if it was JSON
		processor,
		task_spec: taskSpec,
	};

	// Add metadata if provided
	const metadata = buildMetadata(additionalFields);
	if (metadata) {
		body.metadata = metadata;
	}

	// Add source policy if provided
	const sourcePolicy = buildSourcePolicy(additionalFields);
	if (sourcePolicy) {
		body.source_policy = sourcePolicy;
	}

	// Add webhook configuration if provided
	if (webhookUrl) {
		body.webhook = {
			url: webhookUrl,
			event_types: ['task_run.status'],
		};
	}

	// Create task run and return immediately
	const taskRun = await parallelApiRequestWithWebhook(executeFunctions, 'POST', '/v1/tasks/runs', body);
	
	// Return task information immediately without waiting for completion
	const result: IDataObject = {
		run_id: taskRun.run_id,
		status: 'started',
		processor: processor,
		created_at: taskRun.created_at || new Date().toISOString(),
		message: 'Task started successfully. Use the run_id to check status or retrieve results later.',
	};

	// Add webhook information if configured
	if (webhookUrl) {
		result.webhook_configured = true;
		result.webhook_url = webhookUrl;
		result.message = 'Task started successfully with webhook notifications. You will receive a webhook call when the task completes.';
	} else {
		result.webhook_configured = false;
	}

	return result;
}
