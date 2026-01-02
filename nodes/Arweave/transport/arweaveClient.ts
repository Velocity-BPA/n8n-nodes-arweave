/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, IHttpRequestMethods, IHttpRequestOptions, IDataObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type {
  ArweaveCredentials,
  ArweaveNetworkInfo,
  ArweaveTransaction,
  ArweaveTransactionStatus,
  ArweaveBlock,
  GraphQLTransactionsResponse,
  GraphQLBlocksResponse,
  ArweaveJWK,
} from '../types';
import { parseJwk, deriveAddressFromJwk } from '../utils/helpers';
import { ARWEAVE_CONSTANTS, GRAPHQL_QUERIES, VELOCITY_BPA_LICENSE_NOTICE } from '../constants';

// License notice logged once per node load
let licenseNoticeLogged = false;

function logLicenseNotice(): void {
  if (!licenseNoticeLogged) {
    console.warn(VELOCITY_BPA_LICENSE_NOTICE);
    licenseNoticeLogged = true;
  }
}

/**
 * Get credentials from node context
 */
export async function getCredentials(
  context: IExecuteFunctions,
): Promise<ArweaveCredentials & { jwk: ArweaveJWK; address: string }> {
  logLicenseNotice();
  
  const credentials = await context.getCredentials('arweaveApi');
  
  if (!credentials) {
    throw new NodeOperationError(context.getNode(), 'No credentials provided');
  }
  
  const walletJwk = credentials.walletJwk as string;
  const jwk = parseJwk(walletJwk);
  const address = deriveAddressFromJwk(jwk);
  
  return {
    walletJwk,
    gatewayUrl: (credentials.gatewayUrl as string) || ARWEAVE_CONSTANTS.DEFAULT_GATEWAY,
    graphqlEndpoint: (credentials.graphqlEndpoint as string) || ARWEAVE_CONSTANTS.DEFAULT_GRAPHQL,
    bundlrEndpoint: credentials.bundlrEndpoint as string | undefined,
    network: (credentials.network as 'mainnet' | 'testnet') || 'mainnet',
    timeout: (credentials.timeout as number) || ARWEAVE_CONSTANTS.DEFAULT_TIMEOUT,
    jwk,
    address,
  };
}

/**
 * Make HTTP request to Arweave gateway
 */
