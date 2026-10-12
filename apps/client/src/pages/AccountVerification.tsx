import { useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { verifyAccount } from "../services/auth";
import { useSessionStore } from "../stores/session";

export default function AccountVerification() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const setSession = useSessionStore((state) => state.setSession);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (hasFetched.current) return;

      hasFetched.current = true;
      if (!token) {
        setError("No verification token found.");
        return;
      }
      setSubmitting(true);
      try {
        const response = await verifyAccount(token);
        if (response.accessToken && response.refreshToken && response.user) {
          setSession({
            name: response.user.name!,
            email: response.user.email!,
            accessToken: response.accessToken,
            mode: "account",
          });
          setTimeout(() => {
            navigate("/dashboard");
          }, 1000);
        } else {
          setError("Failed to verify account.");
          setTimeout(() => {
            navigate("/register");
          }, 2000);
        }
      } catch (error) {
        console.error("Account verification failed", error);
        setError(
          error instanceof Error ? error.message : "Failed to verify account.",
        );
        setTimeout(() => {
          navigate("/register");
        }, 2000);
      } finally {
        setSubmitting(false);
      }
    };

    verify();
  }, [token]);

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <Link className="wordmark auth-wordmark" to="/">
          <img src="/alina.svg" alt="" />
          <span>Alina</span>
        </Link>
        <div className="auth-heading">
          <span className="auth-icon">
            <LockKeyhole size={18} />
          </span>
          <p className="eyebrow">Wait a moment while we verify your account.</p>
          <h1 id="login-title" className={error ? "text-red-500!" : ""}>
            {error ||
              (submitting
                ? "Verifying your account...."
                : "Account verified successfully")}
          </h1>
          <p>
            You will be redirected to your dashboard once verification is
            complete.
          </p>
        </div>

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
          <h2>Understand the little changes.</h2>
          <p>Come back to a clearer view of your skin, one scan at a time.</p>
        </div>
      </aside>
    </main>
  );
}
