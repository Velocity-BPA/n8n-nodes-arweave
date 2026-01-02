/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { graphqlRequest, getCredentials } from '../../transport/arweaveClient';
import { validateTransactionId } from '../../utils/helpers';
import type { ArNSRecord } from '../../types';

// ArNS registry contract ID (mainnet)
const ARNS_REGISTRY_CONTRACT = 'bLAgYxAdX2Ry-nt6aH2ixpkYJR--xGsoGpVfVR8faI4';
const ARNS_GATEWAY = 'https://api.arns.app';

export const arnsOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['arns'],
      },
    },
    options: [
      {
        name: 'Get ArNS Record',
        value: 'getArNSRecord',
        description: 'Lookup name record',
        action: 'Get ArNS record',
      },
      {
        name: 'Search Names',
        value: 'searchNames',
        description: 'Find available names',
        action: 'Search names',
      },
      {
        name: 'Get Name Owner',
        value: 'getNameOwner',
        description: 'Get name ownership info',
        action: 'Get name owner',
      },
      {
        name: 'Register Name',
        value: 'registerName',
        description: 'Register ArNS name (via SmartWeave)',
        action: 'Register name',
      },
    ],
    default: 'getArNSRecord',
  },
];

export const arnsFields: INodeProperties[] = [
  // Name
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['arns'],
        operation: ['getArNSRecord', 'getNameOwner', 'registerName'],
      },
    },
    description: 'The ArNS name (without .arweave.net suffix)',
  },
  // Search query
  {
    displayName: 'Search Query',
    name: 'searchQuery',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['arns'],
        operation: ['searchNames'],
      },
    },
    description: 'Search pattern for finding names',
  },
  // Check availability
  {
    displayName: 'Check Availability',
    name: 'checkAvailability',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['arns'],
        operation: ['searchNames'],
      },
    },
    description: 'Whether to check if names are available for registration',
  },
  // Target transaction ID for registration
  {
    displayName: 'Target Transaction ID',
    name: 'targetTxId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['arns'],
        operation: ['registerName'],
      },
    },
    description: 'The transaction ID to point the name to',
  },
  // Lease duration
  {
    displayName: 'Lease Years',
    name: 'leaseYears',
    type: 'number',
    default: 1,
    displayOptions: {
      show: {
        resource: ['arns'],
        operation: ['registerName'],
      },
    },
    description: 'Number of years to lease the name',
    typeOptions: {
      minValue: 1,
      maxValue: 5,
    },
  },
  // Undername support
  {
    displayName: 'Support Undernames',
    name: 'supportUndernames',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['arns'],
        operation: ['registerName'],
      },
    },
    description: 'Whether to enable undernames (subdomains) for this name',
  },
];

