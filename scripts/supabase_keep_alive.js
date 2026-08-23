/**
 * Supabase Keep-Alive Script
 * Prevents Supabase Free Tier projects from pausing due to 7-day inactivity.
 * Sends a lightweight query to the Supabase REST API.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env if present
['.env.local', '.env'].forEach((envFile) => {
  const envPath = path.resolve(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
});

async function keepSupabaseAlive() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ptgwpuvyutgnfnmuhsyo.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error('[Supabase Keep-Alive] Error: Missing SUPABASE_ANON_KEY or SUPABASE_KEY environment variable.');
    process.exit(1);
  }

  const normalizedUrl = supabaseUrl.replace(/\/+$/, '');
  const targetEndpoint = `${normalizedUrl}/rest/v1/`;

  console.log(`[Supabase Keep-Alive] Pinging Supabase project at ${normalizedUrl}...`);

  try {
    const response = await fetch(targetEndpoint, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[Supabase Keep-Alive] Received status ${response.status} (${response.statusText}).`);
    } else {
      console.log(`[Supabase Keep-Alive] Success: Project is active! (Status: ${response.status})`);
    }

    console.log(`[Supabase Keep-Alive] Completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[Supabase Keep-Alive] Request failed:', error.message);
    process.exit(1);
  }
}

keepSupabaseAlive();
