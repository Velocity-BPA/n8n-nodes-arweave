/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

// Jest setup file
jest.setTimeout(30000);

// Mock n8n-workflow module
jest.mock('n8n-workflow', () => ({
  NodeOperationError: class NodeOperationError extends Error {
    constructor(node: unknown, message: string) {
      super(message);
      this.name = 'NodeOperationError';
    }
  },
  NodeApiError: class NodeApiError extends Error {
    constructor(node: unknown, error: { message?: string; httpCode?: number }) {
      super(error.message || 'API Error');
      this.name = 'NodeApiError';
    }
  },
}), { virtual: true });
