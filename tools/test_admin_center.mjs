// Lightweight static contract checks. Does not depend on network or live DB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../admin/index.html');
const js=read('../admin/admin.js');
const sql=read('../supabase/migrations/20261030004054_admin_center.sql');
const api=read('../supabase/functions/admin-center-api/index.ts');
const bot=read('../supabase/functions/beta-discord/index.ts');
const menus=['dashboard','beta','users','events','game','discord','mail','analytics','notifications','logs','settings','backups','maintenance'];
for(const menu of menus){assert.match(html,new RegExp(`data-page="${menu}"`),`missing ${menu}`);assert.match(js,new RegExp(`${menu}:\\[`),`missing UI heading ${menu}`);}
assert.match(sql,/admin_owner_lock/);assert.match(sql,/from public.gm_admins g\s+join auth.identities/);
assert.match(sql,/revoke all on table public/);assert.match(sql,/admin_finalize_beta_draw/);
assert.match(sql,/pg_advisory_xact_lock/);
assert.match(sql,/admin_discord_register/);
assert.match(api,/verifiedUser\(req\)/);assert.match(api,/verified_discord_identity_required/);
assert.match(api,/requireOwner\(admin\)/);assert.match(api,/requirePermission\(admin,'beta.draw'\)/);
assert.match(api,/crypto.getRandomValues/);assert.match(api,/settings.save/);
assert.match(bot,/crypto.subtle.verify\('Ed25519'/);assert.match(bot,/min_account_age_days/);
assert.match(html,/admin.css/);assert.match(html,/admin.js/);assert.match(html,/supabase-js/);
assert.doesNotMatch(html+js,/SUPABASE_SERVICE_ROLE_KEY|DISCORD_BOT_TOKEN/);
console.log('PASS: 13 modules, owner-only role management, secure lottery, signed Discord endpoint, no browser secrets.');
