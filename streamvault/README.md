# Soroban Project

## Project Structure

This repository uses the recommended structure for a Soroban project:

```text
.
├── contracts
│   └── streamvault
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── scripts
│   └── test-docker.ps1
├── Cargo.toml
└── README.md
```

- The Level 4 contract source is in `contracts/*/src/lib.rs`.
- The workspace contains `StreamVault`, `StreamFactory`, `FlowToken`, and `MockBlendPool` contracts.

## Build and Test

From the `streamvault/` workspace root:

```bash
cargo test --workspace
```

If Windows policy blocks local Rust build scripts, run tests in cached Docker instead (the `test-docker.ps1` script resides in the repository's `scripts/` directory):

```powershell
.\scripts\test-docker.ps1
```

Build optimized contract WASM:

```bash
stellar contract build --package streamvault
```

Expected output WASM paths:

```text
target/wasm32v1-none/release/streamvault.wasm
target/wasm32v1-none/release/streamfactory.wasm
target/wasm32v1-none/release/flowtoken.wasm
target/wasm32v1-none/release/mockblend.wasm
```

## Network Configuration

- Network: `testnet`
- Network passphrase: `Test SDF Network ; September 2015`
- Soroban RPC endpoint: `https://soroban-testnet.stellar.org`

## Testnet Deploy

Generate and fund a testnet identity once:

```bash
stellar keys generate --global splash-dev --network testnet --fund
```

Deploy StreamVault:

```bash
stellar contract deploy \
	--wasm target/wasm32v1-none/release/streamvault.wasm \
	--source splash-dev \
	--network testnet
```

The deploy command returns a contract id (`C...`). Save it for invokes.

Deploy the Level 4 contracts and save each returned id:

```bash
stellar contract deploy \
	--wasm target/wasm32v1-none/release/streamfactory.wasm \
	--source splash-dev \
	--network testnet

stellar contract deploy \
	--wasm target/wasm32v1-none/release/flowtoken.wasm \
	--source splash-dev \
	--network testnet

stellar contract deploy \
	--wasm target/wasm32v1-none/release/mockblend.wasm \
	--source splash-dev \
	--network testnet
```

Initialize the FLOW token first, then initialize the vault with the Blend/mock pool and FLOW addresses:

```bash
stellar contract invoke \
	--id <FLOW_TOKEN_CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	initialize \
	--admin <STREAMVAULT_CONTRACT_ID>

stellar contract invoke \
	--id <STREAMVAULT_CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	initialize \
	--admin <SENDER_G...> \
	--blend_pool <BLEND_POOL_OR_MOCK_CONTRACT_ID> \
	--flow_token <FLOW_TOKEN_CONTRACT_ID> \
	--fee_bps 1000
```

## Example Invokes

Replace placeholders before running:

- `<CONTRACT_ID>`: deployed StreamVault contract id
- `<SENDER_G...>`: sender account address
- `<RECIPIENT_G...>`: recipient account address
- `<TOKEN_CONTRACT_C...>`: testnet token contract address used for transfers

Create stream:

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	create_stream \
	--sender <SENDER_G...> \
	--recipient <RECIPIENT_G...> \
	--token <TOKEN_CONTRACT_C...> \
	--rate_per_second 10 \
	--duration_seconds 3600
```

Create through the Level 4 factory:

```bash
stellar contract invoke \
	--id <STREAMFACTORY_CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	create_stream \
	--sender <SENDER_G...> \
	--vault <STREAMVAULT_CONTRACT_ID> \
	--recipient <RECIPIENT_G...> \
	--token <TOKEN_CONTRACT_C...> \
	--rate_per_second 10 \
	--duration_seconds 3600
```

Read claimable for stream 0:

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	get_claimable \
	--stream_id 0
```

Withdraw for stream 0 (recipient must authorize):

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	withdraw \
	--stream_id 0
```

Cancel stream 0 (sender must authorize):

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source splash-dev \
	--network testnet \
	-- \
	cancel \
	--stream_id 0
```
