# Splash

[![splash CI](https://github.com/sukrit-89/Splash/actions/workflows/ci.yml/badge.svg)](https://github.com/sukrit-89/Splash/actions/workflows/ci.yml)

Splash is a Stellar Soroban payment streaming dApp. It lets a sender lock a fixed deposit, stream value to a recipient per second, and let the recipient withdraw accrued funds at any time. Level 4 extends the Level 3 StreamVault MVP with a factory contract, a FLOW receipt token, a mock Blend-style pool adapter, real-time event polling, CI/CD, mobile responsiveness, and production-readiness polish.

![Splash desktop preview](splash.png)

## Review Links

| Item | Link |
| --- | --- |
| Live demo | <https://splash-self.vercel.app/> |
| Repository | <https://github.com/sukrit-89/Splash> |
| Demo video | <https://youtu.be/ziJpZYw0jEw> |
| Latest CI run | <https://github.com/sukrit-89/Splash/actions/runs/25113438677> |

## Submission Evidence

| Requirement | Evidence |
| --- | --- |
| Public GitHub repository | <https://github.com/sukrit-89/Splash> |
| Live deployed app | <https://splash-self.vercel.app/> |
| CI/CD running | GitHub Actions badge above and latest green run linked above |
| Mobile responsive screenshot | [mobile-responsive.png](mobile-responsive.png) |
| Contract test evidence | [Testcase.png](Testcase.png), plus Docker result `11 passed; 0 failed` |
| Minimum 8+ meaningful commits | Repository history contains 20+ commits |
| Inter-contract calls | Factory-created stream tx `cf382...7abe`; withdrawal tx `f0b4...913b` |
| Custom token/pool deployed | FLOW token and mock Blend pool addresses listed below |

## What Changed From Level 3

| Area | Level 3 | Level 4 |
| --- | --- | --- |
| Contract architecture | Single `StreamVault` contract | `StreamVault` plus `StreamFactory`, `FLOW`, and `MockBlendPool` |
| Streams per wallet | Core stream lifecycle | Factory registry supports multiple streams by sender/recipient |
| Inter-contract calls | Token transfer calls only | Factory calls Vault; Vault calls token, FLOW, and mock Blend pool |
| Receipt asset | None | `FLOW` SEP-41-style receipt token with mint, burn, transfer, balance, metadata |
| Yield layer | Out of scope | Mock Blend-style pool adapter proves deposit/redeem mechanics |
| Events | Contract emits lifecycle events | Frontend polls Soroban events with cursor persistence |
| Frontend | Create stream, dashboard, live balance | Multi-stream dashboard, activity feed, Level 4 contract wiring, mobile polish |
| Production readiness | Manual build/deploy | GitHub Actions CI, vendor chunk splitting, runtime error capture |
| Tests | 5 contract tests | 11 Dockerized workspace tests across all contracts |

## Screenshots To Include For Review

Use these in the submission or demo evidence:

1. **Desktop product preview:** [splash.png](splash.png)  
   Shows the main visual identity and live-streaming product moment.

2. **Mobile responsive proof:** [mobile-responsive.png](mobile-responsive.png)  
   Shows the app at a mobile viewport with Level 4 messaging and no layout overflow.

3. **Contract test proof:** [Testcase.png](Testcase.png)  
   Shows prior test output evidence. The current Docker suite now verifies 11 tests.

4. **CI/CD proof:** the README badge or latest run page  
   <https://github.com/sukrit-89/Splash/actions/runs/25113438677>

5. **Optional demo screenshots:** Dashboard and stream detail after wallet connection  
   These are useful in a slide deck or demo video, but the required README evidence is already covered by the mobile screenshot and CI badge.

## Product Flow

1. Sender connects Freighter on Stellar testnet.
2. Sender creates a stream through `StreamFactory`.
3. `StreamFactory` invokes `StreamVault.create_stream`.
4. `StreamVault` locks the stream deposit using the token contract.
5. `StreamVault` deposits the locked amount into `MockBlendPool`.
6. `StreamVault` mints `FLOW` receipt tokens to the recipient.
7. Recipient withdraws accrued funds.
8. `StreamVault` validates/burns FLOW and redeems from the pool before paying the recipient.

## Level 4 Architecture

```text
Freighter Wallet
   |
   | signs Soroban transactions
   v
React + Vite Frontend
   |
   | Stellar RPC simulation, submission, polling, event cursor
   v
StreamFactory
   |
   | inter-contract call #1
   v
StreamVault
   |                  |                  |
   | token transfer   | FLOW mint/burn   | deposit/redeem
   v                  v                  v
XLM / SAC Token     FLOW Token       MockBlendPool
```

## Core Formula

```text
total_deposit = rate_per_second * duration_seconds
end_timestamp = start_timestamp + duration_seconds
elapsed = min(current_timestamp, end_timestamp) - start_timestamp
accrued = elapsed * rate_per_second
claimable = min(accrued - already_withdrawn, total_deposit - already_withdrawn)
```

When the sender cancels:

```text
recipient_owed = claimable at cancel time
sender_refund = total_deposit - already_withdrawn - recipient_owed
```

## Deployed Testnet Contracts

| Contract | Address |
| --- | --- |
| StreamVault | `CBPNO56NJ4SI5UDJWVRLWVSCDTSMRDZCEPFNEPLRD4XTABYB6RUIBZQR` |
| StreamFactory | `CD6FF6PO7CM3U27JVGVGGLLN7XAUCDJMZGAHBLZQPVXKIRXC2LF3SW4R` |
| FLOW token | `CDSUPZQLP6FRNQMDYZP53QLOS3ITZLVOVJAAZ3RPBZ43K66532PQ5HHH` |
| Mock Blend pool | `CCXLDFFM7326GE7UOEN7TW7FJW2KSBO34KDAUDMGLV6EZOEJFNW5Z7RO` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Demo USDC SAC | `CBR7ZWCNWEX43SLWEQCMJBXZLBP5U46EV2DQ2EKYED65DJKL4SX6TRRF` |

The mock Blend pool is a testnet adapter used to prove the production integration shape. It exposes the same high-level mechanics Splash needs for Level 4: deposit, position tracking, and redeem before payout.

## Transaction Evidence

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

The factory-created stream transaction proves the inter-contract path. It includes:

- `StreamFactory -> StreamVault`
- `StreamVault -> XLM SAC`
- `StreamVault -> MockBlendPool`
- `StreamVault -> FLOW`

The withdrawal transaction proves the redeem path and FLOW burn validation.

## Contract Interfaces

### StreamVault

| Function | Auth | Description |
| --- | --- | --- |
| `initialize(admin, blend_pool, flow_token, fee_bps)` | Admin | Enables Level 4 pool and FLOW integration. |
| `create_stream(sender, recipient, token, rate_per_second, duration_seconds)` | Sender | Locks deposit, deposits to pool, mints FLOW, emits event. |
| `withdraw(stream_id)` | Recipient | Burns FLOW, redeems from pool, pays claimable amount. |
| `cancel(stream_id)` | Sender | Redeems remaining position, pays recipient owed, refunds sender. |
| `get_claimable(stream_id)` | None | Returns current withdrawable amount. |
| `get_stream(stream_id)` | None | Returns stored stream metadata. |
| `get_stream_count()` | None | Returns next stream ID. |

### StreamFactory

| Function | Auth | Description |
| --- | --- | --- |
| `create_stream(sender, vault, recipient, token, rate_per_second, duration_seconds)` | Sender | Calls StreamVault and indexes stream ID. |
| `get_streams_by_sender(sender)` | None | Lists sender stream IDs. |
| `get_streams_by_recipient(recipient)` | None | Lists recipient stream IDs. |

### FLOW Token

| Function | Auth | Description |
| --- | --- | --- |
| `initialize(admin)` | One-time | Sets the vault/admin address. |
| `mint(to, amount)` | Admin | Mints FLOW receipts. |
| `burn(from, amount)` | Admin | Burns FLOW receipts. |
| `transfer(from, to, amount)` | Holder | Transfers FLOW. |
| `balance(id)` | None | Returns FLOW balance. |
| `total_supply()` | None | Returns total FLOW supply. |
| `name()`, `symbol()`, `decimals()` | None | Token metadata. |

### MockBlendPool

| Function | Auth | Description |
| --- | --- | --- |
| `deposit(vault, token, amount)` | Caller contract | Records vault position. |
| `redeem(vault, token, btoken_amount)` | Caller contract | Reduces position and transfers token back to vault. |
| `position(vault, token)` | None | Returns recorded position. |

## Advanced Event Streaming

The frontend polls Soroban contract events using cursor persistence:

- Storage key: `splash_event_cursor`
- Hook: `frontend/src/hooks/useContractEvents.ts`
- Events surfaced: `StreamCreated`, `Withdrawal`, `StreamCancelled`
- UI surface: dashboard activity feed
- Failure mode: shows reconnecting state instead of silently failing

## Production Readiness

| Area | Implementation |
| --- | --- |
| CI/CD | GitHub Actions runs contract tests and frontend build on push/PR |
| Performance | Vite manual vendor chunks split React, Stellar SDK, icons, and motion code |
| Error tracking | Browser runtime errors and unhandled promise rejections stored under `splash_runtime_errors` |
| Mobile | Header, hero, and dashboard layouts tested at mobile viewport; screenshot included |
| Secrets | No private keys or mnemonics in frontend or repository |
| Network | Testnet-only deployment and public testnet contract IDs |

## Test Results

Run from the repository root:

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

Verified result:

```text
running 11 tests
test result: ok. 11 passed; 0 failed
```

Coverage includes:

- Stream creation and stored metadata
- Withdraw calculation
- Cancel payout/refund split
- Multiple withdrawals to completion
- Reject cancellation after stream end
- FLOW mint on create
- FLOW burn on withdraw
- Factory sender/recipient registry
- Mock Blend deposit/redeem mechanics

## Local Development

Install frontend dependencies:

```powershell
Set-Location .\frontend
npm install
```

Create `frontend/.env.local` from `frontend/.env.example`:

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

## Repository Structure

```text
.
|-- README.md
|-- mobile-responsive.png
|-- splash.png
|-- Testcase.png
|-- frontend
|   |-- package.json
|   |-- vite.config.ts
|   `-- src
|       |-- components
|       |-- hooks
|       |-- lib
|       |-- pages
|       `-- types
`-- streamvault
    |-- Cargo.toml
    |-- scripts
    |   `-- test-docker.ps1
    `-- contracts
        |-- streamvault
        |-- streamfactory
        |-- flowtoken
        `-- mockblend
```

## Security Notes

- No private keys, mnemonics, or deployment secrets are stored in the app.
- Freighter handles wallet connection and transaction signing.
- Contract authorization uses Soroban `require_auth`.
- Frontend environment values are public testnet contract IDs only.
- This is a testnet demo and is not intended for production funds.

## Submission Checklist

| Checklist item | Status |
| --- | --- |
| Public GitHub repository | Complete |
| README with complete documentation | Complete |
| Live demo link | Complete |
| Mobile screenshot | Complete |
| CI/CD badge or screenshot | Complete |
| Contract addresses and transaction hashes | Complete |
| Token or pool address | Complete |
| 8+ meaningful commits | Complete |
| Inter-contract call working | Complete |
| Custom token or pool deployed | Complete |
