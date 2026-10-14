import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import { AxiosError } from 'axios';
import { getErrorMessage } from '../utils/errors';
import { loginResponseSchema } from '../api/schemas';

type Mode = 'login' | 'register';

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
    try {
      const res = await api.post('/login/2fa', { email, code });
      login(loginResponseSchema.parse(res.data).token);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid code'));
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white p-6 rounded-lg shadow-sm">
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        {needs2FA
          ? 'Two-factor authentication'
          : mode === 'login'
            ? 'Log in'
            : 'Sign up'}
      </h1>

      {error && <p role="alert" className="text-red-500 text-sm mb-3">{error}</p>}
      {info && <p role="status" className="text-teal-600 text-sm mb-3">{info}</p>}

      {needs2FA ? (
        <form onSubmit={handle2FA} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button className="w-full bg-teal-600 text-white py-2 rounded font-medium hover:bg-teal-700">
            Verify
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <label className="block text-sm font-medium text-[var(--market-ink)]">
                Full name
                <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                required
                maxLength={100}
                disabled={submitting}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              </label>
              <label className="block text-sm font-medium text-[var(--market-ink)]">
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex_rivera"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]{3,30}"
                  aria-describedby="signup-username-help"
                  disabled={submitting}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>
              <p id="signup-username-help" className="text-xs text-gray-500">
                Your public marketplace name. Use 3-30 letters, digits or underscores.
              </p>
              <select
                aria-label="Account type"
                disabled={submitting}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </>
          )}
          <input
            type="email"
            aria-label="Email"
            autoComplete="email"
            required
            disabled={submitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="password"
            aria-label="Password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'register' ? 6 : undefined}
            disabled={submitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button disabled={submitting} className="w-full bg-teal-600 text-white py-2 rounded font-medium hover:bg-teal-700 disabled:opacity-50">
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
          className="mt-4 text-sm text-teal-600 hover:underline"
        >
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      )}
    </div>
  );
}
