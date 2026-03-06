# ── Stage 1: Build environment with Rust + Stellar CLI ──
FROM rust:1.82-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    pkg-config \
    libssl-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Add WASM compilation target
RUN rustup target add wasm32-unknown-unknown

# Install stellar-cli for WASM optimization
RUN cargo install --locked stellar-cli --features opt \
    || echo "stellar-cli install skipped (optimization will be disabled)"

# Pre-download soroban-sdk crate to speed up compilations
WORKDIR /tmp/warmup
COPY templates/Cargo.toml ./Cargo.toml
RUN mkdir src && echo '#![no_std] use soroban_sdk::{contract, contractimpl, Env}; #[contract] pub struct C; #[contractimpl] impl C { pub fn x(e: Env) {} }' > src/lib.rs \
    && cargo build --release --target wasm32-unknown-unknown 2>/dev/null || true \
    && rm -rf /tmp/warmup

# ── Stage 2: Runtime ──
WORKDIR /app

# Copy server files
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY index.js ./
COPY templates/ ./templates/

# Environment
ENV PORT=3001
ENV COMPILE_TIMEOUT=120000
ENV MAX_SOURCE_SIZE=102400
ENV MAX_CONCURRENT=3

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "index.js"]
