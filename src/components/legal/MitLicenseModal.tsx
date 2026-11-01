import React from 'react';
import { FileText, ExternalLink, Check, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface MitLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MitLicenseModal: React.FC<MitLicenseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MIT License"
      description="Open source license terms and author attribution"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs text-slate-700">
        {/* Author / Copyright Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">
                Copyright © 2026{' '}
                <a
                  href="https://www.linkedin.com/in/deekshithvodela/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:text-primary-800 underline underline-offset-2 font-bold inline-flex items-center gap-1"
                >
                  Deekshith Vodela
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
              <p className="text-[11px] text-slate-500">KRITI Tracker Contributors</p>
            </div>
          </div>

          <a
            href="https://www.linkedin.com/in/deekshithvodela/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 text-[11px] font-semibold transition-all shadow-sm"
          >
            <span>LinkedIn Profile</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* License Permissions Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-100 flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900 block">Commercial Use</span>
              <span className="text-emerald-700">Free use in commercial medical software</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-100 flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-blue-900 block">Modification</span>
              <span className="text-blue-700">Freely customize tasks and committees</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-100 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-amber-900 block">Attribution</span>
              <span className="text-amber-700">Retain copyright & permission notice</span>
            </div>
          </div>
        </div>

        {/* Full Official MIT License Body */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Official License Text
          </label>
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto border border-slate-800 space-y-3">
            <p className="font-bold text-emerald-400">MIT License</p>
            <p>
              Copyright (c) 2026 Deekshith Vodela (https://www.linkedin.com/in/deekshithvodela/)
              <br />
              and KRITI Tracker Contributors
            </p>
            <p className="text-slate-300">
              Permission is hereby granted, free of charge, to any person obtaining a copy of this
              software and associated documentation files (the &quot;Software&quot;), to deal in the
              Software without restriction, including without limitation the rights to use, copy,
              modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
              and to permit persons to whom the Software is furnished to do so, subject to the
              following conditions:
            </p>
            <p className="text-slate-300">
              The above copyright notice and this permission notice shall be included in all copies
              or substantial portions of the Software.
            </p>
            <p className="text-slate-400 text-[10px]">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
              HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
              CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
              OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Open-source initiative for healthcare events
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
