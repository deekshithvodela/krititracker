import React, { useState } from 'react';
import { Settings, Check, Megaphone, ShieldAlert, FileText } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const AppSettingsForm: React.FC = () => {
  const { config, updateConfig } = useConfig();
  const [companyName, setCompanyName] = useState(config.appSettings.companyName || '');
  const [announcementBanner, setAnnouncementBanner] = useState(config.appSettings.announcementBanner || '');
  const [allowTeamHeadReopen, setAllowTeamHeadReopen] = useState(config.appSettings.allowTeamHeadReopen !== false);
  const [requireRemarksOnCompletion, setRequireRemarksOnCompletion] = useState(Boolean(config.appSettings.requireRemarksOnCompletion));
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      await updateConfig({
        appSettings: {
          companyName: companyName.trim(),
          announcementBanner: announcementBanner.trim(),
          allowTeamHeadReopen,
          requireRemarksOnCompletion,
        },
      });
      setSuccessMsg('Application settings updated and synced with Master Spreadsheet.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-base font-bold text-slate-900">Application-Wide Governance Settings</h3>
        <p className="text-xs text-slate-500">
          Configure branding, announcements, and task sign-off policies. Changes take effect across all team dashboards.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
        <Input
          label="Organization / Company Name"
          id="company-name"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="e.g. Acme Corporation"
        />

        <div>
          <label htmlFor="announcement-banner" className="block text-xs font-semibold uppercase text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-primary-600" />
            <span>Broadcast Announcement Banner (Optional)</span>
          </label>
          <input
            id="announcement-banner"
            type="text"
            value={announcementBanner}
            onChange={e => setAnnouncementBanner(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm shadow-subtle placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. Q3 Progress reviews scheduled for Friday. Please ensure all checklists are current."
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Displayed prominently across the top of all user dashboards when populated.
          </p>
        </div>
      </div>

      {/* Policy rules */}
      <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Task Governance & Sign-Off Rules
        </h4>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={allowTeamHeadReopen}
              onChange={e => setAllowTeamHeadReopen(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 mt-0.5"
            />
            <div>
              <span className="text-sm font-semibold text-slate-800 block">
                Allow Team Heads to Reopen Completed Tasks
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                When unchecked, once a task is marked complete, only Super Administrators can reopen it.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={requireRemarksOnCompletion}
              onChange={e => setRequireRemarksOnCompletion(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 mt-0.5"
            />
            <div>
              <span className="text-sm font-semibold text-slate-800 block">
                Prompt for Remarks on Task Completion
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Encourages users to log completion notes and PR/ticket links upon marking a task complete.
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={isSaving} size="md">
          Save Application Settings
        </Button>
      </div>
    </form>
  );
};
