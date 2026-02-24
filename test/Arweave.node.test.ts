/**
 * Copyright (c) 2026 Velocity BPA
 * Licensed under the Business Source License 1.1
 */

import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Arweave } from '../nodes/Arweave/Arweave.node';

// Mock n8n-workflow
jest.mock('n8n-workflow', () => ({
  ...jest.requireActual('n8n-workflow'),
  NodeApiError: class NodeApiError extends Error {
    constructor(node: any, error: any) { super(error.message || 'API Error'); }
  },
  NodeOperationError: class NodeOperationError extends Error {
    constructor(node: any, message: string) { super(message); }
  },
}));

describe('Arweave Node', () => {
  let node: Arweave;

  beforeAll(() => {
    node = new Arweave();
  });

  describe('Node Definition', () => {
    it('should have correct basic properties', () => {
      expect(node.description.displayName).toBe('Arweave');
      expect(node.description.name).toBe('arweave');
      expect(node.description.version).toBe(1);
      expect(node.description.inputs).toContain('main');
      expect(node.description.outputs).toContain('main');
    });

    it('should define 6 resources', () => {
      const resourceProp = node.description.properties.find(
        (p: any) => p.name === 'resource'
      );
      expect(resourceProp).toBeDefined();
      expect(resourceProp!.type).toBe('options');
      expect(resourceProp!.options).toHaveLength(6);
    });

    it('should have operation dropdowns for each resource', () => {
      const operations = node.description.properties.filter(
        (p: any) => p.name === 'operation'
      );
      expect(operations.length).toBe(6);
    });

    it('should require credentials', () => {
      expect(node.description.credentials).toBeDefined();
      expect(node.description.credentials!.length).toBeGreaterThan(0);
      expect(node.description.credentials![0].required).toBe(true);
    });

    it('should have parameters with proper displayOptions', () => {
      const params = node.description.properties.filter(
        (p: any) => p.displayOptions?.show?.resource
      );
      for (const param of params) {
        expect(param.displayOptions.show.resource).toBeDefined();
        expect(Array.isArray(param.displayOptions.show.resource)).toBe(true);
      }
    });
  });

  // Resource-specific tests
describe('Transaction Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://arweave.net',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
      },
    };
  });

  describe('submitTransaction', () => {
    it('should submit a transaction successfully', async () => {
      const mockTransactionData = {
        target: 'test-target',
        quantity: '1000000000000',
        data: 'test-data',
      };
      const mockSignature = 'test-signature';
      const mockResponse = { id: 'test-transaction-id', status: 'pending' };

      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'submitTransaction';
        if (param === 'transactionData') return mockTransactionData;
        if (param === 'signature') return mockSignature;
        return '';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual(mockResponse);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://arweave.net/tx',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        body: {
          ...mockTransactionData,
          signature: mockSignature,
        },
        json: true,
      });
    });

    it('should handle errors when submitting transaction', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'submitTransaction';
        if (param === 'transactionData') return {};
        if (param === 'signature') return 'test-signature';
        return '';
      });

      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json.error).toBe('API Error');
    });
  });

  describe('getTransaction', () => {
    it('should retrieve transaction details successfully', async () => {
      const mockTransactionId = 'test-transaction-id';
      const mockResponse = {
        id: mockTransactionId,
        last_tx: 'last-transaction-id',
        owner: 'owner-key',
        target: 'target-address',
        quantity: '1000000000000',
        data: 'data-hash',
      };

      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getTransaction';
        if (param === 'transactionId') return mockTransactionId;
        return '';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual(mockResponse);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `https://arweave.net/tx/${mockTransactionId}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        json: true,
      });
    });
  });

  describe('getTransactionStatus', () => {
    it('should retrieve transaction status successfully', async () => {
      const mockTransactionId = 'test-transaction-id';
      const mockResponse = {
        block_indep_hash: 'block-hash',
        block_height: 12345,
        number_of_confirmations: 10,
      };

      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getTransactionStatus';
        if (param === 'transactionId') return mockTransactionId;
        return '';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual(mockResponse);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `https://arweave.net/tx/${mockTransactionId}/status`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        json: true,
      });
    });
  });

  describe('getTransactionAnchor', () => {
    it('should retrieve transaction anchor successfully', async () => {
      const mockResponse = 'anchor-hash-value';

      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getTransactionAnchor';
        return '';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executeTransactionOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual(mockResponse);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://arweave.net/tx_anchor',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        json: true,
      });
    });
  });
});

