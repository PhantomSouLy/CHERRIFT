/**
 * CHERRIFT Local Preview
 * Runs strictly on 127.0.0.1, serves the EXISTING repo files unmodified,
 * and replaces online auth/config with in-memory LOCAL-only preview adapters.
 * No packages or production credentials are needed.
 */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.CHERRIFT_PREVIEW_ROOT || path.join(folder, '..'));
const host = '127.0.0.1';
const port = Number(process.env.CHERRIFT_PREVIEW_PORT || 5178);
const self = `http://${host}:${port}`;
const authScript = fs.readFileSync(path.join(folder, 'preview-auth.js'), 'utf8');
const overlayScript = fs.readFileSync(path.join(folder, 'preview-overlay.js'), 'utf8');
const indexPath = path.join(root, 'index.html');
const gameplayPath = path.join(root, 'supabase', 'functions', '_shared', 'gameplay.mjs');
const catalogPath = path.join(root, 'supabase', 'functions', '_shared', 'game_catalog.json');
const streams = new Set();
let reloadTimer = null;
let watcher = null;
let engine = null;
let engineStamp = -1;
const lastFileHash = new Map();
const filesWaiting = new Set();
let lastChangeAt = 0;
const launchedAt = Date.now();
let acceptedChanges = 0;

if (!fs.existsSync(indexPath) || !fs.existsSync(gameplayPath) || !fs.existsSync(catalogPath)) {
  console.error('\n[CHERRIFT Preview] Nem a teljes CHERRIFT repository mellett található a local-preview mappa.');
  console.error('Elvárt: CHERRIFT\\index.html és CHERRIFT\\local-preview\\preview-server.mjs');
  console.error(`Jelenlegi root: ${root}\n`);
  process.exit(1);
}
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  console.error('Hibás CHERRIFT_PREVIEW_PORT.');
  process.exit(1);
}

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png':'image/png',
  '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
  '.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav',
  '.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm'
};
const common = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "connect-src 'self'; form-action 'self'; base-uri 'self'",
  'Cross-Origin-Resource-Policy': 'same-origin'
};
function respond(res, status, body, contentType = 'text/plain; charset=utf-8', extra={}) {
  res.writeHead(status, {...common, 'Content-Type': contentType, ...extra});
  res.end(body);
}
function catalogFixture() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  return { skins: (catalog.skins || []).map(x => x.id), stages: (catalog.stages || []).map(x => x.id) };
}
function configScript() {
  return `// Generated ONLY by the loopback preview server; no live Supabase URL/key.\n`+
    `window.__CHERRIFT_EXTERNAL_AUTH__ = true;\n`+
    `window.CHERRIFT_SUPABASE_CONFIG = Object.freeze({url:'', publishableKey:'',guestEnabled:false});\n`+
    `window.CHERRIFT_PREVIEW = Object.freeze(${JSON.stringify(catalogFixture())});\n`;
}
function previewHtml() {
  let html = fs.readFileSync(indexPath, 'utf8');
  const swaps = [
    ['src/supabase_config.js','/__preview__/config.js'],
    ['src/cherrift_auth.js','/__preview__/auth.js']
  ];
  for (const [from, to] of swaps) {
    const pattern = new RegExp(`(?<=\\bsrc=["'])${from.replaceAll('.', '\\.')}(?:\\?[^"']*)?(?=["'])`, 'g');
    const next = html.replace(pattern, to);
    if (next === html) throw new Error(`Hiányzó preview cserepont: ${from}`);
    html = next;
  }
  html = html.replace(/<\/body>/i, '<script src="/__preview__/overlay.js"></script>\n</body>');
  html = html.replace(/<title>([^<]*)<\/title>/i, '<title>CHERRIFT · LOCAL PREVIEW</title>');
  return html;
}
async function localGameplay() {
  const stat = fs.statSync(gameplayPath);
  if (!engine || engineStamp !== stat.mtimeMs) {
    engine = await import(`${pathToFileURL(gameplayPath).href}?preview=${stat.mtimeMs}`);
    engineStamp = stat.mtimeMs;
  }
  return engine;
}
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (origin && origin !== self) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  return true;
}
async function handleAction(req, res) {
  if (!isSameOrigin(req) || req.headers['content-type']?.split(';')[0] !== 'application/json') {
    return respond(res, 403, JSON.stringify({ok:false,error:'forbidden'}), 'application/json');
  }
  let body = '';
  try {
    for await (const chunk of req) {
      body += chunk.toString('utf8');
      if (body.length > 8_000_000) throw new Error('preview_save_too_large');
    }
    const request = JSON.parse(body);
    if (typeof request.operation !== 'string' || request.operation.length > 80 || !request.save || typeof request.save !== 'object' || Array.isArray(request.save)) throw new Error('invalid_preview_request');
    const { applyGameAction } = await localGameplay();
    const { save, rewards } = applyGameAction(request.save, request.operation, request.params || {});
    respond(res, 200, JSON.stringify({ok:true,save_data:save,rewards:rewards||[],updated_at:new Date().toISOString()}), 'application/json');
  } catch (error) {
    console.warn(`[PREVIEW ACTION] ${String(error?.message || error)}`);
    respond(res, 400, JSON.stringify({ok:false,error:String(error?.message || error)}), 'application/json');
  }
}
function sendSse(res, name, payload) {
  try {res.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);} catch {streams.delete(res);}
}
// The original watcher refreshed for *every* repo file event, including test,
// editor and metadata writes. This could send the browser back to Loading
// repeatedly without any relevant game file having changed.
function isGameFile(name) {
  const p = String(name || '').replaceAll('\\', '/');
  if (p === 'index.html') return true;
  if (/^supabase\/functions\/_shared\/(gameplay\.mjs|game_catalog\.json)$/.test(p)) return true;
  if (!/^(assets|src|vendor)\//.test(p)) return false;
  if (p.split('/').some(part => part.startsWith('.'))) return false;
  return /\.(?:html|css|js|mjs|json|png|webp|jpg|jpeg|gif|svg|ico|woff2?|ttf|ogg|mp3|wav|mp4|webm|wasm)$/i.test(p);
}
function changed(name) {
  const relative = String(name || '').replaceAll('\\', '/');
  if (!isGameFile(relative)) return;
  filesWaiting.add(relative);
  lastChangeAt = Date.now();
  if (reloadTimer) clearTimeout(reloadTimer);
  // Editors sometimes write the same file several times when saving. Wait
  // until the write burst has settled rather than interrupting CHERRIFT boot.
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    const actual = [];
    for (const rel of filesWaiting) {
      const file = path.resolve(root, rel);
      if (!file.startsWith(root + path.sep)) continue;
      let digest;
      try {digest = createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
      catch {digest = 'deleted';}
      // Ignore stale file system notifications (common with editors, Windows Indexer,
      // OneDrive/antivirus). Only writes newer than this server instance count.
      // This prevents opening an asset from triggering a first-time reload.
      let modified = 0;
      try {modified = fs.statSync(file).mtimeMs;} catch {modified = Date.now();}
      if (modified < launchedAt - 1000 && !lastFileHash.has(rel)) continue;
      if (lastFileHash.get(rel) === digest) continue;
      lastFileHash.set(rel, digest);
      actual.push(rel);
    }
    filesWaiting.clear();
    if (!actual.length) return;
    acceptedChanges++;
    console.log('[PREVIEW] Forrás változott (nincs automatikus teljes oldalfrissítés):', actual.join(', '));
    for (const res of streams) sendSse(res, 'change', {paths:actual, changedAt:lastChangeAt});
  }, 1100);
}

