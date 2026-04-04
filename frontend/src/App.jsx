import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Login          from './pages/Login';
import Register       from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import Dashboard      from './pages/Dashboard';
import SubmitRequest  from './pages/SubmitRequest';
import MyRequests     from './pages/MyRequests';
import RequestDetail  from './pages/RequestDetail';
import ReviewQueue    from './pages/ReviewQueue';
import AdminPanel     from './pages/AdminPanel';
import VerifyQR       from './pages/VerifyQR';
import Layout         from './components/Layout/Layout';

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="animate-spin h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>

            {/* ── Public routes (no auth, no layout) ── */}
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* ── Public QR verify (no auth required — professors scan this) ── */}
            <Route path="/verify/:requestId" element={<VerifyQR />} />

            {/* ── Protected routes (inside Layout with sidebar) ── */}
            <Route path="/" element={
              <ProtectedRoute><Layout /></ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />

              <Route path="dashboard" element={<Dashboard />} />

              <Route path="submit" element={
                <ProtectedRoute roles={['student']}>
                  <SubmitRequest />
                </ProtectedRoute>
              } />

              <Route path="requests" element={
                <ProtectedRoute>
                  <MyRequests />
                </ProtectedRoute>
              } />

              <Route path="requests/new" element={
                <ProtectedRoute roles={['student']}>
                  <SubmitRequest />
                </ProtectedRoute>
              } />

              <Route path="requests/:id" element={
                <ProtectedRoute>
                  <RequestDetail />
                </ProtectedRoute>
              } />

              <Route path="review" element={
                <ProtectedRoute roles={['health_officer', 'admin']}>
                  <ReviewQueue />
                </ProtectedRoute>
              } />

              <Route path="admin" element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              } />
            </Route>

            {/* ── Catch-all ── */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;