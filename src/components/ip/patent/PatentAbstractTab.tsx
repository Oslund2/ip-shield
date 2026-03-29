import { Edit3, Save, Loader2, RefreshCw, X, Sparkles, BookOpen, Info } from 'lucide-react';
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

  const getWordCountBadgeStyle = () => {
    if (!abstract || validation.wordCount === 0) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (validation.wordCount > 150) return 'bg-red-50 text-red-700 border-red-200';
    if (validation.wordCount > 120) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Abstract</h2>
            <p className="text-xs text-gray-500 mt-0.5">Concise summary of the invention</p>
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
                disabled={saving || !validation.valid}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - left 2 columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Live Word Count Badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${getWordCountBadgeStyle()}`}>
              <span className={`w-2 h-2 rounded-full ${
                validation.wordCount > 150 ? 'bg-red-500' : validation.wordCount > 120 ? 'bg-amber-500' : validation.wordCount > 0 ? 'bg-emerald-500' : 'bg-gray-400'
              }`} />
              {validation.wordCount}/150 words
            </span>
            <span className="text-xs text-gray-400">{validation.message}</span>
          </div>

          {/* Word Count Visual Bar */}
          <div className="relative">
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  validation.wordCount > 150
                    ? 'bg-red-500'
                    : validation.wordCount > 120
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
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
              className="w-full h-56 px-5 py-4 text-sm text-gray-800 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none leading-relaxed shadow-sm"
              placeholder="Enter patent abstract (max 150 words per USPTO requirements)"
            />
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm min-h-[200px]">
              <p className="text-sm text-gray-700 leading-relaxed">{abstract || 'No abstract yet. Click Edit to add one.'}</p>
            </div>
          )}
        </div>

        {/* USPTO tip card - right column */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 sticky top-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-sm font-semibold text-blue-900">USPTO Requirements</h4>
            </div>
            <ul className="text-xs text-blue-800/80 space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 mt-0.5">1</span>
                Abstract must not exceed 150 words
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 mt-0.5">2</span>
                Should be a single paragraph summarizing the invention
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 mt-0.5">3</span>
                Must describe the technical disclosure of the patent
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 mt-0.5">4</span>
                Should not include legal phraseology used in claims
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
