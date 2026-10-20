import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: AsyncStorage,
    autoRefreshToken: true,
    // On web, Supabase's navigator.locks causes a console error when the lock
    // can't be acquired immediately on init. Known bug: github.com/supabase/supabase-js/issues/1517
    // Workaround: bypass the LockManager on web with a simple pass-through function.
    ...(Platform.OS === 'web' && {
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
    }),
  },
});
