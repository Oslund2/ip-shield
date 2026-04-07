import { useState, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  FileText,
  RefreshCw,
  Printer,
  AlertTriangle,
  Clock,
  Info,
  Download,
  Archive,
  FileSignature
} from 'lucide-react';
import {
  calculateFilingFee,
  getEntityStatusDescription,
  estimatePageCount,
  calculateFilingDeadlines,
  compareEntityFees,
  formatCurrency,
  type FeeBreakdown,
  type FilingDeadline,
  type EntityStatus,
  type FilingType
} from '../../../services/patent/filingFeeService';
import { getPatentStrength } from '../../../services/patent/patentWorkflowOrchestrator';
import { generateADSForm, extractADSDataFromApplication } from '../../../services/patent/adsFormService';
import { generateAllDeclarations } from '../../../services/patent/declarationFormService';
import { generateMicroEntityCert } from '../../../services/patent/microEntityCertService';
import { SB16FormWizard } from './SB16FormWizard';
import { supabase } from '../../../lib/supabase';
import type { CoverSheetData } from '../../../services/patent/coverSheetService';

interface PatentFilingTabProps {
  application: {
    id: string;
    title: string;
    entity_status?: string | null;
    filing_type?: string | null;
    specification?: string | null;
    abstract?: string | null;
    claims: any[];
    drawings: any[];
    inventor_name?: string | null;
    inventor_citizenship?: string;
    inventors?: any[];
    correspondence_address?: any | null;
    attorney_info?: any | null;
    government_interest?: string | null;
    metadata?: any;
  };
  onGenerateCoverSheet: () => void;
  coverSheetHTML: string | null;
  generatingCoverSheet: boolean;
}

function ScoreRing({ score, size = 80, strokeWidth = 6, color = 'text-blue-600' }: { score: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={color} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-bold text-gray-900">{Math.round(score)}%</span>
    </div>
  );
}

