/**
 * One-off seed: register the Google Maps Leads feature in the ERP registry
 * and enable it for all workspaces. Mirrors migration 005 but runs over the
 * Supabase service-role client (PostgREST can't execute a PL/pgSQL DO block).
 *
 * Usage:  node server/scripts/register_gmaps_feature.mjs
 * Idempotent: safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load server/.env manually (no dotenv dependency needed here)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false }, realtime: { transport: ws } });

async function main() {
  // 1. Find or create the Marketing division ---------------------------------
  let divisionId;
  const { data: divisions, error: divErr } = await sb
    .from('erp_divisions')
    .select('id, division_key, title, client_visible, status');
  if (divErr) throw new Error(`read erp_divisions: ${divErr.message}`);

  const marketing = (divisions || []).find(
    (d) => d.division_key === 'marketing' || (d.title || '').toLowerCase() === 'marketing'
  );

  if (marketing) {
    divisionId = marketing.id;
    if (!marketing.client_visible || marketing.status !== 'active') {
      await sb.from('erp_divisions')
        .update({ client_visible: true, status: 'active' })
        .eq('id', divisionId);
    }
    console.log(`✓ Marketing division exists (${divisionId})`);
  } else {
    const { data, error } = await sb.from('erp_divisions').insert({
      division_key: 'marketing',
      title: 'Marketing',
      icon: 'Megaphone',
      description: 'Campaigns, lead generation, and outreach tools.',
      order_index: 55,
      admin_visible: true,
      client_visible: true,
      status: 'active',
    }).select('id').single();
    if (error) throw new Error(`create Marketing division: ${error.message}`);
    divisionId = data.id;
    console.log(`✓ Created Marketing division (${divisionId})`);
  }

  // 2. Register / update the google_maps_leads feature -----------------------
  const featurePayload = {
    division_id: divisionId,
    feature_key: 'google_maps_leads',
    label: 'Google Maps Leads',
    icon: 'MapPin',
    description: 'Find & enrich local business leads from Google Maps using AI.',
    admin_route: '/Admin/GoogleMapsLeads',
    client_route: '/Client/GoogleMapsLeads',
    admin_visible: true,
    client_visible: true,
    status: 'active',
    auto_enable_with_division: false,
    order_index: 10,
  };

  const { data: existingFeat } = await sb
    .from('erp_features')
    .select('id')
    .eq('feature_key', 'google_maps_leads')
    .maybeSingle();

  if (existingFeat) {
    const { error } = await sb.from('erp_features')
      .update(featurePayload)
      .eq('id', existingFeat.id);
    if (error) throw new Error(`update feature: ${error.message}`);
    console.log('✓ Updated google_maps_leads feature');
  } else {
    const { error } = await sb.from('erp_features').insert(featurePayload);
    if (error) throw new Error(`insert feature: ${error.message}`);
    console.log('✓ Inserted google_maps_leads feature');
  }

  // 3. Enable for every workspace -------------------------------------------
  const { data: workspaces, error: wsErr } = await sb.from('workspaces').select('id');
  if (wsErr) throw new Error(`read workspaces: ${wsErr.message}`);

  const { data: existingAccess } = await sb
    .from('workspace_feature_access')
    .select('workspace_id')
    .eq('feature_key', 'google_maps_leads');
  const have = new Set((existingAccess || []).map((r) => r.workspace_id));

  const toInsert = (workspaces || [])
    .filter((w) => !have.has(w.id))
    .map((w) => ({ workspace_id: w.id, feature_key: 'google_maps_leads', is_enabled: true }));

  if (toInsert.length) {
    const { error } = await sb.from('workspace_feature_access').insert(toInsert);
    if (error) throw new Error(`enable per workspace: ${error.message}`);
  }
  console.log(`✓ Enabled for ${toInsert.length} new workspace(s) (${have.size} already had it)`);

  console.log('\n✅ Google Maps Leads is now registered + enabled.');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
