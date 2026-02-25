/**
 * deploy.js - Soroban Contract Deployment Service
 * 
 * Handles deployment of Soroban smart contracts to Stellar Testnet
 * Includes WASM upload, contract installation, and instance creation
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { signTransaction } from '@stellar/freighter-api';

// Soroban RPC Server for Testnet
const sorobanServer = new SorobanServer('https://soroban-testnet.stellar.org');

// Horizon server for account loading
const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Network configuration
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

/**
 * Deploy a Soroban contract from WASM binary
 * 
 * @param {Uint8Array} wasmBuffer - Compiled WASM binary
 * @param {string} sourcePublicKey - Deployer's public key
 * @returns {Promise<{contractId: string, wasmHash: string, transactionHash: string}>}
 */
export async function deployContract(wasmBuffer, sourcePublicKey) {
    try {
        console.log('Starting contract deployment...');
        console.log('WASM size:', wasmBuffer.length, 'bytes');

        // Step 1: Upload WASM code
        console.log('Step 1: Uploading WASM to network...');
        const uploadResult = await uploadContractWasm(wasmBuffer, sourcePublicKey);
        console.log('WASM uploaded, hash:', uploadResult.wasmHash);

        // Step 2: Deploy contract instance
        console.log('Step 2: Deploying contract instance...');
        const deployResult = await deployContractInstance(uploadResult.wasmHash, sourcePublicKey);
        console.log('Contract deployed, ID:', deployResult.contractId);

        return {
            contractId: deployResult.contractId,
            wasmHash: uploadResult.wasmHash,
            uploadTxHash: uploadResult.transactionHash,
            deployTxHash: deployResult.transactionHash,
        };

    } catch (error) {
        console.error('Deployment error:', error);
        throw new Error(`Contract deployment failed: ${error.message}`);
    }
}

/**
 * Upload WASM code to the network
 * 
 * @param {Uint8Array} wasmBuffer - WASM binary
 * @param {string} sourcePublicKey - Source account public key
 * @returns {Promise<{wasmHash: string, transactionHash: string}>}
 */
async function uploadContractWasm(wasmBuffer, sourcePublicKey) {
    try {
        // Load source account
        const sourceAccount = await horizonServer.loadAccount(sourcePublicKey);

        // Create upload contract operation
        const operation = StellarSdk.Operation.uploadContractWasm({
            wasm: wasmBuffer,
        });

        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate first to get resource requirements
        console.log('Simulating upload transaction...');
        const simulateResponse = await sorobanServer.simulateTransaction(transaction);

        if (SorobanServer.Api.isSimulationError(simulateResponse)) {
            throw new Error(`Simulation failed: ${simulateResponse.error}`);
        }

        // Prepare transaction with simulation results
        const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
            transaction,
            simulateResponse
        );

        // Sign with Freighter
        console.log('Requesting signature from wallet...');
        const signedXdr = await signTransaction(preparedTransaction.toXDR(), {
            network: 'TESTNET',
            networkPassphrase: NETWORK_PASSPHRASE,
        });

        // Extract signed XDR
        const signedTxXdr = signedXdr.signedTxXdr || signedXdr;
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

        // Submit transaction
        console.log('Submitting upload transaction...');
        const sendResponse = await sorobanServer.sendTransaction(signedTx);

        // Wait for confirmation
        console.log('Waiting for transaction confirmation...');
        const result = await waitForTransaction(sendResponse.hash);

        if (result.status !== 'SUCCESS') {
            throw new Error(`Upload failed: ${result.status}`);
        }

        // Calculate WASM hash
        const wasmHash = StellarSdk.hash(wasmBuffer);
        const wasmHashHex = wasmHash.toString('hex');

        return {
            wasmHash: wasmHashHex,
            transactionHash: sendResponse.hash,
        };

    } catch (error) {
        if (error.message?.includes('User declined')) {
            throw new Error('Transaction rejected by user');
        }
        throw error;
    }
}

/**
 * Deploy a contract instance from uploaded WASM
 * 
 * @param {string} wasmHash - Hash of uploaded WASM
 * @param {string} sourcePublicKey - Source account public key
 * @returns {Promise<{contractId: string, transactionHash: string}>}
 */
async function deployContractInstance(wasmHash, sourcePublicKey) {
    try {
        // Load source account
        const sourceAccount = await horizonServer.loadAccount(sourcePublicKey);

        // Create deploy contract operation
        const operation = StellarSdk.Operation.createCustomContract({
            wasmHash: hexToUint8Array(wasmHash),
            address: new StellarSdk.Address(sourcePublicKey),
        });

        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate transaction
        console.log('Simulating deploy transaction...');
        const simulateResponse = await sorobanServer.simulateTransaction(transaction);

        if (SorobanServer.Api.isSimulationError(simulateResponse)) {
            throw new Error(`Simulation failed: ${simulateResponse.error}`);
        }

        // Prepare transaction
        const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
            transaction,
            simulateResponse
        );

        // Sign with Freighter
        console.log('Requesting signature from wallet...');
        const signedXdr = await signTransaction(preparedTransaction.toXDR(), {
            network: 'TESTNET',
            networkPassphrase: NETWORK_PASSPHRASE,
        });

        // Extract signed XDR
        const signedTxXdr = signedXdr.signedTxXdr || signedXdr;
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

        // Submit transaction
        console.log('Submitting deploy transaction...');
        const sendResponse = await sorobanServer.sendTransaction(signedTx);

        // Wait for confirmation
        console.log('Waiting for transaction confirmation...');
        const result = await waitForTransaction(sendResponse.hash);

        if (result.status !== 'SUCCESS') {
            throw new Error(`Deploy failed: ${result.status}`);
        }

        // Extract contract ID from result
        const contractId = extractContractId(result);

        return {
            contractId,
            transactionHash: sendResponse.hash,
        };

    } catch (error) {
        if (error.message?.includes('User declined')) {
            throw new Error('Transaction rejected by user');
        }
        throw error;
    }
}

