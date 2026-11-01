import React, { useState } from 'react';
import { Plus, Trash2, Tag, Check, Layers } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const CategoryManager: React.FC = () => {
  const { config, updateConfig } = useConfig();
  const [categories, setCategories] = useState<string[]>(config.categories || []);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories([...categories, trimmed]);
    setNewCategory('');
  };

  const handleRemove = (cat: string) => {
    if (categories.length <= 1) {
      alert('At least one task category must remain.');
      return;
    }
    setCategories(categories.filter(c => c !== cat));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      await updateConfig({ categories });
      setSuccessMsg('Categories saved to Master Configuration spreadsheet.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-base font-bold text-slate-900">Task Categories & Checklist Sections</h3>
        <p className="text-xs text-slate-500">
          Define standard categories and sections used to organize tasks across all team checklists.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add new category form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="New Category Name (e.g. Compliance & Audits)"
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" size="md" className="flex items-center gap-1.5 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </Button>
      </form>

      {/* Existing Categories List */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-subtle">
        {categories.map((cat, idx) => (
          <div key={cat} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-xs font-mono text-slate-400 font-semibold">
                {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-sm font-semibold text-slate-800">{cat}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(cat)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Remove category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} isLoading={isSaving} size="md">
          Save Categories Configuration
        </Button>
      </div>
    </div>
  );
};
