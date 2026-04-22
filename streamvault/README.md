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
├── Cargo.toml
└── README.md
```

- The Level 3 StreamVault contract source is in `contracts/streamvault/src/lib.rs`.

## Build and Test

From the `streamvault/` workspace root:

```bash
cargo test -p streamvault
```

If Windows policy blocks local Rust build scripts, run tests in cached Docker instead:

```powershell
.\scripts\test-docker.ps1
```

Build optimized contract WASM:

```bash
stellar contract build --package streamvault
```

Expected output WASM path:

```text
target/wasm32v1-none/release/streamvault.wasm
```

## Network Configuration

- Network: `testnet`
- Network passphrase: `Test SDF Network ; September 2015`
- Soroban RPC endpoint: `https://soroban-testnet.stellar.org`

## Testnet Deploy

Generate and fund a testnet identity once:

```bash
stellar keys generate --global streamflow-dev --network testnet --fund
```

Deploy StreamVault:

```bash
stellar contract deploy \
	--wasm target/wasm32v1-none/release/streamvault.wasm \
	--source streamflow-dev \
	--network testnet
```

The deploy command returns a contract id (`C...`). Save it for invokes.

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
	--source streamflow-dev \
	--network testnet \
	-- \
	create_stream \
	--sender <SENDER_G...> \
	--recipient <RECIPIENT_G...> \
	--token <TOKEN_CONTRACT_C...> \
	--rate_per_second 10 \
	--duration_seconds 3600
```

Read claimable for stream 0:

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source streamflow-dev \
	--network testnet \
	-- \
	get_claimable \
	--stream_id 0
```

Withdraw for stream 0 (recipient must authorize):

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source streamflow-dev \
	--network testnet \
	-- \
	withdraw \
	--stream_id 0
```

Cancel stream 0 (sender must authorize):

```bash
stellar contract invoke \
	--id <CONTRACT_ID> \
	--source streamflow-dev \
	--network testnet \
	-- \
	cancel \
	--stream_id 0
```
