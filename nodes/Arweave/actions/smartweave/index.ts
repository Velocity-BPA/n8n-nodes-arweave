/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { graphqlRequest, getTransaction, getTransactionData } from '../../transport/arweaveClient';
import { validateTransactionId, decodeBase64Url } from '../../utils/helpers';

export const smartweaveOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['smartweave'],
      },
    },
    options: [
      {
        name: 'Read Contract State',
        value: 'readContractState',
        description: 'Get current contract state',
        action: 'Read contract state',
      },
      {
        name: 'Get Contract Source',
        value: 'getContractSource',
        description: 'Get contract source code',
        action: 'Get contract source',
      },
      {
        name: 'Get Contract Interactions',
        value: 'getContractInteractions',
        description: 'Get interaction history',
        action: 'Get contract interactions',
      },
      {
        name: 'Dry Run Interaction',
        value: 'dryRunInteraction',
        description: 'Simulate contract call',
        action: 'Dry run interaction',
      },
    ],
    default: 'readContractState',
  },
];

export const smartweaveFields: INodeProperties[] = [
  // Contract ID
  {
    displayName: 'Contract ID',
    name: 'contractId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['smartweave'],
        operation: ['readContractState', 'getContractSource', 'getContractInteractions', 'dryRunInteraction'],
      },
    },
    description: 'The SmartWeave contract transaction ID',
  },
  // Interaction input for dry run
  {
    displayName: 'Interaction Input',
    name: 'interactionInput',
    type: 'json',
    required: true,
    default: '{}',
    displayOptions: {
      show: {
        resource: ['smartweave'],
        operation: ['dryRunInteraction'],
      },
    },
    description: 'The input for the contract interaction (JSON)',
  },
  // Caller address for dry run
  {
    displayName: 'Caller Address',
    name: 'callerAddress',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['smartweave'],
        operation: ['dryRunInteraction'],
      },
    },
    description: 'Optional caller address for the simulation (uses wallet address if empty)',
  },
  // Interaction limit
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 100,
    displayOptions: {
      show: {
        resource: ['smartweave'],
        operation: ['getContractInteractions'],
      },
    },
    description: 'Maximum number of interactions to retrieve',
  },
  // Sort order
  {
    displayName: 'Sort Order',
    name: 'sortOrder',
    type: 'options',
    options: [
      { name: 'Newest First', value: 'HEIGHT_DESC' },
      { name: 'Oldest First', value: 'HEIGHT_ASC' },
    ],
    default: 'HEIGHT_DESC',
    displayOptions: {
      show: {
        resource: ['smartweave'],
        operation: ['getContractInteractions'],
      },
    },
    description: 'Order of returned interactions',
  },
  // Evaluate to height
  {
    displayName: 'Evaluate to Height',
    name: 'evaluateToHeight',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['smartweave'],
        operation: ['readContractState'],
      },
    },
    description: 'Evaluate state up to this block height (0 for current)',
  },
];

