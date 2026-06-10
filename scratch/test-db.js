global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for env variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Supabase URL:", supabaseUrl);
  try {
    const { data, error } = await supabase.from('corporate_skills').select('*');
    if (error) {
      console.error("Error fetching corporate_skills:", error);
    } else {
      console.log("Success! Data length:", data.length);
      if (data.length > 0) {
        console.log("First item name:", data[0].name);
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}
test();
