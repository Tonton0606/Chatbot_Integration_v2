const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isValidKey = supabaseKey && (
  supabaseKey.startsWith('sb_secret_') ||
  supabaseKey.startsWith('eyJ')
);

if (!supabaseUrl || !isValidKey) {
  throw new Error("Missing SUPABASE_URL or valid SUPABASE_SERVICE_ROLE_KEY in server environment");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
});

module.exports = { supabase };
