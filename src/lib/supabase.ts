// SUPABASE CLIENT
// Creates one shared connection to our Supabase backend.
// Any screen that needs the database or photo storage imports `supabase` from here.

// STEP 1: Load polyfills React Native needs before Supabase can run
//   1a. url-polyfill adds the URL tools Supabase uses (built into browsers, missing in React Native)
//   1b. session-storage gives Supabase a place to save the user's login session
//       (SQLite on phones, the browser's own localStorage on web; see src/lib/session-storage*.ts)
import 'react-native-url-polyfill/auto';
import './session-storage';
import {createClient} from '@supabase/supabase-js';

// STEP 2: Read the project URL and public key from .env.local
//   The EXPO_PUBLIC_ prefix is what lets the app read these values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// STEP 3: Create and export the client
//   3a. storage: save the session so users stay signed in between launches
//       (skipped when there's no localStorage, e.g. while the web server pre-renders pages)
//   3b. autoRefreshToken: renew the login automatically before it expires
//   3c. persistSession: keep the session after the app closes
//   3d. detectSessionInUrl: off, since that's only used for web login redirects
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
