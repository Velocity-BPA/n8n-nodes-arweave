/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  encodeBase64Url,
  decodeBase64Url,
  winstonToAr,
  arToWinston,
  validateTransactionId,
  formatFileSize,
  encodeTags,
  decodeTags,
} from '../../nodes/Arweave/utils/helpers';

describe('Arweave Helpers', () => {
  describe('Base64URL encoding/decoding', () => {
    it('should encode string to Base64URL', () => {
      const result = encodeBase64Url('Hello World');
      expect(result).toBe('SGVsbG8gV29ybGQ');
    });

    it('should decode Base64URL to string', () => {
      const result = decodeBase64Url('SGVsbG8gV29ybGQ');
      expect(result).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      expect(encodeBase64Url('')).toBe('');
      expect(decodeBase64Url('')).toBe('');
    });

    it('should handle special characters', () => {
      const original = 'Hello+World/Test=';
      const encoded = encodeBase64Url(original);
      const decoded = decodeBase64Url(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('Winston/AR conversion', () => {
    it('should convert winston to AR', () => {
      expect(winstonToAr('1000000000000')).toBe('1.000000000000');
      expect(winstonToAr('500000000000')).toBe('0.500000000000');
      expect(winstonToAr('1')).toBe('0.000000000001');
    });

    it('should convert AR to winston', () => {
      expect(arToWinston('1')).toBe('1000000000000');
      expect(arToWinston('0.5')).toBe('500000000000');
      expect(arToWinston('0.000000000001')).toBe('1');
    });

    it('should handle zero values', () => {
      expect(winstonToAr('0')).toBe('0.000000000000');
      expect(arToWinston('0')).toBe('0');
    });
  });

  describe('Transaction ID validation', () => {
    it('should validate correct transaction IDs', () => {
      // Valid 43-character Base64URL string
      expect(validateTransactionId('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq')).toBe(true);
      expect(validateTransactionId('0123456789-_ABCDEFGHIJKLMNOPQRSTUVWXYZabcde')).toBe(true);
    });

    it('should reject invalid transaction IDs', () => {
      // Too short
      expect(validateTransactionId('ABC')).toBe(false);
      // Too long (44 characters)
      expect(validateTransactionId('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr')).toBe(false);
      // Invalid characters (43 chars but with invalid chars)
      expect(validateTransactionId('ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()+=[]abc')).toBe(false);
      // Empty
      expect(validateTransactionId('')).toBe(false);
    });
  });

  describe('File size formatting', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });

  describe('Tag encoding/decoding', () => {
    it('should encode tags', () => {
      const tags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'MyApp' },
      ];
      const encoded = encodeTags(tags);
      expect(encoded).toHaveLength(2);
      expect(encoded[0].name).not.toBe('Content-Type');
      expect(encoded[0].value).not.toBe('application/json');
    });

    it('should decode tags', () => {
      const tags = [
        { name: 'Q29udGVudC1UeXBl', value: 'YXBwbGljYXRpb24vanNvbg' },
      ];
      const decoded = decodeTags(tags);
      expect(decoded).toHaveLength(1);
      expect(decoded[0].name).toBe('Content-Type');
      expect(decoded[0].value).toBe('application/json');
    });

    it('should handle empty arrays', () => {
      expect(encodeTags([])).toEqual([]);
      expect(decodeTags([])).toEqual([]);
    });
  });
});
