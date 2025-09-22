import { useState } from 'react';
import { createAdminUser } from '../api/adminApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const AdminPage = () => {
  const token = useSelector((s: RootState) => s.auth.token); // token already set in interceptor via setAuthToken on login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string>('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult('');
    if (!username.trim() || !password) {
      setError('Username and Password required');
      return;
    }
    setLoading(true);
    try {
      const res = await createAdminUser({ username: username.trim(), password });
      setResult(`Created user id=${res.id} username=${res.username}`);
      setUsername('');
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  if (!token) {
  return <div className="max-w-lg mx-auto p-6"><h1 className="text-xl font-semibold mb-2">Admin - Create User</h1><p className="text-red-600">Not authenticated.</p></div>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin - Create User</h1>
      <form onSubmit={submit} className="space-y-4 bg-white/5 border border-gray-200 rounded p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Username</label>
          <input className="border rounded px-2 py-1" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Password</label>
          <input className="border rounded px-2 py-1" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" disabled={loading} type="submit">{loading ? 'Creating...' : 'Create User'}</button>
          <button type="reset" className="px-3 py-1 rounded border" onClick={() => { setUsername(''); setPassword(''); }} disabled={loading}>Reset</button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-700">{result}</p>}
      </form>
    </div>
  );
};

export default AdminPage;