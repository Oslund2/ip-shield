import { useState, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, CheckCircle, AlertCircle,
  Plus, Trash2, Download, Printer, User, MapPin, Briefcase,
  Building, FileText, Shield, DollarSign
} from 'lucide-react';
import {
  validateCoverSheetData,
  createDefaultInventor,
  createDefaultCorrespondenceAddress,
  generateCoverSheetHTML,
  downloadCoverSheet,
  downloadFeeTransmittal,
  type CoverSheetData,
  type Inventor,
  type CorrespondenceAddress,
  type AttorneyInfo,
  type FeeTransmittalData,
} from '../../../services/patent/coverSheetService';
import {
  calculateFilingFee,
  formatCurrency,
  estimatePageCount,
  type EntityStatus,
  type FilingType,
} from '../../../services/patent/filingFeeService';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SB16FormWizardProps {
  application: {
    id: string;
    title: string;
    inventor_name?: string | null;
    inventor_citizenship?: string;
    inventors?: any[];
    correspondence_address?: any | null;
    attorney_info?: any | null;
    entity_status?: string | null;
    government_interest?: string | null;
    filing_type?: string | null;
    specification?: string | null;
    abstract?: string | null;
    claims: any[];
    drawings: any[];
    metadata?: any;
  };
  onClose: () => void;
  onSave: (data: CoverSheetData) => void;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS = [
  { key: 'inventors', label: 'Title & Inventors', icon: User },
  { key: 'address', label: 'Correspondence', icon: MapPin },
  { key: 'attorney', label: 'Attorney / Agent', icon: Briefcase },
  { key: 'entity', label: 'Entity & Gov', icon: Shield },
  { key: 'fees', label: 'Fee Transmittal', icon: DollarSign },
  { key: 'review', label: 'Review & Generate', icon: FileText },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractInventors(app: SB16FormWizardProps['application']): Inventor[] {
  if (app.inventors && Array.isArray(app.inventors) && app.inventors.length > 0) {
    return app.inventors.map((inv: any) => ({
      id: inv.id || crypto.randomUUID(),
      fullName: inv.fullName || inv.full_name || '',
      residence: {
        city: inv.residence?.city || '',
        state: inv.residence?.state || '',
        country: inv.residence?.country || 'US',
      },
      citizenship: inv.citizenship || 'US',
      mailingAddress: inv.mailingAddress || undefined,
    }));
  }
  if (app.inventor_name) {
    return [{
      id: crypto.randomUUID(),
      fullName: app.inventor_name,
      residence: { city: '', state: '', country: 'US' },
      citizenship: app.inventor_citizenship || 'US',
    }];
  }
  return [createDefaultInventor()];
}

function extractCorrespondence(app: SB16FormWizardProps['application']): CorrespondenceAddress {
  const ca = app.correspondence_address;
  if (ca && typeof ca === 'object') {
    return {
      name: ca.name || '',
      street: ca.street || '',
      city: ca.city || '',
      state: ca.state || '',
      zipCode: ca.zipCode || ca.zip_code || '',
      country: ca.country || 'US',
      phone: ca.phone || '',
      email: ca.email || '',
    };
  }
  return createDefaultCorrespondenceAddress();
}

function extractAttorney(app: SB16FormWizardProps['application']): AttorneyInfo {
  const ai = app.attorney_info;
  const meta = app.metadata || {};
  if (ai && typeof ai === 'object') {
    return {
      name: ai.name || '',
      registrationNumber: ai.registrationNumber || ai.registration_number || '',
      firm: ai.firm || '',
      docketNumber: ai.docketNumber || meta.docket_number || '',
    };
  }
  return { name: '', registrationNumber: '', firm: '', docketNumber: meta.docket_number || '' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SB16FormWizard({ application, onClose, onSave }: SB16FormWizardProps) {
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState(application.title || '');
  const [inventors, setInventors] = useState<Inventor[]>(() => extractInventors(application));
  const [correspondence, setCorrespondence] = useState<CorrespondenceAddress>(() => extractCorrespondence(application));
  const [attorney, setAttorney] = useState<AttorneyInfo>(() => extractAttorney(application));
  const [entityStatus, setEntityStatus] = useState<EntityStatus>(
    (application.entity_status as EntityStatus) || 'micro_entity'
  );
  const [governmentInterest, setGovernmentInterest] = useState(application.government_interest || '');
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPreview, setShowPreview] = useState(false);

  // Fee transmittal state
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'deposit_account' | 'electronic' | 'check'>('electronic');
  const [depositAccountNumber, setDepositAccountNumber] = useState('');
  const [filingType, setFilingType] = useState<FilingType>('provisional');

  // Fee calculation
  const feeBreakdown = useMemo(() => {
    const specWords = (application.specification || '').split(/\s+/).filter(Boolean).length;
    const abstractWords = (application.abstract || '').split(/\s+/).filter(Boolean).length;
    const pageCount = estimatePageCount(specWords, abstractWords, application.claims.length, application.drawings.length);
    const independentClaims = application.claims.filter((c: any) => c.claim_type === 'independent').length;
    return calculateFilingFee({
      filingType,
      entityStatus,
      pageCount,
      totalClaims: application.claims.length,
      independentClaims,
      multipleDependent: false,
    });
  }, [entityStatus, filingType, application.specification, application.abstract, application.claims, application.drawings]);

  // Build the data object
  const formData = useMemo<CoverSheetData>(() => ({
    title,
    inventors,
    correspondenceAddress: correspondence,
    attorneyInfo: attorney.name ? attorney : undefined,
    entityStatus,
    governmentInterest: governmentInterest || undefined,
    docketNumber: attorney.docketNumber || undefined,
    signatureName: signatureName || inventors[0]?.fullName || '',
    signatureDate: signatureDate,
  }), [title, inventors, correspondence, attorney, entityStatus, governmentInterest, signatureName, signatureDate]);

  const validation = useMemo(() => validateCoverSheetData(formData), [formData]);

  const previewHTML = useMemo(() => {
    if (step === 5) return generateCoverSheetHTML(formData);
    return '';
  }, [formData, step]);

  // Step validation
  const stepErrors = useMemo<string[]>(() => {
    switch (step) {
      case 0: {
        const errs: string[] = [];
        if (!title.trim()) errs.push('Invention title is required');
        if (inventors.length === 0) errs.push('At least one inventor is required');
        inventors.forEach((inv, i) => {
          if (!inv.fullName.trim()) errs.push(`Inventor ${i + 1}: Name is required`);
          if (!inv.residence.city.trim()) errs.push(`Inventor ${i + 1}: City is required`);
          if (!inv.residence.country.trim()) errs.push(`Inventor ${i + 1}: Country is required`);
          if (!inv.citizenship.trim()) errs.push(`Inventor ${i + 1}: Citizenship is required`);
        });
        return errs;
      }
      case 1: {
        const errs: string[] = [];
        if (!correspondence.street.trim()) errs.push('Street address is required');
        if (!correspondence.city.trim()) errs.push('City is required');
        if (!correspondence.zipCode.trim()) errs.push('Zip code is required');
        if (!correspondence.country.trim()) errs.push('Country is required');
        return errs;
      }
      case 2:
        return []; // Attorney is optional
      case 3:
        return []; // Entity is pre-selected, gov interest is optional
      case 4:
        return []; // Fees auto-calculated, payment method pre-selected
      default:
        return validation.errors;
    }
  }, [step, title, inventors, correspondence, validation]);

  const canAdvance = stepErrors.length === 0;

  // Inventor management
  const updateInventor = (idx: number, updates: Partial<Inventor>) => {
    setInventors(prev => prev.map((inv, i) => i === idx ? { ...inv, ...updates } : inv));
  };
  const updateInventorResidence = (idx: number, field: string, value: string) => {
    setInventors(prev => prev.map((inv, i) =>
      i === idx ? { ...inv, residence: { ...inv.residence, [field]: value } } : inv
    ));
  };
  const addInventor = () => setInventors(prev => [...prev, createDefaultInventor()]);
  const removeInventor = (idx: number) => setInventors(prev => prev.filter((_, i) => i !== idx));

  // Navigation
  const next = () => { if (canAdvance && step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const handleGenerate = () => {
    onSave(formData);
    downloadCoverSheet(formData);
  };

  const handlePrint = () => {
    const html = generateCoverSheetHTML(formData);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>PTO/SB/16</title></head><body>${html}</body></html>`);
      w.document.close();
      w.print();
    }
  };

  const buildFeeTransmittalData = (): FeeTransmittalData => {
    const feeLines: { description: string; feeCode?: string; amount: number }[] = [];
    if (feeBreakdown.baseFee > 0) feeLines.push({ description: filingType === 'provisional' ? 'Provisional Filing Fee' : 'Basic Filing Fee', amount: feeBreakdown.baseFee });
    if (feeBreakdown.searchFee > 0) feeLines.push({ description: 'Search Fee', amount: feeBreakdown.searchFee });
    if (feeBreakdown.examinationFee > 0) feeLines.push({ description: 'Examination Fee', amount: feeBreakdown.examinationFee });
    if (feeBreakdown.claimsFee > 0) feeLines.push({ description: 'Excess Claims Fee', amount: feeBreakdown.claimsFee });
    if (feeBreakdown.applicationSizeFee > 0) feeLines.push({ description: 'Application Size Fee (over 100 pages)', amount: feeBreakdown.applicationSizeFee });
    return {
      title,
      firstNamedInventor: inventors[0]?.fullName || '',
      docketNumber: attorney.docketNumber || undefined,
      entityStatus,
      filingType: filingType === 'provisional' ? 'provisional' : 'non_provisional',
      paymentMethod,
      depositAccountNumber: paymentMethod === 'deposit_account' ? depositAccountNumber : undefined,
      authorizeCharge: paymentMethod === 'deposit_account',
      feeLines,
      totalFee: feeBreakdown.totalFee,
      signatureName: signatureName || inventors[0]?.fullName || '',
      signatureDate,
      signatureRegNumber: attorney.registrationNumber || undefined,
      signaturePhone: correspondence.phone || undefined,
    };
  };

  const handleDownloadSB17 = () => {
    downloadFeeTransmittal(buildFeeTransmittalData());
  };

  const handleDownloadBoth = () => {
    onSave(formData);
    downloadCoverSheet(formData);
    setTimeout(() => downloadFeeTransmittal(buildFeeTransmittalData()), 500);
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  function renderStep() {
    switch (step) {
      // ===== STEP 0: Title & Inventors =====
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Invention Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className={inputCls} placeholder="e.g. System and Method for..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-800">Inventors</label>
                <button type="button" onClick={addInventor}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                  <Plus className="w-3.5 h-3.5" /> Add Inventor
                </button>
              </div>

              <div className="space-y-4">
                {inventors.map((inv, idx) => (
                  <div key={inv.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500">Inventor {idx + 1}</span>
                      {inventors.length > 1 && (
                        <button type="button" onClick={() => removeInventor(idx)}
                          className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className={labelCls}>Full Name (Given, Middle, Family) *</label>
                        <input type="text" value={inv.fullName}
                          onChange={e => updateInventor(idx, { fullName: e.target.value })}
                          className={inputCls} placeholder="Jane A. Smith" />
                      </div>
                      <div>
                        <label className={labelCls}>City *</label>
                        <input type="text" value={inv.residence.city}
                          onChange={e => updateInventorResidence(idx, 'city', e.target.value)}
                          className={inputCls} placeholder="Cincinnati" />
                      </div>
                      <div>
                        <label className={labelCls}>State / Province</label>
                        <input type="text" value={inv.residence.state}
                          onChange={e => updateInventorResidence(idx, 'state', e.target.value)}
                          className={inputCls} placeholder="OH" />
                      </div>
                      <div>
                        <label className={labelCls}>Country *</label>
                        <input type="text" value={inv.residence.country}
                          onChange={e => updateInventorResidence(idx, 'country', e.target.value)}
                          className={inputCls} placeholder="US" />
                      </div>
                      <div>
                        <label className={labelCls}>Citizenship *</label>
                        <input type="text" value={inv.citizenship}
                          onChange={e => updateInventor(idx, { citizenship: e.target.value })}
                          className={inputCls} placeholder="US" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      // ===== STEP 1: Correspondence Address =====
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Where should the USPTO send official correspondence?</p>
            <div>
              <label className={labelCls}>Name / Attention</label>
              <input type="text" value={correspondence.name || ''}
                onChange={e => setCorrespondence(p => ({ ...p, name: e.target.value }))}
                className={inputCls} placeholder="Jane Smith or Smith & Associates" />
            </div>
            <div>
              <label className={labelCls}>Street Address *</label>
              <input type="text" value={correspondence.street}
                onChange={e => setCorrespondence(p => ({ ...p, street: e.target.value }))}
                className={inputCls} placeholder="123 Main Street, Suite 100" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City *</label>
                <input type="text" value={correspondence.city}
                  onChange={e => setCorrespondence(p => ({ ...p, city: e.target.value }))}
                  className={inputCls} placeholder="Cincinnati" />
              </div>
              <div>
                <label className={labelCls}>State *</label>
                <input type="text" value={correspondence.state}
                  onChange={e => setCorrespondence(p => ({ ...p, state: e.target.value }))}
                  className={inputCls} placeholder="OH" />
              </div>
              <div>
                <label className={labelCls}>Zip Code *</label>
                <input type="text" value={correspondence.zipCode}
                  onChange={e => setCorrespondence(p => ({ ...p, zipCode: e.target.value }))}
                  className={inputCls} placeholder="45202" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Country *</label>
                <input type="text" value={correspondence.country}
                  onChange={e => setCorrespondence(p => ({ ...p, country: e.target.value }))}
                  className={inputCls} placeholder="US" />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={correspondence.phone || ''}
                  onChange={e => setCorrespondence(p => ({ ...p, phone: e.target.value }))}
                  className={inputCls} placeholder="(513) 555-0100" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email (for USPTO electronic correspondence authorization)</label>
              <input type="email" value={correspondence.email || ''}
                onChange={e => setCorrespondence(p => ({ ...p, email: e.target.value }))}
                className={inputCls} placeholder="jane@example.com" />
            </div>
          </div>
        );

      // ===== STEP 2: Attorney / Agent =====
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Building className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Optional. If you are filing without an attorney, leave these fields blank and proceed to the next step.</p>
            </div>
            <div>
              <label className={labelCls}>Attorney / Agent Name</label>
              <input type="text" value={attorney.name || ''}
                onChange={e => setAttorney(p => ({ ...p, name: e.target.value }))}
                className={inputCls} placeholder="John Q. Attorney" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>USPTO Registration Number</label>
                <input type="text" value={attorney.registrationNumber || ''}
                  onChange={e => setAttorney(p => ({ ...p, registrationNumber: e.target.value }))}
                  className={inputCls} placeholder="12345" />
              </div>
              <div>
                <label className={labelCls}>Firm Name</label>
                <input type="text" value={attorney.firm || ''}
                  onChange={e => setAttorney(p => ({ ...p, firm: e.target.value }))}
                  className={inputCls} placeholder="Smith & Associates, LLP" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Docket Number</label>
              <input type="text" value={attorney.docketNumber || ''}
                onChange={e => setAttorney(p => ({ ...p, docketNumber: e.target.value }))}
                className={inputCls} placeholder="IP-2026-001" />
            </div>
          </div>
        );

      // ===== STEP 3: Entity Status & Government Interest =====
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-800 mb-3 block">Entity Status *</label>
              <div className="space-y-2">
                {([
                  { value: 'micro_entity' as EntityStatus, label: 'Micro Entity', desc: 'Qualifies under 37 CFR 1.29. Applicant has not been named on more than 4 previously filed patent applications and gross income does not exceed 3x the median household income.' },
                  { value: 'small_entity' as EntityStatus, label: 'Small Entity', desc: 'Qualifies under 37 CFR 1.27. Includes individuals, small businesses (<500 employees), universities, and non-profits.' },
                  { value: 'regular' as EntityStatus, label: 'Regular (Large) Entity', desc: 'Does not qualify for small or micro entity status. Full fees apply.' },
                ]).map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      entityStatus === opt.value
                        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="entity" value={opt.value}
                      checked={entityStatus === opt.value}
                      onChange={() => setEntityStatus(opt.value)}
                      className="mt-1" />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>U.S. Government Interest (if applicable)</label>
              <p className="text-xs text-gray-400 mb-2">If this invention was made with government support, enter the contract or grant number.</p>
              <textarea value={governmentInterest}
                onChange={e => setGovernmentInterest(e.target.value)}
                className={inputCls + ' h-20 resize-none'}
                placeholder="Contract No. DE-AC05-00OR22725 awarded by the Department of Energy" />
            </div>
          </div>
        );

      // ===== STEP 4: Fee Transmittal (SB/17) =====
      case 4:
        return (
          <div className="space-y-5">
            <p className="text-xs text-gray-500">The fee transmittal (PTO/SB/17) accompanies your filing and documents the fees paid.</p>

            {/* Filing type selector */}
            <div>
              <label className={labelCls}>Filing Type</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'provisional' as FilingType, label: 'Provisional', desc: 'Lower fee, 12-month priority window' },
                  { value: 'non_provisional' as FilingType, label: 'Non-Provisional', desc: 'Full examination, includes search + exam fees' },
                ]).map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      filingType === opt.value
                        ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="filingType" value={opt.value}
                      checked={filingType === opt.value}
                      onChange={() => setFilingType(opt.value)}
                      className="mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-gray-800">{opt.label}</span>
                      <p className="text-[10px] text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Fee summary */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-800">Calculated Fees ({entityStatus === 'micro_entity' ? 'Micro' : entityStatus === 'small_entity' ? 'Small' : 'Regular'} Entity)</h4>
              </div>
              <div className="p-4 space-y-2">
                {feeBreakdown.baseFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{filingType === 'provisional' ? 'Provisional Filing Fee' : 'Basic Filing Fee'}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(feeBreakdown.baseFee)}</span>
                  </div>
                )}
                {feeBreakdown.searchFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Search Fee</span>
                    <span className="font-medium text-gray-800">{formatCurrency(feeBreakdown.searchFee)}</span>
                  </div>
                )}
                {feeBreakdown.examinationFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Examination Fee</span>
                    <span className="font-medium text-gray-800">{formatCurrency(feeBreakdown.examinationFee)}</span>
                  </div>
                )}
                {feeBreakdown.claimsFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Excess Claims Fee</span>
                    <span className="font-medium text-gray-800">{formatCurrency(feeBreakdown.claimsFee)}</span>
                  </div>
                )}
                {feeBreakdown.applicationSizeFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Application Size Fee</span>
                    <span className="font-medium text-gray-800">{formatCurrency(feeBreakdown.applicationSizeFee)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(feeBreakdown.totalFee)}</span>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-sm font-semibold text-gray-800 mb-3 block">Payment Method</label>
              <div className="space-y-2">
                {([
                  { value: 'electronic' as const, label: 'Electronic Payment via Patent Center', desc: 'Pay online when submitting through USPTO Patent Center (most common)' },
                  { value: 'credit_card' as const, label: 'Credit Card (PTO-2038)', desc: 'Complete separate credit card form PTO-2038' },
                  { value: 'deposit_account' as const, label: 'USPTO Deposit Account', desc: 'Charge to an existing USPTO deposit account' },
                  { value: 'check' as const, label: 'Check or Money Order', desc: 'Mail a check payable to "Director of the USPTO"' },
                ]).map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === opt.value
                        ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="payment" value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                      className="mt-1" />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {paymentMethod === 'deposit_account' && (
              <div>
                <label className={labelCls}>Deposit Account Number</label>
                <input type="text" value={depositAccountNumber}
                  onChange={e => setDepositAccountNumber(e.target.value)}
                  className={inputCls} placeholder="XX-XXXX" />
              </div>
            )}
          </div>
        );

      // ===== STEP 5: Review & Generate =====
      case 5:
        return (
          <div className="space-y-5">
            {/* Validation summary */}
            <div className={`rounded-xl border p-4 ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {validation.valid
                  ? <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold text-green-800">All fields valid — ready to generate</span></>
                  : <><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-sm font-semibold text-red-800">{validation.errors.length} issue(s) found</span></>
                }
              </div>
              {!validation.valid && (
                <ul className="space-y-1">
                  {validation.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-red-400 rounded-full flex-shrink-0" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Signature */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <label className="text-sm font-semibold text-gray-800 mb-3 block">Signature Information</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Name (Print/Type)</label>
                  <input type="text" value={signatureName || inventors[0]?.fullName || ''}
                    onChange={e => setSignatureName(e.target.value)}
                    className={inputCls} placeholder={inventors[0]?.fullName || 'Your full name'} />
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" value={signatureDate}
                    onChange={e => setSignatureDate(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
            </div>

            {/* Preview toggle */}
            <div>
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 mb-2">
                {showPreview ? 'Hide Preview' : 'Show SB/16 Preview'}
              </button>
              {showPreview && (
                <div className="border border-gray-200 rounded-xl p-4 bg-white overflow-auto max-h-[400px] text-xs"
                  dangerouslySetInnerHTML={{ __html: previewHTML }} />
              )}
            </div>

            {/* Generate buttons */}
            <div className="space-y-3">
              <button type="button" onClick={handleDownloadBoth} disabled={!validation.valid}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <Download className="w-4 h-4" />
                Download Both Forms (SB/16 + SB/17)
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={handleGenerate} disabled={!validation.valid}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all">
                  <FileText className="w-3.5 h-3.5" />
                  SB/16 Only
                </button>
                <button type="button" onClick={handleDownloadSB17} disabled={!validation.valid}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all">
                  <DollarSign className="w-3.5 h-3.5" />
                  SB/17 Only
                </button>
                <button type="button" onClick={handlePrint} disabled={!validation.valid}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all">
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>
          </div>
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">PTO/SB/16 — Provisional Cover Sheet</h2>
            <p className="text-xs text-gray-500">Step {step + 1} of {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-6 py-3 border-b border-gray-50 bg-gray-50/50 gap-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <button key={s.key} type="button" onClick={() => idx <= step && setStep(idx)}
                disabled={idx > step}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : isDone
                      ? 'bg-green-50 text-green-700 cursor-pointer hover:bg-green-100'
                      : 'text-gray-400 cursor-default'
                }`}>
                {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderStep()}

          {/* Step-level errors */}
          {stepErrors.length > 0 && step < 5 && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Complete these fields to continue:</p>
              <ul className="space-y-0.5">
                {stepErrors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />{err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button type="button" onClick={prev} disabled={step === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button type="button" onClick={next}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Skip
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button type="button" onClick={next} disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
