# n8n-nodes-arweave

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

This n8n community node provides comprehensive integration with the Arweave permanent data storage network. It includes 5 resources with capabilities for transaction management, wallet operations, block exploration, GraphQL querying, and price tracking across the Arweave ecosystem.

![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Arweave](https://img.shields.io/badge/Arweave-Compatible-orange)
![Permaweb](https://img.shields.io/badge/Permaweb-Ready-green)
![AR Token](https://img.shields.io/badge/AR-Token-red)

## Features

- **Transaction Management** - Create, send, and track Arweave transactions with data permanence guarantees
- **Wallet Operations** - Generate wallets, check balances, and manage AR token transfers
- **Block Explorer** - Query block information, heights, and network statistics
- **GraphQL Integration** - Execute complex queries against Arweave's GraphQL endpoint for advanced data retrieval
- **Price Monitoring** - Real-time AR token price tracking and historical data analysis
- **Data Permanence** - Store data permanently on the Arweave network with cryptographic verification
- **Gateway Support** - Compatible with multiple Arweave gateway endpoints for reliability
- **Metadata Handling** - Full support for transaction tags and metadata management

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-arweave`
5. Click **Install**

### Manual Installation

```bash
cd ~/.n8n
npm install n8n-nodes-arweave
```

### Development Installation

```bash
git clone https://github.com/Velocity-BPA/n8n-nodes-arweave.git
cd n8n-nodes-arweave
npm install
npm run build
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-arweave
n8n start
```

## Credentials Setup

| Field | Description | Required |
|-------|-------------|----------|
| API Key | Arweave API key or wallet private key (JWK format) | Yes |
| Gateway URL | Custom Arweave gateway endpoint (defaults to arweave.net) | No |
| Environment | Select mainnet or testnet environment | Yes |

## Resources & Operations

### 1. Transaction

| Operation | Description |
|-----------|-------------|
| Create | Create a new Arweave transaction with data or AR transfer |
| Send | Submit a signed transaction to the Arweave network |
| Get | Retrieve transaction details by transaction ID |
| Get Status | Check the confirmation status of a transaction |
| Get Data | Download data content from a transaction |
| List | Get transactions for a specific wallet address |

### 2. Wallet

| Operation | Description |
|-----------|-------------|
| Generate | Create a new Arweave wallet and export JWK |
| Get Balance | Check AR token balance for a wallet address |
| Get Address | Get wallet address from JWK private key |
| Get Public Key | Extract public key from wallet credentials |

### 3. Block

| Operation | Description |
|-----------|-------------|
| Get | Retrieve block information by block hash or height |
| Get Current | Get the latest block information |
| Get Height | Get current network block height |
| Get Hash | Get block hash by height number |

### 4. GraphQL

| Operation | Description |
|-----------|-------------|
| Query | Execute custom GraphQL queries against Arweave |
| Get Transactions | Query transactions with filtering and pagination |
| Get Blocks | Query block data with advanced filters |
| Search Tags | Search transactions by tag name and value |

### 5. Price

| Operation | Description |
|-----------|-------------|
| Get Current | Get current AR token price in various currencies |
| Get Historical | Retrieve historical price data for specified date range |
| Get Market Data | Get comprehensive market data including volume and market cap |

## Usage Examples

```javascript
// Create and send a data transaction
{
  "data": "Hello, permanent web!",
  "tags": [
    {"name": "Content-Type", "value": "text/plain"},
    {"name": "App-Name", "value": "MyApp"}
  ],
  "target": "",
  "quantity": "0"
}
```

```javascript
// Query transactions using GraphQL
{
  "query": `{
    transactions(
      tags: [
        {name: "App-Name", values: ["MyApp"]}
      ]
      first: 10
    ) {
      edges {
        node {
          id
          owner { address }
          data { size }
          tags { name value }
        }
      }
    }
  }`
}
```

```javascript
// Check wallet balance
{
  "address": "1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY"
}
```

```javascript
// Get historical price data
{
  "currency": "USD",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31",
  "interval": "daily"
}
```

## Error Handling

| Error | Description | Solution |
|-------|-------------|----------|
| Invalid JWK Format | Wallet private key is not in correct JWK format | Ensure the API key field contains valid JWK JSON |
| Insufficient Balance | Not enough AR tokens for transaction | Check wallet balance and add funds if needed |
| Transaction Not Found | Transaction ID does not exist on network | Verify transaction ID and check network status |
| Gateway Timeout | Arweave gateway is not responding | Try different gateway URL or retry later |
| Invalid GraphQL Query | Malformed GraphQL syntax or query | Validate GraphQL query syntax and structure |
| Rate Limit Exceeded | Too many requests to Arweave gateway | Implement delays between requests or use different gateway |

## Development

```bash
npm install
npm run build
npm test
npm run lint
npm run dev
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

For licensing inquiries: **licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please ensure:

1. Code follows existing style conventions
2. All tests pass (`npm test`)
3. Linting passes (`npm run lint`)
4. Documentation is updated for new features
5. Commit messages are descriptive

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-arweave/issues)
- **Arweave Documentation**: [docs.arweave.org](https://docs.arweave.org)
- **Arweave Community**: [discord.gg/arweave](https://discord.gg/arweave)