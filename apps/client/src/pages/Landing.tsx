
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { selectIsAuthenticated, useAuthStore } from "../stores";
import toast from "react-hot-toast";
import { logout } from "../services/api/auth";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Landing() {
  const isAuthed = useAuthStore(selectIsAuthenticated);
  const logOut = useAuthStore((state: AuthState) => state.signOut);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease },
    },
  };

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  };

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
    await logout();
    logOut();
    navigate("/");
  }

  return (
    <motion.main
      className="landing-page"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Navigation */}
      <motion.header
        className="public-nav"
        initial={reduceMotion ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <motion.div
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        >
          <Link className="wordmark" to="/" aria-label="Alina home">
            <img src="/alina.svg" alt="" />
            <span>Alina</span>
          </Link>
        </motion.div>

        <nav aria-label="Main navigation" className="public-links">
          <motion.a whileHover={{ y: -2 }} href="#how-it-works">
            How it works
          </motion.a>
          <motion.a whileHover={{ y: -2 }} href="#your-journey">
            Your journey
          </motion.a>

          {isAuthed ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <motion.button
                className="button button-primary nav-cta"
                onClick={signOut}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              >
                Log Out
              </motion.button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              >
                <Link
                  className="button button-primary nav-cta"
                  to="/register"
                >
                  Get started
                </Link>
              </motion.div>
            </>
          )}
        </nav>
      </motion.header>

      {/* Hero */}
      <section className="landing-hero" aria-labelledby="landing-title">
        <motion.div
          className="landing-copy"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.p className="eyebrow" variants={fadeUp}>
            <motion.span
              animate={
                reduceMotion
                  ? undefined
                  : { rotate: [0, 12, -12, 0] }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              style={{ display: "inline-flex" }}
            >
              <Sparkles size={15} />
            </motion.span>
            A more personal kind of skincare
          </motion.p>

          <motion.h1 id="landing-title" variants={fadeUp}>
            Healthy skin.
            <br />
            Smarter care.
            <br />
            <motion.span
              initial={
                reduceMotion ? false : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.7, ease }}
            >
              With Alina.
            </motion.span>
          </motion.h1>

          <motion.p
            className="landing-description"
            variants={fadeUp}
          >
            Your skin changes. Your skincare should understand why.
            Alina helps you see the patterns, keep your routine close,
            and choose a thoughtful next step.
          </motion.p>

          <motion.div className="landing-actions" variants={fadeUp}>
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <Link className="button button-primary" to="/register">
                Begin your skin journey
                <motion.span
                  animate={
                    reduceMotion ? undefined : { x: [0, 4, 0] }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  style={{ display: "inline-flex" }}
                >
                  <ArrowRight size={17} />
                </motion.span>
              </Link>
            </motion.div>

            <motion.button
              className="text-link button-plain"
              type="button"
              onClick={openDemo}
              whileHover={reduceMotion ? undefined : { x: 4 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              Watch a demo
            </motion.button>
          </motion.div>

          <motion.div
            className="landing-proof"
            id="how-it-works"
            variants={fadeUp}
          >
            <motion.span
              className="proof-mark"
              aria-hidden="true"
              whileHover={
                reduceMotion
                  ? undefined
                  : { rotate: 10, scale: 1.1 }
              }
            >
              A
            </motion.span>
            <p>
              <strong>Your story, over time.</strong>
              <br />
              A clearer picture starts with one scan.
            </p>
          </motion.div>
        </motion.div>

        {/* Hero image and floating cards */}
        <motion.div
          className="landing-image-wrap"
          id="your-journey"
          initial={
            reduceMotion
              ? false
              : { opacity: 0, scale: 0.96, x: 30 }
          }
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.2,
            ease,
          }}
        >
          <motion.img
            className="landing-image"
            src="/images/main.png"
            alt="Portrait of a woman in soft natural light"
            initial={
              reduceMotion ? false : { scale: 1.08 }
            }
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease }}
            whileHover={
              reduceMotion ? undefined : { scale: 1.025 }
            }
          />

          <motion.div
            className="image-caption"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <span className="caption-dot" />
            <span>Your skin, understood in context</span>
          </motion.div>

          <motion.div
            className="scan-note"
            initial={
              reduceMotion
                ? false
                : { opacity: 0, y: 20, scale: 0.95 }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 0.8,
              duration: 0.65,
              ease,
            }}
            whileHover={
              reduceMotion
                ? undefined
                : { y: -5, scale: 1.02 }
            }
          >
            <motion.span
              className="scan-note-icon"
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 1.08, 1] }
              }
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <Sparkles size={16} />
            </motion.span>
            <div>
              <strong>Today’s skin story</strong>
              <span>Small changes add up.</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        className="landing-footer"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6, ease }}
      >
        {[
          "Personal insights",
          "Progress that makes sense",
          "Care, on your terms",
        ].map((item, index) => (
          <motion.span
            key={item}
            whileHover={
              reduceMotion ? undefined : { y: -3 }
            }
            initial={
              reduceMotion ? false : { opacity: 0, y: 8 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.1 + index * 0.1,
              duration: 0.4,
            }}
          >
            {item}
          </motion.span>
        ))}
      </motion.footer>
    </motion.main>
  );
}
