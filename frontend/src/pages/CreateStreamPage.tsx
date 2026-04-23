import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import {
  formToContractAmounts,
  isValidStellarAddress,
  unitsToDisplay,
  type StreamFormInput,
  type TokenSymbol,
} from "../lib/stellar";

type CreateStreamPageProps = {
  walletAddress: string | null;
  creating: boolean;
  onConnectWallet: () => void;
  onCreated: (input: StreamFormInput) => void;
};

export function CreateStreamPage({ walletAddress, creating, onConnectWallet, onCreated }: CreateStreamPageProps) {
  const [recipient, setRecipient] = useState("");
  const [token, setToken] = useState<TokenSymbol>("USDC");
  const [amountPerDay, setAmountPerDay] = useState("125");
  const [durationDays, setDurationDays] = useState("7");

  const preview = useMemo(() => {
    try {
      return formToContractAmounts({ amountPerDay, durationDays });
    } catch {
      return null;
    }
  }, [amountPerDay, durationDays]);

  const recipientError = recipient && !isValidStellarAddress(recipient) ? "Enter a valid Stellar address." : "";
  const amountValue = Number(amountPerDay);
  const durationValue = Number(durationDays);
  const amountError = !Number.isFinite(amountValue) || amountValue <= 0 ? "Enter a positive daily amount." : "";
  const durationError = !Number.isFinite(durationValue) || durationValue <= 0 ? "Enter a positive duration." : "";
  const disabled = creating || Boolean(recipientError || amountError || durationError) || !recipient || !preview;

  const submit = () => {
    if (!walletAddress) {
      onConnectWallet();
      return;
    }

    onCreated({
      sender: walletAddress,
      recipient,
      token,
      amountPerDay,
      durationDays,
    });
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-flow">Create Stream</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-primary sm:text-6xl">Set money in motion.</h1>
        <p className="mt-4 max-w-2xl text-secondary">
          Choose a recipient, daily flow rate, and duration. Splash converts it into a per-second stream for the contract.
        </p>

        <form className="mt-8 grid gap-5 rounded-lg border border-line bg-surface p-5 sm:p-6">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-primary">Recipient address</span>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="G..."
              className="h-12 rounded-md border border-line bg-ink px-4 font-mono text-sm text-primary outline-none transition placeholder:text-[#3f3f3f] focus:border-flow"
            />
            {recipientError ? <span className="text-sm text-flow">{recipientError}</span> : null}
          </label>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-primary">Token</span>
              <select
                value={token}
                onChange={(event) => setToken(event.target.value as TokenSymbol)}
                className="h-12 rounded-md border border-line bg-ink px-4 text-sm text-primary outline-none transition focus:border-flow"
              >
                <option>USDC</option>
                <option>XLM</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-primary">Per day</span>
              <input
                value={amountPerDay}
                onChange={(event) => setAmountPerDay(event.target.value)}
                inputMode="decimal"
                className="h-12 rounded-md border border-line bg-ink px-4 font-mono text-sm text-primary outline-none transition focus:border-flow"
              />
              {amountError ? <span className="text-sm text-flow">{amountError}</span> : null}
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-primary">Days</span>
              <input
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                inputMode="numeric"
                className="h-12 rounded-md border border-line bg-ink px-4 font-mono text-sm text-primary outline-none transition focus:border-flow"
              />
              {durationError ? <span className="text-sm text-flow">{durationError}</span> : null}
            </label>
          </div>

          <Button className="mt-2 w-full sm:w-fit" type="button" onClick={submit} disabled={disabled}>
            {!walletAddress ? "Connect Wallet" : creating ? "Preparing" : "Create Stream"}
          </Button>
        </form>
      </div>

      <aside className="h-fit rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
        <p className="text-xs uppercase tracking-[0.18em] text-secondary">Live preview</p>
        <div className="mt-5 rounded-md border border-line bg-ink p-5">
          <p className="text-sm text-secondary">You will stream</p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-primary">
            {Number(amountPerDay || 0).toFixed(2)}
            <span className="ml-2 text-base text-flow">{token} / day</span>
          </p>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between rounded-md border border-line bg-ink p-4">
            <span className="text-secondary">Rate per second</span>
            <span className="font-mono text-primary">
              {preview ? unitsToDisplay(preview.ratePerSecond, 7) : "0.00"} {token}
            </span>
          </div>
          <div className="flex justify-between rounded-md border border-line bg-ink p-4">
            <span className="text-secondary">Total deposit</span>
            <span className="font-mono text-primary">
              {preview ? unitsToDisplay(preview.totalDeposit, 7) : "0.00"} {token}
            </span>
          </div>
        </div>
      </aside>
    </section>
  );
}
