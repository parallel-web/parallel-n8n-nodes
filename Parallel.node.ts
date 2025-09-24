import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, NodeApiError } from 'n8n-workflow';

export class Parallel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel',
		name: 'parallel',
		icon: 'file:parallel.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Highest accuracy web search tools for AI agents',
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
						name: 'Sync Web Enrichment',
						value: 'webEnrichment',
						description: 'Execute a Task with the Parallel Task API and retrieve its result.',
						action: 'Sync Web Enrichment',
					},
					{
						name: 'Async Web Enrichment',
						value: 'asyncWebEnrichment',
						description: 'Create a Task with the Parallel Task API and retrieve its Run ID for async retrieval.',
						action: 'Async Web Enrichment',
					},
					{
						name: 'Web Search',
						value: 'webSearch',
						description: 'Search the web with the Parallel Search API and retrieve a list of results and excerpts.',
						action: 'Web Search',
					},
					{
						name: 'Web Chat',
						value: 'webChat',
						description: 'AI-powered chat completions API with web access (<5 seconds)',
						action: 'Web Chat',
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
						operation: ['webEnrichment', 'asyncWebEnrichment'],
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
						operation: ['webEnrichment', 'asyncWebEnrichment'],
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
						operation: ['webEnrichment', 'asyncWebEnrichment'],
						inputType: ['json'],
					},
				},
				default: '{\n  "company_name": "Apple Inc.",\n  "company_domain": "apple.com",\n  "company_ticker": "AAPL"\n}',
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
				displayName: 'Output Schema Type',
				name: 'asyncOutputSchemaType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['asyncWebEnrichment'],
					},
				},
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Markdown style deep research report with in-line citations',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'User-specified JSON output with field-level citations',
					},
					{
						name: 'Auto',
						value: 'auto',
						description: 'Only supported in Pro and above. Optimized JSON output with nested citations',
					},
				],
				default: 'text',
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
				placeholder: 'Optional: Describe the desired output (e.g., "Format as $X.X trillion (year)")',
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
					'{\n  "type": "object",\n  "properties": {\n    "company_name": {\n      "type": "string",\n      "description": "Official company name from recent filings or website."\n    },\n    "ceo_name": {\n      "type": "string",\n      "description": "Current CEO full name from company website or recent news."\n    },\n    "employee_count": {\n      "type": "string",\n      "description": "Current number of employees as approximate number or range (e.g., \'500-1000\', \'2500\')."\n    },\n    "annual_revenue_2024": {\n      "type": "string",\n      "description": "2024 annual revenue in millions USD format (e.g., \'$500M\', \'$2.5B\')."\n    },\n    "headquarters_city": {\n      "type": "string",\n      "description": "Primary headquarters city and country (e.g., \'San Francisco, USA\')."\n    },\n    "founded_year": {\n      "type": "string",\n      "description": "Year company was founded in YYYY format."\n    }\n  },\n  "required": ["company_name", "ceo_name", "employee_count", "annual_revenue_2024", "headquarters_city", "founded_year"],\n  "additionalProperties": false\n}',
				description: 'JSON schema defining the structure of the expected output (description fields serve as field-level prompts)',
			},
			{
				displayName: 'JSON Schema',
				name: 'asyncJsonSchema',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['asyncWebEnrichment'],
						asyncOutputSchemaType: ['json'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "company_name": {\n      "type": "string",\n      "description": "Official company name from recent filings or website."\n    },\n    "ceo_name": {\n      "type": "string",\n      "description": "Current CEO full name from company website or recent news."\n    },\n    "employee_count": {\n      "type": "string",\n      "description": "Current number of employees as approximate number or range (e.g., \'500-1000\', \'2500\')."\n    },\n    "annual_revenue_2024": {\n      "type": "string",\n      "description": "2024 annual revenue in millions USD format (e.g., \'$500M\', \'$2.5B\')."\n    },\n    "headquarters_city": {\n      "type": "string",\n      "description": "Primary headquarters city and country (e.g., \'San Francisco, USA\')."\n    },\n    "founded_year": {\n      "type": "string",\n      "description": "Year company was founded in YYYY format."\n    }\n  },\n  "required": ["company_name", "ceo_name", "employee_count", "annual_revenue_2024", "headquarters_city", "founded_year"],\n  "additionalProperties": false\n}',
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
						description: 'Basic metadata, fallback, low latency - 5s-60s - max 2 output fields - $5/1000 runs',
					},
					{
						name: 'Base',
						value: 'base',
						description: 'Reliable standard enrichments - 15s-100s - max 5 output fields - $10/1000 runs',
					},
					{
						name: 'Core',
						value: 'core',
						description: 'Cross-referenced, moderately complex outputs - 60s-5min - max 10 output fields - $25/1000 runs',
					},
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
				displayName: 'Processor',
				name: 'asyncProcessor',
				type: 'options',
				description: 'Processor used for the async task. Higher-end processors for longer-running tasks.',
				displayOptions: {
					show: {
						operation: ['asyncWebEnrichment'],
					},
				},
				options: [
					{
						name: 'Lite',
						value: 'lite',
						description: 'Basic metadata, fallback, low latency - 5s-60s - max 2 output fields - $5/1000 runs',
					},
					{
						name: 'Base',
						value: 'base',
						description: 'Reliable standard enrichments - 15s-100s - max 5 output fields - $10/1000 runs',
					},
					{
						name: 'Core',
						value: 'core',
						description: 'Cross-referenced, moderately complex outputs - 60s-5min - max 10 output fields - $25/1000 runs',
					},
					{
						name: 'Pro',
						value: 'pro',
						description: 'Exploratory web research - 3min-9min - max 20 output fields - $100/1000 runs',
					},
					{
						name: 'Ultra',
						value: 'ultra',
						description: 'Advanced multi-source deep research - 5min-25min - max 20 output fields - $300/1000 runs',
					},
					{
						name: 'Ultra 2x',
						value: 'ultra2x',
						description: 'Difficult deep research - 5min-25min - max 25 output fields - $600/1000 runs',
					},
					{
						name: 'Ultra 4x',
						value: 'ultra4x',
						description: 'Very difficult deep research - 8min-30min - max 25 output fields - $1200/1000 runs',
					},
					{
						name: 'Ultra 8x',
						value: 'ultra8x',
						description: 'The most difficult deep research - 8min-30min - max 25 output fields - $2400/1000 runs',
					},
				],
				default: 'pro',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: ['asyncWebEnrichment'],
					},
				},
				default: '',
				placeholder: 'https://your-domain.com/webhooks/parallel',
				description: 'Optional webhook URL to receive real-time notifications when the task completes',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['webEnrichment', 'asyncWebEnrichment'],
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
			// WEB CHAT FIELDS
			{
				displayName: 'Input Prompt',
				name: 'chatInputPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['webChat'],
					},
				},
				default: 'What does Parallel Web Systems do?',
				description: 'Your question or prompt for the AI to answer using web research',
			},
			{
				displayName: 'Response Format',
				name: 'chatResponseFormat',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['webChat'],
					},
				},
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Standard text response',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Structured JSON response with schema',
					},
				],
				default: 'text',
				description: 'Format of the response',
			},
			{
				displayName: 'JSON Schema Name',
				name: 'chatJsonSchemaName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['webChat'],
						chatResponseFormat: ['json'],
					},
				},
				default: 'response_schema',
				description: 'Name for the JSON schema',
			},
			{
				displayName: 'JSON Schema',
				name: 'chatJsonSchema',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						operation: ['webChat'],
						chatResponseFormat: ['json'],
					},
				},
				default: JSON.stringify({
					type: 'object',
					properties: {
						answer: {
							type: 'string',
							description: 'Direct factual answer to the user question based on web research. If unavailable, return \'Information not found\'.',
						},
						key_findings: {
							type: 'array',
							items: { type: 'string' },
							description: 'List of 3-5 most important facts or insights related to the question. Return empty array if no findings.',
						},
						confidence_level: {
							type: 'string',
							description: 'Confidence level of the answer as \'High\', \'Medium\', or \'Low\' based on source quality and consistency.',
						},
						last_updated_date: {
							type: 'string',
							description: 'Most recent date of information found in YYYY-MM-DD format. If unavailable, return \'Unknown\'.',
						},
					},
					required: ['answer', 'key_findings', 'confidence_level', 'last_updated_date'],
					additionalProperties: false,
				}, null, 2),
				description: 'JSON schema defining the structure of the expected response',
			},
			{
				displayName: 'Additional Options',
				name: 'chatAdditionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: ['webChat'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'System Prompt',
						name: 'systemPrompt',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						placeholder: 'You are a helpful assistant that provides accurate information...',
						description: 'Optional system prompt to define the AI\'s behavior and role',
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
				} else if (operation === 'asyncWebEnrichment') {
					const result = await executeAsyncTask(this, i);
					returnData.push(result);
				} else if (operation === 'webSearch') {
					const result = await executeSearch(this, i);
					returnData.push(result);
				} else if (operation === 'webChat') {
					const result = await executeChat(this, i);
					returnData.push(result);
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {},
						error: error.message,
						pairedItem: { item: i },
					});
				} else {
					// If it's already a proper n8n error (NodeApiError), just re-throw it
					// Otherwise, wrap it in NodeOperationError
					if (error.name === 'NodeApiError' || error.name === 'NodeOperationError') {
						throw error;
					} else {
						throw new NodeOperationError(this.getNode(), error as Error, {
							itemIndex: i,
						});
					}
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
		input: input, // input is already parsed if it was JSON
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

		// Poll for result with exponential backoff retry logic
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
			} catch (error: any) {
				attempt++;
				const statusCode = error.httpCode || error.status || error.statusCode;

				// Handle retryable errors with exponential backoff
				const isRetryableError = [408, 429, 500, 502, 503].includes(parseInt(statusCode));
				
				if (isRetryableError && attempt < maxAttempts) {
					// Calculate exponential backoff delay (base 2 seconds, max 60 seconds)
					const delay = Math.min(2000 * Math.pow(2, attempt - 1), 60000);
					
					// Add jitter to prevent thundering herd
					const jitter = Math.random() * 1000;
					const totalDelay = delay + jitter;
					
					// Wait before retrying
					await new Promise(resolve => setTimeout(resolve, totalDelay));
					continue;
				}

				// For non-retryable errors or if we've exceeded max attempts, throw
				throw error;
			}
		}

	throw new NodeOperationError(
		executeFunctions.getNode(),
		`Task execution timed out after ${maxAttempts} attempts (approximately ${maxAttempts * 4} minutes)`,
		{ itemIndex },
	);
}

