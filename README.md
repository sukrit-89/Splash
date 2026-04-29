# Splash

Splash is a Level 3 Stellar Soroban payment streaming dApp. A sender locks funds in a deployed `StreamVault` contract, the recipient earns value every second, and either party can complete the simple stream lifecycle through a React + Freighter frontend.

![Splash protocol preview](splash.png)

## Submission Links

| Item | Link / Evidence |
| --- | --- |
| Public repository | <https://github.com/sukrit-89/Splash> |
| Live demo | Add your Vercel production URL here after deployment |
| Demo video | Add your Loom or YouTube URL here after recording |
| Test output screenshot | [Testcase.png](Testcase.png) |
| Contract tests | `5 passed; 0 failed` |
| Testnet StreamVault | `CCE2PSOOTQWLNCY3RFJOSI7RNIRVQFE64L33KJNBXTXOW63YVRRQLFA6` |

## What It Does

Splash turns a fixed payment deposit into a real-time stream.

1. The sender creates a stream with recipient, token, rate per second, and duration.
2. The contract locks the full stream deposit from the sender.
3. The recipient's claimable amount grows as ledger time passes.
4. The recipient can withdraw accrued funds.
5. The sender can cancel early, paying the recipient what has accrued and refunding the unstreamed balance.

This repository is intentionally scoped to Level 3:

- Single Soroban `StreamVault` contract.
- React + Vite frontend.
- Freighter wallet signing.
- Stellar testnet deployment.
- Local stream cache for created streams.
- Five passing Soroban contract tests.

Level 4 features such as `StreamFactory`, Blend yield integration, `FLOW` receipt tokens, event indexing, mobile polish, and CI/CD are not part of this Level 3 implementation.

## Live Formula

The product's core behavior is the claimable balance formula:

```text
total_deposit = rate_per_second * duration_seconds
end_timestamp = start_timestamp + duration_seconds
elapsed = min(current_timestamp, end_timestamp) - start_timestamp
accrued = elapsed * rate_per_second
claimable = min(accrued - already_withdrawn, total_deposit - already_withdrawn)
```

When the recipient withdraws:

```text
already_withdrawn = already_withdrawn + claimable
```

When the sender cancels:

```text
recipient_owed = claimable at cancel time
sender_refund = total_deposit - already_withdrawn - recipient_owed
```

## Architecture

```text
Freighter wallet
   |
   | signs prepared Soroban transactions
   v
React + Vite frontend
   |
   | Stellar RPC simulation, assembly, submission, polling
   v
StreamVault contract on Stellar testnet
   |
   | token transfer calls
   v
Stellar Asset Contract token
```

## Repository Structure

```text
.
|-- README.md
|-- Testcase.png
|-- formulas.md
|-- frontend
|   |-- package.json
|   |-- .env.example
|   |-- src
|   |   |-- components
|   |   |-- hooks
|   |   |-- lib
|   |   |-- pages
|   |   `-- types
|   `-- vite.config.ts
`-- streamvault
    |-- Cargo.toml
    |-- README.md
    |-- scripts
    |   `-- test-docker.ps1
    `-- contracts
        `-- streamvault
            |-- Cargo.toml
            `-- src
                |-- lib.rs
                `-- test.rs
```

## Contract Interface

| Function | Auth | Description |
| --- | --- | --- |
| `create_stream(sender, recipient, token, rate_per_second, duration_seconds)` | Sender | Locks the stream deposit and stores stream metadata. |
| `withdraw(stream_id)` | Recipient | Transfers currently claimable funds to the recipient. |
| `cancel(stream_id)` | Sender | Pays accrued funds to the recipient and refunds the unstreamed amount. |
| `get_claimable(stream_id)` | None | Returns the currently withdrawable amount without mutating state. |
| `get_stream(stream_id)` | None | Returns all stream metadata. |
| `get_stream_count()` | None | Returns the next stream id. |

## Testnet Configuration

| Item | Value |
| --- | --- |
| Network | Stellar testnet |
| Network passphrase | `Test SDF Network ; September 2015` |
| RPC URL | `https://soroban-testnet.stellar.org` |
| StreamVault | `CCE2PSOOTQWLNCY3RFJOSI7RNIRVQFE64L33KJNBXTXOW63YVRRQLFA6` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Demo USDC SAC | `CBR7ZWCNWEX43SLWEQCMJBXZLBP5U46EV2DQ2EKYED65DJKL4SX6TRRF` |

