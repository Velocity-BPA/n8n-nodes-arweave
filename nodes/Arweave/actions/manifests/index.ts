/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  arweaveApiRequest,
  getTransaction,
  getTransactionData,
  graphqlRequest,
} from '../../transport/arweaveClient';
import { validateTransactionId, encodeBase64Url, decodeTags } from '../../utils/helpers';
import type { ArweaveManifest, ArweaveManifestPath } from '../../types';

export const manifestsOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['manifests'],
      },
    },
    options: [
      {
        name: 'Create Manifest',
        value: 'createManifest',
        description: 'Create a path manifest for static site',
        action: 'Create manifest',
      },
      {
        name: 'Upload With Manifest',
        value: 'uploadWithManifest',
        description: 'Deploy static site with manifest',
        action: 'Upload with manifest',
      },
      {
        name: 'Get Manifest',
        value: 'getManifest',
        description: 'Read manifest content',
        action: 'Get manifest',
      },
      {
        name: 'Resolve Path',
        value: 'resolvePath',
        description: 'Resolve path to transaction ID',
        action: 'Resolve path',
      },
    ],
    default: 'getManifest',
  },
];

export const manifestsFields: INodeProperties[] = [
  // Manifest ID
  {
    displayName: 'Manifest Transaction ID',
    name: 'manifestId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['manifests'],
        operation: ['getManifest', 'resolvePath'],
      },
    },
    description: 'The transaction ID of the manifest',
  },
  // Path to resolve
  {
    displayName: 'Path',
    name: 'path',
    type: 'string',
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['manifests'],
        operation: ['resolvePath'],
      },
    },
    description: 'The path to resolve within the manifest',
  },
  // Manifest paths for creation
  {
    displayName: 'Paths',
    name: 'paths',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    default: {},
    displayOptions: {
      show: {
        resource: ['manifests'],
        operation: ['createManifest', 'uploadWithManifest'],
      },
    },
    options: [
      {
        name: 'pathEntries',
        displayName: 'Path Entries',
        values: [
          {
            displayName: 'Path',
            name: 'path',
            type: 'string',
            default: '',
            description: 'The path (e.g., "index.html", "css/style.css")',
          },
          {
            displayName: 'Transaction ID',
            name: 'id',
            type: 'string',
            default: '',
            description: 'The transaction ID for this path',
          },
        ],
      },
    ],
    description: 'The paths and their transaction IDs',
  },
  // Index path
  {
    displayName: 'Index Path',
    name: 'indexPath',
    type: 'string',
    default: 'index.html',
    displayOptions: {
      show: {
        resource: ['manifests'],
        operation: ['createManifest', 'uploadWithManifest'],
      },
    },
    description: 'The default index path',
  },
  // Fallback path
  {
    displayName: 'Fallback Path',
    name: 'fallbackPath',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['manifests'],
        operation: ['createManifest', 'uploadWithManifest'],
      },
    },
    description: 'The fallback path for 404s (optional)',
  },
  // Additional tags
  {
    displayName: 'Additional Tags',
    name: 'additionalTags',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    default: {},
    displayOptions: {
      show: {
        resource: ['manifests'],
        operation: ['createManifest', 'uploadWithManifest'],
      },
    },
    options: [
      {
        name: 'tags',
        displayName: 'Tags',
        values: [
          {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            description: 'Tag name',
          },
          {
            displayName: 'Value',
            name: 'value',
            type: 'string',
            default: '',
            description: 'Tag value',
          },
        ],
      },
    ],
    description: 'Additional metadata tags',
  },
];

