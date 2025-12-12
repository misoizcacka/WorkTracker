import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase project URL and Publishable Key
// In a production environment, these should be loaded from environment variables
// e.g., process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!; // Using '!' to assert non-null as per Expo's env loading
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!; // Using '!' to assert non-null as per Expo's env loading

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: AsyncStorage,
    autoRefreshToken: true,
  },
});

