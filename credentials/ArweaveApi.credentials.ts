import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ArweaveApi implements ICredentialType {
	name = 'arweaveApi';
	displayName = 'Arweave API';
	documentationUrl = 'https://docs.arweave.org/developers/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://arweave.net',
			required: true,
			description: 'The base URL for the Arweave gateway',
		},
		{
			displayName: 'Wallet JWK',
			name: 'walletJwk',
			type: 'json',
			typeOptions: {
				password: true,
			},
			default: '{}',
			required: false,
			description: 'Arweave wallet in JWK (JSON Web Key) format. Required for write operations like data uploads and contract interactions. Leave empty for read-only operations.',
		},
	];
}