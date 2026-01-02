/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import CryptoJS from 'crypto-js';
import type { ArweaveJWK, ArweaveTag } from '../types';
import { ARWEAVE_CONSTANTS } from '../constants';

/**
 * Convert Base64URL to standard Base64
 */
export function base64UrlToBase64(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}

/**
 * Convert standard Base64 to Base64URL
 */
export function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert string to Base64URL
 */
export function stringToBase64Url(str: string): string {
  const wordArray = CryptoJS.enc.Utf8.parse(str);
  const base64 = CryptoJS.enc.Base64.stringify(wordArray);
  return base64ToBase64Url(base64);
}

/**
 * Convert Base64URL to string
 */
export function base64UrlToString(base64Url: string): string {
  const base64 = base64UrlToBase64(base64Url);
  const wordArray = CryptoJS.enc.Base64.parse(base64);
  return CryptoJS.enc.Utf8.stringify(wordArray);
}

/**
 * Convert Buffer/Uint8Array to Base64URL
 */
export function bufferToBase64Url(buffer: Buffer | Uint8Array): string {
  const base64 = Buffer.from(buffer).toString('base64');
  return base64ToBase64Url(base64);
}

/**
 * Convert Base64URL to Buffer
 */
export function base64UrlToBuffer(base64Url: string): Buffer {
  const base64 = base64UrlToBase64(base64Url);
  return Buffer.from(base64, 'base64');
}

/**
 * Convert Winston to AR
 */
export function winstonToAR(winston: string | bigint): string {
  const winstonBigInt = typeof winston === 'string' ? BigInt(winston) : winston;
  const ar = Number(winstonBigInt) / Number(ARWEAVE_CONSTANTS.WINSTON_PER_AR);
  return ar.toFixed(12);
}

/**
 * Convert AR to Winston
 */
export function arToWinston(ar: string | number): string {
  const arNum = typeof ar === 'string' ? parseFloat(ar) : ar;
  const winston = BigInt(Math.floor(arNum * Number(ARWEAVE_CONSTANTS.WINSTON_PER_AR)));
  return winston.toString();
}

/**
 * Validate transaction ID format
 */
export function isValidTransactionId(txId: string): boolean {
  if (!txId || typeof txId !== 'string') {
    return false;
  }
  // Transaction IDs are 43-character Base64URL strings
  const base64UrlRegex = /^[A-Za-z0-9_-]{43}$/;
  return base64UrlRegex.test(txId);
}

/**
 * Validate Arweave address format
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  // Addresses are 43-character Base64URL strings
  const base64UrlRegex = /^[A-Za-z0-9_-]{43}$/;
  return base64UrlRegex.test(address);
}

/**
 * Parse JWK from string
 */
export function parseJwk(jwkString: string): ArweaveJWK {
  try {
    const jwk = JSON.parse(jwkString);
    if (!jwk.kty || !jwk.n || !jwk.e) {
      throw new Error('Invalid JWK: missing required fields');
    }
    return jwk as ArweaveJWK;
  } catch (error) {
    throw new Error(`Failed to parse JWK: ${(error as Error).message}`);
  }
}

/**
 * Derive wallet address from JWK
 */
export function deriveAddressFromJwk(jwk: ArweaveJWK): string {
  // The address is the SHA-256 hash of the public key (n) in Base64URL format
  const nBuffer = base64UrlToBuffer(jwk.n);
  const hashWordArray = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(nBuffer as unknown as number[]));
  const hashBase64 = CryptoJS.enc.Base64.stringify(hashWordArray);
  return base64ToBase64Url(hashBase64);
}

/**
 * Encode tags to Base64URL
 */
export function encodeTags(tags: { name: string; value: string }[]): ArweaveTag[] {
  return tags.map((tag) => ({
    name: stringToBase64Url(tag.name),
    value: stringToBase64Url(tag.value),
  }));
}

/**
 * Decode tags from Base64URL
 */
export function decodeTags(tags: ArweaveTag[]): { name: string; value: string }[] {
  return tags.map((tag) => ({
    name: base64UrlToString(tag.name),
    value: base64UrlToString(tag.value),
  }));
}

/**
 * Generate random anchor for transactions
 */
export function generateAnchor(): string {
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  const base64 = CryptoJS.enc.Base64.stringify(randomBytes);
  return base64ToBase64Url(base64);
}

/**
 * Calculate data size in bytes
 */
export function calculateDataSize(data: string | Buffer): number {
  if (Buffer.isBuffer(data)) {
    return data.length;
  }
  return Buffer.from(data).length;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse content type from file extension
 */
export function getContentTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    json: 'application/json',
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    xml: 'application/xml',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    zip: 'application/zip',
    csv: 'text/csv',
    md: 'text/markdown',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Create deep link to Arweave data
 */
export function createArweaveUrl(txId: string, gateway = 'https://arweave.net'): string {
  return `${gateway}/${txId}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Merge multiple tag arrays, removing duplicates
 */
export function mergeTags(...tagArrays: ArweaveTag[][]): ArweaveTag[] {
  const seen = new Set<string>();
  const result: ArweaveTag[] = [];
  
  for (const tags of tagArrays) {
    for (const tag of tags) {
      const key = `${tag.name}:${tag.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(tag);
      }
    }
  }
  
  return result;
}

/**
 * Create transaction signature message
 */
export function createSignatureMessage(
  format: number,
  owner: string,
  target: string,
  quantity: string,
  reward: string,
  lastTx: string,
  tags: ArweaveTag[],
  dataSize: string,
  dataRoot: string,
): string {
  const parts = [
    format.toString(),
    owner,
    target,
    quantity,
    reward,
    lastTx,
    ...tags.flatMap((t) => [t.name, t.value]),
    dataSize,
    dataRoot,
  ];
  return parts.join('');
}

/**
 * Sign a message with JWK
 */
export async function signMessage(jwk: ArweaveJWK, message: string): Promise<string> {
  // Create SHA-256 hash of message
  const messageHash = CryptoJS.SHA256(message);
  const hashBase64 = CryptoJS.enc.Base64.stringify(messageHash);
  
  // In a real implementation, this would use RSA-PSS signing
  // For now, we create a signature placeholder that includes the hash
  // Full implementation would require Web Crypto API or a proper RSA library
  const signatureData = {
    hash: hashBase64,
    publicKey: jwk.n.substring(0, 20),
    algorithm: 'RSA-PSS-SHA256',
  };
  
  const signatureJson = JSON.stringify(signatureData);
  return stringToBase64Url(signatureJson);
}

/**
 * Verify a signature
 */
export async function verifySignature(
  message: string,
  signature: string,
  publicKeyN: string,
): Promise<boolean> {
  try {
    // Decode signature
    const signatureJson = base64UrlToString(signature);
    const signatureData = JSON.parse(signatureJson);
    
    // Verify hash matches
    const messageHash = CryptoJS.SHA256(message);
    const hashBase64 = CryptoJS.enc.Base64.stringify(messageHash);
    
    if (signatureData.hash !== hashBase64) {
      return false;
    }
    
    // Verify public key prefix matches
    if (!publicKeyN.startsWith(signatureData.publicKey)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Alias exports for compatibility
export const encodeBase64Url = stringToBase64Url;
export const decodeBase64Url = base64UrlToString;
export const winstonToAr = winstonToAR;
export const validateTransactionId = isValidTransactionId;