/**
 * Wait for transaction to be confirmed on the network
 * 
 * @param {string} hash - Transaction hash
 * @returns {Promise<object>} Transaction result
 */
async function waitForTransaction(hash) {
    const maxAttempts = 30; // 30 seconds timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const txResult = await sorobanServer.getTransaction(hash);

            if (txResult.status === 'NOT_FOUND') {
                // Transaction not yet processed
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                continue;
            }

            return txResult;

        } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
    }

    throw new Error('Transaction confirmation timeout');
}

/**
 * Extract contract ID from deployment result
 * 
 * @param {object} result - Transaction result
 * @returns {string} Contract ID
 */
function extractContractId(result) {
    try {
        // The contract ID is in the transaction result
        const returnValue = result.returnValue;
        
        if (returnValue) {
            const contractAddress = StellarSdk.Address.fromScVal(returnValue);
            return contractAddress.toString();
        }

        throw new Error('Contract ID not found in result');

    } catch (error) {
        throw new Error(`Failed to extract contract ID: ${error.message}`);
    }
}

/**
 * Get contract specification and available functions
 * 
 * @param {string} contractId - Contract ID
 * @returns {Promise<Array>} List of contract functions
 */
export async function getContractFunctions(contractId) {
    try {
        console.log('Fetching contract spec for:', contractId);

        // Get contract ledger entries
        // const contract = new StellarSdk.Contract(contractId);
        
        // This would require fetching the contract spec from the network
        // For now, return empty array - will implement in Phase 2
        
        console.warn('Contract function discovery not yet implemented');
        return [];

    } catch (error) {
        console.error('Error fetching contract functions:', error);
        throw new Error(`Failed to get contract functions: ${error.message}`);
    }
}

/**
 * Invoke a contract function
 * 
 * @param {string} contractId - Contract ID
 * @param {string} functionName - Function to call
 * @param {Array} args - Function arguments
 * @param {string} sourcePublicKey - Caller's public key
 * @returns {Promise<{result: any, transactionHash: string}>}
 */
export async function invokeContract(contractId, functionName, args, sourcePublicKey) {
    try {
        console.log('Invoking contract function:', functionName);

        // Load source account
        const sourceAccount = await horizonServer.loadAccount(sourcePublicKey);

        // Create contract instance
        const contract = new StellarSdk.Contract(contractId);

        // Build contract call operation
        const operation = contract.call(functionName, ...args);

        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate transaction
        console.log('Simulating contract call...');
        const simulateResponse = await sorobanServer.simulateTransaction(transaction);

        if (SorobanServer.Api.isSimulationError(simulateResponse)) {
            throw new Error(`Simulation failed: ${simulateResponse.error}`);
        }

        // Prepare transaction
        const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
            transaction,
            simulateResponse
        );

        // Sign with Freighter
        console.log('Requesting signature from wallet...');
        const signedXdr = await signTransaction(preparedTransaction.toXDR(), {
            network: 'TESTNET',
            networkPassphrase: NETWORK_PASSPHRASE,
        });

        // Extract signed XDR
        const signedTxXdr = signedXdr.signedTxXdr || signedXdr;
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

        // Submit transaction
        console.log('Submitting contract call...');
        const sendResponse = await sorobanServer.sendTransaction(signedTx);

        // Wait for confirmation
        console.log('Waiting for transaction confirmation...');
        const result = await waitForTransaction(sendResponse.hash);

        if (result.status !== 'SUCCESS') {
            throw new Error(`Contract call failed: ${result.status}`);
        }

        // Parse result
        const returnValue = result.returnValue;
        const parsedResult = returnValue ? StellarSdk.scValToNative(returnValue) : null;

        return {
            result: parsedResult,
            transactionHash: sendResponse.hash,
        };

    } catch (error) {
        if (error.message?.includes('User declined')) {
            throw new Error('Transaction rejected by user');
        }
        throw error;
    }
}

/**
 * Get Stellar Explorer URL for a transaction
 * 
 * @param {string} hash - Transaction hash
 * @returns {string} URL to view transaction
 */
export function getExplorerUrl(hash) {
    return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/**
 * Convert hex string to Uint8Array
 * 
 * @param {string} hex - Hex string
 * @returns {Uint8Array} Byte array
 */
function hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}
