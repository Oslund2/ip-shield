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

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-emerald-400';
    if (score >= 40) return 'bg-amber-400';
    if (score >= 20) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Application Overview</h2>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onAIGenerate}
                disabled={aiGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {aiGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> {application.full_application_status !== 'not_started' ? 'Regenerate with AI' : 'Generate with AI'}</>
                )}
              </button>
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Application Details */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Title</label>
              {editMode ? (
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                />
              ) : (
                <p className="text-sm text-slate-800 font-medium">{application.title}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Inventor</label>
              {editMode ? (
                <input
                  type="text"
                  value={inventorName}
                  onChange={e => setInventorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                  placeholder="Inventor name"
                />
              ) : (
                <p className="text-sm text-slate-700">{application.inventor_name || 'Not specified'}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Filing Type</label>
                {editMode ? (
                  <select
                    value={filingType}
                    onChange={e => setFilingType(e.target.value as PatentApplication['filing_type'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                  >
                    <option value="provisional">Provisional</option>
                    <option value="non_provisional">Non-Provisional</option>
                    <option value="continuation">Continuation</option>
                    <option value="cip">CIP</option>
                    <option value="divisional">Divisional</option>
                  </select>
                ) : (
                  <p className="text-sm text-slate-700">{getFilingTypeLabel(application.filing_type)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</label>
                {editMode ? (
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PatentApplication['status'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
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
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                    {getStatusLabel(application.status)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Citizenship</label>
              <p className="text-sm text-slate-700">{application.inventor_citizenship}</p>
            </div>
          </div>

          {/* Application Summary Stats */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Application Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Version', value: application.version },
                { label: 'Total Claims', value: claimCounts.total, onClick: () => onNavigate('claims') },
                { label: 'Independent', value: claimCounts.independent },
                { label: 'Dependent', value: claimCounts.dependent },
                { label: 'Drawings', value: application.drawings.length, onClick: () => onNavigate('drawings') },
                { label: 'Abstract Words', value: `${countWords(application.abstract || '')}/150` },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-1.5 ${item.onClick ? 'cursor-pointer hover:text-shield-600' : ''}`}
                  onClick={item.onClick}
                >
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-sm font-medium text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Claims Validation */}
          <div className={`border rounded-lg p-4 ${claimValidation.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {claimValidation.valid ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <h3 className="text-sm font-medium text-slate-800">Claims Validation</h3>
            </div>
            {claimValidation.valid ? (
              <p className="text-xs text-emerald-700 ml-6">All claims properly formatted</p>
            ) : (
              <ul className="text-xs text-amber-700 ml-6 space-y-0.5">
                {claimValidation.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column - Scores & Details */}
        <div className="space-y-5">
          {/* Patent Strength Card */}
          {application.novelty_score !== null && application.novelty_score !== undefined && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Award className="w-4 h-4 text-shield-600" />
                  Patent Strength
                </h3>
                {application.full_application_status !== 'not_started' && (
                  <span className="px-2 py-0.5 bg-shield-50 text-shield-600 text-xs font-medium rounded-full border border-shield-200">
                    AI Enhanced
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Novelty Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(application.novelty_score)}`}>
                      {Math.round(application.novelty_score)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(application.novelty_score)}`}
                      style={{ width: `${application.novelty_score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-medium ${getScoreColor(application.novelty_score)}`}>
                      {getScoreLabel(application.novelty_score)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-xl font-bold text-shield-600">
                      {application.novelty_score ? Math.round(application.novelty_score) : '-'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Novelty Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-shield-600">
                      {application.claims?.length || 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Total Claims</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-slate-400 space-y-1">
            <p>Created: {new Date(application.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(application.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Invention Details Section */}
      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-semibold text-slate-800">Invention Details</h3>
          {!application.invention_description && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Required for AI generation
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            {editMode ? (
              <textarea
                value={inventionDescription}
                onChange={e => setInventionDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                placeholder="Describe your invention in detail..."
              />
            ) : (
              <div className={`p-3 rounded-lg text-sm ${application.invention_description ? 'bg-slate-50 border border-slate-200' : 'bg-amber-50 border border-amber-200'}`}>
                {application.invention_description ? (
                  <p className="text-slate-700 whitespace-pre-wrap">{application.invention_description}</p>
                ) : (
                  <p className="text-amber-700 text-xs">No description provided. Click Edit to add one for AI generation.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Technical Field</label>
              {editMode ? (
                <input
                  type="text"
                  value={technicalField}
                  onChange={e => setTechnicalField(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                  placeholder="e.g., Computer-implemented methods"
                />
              ) : (
                <p className="text-sm text-slate-700">{application.technical_field || 'Not specified'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Problem Solved</label>
              {editMode ? (
                <input
                  type="text"
                  value={problemSolved}
                  onChange={e => setProblemSolved(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none"
                  placeholder="What problem does this solve?"
                />
              ) : (
                <p className="text-sm text-slate-700">{application.problem_solved || 'Not specified'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
