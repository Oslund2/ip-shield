import { Edit3, Save, Loader2, RefreshCw, X, Sparkles } from 'lucide-react';
import { generateDefaultSpecification, countWords } from '../../../services/patent/patentApplicationService';

interface PatentSpecificationTabProps {
  specification: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
}

export function PatentSpecificationTab({ specification, editing, saving, onEdit, onChange, onSave, onCancel, onRegenerate }: PatentSpecificationTabProps) {
  const isTemplate = specification === generateDefaultSpecification();
  const wordCount = countWords(specification);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Specification</h2>
          {isTemplate && !editing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
              <Sparkles className="w-3 h-3" />
              Template
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-shield-600 text-white text-xs font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Word Count Bar */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
        <span className="text-xs text-slate-500">Word count</span>
        <span className="text-sm font-medium text-slate-700">{wordCount.toLocaleString()}</span>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={specification}
          onChange={e => onChange(e.target.value)}
          className="w-full h-[560px] px-4 py-3 font-mono text-sm text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none resize-none"
          placeholder="Enter patent specification..."
        />
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 max-h-[560px] overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed">
            {specification || 'No specification yet. Click Edit to add one.'}
          </pre>
        </div>
      )}
    </div>
  );
}
