import { Check, ChevronDown, Loader2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useCreateStream } from "../hooks/useStreamActions";
import { isValidStellarAddress, streamFactoryContractId } from "../lib/stellar";
import { navigate } from "../router";
import { TokenSymbol } from "../types/stream";
import { Button } from "../components/ui/Button";

const units = ["per minute", "per hour", "per day", "per month"] as const;
const durationUnits = ["days", "weeks", "months"] as const;
const tokens = [TokenSymbol.USDC, TokenSymbol.XLM] as const;

type FlowUnit = (typeof units)[number];
type DurationUnit = (typeof durationUnits)[number];

function unitSeconds(unit: FlowUnit): number {
  const map: Record<FlowUnit, number> = {
    "per minute": 60,
    "per hour": 3600,
    "per day": 86400,
    "per month": 2592000,
  };
  return map[unit];
}

function durationDays(value: number, unit: DurationUnit): number {
  const map: Record<DurationUnit, number> = {
    days: 1,
    weeks: 7,
    months: 30,
  };
  return value * map[unit];
}

export function CreateStream() {
  const [recipient, setRecipient] = useState("");
  const [touched, setTouched] = useState(false);
  const [token, setToken] = useState<(typeof tokens)[number]>(TokenSymbol.USDC);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [amount, setAmount] = useState(100);
  const [unit, setUnit] = useState<FlowUnit>("per day");
  const [duration, setDuration] = useState(30);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [step, setStep] = useState<"idle" | "signing" | "submitting" | "confirmed">("idle");
  const { createStream, isLoading } = useCreateStream();

  const validRecipient = recipient.length === 0 || isValidStellarAddress(recipient);
  const ratePerSecond = amount / unitSeconds(unit);
  const totalDays = durationDays(duration, durationUnit);
  const durationSeconds = Math.round(totalDays * 86400);
  const totalDeposit = ratePerSecond * durationSeconds;
  const endDate = useMemo(() => {
    const date = new Date(Date.now() + totalDays * 86400 * 1000);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(date);
  }, [totalDays]);
  const canSubmit = recipient.length > 0 && validRecipient && amount > 0 && duration > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setStep("signing");
    try {
      setStep("submitting");
      const stream = await createStream({
        recipient,
        token,
        ratePerSecond,
        durationSeconds,
      });
      setStep("confirmed");
      window.setTimeout(() => navigate(`/stream/${stream.id}`), 900);
    } catch {
      setStep("idle");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-8 lg:px-0">
      <header>
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">
          Create Stream
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Set up a continuous payment to any Stellar address.
        </p>
      </header>

      <form
        className="mt-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7"
        onSubmit={submit}
      >
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            RECIPIENT
          </span>
          <input
            className={`w-full rounded-md border bg-[var(--bg-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--text-primary)] transition-all duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] ${
              touched && !validRecipient ? "border-[var(--status-error)]" : "border-[var(--border-subtle)]"
            }`}
            onBlur={() => setTouched(true)}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="G... or S..."
            value={recipient}
          />
          {touched && !validRecipient ? (
            <span className="mt-1.5 block text-xs text-[var(--status-error)]">
              Invalid Stellar address
            </span>
          ) : null}
        </label>

        <div className="relative mt-5">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            TOKEN
          </span>
          <button
            className="flex w-full items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            onClick={() => setTokenOpen((current) => !current)}
            type="button"
          >
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-[var(--accent-border)]" />
              {token}
            </span>
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
          {tokenOpen ? (
            <div className="absolute z-20 mt-2 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-modal">
              {tokens.map((option) => (
                <button
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
                  key={option}
                  onClick={() => {
                    setToken(option);
                    setTokenOpen(false);
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-[var(--border-subtle)]" />
                    {option}
                  </span>
                  {option === token ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            FLOW RATE
          </span>
          <div className="grid grid-cols-[1fr_150px] gap-3">
            <input
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--text-primary)] focus:outline-none"
              min="0"
              onChange={(event) => setAmount(Number(event.target.value))}
              type="number"
              value={amount}
            />
            <select
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
              onChange={(event) => setUnit(event.target.value as FlowUnit)}
              value={unit}
            >
              {units.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            = {ratePerSecond.toFixed(6)} {token}/second
          </p>
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            DURATION
          </span>
          <div className="grid grid-cols-[1fr_150px] gap-3">
            <input
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 font-mono text-sm text-[var(--text-primary)] focus:outline-none"
              min="1"
              onChange={(event) => setDuration(Number(event.target.value))}
              type="number"
              value={duration}
            />
            <select
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
              onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
              value={durationUnit}
            >
              {durationUnits.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            Stream ends: {endDate}
          </p>
        </div>

        <div className="mt-6 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          {[
            ["Total Deposit", `${totalDeposit.toFixed(2)} ${token}`],
            ["Flow Rate", `${ratePerSecond.toFixed(6)} ${token}/sec`],
            ["Duration", `${totalDays} days`],
            ["Contract", streamFactoryContractId ? "StreamFactory + Vault" : "StreamVault testnet"],
          ].map(([label, value]) => (
            <div className="flex justify-between py-1 text-xs" key={label}>
              <span className="text-[var(--text-muted)]">{label}</span>
              <span
                className={`font-mono font-medium ${
                  label === "Contract"
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {step === "idle" ? (
          <div className="mt-6">
            <Button
              className="w-full"
              disabled={!canSubmit}
              isLoading={isLoading}
              type="submit"
              variant="primary"
            >
              Create Stream →
            </Button>
            {!canSubmit ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Enter a valid Stellar recipient, amount, and duration to create
                a stream.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-3 items-center text-center text-xs">
              {["signing", "submitting", "confirmed"].map((item, index) => {
                const active = step === item;
                const done =
                  ["signing", "submitting", "confirmed"].indexOf(step) > index;
                return (
                  <div className="relative flex flex-col items-center gap-2" key={item}>
                    {index > 0 ? (
                      <span className="absolute right-1/2 top-2 h-px w-full bg-[var(--border-subtle)]" />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border ${
                        done || item === "confirmed" && step === "confirmed"
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : active
                            ? "border-[var(--accent)] text-[var(--accent)]"
                            : "border-[var(--border-strong)]"
                      }`}
                    >
                      {active && step !== "confirmed" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                    </span>
                    <span className={active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}>
                      {item[0].toUpperCase() + item.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
              {step === "signing"
                ? "Prepare the transaction in your wallet."
                : step === "submitting"
                  ? "Submitting to Stellar testnet."
                  : "Stream created. Redirecting to dashboard."}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
