// Supabase credentials
export const SUPABASE_URL = "https://shsvitucpxmutxyyuqfg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_j2Xqe9mTX9RMO76wy1m3lg_pPlceFnA";

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);