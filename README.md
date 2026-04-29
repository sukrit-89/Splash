# Splash

[![splash CI](https://github.com/sukrit-89/Splash/actions/workflows/ci.yml/badge.svg)](https://github.com/sukrit-89/Splash/actions/workflows/ci.yml)

Splash is a Stellar Soroban payment streaming dApp with the Level 4 architecture now in code: `StreamVault`, `StreamFactory`, a `FLOW` receipt token, optional Blend-pool adapter hooks, cursor-based event polling, and a React + Freighter frontend.

![Splash protocol preview](splash.png)

## Review Links

- **Live demo:** <https://splash-self.vercel.app/>
- **Demo video:** <https://youtu.be/ziJpZYw0jEw>
- **Repository:** <https://github.com/sukrit-89/Splash>

## Submission Links

| Item | Link / Evidence |
| --- | --- |
| Test output screenshot | [Testcase.png](Testcase.png) |
| Mobile responsive screenshot | [mobile-responsive.png](mobile-responsive.png) |
| Contract tests | `11 passed; 0 failed` |
| Testnet StreamVault | `CBPNO56NJ4SI5UDJWVRLWVSCDTSMRDZCEPFNEPLRD4XTABYB6RUIBZQR` |
| Testnet StreamFactory | `CD6FF6PO7CM3U27JVGVGGLLN7XAUCDJMZGAHBLZQPVXKIRXC2LF3SW4R` |
| Testnet FLOW token | `CDSUPZQLP6FRNQMDYZP53QLOS3ITZLVOVJAAZ3RPBZ43K66532PQ5HHH` |
| Testnet mock Blend pool | `CCXLDFFM7326GE7UOEN7TW7FJW2KSBO34KDAUDMGLV6EZOEJFNW5Z7RO` |

## What It Does

Splash turns a fixed payment deposit into a real-time stream.

1. The sender creates a stream with recipient, token, rate per second, and duration.
2. The contract locks the full stream deposit from the sender.
3. The recipient's claimable amount grows as ledger time passes.
4. The recipient can withdraw accrued funds.
5. The sender can cancel early, paying the recipient what has accrued and refunding the unstreamed balance.

Level 4 adds:

- `StreamFactory` registry for multiple streams per wallet.
- Optional `StreamVault.initialize(...)` configuration for Blend pool + FLOW token integration.
- `FLOW` SEP-41-style receipt token with `name`, `symbol`, `decimals`, `balance`, `transfer`, `mint`, and `burn`.
- Yield-inclusive withdraw/cancel paths when a Blend adapter is configured.
- Cursor-based Soroban event polling in the frontend activity feed.
- GitHub Actions CI for contract tests and frontend build.
- Production readiness polish: Vite vendor chunk splitting plus browser runtime error capture in localStorage for demo debugging.

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
   | optional calls
   v
StreamFactory registry + Blend adapter + FLOW token
   |
   v
Stellar Asset Contract token / testnet mock token
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
            |-- streamvault
            |   |-- Cargo.toml
            |   `-- src
            |-- streamfactory
            |   |-- Cargo.toml
            |   `-- src
            `-- flowtoken
                |-- Cargo.toml
                `-- src
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
| `initialize(admin, blend_pool, flow_token, fee_bps)` | Admin | Enables Level 4 yield + FLOW hooks for new streams. |

### StreamFactory

| Function | Auth | Description |
| --- | --- | --- |
| `create_stream(sender, vault, recipient, token, rate_per_second, duration_seconds)` | Sender | Creates a vault stream through an inter-contract call and indexes it. |
| `get_streams_by_sender(sender)` | None | Returns stream IDs created by the sender. |
| `get_streams_by_recipient(recipient)` | None | Returns stream IDs for the recipient. |

### FLOW Token

| Function | Auth | Description |
| --- | --- | --- |
| `initialize(admin)` | None, one-time | Sets the vault/admin address. |
| `mint(to, amount)` | Admin | Mints FLOW receipts. |
| `burn(from, amount)` | Admin | Burns FLOW receipts during withdrawal/cancel. |
| `transfer(from, to, amount)` | Holder | Transfers FLOW. |
| `balance(id)` | None | Returns FLOW balance. |
| `name()`, `symbol()`, `decimals()` | None | Token metadata. |

## Testnet Configuration

| Item | Value |
| --- | --- |
| Network | Stellar testnet |
| Network passphrase | `Test SDF Network ; September 2015` |
| RPC URL | `https://soroban-testnet.stellar.org` |
| StreamVault | `CBPNO56NJ4SI5UDJWVRLWVSCDTSMRDZCEPFNEPLRD4XTABYB6RUIBZQR` |
| StreamFactory | `CD6FF6PO7CM3U27JVGVGGLLN7XAUCDJMZGAHBLZQPVXKIRXC2LF3SW4R` |
| FLOW token | `CDSUPZQLP6FRNQMDYZP53QLOS3ITZLVOVJAAZ3RPBZ43K66532PQ5HHH` |
| Mock Blend pool | `CCXLDFFM7326GE7UOEN7TW7FJW2KSBO34KDAUDMGLV6EZOEJFNW5Z7RO` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Demo USDC SAC | `CBR7ZWCNWEX43SLWEQCMJBXZLBP5U46EV2DQ2EKYED65DJKL4SX6TRRF` |

The demo USDC contract is for testnet demonstration only. It is not production Circle USDC.

## Level 4 Transaction Evidence

| Action | Transaction |
| --- | --- |
| Deploy StreamVault | [`e2dba4d0fcbf57e2d4fb758c953cb2dd07ba1b0ed9167d7f7d2be742b7d4f2dc`](https://stellar.expert/explorer/testnet/tx/e2dba4d0fcbf57e2d4fb758c953cb2dd07ba1b0ed9167d7f7d2be742b7d4f2dc) |
| Deploy StreamFactory | [`e75d4479e9073d2d31affc5749a97c13dda16bbfd8977685c6c77785fc9c3ddb`](https://stellar.expert/explorer/testnet/tx/e75d4479e9073d2d31affc5749a97c13dda16bbfd8977685c6c77785fc9c3ddb) |
| Deploy FLOW token | [`9ec06607ce1ddba4efaf0867bd2ab046e119b67c4ebf2e82cc4cf254a1bf22d1`](https://stellar.expert/explorer/testnet/tx/9ec06607ce1ddba4efaf0867bd2ab046e119b67c4ebf2e82cc4cf254a1bf22d1) |
| Deploy mock Blend pool | [`49e728fe3114859c66ec02926132e99bcfb07c3229567aff05b949b42d934c9a`](https://stellar.expert/explorer/testnet/tx/49e728fe3114859c66ec02926132e99bcfb07c3229567aff05b949b42d934c9a) |
| Initialize FLOW | [`b301649f6c903f07d90e2b27dcfa3cacffdaf04d627d1eabaddc0a3359755a79`](https://stellar.expert/explorer/testnet/tx/b301649f6c903f07d90e2b27dcfa3cacffdaf04d627d1eabaddc0a3359755a79) |
| Initialize StreamVault | [`a61a39e2cfb0fb9fffa7cdb18f9ca099cfe20cda9dbb3a9764f3d25e5dd28a68`](https://stellar.expert/explorer/testnet/tx/a61a39e2cfb0fb9fffa7cdb18f9ca099cfe20cda9dbb3a9764f3d25e5dd28a68) |
| Factory-created stream | [`cf38216213223c929b93791c0af5525b1098892a2f8d52d5adba9ec892967abe`](https://stellar.expert/explorer/testnet/tx/cf38216213223c929b93791c0af5525b1098892a2f8d52d5adba9ec892967abe) |
| Yield-layer redeem withdrawal | [`f0b4d9fe5fda77ecc4fea233cd1775516c28f2662af32796d960e8b52857913b`](https://stellar.expert/explorer/testnet/tx/f0b4d9fe5fda77ecc4fea233cd1775516c28f2662af32796d960e8b52857913b) |
| Deploy account | `GC67STNSNGYZQ3LFGLROAQEJQLGLPURGJMUUWKRFKAIKARGDDY4KLVCQ` |

The factory-created stream transaction proves the Level 4 inter-contract path: `StreamFactory -> StreamVault -> XLM SAC`, `StreamVault -> MockBlendPool`, and `StreamVault -> FLOW`. The withdrawal transaction proves the mock Blend redeem path and FLOW burn validation.

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
VITE_STREAMVAULT_CONTRACT_ID=CBPNO56NJ4SI5UDJWVRLWVSCDTSMRDZCEPFNEPLRD4XTABYB6RUIBZQR
VITE_STREAMFACTORY_CONTRACT_ID=CD6FF6PO7CM3U27JVGVGGLLN7XAUCDJMZGAHBLZQPVXKIRXC2LF3SW4R
VITE_FLOW_TOKEN_CONTRACT_ID=CDSUPZQLP6FRNQMDYZP53QLOS3ITZLVOVJAAZ3RPBZ43K66532PQ5HHH
VITE_BLEND_POOL_CONTRACT_ID=CCXLDFFM7326GE7UOEN7TW7FJW2KSBO34KDAUDMGLV6EZOEJFNW5Z7RO
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
  /usr/local/cargo/bin/cargo test --workspace --target x86_64-unknown-linux-gnu
```

Verified Docker result:

```text
running 11 tests
test result: ok. 11 passed; 0 failed
```

The tests cover:

- Stream creation and stored metadata.
- Withdraw claimable calculation.
- Cancel payout and refund split.
- Multiple withdrawals reaching completion.
- Rejection of cancellation after stream end.
- FLOW minting on stream creation.
- FLOW burning and yield-inclusive withdrawal.
- Factory sender/recipient registry indexing.
- Mock Blend deposit and redeem mechanics.

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
VITE_STREAMVAULT_CONTRACT_ID=CBPNO56NJ4SI5UDJWVRLWVSCDTSMRDZCEPFNEPLRD4XTABYB6RUIBZQR
VITE_STREAMFACTORY_CONTRACT_ID=CD6FF6PO7CM3U27JVGVGGLLN7XAUCDJMZGAHBLZQPVXKIRXC2LF3SW4R
VITE_FLOW_TOKEN_CONTRACT_ID=CDSUPZQLP6FRNQMDYZP53QLOS3ITZLVOVJAAZ3RPBZ43K66532PQ5HHH
VITE_BLEND_POOL_CONTRACT_ID=CCXLDFFM7326GE7UOEN7TW7FJW2KSBO34KDAUDMGLV6EZOEJFNW5Z7RO
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
8. Show the README/test evidence or terminal output with `11 passed`.

For the Level 4 recording, use the newly deployed factory and FLOW addresses in Vercel env vars before creating the stream.

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