export function PatentFilingTab({
  application,
  onGenerateCoverSheet,
  coverSheetHTML,
  generatingCoverSheet
}: PatentFilingTabProps) {
  const [selectedEntityStatus, setSelectedEntityStatus] = useState<EntityStatus>(
    (application.entity_status as EntityStatus) || 'small_entity'
  );
  const [selectedFilingType, setSelectedFilingType] = useState<FilingType>(
    (application.filing_type as FilingType) || 'non_provisional'
  );
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [entityComparison, setEntityComparison] = useState<{ regular: number; smallEntity: number; microEntity: number } | null>(null);
  const [patentStrength, setPatentStrength] = useState<{
    overallScore: number;
    approvalProbability: number;
    readinessPercentage: number;
    missingItems: string[];
  } | null>(null);
  const [loadingStrength, setLoadingStrength] = useState(false);
  const [filingDeadlines, setFilingDeadlines] = useState<FilingDeadline[]>([]);
  const [showCoverSheet, setShowCoverSheet] = useState(false);
  const [generatingForm, setGeneratingForm] = useState<string | null>(null);
  const [showSB16Wizard, setShowSB16Wizard] = useState(false);
  const coverSheetRef = useRef<HTMLDivElement>(null);

  // Calculate page count
  const specWords = (application.specification || '').split(/\s+/).filter(Boolean).length;
  const abstractWords = (application.abstract || '').split(/\s+/).filter(Boolean).length;
  const pageCount = estimatePageCount(specWords, abstractWords, application.claims.length, application.drawings.length);
  const independentClaims = application.claims.filter((c: any) => c.claim_type === 'independent').length;

  // Load strength on mount
  useEffect(() => {
    loadStrength();
  }, [application.id]);

  // Recalculate fees when inputs change
  useEffect(() => {
    const breakdown = calculateFilingFee({
      filingType: selectedFilingType,
      entityStatus: selectedEntityStatus,
      pageCount,
      totalClaims: application.claims.length,
      independentClaims,
      multipleDependent: false
    });
    setFeeBreakdown(breakdown);

    const comparison = compareEntityFees(
      selectedFilingType,
      pageCount,
      application.claims.length,
      independentClaims
    );
    setEntityComparison(comparison);
  }, [selectedEntityStatus, selectedFilingType, application.claims.length, pageCount, independentClaims]);

  // Calculate deadlines
  useEffect(() => {
    const meta = application.metadata || {};
    const provDate = meta.provisional_filing_date ? new Date(meta.provisional_filing_date) : null;
    setFilingDeadlines(calculateFilingDeadlines(provDate));
  }, [application.metadata]);

  const loadStrength = async () => {
    setLoadingStrength(true);
    try {
      const strength = await getPatentStrength(application.id);
      setPatentStrength(strength);
    } catch (err) {
      console.error('Failed to load patent strength:', err);
    } finally {
      setLoadingStrength(false);
    }
  };

  const handlePrintCoverSheet = () => {
    if (!coverSheetHTML) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(coverSheetHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadPdf = (doc: any, filename: string) => {
    doc.save(filename);
  };

  const handleGenerateADS = () => {
    setGeneratingForm('ads');
    try {
      const adsData = extractADSDataFromApplication(application as any);
      const doc = generateADSForm(adsData);
      downloadPdf(doc, `ADS_${application.title.slice(0, 30).replace(/\s+/g, '_')}.pdf`);
    } finally {
      setGeneratingForm(null);
    }
  };

  const handleGenerateDeclarations = () => {
    setGeneratingForm('declaration');
    try {
      const doc = generateAllDeclarations(application as any);
      downloadPdf(doc, `Declaration_${application.title.slice(0, 30).replace(/\s+/g, '_')}.pdf`);
    } finally {
      setGeneratingForm(null);
    }
  };

  const handleSB16Save = async (data: CoverSheetData) => {
    // Persist the wizard data back to the patent application
    try {
      const inventors = data.inventors.map(inv => ({
        id: inv.id,
        fullName: inv.fullName,
        residence: inv.residence,
        citizenship: inv.citizenship,
        mailingAddress: inv.mailingAddress,
      }));

      await (supabase as any)
        .from('patent_applications')
        .update({
          title: data.title,
          inventors,
          correspondence_address: data.correspondenceAddress,
          attorney_info: data.attorneyInfo || null,
          entity_status: data.entityStatus,
          government_interest: data.governmentInterest || null,
          inventor_name: data.inventors[0]?.fullName || null,
          inventor_citizenship: data.inventors[0]?.citizenship || null,
        })
        .eq('id', application.id);
    } catch (err) {
      console.error('Failed to save SB/16 data:', err);
    }
    setShowSB16Wizard(false);
  };

  const handleGenerateMicroEntity = () => {
    setGeneratingForm('micro');
    try {
      const doc = generateMicroEntityCert(application as any);
      downloadPdf(doc, `Micro_Entity_Cert_SB15A.pdf`);
    } finally {
      setGeneratingForm(null);
    }
  };

  const entityOptions: { value: EntityStatus; label: string }[] = [
    { value: 'micro_entity', label: 'Micro Entity' },
    { value: 'small_entity', label: 'Small Entity' },
    { value: 'regular', label: 'Regular Entity' }
  ];

  const filingTypes: { value: FilingType; label: string }[] = [
    { value: 'provisional', label: 'Provisional' },
    { value: 'non_provisional', label: 'Non-Provisional' },
    { value: 'continuation', label: 'Continuation' },
    { value: 'cip', label: 'Continuation-in-Part' },
    { value: 'divisional', label: 'Divisional' }
  ];

  const entityDesc = getEntityStatusDescription(selectedEntityStatus);

  // Checklist items
  const checklistItems = [
    { label: 'Specification', complete: !!(application.specification && application.specification.length > 100) },
    { label: 'Abstract', complete: !!(application.abstract && application.abstract.length > 20) },
    { label: 'Claims', complete: application.claims.length > 0 },
    { label: 'Drawings', complete: application.drawings.length > 0 },
    { label: 'Inventor Name', complete: !!application.inventor_name },
    { label: 'Inventor Citizenship', complete: !!application.inventor_citizenship },
  ];
  const completedCount = checklistItems.filter(i => i.complete).length;
  const readiness = patentStrength?.readinessPercentage ?? Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Filing Preparation</h3>
            <p className="text-sm text-gray-500">Readiness check, fees, and cover sheet</p>
          </div>
        </div>
        <button
          onClick={loadStrength}
          disabled={loadingStrength}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
        >
          {loadingStrength ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Readiness + Checklist */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <div className="flex items-start gap-6">
          <div className="text-center flex-shrink-0">
            <ScoreRing
              score={readiness}
              size={100}
              strokeWidth={8}
              color={readiness >= 80 ? 'text-green-500' : readiness >= 50 ? 'text-amber-500' : 'text-red-500'}
            />
            <p className="text-xs font-medium text-gray-500 mt-2">Filing Readiness</p>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Application Checklist</h4>
            <div className="grid grid-cols-2 gap-2">
              {checklistItems.map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  {item.complete ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className={item.complete ? 'text-gray-700' : 'text-gray-500'}>{item.label}</span>
                </div>
              ))}
            </div>
            {patentStrength?.missingItems && patentStrength.missingItems.length > 0 && (
              <div className="mt-3 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Missing: {patentStrength.missingItems.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filing deadlines */}
      {filingDeadlines.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Filing Deadlines
          </h4>
          <div className="space-y-2">
            {filingDeadlines.map((d, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  d.isPast ? 'bg-red-50 border-red-200' :
                  d.isUrgent ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${d.isPast ? 'text-red-500' : d.isUrgent ? 'text-amber-500' : 'text-green-500'}`} />
                  <span className="text-xs font-medium text-gray-800">{d.type}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-800">{d.deadline.toLocaleDateString()}</p>
                  <p className={`text-[10px] font-medium ${d.isPast ? 'text-red-600' : d.isUrgent ? 'text-amber-600' : 'text-green-600'}`}>
                    {d.isPast ? `${Math.abs(d.daysRemaining)} days overdue` : `${d.daysRemaining} days remaining`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee calculator */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">USPTO Fee Calculator</h4>
        </div>
        <div className="p-5 space-y-5">
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Entity Status</label>
              <select
                value={selectedEntityStatus}
                onChange={e => setSelectedEntityStatus(e.target.value as EntityStatus)}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                {entityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">{entityDesc.description}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Filing Type</label>
              <select
                value={selectedFilingType}
                onChange={e => setSelectedFilingType(e.target.value as FilingType)}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                {filingTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Application stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{pageCount}</p>
              <p className="text-[10px] text-gray-500">Est. Pages</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{application.claims.length}</p>
              <p className="text-[10px] text-gray-500">Total Claims</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{independentClaims}</p>
              <p className="text-[10px] text-gray-500">Independent</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{application.drawings.length}</p>
              <p className="text-[10px] text-gray-500">Drawings</p>
            </div>
          </div>

          {/* Fee breakdown */}
          {feeBreakdown && (
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Base Filing Fee', amount: feeBreakdown.baseFee },
                  { label: 'Search Fee', amount: feeBreakdown.searchFee },
                  { label: 'Examination Fee', amount: feeBreakdown.examinationFee },
                  { label: 'Claims Fee', amount: feeBreakdown.claimsFee },
                  { label: 'Application Size Fee', amount: feeBreakdown.applicationSizeFee },
                ].filter(item => item.amount > 0).map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(feeBreakdown.totalFee)}</span>
                </div>
              </div>
              {feeBreakdown.savings.fromRegular > 0 && (
                <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center gap-2">
                  <Info className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-800">
                    You save <span className="font-semibold">{formatCurrency(feeBreakdown.savings.fromRegular)}</span> ({feeBreakdown.savings.percentage}%) compared to regular entity fees
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Entity comparison */}
          {entityComparison && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Fee Comparison by Entity</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Micro Entity', amount: entityComparison.microEntity, active: selectedEntityStatus === 'micro_entity' },
                  { label: 'Small Entity', amount: entityComparison.smallEntity, active: selectedEntityStatus === 'small_entity' },
                  { label: 'Regular', amount: entityComparison.regular, active: selectedEntityStatus === 'regular' },
                ].map(item => (
                  <div
                    key={item.label}
                    className={`rounded-xl p-3 text-center border ${
                      item.active
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <p className={`text-sm font-bold ${item.active ? 'text-blue-700' : 'text-gray-700'}`}>
                      {formatCurrency(item.amount)}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${item.active ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cover sheet */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-semibold text-gray-900">USPTO Cover Sheet</h4>
          </div>
          <div className="flex items-center gap-2">
            {coverSheetHTML && (
              <>
                <button
                  onClick={() => setShowCoverSheet(!showCoverSheet)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showCoverSheet ? 'Hide' : 'Preview'}
                </button>
                <button
                  onClick={handlePrintCoverSheet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <Printer className="w-3 h-3" />
                  Print
                </button>
              </>
            )}
            <button
              onClick={onGenerateCoverSheet}
              disabled={generatingCoverSheet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
            >
              {generatingCoverSheet ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="w-3 h-3" /> Generate</>
              )}
            </button>
          </div>
        </div>
        {coverSheetHTML && showCoverSheet && (
          <div className="p-5">
            <div
              ref={coverSheetRef}
              className="border border-gray-200 rounded-xl p-4 bg-white text-xs overflow-auto max-h-[500px]"
              dangerouslySetInnerHTML={{ __html: coverSheetHTML }}
            />
          </div>
        )}
        {!coverSheetHTML && !generatingCoverSheet && (
          <div className="p-5 text-center">
            <p className="text-xs text-gray-400">Generate a USPTO-compliant cover sheet for your application</p>
          </div>
        )}
        {generatingCoverSheet && (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Generating cover sheet...</p>
          </div>
        )}
      </div>

      {/* USPTO Filing Forms */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Archive className="w-4 h-4 text-violet-600" />
          <h4 className="text-sm font-semibold text-gray-900">USPTO Filing Forms</h4>
          <span className="text-xs text-gray-400 ml-auto">Download individual forms as PDF</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* SB/16 Cover Sheet Wizard */}
          <button
            onClick={() => setShowSB16Wizard(true)}
            className="flex flex-col items-center gap-2 p-4 border-2 border-blue-200 bg-blue-50/50 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all text-center"
          >
            <FileSignature className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-gray-800">Cover Sheet Wizard</span>
            <span className="text-[10px] text-gray-400">PTO/SB/16</span>
          </button>

          {/* ADS */}
          <button
            onClick={handleGenerateADS}
            disabled={generatingForm === 'ads'}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center"
          >
            {generatingForm === 'ads' ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <Download className="w-5 h-5 text-indigo-600" />}
            <span className="text-xs font-semibold text-gray-800">Application Data Sheet</span>
            <span className="text-[10px] text-gray-400">PTO/AIA/14</span>
          </button>

          {/* Declaration */}
          <button
            onClick={handleGenerateDeclarations}
            disabled={generatingForm === 'declaration'}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center"
          >
            {generatingForm === 'declaration' ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <Download className="w-5 h-5 text-indigo-600" />}
            <span className="text-xs font-semibold text-gray-800">Inventor Declaration(s)</span>
            <span className="text-[10px] text-gray-400">PTO/AIA/01</span>
          </button>

          {/* Micro Entity Cert — only show if micro entity */}
          {(application.entity_status === 'micro_entity' || selectedEntityStatus === 'micro_entity') && (
            <button
              onClick={handleGenerateMicroEntity}
              disabled={generatingForm === 'micro'}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-violet-50 hover:border-violet-200 transition-all text-center"
            >
              {generatingForm === 'micro' ? <Loader2 className="w-5 h-5 animate-spin text-violet-500" /> : <Download className="w-5 h-5 text-violet-600" />}
              <span className="text-xs font-semibold text-gray-800">Micro Entity Cert</span>
              <span className="text-[10px] text-gray-400">PTO/SB/15A</span>
            </button>
          )}
        </div>
      </div>

      {/* SB/16 Form Fill Wizard */}
      {showSB16Wizard && (
        <SB16FormWizard
          application={application}
          onClose={() => setShowSB16Wizard(false)}
          onSave={handleSB16Save}
        />
      )}
    </div>
  );
}
