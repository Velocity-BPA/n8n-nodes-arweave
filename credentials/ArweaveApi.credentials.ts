import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ArweaveApi implements ICredentialType {
	name = 'arweaveApi';
	displayName = 'Arweave API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://arweave.net',
			required: true,
			description: 'The base URL of the Arweave node',
		},
		{
			displayName: 'Wallet Keyfile',
			name: 'walletKeyfile',
			type: 'json',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			default: '',
			required: false,
			description: 'Arweave wallet JSON keyfile for signing transactions. Required only for write operations.',
		},
		{
			displayName: 'Use Custom Headers',
			name: 'useCustomHeaders',
			type: 'boolean',
			default: false,
			description: 'Whether to include custom headers in requests',
		},
		{
			displayName: 'Custom Headers',
			name: 'customHeaders',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					useCustomHeaders: [true],
				},
			},
			default: {},
			options: [
				{
					name: 'header',
					displayName: 'Header',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							description: 'Header name',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Header value',
						},
					],
				},
			],
		},
	];
}