/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  getTransactionData,
  getRawData,
  getTransaction,
  arweaveApiRequest,
} from '../../transport/arweaveClient';
import { isValidTransactionId, decodeTags, createArweaveUrl } from '../../utils/helpers';
import type { Manifest } from '../../types';

export const dataRetrievalOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['dataRetrieval'],
      },
    },
    options: [
      {
        name: 'Get Data by ID',
        value: 'getDataByID',
        description: 'Fetch stored data by transaction ID',
        action: 'Get data by transaction ID',
      },
      {
        name: 'Get Raw Data',
        value: 'getRawData',
        description: 'Get unprocessed bytes',
        action: 'Get raw data bytes',
      },
      {
        name: 'Get JSON Data',
        value: 'getJSONData',
        description: 'Get and parse JSON data',
        action: 'Get JSON data',
      },
      {
        name: 'Stream Data',
        value: 'streamData',
        description: 'Stream large file data',
        action: 'Stream large file data',
      },
      {
        name: 'Get Manifest Data',
        value: 'getManifestData',
        description: 'Resolve path manifest files',
        action: 'Get manifest data',
      },
    ],
    default: 'getDataByID',
  },
];

export const dataRetrievalFields: INodeProperties[] = [
  // Transaction ID
  {
    displayName: 'Transaction ID',
    name: 'transactionId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['dataRetrieval'],
        operation: ['getDataByID', 'getRawData', 'getJSONData', 'streamData', 'getManifestData'],
      },
    },
    description: 'The 43-character Base64URL transaction ID',
    placeholder: 'bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_s',
  },
  // Path for manifest resolution
  {
    displayName: 'Path',
    name: 'path',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['dataRetrieval'],
        operation: ['getManifestData'],
      },
    },
    description: 'Path to resolve within the manifest',
    placeholder: 'index.html',
  },
  // Output as binary
  {
    displayName: 'Output as Binary',
    name: 'outputBinary',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['dataRetrieval'],
        operation: ['getRawData', 'streamData'],
      },
    },
    description: 'Whether to output data as binary for downstream nodes',
  },
  // Binary property name for output
  {
    displayName: 'Binary Property Name',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    displayOptions: {
      show: {
        resource: ['dataRetrieval'],
        operation: ['getRawData', 'streamData'],
        outputBinary: [true],
      },
    },
    description: 'Name of the binary property to store data in',
  },
  // Include metadata
  {
    displayName: 'Include Metadata',
    name: 'includeMetadata',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['dataRetrieval'],
        operation: ['getDataByID', 'getJSONData'],
      },
    },
    description: 'Whether to include transaction metadata (tags, size, etc.)',
  },
];

