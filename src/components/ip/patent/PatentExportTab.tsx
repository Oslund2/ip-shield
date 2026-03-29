import {
  Shield,
  FileText,
  List,
  Image,
  BookOpen,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Scroll,
  BarChart3,
  Printer,
  Copy
} from 'lucide-react';
import { countWords, type PatentApplicationWithDetails } from '../../../services/patent/patentApplicationService';
import { formatDrawingsDescriptionSection } from '../../../services/patent/patentDrawingsService';

interface PatentExportTabProps {
  application: PatentApplicationWithDetails;
  onExportPDF: () => void;
  onExportSectionPDF: (section: string) => void;
  exporting: boolean;
  exportingSection: string | null;
  exportOptions: { includeExemplaryClaims: boolean };
  onExportOptionsChange: (options: { includeExemplaryClaims: boolean }) => void;
}

export function PatentExportTab({ application, onExportPDF, onExportSectionPDF, exporting, exportingSection, exportOptions, onExportOptionsChange }: PatentExportTabProps) {
  const sectionExports = [
    { id: 'overview', label: 'Overview', icon: Shield, description: 'Application details', hasContent: true },
    { id: 'specification', label: 'Specification', icon: FileText, description: 'Technical description', hasContent: !!application.specification },
    { id: 'claims', label: 'Claims', icon: List, description: `${application.claims.length} claims`, hasContent: application.claims.length > 0 },
    { id: 'drawings', label: 'Drawings', icon: Image, description: `${application.drawings.length} figures`, hasContent: application.drawings.length > 0 },
    { id: 'abstract', label: 'Abstract', icon: BookOpen, description: 'Summary', hasContent: !!application.abstract },
    { id: 'prior-art', label: 'Prior Art', icon: Scroll, description: 'Related patents', hasContent: true },
    { id: 'analysis', label: 'Analysis', icon: BarChart3, description: 'Assessment', hasContent: true }
  ];

  const handleCopyText = () => {
    let text = `${application.title}\n\n`;
    text += `Inventor: ${application.inventor_name || 'Not specified'}\n`;
    text += `Citizenship: ${application.inventor_citizenship}\n\n`;
    text += `ABSTRACT\n\n${application.abstract || ''}\n\n`;
    text += `SPECIFICATION\n\n${application.specification || ''}\n\n`;
    text += `CLAIMS\n\n`;
    application.claims
      .sort((a, b) => a.claim_number - b.claim_number)
      .forEach(claim => {
        text += `${claim.claim_number}. ${claim.claim_text}\n\n`;
      });
    navigator.clipboard.writeText(text);
  };

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 100);
  };

  const drawingsDescription = formatDrawingsDescriptionSection(application.drawings);
  const sortedClaims = [...application.claims].sort((a, b) => a.claim_number - b.claim_number);

  const completenessItems = [
    { label: 'Title', complete: true, detail: application.title },
    { label: 'Inventor', complete: !!application.inventor_name, detail: application.inventor_name || 'Not specified' },
    { label: 'Citizenship', complete: true, detail: application.inventor_citizenship },
    { label: 'Abstract', complete: !!application.abstract, detail: `${countWords(application.abstract || '')} words` },
    { label: 'Specification', complete: !!application.specification, detail: `${countWords(application.specification || '').toLocaleString()} words` },
    { label: 'Claims', complete: application.claims.length > 0, detail: `${application.claims.length} total` },
    { label: 'Drawings', complete: application.drawings.length > 0, detail: `${application.drawings.length} figures` },
  ];

  const completenessPercent = Math.round((completenessItems.filter(i => i.complete).length / completenessItems.length) * 100);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Export Application</h2>

      {/* Primary Export Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-2.5 p-5 bg-white border border-slate-200 rounded-lg hover:border-shield-300 hover:shadow-sm transition-all group"
        >
          <Printer className="w-8 h-8 text-shield-600 group-hover:scale-105 transition-transform" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">Print</p>
            <p className="text-xs text-slate-500">Print document</p>
          </div>
        </button>

        <button
          onClick={onExportPDF}
          disabled={exporting}
          className={`flex flex-col items-center gap-2.5 p-5 bg-white border rounded-lg transition-all group ${
            exporting ? 'border-slate-200 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:border-shield-300 hover:shadow-sm'
          }`}
        >
          {exporting ? (
            <Loader2 className="w-8 h-8 text-shield-600 animate-spin" />
          ) : (
            <Download className="w-8 h-8 text-shield-600 group-hover:scale-105 transition-transform" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">{exporting ? 'Generating...' : 'Export PDF'}</p>
            <p className="text-xs text-slate-500">Complete application</p>
          </div>
        </button>

        <button
          onClick={handleCopyText}
          className="flex flex-col items-center gap-2.5 p-5 bg-white border border-slate-200 rounded-lg hover:border-shield-300 hover:shadow-sm transition-all group"
        >
          <Copy className="w-8 h-8 text-shield-600 group-hover:scale-105 transition-transform" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">Copy Text</p>
            <p className="text-xs text-slate-500">To clipboard</p>
          </div>
        </button>

        <button
          onClick={() => {
            const blob = new Blob([application.specification || ''], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'specification.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex flex-col items-center gap-2.5 p-5 bg-white border border-slate-200 rounded-lg hover:border-shield-300 hover:shadow-sm transition-all group"
        >
          <FileText className="w-8 h-8 text-shield-600 group-hover:scale-105 transition-transform" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">Spec TXT</p>
            <p className="text-xs text-slate-500">Download text</p>
          </div>
        </button>
      </div>

      {/* Export Options */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Options</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={exportOptions.includeExemplaryClaims}
            onChange={(e) => onExportOptionsChange({ ...exportOptions, includeExemplaryClaims: e.target.checked })}
            className="w-4 h-4 text-shield-600 border-slate-300 rounded focus:ring-shield-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Include "Exemplary Claims" header</span>
            <p className="text-xs text-slate-500">Adds header before claims section (internal review only)</p>
          </div>
        </label>
      </div>

      {/* Section Exports */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Export Individual Sections</h3>
        <p className="text-xs text-slate-500 mb-4">Download each section as a separate PDF</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {sectionExports.map(({ id, label, icon: Icon, description, hasContent }) => {
            const isExportingThis = exportingSection === id;
            return (
              <button
                key={id}
                onClick={() => onExportSectionPDF(id)}
                disabled={isExportingThis || !!exportingSection}
                className={`flex flex-col items-center gap-1.5 p-3 border rounded-lg transition-all ${
                  isExportingThis
                    ? 'border-shield-300 bg-shield-50'
                    : hasContent
                    ? 'border-slate-200 hover:border-shield-300 hover:bg-slate-50'
                    : 'border-slate-100 bg-slate-50/50 opacity-50'
                } ${exportingSection && !isExportingThis ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {isExportingThis ? (
                  <Loader2 className="w-5 h-5 text-shield-600 animate-spin" />
                ) : (
                  <Icon className={`w-5 h-5 ${hasContent ? 'text-shield-600' : 'text-slate-400'}`} />
                )}
                <p className={`text-xs font-medium ${hasContent ? 'text-slate-700' : 'text-slate-400'}`}>{label}</p>
                <p className="text-xs text-slate-400">{isExportingThis ? 'Generating...' : description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Completeness Checklist */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Completeness</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            completenessPercent === 100
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {completenessPercent}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completenessPercent === 100 ? 'bg-emerald-500' : 'bg-shield-500'
            }`}
            style={{ width: `${completenessPercent}%` }}
          />
        </div>
        <ul className="space-y-2">
          {completenessItems.map((item, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              {item.complete ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <span className="text-slate-600">{item.label}</span>
              <span className="text-xs text-slate-400 ml-auto">{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Print Content (hidden) */}
      <div id="patent-print-content" className="hidden print:block print:!visible">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{application.title}</h1>
          <p className="text-lg">Inventor: {application.inventor_name || 'Not specified'}</p>
          <p>Citizenship: {application.inventor_citizenship}</p>
        </div>

        {application.abstract && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">ABSTRACT</h2>
            <p className="text-justify whitespace-pre-wrap">{application.abstract}</p>
          </div>
        )}

        {application.specification && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">SPECIFICATION</h2>
            <div className="text-justify whitespace-pre-wrap">{application.specification}</div>
          </div>
        )}

        {sortedClaims.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">
              {exportOptions.includeExemplaryClaims ? 'EXEMPLARY CLAIMS' : 'CLAIMS'}
            </h2>
            <div className="space-y-4">
              {sortedClaims.map(claim => (
                <p key={claim.id} className="text-justify">
                  <strong>{claim.claim_number}.</strong> {claim.claim_text}
                </p>
              ))}
            </div>
          </div>
        )}

        {application.drawings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">BRIEF DESCRIPTION OF THE DRAWINGS</h2>
            <div className="whitespace-pre-wrap">{drawingsDescription}</div>
          </div>
        )}
      </div>
    </div>
  );
}
