/**
 * compiler.js - Soroban Contract Compilation Service
 * 
 * Handles compilation of Rust code to WASM for Soroban contracts
 * 
 * NOTE: Browser-based Rust compilation is not feasible.
 * This module provides:
 * 1. Pre-compiled WASM for example contracts
 * 2. Interface for backend compilation service (to be implemented)
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
 * Pre-compiled WASM binaries for example contracts
 * 
 * These are mock placeholders. In production:
 * 1. Pre-compile example contracts with stellar-cli
 * 2. Store WASM files in public/ folder
 * 3. Load via fetch() at runtime
 */
const EXAMPLE_WASMS = {
    counter: null,      // Will load from /wasm/counter.wasm
    token: null,        // Will load from /wasm/token.wasm
    escrow: null,       // Will load from /wasm/escrow.wasm
    voting: null,       // Will load from /wasm/voting.wasm
    hello_world: null,  // Will load from /wasm/hello_world.wasm
};

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

        // Check if this is an example contract with pre-compiled WASM
        if (contractName && Object.prototype.hasOwnProperty.call(EXAMPLE_WASMS, contractName)) {
            console.log('Loading pre-compiled WASM for example:', contractName);
            const wasm = await loadPrecompiledWasm(contractName);
            
            if (wasm) {
                return {
                    status: CompilationStatus.SUCCESS,
                    wasm,
                };
            }
        }

        // For custom contracts, we need a backend compilation service
        console.log('Custom contract detected, using backend compiler...');
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
    // Backend compilation endpoint (to be implemented)
    const COMPILER_ENDPOINT = import.meta.env.VITE_COMPILER_URL || 'http://localhost:3001/compile';

    try {
        console.log('Sending code to compilation service...');

        const response = await fetch(COMPILER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source: sourceCode,
                optimize: true,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Compilation failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            return {
                status: CompilationStatus.ERROR,
                error: result.error,
            };
        }

        // Convert base64 WASM to Uint8Array
        const wasmBase64 = result.wasm;
        const wasmBinary = base64ToUint8Array(wasmBase64);

        return {
            status: CompilationStatus.SUCCESS,
            wasm: wasmBinary,
        };

    } catch (error) {
        // If backend is not available, provide helpful error
        if (error.message.includes('fetch')) {
            return {
                status: CompilationStatus.ERROR,
                error: 'Compilation service not available. For custom contracts:\n' +
                       '1. Use stellar-cli locally to compile\n' +
                       '2. Or set up the backend compiler service\n' +
                       '3. For now, use example contracts which deploy instantly',
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
export async function checkCompilerAvailability() {
    const COMPILER_ENDPOINT = import.meta.env.VITE_COMPILER_URL || 'http://localhost:3001/health';

    try {
        const response = await fetch(COMPILER_ENDPOINT, {
            method: 'GET',
            signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        return response.ok;

    } catch (error) {
        console.warn('Compiler service not available:', error.message);
        return false;
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