describe('Data Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://arweave.net',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
      },
    };
  });

  test('uploadData operation should upload data successfully', async () => {
    const mockResponse = { id: 'test-tx-id', signature: 'test-signature' };
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'uploadData';
        case 'dataPayload': return 'test data';
        case 'tags': return [{ name: 'Content-Type', value: 'text/plain' }];
        case 'target': return '';
        case 'quantity': return '0';
        default: return undefined;
      }
    });
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeDataOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://arweave.net/tx',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key',
      },
      body: expect.any(String),
      json: false,
    });
  });

  test('getData operation should retrieve data successfully', async () => {
    const mockResponse = { data: 'retrieved data', id: 'test-tx-id' };
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'getData';
        case 'transactionId': return 'test-tx-id';
        default: return undefined;
      }
    });
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeDataOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://arweave.net/test-tx-id',
      headers: {
        'Authorization': 'Bearer test-api-key',
      },
      json: true,
    });
  });

  test('getRawData operation should retrieve raw data successfully', async () => {
    const mockResponse = 'raw data content';
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'getRawData';
        case 'transactionId': return 'test-tx-id';
        default: return undefined;
      }
    });
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeDataOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://arweave.net/raw/test-tx-id',
      headers: {
        'Authorization': 'Bearer test-api-key',
      },
      json: false,
    });
  });

  test('uploadChunk operation should upload chunk successfully', async () => {
    const mockResponse = { chunk_id: 'test-chunk-id' };
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'uploadChunk';
        case 'chunkData': return 'chunk data';
        case 'dataRoot': return 'test-data-root';
        case 'dataSize': return 1024;
        case 'offset': return 0;
        default: return undefined;
      }
    });
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeDataOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://arweave.net/chunk',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key',
      },
      body: expect.any(String),
      json: false,
    });
  });

  test('should handle API errors properly', async () => {
    const mockError = new Error('API request failed');
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'getData';
        case 'transactionId': return 'invalid-tx-id';
        default: return undefined;
      }
    });
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(mockError);

    await expect(executeDataOperations.call(mockExecuteFunctions, [{ json: {} }])).rejects.toThrow();
  });

  test('should continue on fail when enabled', async () => {
    const mockError = new Error('API request failed');
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
      switch (param) {
        case 'operation': return 'getData';
        case 'transactionId': return 'invalid-tx-id';
        default: return undefined;
      }
    });
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(mockError);

    const result = await executeDataOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual({ error: 'API request failed' });
  });
});

