import { useCallback, useState, type SubmitEventHandler } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { register } from "../services/api/auth";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const result = await register({ name, email, password });
      setNotice(
        result.message ?? "Account created. Check your email to continue.",
      );

      setTimeout(() => {
        navigate("/login", { state: { email } });
      }, 2000);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create your account right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [name, email, password]);

  return (
    <main className="auth-page auth-register">
      <Link className="auth-back" to="/">
        <ArrowLeft size={16} /> Back to Alina
      </Link>
      <section className="auth-panel" aria-labelledby="register-title">
        <Link className="wordmark auth-wordmark" to="/">
          <img src="/alina.svg" alt="" />
          <span>Alina</span>
        </Link>
        <div className="auth-heading">
          <span className="auth-icon">
            <Sparkles size={18} />
          </span>
          <p className="eyebrow">A more personal routine</p>
          <h1 id="register-title">Create your account</h1>
          <p>Start a skin journey that gets to know you.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Your name</label>
          <input
            id="register-name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
          <label className="check-row">
            <input type="checkbox" required />{" "}
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {error ? (
            <p className="form-message form-error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="form-message form-success" role="status">
              {notice}
            </p>
          ) : null}
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating account…" : "Create account"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p className="auth-privacy">
          Your skin information is personal and handled with care.
        </p>
      </section>
      <aside className="auth-aside">
        <img
          // src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85"
          src="/images/main.png"
          alt="Portrait in soft natural light"
        />
        <div className="auth-aside-copy">
          <span>ALINA / YOUR SKIN JOURNAL</span>
          <h2>Begin with one scan.</h2>
          <p>Notice your progress as your skin story unfolds.</p>
        </div>
      </aside>
    </main>
  );
}
