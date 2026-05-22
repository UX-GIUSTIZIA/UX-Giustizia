'use strict';

let FS_DIR_HANDLE = null;
let FS_FILES_HANDLE = null;
let FS_ROOT_HANDLE = null;
let FS_USER_NAME = '';
let FS_SESSION_LANG = '';
const DB_PATH = 'data';
const DB_FILENAME = 'uxg_dati.json';
const DB_FILENAME_LEGACY = 'uxg_database.json';
const SYS_DB_FILENAME = 'system-data.json';
const GEO_DB_FILENAME = 'geo-data.json';
const NORM_DB_FILENAME = 'norme-data.json';
const USER_DATA_FOLDER = 'data_user';
const JOB_USER_FOLDER = 'job_user';
const SESSION_DB_NAME = 'UXGiustiziaSession';
let _saveTimeout = null;
let _isBooting = false;

async function _openSessionDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SESSION_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const sdb = e.target.result;
      if (!sdb.objectStoreNames.contains('session')) {
        sdb.createObjectStore('session');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveSessionHandles(rootHandle, userHandle, userName, lingua) {
  const sdb = await _openSessionDb();
  const tx = sdb.transaction('session', 'readwrite');
  const store = tx.objectStore('session');
  store.put(rootHandle, 'rootHandle');
  store.put(userHandle, 'userHandle');
  store.put(userName, 'userName');
  if (lingua) store.put(lingua, 'lingua');
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { sdb.close(); resolve(); };
    tx.onerror = (e) => { sdb.close(); reject(e.target.error); };
  });
}

async function getSessionHandles() {
  try {
    const sdb = await _openSessionDb();
    const tx = sdb.transaction('session', 'readonly');
    const store = tx.objectStore('session');
    const rootHandle = await new Promise(r => { const req = store.get('rootHandle'); req.onsuccess = () => r(req.result); req.onerror = () => r(null); });
    const userHandle = await new Promise(r => { const req = store.get('userHandle'); req.onsuccess = () => r(req.result); req.onerror = () => r(null); });
    const userName = await new Promise(r => { const req = store.get('userName'); req.onsuccess = () => r(req.result); req.onerror = () => r(null); });
    const lingua = await new Promise(r => { const req = store.get('lingua'); req.onsuccess = () => r(req.result); req.onerror = () => r(null); });
    sdb.close();
    return { rootHandle, userHandle, userName, lingua: lingua || 'it' };
  } catch (e) {
    return { rootHandle: null, userHandle: null, userName: null, lingua: 'it' };
  }
}

async function clearSession() {
  try {
    const sdb = await _openSessionDb();
    const tx = sdb.transaction('session', 'readwrite');
    tx.objectStore('session').clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => { sdb.close(); resolve(); };
      tx.onerror = () => { sdb.close(); resolve(); };
    });
  } catch (e) {}
}

async function clearUserSession() {
  try {
    const sdb = await _openSessionDb();
    const tx = sdb.transaction('session', 'readwrite');
    const store = tx.objectStore('session');
    store.delete('userHandle');
    store.delete('userName');
    store.delete('lingua');
    return new Promise((resolve) => {
      tx.oncomplete = () => { sdb.close(); resolve(); };
      tx.onerror = () => { sdb.close(); resolve(); };
    });
  } catch (e) {}
}

async function _verifyHandleAlive(handle) {
  try {
    await handle.getDirectoryHandle('DOC_ESP', { create: true });
    return true;
  } catch (e) {
    console.warn('Handle health-check failed:', handle.name, e.name, e.message);
    return false;
  }
}

async function tryResumeSession() {
  const { rootHandle, userHandle, userName, lingua } = await getSessionHandles();
  if (!rootHandle || !userName) return 'none';
  try {
    FS_ROOT_HANDLE = rootHandle;
    FS_USER_NAME = userName;
    FS_SESSION_LANG = lingua || 'it';

    const rootPerm = await rootHandle.queryPermission({ mode: 'readwrite' });
    if (rootPerm === 'granted') {
      try {
        const derived = await rootHandle.getDirectoryHandle(userName);
        const alive = await _verifyHandleAlive(derived);
        if (alive) {
          FS_DIR_HANDLE = derived;
          FS_FILES_HANDLE = derived;
          return 'granted';
        }
        console.warn('tryResumeSession: derived handle is stale (NotFoundError), FS disabled for this session');
        return 'none';
      } catch (e) {
        console.warn('Could not derive user folder from root:', e.message);
      }
    }

    if (userHandle) {
      FS_DIR_HANDLE = userHandle;
      FS_FILES_HANDLE = userHandle;
      return 'needs_permission';
    }

    return 'none';
  } catch (e) {
    console.warn('Session resume failed:', e.message);
    return 'none';
  }
}

async function _fsCopyDir(srcHandle, dstParent, dstName) {
  const dst = await dstParent.getDirectoryHandle(dstName, { create: true });
  for await (const [name, entry] of srcHandle.entries()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      const dstFile = await dst.getFileHandle(name, { create: true });
      const w = await dstFile.createWritable();
      await w.write(file);
      await w.close();
    } else if (entry.kind === 'directory') {
      await _fsCopyDir(entry, dst, name);
    }
  }
}

async function _migrateStoragePathsInDB() {
  // Migrazione storica: vecchi path usavano "P###" come cartella PROCEDIMENTO
  // (segs[2], subito dopo DOC_ESP/C###). I path attuali usano "PP###" per il
  // procedimento e riservano "P###" alla cartella della singola PROVA
  // (segs[4], sotto procFolderShort). La migrazione DEVE quindi toccare SOLO
  // il segmento indice 2, altrimenti distrugge i path delle prove esterne
  // trasformando .../PP###/procShort/P001/file in .../PP###/procShort/PP001/file.
  try {
    if (typeof db === 'undefined' || !db || !db.files) return;
    let updated = 0;
    await db.files.toCollection().modify(f => {
      if (!f.storagePath) return;
      const segs = f.storagePath.split('/');
      if (segs.length < 3) return;
      if (segs[0] !== 'DOC_ESP') return;
      if (!/^C\d{3}$/.test(segs[1]) && !/^C\d{3}_/.test(segs[1])) return;
      if (/^P(\d{3})$/.test(segs[2])) {
        segs[2] = 'PP' + segs[2].slice(1);
        const newPath = segs.join('/');
        if (newPath !== f.storagePath) { f.storagePath = newPath; updated++; }
      }
    });
    if (updated > 0) console.log('_migrateStoragePathsInDB: aggiornati ' + updated + ' storagePath (procedimento P###→PP###).');
  } catch (e) {
    console.warn('_migrateStoragePathsInDB error:', e);
  }
}

async function _repairProofFolderInDB() {
  // Riparazione una-tantum: la versione buggata di _migrateStoragePathsInDB
  // trasformava anche segs[4] (cartella della prova) da P### in PP###. Qui
  // ripristiniamo P### per i file di prove la cui cartella prova risulta PP###.
  // Struttura attesa per le prove: DOC_ESP/C###/PP###/procFolderShort/P###[/...]
  try {
    if (typeof db === 'undefined' || !db || !db.files) return;
    let repaired = 0;
    await db.files.toCollection().modify(f => {
      if (!f.storagePath) return;
      if (f.entityType !== 'proof') return;
      const segs = f.storagePath.split('/');
      if (segs.length < 5) return;
      if (segs[0] !== 'DOC_ESP') return;
      // segs[2] e segs[4] potrebbero entrambi essere PP###; solo segs[4]
      // dev'essere riportato a P### (segs[2] e' il procedimento ed e' giusto).
      if (/^PP(\d{3})$/.test(segs[4])) {
        segs[4] = 'P' + segs[4].slice(2);
        const newPath = segs.join('/');
        if (newPath !== f.storagePath) { f.storagePath = newPath; repaired++; }
      }
    });
    if (repaired > 0) console.log('_repairProofFolderInDB: ripristinati ' + repaired + ' storagePath di prove (PP###→P### su segs[4]).');
  } catch (e) {
    console.warn('_repairProofFolderInDB error:', e);
  }
}

async function _migrateCaseFolderNamesInDB() {
  try {
    if (typeof db === 'undefined' || !db || !db.files) return;
    let updated = 0;
    await db.files.toCollection().modify(f => {
      if (f.storagePath) {
        const segs = f.storagePath.split('/');
        const newSegs = segs.map(seg => /^C(\d{3})_.+$/.test(seg) ? 'C' + seg.slice(1, 4) : seg);
        const newPath = newSegs.join('/');
        if (newPath !== f.storagePath) { f.storagePath = newPath; updated++; }
      }
    });
    if (updated > 0) console.log('_migrateCaseFolderNamesInDB: aggiornati ' + updated + ' storagePath (C001_Titolo→C001).');
  } catch (e) {
    console.warn('_migrateCaseFolderNamesInDB error:', e);
  }
}

async function _migrateProcFolderShortInDB() {
  try {
    if (typeof db === 'undefined' || !db || !db.files) return;
    const allFiles = await db.files.toArray();
    const procIds = [...new Set(allFiles.map(f => f.proceedingId).filter(id => id && id > 0))];
    if (!procIds.length) return;
    const procFolderMap = new Map();
    for (const pid of procIds) {
      try {
        const p = await DB.getProceeding(pid);
        if (!p) continue;
        procFolderMap.set(pid, _buildProcFolderNameShort(p));
      } catch (e) {}
    }
    let updated = 0;
    await db.files.toCollection().modify(f => {
      if (!f.storagePath || !f.proceedingId) return;
      const newProcFolder = procFolderMap.get(f.proceedingId);
      if (!newProcFolder) return;
      const segs = f.storagePath.split('/');
      if (segs.length < 4) return;
      const seg3 = segs[3];
      if (/^\d+_/.test(seg3)) return;
      if (/^A[F]?\d{3}_\d/.test(seg3) || /^P[FR]\d{3}_\d/.test(seg3)) return;
      if (seg3 === newProcFolder) return;
      segs[3] = newProcFolder;
      const newPath = segs.join('/');
      if (newPath !== f.storagePath) { f.storagePath = newPath; updated++; }
    });
    if (updated > 0) console.log('_migrateProcFolderShortInDB: aggiornati ' + updated + ' storagePath (profondità+N).');
  } catch (e) {
    console.warn('_migrateProcFolderShortInDB error:', e);
  }
}

async function _migrateAllegatiToDOCESPInDB() {
  try {
    if (typeof db === 'undefined' || !db || !db.files) return;
    let updated = 0;
    await db.files.toCollection().modify(f => {
      if (f.storagePath && f.storagePath.startsWith('allegati/')) {
        f.storagePath = 'DOC_ESP/' + f.storagePath.slice('allegati/'.length);
        updated++;
      }
    });
    if (updated > 0) console.log('_migrateAllegatiToDOCESPInDB: aggiornati ' + updated + ' storagePath (allegati→DOC_ESP).');
  } catch (e) {
    console.warn('_migrateAllegatiToDOCESPInDB error:', e);
  }
}

async function migrateGroupFolderPrefix() {
  if (!FS_DIR_HANDLE) return;
  try {
    const allegatiHandle = await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP', { create: false }).catch(() => null);
    if (!allegatiHandle) return;
    let renamed = 0;
    for await (const [caseName, caseEntry] of allegatiHandle.entries()) {
      if (caseEntry.kind !== 'directory') continue;
      for await (const [folderName, folderEntry] of caseEntry.entries()) {
        if (folderEntry.kind !== 'directory') continue;
        const m = folderName.match(/^P(\d{3})$/);
        if (!m) continue;
        const newName = 'PP' + m[1];
        const already = await caseEntry.getDirectoryHandle(newName, { create: false }).catch(() => null);
        if (already) {
          await caseEntry.removeEntry(folderName, { recursive: true }).catch(() => {});
          continue;
        }
        await _fsCopyDir(folderEntry, caseEntry, newName);
        await caseEntry.removeEntry(folderName, { recursive: true });
        console.log('FS v35 migrate: ' + caseName + '/' + folderName + ' → ' + newName);
        renamed++;
      }
    }
    if (renamed > 0) console.log('FS v35 migration: rinominate ' + renamed + ' cartelle gruppo.');
  } catch (e) {
    console.warn('migrateGroupFolderPrefix error:', e);
  }
}

async function _migrateGroupTypePrefixInDB() {
  // DISATTIVATA: vedi commento al call site (fs.js ~1474). Riscriveva
  // storagePath nel DB se _computeGroupFolder restituiva un valore
  // differente, causando rinomine spurie (es. PP001 → PC001) ad ogni avvio.
  console.log('_migrateGroupTypePrefixInDB: NO-OP (legacy migration disattivata).');
  return;
  // eslint-disable-next-line no-unreachable
  try {
    if (typeof db === 'undefined' || !db || !db.files) return;
    const allFiles = await db.files.toArray();
    const procIds = [...new Set(allFiles.map(f => f.proceedingId).filter(id => id && id > 0))];
    if (!procIds.length) return;
    const procFolderMap = new Map();
    for (const pid of procIds) {
      try {
        const info = await _computeGroupFolder(pid);
        procFolderMap.set(pid, info.folder);
      } catch (e) {}
    }
    let updated = 0;
    await db.files.toCollection().modify(f => {
      if (!f.storagePath || !f.proceedingId) return;
      const expected = procFolderMap.get(f.proceedingId);
      if (!expected) return;
      const segs = f.storagePath.split('/');
      const newSegs = segs.map(seg => /^P[A-Z]\d{3}$/.test(seg) && seg !== expected ? expected : seg);
      const newPath = newSegs.join('/');
      if (newPath !== f.storagePath) { f.storagePath = newPath; updated++; }
    });
    if (updated > 0) console.log('_migrateGroupTypePrefixInDB: aggiornati ' + updated + ' storagePath con prefisso gruppo.');
  } catch (e) {
    console.warn('_migrateGroupTypePrefixInDB error:', e);
  }
}

