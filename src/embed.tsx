/**
 * IP Shield — Embeddable Entry Point
 *
 * Use this to integrate IP Shield into other React applications.
 *
 * Usage:
 *   import { IPShieldWidget, CodebaseAnalyzer } from '@ip-shield/react';
 *
 *   <IPShieldWidget
 *     supabaseUrl="https://..."
 *     supabaseAnonKey="..."
 *     geminiApiKey="..."
 *     userId="uuid"
 *   />
 */

export { IPShieldWidget } from './components/embed/IPShieldWidget';
export { CodebaseUpload as CodebaseAnalyzer } from './components/analysis/CodebaseUpload';
export { AnalysisResults } from './components/analysis/AnalysisResults';
export { IPDashboard } from './components/ip/IPDashboard';
export { PatentApplication } from './components/ip/PatentApplication';
export { CopyrightApplication } from './components/ip/CopyrightApplication';
export { TrademarkApplication } from './components/ip/TrademarkApplication';

// Re-export types
export type { Project, CodeFile, ExtractedFeature, AnalysisProgress, AnalysisResult } from './types';