export async function executeArnsOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getArNSRecord': {
        const name = this.getNodeParameter('name', itemIndex) as string;
        
        if (!name) {
          throw new NodeOperationError(this.getNode(), 'Name is required');
        }

        // Clean name
        const cleanName = name.toLowerCase().replace(/\.arweave\.net$/i, '').trim();
        
        // Query ArNS gateway
        const credentials = await getCredentials(this);
        const response = await this.helpers.httpRequest({
          method: 'GET',
          url: `${ARNS_GATEWAY}/v1/contract/${ARNS_REGISTRY_CONTRACT}/records/${cleanName}`,
          headers: {
            Accept: 'application/json',
          },
          timeout: credentials.timeout,
        }) as ArNSRecord | { error?: string };

        if ('error' in response && response.error) {
          returnData.push({
            json: {
              success: false,
              name: cleanName,
              registered: false,
              error: response.error,
              arnsUrl: `https://${cleanName}.arweave.net`,
            },
          });
        } else {
          const record = response as ArNSRecord;
          returnData.push({
            json: {
              success: true,
              name: cleanName,
              registered: true,
              record: {
                transactionId: record.transactionId,
                owner: record.owner,
                type: record.type,
                startTimestamp: record.startTimestamp,
                endTimestamp: record.endTimestamp,
                undernames: record.undernames,
                purchasePrice: record.purchasePrice,
              },
              arnsUrl: `https://${cleanName}.arweave.net`,
              targetUrl: `https://arweave.net/${record.transactionId}`,
            },
          });
        }
        break;
      }

      case 'searchNames': {
        const searchQuery = this.getNodeParameter('searchQuery', itemIndex) as string;
        const checkAvailability = this.getNodeParameter('checkAvailability', itemIndex, true) as boolean;
        
        if (!searchQuery) {
          throw new NodeOperationError(this.getNode(), 'Search query is required');
        }

        // Generate name variations based on search query
        const cleanQuery = searchQuery.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const variations = [
          cleanQuery,
          `${cleanQuery}-io`,
          `${cleanQuery}-app`,
          `${cleanQuery}-xyz`,
          `the-${cleanQuery}`,
          `my-${cleanQuery}`,
        ];

        const credentials = await getCredentials(this);
        const results: Array<{ name: string; available: boolean; record?: unknown }> = [];

        if (checkAvailability) {
          for (const name of variations) {
            if (name.length >= 1 && name.length <= 51) {
              try {
                const response = await this.helpers.httpRequest({
                  method: 'GET',
                  url: `${ARNS_GATEWAY}/v1/contract/${ARNS_REGISTRY_CONTRACT}/records/${name}`,
                  headers: {
                    Accept: 'application/json',
                  },
                  timeout: credentials.timeout,
                }) as ArNSRecord | { error?: string };

                if ('error' in response) {
                  results.push({
                    name,
                    available: true,
                  });
                } else {
                  results.push({
                    name,
                    available: false,
                    record: response,
                  });
                }
              } catch {
                results.push({
                  name,
                  available: true,
                });
              }
            }
          }
        } else {
          for (const name of variations) {
            if (name.length >= 1 && name.length <= 51) {
              results.push({
                name,
                available: false,
              });
            }
          }
        }

        returnData.push({
          json: {
            success: true,
            searchQuery,
            resultCount: results.length,
            availableCount: results.filter((r) => r.available).length,
            results,
          },
        });
        break;
      }

      case 'getNameOwner': {
        const name = this.getNodeParameter('name', itemIndex) as string;
        
        if (!name) {
          throw new NodeOperationError(this.getNode(), 'Name is required');
        }

        const cleanName = name.toLowerCase().replace(/\.arweave\.net$/i, '').trim();
        
        const credentials = await getCredentials(this);
        
        try {
          const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${ARNS_GATEWAY}/v1/contract/${ARNS_REGISTRY_CONTRACT}/records/${cleanName}`,
            headers: {
              Accept: 'application/json',
            },
            timeout: credentials.timeout,
          }) as ArNSRecord;

          returnData.push({
            json: {
              success: true,
              name: cleanName,
              registered: true,
              owner: response.owner,
              type: response.type,
              expiresAt: response.endTimestamp 
                ? new Date(response.endTimestamp).toISOString() 
                : null,
              isPermanent: response.type === 'permabuy',
            },
          });
        } catch {
          returnData.push({
            json: {
              success: true,
              name: cleanName,
              registered: false,
              owner: null,
              message: 'Name is not registered',
            },
          });
        }
        break;
      }

      case 'registerName': {
        const name = this.getNodeParameter('name', itemIndex) as string;
        const targetTxId = this.getNodeParameter('targetTxId', itemIndex) as string;
        const leaseYears = this.getNodeParameter('leaseYears', itemIndex, 1) as number;
        const supportUndernames = this.getNodeParameter('supportUndernames', itemIndex, false) as boolean;
        
        if (!name) {
          throw new NodeOperationError(this.getNode(), 'Name is required');
        }
        
        if (!validateTransactionId(targetTxId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid target transaction ID');
        }

        const cleanName = name.toLowerCase().replace(/\.arweave\.net$/i, '').trim();
        
        // Validate name format
        if (!/^[a-z0-9][a-z0-9-]{0,49}[a-z0-9]$/.test(cleanName) && cleanName.length !== 1) {
          throw new NodeOperationError(
            this.getNode(),
            'Name must be 1-51 characters, alphanumeric with hyphens (not at start/end)',
          );
        }

        // Build SmartWeave interaction
        const interaction = {
          function: 'buyRecord',
          name: cleanName,
          contractTxId: targetTxId,
          years: leaseYears,
          tier: supportUndernames ? 'tier-2' : 'tier-1',
        };

        // Note: Actual registration requires signing and submitting a SmartWeave interaction
        returnData.push({
          json: {
            success: true,
            message: 'Registration interaction prepared',
            name: cleanName,
            targetTxId,
            leaseYears,
            supportUndernames,
            registryContract: ARNS_REGISTRY_CONTRACT,
            interaction,
            tags: [
              { name: 'App-Name', value: 'SmartWeaveAction' },
              { name: 'App-Version', value: '0.3.0' },
              { name: 'Contract', value: ARNS_REGISTRY_CONTRACT },
              { name: 'Input', value: JSON.stringify(interaction) },
            ],
            note: 'Submit this as a SmartWeave interaction to complete registration',
            estimatedArnsUrl: `https://${cleanName}.arweave.net`,
          },
        });
        break;
      }

      default:
        throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
    }
  } catch (error) {
    if (error instanceof NodeOperationError) {
      throw error;
    }
    throw new NodeOperationError(this.getNode(), (error as Error).message);
  }

  return returnData;
}
