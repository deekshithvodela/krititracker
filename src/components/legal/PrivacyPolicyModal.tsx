import React from 'react';
import { ShieldCheck, Lock, EyeOff, Database, Cookie, ExternalLink, HeartPulse } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Policy & Security Disclosure"
      description="Healthcare congress data hygiene, Google OAuth scope boundaries, and access control governance"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs text-slate-700 max-h-[70vh] overflow-y-auto pr-1">
        {/* Compliance & Author Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">
                KRITI Tracker Privacy Governance
              </p>
              <p className="text-[11px] text-slate-500">
                Maintained by{' '}
                <a
                  href="https://www.linkedin.com/in/deekshithvodela/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:text-primary-800 underline font-semibold inline-flex items-center gap-0.5"
                >
                  Deekshith Vodela
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{' '}
                • Standard ISO/IEC 27001 &amp; ISO/IEC 25010 Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10.5px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Zero PII Harvesting
          </div>
        </div>

        {/* Section 1: Google OAuth 2.0 Scope Boundaries */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Lock className="w-3.5 h-3.5 text-primary-600" />
            <span>1. Google OAuth 2.0 Authentication Boundaries</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11.5px]">
            KRITI Tracker utilizes Google Identity Services strictly for federated identity verification. The application requests <strong>only minimal non-sensitive scopes</strong> (<code className="px-1 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10.5px]">openid</code>, <code className="px-1 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10.5px]">email</code>, <code className="px-1 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10.5px]">profile</code>).
          </p>
          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-900 text-[11px] flex items-start gap-2">
            <EyeOff className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Strict Scope Boundary:</strong> KRITI never requests, inspects, reads, or modifies your personal Google Drive, Gmail, Google Calendar, contacts, or documents. Your personal Google Workspace data remains entirely inaccessible to KRITI.
            </div>
          </div>
        </div>

        {/* Section 2: Strict Email Whitelisting & RBAC */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>2. Strict Email Whitelist &amp; Role-Based Access Control</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11.5px]">
            Successful Google Sign-In alone <strong>never grants access</strong> to the application. Before any authenticated session is initialized, the server validates the Google ID token and checks whether the email exists in the authorized registry of the Master Spreadsheet.
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px] pl-1">
            <li><strong>Whitelisted Committee Members:</strong> Granted scoped access solely to their assigned committee.</li>
            <li><strong>Super Administrators:</strong> Empowered to manage teams, add whitelist entries, and monitor audits.</li>
            <li><strong>Unregistered Visitors:</strong> Immediately directed to an Access Denied view with zero session creation.</li>
          </ul>
        </div>

        {/* Section 3: Healthcare Deliverables & Zero PHI */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
            <span>3. Medical Congress Operations &amp; Zero Protected Health Information (PHI)</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11.5px]">
            KRITI is purpose-built exclusively for <strong>congress organizational deliverables</strong> (such as CME accreditation, surgical wet-lab logistics, keynote honorariums, bio-hazard waste protocols, and venue audiovisuals).
          </p>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Under no circumstances should patient medical records, clinical case reports containing identifiable patient data, or Protected Health Information (PHI) governed by HIPAA or GDPR be stored in task fields.
          </p>
        </div>

        {/* Section 4: Cookies, Sessions & Sub-processors */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Cookie className="w-3.5 h-3.5 text-amber-600" />
            <span>4. Session Cookies &amp; Data Infrastructure</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong className="text-slate-800 block mb-0.5">Essential Session Cookie</strong>
              <p className="text-slate-600">
                Uses a signed, encrypted <code className="font-mono text-[10px]">kriti_session</code> cookie with <code className="font-mono text-[10px]">HttpOnly</code>, <code className="font-mono text-[10px]">SameSite=Lax</code>, and <code className="font-mono text-[10px]">Secure</code> flags. Zero tracking or advertising cookies.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong className="text-slate-800 block mb-0.5">Sub-Processors &amp; Hosting</strong>
              <p className="text-slate-600">
                Serverless API functions execute on Vercel Edge (SOC2 Type II). Task storage and audit logs reside within Google Sheets Enterprise API v4.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Data Subject Rights & Contacts */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>5. Retention, Erasure &amp; Author Contact</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11.5px]">
            Users retain full rights to request audit logs or deletion of their whitelisted email from congress databases by notifying their Congress Super Admin or submitting an inquiry via{' '}
            <a
              href="https://www.linkedin.com/in/deekshithvodela/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 hover:text-primary-800 underline font-semibold inline-flex items-center gap-0.5"
            >
              Deekshith Vodela on LinkedIn
              <ExternalLink className="w-2.5 h-2.5" />
            </a>.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Last Updated: November 2026 • Version 1.0.0
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Understood &amp; Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
