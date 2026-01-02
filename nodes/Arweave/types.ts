/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IDataObject } from 'n8n-workflow';

// JWK Types
export interface ArweaveJWK {
  kty: string;
  n: string;
  e: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
}

// Transaction Types
export interface ArweaveTag {
  name: string;
  value: string;
}

export interface ArweaveTransaction {
  format: number;
  id: string;
  last_tx: string;
  owner: string;
  tags: ArweaveTag[];
  target: string;
  quantity: string;
  data: string;
  data_size: string;
  data_root: string;
  reward: string;
  signature: string;
}

export interface ArweaveTransactionStatus {
  block_height: number;
  block_indep_hash: string;
  number_of_confirmations: number;
}

// Block Types
export interface ArweaveBlock {
  nonce: string;
  previous_block: string;
  timestamp: number;
  last_retarget: number;
  diff: string;
  height: number;
  hash: string;
  indep_hash: string;
  txs: string[];
  tx_root: string;
  wallet_list: string;
  reward_addr: string;
  tags: ArweaveTag[];
  reward_pool: string;
  weave_size: string;
  block_size: string;
  cumulative_diff: string;
  hash_list_merkle: string;
}

// Network Types
export interface ArweaveNetworkInfo {
  network: string;
  version: number;
  release: number;
  height: number;
  current: string;
  blocks: number;
  peers: number;
  queue_length: number;
  node_state_latency: number;
}

// GraphQL Types
export interface GraphQLNode {
  id: string;
  anchor: string;
  signature: string;
  recipient: string;
  owner: {
    address: string;
    key: string;
  };
  fee: {
    winston: string;
    ar: string;
  };
  quantity: {
    winston: string;
    ar: string;
  };
  data: {
    size: string;
    type: string;
  };
  tags: {
    name: string;
    value: string;
  }[];
  block: {
    id: string;
    timestamp: number;
    height: number;
    previous: string;
  } | null;
  parent?: {
    id: string;
  };
  bundledIn?: {
    id: string;
  };
}

export interface GraphQLEdge {
  cursor: string;
  node: GraphQLNode;
}

export interface GraphQLPageInfo {
  hasNextPage: boolean;
}

export interface GraphQLTransactionsResponse {
  transactions: {
    pageInfo: GraphQLPageInfo;
    edges: GraphQLEdge[];
  };
}

export interface GraphQLBlocksResponse {
  blocks: {
    pageInfo: GraphQLPageInfo;
    edges: {
      cursor: string;
      node: {
        id: string;
        timestamp: number;
        height: number;
        previous: string;
      };
    }[];
  };
}

// Bundle Types (ANS-104)
export interface DataItem {
  id?: string;
  signature?: string;
  owner: string;
  target: string;
  anchor: string;
  tags: ArweaveTag[];
  data: string;
}

export interface Bundle {
  items: DataItem[];
  length: number;
}

// Manifest Types
export interface ManifestPath {
  id: string;
}

export interface ManifestPaths {
  [path: string]: ManifestPath;
}

export interface Manifest {
  manifest: string;
  version: string;
  index?: {
    path: string;
  };
  paths: ManifestPaths;
}

// SmartWeave Types
export interface SmartWeaveState {
  [key: string]: unknown;
}

export interface SmartWeaveInteraction {
  id: string;
  owner: {
    address: string;
  };
  block: {
    id: string;
    height: number;
    timestamp: number;
  };
  tags: ArweaveTag[];
}

// ArNS Types
export interface ArNSRecord {
  transactionId: string;
  ttlSeconds: number;
  type: string;
  underName?: string;
  owner?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  undernames?: number;
  purchasePrice?: string;
}

// Price Types
export interface PriceInfo {
  winston: string;
  ar: string;
}

// API Response Types
export interface ArweaveApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Credential Types
export interface ArweaveCredentials {
  walletJwk: string;
  gatewayUrl: string;
  graphqlEndpoint?: string;
  bundlrEndpoint?: string;
  network: 'mainnet' | 'testnet';
  timeout: number;
}

// Node Operation Types
export type ResourceType =
  | 'transactions'
  | 'dataUpload'
  | 'dataRetrieval'
  | 'wallet'
  | 'graphql'
  | 'blocks'
  | 'network'
  | 'pricing'
  | 'bundles'
  | 'manifests'
  | 'arns'
  | 'smartweave'
  | 'utility';

export interface OperationResult {
  success: boolean;
  [key: string]: unknown;
}

// Upload Types
export interface UploadResult {
  id: string;
  status: string;
  dataSize: number;
  reward: string;
}

export interface BatchUploadItem {
  data: string | Buffer;
  contentType?: string;
  tags?: ArweaveTag[];
}

export interface BatchUploadResult {
  items: UploadResult[];
  totalSize: number;
  totalCost: string;
}

// Wallet Types
export interface WalletInfo {
  address: string;
  balance: string;
  balanceAR: string;
  lastTransaction: string;
}

// Helper Types
export interface TagFilter {
  name: string;
  values: string[];
  op?: 'EQ' | 'NEQ';
}

export interface BlockFilter {
  min?: number;
  max?: number;
}

export interface QueryOptions {
  first?: number;
  after?: string;
  tags?: TagFilter[];
  owners?: string[];
  recipients?: string[];
  block?: BlockFilter;
  sort?: 'HEIGHT_ASC' | 'HEIGHT_DESC';
}

// Manifest Types
export interface ArweaveManifestPath {
  id: string;
  [key: string]: string;
}

export interface ArweaveManifest {
  manifest: string;
  version: string;
  index?: {
    path: string;
  };
  fallback?: {
    id: string;
  };
  paths: {
    [path: string]: ArweaveManifestPath;
  };
}
