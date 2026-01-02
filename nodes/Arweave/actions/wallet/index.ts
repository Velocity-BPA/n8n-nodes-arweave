/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  getWalletBalance,
  getLastTransaction,
  getCredentials,
  queryTransactions,
} from '../../transport/arweaveClient';
import { winstonToAR, isValidAddress, deriveAddressFromJwk } from '../../utils/helpers';
import CryptoJS from 'crypto-js';

export const walletOperations: INodeProperties[] = [
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
        description: 'Get AR balance in winston',
        action: 'Get wallet balance',
      },
      {
        name: 'Get Wallet Address',
        value: 'getWalletAddress',
        description: 'Derive address from JWK',
        action: 'Get wallet address',
      },
      {
        name: 'Get Last Transaction',
        value: 'getLastTransaction',
        description: 'Get last outgoing transaction ID',
        action: 'Get last transaction',
      },
      {
        name: 'Generate Wallet',
        value: 'generateWallet',
        description: 'Create new JWK wallet (for reference only)',
        action: 'Generate new wallet',
      },
      {
        name: 'Get Transaction History',
        value: 'getTransactionHistory',
        description: 'Get wallet activity via GraphQL',
        action: 'Get transaction history',
      },
    ],
    default: 'getWalletBalance',
  },
];

export const walletFields: INodeProperties[] = [
  // Address for balance/history lookup
  {
    displayName: 'Address',
    name: 'address',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['wallet'],
        operation: ['getWalletBalance', 'getLastTransaction', 'getTransactionHistory'],
      },
    },
    description: 'Wallet address (leave empty to use configured wallet)',
    placeholder: '1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY',
  },
  // History limit
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 100,
    displayOptions: {
      show: {
        resource: ['wallet'],
        operation: ['getTransactionHistory'],
      },
    },
    description: 'Maximum number of transactions to return',
  },
  // Include incoming
  {
    displayName: 'Include Incoming',
    name: 'includeIncoming',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['wallet'],
        operation: ['getTransactionHistory'],
      },
    },
    description: 'Whether to include incoming transactions',
  },
  // Include outgoing
  {
    displayName: 'Include Outgoing',
    name: 'includeOutgoing',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['wallet'],
        operation: ['getTransactionHistory'],
      },
    },
    description: 'Whether to include outgoing transactions',
  },
];

export async function executeWalletOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getWalletBalance': {
        const addressParam = this.getNodeParameter('address', itemIndex, '') as string;
        const credentials = await getCredentials(this);
        const address = addressParam || credentials.address;
        
        if (addressParam && !isValidAddress(addressParam)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid wallet address format',
          );
        }
        
        const balanceWinston = await getWalletBalance(this, address);
        
        returnData.push({
          json: {
            success: true,
            address,
            balance: {
              winston: balanceWinston,
              ar: winstonToAR(balanceWinston),
            },
          },
        });
        break;
      }

      case 'getWalletAddress': {
        const credentials = await getCredentials(this);
        
        returnData.push({
          json: {
            success: true,
            address: credentials.address,
            publicKey: credentials.jwk.n,
          },
        });
        break;
      }

      case 'getLastTransaction': {
        const addressParam = this.getNodeParameter('address', itemIndex, '') as string;
        const credentials = await getCredentials(this);
        const address = addressParam || credentials.address;
        
        if (addressParam && !isValidAddress(addressParam)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid wallet address format',
          );
        }
        
        const lastTx = await getLastTransaction(this, address);
        
        returnData.push({
          json: {
            success: true,
            address,
            lastTransactionId: lastTx || null,
          },
        });
        break;
      }

      case 'generateWallet': {
        // Generate random bytes for demonstration
        // Note: This is a simplified example - real wallet generation requires RSA key pair
        const randomBytes = CryptoJS.lib.WordArray.random(32);
        const demoN = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(256));
        
        returnData.push({
          json: {
            success: true,
            message: 'Wallet generation reference',
            note: 'For security, real wallet generation should be done using the official Arweave SDK or wallet software. This is a placeholder.',
            exampleStructure: {
              kty: 'RSA',
              n: '<public_modulus>',
              e: 'AQAB',
              d: '<private_exponent>',
              p: '<prime1>',
              q: '<prime2>',
              dp: '<exponent1>',
              dq: '<exponent2>',
              qi: '<coefficient>',
            },
            recommendation: 'Use ArConnect, Arweave.app, or the Arweave JS SDK to generate a secure wallet.',
          },
        });
        break;
      }

      case 'getTransactionHistory': {
        const addressParam = this.getNodeParameter('address', itemIndex, '') as string;
        const limit = this.getNodeParameter('limit', itemIndex, 100) as number;
        const includeIncoming = this.getNodeParameter('includeIncoming', itemIndex, true) as boolean;
        const includeOutgoing = this.getNodeParameter('includeOutgoing', itemIndex, true) as boolean;
        
        const credentials = await getCredentials(this);
        const address = addressParam || credentials.address;
        
        if (addressParam && !isValidAddress(addressParam)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid wallet address format',
          );
        }
        
        const transactions: unknown[] = [];
        
        // Query outgoing transactions
        if (includeOutgoing) {
          const outgoing = await queryTransactions(this, {
            first: limit,
            owners: [address],
            sort: 'HEIGHT_DESC',
          });
          
          for (const edge of outgoing.transactions.edges) {
            transactions.push({
              ...edge.node,
              direction: 'outgoing',
            });
          }
        }
        
        // Query incoming transactions
        if (includeIncoming) {
          const incoming = await queryTransactions(this, {
            first: limit,
            recipients: [address],
            sort: 'HEIGHT_DESC',
          });
          
          for (const edge of incoming.transactions.edges) {
            transactions.push({
              ...edge.node,
              direction: 'incoming',
            });
          }
        }
        
        // Sort by block height (descending)
        transactions.sort((a: unknown, b: unknown) => {
          const blockA = (a as { block?: { height?: number } }).block?.height || 0;
          const blockB = (b as { block?: { height?: number } }).block?.height || 0;
          return blockB - blockA;
        });
        
        returnData.push({
          json: {
            success: true,
            address,
            transactionCount: transactions.length,
            transactions: transactions.slice(0, limit),
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
