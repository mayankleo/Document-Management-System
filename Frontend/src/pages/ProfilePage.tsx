import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store';
import { useEffect, useState, useMemo } from 'react';
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
  const [showToken, setShowToken] = useState(false);

  // Always run hooks before any conditional return
  useEffect(() => { if (token) setDecoded(decodeJwt(token)); }, [token]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const claimEntries = useMemo(() => Object.entries(decoded || {}).filter(([k]) => !['exp','iat'].includes(k)), [decoded]);

  if (!token || !user) {
    return <div className="max-w-xl mx-auto p-6"><h1 className="text-2xl font-semibold mb-2">Profile</h1><p className="text-red-600">Not authenticated.</p></div>;
  }

  const expDate = decoded?.exp ? new Date(decoded.exp * 1000) : null;
  const iatDate = decoded?.iat ? new Date(decoded.iat * 1000) : null;
  const totalWindow = expDate && iatDate ? expDate.getTime() - iatDate.getTime() : null;
  const elapsed = expDate && iatDate ? now - iatDate.getTime() : null;
  const remainingMs = expDate ? Math.max(0, expDate.getTime() - now) : 0;
  const remainingMin = expDate ? Math.floor(remainingMs / 60000) : null;
  const remainingSec = expDate ? Math.floor((remainingMs % 60000) / 1000) : null;
  const pct = totalWindow && elapsed ? Math.min(100, Math.max(0, (elapsed / totalWindow) * 100)) : 0;

  const copyToken = async () => {
    try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {/* ignore */}
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-semibold shadow">
            { (user.username || user.mobile).slice(0,1).toUpperCase() }
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{user.username || user.mobile}</h1>
            <p className="text-sm text-gray-600">{user.isAdmin ? 'Administrator' : 'Standard User'} • Session overview</p>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-lg border shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Session</h2>
        <div className="space-y-5 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                {iatDate && <span>Issued: {iatDate.toLocaleString()}</span>}
                {expDate && <span>Expires: {expDate.toLocaleString()}</span>}
              </div>
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div className={`h-full transition-all ${pct < 70 ? 'bg-green-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
              </div>
              {remainingMin && <div className="text-xs text-gray-600">Remaining: { Math.trunc(remainingMin/60)}h {remainingMin%60}m {remainingSec}s</div>}
            </div>
          
          {!expDate && <p className="text-gray-500">No exp claim found in token.</p>}
          <div className="flex gap-2 flex-wrap">
            <button onClick={copyToken} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">{copied ? 'Copied!' : 'Copy JWT'}</button>
            <button onClick={() => setShowToken(s => !s)} className="px-3 py-1 rounded border text-xs">{showToken ? 'Hide Token' : 'Show Token'}</button>
          </div>
          {showToken && (
            <div className="mt-2 bg-gray-900 text-gray-100 p-3 rounded text-[11px] font-mono break-all">
              {token}
            </div>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">User Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="User ID" value={user.id} />
            <Detail label="Username" value={user.username || '—'} />
            <Detail label="Mobile" value={user.mobile} />
            <Detail label="Role" value={user.isAdmin ? 'Admin' : 'User'} />
          </div>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Token Claims</h2>
          {claimEntries.length === 0 && <p className="text-xs text-gray-500">No custom claims.</p>}
          {claimEntries.length > 0 && (
            <ul className="text-[11px] font-mono space-y-1 max-h-40 overflow-auto">
              {claimEntries.map(([k,v]) => <li key={k}><span className="text-indigo-600">{k}</span>: {JSON.stringify(v)}</li>)}
            </ul>
          )}
          <details className="bg-gray-50 rounded p-3 text-[11px]">
            <summary className="cursor-pointer font-medium text-gray-700">Raw Decoded</summary>
            <pre className="mt-2 max-h-60 overflow-auto leading-tight">{JSON.stringify(decoded, null, 2)}</pre>
          </details>
        </div>
      </section>

      <section className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Actions</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <button onClick={() => { setAuthToken(''); dispatch(logout()); }} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Logout</button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded border">Force Refresh</button>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 break-all text-sm">{String(value)}</span>
    </div>
  );
}
