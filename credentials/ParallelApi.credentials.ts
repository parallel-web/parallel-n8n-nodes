import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ParallelApi implements ICredentialType {
	name = 'parallelApi';
	displayName = 'Parallel API';
	icon: Icon = {
		light: 'file:../nodes/Parallel/parallel.svg',
		dark: 'file:../nodes/Parallel/parallel.dark.svg',
	};
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
			description:
				'Optional webhook secret for validating webhook signatures. Find this in Settings → Webhooks at https://platform.parallel.ai/settings',
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
			url: '/v1/search',
			method: 'POST',
			body: {
				search_queries: ['Parallel API connection test'],
				mode: 'turbo',
				advanced_settings: { max_results: 1 },
			},
		},
	};
}
