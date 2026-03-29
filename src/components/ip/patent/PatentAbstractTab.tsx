import { Edit3, Save, Loader2, RefreshCw, X, Sparkles } from 'lucide-react';
import { validateAbstract, generateDefaultAbstract } from '../../../services/patent/patentApplicationService';

interface PatentAbstractTabProps {
  abstract: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
}

export function PatentAbstractTab({ abstract, editing, saving, onEdit, onChange, onSave, onCancel, onRegenerate }: PatentAbstractTabProps) {
  const validation = validateAbstract(abstract);
  const isTemplate = abstract === generateDefaultAbstract();

  const getValidationStyle = () => {
    if (!abstract) return 'bg-slate-50 border-slate-200 text-slate-500';
    if (validation.valid) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    return 'bg-red-50 border-red-200 text-red-700';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Abstract</h2>
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
                disabled={saving || !validation.valid}
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

      {/* Word Count Validation Banner */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm ${getValidationStyle()}`}>
        <span className="text-xs font-medium">{validation.message}</span>
        <span className="text-xs">
          {validation.wordCount}/150 words
        </span>
      </div>

      {/* Word Count Visual Bar */}
      <div className="relative">
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              validation.wordCount > 150
                ? 'bg-red-500'
                : validation.wordCount > 120
                ? 'bg-amber-400'
                : 'bg-shield-500'
            }`}
            style={{ width: `${Math.min((validation.wordCount / 150) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={abstract}
          onChange={e => onChange(e.target.value)}
          className="w-full h-48 px-4 py-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none resize-none leading-relaxed"
          placeholder="Enter patent abstract (max 150 words per USPTO requirements)"
        />
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <p className="text-sm text-slate-700 leading-relaxed">{abstract || 'No abstract yet. Click Edit to add one.'}</p>
        </div>
      )}

      {/* USPTO Requirements Note */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">USPTO Requirements</h4>
        <ul className="text-xs text-slate-500 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
            Abstract must not exceed 150 words
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
            Should be a single paragraph summarizing the invention
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
            Must describe the technical disclosure of the patent
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
            Should not include legal phraseology used in claims
          </li>
        </ul>
      </div>
    </div>
  );
}
