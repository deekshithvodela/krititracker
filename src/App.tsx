import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ConfigProvider } from './hooks/useConfig';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminControlCentre } from './pages/AdminControlCentre';
import { TeamDashboard } from './pages/TeamDashboard';
import { UserManagement } from './pages/UserManagement';
import { AccessDenied } from './pages/AccessDenied';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { NotFound } from './pages/NotFound';

const RootRedirect: React.FC = () => {
  const { user, isLoading, isAdmin, assignedTeamId } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (assignedTeamId) {
    return <Navigate to={`/teams/${assignedTeamId}`} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ConfigProvider>
          <Routes>
            {/* Public Auth & Legal Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />

            {/* Root Landing Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Super Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppShell>
                    <AdminDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/control-centre"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppShell>
                    <AdminControlCentre />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppShell>
                    <UserManagement />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Team Head / Individual Team Protected Route */}
            <Route
              path="/teams/:teamId"
              element={
                <ProtectedRoute requiresTeamMatch>
                  <AppShell>
                    <TeamDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
