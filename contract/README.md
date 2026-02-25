# Token Leaderboard Smart Contract

A Soroban smart contract for tracking player scores and maintaining a real-time leaderboard.

## Features

- **Claim Tokens**: Players can claim tokens to increase their score
- **Leaderboard Tracking**: Automatically maintains top 10 players
- **Score Management**: View individual player scores
- **Event Emission**: Emits events for real-time updates

## Contract Functions

### `initialize()`
Initializes the contract storage. Must be called once after deployment.

### `claim_tokens(player: Address, amount: u32) -> u32`
Allows a player to claim tokens and increase their score.
- **Parameters**: 
  - `player`: The player's Stellar address
  - `amount`: Number of tokens to claim
- **Returns**: The player's new total score
- **Events**: Emits a `claim` event with amount and new score

### `get_score(player: Address) -> u32`
Returns the current score for a specific player.

### `get_leaderboard(limit: u32) -> Vec<Player>`
Returns the top N players from the leaderboard.
- **Parameters**:
  - `limit`: Maximum number of players to return (up to 10)
- **Returns**: Vector of Player objects sorted by score (highest first)

### `reset_score(player: Address)`
Resets a player's score to 0 (requires player authorization).

## Deployment Instructions

### Prerequisites

1. Install Rust and Cargo:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. Install Stellar CLI:
   ```bash
   cargo install --locked stellar-cli
   ```

3. Configure for Testnet:
   ```bash
   stellar network add --global testnet \
     --rpc-url https://soroban-testnet.stellar.org:443 \
     --network-passphrase "Test SDF Network ; September 2015"
   ```

### Build the Contract

```bash
cd contract
stellar contract build
```

This creates a `.wasm` file in `target/wasm32-unknown-unknown/release/`

### Deploy to Testnet

1. Create a test account (if you don't have one):
   ```bash
   stellar keys generate --global deployer --network testnet
   stellar keys address deployer
   ```

2. Fund your account with test XLM:
   Visit https://friendbot.stellar.org and fund your deployer address

3. Deploy the contract:
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/token_leaderboard.wasm \
     --source deployer \
     --network testnet
   ```

   Save the returned contract ID - you'll need it for frontend integration!

4. Initialize the contract:
   ```bash
   stellar contract invoke \
     --id <CONTRACT_ID> \
     --source deployer \
     --network testnet \
     -- \
     initialize
   ```

### Interact with Contract

Example: Claim tokens
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  claim_tokens \
  --player <YOUR_PUBLIC_KEY> \
  --amount 10
```

Example: Get leaderboard
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  get_leaderboard \
  --limit 10
```

## Frontend Integration

After deployment, update `src/contract.js` with your contract ID and use the provided functions to interact from your React app.

## Testing

Run contract tests:
```bash
cargo test
```

## Learn More

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Stellar CLI Guide](https://developers.stellar.org/docs/tools/developer-tools/cli)
