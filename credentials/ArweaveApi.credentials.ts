/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

export class ArweaveApi implements ICredentialType {
  name = 'arweaveApi';
  displayName = 'Arweave API';
  documentationUrl = 'https://docs.arweave.org';
  icon: Icon = 'file:arweave.svg';

  properties: INodeProperties[] = [
    {
      displayName: 'Wallet JWK',
      name: 'walletJwk',
      type: 'json',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description:
        'Your Arweave wallet JSON Web Key (JWK). This is a JSON object containing your private key.',
      placeholder: '{"kty":"RSA","n":"...","e":"...","d":"..."}',
    },
    {
      displayName: 'Gateway URL',
      name: 'gatewayUrl',
      type: 'string',
      default: 'https://arweave.net',
      required: true,
      description: 'The Arweave gateway URL to use for API calls',
      placeholder: 'https://arweave.net',
    },
    {
      displayName: 'GraphQL Endpoint',
      name: 'graphqlEndpoint',
      type: 'string',
      default: 'https://arweave.net/graphql',
      required: false,
      description: 'The GraphQL endpoint for advanced queries',
    },
    {
      displayName: 'Bundlr/Irys Endpoint',
      name: 'bundlrEndpoint',
      type: 'string',
      default: '',
      required: false,
      description:
        'Optional Bundlr/Irys endpoint for bundled uploads (e.g., https://node2.bundlr.network)',
      placeholder: 'https://node2.bundlr.network',
    },
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      options: [
        {
          name: 'Mainnet',
          value: 'mainnet',
        },
        {
          name: 'Testnet',
          value: 'testnet',
        },
      ],
      default: 'mainnet',
      description: 'The Arweave network to connect to',
    },
    {
      displayName: 'Request Timeout',
      name: 'timeout',
      type: 'number',
      default: 60000,
      description: 'Request timeout in milliseconds',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.gatewayUrl}}',
      url: '/info',
      method: 'GET',
      timeout: 10000,
    },
  };
}