export async function executeDataRetrievalOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getDataByID': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const includeMetadata = this.getNodeParameter('includeMetadata', itemIndex, true) as boolean;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const data = await getTransactionData(this, txId, true);
        
        const result: { [key: string]: string | boolean | number | object } = {
          success: true,
          transactionId: txId,
          data,
          url: createArweaveUrl(txId),
        };
        
        if (includeMetadata) {
          const transaction = await getTransaction(this, txId);
          const decodedTags = decodeTags(transaction.tags || []);
          result.metadata = {
            dataSize: transaction.data_size,
            owner: transaction.owner,
            tags: decodedTags,
            format: transaction.format,
          };
        }
        
        returnData.push({ json: result });
        break;
      }

      case 'getRawData': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const outputBinary = this.getNodeParameter('outputBinary', itemIndex, false) as boolean;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const rawData = await getRawData(this, txId);
        
        if (outputBinary) {
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
          const transaction = await getTransaction(this, txId);
          const decodedTags = decodeTags(transaction.tags || []);
          const contentTypeTag = decodedTags.find((t) => t.name === 'Content-Type');
          
          returnData.push({
            json: {
              success: true,
              transactionId: txId,
              dataSize: rawData.length,
            },
            binary: {
              [binaryPropertyName]: await this.helpers.prepareBinaryData(
                rawData,
                `arweave-${txId}`,
                contentTypeTag?.value || 'application/octet-stream',
              ),
            },
          });
        } else {
          returnData.push({
            json: {
              success: true,
              transactionId: txId,
              data: rawData.toString('base64'),
              encoding: 'base64',
              dataSize: rawData.length,
              url: createArweaveUrl(txId),
            },
          });
        }
        break;
      }

      case 'getJSONData': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const includeMetadata = this.getNodeParameter('includeMetadata', itemIndex, true) as boolean;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const dataString = await getTransactionData(this, txId, true) as string;
        
        let jsonData: object;
        try {
          jsonData = JSON.parse(dataString) as object;
        } catch {
          throw new NodeOperationError(
            this.getNode(),
            'Transaction data is not valid JSON',
          );
        }
        
        let result: { [key: string]: string | boolean | number | object | null | undefined } = {
          success: true,
          transactionId: txId,
          data: jsonData,
        };
        
        if (includeMetadata) {
          const transaction = await getTransaction(this, txId);
          const decodedTags = decodeTags(transaction.tags || []);
          result = {
            ...result,
            metadata: {
              dataSize: transaction.data_size,
              owner: transaction.owner,
              tags: decodedTags,
            },
          };
        }
        
        returnData.push({ json: result });
        break;
      }

      case 'streamData': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const outputBinary = this.getNodeParameter('outputBinary', itemIndex, false) as boolean;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        // For streaming, we fetch the raw data (in production, this could use chunked transfer)
        const rawData = await getRawData(this, txId);
        const transaction = await getTransaction(this, txId);
        const decodedTags = decodeTags(transaction.tags || []);
        const contentTypeTag = decodedTags.find((t) => t.name === 'Content-Type');
        
        if (outputBinary) {
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string;
          
          returnData.push({
            json: {
              success: true,
              transactionId: txId,
              dataSize: rawData.length,
              contentType: contentTypeTag?.value || 'application/octet-stream',
            },
            binary: {
              [binaryPropertyName]: await this.helpers.prepareBinaryData(
                rawData,
                `arweave-${txId}`,
                contentTypeTag?.value || 'application/octet-stream',
              ),
            },
          });
        } else {
          returnData.push({
            json: {
              success: true,
              transactionId: txId,
              data: rawData.toString('base64'),
              encoding: 'base64',
              dataSize: rawData.length,
              contentType: contentTypeTag?.value || 'application/octet-stream',
              url: createArweaveUrl(txId),
            },
          });
        }
        break;
      }

      case 'getManifestData': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const path = this.getNodeParameter('path', itemIndex, '') as string;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        // Fetch the manifest
        const manifestData = await getTransactionData(this, txId, true) as string;
        
        let manifest: Manifest;
        try {
          manifest = JSON.parse(manifestData);
        } catch {
          throw new NodeOperationError(this.getNode(), 'Transaction is not a valid manifest');
        }
        
        // Verify it's a manifest
        if (manifest.manifest !== 'arweave/paths' && manifest.manifest !== 'arweave/paths') {
          throw new NodeOperationError(this.getNode(), 'Transaction is not a path manifest');
        }
        
        let result: { [key: string]: string | boolean | number | object | null | undefined } = {
          success: true,
          manifestId: txId,
          manifest: {
            version: manifest.version,
            index: manifest.index,
            pathCount: Object.keys(manifest.paths).length,
          },
          paths: manifest.paths,
        };
        
        // Resolve specific path if provided
        if (path) {
          const resolvedPath = manifest.paths[path];
          if (resolvedPath) {
            result = {
              ...result,
              resolvedPath: {
                path,
                transactionId: resolvedPath.id,
                url: createArweaveUrl(resolvedPath.id),
              },
            };
          } else if (manifest.index && manifest.index.path === path) {
            const indexPath = manifest.paths[manifest.index.path];
            result = {
              ...result,
              resolvedPath: {
                path: manifest.index.path,
                transactionId: indexPath?.id,
                url: indexPath ? createArweaveUrl(indexPath.id) : null,
                isIndex: true,
              },
            };
          } else {
            result = {
              ...result,
              resolvedPath: null,
              error: `Path '${path}' not found in manifest`,
            };
          }
        }
        
        returnData.push({ json: result });
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
