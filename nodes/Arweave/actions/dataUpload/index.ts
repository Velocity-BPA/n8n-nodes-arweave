/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { arweaveApiRequest, getCredentials, getPrice } from '../../transport/arweaveClient';
import {
  stringToBase64Url,
  bufferToBase64Url,
  calculateDataSize,
  winstonToAR,
  encodeTags,
  getContentTypeFromExtension,
} from '../../utils/helpers';
import type { ArweaveTag } from '../../types';

export const dataUploadOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['dataUpload'],
      },
    },
    options: [
      {
        name: 'Upload Data',
        value: 'uploadData',
        description: 'Store data permanently (string/buffer)',
        action: 'Upload data to Arweave',
      },
      {
        name: 'Upload File',
        value: 'uploadFile',
        description: 'Store file with Content-Type',
        action: 'Upload file to Arweave',
      },
      {
        name: 'Upload JSON',
        value: 'uploadJSON',
        description: 'Store JSON object',
        action: 'Upload JSON to Arweave',
      },
      {
        name: 'Get Upload Price',
        value: 'getUploadPrice',
        description: 'Calculate cost for data size',
        action: 'Get upload price',
      },
      {
        name: 'Batch Upload',
        value: 'batchUpload',
        description: 'Upload multiple items',
        action: 'Batch upload to Arweave',
      },
      {
        name: 'Create Data Item',
        value: 'createDataItem',
        description: 'Create bundled data item (ANS-104)',
        action: 'Create bundled data item',
      },
    ],
    default: 'uploadData',
  },
];

export const dataUploadFields: INodeProperties[] = [
  // Data for uploadData
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
        resource: ['dataUpload'],
        operation: ['uploadData', 'createDataItem'],
      },
    },
    description: 'The data to upload (string or Base64 encoded)',
  },
  // Binary data option
  {
    displayName: 'Binary Data',
    name: 'binaryData',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['uploadFile'],
      },
    },
    description: 'Whether to use binary data from previous node',
  },
  // Binary property name
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['uploadFile'],
        binaryData: [true],
      },
    },
    description: 'The name of the binary property to use',
  },
  // File data
  {
    displayName: 'File Data',
    name: 'fileData',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['uploadFile'],
        binaryData: [false],
      },
    },
    description: 'Base64 encoded file data',
  },
  // File name
  {
    displayName: 'File Name',
    name: 'fileName',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['uploadFile'],
      },
    },
    description: 'Original file name (used for Content-Type detection)',
  },
  // JSON data
  {
    displayName: 'JSON Data',
    name: 'jsonData',
    type: 'json',
    required: true,
    default: '{}',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['uploadJSON'],
      },
    },
    description: 'The JSON object to upload',
  },
  // Data size for price calculation
  {
    displayName: 'Data Size (Bytes)',
    name: 'dataSize',
    type: 'number',
    required: true,
    default: 0,
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['getUploadPrice'],
      },
    },
    description: 'The size of data in bytes',
  },
  // Batch items
  {
    displayName: 'Items',
    name: 'batchItems',
    type: 'json',
    required: true,
    default: '[]',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['batchUpload'],
      },
    },
    description: 'Array of items to upload [{data: string, contentType?: string, tags?: [{name, value}]}]',
    placeholder: '[{"data": "Hello World", "contentType": "text/plain"}]',
  },
  // Content type
  {
    displayName: 'Content Type',
    name: 'contentType',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['uploadData', 'uploadFile', 'createDataItem'],
      },
    },
    description: 'MIME type of the data (auto-detected if not specified)',
    placeholder: 'application/json',
  },
  // Tags
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
        resource: ['dataUpload'],
        operation: ['uploadData', 'uploadFile', 'uploadJSON', 'createDataItem'],
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
            displayName: 'Value',
            name: 'value',
            type: 'string',
            default: '',
            description: 'Tag value',
          },
        ],
      },
    ],
    description: 'Metadata tags to attach to the transaction',
  },
  // Target address
  {
    displayName: 'Target Address',
    name: 'targetAddress',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['dataUpload'],
        operation: ['getUploadPrice'],
      },
    },
    description: 'Optional target address for transfer (affects price)',
  },
];

