import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';
import { waitForTaskResult } from '../transport/waitForTaskResult';
import { buildSourcePolicy, buildMetadata } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Sync Web Enrichment',
	value: 'webEnrichment',
	description: 'Execute a Task with the Parallel Task API and retrieve its result',
	action: 'Sync Web Enrichment',
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
		'outputSchemaType',
		itemIndex,
	) as string;
	const processor = executeFunctions.getNodeParameter('processor', itemIndex) as string;
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
		const jsonSchemaString = executeFunctions.getNodeParameter(
			'syncOutputJsonSchema',
			itemIndex,
		) as string;
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

	// Add text output description if provided (when using text output schema)
	if (outputSchemaType === 'text') {
		let textDescription = '';
		if (inputType === 'json') {
			// Required description when input is JSON
			textDescription = executeFunctions.getNodeParameter(
				'textOutputDescriptionRequired',
				itemIndex,
			) as string;
		} else {
			// Optional description when input is text
			const optionalDescription = executeFunctions.getNodeParameter(
				'textOutputDescription',
				itemIndex,
				'',
			) as string;
			if (optionalDescription) {
				textDescription = optionalDescription;
			}
		}

		// If we have a text description, modify the task spec to include it
		if (textDescription) {
			if (
				taskSpec.output_schema &&
				typeof taskSpec.output_schema === 'object' &&
				(taskSpec.output_schema as IDataObject).type === 'text'
			) {
				// Add description to existing text schema
				(taskSpec.output_schema as IDataObject).description = textDescription;
			} else {
				// Create text schema with description
				taskSpec.output_schema = {
					type: 'text',
					description: textDescription,
				};
			}
		}
	}

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

	const minutes = Number(executeFunctions.getNodeParameter('syncWaitMinutes', itemIndex, 75));
	if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120)
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Maximum Wait must be between 1 and 120 minutes',
			{ itemIndex },
		);
	const taskRun = await parallelApiRequest(executeFunctions, 'POST', '/v1/tasks/runs', body);
	if (typeof taskRun.run_id !== 'string' || !taskRun.run_id)
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Task creation returned no run ID. Check Parallel before retrying to avoid duplicate tasks',
			{ itemIndex },
		);
	return await waitForTaskResult(executeFunctions, taskRun.run_id, minutes, itemIndex);
}
