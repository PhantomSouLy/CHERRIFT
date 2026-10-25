/* Account-owned recovery archives. Migrate only after a committed IDB copy. */
(() => {
  'use strict';
  if (window.CHERRIFT_RECOVERY) return;
  const databaseName = 'cherrift-save-recovery-v1', storeName = 'accounts';
  const knownOwners = new Set();
  let opening = null;
  let migration = null;
  const legacyKey = owner => `cherrift-discord-backup-v2:${owner}:recovery`;

  function openDatabase() {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('indexeddb_unavailable')); return; }
      let settled = false;
      const request = window.indexedDB.open(databaseName, 1);
      const timer = window.setTimeout(() => finish(new Error('recovery_open_timeout')), 4000);
      function finish(error, db) {
        if (settled) { db?.close(); return; }
        settled = true; window.clearTimeout(timer);
        if (error) reject(error); else resolve(db);
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName))
          request.result.createObjectStore(storeName, {keyPath:'ownerUserId'});
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        finish(null, db);
      };
      request.onerror = () => finish(request.error || new Error('recovery_open_failed'));
      request.onblocked = () => finish(new Error('recovery_open_blocked'));
    }).catch(error => { opening = null; throw error; });
    return opening;
  }

  function legacy(owner) {
    let raw = null;
    try { raw = window.localStorage.getItem(legacyKey(owner)); }
    catch (_) { return {raw:null, records:[]}; }
    if (!raw) return {raw:null, records:[]};
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error('invalid_recovery_archive');
    // Do not discard malformed or cross-account legacy records during migration.
    if (records.some(r => r.ownerUserId !== owner || r.saveData?.security?.accountOwnerId !== owner))
      throw new Error('invalid_recovery_owner');
    return {raw, records};
  }

  async function archive(owner, snapshot = null) {
    const db = await openDatabase(), previous = legacy(owner);
    let count = 0;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName), request = store.get(owner);
      request.onsuccess = () => {
        try {
          const records = request.result?.snapshots || [];
          const imported = new Set(records.map(record => JSON.stringify(record)));
          for (const record of previous.records) {
            const key = JSON.stringify(record);
            if (!imported.has(key)) { records.push(record); imported.add(key); }
          }
          if (snapshot && !records.some(r => JSON.stringify(r.saveData) === JSON.stringify(snapshot.saveData)))
            records.push(snapshot);
          count = records.length;
          store.put({ownerUserId:owner, snapshots:records});
        } catch (error) { transaction.abort(); reject(error); }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('recovery_write_failed'));
    });
    if (count) knownOwners.add(owner);
    // Another tab may have appended while this transaction was running. Only
    // release localStorage when the exact source has been durably archived.
    if (previous.raw !== null) {
      try {
        if (window.localStorage.getItem(legacyKey(owner)) === previous.raw)
          window.localStorage.removeItem(legacyKey(owner));
      } catch (_) { /* The durable copy exists; a retained source is harmless. */ }
    }
    return true;
  }

  async function preserve(save, owner, revision) {
    if (!owner || save?.security?.accountOwnerId !== owner) return false;
    const snapshot = {ownerUserId:owner, savedAt:new Date().toISOString(), cloudUpdatedAt:revision,
      saveData:JSON.parse(JSON.stringify(save))};
    try { return await archive(owner, snapshot); }
    catch (error) {
      // Browsers that disallow IDB retain the original localStorage path. Never
      // report success unless one durable write has actually completed.
      try {
        const {records} = legacy(owner);
        if (!records.some(r => JSON.stringify(r.saveData) === JSON.stringify(snapshot.saveData))) records.push(snapshot);
        window.localStorage.setItem(legacyKey(owner), JSON.stringify(records));
        knownOwners.add(owner); return true;
      } catch (_) {
        console.error('[CHERRIFT Recovery] No durable recovery storage is writable.', error);
        return false;
      }
    }
  }

  async function migrate(owner) {
    if (!owner) return false;
    try { return await archive(owner); }
    catch (error) { console.warn('[CHERRIFT Recovery] Legacy archive retained.', error); return false; }
  }

  function migrateAll() {
    if (migration) return migration;
    migration = (async () => {
      const owners = [];
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const match = /^cherrift-discord-backup-v2:([^:]+):recovery$/.exec(window.localStorage.key(i) || '');
          if (match) owners.push(match[1]);
        }
      } catch (_) { return false; }
      const results = await Promise.all(owners.map(migrate));
      return results.every(Boolean);
    })().finally(() => { migration = null; });
    return migration;
  }

  async function list(owner) {
    if (!owner) return [];
    try {
      await archive(owner);
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).get(owner);
        request.onsuccess = () => resolve(request.result?.snapshots || []);
        request.onerror = () => reject(request.error);
      });
    } catch (_) { return legacy(owner).records; }
  }

  function has(owner) {
    if (knownOwners.has(owner)) return true;
    try { return !!window.localStorage.getItem(legacyKey(owner)); } catch (_) { return false; }
  }
  window.CHERRIFT_RECOVERY = Object.freeze({preserve, migrate, migrateAll, list, has});
})();
