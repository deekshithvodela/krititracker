import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ShieldCheck, CheckSquare, Layers, Lock, AlertCircle, ArrowRight, Sparkles, FlaskConical, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { MitLicenseModal } from '../components/legal/MitLicenseModal';
import { PrivacyPolicyModal } from '../components/legal/PrivacyPolicyModal';

export const Login: React.FC = () => {
  const { login, loginWithDevPersona, isDevMode } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMitModalOpen, setIsMitModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-google-client-id.apps.googleusercontent.com';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError('Google Sign-In did not return valid credentials.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await login(credentialResponse.credential);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Access Denied: Your account is not authorized.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevPersonaLogin = async (personaKey: string, targetPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithDevPersona(personaKey);
      navigate(targetPath);
    } catch (err: any) {
      setError(err.message || 'Dev login bypass failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-bold shadow-hover">
            K
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            KRITI MedEvent Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Medical Congress & Healthcare Event Operations System
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-card border border-slate-200/80 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Authorization Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-900">Sign in to your account</h2>
              <p className="text-xs text-slate-500">
                Use your whitelisted institutional email to access your assigned medical committee.
              </p>
            </div>

            {/* Google Sign In Component */}
            <div className="flex flex-col items-center justify-center pt-2">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In encountered an error.')}
                useOneTap={false}
                shape="rectangular"
                theme="outline"
                size="large"
                text="signin_with"
                width="320"
              />
            </div>

            {/* 🧪 QA Testing Auth Bypass (Dev & Local Test Sandbox Only) */}
            {isDevMode && (
              <div className="pt-6 border-t-2 border-dashed border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold uppercase tracking-wider">
                    <FlaskConical className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>🧪 QA Testing Auth Bypass</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                    Zero-Leak Dev Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Instant 1-click persona switching for local testing & RBAC verification without requiring live Google OAuth credentials:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('admin', '/admin')}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                      <span>👑 Congress Director</span>
                    </div>
                    <p className="text-[10px] text-amber-700/80 truncate mt-0.5">All 12 medical committees & Control Centre</p>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('team_head_eng', '/teams/team-scientific')}
                    className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                      <span>🩺 Scientific Head</span>
                    </div>
                    <p className="text-[10px] text-indigo-700/80 truncate mt-0.5">Team 01 Scientific abstracts & review</p>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('team_head_ops', '/teams/team-cme-workshops')}
                    className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-950">
                      <span>💉 CME Workshops</span>
                    </div>
                    <p className="text-[10px] text-cyan-700/80 truncate mt-0.5">Team 02 Clinical training & credits</p>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('viewer', '/admin')}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <span>👁️ Ethics Auditor</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">Medical compliance & ethics observer</p>
                  </button>
                </div>
              </div>
            )}

            {/* Security badges */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3 text-center text-xs text-slate-500">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">Strict Whitelist</span>
                <span className="text-[10px] text-slate-400">Pre-authorized emails only</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center gap-1">
                <Lock className="w-4 h-4 text-primary-600" />
                <span className="font-semibold text-slate-700">Google Sheets DB</span>
                <span className="text-[10px] text-slate-400">13 Secure sheets</span>
              </div>
            </div>
          </div>

          {/* Whitelisted Email Access Notice */}
          <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Only whitelisted emails are allowed access.</p>
            <p className="text-slate-500">Unregistered emails cannot sign in. Please contact an Administrator to whitelist your email address.</p>
          </div>

          {/* Copyright & MIT License Modal Trigger Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-500">
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
              className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2 hover:bg-primary-50 px-2 py-0.5 rounded transition-all"
            >
              MIT License
            </button>
            <span className="hidden sm:inline text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2 hover:bg-primary-50 px-2 py-0.5 rounded transition-all"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* Legal Modals */}
        <MitLicenseModal isOpen={isMitModalOpen} onClose={() => setIsMitModalOpen(false)} />
        <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      </div>
    </GoogleOAuthProvider>
  );
};
