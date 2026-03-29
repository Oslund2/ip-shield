import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Untyped Supabase client for tables not yet in database.types.ts.
 * Use this when accessing tables that exist in the DB but haven't been
 * added to the generated types yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseUntyped = supabase as any;
