import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import {
	acceptsResearchRoot,
	isSchemaObject,
	researchValueKey,
	unwrapResearchAnswer,
	wrapResearchSchema,
} from './researchSchema';

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
}: ResearchRequestInput): { body: IDataObject; wrappedOutput: boolean } {
	const hasPrompt = Boolean(prompt.trim());
	const instructions =
		typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt : undefined;
	if (!hasPrompt && !instructions) throw new Error('Input Prompt is required.');
	const effort = savedEfforts.get(savedModel);
	if (!effort) throw new Error(`Unknown saved model "${savedModel}". Select a Research Effort.`);

	const body: IDataObject = {
		model: 'parallel',
		// Preserve the legacy user turn when the system prompt carries the question.
		input: hasPrompt ? prompt : [{ role: 'user', content: prompt }],
		reasoning: { effort },
		background: false,
		stream: false,
	};
	let wrappedOutput = false;
	if (instructions) body.instructions = instructions;
	if (structuredOutput) {
		const name = structuredOutput.name.trim();
		if (!name) throw new Error('JSON Schema Name is required.');
		const schema =
			typeof structuredOutput.schema === 'string'
				? jsonParse<unknown>(structuredOutput.schema, { errorMessage: 'Invalid JSON in schema.' })
				: structuredOutput.schema;
		if (!isSchemaObject(schema)) {
			throw new Error('JSON Schema must be a JSON object.');
		}
		wrappedOutput = !acceptsResearchRoot(schema);
		body.text = {
			format: {
				type: 'json_schema',
				name,
				schema: wrappedOutput ? wrapResearchSchema(schema) : schema,
			},
		};
	}
	return { body, wrappedOutput };
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

export function formatResearchResponse(
	data: IDataObject,
	savedModel: string,
	wrappedOutput: boolean,
): IDataObject {
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

	const answer = wrappedOutput ? unwrapResearchAnswer(content, reference) : content;
	const basis = response.basis ?? [];
	const valuePrefix = `${researchValueKey}.`;
	// Saved workflow expressions consume the Chat-shaped item, even in JSON mode.
	return {
		id: response.id,
		interaction_id: response.id,
		object: 'chat.completion',
		created: response.created_at,
		model: savedModel,
		choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: answer } }],
		basis: wrappedOutput
			? basis.map((entry) => {
					const { field } = entry;
					if (field === researchValueKey) return { ...entry, field: 'output' };
					if (typeof field === 'string' && field.startsWith(valuePrefix)) {
						return { ...entry, field: field.slice(valuePrefix.length) };
					}
					return entry;
				})
			: basis,
	};
}
