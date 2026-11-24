import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

const savedEfforts = new Map([
	['speed', 'low'],
	['lite', 'low'],
	['base', 'medium'],
	['core', 'high'],
]);

interface ResearchRequestInput {
	prompt: string;
	savedModel: string;
	systemPrompt?: unknown;
	structuredOutput?: { name: string; schema: unknown };
}

export function buildResearchRequest({
	prompt,
	savedModel,
	systemPrompt,
	structuredOutput,
}: ResearchRequestInput): IDataObject {
	if (!prompt.trim()) throw new Error('Input Prompt is required.');
	const effort = savedEfforts.get(savedModel);
	if (!effort) throw new Error(`Unknown saved model "${savedModel}". Select a Research Effort.`);

	const body: IDataObject = {
		model: 'parallel',
		input: prompt,
		reasoning: { effort },
		background: false,
		stream: false,
	};
	if (typeof systemPrompt === 'string' && systemPrompt.trim()) body.instructions = systemPrompt;
	if (structuredOutput) {
		const name = structuredOutput.name.trim();
		if (!name) throw new Error('JSON Schema Name is required.');
		const schema =
			typeof structuredOutput.schema === 'string'
				? jsonParse<unknown>(structuredOutput.schema, { errorMessage: 'Invalid JSON in schema.' })
				: structuredOutput.schema;
		if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
			throw new Error('JSON Schema must be a JSON object.');
		}
		body.text = { format: { type: 'json_schema', name, schema: schema as IDataObject } };
	}
	return body;
}

interface ResearchOutputItem {
	type: string;
	role?: string;
	status?: string;
	content?: Array<{ type: string; text?: string }>;
}

interface ResearchResponse {
	id?: string;
	created_at?: number;
	status?: 'completed' | 'failed' | 'incomplete' | 'cancelled' | 'queued' | 'in_progress';
	output?: ResearchOutputItem[];
	basis?: IDataObject[];
	error?: { code: string; message: string } | null;
	incomplete_details?: { reason?: 'max_output_tokens' | 'content_filter' | null } | null;
}

export function formatResearchResponse(data: IDataObject, savedModel: string): IDataObject {
	const response: ResearchResponse = data as ResearchResponse;
	const reference = response.id ? ` (${response.id})` : '';
	if (response.error?.message) {
		const { code, message } = response.error;
		throw new Error(`Parallel Research failed${reference} [${code}]: ${message}`);
	}
	if (response.status === 'incomplete') {
		const reason = response.incomplete_details?.reason;
		throw new Error(
			`Parallel Research returned an incomplete answer${reference}${reason ? `: ${reason}` : '.'}`,
		);
	}
	if (response.status !== 'completed') {
		throw new Error(
			`Parallel Research did not complete${reference}: ${response.status ?? 'missing status'}.`,
		);
	}

	const content = (response.output ?? [])
		.filter(
			(item) => item.type === 'message' && item.role === 'assistant' && item.status === 'completed',
		)
		.flatMap((item) => item.content ?? [])
		.filter((part) => part.type === 'output_text' && typeof part.text === 'string')
		.map((part) => part.text)
		.join('');
	if (!content.trim()) throw new Error(`Parallel Research returned no answer text${reference}.`);

	// Saved workflow expressions consume the Chat-shaped item, even in JSON mode.
	return {
		id: response.id,
		interaction_id: response.id,
		object: 'chat.completion',
		created: response.created_at,
		model: savedModel,
		choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
		basis: response.basis ?? [],
	};
}
