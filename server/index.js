/**
 * Orbital IDE - Soroban Contract Compilation Server
 * 
 * Receives Rust source code, compiles to WASM using stellar-cli,
 * and returns the compiled binary as base64.
 * 
 * Requirements:
 * - Rust toolchain with wasm32-unknown-unknown target
 * - stellar-cli installed
 * 
 * Usage:
 *   npm start          (production)
 *   npm run dev         (with auto-reload)
 *   docker compose up   (containerized)
 */

import express from 'express';
import cors from 'cors';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, cp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);

const PORT = process.env.PORT || 3001;
const COMPILE_TIMEOUT = parseInt(process.env.COMPILE_TIMEOUT || '120000'); // 2 min default
const MAX_SOURCE_SIZE = parseInt(process.env.MAX_SOURCE_SIZE || '102400');  // 100 KB
const TEMPLATE_DIR = resolve(import.meta.dirname, 'templates');

// Track active compilations to limit concurrency
let activeCompilations = 0;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '3');

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '200kb' }));

// ─── Health check ────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const checks = await checkDependencies();
  res.json({
    status: checks.ready ? 'ok' : 'degraded',
    activeCompilations,
    ...checks,
  });
});

// ─── Compile endpoint ────────────────────────────────────────
app.post('/compile', async (req, res) => {
  const requestId = randomUUID().slice(0, 8);
  const start = Date.now();

  try {
    // ── Validate request ──
    const { source } = req.body;

    if (!source || typeof source !== 'string') {
      return res.status(400).json({ error: 'Missing "source" field with Rust source code' });
    }

    if (source.length > MAX_SOURCE_SIZE) {
      return res.status(400).json({ error: `Source code too large. Max ${MAX_SOURCE_SIZE} bytes.` });
    }

    // Basic Soroban contract validation
    if (!source.includes('#[contract]') || !source.includes('#[contractimpl]')) {
      return res.status(400).json({
        error: 'Invalid Soroban contract. Must include #[contract] and #[contractimpl] attributes.',
      });
    }

    // Concurrency check
    if (activeCompilations >= MAX_CONCURRENT) {
      return res.status(503).json({
        error: 'Server busy. Too many compilations in progress. Please try again shortly.',
      });
    }

    activeCompilations++;
    console.log(`[${requestId}] Compilation started (${activeCompilations}/${MAX_CONCURRENT} active)`);

    // ── Set up temp project ──
    const tmpDir = await mkdtemp(join(tmpdir(), 'orbital-'));
    const srcDir = join(tmpDir, 'src');
    await mkdir(srcDir, { recursive: true });

    try {
      // Copy Cargo.toml template
      await cp(join(TEMPLATE_DIR, 'Cargo.toml'), join(tmpDir, 'Cargo.toml'));

      // Inject extra dependencies if the source uses them
      let cargoToml = await readFile(join(tmpDir, 'Cargo.toml'), 'utf-8');
      cargoToml = injectExtraDependencies(cargoToml, source);
      await writeFile(join(tmpDir, 'Cargo.toml'), cargoToml);

      // Write source code as lib.rs
      await writeFile(join(srcDir, 'lib.rs'), source);

      console.log(`[${requestId}] Project created at ${tmpDir}`);

      // ── Compile ──
      const wasmPath = await compileContract(tmpDir, requestId);

      // ── Read WASM and return ──
      const wasmBuffer = await readFile(wasmPath);
      const wasmBase64 = wasmBuffer.toString('base64');

      const elapsed = Date.now() - start;
      console.log(`[${requestId}] Compiled successfully in ${elapsed}ms (${wasmBuffer.length} bytes)`);

      res.json({
        wasm: wasmBase64,
        size: wasmBuffer.length,
        compiledIn: elapsed,
      });

    } finally {
      // Cleanup temp directory
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      activeCompilations--;
    }

  } catch (error) {
    activeCompilations = Math.max(0, activeCompilations - 1);
    const elapsed = Date.now() - start;
    console.error(`[${requestId}] Compilation failed in ${elapsed}ms:`, error.message);

    // Parse compiler errors for user-friendly messages
    const userError = parseCompilerError(error);
    res.status(422).json({ error: userError });
  }
});

