import { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  List,
  Image,
  BookOpen,
  Download,
  Plus,
  Loader2,
  AlertCircle,
  Scroll,
  X,
  Sparkles,
  BarChart3,
  ClipboardCheck,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import {
  getPatentApplications,
  getPatentApplication,
  createPatentApplication,
  updatePatentApplication,
  deletePatentApplication,
  generateDefaultSpecification,
  generateDefaultAbstract,

  getStatusLabel,
  getStatusColor,
  type PatentApplication as PatentApplicationType,
  type PatentApplicationWithDetails,
} from '../../services/patent/patentApplicationService';
import { generateClaimsForApplication } from '../../services/patent/patentClaimsService';
import { generateDrawingsForApplication, regenerateSingleDrawing, svgToDataUrl } from '../../services/patent/patentDrawingsService';
import {
  generateCompletePatentApplication,
  type PatentGenerationProgress
} from '../../services/patent/patentWorkflowOrchestrator';
import {
  createUsptoCompliantPdf,
  setPatentFont,
  addPdfAMetadata,
  PDF_MARGINS,
  getMaxTextWidth,
  getPageHeight,
} from '../../services/patent/patentPdfFontService';
import { PatentOverviewTab } from './patent/PatentOverviewTab';
import { PatentSpecificationTab } from './patent/PatentSpecificationTab';
import { PatentClaimsTab } from './patent/PatentClaimsTab';
import { PatentDrawingsTab } from './patent/PatentDrawingsTab';
import { PatentAbstractTab } from './patent/PatentAbstractTab';
import { PatentExportTab } from './patent/PatentExportTab';

type TabId = 'overview' | 'specification' | 'claims' | 'drawings' | 'abstract' | 'prior-art' | 'analysis' | 'filing' | 'export';

export function PatentApplication() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const [applications, setApplications] = useState<PatentApplicationType[]>([]);
  const [selectedApp, setSelectedApp] = useState<PatentApplicationWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState(false);
  const [editingAbstract, setEditingAbstract] = useState(false);
  const [tempSpec, setTempSpec] = useState('');
  const [tempAbstract, setTempAbstract] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingSection, setExportingSection] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<PatentGenerationProgress | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({ includeExemplaryClaims: false });

  // Create modal state
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTechnicalField, setCreateTechnicalField] = useState('');
  const [createProblemSolved, setCreateProblemSolved] = useState('');

  const convertSvgToPng = (svgContent: string, width: number = 800, height: number = 600): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
      canvas.width = width;
      canvas.height = height;
      const img = new window.Image();
      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load SVG image'));
      img.src = svgToDataUrl(svgContent);
    });
  };

  useEffect(() => {
    if (projectId && user) {
      loadApplications();
    }
  }, [projectId, user]);

  const loadApplications = async () => {
    if (!projectId || !user) return;
    setLoading(true);
    setError(null);
    try {
      const apps = await getPatentApplications(projectId, user.id);
      setApplications(apps);
      if (apps.length > 0 && !selectedApp) {
        await loadApplication(apps[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const loadApplication = async (appId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const app = await getPatentApplication(appId, user.id);
      setSelectedApp(app);
      if (app) {
        setTempSpec(app.specification || '');
        setTempAbstract(app.abstract || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async () => {
    if (!projectId || !user || !createTitle.trim()) return;
    setSaving(true);
    try {
      const app = await createPatentApplication(projectId, user.id, {
        title: createTitle.trim(),
        inventionDescription: createDescription,
        technicalField: createTechnicalField,
        problemSolved: createProblemSolved,
        specification: generateDefaultSpecification(),
        abstract: generateDefaultAbstract(),
      });
      await loadApplications();
      await loadApplication(app.id);
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateTechnicalField('');
      setCreateProblemSolved('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await deletePatentApplication(selectedApp.id);
      setSelectedApp(null);
      setShowDeleteModal(false);
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSpecification = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await updatePatentApplication(selectedApp.id, { specification: tempSpec });
      setSelectedApp({ ...selectedApp, specification: tempSpec });
      setEditingSpec(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save specification');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAbstract = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await updatePatentApplication(selectedApp.id, { abstract: tempAbstract });
      setSelectedApp({ ...selectedApp, abstract: tempAbstract });
      setEditingAbstract(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save abstract');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateClaims = async () => {
    if (!selectedApp) return;
    setGenerating(true);
    try {
      const claims = await generateClaimsForApplication(selectedApp.id);
      setSelectedApp({ ...selectedApp, claims });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate claims');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateDrawings = async () => {
    if (!selectedApp || !projectId) return;
    setGenerating(true);
    try {
      const drawings = await generateDrawingsForApplication(selectedApp.id, projectId);
      setSelectedApp({ ...selectedApp, drawings });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drawings');
    } finally {
      setGenerating(false);
    }
  };

  const handleAIGeneration = async () => {
    if (!selectedApp || !projectId || !user) return;
    setAiGenerating(true);
    setShowAiModal(true);
    setError(null);
    try {
      await generateCompletePatentApplication(
        {
          applicationId: selectedApp.id,
          projectId,
          userId: user.id,
          title: selectedApp.title,
          description: selectedApp.invention_description || '',
          skipPriorArtSearch: false,
          useAIClaims: true
        },
        (progress) => { setAiProgress(progress); }
      );
      await loadApplication(selectedApp.id);
      setShowAiModal(false);
      setAiProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate patent application');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedApp) return;
    setExporting(true);
    try {
      const drawingsWithImages: Map<number, string> = new Map();
      if (selectedApp.drawings.length > 0) {
        for (const drawing of selectedApp.drawings) {
          if (drawing.svg_content) {
            try {
              const pngDataUrl = await convertSvgToPng(drawing.svg_content, 800, 600);
              drawingsWithImages.set(drawing.figure_number, pngDataUrl);
            } catch { /* skip failed drawings */ }
          }
        }
      }

      const pdf = createUsptoCompliantPdf();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = getPageHeight(pdf);
      const margin = PDF_MARGINS.top;
      const maxWidth = getMaxTextWidth(pdf);
      let yPos = margin;

      setPatentFont(pdf, 'bold');
      pdf.setFontSize(14);
      const titleLines = pdf.splitTextToSize(selectedApp.title.toUpperCase(), maxWidth);
      titleLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
        yPos += 18;
      });
      yPos += 12;

      setPatentFont(pdf, 'normal');
      pdf.setFontSize(12);
      if (selectedApp.inventor_name) {
        pdf.text(`Inventor: ${selectedApp.inventor_name}`, margin, yPos);
        yPos += 18;
      }
      pdf.text(`Citizenship: ${selectedApp.inventor_citizenship}`, margin, yPos);
      yPos += 30;

      if (selectedApp.abstract) {
        setPatentFont(pdf, 'bold');
        pdf.text('ABSTRACT', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;
        setPatentFont(pdf, 'normal');
        const abstractLines = pdf.splitTextToSize(selectedApp.abstract, maxWidth);
        pdf.text(abstractLines, margin, yPos);
        yPos += abstractLines.length * 14 + 30;
      }

      if (selectedApp.specification) {
        if (yPos > 600) { pdf.addPage(); yPos = margin; }
        const specLines = selectedApp.specification.split('\n');
        for (const line of specLines) {
          if (yPos > 700) { pdf.addPage(); yPos = margin; }
          if (line.match(/^[A-Z\s]+$/) && line.trim().length > 0) {
            setPatentFont(pdf, 'bold');
            yPos += 10;
            pdf.text(line, margin, yPos);
            setPatentFont(pdf, 'normal');
            yPos += 18;
          } else {
            const wrapped = pdf.splitTextToSize(line, maxWidth);
            pdf.text(wrapped, margin, yPos);
            yPos += wrapped.length * 14;
          }
        }
      }

      if (selectedApp.claims.length > 0) {
        pdf.addPage();
        yPos = margin;
        setPatentFont(pdf, 'bold');
        pdf.setFontSize(14);
        const claimsHeader = exportOptions.includeExemplaryClaims ? 'EXEMPLARY CLAIMS' : 'CLAIMS';
        pdf.text(claimsHeader, pageWidth / 2, yPos, { align: 'center' });
        yPos += 30;
        setPatentFont(pdf, 'normal');
        pdf.setFontSize(12);
        for (const claim of selectedApp.claims.sort((a, b) => a.claim_number - b.claim_number)) {
          if (yPos > 650) { pdf.addPage(); yPos = margin; }
          const claimText = `${claim.claim_number}. ${claim.claim_text}`;
          const wrapped = pdf.splitTextToSize(claimText, maxWidth);
          pdf.text(wrapped, margin, yPos);
          yPos += wrapped.length * 14 + 20;
        }
      }

      if (selectedApp.drawings.length > 0) {
        for (const drawing of selectedApp.drawings.sort((a, b) => a.figure_number - b.figure_number)) {
          pdf.addPage();
          setPatentFont(pdf, 'bold');
          pdf.setFontSize(12);
          pdf.text(`FIG. ${drawing.figure_number} - ${drawing.title}`, pageWidth / 2, margin, { align: 'center' });
          const pngDataUrl = drawingsWithImages.get(drawing.figure_number);
          if (pngDataUrl) {
            const imgMaxWidth = maxWidth;
            const imgMaxHeight = pageHeight - margin * 2 - 100;
            const aspectRatio = 800 / 600;
            let imgWidth = imgMaxWidth;
            let imgHeight = imgWidth / aspectRatio;
            if (imgHeight > imgMaxHeight) { imgHeight = imgMaxHeight; imgWidth = imgHeight * aspectRatio; }
            const imgX = (pageWidth - imgWidth) / 2;
            pdf.addImage(pngDataUrl, 'PNG', imgX, margin + 30, imgWidth, imgHeight);
          }
          setPatentFont(pdf, 'normal');
          pdf.setFontSize(12);
          if (drawing.description) {
            const descLines = pdf.splitTextToSize(drawing.description, maxWidth);
            const descY = pngDataUrl ? margin + 30 + (pageHeight - margin * 2 - 100) + 20 : margin + 50;
            pdf.text(descLines, margin, Math.min(descY, 680));
          }
        }
      }

      addPdfAMetadata(pdf, selectedApp.title, selectedApp.inventor_name || 'Unknown Inventor');
      pdf.save(`${selectedApp.title.replace(/\s+/g, '_')}_Patent_Application.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSectionPDF = async (section: string) => {
    if (!selectedApp) return;
    setExportingSection(section);
    try {
      const pdf = createUsptoCompliantPdf();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = PDF_MARGINS.top;
      const maxWidth = getMaxTextWidth(pdf);
      let yPos = margin;

      setPatentFont(pdf, 'bold');
      pdf.setFontSize(12);
      const titleLines = pdf.splitTextToSize(selectedApp.title.toUpperCase(), maxWidth);
      titleLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
        yPos += 16;
      });
      yPos += 20;

      setPatentFont(pdf, 'bold');
      pdf.setFontSize(14);
      pdf.text(section.toUpperCase().replace(/-/g, ' '), pageWidth / 2, yPos, { align: 'center' });
      yPos += 30;
      setPatentFont(pdf, 'normal');
      pdf.setFontSize(12);

      if (section === 'specification' && selectedApp.specification) {
        const specLines = pdf.splitTextToSize(selectedApp.specification, maxWidth);
        pdf.text(specLines, margin, yPos);
      } else if (section === 'abstract' && selectedApp.abstract) {
        const abstractLines = pdf.splitTextToSize(selectedApp.abstract, maxWidth);
        pdf.text(abstractLines, margin, yPos);
      }

      addPdfAMetadata(pdf, `${selectedApp.title} - ${section}`, selectedApp.inventor_name || 'Unknown Inventor');
      pdf.save(`${selectedApp.title.replace(/\s+/g, '_')}_${section}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to export ${section} PDF`);
    } finally {
      setExportingSection(null);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'specification', label: 'Specification', icon: FileText },
    { id: 'claims', label: 'Claims', icon: List },
    { id: 'drawings', label: 'Drawings', icon: Image },
    { id: 'abstract', label: 'Abstract', icon: BookOpen },
    { id: 'prior-art', label: 'Prior Art', icon: Scroll },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'filing', label: 'Filing', icon: ClipboardCheck },
    { id: 'export', label: 'Export', icon: Download }
  ];

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-shield-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading patent applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-shield-800 flex items-center gap-3">
            <Shield className="w-7 h-7 text-shield-600" />
            Patent Applications
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and generate patent documentation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-white border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Applications List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Applications</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {applications.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 text-sm">No applications yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-shield-600 hover:text-shield-700 text-sm font-medium transition-colors"
                  >
                    Create your first application
                  </button>
                </div>
              ) : (
                applications.map(app => (
                  <button
                    key={app.id}
                    onClick={() => loadApplication(app.id)}
                    className={`w-full px-4 py-3.5 text-left transition-colors ${
                      selectedApp?.id === app.id
                        ? 'bg-shield-50 border-l-3 border-l-shield-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{app.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(app.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedApp ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-slate-200 bg-white">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-shield-600 text-shield-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <PatentOverviewTab
                    application={selectedApp}
                    onUpdate={async (updates) => {
                      await updatePatentApplication(selectedApp.id, updates);
                      setSelectedApp({ ...selectedApp, ...updates });
                    }}
                    onDelete={() => setShowDeleteModal(true)}
                    onAIGenerate={handleAIGeneration}
                    aiGenerating={aiGenerating}
                    onNavigate={(tabId) => setActiveTab(tabId as TabId)}
                  />
                )}

                {activeTab === 'specification' && (
                  <PatentSpecificationTab
                    specification={editingSpec ? tempSpec : selectedApp.specification || ''}
                    editing={editingSpec}
                    saving={saving}
                    onEdit={() => { setTempSpec(selectedApp.specification || ''); setEditingSpec(true); }}
                    onChange={setTempSpec}
                    onSave={handleSaveSpecification}
                    onCancel={() => setEditingSpec(false)}
                    onRegenerate={() => setTempSpec(generateDefaultSpecification())}
                  />
                )}

                {activeTab === 'claims' && (
                  <PatentClaimsTab
                    claims={selectedApp.claims}
                    generating={generating}
                    onGenerate={handleGenerateClaims}
                  />
                )}

                {activeTab === 'drawings' && (
                  <PatentDrawingsTab
                    drawings={selectedApp.drawings}
                    generating={generating}
                    onGenerate={handleGenerateDrawings}
                    onRegenerateSingle={async (figureNumber) => {
                      if (!selectedApp || !projectId) return;
                      const newDrawing = await regenerateSingleDrawing(selectedApp.id, projectId, figureNumber);
                      if (newDrawing) {
                        setSelectedApp({
                          ...selectedApp,
                          drawings: selectedApp.drawings.map(d =>
                            d.figure_number === figureNumber ? newDrawing : d
                          ),
                        });
                      }
                    }}
                    onDrawingsUpdated={(updatedDrawings) => {
                      if (!selectedApp) return;
                      setSelectedApp({ ...selectedApp, drawings: updatedDrawings });
                    }}
                    inventionTitle={selectedApp.title}
                    claims={selectedApp.claims?.map(c => c.claim_text) || []}
                  />
                )}

                {activeTab === 'abstract' && (
                  <PatentAbstractTab
                    abstract={editingAbstract ? tempAbstract : selectedApp.abstract || ''}
                    editing={editingAbstract}
                    saving={saving}
                    onEdit={() => { setTempAbstract(selectedApp.abstract || ''); setEditingAbstract(true); }}
                    onChange={setTempAbstract}
                    onSave={handleSaveAbstract}
                    onCancel={() => setEditingAbstract(false)}
                    onRegenerate={() => setTempAbstract(generateDefaultAbstract())}
                  />
                )}

                {activeTab === 'prior-art' && (
                  <div className="text-center py-12">
                    <Scroll className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">Prior Art analysis coming soon</p>
                  </div>
                )}

                {activeTab === 'analysis' && (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">AI Analysis coming soon</p>
                  </div>
                )}

                {activeTab === 'filing' && (
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">Filing tools coming soon</p>
                  </div>
                )}

                {activeTab === 'export' && (
                  <PatentExportTab
                    application={selectedApp}
                    onExportPDF={handleExportPDF}
                    onExportSectionPDF={handleExportSectionPDF}
                    exporting={exporting}
                    exportingSection={exportingSection}
                    exportOptions={exportOptions}
                    onExportOptionsChange={setExportOptions}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
              <Shield className="w-14 h-14 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Application Selected</h3>
              <p className="text-slate-500 text-sm mb-6">Select an application from the list or create a new one to get started.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Application
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">New Patent Application</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none transition-shadow"
                  placeholder="Enter patent title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Invention Description</label>
                <textarea
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none transition-shadow"
                  placeholder="Describe what your invention does and how it works..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Technical Field</label>
                  <input
                    type="text"
                    value={createTechnicalField}
                    onChange={e => setCreateTechnicalField(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none transition-shadow"
                    placeholder="e.g., Data processing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Problem Solved</label>
                  <input
                    type="text"
                    value={createProblemSolved}
                    onChange={e => setCreateProblemSolved(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-shield-500 focus:border-shield-500 outline-none transition-shadow"
                    placeholder="What problem does it solve?"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApplication}
                disabled={saving || !createTitle.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedApp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Delete Application</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{selectedApp.title}"</span>? This will permanently remove all claims, drawings, and specification data. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteApplication}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Progress Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <Sparkles className="w-10 h-10 text-shield-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Generating Patent Application</h3>
            {aiProgress && (
              <div className="mt-4 space-y-3">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-shield-600 rounded-full transition-all duration-500"
                    style={{ width: `${(aiProgress.step / aiProgress.totalSteps) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  Step {aiProgress.step} of {aiProgress.totalSteps}: {aiProgress.currentStep}
                </p>
              </div>
            )}
            {!aiGenerating && (
              <button
                onClick={() => { setShowAiModal(false); setAiProgress(null); }}
                className="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
