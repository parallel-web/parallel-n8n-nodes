import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ParallelApi implements ICredentialType {
	name = 'parallelApi';
	displayName = 'Parallel API';
	documentationUrl = 'https://docs.parallel.ai/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Parallel API key. Get it from https://platform.parallel.ai/',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.parallel.ai',
			url: '/v1beta/search',
			method: 'POST',
			body: {
				objective: 'Test connection',
				processor: 'base',
				max_results: 1,
			},
		},
	};
}