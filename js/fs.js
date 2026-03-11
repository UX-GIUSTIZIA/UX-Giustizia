'use strict';

let FS_DIR_HANDLE = null;
let FS_FILES_HANDLE = null;
const DB_PATH = 'data';
const DB_FILENAME = 'uxg_dati.json';
const DB_FILENAME_LEGACY = 'uxg_database.json';
const SYS_DB_FILENAME = 'system-data.json';
const GEO_DB_FILENAME = 'geo-data.json';
const NORM_DB_FILENAME = 'norme-data.json';
const USER_DATA_FOLDER = 'data_user';
let _saveTimeout = null;

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

function _pad3(n) {
  return String(n).padStart(3, '0');
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
  if (p.rgType) parts.push(p.rgType.toUpperCase());
  if (p.rgNumber) parts.push(_sanitizeName(p.rgNumber));
  if (p.year) parts.push(String(p.year).slice(-2));
  return parts.join('_');
}

function _buildCaseFolderName(c, idx) {
  const name = _sanitizeName(c.title || c.descriptionIt || '');
  return 'C' + _pad3(idx) + (name ? '_' + name : '');
}

function _buildProcFolderName(p, pIdx, cIdx) {
  const typeName = _procTypeName(p.type);
  const rgRef = _buildRegRef(p);
  return 'C' + _pad3(cIdx) + '_P' + _pad3(pIdx) + '_' + typeName + (rgRef ? '__' + rgRef : '');
}

function _buildAllegatiFileName(prefix, lang, idx, title, originalName) {
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
  const sanitized = _sanitizeName(title);
  return prefix + '_' + lang.toUpperCase() + '_' + _pad3(idx) + (sanitized ? '_' + sanitized : '') + ext;
}

async function _buildProcContext(proceedingId) {
  const p = await DB.getProceeding(proceedingId);
  if (!p) return null;
  const c = await DB.getCase(p.caseId);
  if (!c) return null;
  const cIdx = await _getSiblingIndex('case', c);
  const pIdx = await _getSiblingIndex('proceeding', p);
  const regRef = _buildRegRef(p);
  const caseFolder = _buildCaseFolderName(c, cIdx);
  const procFolder = _buildProcFolderName(p, pIdx, cIdx);
  const basePrefix = 'C' + _pad3(cIdx) + '_P' + _pad3(pIdx) + (regRef ? '_' + regRef : '');
  return { c, p, cIdx, pIdx, regRef, caseFolder, procFolder, basePrefix };
}

async function _buildDossierContext(dossierId) {
  const d = await DB.getDossier(dossierId);
  if (!d) return null;
  const ctx = await _buildProcContext(d.proceedingId);
  if (!ctx) return null;
  const dIdx = await _getSiblingIndex('dossier', d);
  const dossierPrefix = ctx.basePrefix + '_F' + _pad3(dIdx);
  return { ...ctx, d, dIdx, dossierPrefix };
}

async function buildAllegatiPath(entityType, entityId) {
  const segments = ['allegati'];

  switch (entityType) {
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
      segments.push(_buildCaseFolderName(c, cIdx), _buildProcFolderName(p, pIdx, cIdx));
      return { segments, entity: p, idx: pIdx };
    }
    case 'proceeding_origin': {
      const p = await DB.getProceeding(entityId);
      if (!p) return null;
      const c = await DB.getCase(p.caseId);
      if (!c) return null;
      const cIdx = await _getSiblingIndex('case', c);
      const pIdx = await _getSiblingIndex('proceeding', p);
      const regRef = _buildRegRef(p);
      const originFolder = 'C' + _pad3(cIdx) + '_P' + _pad3(pIdx) + (regRef ? '_' + regRef : '') + '_ATTO_ORIGINE';
      segments.push(_buildCaseFolderName(c, cIdx), _buildProcFolderName(p, pIdx, cIdx), originFolder);
      return { segments, entity: p, idx: pIdx };
    }
    case 'dossier': {
      const dCtx = await _buildDossierContext(entityId);
      if (!dCtx) return null;
      const fascIstituzFolder = dCtx.dossierPrefix + '_FASC_ISTITUZ';
      segments.push(dCtx.caseFolder, dCtx.procFolder, dCtx.dossierPrefix, fascIstituzFolder);
      return { segments, entity: dCtx.d, idx: dCtx.dIdx };
    }
    case 'act': {
      const a = await DB.getAct(entityId);
      if (!a) return null;
      const dCtx = await _buildDossierContext(a.dossierId);
      if (!dCtx) return null;
      const idx = await _getSiblingIndex('act', a);
      const actFolder = dCtx.dossierPrefix + '_A' + _pad3(idx);
      segments.push(dCtx.caseFolder, dCtx.procFolder, actFolder);
      return { segments, entity: a, idx };
    }
    case 'fact': {
      const fa = await DB.getFact(entityId);
      if (!fa) return null;
      const dCtx = await _buildDossierContext(fa.dossierId);
      if (!dCtx) return null;
      const idx = await _getSiblingIndex('fact', fa);
      const factFolder = dCtx.dossierPrefix + '_FA' + _pad3(idx);
      segments.push(dCtx.caseFolder, dCtx.procFolder, factFolder);
      return { segments, entity: fa, idx };
    }
    case 'proof': {
      const pr = await DB.getProof(entityId);
      if (!pr) return null;
      const factRels = await DB.getProofFactRelations(entityId);
      const firstRel = factRels.length > 0 ? factRels[0] : null;
      const f = firstRel && firstRel.fact ? firstRel.fact : null;
      if (!f) {
        const idx = await _getSiblingIndex('proof', pr);
        const proofFolder = 'PR' + _pad3(idx);
        segments.push(proofFolder);
        return { segments, entity: pr, idx };
      }
      const dCtx = await _buildDossierContext(f.dossierId);
      if (!dCtx) return null;
      const idx = await _getSiblingIndex('proof', pr);
      const proofFolder = dCtx.dossierPrefix + '_PR' + _pad3(idx);
      segments.push(dCtx.caseFolder, dCtx.procFolder, proofFolder);
      return { segments, entity: pr, idx };
    }
    default:
      return null;
  }
}

