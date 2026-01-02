/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getPrice, getNetworkInfo, arweaveApiRequest } from '../../transport/arweaveClient';
import { winstonToAR, isValidAddress, formatFileSize } from '../../utils/helpers';

export const pricingOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['pricing'],
      },
    },
    options: [
      {
        name: 'Get Price',
        value: 'getPrice',
        description: 'Get cost for data size in winston',
        action: 'Get price for data size',
      },
      {
        name: 'Get Price for Target',
        value: 'getPriceForTarget',
        description: 'Get cost including target address',
        action: 'Get price for target',
      },
      {
        name: 'Get Reward Address',
        value: 'getRewardAddress',
        description: 'Get mining reward address',
        action: 'Get reward address',
      },
      {
        name: 'Estimate Upload Cost',
        value: 'estimateUploadCost',
        description: 'Calculate cost for multiple files',
        action: 'Estimate upload cost',
      },
    ],
    default: 'getPrice',
  },
];

export const pricingFields: INodeProperties[] = [
  // Data size
  {
    displayName: 'Data Size (Bytes)',
    name: 'dataSize',
    type: 'number',
    required: true,
    default: 0,
    displayOptions: {
      show: {
        resource: ['pricing'],
        operation: ['getPrice', 'getPriceForTarget'],
      },
    },
    description: 'Size of data in bytes',
  },
  // Target address
  {
    displayName: 'Target Address',
    name: 'targetAddress',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['pricing'],
        operation: ['getPriceForTarget'],
      },
    },
    description: 'Target wallet address for transfer',
  },
  // File sizes for batch estimation
  {
    displayName: 'File Sizes',
    name: 'fileSizes',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['pricing'],
        operation: ['estimateUploadCost'],
      },
    },
    description: 'Comma-separated list of file sizes in bytes',
    placeholder: '1024, 2048, 4096',
  },
  // Include breakdown
  {
    displayName: 'Include Breakdown',
    name: 'includeBreakdown',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['pricing'],
        operation: ['estimateUploadCost'],
      },
    },
    description: 'Whether to include per-file cost breakdown',
  },
];

export async function executePricingOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getPrice': {
        const dataSize = this.getNodeParameter('dataSize', itemIndex) as number;
        
        if (dataSize < 0) {
          throw new NodeOperationError(this.getNode(), 'Data size must be non-negative');
        }
        
        const priceWinston = await getPrice(this, dataSize);
        
        returnData.push({
          json: {
            success: true,
            dataSize,
            dataSizeFormatted: formatFileSize(dataSize),
            price: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
          },
        });
        break;
      }

      case 'getPriceForTarget': {
        const dataSize = this.getNodeParameter('dataSize', itemIndex) as number;
        const targetAddress = this.getNodeParameter('targetAddress', itemIndex) as string;
        
        if (dataSize < 0) {
          throw new NodeOperationError(this.getNode(), 'Data size must be non-negative');
        }
        
        if (!isValidAddress(targetAddress)) {
          throw new NodeOperationError(this.getNode(), 'Invalid target address format');
        }
        
        const priceWinston = await getPrice(this, dataSize, targetAddress);
        
        returnData.push({
          json: {
            success: true,
            dataSize,
            dataSizeFormatted: formatFileSize(dataSize),
            targetAddress,
            price: {
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            },
          },
        });
        break;
      }

      case 'getRewardAddress': {
        const info = await getNetworkInfo(this);
        
        // Get current block to find reward address
        const currentBlock = await arweaveApiRequest(
          this,
          'GET',
          `/block/hash/${info.current}`,
        ) as { reward_addr: string };
        
        returnData.push({
          json: {
            success: true,
            rewardAddress: currentBlock.reward_addr,
            blockHeight: info.height,
            blockHash: info.current,
          },
        });
        break;
      }

      case 'estimateUploadCost': {
        const fileSizesStr = this.getNodeParameter('fileSizes', itemIndex) as string;
        const includeBreakdown = this.getNodeParameter('includeBreakdown', itemIndex, true) as boolean;
        
        const fileSizes = fileSizesStr.split(',').map((s) => {
          const size = parseInt(s.trim(), 10);
          if (isNaN(size) || size < 0) {
            throw new NodeOperationError(this.getNode(), `Invalid file size: ${s}`);
          }
          return size;
        });
        
        if (fileSizes.length === 0) {
          throw new NodeOperationError(this.getNode(), 'At least one file size is required');
        }
        
        let totalCostWinston = BigInt(0);
        let totalSize = 0;
        const breakdown: { size: number; sizeFormatted: string; winston: string; ar: string }[] = [];
        
        for (const size of fileSizes) {
          const priceWinston = await getPrice(this, size);
          totalCostWinston += BigInt(priceWinston);
          totalSize += size;
          
          if (includeBreakdown) {
            breakdown.push({
              size,
              sizeFormatted: formatFileSize(size),
              winston: priceWinston,
              ar: winstonToAR(priceWinston),
            });
          }
        }
        
        const result: { [key: string]: string | boolean | number | object | null | undefined } = {
          success: true,
          fileCount: fileSizes.length,
          totalSize,
          totalSizeFormatted: formatFileSize(totalSize),
          totalCost: {
            winston: totalCostWinston.toString(),
            ar: winstonToAR(totalCostWinston.toString()),
          },
        };
        
        if (includeBreakdown) {
          result.breakdown = breakdown;
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
