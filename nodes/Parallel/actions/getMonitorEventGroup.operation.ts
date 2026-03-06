import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Get Event Group',
	value: 'getMonitorEventGroup',
	description: 'Retrieve full details of a specific event group from a monitor.',
	action: 'Get event group',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	const eventGroupId = executeFunctions.getNodeParameter('eventGroupId', itemIndex) as string;

	return await parallelApiRequest(
		executeFunctions,
		'GET',
		`/v1alpha/monitors/${monitorId}/event_groups/${eventGroupId}`,
	);
}
