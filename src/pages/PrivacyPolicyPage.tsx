import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, HeartPulse, Cookie, Database, ExternalLink } from 'lucide-react';
import { MitLicenseModal } from '../components/legal/MitLicenseModal';

export const PrivacyPolicyPage: React.FC = () => {
  const [isMitModalOpen, setIsMitModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-black text-sm flex items-center justify-center">
              K
            </div>
            <span className="font-bold text-slate-800 text-sm">KRITI MedEvent</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ISO/IEC 25010 &amp; Privacy Safeguards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy &amp; Security Disclosure
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Effective Date: November 2026 • Version 1.0.0 • Governing KRITI MedEvent Tracker
            </p>
          </div>

          {/* Author Attribution Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-slate-900 text-xs">
                Platform Architecture &amp; Data Governance by{' '}
                <a
                  href="https://www.linkedin.com/in/deekshithvodela/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:text-primary-800 underline font-bold inline-flex items-center gap-1"
                >
                  Deekshith Vodela
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <p className="text-[11px] text-slate-500">
                Independent medical informatics &amp; event operations engineering
              </p>
            </div>
            <a
              href="https://www.linkedin.com/in/deekshithvodela/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 text-xs font-semibold transition-all shadow-sm"
            >
              Contact on LinkedIn
            </a>
          </div>

          {/* Policy Sections */}
          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary-600" />
                1. Google OAuth 2.0 Scope Boundaries
              </h2>
              <p>
                KRITI MedEvent Tracker uses Google Identity Services exclusively to authenticate users via federated Single Sign-On (SSO). The application explicitly limits its authentication scope to:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                <li><code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-800">openid</code> (OpenID Connect token verification)</li>
                <li><code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-800">email</code> (User email address for whitelist verification)</li>
                <li><code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-800">profile</code> (Display name and avatar for dashboard navigation)</li>
              </ul>
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Zero Access to Personal Files:</strong> KRITI never requests, inspects, accesses, reads, or modifies your personal Google Drive, Gmail, Google Calendar, or documents. Your personal Google data is completely isolated.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                2. Mandatory Email Whitelist Enforcement
              </h2>
              <p>
                In strict compliance with congress governance rules, signing in with a valid Google account does not grant access. Before any session is issued, our serverless backend performs a multi-point verification:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-2 text-slate-600">
                <li>Cryptographic verification of Google's JWT ID token signature and audience.</li>
                <li>Email normalization and cross-referencing against the authorized registry in the master Google Sheet.</li>
                <li>Verification that the account is active and mapped to a valid role (<code className="font-mono text-xs">admin</code> or <code className="font-mono text-xs">team_head</code>).</li>
              </ol>
              <p className="text-slate-600">
                Unregistered users are immediately redirected to an Access Denied view with zero session creation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                3. Medical Congress Scope &amp; Prohibition of Protected Health Information (PHI)
              </h2>
              <p>
                KRITI is designed strictly for operational logistics (scientific abstracts, CME accreditation deadlines, keynote speaker travel, catering, audio-visual testing, and committee tasks).
              </p>
              <p className="text-slate-600">
                Users are strictly prohibited from entering patient records, clinical case records containing identifiable patient information, or Protected Health Information (PHI) subject to HIPAA or GDPR regulations.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cookie className="w-4 h-4 text-amber-600" />
                4. Session Cookies &amp; Data Security
              </h2>
              <p>
                KRITI uses a single, cryptographically signed, HTTP-only cookie (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">kriti_session</code>) configured with:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                <li><code className="font-mono text-xs">HttpOnly: true</code> — Immune to JavaScript XSS theft.</li>
                <li><code className="font-mono text-xs">SameSite: Lax</code> — Mitigates Cross-Site Request Forgery (CSRF).</li>
                <li><code className="font-mono text-xs">Secure: true</code> — Transmitted exclusively over encrypted HTTPS connections in production.</li>
              </ul>
              <p className="text-slate-600">
                No third-party tracking pixels, marketing scripts, or advertising cookies are utilized.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                5. Data Retention, Erasure &amp; User Rights
              </h2>
              <p>
                Authorized users may request an audit export of their logged activity or request the removal of their email address from the congress whitelist by contacting their Congress Super Administrator or reaching out directly to the author.
              </p>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span>Copyright © 2026 </span>
            <a
              href="https://www.linkedin.com/in/deekshithvodela/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-700 hover:text-primary-800 underline underline-offset-2 inline-flex items-center gap-0.5"
            >
              <span>Deekshith Vodela</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMitModalOpen(true)}
              className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2"
            >
              MIT License
            </button>
            <span className="text-slate-300">•</span>
            <Link to="/login" className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

      <MitLicenseModal isOpen={isMitModalOpen} onClose={() => setIsMitModalOpen(false)} />
    </div>
  );
};