export async function arweaveApiRequest(
  context: IExecuteFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body?: unknown,
  qs?: IDataObject,
  headers?: Record<string, string>,
): Promise<unknown> {
  const credentials = await getCredentials(context);
  
  const options: IHttpRequestOptions = {
    method,
    url: `${credentials.gatewayUrl}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    timeout: credentials.timeout,
    returnFullResponse: false,
  };
  
  if (body) {
    options.body = body;
  }
  
  if (qs && Object.keys(qs).length > 0) {
    options.qs = qs;
  }
  
  try {
    const response = await context.helpers.httpRequest(options);
    return response;
  } catch (error) {
    throw new NodeApiError(context.getNode(), error as { message?: string });
  }
}

/**
 * Make GraphQL request to Arweave
 */
export async function graphqlRequest<T = unknown>(
  context: IExecuteFunctions,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const credentials = await getCredentials(context);
  
  const options: IHttpRequestOptions = {
    method: 'POST',
    url: credentials.graphqlEndpoint || `${credentials.gatewayUrl}/graphql`,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: {
      query,
      variables,
    },
    timeout: credentials.timeout,
  };
  
  try {
    const response = (await context.helpers.httpRequest(options)) as { data?: T; errors?: { message: string }[] };
    
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors.map((e) => e.message).join(', '));
    }
    
    return response.data as T;
  } catch (error) {
    throw new NodeApiError(context.getNode(), error as { message?: string });
  }
}

/**
 * Get network info
 */
export async function getNetworkInfo(context: IExecuteFunctions): Promise<ArweaveNetworkInfo> {
  return (await arweaveApiRequest(context, 'GET', '/info')) as ArweaveNetworkInfo;
}

/**
 * Get transaction by ID
 */
export async function getTransaction(
  context: IExecuteFunctions,
  txId: string,
): Promise<ArweaveTransaction> {
  return (await arweaveApiRequest(context, 'GET', `/tx/${txId}`)) as ArweaveTransaction;
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  context: IExecuteFunctions,
  txId: string,
): Promise<ArweaveTransactionStatus> {
  return (await arweaveApiRequest(context, 'GET', `/tx/${txId}/status`)) as ArweaveTransactionStatus;
}

/**
 * Get transaction data
 */
export async function getTransactionData(
  context: IExecuteFunctions,
  txId: string,
  decode = false,
): Promise<string | Buffer> {
  const credentials = await getCredentials(context);
  
  const options: IHttpRequestOptions = {
    method: 'GET',
    url: `${credentials.gatewayUrl}/${txId}`,
    returnFullResponse: false,
    encoding: decode ? 'text' : 'arraybuffer',
    timeout: credentials.timeout,
  };
  
  try {
    const response = await context.helpers.httpRequest(options);
    return response as string | Buffer;
  } catch (error) {
    throw new NodeApiError(context.getNode(), error as { message?: string });
  }
}

/**
 * Get transaction field
 */
export async function getTransactionField(
  context: IExecuteFunctions,
  txId: string,
  field: string,
): Promise<string> {
  return (await arweaveApiRequest(context, 'GET', `/tx/${txId}/${field}`)) as string;
}

/**
 * Submit transaction
 */
export async function submitTransaction(
  context: IExecuteFunctions,
  transaction: ArweaveTransaction,
): Promise<{ id: string; status: string }> {
  const response = await arweaveApiRequest(context, 'POST', '/tx', transaction);
  return { id: transaction.id, status: response as string };
}

/**
 * Get pending transactions
 */
export async function getPendingTransactions(context: IExecuteFunctions): Promise<string[]> {
  return (await arweaveApiRequest(context, 'GET', '/tx/pending')) as string[];
}

/**
 * Get block by hash
 */
export async function getBlockByHash(
  context: IExecuteFunctions,
  hash: string,
): Promise<ArweaveBlock> {
  return (await arweaveApiRequest(context, 'GET', `/block/hash/${hash}`)) as ArweaveBlock;
}

/**
 * Get block by height
 */
export async function getBlockByHeight(
  context: IExecuteFunctions,
  height: number,
): Promise<ArweaveBlock> {
  return (await arweaveApiRequest(context, 'GET', `/block/height/${height}`)) as ArweaveBlock;
}

/**
 * Get current block
 */
export async function getCurrentBlock(context: IExecuteFunctions): Promise<ArweaveBlock> {
  const info = await getNetworkInfo(context);
  return getBlockByHash(context, info.current);
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  context: IExecuteFunctions,
  address?: string,
): Promise<string> {
  const addr = address || (await getCredentials(context)).address;
  return (await arweaveApiRequest(context, 'GET', `/wallet/${addr}/balance`)) as string;
}

/**
 * Get last transaction for wallet
 */
export async function getLastTransaction(
  context: IExecuteFunctions,
  address?: string,
): Promise<string> {
  const addr = address || (await getCredentials(context)).address;
  return (await arweaveApiRequest(context, 'GET', `/wallet/${addr}/last_tx`)) as string;
}

/**
 * Get price for data size
 */
export async function getPrice(
  context: IExecuteFunctions,
  bytes: number,
  target?: string,
): Promise<string> {
  const endpoint = target ? `/price/${bytes}/${target}` : `/price/${bytes}`;
  return (await arweaveApiRequest(context, 'GET', endpoint)) as string;
}

/**
 * Get peers
 */
export async function getPeers(context: IExecuteFunctions): Promise<string[]> {
  return (await arweaveApiRequest(context, 'GET', '/peers')) as string[];
}

/**
 * Query transactions via GraphQL
 */
export async function queryTransactions(
  context: IExecuteFunctions,
  variables: Record<string, unknown>,
): Promise<GraphQLTransactionsResponse> {
  return graphqlRequest<GraphQLTransactionsResponse>(
    context,
    GRAPHQL_QUERIES.TRANSACTIONS,
    variables,
  );
}

/**
 * Query blocks via GraphQL
 */
export async function queryBlocks(
  context: IExecuteFunctions,
  variables: Record<string, unknown>,
): Promise<GraphQLBlocksResponse> {
  return graphqlRequest<GraphQLBlocksResponse>(context, GRAPHQL_QUERIES.BLOCKS, variables);
}

/**
 * Get raw data as Buffer
 */
export async function getRawData(context: IExecuteFunctions, txId: string): Promise<Buffer> {
  const credentials = await getCredentials(context);
  
  const options: IHttpRequestOptions = {
    method: 'GET',
    url: `${credentials.gatewayUrl}/${txId}`,
    returnFullResponse: false,
    encoding: 'arraybuffer',
    timeout: credentials.timeout,
  };
  
  try {
    const response = await context.helpers.httpRequest(options);
    return Buffer.from(response as ArrayBuffer);
  } catch (error) {
    throw new NodeApiError(context.getNode(), error as { message?: string });
  }
}

/**
 * Check gateway health
 */
export async function checkGatewayHealth(
  context: IExecuteFunctions,
): Promise<{ healthy: boolean; info: ArweaveNetworkInfo | null }> {
  try {
    const info = await getNetworkInfo(context);
    return { healthy: true, info };
  } catch {
    return { healthy: false, info: null };
  }
}
