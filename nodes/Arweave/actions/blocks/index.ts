/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  getBlockByHash,
  getBlockByHeight,
  getCurrentBlock,
  getTransaction,
} from '../../transport/arweaveClient';

export const blocksOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['blocks'],
      },
    },
    options: [
      {
        name: 'Get Block by Hash',
        value: 'getBlockByHash',
        description: 'Get block by indep_hash',
        action: 'Get block by hash',
      },
      {
        name: 'Get Block by Height',
        value: 'getBlockByHeight',
        description: 'Get block by height',
        action: 'Get block by height',
      },
      {
        name: 'Get Current Block',
        value: 'getCurrentBlock',
        description: 'Get latest block',
        action: 'Get current block',
      },
      {
        name: 'Get Block Transactions',
        value: 'getBlockTransactions',
        description: 'Get transactions in block',
        action: 'Get block transactions',
      },
    ],
    default: 'getCurrentBlock',
  },
];

export const blocksFields: INodeProperties[] = [
  // Block hash
  {
    displayName: 'Block Hash',
    name: 'blockHash',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['blocks'],
        operation: ['getBlockByHash'],
      },
    },
    description: 'The block indep_hash',
  },
  // Block height
  {
    displayName: 'Block Height',
    name: 'blockHeight',
    type: 'number',
    required: true,
    default: 0,
    displayOptions: {
      show: {
        resource: ['blocks'],
        operation: ['getBlockByHeight', 'getBlockTransactions'],
      },
    },
    description: 'The block height',
  },
  // Include transaction details
  {
    displayName: 'Include Transaction Details',
    name: 'includeDetails',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['blocks'],
        operation: ['getBlockTransactions'],
      },
    },
    description: 'Whether to fetch full transaction details (slower)',
  },
  // Transaction limit
  {
    displayName: 'Transaction Limit',
    name: 'transactionLimit',
    type: 'number',
    default: 100,
    displayOptions: {
      show: {
        resource: ['blocks'],
        operation: ['getBlockTransactions'],
        includeDetails: [true],
      },
    },
    description: 'Maximum number of transaction details to fetch',
  },
];

export async function executeBlocksOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getBlockByHash': {
        const blockHash = this.getNodeParameter('blockHash', itemIndex) as string;
        
        if (!blockHash) {
          throw new NodeOperationError(this.getNode(), 'Block hash is required');
        }
        
        const block = await getBlockByHash(this, blockHash);
        
        returnData.push({
          json: {
            success: true,
            block: {
              height: block.height,
              indep_hash: block.indep_hash,
              hash: block.hash,
              timestamp: block.timestamp,
              timestampDate: new Date(block.timestamp * 1000).toISOString(),
              previous_block: block.previous_block,
              txs_count: block.txs?.length || 0,
              block_size: block.block_size,
              weave_size: block.weave_size,
              reward_addr: block.reward_addr,
              reward_pool: block.reward_pool,
            },
            transactionIds: block.txs || [],
          },
        });
        break;
      }

      case 'getBlockByHeight': {
        const blockHeight = this.getNodeParameter('blockHeight', itemIndex) as number;
        
        if (blockHeight < 0) {
          throw new NodeOperationError(this.getNode(), 'Block height must be non-negative');
        }
        
        const block = await getBlockByHeight(this, blockHeight);
        
        returnData.push({
          json: {
            success: true,
            block: {
              height: block.height,
              indep_hash: block.indep_hash,
              hash: block.hash,
              timestamp: block.timestamp,
              timestampDate: new Date(block.timestamp * 1000).toISOString(),
              previous_block: block.previous_block,
              txs_count: block.txs?.length || 0,
              block_size: block.block_size,
              weave_size: block.weave_size,
              reward_addr: block.reward_addr,
              reward_pool: block.reward_pool,
            },
            transactionIds: block.txs || [],
          },
        });
        break;
      }

      case 'getCurrentBlock': {
        const block = await getCurrentBlock(this);
        
        returnData.push({
          json: {
            success: true,
            block: {
              height: block.height,
              indep_hash: block.indep_hash,
              hash: block.hash,
              timestamp: block.timestamp,
              timestampDate: new Date(block.timestamp * 1000).toISOString(),
              previous_block: block.previous_block,
              txs_count: block.txs?.length || 0,
              block_size: block.block_size,
              weave_size: block.weave_size,
              reward_addr: block.reward_addr,
            },
            transactionIds: block.txs || [],
          },
        });
        break;
      }

      case 'getBlockTransactions': {
        const blockHeight = this.getNodeParameter('blockHeight', itemIndex) as number;
        const includeDetails = this.getNodeParameter('includeDetails', itemIndex, false) as boolean;
        
        if (blockHeight < 0) {
          throw new NodeOperationError(this.getNode(), 'Block height must be non-negative');
        }
        
        const block = await getBlockByHeight(this, blockHeight);
        const txIds = block.txs || [];
        
        let transactions: unknown[] = txIds;
        
        if (includeDetails && txIds.length > 0) {
          const limit = this.getNodeParameter('transactionLimit', itemIndex, 100) as number;
          const limitedTxIds = txIds.slice(0, limit);
          
          transactions = await Promise.all(
            limitedTxIds.map(async (txId: string) => {
              try {
                const tx = await getTransaction(this, txId);
                return {
                  ...tx,
                  id: txId,
                };
              } catch {
                return {
                  id: txId,
                  error: 'Failed to fetch transaction details',
                };
              }
            }),
          );
        }
        
        returnData.push({
          json: {
            success: true,
            blockHeight,
            blockHash: block.indep_hash,
            transactionCount: txIds.length,
            transactions: includeDetails ? transactions : txIds,
            fetchedDetails: includeDetails,
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
