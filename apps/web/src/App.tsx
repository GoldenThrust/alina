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
        <span className="brand-mark" aria-hidden="true">A</span>
        <span>Alina</span>
        <span className="brand-note">Skin intelligence, made personal</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Your skin, understood</p>
          <h1 id="hero-title">{baseline?.title ?? 'Loading your skin story…'}</h1>
          <p className="intro">
            {baseline?.message ?? 'Alina is preparing your personal skin history.'}
          </p>

          {error ? <p className="error">Unable to reach the Alina API: {error}</p> : null}

          <button className="primary-action" type="button">
            <span>{baseline?.action ?? 'Starting Alina…'}</span>
            <span className="action-arrow" aria-hidden="true">↗</span>
          </button>

          <div className="trust-note">
            <span className="trust-dot" />
            Your first scan stays private and local to this device.
          </div>
        </div>

        <div className="visual" aria-hidden="true">
          <div className="visual-glow" />
          <svg className="skin-orbit" viewBox="0 0 520 520" role="presentation">
            <defs>
              <radialGradient id="skinGradient" cx="42%" cy="34%" r="70%">
                <stop offset="0%" stopColor="#f6d8c5" />
                <stop offset="58%" stopColor="#d9a98b" />
                <stop offset="100%" stopColor="#a96f55" />
              </radialGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6d8d78" stopOpacity=".13" />
                <stop offset="100%" stopColor="#315a47" stopOpacity=".72" />
              </linearGradient>
            </defs>
            <circle className="orbit orbit-one" cx="260" cy="260" r="208" />
            <circle className="orbit orbit-two" cx="260" cy="260" r="166" />
            <path className="orbit-line" d="M91 300c58-117 136-169 229-169 41 0 77 10 107 31" />
            <circle className="skin" cx="260" cy="260" r="132" fill="url(#skinGradient)" />
            <path className="skin-shine" d="M174 196c36-35 86-41 129-23-25-10-51-6-72 11-21 17-32 42-34 70-9-26-15-42-23-58Z" />
            <path className="scan-line" d="M155 260h310" />
            <circle className="scan-point" cx="260" cy="260" r="7" />
            <circle className="signal signal-one" cx="87" cy="194" r="5" />
            <circle className="signal signal-two" cx="393" cy="320" r="5" />
          </svg>
          <div className="visual-caption">
            <span>01</span>
            <p>Notice what is changing.<br />Understand what comes next.</p>
          </div>
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
