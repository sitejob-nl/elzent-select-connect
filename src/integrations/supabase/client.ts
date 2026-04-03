import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lvueuukiekykudfsvnmk.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dWV1dWtpZWt5a3VkZnN2bm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDEzMzQsImV4cCI6MjA5MDc3NzMzNH0.8vXOIVry8AWUaPKxLd6B1svAhW__xCvpHrQdsJyrlJk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});