/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { queryTransactions, graphqlRequest } from '../../transport/arweaveClient';
import { isValidAddress } from '../../utils/helpers';
import type { TagFilter, BlockFilter } from '../../types';

export const graphqlOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['graphql'],
      },
    },
    options: [
      {
        name: 'Query Transactions',
        value: 'queryTransactions',
        description: 'Advanced transaction search',
        action: 'Query transactions',
      },
      {
        name: 'Query by Tags',
        value: 'queryByTags',
        description: 'Filter by metadata tags',
        action: 'Query by tags',
      },
      {
        name: 'Query by Owner',
        value: 'queryByOwner',
        description: 'Filter by wallet address',
        action: 'Query by owner',
      },
      {
        name: 'Query by Recipient',
        value: 'queryByRecipient',
        description: 'Filter by target address',
        action: 'Query by recipient',
      },
      {
        name: 'Query by Block',
        value: 'queryByBlock',
        description: 'Filter by block height range',
        action: 'Query by block height',
      },
    ],
    default: 'queryTransactions',
  },
];

export const graphqlFields: INodeProperties[] = [
  // Limit
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 100,
    displayOptions: {
      show: {
        resource: ['graphql'],
      },
    },
    description: 'Maximum number of results to return',
  },
  // Cursor for pagination
  {
    displayName: 'After Cursor',
    name: 'afterCursor',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['graphql'],
      },
    },
    description: 'Cursor for pagination (from previous query)',
  },
  // Sort order
  {
    displayName: 'Sort Order',
    name: 'sortOrder',
    type: 'options',
    default: 'HEIGHT_DESC',
    displayOptions: {
      show: {
        resource: ['graphql'],
      },
    },
    options: [
      { name: 'Newest First', value: 'HEIGHT_DESC' },
      { name: 'Oldest First', value: 'HEIGHT_ASC' },
    ],
    description: 'Sort order for results',
  },
  // Tags for queryTransactions and queryByTags
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
        resource: ['graphql'],
        operation: ['queryTransactions', 'queryByTags'],
      },
    },
    options: [
      {
        name: 'tagFilters',
        displayName: 'Tag Filter',
        values: [
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            description: 'Tag name to filter by',
          },
          {
            displayName: 'Values',
            name: 'values',
            type: 'string',
            default: '',
            description: 'Comma-separated list of values to match',
          },
          {
            displayName: 'Operator',
            name: 'op',
            type: 'options',
            default: 'EQ',
            options: [
              { name: 'Equals', value: 'EQ' },
              { name: 'Not Equals', value: 'NEQ' },
            ],
          },
        ],
      },
    ],
    description: 'Tag filters for the query',
  },
  // Owners
  {
    displayName: 'Owner Addresses',
    name: 'owners',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['graphql'],
        operation: ['queryTransactions', 'queryByOwner'],
      },
    },
    description: 'Comma-separated list of owner wallet addresses',
  },
  // Recipients
  {
    displayName: 'Recipient Addresses',
    name: 'recipients',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['graphql'],
        operation: ['queryTransactions', 'queryByRecipient'],
      },
    },
    description: 'Comma-separated list of recipient addresses',
  },
  // Block range
  {
    displayName: 'Min Block Height',
    name: 'minBlock',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['graphql'],
        operation: ['queryTransactions', 'queryByBlock'],
      },
    },
    description: 'Minimum block height (0 for no minimum)',
  },
  {
    displayName: 'Max Block Height',
    name: 'maxBlock',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['graphql'],
        operation: ['queryTransactions', 'queryByBlock'],
      },
    },
    description: 'Maximum block height (0 for no maximum)',
  },
];

