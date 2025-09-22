import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export default function AdminRoute() {
  const isAdmin = useSelector((state: RootState) => state.auth?.user?.isAdmin);
  const token = useSelector((state: RootState) => state.auth?.token);
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/search" replace />;
  return <Outlet />;
}
