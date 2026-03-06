import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { operations, operationDescriptions, monitorOperationDescriptions } from './actions';

export class Parallel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Parallel',
		name: 'parallel',
		icon: 'file:parallel.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] === "monitor" ? "Monitor / " + $parameter["monitorOperation"] : $parameter["operation"]}}',
		description: 'Highest accuracy web search tools for AI agents',
		defaults: {
			name: 'Parallel',
		},
		inputs: ['main'],
		outputs: ['main'],
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
						resource: ['task'],
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
						resource: ['task'],
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
						resource: ['task'],
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
						resource: ['task'],
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
				description: 'Processor used for the task.',
				displayOptions: {
					show: {
						resource: ['task'],
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
						resource: ['task'],
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
						resource: ['task'],
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
				required: false,
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
						resource: ['task'],
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
						description: 'Optional system prompt to define the AI\'s behavior and role',
					},
				],
			},

			// ===== MONITOR FIELDS =====

			// Create Monitor fields
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
					},
				},
				default: '',
				placeholder: 'Track funding announcements for AI startups',
				description: 'What to monitor - natural language description of the events to track on the web',
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
						name: 'Hourly',
						value: 'hourly',
						description: 'Run every hour - best for fast-moving topics',
					},
					{
						name: 'Daily',
						value: 'daily',
						description: 'Run once per day - best for most news tracking',
					},
					{
						name: 'Weekly',
						value: 'weekly',
						description: 'Run once per week - best for slower-changing topics',
					},
					{
						name: 'Every Two Weeks',
						value: 'every_two_weeks',
						description: 'Run every two weeks',
					},
				],
				default: 'daily',
			},
			{
				displayName: 'Output Schema Type',
				name: 'monitorOutputSchemaType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['monitor'],
						monitorOperation: ['createMonitor'],
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
						monitorOutputSchemaType: ['json'],
					},
				},
				default: '{\n  "type": "object",\n  "properties": {\n    "company_name": {\n      "type": "string",\n      "description": "Company name"\n    },\n    "event_summary": {\n      "type": "string",\n      "description": "Brief summary of the event"\n    },\n    "sentiment": {\n      "type": "string",\n      "description": "Sentiment: positive, negative, or neutral"\n    }\n  }\n}',
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
				description: 'Webhook URL to receive notifications when events are detected. Use the URL from a Parallel Monitor Event Trigger node.',
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
						monitorOperation: ['getMonitor', 'updateMonitor', 'deleteMonitor', 'listMonitorEvents', 'getMonitorEventGroup'],
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
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10000,
						},
						default: 20,
						description: 'Maximum number of monitors to return',
					},
					{
						displayName: 'Cursor Monitor ID',
						name: 'cursorMonitorId',
						type: 'string',
						default: '',
						description: 'Monitor ID to use as cursor for pagination (returns monitors after this ID)',
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
						displayName: 'Query',
						name: 'query',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: 'Updated monitoring query',
					},
					{
						displayName: 'Cadence',
						name: 'cadence',
						type: 'options',
						options: [
							{
								name: 'Hourly',
								value: 'hourly',
							},
							{
								name: 'Daily',
								value: 'daily',
							},
							{
								name: 'Weekly',
								value: 'weekly',
							},
							{
								name: 'Every Two Weeks',
								value: 'every_two_weeks',
							},
						],
						default: 'daily',
						description: 'Updated monitoring cadence',
					},
					{
						displayName: 'Webhook URL',
						name: 'webhookUrl',
						type: 'string',
						default: '',
						description: 'Updated webhook URL for notifications',
					},
					{
						displayName: 'Webhook Event Types',
						name: 'webhookEventTypes',
						type: 'multiOptions',
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
						description: 'Updated webhook event types',
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
						displayName: 'Lookback Period',
						name: 'lookbackPeriod',
						type: 'string',
						default: '',
						placeholder: '7d',
						description: 'How far back to look for events (e.g., 1h, 7d, 2w). Defaults to 10d.',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
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
						default:
							throw new NodeOperationError(this.getNode(), `Unknown monitor operation: ${monitorOperation}`, {
								itemIndex: i,
							});
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
						default:
							throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
								itemIndex: i,
							});
					}
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
