import React, { useState, useEffect } from 'react';
import type { TeamStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import { Plus, Users, FileSpreadsheet, ShieldAlert, Sparkles } from 'lucide-react';

interface AddTeamSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated: () => void;
  currentTeamCount: number;
}

export const AddTeamSheetModal: React.FC<AddTeamSheetModalProps> = ({
  isOpen,
  onClose,
  onTeamCreated,
  currentTeamCount,
}) => {
  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TeamStatus>('Active');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const nextNum = currentTeamCount + 1;
      const pad = String(nextNum).padStart(2, '0');
      setTeamId(`team-${pad}`);
      setName(`Team ${pad} - `);
      setDepartment('Technology');
      setHeadEmail('');
      setSpreadsheetId(`1Sheet_${pad}_DynamicSpreadsheetIdExample`);
      setDescription('');
      setStatus('Active');
      setError(null);
    }
  }, [isOpen, currentTeamCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required.');
      return;
    }
    if (!teamId.trim()) {
      setError('Team identifier is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.saveTeam({
        id: teamId.trim(),
        name: name.trim(),
        department: department.trim() || 'General',
        headEmail: headEmail.trim() || undefined,
        description: description.trim() || undefined,
        spreadsheetId: spreadsheetId.trim(),
        status,
      });
      onTeamCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create team and connect sheet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Team & Connect Google Sheet"
      description="Scale your system dynamically beyond the initial 12 teams. Connect an independent Google Spreadsheet for this team."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p>
            You can add as many teams as needed. Each team receives its own isolated checklist and can be linked to its own Google Spreadsheet.
          </p>
        </div>

        {/* Team Identifier & Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              label="Team Identifier (Slug)"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              placeholder="e.g. team-13 or team-ai"
              required
            />
            <p className="text-[10px] text-slate-400">Used in URL routing /teams/:teamId</p>
          </div>

          <Input
            label="Team Display Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Team 13 - AI Research"
            required
          />
        </div>

        {/* Department & Head Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Department / Unit"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="e.g. Technology, Operations"
            required
          />

          <div className="space-y-1">
            <Input
              label="Team Head Email"
              type="email"
              value={headEmail}
              onChange={e => setHeadEmail(e.target.value)}
              placeholder="head.lead@company.com"
            />
            <p className="text-[10px] text-slate-400">Owner authorised to update this team</p>
          </div>
        </div>

        {/* Google Spreadsheet ID */}
        <div className="space-y-1">
          <Input
            label="Google Spreadsheet ID (Database)"
            value={spreadsheetId}
            onChange={e => setSpreadsheetId(e.target.value)}
            placeholder="e.g. 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
            required
          />
          <p className="text-[10px] text-slate-400">
            Found in URL: docs.google.com/spreadsheets/d/&#123;ID&#125;/edit. Share this sheet with the Service Account email.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">Team Description & Scope</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Scope of work and deliverables..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSaving} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Team & Connect</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
