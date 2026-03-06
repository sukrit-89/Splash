/**
 * compiler.js - Soroban Contract Compilation Service
 * 
 * Handles compilation of Rust code to WASM for Soroban contracts.
 * 
 * Two compilation paths:
 * 1. Pre-compiled WASM for example contracts (from /wasm/ folder)
 * 2. Backend compilation service for custom contracts (POST /compile)
 *
 * Backend: server/index.js (Node.js + cargo + wasm32-unknown-unknown)
 */

/**
 * Compilation status types
 */
export const CompilationStatus = {
    PENDING: 'pending',
    SUCCESS: 'success',
    ERROR: 'error',
};

/**
 * Example contracts with pre-compiled WASM files.
 * Files are loaded from public/wasm/<name>.wasm at runtime.
 * Build them with: node server/build-examples.js
 */
const EXAMPLE_CONTRACTS = new Set([
    'counter',
    'token',
    'escrow',
    'voting',
    'hello_world',
]);

/**
 * Compile Rust source code to WASM
 * 
 * @param {string} sourceCode - Rust source code
 * @param {string} contractName - Name of the contract (for example lookup)
 * @returns {Promise<{status: string, wasm?: Uint8Array, error?: string}>}
 */
export async function compileContract(sourceCode, contractName = null) {
    try {
        console.log('Starting compilation...');

        // Path 1: Try pre-compiled WASM for known example contracts
        if (contractName && EXAMPLE_CONTRACTS.has(contractName)) {
            console.log('Loading pre-compiled WASM for example:', contractName);
            const wasm = await loadPrecompiledWasm(contractName);
            if (wasm) {
                return { status: CompilationStatus.SUCCESS, wasm };
            }
            // Pre-compiled not found — fall through to backend
            console.log('Pre-compiled WASM not found, trying backend compiler...');
        }

        // Path 2: Compile via backend service (works for ALL contracts)
        console.log('Sending to backend compiler...');
        return await compileViaBackend(sourceCode);

    } catch (error) {
        console.error('Compilation error:', error);
        return {
            status: CompilationStatus.ERROR,
            error: error.message,
        };
    }
}

/**
 * Load pre-compiled WASM for example contracts
 * 
 * @param {string} exampleId - Example contract ID
 * @returns {Promise<Uint8Array|null>} WASM binary or null
 */
async function loadPrecompiledWasm(exampleId) {
    try {
        // Attempt to load from public/wasm/ folder
        const response = await fetch(`/wasm/${exampleId}.wasm`);
        
        if (!response.ok) {
            console.warn(`Pre-compiled WASM not found for ${exampleId}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);

    } catch (error) {
        console.warn(`Failed to load pre-compiled WASM: ${error.message}`);
        return null;
    }
}

/**
 * Compile contract using backend service
 * 
 * @param {string} sourceCode - Rust source code
 * @returns {Promise<{status: string, wasm?: Uint8Array, error?: string}>}
 */
async function compileViaBackend(sourceCode) {
    const baseUrl = import.meta.env.VITE_COMPILER_URL || 'http://localhost:3001';
    const endpoint = baseUrl.endsWith('/compile') ? baseUrl : `${baseUrl}/compile`;

    try {
        console.log('Sending code to compilation service:', endpoint);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: sourceCode }),
        });

        const result = await response.json().catch(() => ({}));

        // Server returns {error: "..."} on 4xx/5xx
        if (!response.ok || result.error) {
            return {
                status: CompilationStatus.ERROR,
                error: result.error || `Compilation failed (HTTP ${response.status})`,
            };
        }

        // Success: {wasm: "base64...", size: N, compiledIn: N}
        const wasmBinary = base64ToUint8Array(result.wasm);
        console.log(`Compiled successfully: ${wasmBinary.length} bytes in ${result.compiledIn}ms`);

        return {
            status: CompilationStatus.SUCCESS,
            wasm: wasmBinary,
            size: result.size,
            compiledIn: result.compiledIn,
        };

    } catch (error) {
        // Network error — backend not running
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                status: CompilationStatus.ERROR,
                error: 'Compiler service not reachable.\n\n' +
                       'Start it with: cd server && npm start\n' +
                       'Or with Docker: docker compose up compiler',
            };
        }

        return {
            status: CompilationStatus.ERROR,
            error: error.message,
        };
    }
}

/**
 * Convert base64 string to Uint8Array
 * 
 * @param {string} base64 - Base64 encoded string
 * @returns {Uint8Array} Binary array
 */
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Check if compilation service is available
 * 
 * @returns {Promise<boolean>} True if service is reachable
 */
/**
 * Check compiler service status and return details.
 * @returns {Promise<{available: boolean, rust?: string, stellarCli?: string}>}
 */
export async function checkCompilerAvailability() {
    const baseUrl = import.meta.env.VITE_COMPILER_URL || 'http://localhost:3001';
    const endpoint = baseUrl.replace(/\/compile$/, '') + '/health';

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });

        if (!response.ok) return { available: false };

        const data = await response.json();
        return {
            available: !!data.ready,
            rust: data.rust || null,
            stellarCli: data.stellarCli || null,
            activeCompilations: data.activeCompilations || 0,
        };

    } catch {
        return { available: false };
    }
}

/**
 * Generate a simple "Hello World" WASM for testing
 * 
 * This creates a minimal valid WASM binary that can be deployed
 * (for development/testing purposes only)
 * 
 * @returns {Uint8Array} Minimal WASM binary
 */
export function generateTestWasm() {
    // This is a minimal WASM module that does nothing
    // Used only for testing the deployment pipeline
    const wasmBytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // Magic number '\0asm'
        0x01, 0x00, 0x00, 0x00, // Version 1
    ]);

    console.warn('Using test WASM - not a real Soroban contract!');
    return wasmBytes;
}

/**
 * Validate Soroban contract source code
 * 
 * @param {string} sourceCode - Rust source code
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateContractSource(sourceCode) {
    const errors = [];

    // Basic validation checks
    if (!sourceCode || sourceCode.trim().length === 0) {
        errors.push('Source code is empty');
    }

    if (!sourceCode.includes('#[contract]')) {
        errors.push('Missing #[contract] attribute - not a valid Soroban contract');
    }

    if (!sourceCode.includes('#[contractimpl]')) {
        errors.push('Missing #[contractimpl] attribute - no contract implementation');
    }

    if (!sourceCode.includes('use soroban_sdk')) {
        errors.push('Missing soroban_sdk import');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
