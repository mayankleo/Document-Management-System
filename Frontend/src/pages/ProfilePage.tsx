import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store';
import { useEffect, useState } from 'react';
import { setAuthToken } from '../api/http';

interface DecodedToken { exp?: number; iat?: number; [k: string]: unknown; }

function decodeJwt(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch { return null; }
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const token = useSelector((s: RootState) => s.auth.token);
  const user = useSelector((s: RootState) => s.auth.user);
  const [decoded, setDecoded] = useState<DecodedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (token) setDecoded(decodeJwt(token));
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  if (!token || !user) {
    return <div className="max-w-xl mx-auto p-6"><h1 className="text-2xl font-semibold mb-2">Profile</h1><p className="text-red-600">Not authenticated.</p></div>;
  }

  const expDate = decoded?.exp ? new Date(decoded.exp * 1000) : null;
  const iatDate = decoded?.iat ? new Date(decoded.iat * 1000) : null;
  const remainingMs = expDate ? Math.max(0, expDate.getTime() - now) : 0;
  const remainingMin = expDate ? Math.floor(remainingMs / 60000) : null;
  const remainingSec = expDate ? Math.floor((remainingMs % 60000) / 1000) : null;

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile & Session</h1>
        <p className="text-gray-600 text-sm">View your account details and current session information.</p>
      </div>

      <section className="bg-white rounded border p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">User Details</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Detail label="User ID" value={user.id} />
          <Detail label="Username" value={user.username || '—'} />
          <Detail label="Mobile" value={user.mobile} />
          <Detail label="Role" value={user.isAdmin ? 'Admin' : 'User'} />
        </div>
      </section>

      <section className="bg-white rounded border p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Session</h2>
        <div className="text-sm space-y-2">
          {iatDate && <p>Issued at: <span className="font-mono">{iatDate.toLocaleString()}</span></p>}
          {expDate && (
            <p>Expires at: <span className="font-mono">{expDate.toLocaleString()}</span>{' '}
              ({remainingMin}m {remainingSec}s remaining)
            </p>
          )}
          {!expDate && <p className="text-gray-500">No exp claim found in token.</p>}
          <div className="flex flex-col gap-2">
            <button onClick={copyToken} className="self-start px-3 py-1 rounded bg-indigo-600 text-white text-xs disabled:opacity-50">{copied ? 'Copied!' : 'Copy JWT'}</button>
            <details className="bg-gray-50 rounded p-3">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">Decoded Claims</summary>
              <pre className="mt-2 max-h-64 overflow-auto text-[11px] leading-tight bg-gray-100 p-2 rounded">{JSON.stringify(decoded, null, 2)}</pre>
            </details>
          </div>
        </div>
      </section>

      <section className="bg-white rounded border p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => { setAuthToken(''); dispatch(logout()); }}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
          >Logout</button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >Force Refresh</button>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 break-all">{String(value)}</span>
    </div>
  );
}
