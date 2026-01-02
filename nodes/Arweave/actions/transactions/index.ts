/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  getTransaction,
  getTransactionStatus,
  getTransactionData,
  getTransactionField,
  submitTransaction,
  getPendingTransactions,
} from '../../transport/arweaveClient';
import { isValidTransactionId, decodeTags } from '../../utils/helpers';
import type { ArweaveTransaction } from '../../types';

export const transactionsOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['transactions'],
      },
    },
    options: [
      {
        name: 'Get Transaction',
        value: 'getTransaction',
        description: 'Get transaction by ID',
        action: 'Get transaction by ID',
      },
      {
        name: 'Get Transaction Status',
        value: 'getTransactionStatus',
        description: 'Get confirmation status and block info',
        action: 'Get transaction status',
      },
      {
        name: 'Get Transaction Data',
        value: 'getTransactionData',
        description: 'Retrieve stored data from transaction',
        action: 'Get transaction data',
      },
      {
        name: 'Get Transaction Tags',
        value: 'getTransactionTags',
        description: 'Get metadata tags from transaction',
        action: 'Get transaction tags',
      },
      {
        name: 'Get Transaction Field',
        value: 'getTransactionField',
        description: 'Get specific field from transaction',
        action: 'Get transaction field',
      },
      {
        name: 'Submit Transaction',
        value: 'submitTransaction',
        description: 'Post signed transaction to network',
        action: 'Submit transaction to network',
      },
      {
        name: 'Get Pending Transactions',
        value: 'getPendingTransactions',
        description: 'Get mempool transactions',
        action: 'Get pending transactions',
      },
    ],
    default: 'getTransaction',
  },
];

export const transactionsFields: INodeProperties[] = [
  // Transaction ID for get operations
  {
    displayName: 'Transaction ID',
    name: 'transactionId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['transactions'],
        operation: [
          'getTransaction',
          'getTransactionStatus',
          'getTransactionData',
          'getTransactionTags',
          'getTransactionField',
        ],
      },
    },
    description: 'The 43-character Base64URL transaction ID',
    placeholder: 'bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_s',
  },
  // Field name for getTransactionField
  {
    displayName: 'Field',
    name: 'field',
    type: 'options',
    required: true,
    default: 'owner',
    displayOptions: {
      show: {
        resource: ['transactions'],
        operation: ['getTransactionField'],
      },
    },
    options: [
      { name: 'Owner', value: 'owner' },
      { name: 'Target', value: 'target' },
      { name: 'Quantity', value: 'quantity' },
      { name: 'Reward', value: 'reward' },
      { name: 'Data Size', value: 'data_size' },
      { name: 'Data Root', value: 'data_root' },
      { name: 'Last TX', value: 'last_tx' },
    ],
    description: 'The transaction field to retrieve',
  },
  // Decode data option
  {
    displayName: 'Decode Data',
    name: 'decodeData',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['transactions'],
        operation: ['getTransactionData'],
      },
    },
    description: 'Whether to decode the data as UTF-8 string',
  },
  // Transaction object for submit
  {
    displayName: 'Transaction Object',
    name: 'transactionObject',
    type: 'json',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['transactions'],
        operation: ['submitTransaction'],
      },
    },
    description: 'The signed transaction object to submit',
    placeholder: '{"format":2,"id":"...","owner":"...","signature":"..."}',
  },
];

export async function executeTransactionsOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'getTransaction': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const transaction = await getTransaction(this, txId);
        const decodedTags = decodeTags(transaction.tags || []);
        
        returnData.push({
          json: {
            success: true,
            transaction: {
              ...transaction,
              decodedTags,
            },
          },
        });
        break;
      }

      case 'getTransactionStatus': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const status = await getTransactionStatus(this, txId);
        
        returnData.push({
          json: {
            success: true,
            transactionId: txId,
            status,
            confirmed: status.number_of_confirmations > 0,
          },
        });
        break;
      }

      case 'getTransactionData': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const decodeData = this.getNodeParameter('decodeData', itemIndex, true) as boolean;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const data = await getTransactionData(this, txId, decodeData);
        
        returnData.push({
          json: {
            success: true,
            transactionId: txId,
            data: decodeData ? data : Buffer.from(data as Buffer).toString('base64'),
            encoding: decodeData ? 'utf-8' : 'base64',
          },
        });
        break;
      }

      case 'getTransactionTags': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const transaction = await getTransaction(this, txId);
        const decodedTags = decodeTags(transaction.tags || []);
        
        returnData.push({
          json: {
            success: true,
            transactionId: txId,
            tags: decodedTags,
            rawTags: transaction.tags,
          },
        });
        break;
      }

      case 'getTransactionField': {
        const txId = this.getNodeParameter('transactionId', itemIndex) as string;
        const field = this.getNodeParameter('field', itemIndex) as string;
        
        if (!isValidTransactionId(txId)) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid transaction ID format. Must be a 43-character Base64URL string.',
          );
        }
        
        const value = await getTransactionField(this, txId, field);
        
        returnData.push({
          json: {
            success: true,
            transactionId: txId,
            field,
            value,
          },
        });
        break;
      }

      case 'submitTransaction': {
        const transactionJson = this.getNodeParameter('transactionObject', itemIndex) as string;
        
        let transaction: ArweaveTransaction;
        try {
          transaction = JSON.parse(transactionJson);
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid transaction JSON');
        }
        
        const result = await submitTransaction(this, transaction);
        
        returnData.push({
          json: {
            success: true,
            ...result,
          },
        });
        break;
      }

      case 'getPendingTransactions': {
        const pending = await getPendingTransactions(this);
        
        returnData.push({
          json: {
            success: true,
            pendingCount: pending.length,
            transactions: pending,
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
