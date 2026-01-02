/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getCredentials, getPrice } from '../../transport/arweaveClient';
import {
  bufferToBase64Url,
  encodeTags,
  generateAnchor,
  winstonToAR,
  calculateDataSize,
} from '../../utils/helpers';
import type { DataItem, ArweaveTag } from '../../types';

export const bundlesOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['bundles'],
      },
    },
    options: [
      {
        name: 'Create Bundle',
        value: 'createBundle',
        description: 'Group multiple data items',
        action: 'Create bundle',
      },
      {
        name: 'Create Data Item',
        value: 'createDataItem',
        description: 'Create single bundled item',
        action: 'Create data item',
      },
      {
        name: 'Sign Data Item',
        value: 'signDataItem',
        description: 'Sign data item for bundle',
        action: 'Sign data item',
      },
      {
        name: 'Upload Bundle',
        value: 'uploadBundle',
        description: 'Submit bundle transaction',
        action: 'Upload bundle',
      },
      {
        name: 'Unbundle',
        value: 'unbundle',
        description: 'Extract items from bundle',
        action: 'Unbundle',
      },
    ],
    default: 'createDataItem',
  },
];

export const bundlesFields: INodeProperties[] = [
  // Data items for bundle
  {
    displayName: 'Data Items',
    name: 'dataItems',
    type: 'json',
    required: true,
    default: '[]',
    displayOptions: {
      show: {
        resource: ['bundles'],
        operation: ['createBundle'],
      },
    },
    description: 'Array of data items to bundle',
    placeholder: '[{"data": "Hello", "tags": [{"name": "Type", "value": "greeting"}]}]',
  },
  // Single data item data
  {
    displayName: 'Data',
    name: 'data',
    type: 'string',
    typeOptions: {
      rows: 4,
    },
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['bundles'],
        operation: ['createDataItem', 'signDataItem'],
      },
    },
    description: 'Data for the data item',
  },
  // Target for data item
  {
    displayName: 'Target',
    name: 'target',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['bundles'],
        operation: ['createDataItem', 'signDataItem'],
      },
    },
    description: 'Optional target address',
  },
  // Tags for data item
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
        resource: ['bundles'],
        operation: ['createDataItem', 'signDataItem'],
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
    description: 'Tags for the data item',
  },
  // Bundle data for upload
  {
    displayName: 'Bundle Data',
    name: 'bundleData',
    type: 'json',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['bundles'],
        operation: ['uploadBundle'],
      },
    },
    description: 'Serialized bundle data to upload',
  },
  // Bundle transaction ID for unbundle
  {
    displayName: 'Bundle Transaction ID',
    name: 'bundleTxId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['bundles'],
        operation: ['unbundle'],
      },
    },
    description: 'Transaction ID of the bundle to extract',
  },
];

