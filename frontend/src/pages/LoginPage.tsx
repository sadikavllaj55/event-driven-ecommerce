import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import { AxiosError } from 'axios';
import { getErrorMessage } from '../utils/errors';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

    try {
      if (mode === 'register') {
        await api.post('/register', { email, password, name, role });
        setInfo(
          'Registered! Check the notification-service logs for your verification link, then log in.',
        );
        setMode('login');
        return;
      }

      // Login
      const res = await api.post('/login', { email, password });
      login(res.data.token);
      navigate(ROUTES.home);
    } catch (err) {
      // 428 = 2FA required
      if (err instanceof AxiosError && err.response?.status === 428) {
        setNeeds2FA(true);
        setInfo('Enter your 2FA code from your authenticator app.');
        return;
      }
      setError(getErrorMessage(err));
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/login/2fa', { email, code });
      login(res.data.token);
      navigate('/');
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

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {info && <p className="text-teal-600 text-sm mb-3">{info}</p>}

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
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <select
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button className="w-full bg-teal-600 text-white py-2 rounded font-medium hover:bg-teal-700">
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
      )}

      {!needs2FA && (
        <button
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