The demo USDC contract is for testnet demonstration only. It is not production Circle USDC.

## Local Development

Install frontend dependencies:

```powershell
Set-Location .\frontend
npm install
```

Create `frontend/.env.local` using `frontend/.env.example`:

```text
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_STREAMVAULT_CONTRACT_ID=CCE2PSOOTQWLNCY3RFJOSI7RNIRVQFE64L33KJNBXTXOW63YVRRQLFA6
VITE_USDC_TOKEN_CONTRACT_ID=CBR7ZWCNWEX43SLWEQCMJBXZLBP5U46EV2DQ2EKYED65DJKL4SX6TRRF
VITE_XLM_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Run the frontend:

```powershell
npm run dev
```

Build the frontend:

```powershell
npm run build
```

## Contract Tests

Run the Docker test command from `streamvault/`:

```powershell
Set-Location "F:\StellarMonthly\Splash\streamvault"
docker run --rm `
  -v "${PWD}:/work" `
  -v "streamvault-cargo-registry:/usr/local/cargo/registry" `
  -v "streamvault-cargo-git:/usr/local/cargo/git" `
  -v "streamvault-target:/work/target" `
  -w /work `
  rust:1-bullseye `
  /usr/local/cargo/bin/cargo test -p streamvault --target x86_64-unknown-linux-gnu
```

Latest verified result:

```text
running 5 tests
test result: ok. 5 passed; 0 failed
```

The tests cover:

- Stream creation and stored metadata.
- Withdraw claimable calculation.
- Cancel payout and refund split.
- Multiple withdrawals reaching completion.
- Rejection of cancellation after stream end.

## Manual Vercel Deployment

Use these settings when deploying from the Vercel dashboard:

1. Push the latest repository to GitHub.
2. Open Vercel and choose **Add New Project**.
3. Import `sukrit-89/Splash`.
4. Set **Root Directory** to `frontend`.
5. Keep **Framework Preset** as `Vite`.
6. Set **Install Command** to `npm install` or leave the default.
7. Set **Build Command** to `npm run build`.
8. Set **Output Directory** to `dist`.
9. Add these environment variables in Vercel Project Settings:

```text
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_STREAMVAULT_CONTRACT_ID=CCE2PSOOTQWLNCY3RFJOSI7RNIRVQFE64L33KJNBXTXOW63YVRRQLFA6
VITE_USDC_TOKEN_CONTRACT_ID=CBR7ZWCNWEX43SLWEQCMJBXZLBP5U46EV2DQ2EKYED65DJKL4SX6TRRF
VITE_XLM_TOKEN_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

10. Click **Deploy**.
11. Open the production URL and verify:
    - Landing page loads.
    - Freighter connects on testnet.
    - Create stream opens the wallet signing flow.
    - Stream detail shows a live ticking claimable balance.
12. Add the final Vercel URL to the **Submission Links** table above.

## Demo Video Checklist

Recommended 60-75 second flow:

1. Show the landing page and StreamVault testnet positioning.
2. Open the developer resources/footer briefly.
3. Connect Freighter on Stellar testnet.
4. Create a stream with a valid recipient, token, flow rate, and duration.
5. Show Freighter signing and transaction confirmation.
6. Show the stream detail page and live claimable balance ticking.
7. Withdraw accrued funds or show the cancel action.
8. Show the README/test evidence or terminal output with `5 passed`.

Avoid claiming Level 4 features as implemented. Blend, factory streams, and FLOW receipts are future scope.

## Security Notes

- No private keys or mnemonics are stored in the app.
- Freighter handles transaction signing.
- Contract authorization uses Soroban `require_auth`.
- Frontend environment variables contain only public testnet configuration.
- This is testnet-only and not intended for production funds.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Contract | Rust, Soroban SDK |
| Contract tests | `soroban_sdk::testutils`, Dockerized Rust |
| Frontend | React, Vite, TypeScript |
| Styling | Tailwind CSS |
| Wallet | Freighter |
| Stellar client | `@stellar/stellar-sdk`, Stellar RPC |
| Deployment target | Vercel |
