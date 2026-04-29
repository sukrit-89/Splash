import {
  ArrowDown,
  BookOpen,
  Coins,
  ExternalLink,
  FileText,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Component as EtheralShadow } from "../components/ui/etheral-shadow";
import { SplashLogo } from "../components/ui/SplashLogo";
import { useLiveAmount } from "../hooks/useLiveAmount";
import { useWallet } from "../hooks/useWallet";
import { formatLiveAmount } from "../lib/formatters";
import { navigate } from "../router";

const demoStart = Math.floor(Date.now() / 1000) - 1;

const steps = [
  {
    id: "01",
    title: "Create a Stream",
    body: "Set a recipient, pick a token, define a flow rate. Funds are locked in the contract and begin streaming instantly.",
  },
  {
    id: "02",
    title: "Funds Flow Per Second",
    body: "Your balance accrues in real time. No waiting for transaction batches. No invoices. No payroll cycles.",
  },
  {
    id: "03",
    title: "Withdraw Anytime",
    body: "The recipient claims accrued funds whenever they want. Cancel the stream at any time, unstreamed funds return to sender.",
  },
];

const useCases = [
  {
    icon: User,
    title: "Freelance & Gig",
    body: "Get paid by the second as you work. No invoices. No net-30 terms. No friction.",
  },
  {
    icon: Users,
    title: "Remote Payroll",
    body: "Employers stream salaries continuously. Teams in any timezone withdraw daily.",
  },
  {
    icon: RefreshCw,
    title: "Subscriptions",
    body: "Per-second billing for SaaS or services. Users cancel instantly, not at cycle end.",
  },
  {
    icon: Coins,
    title: "Protocol Grants",
    body: "Stream grant funding to builders over time. Milestone-based or continuous, your choice.",
  },
];

const developerResources = [
  {
    label: "PRD",
    href: "https://github.com/sukrit-89/Splash/blob/main/PRD.MD",
    detail: "Product scope",
    icon: FileText,
  },
  {
    label: "Soroban Docs",
    href: "https://developers.stellar.org/docs/build/smart-contracts",
    detail: "Contract guide",
    icon: BookOpen,
  },
  {
    label: "Stellar SDK",
    href: "https://developers.stellar.org/docs/tools/sdks",
    detail: "Client tooling",
    icon: ShieldCheck,
  },
  {
    label: "Source",
    href: "https://github.com/sukrit-89/Splash",
    detail: "GitHub repo",
    icon: GitBranch,
  },
];

const footerLinks = [
  ["Repository", "https://github.com/sukrit-89/Splash"],
  ["Stellar Docs", "https://developers.stellar.org/docs"],
  ["Soroban RPC", "https://developers.stellar.org/docs/data/apis/rpc"],
  ["Freighter", "https://freighter.app"],
];

