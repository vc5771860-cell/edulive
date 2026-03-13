/* ============================================================
   config.js — YOUR Supabase connection details
   
   STEP 1: Go to supabase.com → your project
   STEP 2: Click Settings (gear icon) → API
   STEP 3: Copy your Project URL and anon public key
   STEP 4: Paste them below replacing the placeholder text
   ============================================================ */

const SUPABASE_URL  = https://idjdmaxqqchobtzmjiuk.supabase.co;
const SUPABASE_ANON = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkamRtYXhxcWNob2J0em1qaXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTAzODQsImV4cCI6MjA4ODk4NjM4NH0.2MdhhXg-MRgJelpcGCdZpIvHQaNkw7vAn_tJQD6Scus;

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