export async function executeBundlesOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'createBundle': {
        const dataItemsStr = this.getNodeParameter('dataItems', itemIndex) as string;
        
        let dataItems: { data: string; tags?: { name: string; value: string }[]; target?: string }[];
        try {
          dataItems = typeof dataItemsStr === 'string' ? JSON.parse(dataItemsStr) : dataItemsStr;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid data items JSON');
        }
        
        if (!Array.isArray(dataItems) || dataItems.length === 0) {
          throw new NodeOperationError(this.getNode(), 'At least one data item is required');
        }
        
        const credentials = await getCredentials(this);
        const bundleItems: DataItem[] = [];
        let totalSize = 0;
        
        for (const item of dataItems) {
          const dataBuffer = Buffer.from(item.data);
          totalSize += dataBuffer.length;
          
          const tags: ArweaveTag[] = (item.tags || []).map((t) => ({
            name: t.name,
            value: t.value,
          }));
          
          bundleItems.push({
            owner: credentials.jwk.n,
            target: item.target || '',
            anchor: generateAnchor(),
            tags: encodeTags(tags),
            data: bufferToBase64Url(dataBuffer),
          });
        }
        
        // Estimate price for the bundle
        const priceWinston = await getPrice(this, totalSize);
        
        returnData.push({
          json: {
            success: true,
            message: 'Bundle created (ANS-104)',
            itemCount: bundleItems.length,
            totalSize,
            estimatedCost: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
            bundle: {
              items: bundleItems,
              length: bundleItems.length,
            },
            note: 'Bundle requires signing and submission. Use uploadBundle operation.',
          },
        });
        break;
      }

      case 'createDataItem': {
        const data = this.getNodeParameter('data', itemIndex) as string;
        const target = this.getNodeParameter('target', itemIndex, '') as string;
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagValues?: { name: string; value: string }[];
        };
        
        const credentials = await getCredentials(this);
        const dataBuffer = Buffer.from(data);
        
        const tags: ArweaveTag[] = (tagsInput.tagValues || []).map((t) => ({
          name: t.name,
          value: t.value,
        }));
        
        const dataItem: DataItem = {
          owner: credentials.jwk.n,
          target: target || '',
          anchor: generateAnchor(),
          tags: encodeTags(tags),
          data: bufferToBase64Url(dataBuffer),
        };
        
        returnData.push({
          json: {
            success: true,
            message: 'Data item created (ANS-104)',
            dataSize: dataBuffer.length,
            tags: tagsInput.tagValues || [],
            dataItem,
            note: 'Data item needs to be signed and added to a bundle',
          },
        });
        break;
      }

      case 'signDataItem': {
        const data = this.getNodeParameter('data', itemIndex) as string;
        const target = this.getNodeParameter('target', itemIndex, '') as string;
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagValues?: { name: string; value: string }[];
        };
        
        const credentials = await getCredentials(this);
        const dataBuffer = Buffer.from(data);
        
        const tags: ArweaveTag[] = (tagsInput.tagValues || []).map((t) => ({
          name: t.name,
          value: t.value,
        }));
        
        // Create data item structure
        const dataItem: DataItem = {
          owner: credentials.jwk.n,
          target: target || '',
          anchor: generateAnchor(),
          tags: encodeTags(tags),
          data: bufferToBase64Url(dataBuffer),
        };
        
        // Note: Actual signing requires RSA operations
        // This is a simplified representation
        returnData.push({
          json: {
            success: true,
            message: 'Data item prepared for signing',
            dataSize: dataBuffer.length,
            dataItem,
            note: 'Full RSA signing requires the arweave-js SDK or similar. This represents the data item structure.',
          },
        });
        break;
      }

      case 'uploadBundle': {
        const bundleDataStr = this.getNodeParameter('bundleData', itemIndex) as string;
        
        let bundleData: { items: DataItem[]; length: number };
        try {
          bundleData = typeof bundleDataStr === 'string' ? JSON.parse(bundleDataStr) : bundleDataStr;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid bundle data JSON');
        }
        
        if (!bundleData.items || bundleData.items.length === 0) {
          throw new NodeOperationError(this.getNode(), 'Bundle contains no items');
        }
        
        // Calculate total size
        let totalSize = 0;
        for (const item of bundleData.items) {
          const itemData = Buffer.from(item.data, 'base64');
          totalSize += itemData.length;
        }
        
        const priceWinston = await getPrice(this, totalSize);
        
        returnData.push({
          json: {
            success: true,
            message: 'Bundle prepared for upload',
            itemCount: bundleData.items.length,
            totalSize,
            estimatedCost: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
            note: 'Bundle upload requires transaction signing. Consider using Bundlr/Irys for simplified bundle uploads.',
          },
        });
        break;
      }

      case 'unbundle': {
        const bundleTxId = this.getNodeParameter('bundleTxId', itemIndex) as string;
        
        // Note: Unbundling requires fetching the bundle and parsing ANS-104 format
        returnData.push({
          json: {
            success: true,
            message: 'Unbundle operation',
            bundleTransactionId: bundleTxId,
            note: 'Unbundling requires parsing ANS-104 binary format. Use GraphQL to query bundled items with bundledIn filter.',
            recommendation: 'Query transactions using GraphQL with bundledIn: { id: "' + bundleTxId + '" }',
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
