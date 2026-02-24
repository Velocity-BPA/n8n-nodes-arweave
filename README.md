# n8n-nodes-arweave

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Arweave, the permanent data storage protocol. This node provides 6 resources (Transaction, Data, GraphQLQuery, SmartWeaveContract, Wallet, Block) enabling permanent data storage, blockchain queries, smart contract interactions, and wallet management directly within your n8n workflows.

![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Arweave](https://img.shields.io/badge/Arweave-Compatible-green)
![Permanent Storage](https://img.shields.io/badge/Storage-Permanent-orange)
![SmartWeave](https://img.shields.io/badge/SmartWeave-Enabled-purple)

## Features

- **Permanent Data Storage** - Upload files and data to Arweave's permanent storage network with guaranteed availability
- **Transaction Management** - Create, submit, and query Arweave transactions with full metadata support
- **GraphQL Queries** - Execute complex queries against Arweave's GraphQL gateway for advanced data retrieval
- **SmartWeave Contracts** - Deploy, interact with, and query SmartWeave smart contracts on Arweave
- **Wallet Operations** - Generate wallets, check balances, and manage AR token transactions
- **Block Explorer** - Retrieve block information and network statistics from the Arweave blockchain
- **Flexible Authentication** - Support for wallet-based authentication and API key integration
- **Content Type Support** - Handle various file types and data formats with automatic MIME type detection

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
| Wallet Key | JWK (JSON Web Key) for your Arweave wallet | Yes |
| Gateway URL | Arweave gateway URL (default: https://arweave.net) | No |
| API Key | Optional API key for enhanced gateway access | No |

## Resources & Operations

### 1. Transaction

| Operation | Description |
|-----------|-------------|
| Create | Create a new Arweave transaction with data and tags |
| Submit | Submit a signed transaction to the network |
| Get | Retrieve transaction details by transaction ID |
| Get Status | Check the confirmation status of a transaction |
| Get Data | Retrieve the data payload from a transaction |
| Search | Search for transactions using filters and tags |

### 2. Data

| Operation | Description |
|-----------|-------------|
| Upload | Upload data or files to Arweave with permanent storage |
| Download | Download data from Arweave by transaction ID |
| Get Metadata | Retrieve metadata and tags for stored data |
| Verify | Verify data integrity and authenticity |

### 3. GraphQLQuery

| Operation | Description |
|-----------|-------------|
| Execute Query | Run custom GraphQL queries against Arweave's data |
| Get Transactions | Query transactions with advanced filtering |
| Get Blocks | Query block information using GraphQL |
| Get Tags | Search and filter by transaction tags |

### 4. SmartWeaveContract

| Operation | Description |
|-----------|-------------|
| Deploy | Deploy a new SmartWeave contract to Arweave |
| Interact | Send interactions to existing SmartWeave contracts |
| Read State | Read the current state of a SmartWeave contract |
| Get Contract | Retrieve contract source code and initial state |
| Get Interactions | List all interactions for a contract |

### 5. Wallet

| Operation | Description |
|-----------|-------------|
| Generate | Generate a new Arweave wallet |
| Get Balance | Check AR token balance for a wallet address |
| Get Address | Get the wallet address from a JWK |
| Transfer | Transfer AR tokens between wallets |
| Get Transactions | List transactions for a specific wallet |

### 6. Block

| Operation | Description |
|-----------|-------------|
| Get Current | Get the current block height and hash |
| Get Block | Retrieve block details by height or hash |
| Get Block Transactions | List all transactions in a specific block |
| Get Network Info | Get network statistics and information |

## Usage Examples

```javascript
// Upload permanent data to Arweave
{
  "data": "Hello, permanent web!",
  "tags": {
    "Content-Type": "text/plain",
    "App-Name": "n8n-workflow"
  }
}
```

```javascript
// Query transactions by tag
{
  "query": `{
    transactions(tags: [{name: "App-Name", values: ["n8n-workflow"]}]) {
      edges {
        node {
          id
          tags {
            name
            value
          }
        }
      }
    }
  }`
}
```

```javascript
// Deploy SmartWeave contract
{
  "contractSource": "export async function handle(state, action) { return {state}; }",
  "initState": {"counter": 0},
  "tags": {
    "App-Name": "Counter-Contract",
    "Contract-Src": "contract-source-tx-id"
  }
}
```

```javascript
// Transfer AR tokens
{
  "target": "wallet-address-here",
  "quantity": "1000000000000", // 1 AR in winston
  "tags": {
    "Type": "transfer",
    "App-Name": "n8n-payment"
  }
}
```

## Error Handling

| Error | Description | Solution |
|-------|-------------|----------|
| `WALLET_NOT_FOUND` | JWK wallet key is invalid or missing | Verify wallet key format and ensure it's properly configured |
| `INSUFFICIENT_FUNDS` | Not enough AR tokens for transaction | Check wallet balance and ensure sufficient funds for data upload |
| `TRANSACTION_NOT_FOUND` | Transaction ID does not exist | Verify transaction ID format and ensure transaction exists |
| `NETWORK_ERROR` | Gateway connection failed | Check network connectivity and try alternative gateway |
| `INVALID_CONTRACT_ID` | SmartWeave contract ID is invalid | Ensure contract ID is a valid Arweave transaction ID |
| `GRAPHQL_SYNTAX_ERROR` | Invalid GraphQL query syntax | Review query syntax against Arweave GraphQL schema |

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
- **SmartWeave Guide**: [github.com/ArweaveTeam/SmartWeave](https://github.com/ArweaveTeam/SmartWeave)