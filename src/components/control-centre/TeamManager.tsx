import React, { useState } from 'react';
import { Plus, Edit2, Archive, CheckCircle, Shield, Users, Mail, Layers } from 'lucide-react';
import type { TeamOverview, TeamStatus } from '../../types';
import { getTeamStatusConfig } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { api } from '../../services/api';

interface TeamManagerProps {
  teams: TeamOverview[];
  onTeamUpdated: () => void;
}

export const TeamManager: React.FC<TeamManagerProps> = ({ teams, onTeamUpdated }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamOverview | null>(null);

  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [description, setDescription] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [status, setStatus] = useState<TeamStatus>('Active');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingTeam(null);
    const nextNum = teams.length + 1;
    const pad = String(nextNum).padStart(2, '0');
    setTeamId(`team-${pad}`);
    setName('');
    setDepartment('General');
    setHeadEmail('');
    setDescription('');
    setSpreadsheetId('');
    setStatus('Active');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (team: TeamOverview) => {
    setEditingTeam(team);
    setTeamId(team.id);
    setName(team.name);
    setDepartment(team.department || 'General');
    setHeadEmail(team.headEmail || '');
    setDescription(team.description || '');
    setSpreadsheetId(team.spreadsheetId || '');
    setStatus(team.status || 'Active');
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.saveTeam({
        id: teamId.trim(),
        name: name.trim(),
        department: department.trim(),
        headEmail: headEmail.trim(),
        description: description.trim(),
        spreadsheetId: spreadsheetId.trim(),
        status,
      });
      setModalOpen(false);
      onTeamUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to save team.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Company Teams Registry</h3>
          <p className="text-xs text-slate-500">
            Create, rename, activate, deactivate, or archive teams. Supports adding teams beyond the initial 12.
          </p>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add New Team</span>
        </Button>
      </div>

      {/* Teams Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => {
          const statusConfig = getTeamStatusConfig(team.status);
          return (
            <div
              key={team.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700 uppercase">
                    {team.id}
                  </span>
                  <Badge className={statusConfig.bg + ' text-[10px]'}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </Badge>
                </div>

                <h4 className="text-base font-bold text-slate-900">{team.name}</h4>
                {team.department && (
                  <p className="text-xs text-slate-500 font-medium">{team.department}</p>
                )}

                {team.description && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{team.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Head:</span>
                  </span>
                  <span className="font-medium text-slate-800 truncate max-w-[150px]">
                    {team.headEmail || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Tracked Tasks:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {team.completedTasks} / {team.totalTasks} ({team.completionPercentage}%)
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(team)}
                    className="flex items-center gap-1.5 text-xs h-8"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Configure</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Team Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeam ? `Configure Team: ${editingTeam.id}` : 'Create New Team'}
        description="Configure team metadata, assigned lead, status, and Google Sheet mapping."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Team Identifier *"
              id="team-id"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              placeholder="e.g. team-13"
              disabled={Boolean(editingTeam)}
              required
            />

            <Select
              label="Status"
              id="team-status"
              value={status}
              onChange={e => setStatus(e.target.value as TeamStatus)}
              options={[
                { value: 'Active', label: 'Active (Visible on Dashboard)' },
                { value: 'Deactivated', label: 'Deactivated (Paused)' },
                { value: 'Archived', label: 'Archived (Hidden)' },
              ]}
            />
          </div>

          <Input
            label="Team Name *"
            id="team-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. AI Research & Automation"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Department / Area"
              id="team-dept"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Technology"
            />

            <Input
              label="Team Head Email"
              id="team-head-email"
              type="email"
              value={headEmail}
              onChange={e => setHeadEmail(e.target.value)}
              placeholder="lead@company.com"
            />
          </div>

          <Input
            label="Google Spreadsheet ID"
            id="team-sheet-id"
            value={spreadsheetId}
            onChange={e => setSpreadsheetId(e.target.value)}
            placeholder="e.g. 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
          />

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Team Description & Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-slate-400"
              placeholder="Brief summary of this team's key responsibilities and goals..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving}>
              {editingTeam ? 'Save Team Settings' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
