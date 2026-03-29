import { useState, useEffect } from 'react';
import {
  Shield,
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
  Type,
  Image as ImageIcon,
  Layers,
  Tag,
  ChevronRight,
  ArrowLeft,
  Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import {
  getTrademarkApplications,
  getTrademarkApplication,
  createTrademarkApplication,
  updateTrademarkApplication,
  updateTrademarkStatus,
  deleteTrademarkApplication,
  getNiceClassifications,
  validateTrademarkCompleteness,
  type TrademarkApplication as TrademarkApp,
  type MarkType,
  type FilingBasis,
  type OwnerType,
  type TrademarkStatus,
  type NiceClassification
} from '../../services/trademark/trademarkApplicationService';

// --- Config ---

const STATUS_CONFIG: Record<TrademarkStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  filed: { label: 'Filed', color: 'text-blue-700', bg: 'bg-blue-50', icon: FileText },
  published: { label: 'Published', color: 'text-purple-700', bg: 'bg-purple-50', icon: Eye },
  opposed: { label: 'Opposed', color: 'text-orange-700', bg: 'bg-orange-50', icon: AlertCircle },
  registered: { label: 'Registered', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
  abandoned: { label: 'Abandoned', color: 'text-gray-500', bg: 'bg-gray-50', icon: X },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50', icon: X },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50', icon: Clock }
};

const MARK_TYPE_CONFIG: Record<MarkType, { label: string; icon: typeof Type }> = {
  word_mark: { label: 'Word Mark', icon: Type },
  design_mark: { label: 'Design Mark', icon: ImageIcon },
  combined_mark: { label: 'Combined Mark', icon: Layers },
  sound_mark: { label: 'Sound Mark', icon: Tag },
  motion_mark: { label: 'Motion Mark', icon: Tag }
};

const FILING_BASIS_OPTIONS: { value: FilingBasis; label: string; description: string }[] = [
  { value: 'use_in_commerce', label: 'Use in Commerce', description: 'Mark is currently being used in commerce (Section 1(a))' },
  { value: 'intent_to_use', label: 'Intent to Use', description: 'Bona fide intent to use the mark in commerce (Section 1(b))' },
  { value: 'foreign_registration', label: 'Foreign Registration', description: 'Based on a foreign registration (Section 44(e))' },
  { value: 'foreign_application', label: 'Foreign Application', description: 'Based on a foreign application (Section 44(d))' }
];

const OWNER_TYPE_OPTIONS: { value: OwnerType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
  { value: 'joint_venture', label: 'Joint Venture' },
  { value: 'other', label: 'Other' }
];

type ViewMode = 'list' | 'detail';

