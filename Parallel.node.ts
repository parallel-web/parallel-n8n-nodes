import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class Parallel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel',
		name: 'parallel',
		icon: 'file:parallel.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Web Actions - Web Enrichment and Web Search powered by AI',
		defaults: {
			name: 'Parallel',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'parallelApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Web Enrichment',
						value: 'webEnrichment',
						description: 'Execute a task with AI-powered web research and data extraction',
						action: 'Web Enrichment',
					},
					{
						name: 'Web Search',
						value: 'webSearch',
						description: 'Search the web with AI-powered processing',
						action: 'Web Search',
					},
				],
				default: 'webEnrichment',
			},
			// WEB ENRICHMENT FIELDS
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
					},
				},
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Natural language text input',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Structured JSON data input',
					},
				],
				default: 'text',
			},
			{
				displayName: 'Input',
				name: 'textInput',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
						inputType: ['text'],
					},
				},
				default: '',
				placeholder: 'What was the GDP of France in 2023? Format as "$X.X trillion (year)"',
				description: 'Natural language query or instruction for the task',
			},
			{
				displayName: 'JSON Input',
				name: 'jsonInput',
				type: 'json',
				typeOptions: {
					rows: 6,
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
						inputType: ['json'],
					},
				},
				default: '{\n  "company_name": "Apple Inc.",\n  "company_domain": "apple.com"\n}',
				description: 'System will expect inputs of this JSON structure. Provide actual data values here.',
			},
			{
				displayName: 'Output Schema Type',
				name: 'outputSchemaType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
					},
				},
				options: [
					// only for pro and above
					// {
					// 	name: 'Auto',
					// 	value: 'auto',
					// 	description: 'Automatically determine output schema',
					// },
					{
						name: 'Text',
						value: 'text',
						description: 'Simple text output (optionally specify format below)',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Structured JSON output (requires JSON schema below)',
					},
				],
				default: 'json',
			},
			{
				displayName: 'Output Format Description',
				name: 'textOutputDescription',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
						outputSchemaType: ['text'],
						inputType: ['text'],
					},
				},
				default: '',
				placeholder: 'Optional: Describe the desired output format (e.g., "Format as $X.X trillion (year)")',
				description: 'Optional description of how you want the text output formatted',
			},
			{
				displayName: 'Output Format Description',
				name: 'textOutputDescriptionRequired',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
						outputSchemaType: ['text'],
						inputType: ['json'],
					},
				},
				default: '',
				placeholder: 'Required: Describe what text output you want from the JSON input (e.g., "Generate a company summary")',
				description: 'Required description of what text output you want when providing JSON input',
			},
			{
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
						outputSchemaType: ['json'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "result": {\n      "type": "string",\n      "description": "The main result"\n    }\n  },\n  "required": ["result"],\n  "additionalProperties": false\n}',
				description: 'JSON schema defining the structure of the expected output (required when JSON type is selected)',
			},
			{
				displayName: 'Processor',
				name: 'processor',
				type: 'options',
				// When choosing pro or above, ensure your workflow timeout is sufficient. Ultra tasks may take up to 30 minutes.
				description: 'Processor used for the task.',
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
					},
				},
				options: [
					{
						name: 'Lite',
						value: 'lite',
						description: 'Basic metadata, fallback, low latency - $5/1000 runs',
					},
					{
						name: 'Base',
						value: 'base',
						description: 'Reliable standard enrichments - $10/1000 runs',
					},
					// up to 5 minutes will still time out
					// {
					// 	name: 'Core',
					// 	value: 'core',
					// 	description: 'Cross-referenced, moderately complex outputs - $25/1000 runs',
					// },
					// These processors will time out in regular nodes. Should work on self-hosted ones though, but this is an edge case and we don't want to confuse people.
					// {
					// 	name: 'Pro',
					// 	value: 'pro',
					// 	description: 'Exploratory web research - $100/1000 runs',
					// },
					// {
					// 	name: 'Ultra',
					// 	value: 'ultra',
					// 	description: 'Advanced multi-source deep research - $300/1000 runs',
					// },
					// {
					// 	name: 'Ultra 2x',
					// 	value: 'ultra2x',
					// 	description: 'Difficult deep research - $600/1000 runs',
					// },
					// {
					// 	name: 'Ultra 4x',
					// 	value: 'ultra4x',
					// 	description: 'Very difficult deep research - $1200/1000 runs',
					// },
					// {
					// 	name: 'Ultra 8x',
					// 	value: 'ultra8x',
					// 	description: 'The most difficult deep research - $2400/1000 runs',
					// },
				],
				default: 'base',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['webEnrichment'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Include Domains',
						name: 'includeDomains',
						type: 'string',
						default: '',
						placeholder: 'wikipedia.org,reuters.com',
						description: 'Comma-separated list of domains to include in search results',
					},
					{
						displayName: 'Exclude Domains',
						name: 'excludeDomains',
						type: 'string',
						default: '',
						placeholder: 'reddit.com,x.com',
						description: 'Comma-separated list of domains to exclude from search results',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								displayName: 'Metadata Fields',
								name: 'metadataFields',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
						description: 'Custom metadata to store with the run',
					},
				],
			},
			// WEB SEARCH FIELDS
			{
				displayName: 'Objective',
				name: 'objective',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: ['webSearch'],
					},
				},
				default: '',
				placeholder: 'Find recent news about artificial intelligence developments',
				description: 'Natural-language description of what the web search is trying to find',
			},
			{
				displayName: 'Processor',
				name: 'searchProcessor',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['webSearch'],
					},
				},
				options: [
					{
						name: 'Base',
						value: 'base',
						description: 'Standard search processing',
					},
					{
						name: 'Pro',
						value: 'pro',
						description: 'Advanced search processing',
					},
				],
				default: 'base',
			},
			{
				displayName: 'Additional Fields',
				name: 'searchAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['webSearch'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Include Domains',
						name: 'includeDomains',
						type: 'string',
						default: '',
						placeholder: 'wikipedia.org,reuters.com',
						description: 'Comma-separated list of domains to include in search results',
					},
					{
						displayName: 'Exclude Domains',
						name: 'excludeDomains',
						type: 'string',
						default: '',
						placeholder: 'reddit.com,x.com',
						description: 'Comma-separated list of domains to exclude from search results',
					},

					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 50,
						},
						default: 10,
						description: 'Maximum number of search results to return',
					},
					{
						displayName: 'Max Characters Per Result',
						name: 'maxCharsPerResult',
						type: 'number',
						typeOptions: {
							minValue: 100,
							maxValue: 10000,
						},
						default: 1000,
						description: 'Maximum number of characters to include in excerpts for each result',
					},

					{
						displayName: 'Search Queries',
						name: 'searchQueries',
						type: 'string',
						default: '',
						placeholder: 'artificial intelligence, machine learning, AI news',
						description: 'Comma-separated list of traditional keyword search queries',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'webEnrichment') {
					const result = await executeTask(this, i);

					returnData.push(result);
				} else if (operation === 'webSearch') {
					const result = await executeSearch(this, i);
					returnData.push(result);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {},
						error: error.message,
						pairedItem: { item: i },
					});
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex: i,
					});
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

