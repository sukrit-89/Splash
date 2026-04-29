import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { networkPassphrase, parseSorobanError } from "../lib/stellar";
import { WalletContextValue } from "../types/wallet";
import { ToastStatus, useToast } from "./useToast";

const walletStorageKey = "splash_wallet";
const legacyWalletStorageKey = "streamflow_wallet";

interface FreighterApi {
  isConnected: () => Promise<{ isConnected: boolean }>;
  requestAccess: () => Promise<{ address: string }>;
  getAddress: () => Promise<{ address: string }>;
  getNetwork: () => Promise<{ network: string; networkPassphrase: string }>;
  signTransaction: (
    transactionXdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<{ signedTxXdr: string; signerAddress: string; error?: unknown }>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [address, setAddress] = useState<string | null>(() =>
    window.localStorage.getItem(walletStorageKey) ??
      window.localStorage.getItem(legacyWalletStorageKey),
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function checkFreighter() {
      try {
        const module = (await import("@stellar/freighter-api")) as unknown;
        const freighter = module as FreighterApi;
        const connected = await freighter.isConnected();
        if (!connected.isConnected) {
          return;
        }

        const result = await freighter.getAddress();
        if (isMounted && result.address) {
          setAddress(result.address);
          window.localStorage.setItem(walletStorageKey, result.address);
          window.localStorage.removeItem(legacyWalletStorageKey);
        }
      } catch {
        const storedAddress =
          window.localStorage.getItem(walletStorageKey) ??
          window.localStorage.getItem(legacyWalletStorageKey);
        if (isMounted && storedAddress) {
          setAddress(storedAddress);
        }
      }
    }

    checkFreighter();

    return () => {
      isMounted = false;
    };
  }, []);

  const connect = async () => {
    setIsConnecting(true);

    try {
      const module = (await import("@stellar/freighter-api")) as unknown;
      const freighter = module as FreighterApi;
      const connected = await freighter.isConnected();
      if (!connected.isConnected) {
        throw new Error("Freighter extension is not available");
      }

      const result = await freighter.requestAccess();
      const nextAddress = result.address;
      if (!nextAddress) {
        throw new Error("Freighter did not return a wallet address");
      }

      setAddress(nextAddress);
      window.localStorage.setItem(walletStorageKey, nextAddress);
      window.localStorage.removeItem(legacyWalletStorageKey);
      pushToast({
        status: ToastStatus.Success,
        title: "Wallet connected",
        description: nextAddress,
      });
    } catch (error) {
      const message = parseSorobanError(error);
      pushToast({
        status: ToastStatus.Error,
        title:
          error instanceof Error && error.message.includes("declined")
            ? "Wallet request declined"
            : "Wallet connection failed",
        description: message,
      });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const signTransaction = async (transactionXdr: string): Promise<string> => {
    if (!address) {
      throw new Error("Connect Freighter before signing a transaction");
    }

    const module = (await import("@stellar/freighter-api")) as unknown;
    const freighter = module as FreighterApi;
    const network = await freighter.getNetwork();
    if (network.networkPassphrase !== networkPassphrase) {
      throw new Error("Switch Freighter to Stellar testnet before signing");
    }

    const result = await freighter.signTransaction(transactionXdr, {
      address,
      networkPassphrase,
    });
    if (result.error || !result.signedTxXdr) {
      throw new Error("Freighter did not sign the transaction");
    }

    return result.signedTxXdr;
  };

  const disconnect = () => {
    setAddress(null);
    window.localStorage.removeItem(walletStorageKey);
    window.localStorage.removeItem(legacyWalletStorageKey);
  };

  const value = useMemo(
    () => ({
      address,
      isConnected: Boolean(address),
      isConnecting,
      connect,
      disconnect,
      signTransaction,
    }),
    [address, isConnecting],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }

  return context;
}