async function _migrateGroupFolderTypes() {
  // DISATTIVATA: vedi commento al call site (fs.js ~1474). Iterava i
  // rootProcs per id assumendo che tutte le cartelle vecchie si chiamassero
  // PP<idx>; trovava cosi' la cartella PP001 corretta di un proc penale e
  // la spostava dentro PC001 distruggendo il path (caso utente: PP001 →
  // PC001 ad ogni avvio sul case 150 "Fattura Falsa").
  console.log('_migrateGroupFolderTypes: NO-OP (legacy migration disattivata).');
  return;
  // eslint-disable-next-line no-unreachable
  if (!FS_DIR_HANDLE) return;
  try {
    const allegatiHandle = await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP', { create: false }).catch(() => null);
    if (!allegatiHandle) return;
    const allCases = await DB.getCases();
    let totalMoved = 0;
    for (const c of allCases) {
      const cIdx = await _getSiblingIndex('case', c);
      const caseFolderName = _buildCaseFolderName(c, cIdx);
      const caseEntry = await allegatiHandle.getDirectoryHandle(caseFolderName, { create: false }).catch(() => null);
      if (!caseEntry) continue;
      const allProcs = await DB.getProceedings(c.id);
      let childrenViaRel = new Set();
      try {
        const allProcIds = allProcs.map(p => p.id);
        const caseRels = await DB.getProceedingRelationsForCase(allProcIds);
        caseRels.filter(r => _FS_HIER_TYPES.includes(r.relationType)).forEach(r => childrenViaRel.add(r.proceedingIdB));
      } catch (e) {}
      const rootProcs = allProcs.filter(p => !p.parentProceedingId && !childrenViaRel.has(p.id));
      rootProcs.sort((a, b) => a.id - b.id);
      for (let i = 0; i < rootProcs.length; i++) {
        const rp = rootProcs[i];
        const oldFolder = 'PP' + _pad3(i + 1);
        const newFolder = (await _computeGroupFolder(rp.id)).folder;
        if (oldFolder === newFolder) continue;
        const oldHandle = await caseEntry.getDirectoryHandle(oldFolder, { create: false }).catch(() => null);
        if (!oldHandle) continue;
        const newHandle = await caseEntry.getDirectoryHandle(newFolder, { create: true }).catch(() => null);
        if (!newHandle) continue;
        for await (const [entryName, entryHandle] of oldHandle.entries()) {
          if (entryHandle.kind !== 'directory') continue;
          const existsInNew = await newHandle.getDirectoryHandle(entryName, { create: false }).catch(() => null);
          if (existsInNew) { await oldHandle.removeEntry(entryName, { recursive: true }).catch(() => {}); continue; }
          await _fsCopyDir(entryHandle, newHandle, entryName);
          await oldHandle.removeEntry(entryName, { recursive: true }).catch(() => {});
          console.log('FS merge-gruppo: ' + caseFolderName + '/' + oldFolder + '/' + entryName + ' → ' + newFolder + '/' + entryName);
          totalMoved++;
        }
        try {
          let empty = true;
          for await (const _ of oldHandle.entries()) { empty = false; break; }
          if (empty) await caseEntry.removeEntry(oldFolder, { recursive: true }).catch(() => {});
        } catch (e) {}
      }
    }
    if (totalMoved > 0) console.log('_migrateGroupFolderTypes: spostati ' + totalMoved + ' sottocartelle nel gruppo corretto.');
  } catch (e) {
    console.warn('_migrateGroupFolderTypes error:', e);
  }
}

function _sanitizeName(str) {
  if (!str) return '';
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60);
}

function _sanitizeFsName(name) {
  if (!name) return '_file';
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext  = lastDot > 0 ? name.slice(lastDot) : '';
  const cleanBase = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-]+|[_\-]+$/g, '')
    .substring(0, 60) || '_file';
  let cleanExt = ext
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '')
    .substring(0, 10);
  // Estensione valida solo se contiene almeno un alfanumerico dopo il primo
  // punto. Altrimenti si scarta (i nomi con trailing "." sono rifiutati dal
  // File System Access API).
  if (!/^\.[a-zA-Z0-9][a-zA-Z0-9.\-]*$/.test(cleanExt)) cleanExt = '';
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  return (reserved.test(cleanBase) ? '_' + cleanBase : cleanBase) + cleanExt;
}

function _pad3(n) {
  return String(n).padStart(3, '0');
}

const _GROUP_TYPE_PREFIX = { penale: 'PP', civile: 'PC', amministrativo: 'PA', esecuzione: 'PE', altro: 'PX' };

async function _getGroupTypePrefix(rootProcId) {
  try {
    const proc = await DB.getProceeding(rootProcId);
    if (!proc) return 'PP';
    if (proc.proceedingGroupId) {
      const grp = await DB.getProceedingGroup(proc.proceedingGroupId);
      if (grp && grp.type) return _GROUP_TYPE_PREFIX[grp.type] || 'PP';
    }
    if (proc.type) return _GROUP_TYPE_PREFIX[proc.type] || 'PP';
  } catch (e) {}
  return 'PP';
}

async function _computeGroupFolder(proceedingId) {
  try {
    const proc = await DB.getProceeding(proceedingId);
    if (!proc) return { folder: 'PP001', prefix: 'PP', groupIdx: 1 };
    const rootProcId = await _resolveRootProceedingId(proc.id);
    const rootProc = rootProcId !== proc.id ? await DB.getProceeding(rootProcId) : proc;
    if (!rootProc) return { folder: 'PP001', prefix: 'PP', groupIdx: 1 };
    if (rootProc.proceedingGroupId) {
      const allGroups = await DB.getProceedingGroups(rootProc.caseId);
      const grp = allGroups.find(g => g.id === rootProc.proceedingGroupId);
      const grpType = (grp && grp.type) || 'penale';
      // Indice basato su sortOrder (per-tipo). Fallback su id-based per gruppi pre-V42.
      let groupIdx;
      if (grp && grp.sortOrder != null && grp.sortOrder > 0) {
        groupIdx = grp.sortOrder;
      } else {
        const sameType = allGroups.filter(g => (g.type || 'altro') === grpType).sort((a, b) => a.id - b.id);
        groupIdx = sameType.findIndex(g => g.id === rootProc.proceedingGroupId) + 1 || 1;
      }
      const prefix = _GROUP_TYPE_PREFIX[grpType] || 'PP';
      return { folder: prefix + _pad3(groupIdx), prefix, groupIdx };
    }
    const rootGroupIdx = await _getRootGroupIndex(rootProcId, rootProc.caseId);
    const prefix = _GROUP_TYPE_PREFIX[rootProc.type] || 'PP';
    return { folder: prefix + _pad3(rootGroupIdx), prefix, groupIdx: rootGroupIdx };
  } catch (e) {
    return { folder: 'PP001', prefix: 'PP', groupIdx: 1 };
  }
}

function _procTypeName(type) {
  const map = { penale: 'PENALE', civile: 'CIVILE', amministrativo: 'AMMINISTRATIVO', esecuzione: 'ESECUZIONE', altro: 'ALTRO' };
  return map[type] || 'ALTRO';
}

async function _getSiblingIndex(entityType, entity) {
  let siblings;
  switch (entityType) {
    case 'case':
      siblings = await DB.getCases();
      break;
    case 'proceeding':
      siblings = await DB.getProceedings(entity.caseId);
      break;
    case 'dossier':
      siblings = await DB.getDossiers(entity.proceedingId);
      break;
    case 'act':
      siblings = await DB.getActs(entity.dossierId);
      break;
    case 'fact':
      siblings = await DB.getFactsByDossier(entity.dossierId);
      break;
    case 'proof':
      siblings = await DB.getAllProofs();
      break;
    default:
      return 1;
  }
  siblings.sort((a, b) => a.id - b.id);
  const idx = siblings.findIndex(s => s.id === entity.id);
  return idx >= 0 ? idx + 1 : 1;
}

function _buildRegRef(p) {
  const parts = [];
  if (p.rgType) parts.push(_sanitizeName(p.rgType.toUpperCase()));
  if (p.rgNumber) parts.push(_sanitizeName(p.rgNumber));
  if (p.year) parts.push(String(p.year).slice(-2));
  return parts.filter(Boolean).join('_');
}

function _buildDossierTypeLabel(title) {
  const words = _sanitizeName(title || '').split('_').filter(w => w);
  if (!words.length) return 'DOSS';
  const w1 = words[0].substring(0, 4).toUpperCase();
  const w2 = words.length > 1 ? words[1].substring(0, 3).toUpperCase() : '';
  return w2 ? w1 + '-' + w2 : w1;
}

function _buildProcRefPart(p) {
  const rgNum = (p.rgNumber || '').replace(/\D/g, '');
  const rgYear = p.year ? String(p.year).slice(-2) : '';
  if (!rgNum) return '';
  return 'P' + rgNum + (rgYear ? '_' + rgYear : '');
}

function _buildCaseFolderName(c, idx) {
  return 'C' + _pad3(idx);
}

function _buildProcFolderName(p, pIdx) {
  const ref = _buildProcRefPart(p);
  return 'P' + _pad3(pIdx) + (ref ? '_' + ref : '');
}

function _buildAllegatiFileName(prefix, lang, idx, title, originalName) {
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
  const sanitized = _sanitizeName(title).substring(0, 80);
  return prefix + '_' + lang.toUpperCase() + '_' + _pad3(idx) + (sanitized ? '_' + sanitized : '') + ext;
}

// Hierarchical relation types that imply parent -> child proceeding
const _FS_HIER_TYPES = ['sub_procedimento', 'evoluzione_ignoti_noti', 'separazione', 'stralcio'];

