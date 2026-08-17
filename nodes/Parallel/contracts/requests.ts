import type { IDataObject } from 'n8n-workflow';

export type SearchMode = 'turbo' | 'fast' | 'basic' | 'advanced';
export type MonitorType = 'event_stream' | 'snapshot';

const LEGACY_SEARCH_MODES: Record<string, SearchMode> = {
	base: 'basic',
	pro: 'advanced',
	'one-shot': 'basic',
	agentic: 'advanced',
};

const LEGACY_MONITOR_FREQUENCIES: Record<string, string> = {
	hourly: '1h',
	daily: '1d',
	weekly: '1w',
	every_two_weeks: '2w',
};

export function splitCommaSeparated(value: unknown): string[] {
	if (typeof value !== 'string') return [];
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

export function mapSearchMode(value: string): SearchMode {
	if (['turbo', 'fast', 'basic', 'advanced'].includes(value)) return value as SearchMode;
	return LEGACY_SEARCH_MODES[value] ?? 'advanced';
}

export function mapMonitorFrequency(value: string): string {
	return LEGACY_MONITOR_FREQUENCIES[value] ?? value;
}

export function encodePathSegment(value: string): string {
	return encodeURIComponent(value);
}

export function assertTaskOutputSchemaCompatibility(
	processor: string,
	outputSchemaType: string,
): void {
	if (outputSchemaType !== 'auto') return;
	const baseProcessor = processor.replace(/-fast$/, '');
	if (!['pro', 'ultra', 'ultra2x', 'ultra4x', 'ultra8x'].includes(baseProcessor)) {
		throw new Error('Auto output schema requires a Pro or Ultra processor.');
	}
}

export interface SearchRequestInput {
	objective?: string;
	mode: string;
	searchQueries?: unknown;
	maxCharsTotal?: number;
	maxCharsPerResult?: number;
	maxResults?: number;
	includeDomains?: unknown;
	excludeDomains?: unknown;
}

export function buildSearchRequest(input: SearchRequestInput): IDataObject {
	const objective = input.objective?.trim();
	const suppliedQueries = splitCommaSeparated(input.searchQueries);
	const searchQueries = suppliedQueries.length > 0 ? suppliedQueries : objective ? [objective] : [];
	if (searchQueries.length === 0) {
		throw new Error('At least one search query or objective is required.');
	}

	const body: IDataObject = {
		search_queries: searchQueries,
		mode: mapSearchMode(input.mode),
	};
	if (objective) body.objective = objective;
	if (input.maxCharsTotal) body.max_chars_total = input.maxCharsTotal;

	const advancedSettings: IDataObject = {};
	const includeDomains = splitCommaSeparated(input.includeDomains);
	const excludeDomains = splitCommaSeparated(input.excludeDomains);
	if (includeDomains.length > 0 || excludeDomains.length > 0) {
		advancedSettings.source_policy = {
			...(includeDomains.length > 0 ? { include_domains: includeDomains } : {}),
			...(excludeDomains.length > 0 ? { exclude_domains: excludeDomains } : {}),
		};
	}
	if (input.maxCharsPerResult) {
		advancedSettings.excerpt_settings = { max_chars_per_result: input.maxCharsPerResult };
	}
	if (input.maxResults) advancedSettings.max_results = input.maxResults;
	if (Object.keys(advancedSettings).length > 0) body.advanced_settings = advancedSettings;

	return body;
}

export interface MonitorCreateInput {
	type: MonitorType;
	frequency: string;
	processor?: string;
	query?: string;
	taskRunId?: string;
	outputSchema?: IDataObject;
	includeBackfill?: boolean;
	webhookUrl?: string;
	webhookEventTypes?: string[];
	metadata?: IDataObject;
}

export function buildMonitorCreateRequest(input: MonitorCreateInput): IDataObject {
	const settings: IDataObject = {};
	if (input.type === 'snapshot') {
		if (!input.taskRunId?.trim())
			throw new Error('A Task Run ID is required for snapshot monitors.');
		settings.task_run_id = input.taskRunId.trim();
	} else {
		if (!input.query?.trim()) throw new Error('A query is required for event stream monitors.');
		settings.query = input.query.trim();
		if (input.outputSchema) settings.output_schema = input.outputSchema;
		if (input.includeBackfill !== undefined) settings.include_backfill = input.includeBackfill;
	}

	const body: IDataObject = {
		type: input.type,
		frequency: mapMonitorFrequency(input.frequency),
		settings,
	};
	if (input.processor) body.processor = input.processor;
	if (input.webhookUrl?.trim()) {
		body.webhook = {
			url: input.webhookUrl.trim(),
			event_types:
				input.webhookEventTypes && input.webhookEventTypes.length > 0
					? input.webhookEventTypes
					: ['monitor.event.detected'],
		};
	}
	if (input.metadata && Object.keys(input.metadata).length > 0) body.metadata = input.metadata;
	return body;
}

export interface MonitorUpdateInput {
	query?: string;
	frequency?: string;
	webhookUrl?: string;
	webhookEventTypes?: string[];
	metadata?: IDataObject;
	clearWebhook?: boolean;
	clearMetadata?: boolean;
}

export function buildMonitorUpdateRequest(input: MonitorUpdateInput): IDataObject {
	const body: IDataObject = {};
	if (input.query?.trim()) {
		body.type = 'event_stream';
		body.settings = { query: input.query.trim() };
	}
	if (input.frequency) body.frequency = mapMonitorFrequency(input.frequency);
	if (input.clearWebhook) {
		body.webhook = null;
	} else if (input.webhookUrl?.trim()) {
		body.webhook = {
			url: input.webhookUrl.trim(),
			event_types:
				input.webhookEventTypes && input.webhookEventTypes.length > 0
					? input.webhookEventTypes
					: ['monitor.event.detected'],
		};
	}
	if (input.clearMetadata) body.metadata = null;
	else if (input.metadata && Object.keys(input.metadata).length > 0) body.metadata = input.metadata;
	if (Object.keys(body).length === 0)
		throw new Error('Select at least one monitor field to update.');
	return body;
}

export function buildMonitorEventsQuery(input: IDataObject): IDataObject {
	const query: IDataObject = {};
	if (input.eventGroupId) query.event_group_id = input.eventGroupId;
	if (input.cursor) query.cursor = input.cursor;
	if (input.limit) query.limit = input.limit;
	if (input.includeCompletions !== undefined) query.include_completions = input.includeCompletions;
	return query;
}
