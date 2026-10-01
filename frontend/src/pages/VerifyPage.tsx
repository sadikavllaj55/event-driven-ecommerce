import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function VerifyPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .get('/verify', { params: { token } })
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [params]);

  return (
    <div className="max-w-sm mx-auto mt-16 bg-white p-8 rounded-lg shadow-sm text-center">
      {status === 'loading' && <p className="text-gray-500">Verifying…</p>}
      {status === 'ok' && (
        <>
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
          <p className="text-gray-600 mt-2">Your account is ready.</p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-teal-600 text-white px-6 py-2 rounded-full font-medium hover:bg-teal-700"
          >
            Log in
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-5xl mb-3">❌</div>
          <h1 className="text-xl font-bold text-gray-900">
            Verification failed
          </h1>
          <p className="text-gray-600 mt-2">
            The link may be invalid or expired.
          </p>
        </>
      )}
    </div>
  );
}
