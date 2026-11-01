import React, { useState, useEffect } from 'react';
import type { Task, TaskPriority } from '../../types';
import { useConfig } from '../../hooks/useConfig';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  onSave: (data: Partial<Task>) => Promise<void>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  task,
  onSave,
}) => {
  const { config } = useConfig();
  const isEditing = Boolean(task);

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
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDeadline(task.deadline || '');
      setAssignedTo(task.assignedTo || '');
      setCategory(task.category || 'Core Deliverables');
      setIsMandatory(task.isMandatory !== false);
      setRemarks(task.remarks || '');
    } else {
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
    }
    setError(null);
  }, [task, isOpen, config.categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline,
        assignedTo: assignedTo.trim() || undefined,
        category,
        isMandatory,
        remarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const priorityOptions = [
    { value: 'Low', label: 'Low Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'High', label: 'High Priority' },
    { value: 'Critical', label: 'Critical Priority' },
  ];

  const categoryOptions = config.categories.map(c => ({ value: c, label: c }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create New Checklist Task'}
      description={isEditing ? `Modify task configuration: ${task?.id}` : 'Define a new task deliverable and schedule.'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <Input
          label="Task Title *"
          id="task-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Conduct Security Penetration Testing"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority"
            id="task-priority"
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
            options={priorityOptions}
          />

          <Select
            label="Category / Section"
            id="task-category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={categoryOptions}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Deadline Date"
            id="task-deadline"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />

          <Input
            label="Assigned Lead"
            id="task-assigned"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="e.g. lead@example.com"
          />
        </div>

        <div>
          <label htmlFor="task-description" className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
            Detailed Description
          </label>
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-slate-400"
            placeholder="Provide context, acceptance criteria, or reference links..."
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="task-mandatory"
            checked={isMandatory}
            onChange={e => setIsMandatory(e.target.checked)}
            className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
          />
          <label htmlFor="task-mandatory" className="text-xs font-medium text-slate-700 cursor-pointer">
            Mandatory task (Required for 100% completion)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
