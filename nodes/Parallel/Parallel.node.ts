import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { operations, operationDescriptions, monitorOperationDescriptions } from './actions';

const TASK_PROCESSOR_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Base', value: 'base' },
	{ name: 'Base (Fast)', value: 'base-fast' },
	{ name: 'Core', value: 'core' },
	{ name: 'Core 2x', value: 'core2x' },
	{ name: 'Core 2x (Fast)', value: 'core2x-fast' },
	{ name: 'Core (Fast)', value: 'core-fast' },
	{ name: 'Lite', value: 'lite' },
	{ name: 'Lite (Fast)', value: 'lite-fast' },
	{ name: 'Pro', value: 'pro' },
	{ name: 'Pro (Fast)', value: 'pro-fast' },
	{ name: 'Ultra', value: 'ultra' },
	{ name: 'Ultra 2x', value: 'ultra2x' },
	{ name: 'Ultra 2x (Fast)', value: 'ultra2x-fast' },
	{ name: 'Ultra 4x', value: 'ultra4x' },
	{ name: 'Ultra 4x (Fast)', value: 'ultra4x-fast' },
	{ name: 'Ultra 8x', value: 'ultra8x' },
	{ name: 'Ultra 8x (Fast)', value: 'ultra8x-fast' },
	{ name: 'Ultra (Fast)', value: 'ultra-fast' },
];

