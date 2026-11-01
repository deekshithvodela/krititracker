import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const AccessDenied: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 sm:px-10 rounded-2xl shadow-card border border-slate-200/80 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Access Restricted
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your email is not whitelisted. Access to KRITI Tracker (Kakatiya Research Initiative for Transformative Innovation) is strictly restricted to pre-authorized committee members, leads, and administrators.
            </p>
          </div>

          {user && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Attempted Identity:
              </span>
              <p className="font-semibold text-slate-800 break-all">{user.email}</p>
              <p className="text-[11px] text-slate-500">
                Assigned Scope: {user.role} ({user.teamId})
              </p>
            </div>
          )}

          <div className="text-xs text-slate-500 bg-amber-50/70 border border-amber-200/60 p-4 rounded-xl text-left space-y-1.5">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Mandatory Email Whitelist Policy</span>
            </div>
            <p className="text-amber-800 leading-normal">
              Only whitelisted emails are allowed access. Unregistered emails cannot sign in. Public self-registration is strictly disabled.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSwitchAccount}
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign in with another Google Account</span>
            </Button>

            {user && (
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate(user.role === 'admin' ? '/admin' : `/teams/${user.teamId}`)}
                className="w-full"
              >
                Return to My Authorized Workspace
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need access? Please contact the Medical Organizing Committee to whitelist your email address in the Master Registry.
        </p>
      </div>
    </div>
  );
};
