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

const STATUS_CONFIG: Record<TrademarkStatus, { label: string; color: string; bg: string; dot: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-400', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400', icon: Clock },
  filed: { label: 'Filed', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400', icon: FileText },
  published: { label: 'Published', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-400', icon: Eye },
  opposed: { label: 'Opposed', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400', icon: AlertCircle },
  registered: { label: 'Registered', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400', icon: CheckCircle },
  abandoned: { label: 'Abandoned', color: 'text-gray-500', bg: 'bg-gray-50', dot: 'bg-gray-300', icon: X },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-400', icon: X },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-400', icon: Clock }
};

const MARK_TYPE_CONFIG: Record<MarkType, { label: string; icon: typeof Type; description: string }> = {
  word_mark: { label: 'Word Mark', icon: Type, description: 'Text-only trademark' },
  design_mark: { label: 'Design Mark', icon: ImageIcon, description: 'Logo or graphic element' },
  combined_mark: { label: 'Combined Mark', icon: Layers, description: 'Text with design' },
  sound_mark: { label: 'Sound Mark', icon: Tag, description: 'Audio trademark' },
  motion_mark: { label: 'Motion Mark', icon: Tag, description: 'Animated trademark' }
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

const STATUS_FLOW: TrademarkStatus[] = ['draft', 'pending_review', 'filed', 'published', 'registered'];

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
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="card p-16 text-center">
        <Shield className="w-14 h-14 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 text-base">Select a project to manage trademark applications.</p>
      </div>
    );
  }

  // --- Detail View ---
  if (viewMode === 'detail' && selected) {
    const statusCfg = STATUS_CONFIG[selected.status];
    const markCfg = MARK_TYPE_CONFIG[selected.mark_type];
    const MarkIcon = markCfg.icon;
    const completion = validateTrademarkCompleteness(selected);
    const completePct = Math.round(((8 - completion.missingFields.length) / 8) * 100);
    const currentStepIdx = STATUS_FLOW.indexOf(selected.status);

    return (
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Back + header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setViewMode('list'); setSelected(null); }}
            className="p-2.5 rounded-xl hover:bg-amber-50 transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {selected.mark_text || 'Design Mark'}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`badge ${statusCfg.bg} ${statusCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              <span className="text-sm text-gray-400">{markCfg.label} &middot; Class {selected.international_class}</span>
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl hover:from-amber-700 hover:to-orange-600 shadow-sm shadow-amber-200 transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all duration-200"
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
            <span className="text-sm font-semibold text-gray-700">Application Completeness</span>
            <span className="text-sm font-bold text-amber-600">{completePct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completePct}%` }}
            />
          </div>
          {completion.missingFields.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Missing: {completion.missingFields.join(', ')}
            </p>
          )}
        </div>

        {/* Card sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mark details card */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <MarkIcon className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Mark Details</h3>
            </div>
            <FieldGroup label="Mark Text">
              {isEditing ? (
                <input
                  className="field-input"
                  value={getEditValue('mark_text', selected.mark_text ?? '') as string}
                  onChange={e => setEditValue('mark_text', e.target.value)}
                />
              ) : (
                <p className="text-xl font-bold text-gray-900">{selected.mark_text || '-'}</p>
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
                  <MarkIcon className="w-4 h-4 text-amber-500" />
                  <span className="field-value">{markCfg.label}</span>
                </div>
              )}
            </FieldGroup>
            <FieldGroup label="Description">
              {isEditing ? (
                <textarea
                  className="field-input min-h-[80px]"
                  value={getEditValue('mark_description', selected.mark_description ?? '') as string}
                  onChange={e => setEditValue('mark_description', e.target.value)}
                />
              ) : (
                <p className="field-value text-gray-500">{selected.mark_description || 'No description'}</p>
              )}
            </FieldGroup>
          </div>

          {/* Classification card */}
          <div className="card p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900">Nice Classification</h3>
            <FieldGroup label="International Class">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="field-input pl-10"
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
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-2xl font-bold text-amber-600">Class {selected.international_class}</span>
                  </div>
                  {classifications.find(c => c.class_number === selected.international_class) && (
                    <p className="text-sm text-gray-500 mt-2">
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
                <p className="field-value text-gray-500">{selected.goods_services_description || 'No description'}</p>
              )}
            </FieldGroup>
          </div>

          {/* Filing basis card */}
          <div className="card p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900">Filing Basis</h3>
            {isEditing ? (
              <div className="grid grid-cols-1 gap-3">
                {FILING_BASIS_OPTIONS.map(opt => {
                  const isSelected = (getEditValue('filing_basis', selected.filing_basis) as string) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setEditValue('filing_basis', opt.value)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 shadow-sm shadow-amber-100'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected ? 'border-amber-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isSelected ? 'text-amber-800' : 'text-gray-700'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="font-semibold text-amber-800">
                  {FILING_BASIS_OPTIONS.find(o => o.value === selected.filing_basis)?.label}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {FILING_BASIS_OPTIONS.find(o => o.value === selected.filing_basis)?.description}
                </p>
              </div>
            )}

            {/* First use dates */}
            {(selected.filing_basis === 'use_in_commerce' || (isEditing && getEditValue('filing_basis', selected.filing_basis) === 'use_in_commerce')) && (
              <div className="grid grid-cols-1 gap-4 pt-3">
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
          <div className="card p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900">Owner Information</h3>
            <FieldGroup label="Owner Name">
              {isEditing ? (
                <input
                  className="field-input"
                  value={getEditValue('owner_name', selected.owner_name) as string}
                  onChange={e => setEditValue('owner_name', e.target.value)}
                />
              ) : (
                <p className="field-value font-medium">{selected.owner_name}</p>
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
                        ? 'bg-amber-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200'
                        : isPast
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${
                      isCurrent ? 'text-amber-700' : isPast ? 'text-amber-500' : 'text-gray-400'
                    }`}>
                      {cfg.label}
                    </span>
                  </button>
                  {!isLast && (
                    <div className={`w-8 h-0.5 flex-shrink-0 rounded ${
                      isPast ? 'bg-amber-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          {selected.serial_number && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800 font-medium">
                Serial #{selected.serial_number}
              </p>
            </div>
          )}
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

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <Modal onClose={() => setShowDeleteConfirm(false)}>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Application</h3>
              <p className="text-gray-500">
                Are you sure you want to delete "{selected.mark_text || 'this application'}"? This cannot be undone.
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
          <h2 className="text-2xl font-bold text-gray-900">Trademark Applications</h2>
          <p className="text-sm text-gray-400 mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl hover:from-amber-700 hover:to-orange-600 shadow-sm shadow-amber-200 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {/* Application cards - GRID layout */}
      {applications.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-8 h-8 text-amber-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No applications yet</h3>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">Create your first trademark application to protect your brand.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl hover:from-amber-700 hover:to-orange-600 shadow-sm shadow-amber-200 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Application
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map(app => {
            const cfg = STATUS_CONFIG[app.status];
            const markCfg = MARK_TYPE_CONFIG[app.mark_type];
            const MIcon = markCfg.icon;
            return (
              <button
                key={app.id}
                onClick={() => openDetail(app)}
                className="card p-5 text-left hover:shadow-md hover:border-amber-200 transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors duration-200">
                    <MIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {app.mark_text || 'Design Mark'}
                      </h4>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {markCfg.label} &middot; Class {app.international_class}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`badge ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
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
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Tag className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">New Trademark Application</h3>
          </div>
          <div className="space-y-5">
            {/* Mark type selector - large icon cards */}
            <FieldGroup label="Mark Type">
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(MARK_TYPE_CONFIG) as [MarkType, typeof MARK_TYPE_CONFIG[MarkType]][]).slice(0, 3).map(([mt, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = formData.markType === mt;
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, markType: mt }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                        isActive
                          ? 'border-amber-500 bg-amber-50 shadow-sm shadow-amber-100'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-xs font-semibold ${isActive ? 'text-amber-700' : 'text-gray-500'}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-gray-400 text-center leading-tight">{cfg.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {(Object.entries(MARK_TYPE_CONFIG) as [MarkType, typeof MARK_TYPE_CONFIG[MarkType]][]).slice(3).map(([mt, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = formData.markType === mt;
                  return (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, markType: mt }))}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                        isActive
                          ? 'border-amber-500 bg-amber-50 shadow-sm shadow-amber-100'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${isActive ? 'text-amber-700' : 'text-gray-500'}`}>
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

            {/* Nice classification with search */}
            <FieldGroup label="International Class (Nice Classification)">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="field-input pl-10"
                    placeholder="Search classes..."
                    value={classSearch}
                    onChange={e => setClassSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50">
                  {filteredClasses.map(c => {
                    const isActive = formData.internationalClass === c.class_number;
                    return (
                      <button
                        key={c.class_number}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, internationalClass: c.class_number }))}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                          isActive
                            ? 'bg-amber-50 text-amber-800 font-medium'
                            : 'hover:bg-white text-gray-600'
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center w-8 h-5 rounded text-xs font-bold mr-2 ${
                          isActive ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {c.class_number}
                        </span>
                        {c.class_heading}
                      </button>
                    );
                  })}
                </div>
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

            {/* Filing basis - visual radio cards */}
            <FieldGroup label="Filing Basis">
              <div className="grid grid-cols-1 gap-2">
                {FILING_BASIS_OPTIONS.map(opt => {
                  const isActive = formData.filingBasis === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, filingBasis: opt.value }))}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isActive ? 'border-amber-500' : 'border-gray-300'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-amber-800' : 'text-gray-600'}`}>{opt.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.markText.trim() || !formData.ownerName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl hover:from-amber-700 hover:to-orange-600 shadow-sm shadow-amber-200 transition-all duration-200 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Application
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