// ─── Compile Rust to WASM ────────────────────────────────────
async function compileContract(projectDir, requestId) {
  // Step 1: Build with cargo
  console.log(`[${requestId}] Running cargo build...`);

  try {
    await execFileAsync('cargo', [
      'build',
      '--release',
      '--target', 'wasm32-unknown-unknown',
    ], {
      cwd: projectDir,
      timeout: COMPILE_TIMEOUT,
      env: {
        ...process.env,
        CARGO_HOME: process.env.CARGO_HOME || join(tmpdir(), '.cargo'),
        RUSTUP_HOME: process.env.RUSTUP_HOME || undefined,
      },
    });
  } catch (err) {
    // Combine stdout + stderr for full error context
    const output = [err.stderr, err.stdout].filter(Boolean).join('\n');
    const error = new Error(output || err.message);
    error.isCompilerError = true;
    throw error;
  }

  // Find the compiled WASM file
  const wasmDir = join(projectDir, 'target', 'wasm32-unknown-unknown', 'release');
  const wasmPath = join(wasmDir, 'soroban_contract.wasm');

  if (!existsSync(wasmPath)) {
    throw new Error('Compilation succeeded but WASM file not found at expected path.');
  }

  // Step 2: Optimize with stellar-cli if available
  const optimizedPath = join(wasmDir, 'soroban_contract.optimized.wasm');

  try {
    await execFileAsync('stellar', [
      'contract', 'optimize',
      '--wasm', wasmPath,
      '--wasm-out', optimizedPath,
    ], {
      cwd: projectDir,
      timeout: 30000,
    });

    console.log(`[${requestId}] WASM optimized with stellar-cli`);
    return optimizedPath;
  } catch {
    // Optimization is optional - return unoptimized WASM
    console.log(`[${requestId}] stellar-cli optimize not available, using unoptimized WASM`);
    return wasmPath;
  }
}

// ─── Detect extra crate dependencies from source ─────────────
function injectExtraDependencies(cargoToml, source) {
  const extras = [];

  if (source.includes('soroban_token_sdk') || source.includes('soroban-token-sdk')) {
    extras.push('soroban-token-sdk = "21.7.6"');
  }

  if (extras.length > 0) {
    cargoToml = cargoToml.replace(
      '[profile.release]',
      extras.join('\n') + '\n\n[profile.release]'
    );
  }

  return cargoToml;
}

// ─── Parse compiler output into user-friendly error ──────────
function parseCompilerError(error) {
  const msg = error.message || '';

  // Timeout
  if (msg.includes('TIMEOUT') || msg.includes('timed out')) {
    return 'Compilation timed out. Your contract may be too complex or have dependency issues.';
  }

  // Extract Rust compiler errors (lines starting with "error")
  const errorLines = msg.split('\n').filter(line =>
    line.startsWith('error') || line.startsWith('  -->') || line.trim().startsWith('|')
  );

  if (errorLines.length > 0) {
    // Limit to first 30 lines to avoid huge error messages
    return errorLines.slice(0, 30).join('\n');
  }

  // Fallback
  if (error.isCompilerError) {
    return `Compilation failed:\n${msg.substring(0, 2000)}`;
  }

  return `Unexpected error: ${msg.substring(0, 500)}`;
}

// ─── Check required toolchain ────────────────────────────────
async function checkDependencies() {
  const results = {};

  // Check Rust
  try {
    const { stdout } = await execFileAsync('rustc', ['--version'], { timeout: 5000 });
    results.rust = stdout.trim();
  } catch {
    results.rust = null;
  }

  // Check Cargo
  try {
    const { stdout } = await execFileAsync('cargo', ['--version'], { timeout: 5000 });
    results.cargo = stdout.trim();
  } catch {
    results.cargo = null;
  }

  // Check WASM target
  try {
    const { stdout } = await execFileAsync('rustup', ['target', 'list', '--installed'], { timeout: 5000 });
    results.wasmTarget = stdout.includes('wasm32-unknown-unknown');
  } catch {
    results.wasmTarget = false;
  }

  // Check stellar-cli
  try {
    const { stdout } = await execFileAsync('stellar', ['--version'], { timeout: 5000 });
    results.stellarCli = stdout.trim();
  } catch {
    results.stellarCli = null;
  }

  results.ready = !!(results.rust && results.cargo && results.wasmTarget);
  return results;
}

// ─── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Orbital Compiler Server running on http://localhost:${PORT}`);
  console.log(`   POST /compile   - Compile Soroban contract`);
  console.log(`   GET  /health    - Check server status\n`);

  // Check dependencies on startup
  checkDependencies().then(deps => {
    console.log('Toolchain status:');
    console.log(`  Rust:        ${deps.rust || '❌ NOT FOUND'}`);
    console.log(`  Cargo:       ${deps.cargo || '❌ NOT FOUND'}`);
    console.log(`  WASM target: ${deps.wasmTarget ? '✅' : '❌ NOT FOUND'}`);
    console.log(`  stellar-cli: ${deps.stellarCli || '⚠️  Not found (optimization disabled)'}`);
    console.log(`  Status:      ${deps.ready ? '✅ Ready to compile' : '❌ Missing dependencies'}\n`);

    if (!deps.ready) {
      console.log('To fix missing dependencies:');
      if (!deps.rust) console.log('  curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh');
      if (!deps.wasmTarget) console.log('  rustup target add wasm32-unknown-unknown');
      if (!deps.stellarCli) console.log('  cargo install --locked stellar-cli (optional, for WASM optimization)');
      console.log('');
    }
  });
});
