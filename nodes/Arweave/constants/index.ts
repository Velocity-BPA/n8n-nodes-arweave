/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

// Arweave Constants
export const ARWEAVE_CONSTANTS = {
  // Winston is the smallest unit of AR (1 AR = 10^12 Winston)
  WINSTON_PER_AR: BigInt('1000000000000'),
  
  // Transaction ID length
  TX_ID_LENGTH: 43,
  
  // Default gateway
  DEFAULT_GATEWAY: 'https://arweave.net',
  
  // Default GraphQL endpoint
  DEFAULT_GRAPHQL: 'https://arweave.net/graphql',
  
  // Default timeout
  DEFAULT_TIMEOUT: 60000,
  
  // Max data size without bundling (100KB)
  MAX_DATA_SIZE_UNBUNDLED: 102400,
  
  // Confirmation thresholds
  CONFIRMATIONS: {
    LOW: 3,
    MEDIUM: 10,
    HIGH: 50,
  },
  
  // API endpoints
  ENDPOINTS: {
    INFO: '/info',
    PEERS: '/peers',
    PENDING_TRANSACTIONS: '/tx/pending',
    PRICE: '/price',
    BLOCK_HEIGHT: '/block/height',
    BLOCK_HASH: '/block/hash',
    TX: '/tx',
    WALLET: '/wallet',
    GRAPHQL: '/graphql',
  },
} as const;

// License Notice
export const VELOCITY_BPA_LICENSE_NOTICE = `[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.`;

// Node Display Constants
export const NODE_DISPLAY = {
  NAME: 'Arweave',
  DESCRIPTION: 'Interact with Arweave permanent decentralized storage network',
  TRIGGER_NAME: 'Arweave Trigger',
  TRIGGER_DESCRIPTION: 'Triggers on new Arweave transactions or blocks',
  ICON: 'file:arweave.svg',
  GROUP: ['transform'],
  VERSION: 1,
  SUBTITLE: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
} as const;

// Resource names
export const RESOURCES = {
  TRANSACTIONS: 'transactions',
  DATA_UPLOAD: 'dataUpload',
  DATA_RETRIEVAL: 'dataRetrieval',
  WALLET: 'wallet',
  GRAPHQL: 'graphql',
  BLOCKS: 'blocks',
  NETWORK: 'network',
  PRICING: 'pricing',
  BUNDLES: 'bundles',
  MANIFESTS: 'manifests',
  ARNS: 'arns',
  SMARTWEAVE: 'smartweave',
  UTILITY: 'utility',
} as const;

// Common Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
  XML: 'application/xml',
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  SVG: 'image/svg+xml',
  OCTET_STREAM: 'application/octet-stream',
} as const;

// GraphQL Queries
export const GRAPHQL_QUERIES = {
  TRANSACTIONS: `
    query Transactions($first: Int, $after: String, $tags: [TagFilter!], $owners: [String!], $recipients: [String!], $block: BlockFilter, $sort: SortOrder) {
      transactions(
        first: $first
        after: $after
        tags: $tags
        owners: $owners
        recipients: $recipients
        block: $block
        sort: $sort
      ) {
        pageInfo {
          hasNextPage
        }
        edges {
          cursor
          node {
            id
            anchor
            signature
            recipient
            owner {
              address
              key
            }
            fee {
              winston
              ar
            }
            quantity {
              winston
              ar
            }
            data {
              size
              type
            }
            tags {
              name
              value
            }
            block {
              id
              timestamp
              height
              previous
            }
            parent {
              id
            }
            bundledIn {
              id
            }
          }
        }
      }
    }
  `,
  
  BLOCKS: `
    query Blocks($first: Int, $after: String, $height: BlockFilter, $sort: SortOrder) {
      blocks(
        first: $first
        after: $after
        height: $height
        sort: $sort
      ) {
        pageInfo {
          hasNextPage
        }
        edges {
          cursor
          node {
            id
            timestamp
            height
            previous
          }
        }
      }
    }
  `,
  
  TRANSACTION_BY_ID: `
    query Transaction($id: ID!) {
      transaction(id: $id) {
        id
        anchor
        signature
        recipient
        owner {
          address
          key
        }
        fee {
          winston
          ar
        }
        quantity {
          winston
          ar
        }
        data {
          size
          type
        }
        tags {
          name
          value
        }
        block {
          id
          timestamp
          height
          previous
        }
      }
    }
  `,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_JWK: 'Invalid wallet JWK format',
  INVALID_TX_ID: 'Invalid transaction ID format',
  TX_NOT_FOUND: 'Transaction not found',
  BLOCK_NOT_FOUND: 'Block not found',
  INSUFFICIENT_FUNDS: 'Insufficient wallet balance',
  NETWORK_ERROR: 'Network request failed',
  GRAPHQL_ERROR: 'GraphQL query failed',
  DATA_TOO_LARGE: 'Data size exceeds maximum limit',
  INVALID_TAGS: 'Invalid tag format',
  SIGNING_ERROR: 'Failed to sign transaction',
} as const;
