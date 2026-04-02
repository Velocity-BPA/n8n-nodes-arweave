/**
 * Copyright (c) 2026 Velocity BPA
 * 
 * Licensed under the Business Source License 1.1 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://github.com/VelocityBPA/n8n-nodes-arweave/blob/main/LICENSE
 * 
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  NodeApiError,
} from 'n8n-workflow';

import * as crypto from 'crypto';

export class Arweave implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Arweave',
    name: 'arweave',
    icon: 'file:arweave.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with the Arweave API',
    defaults: {
      name: 'Arweave',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'arweaveApi',
        required: true,
      },
    ],
    properties: [
      // Resource selector
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Transaction',
            value: 'transaction',
          },
          {
            name: 'Data',
            value: 'data',
          },
          {
            name: 'GraphQLQuery',
            value: 'graphQLQuery',
          },
          {
            name: 'SmartWeaveContract',
            value: 'smartWeaveContract',
          },
          {
            name: 'Wallet',
            value: 'wallet',
          },
          {
            name: 'Block',
            value: 'block',
          },
          {
            name: 'GraphQL',
            value: 'graphQL',
          },
          {
            name: 'Price',
            value: 'price',
          }
        ],
        default: 'transaction',
      },
      // Operation dropdowns per resource
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['transaction'],
    },
  },
  options: [
    {
      name: 'Submit Transaction',
      value: 'submitTransaction',
      description: 'Submit a signed transaction to the network',
      action: 'Submit transaction',
    },
    {
      name: 'Get Transaction',
      value: 'getTransaction',
      description: 'Retrieve transaction details by ID',
      action: 'Get transaction details',
    },
    {
      name: 'Get Transaction Status',
      value: 'getTransactionStatus',
      description: 'Get confirmation status of transaction',
      action: 'Get transaction status',
    },
    {
      name: 'Get Transaction Data',
      value: 'getTransactionData',
      description: 'Retrieve data payload from transaction',
      action: 'Get transaction data',
    },
    {
      name: 'Get Unconfirmed Transaction',
      value: 'getUnconfirmedTransaction',
      description: 'Get pending transaction details',
      action: 'Get unconfirmed transaction',
    },
    {
      name: 'Get Transaction Anchor',
      value: 'getTransactionAnchor',
      description: 'Get last transaction anchor for new transactions',
      action: 'Get transaction anchor',
    },
    {
      name: 'Get Transaction Offset',
      value: 'getTransactionOffset',
      description: 'Get byte offset of transaction in weave',
      action: 'Get transaction offset',
    },
    {
      name: 'Create Transaction',
      value: 'createTransaction',
      description: 'Create and submit a new data transaction',
      action: 'Create transaction',
    },
  ],
  default: 'submitTransaction',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['data'],
    },
  },
  options: [
    {
      name: 'Upload Data',
      value: 'uploadData',
      description: 'Upload data permanently to Arweave network',
      action: 'Upload data to Arweave',
    },
    {
      name: 'Get Data',
      value: 'getData',
      description: 'Retrieve stored data by transaction ID',
      action: 'Get data from Arweave',
    },
    {
      name: 'Get Raw Data',
      value: 'getRawData',
      description: 'Get raw data without processing',
      action: 'Get raw data from Arweave',
    },
    {
      name: 'Upload Chunk',
      value: 'uploadChunk',
      description: 'Upload data chunk for large files',
      action: 'Upload chunk to Arweave',
    },
    {
      name: 'Get Chunk',
      value: 'getChunk',
      description: 'Retrieve data chunk by offset',
      action: 'Get chunk from Arweave',
    },
    {
      name: 'Get Data Sync Record',
      value: 'getDataSyncRecord',
      description: 'Get sync records for data replication',
      action: 'Get data sync record from Arweave',
    },
  ],
  default: 'uploadData',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
    },
  },
  options: [
    {
      name: 'Execute Query',
      value: 'executeQuery',
      description: 'Execute GraphQL queries for transactions and blocks',
      action: 'Execute GraphQL query',
    },
    {
      name: 'Get Schema',
      value: 'getSchema',
      description: 'Retrieve GraphQL schema definition',
      action: 'Get GraphQL schema',
    },
    {
      name: 'Query Transactions',
      value: 'queryTransactions',
      description: 'Query transactions with filters and pagination',
      action: 'Query transactions',
    },
    {
      name: 'Query Blocks',
      value: 'queryBlocks',
      description: 'Query blocks with height and hash filters',
      action: 'Query blocks',
    },
    {
      name: 'Get Transactions By Tags',
      value: 'getTransactionsByTags',
      description: 'Find transactions by tag name/value pairs',
      action: 'Get transactions by tags',
    },
  ],
  default: 'executeQuery',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
    },
  },
  options: [
    {
      name: 'Deploy Contract',
      value: 'deployContract',
      description: 'Deploy a new SmartWeave contract',
      action: 'Deploy a SmartWeave contract',
    },
    {
      name: 'Get Contract State',
      value: 'getContractState',
      description: 'Read the current state of a SmartWeave contract',
      action: 'Get SmartWeave contract state',
    },
    {
      name: 'Interact With Contract',
      value: 'interactWithContract',
      description: 'Submit an interaction transaction to a contract',
      action: 'Interact with SmartWeave contract',
    },
    {
      name: 'Get Contract Interactions',
      value: 'getContractInteractions',
      description: 'Get all interactions for a contract',
      action: 'Get SmartWeave contract interactions',
    },
    {
      name: 'Read Contract State',
      value: 'readContractState',
      description: 'Read contract state at a specific block height',
      action: 'Read SmartWeave contract state at block height',
    },
    {
      name: 'Get Contract Balance',
      value: 'getContractBalance',
      description: 'Get AR balance of a contract',
      action: 'Get SmartWeave contract balance',
    },
    {
      name: 'Dry Run Interaction',
      value: 'dryRunInteraction',
      description: 'Test contract interaction without submitting',
      action: 'Dry run SmartWeave contract interaction',
    },
  ],
  default: 'deployContract',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
    },
  },
  options: [
    {
      name: 'Get Wallet Balance',
      value: 'getWalletBalance',
      description: 'Get AR token balance for wallet address',
      action: 'Get wallet balance',
    },
    {
      name: 'Get Last Transaction',
      value: 'getLastTransaction',
      description: 'Get last transaction ID for wallet',
      action: 'Get last transaction',
    },
    {
      name: 'Get Wallet Transactions',
      value: 'getWalletTransactions',
      description: 'Get transaction history for wallet',
      action: 'Get wallet transactions',
    },
    {
      name: 'Get Filtered Transactions',
      value: 'getFilteredTransactions',
      description: 'Get filtered transactions for wallet',
      action: 'Get filtered transactions',
    },
    {
      name: 'Get Storage Price',
      value: 'getStoragePrice',
      description: 'Calculate storage cost in AR tokens',
      action: 'Get storage price',
    },
    {
      name: 'Get Transfer Price',
      value: 'getTransferPrice',
      description: 'Calculate transfer cost to target address',
      action: 'Get transfer price',
    },
    {
      name: 'Generate Wallet',
      value: 'generateWallet',
      description: 'Generate new Arweave wallet',
      action: 'Generate wallet',
    },
  ],
  default: 'getWalletBalance',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: {
    show: {
      resource: ['block'],
    },
  },
  options: [
    {
      name: 'Get Block by Hash',
      value: 'getBlockByHash',
      description: 'Retrieve block by its hash',
      action: 'Get block by hash',
    },
    {
      name: 'Get Block by Height',
      value: 'getBlockByHeight',
      description: 'Retrieve block by height number',
      action: 'Get block by height',
    },
    {
      name: 'Get Current Block',
      value: 'getCurrentBlock',
      description: 'Get latest block information',
      action: 'Get current block',
    },
    {
      name: 'Get Network Info',
      value: 'getNetworkInfo',
      description: 'Get network status and statistics',
      action: 'Get network info',
    },
    {
      name: 'Get Peers',
      value: 'getPeers',
      description: 'Get list of network peer nodes',
      action: 'Get peers',
    },
    {
      name: 'Get Hash List',
      value: 'getHashList',
      description: 'Get recent block hash list',
      action: 'Get hash list',
    },
    {
      name: 'Get Wallet List',
      value: 'getWalletList',
      description: 'Get wallet list at specific block',
      action: 'Get wallet list',
    },
  ],
  default: 'getBlockByHash',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['graphQL'] } },
  options: [
    { name: 'Query Transactions', value: 'queryTransactions', description: 'Query transactions with advanced GraphQL filters', action: 'Query transactions' },
    { name: 'Query Blocks', value: 'queryBlocks', description: 'Query blocks using GraphQL', action: 'Query blocks' }
  ],
  default: 'queryTransactions',
},
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['price'] } },
  options: [
    {
      name: 'Get Storage Price',
      value: 'getStoragePrice',
      description: 'Get price in AR for storing specified bytes',
      action: 'Get storage price'
    },
    {
      name: 'Get Transfer Price',
      value: 'getTransferPrice',
      description: 'Get price for data transfer to target',
      action: 'Get transfer price'
    }
  ],
  default: 'getStoragePrice',
},
      // Parameter definitions
{
  displayName: 'Transaction Data',
  name: 'transactionData',
  type: 'json',
  required: true,
  displayOptions: {
    show: {
      resource: ['transaction'],
      operation: ['submitTransaction'],
    },
  },
  default: '',
  description: 'The transaction data to submit',
},
{
  displayName: 'Signature',
  name: 'signature',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['transaction'],
      operation: ['submitTransaction'],
    },
  },
  default: '',
  description: 'The RSA-PSS signature for the transaction',
},
{
  displayName: 'Transaction ID',
  name: 'transactionId',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['transaction'],
      operation: ['getTransaction', 'getTransactionStatus', 'getTransactionData', 'getUnconfirmedTransaction', 'getTransactionOffset'],
    },
  },
  default: '',
  description: 'The ID of the transaction to retrieve',
},
{
	displayName: 'Data',
	name: 'data',
	type: 'string',
	required: true,
	displayOptions: {
		show: {
			resource: ['transaction'],
			operation: ['createTransaction'],
		},
	},
	default: '',
	description: 'The data to store in the transaction',
},
{
	displayName: 'Wallet',
	name: 'wallet',
	type: 'string',
	required: true,
	displayOptions: {
		show: {
			resource: ['transaction'],
			operation: ['createTransaction'],
		},
	},
	default: '',
	description: 'The wallet address or private key for signing the transaction',
},
{
	displayName: 'Tags',
	name: 'tags',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	displayOptions: {
		show: {
			resource: ['transaction'],
			operation: ['createTransaction'],
		},
	},
	default: {},
	options: [
		{
			name: 'tag',
			displayName: 'Tag',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
	description: 'Tags to attach to the transaction',
},
{
	displayName: 'Target',
	name: 'target',
	type: 'string',
	displayOptions: {
		show: {
			resource: ['transaction'],
			operation: ['createTransaction'],
		},
	},
	default: '',
	description: 'Target wallet address for the transaction',
},
{
	displayName: 'Quantity',
	name: 'quantity',
	type: 'string',
	displayOptions: {
		show: {
			resource: ['transaction'],
			operation: ['createTransaction'],
		},
	},
	default: '',
	description: 'Amount of AR tokens to send (in Winston)',
},
{
	displayName: 'Signed Transaction',
	name: 'signedTransaction',
	type: 'json',
	required: true,
	displayOptions: {
		show: {
			resource: ['transaction'],
			operation: ['submitTransaction'],
		},
	},
	default: '{}',
	description: 'The signed transaction object to submit',
},
{
  displayName: 'Data Payload',
  name: 'dataPayload',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadData'],
    },
  },
  default: '',
  description: 'The data to upload to Arweave',
},
{
  displayName: 'Tags',
  name: 'tags',
  type: 'collection',
  placeholder: 'Add Tag',
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadData'],
    },
  },
  default: {},
  options: [
    {
      displayName: 'Name',
      name: 'name',
      type: 'string',
      default: '',
    },
    {
      displayName: 'Value',
      name: 'value',
      type: 'string',
      default: '',
    },
  ],
  description: 'Tags to associate with the data',
},
{
  displayName: 'Target',
  name: 'target',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadData'],
    },
  },
  default: '',
  description: 'Target wallet address for the transaction',
},
{
  displayName: 'Quantity',
  name: 'quantity',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadData'],
    },
  },
  default: '0',
  description: 'Amount of AR tokens to transfer',
},
{
  displayName: 'Transaction ID',
  name: 'transactionId',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['getData', 'getRawData'],
    },
  },
  default: '',
  description: 'The transaction ID of the data to retrieve',
},
{
  displayName: 'Chunk Data',
  name: 'chunkData',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadChunk'],
    },
  },
  default: '',
  description: 'The chunk data to upload',
},
{
  displayName: 'Data Root',
  name: 'dataRoot',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadChunk'],
    },
  },
  default: '',
  description: 'The data root hash for the complete file',
},
{
  displayName: 'Data Size',
  name: 'dataSize',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadChunk'],
    },
  },
  default: 0,
  description: 'The total size of the data being chunked',
},
{
  displayName: 'Offset',
  name: 'offset',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['uploadChunk', 'getChunk'],
    },
  },
  default: 0,
  description: 'The offset position for the chunk',
},
{
  displayName: 'Start Height',
  name: 'startHeight',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['getDataSyncRecord'],
    },
  },
  default: 0,
  description: 'Starting block height for sync records',
},
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['data'],
      operation: ['getDataSyncRecord'],
    },
  },
  default: 100,
  description: 'Maximum number of records to retrieve',
},
{
  displayName: 'GraphQL Query',
  name: 'query',
  type: 'string',
  typeOptions: {
    rows: 4,
  },
  required: true,
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['executeQuery'],
    },
  },
  default: '',
  description: 'The GraphQL query to execute',
},
{
  displayName: 'Variables',
  name: 'variables',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['executeQuery'],
    },
  },
  default: '{}',
  description: 'Variables to pass to the GraphQL query',
},
{
  displayName: 'Owners',
  name: 'owners',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryTransactions'],
    },
  },
  default: '',
  description: 'Comma-separated list of owner addresses to filter by',
},
{
  displayName: 'Recipients',
  name: 'recipients',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryTransactions'],
    },
  },
  default: '',
  description: 'Comma-separated list of recipient addresses to filter by',
},
{
  displayName: 'Tags',
  name: 'tags',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryTransactions'],
    },
  },
  default: '[]',
  description: 'Array of tag objects with name and values to filter by',
},
{
  displayName: 'Block Filter',
  name: 'blockFilter',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryTransactions'],
    },
  },
  default: '{}',
  description: 'Block filter criteria',
},
{
  displayName: 'First',
  name: 'first',
  type: 'number',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryTransactions', 'queryBlocks'],
    },
  },
  default: 10,
  description: 'Number of items to return (pagination)',
},
{
  displayName: 'After',
  name: 'after',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryTransactions', 'queryBlocks'],
    },
  },
  default: '',
  description: 'Cursor for pagination',
},
{
  displayName: 'Height Filter',
  name: 'heightFilter',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryBlocks'],
    },
  },
  default: '{}',
  description: 'Block height filter criteria',
},
{
  displayName: 'Hash Filter',
  name: 'hashFilter',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['queryBlocks'],
    },
  },
  default: '',
  description: 'Block hash to filter by',
},
{
  displayName: 'Tag Filters',
  name: 'tagFilters',
  type: 'json',
  required: true,
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['getTransactionsByTags'],
    },
  },
  default: '[]',
  description: 'Array of tag filter objects with name and values',
},
{
  displayName: 'Sort Order',
  name: 'sortOrder',
  type: 'options',
  options: [
    {
      name: 'Height Ascending',
      value: 'HEIGHT_ASC',
    },
    {
      name: 'Height Descending',
      value: 'HEIGHT_DESC',
    },
  ],
  displayOptions: {
    show: {
      resource: ['graphQLQuery'],
      operation: ['getTransactionsByTags'],
    },
  },
  default: 'HEIGHT_DESC',
  description: 'Sort order for results',
},
{
  displayName: 'Contract Source',
  name: 'contractSource',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['deployContract'],
    },
  },
  default: '',
  description: 'The source code of the SmartWeave contract',
},
{
  displayName: 'Initial State',
  name: 'initialState',
  type: 'json',
  required: true,
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['deployContract'],
    },
  },
  default: '{}',
  description: 'Initial state of the contract as JSON',
},
{
  displayName: 'Contract Type',
  name: 'contractType',
  type: 'options',
  required: true,
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['deployContract'],
    },
  },
  options: [
    {
      name: 'JavaScript',
      value: 'javascript',
    },
    {
      name: 'WebAssembly',
      value: 'wasm',
    },
  ],
  default: 'javascript',
  description: 'Type of SmartWeave contract',
},
{
  displayName: 'Contract ID',
  name: 'contractId',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['getContractState', 'interactWithContract', 'getContractInteractions', 'readContractState', 'getContractBalance', 'dryRunInteraction'],
    },
  },
  default: '',
  description: 'The ID of the SmartWeave contract',
},
{
  displayName: 'Input Data',
  name: 'inputData',
  type: 'json',
  required: true,
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['interactWithContract', 'dryRunInteraction'],
    },
  },
  default: '{}',
  description: 'Input data for contract interaction as JSON',
},
{
  displayName: 'Tags',
  name: 'tags',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['interactWithContract'],
    },
  },
  default: '[]',
  description: 'Additional tags for the transaction',
},
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['getContractInteractions'],
    },
  },
  default: 10,
  description: 'Maximum number of interactions to retrieve',
},
{
  displayName: 'Sort Key',
  name: 'sortKey',
  type: 'options',
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['getContractInteractions'],
    },
  },
  options: [
    {
      name: 'Block Height',
      value: 'HEIGHT_DESC',
    },
    {
      name: 'Block Height (Ascending)',
      value: 'HEIGHT_ASC',
    },
  ],
  default: 'HEIGHT_DESC',
  description: 'How to sort the interactions',
},
{
  displayName: 'Block Height',
  name: 'blockHeight',
  type: 'number',
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['readContractState'],
    },
  },
  default: 0,
  description: 'Block height to read contract state at (0 for latest)',
},
{
  displayName: 'Caller',
  name: 'caller',
  type: 'string',
  displayOptions: {
    show: {
      resource: ['smartWeaveContract'],
      operation: ['dryRunInteraction'],
    },
  },
  default: '',
  description: 'Address of the caller for dry run',
},
{
  displayName: 'Wallet Address',
  name: 'wallet_address',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getWalletBalance'],
    },
  },
  default: '',
  description: 'The wallet address to get balance for',
},
{
  displayName: 'Wallet Address',
  name: 'wallet_address',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getLastTransaction'],
    },
  },
  default: '',
  description: 'The wallet address to get last transaction for',
},
{
  displayName: 'Wallet Address',
  name: 'wallet_address',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getWalletTransactions'],
    },
  },
  default: '',
  description: 'The wallet address to get transaction history for',
},
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  required: false,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getWalletTransactions'],
    },
  },
  default: 10,
  description: 'Maximum number of transactions to return',
},
{
  displayName: 'Offset',
  name: 'offset',
  type: 'number',
  required: false,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getWalletTransactions'],
    },
  },
  default: 0,
  description: 'Number of transactions to skip',
},
{
  displayName: 'Wallet Address',
  name: 'wallet_address',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getFilteredTransactions'],
    },
  },
  default: '',
  description: 'The wallet address to get filtered transactions for',
},
{
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  required: false,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getFilteredTransactions'],
    },
  },
  default: 10,
  description: 'Maximum number of transactions to return',
},
{
  displayName: 'Since Block',
  name: 'since_block',
  type: 'number',
  required: false,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getFilteredTransactions'],
    },
  },
  default: 0,
  description: 'Block height to filter transactions from',
},
{
  displayName: 'Data Size (Bytes)',
  name: 'data_size_bytes',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getStoragePrice'],
    },
  },
  default: 1024,
  description: 'Size of data in bytes to calculate storage price for',
},
{
  displayName: 'Data Size (Bytes)',
  name: 'data_size_bytes',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getTransferPrice'],
    },
  },
  default: 1024,
  description: 'Size of data in bytes to calculate transfer price for',
},
{
  displayName: 'Target Address',
  name: 'target_address',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getTransferPrice'],
    },
  },
  default: '',
  description: 'Target address for the transfer price calculation',
},
{
  displayName: 'Wallet Address',
  name: 'walletAddress',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getWalletBalance']
    }
  },
  default: '',
  placeholder: 'Enter wallet address',
  description: 'The Arweave wallet address to check balance for'
},
{
  displayName: 'Wallet Address',
  name: 'walletAddress',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['wallet'],
      operation: ['getLastTransaction']
    }
  },
  default: '',
  placeholder: 'Enter wallet address',
  description: 'The Arweave wallet address to get last transaction for'
},
{
  displayName: 'Block Hash',
  name: 'blockHash',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['block'],
      operation: ['getBlockByHash'],
    },
  },
  default: '',
  description: 'The block hash to retrieve',
},
{
  displayName: 'Block Height',
  name: 'blockHeight',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['block'],
      operation: ['getBlockByHeight'],
    },
  },
  default: 0,
  description: 'The block height number to retrieve',
},
{
  displayName: 'Block Hash',
  name: 'blockHashForWallet',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['block'],
      operation: ['getWalletList'],
    },
  },
  default: '',
  description: 'The block hash to get wallet list for',
},
{
  displayName: 'GraphQL Query',
  name: 'query',
  type: 'string',
  typeOptions: {
    rows: 10,
  },
  displayOptions: {
    show: {
      resource: ['graphQL'],
      operation: ['queryTransactions', 'queryBlocks'],
    },
  },
  default: '',
  required: true,
  description: 'The GraphQL query to execute',
},
{
  displayName: 'Variables',
  name: 'variables',
  type: 'json',
  displayOptions: {
    show: {
      resource: ['graphQL'],
      operation: ['queryTransactions', 'queryBlocks'],
    },
  },
  default: '{}',
  description: 'Variables to pass with the GraphQL query',
},
{
  displayName: 'Bytes',
  name: 'bytes',
  type: 'number',
  required: true,
  displayOptions: {
    show: {
      resource: ['price'],
      operation: ['getStoragePrice', 'getTransferPrice']
    }
  },
  default: 1024,
  description: 'Number of bytes for pricing calculation'
},
{
  displayName: 'Target Address',
  name: 'target',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['price'],
      operation: ['getTransferPrice']
    }
  },
  default: '',
  description: 'Target address for data transfer pricing'
},
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0) as string;

    switch (resource) {
      case 'transaction':
        return [await executeTransactionOperations.call(this, items)];
      case 'data':
        return [await executeDataOperations.call(this, items)];
      case 'graphQLQuery':
        return [await executeGraphQLQueryOperations.call(this, items)];
      case 'smartWeaveContract':
        return [await executeSmartWeaveContractOperations.call(this, items)];
      case 'wallet':
        return [await executeWalletOperations.call(this, items)];
      case 'block':
        return [await executeBlockOperations.call(this, items)];
      case 'graphQL':
        return [await executeGraphQLOperations.call(this, items)];
      case 'price':
        return [await executePriceOperations.call(this, items)];
      default:
        throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported`);
    }
  }
}

// ============================================================
// Resource Handler Functions
// ============================================================

async function executeTransactionOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('arweaveApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;
      
      switch (operation) {
        case 'submitTransaction': {
          const transactionData = this.getNodeParameter('transactionData', i) as any;
          const signature = this.getNodeParameter('signature', i) as string;
          
          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/tx`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
            body: {
              ...transactionData,
              signature: signature,
            },
            json: true,
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }
        
        case 'getTransaction': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;
          
          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl || 'https://arweave.net'}/tx/${transactionId}`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
            json: true,
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }
        
        case 'getTransactionStatus': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;
          
          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl || 'https://arweave.net'}/tx/${transactionId}/status`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
            json: true,
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }
        
        case 'getTransactionData': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;
          
          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl || 'https://arweave.net'}/tx/${transactionId}/data`,
            headers: {
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }
        
        case 'getUnconfirmedTransaction': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;
          
          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl || 'https://arweave.net'}/unconfirmed_tx/${transactionId}`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
            json: true,
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }
        
        case 'getTransactionAnchor': {
          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/tx_anchor`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
            json: true,
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }
        
        case 'getTransactionOffset': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;
          
          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl || 'https://arweave.net'}/tx/${transactionId}/offset`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': credentials.apiKey ? `Bearer ${credentials.apiKey}` : undefined,
            },
            json: true,
          };
          
          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'createTransaction': {
					const data = this.getNodeParameter('data', i) as string;
					const wallet = this.getNodeParameter('wallet', i) as string;
					const tags = this.getNodeParameter('tags.tag', i, []) as Array<{ name: string; value: string }>;
					const target = this.getNodeParameter('target', i) as string;
					const quantity = this.getNodeParameter('quantity', i) as string;

					const transactionData: any = {
						data: Buffer.from(data).toString('base64'),
						tags: tags.map((tag: any) => ({
							name: Buffer.from(tag.name).toString('base64'),
							value: Buffer.from(tag.value).toString('base64'),
						})),
					};

					if (target) {
						transactionData.target = target;
					}

					if (quantity) {
						transactionData.quantity = quantity;
					}

					const options: any = {
						method: 'POST',
						url: `${credentials.baseUrl || 'https://arweave.net'}/tx`,
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${credentials.apiKey}`,
						},
						body: transactionData,
						json: true,
					};

					result = await this.helpers.httpRequest(options) as any;
					break;
				}
        
        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
      }
      
      returnData.push({ json: result, pairedItem: { item: i } });
    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({ 
          json: { error: error.message || 'Unknown error occurred' }, 
          pairedItem: { item: i } 
        });
      } else {
        if (error.httpCode) {
          throw new NodeApiError(this.getNode(), error);
        }
        throw new NodeOperationError(this.getNode(), error.message || 'Unknown error occurred');
      }
    }
  }
  
  return returnData;
}

async function executeDataOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('arweaveApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;

      switch (operation) {
        case 'uploadData': {
          const dataPayload = this.getNodeParameter('dataPayload', i) as string;
          const tags = this.getNodeParameter('tags', i, []) as any[];
          const target = this.getNodeParameter('target', i, '') as string;
          const quantity = this.getNodeParameter('quantity', i, '0') as string;

          const transaction = {
            data: Buffer.from(dataPayload).toString('base64'),
            tags: tags.map((tag: any) => ({
              name: Buffer.from(tag.name).toString('base64'),
              value: Buffer.from(tag.value).toString('base64'),
            })),
            target: target || undefined,
            quantity: quantity,
          };

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl}/tx`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${credentials.apiKey}`,
            },
            body: JSON.stringify(transaction),
            json: false,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'getData': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;

          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl}/${transactionId}`,
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`,
            },
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'getRawData': {
          const transactionId = this.getNodeParameter('transactionId', i) as string;

          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl}/raw/${transactionId}`,
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`,
            },
            json: false,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'uploadChunk': {
          const chunkData = this.getNodeParameter('chunkData', i) as string;
          const dataRoot = this.getNodeParameter('dataRoot', i) as string;
          const dataSize = this.getNodeParameter('dataSize', i) as number;
          const offset = this.getNodeParameter('offset', i) as number;

          const chunk = {
            data_root: dataRoot,
            data_size: dataSize.toString(),
            data_path: '',
            offset: offset.toString(),
            chunk: Buffer.from(chunkData).toString('base64'),
          };

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl}/chunk`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${credentials.apiKey}`,
            },
            body: JSON.stringify(chunk),
            json: false,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'getChunk': {
          const offset = this.getNodeParameter('offset', i) as number;

          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl}/chunk/${offset}`,
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`,
            },
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'getDataSyncRecord': {
          const startHeight = this.getNodeParameter('startHeight', i) as number;
          const limit = this.getNodeParameter('limit', i) as number;

          const options: any = {
            method: 'GET',
            url: `${credentials.baseUrl}/data_sync_record/${startHeight}/${limit}`,
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`,
            },
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
      }

      returnData.push({ json: result, pairedItem: { item: i } });
    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
      } else {
        throw new NodeApiError(this.getNode(), error);
      }
    }
  }

  return returnData;
}

async function executeGraphQLQueryOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('arweaveApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;

      switch (operation) {
        case 'executeQuery': {
          const query = this.getNodeParameter('query', i) as string;
          const variables = this.getNodeParameter('variables', i) as any;

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/graphql`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: typeof variables === 'string' ? JSON.parse(variables) : variables,
            }),
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'getSchema': {
          const introspectionQuery = `
            query IntrospectionQuery {
              __schema {
                types {
                  name
                  kind
                  description
                  fields {
                    name
                    type {
                      name
                      kind
                    }
                  }
                }
              }
            }
          `;

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/graphql`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: introspectionQuery,
            }),
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'queryTransactions': {
          const owners = this.getNodeParameter('owners', i) as string;
          const recipients = this.getNodeParameter('recipients', i) as string;
          const tags = this.getNodeParameter('tags', i) as any;
          const blockFilter = this.getNodeParameter('blockFilter', i) as any;
          const first = this.getNodeParameter('first', i) as number;
          const after = this.getNodeParameter('after', i) as string;

          const queryParts: string[] = [];
          const variables: any = {};

          if (owners) {
            queryParts.push('owners: $owners');
            variables.owners = owners.split(',').map((owner: string) => owner.trim());
          }

          if (recipients) {
            queryParts.push('recipients: $recipients');
            variables.recipients = recipients.split(',').map((recipient: string) => recipient.trim());
          }

          if (tags && typeof tags === 'string') {
            queryParts.push('tags: $tags');
            variables.tags = JSON.parse(tags);
          } else if (tags && Array.isArray(tags)) {
            queryParts.push('tags: $tags');
            variables.tags = tags;
          }

          if (blockFilter && typeof blockFilter === 'string') {
            queryParts.push('block: $blockFilter');
            variables.blockFilter = JSON.parse(blockFilter);
          } else if (blockFilter && typeof blockFilter === 'object') {
            queryParts.push('block: $blockFilter');
            variables.blockFilter = blockFilter;
          }

          if (first) {
            queryParts.push('first: $first');
            variables.first = first;
          }

          if (after) {
            queryParts.push('after: $after');
            variables.after = after;
          }

          const query = `
            query GetTransactions${Object.keys(variables).length > 0 ? `(${Object.keys(variables).map(key => `$${key}: ${getGraphQLType(key)}`).join(', ')})` : ''} {
              transactions(${queryParts.join(', ')}) {
                edges {
                  cursor
                  node {
                    id
                    owner {
                      address
                    }
                    recipient
                    tags {
                      name
                      value
                    }
                    block {
                      id
                      timestamp
                      height
                    }
                    fee {
                      ar
                    }
                    quantity {
                      ar
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                }
              }
            }
          `;

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/graphql`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables,
            }),
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'queryBlocks': {
          const heightFilter = this.getNodeParameter('heightFilter', i) as any;
          const hashFilter = this.getNodeParameter('hashFilter', i) as string;
          const first = this.getNodeParameter('first', i) as number;
          const after = this.getNodeParameter('after', i) as string;

          const queryParts: string[] = [];
          const variables: any = {};

          if (heightFilter && typeof heightFilter === 'string') {
            queryParts.push('height: $heightFilter');
            variables.heightFilter = JSON.parse(heightFilter);
          } else if (heightFilter && typeof heightFilter === 'object') {
            queryParts.push('height: $heightFilter');
            variables.heightFilter = heightFilter;
          }

          if (hashFilter) {
            queryParts.push('ids: [$hashFilter]');
            variables.hashFilter = hashFilter;
          }

          if (first) {
            queryParts.push('first: $first');
            variables.first = first;
          }

          if (after) {
            queryParts.push('after: $after');
            variables.after = after;
          }

          const query = `
            query GetBlocks${Object.keys(variables).length > 0 ? `(${Object.keys(variables).map(key => `$${key}: ${getGraphQLType(key)}`).join(', ')})` : ''} {
              blocks(${queryParts.join(', ')}) {
                edges {
                  cursor
                  node {
                    id
                    timestamp
                    height
                    previous
                    miner
                    txs {
                      id
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                }
              }
            }
          `;

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/graphql`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables,
            }),
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        case 'getTransactionsByTags': {
          const tagFilters = this.getNodeParameter('tagFilters', i) as any;
          const sortOrder = this.getNodeParameter('sortOrder', i) as string;

          const parsedTagFilters = typeof tagFilters === 'string' ? JSON.parse(tagFilters) : tagFilters;

          const query = `
            query GetTransactionsByTags($tags: [TagFilter!]!, $sort: SortOrder) {
              transactions(tags: $tags, sort: $sort) {
                edges {
                  cursor
                  node {
                    id
                    owner {
                      address
                    }
                    recipient
                    tags {
                      name
                      value
                    }
                    block {
                      id
                      timestamp
                      height
                    }
                    fee {
                      ar
                    }
                    quantity {
                      ar
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                }
              }
            }
          `;

          const options: any = {
            method: 'POST',
            url: `${credentials.baseUrl || 'https://arweave.net'}/graphql`,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: {
                tags: parsedTagFilters,
                sort: sortOrder,
              },
            }),
            json: true,
          };

          result = await this.helpers.httpRequest(options) as any;
          break;
        }

        default:
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
      }

      returnData.push({ json: result, pairedItem: { item: i } });

    } catch (error: any) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },
        });
      } else {
        throw new NodeApiError(this.getNode(), error);
      }
    }
  }

  return returnData;
}

function getGraphQLType(key: string): string {
  switch (key) {
    case 'owners':
    case 'recipients':
      return '[String!]';
    case 'tags':
      return '[TagFilter!]';
    case 'blockFilter':
    case 'heightFilter':
      return 'BlockFilter';
    case 'first':
      return 'Int';
    case 'after':
    case 'hashFilter':
      return 'String';
    default:
      return 'String';
  }
}

async function executeSmartWeaveContractOperations(
  this: IExecuteFunctions,
  items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];
  const operation = this.getNodeParameter('operation', 0) as string;
  const credentials = await this.getCredentials('arweaveApi') as any;

  for (let i = 0; i < items.length; i++) {
    try {
      let result: any;

      switch (operation) {
        case 'deployContract': {
          const contractSource = this.getNodeParameter('contractSource', i) as string;
          const initialState = this.getNodeParameter('initialState', i) as any;
          const contractType = this.getNodeParameter('contractType', i) as string;

          const txData = {
            data: contractSource,
            tags: [
              { name: 'Content-Type', value: contractType === 'javascript' ? 'application/javascript' : 'application/wasm' },
              { name: 'App-Name', value: 'SmartWeaveContract' },
              { name: 'App-Version', value: '0.3.0' },
              { name: 'Contract-Src', value: contractSource },
              { name: 'Init-State', value: JSON.stringify(initialState) },
            ],
          };

          const options: any = {
            method: 'POST',
            url: `${credentials.base