import * as webEnrichment from './webEnrichment.operation';
import * as asyncWebEnrichment from './asyncWebEnrichment.operation';
import * as webSearch from './webSearch.operation';
import * as webChat from './webChat.operation';

export const operations = {
	webEnrichment,
	asyncWebEnrichment,
	webSearch,
	webChat,
};

// Export operation descriptions for the node property options
export const operationDescriptions = [
	webEnrichment.description,
	asyncWebEnrichment.description,
	webSearch.description,
	webChat.description,
];
