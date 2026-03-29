import { supabase } from '../../lib/supabase';
import {
  createCopyrightRegistration,
  type CopyrightRegistrationFormData,
  type CopyrightRegistration,
  type AIToolDetail,
  type HumanCreativeElement
} from './copyrightApplicationService';

export interface SourceFileForCopyright {
  id: string;
  name: string;
  path: string;
  description: string | null;
  language: string | null;
  lines_of_code: number | null;
  project_id: string | null;
  created_at: string;
  ai_generated?: boolean;
  generation_prompt?: string | null;
}

export interface ModuleForCopyright {
  id: string;
  name: string;
  description: string | null;
  entry_point: string | null;
  dependencies: string[];
  project_id: string | null;
  created_at: string;
  ai_generated: boolean;
  generation_prompt: string | null;
}

export interface BulkRegistrationItem {
  type: 'source_file' | 'module';
  id: string;
  title: string;
  description: string;
  isAIGenerated: boolean;
  generationPrompt?: string | null;
  sourceId: string;
  projectId?: string | null;
  createdAt: string;
}

export interface BulkRegistrationConfig {
  authorName: string;
  authorCitizenship?: string;
  authorDomicile?: string;
  authorBirthYear?: number;
  claimantName?: string;
  claimantAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  aiToolsUsed?: string[];
  aiToolDetails?: AIToolDetail[];
  humanAuthorshipStatement?: string;
  humanCreativeElements?: HumanCreativeElement[];
  defaultAiContributionPercentage?: number;
}

export interface BulkRegistrationProgress {
  total: number;
  completed: number;
  currentItem: string;
  registrations: CopyrightRegistration[];
  errors: { item: string; error: string }[];
}

export interface BulkRegistrationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  registrations: CopyrightRegistration[];
  errors: { item: string; error: string }[];
  bulkRegistrationId?: string;
}

