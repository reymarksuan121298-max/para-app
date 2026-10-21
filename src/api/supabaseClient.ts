import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import Config from 'react-native-config';

// Endpoint and anon key come from .env through react-native-config at build
// time. There are deliberately no hard-coded fallbacks: a release build that is
// missing .env used to silently connect to a *different* Supabase project, so
// every login failed with "invalid email or password" instead of a clear
// configuration error. Never point the app at a hard-coded project.
const SUPABASE_URL = (Config.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (Config.SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// createClient() throws when the URL is empty, so a placeholder keeps module
// loading safe while App.tsx blocks the UI with a configuration error.
export const supabase = createClient(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY || 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
