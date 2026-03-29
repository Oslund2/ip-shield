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

const STATUS_CONFIG: Record<CopyrightStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50', icon: FileText },
  under_examination: { label: 'Under Examination', color: 'text-purple-700', bg: 'bg-purple-50', icon: Eye },
  registered: { label: 'Registered', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', icon: AlertCircle },
  abandoned: { label: 'Abandoned', color: 'text-gray-500', bg: 'bg-gray-50', icon: X }
};

const REG_TYPE_CONFIG: Record<CopyrightRegistrationType, { label: string; icon: typeof Code2 }> = {
  source_code: { label: 'Source Code', icon: Code2 },
  module: { label: 'Module', icon: Package },
  library: { label: 'Library', icon: Library },
  application: { label: 'Application', icon: BookOpen },
  collection: { label: 'Collection', icon: Layers }
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
        <Loader2 className="w-8 h-8 animate-spin text-shield-600" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Select a project to manage copyright registrations.</p>
      </div>
    );
  }

  // --- Detail View ---
  if (viewMode === 'detail' && selected) {
    const statusCfg = STATUS_CONFIG[selected.status];
    const StatusIcon = statusCfg.icon;
    const regTypeCfg = REG_TYPE_CONFIG[selected.registration_type];
    const completion = validateRegistrationCompleteness(selected);
    const completePct = Math.round(((10 - completion.missingFields.length) / 10) * 100);

    return (
      <div className="space-y-6">
        {/* Error banner */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Back + header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setViewMode('list'); setSelected(null); }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-shield-800">{selected.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
              <span className="text-sm text-gray-500">{regTypeCfg.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setEditFields({}); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetail}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-shield-600 rounded-lg hover:bg-shield-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm text-shield-600 border border-shield-200 rounded-lg hover:bg-shield-50 transition-colors flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Completion bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Registration Completeness</span>
            <span className="text-sm font-semibold text-shield-600">{completePct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-shield-600 h-2 rounded-full transition-all"
              style={{ width: `${completePct}%` }}
            />
          </div>
          {completion.missingFields.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Missing: {completion.missingFields.join(', ')}
            </p>
          )}
        </div>

        {/* Work details card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Work Details</h3>
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
                <p className="field-value">{selected.description || 'No description'}</p>
              )}
            </FieldGroup>
          </div>
        </div>

        {/* Author info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Author Information</h3>
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

        {/* AI Authorship Disclosure card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-shield-800">AI Authorship Disclosure</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="Contains AI-Generated Content">
              {isEditing ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-shield-600 border-gray-300"
                    checked={getEditValue('contains_ai_generated_content', selected.contains_ai_generated_content) as boolean}
                    onChange={e => setEditValue('contains_ai_generated_content', e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Yes, this work includes AI-generated content</span>
                </label>
              ) : (
                <p className="field-value">{selected.contains_ai_generated_content ? 'Yes' : 'No'}</p>
              )}
            </FieldGroup>

            <FieldGroup label="AI Contribution Percentage">
              {isEditing ? (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="flex-1"
                    value={getEditValue('ai_contribution_percentage', selected.ai_contribution_percentage) as number}
                    onChange={e => setEditValue('ai_contribution_percentage', parseInt(e.target.value))}
                  />
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {getEditValue('ai_contribution_percentage', selected.ai_contribution_percentage) as number}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${selected.ai_contribution_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{selected.ai_contribution_percentage}%</span>
                </div>
              )}
            </FieldGroup>

            <FieldGroup label="AI Tools Used" className="md:col-span-2">
              {isEditing ? (
                <input
                  className="field-input"
                  placeholder="e.g., ChatGPT, GitHub Copilot, Claude"
                  value={getEditValue('ai_tools_used', (selected.ai_tools_used || []).join(', ')) as string}
                  onChange={e => setEditValue('ai_tools_used', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(selected.ai_tools_used || []).length > 0 ? (
                    selected.ai_tools_used.map((tool, i) => (
                      <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                        {tool}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">None specified</span>
                  )}
                </div>
              )}
            </FieldGroup>

            <FieldGroup label="Human Authorship Statement" className="md:col-span-2">
              {isEditing ? (
                <textarea
                  className="field-input min-h-[80px]"
                  placeholder="Describe the human-authored creative elements of this work..."
                  value={getEditValue('human_authorship_statement', selected.human_authorship_statement ?? '') as string}
                  onChange={e => setEditValue('human_authorship_statement', e.target.value)}
                />
              ) : (
                <p className="field-value">{selected.human_authorship_statement || 'No statement provided'}</p>
              )}
            </FieldGroup>
          </div>
        </div>

        {/* Status tracking card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Status Tracking</h3>
          <div className="flex flex-wrap gap-2">
            {(['draft', 'pending_review', 'submitted', 'under_examination', 'registered'] as CopyrightStatus[]).map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const isCurrent = selected.status === status;
              return (
                <button
                  key={status}
                  onClick={() => !isCurrent && handleStatusChange(status)}
                  disabled={saving || isCurrent}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-shield-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          {selected.registration_number && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-800">
                <span className="font-semibold">Registration #:</span> {selected.registration_number}
              </p>
              {selected.registration_date && (
                <p className="text-sm text-emerald-700 mt-1">
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
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Registration</h3>
              <p className="text-gray-500">
                Are you sure you want to delete "{selected.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
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
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-shield-800">Copyright Registrations</h2>
          <p className="text-sm text-gray-500 mt-1">{registrations.length} registration{registrations.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Registration
        </button>
      </div>

      {/* Registration cards */}
      {registrations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No registrations yet</h3>
          <p className="text-gray-500 mb-6">Create your first copyright registration to protect your work.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-shield-600 text-white rounded-lg hover:bg-shield-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Registration
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {registrations.map(reg => {
            const cfg = STATUS_CONFIG[reg.status];
            const StatusIcon = cfg.icon;
            const typeCfg = REG_TYPE_CONFIG[reg.registration_type];
            const TypeIcon = typeCfg.icon;
            return (
              <button
                key={reg.id}
                onClick={() => openDetail(reg)}
                className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-shield-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-shield-50 rounded-xl group-hover:bg-shield-100 transition-colors">
                    <TypeIcon className="w-5 h-5 text-shield-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{reg.title}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{typeCfg.label} &middot; {reg.work_type.replace('_', ' ')}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  {reg.contains_ai_generated_content && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
                      <Bot className="w-3 h-3" />
                      AI
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-shield-600 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h3 className="text-lg font-semibold text-shield-800 mb-6">New Copyright Registration</h3>
          <div className="space-y-5">
            <FieldGroup label="Title *">
              <input
                className="field-input"
                placeholder="Name of the work"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Registration Type">
                <select
                  className="field-input"
                  value={formData.registrationType}
                  onChange={e => setFormData(f => ({ ...f, registrationType: e.target.value as CopyrightRegistrationType }))}
                >
                  {Object.entries(REG_TYPE_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
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
            </div>

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
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">AI Authorship Disclosure</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-shield-600 border-gray-300"
                  checked={formData.containsAIGeneratedContent}
                  onChange={e => setFormData(f => ({ ...f, containsAIGeneratedContent: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">This work contains AI-generated content</span>
              </label>
              {formData.containsAIGeneratedContent && (
                <div className="space-y-4 pl-6 border-l-2 border-purple-200">
                  <FieldGroup label="AI Contribution %">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="flex-1"
                        value={formData.aiContributionPercentage}
                        onChange={e => setFormData(f => ({ ...f, aiContributionPercentage: parseInt(e.target.value) }))}
                      />
                      <span className="text-sm font-medium w-12 text-right">{formData.aiContributionPercentage}%</span>
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
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.title.trim() || !formData.authorName.trim()}
                className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-shield-600 rounded-lg hover:bg-shield-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-red-700">{message}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
