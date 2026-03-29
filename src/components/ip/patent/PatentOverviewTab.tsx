import { useState } from 'react';
import {
  Edit3,
  Save,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Award,
  Lightbulb
} from 'lucide-react';
import {
  countWords,
  getFilingTypeLabel,
  getStatusLabel,
  getStatusColor,
  type PatentApplication,
  type PatentApplicationWithDetails
} from '../../../services/patent/patentApplicationService';
import { validateClaims, countClaimsByType } from '../../../services/patent/patentClaimsService';

interface PatentOverviewTabProps {
  application: PatentApplicationWithDetails;
  onUpdate: (updates: Partial<PatentApplication>) => Promise<void>;
  onDelete: () => void;
  onAIGenerate: () => void;
  aiGenerating: boolean;
  onNavigate: (tabId: string) => void;
}

export function PatentOverviewTab({ application, onUpdate, onDelete, onAIGenerate, aiGenerating, onNavigate }: PatentOverviewTabProps) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(application.title);
  const [inventorName, setInventorName] = useState(application.inventor_name || '');
  const [filingType, setFilingType] = useState(application.filing_type);
  const [status, setStatus] = useState(application.status);
  const [inventionDescription, setInventionDescription] = useState(application.invention_description || '');
  const [technicalField, setTechnicalField] = useState(application.technical_field || '');
  const [problemSolved, setProblemSolved] = useState(application.problem_solved || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        title,
        inventor_name: inventorName || null,
        filing_type: filingType,
        status,
        invention_description: inventionDescription || null,
        technical_field: technicalField || null,
        problem_solved: problemSolved || null
      });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const claimCounts = countClaimsByType(application.claims);
  const claimValidation = validateClaims(application.claims);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700';
    if (score >= 60) return 'text-emerald-600';
    if (score >= 40) return 'text-amber-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 60) return 'stroke-emerald-400';
    if (score >= 40) return 'stroke-amber-400';
    if (score >= 20) return 'stroke-orange-400';
    return 'stroke-red-400';
  };

  const noveltyScore = application.novelty_score ?? 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (noveltyScore / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Application Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Core details and patent strength metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onAIGenerate}
                disabled={aiGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {aiGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> {application.full_application_status !== 'not_started' ? 'Regenerate with AI' : 'Generate with AI'}</>
                )}
              </button>
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-500 bg-white border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Application Details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Application Details</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
              {editMode ? (
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                />
              ) : (
                <p className="text-sm text-gray-800 font-medium">{application.title}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Inventor</label>
              {editMode ? (
                <input
                  type="text"
                  value={inventorName}
                  onChange={e => setInventorName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="Inventor name"
                />
              ) : (
                <p className="text-sm text-gray-700">{application.inventor_name || 'Not specified'}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Filing Type</label>
                {editMode ? (
                  <select
                    value={filingType}
                    onChange={e => setFilingType(e.target.value as PatentApplication['filing_type'])}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  >
                    <option value="provisional">Provisional</option>
                    <option value="non_provisional">Non-Provisional</option>
                    <option value="continuation">Continuation</option>
                    <option value="cip">CIP</option>
                    <option value="divisional">Divisional</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-700">{getFilingTypeLabel(application.filing_type)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                {editMode ? (
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PatentApplication['status'])}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="ready_to_file">Ready to File</option>
                    <option value="filed">Filed</option>
                    <option value="pending">Pending</option>
                    <option value="granted">Granted</option>
                    <option value="rejected">Rejected</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(application.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {getStatusLabel(application.status)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Citizenship</label>
              <p className="text-sm text-gray-700">{application.inventor_citizenship}</p>
            </div>
          </div>

          {/* Application Summary Stats */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 pb-4 border-b border-gray-100 mb-4">Application Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Version', value: application.version, color: 'bg-blue-50 text-blue-700' },
                { label: 'Total Claims', value: claimCounts.total, onClick: () => onNavigate('claims'), color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Independent', value: claimCounts.independent, color: 'bg-violet-50 text-violet-700' },
                { label: 'Dependent', value: claimCounts.dependent, color: 'bg-purple-50 text-purple-700' },
                { label: 'Drawings', value: application.drawings.length, onClick: () => onNavigate('drawings'), color: 'bg-cyan-50 text-cyan-700' },
                { label: 'Abstract', value: `${countWords(application.abstract || '')}/150`, color: 'bg-emerald-50 text-emerald-700' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center p-3 rounded-xl ${item.color.split(' ')[0]} ${item.onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-200' : ''} transition-all`}
                  onClick={item.onClick}
                >
                  <span className={`text-lg font-bold ${item.color.split(' ')[1]}`}>{item.value}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Claims Validation */}
          <div className={`rounded-2xl p-5 ${claimValidation.valid ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-2.5 mb-2">
              {claimValidation.valid ? (
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
              )}
              <h3 className="text-sm font-semibold text-gray-800">Claims Validation</h3>
            </div>
            {claimValidation.valid ? (
              <p className="text-xs text-emerald-700 ml-[38px] font-medium">All claims properly formatted and valid</p>
            ) : (
              <ul className="text-xs text-amber-700 ml-[38px] space-y-1">
                {claimValidation.errors.map((err, i) => <li key={i} className="flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />{err}</li>)}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column - Scores & Details */}
        <div className="space-y-6">
          {/* Patent Strength Card with Circular Gauge */}
          {application.novelty_score !== null && application.novelty_score !== undefined && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Award className="w-4 h-4 text-blue-600" />
                  </div>
                  Patent Strength
                </h3>
                {application.full_application_status !== 'not_started' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                    <Sparkles className="w-3 h-3" />
                    AI Enhanced
                  </span>
                )}
              </div>

              <div className="flex items-center gap-8">
                {/* Circular Progress Gauge */}
                <div className="relative flex-shrink-0">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" className="stroke-gray-100" />
                    <circle
                      cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                      strokeLinecap="round"
                      className={`${getScoreRingColor(application.novelty_score)} transition-all duration-1000`}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${getScoreColor(application.novelty_score)}`}>
                      {Math.round(application.novelty_score)}%
                    </span>
                    <span className={`text-xs font-medium ${getScoreColor(application.novelty_score)}`}>
                      {getScoreLabel(application.novelty_score)}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <div className="text-xs text-gray-500 mb-0.5">Novelty Score</div>
                    <div className="text-lg font-bold text-blue-700">
                      {application.novelty_score ? Math.round(application.novelty_score) : '-'}/100
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <div className="text-xs text-gray-500 mb-0.5">Total Claims</div>
                    <div className="text-lg font-bold text-indigo-700">
                      {application.claims?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Progress */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 pb-4 border-b border-gray-100 mb-4">Section Progress</h3>
            <div className="space-y-3.5">
              {[
                { label: 'Specification', progress: application.specification ? Math.min(countWords(application.specification) / 50, 100) : 0, color: 'bg-blue-500' },
                { label: 'Claims', progress: application.claims.length > 0 ? 100 : 0, color: 'bg-indigo-500' },
                { label: 'Drawings', progress: application.drawings.length > 0 ? 100 : 0, color: 'bg-violet-500' },
                { label: 'Abstract', progress: application.abstract ? Math.min(countWords(application.abstract) / 1, 100) : 0, color: 'bg-emerald-500' },
              ].map((section, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">{section.label}</span>
                    <span className="text-xs font-semibold text-gray-500">{Math.round(section.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${section.color}`}
                      style={{ width: `${section.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-gray-400 space-y-1.5">
            <p>Created: {new Date(application.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(application.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Invention Details Section */}
      <div className="border-t border-gray-100 pt-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Invention Details</h3>
            {!application.invention_description && (
              <span className="text-xs text-amber-600 font-medium">Required for AI generation</span>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</label>
            {editMode ? (
              <textarea
                value={inventionDescription}
                onChange={e => setInventionDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all resize-none"
                placeholder="Describe your invention in detail..."
              />
            ) : (
              <div className={`p-4 rounded-xl text-sm ${application.invention_description ? 'bg-white border border-gray-100 shadow-sm' : 'bg-amber-50 border border-amber-200'}`}>
                {application.invention_description ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{application.invention_description}</p>
                ) : (
                  <p className="text-amber-700 text-xs font-medium">No description provided. Click Edit to add one for AI generation.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Technical Field</label>
              {editMode ? (
                <input
                  type="text"
                  value={technicalField}
                  onChange={e => setTechnicalField(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="e.g., Computer-implemented methods"
                />
              ) : (
                <p className="text-sm text-gray-700">{application.technical_field || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Problem Solved</label>
              {editMode ? (
                <input
                  type="text"
                  value={problemSolved}
                  onChange={e => setProblemSolved(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="What problem does this solve?"
                />
              ) : (
                <p className="text-sm text-gray-700">{application.problem_solved || 'Not specified'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
