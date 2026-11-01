import React, { useState } from 'react';
import { LayoutGrid, Eye, EyeOff, Check, Table, Activity, BarChart2, Bell, Database } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const WidgetCustomiser: React.FC = () => {
  const { config, updateConfig } = useConfig();
  const [widgets, setWidgets] = useState(config.dashboardWidgets);
  const [visibleFields, setVisibleFields] = useState<string[]>(config.visibleTeamFields || []);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleWidget = (key: keyof typeof widgets) => {
    setWidgets({
      ...widgets,
      [key]: !widgets[key],
    });
  };

  const toggleField = (field: string) => {
    if (visibleFields.includes(field)) {
      if (visibleFields.length <= 2) {
        alert('At least two fields must remain visible.');
        return;
      }
      setVisibleFields(visibleFields.filter(f => f !== field));
    } else {
      setVisibleFields([...visibleFields, field]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      await updateConfig({
        dashboardWidgets: widgets,
        visibleTeamFields: visibleFields,
      });
      setSuccessMsg('Dashboard customisation settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const widgetDefinitions = [
    {
      key: 'showKpiMetrics' as const,
      label: 'Summary KPI Metric Cards',
      desc: 'Displays total teams, completed teams, total/pending tasks, and overall progress %',
      icon: BarChart2,
    },
    {
      key: 'showTeamOverviewTable' as const,
      label: '12-Team Centralised Overview Table',
      desc: 'Central monitoring table showing progress bars, completed/total count, and next priority task',
      icon: Table,
    },
    {
      key: 'showGlobalActivityFeed' as const,
      label: 'Global Activity Stream',
      desc: 'Real-time audit log of task completions, remarks updates, and administrative events',
      icon: Activity,
    },
    {
      key: 'showOverdueAlerts' as const,
      label: 'Overdue Deadline Warnings',
      desc: 'Highlights teams and tasks with overdue deadlines prominently',
      icon: Bell,
    },
    {
      key: 'showSyncHealthStatus' as const,
      label: 'Google Sheets Sync Health Indicator',
      desc: 'Displays connectivity status, latency, and force reconciliation trigger',
      icon: Database,
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-base font-bold text-slate-900">Dashboard Widgets & Layout Customisation</h3>
        <p className="text-xs text-slate-500">
          Enable or disable widgets and configure field visibility across the Admin Dashboard.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Widget toggles list */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Dashboard Widgets
        </h4>
        <div className="space-y-2.5">
          {widgetDefinitions.map(def => {
            const Icon = def.icon;
            const isEnabled = widgets[def.key];
            return (
              <div
                key={def.key}
                onClick={() => toggleWidget(def.key)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isEnabled
                    ? 'border-primary-200 bg-white shadow-subtle hover:border-primary-300'
                    : 'border-slate-200 bg-slate-50/70 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-primary-50 text-primary-600' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{def.label}</h5>
                    <p className="text-xs text-slate-500">{def.desc}</p>
                  </div>
                </div>

                <div
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isEnabled ? 'bg-primary-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} isLoading={isSaving} size="md">
          Save Dashboard Customisations
        </Button>
      </div>
    </div>
  );
};