export async function executeManifestsOperation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', itemIndex) as string;
  const returnData: INodeExecutionData[] = [];

  try {
    switch (operation) {
      case 'createManifest': {
        const pathsInput = this.getNodeParameter('paths', itemIndex, {}) as {
          pathEntries?: Array<{ path: string; id: string }>;
        };
        const indexPath = this.getNodeParameter('indexPath', itemIndex, 'index.html') as string;
        const fallbackPath = this.getNodeParameter('fallbackPath', itemIndex, '') as string;

        const pathEntries = pathsInput.pathEntries || [];
        
        if (pathEntries.length === 0) {
          throw new NodeOperationError(this.getNode(), 'At least one path entry is required');
        }

        // Build manifest paths object
        const paths: Record<string, ArweaveManifestPath> = {};
        for (const entry of pathEntries) {
          if (!entry.path || !entry.id) {
            throw new NodeOperationError(this.getNode(), 'Each path entry must have both path and id');
          }
          if (!validateTransactionId(entry.id)) {
            throw new NodeOperationError(
              this.getNode(),
              `Invalid transaction ID for path "${entry.path}": ${entry.id}`,
            );
          }
          paths[entry.path] = { id: entry.id };
        }

        // Find index transaction ID
        const indexEntry = pathEntries.find((p) => p.path === indexPath);
        const indexId = indexEntry?.id || pathEntries[0]?.id || '';

        // Build manifest
        const manifest: ArweaveManifest = {
          manifest: 'arweave/paths',
          version: '0.1.0',
          index: { path: indexPath },
          paths,
        };

        // Add fallback if specified
        if (fallbackPath && paths[fallbackPath]) {
          manifest.fallback = { id: paths[fallbackPath].id };
        }

        returnData.push({
          json: {
            success: true,
            manifest,
            manifestJson: JSON.stringify(manifest, null, 2),
            manifestBase64: encodeBase64Url(JSON.stringify(manifest)),
            indexPath,
            indexId,
            pathCount: pathEntries.length,
            tags: [
              { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
              { name: 'App-Name', value: 'n8n-nodes-arweave' },
            ],
          },
        });
        break;
      }

      case 'uploadWithManifest': {
        const pathsInput = this.getNodeParameter('paths', itemIndex, {}) as {
          pathEntries?: Array<{ path: string; id: string }>;
        };
        const indexPath = this.getNodeParameter('indexPath', itemIndex, 'index.html') as string;
        const fallbackPath = this.getNodeParameter('fallbackPath', itemIndex, '') as string;
        const additionalTagsInput = this.getNodeParameter('additionalTags', itemIndex, {}) as {
          tags?: Array<{ name: string; value: string }>;
        };

        const pathEntries = pathsInput.pathEntries || [];
        
        if (pathEntries.length === 0) {
          throw new NodeOperationError(this.getNode(), 'At least one path entry is required');
        }

        // Build paths
        const paths: Record<string, ArweaveManifestPath> = {};
        for (const entry of pathEntries) {
          if (!validateTransactionId(entry.id)) {
            throw new NodeOperationError(
              this.getNode(),
              `Invalid transaction ID for path "${entry.path}"`,
            );
          }
          paths[entry.path] = { id: entry.id };
        }

        // Build manifest
        const manifest: ArweaveManifest = {
          manifest: 'arweave/paths',
          version: '0.1.0',
          index: { path: indexPath },
          paths,
        };

        if (fallbackPath && paths[fallbackPath]) {
          manifest.fallback = { id: paths[fallbackPath].id };
        }

        const manifestData = JSON.stringify(manifest);
        
        // Prepare tags
        const tags = [
          { name: encodeBase64Url('Content-Type'), value: encodeBase64Url('application/x.arweave-manifest+json') },
          { name: encodeBase64Url('App-Name'), value: encodeBase64Url('n8n-nodes-arweave') },
        ];

        // Add additional tags
        const additionalTags = additionalTagsInput.tags || [];
        for (const tag of additionalTags) {
          tags.push({
            name: encodeBase64Url(tag.name),
            value: encodeBase64Url(tag.value),
          });
        }

        // Note: Full transaction signing would require crypto operations
        // This creates the manifest data that can be signed and submitted
        returnData.push({
          json: {
            success: true,
            message: 'Manifest prepared for upload',
            manifest,
            manifestData,
            manifestSize: Buffer.byteLength(manifestData, 'utf-8'),
            tags: tags.map((t) => ({
              name: Buffer.from(t.name, 'base64').toString('utf-8'),
              value: Buffer.from(t.value, 'base64').toString('utf-8'),
            })),
            pathCount: pathEntries.length,
            indexPath,
            note: 'Use Data Upload resource to upload the manifest data with these tags',
          },
        });
        break;
      }

      case 'getManifest': {
        const manifestId = this.getNodeParameter('manifestId', itemIndex) as string;

        if (!validateTransactionId(manifestId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid manifest transaction ID');
        }

        // Get transaction to verify it's a manifest
        const tx = await getTransaction(this, manifestId);
        const tags = decodeTags(tx.tags || []);
        
        const contentType = tags.find((t) => t.name === 'Content-Type')?.value;
        if (contentType && !contentType.includes('manifest')) {
          throw new NodeOperationError(
            this.getNode(),
            `Transaction is not a manifest (Content-Type: ${contentType})`,
          );
        }

        // Get manifest data
        const data = await getTransactionData(this, manifestId, true);
        let manifest: ArweaveManifest;
        
        try {
          manifest = JSON.parse(data.toString()) as ArweaveManifest;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Failed to parse manifest JSON');
        }

        const pathList = Object.entries(manifest.paths || {}).map(([path, info]) => ({
          path,
          id: info.id,
          url: `https://arweave.net/${info.id}`,
        }));

        returnData.push({
          json: {
            success: true,
            manifestId,
            manifest,
            version: manifest.version,
            indexPath: manifest.index?.path,
            fallbackId: manifest.fallback?.id,
            pathCount: pathList.length,
            paths: pathList,
            baseUrl: `https://arweave.net/${manifestId}`,
          },
        });
        break;
      }

      case 'resolvePath': {
        const manifestId = this.getNodeParameter('manifestId', itemIndex) as string;
        const path = this.getNodeParameter('path', itemIndex) as string;

        if (!validateTransactionId(manifestId)) {
          throw new NodeOperationError(this.getNode(), 'Invalid manifest transaction ID');
        }

        // Get manifest data
        const data = await getTransactionData(this, manifestId, true);
        let manifest: ArweaveManifest;
        
        try {
          manifest = JSON.parse(data.toString()) as ArweaveManifest;
        } catch {
          throw new NodeOperationError(this.getNode(), 'Failed to parse manifest JSON');
        }

        // Clean path
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;

        // Look up path
        let resolvedId: string | null = null;
        let resolvedPath = cleanPath;

        if (manifest.paths && manifest.paths[cleanPath]) {
          resolvedId = manifest.paths[cleanPath].id;
        } else if (cleanPath === '' && manifest.index) {
          // Return index if path is empty
          resolvedPath = manifest.index.path;
          resolvedId = manifest.paths?.[manifest.index.path]?.id || null;
        } else if (manifest.fallback) {
          // Use fallback
          resolvedId = manifest.fallback.id;
          resolvedPath = 'fallback';
        }

        if (!resolvedId) {
          throw new NodeOperationError(
            this.getNode(),
            `Path "${cleanPath}" not found in manifest`,
          );
        }

        returnData.push({
          json: {
            success: true,
            manifestId,
            requestedPath: path,
            resolvedPath,
            transactionId: resolvedId,
            url: `https://arweave.net/${resolvedId}`,
            manifestUrl: `https://arweave.net/${manifestId}/${cleanPath}`,
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