export function TrademarkApplication() {
  const { user: _user } = useAuth();
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const [applications, setApplications] = useState<TrademarkApp[]>([]);
  const [selected, setSelected] = useState<TrademarkApp | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [classifications, setClassifications] = useState<NiceClassification[]>([]);
  const [classSearch, setClassSearch] = useState('');

  // Edit state
  const [editFields, setEditFields] = useState<Record<string, unknown>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Create form
  const [formData, setFormData] = useState({
    markType: 'word_mark' as MarkType,
    markText: '',
    markDescription: '',
    internationalClass: 9,
    goodsServicesDescription: '',
    filingBasis: 'use_in_commerce' as FilingBasis,
    ownerName: '',
    ownerType: 'corporation' as OwnerType,
    ownerCitizenship: 'United States'
  });

  useEffect(() => {
    if (projectId) {
      loadApplications();
      loadClassifications();
    }
  }, [projectId]);

  const loadApplications = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getTrademarkApplications(projectId);
      setApplications(data);
    } catch {
      setError('Failed to load trademark applications');
    } finally {
      setLoading(false);
    }
  };

  const loadClassifications = async () => {
    try {
      const data = await getNiceClassifications();
      setClassifications(data);
    } catch {
      console.error('Failed to load Nice classifications');
    }
  };

  const openDetail = async (app: TrademarkApp) => {
    try {
      const full = await getTrademarkApplication(app.id);
      setSelected(full);
      setEditFields({});
      setIsEditing(false);
      setViewMode('detail');
    } catch {
      setError('Failed to load application details');
    }
  };

  const handleCreate = async () => {
    if (!projectId || !formData.markText.trim() || !formData.ownerName.trim()) {
      setError('Mark text and owner name are required');
      return;
    }
    setSaving(true);
    try {
      const newApp = await createTrademarkApplication(projectId, {
        markType: formData.markType,
        markText: formData.markText,
        markDescription: formData.markDescription || undefined,
        internationalClass: formData.internationalClass,
        goodsServicesDescription: formData.goodsServicesDescription,
        filingBasis: formData.filingBasis,
        ownerName: formData.ownerName,
        ownerType: formData.ownerType,
        ownerCitizenship: formData.ownerCitizenship
      });

      setApplications(prev => [newApp, ...prev]);
      setShowCreateModal(false);
      resetForm();
      openDetail(newApp);
    } catch {
      setError('Failed to create trademark application');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateTrademarkApplication(selected.id, editFields);
      setSelected(updated);
      setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setIsEditing(false);
      setEditFields({});
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: TrademarkStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateTrademarkStatus(selected.id, newStatus);
      setSelected(updated);
      setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)));
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
      await deleteTrademarkApplication(selected.id);
      setApplications(prev => prev.filter(a => a.id !== selected.id));
      setSelected(null);
      setViewMode('list');
      setShowDeleteConfirm(false);
    } catch {
      setError('Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      markType: 'word_mark',
      markText: '',
      markDescription: '',
      internationalClass: 9,
      goodsServicesDescription: '',
      filingBasis: 'use_in_commerce',
      ownerName: '',
      ownerType: 'corporation',
      ownerCitizenship: 'United States'
    });
  };

  const getEditValue = (field: string, fallback: unknown) =>
    field in editFields ? editFields[field] : fallback;

  const setEditValue = (field: string, value: unknown) =>
    setEditFields(prev => ({ ...prev, [field]: value }));

  const filteredClasses = classSearch
    ? classifications.filter(c =>
        c.class_heading.toLowerCase().includes(classSearch.toLowerCase()) ||
        c.class_number.toString().includes(classSearch)
      )
    : classifications;

  // --- Loading ---
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
        <p className="text-gray-500">Select a project to manage trademark applications.</p>
      </div>
    );
  }

  // --- Detail View ---
  if (viewMode === 'detail' && selected) {
    const statusCfg = STATUS_CONFIG[selected.status];
    const StatusIcon = statusCfg.icon;
    const markCfg = MARK_TYPE_CONFIG[selected.mark_type];
    const MarkIcon = markCfg.icon;
    const completion = validateTrademarkCompleteness(selected);
    const completePct = Math.round(((8 - completion.missingFields.length) / 8) * 100);

    return (
      <div className="space-y-6">
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
            <h2 className="text-xl font-semibold text-shield-800">
              {selected.mark_text || 'Design Mark'}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
              <span className="text-sm text-gray-500">{markCfg.label} &middot; Class {selected.international_class}</span>
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
            <span className="text-sm font-medium text-gray-700">Application Completeness</span>
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

        {/* Mark details card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Mark Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="Mark Text">
              {isEditing ? (
                <input
                  className="field-input"
                  value={getEditValue('mark_text', selected.mark_text ?? '') as string}
                  onChange={e => setEditValue('mark_text', e.target.value)}
                />
              ) : (
                <p className="field-value text-lg font-semibold">{selected.mark_text || '-'}</p>
              )}
            </FieldGroup>
            <FieldGroup label="Mark Type">
              {isEditing ? (
                <select
                  className="field-input"
                  value={getEditValue('mark_type', selected.mark_type) as string}
                  onChange={e => setEditValue('mark_type', e.target.value)}
                >
                  {Object.entries(MARK_TYPE_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <MarkIcon className="w-4 h-4 text-gray-500" />
                  <span className="field-value">{markCfg.label}</span>
                </div>
              )}
            </FieldGroup>
            <FieldGroup label="Description" className="md:col-span-2">
              {isEditing ? (
                <textarea
                  className="field-input min-h-[80px]"
                  value={getEditValue('mark_description', selected.mark_description ?? '') as string}
                  onChange={e => setEditValue('mark_description', e.target.value)}
                />
              ) : (
                <p className="field-value">{selected.mark_description || 'No description'}</p>
              )}
            </FieldGroup>
          </div>
        </div>

        {/* Classification card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Nice Classification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="International Class">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="field-input pl-9"
                      placeholder="Search classes..."
                      value={classSearch}
                      onChange={e => setClassSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="field-input"
                    size={5}
                    value={getEditValue('international_class', selected.international_class) as number}
                    onChange={e => setEditValue('international_class', parseInt(e.target.value))}
                  >
                    {filteredClasses.map(c => (
                      <option key={c.class_number} value={c.class_number}>
                        Class {c.class_number} - {c.class_heading}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-shield-600">Class {selected.international_class}</p>
                  {classifications.find(c => c.class_number === selected.international_class) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {classifications.find(c => c.class_number === selected.international_class)!.class_heading}
                    </p>
                  )}
                </div>
              )}
            </FieldGroup>
            <FieldGroup label="Goods/Services Description">
              {isEditing ? (
                <textarea
                  className="field-input min-h-[120px]"
                  value={getEditValue('goods_services_description', selected.goods_services_description) as string}
                  onChange={e => setEditValue('goods_services_description', e.target.value)}
                />
              ) : (
                <p className="field-value">{selected.goods_services_description || 'No description'}</p>
              )}
            </FieldGroup>
          </div>
        </div>

        {/* Filing basis card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Filing Basis</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FILING_BASIS_OPTIONS.map(opt => {
                const isSelected = (getEditValue('filing_basis', selected.filing_basis) as string) === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setEditValue('filing_basis', opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-shield-600 bg-shield-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${isSelected ? 'text-shield-800' : 'text-gray-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-shield-50 rounded-xl border border-shield-200">
              <p className="font-medium text-shield-800">
                {FILING_BASIS_OPTIONS.find(o => o.value === selected.filing_basis)?.label}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {FILING_BASIS_OPTIONS.find(o => o.value === selected.filing_basis)?.description}
              </p>
            </div>
          )}

          {/* First use dates */}
          {(selected.filing_basis === 'use_in_commerce' || (isEditing && getEditValue('filing_basis', selected.filing_basis) === 'use_in_commerce')) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
              <FieldGroup label="First Use Date">
                {isEditing ? (
                  <input
                    type="date"
                    className="field-input"
                    value={getEditValue('first_use_date', selected.first_use_date ?? '') as string}
                    onChange={e => setEditValue('first_use_date', e.target.value)}
                  />
                ) : (
                  <p className="field-value">
                    {selected.first_use_date ? new Date(selected.first_use_date).toLocaleDateString() : '-'}
                  </p>
                )}
              </FieldGroup>
              <FieldGroup label="First Use in Commerce Date">
                {isEditing ? (
                  <input
                    type="date"
                    className="field-input"
                    value={getEditValue('first_use_commerce_date', selected.first_use_commerce_date ?? '') as string}
                    onChange={e => setEditValue('first_use_commerce_date', e.target.value)}
                  />
                ) : (
                  <p className="field-value">
                    {selected.first_use_commerce_date ? new Date(selected.first_use_commerce_date).toLocaleDateString() : '-'}
                  </p>
                )}
              </FieldGroup>
            </div>
          )}
        </div>

        {/* Owner info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Owner Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldGroup label="Owner Name">
              {isEditing ? (
                <input
                  className="field-input"
                  value={getEditValue('owner_name', selected.owner_name) as string}
                  onChange={e => setEditValue('owner_name', e.target.value)}
                />
              ) : (
                <p className="field-value">{selected.owner_name}</p>
              )}
            </FieldGroup>
            <FieldGroup label="Owner Type">
              {isEditing ? (
                <select
                  className="field-input"
                  value={getEditValue('owner_type', selected.owner_type) as string}
                  onChange={e => setEditValue('owner_type', e.target.value)}
                >
                  {OWNER_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <p className="field-value">{OWNER_TYPE_OPTIONS.find(o => o.value === selected.owner_type)?.label}</p>
              )}
            </FieldGroup>
            <FieldGroup label="Citizenship / State of Organization">
              {isEditing ? (
                <input
                  className="field-input"
                  value={getEditValue('owner_citizenship', selected.owner_citizenship ?? '') as string}
                  onChange={e => setEditValue('owner_citizenship', e.target.value)}
                />
              ) : (
                <p className="field-value">{selected.owner_citizenship ?? '-'}</p>
              )}
            </FieldGroup>
          </div>
        </div>

        {/* Status tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-shield-800">Status Tracking</h3>
          <div className="flex flex-wrap gap-2">
            {(['draft', 'pending_review', 'filed', 'published', 'registered'] as TrademarkStatus[]).map(status => {
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
          {selected.serial_number && (
            <div className="p-4 bg-shield-50 rounded-lg border border-shield-200">
              <p className="text-sm text-shield-800">
                <span className="font-semibold">Serial #:</span> {selected.serial_number}
              </p>
            </div>
          )}
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

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <Modal onClose={() => setShowDeleteConfirm(false)}>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Application</h3>
              <p className="text-gray-500">
                Are you sure you want to delete "{selected.mark_text || 'this application'}"? This cannot be undone.
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
          <h2 className="text-xl font-semibold text-shield-800">Trademark Applications</h2>
          <p className="text-sm text-gray-500 mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {/* Application cards */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Shield className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No applications yet</h3>
          <p className="text-gray-500 mb-6">Create your first trademark application to protect your brand.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-shield-600 text-white rounded-lg hover:bg-shield-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Application
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map(app => {
            const cfg = STATUS_CONFIG[app.status];
            const StatusIcon = cfg.icon;
            const markCfg = MARK_TYPE_CONFIG[app.mark_type];
            const MarkIcon = markCfg.icon;
            return (
              <button
                key={app.id}
                onClick={() => openDetail(app)}
                className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-shield-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-shield-50 rounded-xl group-hover:bg-shield-100 transition-colors">
                    <MarkIcon className="w-5 h-5 text-shield-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {app.mark_text || 'Design Mark'}
                    </h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {markCfg.label} &middot; Class {app.international_class}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
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
          <h3 className="text-lg font-semibold text-shield-800 mb-6">New Trademark Application</h3>
          <div className="space-y-5">
            {/* Mark type selector */}
            <FieldGroup label="Mark Type">
              <div className="grid grid-cols-3 gap-2">
                {(['word_mark', 'design_mark', 'combined_mark'] as MarkType[]).map(mt => {
                  const cfg = MARK_TYPE_CONFIG[mt];
                  const Icon = cfg.icon;
                  const isActive = formData.markType === mt;
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, markType: mt }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-shield-600 bg-shield-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-shield-600' : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium ${isActive ? 'text-shield-700' : 'text-gray-600'}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            <FieldGroup label="Mark Text *">
              <input
                className="field-input"
                placeholder="The trademark text"
                value={formData.markText}
                onChange={e => setFormData(f => ({ ...f, markText: e.target.value }))}
              />
            </FieldGroup>

            <FieldGroup label="Description">
              <textarea
                className="field-input min-h-[60px]"
                placeholder="Describe the mark"
                value={formData.markDescription}
                onChange={e => setFormData(f => ({ ...f, markDescription: e.target.value }))}
              />
            </FieldGroup>

            {/* Nice classification */}
            <FieldGroup label="International Class (Nice Classification)">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="field-input pl-9"
                    placeholder="Search classes..."
                    value={classSearch}
                    onChange={e => setClassSearch(e.target.value)}
                  />
                </div>
                <select
                  className="field-input"
                  size={4}
                  value={formData.internationalClass}
                  onChange={e => setFormData(f => ({ ...f, internationalClass: parseInt(e.target.value) }))}
                >
                  {filteredClasses.map(c => (
                    <option key={c.class_number} value={c.class_number}>
                      Class {c.class_number} - {c.class_heading}
                    </option>
                  ))}
                </select>
              </div>
            </FieldGroup>

            <FieldGroup label="Goods/Services Description">
              <textarea
                className="field-input min-h-[60px]"
                placeholder="Describe the goods and/or services"
                value={formData.goodsServicesDescription}
                onChange={e => setFormData(f => ({ ...f, goodsServicesDescription: e.target.value }))}
              />
            </FieldGroup>

            {/* Filing basis */}
            <FieldGroup label="Filing Basis">
              <select
                className="field-input"
                value={formData.filingBasis}
                onChange={e => setFormData(f => ({ ...f, filingBasis: e.target.value as FilingBasis }))}
              >
                {FILING_BASIS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Owner Name *">
                <input
                  className="field-input"
                  placeholder="Full name or entity"
                  value={formData.ownerName}
                  onChange={e => setFormData(f => ({ ...f, ownerName: e.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="Owner Type">
                <select
                  className="field-input"
                  value={formData.ownerType}
                  onChange={e => setFormData(f => ({ ...f, ownerType: e.target.value as OwnerType }))}
                >
                  {OWNER_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FieldGroup>
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
                disabled={saving || !formData.markText.trim() || !formData.ownerName.trim()}
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
