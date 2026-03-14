/* ============================================================
   config.js — YOUR Supabase connection details
   
   STEP 1: Go to supabase.com → your project
   STEP 2: Click Settings (gear icon) → API
   STEP 3: Copy your Project URL and anon public key
   STEP 4: Paste them below replacing the placeholder text
   ============================================================ */

const SUPABASE_URL  = 'PASTE_YOUR_PROJECT_URL_HERE';
const SUPABASE_ANON = 'PASTE_YOUR_ANON_KEY_HERE';

/* ── Supabase client (loaded from CDN in HTML) ── */
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Quick check to confirm connection is working ── */
async function checkConnection() {
  try {
    const { error } = await db.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
  } catch (e) {
    console.warn('⚠️ Supabase not connected yet. Did you paste your keys in config.js?', e.message);
  }
}

checkConnection();