async function executeTask(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const inputType = executeFunctions.getNodeParameter('inputType', itemIndex) as string;
	
	// Get input based on type
	let input: string;
	if (inputType === 'json') {
		input = executeFunctions.getNodeParameter('jsonInput', itemIndex) as string;
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
		const jsonSchemaString = executeFunctions.getNodeParameter('jsonSchema', itemIndex) as string;
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
			textDescription = executeFunctions.getNodeParameter('textOutputDescriptionRequired', itemIndex) as string;
		} else {
			// Optional description when input is text
			const optionalDescription = executeFunctions.getNodeParameter('textOutputDescription', itemIndex, '') as string;
			if (optionalDescription) {
				textDescription = optionalDescription;
			}
		}
		
		// If we have a text description, modify the task spec to include it
		if (textDescription) {
			if (taskSpec.output_schema && typeof taskSpec.output_schema === 'object' && (taskSpec.output_schema as IDataObject).type === 'text') {
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
		input: tryParseJSON(input),
		processor,
		task_spec: taskSpec,
	};

	// Add metadata if provided
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
		if (Object.keys(metadata).length > 0) {
			body.metadata = metadata;
		}
	}

	// Add source policy if provided
	const sourcePolicy = buildSourcePolicy(additionalFields);
	if (sourcePolicy) {
		body.source_policy = sourcePolicy;
	}

	// Create task run
	const taskRun = await parallelApiRequest(executeFunctions, 'POST', '/v1/tasks/runs', body);
	const runId = taskRun.run_id;

	// Poll for result with increasing timeout and retry logic
	const maxAttempts = 15;
	let attempt = 0;

	while (attempt < maxAttempts) {
		try {
			const timeout = 240;
			const result = await parallelApiRequest(
				executeFunctions,
				'GET',
				`/v1/tasks/runs/${runId}/result?timeout=${timeout}`,
			);

			return result;
		} catch (error) {
			attempt++;

			// If it's a timeout error and we haven't exceeded max attempts, continue
			if (error.httpCode === '408' && attempt < maxAttempts) {
				continue;
			}

			// For other errors or if we've exceeded max attempts, throw
			throw error;
		}
	}

	throw new NodeOperationError(
		executeFunctions.getNode(),
		`Task execution timed out after ${maxAttempts} attempts (approximately ${maxAttempts * 4} minutes)`,
		{ itemIndex },
	);
}

async function executeSearch(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const objective = executeFunctions.getNodeParameter('objective', itemIndex) as string;
	const processor = executeFunctions.getNodeParameter('searchProcessor', itemIndex) as string;
	const additionalFields = executeFunctions.getNodeParameter(
		'searchAdditionalFields',
		itemIndex,
		{},
	) as IDataObject;

	// Prepare request body
	const body: IDataObject = {
		objective,
		processor,
	};

	// Add search queries if provided
	if (additionalFields.searchQueries) {
		const queries = (additionalFields.searchQueries as string)
			.split(',')
			.map((q) => q.trim())
			.filter((q) => q.length > 0);
		if (queries.length > 0) {
			body.search_queries = queries;
		}
	}

	// Add other optional fields
	if (additionalFields.maxResults) {
		body.max_results = additionalFields.maxResults;
	}
	if (additionalFields.maxCharsPerResult) {
		body.max_chars_per_result = additionalFields.maxCharsPerResult;
	}

	// Add source policy if provided
	const sourcePolicy = buildSourcePolicy(additionalFields);
	if (sourcePolicy) {
		body.source_policy = sourcePolicy;
	}

	return await parallelApiRequest(executeFunctions, 'POST', '/v1beta/search', body);
}

function buildSourcePolicy(additionalFields: IDataObject): IDataObject | null {
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

function tryParseJSON(input: string): string | object {
	try {
		return JSON.parse(input);
	} catch {
		return input;
	}
}

async function parallelApiRequest(
	executeFunctions: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<any> {
	const options: IRequestOptions = {
		method,
		url: `https://api.parallel.ai${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (body) {
		options.body = body;
	}

	try {
		return await executeFunctions.helpers.requestWithAuthentication.call(
			executeFunctions,
			'parallelApi',
			options,
		);
	} catch (error) {
		throw new NodeOperationError(executeFunctions.getNode(), error as JsonObject);
	}
}
