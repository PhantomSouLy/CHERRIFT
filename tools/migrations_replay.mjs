import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const folder=new URL('../supabase/migrations/',import.meta.url);
const files=(await readdir(folder)).filter(name=>name.endsWith('.sql')).sort();
const correction=files.find(name=>name.endsWith('_reconcile_legacy_migration_versions.sql'));
assert(correction,'Missing baseline reconciliation migration');
const correctionSql=await readFile(new URL(correction,folder),'utf8');
const db=new PGlite();
try {
  // Supabase supplies these roles and auth objects before application migrations.
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,created_at timestamptz default now(),raw_user_meta_data jsonb default '{}',email text);
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),provider text,provider_id text);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
  const seen=new Set();
  for(const file of files){
    const match=file.match(/^(\d{14})_([a-z0-9_]+)\.sql$/);
    assert(match,`Malformed migration: ${file}`);assert(!seen.has(match[1]),`Duplicate version: ${file}`);seen.add(match[1]);
    // Native gen_random_uuid() is available. The extension installer itself
    // belongs to Supabase and is the only SQL omitted by this test harness.
    const sql=(await readFile(new URL(file,folder),'utf8')).replace(/^create extension if not exists pgcrypto;\s*$/gmi,'');
    try{await db.exec(sql);}catch(error){throw new Error(`Migration replay failed: ${file}`,{cause:error});}
    await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)',[match[1],match[2]]);
    console.log(`PASS ${file}`);
  }
  await db.exec(correctionSql);
  assert.equal((await db.query('select count(*)::int as n from supabase_migrations.schema_migrations')).rows[0].n,files.length);
  console.log('PASS reconciliation is idempotent on a fully tracked database');

  // Reproduce the exact old partial history without touching any real database.
  await db.exec(`delete from supabase_migrations.schema_migrations;
    insert into supabase_migrations.schema_migrations(version,name) values
      ('20260730','gm_tool_pack'),('20260731','bugfix_v0941_chest_only'),('20261026013809','save_gm_revision_repair_20261026');
    insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
    insert into public.game_saves(user_id,save_data) values('00000000-0000-4000-8000-000000000001','{"coins":987,"account":{"level":7}}');`);
  const before=(await db.query('select save_data from public.game_saves')).rows[0].save_data;
  await db.exec(correctionSql);
  await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)',[correction.slice(0,14),'reconcile_legacy_migration_versions']);
  assert.deepEqual((await db.query('select save_data from public.game_saves')).rows[0].save_data,before);
  const versions=(await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(row=>row.version);
  assert.deepEqual(versions,files.filter(file=>file<=correction).map(file=>file.slice(0,14)));
  const rights=await db.query(`select has_table_privilege('authenticated','public.game_saves','UPDATE') as can_write;`);
  assert.equal(rights.rows[0].can_write,false);
  const trigger=await db.query(`select pg_get_triggerdef(oid) as definition from pg_trigger where tgrelid='public.game_saves'::regclass and not tgisinternal;`);
  assert(trigger.rows.some(row=>row.definition.includes('set_cherrift_save_updated_at()')));
  const noOp=await db.query(`with old as materialized(select user_id,updated_at from public.game_saves),checked as
    (update public.game_saves s set save_data=s.save_data from old where s.user_id=old.user_id returning s.updated_at=old.updated_at as preserved)
    select bool_and(preserved) as ok from checked;`);
  assert.equal(noOp.rows[0].ok,true);
  console.log('PASS partial history repair preserves progression, matches local history, retains safe writes and stable save revisions');
}finally{await db.close();}
