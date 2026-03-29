import { useState } from 'react';
import { List, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { PatentClaim } from '../../../services/patent/patentApplicationService';
import {
  formatClaimForDisplay,
  getClaimTypeLabel,
  getCategoryLabel,
} from '../../../services/patent/patentClaimsService';

interface PatentClaimsTabProps {
  claims: PatentClaim[];
  generating: boolean;
  onGenerate: () => void;
}

export function PatentClaimsTab({ claims, generating, onGenerate }: PatentClaimsTabProps) {
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  const sortedClaims = [...claims].sort((a, b) => a.claim_number - b.claim_number);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Patent Claims</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Generate Claims</>
          )}
        </button>
      </div>

      {/* Claims Count Summary */}
      {claims.length > 0 && (
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Total</span>
            <span className="text-sm font-semibold text-slate-700">{claims.length}</span>
          </div>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-shield-500" />
            <span className="text-xs text-slate-500">Independent</span>
            <span className="text-sm font-medium text-slate-700">
              {claims.filter(c => c.claim_type === 'independent').length}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-500">Dependent</span>
            <span className="text-sm font-medium text-slate-700">
              {claims.filter(c => c.claim_type === 'dependent').length}
            </span>
          </div>
        </div>
      )}

      {/* Claims List */}
      {claims.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-lg">
          <List className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600 text-sm mb-4">No claims generated yet</p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-shield-600 text-white text-sm font-medium rounded-lg hover:bg-shield-700 disabled:opacity-50 transition-colors"
          >
            Generate Claims
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedClaims.map(claim => (
            <div
              key={claim.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 transition-colors"
            >
              <button
                onClick={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-shield-50 text-shield-700 border border-shield-200 rounded-full flex items-center justify-center text-xs font-semibold">
                    {claim.claim_number}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      claim.claim_type === 'independent'
                        ? 'bg-shield-50 text-shield-700 border border-shield-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {getClaimTypeLabel(claim.claim_type)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      {getCategoryLabel(claim.category)}
                    </span>
                  </div>
                </div>
                {expandedClaim === claim.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedClaim === claim.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 mt-3 bg-slate-50 border border-slate-200 p-4 rounded-lg leading-relaxed">
                    {formatClaimForDisplay(claim)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