export async function scanSourceFilesForCopyright(
  projectId: string
): Promise<SourceFileForCopyright[]> {
  const { data, error } = await (supabase as any)
    .from('source_files')
    .select('*')
    .eq('project_id', projectId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function scanModulesForCopyright(
  projectId: string
): Promise<ModuleForCopyright[]> {
  const { data, error } = await (supabase as any)
    .from('modules')
    .select('*')
    .eq('project_id', projectId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export function generateSourceFileCopyrightData(
  sourceFile: SourceFileForCopyright,
  config: BulkRegistrationConfig
): CopyrightRegistrationFormData {
  const description = [
    sourceFile.description,
    sourceFile.language ? `Language: ${sourceFile.language}` : null,
    sourceFile.lines_of_code ? `Lines of code: ${sourceFile.lines_of_code}` : null,
    sourceFile.path ? `File path: ${sourceFile.path}` : null
  ].filter(Boolean).join('\n\n');

  const isAIGenerated = sourceFile.ai_generated || false;
  const creationYear = new Date(sourceFile.created_at).getFullYear();

  return {
    title: sourceFile.name,
    registrationType: 'source_code',
    workType: 'literary_work',
    description: description || `Source code file "${sourceFile.name}"`,
    yearOfCompletion: creationYear,
    creationDate: sourceFile.created_at.split('T')[0],
    publicationStatus: 'unpublished',
    authorName: config.authorName,
    authorCitizenship: config.authorCitizenship,
    authorDomicile: config.authorDomicile,
    authorBirthYear: config.authorBirthYear,
    authorType: isAIGenerated ? 'joint_work' : 'individual',
    natureOfAuthorship: 'Computer program including source code, algorithms, and software architecture',
    claimantName: config.claimantName,
    claimantAddress: config.claimantAddress,
    containsAIGeneratedContent: isAIGenerated,
    aiContributionPercentage: isAIGenerated ? (config.defaultAiContributionPercentage || 30) : 0,
    aiToolsUsed: isAIGenerated ? (config.aiToolsUsed || []) : [],
    aiToolDetails: isAIGenerated ? config.aiToolDetails : undefined,
    humanAuthorshipStatement: isAIGenerated
      ? (config.humanAuthorshipStatement || 'Human author provided software architecture, algorithm design, code structure, and specifications. AI tools were used to assist with code generation and implementation details.')
      : undefined,
    humanCreativeElements: isAIGenerated ? (config.humanCreativeElements || [
      {
        element: 'Software Architecture',
        description: 'Original system design, module structure, and API design',
        contributionLevel: 'primary'
      },
      {
        element: 'Algorithm Design',
        description: 'Core algorithms, data structures, and business logic',
        contributionLevel: 'significant'
      }
    ]) : undefined
  };
}

export function generateModuleCopyrightData(
  module: ModuleForCopyright,
  config: BulkRegistrationConfig
): CopyrightRegistrationFormData {
  const description = [
    module.description,
    module.entry_point ? `Entry point: ${module.entry_point}` : null,
    module.dependencies?.length ? `Dependencies: ${module.dependencies.join(', ')}` : null
  ].filter(Boolean).join('\n\n');

  const creationYear = new Date(module.created_at).getFullYear();

  return {
    title: module.name,
    registrationType: 'module',
    workType: 'literary_work',
    description: description || `Software module "${module.name}"`,
    yearOfCompletion: creationYear,
    creationDate: module.created_at.split('T')[0],
    publicationStatus: 'unpublished',
    authorName: config.authorName,
    authorCitizenship: config.authorCitizenship,
    authorDomicile: config.authorDomicile,
    authorBirthYear: config.authorBirthYear,
    authorType: module.ai_generated ? 'joint_work' : 'individual',
    natureOfAuthorship: 'Software module including source code, interfaces, and functional implementation',
    claimantName: config.claimantName,
    claimantAddress: config.claimantAddress,
    containsAIGeneratedContent: module.ai_generated,
    aiContributionPercentage: module.ai_generated ? (config.defaultAiContributionPercentage || 40) : 0,
    aiToolsUsed: module.ai_generated ? (config.aiToolsUsed || []) : [],
    aiToolDetails: module.ai_generated ? config.aiToolDetails : undefined,
    humanAuthorshipStatement: module.ai_generated
      ? (config.humanAuthorshipStatement || 'Human author created the module architecture, interface contracts, algorithm design, and provided detailed specifications and editorial direction. AI tools assisted with code generation and implementation.')
      : undefined,
    humanCreativeElements: module.ai_generated ? (config.humanCreativeElements || [
      {
        element: 'Module Architecture',
        description: 'Original module design, interface contracts, and integration patterns',
        contributionLevel: 'primary'
      },
      {
        element: 'Business Logic',
        description: 'Core business rules, validation logic, and data transformation design',
        contributionLevel: 'primary'
      },
      {
        element: 'Code Review & Refinement',
        description: 'Review, revision, and optimization of AI-generated code',
        contributionLevel: 'significant'
      }
    ]) : undefined
  };
}

export function convertToBulkItem(
  item: SourceFileForCopyright | ModuleForCopyright,
  type: 'source_file' | 'module'
): BulkRegistrationItem {
  if (type === 'source_file') {
    const file = item as SourceFileForCopyright;
    return {
      type: 'source_file',
      id: file.id,
      title: file.name,
      description: file.description || '',
      isAIGenerated: file.ai_generated || false,
      generationPrompt: file.generation_prompt,
      sourceId: file.id,
      projectId: file.project_id,
      createdAt: file.created_at
    };
  } else {
    const mod = item as ModuleForCopyright;
    return {
      type: 'module',
      id: mod.id,
      title: mod.name,
      description: mod.description || '',
      isAIGenerated: mod.ai_generated,
      generationPrompt: mod.generation_prompt,
      sourceId: mod.id,
      projectId: mod.project_id,
      createdAt: mod.created_at
    };
  }
}

export async function checkExistingRegistrations(
  projectId: string,
  items: BulkRegistrationItem[]
): Promise<Map<string, string>> {
  const existingMap = new Map<string, string>();

  const { data: regs } = await (supabase as any)
    .from('copyright_registrations')
    .select('id, title, registration_type')
    .eq('project_id', projectId);

  if (regs) {
    const regMap = new Map(regs.map((r: any) => [`${r.registration_type}:${r.title}`, r.id]));
    for (const item of items) {
      const key = `${item.type === 'source_file' ? 'source_code' : 'module'}:${item.title}`;
      const existingId = regMap.get(key) as string | undefined;
      if (existingId) {
        existingMap.set(`${item.type}:${item.sourceId}`, existingId);
      }
    }
  }

  return existingMap;
}

export async function createBulkRegistration(
  projectId: string
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('copyright_bulk_registrations')
    .insert({
      project_id: projectId,
      status: 'pending',
      total_items: 0,
      completed_items: 0,
      created_by: userData?.user?.id
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateBulkRegistrationProgress(
  bulkRegistrationId: string,
  totalItems: number,
  completedItems: number,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  const { error } = await (supabase as any)
    .from('copyright_bulk_registrations')
    .update({
      total_items: totalItems,
      completed_items: completedItems,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', bulkRegistrationId);

  if (error) throw error;
}

export async function executeBulkRegistration(
  projectId: string,
  sourceFiles: SourceFileForCopyright[],
  modules: ModuleForCopyright[],
  config: BulkRegistrationConfig,
  onProgress?: (progress: BulkRegistrationProgress) => void
): Promise<BulkRegistrationResult> {
  const registrations: CopyrightRegistration[] = [];
  const errors: { item: string; error: string }[] = [];
  const totalItems = sourceFiles.length + modules.length;
  let completedItems = 0;

  let bulkRegistrationId: string | undefined;

  try {
    bulkRegistrationId = await createBulkRegistration(projectId);
    await updateBulkRegistrationProgress(bulkRegistrationId, totalItems, 0, 'processing');
  } catch (err) {
    console.warn('Could not create bulk registration record:', err);
  }

  for (const sourceFile of sourceFiles) {
    try {
      onProgress?.({
        total: totalItems,
        completed: completedItems,
        currentItem: `Registering source file: ${sourceFile.name}`,
        registrations,
        errors
      });

      const formData = generateSourceFileCopyrightData(sourceFile, config);
      const registration = await createCopyrightRegistration(projectId, formData);
      registrations.push(registration);
      completedItems++;

      if (bulkRegistrationId) {
        await linkRegistrationToBulk(bulkRegistrationId, registration.id);
      }
    } catch (err) {
      errors.push({
        item: `Source file: ${sourceFile.name}`,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      completedItems++;
    }
  }

  for (const module of modules) {
    try {
      onProgress?.({
        total: totalItems,
        completed: completedItems,
        currentItem: `Registering module: ${module.name}`,
        registrations,
        errors
      });

      const formData = generateModuleCopyrightData(module, config);
      const registration = await createCopyrightRegistration(projectId, formData);
      registrations.push(registration);
      completedItems++;

      if (bulkRegistrationId) {
        await linkRegistrationToBulk(bulkRegistrationId, registration.id);
      }
    } catch (err) {
      errors.push({
        item: `Module: ${module.name}`,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      completedItems++;
    }
  }

  if (bulkRegistrationId) {
    const finalStatus = errors.length === totalItems ? 'failed' : 'completed';
    await updateBulkRegistrationProgress(bulkRegistrationId, totalItems, completedItems, finalStatus);
  }

  onProgress?.({
    total: totalItems,
    completed: completedItems,
    currentItem: 'Complete',
    registrations,
    errors
  });

  return {
    success: errors.length < totalItems,
    totalProcessed: totalItems,
    successCount: registrations.length,
    failureCount: errors.length,
    registrations,
    errors,
    bulkRegistrationId
  };
}

async function linkRegistrationToBulk(
  bulkRegistrationId: string,
  registrationId: string
): Promise<void> {
  try {
    await (supabase as any)
      .from('copyright_bulk_registration_items')
      .insert({
        bulk_registration_id: bulkRegistrationId,
        registration_id: registrationId
      });
  } catch (err) {
    console.warn('Could not link registration to bulk:', err);
  }
}

export async function getBulkRegistrationHistory(
  projectId: string
): Promise<{
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  created_at: string;
}[]> {
  const { data, error } = await (supabase as any)
    .from('copyright_bulk_registrations')
    .select('id, status, total_items, completed_items, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function calculateBulkRegistrationFees(
  itemCount: number,
  useGroupRegistration: boolean = false
): {
  method: string;
  feePerItem: number;
  totalFee: number;
  savings: number;
} {
  const ONLINE_SINGLE = 45;
  const ONLINE_STANDARD = 65;
  const GROUP_REGISTRATION = 85;

  if (useGroupRegistration && itemCount > 1) {
    const groupCount = Math.ceil(itemCount / 10);
    const totalGroupFee = groupCount * GROUP_REGISTRATION;
    const standardTotal = itemCount * ONLINE_STANDARD;

    return {
      method: 'Group Registration',
      feePerItem: totalGroupFee / itemCount,
      totalFee: totalGroupFee,
      savings: standardTotal - totalGroupFee
    };
  }

  if (itemCount === 1) {
    return {
      method: 'Single Online',
      feePerItem: ONLINE_SINGLE,
      totalFee: ONLINE_SINGLE,
      savings: 0
    };
  }

  return {
    method: 'Standard Online',
    feePerItem: ONLINE_STANDARD,
    totalFee: itemCount * ONLINE_STANDARD,
    savings: 0
  };
}
