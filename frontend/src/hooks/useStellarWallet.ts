import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, getNetwork, isConnected, requestAccess, signTransaction as freighterSignTransaction } from "@stellar/freighter-api";
import { stellarConfig } from "../lib/stellar";

function getStoredAddress() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("streamflow:wallet_address");
}

function getFreighterError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

function assertExpectedNetwork(networkPassphrase: string | undefined) {
  if (networkPassphrase !== stellarConfig.networkPassphrase) {
    throw new Error(
      `Freighter is on the wrong network. Switch to ${
        stellarConfig.networkPassphrase
      } before signing.`
    );
  }
}

export function useStellarWallet() {
  const [address, setAddress] = useState<string | null>(() => getStoredAddress());
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    const connected = await isConnected();
    if (connected.error || !connected.isConnected) {
      return;
    }

    const network = await getNetwork();
    if (!network.error) {
      setNetworkPassphrase(network.networkPassphrase);
    }

    const result = await getAddress();
    if (!result.error && result.address) {
      setAddress(result.address);
      window.localStorage.setItem("streamflow:wallet_address", result.address);
    }
  }, []);

  useEffect(() => {
    refreshWallet().catch(() => undefined);
  }, [refreshWallet]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const connected = await isConnected();
      if (connected.error || !connected.isConnected) {
        throw new Error("Freighter extension is not available.");
      }

      const network = await getNetwork();
      if (network.error) {
        throw new Error(network.error.message);
      }
      assertExpectedNetwork(network.networkPassphrase);

      const result = await requestAccess();
      if (result.error) {
        throw new Error(result.error.message);
      }

      setAddress(result.address);
      setNetworkPassphrase(network.networkPassphrase);
      window.localStorage.setItem("streamflow:wallet_address", result.address);
      return result.address;
    } catch (err) {
      const message = getFreighterError(err, "Wallet connection failed.");
      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setNetworkPassphrase(null);
    window.localStorage.removeItem("streamflow:wallet_address");
  }, []);

  const signTransaction = useCallback(
    async (xdr: string) => {
      if (!address) throw new Error("Connect Freighter before signing.");

      const network = await getNetwork();
      if (network.error) {
        throw new Error(network.error.message);
      }
      assertExpectedNetwork(network.networkPassphrase);

      const result = await freighterSignTransaction(xdr, {
        address,
        networkPassphrase: stellarConfig.networkPassphrase,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.signedTxXdr;
    },
    [address]
  );

  return useMemo(
    () => ({
      address,
      networkPassphrase,
      connected: Boolean(address),
      connecting,
      error,
      connect,
      disconnect,
      refreshWallet,
      signTransaction,
    }),
    [address, connect, connecting, disconnect, error, networkPassphrase, refreshWallet, signTransaction]
  );
}