describe('GraphQLQuery Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://arweave.net',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
      },
    };
  });

  test('executeQuery should execute GraphQL query successfully', async () => {
    const mockResponse = {
      data: {
        transactions: {
          edges: [
            {
              node: {
                id: 'test-tx-id',
                owner: { address: 'test-address' },
              },
            },
          ],
        },
      },
    };

    mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
      switch (paramName) {
        case 'operation':
          return 'executeQuery';
        case 'query':
          return 'query { transactions { edges { node { id } } } }';
        case 'variables':
          return '{}';
        default:
          return undefined;
      }
    });

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
    expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://arweave.net/graphql',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query { transactions { edges { node { id } } } }',
        variables: {},
      }),
      json: true,
    });
  });

  test('getSchema should retrieve GraphQL schema successfully', async () => {
    const mockSchema = {
      data: {
        __schema: {
          types: [
            {
              name: 'Transaction',
              kind: 'OBJECT',
              fields: [{ name: 'id', type: { name: 'String', kind: 'SCALAR' } }],
            },
          ],
        },
      },
    };

    mockExecuteFunctions.getNodeParameter.mockReturnValue('getSchema');
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockSchema);

    const result = await executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockSchema);
  });

  test('queryTransactions should query transactions with filters successfully', async () => {
    const mockResponse = {
      data: {
        transactions: {
          edges: [
            {
              cursor: 'cursor1',
              node: {
                id: 'tx1',
                owner: { address: 'owner1' },
                recipient: 'recipient1',
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    };

    mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
      switch (paramName) {
        case 'operation':
          return 'queryTransactions';
        case 'owners':
          return 'owner1,owner2';
        case 'recipients':
          return 'recipient1';
        case 'tags':
          return '[]';
        case 'blockFilter':
          return '{}';
        case 'first':
          return 10;
        case 'after':
          return '';
        default:
          return undefined;
      }
    });

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
  });

  test('queryBlocks should query blocks successfully', async () => {
    const mockResponse = {
      data: {
        blocks: {
          edges: [
            {
              cursor: 'cursor1',
              node: {
                id: 'block1',
                height: 12345,
                timestamp: 1620000000,
                miner: 'miner1',
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    };

    mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
      switch (paramName) {
        case 'operation':
          return 'queryBlocks';
        case 'heightFilter':
          return '{"min": 12000}';
        case 'hashFilter':
          return '';
        case 'first':
          return 10;
        case 'after':
          return '';
        default:
          return undefined;
      }
    });

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
  });

  test('getTransactionsByTags should find transactions by tags successfully', async () => {
    const mockResponse = {
      data: {
        transactions: {
          edges: [
            {
              cursor: 'cursor1',
              node: {
                id: 'tx1',
                tags: [
                  { name: 'Content-Type', value: 'text/plain' },
                ],
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    };

    mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
      switch (paramName) {
        case 'operation':
          return 'getTransactionsByTags';
        case 'tagFilters':
          return '[{"name": "Content-Type", "values": ["text/plain"]}]';
        case 'sortOrder':
          return 'HEIGHT_DESC';
        default:
          return undefined;
      }
    });

    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

    const result = await executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockResponse);
  });

  test('should handle API errors gracefully', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('executeQuery');
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);

    const result = await executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json.error).toBe('API Error');
  });

  test('should throw error for unknown operation', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue('unknownOperation');

    await expect(
      executeGraphQLQueryOperations.call(mockExecuteFunctions, [{ json: {} }])
    ).rejects.toThrow('Unknown operation: unknownOperation');
  });
});

describe('SmartWeaveContract Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://arweave.net',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
      },
    };
  });

  describe('deployContract', () => {
    it('should deploy a SmartWeave contract successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        switch (param) {
          case 'operation': return 'deployContract';
          case 'contractSource': return 'export function handle(state, action) { return { state }; }';
          case 'initialState': return { counter: 0 };
          case 'contractType': return 'javascript';
          default: return undefined;
        }
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        id: 'test-tx-id',
        status: 'success',
      });

      const result = await executeSmartWeaveContractOperations.call(
        mockExecuteFunctions,
        [{ json: {} }]
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.id).toBe('test-tx-id');
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://arweave.net/tx',
        })
      );
    });
  });

  describe('getContractState', () => {
    it('should retrieve contract state successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        switch (param) {
          case 'operation': return 'getContractState';
          case 'contractId': return 'test-contract-id';
          default: return undefined;
        }
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        state: { counter: 5 },
        validity: {},
      });

      const result = await executeSmartWeaveContractOperations.call(
        mockExecuteFunctions,
        [{ json: {} }]
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.state.counter).toBe(5);
    });
  });

  describe('interactWithContract', () => {
    it('should interact with contract successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        switch (param) {
          case 'operation': return 'interactWithContract';
          case 'contractId': return 'test-contract-id';
          case 'inputData': return { function: 'increment' };
          case 'tags': return [];
          default: return undefined;
        }
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        id: 'interaction-tx-id',
        status: 'success',
      });

      const result = await executeSmartWeaveContractOperations.call(
        mockExecuteFunctions,
        [{ json: {} }]
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.id).toBe('interaction-tx-id');
    });
  });

  describe('getContractBalance', () => {
    it('should get contract balance successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        switch (param) {
          case 'operation': return 'getContractBalance';
          case 'contractId': return 'test-contract-id';
          default: return undefined;
        }
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('1000000000000');

      const result = await executeSmartWeaveContractOperations.call(
        mockExecuteFunctions,
        [{ json: {} }]
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.balance).toBe(1);
      expect(result[0].json.contractId).toBe('test-contract-id');
    });
  });

  describe('dryRunInteraction', () => {
    it('should dry run interaction successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        switch (param) {
          case 'operation': return 'dryRunInteraction';
          case 'contractId': return 'test-contract-id';
          case 'inputData': return { function: 'increment' };
          case 'caller': return 'test-caller-address';
          default: return undefined;
        }
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
        type: 'ok',
        result: { state: { counter: 6 } },
      });

      const result = await executeSmartWeaveContractOperations.call(
        mockExecuteFunctions,
        [{ json: {} }]
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.type).toBe('ok');
      expect(result[0].json.result.state.counter).toBe(6);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully when continueOnFail is true', async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue('getContractState');
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

      const result = await executeSmartWeaveContractOperations.call(
        mockExecuteFunctions,
        [{ json: {} }]
      );

      expect(result).toHaveLength(1);
      expect(result[0].json.error).toBe('API Error');
    });
  });
});