function _entityPrefix(entityType) {
  const map = { act: 'A', proof: 'PR', fact: 'FA', case: 'C', proceeding: 'P', proceeding_origin: 'AO', dossier: 'F' };
  return map[entityType] || entityType.toUpperCase();
}

async function _getOrCreateNestedDir(rootHandle, segments) {
  let current = rootHandle;
  for (const seg of segments) {
    current = await current.getDirectoryHandle(seg, { create: true });
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
  const logo = document.getElementById('uxgLogo');
  if (!logo) return;
  logo.classList.remove('fs-off', 'fs-on', 'fs-neutral');
  logo.classList.add(FS_DIR_HANDLE ? 'fs-on' : 'fs-neutral');
  const btn = document.getElementById('btnFs');
  if (btn) btn.textContent = FS_DIR_HANDLE ? t('fsConnected') : t('connectFs');
}

async function connectFS() {
  try {
    if (!('showDirectoryPicker' in window)) {
      alert(t('bootFolderBrowser'));
      return;
    }
    FS_DIR_HANDLE = await window.showDirectoryPicker({ mode: 'readwrite' });
    FS_FILES_HANDLE = await FS_DIR_HANDLE.getDirectoryHandle(USER_DATA_FOLDER, { create: true });
    updateFsLogo();
  } catch (e) {
    console.log('FS connection cancelled');
  }
}

function showFolderSentinel() {
  const overlay = document.getElementById('bootFolder');
  overlay.style.display = 'flex';
  document.getElementById('bootFolderTitle').textContent = t('bootFolderTitle');
  document.getElementById('bootFolderSubtitle').textContent = t('bootFolderSubtitle');
  document.getElementById('bootFolderDesc').textContent = t('bootFolderDesc');
  document.getElementById('btnBootConnect').textContent = t('bootFolderBtn');
  document.getElementById('bootFolderHint').textContent = t('bootFolderHint');
  document.getElementById('bootFolderStatus').innerHTML = '';
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
      await FS_DIR_HANDLE.getDirectoryHandle('allegati');
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
        await initDatabases();
        await loadDatabaseFromFS();
        await saveDatabaseToFS();
        document.getElementById('bootFolder').style.display = 'none';
        updateFsLogo();
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
  if (FS_FILES_HANDLE) locations.push({ handle: FS_FILES_HANDLE, label: USER_DATA_FOLDER });
  if (FS_DIR_HANDLE) {
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
  if (!FS_DIR_HANDLE) return;
  try {
    const dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
    const sysFileHandle = await dataDir.getFileHandle(SYS_DB_FILENAME);
    const sysFile = await sysFileHandle.getFile();
    const text = await sysFile.text();
    if (!text.trim()) {
      console.log('System data file empty, will seed defaults.');
      return;
    }
    const sysData = JSON.parse(text);
    console.log('System data parsed — keys:', Object.keys(sysData).join(', '),
      'categories:', (sysData.categories || []).length,
      'subcategories:', (sysData.subcategories || []).length,
      'roles:', (sysData.roles || []).length,
      'comuni:', (sysData.comuni || []).length);
    if (sysData.categories && Array.isArray(sysData.categories)) {
      const firstCat = sysData.categories[0];
      if (firstCat && firstCat.subcategories) {
        console.log('Using importNested (inline subcategories detected)');
        await SysDB.importNested(sysData);
      } else {
        console.log('Using importAll (flat structure)');
        await SysDB.importAll(sysData);
      }
    }
    console.log('System data loaded from filesystem:', DB_PATH + '/' + SYS_DB_FILENAME);
  } catch (e) {
    if (e.name === 'NotFoundError') {
      console.log('No system data file found, will seed defaults.');
    } else {
      console.error('Error loading system data from FS:', e);
    }
  }
}

async function _loadGeoDataFromFS() {
  if (!FS_DIR_HANDLE) return;
  try {
    var dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
    var geoFileHandle = await dataDir.getFileHandle(GEO_DB_FILENAME);
    var geoFile = await geoFileHandle.getFile();
    var text = await geoFile.text();
    if (!text.trim()) {
      console.log('Geo data file empty.');
      return;
    }
    var geoData = JSON.parse(text);
    console.log('Geo data parsed — comuni:', (geoData.comuni || []).length,
      'distretti:', (geoData.distretti || []).length,
      'art11cpp:', (geoData.art11cpp || []).length);
    await GeoDB.importAll(geoData);
    console.log('Geo data loaded from filesystem:', DB_PATH + '/' + GEO_DB_FILENAME);
  } catch (e) {
    if (e.name === 'NotFoundError') {
      console.log('No geo data file found.');
    } else {
      console.error('Error loading geo data from FS:', e);
    }
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
  if (!FS_DIR_HANDLE) return;
  try {
    var dataDir = await FS_DIR_HANDLE.getDirectoryHandle(DB_PATH);
    var normFileHandle = await dataDir.getFileHandle(NORM_DB_FILENAME);
    var normFile = await normFileHandle.getFile();
    var text = await normFile.text();
    if (!text.trim()) {
      console.log('Norm data file empty.');
      return;
    }
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
    console.log('Norm data loaded from filesystem:', DB_PATH + '/' + NORM_DB_FILENAME);
  } catch (e) {
    if (e.name === 'NotFoundError') {
      console.log('No norm data file found, loading bundled.');
      await _loadBundledNormData();
    } else {
      console.error('Error loading norm data from FS:', e);
    }
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
  if (!FS_DIR_HANDLE) return;
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
      return;
    }
    const data = JSON.parse(text);
    if (data.files) data.files = _restoreBlobsFromJSON(data.files);
    await DB.importAll(data);
    console.log('Database loaded from filesystem');
  } catch (e) {
    console.error('Error loading database from FS:', e);
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
  await _saveSystemDataToFS();
  await _saveGeoDataToFS();
  await _saveNormDataToFS();
}

function scheduleSaveToFS() {
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(() => {
    saveDatabaseToFS();
  }, 500);
}

async function saveFileToFS(file, entityType, entityId, lang) {
  if (!FS_FILES_HANDLE) return null;
  try {
    const pathInfo = await buildAllegatiPath(entityType, entityId);
    if (!pathInfo) {
      console.error('Could not build path for', entityType, entityId);
      return null;
    }
    const dir = await _getOrCreateNestedDir(FS_FILES_HANDLE, pathInfo.segments);
    let newFileName;
    if (entityType === 'case') {
      newFileName = file.name;
    } else {
      const prefix = _entityPrefix(entityType);
      const title = pathInfo.entity.title || pathInfo.entity.descriptionIt || '';
      newFileName = _buildAllegatiFileName(prefix, lang, pathInfo.idx, title, file.name);
    }
    const fileHandle = await dir.getFileHandle(newFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return {
      storagePath: pathInfo.segments.join('/'),
      diskFileName: newFileName
    };
  } catch (e) {
    console.error('Error saving file to FS:', e);
    return null;
  }
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
      console.log('File not found at hierarchical path, trying legacy...');
    }
  }

  if (FS_FILES_HANDLE) {
    const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
      ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
      : 'act_' + fileRecord.actId;
    try {
      let legacyRoot = FS_FILES_HANDLE;
      try {
        legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('allegati');
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
    const file = new File([blob], fileRecord.fileName, { type: fileRecord.fileType });
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

async function deleteFileFromFS(fileRecord) {
  if (!FS_FILES_HANDLE) return;

  if (fileRecord.storagePath) {
    try {
      const segments = fileRecord.storagePath.split('/');
      const dir = await _resolveNestedDir(FS_FILES_HANDLE, segments);
      const diskName = fileRecord.diskFileName || fileRecord.fileName;
      await dir.removeEntry(diskName);
      return;
    } catch (e) {
      console.log('File not found at hierarchical path for deletion');
    }
  }

  const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
    ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
    : 'act_' + fileRecord.actId;
  try {
    let legacyRoot = FS_FILES_HANDLE;
    try {
      legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('allegati');
    } catch (e) {}
    const dir = await legacyRoot.getDirectoryHandle(legacyKey);
    await dir.removeEntry(fileRecord.fileName);
  } catch (e) {
    console.log('File already removed from disk or not found');
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

  if (FS_FILES_HANDLE) {
    const legacyKey = (fileRecord.entityType && fileRecord.entityId && fileRecord.lang)
      ? fileRecord.entityType + '_' + fileRecord.entityId + '_' + fileRecord.lang
      : 'act_' + fileRecord.actId;
    try {
      let legacyRoot = FS_FILES_HANDLE;
      try {
        legacyRoot = await FS_DIR_HANDLE.getDirectoryHandle('allegati');
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
