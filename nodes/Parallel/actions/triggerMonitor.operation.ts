import type {
	IExecuteFunctions,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';
import { parallelApiRequest } from '../transport/ParallelApi';

export const description: INodePropertyOptions = {
	name: 'Trigger Monitor',
	value: 'triggerMonitor',
	description: 'Run a monitor immediately without changing its schedule',
	action: 'Trigger a monitor',
};

export async function execute(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const monitorId = executeFunctions.getNodeParameter('monitorId', itemIndex) as string;
	return await parallelApiRequest(
		executeFunctions,
		'POST',
		`/v1/monitors/${encodeURIComponent(monitorId)}/trigger`,
	);
}
