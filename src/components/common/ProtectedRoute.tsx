import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiresTeamMatch?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiresTeamMatch,
}) => {
  const { user, isLoading, isAdmin, assignedTeamId } = useAuth();
  const { teamId } = useParams<{ teamId: string }>();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin required
  if (requiredRole === 'admin' && !isAdmin) {
    if (assignedTeamId) {
      return <Navigate to={`/teams/${assignedTeamId}`} replace />;
    }
    return <Navigate to="/access-denied" replace />;
  }

  // Team route isolation: Team heads/viewers can only access their assigned team
  if (requiresTeamMatch && !isAdmin && teamId) {
    if (assignedTeamId !== teamId) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <>{children}</>;
};
