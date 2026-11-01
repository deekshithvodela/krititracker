import React, { useState, useEffect } from 'react';
import type { TeamOverview, TaskPriority, Task } from '../../types';
import { useConfig } from '../../hooks/useConfig';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import { Users, CheckSquare, Layers } from 'lucide-react';

interface AdminAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamOverview[];
  initialTeamId?: string;
  onTaskCreated: () => void;
}

export const AdminAddTaskModal: React.FC<AdminAddTaskModalProps> = ({
  isOpen,
  onClose,
  teams,
  initialTeamId,
  onTaskCreated,
}) => {
  const { config } = useConfig();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [category, setCategory] = useState('Core Deliverables');
  const [isMandatory, setIsMandatory] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTeamId(initialTeamId || teams[0]?.id || '');
      setTitle('');
      setDescription('');
      setPriority('Medium');
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setDeadline(nextWeek.toISOString().split('T')[0]);
      setAssignedTo('');
      setCategory(config.categories[0] || 'Core Deliverables');
      setIsMandatory(true);
      setRemarks('');
      setError(null);
    }
  }, [isOpen, initialTeamId, teams, config.categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select a target team.');
      return;
    }
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.createTask(selectedTeamId, {
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline,
        assignedTo: assignedTo.trim() || undefined,
        category,
        isMandatory,
        remarks: remarks.trim(),
      });
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team Task"
      description="Add a task item to any company team's progress checklist."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Target Team Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Target Company Team <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.department || 'General'})
                </option>
              ))}
            </select>
          </div>
          {selectedTeam?.headEmail && (
            <p className="text-[11px] text-slate-500">
              Assigned Team Head: <span className="font-semibold text-slate-700">{selectedTeam.headEmail}</span>
            </p>
          )}
        </div>

        {/* Title */}
        <Input
          label="Task Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Implement automated canary rollback pipeline"
          required
        />

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Detailed deliverable specifications..."
          />
        </div>

        {/* Category & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={config.categories.map(c => ({ value: c, label: c }))}
          />

          <Select
            label="Priority Level"
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            options={[
              { value: 'Low', label: '🟢 Low' },
              { value: 'Medium', label: '🟡 Medium' },
              { value: 'High', label: '🟠 High' },
              { value: 'Critical', label: '🔴 Critical' },
            ]}
          />
        </div>

        {/* Deadline & Assigned To Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Deadline Target"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            required
          />

          <Input
            label="Assigned Lead / Member Email"
            type="email"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="member@company.com"
          />
        </div>

        {/* Mandatory Flag */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-800">Mandatory Milestone</span>
            <p className="text-[11px] text-slate-500">
              When checked, this task is required for 100% completion calculation.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isMandatory}
            onChange={e => setIsMandatory(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSaving} className="gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
