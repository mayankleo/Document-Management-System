import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

// Temporary auth selector placeholder; will be replaced once auth slice exists.
export default function ProtectedRoute() {
  const token = useSelector((state: RootState) => state.auth?.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
