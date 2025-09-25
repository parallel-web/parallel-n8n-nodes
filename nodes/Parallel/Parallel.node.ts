import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { operations, operationDescriptions } from './actions';

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
				options: operationDescriptions,
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
				name: 'syncOutputJsonSchema',
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
				name: 'asyncOutputJsonSchema',
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
				let result: IDataObject;

				switch (operation) {
					case 'webEnrichment':
						result = await operations.webEnrichment.execute(this, i);
						break;
					case 'asyncWebEnrichment':
						result = await operations.asyncWebEnrichment.execute(this, i);
						break;
					case 'webSearch':
						result = await operations.webSearch.execute(this, i);
						break;
					case 'webChat':
						result = await operations.webChat.execute(this, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex: i,
						});
				}

				returnData.push(result);
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