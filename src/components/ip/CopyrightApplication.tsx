import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Loader2,
  X,
  Eye,
  Bot,
  BookOpen,
  Code2,
  Library,
  Package,
  Layers,
  ChevronRight,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import {
  getCopyrightRegistrations,
  getCopyrightRegistration,
  createCopyrightRegistration,
  updateCopyrightRegistration,
  updateCopyrightStatus,
  deleteCopyrightRegistration,
  validateRegistrationCompleteness,
  type CopyrightRegistration,
  type CopyrightRegistrationType,
  type CopyrightWorkType,
  type CopyrightStatus,
  type PublicationStatus,
  type AuthorType
} from '../../services/copyright/copyrightApplicationService';

// --- Config ---

const STATUS_CONFIG: Record<CopyrightStatus, { label: string; color: string; bg: string; dot: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-400', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400', icon: FileText },
  under_examination: { label: 'Under Examination', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-400', icon: Eye },
  registered: { label: 'Registered', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-400', icon: AlertCircle },
  abandoned: { label: 'Abandoned', color: 'text-gray-500', bg: 'bg-gray-50', dot: 'bg-gray-300', icon: X }
};

const REG_TYPE_CONFIG: Record<CopyrightRegistrationType, { label: string; icon: typeof Code2; description: string }> = {
  source_code: { label: 'Source Code', icon: Code2, description: 'Individual source files' },
  module: { label: 'Module', icon: Package, description: 'Standalone module or package' },
  library: { label: 'Library', icon: Library, description: 'Reusable library' },
  application: { label: 'Application', icon: BookOpen, description: 'Complete application' },
  collection: { label: 'Collection', icon: Layers, description: 'Collection of works' }
};

const WORK_TYPE_OPTIONS: { value: CopyrightWorkType; label: string }[] = [
  { value: 'literary_work', label: 'Literary Work' },
  { value: 'compilation', label: 'Compilation' },
  { value: 'audiovisual', label: 'Audiovisual' },
  { value: 'sound_recording', label: 'Sound Recording' }
];

const AUTHOR_TYPE_OPTIONS: { value: AuthorType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'work_for_hire', label: 'Work for Hire' },
  { value: 'joint_work', label: 'Joint Work' },
  { value: 'collective_work', label: 'Collective Work' },
  { value: 'anonymous', label: 'Anonymous' },
  { value: 'pseudonymous', label: 'Pseudonymous' }
];

const STATUS_FLOW: CopyrightStatus[] = ['draft', 'pending_review', 'submitted', 'under_examination', 'registered'];

type ViewMode = 'list' | 'detail';

