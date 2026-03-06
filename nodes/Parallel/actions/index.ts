import * as webEnrichment from './webEnrichment.operation';
import * as asyncWebEnrichment from './asyncWebEnrichment.operation';
import * as webSearch from './webSearch.operation';
import * as webChat from './webChat.operation';
import * as createMonitor from './createMonitor.operation';
import * as getMonitor from './getMonitor.operation';
import * as listMonitors from './listMonitors.operation';
import * as updateMonitor from './updateMonitor.operation';
import * as deleteMonitor from './deleteMonitor.operation';
import * as listMonitorEvents from './listMonitorEvents.operation';
import * as getMonitorEventGroup from './getMonitorEventGroup.operation';

export const operations = {
	webEnrichment,
	asyncWebEnrichment,
	webSearch,
	webChat,
	createMonitor,
	getMonitor,
	listMonitors,
	updateMonitor,
	deleteMonitor,
	listMonitorEvents,
	getMonitorEventGroup,
};

// Export operation descriptions for the node property options
export const operationDescriptions = [
	webEnrichment.description,
	asyncWebEnrichment.description,
	webSearch.description,
	webChat.description,
];

export const monitorOperationDescriptions = [
	createMonitor.description,
	getMonitor.description,
	listMonitors.description,
	updateMonitor.description,
	deleteMonitor.description,
	listMonitorEvents.description,
	getMonitorEventGroup.description,
];
