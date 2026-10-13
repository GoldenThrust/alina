import { ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useSessionStore } from "../stores/session";
import toast from "react-hot-toast";
import { logout } from "../lib/api";

export default function Landing() {
  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);
  const navigate = useNavigate();

  function openDemo() {
    toast("Coming soon! You can explore the app with a demo account.", {
      icon: "✨",
      iconTheme: {
        primary: "#fcd34d",
        secondary: "#fff",
      },
      position: "top-center",
      duration: 5000,
    });
  }

  async function signOut() {
    if (session?.mode === "account") await logout();
    else clearSession();
    navigate("/");
  }

  return (
    <main className="landing-page">
      <header className="public-nav">
        <Link className="wordmark" to="/" aria-label="Alina home">
          <img src="/alina.svg" alt="" />
          <span>Alina</span>
        </Link>
        <nav aria-label="Main navigation" className="public-links">
          <a href="#how-it-works">How it works</a>
          <a href="#your-journey">Your journey</a>
          {session ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <button
                className="button button-primary nav-cta"
                onClick={signOut}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link className="button button-primary nav-cta" to="/register">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <p className="eyebrow">
            <Sparkles size={15} /> A more personal kind of skincare
          </p>
          <h1 id="landing-title">
            Healthy skin.
            <br />
            Smarter care.
            <br />
            <span>With Alina.</span>
          </h1>
          <p className="landing-description">
            Your skin changes. Your skincare should understand why. Alina helps
            you see the patterns, keep your routine close, and choose a
            thoughtful next step.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary" to="/register">
              Begin your skin journey <ArrowRight size={17} />
            </Link>
            <button
              className="text-link button-plain"
              type="button"
              onClick={openDemo}
            >
              Watch a demo
            </button>
          </div>
          <div className="landing-proof" id="how-it-works">
            <span className="proof-mark" aria-hidden="true">
              A
            </span>
            <p>
              <strong>Your story, over time.</strong>
              <br />A clearer picture starts with one scan.
            </p>
          </div>
        </div>

        <div className="landing-image-wrap" id="your-journey">
          <img
            className="landing-image"
            src="/images/main.png"
            // src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85"
            alt="Portrait of a woman in soft natural light"
          />
          <div className="image-caption">
            <span className="caption-dot" />
            <span>Your skin, understood in context</span>
          </div>
          <div className="scan-note">
            <span className="scan-note-icon">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>Today’s skin story</strong>
              <span>Small changes add up.</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Personal insights</span>
        <span>Progress that makes sense</span>
        <span>Care, on your terms</span>
      </footer>
    </main>
  );
}
