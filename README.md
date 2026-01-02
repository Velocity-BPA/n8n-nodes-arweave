# n8n-nodes-arweave

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Arweave, the permanent decentralized storage network. Arweave uses a "pay once, store forever" model with its blockweave technology. This node provides complete integration for data storage, retrieval, transactions, smart contracts, and more.

![n8n](https://img.shields.io/badge/n8n-community--node-orange)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)

## Features

- **13 Resource Categories** with 70+ operations
- **Permanent Data Storage** - Upload data that lasts forever
- **GraphQL Queries** - Advanced transaction and block searches
- **SmartWeave Contracts** - Read contract state and interactions
- **ANS-104 Bundles** - Efficient batch uploads
- **Path Manifests** - Deploy static sites
- **ArNS Integration** - Friendly URLs for your content
- **Trigger Node** - Poll for new transactions, blocks, and contract updates

## Installation

### Community Nodes (Recommended)

1. Open your n8n instance
2. Go to **Settings** > **Community Nodes**
3. Click **Install a community node**
4. Enter: `n8n-nodes-arweave`
5. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the package
npm install n8n-nodes-arweave

# Restart n8n
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-arweave.git
cd n8n-nodes-arweave

# Install dependencies
npm install

# Build
npm run build

# Create symlink
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-arweave

# Restart n8n
```

## Credentials Setup

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| Wallet JWK | Arweave wallet JSON Web Key | Yes | - |
| Gateway URL | Arweave gateway endpoint | No | https://arweave.net |
| GraphQL Endpoint | GraphQL API endpoint | No | https://arweave.net/graphql |
| Bundlr Endpoint | Bundlr/Irys endpoint for bundles | No | - |
| Network | mainnet or testnet | No | mainnet |
| Timeout | Request timeout in ms | No | 30000 |

### Getting a Wallet

1. Visit [ArConnect](https://arconnect.io/) or [arweave.app](https://arweave.app/)
2. Create a new wallet
3. Export your JWK (keyfile)
4. Paste the JWK JSON into the credentials

## Resources & Operations

### Transactions
- Get Transaction - Retrieve transaction by ID
- Get Transaction Status - Check confirmation status
- Get Transaction Data - Download stored data
- Get Transaction Tags - Get metadata tags
- Get Transaction Field - Get specific field
- Submit Transaction - Post signed transaction
- Get Pending Transactions - View mempool

### Data Upload
- Upload Data - Store string/buffer permanently
- Upload File - Store file with Content-Type
- Upload JSON - Store JSON object
- Get Upload Price - Calculate storage cost
- Batch Upload - Upload multiple items
- Create Data Item - Create ANS-104 bundle item

### Data Retrieval
- Get Data by ID - Fetch by transaction ID
- Get Raw Data - Get unprocessed bytes
- Get JSON Data - Parse and return JSON
- Stream Data - Stream large files
- Get Manifest Data - Resolve path manifests

### Wallet
- Get Balance - Check AR balance
- Get Address - Derive address from JWK
- Get Last Transaction - Get last outgoing tx
- Generate Wallet - Create new wallet (reference)
- Get Transaction History - Query activity

### GraphQL
- Query Transactions - Advanced search
- Query by Tags - Filter by metadata
- Query by Owner - Filter by address
- Query by Recipient - Filter by target
- Query by Block - Filter by height range

### Blocks
- Get Block by Hash - Retrieve by indep_hash
- Get Block by Height - Retrieve by height
- Get Current Block - Get latest block
- Get Block Transactions - List transactions in block

### Network
- Get Network Info - Chain status
- Get Peers - Connected peers
- Get Pending Count - Mempool size
- Get Hash List - Block hash list

### Pricing
- Get Price - Cost for data size
- Get Price for Target - Cost including recipient
- Get Reward Address - Mining reward address
- Estimate Upload Cost - Multi-file estimate

### Bundles (ANS-104)
- Create Bundle - Group data items
- Create Data Item - Single bundle item
- Sign Data Item - Sign for bundle
- Upload Bundle - Submit bundle tx
- Unbundle - Extract items

### Manifests
- Create Manifest - Create path routing
- Upload with Manifest - Deploy static site
- Get Manifest - Read manifest content
- Resolve Path - Path to transaction ID

### ArNS (Name System)
- Get ArNS Record - Lookup name record
- Search Names - Find available names
- Get Name Owner - Check ownership
- Register Name - Register via SmartWeave

### SmartWeave
- Read Contract State - Get current state
- Get Contract Source - Get contract code
- Get Contract Interactions - Interaction history
- Dry Run Interaction - Simulate call

### Utility
- Validate Transaction ID - Check format
- Winston to AR - Convert units
- AR to Winston - Convert units
- Sign Message - Create signature
- Verify Signature - Verify message
- Get API Health - Check gateway

## Trigger Node

The Arweave Trigger node polls for events:

| Trigger | Description |
|---------|-------------|
| New Transaction by Tag | Transactions matching specific tags |
| New Transaction by Owner | Transactions from an address |
| Block Mined | New blocks on the network |
| Large Upload Detected | Uploads above size threshold |
| Contract State Changed | New SmartWeave interactions |

## Usage Examples

### Upload JSON Data

```json
{
  "resource": "dataUpload",
  "operation": "uploadJSON",
  "jsonData": {"message": "Hello Arweave!"},
  "tags": [
    {"name": "Content-Type", "value": "application/json"},
    {"name": "App-Name", "value": "MyApp"}
  ]
}
```

### Query Transactions by Tag

```json
{
  "resource": "graphql",
  "operation": "queryByTags",
  "tags": [
    {"name": "App-Name", "values": ["MyApp"]}
  ],
  "limit": 100
}
```

### Check Wallet Balance

```json
{
  "resource": "wallet",
  "operation": "getWalletBalance"
}
```

## Arweave Concepts

| Concept | Description |
|---------|-------------|
| Blockweave | Arweave's blockchain variant with block links |
| Winston | Smallest AR unit (1 AR = 10¹² winston) |
| Gateway | HTTP node serving Arweave data |
| Data Transaction | Transaction containing stored data |
| Transfer Transaction | AR token transfer |
| Tags | Key-value metadata on transactions |
| Content-Type | Tag for HTTP MIME type serving |
| Bundle | ANS-104 grouped data items |
| Manifest | Path routing for static sites |
| SmartWeave | Lazy-evaluation smart contracts |
| ArNS | Arweave Name System for friendly URLs |

## Error Handling

The node provides detailed error messages:

- **Invalid Transaction ID** - Malformed 43-character Base64URL
- **Insufficient Balance** - Not enough AR for operation
- **Transaction Not Found** - ID doesn't exist
- **Network Error** - Gateway connectivity issues
- **Rate Limited** - Too many requests

Enable "Continue on Fail" to process items that fail without stopping the workflow.

## Security Best Practices

1. **Protect Your JWK** - Your wallet key controls your funds
2. **Use Testnet** - Test with testnet before mainnet
3. **Verify Costs** - Check prices before large uploads
4. **Backup Wallets** - Keep secure backups of JWKs

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

All contributions are subject to the BSL 1.1 license.

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-arweave/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Velocity-BPA/n8n-nodes-arweave/discussions)
- **Commercial Support**: licensing@velobpa.com

## Acknowledgments

- [Arweave](https://arweave.org/) - The permanent storage network
- [n8n](https://n8n.io/) - The workflow automation platform
- The Arweave community for documentation and tools
