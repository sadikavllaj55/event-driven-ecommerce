import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import { AxiosError } from 'axios';
import { getErrorMessage } from '../utils/errors';
import { loginResponseSchema } from '../api/schemas';
import AuthField, { authInputClass } from '../components/AuthField';
import AuthIntro from '../components/AuthIntro';

type Mode = 'login' | 'register';

const submitClass = 'min-h-12 w-full rounded-full bg-[var(--market-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20 disabled:cursor-not-allowed disabled:opacity-50';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath: unknown = location.state?.from;
  const destination =
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//')
      ? requestedPath
      : ROUTES.home;

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('buyer');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // 2FA step
  const [needs2FA, setNeeds2FA] = useState(false);
  const [code, setCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      if (mode === 'register') {
        await api.post('/register', {
          email, password, name: name.trim(),
          username: username.trim().toLowerCase(), role,
        });
        setInfo(
          'Registered! Check the notification-service logs for your verification link, then log in.',
        );
        setMode('login');
        return;
      }

      // Login
      const res = await api.post('/login', { email, password });
      login(loginResponseSchema.parse(res.data).token);
      navigate(destination, { replace: true });
    } catch (err) {
      // 428 = 2FA required
      if (err instanceof AxiosError && err.response?.status === 428) {
        setNeeds2FA(true);
        setInfo('Enter your 2FA code from your authenticator app.');
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/login/2fa', { email, code });
      login(loginResponseSchema.parse(res.data).token);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid code'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto my-4 grid max-w-5xl overflow-hidden rounded-3xl border border-[var(--market-border)] bg-white shadow-xl shadow-[var(--market-ink)]/5 sm:my-8 lg:grid-cols-[0.9fr_1.1fr]">
      <AuthIntro />
      <section className="min-w-0 p-6 sm:p-10 lg:p-12">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--market-primary)]">
        {needs2FA ? 'One more step' : mode === 'login' ? 'Welcome back' : 'Join the marketplace'}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-ink)]">
        {needs2FA
          ? 'Two-factor authentication'
          : mode === 'login'
            ? 'Log in'
            : 'Sign up'}
      </h1>
      <p className="mb-7 mt-3 text-sm leading-6 text-gray-500">
        {needs2FA ? 'Keep your account secure with your authenticator code.' : mode === 'login' ? 'Log in to pick up where you left off.' : 'Create an account and make your next great find.'}
      </p>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {info && <p role="status" className="mb-5 rounded-xl border border-[var(--market-border)] bg-[var(--market-primary-soft)] px-4 py-3 text-sm text-[var(--market-primary)]">{info}</p>}

      {needs2FA ? (
        <form onSubmit={handle2FA} className="space-y-5">
          <AuthField
            label="Authentication code" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} disabled={submitting}
            className="text-center tracking-[0.3em]"
          />
          <button disabled={submitting} className={submitClass}>
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <>
              <AuthField
                label="Full name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name" autoComplete="name" maxLength={100} disabled={submitting}
              />
              <AuthField
                label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_rivera" autoComplete="username" disabled={submitting}
                minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]{3,30}"
                help="Your public marketplace name. Use 3-30 letters, digits or underscores."
              />
              <label className="block text-sm font-medium text-[var(--market-ink)]">
                Account type
              <select
                aria-label="Account type"
                disabled={submitting}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={authInputClass}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
              </label>
            </>
          )}
          <AuthField
            label="Email" type="email" autoComplete="email" disabled={submitting}
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          />
          <AuthField
            label="Password" type="password" disabled={submitting}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 6 : undefined}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            help={mode === 'register' ? 'Use at least 6 characters.' : undefined}
          />
          <button disabled={submitting} className={submitClass}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
      )}

      {!needs2FA && (
        <button
          disabled={submitting}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setInfo('');
          }}
          className="mt-6 min-h-11 w-full border-t border-[var(--market-border)] pt-5 text-center text-sm font-medium text-[var(--market-primary)] hover:underline focus-visible:outline-[var(--market-primary)] disabled:opacity-50"
        >
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      )}
      </section>
    </div>
  );
}
