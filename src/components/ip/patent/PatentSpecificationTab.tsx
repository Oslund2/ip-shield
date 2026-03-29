import { Edit3, Save, Loader2, RefreshCw, X, Sparkles, FileText } from 'lucide-react';
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

  const getWordCountColor = () => {
    if (wordCount === 0) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (wordCount < 500) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (wordCount < 2000) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Specification</h2>
            <p className="text-xs text-gray-500 mt-0.5">Technical description of your invention</p>
          </div>
          {isTemplate && !editing && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Word Count Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${getWordCountColor()}`}>
        <span>Word count:</span>
        <span className="font-bold">{wordCount.toLocaleString()}</span>
      </div>

      {/* Content */}
      {editing ? (
        <div className="relative">
          <div className="absolute top-0 left-0 w-12 h-full bg-gray-50 border-r border-gray-200 rounded-l-xl pointer-events-none z-10 flex flex-col items-center pt-4 text-xs text-gray-400 font-mono overflow-hidden">
            {specification.split('\n').slice(0, 40).map((_, i) => (
              <div key={i} className="h-[20px] flex items-center">{i + 1}</div>
            ))}
          </div>
          <textarea
            value={specification}
            onChange={e => onChange(e.target.value)}
            className="w-full h-[560px] pl-14 pr-4 py-4 font-mono text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none leading-[20px]"
            placeholder="Enter patent specification..."
          />
        </div>
      ) : (
        <div className="relative bg-white border border-gray-100 rounded-2xl shadow-sm max-h-[560px] overflow-y-auto">
          <div className="absolute top-0 left-0 w-12 h-full bg-slate-50/80 border-r border-gray-100 pointer-events-none flex flex-col items-center pt-6 text-xs text-gray-300 font-mono overflow-hidden">
            {(specification || '').split('\n').slice(0, 50).map((_, i) => (
              <div key={i} className="h-[22px] flex items-center">{i + 1}</div>
            ))}
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-[22px] pl-14 pr-6 py-6">
            {specification || 'No specification yet. Click Edit to add one.'}
          </pre>
        </div>
      )}
    </div>
  );
}