describe('Wallet Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://arweave.net',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
      },
    };
  });

  describe('getWalletBalance', () => {
    it('should get wallet balance successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getWalletBalance';
        if (param === 'wallet_address') return 'test-wallet-address';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('1000000000000');

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        wallet_address: 'test-wallet-address',
        balance_winston: '1000000000000',
        balance_ar: 1,
      });
    });

    it('should handle wallet balance error', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getWalletBalance';
        if (param === 'wallet_address') return 'invalid-address';
      });

      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Wallet not found'));
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        error: 'Wallet not found',
      });
    });
  });

  describe('getLastTransaction', () => {
    it('should get last transaction successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getLastTransaction';
        if (param === 'wallet_address') return 'test-wallet-address';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('tx-id-123');

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        wallet_address: 'test-wallet-address',
        last_transaction_id: 'tx-id-123',
      });
    });
  });

  describe('getWalletTransactions', () => {
    it('should get wallet transactions successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string, index: number, defaultValue?: any) => {
        if (param === 'operation') return 'getWalletTransactions';
        if (param === 'wallet_address') return 'test-wallet-address';
        if (param === 'limit') return defaultValue || 10;
        if (param === 'offset') return defaultValue || 0;
      });

      const mockTransactions = ['tx1', 'tx2', 'tx3'];
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockTransactions);

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        wallet_address: 'test-wallet-address',
        transactions: mockTransactions,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getFilteredTransactions', () => {
    it('should get filtered transactions successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string, index: number, defaultValue?: any) => {
        if (param === 'operation') return 'getFilteredTransactions';
        if (param === 'wallet_address') return 'test-wallet-address';
        if (param === 'limit') return defaultValue || 5;
        if (param === 'since_block') return defaultValue || 100;
      });

      const mockTransactions = ['tx1', 'tx2'];
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockTransactions);

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        wallet_address: 'test-wallet-address',
        transactions: mockTransactions,
        limit: 5,
        since_block: 100,
      });
    });
  });

  describe('getStoragePrice', () => {
    it('should get storage price successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getStoragePrice';
        if (param === 'data_size_bytes') return 1024;
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('500000000000');

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        data_size_bytes: 1024,
        price_winston: '500000000000',
        price_ar: 0.5,
      });
    });
  });

  describe('getTransferPrice', () => {
    it('should get transfer price successfully', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
        if (param === 'operation') return 'getTransferPrice';
        if (param === 'data_size_bytes') return 2048;
        if (param === 'target_address') return 'target-address-123';
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('750000000000');

      const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual({
        data_size_bytes: 2048,
        target_address: 'target-address-123',
        price_winston: '750000000000',
        price_ar: 0.75,
      });
    });
  });
});

