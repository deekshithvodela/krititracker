import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface RemarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  initialRemarks?: string;
  onSave: (remarks: string) => Promise<void>;
}

export const RemarksModal: React.FC<RemarksModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  initialRemarks = '',
  onSave,
}) => {
  const [remarks, setRemarks] = useState(initialRemarks);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setRemarks(initialRemarks);
  }, [initialRemarks, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(remarks);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Remarks"
      description={`Add progress notes or sign-off context for: "${taskTitle}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
            Remarks & Notes
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-slate-400"
            placeholder="e.g. Reviewed PR #412; QA passed on staging cluster..."
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            Save Remarks
          </Button>
        </div>
      </form>
    </Modal>
  );
};
