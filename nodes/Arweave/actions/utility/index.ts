/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { checkGatewayHealth, getCredentials } from '../../transport/arweaveClient';
import {
  validateTransactionId,
  winstonToAr,
  arToWinston,
  signMessage,
  verifySignature,
  formatFileSize,
} from '../../utils/helpers';
import { ARWEAVE_CONSTANTS } from '../../constants';

export const utilityOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['utility'],
      },
    },
    options: [
      {
        name: 'Validate Transaction ID',
        value: 'validateTransactionID',
        description: 'Check ID format validity',
        action: 'Validate transaction ID',
      },
      {
        name: 'Winston to AR',
        value: 'winstonToAR',
        description: 'Convert winston to AR',
        action: 'Convert winston to AR',
      },
      {
        name: 'AR to Winston',
        value: 'arToWinston',
        description: 'Convert AR to winston',
        action: 'Convert AR to winston',
      },
      {
        name: 'Sign Message',
        value: 'signMessage',
        description: 'Create signature with JWK',
        action: 'Sign message',
      },
      {
        name: 'Verify Signature',
        value: 'verifySignature',
        description: 'Verify message signature',
        action: 'Verify signature',
      },
      {
        name: 'Get API Health',
        value: 'getAPIHealth',
        description: 'Check gateway status',
        action: 'Get API health',
      },
    ],
    default: 'getAPIHealth',
  },
];

export const utilityFields: INodeProperties[] = [
  // Transaction ID for validation
  {
    displayName: 'Transaction ID',
    name: 'transactionId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['validateTransactionID'],
      },
    },
    description: 'The transaction ID to validate',
  },
  // Winston amount
  {
    displayName: 'Winston Amount',
    name: 'winstonAmount',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['winstonToAR'],
      },
    },
    description: 'Amount in winston to convert',
  },
  // AR amount
  {
    displayName: 'AR Amount',
    name: 'arAmount',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['arToWinston'],
      },
    },
    description: 'Amount in AR to convert',
  },
  // Message to sign
  {
    displayName: 'Message',
    name: 'message',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['signMessage'],
      },
    },
    description: 'The message to sign',
    typeOptions: {
      rows: 4,
    },
  },
  // Message to verify
  {
    displayName: 'Message',
    name: 'verifyMessage',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['verifySignature'],
      },
    },
    description: 'The original message',
    typeOptions: {
      rows: 4,
    },
  },
  // Signature to verify
  {
    displayName: 'Signature',
    name: 'signature',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['verifySignature'],
      },
    },
    description: 'The signature to verify (Base64URL encoded)',
  },
  // Public key for verification
  {
    displayName: 'Public Key (n)',
    name: 'publicKey',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['utility'],
        operation: ['verifySignature'],
      },
    },
    description: 'The public key modulus (n) from JWK (Base64URL encoded)',
  },
];

export async function executeUtilityOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'validateTransactionID': {
        const transactionId = this.getNodeParameter('transactionId', itemIndex) as string;
        
        const isValid = validateTransactionId(transactionId);
        const issues: string[] = [];
        
        if (!transactionId) {
          issues.push('Transaction ID is empty');
        } else {
          if (transactionId.length !== ARWEAVE_CONSTANTS.TX_ID_LENGTH) {
            issues.push(`Length should be ${ARWEAVE_CONSTANTS.TX_ID_LENGTH}, got ${transactionId.length}`);
          }
          if (!/^[A-Za-z0-9_-]+$/.test(transactionId)) {
            issues.push('Contains invalid Base64URL characters');
          }
        }
        
        returnData.push({
          json: {
            success: true,
            transactionId,
            isValid,
            length: transactionId.length,
            expectedLength: ARWEAVE_CONSTANTS.TX_ID_LENGTH,
            issues: issues.length > 0 ? issues : undefined,
          },
        });
        break;
      }

      case 'winstonToAR': {
        const winstonAmount = this.getNodeParameter('winstonAmount', itemIndex) as string;
        
        if (!winstonAmount || !/^\d+$/.test(winstonAmount)) {
          throw new NodeOperationError(this.getNode(), 'Invalid winston amount - must be a positive integer string');
        }
        
        const arAmount = winstonToAr(winstonAmount);
        
        returnData.push({
          json: {
            success: true,
            winston: winstonAmount,
            ar: arAmount,
            formatted: `${arAmount} AR`,
            conversionRate: `1 AR = ${ARWEAVE_CONSTANTS.WINSTON_PER_AR} winston`,
          },
        });
        break;
      }

      case 'arToWinston': {
        const arAmount = this.getNodeParameter('arAmount', itemIndex) as string;
        
        if (!arAmount || isNaN(parseFloat(arAmount)) || parseFloat(arAmount) < 0) {
          throw new NodeOperationError(this.getNode(), 'Invalid AR amount - must be a non-negative number');
        }
        
        const winstonAmount = arToWinston(arAmount);
        
        returnData.push({
          json: {
            success: true,
            ar: arAmount,
            winston: winstonAmount,
            formatted: `${winstonAmount} winston`,
            conversionRate: `1 AR = ${ARWEAVE_CONSTANTS.WINSTON_PER_AR} winston`,
          },
        });
        break;
      }

      case 'signMessage': {
        const message = this.getNodeParameter('message', itemIndex) as string;
        
        if (!message) {
          throw new NodeOperationError(this.getNode(), 'Message is required');
        }
        
        const credentials = await getCredentials(this);
        const signature = await signMessage(credentials.jwk, message);
        
        returnData.push({
          json: {
            success: true,
            message,
            signature,
            signerAddress: credentials.address,
            algorithm: 'RSA-PSS with SHA-256',
          },
        });
        break;
      }

      case 'verifySignature': {
        const message = this.getNodeParameter('verifyMessage', itemIndex) as string;
        const signature = this.getNodeParameter('signature', itemIndex) as string;
        const publicKey = this.getNodeParameter('publicKey', itemIndex) as string;
        
        if (!message) {
          throw new NodeOperationError(this.getNode(), 'Message is required');
        }
        
        if (!signature) {
          throw new NodeOperationError(this.getNode(), 'Signature is required');
        }
        
        if (!publicKey) {
          throw new NodeOperationError(this.getNode(), 'Public key is required');
        }
        
        const isValid = await verifySignature(message, signature, publicKey);
        
        returnData.push({
          json: {
            success: true,
            message,
            signatureValid: isValid,
            algorithm: 'RSA-PSS with SHA-256',
          },
        });
        break;
      }

      case 'getAPIHealth': {
        const health = await checkGatewayHealth(this);
        
        const result: { [key: string]: string | boolean | number | object | null | undefined } = {
          success: true,
          healthy: health.healthy,
          timestamp: new Date().toISOString(),
        };
        
        if (health.info) {
          result.networkInfo = {
            network: health.info.network,
            version: health.info.version,
            release: health.info.release,
            height: health.info.height,
            current: health.info.current,
            blocks: health.info.blocks,
            peers: health.info.peers,
            queueLength: health.info.queue_length,
            nodeStateLatency: health.info.node_state_latency,
          };
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
