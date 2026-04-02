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

    it('should define 5 resources', () => {
      const resourceProp = node.description.properties.find(
        (p: any) => p.name === 'resource'
      );
      expect(resourceProp).toBeDefined();
      expect(resourceProp!.type).toBe('options');
      expect(resourceProp!.options).toHaveLength(5);
    });

    it('should have operation dropdowns for each resource', () => {
      const operations = node.description.properties.filter(
        (p: any) => p.name === 'operation'
      );
      expect(operations.length).toBe(5);
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
				apiKey: 'test-key',
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

	it('should create a transaction successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('createTransaction')
			.mockReturnValueOnce('Hello World')
			.mockReturnValueOnce('test-wallet')
			.mockReturnValueOnce([{ name: 'Content-Type', value: 'text/plain' }])
			.mockReturnValueOnce('')
			.mockReturnValueOnce('');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			id: 'test-transaction-id',
			status: 'pending',
		});

		const result = await executeTransactionOperations.call(
			mockExecuteFunctions,
			[{ json: {} }],
		);

		expect(result).toEqual([
			{
				json: { id: 'test-transaction-id', status: 'pending' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should get a transaction successfully', async () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getTransaction')
			.mockReturnValueOnce('test-transaction-id');

		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
			id: 'test-transaction-id',
			data_size: '100',
		});

		const result = await executeTransactionOperations.call(
			mockExecuteFunctions,
			[{ json: {} }],
		);

		expect(result).toEqual([
			{
				json: { id: 'test-transaction-id', data_size: '100' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should handle errors when continueOnFail is true', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getTransaction');
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));

		const result = await executeTransactionOperations.call(
			mockExecuteFunctions,
			[{ json: {} }],
		);

		expect(result).toEqual([
			{
				json: { error: 'API Error' },
				pairedItem: { item: 0 },
			},
		]);
	});
});

describe('Wallet Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        baseUrl: 'https://arweave.net'
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: {
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn()
      },
    };
  });

  it('should get wallet balance successfully', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getWalletBalance')
      .mockReturnValueOnce('test-wallet-address');
    
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('1000000000000');

    const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toHaveProperty('walletAddress', 'test-wallet-address');
    expect(result[0].json).toHaveProperty('balance', '1000000000000');
    expect(result[0].json).toHaveProperty('balanceAR', 1);
  });

  it('should handle wallet balance error', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getWalletBalance')
      .mockReturnValueOnce('invalid-address');
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    
    mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Invalid wallet address'));

    const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toHaveProperty('error', 'Invalid wallet address');
  });

  it('should get last transaction successfully', async () => {
    mockExecuteFunctions.getNodeParameter
      .mockReturnValueOnce('getLastTransaction')
      .mockReturnValueOnce('test-wallet-address');
    
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue('last-tx-id-123');

    const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toHaveProperty('walletAddress', 'test-wallet-address');
    expect(result[0].json).toHaveProperty('lastTransactionId', 'last-tx-id-123');
  });

  it('should generate wallet successfully', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('generateWallet');
    
    const mockWallet = {
      address: 'new-wallet-address',
      key: 'wallet-private-key'
    };
    mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockWallet);

    const result = await executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]);

    expect(result).toHaveLength(1);
    expect(result[0].json).toEqual(mockWallet);
  });

  it('should throw error for unknown operation', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('unknownOperation');

    await expect(executeWalletOperations.call(mockExecuteFunctions, [{ json: {} }]))
      .rejects.toThrow('Unknown operation: unknownOperation');
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
			},
		};
	});

	it('should get network info successfully', async () => {
		const mockNetworkInfo = {
			network: 'arweave.N.1',
			version: 5,
			release: 56,
			height: 1234567,
			current: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			blocks: 1234567,
			peers: 123,
			queue_length: 0,
			node_state_latency: 5,
		};

		mockExecuteFunctions.getNodeParameter.mockReturnValue('getNetworkInfo');
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockNetworkInfo);

		const items = [{ json: {} }];
		const result = await executeBlockOperations.call(mockExecuteFunctions, items);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockNetworkInfo);
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://arweave.net/info',
			headers: { 'Content-Type': 'application/json' },
			json: true,
		});
	});

	it('should get block by height successfully', async () => {
		const mockBlock = {
			indep_hash: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			height: 1000000,
			timestamp: 1640995200,
			last_retarget: 1640995200,
			diff: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
			hash: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			tx_root: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getBlockByHeight')
			.mockReturnValueOnce(1000000);
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBlock);

		const items = [{ json: {} }];
		const result = await executeBlockOperations.call(mockExecuteFunctions, items);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockBlock);
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://arweave.net/block/height/1000000',
			headers: { 'Content-Type': 'application/json' },
			json: true,
		});
	});

	it('should get block by hash successfully', async () => {
		const mockBlock = {
			indep_hash: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			height: 1000000,
			timestamp: 1640995200,
			last_retarget: 1640995200,
			diff: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
			hash: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			tx_root: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('getBlockByHash')
			.mockReturnValueOnce('BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA');
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBlock);

		const items = [{ json: {} }];
		const result = await executeBlockOperations.call(mockExecuteFunctions, items);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockBlock);
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://arweave.net/block/hash/BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			headers: { 'Content-Type': 'application/json' },
			json: true,
		});
	});

	it('should get current block successfully', async () => {
		const mockBlock = {
			indep_hash: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			height: 1234567,
			timestamp: 1640995200,
			last_retarget: 1640995200,
			diff: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
			hash: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
			tx_root: 'BkJ_h-GGIwfek-cJd-RaJrOPSH0OwUKpVDF4dXJ-OGI1PNJAE2oIIkAF-5lUK4D7GHJlrqBhzSGO3ywA',
		};

		mockExecuteFunctions.getNodeParameter.mockReturnValue('getCurrentBlock');
		mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockBlock);

		const items = [{ json: {} }];
		const result = await executeBlockOperations.call(mockExecuteFunctions, items);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual(mockBlock);
		expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://arweave.net/current_block',
			headers: { 'Content-Type': 'application/json' },
			json: true,
		});
	});

	it('should handle API errors gracefully', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('getNetworkInfo');
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		const items = [{ json: {} }];
		const result = await executeBlockOperations.call(mockExecuteFunctions, items);

		expect(result).toHaveLength(1);
		expect(result[0].json.error).toBe('Network error');
	});

	it('should throw error when continueOnFail is false', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('getNetworkInfo');
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		const items = [{ json: {} }];

		await expect(executeBlockOperations.call(mockExecuteFunctions, items)).rejects.toThrow('Network error');
	});
});