export async function executeDataUploadOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'uploadData': {
        const data = this.getNodeParameter('data', itemIndex) as string;
        const contentType = this.getNodeParameter('contentType', itemIndex, 'text/plain') as string;
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagValues?: { name: string; value: string }[];
        };
        
        const dataBuffer = Buffer.from(data);
        const dataSize = dataBuffer.length;
        
        // Get price
        const priceWinston = await getPrice(this, dataSize);
        
        // Prepare tags
        const userTags: ArweaveTag[] = (tagsInput.tagValues || []).map((t) => ({
          name: t.name,
          value: t.value,
        }));
        
        // Add Content-Type tag
        userTags.push({ name: 'Content-Type', value: contentType });
        
        const encodedTags = encodeTags(userTags);
        const encodedData = bufferToBase64Url(dataBuffer);
        
        // Get credentials
        const credentials = await getCredentials(this);
        
        // Create transaction structure (simplified - in production would need proper signing)
        const txData = {
          format: 2,
          owner: credentials.jwk.n,
          target: '',
          quantity: '0',
          reward: priceWinston,
          data: encodedData,
          data_size: dataSize.toString(),
          tags: encodedTags,
        };
        
        returnData.push({
          json: {
            success: true,
            message: 'Data prepared for upload',
            dataSize,
            estimatedCost: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
            tags: userTags,
            transactionData: txData,
            note: 'Transaction requires signing before submission. Use submitTransaction operation.',
          },
        });
        break;
      }

      case 'uploadFile': {
        const binaryData = this.getNodeParameter('binaryData', itemIndex, false) as boolean;
        const fileName = this.getNodeParameter('fileName', itemIndex, '') as string;
        const contentTypeParam = this.getNodeParameter('contentType', itemIndex, '') as string;
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagValues?: { name: string; value: string }[];
        };
        
        let fileBuffer: Buffer;
        let detectedContentType: string;
        
        if (binaryData) {
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
          const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
          fileBuffer = binaryDataBuffer;
          const binaryMetadata = this.getInputData()[itemIndex].binary?.[binaryPropertyName];
          detectedContentType = binaryMetadata?.mimeType || getContentTypeFromExtension(fileName);
        } else {
          const fileData = this.getNodeParameter('fileData', itemIndex) as string;
          fileBuffer = Buffer.from(fileData, 'base64');
          detectedContentType = getContentTypeFromExtension(fileName);
        }
        
        const contentType = contentTypeParam || detectedContentType;
        const dataSize = fileBuffer.length;
        
        // Get price
        const priceWinston = await getPrice(this, dataSize);
        
        // Prepare tags
        const userTags: ArweaveTag[] = (tagsInput.tagValues || []).map((t) => ({
          name: t.name,
          value: t.value,
        }));
        
        userTags.push({ name: 'Content-Type', value: contentType });
        if (fileName) {
          userTags.push({ name: 'File-Name', value: fileName });
        }
        
        const encodedTags = encodeTags(userTags);
        const encodedData = bufferToBase64Url(fileBuffer);
        
        const credentials = await getCredentials(this);
        
        const txData = {
          format: 2,
          owner: credentials.jwk.n,
          target: '',
          quantity: '0',
          reward: priceWinston,
          data: encodedData,
          data_size: dataSize.toString(),
          tags: encodedTags,
        };
        
        returnData.push({
          json: {
            success: true,
            message: 'File prepared for upload',
            fileName,
            contentType,
            dataSize,
            estimatedCost: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
            tags: userTags,
            transactionData: txData,
          },
        });
        break;
      }

      case 'uploadJSON': {
        const jsonDataStr = this.getNodeParameter('jsonData', itemIndex) as string;
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagValues?: { name: string; value: string }[];
        };
        
        let jsonData: unknown;
        try {
          jsonData = typeof jsonDataStr === 'string' ? JSON.parse(jsonDataStr) : jsonDataStr;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid JSON data');
        }
        
        const dataString = JSON.stringify(jsonData);
        const dataBuffer = Buffer.from(dataString);
        const dataSize = dataBuffer.length;
        
        const priceWinston = await getPrice(this, dataSize);
        
        const userTags: ArweaveTag[] = (tagsInput.tagValues || []).map((t) => ({
          name: t.name,
          value: t.value,
        }));
        
        userTags.push({ name: 'Content-Type', value: 'application/json' });
        
        const encodedTags = encodeTags(userTags);
        const encodedData = stringToBase64Url(dataString);
        
        const credentials = await getCredentials(this);
        
        const txData = {
          format: 2,
          owner: credentials.jwk.n,
          target: '',
          quantity: '0',
          reward: priceWinston,
          data: encodedData,
          data_size: dataSize.toString(),
          tags: encodedTags,
        };
        
        returnData.push({
          json: {
            success: true,
            message: 'JSON prepared for upload',
            dataSize,
            estimatedCost: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
            tags: userTags,
            transactionData: txData,
          },
        });
        break;
      }

      case 'getUploadPrice': {
        const dataSize = this.getNodeParameter('dataSize', itemIndex) as number;
        const targetAddress = this.getNodeParameter('targetAddress', itemIndex, '') as string;
        
        const priceWinston = await getPrice(this, dataSize, targetAddress || undefined);
        
        returnData.push({
          json: {
            success: true,
            dataSize,
            price: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
            targetAddress: targetAddress || null,
          },
        });
        break;
      }

      case 'batchUpload': {
        const batchItemsStr = this.getNodeParameter('batchItems', itemIndex) as string;
        
        let batchItems: { data: string; contentType?: string; tags?: { name: string; value: string }[] }[];
        try {
          batchItems = typeof batchItemsStr === 'string' ? JSON.parse(batchItemsStr) : batchItemsStr;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid batch items JSON');
        }
        
        if (!Array.isArray(batchItems) || batchItems.length === 0) {
          throw new NodeOperationError(this.getNode(), 'Batch items must be a non-empty array');
        }
        
        const credentials = await getCredentials(this);
        const preparedItems = [];
        let totalSize = 0;
        let totalCostWinston = BigInt(0);
        
        for (const item of batchItems) {
          const dataBuffer = Buffer.from(item.data);
          const dataSize = dataBuffer.length;
          totalSize += dataSize;
          
          const priceWinston = await getPrice(this, dataSize);
          totalCostWinston += BigInt(priceWinston);
          
          const tags: ArweaveTag[] = (item.tags || []).map((t) => ({
            name: t.name,
            value: t.value,
          }));
          
          if (item.contentType) {
            tags.push({ name: 'Content-Type', value: item.contentType });
          }
          
          preparedItems.push({
            dataSize,
            contentType: item.contentType || 'application/octet-stream',
            tags,
            estimatedCost: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
          });
        }
        
        returnData.push({
          json: {
            success: true,
            message: 'Batch items prepared for upload',
            itemCount: batchItems.length,
            totalSize,
            totalEstimatedCost: {
              winston: totalCostWinston.toString(),
              ar: winstonToAR(totalCostWinston.toString()),
            },
            items: preparedItems,
          },
        });
        break;
      }

      case 'createDataItem': {
        const data = this.getNodeParameter('data', itemIndex) as string;
        const contentType = this.getNodeParameter('contentType', itemIndex, 'application/octet-stream') as string;
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagValues?: { name: string; value: string }[];
        };
        
        const credentials = await getCredentials(this);
        const dataBuffer = Buffer.from(data);
        
        const userTags: ArweaveTag[] = (tagsInput.tagValues || []).map((t) => ({
          name: t.name,
          value: t.value,
        }));
        
        userTags.push({ name: 'Content-Type', value: contentType });
        
        // Create ANS-104 data item structure
        const dataItem = {
          owner: credentials.jwk.n,
          target: '',
          anchor: '',
          tags: encodeTags(userTags),
          data: bufferToBase64Url(dataBuffer),
        };
        
        returnData.push({
          json: {
            success: true,
            message: 'Data item created (ANS-104)',
            dataSize: dataBuffer.length,
            tags: userTags,
            dataItem,
            note: 'Data item needs to be signed and bundled before submission',
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