// Local office abbreviation (no dots) for folder naming
function _fsShortOffice(name) {
  if (!name) return '';
  const abbrevMap = [
    [/Procura Generale della Repubblica presso la Corte d['\u2019]Appello di\s*/i, 'PGR '],
    [/Procura Generale della Repubblica di\s*/i, 'PGR '],
    [/Procura della Repubblica presso il Tribunale di\s*/i, 'PdR '],
    [/Procura della Repubblica di\s*/i, 'PdR '],
    [/Corte d['\u2019]Appello di\s*/i, 'CdA '],
    [/Tribunale di Sorveglianza di\s*/i, 'TdS '],
    [/Tribunale per i Minorenni di\s*/i, 'TM '],
    [/Tribunale di\s*/i, 'Trib '],
    [/Corte di Cassazione/i, 'Cass'],
    [/Giudice di Pace di\s*/i, 'GdP '],
  ];
  let result = name;
  for (const [regex, abbrev] of abbrevMap) {
    if (regex.test(result)) {
      result = result.replace(regex, abbrev).trim();
      break;
    }
  }
  return result.trim();
}


// Extracts 2-letter province sigla from a proceeding.
// p.provincia may be stored as "FG", "Foggia (FG)", or "Foggia".
// Fallback: phases[0].geoData.provincia (always 2-letter from GeoDB autocomplete).
function _extractSigla(p) {
  const raw = (p.provincia || '').trim();
  // Format "Foggia (FG)" → extract "FG"
  const parenthesisMatch = raw.match(/\(([A-Z]{2})\)/i);
  if (parenthesisMatch) return parenthesisMatch[1].toUpperCase();
  // Format "FG" (already 2 letters)
  if (/^[A-Z]{2}$/i.test(raw)) return raw.toUpperCase();
  // Fallback: phases[0].geoData.provincia (stored as pure 2-letter code by GeoDB)
  const phases = (p.specificData && p.specificData.phases) || [];
  for (const ph of phases) {
    const gp = ph.geoData && (ph.geoData.provincia || '');
    if (/^[A-Z]{2}$/i.test(gp.trim())) return gp.trim().toUpperCase();
  }
  // Last resort: first 2 letters of p.citta
  return (p.citta || '').trim().substring(0, 2).toUpperCase();
}

// Civil-only short office map (key = civ.ufficio in specificData.civil)
const _FS_CIVIL_UFFICIO_SHORT = {
  tribunale_civile: 'Trib_Civ',
  giudice_pace: 'GdP',
  corte_appello: 'CdA',
  cassazione: 'Cass',
  organismo_mediazione: 'OrgMed'
};

// Builds short proceeding folder name:
//   penale: "0_PdR_N9862_19_21"
//   civile: "0_Trib_Civ_FG_N3203_18"
function _buildProcFolderNameShort(p) {
  const d = 0;
  const isCivile = p.type === 'civile';
  const civ = (p.specificData && p.specificData.civil) || {};
  let ufficio = '';
  if (isCivile && civ.ufficio && _FS_CIVIL_UFFICIO_SHORT[civ.ufficio]) {
    ufficio = _FS_CIVIL_UFFICIO_SHORT[civ.ufficio];
  } else {
    const _officeShortFn = typeof _shortenOffice === 'function' ? _shortenOffice : _fsShortOffice;
    ufficio = _officeShortFn(p.autoritaProcedente || '')
      .replace(/\./g, '').replace(/\s+/g, '_')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\/\\:*?"<>'`|]/g, '').trim();
  }
  let sigla = '';
  if (isCivile) {
    const rawProv = (civ.provincia || p.provincia || '').toString().trim();
    const m = rawProv.match(/\(([A-Za-z]{2})\)/);
    if (m) sigla = m[1].toUpperCase();
    else if (/^[A-Za-z]{2}$/.test(rawProv)) sigla = rawProv.toUpperCase();
  }
  const rgNum = (p.rgNumber || '').replace(/\D/g, '');
  const year2 = p.year ? String(p.year).slice(-2) : '';
  const phases = (p.specificData && p.specificData.phases) || [];
  const mod = (phases.length > 0 && phases[0].modello) ? String(phases[0].modello).replace(/\D/g, '') : '';
  if (rgNum) {
    const parts = [ufficio, sigla, 'N' + rgNum, year2, mod].filter(Boolean);
    return d + '_' + (parts.join('_') || ('P' + _pad3(p.id || 1)));
  }
  return d + '_' + (ufficio || 'PROC') + (sigla ? '_' + sigla : '') + '_ID' + _pad3(p.id || 1);
}

// Walk up parentProceedingId AND hierarchical proceedingRelations to find the root proceeding id
async function _resolveRootProceedingId(proceedingId) {
  let current = await DB.getProceeding(proceedingId);
  if (!current) return proceedingId;
  const visited = new Set([current.id]);
  while (true) {
    let parentId = null;
    if (current.parentProceedingId && !visited.has(current.parentProceedingId)) {
      parentId = current.parentProceedingId;
    }
    if (!parentId) {
      try {
        const rels = await DB.getProceedingRelations(current.id);
        const hierAsChild = rels.filter(r =>
          r.proceedingIdB === current.id &&
          _FS_HIER_TYPES.includes(r.relationType) &&
          !visited.has(r.proceedingIdA)
        );
        if (hierAsChild.length > 0) parentId = hierAsChild[0].proceedingIdA;
      } catch (e) {}
    }
    if (!parentId) break;
    visited.add(parentId);
    const parent = await DB.getProceeding(parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}

// 1-based index of root proceeding among TRUE root proceedings of the case
// True root = no parentProceedingId AND not a child in any hierarchical proceedingRelation
async function _getRootGroupIndex(rootProcId, caseId) {
  const allProcs = await DB.getProceedings(caseId);
  let childrenViaRel = new Set();
  try {
    const allProcIds = allProcs.map(p => p.id);
    const caseRels = await DB.getProceedingRelationsForCase(allProcIds);
    caseRels
      .filter(r => _FS_HIER_TYPES.includes(r.relationType))
      .forEach(r => childrenViaRel.add(r.proceedingIdB));
  } catch (e) {}
  const rootProcs = allProcs.filter(p => !p.parentProceedingId && !childrenViaRel.has(p.id));
  rootProcs.sort((a, b) => a.id - b.id);
  const idx = rootProcs.findIndex(p => p.id === rootProcId);
  return idx >= 0 ? idx + 1 : 1;
}

// Persistent folder sequence for an act, assigned LAZILY at first call:
// "una card = una cartella". La sequenza viene calcolata per (dossierId,
// hasSource) come max(folderSeq esistente nella stessa categoria nel
// fascicolo) + 1, e poi persistita su db.acts (campi folderSeq +
// folderPrefix). Una volta assegnata non cambia piu', anche se altri atti
// vengono creati o eliminati: ogni atto mantiene la sua cartella.
//
// IMPORTANTE: legge da db.acts.where('dossierId') sul campo PERSISTITO,
// per includere anche gli atti orfani (regola di default) ed evitare
// collisioni di numerazione (AF001/A001 ripetuti).
async function _ensureActFolderSeq(act, hasSource, fallbackDossierId, factIdScope) {
  const did = act.dossierId || fallbackDossierId || null;
  const _scopeFactId = factIdScope || act.factId || null;
  // Senza dossier E senza fatto: atto totalmente orfano, seq=1.
  if (!did && !_scopeFactId) return { seq: 1, prefix: hasSource ? 'AF' : 'AE' };
  const wantedPrefix = hasSource ? 'AF' : 'AE';
  // Compatibilita' legacy: atti storici hanno folderPrefix='A'. Lo
  // trattiamo come equivalente a 'AE' (Atto Esterno) per evitare di
  // rinumerare/spostare le cartelle gia' su disco.
  const _isMatch = act.folderPrefix === wantedPrefix
    || (wantedPrefix === 'AE' && act.folderPrefix === 'A');
  if (act.folderSeq && _isMatch) {
    return { seq: act.folderSeq, prefix: act.folderPrefix };
  }
  // Scope di numerazione: se l'atto ha un factId, la sequenza e' PER-FATTO
  // (atti dentro la cartella FT### del fatto). Altrimenti fallback per dossier.
  const allActs = await db.acts.toArray();
  const sameScope = _scopeFactId
    ? allActs.filter(x => x.factId === _scopeFactId)
    : allActs.filter(x => x.dossierId === did && !x.factId);
  // 'A' (legacy) e 'AE' condividono lo stesso bucket di numerazione.
  let maxSeq = 0;
  for (const x of sameScope) {
    if (x.id === act.id) continue;
    if (!Number.isFinite(x.folderSeq)) continue;
    const _xKey = (x.folderPrefix === 'A') ? 'AE' : x.folderPrefix;
    if (_xKey === wantedPrefix && x.folderSeq > maxSeq) {
      maxSeq = x.folderSeq;
    }
  }
  const seq = maxSeq + 1;
  try { await db.acts.update(act.id, { folderSeq: seq, folderPrefix: wantedPrefix }); }
  catch (_) { /* best-effort */ }
  return { seq, prefix: wantedPrefix };
}

// Persistent folder sequence for a proof, lazily assigned (analogo agli atti).
// Categoria: PF se la prova ha almeno un file con sourceFileId (lavora sul
// file del fascicolo via puntatore — niente duplicato fisico, utile per
// video pesanti); P altrimenti (prova esterna che porta i propri file).
async function _ensureProofFolderSeq(proof, hasSource, fallbackDossierId, factIdScope) {
  const did = proof.dossierId || fallbackDossierId || null;
  const _scopeFactId = factIdScope || proof.factId || null;
  // Senza dossier E senza fatto: prova totalmente orfana, seq=1.
  if (!did && !_scopeFactId) return { seq: 1, prefix: hasSource ? 'PF' : 'PE' };
  const wantedPrefix = hasSource ? 'PF' : 'PE';
  // Compatibilita' legacy: proofs storiche hanno folderPrefix='P'. Lo
  // trattiamo come equivalente a 'PE' (Prova Esterna) per evitare di
  // rinumerare/spostare le cartelle gia' su disco.
  const _isMatch = proof.folderPrefix === wantedPrefix
    || (wantedPrefix === 'PE' && proof.folderPrefix === 'P');
  if (proof.folderSeq && _isMatch) {
    return { seq: proof.folderSeq, prefix: proof.folderPrefix };
  }
  // Scope di numerazione: per-fatto se la prova ha un factId (anche se il
  // fatto e' autonomo senza dossierId persistito sulla prova), altrimenti
  // per-dossier per le prove orfane di fatto.
  const allProofs = await db.proofs.toArray();
  const sameDossier = _scopeFactId
    ? allProofs.filter(x => x.factId === _scopeFactId)
    : allProofs.filter(x => x.dossierId === did && !x.factId);
  // Calcola il massimo seq gia' persistito per categoria, ESCLUSA la prova
  // corrente. Le prove "legacy" senza folderSeq/folderPrefix (residuo del
  // bug pre-fix che le faceva tutte finire in P001) non vengono rinumerate
  // retroattivamente: occupano logicamente solo lo slot 1 (la cartella
  // dove fisicamente esistono sul disco). La prova nuova prende il primo
  // slot libero successivo.
  // 'P' (legacy) e 'PE' sono semanticamente uguali: condividono lo stesso
  // bucket di numerazione per evitare collisioni tra cartelle vecchie e nuove.
  const maxByPrefix = { PF: 0, PE: 0 };
  let _hasLegacy = false;
  for (const x of sameDossier) {
    if (x.id === proof.id) continue;
    if (x.folderPrefix && Number.isFinite(x.folderSeq)) {
      const _xKey = (x.folderPrefix === 'P') ? 'PE' : x.folderPrefix;
      if (_xKey === 'PE' || _xKey === 'PF') {
        if ((x.folderSeq || 0) > (maxByPrefix[_xKey] || 0)) {
          maxByPrefix[_xKey] = x.folderSeq;
        }
      }
    } else {
      _hasLegacy = true;
    }
  }
  // Bucket legacy = slot 1: assicura che lo slot 1 risulti occupato anche
  // quando l'unica "occupazione" e' costituita da prove senza folderSeq.
  if (_hasLegacy) {
    maxByPrefix.PE = Math.max(maxByPrefix.PE, 1);
    maxByPrefix.PF = Math.max(maxByPrefix.PF, 1);
  }
  const seq = (maxByPrefix[wantedPrefix] || 0) + 1;
  try { await db.proofs.update(proof.id, { folderSeq: seq, folderPrefix: wantedPrefix }); }
  catch (_) { /* best-effort */ }
  return { seq, prefix: wantedPrefix };
}

// Index of fact among facts of the SAME PROCEEDING (deduped across its dossiers).
// Se proceedingIdHint e' fornito, l'indice e' calcolato in quel procedimento;
// altrimenti viene risolto dal dossier/relazioni del fatto.
async function _getProceedingFactIndex(fact, proceedingIdHint) {
  // Risolutore deterministico del procedimento "ancora" del fatto:
  // 1) fact.dossierId  2) prima factDossierRelation per id.
  async function _resolveAnchorProc() {
    if (fact.dossierId) {
      const d = await DB.getDossier(fact.dossierId);
      if (d) return d.proceedingId;
    }
    const rels = await DB.getFactDossierRelations(fact.id);
    if (rels.length > 0) {
      rels.sort((a, b) => a.id - b.id);
      const d = await DB.getDossier(rels[0].dossierId);
      if (d) return d.proceedingId;
    }
    return null;
  }

  async function _idxIn(proceedingId) {
    if (!proceedingId) return -1;
    const dossiers = await DB.getDossiers(proceedingId);
    const seen = new Set();
    const allFacts = [];
    for (const dos of dossiers) {
      const facts = await DB.getFactsByDossier(dos.id);
      for (const fa of facts) {
        if (!seen.has(fa.id)) { seen.add(fa.id); allFacts.push(fa); }
      }
    }
    allFacts.sort((a, b) => a.id - b.id);
    return allFacts.findIndex(fa => fa.id === fact.id);
  }

  // Prova prima con l'hint (se passato). Se il fatto NON esiste in quel
  // procedimento, NON ritornare silenziosamente 1: fai fallback al
  // procedimento ancora del fatto. Cosi' l'indice resta stabile e univoco.
  if (proceedingIdHint) {
    const idx = await _idxIn(proceedingIdHint);
    if (idx >= 0) return idx + 1;
  }
  const anchorProc = await _resolveAnchorProc();
  if (!anchorProc) return 1;
  const idx = await _idxIn(anchorProc);
  return idx >= 0 ? idx + 1 : 1;
}

// Index of proof among proofs WITHOUT source file (regular proofs only) in ALL dossiers of the same proceeding
async function _getProceedingProofIndex(proof, dossierId) {
  const d = await DB.getDossier(dossierId);
  if (!d) return 1;
  const dossiers = await DB.getDossiers(d.proceedingId);
  const seen = new Set();
  const allProofs = [];
  for (const dos of dossiers) {
    const facts = await DB.getFactsByDossier(dos.id);
    for (const fa of facts) {
      const proofs = await DB.getProofs(fa.id);
      for (const pr of proofs) {
        if (!seen.has(pr.id)) { seen.add(pr.id); allProofs.push(pr); }
      }
    }
  }
  allProofs.sort((a, b) => a.id - b.id);
  const regularProofs = [];
  for (const pr of allProofs) {
    const hs = await DB.getEntityHasSourceFile('proof', pr.id);
    if (!hs) regularProofs.push(pr);
  }
  const idx = regularProofs.findIndex(pr => pr.id === proof.id);
  return idx >= 0 ? idx + 1 : 1;
}

async function _buildProcContext(proceedingId) {
  const p = await DB.getProceeding(proceedingId);
  if (!p) return null;
  const c = await DB.getCase(p.caseId);
  if (!c) return null;
  const cIdx = await _getSiblingIndex('case', c);
  const pIdx = await _getSiblingIndex('proceeding', p);
  const regRef = _buildRegRef(p);
  const procRef = _buildProcRefPart(p);
  const caseFolder = _buildCaseFolderName(c, cIdx);
  const procFolder = _buildProcFolderName(p, pIdx);
  const basePrefix = 'C' + _pad3(cIdx) + '_P' + _pad3(pIdx) + (regRef ? '_' + regRef : '');
  const groupInfo = await _computeGroupFolder(p.id);
  const groupFolder = groupInfo.folder;
  const procFolderShort = _buildProcFolderNameShort(p);
  return { c, p, cIdx, pIdx, regRef, procRef, caseFolder, procFolder, basePrefix, groupFolder, procFolderShort, rootGroupIdx: groupInfo.groupIdx };
}

async function _buildDossierContext(dossierId) {
  const d = await DB.getDossier(dossierId);
  if (!d) return null;
  const ctx = await _buildProcContext(d.proceedingId);
  if (!ctx) return null;
  const dIdx = await _getSiblingIndex('dossier', d);
  const typeLabel = _buildDossierTypeLabel(d.title || '');
  const dossierFolderLegacy = 'F' + _pad3(dIdx) + '_' + typeLabel;
  const dossierFolder = 'F' + _pad3(dIdx);
  const dossierPrefix = ctx.basePrefix + '_F' + _pad3(dIdx);
  return { ...ctx, d, dIdx, dossierPrefix, dossierFolder, dossierFolderLegacy, typeLabel };
}

function _buildSubjectFolderName(s) {
  if (!s) return 'SOGGETTO';
  const norm = (str) => (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const ln = norm(s.lastName);
  const fn = norm(s.firstName);
  const cf = norm(s.fiscalCode);
  const parts = [];
  if (ln) parts.push(ln);
  if (fn) parts.push(fn);
  if (cf) parts.push(cf);
  let stem = parts.join('_').substring(0, 90);
  if (!stem) stem = 'SOGGETTO_' + (s.id || 'X');
  return stem;
}

async function buildAllegatiPath(entityType, entityId, opts = {}) {
  const segments = ['DOC_ESP'];

  switch (entityType) {
    case 'subject': {
      const s = await DB.getSubject(entityId);
      if (!s) return null;
      const stem = _buildSubjectFolderName(s);
      segments.push('SOGGETTI', stem);
      // Idx monotono: deriva il massimo numero progressivo gia' usato nei
      // diskFileName "DOC_###_..." e somma 1, cosi' eventuali eliminazioni
      // non causano collisioni con record/file ancora presenti.
      let maxIdx = 0;
      try {
        if (typeof DB.getEntityFiles === 'function') {
          const existing = await DB.getEntityFiles('subject', entityId).catch(() => []);
          for (const f of (existing || [])) {
            const m = /^DOC_(\d{3,})/.exec(f.diskFileName || '');
            if (m) { const n = parseInt(m[1], 10); if (n > maxIdx) maxIdx = n; }
          }
        }
      } catch (_) {}
      return { segments, entity: s, idx: maxIdx + 1 };
    }
    case 'case': {
      const c = await DB.getCase(entityId);
      if (!c) return null;
      const idx = await _getSiblingIndex('case', c);
      segments.push(_buildCaseFolderName(c, idx));
      return { segments, entity: c, idx };
    }
    case 'proceeding': {
      const p = await DB.getProceeding(entityId);
      if (!p) return null;
      const c = await DB.getCase(p.caseId);
      if (!c) return null;
      const cIdx = await _getSiblingIndex('case', c);
      const pIdx = await _getSiblingIndex('proceeding', p);
      const caseFolder = _buildCaseFolderName(c, cIdx);
      const groupFolder = (await _computeGroupFolder(entityId)).folder;
      const procFolderShort = _buildProcFolderNameShort(p);
      segments.push(caseFolder, groupFolder, procFolderShort);
      return { segments, entity: p, idx: pIdx };
    }
    case 'proceedingGroup': {
      const grp = await DB.getProceedingGroup(entityId);
      if (!grp) return null;
      const c = await DB.getCase(grp.caseId);
      if (!c) return null;
      const cIdx = await _getSiblingIndex('case', c);
      const allGroups = await DB.getProceedingGroups(grp.caseId);
      allGroups.sort((a, b) => a.id - b.id);
      const groupIdx = (allGroups.findIndex(g => g.id === grp.id) + 1) || 1;
      const prefix = _GROUP_TYPE_PREFIX[grp.type || 'altro'] || 'PX';
      const groupFolder = prefix + _pad3(groupIdx);
      segments.push(_buildCaseFolderName(c, cIdx), groupFolder);
      return { segments, entity: grp, idx: groupIdx };
    }
    case 'proceeding_origin': {
      const p = await DB.getProceeding(entityId);
      if (!p) return null;
      const c = await DB.getCase(p.caseId);
      if (!c) return null;
      const cIdx = await _getSiblingIndex('case', c);
      const pIdx = await _getSiblingIndex('proceeding', p);
      const caseFolder = _buildCaseFolderName(c, cIdx);
      const groupFolder = (await _computeGroupFolder(entityId)).folder;
      const procFolderShort = _buildProcFolderNameShort(p);
      segments.push(caseFolder, groupFolder, procFolderShort, 'ORIG');
      return { segments, entity: p, idx: pIdx };
    }
    case 'dossier': {
      const dCtx = await _buildDossierContext(entityId);
      if (!dCtx) return null;
      segments.push(dCtx.caseFolder, dCtx.groupFolder, dCtx.procFolderShort, dCtx.dossierFolder);
      if (opts.fileRole === 'doss_orig' && opts.lang) {
        segments.push(dCtx.dossierFolder + '_ORG-' + opts.lang.toUpperCase());
      } else if (opts.fileRole === 'doss_cert' && opts.lang) {
        segments.push(dCtx.dossierFolder + '_TRD-' + opts.lang.toUpperCase());
      } else if (opts.fileRole === 'doss_alldig' && opts.alldigNum) {
        segments.push('F' + _pad3(dCtx.dIdx) + '_DDP' + _pad3(opts.alldigNum));
      }
      return { segments, entity: dCtx.d, idx: dCtx.dIdx };
    }
    case 'act': {
      const a = await DB.getAct(entityId);
      if (!a) return null;
      let _actDossierId = a.dossierId || opts.dossierId || null;
      // Fatti autonomi: il fatto non ha dossierId proprio, va via
      // factDossierRelations. Senza questo fallback gli atti dentro un
      // fatto autonomo non riuscirebbero a costruire il path.
      if (!_actDossierId) {
        const _faId = a.factId || opts.factId || null;
        if (_faId) {
          const _rels = await DB.getFactDossierRelations(_faId);
          if (_rels && _rels.length > 0) {
            _rels.sort((x, y) => x.id - y.id);
            _actDossierId = _rels[0].dossierId;
          }
        }
      }
      if (!_actDossierId) return null;
      const dCtx = await _buildDossierContext(_actDossierId);
      if (!dCtx) return null;
      const hasSource = opts.hasSource !== undefined ? opts.hasSource : await DB.getEntityHasSourceFile('act', a.id);
      const _actFactId = a.factId || opts.factId || null;
      const fs = await _ensureActFolderSeq(a, hasSource, _actDossierId, _actFactId);
      const actFolder = fs.prefix + _pad3(fs.seq);
      // Se l'atto e' nato in un fatto, va dentro la cartella FT### del fatto,
      // annidata nel procedimento: <CASO>/<GRUPPO>/<PROC>/FT###/<ENTITY>.
      if (_actFactId) {
        const fa = await DB.getFact(_actFactId);
        if (fa) {
          const fIdx = await _getProceedingFactIndex(fa, dCtx.p && dCtx.p.id);
          const factFolder = 'FT' + _pad3(fIdx);
          segments.push(dCtx.caseFolder, dCtx.groupFolder, dCtx.procFolderShort, factFolder, actFolder);
          return { segments, entity: a, idx: fs.seq };
        }
      }
      segments.push(dCtx.caseFolder, dCtx.groupFolder, dCtx.procFolderShort, actFolder);
      return { segments, entity: a, idx: fs.seq };
    }
    case 'fact': {
      const fa = await DB.getFact(entityId);
      if (!fa) return null;
      // Resolve dossier context: dossierId → factDossierRelations → none
      let dCtx = null;
      if (fa.dossierId) dCtx = await _buildDossierContext(fa.dossierId);
      if (!dCtx) {
        const rels = await DB.getFactDossierRelations(fa.id);
        if (rels.length > 0) dCtx = await _buildDossierContext(rels[0].dossierId);
      }
      const idx = await _getProceedingFactIndex(fa, dCtx && dCtx.p && dCtx.p.id);
      if (dCtx) {
        segments.push(dCtx.caseFolder, dCtx.groupFolder, dCtx.procFolderShort, 'FT' + _pad3(idx));
      } else {
        segments.push('FT' + _pad3(idx));
      }
      return { segments, entity: fa, idx };
    }
    case 'proof': {
      const pr = await DB.getProof(entityId);
      if (!pr) return null;
      // Solo factId persistito o esplicito: NON usare factProofRelations
      // (link posteriori non devono spostare il path di una prova orfana).
      const _proofFactId = pr.factId || opts.factId || null;
      const _factForProof = _proofFactId ? await DB.getFact(_proofFactId) : null;
      let _proofDossierId = pr.dossierId || opts.dossierId || null;
      if (!_proofDossierId && _factForProof && _factForProof.dossierId) {
        _proofDossierId = _factForProof.dossierId;
      }
      // Fatti autonomi: il fatto non ha dossierId proprio, ma e' linkato
      // ai fascicoli via factDossierRelations.
      if (!_proofDossierId && _factForProof) {
        const _frels = await DB.getFactDossierRelations(_factForProof.id);
        if (_frels && _frels.length > 0) {
          _frels.sort((x, y) => x.id - y.id);
          _proofDossierId = _frels[0].dossierId;
        }
      }
      if (!_proofDossierId) {
        // Fallback legacy: prove pre-esistenti senza dossierId persistito
        const factRels = await DB.getProofFactRelations(entityId);
        const firstRel = factRels.length > 0 ? factRels[0] : null;
        const f = firstRel && firstRel.fact ? firstRel.fact : null;
        if (f && f.dossierId) _proofDossierId = f.dossierId;
        if (!_proofDossierId && f) {
          const _frels2 = await DB.getFactDossierRelations(f.id);
          if (_frels2 && _frels2.length > 0) {
            _frels2.sort((x, y) => x.id - y.id);
            _proofDossierId = _frels2[0].dossierId;
          }
        }
      }
      if (!_proofDossierId) {
        const idx = await _getSiblingIndex('proof', pr);
        segments.push('PR' + _pad3(idx));
        return { segments, entity: pr, idx };
      }
      const dCtx = await _buildDossierContext(_proofDossierId);
      if (!dCtx) return null;
      // Determina hasSource dai file gia` salvati sulla prova (un file con
      // sourceFileId != null indica che la prova lavora direttamente sul
      // sorgente del fascicolo — categoria PF). Per la prima persistenza
      // l'opts puo' fornire `hasSource`/`forceHasSource` come hint.
      // IMPORTANTE: i "derivati interni" (es. PDF metadati/hash di un'immagine
      // prova esterna, dove sourceFileId punta ad un altro file della STESSA
      // prova) NON devono promuovere la prova a PF: restano prove esterne.
      let _hasSource = false;
      try {
        if (opts && (opts.forceHasSource === true || opts.hasSource === true)) {
          _hasSource = true;
        } else {
          const _existing = await DB.getEntityFiles('proof', entityId);
          for (const _f of _existing) {
            if (_f.sourceFileId == null) continue;
            try {
              const _src = await DB.getFile(_f.sourceFileId);
              if (!_src) continue;
              if (_src.entityType === 'proof' && _src.entityId === entityId) continue; // derivato interno
              _hasSource = true;
              break;
            } catch (_) {}
          }
        }
      } catch (_) {}
      const _scopeFactIdProof = _factForProof ? _factForProof.id : null;
      const { seq: _pSeq, prefix: _pPrefix } = await _ensureProofFolderSeq(pr, _hasSource, _proofDossierId, _scopeFactIdProof);
      const proofFolder = _pPrefix + _pad3(_pSeq);
      // Se la prova e' nata in un fatto, va dentro la cartella FT### del fatto,
      // annidata nel procedimento: <CASO>/<GRUPPO>/<PROC>/FT###/<ENTITY>.
      if (_factForProof) {
        const fIdx = await _getProceedingFactIndex(_factForProof, dCtx.p && dCtx.p.id);
        const factFolder = 'FT' + _pad3(fIdx);
        segments.push(dCtx.caseFolder, dCtx.groupFolder, dCtx.procFolderShort, factFolder, proofFolder);
        return { segments, entity: pr, idx: _pSeq };
      }
      segments.push(dCtx.caseFolder, dCtx.groupFolder, dCtx.procFolderShort, proofFolder);
      return { segments, entity: pr, idx: _pSeq };
    }
    case 'archiviofatto': {
      const fa = await DB.getMemoFatto(entityId);
      if (!fa) return null;
      const all = await DB.getMemoFatti();
      all.sort((a, b) => a.id - b.id);
      const idx = all.findIndex(f => f.id === entityId);
      const fattoFolder = 'FR' + _pad3(idx >= 0 ? idx + 1 : 1);
      segments.push('MEMO', fattoFolder);
      return { segments, entity: fa, idx: idx + 1 };
    }
    case 'archivioatto': {
      const a = await DB.getMemoAtto(entityId);
      if (!a) return null;
      if (a.archivioFattoId == null) {
        segments.push('MEMO', 'A' + _pad3(entityId));
        return { segments, entity: a, idx: entityId };
      }
      const fattoAll = await DB.getMemoFatti();
      fattoAll.sort((f1, f2) => f1.id - f2.id);
      const fIdx = fattoAll.findIndex(f => f.id === a.archivioFattoId);
      const fattoFolder = 'FR' + _pad3(fIdx >= 0 ? fIdx + 1 : 1);
      const idx = await _getMemoAttoIndex(entityId, a.archivioFattoId);
      segments.push('MEMO', fattoFolder, 'A' + _pad3(idx));
      return { segments, entity: a, idx };
    }
    case 'pec': {
      const pec = await DB.getPecMessage(entityId);
      if (!pec) return null;
      const all = (await DB.getPecMessages()).slice();
      // Anno: usa pec.year, oppure dataInvio (YYYY-MM-DD), altrimenti createdAt
      const year = String(pec.year || (pec.dataInvio ? String(pec.dataInvio).slice(0, 4) : '') || (pec.createdAt ? new Date(pec.createdAt).getFullYear() : new Date().getFullYear()));
      // Indice progressivo per anno (ordine creazione/id)
      const sameYear = all
        .filter(p => String(p.year || (p.dataInvio ? String(p.dataInvio).slice(0, 4) : '') || (p.createdAt ? new Date(p.createdAt).getFullYear() : '')) === year)
        .sort((a, b) => a.id - b.id);
      const idx = (sameYear.findIndex(p => p.id === entityId) + 1) || 1;
      // Suffisso cronologico YYYY_MM_DD_HHMM dalla dataInvio (UTC se ISO,
      // altrimenti fallback a createdAt). Permette ordinamento naturale
      // delle PEC dentro la cartella dell'anno mantenendo il progressivo
      // annuale come chiave di univocità (PEC_NNN_YYYY_MM_DD_HHMM).
      const _ts = (() => {
        try {
          if (pec.dataInvio) { const d = new Date(pec.dataInvio); if (!isNaN(d)) return d; }
          if (pec.createdAt) { const d = new Date(pec.createdAt); if (!isNaN(d)) return d; }
        } catch (_) {}
        return null;
      })();
      const _p2 = n => String(n).padStart(2, '0');
      const stamp = _ts
        ? `${_ts.getFullYear()}_${_p2(_ts.getMonth() + 1)}_${_p2(_ts.getDate())}_${_p2(_ts.getHours())}${_p2(_ts.getMinutes())}`
        : '0000_00_00_0000';
      const folder = 'PEC_' + _pad3(idx) + '_' + stamp;
      segments.push('00_PEC', year, folder);
      return { segments, entity: pec, idx };
    }
    case 'archivioprovefatto': {
      const pr = await DB.getMemoProof(entityId);
      if (!pr) return null;
      if (pr.archivioFattoId == null) {
        segments.push('MEMO', 'P' + _pad3(entityId));
        return { segments, entity: pr, idx: entityId };
      }
      const fattoAll = await DB.getMemoFatti();
      fattoAll.sort((f1, f2) => f1.id - f2.id);
      const fIdx = fattoAll.findIndex(f => f.id === pr.archivioFattoId);
      const fattoFolder = 'FR' + _pad3(fIdx >= 0 ? fIdx + 1 : 1);
      const idx = await _getMemoProofIndex(entityId, pr.archivioFattoId);
      segments.push('MEMO', fattoFolder, 'P' + _pad3(idx));
      return { segments, entity: pr, idx };
    }
    default:
      return null;
  }
}

// Returns protocol code string for a fact, e.g. "F001_PdR_FG_N9862_19_21"
async function getFactProtocolCode(factId) {
  const result = await buildAllegatiPath('fact', factId);
  if (!result) return null;
  return result.segments[result.segments.length - 1] || null;
}

// Returns protocol code string for a proof, e.g.
//   "PE001-F001_PdR_FG_N9862_19_21"
// Format: <folderPrefix><folderSeq:3>-<protocolloFatto>
// - folderPrefix = PE (esterna) / PF (da fascicolo). Legacy 'P' -> 'PE'.
// - folderSeq = progressivo della prova nel suo bucket (assegnato al
//   primo file salvato). Se non ancora assegnato si usa "???".
// - protocolloFatto = stringa restituita da getFactProtocolCode (es.
//   "F001_PdR_FG_N9862_19_21"). Se la prova non e' agganciata ad un
//   fatto, si ricostruisce solo il suffisso procedimento via dossier.
async function getProofProtocolCode(proofId) {
  if (proofId == null) return null;
  const pr = await DB.getProof(proofId);
  if (!pr) return null;
  const _legacyP = pr.folderPrefix === 'P';
  const prefix = _legacyP ? 'PE' : (pr.folderPrefix || 'PE');
  const seqTxt = Number.isFinite(pr.folderSeq) ? _pad3(pr.folderSeq) : '???';
  const head = prefix + seqTxt;
  // Risali al fatto (relazione diretta o factProofRelations)
  let _fact = pr.factId ? await DB.getFact(pr.factId) : null;
  if (!_fact) {
    try {
      const _fpr = await db.factProofRelations.where('proofId').equals(pr.id).first();
      if (_fpr) _fact = await DB.getFact(_fpr.factId);
    } catch (_) {}
  }
  if (_fact) {
    // Risolvi il dossier del fatto (proprio o via factDossierRelations)
    let _factDossId = _fact.dossierId || null;
    if (!_factDossId) {
      try {
        const _fdr = await DB.getFactDossierRelations(_fact.id);
        if (_fdr && _fdr.length) _factDossId = _fdr[0].dossierId;
      } catch (_) {}
    }
    // Protocollo fatto formato esteso "F001_PdR_FG_N9862_19_21"
    let factCode = '';
    try {
      if (_factDossId && typeof _assignMissingFactProtocol === 'function') {
        factCode = (await _assignMissingFactProtocol(_fact.id, _factDossId)) || '';
      }
    } catch (_) {}
    if (!factCode) {
      // Fallback minimale: solo l'ultimo segmento path (es. "FT003")
      try { factCode = (await getFactProtocolCode(_fact.id)) || ''; } catch (_) {}
    }
    if (factCode) return head + '-' + factCode;
  }
  // Fallback: prova non collegata a fatto -> ricostruisce solo il
  // suffisso procedimento dal dossier (se reperibile sulla prova).
  const _dossId = pr.dossierId || null;
  const _doss = _dossId ? await DB.getDossier(_dossId) : null;
  const p = (_doss && _doss.proceedingId) ? await DB.getProceeding(_doss.proceedingId) : null;
  if (!p) return head;
  const _officeShortFn = typeof _shortenOffice === 'function' ? _shortenOffice : _fsShortOffice;
  const officeType = _officeShortFn(p.autoritaProcedente || '')
    .replace(/\./g, '').replace(/\s.*/, '').trim();
  const sigla = _extractSigla(p);
  const rgNum = (p.rgNumber || '').replace(/\D/g, '');
  const year2 = p.year ? String(p.year).slice(-2) : '';
  const phases = (p.specificData && p.specificData.phases) || [];
  const mod = (phases.length > 0 && phases[0].modello) ? String(phases[0].modello).replace(/\D/g, '') : '';
  const parts = [officeType, sigla, rgNum ? 'N' + rgNum : '', year2, mod].filter(Boolean);
  const procRef = parts.join('_');
  return head + (procRef ? '_' + procRef : '');
}

// Returns the NEXT available protocol code for a new fact, given a dossierId for context
async function getNextFactProtocolCode(dossierId) {
  const dCtx = await _buildDossierContext(dossierId);
  if (!dCtx) return null;
  const proceedings = await DB.getProceedings(dCtx.c.id);
  const seen = new Set();
  for (const pr of proceedings) {
    const dossiers = await DB.getDossiers(pr.id);
    for (const dos of dossiers) {
      const facts = await DB.getFactsByDossier(dos.id);
      for (const fa of facts) seen.add(fa.id);
    }
  }
  const nextIdx = seen.size + 1;
  const p = dCtx.p;
  const _officeShortFn = typeof _shortenOffice === 'function' ? _shortenOffice : _fsShortOffice;
  const officeType = _officeShortFn(p.autoritaProcedente || '')
    .replace(/\./g, '').replace(/\s.*/, '').trim();
  const sigla = _extractSigla(p);
  const rgNum = (p.rgNumber || '').replace(/\D/g, '');
  const year2 = p.year ? String(p.year).slice(-2) : '';
  const phases = (p.specificData && p.specificData.phases) || [];
  const mod = (phases.length > 0 && phases[0].modello) ? String(phases[0].modello).replace(/\D/g, '') : '';
  const parts = [officeType, sigla, rgNum ? 'N' + rgNum : '', year2, mod].filter(Boolean);
  const procRef = parts.join('_');
  return 'FT' + _pad3(nextIdx) + (procRef ? '_' + procRef : '');
}

// ── MEMO FATTI (archiviofatti) ─────────────────────────────────────────────

// Generates protocol for an EXISTING fact that has none (assigns positional rank by id)
async function _assignMissingFactProtocol(factId, dossierId) {
  try {
    const dCtx = await _buildDossierContext(dossierId);
    if (!dCtx) return null;
    const proceedings = await DB.getProceedings(dCtx.c.id);
    const allFactIds = [];
    for (const pr of proceedings) {
      const dossiers = await DB.getDossiers(pr.id);
      for (const dos of dossiers) {
        const facts = await DB.getFactsByDossier(dos.id);
        for (const fa of facts) allFactIds.push(fa.id);
      }
    }
    allFactIds.sort((a, b) => a - b);
    const rank = allFactIds.indexOf(factId);
    const idx = rank >= 0 ? rank + 1 : allFactIds.length;
    const p = dCtx.p;
    const _officeShortFn = typeof _shortenOffice === 'function' ? _shortenOffice : _fsShortOffice;
    const officeType = _officeShortFn(p.autoritaProcedente || '').replace(/\./g, '').replace(/\s.*/, '').trim();
    const sigla = _extractSigla(p);
    const rgNum = (p.rgNumber || '').replace(/\D/g, '');
    const year2 = p.year ? String(p.year).slice(-2) : '';
    const phases = (p.specificData && p.specificData.phases) || [];
    const mod = (phases.length > 0 && phases[0].modello) ? String(phases[0].modello).replace(/\D/g, '') : '';
    const parts = [officeType, sigla, rgNum ? 'N' + rgNum : '', year2, mod].filter(Boolean);
    const procRef = parts.join('_');
    return 'FT' + _pad3(idx) + (procRef ? '_' + procRef : '');
  } catch (e) { return null; }
}

// Returns protocol code for an archivio memo fatto: "FR001"
async function getMemoFattoProtocolCode(id) {
  const all = await DB.getMemoFatti();
  all.sort((a, b) => a.id - b.id);
  const idx = all.findIndex(f => f.id === id);
  return idx >= 0 ? 'FR' + _pad3(idx + 1) : null;
}

// Returns the NEXT available protocol code for a new memo fatto: "FR002"
async function getNextMemoFattoProtocolCode() {
  const all = await DB.getMemoFatti();
  return 'FR' + _pad3(all.length + 1);
}

// Index of a memo atto among all atti of the same archivio fatto
async function _getMemoAttoIndex(attoId, fattoId) {
  if (fattoId == null) return 1;
  const all = await DB.getMemoAtti(fattoId);
  all.sort((a, b) => a.id - b.id);
  const idx = all.findIndex(a => a.id === attoId);
  return idx >= 0 ? idx + 1 : 1;
}

// Index of a memo proof among all proofs of the same archivio fatto
async function _getMemoProofIndex(proofId, fattoId) {
  if (fattoId == null) return 1;
  const all = await DB.getMemoProofs(fattoId);
  all.sort((a, b) => a.id - b.id);
  const idx = all.findIndex(p => p.id === proofId);
  return idx >= 0 ? idx + 1 : 1;
}

function _entityPrefix(entityType) {
  const map = { act: 'A', proof: 'PR', fact: 'FA', case: 'C', proceeding: 'P', proceeding_origin: 'AO', dossier: 'F', proceedingGroup: 'PG', pec: 'PEC' };
  return map[entityType] || entityType.toUpperCase();
}

async function _getOrCreateNestedDir(rootHandle, segments) {
  let current = rootHandle;
  for (const seg of segments) {
    if (!seg || /[\/\\:*?"<>|]/.test(seg)) {
      const err = new Error('Segment contains invalid characters: "' + seg + '"');
      err.name = 'NotFoundError';
      console.error('_getOrCreateNestedDir: invalid segment name', JSON.stringify(seg), '| full path:', segments.join('/'));
      throw err;
    }
    let attempt = 0;
    let last_err;
    while (attempt < 4) {
      try {
        current = await current.getDirectoryHandle(seg, { create: true });
        last_err = null;
        break;
      } catch (e) {
        last_err = e;
        if (e.name === 'NotFoundError' && attempt < 3) {
          await new Promise(r => setTimeout(r, 80 + attempt * 120));
          attempt++;
        } else {
          console.error('_getOrCreateNestedDir: failed at segment "' + seg + '" after ' + (attempt+1) + ' attempt(s)', e.name, e.message, '| path so far:', segments.slice(0, segments.indexOf(seg) + 1).join('/'));
          throw e;
        }
      }
    }
    if (last_err) throw last_err;
  }
  return current;
}

async function _resolveNestedDir(rootHandle, segments) {
  let current = rootHandle;
  for (const seg of segments) {
    current = await current.getDirectoryHandle(seg);
  }
  return current;
}

function updateFsLogo() {
  const btn = document.getElementById('btnFs');
  if (btn) btn.textContent = FS_DIR_HANDLE ? t('fsConnected') : t('connectFs');
}

async function connectFS() {
  try {
    if (!('showDirectoryPicker' in window)) {
      alert(t('bootFolderBrowser'));
      return;
    }
    if (FS_USER_NAME && FS_DIR_HANDLE) {
      updateFsLogo();
      return;
    }
    FS_DIR_HANDLE = await window.showDirectoryPicker({ mode: 'readwrite' });
    FS_FILES_HANDLE = await FS_DIR_HANDLE.getDirectoryHandle(USER_DATA_FOLDER, { create: true });
    updateFsLogo();
  } catch (e) {
    console.log('FS connection cancelled');
  }
}

function _applySessionLang() {
  if (!FS_SESSION_LANG) return;
  currentLang = FS_SESSION_LANG;
  document.documentElement.lang = FS_SESSION_LANG;
  const btnIt = document.getElementById('btnLangIt');
  const btnEn = document.getElementById('btnLangEn');
  if (btnIt) btnIt.classList.toggle('active', FS_SESSION_LANG === 'it');
  if (btnEn) btnEn.classList.toggle('active', FS_SESSION_LANG === 'en');
  const bootLang = document.getElementById('bootLang');
  if (bootLang) bootLang.style.display = 'none';
  if (typeof applyI18n === 'function') applyI18n();
}

async function _bootLoadApp(overlay, statusEl) {
  statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-wait">' + t('bootFolderLoading') + '</div>';
  _isBooting = true;
  try {
    await initDatabases();
    const loaded = await loadDatabaseFromFS();
    _isBooting = false;
    if (_saveTimeout) { clearTimeout(_saveTimeout); _saveTimeout = null; }
    await _migrateStoragePathsInDB();
    await _repairProofFolderInDB();
    await _migrateCaseFolderNamesInDB();
    await _migrateAllegatiToDOCESPInDB();
    await _migrateProcFolderShortInDB();
    await migrateGroupFolderPrefix();
    // _migrateGroupTypePrefixInDB() e _migrateGroupFolderTypes() DISATTIVATE.
    // Migrazioni legacy una-tantum (epoca in cui tutte le cartelle gruppo
    // si chiamavano PP<idx> indipendentemente dal tipo). Ora che esistono
    // gia' cartelle col prefisso tipologico corretto (PP/PC/PE/PA/PX) queste
    // migrazioni causano collisioni: es. iterando i rootProcs ordinati per
    // id, _migrateGroupFolderTypes cercava "PP001" assumendo fosse del
    // primo proc legacy (es. civile), trovava la cartella PP001 corretta
    // di un proc penale e la spostava dentro PC001 distruggendo i path.
    // Cfr. anche _migrateGroupTypePrefixInDB che riscriveva storagePath
    // nel DB se _computeGroupFolder restituiva valore differente da quello
    // gia' presente, con effetti analoghi sul lato indice.
    if (loaded) await saveDatabaseToFS();
    overlay.style.display = 'none';
    updateFsLogo();
    _updateUserNameDisplay();
    if (typeof initApp === 'function') initApp();
  } catch (err) {
    _isBooting = false;
    console.error('Boot loading error:', err);
    statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-error">Error: ' + (err.message || err) + '</div>';
  }
}

async function showFolderSentinel() {
  const status = await tryResumeSession();

  if (status === 'granted') {
    _applySessionLang();
    const overlay = document.getElementById('bootFolder');
    const statusEl = document.getElementById('bootFolderStatus');
    overlay.style.display = 'flex';
    document.getElementById('bootFolderTitle').textContent = t('bootFolderTitle');
    document.getElementById('bootFolderSubtitle').textContent = '';
    document.getElementById('bootFolderDesc').textContent = '';
    document.getElementById('bootFolderHint').textContent = '';
    document.getElementById('btnBootConnect').style.display = 'none';
    statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-wait">' + t('bootFolderLoading') + '</div>';
    await _bootLoadApp(overlay, statusEl);
    return;
  }

  if (status === 'needs_permission') {
    _applySessionLang();
    const overlay = document.getElementById('bootFolder');
    const statusEl = document.getElementById('bootFolderStatus');
    overlay.style.display = 'flex';
    document.getElementById('bootFolderTitle').textContent = t('bootFolderTitle');
    document.getElementById('bootFolderSubtitle').textContent = '';
    document.getElementById('bootFolderDesc').textContent = '';
    document.getElementById('bootFolderHint').textContent = '';
    statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-ok">' +
      '<span class="boot-folder-check">&#128100;</span> ' + FS_USER_NAME + '</div>';
    const btnConnect = document.getElementById('btnBootConnect');
    btnConnect.style.display = '';
    btnConnect.textContent = t('bootFolderEnter');
    btnConnect.onclick = async function() {
      statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-wait">' + t('bootFolderLoading') + '</div>';
      btnConnect.style.display = 'none';
      try {
        const handleToRequest = FS_ROOT_HANDLE || FS_DIR_HANDLE;
        const req = await handleToRequest.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') {
          statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-error">' + t('bootFolderFail') + '</div>';
          btnConnect.style.display = '';
          return;
        }
        if (FS_ROOT_HANDLE && FS_USER_NAME) {
          try {
            const derived = await FS_ROOT_HANDLE.getDirectoryHandle(FS_USER_NAME);
            FS_DIR_HANDLE = derived;
            FS_FILES_HANDLE = derived;
          } catch (e) {
            console.warn('Could not derive user folder after permission:', e.message);
          }
        }
        await _bootLoadApp(overlay, statusEl);
      } catch (err) {
        console.error('Boot loading error:', err);
        statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-error">Error: ' + (err.message || err) + '</div>';
        btnConnect.style.display = '';
      }
    };
    return;
  }

  const overlay = document.getElementById('bootFolder');
  overlay.style.display = 'flex';
  const btnConnect = document.getElementById('btnBootConnect');
  btnConnect.style.display = '';
  btnConnect.onclick = null;
  document.getElementById('bootFolderTitle').textContent = t('bootFolderTitle');
  document.getElementById('bootFolderSubtitle').textContent = t('bootFolderSubtitle');
  document.getElementById('bootFolderDesc').textContent = t('bootFolderDesc');
  btnConnect.textContent = t('bootFolderBtn');
  document.getElementById('bootFolderHint').textContent = t('bootFolderHint');
  document.getElementById('bootFolderStatus').innerHTML = '';
}

async function _updateUserNameDisplay() {
  const container = document.getElementById('userProfileBtn');
  const el = document.getElementById('activeUserName');
  if (!FS_USER_NAME) {
    if (container) container.style.display = 'none';
    return;
  }
  let displayName = FS_USER_NAME;
  try {
    if (typeof db !== 'undefined' && db && db.userProfile) {
      const profile = await db.userProfile.toCollection().first();
      if (profile && (profile.nome || profile.cognome)) {
        const parts = [profile.titolo, profile.nome, profile.cognome].filter(Boolean);
        displayName = parts.join(' ');
      }
    }
  } catch (e) { /* fallback al nome cartella */ }
  if (el) el.textContent = displayName;
  if (container) container.style.display = 'inline-flex';
  const syncBtn = document.getElementById('btnSyncDisk');
  if (syncBtn) syncBtn.style.display = '';
}

async function bootConnectFolder() {
  const statusEl = document.getElementById('bootFolderStatus');

  if (!('showDirectoryPicker' in window)) {
    statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-error">' + t('bootFolderBrowser') + '</div>';
    return;
  }

  statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-wait">' + t('bootFolderVerify') + '</div>';

  try {
    FS_DIR_HANDLE = await window.showDirectoryPicker({ mode: 'readwrite' });
    FS_FILES_HANDLE = await FS_DIR_HANDLE.getDirectoryHandle(USER_DATA_FOLDER, { create: true });

    const testFile = await FS_FILES_HANDLE.getFileHandle('.uxg_sentinel', { create: true });
    const writable = await testFile.createWritable();
    await writable.write('UXG_OK_' + new Date().toISOString());
    await writable.close();

    let dbFound = false;
    try {
      const dbFileHandle = await FS_FILES_HANDLE.getFileHandle(DB_FILENAME);
      const dbFile = await dbFileHandle.getFile();
      const text = await dbFile.text();
      if (text.trim()) dbFound = true;
    } catch (e) {}
    if (!dbFound) {
      try {
        const dbFileHandle = await FS_FILES_HANDLE.getFileHandle(DB_FILENAME_LEGACY);
        const dbFile = await dbFileHandle.getFile();
        const text = await dbFile.text();
        if (text.trim()) dbFound = true;
      } catch (e) {}
    }
    if (!dbFound) {
      try {
        const dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
        const dbFileHandle = await dataDir.getFileHandle(DB_FILENAME_LEGACY);
        const dbFile = await dbFileHandle.getFile();
        const text = await dbFile.text();
        if (text.trim()) dbFound = true;
      } catch (e) {}
    }

    let legacyDetected = false;
    try {
      await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP');
      legacyDetected = true;
    } catch (e) {}
    if (!legacyDetected) {
      try {
        await FS_DIR_HANDLE.getDirectoryHandle('ALLEGATI');
        legacyDetected = true;
      } catch (e) {}
    }

    const dbInfo = dbFound ? t('bootFolderDbFound') : t('bootFolderDbNew');

    statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-ok">' +
      '<span class="boot-folder-check">&#10003;</span> ' +
      t('bootFolderOk') +
      '<div class="boot-folder-path">' + t('bootFolderConnected') + ' ' + FS_DIR_HANDLE.name + '</div>' +
      '<div class="boot-folder-path">' + dbInfo + '</div>' +
      '</div>';

    const btnConnect = document.getElementById('btnBootConnect');
    btnConnect.textContent = t('bootFolderEnter');
    btnConnect.onclick = async function() {
      statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-wait">' + t('bootFolderLoading') + '</div>';
      try {
        if (!FS_USER_NAME) FS_USER_NAME = FS_DIR_HANDLE.name;
        await initDatabases();
        const loaded = await loadDatabaseFromFS();
        if (loaded) await saveDatabaseToFS();
        document.getElementById('bootFolder').style.display = 'none';
        updateFsLogo();
        _updateUserNameDisplay();
        if (typeof initApp === 'function') initApp();
      } catch (err) {
        console.error('Boot loading error:', err);
        statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-error">Error: ' + (err.message || err) + '</div>';
      }
    };
  } catch (e) {
    FS_DIR_HANDLE = null;
    FS_FILES_HANDLE = null;
    statusEl.innerHTML = '<div class="boot-folder-msg boot-folder-error">' + t('bootFolderFail') + '</div>';
  }
}

async function verifyFsConnection() {
  if (!FS_DIR_HANDLE || !FS_FILES_HANDLE) return false;
  try {
    await FS_FILES_HANDLE.getFileHandle('.uxg_sentinel');
    return true;
  } catch (e) {
    return false;
  }
}

async function clearLocalDatabase() {
  const emptyData = {
    cases: [], proceedings: [], dossiers: [], acts: [],
    facts: [], circumstances: [], factActRelations: [], circumstanceProofRelations: [], proofs: [],
    subjects: [], entitySubjects: [], files: [],
    proceedingRoles: [], proceedingActions: [], proceedingLinks: [],
    customLists: []
  };
  await DB.importAll(emptyData);
  await SysDB.importAll({ categories: [], subcategories: [], roles: [] });
  await GeoDB.importAll({ comuni: [], distretti: [], art11cpp: [] });
}

async function _tryLoadFileFromLocations(filename, legacyFilename) {
  const locations = [];
  if (FS_FILES_HANDLE) locations.push({ handle: FS_FILES_HANDLE, label: 'root' });
  if (FS_DIR_HANDLE) {
    try { const d = await FS_DIR_HANDLE.getDirectoryHandle(USER_DATA_FOLDER); locations.push({ handle: d, label: USER_DATA_FOLDER }); } catch (e) {}
    try { const d = await FS_DIR_HANDLE.getDirectoryHandle('ALLEGATI'); locations.push({ handle: d, label: 'ALLEGATI' }); } catch (e) {}
    try { const d = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH); locations.push({ handle: d, label: DB_PATH }); } catch (e) {}
  }
  for (const loc of locations) {
    try {
      const fh = await loc.handle.getFileHandle(filename);
      const file = await fh.getFile();
      const text = await file.text();
      if (text.trim()) {
        console.log(`Loaded ${filename} from ${loc.label}`);
        return text;
      }
    } catch (e) {}
    if (legacyFilename && legacyFilename !== filename) {
      try {
        const fh = await loc.handle.getFileHandle(legacyFilename);
        const file = await fh.getFile();
        const text = await file.text();
        if (text.trim()) {
          console.log(`Loaded ${legacyFilename} (legacy) from ${loc.label}`);
          return text;
        }
      } catch (e) {}
    }
  }
  return null;
}

async function _loadSystemDataFromFS() {
  let text = null;
  if (FS_DIR_HANDLE) {
    try {
      const dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
      const sysFileHandle = await dataDir.getFileHandle(SYS_DB_FILENAME);
      const sysFile = await sysFileHandle.getFile();
      text = await sysFile.text();
    } catch (e) {}
  }
  if (!text && FS_ROOT_HANDLE) {
    try {
      const appDir = await FS_ROOT_HANDLE.getDirectoryHandle('app');
      const dataDir = await appDir.getDirectoryHandle(DB_PATH);
      const fh = await dataDir.getFileHandle(SYS_DB_FILENAME);
      const f = await fh.getFile();
      text = await f.text();
    } catch (e) {}
  }
  if (!text) {
    try {
      const resp = await fetch(DB_PATH + '/' + SYS_DB_FILENAME);
      if (resp.ok) text = await resp.text();
    } catch (e) {}
  }
  if (!text || !text.trim()) {
    console.log('No system data found, will seed defaults.');
    return;
  }
  try {
    const sysData = JSON.parse(text);
    console.log('System data parsed — keys:', Object.keys(sysData).join(', '),
      'categories:', (sysData.categories || []).length,
      'subcategories:', (sysData.subcategories || []).length,
      'roles:', (sysData.roles || []).length,
      'comuni:', (sysData.comuni || []).length);
    if (sysData.categories && Array.isArray(sysData.categories)) {
      const firstCat = sysData.categories[0];
      if (firstCat && firstCat.subcategories) {
        await SysDB.importNested(sysData);
      } else {
        await SysDB.importAll(sysData);
      }
    }
    console.log('System data loaded.');
  } catch (e) {
    console.error('Error parsing system data:', e);
  }
}

async function _loadGeoDataFromFS() {
  let text = null;
  if (FS_DIR_HANDLE) {
    try {
      var dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
      var geoFileHandle = await dataDir.getFileHandle(GEO_DB_FILENAME);
      var geoFile = await geoFileHandle.getFile();
      text = await geoFile.text();
    } catch (e) {}
  }
  if (!text && FS_ROOT_HANDLE) {
    try {
      const appDir = await FS_ROOT_HANDLE.getDirectoryHandle('app');
      const dd = await appDir.getDirectoryHandle(DB_PATH);
      const fh = await dd.getFileHandle(GEO_DB_FILENAME);
      const f = await fh.getFile();
      text = await f.text();
    } catch (e) {}
  }
  if (!text) {
    try {
      const resp = await fetch(DB_PATH + '/' + GEO_DB_FILENAME);
      if (resp.ok) text = await resp.text();
    } catch (e) {}
  }
  if (!text || !text.trim()) {
    console.log('No geo data found.');
    return;
  }
  try {
    var geoData = JSON.parse(text);
    console.log('Geo data parsed — comuni:', (geoData.comuni || []).length,
      'distretti:', (geoData.distretti || []).length,
      'art11cpp:', (geoData.art11cpp || []).length);
    await GeoDB.importAll(geoData);
    console.log('Geo data loaded.');
  } catch (e) {
    console.error('Error parsing geo data:', e);
  }
}

async function _saveGeoDataToFS() {
  if (!FS_DIR_HANDLE) return;
  try {
    var dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH, { create: true });
    var geoData = await GeoDB.exportAll();
    var json = JSON.stringify(geoData, null, 2);
    var geoFileHandle = await dataDir.getFileHandle(GEO_DB_FILENAME, { create: true });
    var writable = await geoFileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    console.log('Geo data saved to filesystem:', DB_PATH + '/' + GEO_DB_FILENAME);
  } catch (e) {
    console.error('Error saving geo data to FS:', e);
  }
}

async function _loadNormDataFromFS() {
  let text = null;
  if (FS_DIR_HANDLE) {
    try {
      var dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
      var normFileHandle = await dataDir.getFileHandle(NORM_DB_FILENAME);
      var normFile = await normFileHandle.getFile();
      text = await normFile.text();
    } catch (e) {}
  }
  if (!text && FS_ROOT_HANDLE) {
    try {
      const appDir = await FS_ROOT_HANDLE.getDirectoryHandle('app');
      const dd = await appDir.getDirectoryHandle(DB_PATH);
      const fh = await dd.getFileHandle(NORM_DB_FILENAME);
      const f = await fh.getFile();
      text = await f.text();
    } catch (e) {}
  }
  if (!text || !text.trim()) {
    console.log('No norm data file found, loading bundled.');
    await _loadBundledNormData();
    return;
  }
  try {
    var normData = JSON.parse(text);
    var isV2 = !!(normData.sistemi_giuridici && normData.fonti_normative);
    if (!isV2) {
      console.log('Norm data is v1 format — loading bundled v2 instead.');
      await _loadBundledNormData();
      return;
    }
    console.log('Norm data parsed (v2) — sistemi:', (normData.sistemi_giuridici || []).length, 'fonti:', (normData.fonti_normative || []).length, 'nodi:', (normData.nodi_normativi || []).length);
    await NormDB.importAll(normData);
    NormDB.clearReimportFlag();
    console.log('Norm data loaded.');
  } catch (e) {
    console.error('Error loading norm data:', e);
    await _loadBundledNormData();
  }
}

async function _loadBundledNormData() {
  try {
    var resp = await fetch('data/' + NORM_DB_FILENAME);
    if (!resp.ok) {
      console.error('Failed to fetch bundled norm data:', resp.status);
      return;
    }
    var normData = await resp.json();
    console.log('Bundled norm data loaded (v2) — sistemi:', (normData.sistemi_giuridici || []).length, 'fonti:', (normData.fonti_normative || []).length, 'nodi:', (normData.nodi_normativi || []).length);
    await NormDB.importAll(normData);
    NormDB.clearReimportFlag();
  } catch (e) {
    console.error('Error loading bundled norm data:', e);
  }
}

async function _saveNormDataToFS() {
  if (!FS_DIR_HANDLE) return;
  try {
    var dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH, { create: true });
    var normData = await NormDB.exportAll();
    var json = JSON.stringify(normData, null, 2);
    var normFileHandle = await dataDir.getFileHandle(NORM_DB_FILENAME, { create: true });
    var writable = await normFileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    console.log('Norm data saved to filesystem:', DB_PATH + '/' + NORM_DB_FILENAME);
  } catch (e) {
    console.error('Error saving norm data to FS:', e);
  }
}

async function loadDatabaseFromFS() {
  if (!FS_DIR_HANDLE) return false;
  await clearLocalDatabase();

  await _loadSystemDataFromFS();
  const sysCats = await SysDB.getCategories();
  if (sysCats.length === 0) {
    console.log('No system categories after FS load, seeding defaults...');
    await SysDB.reseed();
  }

  await _loadGeoDataFromFS();
  await _loadNormDataFromFS();

  try {
    const text = await _tryLoadFileFromLocations(DB_FILENAME, DB_FILENAME_LEGACY);
    if (!text) {
      console.log('No existing database file found, starting fresh.');
      return false;
    }
    const data = JSON.parse(text);
    if (data.files) data.files = _restoreBlobsFromJSON(data.files);
    await DB.importAll(data);
    console.log('Database loaded from filesystem');
    return true;
  } catch (e) {
    console.error('Error loading database from FS:', e);
    return false;
  }
}

async function _saveSystemDataToFS() {
  if (!FS_DIR_HANDLE) return;
  try {
    const dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH, { create: true });
    const sysData = await SysDB.exportAll();
    const json = JSON.stringify(sysData, null, 2);
    const sysFileHandle = await dataDir.getFileHandle(SYS_DB_FILENAME, { create: true });
    const writable = await sysFileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    console.log('System data saved to filesystem:', DB_PATH + '/' + SYS_DB_FILENAME);
  } catch (e) {
    console.error('Error saving system data to FS:', e);
  }
}

function _blobToBase64(uint8arr) {
  let binary = '';
  for (let i = 0; i < uint8arr.length; i++) binary += String.fromCharCode(uint8arr[i]);
  return btoa(binary);
}

function _base64ToBlob(b64) {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

function _stripBlobsForJSON(files) {
  return files.map(f => {
    const copy = { ...f };
    if (copy.storagePath) {
      delete copy.blob;
    } else if (copy.blob && copy.blob.length > 0) {
      copy.blobBase64 = _blobToBase64(copy.blob);
      delete copy.blob;
    } else {
      delete copy.blob;
    }
    return copy;
  });
}

function _restoreBlobsFromJSON(files) {
  if (!files) return files;
  return files.map(f => {
    if (f.blobBase64 && !f.blob) {
      f.blob = _base64ToBlob(f.blobBase64);
      delete f.blobBase64;
    }
    return f;
  });
}

async function saveDatabaseToFS() {
  if (!FS_FILES_HANDLE) return;
  try {
    const data = await DB.exportAll();
    data.files = _stripBlobsForJSON(data.files);
    const json = JSON.stringify(data, null, 2);
    const dbFileHandle = await FS_FILES_HANDLE.getFileHandle(DB_FILENAME, { create: true });
    const writable = await dbFileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    console.log('Case data saved to filesystem:', USER_DATA_FOLDER + '/' + DB_FILENAME);
  } catch (e) {
    console.error('Error saving database to FS:', e);
  }
}

function scheduleSaveToFS() {
  if (_isBooting) return;
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => {
    saveDatabaseToFS();
  }, 500);
}

async function saveFileToFS(file, entityType, entityId, lang, fileRole = null, extraOpts = {}, rawBuf = null) {
  if (!FS_FILES_HANDLE) { console.warn('saveFileToFS: FS_FILES_HANDLE is null, skip'); return null; }
  console.log('saveFileToFS: FS_FILES_HANDLE.name =', FS_FILES_HANDLE.name, '| entity:', entityType, entityId, '| role:', fileRole);
  try {
    const opts = (fileRole && lang) ? { lang, fileRole, ...extraOpts } : { ...extraOpts };
    const pathInfo = await buildAllegatiPath(entityType, entityId, opts);
    if (!pathInfo) {
      console.error('saveFileToFS: buildAllegatiPath returned null for', entityType, entityId, opts);
      return null;
    }
    console.log('saveFileToFS: full path =', FS_FILES_HANDLE.name + '/' + pathInfo.segments.join('/'));
    const dir = await _getOrCreateNestedDir(FS_FILES_HANDLE, pathInfo.segments);
    let newFileName;
    if (entityType === 'case') {
      newFileName = _sanitizeFsName(file.name);
    } else if ((fileRole === 'doss_orig' || fileRole === 'doss_cert') && opts.origName) {
      const rolePrefix = fileRole === 'doss_orig' ? 'ORG' : 'TRD';
      const idxStr = String(opts.fileIdx || 1).padStart(3, '0');
      const origBase = opts.origName.replace(/\.[^/.]+$/, '');
      const ext = opts.origName.includes('.') ? opts.origName.substring(opts.origName.lastIndexOf('.')) : '';
      const sanitizedBase = _sanitizeName(origBase).substring(0, 80);
      newFileName = rolePrefix + '_' + lang.toUpperCase() + idxStr + (sanitizedBase ? '_' + sanitizedBase : '') + ext;
    } else if (fileRole === 'doss_alldig') {
      newFileName = _sanitizeFsName(file.name);
    } else if (entityType === 'pec' && fileRole) {
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      if (fileRole === 'pec_msg') newFileName = 'MSG' + ext;
      else if (fileRole === 'pec_acc') {
        // Numerazione progressiva quando arrivano accettazioni multiple
        // (es. Aruba .1.1/.1.2): la prima resta "ACCETTAZIONE.eml" per
        // compatibilità, le successive diventano "ACCETTAZIONE-02.eml", ecc.
        const ai = Number(opts.accIdx || 1);
        newFileName = (ai > 1 ? 'ACCETTAZIONE-' + String(ai).padStart(2, '0') : 'ACCETTAZIONE') + ext;
      }
      else if (fileRole === 'pec_del') {
        // Numerazione progressiva quando arrivano consegne multiple
        // (un'unica PEC con più destinatari produce N ricevute di consegna):
        // la prima resta "CONSEGNA.eml" per compatibilità, le successive
        // diventano "CONSEGNA-02.eml", ecc. Senza questa numerazione il
        // nome fisso "CONSEGNA.eml" causava la sovrascrittura silenziosa
        // sul filesystem (il record IndexedDB invece era già numerato).
        const di = Number(opts.delIdx || 1);
        newFileName = (di > 1 ? 'CONSEGNA-' + String(di).padStart(2, '0') : 'CONSEGNA') + ext;
      }
      else if (fileRole === 'pec_attach') {
        const aIdx = String(opts.attachIdx || 1).padStart(3, '0');
        const base = file.name.replace(/\.[^/.]+$/, '');
        const sanitized = _sanitizeName(base).substring(0, 60);
        newFileName = 'ALL_' + aIdx + (sanitized ? '_' + sanitized : '') + ext;
      } else {
        newFileName = _sanitizeFsName(file.name);
      }
    } else if (entityType === 'proof') {
      // Schema dedicato alle prove: PR_<LANG>_<NNN>_<NOME_ORIGINALE>.<ext>
      // Manteniamo il nome del file trasferito al posto del titolo della
      // prova, così il nome sul disco resta riconoscibile (utile per i
      // file dei "Particolari" e per il media originale arrivati dal
      // bottone "📤 Trasferisci").
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const base = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
      const sanitizedOrig = _sanitizeName(base).substring(0, 100);
      newFileName = 'PR_' + lang.toUpperCase() + '_' + _pad3(pathInfo.idx) + (sanitizedOrig ? '_' + sanitizedOrig : '') + ext;
    } else if (entityType === 'subject') {
      // Documenti soggetto: mantieni il nome originale del file
      // (sanificato), prefissato dall'indice progressivo per evitare
      // collisioni quando si caricano due file omonimi. Fallback
      // overwrite-safe: se il nome esiste gia' su disco aggiungiamo un
      // suffisso "_2", "_3" ecc. per non sovrascrivere file esistenti
      // (es. record DB cancellati ma file ancora sul filesystem).
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const base = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
      const sanitizedOrig = _sanitizeName(base).substring(0, 100);
      const baseName = 'DOC_' + _pad3(pathInfo.idx) + (sanitizedOrig ? '_' + sanitizedOrig : '');
      newFileName = baseName + ext;
      try {
        let suffix = 1;
        while (true) {
          let exists = false;
          try { await dir.getFileHandle(newFileName); exists = true; } catch (_) { exists = false; }
          if (!exists) break;
          suffix++;
          newFileName = baseName + '_' + suffix + ext;
          if (suffix > 99) break;
        }
      } catch (_) {}
    } else if (entityType === 'act') {
      // Schema atti (variante B utente): <LANG>_<titolo>.<ext>
      // Niente prefisso entità, niente indice progressivo (l'indice è
      // già nel nome cartella AF001/A001). Sanifica il titolo (max 100).
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const title = pathInfo.entity.title || pathInfo.entity.descriptionIt || '';
      const sanitizedTitle = _sanitizeName(title).substring(0, 100);
      newFileName = lang.toUpperCase() + (sanitizedTitle ? '_' + sanitizedTitle : '') + ext;
    } else {
      const prefix = _entityPrefix(entityType);
      const title = pathInfo.entity.title || pathInfo.entity.descriptionIt || '';
      newFileName = _buildAllegatiFileName(prefix, lang, pathInfo.idx, title, file.name);
    }
    // Hard-sanitize finale: garantisce che il nome rispetti i vincoli del
    // File System Access API (no /\:*?"<>|, no nomi vuoti/riservati, no
    // caratteri esotici negli allegati PEC tipo "ATT00001.dat;v=1").
    newFileName = _sanitizeFsName(newFileName);
    console.log('saveFileToFS: filename =', newFileName);
    const fileHandle = await dir.getFileHandle(newFileName, { create: true });
    const writable = await fileHandle.createWritable();
    const dataToWrite = rawBuf ? new Uint8Array(rawBuf) : (await file.arrayBuffer());
    await writable.write(dataToWrite);
    await writable.close();
    console.log('saveFileToFS: done ->', pathInfo.segments.join('/') + '/' + newFileName);
    return {
      storagePath: pathInfo.segments.join('/'),
      diskFileName: newFileName
    };
  } catch (e) {
    console.error('saveFileToFS ERROR:', e.name, e.message, '| entity:', entityType, entityId, '| role:', fileRole);
    if (e.name === 'NotFoundError' || e.name === 'NotAllowedError') {
      const rootStillAlive = FS_FILES_HANDLE ? await _verifyHandleAlive(FS_FILES_HANDLE).catch(() => false) : false;
      if (!rootStillAlive) {
        FS_FILES_HANDLE = null;
        FS_DIR_HANDLE = null;
        _fsNotFoundWarned = true;
        if (!document.getElementById('_fsStaleAlert')) {
          const div = document.createElement('div');
          div.id = '_fsStaleAlert';
          div.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#7f1d1d;color:#fff;padding:16px 24px;border-radius:10px;z-index:99999;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,.5);max-width:520px;text-align:center;line-height:1.5';
          div.innerHTML = '<strong>⚠️ Cartella non accessibile</strong><br>La cartella selezionata non è più raggiungibile (spostata o re-estratta).<br>I dati sono al sicuro nel browser.';
          const reconnBtn = document.createElement('button');
          reconnBtn.textContent = '🔄 Riconnetti cartella';
          reconnBtn.style.cssText = 'display:block;margin:10px auto 0;padding:8px 18px;background:#fff;color:#7f1d1d;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;';
          reconnBtn.onclick = async () => {
            try { await clearSession(); } catch (_) {}
            window.location.href = '../index.html';
          };
          const closeBtn = document.createElement('button');
          closeBtn.textContent = '✕';
          closeBtn.style.cssText = 'position:absolute;top:8px;right:10px;background:none;border:none;color:#fca5a5;cursor:pointer;font-size:16px;';
          closeBtn.onclick = () => div.remove();
          div.style.position = 'fixed';
          div.appendChild(reconnBtn);
          div.appendChild(closeBtn);
          document.body.appendChild(div);
        }
      } else {
        console.warn('saveFileToFS: NotFoundError ma la cartella radice è ancora accessibile — errore locale, dati salvati nel browser');
        if (!document.getElementById('_fsSoftWarn')) {
          const w = document.createElement('div');
          w.id = '_fsSoftWarn';
          w.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#78350f;color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.4);max-width:480px;text-align:center;line-height:1.5';
          w.innerHTML = '⚠️ File non copiato su disco (sottocartella non accessibile) — salvato nel browser.';
          document.body.appendChild(w);
          setTimeout(() => { if (w.parentNode) w.parentNode.removeChild(w); }, 6000);
        }
      }
    }
    return null;
  }
}
let _fsNotFoundWarned = false;

async function extractZipToFS(zipBuf, lang, parentSegments) {
  if (!FS_FILES_HANDLE || typeof JSZip === 'undefined') return [];
  try {
    const zip = await JSZip.loadAsync(zipBuf);
    const extractFolder = 'Extract_' + lang.toUpperCase();
    const extractSegments = [...parentSegments, extractFolder];
    const extractDir = await _getOrCreateNestedDir(FS_FILES_HANDLE, extractSegments);
    const extractedFiles = [];
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      const fileArrayBuf = await zipEntry.async('arraybuffer');
      const fileName = path.split('/').pop();
      if (!fileName) continue;
      const fileHandle = await extractDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(fileArrayBuf);
      await writable.close();
      extractedFiles.push({
        name: fileName,
        size: fileArrayBuf.byteLength,
        storagePath: extractSegments.join('/'),
        diskFileName: fileName,
        buf: fileArrayBuf
      });
    }
    return extractedFiles;
  } catch (e) {
    console.error('extractZipToFS error:', e);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// Verifica integrita' hash dei file allegati alle card (atti / prove).
// Legge il blob dal File System fisico (lo stesso percorso usato da
// downloadFileFromFS), ricalcola SHA-256 e confronta con il valore
// memorizzato in `fileRecord.hash` (calcolato all'upload originale).
// Risultato in cache per sessione (Map fileId → {ok,current,stored}).
// ─────────────────────────────────────────────────────────────────────
const _HASH_VERIFY_CACHE = new Map();

// Self-healing: ricostruisce il path corrente del file via buildAllegatiPath
// (riflette la struttura attuale, es. <PROC>/FT###/<entity>) e tenta di leggere
// li'. Se trova il file, aggiorna fileRecord.storagePath nel DB cosi' le letture
// successive sono dirette. Ritorna il File handle/getFile o null.
async function _resolveFileViaCurrentPath(fileRecord) {
  if (!FS_FILES_HANDLE || !fileRecord || !fileRecord.entityType || !fileRecord.entityId) return null;
  try {
    const pathInfo = await buildAllegatiPath(fileRecord.entityType, fileRecord.entityId, {});
    if (!pathInfo || !pathInfo.segments) return null;
    const newPath = pathInfo.segments.join('/');
    if (newPath === fileRecord.storagePath) return null; // gia' provato
    const dir = await _resolveNestedDir(FS_FILES_HANDLE, pathInfo.segments);
    const diskName = fileRecord.diskFileName || fileRecord.fileName;
    let file = null;
    try {
      const fh = await dir.getFileHandle(diskName);
      file = await fh.getFile();
    } catch (_) {
      // Fallback: scansione directory (file potrebbe avere nome diverso)
      const target = (diskName || '').toLowerCase();
      const candidates = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== 'file' || name.startsWith('.')) continue;
        candidates.push({ name, handle });
        if (name.toLowerCase() === target) { file = await handle.getFile(); break; }
      }
      if (!file && candidates.length === 1) file = await candidates[0].handle.getFile();
    }
    if (!file) return null;
    try {
      if (typeof DB !== 'undefined' && DB.updateFile && fileRecord.id != null) {
        await DB.updateFile(fileRecord.id, { storagePath: newPath });
        fileRecord.storagePath = newPath;
      }
    } catch (_) {}
    return file;
  } catch (_) { return null; }
}

async function _readFileBlobFromFS(fileRecord) {
  // Tentativo 1: percorso canonico (storagePath + diskFileName).
  // I file "puntatore" (sourceFileId != null) hanno un proprio
  // diskFileName/storagePath nella cartella della card (AF/PF), quindi
  // il read passa per la stessa via dei file ordinari — coerente con
  // downloadFileFromFS, che per gli AF prima del fix mostrava verde.
  if (FS_FILES_HANDLE && fileRecord.storagePath) {
    try {
      const segments = fileRecord.storagePath.split('/');
      const dir = await _resolveNestedDir(FS_FILES_HANDLE, segments);
      const diskName = fileRecord.diskFileName || fileRecord.fileName;
      const fileHandle = await dir.getFileHandle(diskName);
      return await fileHandle.getFile();
    } catch (_) { /* fallback scan */ }
    // Fallback: il diskFileName memorizzato puo' divergere dal nome
    // effettivo sul disco (es. file rinominato post-import o salvato con
    // diskFileName non popolato sui record storici). Scansione della
    // directory: se contiene UN solo file la usiamo, altrimenti tentiamo
    // un match case-insensitive sul fileName originale.
    try {
      const segments = fileRecord.storagePath.split('/');
      const dir = await _resolveNestedDir(FS_FILES_HANDLE, segments);
      const target = (fileRecord.diskFileName || fileRecord.fileName || '').toLowerCase();
      const candidates = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== 'file') continue;
        if (name.startsWith('.')) continue;
        candidates.push({ name, handle });
        if (name.toLowerCase() === target) {
          return await handle.getFile();
        }
      }
      if (candidates.length === 1) {
        return await candidates[0].handle.getFile();
      }
      // Match per estensione + size se hanno un solo candidato con
      // l'estensione attesa.
      const ext = (target.split('.').pop() || '').toLowerCase();
      const sameExt = candidates.filter(c => c.name.toLowerCase().endsWith('.' + ext));
      if (sameExt.length === 1) return await sameExt[0].handle.getFile();
    } catch (_) { /* try smart */ }
  }
  // Tentativo 2: self-healing via buildAllegatiPath (struttura corrente).
  const smart = await _resolveFileViaCurrentPath(fileRecord);
  if (smart) return smart;
  if (FS_FILES_HANDLE) {
    const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
      ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
      : 'act_' + fileRecord.actId;
    try {
      let legacyRoot = FS_FILES_HANDLE;
      try { legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP'); } catch (_) {}
      const dir = await legacyRoot.getDirectoryHandle(legacyKey);
      const fileHandle = await dir.getFileHandle(fileRecord.fileName);
      return await fileHandle.getFile();
    } catch (_) {}
  }
  if (fileRecord.blob) return new Blob([fileRecord.blob]);
  return null;
}

async function verifyFileHash(fileRecord, opts) {
  opts = opts || {};
  if (!fileRecord || fileRecord.id == null) return { state: 'unknown' };
  if (!opts.force && _HASH_VERIFY_CACHE.has(fileRecord.id)) {
    return _HASH_VERIFY_CACHE.get(fileRecord.id);
  }
  const stored = (fileRecord.hash || '').toLowerCase();
  if (!stored) {
    const r = { state: 'no-hash', stored: '', current: '' };
    _HASH_VERIFY_CACHE.set(fileRecord.id, r);
    return r;
  }
  let blob = null;
  try { blob = await _readFileBlobFromFS(fileRecord); } catch (_) {}
  if (!blob) {
    // Se la cartella fisica non e' (ancora) collegata in questa sessione,
    // non possiamo concludere che il file sia mancante: lasciamo lo stato
    // 'pending' SENZA cache, cosi' al prossimo render — quando l'utente
    // ha autorizzato la cartella — la verifica viene rifatta.
    if (!FS_FILES_HANDLE) {
      return { state: 'pending', stored, current: '' };
    }
    const r = { state: 'missing', stored, current: '' };
    _HASH_VERIFY_CACHE.set(fileRecord.id, r);
    return r;
  }
  try {
    const buf = await blob.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const r = {
      state: hex === stored ? 'ok' : 'mismatch',
      stored,
      current: hex
    };
    _HASH_VERIFY_CACHE.set(fileRecord.id, r);
    return r;
  } catch (e) {
    const r = { state: 'error', stored, current: '', error: String(e) };
    _HASH_VERIFY_CACHE.set(fileRecord.id, r);
    return r;
  }
}

function _hashBadgeColors(state) {
  // ok=verde, mismatch=rosso, missing/no-hash/error=grigio, pending=ambra
  if (state === 'ok') return { bg: '#16a34a', fg: '#fff', label: 'H' };
  if (state === 'mismatch') return { bg: '#dc2626', fg: '#fff', label: 'H' };
  if (state === 'missing') return { bg: '#9ca3af', fg: '#fff', label: 'H?' };
  if (state === 'no-hash') return { bg: '#9ca3af', fg: '#fff', label: 'H\u2013' };
  if (state === 'pending') return { bg: '#f59e0b', fg: '#fff', label: 'H\u2026' };
  return { bg: '#9ca3af', fg: '#fff', label: 'H?' };
}

function _hashBadgeTooltip(state, stored, current) {
  const _it = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (state === 'ok') {
    return (_it ? 'Integrity OK\nSHA-256: ' : 'Integrita\u0300 OK\nSHA-256: ') + (stored || '');
  }
  if (state === 'mismatch') {
    return (_it ? 'Integrity FAILED — file modified\nStored: ' : 'Integrita\u0300 COMPROMESSA — file modificato\nMemorizzato: ') + (stored || '') + '\n' + (_it ? 'Current: ' : 'Attuale: ') + (current || '');
  }
  if (state === 'missing') {
    return (_it ? 'File not found on disk\nStored SHA-256: ' : 'File non trovato su disco\nSHA-256 memorizzato: ') + (stored || '');
  }
  if (state === 'no-hash') {
    return _it ? 'No hash stored for this file' : 'Nessun hash memorizzato per questo file';
  }
  if (state === 'pending') {
    return _it ? 'Folder not connected — connect it to verify the file' : 'Cartella non collegata — collega la cartella per verificare il file';
  }
  return _it ? 'Verifying hash…' : 'Verifica hash in corso…';
}

function renderHashBadgePlaceholder(fileRecord) {
  if (!fileRecord || fileRecord.id == null) return '';
  const fid = fileRecord.id;
  const stored = (fileRecord.hash || '').toLowerCase();
  const cached = _HASH_VERIFY_CACHE.get(fid);
  const state = cached ? cached.state : (stored ? 'pending' : 'no-hash');
  const cur = cached ? cached.current : '';
  const c = _hashBadgeColors(state === 'pending' ? 'missing' : state);
  const tip = _hashBadgeTooltip(state === 'pending' ? 'pending' : state, stored, cur);
  return `<span class="card-file-hash-badge" data-hash-fid="${fid}" data-hash-state="${state}" title="${(tip||'').replace(/"/g,'&quot;')}" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:14px;padding:0 4px;font-size:9px;font-weight:700;border-radius:3px;background:${c.bg};color:${c.fg};margin-right:3px;flex-shrink:0;cursor:default;font-family:monospace">${c.label}</span>`;
}

function renderFileMetaBtn(fileRecord) {
  if (!fileRecord || fileRecord.id == null) return '';
  if (fileRecord.entityType !== 'proof') return '';
  if (fileRecord.sourceFileId != null) return '';
  if (fileRecord.fileRole === 'image_omissis') return '';
  if (fileRecord.fileRole === 'image_omissis_hash') return '';
  const fid = fileRecord.id;
  const _it = !(typeof currentLang !== 'undefined' && currentLang === 'en');
  const tip = _it ? 'Metadati file originale' : 'Original file metadata';
  return `<span class="card-file-meta-btn" data-meta-fid="${fid}" title="${tip}" onclick="event.stopPropagation();_openFileMetaModal(${fid})" style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:14px;padding:0 4px;font-size:9px;font-weight:700;border-radius:3px;background:#7c3aed;color:#fff;margin-right:3px;flex-shrink:0;cursor:pointer;font-family:monospace">M</span>`;
}

async function refreshHashBadgesIn(rootEl, opts) {
  opts = opts || {};
  if (!rootEl) return;
  const nodes = rootEl.querySelectorAll('.card-file-hash-badge[data-hash-fid]');
  if (!nodes.length) return;
  const seen = new Set();
  const tasks = [];
  nodes.forEach(node => {
    const fid = parseInt(node.getAttribute('data-hash-fid'));
    if (!fid || seen.has(fid)) return;
    seen.add(fid);
    tasks.push((async () => {
      let rec = null;
      try { rec = await DB.getFile ? await DB.getFile(fid) : await db.files.get(fid); } catch (_) {}
      if (!rec) rec = await db.files.get(fid).catch(() => null);
      if (!rec) return;
      const r = await verifyFileHash(rec, { force: !!opts.force });
      const allNodes = rootEl.querySelectorAll(`.card-file-hash-badge[data-hash-fid="${fid}"]`);
      allNodes.forEach(n => {
        const c = _hashBadgeColors(r.state);
        n.setAttribute('data-hash-state', r.state);
        n.style.background = c.bg;
        n.style.color = c.fg;
        n.textContent = c.label;
        n.title = _hashBadgeTooltip(r.state, r.stored || '', r.current || '');
      });
    })());
  });
  // Esegue in parallelo ma con limite implicito (Promise.all dei task gia' creati).
  await Promise.all(tasks);
}

async function downloadFileFromFS(fileRecord) {
  if (FS_FILES_HANDLE && fileRecord.storagePath) {
    try {
      const segments = fileRecord.storagePath.split('/');
      const dir = await _resolveNestedDir(FS_FILES_HANDLE, segments);
      const diskName = fileRecord.diskFileName || fileRecord.fileName;
      const fileHandle = await dir.getFileHandle(diskName);
      const file = await fileHandle.getFile();
      triggerDownload(file, fileRecord.fileName);
      return;
    } catch (e) {
      console.log('File not found at hierarchical path, trying smart resolve...');
    }
  }

  // Self-healing: ricalcola il path corrente (es. spostamento in <PROC>/FT###/...)
  const smart = await _resolveFileViaCurrentPath(fileRecord);
  if (smart) {
    triggerDownload(smart, fileRecord.fileName);
    return;
  }

  if (FS_FILES_HANDLE) {
    const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
      ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
      : 'act_' + fileRecord.actId;
    try {
      let legacyRoot = FS_FILES_HANDLE;
      try {
        legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP');
      } catch (e) {}
      const dir = await legacyRoot.getDirectoryHandle(legacyKey);
      const fileHandle = await dir.getFileHandle(fileRecord.fileName);
      const file = await fileHandle.getFile();
      triggerDownload(file, fileRecord.fileName);
      return;
    } catch (e) {
      console.log('File not in legacy FS either, trying blob fallback');
    }
  }

  if (fileRecord.blob) {
    const blob = new Blob([fileRecord.blob]);
    const file = new File([blob], fileRecord.fileName, {
      type: fileRecord.fileType,
      lastModified: fileRecord.createdAt || Date.now()
    });
    triggerDownload(file, fileRecord.fileName);
  } else {
    alert(t('fsRequired'));
  }
}

function triggerDownload(file, name) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function _isDirEmpty(dirHandle) {
  try {
    const iter = dirHandle.values();
    const first = await iter.next();
    return first.done;
  } catch (_) { return false; }
}

async function _scanAndRemoveByName(rootHandle, targetName, maxDepth) {
  // Scansione ricorsiva di rootHandle alla ricerca di un file di nome
  // esatto targetName. Quando lo trova lo rimuove e ritorna true.
  // maxDepth limita la profondita' per sicurezza.
  if (!rootHandle || !targetName || maxDepth < 0) return false;
  try {
    for await (const [name, handle] of rootHandle.entries()) {
      if (handle.kind === 'file' && name === targetName) {
        try {
          await rootHandle.removeEntry(name);
          console.log('[deleteFileFromFS] file rimosso via scansione:', targetName);
          return true;
        } catch (e) { return false; }
      }
    }
    for await (const [name, handle] of rootHandle.entries()) {
      if (handle.kind === 'directory') {
        const found = await _scanAndRemoveByName(handle, targetName, maxDepth - 1);
        if (found) return true;
      }
    }
  } catch (_) {}
  return false;
}

async function deleteFileFromFS(fileRecord) {
  if (!FS_FILES_HANDLE) {
    console.warn('[deleteFileFromFS] FS_FILES_HANDLE non disponibile');
    return false;
  }
  const diskName = fileRecord.diskFileName || fileRecord.fileName;

  if (fileRecord.storagePath) {
    try {
      const segments = fileRecord.storagePath.split('/').filter(Boolean);
      const dir = await _resolveNestedDir(FS_FILES_HANDLE, segments);
      await dir.removeEntry(diskName);
      console.log('[deleteFileFromFS] rimosso via storagePath:', fileRecord.storagePath + '/' + diskName);
      if (await _isDirEmpty(dir)) {
        try {
          const parentSegments = segments.slice(0, -1);
          const parentDir = parentSegments.length > 0
            ? await _resolveNestedDir(FS_FILES_HANDLE, parentSegments)
            : FS_FILES_HANDLE;
          await parentDir.removeEntry(segments[segments.length - 1]);
        } catch (e) { console.log('Could not remove empty dir:', e.message); }
      }
      return true;
    } catch (e) {
      console.log('[deleteFileFromFS] non trovato via storagePath, provo legacy/scan:', e.message);
    }
  }

  const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
    ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
    : 'act_' + fileRecord.actId;
  try {
    let legacyRoot = FS_FILES_HANDLE;
    try {
      legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP');
    } catch (e) {}
    const dir = await legacyRoot.getDirectoryHandle(legacyKey);
    await dir.removeEntry(fileRecord.fileName);
    console.log('[deleteFileFromFS] rimosso via legacy:', legacyKey + '/' + fileRecord.fileName);
    return true;
  } catch (e) {
    // continua con lo scan
  }

  // Fallback finale: scansione ricorsiva per nome esatto.
  console.log('[deleteFileFromFS] tentativo scansione ricorsiva per nome:', diskName);
  const found = await _scanAndRemoveByName(FS_FILES_HANDLE, diskName, 8);
  if (!found) {
    console.warn('[deleteFileFromFS] file non trovato sul disco:', diskName);
  }
  return found;
}

async function deleteDossierFromFS(dossierId) {
  if (!FS_FILES_HANDLE) return;

  async function tryRmEntry(parentHandle, name) {
    try { await parentHandle.removeEntry(name, { recursive: true }); } catch (e) {}
  }

  async function tryRmBySegments(segments) {
    if (!segments || segments.length < 2) return;
    try {
      let handle = FS_FILES_HANDLE;
      for (let i = 0; i < segments.length - 1; i++) {
        handle = await handle.getDirectoryHandle(segments[i]);
      }
      await tryRmEntry(handle, segments[segments.length - 1]);
    } catch (e) {}
  }

  const topFolders = new Set();

  const collectFiles = async (entityType, entityId) => {
    const files = await DB.getEntityFiles(entityType, entityId);
    for (const f of files) {
      if (f.storagePath) {
        const segs = f.storagePath.split('/').filter(Boolean);
        if (segs.length >= 3) topFolders.add(segs[0] + '/' + segs[1] + '/' + segs[2]);
        else if (segs.length === 2) topFolders.add(segs[0] + '/' + segs[1]);
        else if (segs.length === 1) topFolders.add(segs[0]);
      }
    }
  };

  await collectFiles('dossier', dossierId);

  const acts = await DB.getActs(dossierId);
  for (const a of acts) await collectFiles('act', a.id);

  const facts = await DB.getFactsByDossier(dossierId);
  for (const f of facts) {
    await collectFiles('fact', f.id);
    const proofs = await DB.getProofs(f.id);
    for (const pr of proofs) await collectFiles('proof', pr.id);
  }

  for (const path of topFolders) {
    const segs = path.split('/').filter(Boolean);
    await tryRmBySegments(segs);
  }
}

async function loadPreviewFileFromFS(fileRecord) {
  if (FS_FILES_HANDLE && fileRecord.storagePath) {
    try {
      const segments = fileRecord.storagePath.split('/');
      const dir = await _resolveNestedDir(FS_FILES_HANDLE, segments);
      const diskName = fileRecord.diskFileName || fileRecord.fileName;
      const fh = await dir.getFileHandle(diskName);
      return await fh.getFile();
    } catch (e) {}
  }

  if (FS_FILES_HANDLE && fileRecord.entityType && fileRecord.entityId) {
    try {
      const pathInfo = await buildAllegatiPath(fileRecord.entityType, fileRecord.entityId, {});
      if (pathInfo && pathInfo.segments) {
        const newPath = pathInfo.segments.join('/');
        if (newPath !== fileRecord.storagePath) {
          const dir = await _resolveNestedDir(FS_FILES_HANDLE, pathInfo.segments);
          const diskName = fileRecord.diskFileName || fileRecord.fileName;
          const fh = await dir.getFileHandle(diskName);
          const file = await fh.getFile();
          try {
            if (typeof DB !== 'undefined' && DB.updateFile && fileRecord.id != null) {
              await DB.updateFile(fileRecord.id, { storagePath: newPath });
              fileRecord.storagePath = newPath;
            }
          } catch (_) {}
          return file;
        }
      }
    } catch (e) {}
  }

  if (FS_FILES_HANDLE) {
    const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
      ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
      : 'act_' + fileRecord.actId;
    try {
      let legacyRoot = FS_FILES_HANDLE;
      try {
        legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('DOC_ESP');
      } catch (e) {}
      const dir = await legacyRoot.getDirectoryHandle(legacyKey);
      const fh = await dir.getFileHandle(fileRecord.fileName);
      return await fh.getFile();
    } catch (e) {}
  }

  return null;
}

async function exportData() {
  try {
    const data = await DB.exportAll();
    data.files = _stripBlobsForJSON(data.files);
    data._system = await SysDB.exportAll();
    data._geo = await GeoDB.exportAll();
    data._norme = await NormDB.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uxg_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert(t('exportSuccess'));
  } catch (e) {
    console.error('Export error:', e);
  }
}

async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._system) {
        await SysDB.importAll(data._system);
        delete data._system;
      }
      if (data._geo) {
        await GeoDB.importAll(data._geo);
        delete data._geo;
      }
      if (data._norme) {
        await NormDB.importAll(data._norme);
        delete data._norme;
      }
      if (data.files) data.files = _restoreBlobsFromJSON(data.files);
      await DB.importAll(data);
      scheduleSaveToFS();
      alert(t('importSuccess'));
      renderAll();
    } catch (err) {
      console.error('Import error:', err);
      alert('Errore nell\'importazione: ' + err.message);
    }
  };
  input.click();
}

