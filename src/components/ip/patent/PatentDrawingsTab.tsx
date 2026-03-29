import { useState } from 'react';
import { FileImage, Loader2, RefreshCw, X, Sparkles } from 'lucide-react';
import type { PatentDrawing } from '../../../services/patent/patentApplicationService';
import { svgToDataUrl, enhanceCalloutDescriptions } from '../../../services/patent/patentDrawingsService';

interface PatentDrawingsTabProps {
  drawings: PatentDrawing[];
  generating: boolean;
  onGenerate: () => void;
  onRegenerateSingle?: (figureNumber: number) => Promise<void>;
  onDrawingsUpdated?: (drawings: PatentDrawing[]) => void;
  inventionTitle?: string;
  claims?: string[];
}

export function PatentDrawingsTab({ drawings, generating, onGenerate, onRegenerateSingle, onDrawingsUpdated, inventionTitle, claims }: PatentDrawingsTabProps) {
  const [selectedDrawing, setSelectedDrawing] = useState<PatentDrawing | null>(null);
  const [regeneratingFigure, setRegeneratingFigure] = useState<number | null>(null);
  const [enhancingCallouts, setEnhancingCallouts] = useState(false);

  const handleEnhanceCallouts = async () => {
    if (!inventionTitle || drawings.length === 0) return;
    setEnhancingCallouts(true);
    try {
      const allCallouts = drawings.flatMap(d => d.callouts || []);
      const enhanced = await enhanceCalloutDescriptions(allCallouts, inventionTitle, claims || []);
      const updatedDrawings = drawings.map(d => ({
        ...d,
        callouts: (d.callouts || []).map(c => {
          const enhancedVersion = enhanced.find(e => e.number === c.number);
          return enhancedVersion ? { ...c, description: enhancedVersion.description } : c;
        }),
      }));
      onDrawingsUpdated?.(updatedDrawings);
    } catch (error) {
      console.error('Failed to enhance callouts:', error);
    } finally {
      setEnhancingCallouts(false);
    }
  };

  const handleRegenerateSingle = async (figureNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRegenerateSingle || regeneratingFigure !== null) return;
    setRegeneratingFigure(figureNumber);
    try {
      await onRegenerateSingle(figureNumber);
    } finally {
      setRegeneratingFigure(null);
    }
  };

  const sortedDrawings = [...drawings].sort((a, b) => a.figure_number - b.figure_number);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Patent Drawings</h2>
        <div className="flex items-center gap-2">
          {drawings.length > 0 && inventionTitle && (
            <button
              onClick={handleEnhanceCallouts}
              disabled={enhancingCallouts}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-shield-600 border border-shield-200 rounded-lg hover:bg-shield-50 disabled:opacity-50 transition-colors"
            >
              {enhancingCallouts ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enhancing...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Enhance Descriptions</>
              )}
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Generate Drawings</>
            )}
          </button>
        </div>
      </div>

      {/* Drawings Grid */}
      {drawings.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
          <FileImage className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 mb-1">No Patent Drawings Yet</p>
          <p className="text-xs text-slate-500 mb-4">
            Generate technical diagrams for your patent application
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedDrawings.map(drawing => (
            <div
              key={drawing.id}
              className="group bg-white border border-slate-200 rounded-lg p-3 hover:border-shield-300 hover:shadow-sm cursor-pointer transition-all"
              onClick={() => setSelectedDrawing(drawing)}
            >
              <div className="aspect-[4/3] bg-slate-50 border border-slate-100 rounded overflow-hidden mb-2.5">
                {drawing.svg_content && (
                  <img
                    src={svgToDataUrl(drawing.svg_content)}
                    alt={`FIG. ${drawing.figure_number}`}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">FIG. {drawing.figure_number}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{drawing.title}</p>
                </div>
                {onRegenerateSingle && (
                  <button
                    onClick={(e) => handleRegenerateSingle(drawing.figure_number, e)}
                    disabled={regeneratingFigure !== null}
                    className="p-1.5 text-slate-400 hover:text-shield-600 hover:bg-shield-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                    title="Regenerate drawing"
                  >
                    {regeneratingFigure === drawing.figure_number ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawing Detail Modal */}
      {selectedDrawing && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDrawing(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-sm font-semibold text-slate-800">
                FIG. {selectedDrawing.figure_number} - {selectedDrawing.title}
              </h3>
              <div className="flex items-center gap-2">
                {onRegenerateSingle && (
                  <button
                    onClick={(e) => handleRegenerateSingle(selectedDrawing.figure_number, e)}
                    disabled={regeneratingFigure !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-shield-600 hover:bg-shield-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {regeneratingFigure === selectedDrawing.figure_number ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Regenerate
                  </button>
                )}
                <button
                  onClick={() => setSelectedDrawing(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {selectedDrawing.svg_content && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                  <img
                    src={svgToDataUrl(selectedDrawing.svg_content)}
                    alt={`FIG. ${selectedDrawing.figure_number}`}
                    className="w-full"
                  />
                </div>
              )}
              {selectedDrawing.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{selectedDrawing.description}</p>
              )}

              {/* Callouts List */}
              {selectedDrawing.callouts && selectedDrawing.callouts.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Reference Numbers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDrawing.callouts.map((callout, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="flex-shrink-0 w-8 h-6 bg-shield-50 border border-shield-200 text-shield-700 text-xs font-mono font-bold rounded flex items-center justify-center">
                          {callout.number}
                        </span>
                        <span className="text-slate-600 text-xs leading-relaxed">{callout.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
