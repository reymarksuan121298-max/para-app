import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import Config from 'react-native-config';

// Primary configuration from react-native-config with fallback values
const SUPABASE_URL =
  Config.SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://wcnppkcjnewyadeiistb.supabase.co';

const SUPABASE_ANON_KEY =
  Config.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbnBwa2NqbmV3eWFkZWlpc3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODk2MTQsImV4cCI6MjA5OTY2NTYxNH0.z8z7amH5ubtEjcKqb3rcoD7jLHdYyUJuF7hMz3s0YzI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
