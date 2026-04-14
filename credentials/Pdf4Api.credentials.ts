import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Pdf4Api implements ICredentialType {
	name = 'pdf4Api';

	displayName = 'PDF4.dev API';

	icon: Icon = { light: 'file:../nodes/Pdf4/pdf4.svg', dark: 'file:../nodes/Pdf4/pdf4.dark.svg' };

	documentationUrl = 'https://docs.pdf4.dev/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create an API key at https://pdf4.dev/dashboard/settings. Starts with "p4_live_".',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://pdf4.dev',
			description:
				'Override only for self-hosted PDF4.dev instances. Leave as-is for the hosted service.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/templates',
			method: 'GET',
		},
	};
}
