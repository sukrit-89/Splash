#!/usr/bin/env node

/**
 * Build pre-compiled WASM files for example contracts.
 * 
 * This script extracts example contract source code from the frontend,
 * compiles each to WASM using cargo, and places the output in client/public/wasm/.
 * 
 * Prerequisites:
 *   - Rust toolchain: rustup target add wasm32-unknown-unknown
 *   - (Optional) stellar-cli for WASM optimization
 * 
 * Usage:
 *   node server/build-examples.js
 */

import { mkdtemp, writeFile, readFile, rm, cp, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);

const ROOT = resolve(import.meta.dirname, '..');
const WASM_OUTPUT_DIR = join(ROOT, 'client', 'public', 'wasm');
const TEMPLATE_CARGO = join(ROOT, 'server', 'templates', 'Cargo.toml');

// ─── Example contracts source (inline to avoid ESM import issues) ──

const EXAMPLES = {
  counter: `#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

const COUNTER: Symbol = Symbol::short("COUNTER");

#[contract]
pub struct CounterContract;

#[contractimpl]
impl CounterContract {
    pub fn initialize(env: Env) {
        env.storage().instance().set(&COUNTER, &0i32);
    }

    pub fn increment(env: Env) -> i32 {
        let mut count: i32 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&COUNTER, &count);
        count
    }

    pub fn decrement(env: Env) -> i32 {
        let mut count: i32 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        count -= 1;
        env.storage().instance().set(&COUNTER, &count);
        count
    }

    pub fn get_count(env: Env) -> i32 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }

    pub fn reset(env: Env) {
        env.storage().instance().set(&COUNTER, &0i32);
    }
}`,

  hello_world: `#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, Symbol, Vec};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        vec![&env, symbol_short!("Hello"), to]
    }
}`,
};

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log('🔨 Building pre-compiled WASM files for example contracts\n');

  // Check Rust toolchain
  try {
    const { stdout } = await execFileAsync('rustc', ['--version'], { timeout: 5000 });
    console.log(`  Rust: ${stdout.trim()}`);
  } catch {
    console.error('❌ Rust not found. Install: curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh');
    process.exit(1);
  }

  try {
    const { stdout } = await execFileAsync('rustup', ['target', 'list', '--installed'], { timeout: 5000 });
    if (!stdout.includes('wasm32-unknown-unknown')) {
      console.log('  Adding wasm32-unknown-unknown target...');
      await execFileAsync('rustup', ['target', 'add', 'wasm32-unknown-unknown'], { timeout: 60000 });
    }
    console.log('  WASM target: ✅');
  } catch {
    console.error('❌ rustup not found. Cannot add wasm32 target.');
    process.exit(1);
  }

  // Create output directory
  await mkdir(WASM_OUTPUT_DIR, { recursive: true });
  console.log(`  Output: ${WASM_OUTPUT_DIR}\n`);

  const results = [];

  for (const [name, source] of Object.entries(EXAMPLES)) {
    process.stdout.write(`  Compiling ${name}... `);

    try {
      const wasmBuffer = await compileSingle(name, source);
      const outputPath = join(WASM_OUTPUT_DIR, `${name}.wasm`);
      await writeFile(outputPath, wasmBuffer);
      console.log(`✅ (${wasmBuffer.length} bytes)`);
      results.push({ name, size: wasmBuffer.length, status: 'ok' });
    } catch (err) {
      console.log(`❌ ${err.message.split('\n')[0]}`);
      results.push({ name, status: 'failed', error: err.message });
    }
  }

  console.log('\n📊 Results:');
  console.table(results.map(r => ({
    Contract: r.name,
    Status: r.status === 'ok' ? '✅' : '❌',
    Size: r.size ? `${r.size} bytes` : '-',
  })));

  const failed = results.filter(r => r.status !== 'ok');
  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} contract(s) failed to compile.`);
    process.exit(1);
  }

  console.log('\n✅ All WASM files built successfully!');
  console.log(`   Files are in: ${WASM_OUTPUT_DIR}`);
}

async function compileSingle(name, source) {
  const tmpDir = await mkdtemp(join(tmpdir(), `orbital-${name}-`));
  const srcDir = join(tmpDir, 'src');
  await mkdir(srcDir, { recursive: true });

  try {
    // Copy Cargo.toml
    await cp(TEMPLATE_CARGO, join(tmpDir, 'Cargo.toml'));

    // Write source
    await writeFile(join(srcDir, 'lib.rs'), source);

    // Compile
    await execFileAsync('cargo', [
      'build', '--release', '--target', 'wasm32-unknown-unknown',
    ], {
      cwd: tmpDir,
      timeout: 120000,
    });

    const wasmPath = join(tmpDir, 'target', 'wasm32-unknown-unknown', 'release', 'soroban_contract.wasm');

    if (!existsSync(wasmPath)) {
      throw new Error('WASM file not found after compilation');
    }

    // Try to optimize
    const optimizedPath = join(tmpDir, 'optimized.wasm');
    try {
      await execFileAsync('stellar', [
        'contract', 'optimize', '--wasm', wasmPath, '--wasm-out', optimizedPath,
      ], { cwd: tmpDir, timeout: 30000 });
      return await readFile(optimizedPath);
    } catch {
      return await readFile(wasmPath);
    }

  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
