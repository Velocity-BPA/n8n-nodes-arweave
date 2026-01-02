/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ArweaveJWK, GraphQLTransactionsResponse } from './types';
import { GRAPHQL_QUERIES, VELOCITY_BPA_LICENSE_NOTICE } from './constants';
import { parseJwk, deriveAddressFromJwk, decodeBase64Url, encodeBase64Url } from './utils/helpers';

// License notice logged once per node load
let licenseNoticeLogged = false;

function logLicenseNotice(): void {
  if (!licenseNoticeLogged) {
    console.warn(VELOCITY_BPA_LICENSE_NOTICE);
    licenseNoticeLogged = true;
  }
}

export class ArweaveTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Arweave Trigger',
    name: 'arweaveTrigger',
    icon: 'file:arweave.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["triggerType"]}}',
    description: 'Triggers when new Arweave events occur',
    defaults: {
      name: 'Arweave Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'arweaveApi',
        required: true,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: 'Trigger Type',
        name: 'triggerType',
        type: 'options',
        options: [
          {
            name: 'New Transaction by Tag',
            value: 'newTransactionByTag',
            description: 'Trigger when a new transaction matching tags is found',
          },
          {
            name: 'New Transaction by Owner',
            value: 'newTransactionByOwner',
            description: 'Trigger when a new transaction from an address is found',
          },
          {
            name: 'Block Mined',
            value: 'blockMined',
            description: 'Trigger when a new block is produced',
          },
          {
            name: 'Large Upload Detected',
            value: 'largeUploadDetected',
            description: 'Trigger when an upload above size threshold is detected',
          },
          {
            name: 'Contract State Changed',
            value: 'contractStateChanged',
            description: 'Trigger when a SmartWeave contract has new interactions',
          },
        ],
        default: 'newTransactionByTag',
      },
      // Tag filters
      {
        displayName: 'Tags',
        name: 'tags',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        displayOptions: {
          show: {
            triggerType: ['newTransactionByTag'],
          },
        },
        options: [
          {
            name: 'tagValues',
            displayName: 'Tag',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                description: 'Tag name',
              },
              {
                displayName: 'Values',
                name: 'values',
                type: 'string',
                default: '',
                description: 'Tag values (comma-separated)',
              },
            ],
          },
        ],
        description: 'Tags to filter transactions',
      },
      // Owner address
      {
        displayName: 'Owner Address',
        name: 'ownerAddress',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            triggerType: ['newTransactionByOwner'],
          },
        },
        description: 'Wallet address to monitor (leave empty to use your wallet)',
      },
      // Size threshold
      {
        displayName: 'Size Threshold (bytes)',
        name: 'sizeThreshold',
        type: 'number',
        default: 10485760,
        displayOptions: {
          show: {
            triggerType: ['largeUploadDetected'],
          },
        },
        description: 'Minimum size in bytes to trigger (default 10MB)',
      },
      // Contract ID
      {
        displayName: 'Contract ID',
        name: 'contractId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            triggerType: ['contractStateChanged'],
          },
        },
        description: 'SmartWeave contract ID to monitor',
      },
      // Limit
      {
        displayName: 'Max Results per Poll',
        name: 'limit',
        type: 'number',
        default: 10,
        description: 'Maximum number of items to return per poll',
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    logLicenseNotice();
    
    const triggerType = this.getNodeParameter('triggerType') as string;
    const limit = this.getNodeParameter('limit', 10) as number;
    const webhookData = this.getWorkflowStaticData('node');
    const credentials = await this.getCredentials('arweaveApi');
    
    const gatewayUrl = (credentials.gatewayUrl as string) || 'https://arweave.net';
    const graphqlUrl = (credentials.graphqlEndpoint as string) || `${gatewayUrl}/graphql`;
    const timeout = (credentials.timeout as number) || 30000;
    
    // Parse JWK for wallet address
    let walletAddress = '';
    if (credentials.walletJwk) {
      try {
        const jwk = parseJwk(credentials.walletJwk as string);
        walletAddress = deriveAddressFromJwk(jwk);
      } catch {
        // Wallet not available
      }
    }
    
    const returnData: INodeExecutionData[] = [];
    
    try {
      switch (triggerType) {
        case 'newTransactionByTag': {
          const tagsData = this.getNodeParameter('tags', {}) as {
            tagValues?: Array<{ name: string; values: string }>;
          };
          
          const tags = (tagsData.tagValues || []).map((t) => ({
            name: t.name,
            values: t.values.split(',').map((v) => v.trim()),
          }));
          
          if (tags.length === 0) {
            throw new NodeOperationError(this.getNode(), 'At least one tag is required');
          }
          
          const query = `
            query GetTransactionsByTag($tags: [TagFilter!]!, $first: Int, $after: String) {
              transactions(first: $first, after: $after, tags: $tags, sort: HEIGHT_DESC) {
                edges {
                  cursor
                  node {
                    id
                    owner { address }
                    block { height timestamp }
                    tags { name value }
                    data { size }
                  }
                }
              }
            }
          `;
          
          const response = await this.helpers.httpRequest({
            method: 'POST',
            url: graphqlUrl,
            headers: { 'Content-Type': 'application/json' },
            body: { query, variables: { tags, first: limit } },
            timeout,
          }) as { data: GraphQLTransactionsResponse };
          
          const lastProcessedId = webhookData.lastProcessedId as string | undefined;
          const transactions = response.data.transactions.edges;
          
          for (const edge of transactions) {
            if (lastProcessedId && edge.node.id === lastProcessedId) {
              break;
            }
            
            const decodedTags = edge.node.tags.map((t) => ({
              name: decodeBase64Url(t.name),
              value: decodeBase64Url(t.value),
            }));
            
            returnData.push({
              json: {
                id: edge.node.id,
                owner: edge.node.owner.address,
                block: edge.node.block,
                tags: decodedTags,
                dataSize: edge.node.data?.size,
              },
            });
          }
          
          if (transactions.length > 0) {
            webhookData.lastProcessedId = transactions[0].node.id;
          }
          break;
        }

        case 'newTransactionByOwner': {
          let ownerAddress = this.getNodeParameter('ownerAddress', '') as string;
          if (!ownerAddress && walletAddress) {
            ownerAddress = walletAddress;
          }
          
          if (!ownerAddress) {
            throw new NodeOperationError(this.getNode(), 'Owner address is required');
          }
          
          const query = `
            query GetTransactionsByOwner($owners: [String!]!, $first: Int) {
              transactions(first: $first, owners: $owners, sort: HEIGHT_DESC) {
                edges {
                  cursor
                  node {
                    id
                    owner { address }
                    recipient
                    block { height timestamp }
                    tags { name value }
                    data { size }
                    quantity { ar winston }
                  }
                }
              }
            }
          `;
          
          const response = await this.helpers.httpRequest({
            method: 'POST',
            url: graphqlUrl,
            headers: { 'Content-Type': 'application/json' },
            body: { query, variables: { owners: [ownerAddress], first: limit } },
            timeout,
          }) as { data: GraphQLTransactionsResponse };
          
          const lastProcessedId = webhookData.lastProcessedId as string | undefined;
          const transactions = response.data.transactions.edges;
          
          for (const edge of transactions) {
            if (lastProcessedId && edge.node.id === lastProcessedId) {
              break;
            }
            
            const decodedTags = edge.node.tags.map((t) => ({
              name: decodeBase64Url(t.name),
              value: decodeBase64Url(t.value),
            }));
            
            returnData.push({
              json: {
                id: edge.node.id,
                owner: edge.node.owner.address,
                recipient: edge.node.recipient,
                block: edge.node.block,
                tags: decodedTags,
                dataSize: edge.node.data?.size,
                quantity: edge.node.quantity,
              },
            });
          }
          
          if (transactions.length > 0) {
            webhookData.lastProcessedId = transactions[0].node.id;
          }
          break;
        }

        case 'blockMined': {
          const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${gatewayUrl}/info`,
            timeout,
          }) as { height: number; current: string };
          
          const lastHeight = webhookData.lastHeight as number | undefined;
          const currentHeight = response.height;
          
          if (lastHeight === undefined || currentHeight > lastHeight) {
            // Get block info
            const blockResponse = await this.helpers.httpRequest({
              method: 'GET',
              url: `${gatewayUrl}/block/hash/${response.current}`,
              timeout,
            }) as { height: number; indep_hash: string; timestamp: number; txs: string[]; block_size: number };
            
            if (lastHeight === undefined) {
              // First run - just store the height
              webhookData.lastHeight = currentHeight;
            } else {
              // Return new blocks
              for (let h = lastHeight + 1; h <= Math.min(currentHeight, lastHeight + limit); h++) {
                const blockInfo = await this.helpers.httpRequest({
                  method: 'GET',
                  url: `${gatewayUrl}/block/height/${h}`,
                  timeout,
                }) as { height: number; indep_hash: string; timestamp: number; txs: string[]; block_size: number };
                
                returnData.push({
                  json: {
                    height: blockInfo.height,
                    hash: blockInfo.indep_hash,
                    timestamp: blockInfo.timestamp,
                    timestampDate: new Date(blockInfo.timestamp * 1000).toISOString(),
                    transactionCount: blockInfo.txs?.length || 0,
                    blockSize: blockInfo.block_size,
                  },
                });
              }
              webhookData.lastHeight = currentHeight;
            }
          }
          break;
        }

        case 'largeUploadDetected': {
          const sizeThreshold = this.getNodeParameter('sizeThreshold', 10485760) as number;
          
          const query = `
            query GetLargeUploads($minSize: Int!, $first: Int) {
              transactions(first: $first, sort: HEIGHT_DESC) {
                edges {
                  node {
                    id
                    owner { address }
                    block { height timestamp }
                    tags { name value }
                    data { size }
                  }
                }
              }
            }
          `;
          
          const response = await this.helpers.httpRequest({
            method: 'POST',
            url: graphqlUrl,
            headers: { 'Content-Type': 'application/json' },
            body: { query, variables: { minSize: sizeThreshold, first: 100 } },
            timeout,
          }) as { data: GraphQLTransactionsResponse };
          
          const lastProcessedId = webhookData.lastProcessedId as string | undefined;
          const transactions = response.data.transactions.edges.filter(
            (edge) => edge.node.data && parseInt(edge.node.data.size, 10) >= sizeThreshold,
          );
          
          for (const edge of transactions.slice(0, limit)) {
            if (lastProcessedId && edge.node.id === lastProcessedId) {
              break;
            }
            
            const decodedTags = edge.node.tags.map((t) => ({
              name: decodeBase64Url(t.name),
              value: decodeBase64Url(t.value),
            }));
            
            const contentTypeTag = decodedTags.find((t) => t.name === 'Content-Type');
            
            returnData.push({
              json: {
                id: edge.node.id,
                owner: edge.node.owner.address,
                block: edge.node.block,
                dataSize: parseInt(edge.node.data?.size || '0', 10),
                contentType: contentTypeTag?.value || 'unknown',
                tags: decodedTags,
              },
            });
          }
          
          if (transactions.length > 0) {
            webhookData.lastProcessedId = transactions[0].node.id;
          }
          break;
        }

        case 'contractStateChanged': {
          const contractId = this.getNodeParameter('contractId') as string;
          
          const query = `
            query GetContractInteractions($contractId: ID!, $first: Int) {
              transactions(
                first: $first
                sort: HEIGHT_DESC
                tags: [
                  { name: "App-Name", values: ["SmartWeaveAction"] }
                  { name: "Contract", values: [$contractId] }
                ]
              ) {
                edges {
                  node {
                    id
                    owner { address }
                    block { height timestamp }
                    tags { name value }
                  }
                }
              }
            }
          `;
          
          const response = await this.helpers.httpRequest({
            method: 'POST',
            url: graphqlUrl,
            headers: { 'Content-Type': 'application/json' },
            body: { query, variables: { contractId, first: limit } },
            timeout,
          }) as { data: GraphQLTransactionsResponse };
          
          const lastProcessedId = webhookData.lastProcessedId as string | undefined;
          const interactions = response.data.transactions.edges;
          
          for (const edge of interactions) {
            if (lastProcessedId && edge.node.id === lastProcessedId) {
              break;
            }
            
            const decodedTags = edge.node.tags.map((t) => ({
              name: decodeBase64Url(t.name),
              value: decodeBase64Url(t.value),
            }));
            
            const inputTag = decodedTags.find((t) => t.name === 'Input');
            let input = {};
            if (inputTag) {
              try {
                input = JSON.parse(inputTag.value);
              } catch {
                input = { raw: inputTag.value };
              }
            }
            
            returnData.push({
              json: {
                interactionId: edge.node.id,
                contractId,
                caller: edge.node.owner.address,
                block: edge.node.block,
                input,
                tags: decodedTags,
              },
            });
          }
          
          if (interactions.length > 0) {
            webhookData.lastProcessedId = interactions[0].node.id;
          }
          break;
        }

        default:
          throw new NodeOperationError(this.getNode(), `Unknown trigger type: ${triggerType}`);
      }
    } catch (error) {
      throw new NodeOperationError(this.getNode(), (error as Error).message);
    }
    
    if (returnData.length === 0) {
      return null;
    }
    
    return [returnData];
  }
}
