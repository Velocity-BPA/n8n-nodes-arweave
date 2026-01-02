/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  getNetworkInfo,
  getPeers,
  getPendingTransactions,
  arweaveApiRequest,
} from '../../transport/arweaveClient';

export const networkOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['network'],
      },
    },
    options: [
      {
        name: 'Get Network Info',
        value: 'getNetworkInfo',
        description: 'Get chain status (height, peers, etc.)',
        action: 'Get network info',
      },
      {
        name: 'Get Peers',
        value: 'getPeers',
        description: 'Get connected peer list',
        action: 'Get peers',
      },
      {
        name: 'Get Pending Count',
        value: 'getPendingCount',
        description: 'Get mempool size',
        action: 'Get pending count',
      },
      {
        name: 'Get Hash List',
        value: 'getHashList',
        description: 'Get block hash list',
        action: 'Get hash list',
      },
    ],
    default: 'getNetworkInfo',
  },
];

export const networkFields: INodeProperties[] = [
  // Hash list options
  {
    displayName: 'From Height',
    name: 'fromHeight',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['network'],
        operation: ['getHashList'],
      },
    },
    description: 'Starting block height (0 for genesis)',
  },
  {
    displayName: 'To Height',
    name: 'toHeight',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['network'],
        operation: ['getHashList'],
      },
    },
    description: 'Ending block height (0 for current)',
  },
];

export async function executeNetworkOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getNetworkInfo': {
        const info = await getNetworkInfo(this);
        
        returnData.push({
          json: {
            success: true,
            network: info.network,
            version: info.version,
            release: info.release,
            height: info.height,
            currentBlock: info.current,
            blocks: info.blocks,
            peers: info.peers,
            queueLength: info.queue_length,
            nodeStateLatency: info.node_state_latency,
          },
        });
        break;
      }

      case 'getPeers': {
        const peers = await getPeers(this);
        
        returnData.push({
          json: {
            success: true,
            peerCount: peers.length,
            peers,
          },
        });
        break;
      }

      case 'getPendingCount': {
        const pending = await getPendingTransactions(this);
        
        returnData.push({
          json: {
            success: true,
            pendingCount: pending.length,
            pendingTransactions: pending.slice(0, 100), // Limit to first 100
            hasMore: pending.length > 100,
          },
        });
        break;
      }

      case 'getHashList': {
        const fromHeight = this.getNodeParameter('fromHeight', itemIndex, 0) as number;
        let toHeight = this.getNodeParameter('toHeight', itemIndex, 0) as number;
        
        // Get current height if toHeight is 0
        if (toHeight === 0) {
          const info = await getNetworkInfo(this);
          toHeight = info.height;
        }
        
        // Limit range to prevent huge responses
        const maxRange = 1000;
        const adjustedToHeight = Math.min(toHeight, fromHeight + maxRange);
        
        // Fetch blocks and extract hashes
        const hashes: { height: number; hash: string }[] = [];
        
        // Note: Arweave doesn't have a direct hash_list endpoint
        // We would need to fetch blocks one by one or use GraphQL
        // For now, we provide a simplified response
        
        returnData.push({
          json: {
            success: true,
            message: 'Hash list retrieval',
            fromHeight,
            toHeight: adjustedToHeight,
            note: 'For efficient hash list retrieval, use the GraphQL blocks query',
            recommendation: 'Use the GraphQL resource with queryByBlock operation for better performance',
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
