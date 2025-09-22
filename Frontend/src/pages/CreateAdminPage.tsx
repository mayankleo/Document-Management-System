import { useState } from 'react';
import { createAdminUser } from '../api/adminApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const MIN_PASS_LEN = 6;

const CreateAdminPage = () => {
  const token = useSelector((s: RootState) => s.auth.token);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string>('');

  const usernameValid = username.trim().length >= 3;
  const passwordValid = password.length >= MIN_PASS_LEN;
  const formValid = usernameValid && passwordValid && !loading;


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult('');
    if (!formValid) { setError('Please fix validation errors'); return; }
    setLoading(true);
    try {
      const res = await createAdminUser({ username: username.trim(), password });
      setResult(`Created admin user (id=${res.id})`);
      setUsername(''); setPassword(''); setShowPass(false);
    } catch (err) {
      setError((err as Error).message || 'Creation failed');
    } finally { setLoading(false); }
  };

  if (!token) {
    return <div className="max-w-md mx-auto p-6"><p className="text-red-600">Not authorized.</p></div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Create Admin User</h1>
        <p className="text-sm text-gray-600 mt-1">Provision a new administrator account.</p>
      </header>

      <form onSubmit={submit} className="bg-white rounded-lg border shadow-sm p-6 space-y-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Username <span className="text-red-600">*</span></label>
          <input
            className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!usernameValid && username ? 'border-red-500' : 'border-gray-300'}`}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. johndoe"
            autoComplete="off"
          />
          {!usernameValid && username && <span className="text-xs text-red-600">Minimum 3 characters.</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Password <span className="text-red-600">*</span></label>
          <div className={`flex items-stretch rounded border ${!passwordValid && password ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-indigo-400 bg-white`}> 
            <input
              type={showPass ? 'text' : 'password'}
              className="flex-1 px-3 py-2 text-sm outline-none rounded-l"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Strong password"
            />
            <button type="button" onClick={() => setShowPass(p => !p)} className="px-3 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
          {!passwordValid && password && <span className="text-xs text-red-600">At least {MIN_PASS_LEN} characters.</span>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
            type="submit"
            disabled={!formValid}
          >{loading ? 'Creating...' : 'Create Admin'}</button>
          <button
            type="button"
            className="px-4 py-2 rounded border text-sm disabled:opacity-50"
            disabled={loading}
            onClick={() => { setUsername(''); setPassword(''); setError(''); setResult(''); }}
          >Reset</button>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        {result && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{result}</div>}
      </form>
      <Hints />
    </div>
  );
};

function Hints() {
  return (
    <aside className="text-xs text-gray-600 bg-white border rounded-lg shadow-sm p-4 space-y-2 max-w-md mx-auto">
      <h2 className="text-[11px] uppercase font-semibold tracking-wide text-gray-500">Guidelines</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Usernames should be unique and descriptive.</li>
        <li>Password: mix uppercase, numbers, symbols for higher strength.</li>
        <li>User created from here will have same permissions as the creator.</li>
      </ul>
    </aside>
  );
}

export default CreateAdminPage;