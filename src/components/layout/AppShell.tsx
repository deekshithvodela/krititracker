import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Navbar } from './Navbar';
import { MitLicenseModal } from '../legal/MitLicenseModal';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMitModalOpen, setIsMitModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">KRITI MedEvent Tracker</span>
            <span>•</span>
            <span>Medical Congress &amp; Clinical Event Operations</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            <div>
              <span>Copyright © 2026 </span>
              <a
                href="https://www.linkedin.com/in/deekshithvodela/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary-700 hover:text-primary-800 underline underline-offset-2 inline-flex items-center gap-0.5 transition-colors"
              >
                <span>Deekshith Vodela</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setIsMitModalOpen(true)}
              className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2 px-1.5 py-0.5 rounded hover:bg-primary-50 transition-all"
            >
              MIT License
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-primary-600 hover:text-primary-800 font-semibold underline underline-offset-2 px-1.5 py-0.5 rounded hover:bg-primary-50 transition-all"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      <MitLicenseModal isOpen={isMitModalOpen} onClose={() => setIsMitModalOpen(false)} />
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
    </div>
  );
};