const SMARTWEAVE_INTERACTIONS_QUERY = `
query GetContractInteractions($contractId: ID!, $first: Int, $sort: SortOrder) {
  transactions(
    first: $first
    sort: $sort
    tags: [
      { name: "App-Name", values: ["SmartWeaveAction"] }
      { name: "Contract", values: [$contractId] }
    ]
  ) {
    edges {
      cursor
      node {
        id
        owner { address }
        block { height timestamp }
        tags { name value }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;

interface SmartWeaveInteractionsResponse {
  transactions: {
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        owner: { address: string };
        block: { height: number; timestamp: number } | null;
        tags: Array<{ name: string; value: string }>;
      };
    }>;
    pageInfo: { hasNextPage: boolean };
  };
}

interface SmartWeaveState {
  [key: string]: unknown;
}

export async function executeSmartweaveOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'readContractState': {
        const contractId = this.getNodeParameter('contractId', itemIndex) as string;
        const evaluateToHeight = this.getNodeParameter('evaluateToHeight', itemIndex, 0) as number;
        
        if (!validateTransactionId(contractId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid contract ID format');
        }
        
        // Get contract transaction to extract initial state
        const contractTx = await getTransaction(this, contractId);
        const initStateTags = contractTx.tags.filter((t) => 
          decodeBase64Url(t.name) === 'Init-State' || 
          decodeBase64Url(t.name) === 'Contract-Src'
        );
        
        // Get all interactions
        const interactions = await graphqlRequest<SmartWeaveInteractionsResponse>(
          this,
          SMARTWEAVE_INTERACTIONS_QUERY,
          {
            contractId,
            first: 1000,
            sort: 'HEIGHT_ASC',
          },
        );
        
        // Filter by height if specified
        let filteredInteractions = interactions.transactions.edges;
        if (evaluateToHeight > 0) {
          filteredInteractions = filteredInteractions.filter(
            (edge) => edge.node.block && edge.node.block.height <= evaluateToHeight,
          );
        }
        
        // Get initial state
        let initStateTag = initStateTags.find((t) => decodeBase64Url(t.name) === 'Init-State');
        let initialState: SmartWeaveState = {};
        
        if (initStateTag) {
          try {
            initialState = JSON.parse(decodeBase64Url(initStateTag.value));
          } catch {
            // Try to get state from data
            const data = await getTransactionData(this, contractId, true);
            try {
              initialState = JSON.parse(data as string);
            } catch {
              initialState = {};
            }
          }
        }
        
        // Note: Full state evaluation requires running contract source
        // This returns the initial state and interaction count
        returnData.push({
          json: {
            success: true,
            contractId,
            initialState,
            interactionCount: filteredInteractions.length,
            evaluatedToHeight: evaluateToHeight || 'current',
            note: 'Full state evaluation requires contract source execution. Use a SmartWeave SDK for complete state.',
            latestInteraction: filteredInteractions.length > 0 
              ? filteredInteractions[filteredInteractions.length - 1].node.id 
              : null,
          },
        });
        break;
      }

      case 'getContractSource': {
        const contractId = this.getNodeParameter('contractId', itemIndex) as string;
        
        if (!validateTransactionId(contractId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid contract ID format');
        }
        
        // Get contract transaction
        const contractTx = await getTransaction(this, contractId);
        const srcTag = contractTx.tags.find((t) => decodeBase64Url(t.name) === 'Contract-Src');
        
        let sourceCode = '';
        let sourceTxId = '';
        
        if (srcTag) {
          // Source is in a separate transaction
          sourceTxId = decodeBase64Url(srcTag.value);
          const sourceData = await getTransactionData(this, sourceTxId, true);
          sourceCode = sourceData as string;
        } else {
          // Source might be in the contract transaction data
          const data = await getTransactionData(this, contractId, true);
          sourceCode = data as string;
          sourceTxId = contractId;
        }
        
        returnData.push({
          json: {
            success: true,
            contractId,
            sourceTxId,
            sourceCode,
            sourceLength: sourceCode.length,
          },
        });
        break;
      }

      case 'getContractInteractions': {
        const contractId = this.getNodeParameter('contractId', itemIndex) as string;
        const limit = this.getNodeParameter('limit', itemIndex, 100) as number;
        const sortOrder = this.getNodeParameter('sortOrder', itemIndex, 'HEIGHT_DESC') as string;
        
        if (!validateTransactionId(contractId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid contract ID format');
        }
        
        const result = await graphqlRequest<SmartWeaveInteractionsResponse>(
          this,
          SMARTWEAVE_INTERACTIONS_QUERY,
          {
            contractId,
            first: Math.min(limit, 100),
            sort: sortOrder,
          },
        );
        
        const interactions = result.transactions.edges.map((edge) => {
          const inputTag = edge.node.tags.find((t) => t.name === 'Input' || decodeBase64Url(t.name) === 'Input');
          let input = {};
          
          if (inputTag) {
            try {
              input = JSON.parse(decodeBase64Url(inputTag.value));
            } catch {
              input = { raw: inputTag.value };
            }
          }
          
          return {
            id: edge.node.id,
            owner: edge.node.owner.address,
            block: edge.node.block,
            input,
            cursor: edge.cursor,
          };
        });
        
        returnData.push({
          json: {
            success: true,
            contractId,
            interactionCount: interactions.length,
            hasMore: result.transactions.pageInfo.hasNextPage,
            interactions,
          },
        });
        break;
      }

      case 'dryRunInteraction': {
        const contractId = this.getNodeParameter('contractId', itemIndex) as string;
        const interactionInput = this.getNodeParameter('interactionInput', itemIndex) as string;
        const callerAddress = this.getNodeParameter('callerAddress', itemIndex, '') as string;
        
        if (!validateTransactionId(contractId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid contract ID format');
        }
        
        let parsedInput;
        try {
          parsedInput = JSON.parse(interactionInput);
        } catch {
          throw new NodeOperationError(this.getNode(), 'Invalid interaction input JSON');
        }
        
        // Note: Full dry run requires executing contract source
        // This validates the input and provides contract info
        const contractTx = await getTransaction(this, contractId);
        const srcTag = contractTx.tags.find((t) => decodeBase64Url(t.name) === 'Contract-Src');
        
        returnData.push({
          json: {
            success: true,
            contractId,
            input: parsedInput,
            caller: callerAddress || 'wallet address',
            contractSourceId: srcTag ? decodeBase64Url(srcTag.value) : contractId,
            note: 'Full dry run simulation requires contract source execution. Use Warp SDK for complete simulation.',
            validated: true,
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
