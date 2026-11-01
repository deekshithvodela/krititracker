import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Lock, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { MitLicenseModal } from '../components/legal/MitLicenseModal';
import { PrivacyPolicyModal } from '../components/legal/PrivacyPolicyModal';

export const AccessDenied: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMitModalOpen, setIsMitModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

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
              Your email is not whitelisted. Access to the KRITI MedEvent Congress Management System is strictly restricted to pre-authorized medical committee members, faculty, and administrators.
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

        {/* Footer with Copyright and Legal Modal triggers */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-500">
          <div>
            <span>Copyright © 2026 </span>
            <a
              href="https://www.linkedin.com/in/deekshithvodela/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-700 hover:text-primary-800 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
            >
              <span>Deekshith Vodela</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          </div>
          <span className="hidden sm:inline text-slate-300">•</span>
          <button
            type="button"
            onClick={() => setIsMitModalOpen(true)}
            className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2 px-1.5 py-0.5 rounded hover:bg-primary-50 transition-all"
          >
            MIT License
          </button>
          <span className="hidden sm:inline text-slate-300">•</span>
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2 px-1.5 py-0.5 rounded hover:bg-primary-50 transition-all"
          >
            Privacy Policy
          </button>
        </div>

        <MitLicenseModal isOpen={isMitModalOpen} onClose={() => setIsMitModalOpen(false)} />
        <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      </div>
    </div>
  );
};
