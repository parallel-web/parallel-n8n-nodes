import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';
import { buildSourcePolicy } from '../utils';

export const description: INodePropertyOptions = {
	name: 'Web Search',
	value: 'webSearch',
	description: 'Search the web with the Parallel Search API and retrieve a list of results with excerpts.',
	action: 'Web Search',
};

export async function execute(
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
