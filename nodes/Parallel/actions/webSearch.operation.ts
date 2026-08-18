import type { IExecuteFunctions, IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildSearchRequest } from '../contracts/requests';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Web Search',
	value: 'webSearch',
	description:
		'Search the web with the Parallel Search API and retrieve a list of results with excerpts',
	action: 'Web Search',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const objective = executeFunctions.getNodeParameter('objective', itemIndex) as string;
	const mode = executeFunctions.getNodeParameter('searchProcessor', itemIndex) as string;
	const additionalFields = executeFunctions.getNodeParameter(
		'searchAdditionalFields',
		itemIndex,
		{},
	) as IDataObject;

	let body: IDataObject;
	try {
		body = buildSearchRequest({
			objective,
			mode,
			searchQueries: additionalFields.searchQueries,
			maxResults: additionalFields.maxResults as number | undefined,
			maxCharsPerResult: additionalFields.maxCharsPerResult as number | undefined,
			maxCharsTotal: additionalFields.maxCharsTotal as number | undefined,
			includeDomains: additionalFields.includeDomains,
			excludeDomains: additionalFields.excludeDomains,
		});
	} catch (error) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			error instanceof Error ? error : String(error),
			{ itemIndex },
		);
	}

	return await parallelApiRequest(executeFunctions, 'POST', '/v1/search', body);
}
