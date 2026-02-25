/**
 * stellar.js - Stellar Blockchain Operations
 * 
 * Handles all interactions with the Stellar Testnet via Horizon API.
 * Provides functions for fetching balances and sending XLM payments.
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

// Configure Horizon server for TESTNET
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Use Testnet network passphrase
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

/**
 * Fetches XLM balance for a given public key
 * @param {string} publicKey - Stellar public key (G... address)
 * @returns {Promise<string>} XLM balance as a string
 * @throws {Error} If account doesn't exist or network error
 */
export const getBalance = async (publicKey) => {
    try {
        // Ensure publicKey is a string
        const keyStr = String(publicKey).trim();

        if (!keyStr) {
            throw new Error('Invalid public key');
        }

        const account = await server.loadAccount(keyStr);

        const xlmBalance = account.balances.find(
            (balance) => balance.asset_type === 'native'
        );

        if (!xlmBalance) {
            return '0';
        }

        return parseFloat(xlmBalance.balance).toFixed(7);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error(
                'Account not found. Make sure the account is funded on Testnet. ' +
                'Get free XLM from: https://friendbot.stellar.org'
            );
        }
        throw new Error(`Failed to fetch balance: ${error.message}`);
    }
};

/**
 * Validates a Stellar public key format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid Stellar public key
 */
export const isValidAddress = (address) => {
    try {
        return StellarSdk.StrKey.isValidEd25519PublicKey(address);
    } catch {
        return false;
    }
};

/**
 * Sends XLM payment from source to destination
 * @param {string} sourcePublicKey - Sender's public key
 * @param {string} destinationAddress - Recipient's public key
 * @param {string} amount - Amount of XLM to send
 * @returns {Promise<{success: boolean, hash: string, message: string}>}
 */
export const sendPayment = async (sourcePublicKey, destinationAddress, amount) => {
    try {
        // Ensure all parameters are strings
        const sourceStr = String(sourcePublicKey).trim();
        const destStr = String(destinationAddress).trim();
        const amountStr = String(amount).trim();

        // Validate inputs
        if (!isValidAddress(sourceStr)) {
            throw new Error('Invalid source address');
        }

        if (!isValidAddress(destStr)) {
            throw new Error('Invalid destination address. Please check the recipient address.');
        }

        const amountNum = parseFloat(amountStr);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error('Amount must be a positive number');
        }

        if (amountNum < 0.0000001) {
            throw new Error('Amount is too small. Minimum is 0.0000001 XLM');
        }

        // Load source account
        const sourceAccount = await server.loadAccount(sourceStr);

        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(
                StellarSdk.Operation.payment({
                    destination: destStr,
                    asset: StellarSdk.Asset.native(), // XLM
                    amount: amountStr,
                })
            )
            .setTimeout(30) // Transaction valid for 30 seconds
            .build();

        // Convert to XDR for Freighter signing
        const xdr = transaction.toXDR();

        console.log('Requesting signature from Freighter...');

        // Sign with Freighter
        const signedResponse = await signTransaction(xdr, {
            network: 'TESTNET',
            networkPassphrase: NETWORK_PASSPHRASE,
        });

        console.log('Transaction signed successfully');
        console.log('Signed response:', signedResponse);

        // Extract the signed XDR from the response object
        // Freighter returns {signedTxXdr: string, signerAddress: string}
        const signedXdr = signedResponse.signedTxXdr || signedResponse;

        // Create Transaction object from signed XDR string
        const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

        console.log('Submitting to network...');

        // Submit to network
        const result = await server.submitTransaction(tx);

        console.log('Transaction successful!', result.hash);

        return {
            success: true,
            hash: result.hash,
            message: `Successfully sent ${amountStr} XLM!`,
        };

    } catch (error) {
        console.error('Payment error:', error);

        // Handle specific errors
        if (error.message.includes('User declined')) {
            throw new Error('Transaction rejected. You declined to sign the transaction.');
        }

        if (error.response && error.response.data) {
            const resultCodes = error.response.data.extras?.result_codes;
            if (resultCodes?.transaction === 'tx_insufficient_balance') {
                throw new Error('Insufficient balance to complete this transaction (including fees).');
            }
            if (resultCodes?.operations?.includes('op_underfunded')) {
                throw new Error('Insufficient XLM balance for this transfer.');
            }
        }

        throw new Error(error.message || 'Failed to send payment');
    }
};

/**
 * Gets a link to view transaction on Stellar Expert
 * @param {string} hash - Transaction hash
 * @returns {string} URL to Stellar Expert
 */
export const getTransactionUrl = (hash) => {
    return `https://stellar.expert/explorer/testnet/tx/${hash}`;
};