async function executeAsyncTask(
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
		const jsonSchemaString = executeFunctions.getNodeParameter('asyncJsonSchema', itemIndex) as string;
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

async function executeChat(
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

	return await parallelChatApiRequest(executeFunctions, body);
}

async function parallelChatApiRequest(
	executeFunctions: IExecuteFunctions,
	body: IDataObject,
): Promise<IDataObject> {
	const options: IRequestOptions = {
		method: 'POST',
		url: 'https://api.parallel.ai/chat/completions',
		headers: {
			'Content-Type': 'application/json',
		},
		body,
		json: true,
	};

	try {
		const result = await executeFunctions.helpers.requestWithAuthentication.call(
			executeFunctions,
			'parallelApi',
			options,
		);

		return result;
	} catch (error: any) {
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
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: errorMessage,
					description: errorDetail || 'Bad request - check your parameters and configuration.',
				});
			case 401:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Authentication failed',
					description: errorMessage || 'Invalid or missing API credentials. Please verify your API key.',
				});
			case 402:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Payment required',
					description: errorMessage || 'Insufficient credits in your account. Please add credits to continue.',
				});
			case 403:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Access forbidden',
					description: errorMessage || 'Invalid processor in request or insufficient permissions.',
				});
			case 404:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Resource not found',
					description: errorMessage || 'Run ID or resource not found. Please verify the resource exists.',
				});
			case 408:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Request timeout',
					description: errorMessage || 'The request timed out. This is normal for long-running tasks.',
					httpCode: '408',
				});
			case 422:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Invalid request data',
					description: `${errorMessage}${errorDetail ? '\n\nDetails: ' + errorDetail : ''}`,
				});
			case 429:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Rate limit exceeded',
					description: errorMessage || 'Too many requests. Configure retry logic in your workflow to handle rate limits.',
					httpCode: '429',
				});
			case 500:
			case 502:
			case 503:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Server error',
					description: errorMessage || 'Server-side error occurred. Use workflow retry settings to handle temporary failures.',
					httpCode: statusCode.toString(),
				});
			default:
				// If we can't extract proper error info, at least show what we have
				const fallbackMessage = errorMessage !== 'Request failed' ? errorMessage : 'An error occurred';
				const fallbackDescription = errorDetail || `Status code: ${statusCode || 'unknown'}`;
				throw new NodeOperationError(executeFunctions.getNode(), error, {
					message: fallbackMessage,
					description: fallbackDescription,
				});
		}
	}
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
	} catch (error: any) {
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
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: errorMessage,
					description: errorDetail || 'Bad request - check your parameters and configuration.',
				});
			case 401:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Authentication failed',
					description: errorMessage || 'Invalid or missing API credentials. Please verify your API key.',
				});
			case 402:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Payment required',
					description: errorMessage || 'Insufficient credits in your account. Please add credits to continue.',
				});
			case 403:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Access forbidden',
					description: errorMessage || 'Invalid processor in request or insufficient permissions.',
				});
			case 404:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Resource not found',
					description: errorMessage || 'Run ID or resource not found. Please verify the resource exists.',
				});
			case 408:
				// Timeout - this should be handled by retry logic in calling function
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Request timeout',
					description: errorMessage || 'The request timed out. This is normal for long-running tasks.',
					httpCode: '408',
				});
			case 422:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Invalid request data',
					description: `${errorMessage}${errorDetail ? '\n\nDetails: ' + errorDetail : ''}`,
				});
			case 429:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Rate limit exceeded',
					description: errorMessage || 'Too many requests. Configure retry logic in your workflow to handle rate limits.',
					httpCode: '429',
				});
			case 500:
			case 502:
			case 503:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Server error',
					description: errorMessage || 'Server-side error occurred. Use workflow retry settings to handle temporary failures.',
					httpCode: statusCode.toString(),
				});
			default:
				// If we can't extract proper error info, at least show what we have
				const fallbackMessage = errorMessage !== 'Request failed' ? errorMessage : 'An error occurred';
				const fallbackDescription = errorDetail || `Status code: ${statusCode || 'unknown'}`;
				throw new NodeOperationError(executeFunctions.getNode(), error, {
					message: fallbackMessage,
					description: fallbackDescription,
				});
		}
	}
}

