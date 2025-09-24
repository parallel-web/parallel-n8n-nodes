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
		{
			displayName: 'Webhook Secret',
			name: 'webhookSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			description: 'Optional webhook secret for validating webhook signatures. Find this in Settings → Webhooks at https://platform.parallel.ai/settings',
			hint: 'Webhook validation ensures secure communication. Get your secret from platform.parallel.ai/settings',
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