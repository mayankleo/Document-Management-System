import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store';

export default function Navbar() {
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const linkBase = 'px-3 py-2 text-sm font-medium rounded-md transition-colors';
  const active = 'bg-indigo-600 text-white';
  const inactive = 'text-gray-700 hover:bg-indigo-100';

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-indigo-700 tracking-wide select-none">DMS</span>
            <div className="flex items-center gap-2">
              <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Home</NavLink>
              <NavLink to="/documents" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Documents</NavLink>
              <NavLink to="/profile" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Profile</NavLink>
              {user?.isAdmin && (
                <NavLink to="/upload" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Upload</NavLink>
              )}
              {user?.isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>Admin</NavLink>
              )}
            </div>
          </div>
          <div className="flex gap-3 text-center">
            {user && (
              <span className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded border">
                {user.username || user.mobile} {user.isAdmin ? <strong>(Admin)</strong> : <strong>(User)</strong> }
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded transition"
            >Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
