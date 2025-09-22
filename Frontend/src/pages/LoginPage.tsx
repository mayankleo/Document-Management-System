import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { requestOtp, validateOtpRaw } from '../api/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store';
import type { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../api/http';
import { getMinorHeads } from '../api/headsApi';
import type { MinorHead } from '../models';

const RESEND_COOLDOWN = 30; // seconds

type Step = 'mobile' | 'otp' | 'details';

const steps: { key: Step; label: string }[] = [
  { key: 'mobile', label: 'Mobile' },
  { key: 'otp', label: 'OTP' },
  { key: 'details', label: 'Details (If New User)' }
];

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const existingToken = useSelector((s: RootState) => s.auth.token);

  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<MinorHead[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [serverOtp, setServerOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const id = setTimeout(() => setResendTimer(t => t - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [resendTimer]);

  // Redirect if already logged in
  if (existingToken) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen gap-8 p-6'>
        <h1 className='text-2xl font-semibold'>Already Logged In</h1>
        <button className='px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded transition' onClick={() => navigate('/')}>Go to Home</button>
      </div>
    );
  }

  const validMobile = mobile.trim().length >= 8; // simplistic check
  const validOtp = otp.trim().length > 0;
  const detailsValid = username.trim().length >= 3 && password.length >= 6 && !!department;

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validMobile) { setError('Enter a valid mobile'); return; }
    setLoading(true);
    try {
      const res = await requestOtp(mobile.trim());
      if (res.otp) setServerOtp(res.otp);
      setStep('otp');
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      const res = await requestOtp(mobile.trim());
      if (res.otp) setServerOtp(res.otp);
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) { setError((err as Error).message); }
  };

  const handleValidateOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (step === 'otp' && (!validMobile || !validOtp)) { setError('Mobile & OTP required'); return; }
    if (step === 'details' && !detailsValid) { setError('Fill all required fields'); return; }
    setLoading(true);
    try {
      const { status, data } = await validateOtpRaw({
        mobile: mobile.trim(),
        otp: otp.trim(),
        username: step === 'details' ? username.trim() || undefined : undefined,
        password: step === 'details' ? password || undefined : undefined,
        department: step === 'details' ? (department ? Number(department) : undefined) : undefined,
      });

      if (status === 401) { setError('Invalid OTP'); return; }
      if (status === 400) { setError('Validation error (check password length / username)'); return; }
      if (status === 206) {
        setDeptLoading(true);
        try { const list = await getMinorHeads(2); setDepartments(list); } catch {/* ignore */} finally { setDeptLoading(false); }
        setStep('details'); return; }
      if (status === 200 && data) {
        const token = data.token;
        setAuthToken(token);
        dispatch(setCredentials({ token, user: { id: data.id, username: data.username, mobile: data.mobile, isAdmin: data.isAdmin }}));
        navigate('/');
        return;
      }
      setError('Unexpected response');
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Login and Register <br /> With Your Mobile Number</h1>
          <p className="text-sm text-gray-600">Secure OTP sign-in. Fast and passwordless.</p>
        </div>

        <StepIndicator current={step} />

        {step === 'mobile' && (
          <>
            <form onSubmit={handleRequestOtp} className="bg-white border rounded-lg shadow-sm p-6 space-y-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Mobile <span className="text-red-600">*</span></label>
                <input className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!validMobile && mobile ? 'border-red-500' : 'border-gray-300'}`} value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Enter mobile number" />
              </div>
              <button className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50" type="submit" disabled={loading || !validMobile}>{loading ? 'Requesting...' : 'Request OTP'}</button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
            
            <TestAccountsSection onSelectMobile={(mobile) => setMobile(mobile)} />
          </>
        )}

        {step === 'otp' && (
          <form onSubmit={handleValidateOtp} className="bg-white border rounded-lg shadow-sm p-6 space-y-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Mobile</label>
              <input className="border rounded px-3 py-2 text-sm border-gray-300" value={mobile} onChange={e => setMobile(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-600 flex items-center gap-2">OTP {serverOtp && <span className="text-[10px] font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded">OTP: {serverOtp}</span>}</label>
              <input className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!validOtp && otp ? 'border-red-500' : 'border-gray-300'}`} value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => { setStep('mobile'); setOtp(''); }} className="text-gray-600 hover:underline">Change mobile</button>
              <button type="button" onClick={resendOtp} disabled={resendTimer > 0} className="text-indigo-600 disabled:text-gray-400 hover:underline">
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
            <button className="w-full px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50" type="submit" disabled={loading || !validOtp}>{loading ? 'Validating...' : 'Validate OTP'}</button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleValidateOtp} className="bg-white border rounded-lg shadow-sm p-6 space-y-5">
            <p className="text-xs text-gray-600">New user detected. Complete your profile to continue.</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Username <span className="text-red-600">*</span></label>
              <input className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${username && username.trim().length < 3 ? 'border-red-500' : 'border-gray-300'}`} value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Password <span className="text-red-600">*</span></label>
              <div className={`flex items-stretch rounded border ${password && password.length < 6 ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-indigo-400`}> 
                <input type={showPass ? 'text' : 'password'} className="flex-1 px-3 py-2 text-sm outline-none rounded-l" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPass(p => !p)} className="px-3 text-xs font-medium text-indigo-600 hover:text-indigo-800">{showPass ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-600">Department <span className="text-red-600">*</span></label>
              <select className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${department === '' ? 'border-gray-300' : 'border-indigo-300'}`} value={department} onChange={e => setDepartment(e.target.value)} disabled={deptLoading}>
                <option value="">{deptLoading ? 'Loading...' : 'Select department'}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setStep('otp')} className="text-gray-600 hover:underline">Back to OTP</button>
            </div>
            <button className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50" type="submit" disabled={loading || !detailsValid}>{loading ? 'Submitting...' : 'Submit & Continue'}</button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        <footer className="text-center text-[11px] text-gray-500 pt-4">
          &copy; {new Date().getFullYear()} Document Management System
        </footer>
      </div>
    </div>
  );
};

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center justify-center gap-4 text-[11px] font-medium">
      {steps.map((s, idx) => {
        const active = s.key === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>{idx+1}</span>
            <span className={active ? 'text-indigo-700' : 'text-gray-500'}>{s.label}</span>
            {idx < steps.length -1 && <span className="w-6 h-px bg-gray-300" />}
          </li>
        );
      })}
    </ol>
  );
}

function TestAccountsSection({ onSelectMobile }: { onSelectMobile: (mobile: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const testAccounts = [
    { type: 'Admin', username: 'admin', password: 'admin', mobile: '9993339996' },
    { type: 'User', username: 'john', password: 'john', mobile: '1234567890' },
    { type: 'User', username: 'tom', password: 'tom', mobile: '5554445555' },
    { type: 'User', username: 'emily', password: 'emily', mobile: '9996669999' },
  ];

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <button 
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">Accounts</span>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">For Testing purposes</span>
        </div>
        <span className="text-amber-600 text-sm">{isExpanded ? 'Hide' : 'Show'}</span>
      </button>
      
      {isExpanded && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 mb-3">These are registered accounts you can also create new one</p>
          <div className="grid gap-2">
            {testAccounts.map((account, index) => (
              <div key={index} className="bg-white border border-amber-200 rounded p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    account.type === 'Admin' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {account.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectMobile(account.mobile)}
                    className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded transition"
                  >
                    Use This Account
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Username:</span>
                    <div className="font-mono font-medium">{account.username}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Mobile:</span>
                    <div className="font-mono font-medium cursor-pointer hover:text-indigo-600" onClick={() => onSelectMobile(account.mobile)}>
                      {account.mobile}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;