import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import type { RootState } from '../store';
import { logout } from '../store';

export default function Navbar() {
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const linkBase = 'px-3 py-2 text-sm font-medium rounded-md transition-colors';
  const active = 'bg-indigo-600 text-white';
  const inactive = 'text-gray-700 hover:bg-indigo-100';

  const links = (
    <>
      <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Home</NavLink>
      <NavLink to="/documents" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Documents</NavLink>
      <NavLink to="/profile" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Profile</NavLink>
      {user?.isAdmin && (
        <NavLink to="/upload" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Upload</NavLink>
      )}
      {user?.isAdmin && (
        <NavLink to="/create-admin" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Create Admin</NavLink>
      )}
    </>
  );

  return (
    <nav className="bg-white border-b shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle navigation"
              onClick={() => setOpen(o => !o)}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <span className="text-lg font-semibold text-indigo-700 tracking-wide select-none">DMS</span>
            <div className="hidden sm:flex items-center gap-2">
              {links}
            </div>
          </div>
          <div className="hidden sm:flex gap-3 items-center">
            {user && (
              <span className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded border whitespace-nowrap">
                {user.username || user.mobile} {user.isAdmin ? <strong>(Admin)</strong> : <strong>(User)</strong> }
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded transition"
            >Logout</button>
          </div>
          <div className="sm:hidden flex items-center">
            {user && (
              <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded border mr-2 max-w-[90px] truncate">
                {user.username || user.mobile}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Mobile panel */}
      {open && (
        <div className="sm:hidden border-t bg-white shadow-inner animate-fade-in px-4 pb-4 space-y-3">
          <div className="flex flex-col gap-1 pt-3">
            {links}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded transition"
            >Logout</button>
            {user && (
              <span className="text-[11px] text-gray-600">{user.isAdmin ? 'Admin' : 'User'}</span>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
