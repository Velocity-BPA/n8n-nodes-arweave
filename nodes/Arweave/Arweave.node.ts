/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Resource operations and fields
import { transactionsOperations, transactionsFields, executeTransactionsOperation } from './actions/transactions';
import { dataUploadOperations, dataUploadFields, executeDataUploadOperation } from './actions/dataUpload';
import { dataRetrievalOperations, dataRetrievalFields, executeDataRetrievalOperation } from './actions/dataRetrieval';
import { walletOperations, walletFields, executeWalletOperation } from './actions/wallet';
import { graphqlOperations, graphqlFields, executeGraphqlOperation } from './actions/graphql';
import { blocksOperations, blocksFields, executeBlocksOperation } from './actions/blocks';
import { networkOperations, networkFields, executeNetworkOperation } from './actions/network';
import { pricingOperations, pricingFields, executePricingOperation } from './actions/pricing';
import { bundlesOperations, bundlesFields, executeBundlesOperation } from './actions/bundles';
import { manifestsOperations, manifestsFields, executeManifestsOperation } from './actions/manifests';
import { arnsOperations, arnsFields, executeArnsOperation } from './actions/arns';
import { smartweaveOperations, smartweaveFields, executeSmartweaveOperation } from './actions/smartweave';
import { utilityOperations, utilityFields, executeUtilityOperation } from './actions/utility';

export class Arweave implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Arweave',
    name: 'arweave',
    icon: 'file:arweave.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Interact with Arweave permanent decentralized storage network',
    defaults: {
      name: 'Arweave',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'arweaveApi',
        required: true,
      },
    ],
    properties: [
      // Resource selector
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'ArNS',
            value: 'arns',
            description: 'Arweave Name System operations',
          },
          {
            name: 'Blocks',
            value: 'blocks',
            description: 'Block retrieval operations',
          },
          {
            name: 'Bundles',
            value: 'bundles',
            description: 'ANS-104 bundle operations',
          },
          {
            name: 'Data Retrieval',
            value: 'dataRetrieval',
            description: 'Retrieve stored data',
          },
          {
            name: 'Data Upload',
            value: 'dataUpload',
            description: 'Upload data permanently',
          },
          {
            name: 'GraphQL',
            value: 'graphql',
            description: 'Advanced transaction queries',
          },
          {
            name: 'Manifests',
            value: 'manifests',
            description: 'Path manifest operations',
          },
          {
            name: 'Network',
            value: 'network',
            description: 'Network information',
          },
          {
            name: 'Pricing',
            value: 'pricing',
            description: 'Price estimation',
          },
          {
            name: 'SmartWeave',
            value: 'smartweave',
            description: 'Smart contract operations',
          },
          {
            name: 'Transactions',
            value: 'transactions',
            description: 'Transaction operations',
          },
          {
            name: 'Utility',
            value: 'utility',
            description: 'Utility functions',
          },
          {
            name: 'Wallet',
            value: 'wallet',
            description: 'Wallet operations',
          },
        ],
        default: 'transactions',
      },
      // All resource operations
      ...transactionsOperations,
      ...dataUploadOperations,
      ...dataRetrievalOperations,
      ...walletOperations,
      ...graphqlOperations,
      ...blocksOperations,
      ...networkOperations,
      ...pricingOperations,
      ...bundlesOperations,
      ...manifestsOperations,
      ...arnsOperations,
      ...smartweaveOperations,
      ...utilityOperations,
      // All resource fields
      ...transactionsFields,
      ...dataUploadFields,
      ...dataRetrievalFields,
      ...walletFields,
      ...graphqlFields,
      ...blocksFields,
      ...networkFields,
      ...pricingFields,
      ...bundlesFields,
      ...manifestsFields,
      ...arnsFields,
      ...smartweaveFields,
      ...utilityFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const resource = this.getNodeParameter('resource', itemIndex) as string;
        let result: INodeExecutionData[];

        switch (resource) {
          case 'transactions':
            result = await executeTransactionsOperation.call(this, itemIndex);
            break;
          case 'dataUpload':
            result = await executeDataUploadOperation.call(this, itemIndex);
            break;
          case 'dataRetrieval':
            result = await executeDataRetrievalOperation.call(this, itemIndex);
            break;
          case 'wallet':
            result = await executeWalletOperation.call(this, itemIndex);
            break;
          case 'graphql':
            result = await executeGraphqlOperation.call(this, itemIndex);
            break;
          case 'blocks':
            result = await executeBlocksOperation.call(this, itemIndex);
            break;
          case 'network':
            result = await executeNetworkOperation.call(this, itemIndex);
            break;
          case 'pricing':
            result = await executePricingOperation.call(this, itemIndex);
            break;
          case 'bundles':
            result = await executeBundlesOperation.call(this, itemIndex);
            break;
          case 'manifests':
            result = await executeManifestsOperation.call(this, itemIndex);
            break;
          case 'arns':
            result = await executeArnsOperation.call(this, itemIndex);
            break;
          case 'smartweave':
            result = await executeSmartweaveOperation.call(this, itemIndex);
            break;
          case 'utility':
            result = await executeUtilityOperation.call(this, itemIndex);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
        }

        returnData.push(...result);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
