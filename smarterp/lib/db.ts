import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a single shared DB client using the service role key to bypass RLS for server operations.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