export async function executeGraphqlOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    const limit = this.getNodeParameter('limit', itemIndex, 100) as number;
    const afterCursor = this.getNodeParameter('afterCursor', itemIndex, '') as string;
    const sortOrder = this.getNodeParameter('sortOrder', itemIndex, 'HEIGHT_DESC') as string;

    const buildVariables = () => {
      const variables: { [key: string]: string | boolean | number | object | null | undefined } = {
        first: limit,
        sort: sortOrder,
      };

      if (afterCursor) {
        variables.after = afterCursor;
      }

      return variables;
    };

    switch (operation) {
      case 'queryTransactions': {
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagFilters?: { name: string; values: string; op?: string }[];
        };
        const ownersStr = this.getNodeParameter('owners', itemIndex, '') as string;
        const recipientsStr = this.getNodeParameter('recipients', itemIndex, '') as string;
        const minBlock = this.getNodeParameter('minBlock', itemIndex, 0) as number;
        const maxBlock = this.getNodeParameter('maxBlock', itemIndex, 0) as number;

        const variables = buildVariables();

        // Process tags
        if (tagsInput.tagFilters && tagsInput.tagFilters.length > 0) {
          variables.tags = tagsInput.tagFilters.map((tf) => ({
            name: tf.name,
            values: tf.values.split(',').map((v) => v.trim()),
            op: tf.op || 'EQ',
          }));
        }

        // Process owners
        if (ownersStr) {
          const owners = ownersStr.split(',').map((o) => o.trim());
          for (const owner of owners) {
            if (!isValidAddress(owner)) {
              throw new NodeOperationError(this.getNode(), `Invalid owner address: ${owner}`);
            }
          }
          variables.owners = owners;
        }

        // Process recipients
        if (recipientsStr) {
          const recipients = recipientsStr.split(',').map((r) => r.trim());
          for (const recipient of recipients) {
            if (!isValidAddress(recipient)) {
              throw new NodeOperationError(this.getNode(), `Invalid recipient address: ${recipient}`);
            }
          }
          variables.recipients = recipients;
        }

        // Process block range
        if (minBlock > 0 || maxBlock > 0) {
          variables.block = {};
          if (minBlock > 0) (variables.block as BlockFilter).min = minBlock;
          if (maxBlock > 0) (variables.block as BlockFilter).max = maxBlock;
        }

        const result = await queryTransactions(this, variables);

        returnData.push({
          json: {
            success: true,
            pageInfo: result.transactions.pageInfo,
            transactionCount: result.transactions.edges.length,
            transactions: result.transactions.edges.map((e) => e.node),
            cursors: result.transactions.edges.map((e) => ({
              id: e.node.id,
              cursor: e.cursor,
            })),
          },
        });
        break;
      }

      case 'queryByTags': {
        const tagsInput = this.getNodeParameter('tags', itemIndex, {}) as {
          tagFilters?: { name: string; values: string; op?: string }[];
        };

        if (!tagsInput.tagFilters || tagsInput.tagFilters.length === 0) {
          throw new NodeOperationError(this.getNode(), 'At least one tag filter is required');
        }

        const variables = buildVariables();
        variables.tags = tagsInput.tagFilters.map((tf) => ({
          name: tf.name,
          values: tf.values.split(',').map((v) => v.trim()),
          op: tf.op || 'EQ',
        }));

        const result = await queryTransactions(this, variables);

        returnData.push({
          json: {
            success: true,
            pageInfo: result.transactions.pageInfo,
            transactionCount: result.transactions.edges.length,
            transactions: result.transactions.edges.map((e) => e.node),
          },
        });
        break;
      }

      case 'queryByOwner': {
        const ownersStr = this.getNodeParameter('owners', itemIndex, '') as string;

        if (!ownersStr) {
          throw new NodeOperationError(this.getNode(), 'At least one owner address is required');
        }

        const owners = ownersStr.split(',').map((o) => o.trim());
        for (const owner of owners) {
          if (!isValidAddress(owner)) {
            throw new NodeOperationError(this.getNode(), `Invalid owner address: ${owner}`);
          }
        }

        const variables = buildVariables();
        variables.owners = owners;

        const result = await queryTransactions(this, variables);

        returnData.push({
          json: {
            success: true,
            owners,
            pageInfo: result.transactions.pageInfo,
            transactionCount: result.transactions.edges.length,
            transactions: result.transactions.edges.map((e) => e.node),
          },
        });
        break;
      }

      case 'queryByRecipient': {
        const recipientsStr = this.getNodeParameter('recipients', itemIndex, '') as string;

        if (!recipientsStr) {
          throw new NodeOperationError(this.getNode(), 'At least one recipient address is required');
        }

        const recipients = recipientsStr.split(',').map((r) => r.trim());
        for (const recipient of recipients) {
          if (!isValidAddress(recipient)) {
            throw new NodeOperationError(this.getNode(), `Invalid recipient address: ${recipient}`);
          }
        }

        const variables = buildVariables();
        variables.recipients = recipients;

        const result = await queryTransactions(this, variables);

        returnData.push({
          json: {
            success: true,
            recipients,
            pageInfo: result.transactions.pageInfo,
            transactionCount: result.transactions.edges.length,
            transactions: result.transactions.edges.map((e) => e.node),
          },
        });
        break;
      }

      case 'queryByBlock': {
        const minBlock = this.getNodeParameter('minBlock', itemIndex, 0) as number;
        const maxBlock = this.getNodeParameter('maxBlock', itemIndex, 0) as number;

        if (minBlock === 0 && maxBlock === 0) {
          throw new NodeOperationError(
            this.getNode(),
            'At least one block height filter is required',
          );
        }

        const variables = buildVariables();
        variables.block = {};
        if (minBlock > 0) (variables.block as BlockFilter).min = minBlock;
        if (maxBlock > 0) (variables.block as BlockFilter).max = maxBlock;

        const result = await queryTransactions(this, variables);

        returnData.push({
          json: {
            success: true,
            blockRange: { min: minBlock || null, max: maxBlock || null },
            pageInfo: result.transactions.pageInfo,
            transactionCount: result.transactions.edges.length,
            transactions: result.transactions.edges.map((e) => e.node),
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