export function CopyrightApplication() {
  const { user: _user } = useAuth();
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const [registrations, setRegistrations] = useState<CopyrightRegistration[]>([]);
  const [selected, setSelected] = useState<CopyrightRegistration | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state for detail view
  const [editFields, setEditFields] = useState<Record<string, unknown>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Create form
  const [formData, setFormData] = useState({
    title: '',
    registrationType: 'source_code' as CopyrightRegistrationType,
    workType: 'literary_work' as CopyrightWorkType,
    description: '',
    authorName: '',
    authorType: 'individual' as AuthorType,
    authorCitizenship: 'United States',
    yearOfCompletion: new Date().getFullYear(),
    publicationStatus: 'unpublished' as PublicationStatus,
    containsAIGeneratedContent: false,
    aiContributionPercentage: 0,
    aiToolsUsed: '' // comma-separated string for UI simplicity
  });

  useEffect(() => {
    if (projectId) loadRegistrations();
  }, [projectId]);

  const loadRegistrations = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getCopyrightRegistrations(projectId);
      setRegistrations(data);
    } catch {
      setError('Failed to load copyright registrations');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (reg: CopyrightRegistration) => {
    try {
      const full = await getCopyrightRegistration(reg.id);
      setSelected(full);
      setEditFields({});
      setIsEditing(false);
      setViewMode('detail');
    } catch {
      setError('Failed to load registration details');
    }
  };

  const handleCreate = async () => {
    if (!projectId || !formData.title.trim() || !formData.authorName.trim()) {
      setError('Title and author name are required');
      return;
    }
    setSaving(true);
    try {
      const aiTools = formData.aiToolsUsed
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const newReg = await createCopyrightRegistration(projectId, {
        title: formData.title,
        registrationType: formData.registrationType,
        workType: formData.workType,
        description: formData.description || undefined,
        yearOfCompletion: formData.yearOfCompletion,
        publicationStatus: formData.publicationStatus,
        authorName: formData.authorName,
        authorType: formData.authorType,
        authorCitizenship: formData.authorCitizenship,
        containsAIGeneratedContent: formData.containsAIGeneratedContent,
        aiContributionPercentage: formData.aiContributionPercentage,
        aiToolsUsed: aiTools
      });

      setRegistrations(prev => [newReg, ...prev]);
      setShowCreateModal(false);
      resetForm();
      openDetail(newReg);
    } catch {
      setError('Failed to create registration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateCopyrightRegistration(selected.id, editFields);
      setSelected(updated);
      setRegistrations(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      setIsEditing(false);
      setEditFields({});
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: CopyrightStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateCopyrightStatus(selected.id, newStatus);
      setSelected(updated);
      setRegistrations(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } catch {
      setError('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteCopyrightRegistration(selected.id);
      setRegistrations(prev => prev.filter(r => r.id !== selected.id));
      setSelected(null);
      setViewMode('list');
      setShowDeleteConfirm(false);
    } catch {
      setError('Failed to delete registration');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      registrationType: 'source_code',
      workType: 'literary_work',
      description: '',
      authorName: '',
      authorType: 'individual',
      authorCitizenship: 'United States',
      yearOfCompletion: new Date().getFullYear(),
      publicationStatus: 'unpublished',
      containsAIGeneratedContent: false,
      aiContributionPercentage: 0,
      aiToolsUsed: ''
    });
  };

  const getEditValue = (field: string, fallback: unknown) =>
    field in editFields ? editFields[field] : fallback;

  const setEditValue = (field: string, value: unknown) =>
    setEditFields(prev => ({ ...prev, [field]: value }));

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="card p-16 text-center">
        <Shield className="w-14 h-14 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 text-base">Select a project to manage copyright registrations.</p>
      </div>
    );
  }

  // --- Detail View ---
  if (viewMode === 'detail' && selected) {
    const statusCfg = STATUS_CONFIG[selected.status];
    const regTypeCfg = REG_TYPE_CONFIG[selected.registration_type];
    const completion = validateRegistrationCompleteness(selected);
    const completePct = Math.round(((10 - completion.missingFields.length) / 10) * 100);
    const currentStepIdx = STATUS_FLOW.indexOf(selected.status);
    const aiPct = getEditValue('ai_contribution_percentage', selected.ai_contribution_percentage) as number;

    return (
      <div className="space-y-6">
        {/* Error banner */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Back + header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setViewMode('list'); setSelected(null); }}
            className="p-2.5 rounded-xl hover:bg-purple-50 transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{selected.title}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`badge ${statusCfg.bg} ${statusCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              <span className="text-sm text-gray-400">{regTypeCfg.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setEditFields({}); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetail}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl hover:from-purple-700 hover:to-violet-700 shadow-sm shadow-purple-200 transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Completion bar */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Registration Completeness</span>
            <span className="text-sm font-bold text-purple-600">{completePct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-purple-500 to-violet-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completePct}%` }}
            />
          </div>
          {completion.missingFields.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Missing: {completion.missingFields.join(', ')}
            </p>
          )}
        </div>

        {/* Two column layout: work details + AI disclosure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Work Details (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900">Work Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="Title">
                  {isEditing ? (
                    <input
                      className="field-input"
                      value={getEditValue('title', selected.title) as string}
                      onChange={e => setEditValue('title', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{selected.title}</p>
                  )}
                </FieldGroup>
                <FieldGroup label="Registration Type">
                  {isEditing ? (
                    <select
                      className="field-input"
                      value={getEditValue('registration_type', selected.registration_type) as string}
                      onChange={e => setEditValue('registration_type', e.target.value)}
                    >
                      {Object.entries(REG_TYPE_CONFIG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="field-value">{regTypeCfg.label}</p>
                  )}
                </FieldGroup>
                <FieldGroup label="Work Type">
                  {isEditing ? (
                    <select
                      className="field-input"
                      value={getEditValue('work_type', selected.work_type) as string}
                      onChange={e => setEditValue('work_type', e.target.value)}
                    >
                      {WORK_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="field-value">{WORK_TYPE_OPTIONS.find(o => o.value === selected.work_type)?.label}</p>
                  )}
                </FieldGroup>
                <FieldGroup label="Year of Completion">
                  {isEditing ? (
                    <input
                      type="number"
                      className="field-input"
                      value={getEditValue('year_of_completion', selected.year_of_completion ?? '') as number}
                      onChange={e => setEditValue('year_of_completion', parseInt(e.target.value) || null)}
                    />
                  ) : (
                    <p className="field-value">{selected.year_of_completion ?? '-'}</p>
                  )}
                </FieldGroup>
                <FieldGroup label="Description" className="md:col-span-2">
                  {isEditing ? (
                    <textarea
                      className="field-input min-h-[80px]"
                      value={getEditValue('description', selected.description ?? '') as string}
                      onChange={e => setEditValue('description', e.target.value)}
                    />
                  ) : (
                    <p className="field-value text-gray-500">{selected.description || 'No description'}</p>
                  )}
                </FieldGroup>
              </div>
            </div>

            {/* Author info card */}
            <div className="card p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900">Author Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="Author Name">
                  {isEditing ? (
                    <input
                      className="field-input"
                      value={getEditValue('author_name', selected.author_name) as string}
                      onChange={e => setEditValue('author_name', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{selected.author_name}</p>
                  )}
                </FieldGroup>
                <FieldGroup label="Author Type">
                  {isEditing ? (
                    <select
                      className="field-input"
                      value={getEditValue('author_type', selected.author_type) as string}
                      onChange={e => setEditValue('author_type', e.target.value)}
                    >
                      {AUTHOR_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="field-value">{AUTHOR_TYPE_OPTIONS.find(o => o.value === selected.author_type)?.label}</p>
                  )}
                </FieldGroup>
                <FieldGroup label="Citizenship">
                  {isEditing ? (
                    <input
                      className="field-input"
                      value={getEditValue('author_citizenship', selected.author_citizenship ?? '') as string}
                      onChange={e => setEditValue('author_citizenship', e.target.value)}
                    />
                  ) : (
                    <p className="field-value">{selected.author_citizenship ?? '-'}</p>
                  )}
                </FieldGroup>
              </div>
            </div>
          </div>

          {/* Right: AI Authorship Disclosure (1 col) */}
          <div className="space-y-6">
            <div className="card p-6 space-y-5 border-purple-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">AI Disclosure</h3>
              </div>

              <FieldGroup label="Contains AI Content">
                {isEditing ? (
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                      checked={getEditValue('contains_ai_generated_content', selected.contains_ai_generated_content) as boolean}
                      onChange={e => setEditValue('contains_ai_generated_content', e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">Yes, includes AI-generated content</span>
                  </label>
                ) : (
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                    selected.contains_ai_generated_content
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${selected.contains_ai_generated_content ? 'bg-purple-400' : 'bg-gray-300'}`} />
                    {selected.contains_ai_generated_content ? 'Yes' : 'No'}
                  </div>
                )}
              </FieldGroup>

              <FieldGroup label="AI Contribution">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="relative pt-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                        value={aiPct}
                        onChange={e => setEditValue('ai_contribution_percentage', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="text-3xl font-bold text-purple-600">{aiPct}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke="url(#purpleGrad)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(selected.ai_contribution_percentage / 100) * 264} 264`}
                          />
                          <defs>
                            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#9333ea" />
                              <stop offset="100%" stopColor="#7c3aed" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-900">{selected.ai_contribution_percentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </FieldGroup>

              <FieldGroup label="AI Tools Used">
                {isEditing ? (
                  <input
                    className="field-input"
                    placeholder="e.g., ChatGPT, Copilot, Claude"
                    value={getEditValue('ai_tools_used', (selected.ai_tools_used || []).join(', ')) as string}
                    onChange={e => setEditValue('ai_tools_used', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(selected.ai_tools_used || []).length > 0 ? (
                      selected.ai_tools_used.map((tool, i) => (
                        <span key={i} className="badge bg-purple-50 text-purple-700 border border-purple-200">
                          {tool}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">None specified</span>
                    )}
                  </div>
                )}
              </FieldGroup>

              <FieldGroup label="Human Authorship Statement">
                {isEditing ? (
                  <textarea
                    className="field-input min-h-[100px]"
                    placeholder="Describe the human-authored creative elements..."
                    value={getEditValue('human_authorship_statement', selected.human_authorship_statement ?? '') as string}
                    onChange={e => setEditValue('human_authorship_statement', e.target.value)}
                  />
                ) : (
                  <p className="field-value text-gray-500 text-xs leading-relaxed">{selected.human_authorship_statement || 'No statement provided'}</p>
                )}
              </FieldGroup>
            </div>
          </div>
        </div>

        {/* Status stepper */}
        <div className="card p-6 space-y-5">
          <h3 className="text-lg font-bold text-gray-900">Status Tracking</h3>
          <div className="flex items-center gap-0">
            {STATUS_FLOW.map((status, idx) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const isCurrent = selected.status === status;
              const isPast = currentStepIdx >= 0 && idx < currentStepIdx;
              const isLast = idx === STATUS_FLOW.length - 1;
              return (
                <div key={status} className="flex items-center flex-1">
                  <button
                    onClick={() => !isCurrent && handleStatusChange(status)}
                    disabled={saving || isCurrent}
                    className={`flex flex-col items-center gap-2 flex-1 py-3 rounded-xl transition-all duration-200 ${
                      isCurrent
                        ? 'bg-purple-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-md shadow-purple-200'
                        : isPast
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${
                      isCurrent ? 'text-purple-700' : isPast ? 'text-purple-500' : 'text-gray-400'
                    }`}>
                      {cfg.label}
                    </span>
                  </button>
                  {!isLast && (
                    <div className={`w-8 h-0.5 flex-shrink-0 rounded ${
                      isPast ? 'bg-purple-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          {selected.registration_number && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-sm text-emerald-800 font-medium">
                Registration #{selected.registration_number}
              </p>
              {selected.registration_date && (
                <p className="text-sm text-emerald-600 mt-1">
                  Registered on {new Date(selected.registration_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <Modal onClose={() => setShowDeleteConfirm(false)}>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Registration</h3>
              <p className="text-gray-500">
                Are you sure you want to delete "{selected.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="space-y-8">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Copyright Registrations</h2>
          <p className="text-sm text-gray-400 mt-1">{registrations.length} registration{registrations.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl hover:from-purple-700 hover:to-violet-700 shadow-sm shadow-purple-200 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Registration
        </button>
      </div>

      {/* Registration cards - GRID layout */}
      {registrations.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileText className="w-8 h-8 text-purple-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No registrations yet</h3>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">Create your first copyright registration to protect your work.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl hover:from-purple-700 hover:to-violet-700 shadow-sm shadow-purple-200 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Registration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registrations.map(reg => {
            const cfg = STATUS_CONFIG[reg.status];
            const typeCfg = REG_TYPE_CONFIG[reg.registration_type];
            const TypeIcon = typeCfg.icon;
            return (
              <button
                key={reg.id}
                onClick={() => openDetail(reg)}
                className="card p-5 text-left hover:shadow-md hover:border-purple-200 transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors duration-200">
                    <TypeIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-gray-900 truncate">{reg.title}</h4>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{typeCfg.label} &middot; {reg.work_type.replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`badge ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {reg.contains_ai_generated_content && (
                        <span className="badge bg-purple-50 text-purple-600 border border-purple-200">
                          <Bot className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">New Copyright Registration</h3>
          </div>
          <div className="space-y-5">
            <FieldGroup label="Title *">
              <input
                className="field-input"
                placeholder="Name of the work"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              />
            </FieldGroup>

            {/* Visual type selector */}
            <FieldGroup label="Registration Type">
              <div className="grid grid-cols-5 gap-2">
                {(Object.entries(REG_TYPE_CONFIG) as [CopyrightRegistrationType, typeof REG_TYPE_CONFIG[CopyrightRegistrationType]][]).map(([val, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = formData.registrationType === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, registrationType: val }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                        isActive
                          ? 'border-purple-500 bg-purple-50 shadow-sm shadow-purple-100'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`text-[10px] font-medium leading-tight text-center ${isActive ? 'text-purple-700' : 'text-gray-500'}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            <FieldGroup label="Work Type">
              <select
                className="field-input"
                value={formData.workType}
                onChange={e => setFormData(f => ({ ...f, workType: e.target.value as CopyrightWorkType }))}
              >
                {WORK_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Description">
              <textarea
                className="field-input min-h-[80px]"
                placeholder="Brief description of the work"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Author Name *">
                <input
                  className="field-input"
                  placeholder="Full name"
                  value={formData.authorName}
                  onChange={e => setFormData(f => ({ ...f, authorName: e.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="Author Type">
                <select
                  className="field-input"
                  value={formData.authorType}
                  onChange={e => setFormData(f => ({ ...f, authorType: e.target.value as AuthorType }))}
                >
                  {AUTHOR_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FieldGroup>
            </div>

            {/* AI section in create modal */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 bg-purple-50 rounded-lg">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-bold text-gray-700">AI Authorship Disclosure</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors mb-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                  checked={formData.containsAIGeneratedContent}
                  onChange={e => setFormData(f => ({ ...f, containsAIGeneratedContent: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">This work contains AI-generated content</span>
              </label>
              {formData.containsAIGeneratedContent && (
                <div className="space-y-4 pl-5 border-l-2 border-purple-200">
                  <FieldGroup label="AI Contribution">
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                        value={formData.aiContributionPercentage}
                        onChange={e => setFormData(f => ({ ...f, aiContributionPercentage: parseInt(e.target.value) }))}
                      />
                      <div className="text-center">
                        <span className="text-2xl font-bold text-purple-600">{formData.aiContributionPercentage}%</span>
                      </div>
                    </div>
                  </FieldGroup>
                  <FieldGroup label="AI Tools Used">
                    <input
                      className="field-input"
                      placeholder="e.g., ChatGPT, Copilot, Claude"
                      value={formData.aiToolsUsed}
                      onChange={e => setFormData(f => ({ ...f, aiToolsUsed: e.target.value }))}
                    />
                  </FieldGroup>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.title.trim() || !formData.authorName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl hover:from-purple-700 hover:to-violet-700 shadow-sm shadow-purple-200 transition-all duration-200 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Registration
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Shared sub-components ---

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-7">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function FieldGroup({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-red-600">{message}</p>
      <button onClick={onDismiss} className="text-red-300 hover:text-red-500 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
