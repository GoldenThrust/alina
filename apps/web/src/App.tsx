import { useEffect, useState } from 'react';

type Baseline = {
  hasScan: boolean;
  title: string;
  action: string;
  message: string;
};

export function App() {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/baseline')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        setBaseline(await response.json());
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Unable to load Alina');
      });
  }, []);

  return (
    <main className="shell">
      <header className="brand">
        <span className="brand-mark">A</span>
        <span>Alina</span>
      </header>

      <section className="hero">
        <p className="eyebrow">Your skin, understood</p>
        <h1>{baseline?.title ?? 'Loading your skin story…'}</h1>
        <p className="intro">
          {baseline?.message ?? 'Alina is preparing your personal skin history.'}
        </p>

        {error ? <p className="error">Unable to reach the Alina API: {error}</p> : null}

        <button className="primary-action" type="button">
          {baseline?.action ?? 'Starting Alina…'}
          <span aria-hidden="true">→</span>
        </button>

        <div className="trust-note">
          <span className="trust-dot" />
          Your first scan stays private and local to this device.
        </div>
      </section>

      <footer>
        <span>Personal insights</span>
        <span>Clear next steps</span>
        <span>Private by design</span>
      </footer>
    </main>
  );
}
