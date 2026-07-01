import { createClient } from '@supabase/supabase-js';

// Use fallback placeholders during Next.js build phase if environment variables are not supplied.
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Create a single shared DB client using the service role key to bypass RLS for server operations.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
