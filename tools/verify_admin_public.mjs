import assert from 'node:assert/strict';
const base='https://qkukvltevryegjbnwcgg.supabase.co/functions/v1/';
const feed=await fetch(base+'event-feed');assert.equal(feed.status,200);
const data=await feed.json();assert(Array.isArray(data.events));assert(Number.isFinite(Date.parse(data.server_time)));
console.log(`PASS event-feed: ${data.events.length} active events, server clock available`);
const admin=await fetch(base+'admin-center-api',{method:'POST',headers:{'content-type':'application/json'},body:'{"action":"me"}'});assert.equal(admin.status,401);console.log('PASS unauthenticated admin access denied');
const bot=await fetch(base+'beta-discord',{method:'POST',body:'{"type":1}'});assert.equal(bot.status,401);console.log('PASS unsigned Discord interaction denied');