async function parallelApiRequestWithWebhook(
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
			'parallel-beta': 'webhook-2025-08-12',
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
	} catch (error: any) {
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
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: errorMessage,
					description: errorDetail || 'Bad request - check your parameters and configuration.',
				});
			case 401:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Authentication failed',
					description: errorMessage || 'Invalid or missing API credentials. Please verify your API key.',
				});
			case 402:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Payment required',
					description: errorMessage || 'Insufficient credits in your account. Please add credits to continue.',
				});
			case 403:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Access forbidden',
					description: errorMessage || 'Invalid processor in request or insufficient permissions.',
				});
			case 404:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Resource not found',
					description: errorMessage || 'Run ID or resource not found. Please verify the resource exists.',
				});
			case 408:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Request timeout',
					description: errorMessage || 'The request timed out. This is normal for long-running tasks.',
					httpCode: '408',
				});
			case 422:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Invalid request data',
					description: `${errorMessage}${errorDetail ? '\n\nDetails: ' + errorDetail : ''}`,
				});
			case 429:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Rate limit exceeded',
					description: errorMessage || 'Too many requests. Configure retry logic in your workflow to handle rate limits.',
					httpCode: '429',
				});
			case 500:
			case 502:
			case 503:
				throw new NodeApiError(executeFunctions.getNode(), error, {
					message: 'Server error',
					description: errorMessage || 'Server-side error occurred. Use workflow retry settings to handle temporary failures.',
					httpCode: statusCode.toString(),
				});
			default:
				// If we can't extract proper error info, at least show what we have
				const fallbackMessage = errorMessage !== 'Request failed' ? errorMessage : 'An error occurred';
				const fallbackDescription = errorDetail || `Status code: ${statusCode || 'unknown'}`;
				throw new NodeOperationError(executeFunctions.getNode(), error, {
					message: fallbackMessage,
					description: fallbackDescription,
				});
		}
	}
}