export class Parallel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel',
		name: 'parallel',
		icon: { light: 'file:parallel.svg', dark: 'file:parallel.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle:
			'={{$parameter["resource"] === "monitor" ? "Monitor / " + $parameter["monitorOperation"] : $parameter["operation"]}}',
		description: 'Highest accuracy web search tools for AI agents',
		defaults: {
			name: 'Parallel',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'parallelApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Monitor',
						value: 'monitor',
					},
				],
				default: 'task',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['task'],
					},
				},
				options: operationDescriptions,
				default: 'webEnrichment',
			},
			{
				displayName: 'Operation',
				name: 'monitorOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
					},
				},
				options: monitorOperationDescriptions,
				default: 'createMonitor',
			},

			// ===== TASK FIELDS (existing) =====
			// WEB ENRICHMENT FIELDS
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['task'],
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
						resource: ['task'],
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
						resource: ['task'],
						operation: ['webEnrichment', 'asyncWebEnrichment'],
						inputType: ['json'],
					},
				},
				default:
					'{\n  "company_name": "Apple Inc.",\n  "company_domain": "apple.com",\n  "company_ticker": "AAPL"\n}',
				description:
					'System will expect inputs of this JSON structure. Provide actual data values here.',
			},
			{
				displayName: 'Output Schema Type',
				name: 'outputSchemaType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['task'],
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
						resource: ['task'],
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
						description:
							'Only supported in Pro and above. Optimized JSON output with nested citations.',
					},
				],
				default: 'text',
			},
			{
				displayName: 'Output Format Description',
				name: 'textOutputDescription',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['webEnrichment'],
						outputSchemaType: ['text'],
						inputType: ['text'],
					},
				},
				default: '',
				placeholder:
					'Optional: Describe the desired output (e.g., "Format as $X.X trillion (year)")',
				description: 'Optional description of how you want the text output formatted',
			},
			{
				displayName: 'Output Format Description',
				name: 'textOutputDescriptionRequired',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['webEnrichment'],
						outputSchemaType: ['text'],
						inputType: ['json'],
					},
				},
				default: '',
				placeholder:
					'Required: Describe what text output you want from the JSON input (e.g., "Generate a company summary")',
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
						resource: ['task'],
						operation: ['webEnrichment'],
						outputSchemaType: ['json'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "company_name": {\n      "type": "string",\n      "description": "Official company name from recent filings or website."\n    },\n    "ceo_name": {\n      "type": "string",\n      "description": "Current CEO full name from company website or recent news."\n    },\n    "employee_count": {\n      "type": "string",\n      "description": "Current number of employees as approximate number or range (e.g., \'500-1000\', \'2500\')."\n    },\n    "annual_revenue_2024": {\n      "type": "string",\n      "description": "2024 annual revenue in millions USD format (e.g., \'$500M\', \'$2.5B\')."\n    },\n    "headquarters_city": {\n      "type": "string",\n      "description": "Primary headquarters city and country (e.g., \'San Francisco, USA\')."\n    },\n    "founded_year": {\n      "type": "string",\n      "description": "Year company was founded in YYYY format."\n    }\n  },\n  "required": ["company_name", "ceo_name", "employee_count", "annual_revenue_2024", "headquarters_city", "founded_year"],\n  "additionalProperties": false\n}',
				description:
					'JSON schema defining the structure of the expected output (description fields serve as field-level prompts)',
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
						resource: ['task'],
						operation: ['asyncWebEnrichment'],
						asyncOutputSchemaType: ['json'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "company_name": {\n      "type": "string",\n      "description": "Official company name from recent filings or website."\n    },\n    "ceo_name": {\n      "type": "string",\n      "description": "Current CEO full name from company website or recent news."\n    },\n    "employee_count": {\n      "type": "string",\n      "description": "Current number of employees as approximate number or range (e.g., \'500-1000\', \'2500\')."\n    },\n    "annual_revenue_2024": {\n      "type": "string",\n      "description": "2024 annual revenue in millions USD format (e.g., \'$500M\', \'$2.5B\')."\n    },\n    "headquarters_city": {\n      "type": "string",\n      "description": "Primary headquarters city and country (e.g., \'San Francisco, USA\')."\n    },\n    "founded_year": {\n      "type": "string",\n      "description": "Year company was founded in YYYY format."\n    }\n  },\n  "required": ["company_name", "ceo_name", "employee_count", "annual_revenue_2024", "headquarters_city", "founded_year"],\n  "additionalProperties": false\n}',
				description:
					'JSON schema defining the structure of the expected output (required when JSON type is selected)',
			},
			{
				displayName: 'Processor',
				name: 'processor',
				type: 'options',
				description: 'Processor used for the task',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['webEnrichment'],
					},
				},
				options: TASK_PROCESSOR_OPTIONS,
				default: 'base',
			},
			{
				displayName: 'Processor',
				name: 'asyncProcessor',
				type: 'options',
				description:
					'Processor used for the async task. Higher-end processors for longer-running tasks.',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['asyncWebEnrichment'],
					},
				},
				options: TASK_PROCESSOR_OPTIONS,
				default: 'pro',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['asyncWebEnrichment'],
					},
				},
				default: '',
				placeholder: 'https://your-domain.com/webhooks/parallel',
				description:
					'Optional webhook URL to receive real-time notifications when the task completes',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['task'],
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
				displayOptions: {
					show: {
						resource: ['task'],
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
						resource: ['task'],
						operation: ['webSearch'],
					},
				},
				options: [
					{
						name: 'Advanced',
						value: 'advanced',
						description: 'Highest-quality agentic search',
					},
					{
						name: 'Basic',
						value: 'basic',
						description: 'Balanced search for most workflows',
					},
					{
						name: 'Fast',
						value: 'fast',
						description: 'Low-latency search',
					},
					{
						name: 'Turbo',
						value: 'turbo',
						description: 'Fastest search for English and Japanese queries',
					},
				],
				default: 'advanced',
			},
			{
				displayName: 'Additional Fields',
				name: 'searchAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['webSearch'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Exclude Domains',
						name: 'excludeDomains',
						type: 'string',
						default: '',
						placeholder: 'reddit.com,x.com',
						description: 'Comma-separated list of domains to exclude from search results',
					},
					{
						displayName: 'Include Domains',
						name: 'includeDomains',
						type: 'string',
						default: '',
						placeholder: 'wikipedia.org,reuters.com',
						description: 'Comma-separated list of domains to include in search results',
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
						description: 'Maximum characters to include in each result excerpt',
					},
					{
						displayName: 'Max Characters Total',
						name: 'maxCharsTotal',
						type: 'number',
						typeOptions: {
							minValue: 1000,
							maxValue: 1000000,
						},
						default: 50000,
						description: 'Maximum characters across all result excerpts',
					},
					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
						default: 10,
						description: 'Maximum number of search results to return',
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
				displayName: 'Model',
				name: 'chatModel',
				type: 'options',
				displayOptions: { show: { resource: ['task'], operation: ['webChat'] } },
				options: [
					{ name: 'Base', value: 'base' },
					{ name: 'Core', value: 'core' },
					{ name: 'Lite', value: 'lite' },
					{ name: 'Speed', value: 'speed' },
				],
				default: 'speed',
				description: 'Parallel Chat model to use',
			},
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
						resource: ['task'],
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
						resource: ['task'],
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
						resource: ['task'],
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
						resource: ['task'],
						operation: ['webChat'],
						chatResponseFormat: ['json'],
					},
				},
				default: JSON.stringify(
					{
						type: 'object',
						properties: {
							answer: {
								type: 'string',
								description:
									"Direct factual answer to the user question based on web research. If unavailable, return 'Information not found'.",
							},
							key_findings: {
								type: 'array',
								items: { type: 'string' },
								description:
									'List of 3-5 most important facts or insights related to the question. Return empty array if no findings.',
							},
							confidence_level: {
								type: 'string',
								description:
									"Confidence level of the answer as 'High', 'Medium', or 'Low' based on source quality and consistency.",
							},
							last_updated_date: {
								type: 'string',
								description:
									"Most recent date of information found in YYYY-MM-DD format. If unavailable, return 'Unknown'.",
							},
						},
						required: ['answer', 'key_findings', 'confidence_level', 'last_updated_date'],
						additionalProperties: false,
					},
					null,
					2,
				),
				description: 'JSON schema defining the structure of the expected response',
			},
			{
				displayName: 'Additional Options',
				name: 'chatAdditionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						resource: ['task'],
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
						description: "Optional system prompt to define the AI's behavior and role",
					},
				],
			},

			// ===== MONITOR FIELDS =====

			// Create Monitor fields
			{
				displayName: 'Monitor Type',
				name: 'monitorType',
				type: 'options',
				required: true,
				displayOptions: { show: { resource: ['monitor'], monitorOperation: ['createMonitor'] } },
				options: [
					{ name: 'Event Stream', value: 'event_stream' },
					{ name: 'Snapshot', value: 'snapshot' },
				],
				default: 'event_stream',
				description: 'Whether to monitor a query or changes to an existing Task Run output',
			},
			{
				displayName: 'Query',
				name: 'monitorQuery',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
						monitorType: ['event_stream'],
					},
				},
				default: '',
				placeholder: 'Track funding announcements for AI startups',
				description:
					'What to monitor - natural language description of the events to track on the web',
			},
			{
				displayName: 'Task Run ID',
				name: 'monitorTaskRunId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
						monitorType: ['snapshot'],
					},
				},
				default: '',
				description: 'Completed Task Run whose output should be monitored for changes',
			},
			{
				displayName: 'Cadence',
				name: 'monitorCadence',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
					},
				},
				options: [
					{
						name: 'Daily',
						value: '1d',
						description: 'Run once per day - best for most news tracking',
					},
					{
						name: 'Every Two Weeks',
						value: '2w',
						description: 'Run every two weeks',
					},
					{
						name: 'Hourly',
						value: '1h',
						description: 'Run every hour - best for fast-moving topics',
					},
					{
						name: 'Weekly',
						value: '1w',
						description: 'Run once per week - best for slower-changing topics',
					},
				],
				default: '1d',
			},
			{
				displayName: 'Processor',
				name: 'monitorProcessor',
				type: 'options',
				displayOptions: { show: { resource: ['monitor'], monitorOperation: ['createMonitor'] } },
				options: [
					{ name: 'Base', value: 'base' },
					{ name: 'Lite', value: 'lite' },
				],
				default: 'lite',
				description: 'Processor used by each monitor execution',
			},
			{
				displayName: 'Output Schema Type',
				name: 'monitorOutputSchemaType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
						monitorType: ['event_stream'],
					},
				},
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Unstructured text output',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Structured JSON output with a schema',
					},
				],
				default: 'text',
			},
			{
				displayName: 'JSON Schema',
				name: 'monitorOutputJsonSchema',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
						monitorType: ['event_stream'],
						monitorOutputSchemaType: ['json'],
					},
				},
				default:
					'{\n  "type": "object",\n  "properties": {\n    "company_name": {\n      "type": "string",\n      "description": "Company name"\n    },\n    "event_summary": {\n      "type": "string",\n      "description": "Brief summary of the event"\n    },\n    "sentiment": {\n      "type": "string",\n      "description": "Sentiment: positive, negative, or neutral"\n    }\n  }\n}',
				description: 'JSON schema defining the structure of monitor event outputs',
			},
			{
				displayName: 'Webhook URL',
				name: 'monitorWebhookUrl',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
					},
				},
				default: '',
				placeholder: 'https://your-n8n-instance.com/webhook/parallel-monitor-event',
				description:
					'Webhook URL to receive notifications when events are detected. Use the URL from a Parallel Monitor Event Trigger node.',
			},
			{
				displayName: 'Webhook Event Types',
				name: 'monitorWebhookEventTypes',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
					},
				},
				options: [
					{
						name: 'Event Detected',
						value: 'monitor.event.detected',
					},
					{
						name: 'Execution Completed',
						value: 'monitor.execution.completed',
					},
					{
						name: 'Execution Failed',
						value: 'monitor.execution.failed',
					},
				],
				default: ['monitor.event.detected'],
				description: 'Which webhook event types to subscribe to',
			},
			{
				displayName: 'Additional Fields',
				name: 'monitorAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Include Backfill',
						name: 'includeBackfill',
						type: 'boolean',
						default: false,
						description: 'Whether to emit matching historical events when the monitor is created',
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
						description: 'Custom metadata to store with the monitor',
					},
				],
			},

			// Monitor ID field (shared across get, update, delete, list events, get event group)
			{
				displayName: 'Monitor ID',
				name: 'monitorId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: [
							'getMonitor',
							'updateMonitor',
							'deleteMonitor',
							'listMonitorEvents',
							'getMonitorEventGroup',
							'triggerMonitor',
						],
					},
				},
				default: '',
				placeholder: 'monitor_b0079f70195e4258a3b982c1b6d8bd3a',
				description: 'The ID of the monitor',
			},

			// List Monitors additional fields
			{
				displayName: 'Additional Fields',
				name: 'listMonitorsAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['listMonitors'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cursor',
						name: 'cursorMonitorId',
						type: 'string',
						default: '',
						description: 'Pagination cursor returned by the previous request',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 100 },
						default: 50,
						description: 'Max number of results to return',
					},
				],
			},

			// Update Monitor fields
			{
				displayName: 'Update Fields',
				name: 'monitorUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['updateMonitor'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cadence',
						name: 'cadence',
						type: 'options',
						options: [
							{
								name: 'Daily',
								value: '1d',
							},
							{
								name: 'Every Two Weeks',
								value: '2w',
							},
							{
								name: 'Hourly',
								value: '1h',
							},
							{
								name: 'Weekly',
								value: '1w',
							},
						],
						default: '1d',
						description: 'Updated monitoring cadence',
					},
					{
						displayName: 'Clear Metadata',
						name: 'clearMetadata',
						type: 'boolean',
						default: false,
						description: 'Whether to remove all metadata from the monitor',
					},
					{
						displayName: 'Clear Webhook',
						name: 'clearWebhook',
						type: 'boolean',
						default: false,
						description: 'Whether to remove the webhook configuration from the monitor',
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
						description: 'Updated metadata',
					},
					{
						displayName: 'Query',
						name: 'query',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Updated event-stream query',
					},
					{
						displayName: 'Webhook Event Types',
						name: 'webhookEventTypes',
						type: 'multiOptions',
						options: [
							{ name: 'Event Detected', value: 'monitor.event.detected' },
							{ name: 'Execution Completed', value: 'monitor.execution.completed' },
							{ name: 'Execution Failed', value: 'monitor.execution.failed' },
						],
						default: ['monitor.event.detected'],
						description: 'Updated webhook event types',
					},
					{
						displayName: 'Webhook URL',
						name: 'webhookUrl',
						type: 'string',
						default: '',
						description: 'Updated webhook URL for notifications',
					},
				],
			},

			// List Monitor Events additional fields
			{
				displayName: 'Additional Fields',
				name: 'monitorEventsAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['listMonitorEvents'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'Pagination cursor returned by the previous request',
					},
					{
						displayName: 'Event Group ID',
						name: 'eventGroupId',
						type: 'string',
						default: '',
						description: 'Only return events from this monitor execution',
					},
					{
						displayName: 'Include Completions',
						name: 'includeCompletions',
						type: 'boolean',
						default: false,
						description: 'Whether to include executions that completed without a detected change',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 100 },
						default: 50,
						description: 'Max number of results to return',
					},
				],
			},

			// Get Event Group fields
			{
				displayName: 'Event Group ID',
				name: 'eventGroupId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['getMonitorEventGroup'],
					},
				},
				default: '',
				placeholder: 'mevtgrp_b0079f70195e4258eab1e7284340f1a9ec3a8033ed236a24',
				description: 'The ID of the event group to retrieve',
			},
			{
				displayName: 'Task Run ID',
				name: 'taskRunId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['getTaskRun', 'getTaskRunResult'],
					},
				},
				default: '',
				description: 'The Task Run ID returned when the run was created',
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0, 'task') as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: IDataObject;

				if (resource === 'monitor') {
					const monitorOperation = this.getNodeParameter('monitorOperation', i) as string;

					switch (monitorOperation) {
						case 'createMonitor':
							result = await operations.createMonitor.execute(this, i);
							break;
						case 'getMonitor':
							result = await operations.getMonitor.execute(this, i);
							break;
						case 'listMonitors':
							result = await operations.listMonitors.execute(this, i);
							break;
						case 'updateMonitor':
							result = await operations.updateMonitor.execute(this, i);
							break;
						case 'deleteMonitor':
							result = await operations.deleteMonitor.execute(this, i);
							break;
						case 'listMonitorEvents':
							result = await operations.listMonitorEvents.execute(this, i);
							break;
						case 'getMonitorEventGroup':
							result = await operations.getMonitorEventGroup.execute(this, i);
							break;
						case 'triggerMonitor':
							result = await operations.triggerMonitor.execute(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown monitor operation: ${monitorOperation}`,
								{
									itemIndex: i,
								},
							);
					}
				} else {
					const operation = this.getNodeParameter('operation', i) as string;

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
						case 'getTaskRun':
							result = await operations.getTaskRun.execute(this, i);
							break;
						case 'getTaskRunResult':
							result = await operations.getTaskRunResult.execute(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
								itemIndex: i,
							});
					}
				}

				returnData.push({ json: result, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: i },
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						error instanceof Error ? error : String(error),
						{ itemIndex: i },
					);
				}
			}
		}

		return [returnData];
	}
}