export function Landing() {
  const amount = useLiveAmount(demoStart, 0.0023847, 0, 1000);
  const { connect, isConnected } = useWallet();
  const [hideScroll, setHideScroll] = useState(false);

  useEffect(() => {
    if (isConnected) {
      navigate("/dashboard");
    }
  }, [isConnected]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHideScroll(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const launch = async () => {
    await connect();
    navigate("/dashboard");
  };

  return (
    <div>
      <section className="hero-bloom relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <EtheralShadow
            className="h-[420px] w-[min(92vw,760px)] opacity-100 sm:h-[500px] lg:h-[560px] lg:w-[820px]"
            color="rgba(34, 197, 94, 0.34)"
            animation={{ scale: 58, speed: 28 }}
            noise={{ opacity: 0.14, scale: 0.9 }}
            sizing="fill"
            style={{
              transform: "translateY(16px)",
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="mb-6 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-dim)] px-3 py-1 font-mono text-[11px] tracking-wide text-[var(--accent)]">
            Level 4 / Factory + FLOW on Testnet
          </div>
          <h1 className="text-balance text-[40px] font-light leading-[1.08] text-[var(--text-primary)] sm:text-[56px] lg:text-[80px]">
            Get Paid
            <br />
            By The <span className="font-semibold">Second.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[320px] text-base leading-[1.6] text-[var(--text-secondary)] sm:max-w-xl sm:text-lg">
            SPLASH turns time into money. Create a real-time payment stream and
            watch your balance grow, every second you work.
          </p>

          <div className="mx-auto mt-10 w-full max-w-[340px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 text-left">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[var(--text-muted)]">
              <span>DEMO STREAM</span>
              <span className="text-[var(--accent)]">
                LIVE{" "}
                <span className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full bg-current" />
              </span>
            </div>
            <div className="my-3 border-t border-[var(--border-subtle)]" />
            <div className="flex items-end justify-between gap-4">
              <p className="font-mono text-xl tabular-nums text-[var(--text-primary)]">
                ${formatLiveAmount(amount)}
              </p>
              <p className="font-mono text-xs text-[var(--text-muted)]">
                USDC/second
              </p>
            </div>
            <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
              Streaming to GAKQTM...FSRWL
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={launch} variant="primary">
              Launch App
            </Button>
            <Button
              onClick={() =>
                window.open("https://developers.stellar.org/docs", "_blank")
              }
            >
              Read the Docs
            </Button>
          </div>
        </div>
        <ArrowDown
          className={`absolute bottom-8 h-4 w-4 text-[var(--text-muted)] transition-opacity duration-700 ${
            hideScroll ? "opacity-0" : "opacity-100"
          }`}
        />
      </section>

      <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-5 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 lg:grid-cols-3">
          {[
            ["$0", "Total Streamed"],
            ["0", "Active Streams"],
            ["0 sec", "Avg Stream Life"],
          ].map(([value, label], index) => (
            <div
              className={`py-4 text-center lg:py-0 ${
                index < 2 ? "lg:border-r lg:border-[var(--border-subtle)]" : ""
              }`}
              key={label}
            >
              <p className="font-mono text-[28px] font-medium text-[var(--text-primary)]">
                {value}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-24 lg:px-12">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          HOW IT WORKS
        </p>
        <h2 className="text-[40px] font-light tracking-[-0.02em] text-[var(--text-primary)]">
          Real payments. Real time.
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {steps.map((step) => (
            <article
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 transition-colors duration-200 hover:border-[var(--border-default)]"
              key={step.id}
            >
              <p className="font-mono text-sm text-[var(--accent)]">
                {step.id}
              </p>
              <h3 className="mt-5 text-lg font-medium text-[var(--text-primary)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-24 lg:px-12">
        <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[3fr_2fr]">
          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
              THE EDGE
            </p>
            <h2 className="text-4xl font-light tracking-[-0.02em] text-[var(--text-primary)]">
              Your payment moves while the work happens.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-[var(--text-secondary)]">
              Unlike sending a lump sum, SPLASH locks the full payment in a
              Soroban StreamVault and releases it to the recipient second by
              second.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              The recipient can withdraw accrued funds at any time, and the
              sender can cancel before the stream ends to recover the unearned
              balance.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["StreamVault", "Real-Time Accrual"].map((tag) => (
                <span
                  className="rounded border border-[var(--accent-border)] bg-[var(--accent-dim)] px-3 py-1 font-mono text-[11px] tracking-wide text-[var(--accent)]"
                  key={tag}
                >
                  ● {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <svg
              aria-label="SPLASH stream lifecycle diagram"
              className="h-72 w-full text-[var(--accent)]"
              viewBox="0 0 360 260"
            >
              {["Sender Wallet", "StreamVault", "Accrual", "Recipient"].map(
                (label, index) => {
                  const positions = [
                    [100, 10],
                    [100, 95],
                    [230, 95],
                    [100, 180],
                  ];
                  const [x, y] = positions[index];
                  return (
                    <g key={label}>
                      <rect
                        fill="transparent"
                        height="44"
                        rx="8"
                        stroke="var(--border-default)"
                        width="120"
                        x={x}
                        y={y}
                      />
                      <text
                        fill="var(--text-secondary)"
                        fontFamily="IBM Plex Mono"
                        fontSize="11"
                        textAnchor="middle"
                        x={x + 60}
                        y={y + 27}
                      >
                        {label}
                      </text>
                    </g>
                  );
                },
              )}
              <path d="M160 54 V92" stroke="currentColor" />
              <path d="M220 117 H230" stroke="currentColor" />
              <path d="M230 139 H220" stroke="currentColor" />
              <path d="M160 139 V180" stroke="currentColor" />
              <text
                fill="var(--accent)"
                fontFamily="IBM Plex Mono"
                fontSize="10"
                x="170"
                y="78"
              >
                deposit
              </text>
              <text
                fill="var(--accent)"
                fontFamily="IBM Plex Mono"
                fontSize="10"
                x="254"
                y="158"
              >
                accrued
              </text>
              <text
                fill="var(--accent)"
                fontFamily="IBM Plex Mono"
                fontSize="10"
                x="170"
                y="165"
              >
                stream
              </text>
            </svg>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-24 lg:px-12">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          USE CASES
        </p>
        <h2 className="text-4xl font-light tracking-[-0.02em] text-[var(--text-primary)]">
          Built for how people actually work.
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {useCases.map((card) => {
            const Icon = card.icon;
            return (
              <article
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6"
                key={card.title}
              >
                <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                <h3 className="mt-5 text-sm font-medium text-[var(--text-primary)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
                DEVELOPER RESOURCES
              </p>
              <h2 className="mt-2 text-xl font-medium text-[var(--text-primary)]">
                Contract-first docs for review and extension.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              Follow the Level 3 implementation, contract interface, and Stellar
              integration references without digging through the demo flow.
            </p>
          </div>

          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--border-subtle)] md:grid-cols-4">
            {developerResources.map((resource) => {
              const Icon = resource.icon;
              return (
                <a
                  className="group flex min-h-[112px] flex-col justify-between bg-[var(--bg-elevated)] p-4 transition-colors duration-150 hover:bg-[var(--bg-hover)]"
                  href={resource.href}
                  key={resource.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-[var(--text-muted)] transition-colors duration-150 group-hover:text-[var(--accent)]" />
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {resource.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {resource.detail}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] px-6 py-10 lg:px-12">
        <div className="mx-auto grid max-w-[1100px] gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <SplashLogo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
              Level 4 Stellar Soroban payment streaming demo. StreamFactory
              creates streams, FLOW tracks receipts, and the mock Blend adapter
              proves yield-layer inter-contract wiring on testnet.
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              Stellar Rise In Belt Submission
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              Contract
            </h3>
            <dl className="mt-3 space-y-3 text-xs">
              <div>
                <dt className="text-[var(--text-muted)]">Network</dt>
                <dd className="mt-1 font-mono text-[var(--text-primary)]">
                  Stellar Testnet
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">StreamVault</dt>
                <dd className="mt-1 break-all font-mono text-[var(--text-primary)]">
                  CBPNO56NJ4SI5UDJWVRLWVSCDTSMRDZCEPFNEPLRD4XTABYB6RUIBZQR
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              Links
            </h3>
            <div className="mt-3 grid gap-2">
              {footerLinks.map(([label, href]) => (
                <a
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
                  href={href}
                  key={label}
                  rel="noreferrer"
                  target="_blank"
                >
                  {label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-[1100px] flex-col gap-2 border-t border-[var(--border-subtle)] pt-5 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>2026 Splash. Testnet-only demo, no production funds.</p>
          <p className="font-mono">Rust / Soroban / React / Freighter</p>
        </div>
      </footer>
    </div>
  );
}