// ============================================================
// "Lavori in corso" — gestione cartelle e asset job
// Layout: data_user/<userName>/job_user/<jobId>/<filename>
// FS_DIR_HANDLE punta già a data_user/<userName>/, quindi creiamo
// job_user direttamente al suo interno.
// ============================================================

async function fsGetJobUserDir(create) {
  if (!FS_DIR_HANDLE) return null;
  try {
    return await FS_DIR_HANDLE.getDirectoryHandle(JOB_USER_FOLDER, { create: !!create });
  } catch (e) {
    if (create) console.warn('fsGetJobUserDir failed:', e);
    return null;
  }
}

async function fsGetJobDir(jobId, create) {
  if (!jobId) return null;
  const root = await fsGetJobUserDir(!!create);
  if (!root) return null;
  try {
    return await root.getDirectoryHandle(jobId, { create: !!create });
  } catch (e) {
    if (create) console.warn('fsGetJobDir failed for', jobId, e);
    return null;
  }
}

async function fsWriteJobAsset(jobId, filename, blob) {
  const dir = await fsGetJobDir(jobId, true);
  if (!dir) throw new Error('Cartella utente non disponibile per il salvataggio del job');
  const safeName = (typeof _sanitizeFsName === 'function') ? _sanitizeFsName(filename) : filename;
  const fh = await dir.getFileHandle(safeName, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
  return USER_DATA_FOLDER + '/' + (FS_USER_NAME || '') + '/' + JOB_USER_FOLDER + '/' + jobId + '/' + safeName;
}

async function fsReadJobAsset(jobId, filename) {
  const dir = await fsGetJobDir(jobId, false);
  if (!dir) return null;
  const safeName = (typeof _sanitizeFsName === 'function') ? _sanitizeFsName(filename) : filename;
  try {
    const fh = await dir.getFileHandle(safeName, { create: false });
    return await fh.getFile();
  } catch (e) {
    return null;
  }
}

// Cancella un singolo asset fisico di un job (es. file audio rinominato).
// Restituisce `true` se il file è stato rimosso, `false` se non esisteva o
// se l'utente non ha concesso accesso al filesystem (caso silenzioso).
async function fsRemoveJobAsset(jobId, filename) {
  const dir = await fsGetJobDir(jobId, false);
  if (!dir) return false;
  const safeName = (typeof _sanitizeFsName === 'function') ? _sanitizeFsName(filename) : filename;
  try {
    await dir.removeEntry(safeName);
    return true;
  } catch (e) {
    return false;
  }
}

async function fsRemoveJobDir(jobId) {
  const root = await fsGetJobUserDir(false);
  if (!root) return false;
  try {
    await root.removeEntry(jobId, { recursive: true });
    return true;
  } catch (e) {
    return false;
  }
}

async function fsListJobDirs() {
  const root = await fsGetJobUserDir(false);
  if (!root) return [];
  const out = [];
  try {
    for await (const [name, handle] of root.entries()) {
      if (handle.kind === 'directory') out.push(name);
    }
  } catch (e) { /* noop */ }
  return out;
}
