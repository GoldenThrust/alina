import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { login } from '../services/auth';
import { useSessionStore } from '../stores/session';

export default function Login() {
	const navigate = useNavigate();
	const setSession = useSessionStore((state) => state.setSession);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			const result = await login({ email, password });
			setSession({
				name: result.user?.name ?? email.split('@')[0] ?? 'Alina member',
				email,
				accessToken: result.accessToken,
				mode: 'account',
			});
			navigate('/dashboard');
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to sign in right now.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className="auth-page">
			<Link className="auth-back" to="/"><ArrowLeft size={16} /> Back to Alina</Link>
			<section className="auth-panel" aria-labelledby="login-title">
				<Link className="wordmark auth-wordmark" to="/">
					<img src="/alina.svg" alt="" /><span>Alina</span>
				</Link>
				<div className="auth-heading">
					<span className="auth-icon"><LockKeyhole size={18} /></span>
					<p className="eyebrow">Your skin journey continues</p>
					<h1 id="login-title">Welcome back</h1>
					<p>Sign in to see what’s new with your skin.</p>
				</div>
				<form className="auth-form" onSubmit={handleSubmit}>
					<label htmlFor="login-email">Email address</label>
					<input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
					<div className="label-row"><label htmlFor="login-password">Password</label><a href="#forgot-password">Forgot password?</a></div>
					<input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
					{error ? <p className="form-message form-error" role="alert">{error}</p> : null}
					<button className="button button-primary auth-submit" type="submit" disabled={submitting}>
						{submitting ? 'Signing in…' : 'Log in'} <ArrowRight size={16} />
					</button>
				</form>
				<p className="auth-switch">New to Alina? <Link to="/register">Create an account</Link></p>
				<p className="auth-privacy">Your skin information is personal and handled with care.</p>
			</section>
			<aside className="auth-aside">
				<img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85" alt="Portrait in soft natural light" />
				<div className="auth-aside-copy"><span>ALINA / YOUR SKIN JOURNAL</span><h2>Understand the little changes.</h2><p>Come back to a clearer view of your skin, one scan at a time.</p></div>
			</aside>
		</main>
	);
}
