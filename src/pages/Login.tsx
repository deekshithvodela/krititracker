import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ShieldCheck, CheckSquare, Layers, Lock, AlertCircle, ArrowRight, Sparkles, FlaskConical, ExternalLink, Mail, CheckCircle2, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { MitLicenseModal } from '../components/legal/MitLicenseModal';
import { PrivacyPolicyModal } from '../components/legal/PrivacyPolicyModal';

export const Login: React.FC = () => {
  const { login, loginWithDevPersona, loginWithDevEmail, isDevMode } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devEmailInput, setDevEmailInput] = useState('');
  const [isMitModalOpen, setIsMitModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-google-client-id.apps.googleusercontent.com';

  const navigateByRole = (authUser: any) => {
    if (authUser.role === 'admin') {
      navigate('/admin');
    } else if (authUser.teamId && authUser.teamId !== 'all') {
      navigate(`/teams/${authUser.teamId}`);
    } else {
      navigate('/admin');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError('Google Sign-In did not return valid credentials.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const authUser = await login(credentialResponse.credential);
      navigateByRole(authUser);
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

  const handleDevEmailSubmit = async (e?: React.FormEvent, directEmail?: string) => {
    if (e) e.preventDefault();
    const emailToUse = (directEmail || devEmailInput).trim();
    if (!emailToUse) {
      setError('Please enter a dev email or select one of the presets below.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const authUser = await loginWithDevEmail(emailToUse);
      navigateByRole(authUser);
    } catch (err: any) {
      setError(err.message || 'Dev email sign-in failed.');
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
            KRITI Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Kakatiya Research Initiative for Transformative Innovation
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-card border border-slate-200/80 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Authorization Notice</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* 🧪 Public Demo & Dev-Mail Showcase */}
            {isDevMode && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-amber-50/80 border border-indigo-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-950 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-primary-600 animate-pulse" />
                    <span>Public Preview & Dev Mails</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold border border-indigo-300">
                    Live Demo Mode
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Welcome! Try out the complete KRITI Tracker experience using pre-configured <strong className="text-slate-900">Dev Mails</strong> below. All changes (tasks, statuses, teams) persist in your browser session:
                </p>

                {/* 1-Click Dev Mail Preset Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('admin', '/admin')}
                    className="p-2.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50/80 text-left transition-all shadow-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-950">👑 Congress Director</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">Admin</span>
                    </div>
                    <p className="text-[10px] font-mono text-primary-700 mt-0.5 truncate">admin.qa@company.com</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">Full control across 12 teams</p>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('team_head_eng', '/teams/team-scientific')}
                    className="p-2.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50/80 text-left transition-all shadow-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-950">🩺 Scientific Head</span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold">Team 01</span>
                    </div>
                    <p className="text-[10px] font-mono text-primary-700 mt-0.5 truncate">lead.eng@company.com</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">Scientific abstracts checklist</p>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('team_head_ops', '/teams/team-cme-workshops')}
                    className="p-2.5 rounded-xl border border-cyan-200 bg-white hover:bg-cyan-50/80 text-left transition-all shadow-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-cyan-950">💉 CME Workshops</span>
                      <span className="text-[9px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-semibold">Team 02</span>
                    </div>
                    <p className="text-[10px] font-mono text-primary-700 mt-0.5 truncate">lead.ops@company.com</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">Clinical training & CME credits</p>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDevPersonaLogin('viewer', '/admin')}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all shadow-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">👁️ Ethics Auditor</span>
                      <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">Auditor</span>
                    </div>
                    <p className="text-[10px] font-mono text-primary-700 mt-0.5 truncate">auditor.qa@company.com</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">Read-only ethics oversight</p>
                  </button>
                </div>

                {/* Direct Dev Email Input Form */}
                <form onSubmit={handleDevEmailSubmit} className="pt-2 space-y-2">
                  <label htmlFor="dev-email-input" className="block text-[11px] font-semibold text-slate-700">
                    Or Enter Any Dev / Institutional Email:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="dev-email-input"
                        type="email"
                        value={devEmailInput}
                        onChange={(e) => setDevEmailInput(e.target.value)}
                        placeholder="e.g. lead.eng@company.com or custom@org.com"
                        className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      <span>Try Mail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Standard Institutional Sign In Divider & Header */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">Institutional Google Sign-In</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-slate-500">
                Authorized corporate accounts with Google Cloud OAuth access:
              </p>
            </div>

            {/* Google Sign In Component */}
            <div className="flex flex-col items-center justify-center pt-1">
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