describe('GraphQL Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        apiKey: 'test-key', 
        baseUrl: 'https://arweave.net' 
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn() 
      },
    };
  });

  describe('queryTransactions', () => {
    it('should execute GraphQL transaction query successfully', async () => {
      const mockResponse = {
        data: {
          transactions: {
            edges: [
              {
                node: {
                  id: 'test-tx-id',
                  owner: { address: 'test-address' },
                  data: { size: 1024 }
                }
              }
            ]
          }
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('queryTransactions')
        .mockReturnValueOnce('query { transactions { edges { node { id } } } }')
        .mockReturnValueOnce({});
      
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executeGraphQLOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual(mockResponse);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://arweave.net/graphql',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { transactions { edges { node { id } } } }',
          variables: {}
        }),
        json: true,
      });
    });

    it('should handle query transactions error', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('queryTransactions')
        .mockReturnValueOnce('invalid query')
        .mockReturnValueOnce({});
      
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('GraphQL syntax error'));
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      const result = await executeGraphQLOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json.error).toBe('GraphQL syntax error');
    });
  });

  describe('queryBlocks', () => {
    it('should execute GraphQL block query successfully', async () => {
      const mockResponse = {
        data: {
          blocks: {
            edges: [
              {
                node: {
                  id: 'test-block-id',
                  height: 12345,
                  timestamp: 1640995200
                }
              }
            ]
          }
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('queryBlocks')
        .mockReturnValueOnce('query { blocks { edges { node { id height } } } }')
        .mockReturnValueOnce({ first: 10 });
      
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockResponse);

      const result = await executeGraphQLOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toHaveLength(1);
      expect(result[0].json).toEqual(mockResponse);
      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://arweave.net/graphql',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { blocks { edges { node { id height } } } }',
          variables: { first: 10 }
        }),
        json: true,
      });
    });

    it('should handle query blocks error', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('queryBlocks')
        .mockReturnValueOnce('query { blocks }')
        .mockReturnValueOnce({});
      
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Network error'));

      await expect(executeGraphQLOperations.call(mockExecuteFunctions, [{ json: {} }]))
        .rejects.toThrow('Network error');
    });
  });
});

describe('Price Resource', () => {
  let mockExecuteFunctions: any;

  beforeEach(() => {
    mockExecuteFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({ 
        baseUrl: 'https://arweave.net'
      }),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
      continueOnFail: jest.fn().mockReturnValue(false),
      helpers: { 
        httpRequest: jest.fn(),
        requestWithAuthentication: jest.fn() 
      },
    };
  });

  describe('getStoragePrice operation', () => {
    it('should get storage price successfully', async () => {
      const mockPrice = '123456789';
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getStoragePrice')
        .mockReturnValueOnce(1024);
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPrice);

      const result = await executePriceOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://arweave.net/price/1024',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true
      });
      expect(result).toEqual([{ json: mockPrice, pairedItem: { item: 0 } }]);
    });

    it('should handle getStoragePrice error', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getStoragePrice')
        .mockReturnValueOnce(1024);
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('API Error'));
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      const result = await executePriceOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{ json: { error: 'API Error' }, pairedItem: { item: 0 } }]);
    });
  });

  describe('getTransferPrice operation', () => {
    it('should get transfer price successfully', async () => {
      const mockPrice = '987654321';
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getTransferPrice')
        .mockReturnValueOnce(2048)
        .mockReturnValueOnce('target-address-123');
      mockExecuteFunctions.helpers.httpRequest.mockResolvedValue(mockPrice);

      const result = await executePriceOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://arweave.net/price/2048/target-address-123',
        headers: {
          'Content-Type': 'application/json',
        },
        json: true
      });
      expect(result).toEqual([{ json: mockPrice, pairedItem: { item: 0 } }]);
    });

    it('should handle getTransferPrice error', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('getTransferPrice')
        .mockReturnValueOnce(2048)
        .mockReturnValueOnce('target-address-123');
      mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(new Error('Transfer price error'));
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      const result = await executePriceOperations.call(mockExecuteFunctions, [{ json: {} }]);

      expect(result).toEqual([{ json: { error: 'Transfer price error' }, pairedItem: { item: 0 } }]);
    });
  });
});
});
