import { Button } from "../components/Button";
import { TickerBalance } from "../components/TickerBalance";

type HomePageProps = {
  onStart: () => void;
};

const steps = [
  ["Deposit", "Lock the stream total in a Soroban vault."],
  ["Flow", "Value accrues every second using deterministic on-chain math."],
  ["Claim", "Recipients withdraw what has already arrived."],
];

export function HomePage({ onStart }: HomePageProps) {
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-flow">Stellar payment streaming</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.03em] text-primary sm:text-7xl">
            Money shouldn&apos;t wait.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-secondary">
            Splash turns payroll, grants, and invoices into live financial streams. The balance moves while work happens.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={onStart}
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              }
            >
              Start Streaming
            </Button>
            <Button variant="secondary" onClick={() => window.scrollTo({ top: 620, behavior: "smooth" })}>
              See how it works
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 sm:p-6">
          <div className="mb-6 aspect-[16/10] overflow-hidden rounded-md border border-line bg-ink">
            <img src="/splash.png" alt="Splash Protocol visual identity" className="h-full w-full object-cover" />
          </div>
          <div className="rounded-md border border-line bg-ink p-5 sm:p-7">
            <TickerBalance label="live demo balance" />
            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm text-secondary">
              <span>Rate</span>
              <span className="font-mono text-primary">0.00420 USDC / sec</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {steps.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-line bg-ink p-5 transition hover:-translate-y-1 hover:border-[#2a2a2a]">
              <p className="font-mono text-sm text-flow">0{steps.findIndex(([item]) => item === title) + 1}</p>
              <h2 className="mt-4 text-xl font-semibold text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-secondary">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
