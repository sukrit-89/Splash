# Splash

![Splash protocol preview](splash.png)

**Splash** is the home of **StreamFlow**, a real-time payment streaming protocol for Stellar Soroban.

The Level 3 MVP is centered on `StreamVault`: a Soroban smart contract that lets a sender deposit funds, stream them to a recipient over time, allow withdrawals as value accrues, and cancel a stream with the unvested remainder returned.

## Why It Exists

Traditional payments move in batches: weekly payroll, monthly invoices, delayed contractor payouts, and idle capital sitting between sender and recipient. Splash turns payment into a live flow. Funds accrue second by second, and the recipient can claim what has already been earned without waiting for a billing cycle to close.

The longer product vision adds Blend yield composability so deposited stream funds can become productive while they are waiting to be paid out. That Level 4 layer is planned in the PRD; the current repository is focused on the Level 3 StreamVault contract.

## Current Scope

This repository currently includes:

- `StreamVault`, the Level 3 Soroban contract
- Stream creation with sender authorization
- Per-second claimable balance calculation
- Recipient withdrawals
- Sender cancellation with earned/unearned split
- Contract tests for creation, withdrawal, multiple withdrawals, and cancellation
- Product planning in [PRD.MD](PRD.MD)

Planned Level 4 extensions include a stream factory, Blend integration, a `FLOW` token, richer event surfaces, CI/CD, and a full mobile-ready dApp.

## Repository Layout

```text
.
|-- splash.png
|-- PRD.MD
|-- AGENTS.md
`-- streamvault
    |-- Cargo.toml
    |-- contracts
    |   `-- streamvault
    |       |-- Cargo.toml
    |       |-- Makefile
    |       `-- src
    |           |-- lib.rs
    |           `-- test.rs
    `-- scripts
        `-- test-docker.ps1
```

## Contract Highlights

`StreamVault` uses a simple on-chain accounting model:

```text
claimable = elapsed_time * rate_per_second - withdrawn_amount
```

Each stream stores the sender, recipient, token contract, start and end timestamps, rate, deposited amount, withdrawn amount, and active status. The contract keeps state compact and deterministic, with authorization checks at the boundary where funds move.

Core methods:

- `create_stream(sender, recipient, token, rate_per_second, duration_seconds)`
- `withdraw(stream_id)`
- `cancel(stream_id)`
- `get_stream(stream_id)`
- `get_claimable(stream_id)`

## Test

From the StreamVault workspace:

```powershell
Set-Location .\streamvault
cargo test -p streamvault
```

On Windows, the cached Docker test path is often more reliable:

```powershell
Set-Location .\streamvault
.\scripts\test-docker.ps1
```

Equivalent Docker command:

```powershell
docker run --rm `
  -v "${PWD}:/work" `
  -v "streamvault-cargo-registry:/usr/local/cargo/registry" `
  -v "streamvault-cargo-git:/usr/local/cargo/git" `
  -v "streamvault-target:/work/target" `
  -w /work `
  rust:1-bullseye `
  /usr/local/cargo/bin/cargo test -p streamvault --target x86_64-unknown-linux-gnu
```

## Build

```bash
cd streamvault
stellar contract build --package streamvault
```

Expected WASM output:

```text
streamvault/target/wasm32v1-none/release/streamvault.wasm
```

## Testnet Notes

Network defaults are documented in [streamvault/README.md](streamvault/README.md):

- Network: `testnet`
- Passphrase: `Test SDF Network ; September 2015`
- RPC: `https://soroban-testnet.stellar.org`

Do not commit private keys, funded secrets, or hardcoded production addresses. Use generated testnet identities and local environment configuration when deploying.

## Product Direction

Splash is being built in small, verifiable increments:

1. Level 3: prove the StreamVault primitive with clean contract behavior and tests.
2. Minimal dApp: make the live balance visible and easy to demo.
3. Level 4: add factory isolation, Blend yield, `FLOW`, events, mobile polish, and CI/CD.

The source of truth for scope and sequencing is [PRD.MD](PRD.MD).
