import { useState } from 'react';
import type { FormEvent } from 'react';
import { requestOtp, validateOtpRaw } from '../api/authApi';
// import type { ValidateOtpResponse } from '../models';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../api/http';
import { getMinorHeads } from '../api/headsApi';
import type { MinorHead } from '../models';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const existingToken = useSelector((s: RootState) => s.auth.token);

  const [step, setStep] = useState<'mobile' | 'otp' | 'details'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<MinorHead[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [serverOtp, setServerOtp] = useState<string | null>(null); // for dev display if backend returns
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in redirect
  if (existingToken) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen gap-8'>
        <h1 className='text-2xl font-semibold'>Already Logged In</h1>
        <button className='px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition' onClick={() => navigate('/')}>Go to Home</button>
      </div>
    );
  }

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mobile.trim()) { setError('Mobile required'); return; }
    setLoading(true);
    try {
      const res = await requestOtp(mobile.trim());
      if (res.otp) setServerOtp(res.otp);
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  const handleValidateOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mobile.trim() || !otp.trim()) { setError('Mobile and OTP required'); return; }
    setLoading(true);
    try {
  const { status, data } = await validateOtpRaw({
        mobile: mobile.trim(),
        otp: otp.trim(),
        // Only send extra fields if we are in details step
        username: step === 'details' ? (username.trim() || undefined) : undefined,
        password: step === 'details' ? (password || undefined) : undefined,
        department: step === 'details' ? (department ? Number(department) : undefined) : undefined,
      });

      if (status === 401) {
        setError('Invalid OTP');
        return;
      }
      if (status === 400) {
        setError('Validation error (check password length / username)');
        return;
      }
      if (status === 206) {
        // OTP valid but user is new. Fetch departments (using major head id 2) then show details form.
        setDeptLoading(true);
        try {
          const list = await getMinorHeads(2);
          setDepartments(list);
        } catch { /* ignore */ }
        finally { setDeptLoading(false); }
        setStep('details');
        return;
      }
      if (status === 200 && data) {
        const token = data.token;
        setAuthToken(token);
        dispatch(setCredentials({ token, user: {
          id: data.id,
          username: data.username,
          mobile: data.mobile,
          isAdmin: data.isAdmin,
        }}));
        navigate('/');
        return;
      }
      setError('Unexpected response');
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 flex flex-col justify-center min-h-screen">
      <h1 className="text-2xl font-semibold">Login (OTP)</h1>
      {step === 'mobile' && (
        <form onSubmit={handleRequestOtp} className="space-y-4 bg-white/5 rounded border border-gray-200 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mobile</label>
            <input className="border rounded px-2 py-1" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Enter mobile" />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" type="submit" disabled={loading}>{loading ? 'Requesting...' : 'Request OTP'}</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
      {step === 'otp' && (
        <form onSubmit={handleValidateOtp} className="space-y-4 bg-white/5 rounded border border-gray-200 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mobile</label>
            <input className="border rounded px-2 py-1" value={mobile} onChange={e => setMobile(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium flex items-center gap-2">OTP {serverOtp && <span className="text-xs text-green-500">(Your OTP: {serverOtp})</span>}</label> 
            <input className="border rounded px-2 py-1" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-1 rounded bg-green-600 text-white disabled:opacity-50" type="submit" disabled={loading}>{loading ? 'Validating...' : 'Validate OTP'}</button>
            <button className="px-3 py-1 rounded border" type="button" onClick={() => { setStep('mobile'); setOtp(''); }} disabled={loading}>Back</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
      {step === 'details' && (
        <form onSubmit={handleValidateOtp} className="space-y-4 bg-white/5 rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-700">Complete your profile to finish setup.</p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Username</label>
            <input className="border rounded px-2 py-1" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Password</label>
            <input className="border rounded px-2 py-1" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Department</label>
            <select className="border rounded px-2 py-1" value={department} onChange={e => setDepartment(e.target.value)} disabled={deptLoading} required>
              <option value="">{deptLoading ? 'Loading...' : 'Select department'}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-1 rounded bg-indigo-600 text-white disabled:opacity-50" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit & Continue'}</button>
            <button className="px-3 py-1 rounded border" type="button" onClick={() => { setStep('otp'); }} disabled={loading}>Back</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
};

export default LoginPage;