function serveFile(req, res, pathname) {
  const decoded = decodeURIComponent(pathname).replaceAll('\\','/');
  const relative = decoded.replace(/^\/+/, '');
  if (!/^(?:assets|src|vendor)\//.test(relative)) return respond(res, 404, 'Nem elérhető');
  if (relative.split('/').some(p => p === '.' || p === '..' || p.startsWith('.'))) return respond(res, 403, 'Tiltott útvonal');
  const target = path.resolve(root, relative);
  const normalizedRoot = root + path.sep;
  if (!target.startsWith(normalizedRoot)) return respond(res, 403, 'Tiltott útvonal');
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return respond(res, 404, 'Fájl nem található');
    const ext = path.extname(target).toLowerCase();
    const range = req.headers.range;
    const type = mime[ext] || 'application/octet-stream';
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]),stat.size-1) : stat.size-1;
      if (start <= end && start < stat.size) {
        res.writeHead(206, {...common, 'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});
        return fs.createReadStream(target,{start,end}).pipe(res);
      }
      return respond(res,416,'Invalid range');
    }
    res.writeHead(200, {...common, 'Content-Type':type,'Content-Length':stat.size});
    const stream=fs.createReadStream(target);
    stream.on('error',()=>res.destroy());
    stream.pipe(res);
  });
}
const server = http.createServer(async (req, res) => {
  let pathname;
  try {pathname = new URL(req.url || '/', self).pathname;} catch {return respond(res,400,'Bad URL');}
  try {
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html'))
      return respond(res,200,previewHtml(),'text/html; charset=utf-8');
    if (req.method === 'GET' && pathname === '/__preview__/config.js')
      return respond(res,200,configScript(),'text/javascript; charset=utf-8');
    if (req.method === 'GET' && pathname === '/__preview__/auth.js')
      return respond(res,200,authScript,'text/javascript; charset=utf-8');
    if (req.method === 'GET' && pathname === '/__preview__/overlay.js')
      return respond(res,200,overlayScript,'text/javascript; charset=utf-8');
    if (req.method === 'GET' && pathname === '/__preview__/health')
      return respond(res,200,JSON.stringify({ok:true,mode:'local-preview-v3',root,watch:!!watcher,acceptedChanges}),'application/json');
    if (req.method === 'GET' && pathname === '/__preview__/events') {
      res.writeHead(200,{...common,'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});
      streams.add(res);
      sendSse(res,'ready',{ok:true});
      req.on('close',()=>streams.delete(res));
      return;
    }
    if (req.method === 'POST' && pathname === '/__preview__/action') return await handleAction(req,res);
    if (req.method === 'GET' || req.method === 'HEAD') return serveFile(req,res,pathname);
    return respond(res,405,'Method not allowed');
  } catch(error) {
    console.error('[PREVIEW]',error);
    return respond(res,500,'Preview error: '+String(error.message));
  }
});

try {watcher=fs.watch(root,{recursive:true},(_kind,filename)=>changed(String(filename||'')));}
catch(error){ console.warn('[PREVIEW] Automatikus fájlfigyelés nem sikerült:',error.message); }
const heartbeat=setInterval(()=>{for(const res of streams){try{res.write(': ping\n\n');}catch{streams.delete(res);}}},15000);
heartbeat.unref();
server.listen(port,host,()=>{
  console.log('\n===============================================');
  console.log(' CHERRIFT  |  LOCAL PREVIEW  |  OFFLINE DATA');
  console.log('===============================================');
  console.log(` Megnyitás: ${self}`);
  console.log(` Repo:      ${root}`);
  console.log(' Figyelés:  '+(watcher?'BE (CSS/kép hot frissítés; JS esetén kézi)':'KI (kézi F5)'));
  console.log(' Leállítás: Ctrl+C');
  console.log(' Éles Supabase: NINCS kapcsolat\n');
  if (process.platform==='win32' && !process.env.CHERRIFT_PREVIEW_NO_BROWSER) {
    const child=spawn('cmd.exe',['/c','start','',self],{detached:true,stdio:'ignore',windowsHide:true});
    child.unref();
  }
});
server.on('error',error=>{
  console.error('[PREVIEW] Nem indult el:',error.message);
  console.error(`Lehetséges, hogy a ${port}-es port már foglalt.`);
  process.exitCode=1;
});
process.on('SIGINT',()=>{watcher?.close();for(const res of streams)res.end();server.close();});