describe('Block Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        baseUrl: 'https://arweave.net',
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn(),
      },
    };
  });

  describe('getBlockByHash', () => {
    it('should retrieve block by hash successfully', async () => {
      const mockBlockData = {
        height: 12345,
        hash: 'test-hash-123',
        timestamp: 1234567890,
        tx_root: 'tx-root-hash',
      };

      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        if (paramName === 'operation') return 'getBlockByHash';
        if (paramName === 'blockHash') return 'test-hash-123';
        return undefined;
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBlockData);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://arweave.net/block/hash/test-hash-123',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true,
      });

      expect(result).toEqual([{
        json: mockBlockData,
        pairedItem: { item: 0 },
      }]);
    });

    it('should handle API errors', async () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        if (paramName === 'operation') return 'getBlockByHash';
        if (paramName === 'blockHash') return 'invalid-hash';
        return undefined;
      });

      const apiError = new Error('Block not found');
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(apiError);

      await expect(
        executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }])
      ).rejects.toThrow('Block not found');
    });
  });

  describe('getBlockByHeight', () => {
    it('should retrieve block by height successfully', async () => {
      const mockBlockData = {
        height: 100000,
        hash: 'height-hash-123',
        timestamp: 1234567890,
      };

      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        if (paramName === 'operation') return 'getBlockByHeight';
        if (paramName === 'blockHeight') return 100000;
        return undefined;
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBlockData);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://arweave.net/block/height/100000',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true,
      });

      expect(result).toEqual([{
        json: mockBlockData,
        pairedItem: { item: 0 },
      }]);
    });
  });

  describe('getCurrentBlock', () => {
    it('should retrieve current block successfully', async () => {
      const mockCurrentBlock = {
        height: 999999,
        hash: 'current-hash-123',
        timestamp: Date.now(),
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue('getCurrentBlock');
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockCurrentBlock);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://arweave.net/current_block',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true,
      });

      expect(result).toEqual([{
        json: mockCurrentBlock,
        pairedItem: { item: 0 },
      }]);
    });
  });

  describe('getNetworkInfo', () => {
    it('should retrieve network info successfully', async () => {
      const mockNetworkInfo = {
        network: 'arweave.N.1',
        version: 5,
        height: 999999,
        peer_count: 50,
      };

      mockExecuteFunctions.getNodeParameter.mockReturnValue('getNetworkInfo');
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockNetworkInfo);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: mockNetworkInfo,
        pairedItem: { item: 0 },
      }]);
    });
  });

  describe('getPeers', () => {
    it('should retrieve peers list successfully', async () => {
      const mockPeers = [
        '192.168.1.1:1984',
        '192.168.1.2:1984',
        '192.168.1.3:1984',
      ];

      mockExecuteFunctions.getNodeParameter.mockReturnValue('getPeers');
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPeers);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: mockPeers,
        pairedItem: { item: 0 },
      }]);
    });
  });

  describe('getHashList', () => {
    it('should retrieve hash list successfully', async () => {
      const mockHashList = [
        'hash1',
        'hash2',
        'hash3',
      ];

      mockExecuteFunctions.getNodeParameter.mockReturnValue('getHashList');
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockHashList);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: mockHashList,
        pairedItem: { item: 0 },
      }]);
    });
  });

  describe('getWalletList', () => {
    it('should retrieve wallet list successfully', async () => {
      const mockWalletList = {
        wallet_list: {
          'address1': { balance: '1000000000' },
          'address2': { balance: '2000000000' },
        },
      };

      mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
        if (paramName === 'operation') return 'getWalletList';
        if (paramName === 'blockHashForWallet') return 'wallet-block-hash';
        return undefined;
      });

      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockWalletList);

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://arweave.net/wallet_list/wallet-block-hash',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true,
      });

      expect(result).toEqual([{
        json: mockWalletList,
        pairedItem: { item: 0 },
      }]);
    });
  });

  describe('error handling', () => {
    it('should handle continue on fail', async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue('getCurrentBlock');
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));

      const result = await executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{
        json: {
          error: 'Network error',
          operation: 'getCurrentBlock',
          itemIndex: 0,
        },
        pairedItem: { item: 0 },
      }]);
    });

    it('should throw error for unknown operation', async () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue('unknownOperation');

      await expect(
        executeBlockOperations.call(mockExecuteFunctions, [{ json: {} }])
      ).rejects.toThrow('Unknown operation: unknownOperation');
    });
  });
});
});
