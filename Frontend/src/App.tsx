import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import AppLayout from './components/AppLayout';
import ProfilePage from './pages/ProfilePage';

import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}> 
          <Route element={<AppLayout />}> 
            <Route path="/" element={<HomePage />} />
            <Route path="/documents" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<AdminRoute />}> 
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;