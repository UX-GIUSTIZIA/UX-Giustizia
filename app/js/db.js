'use strict';

let sysDb = new Dexie('UXGiustiziaDate');
sysDb.version(1).stores({
  categories: '++id',
  subcategories: '++id, categoryId',
  roles: '++id, subcategoryId'
});
sysDb.version(2).stores({
  categories: '++id',
  subcategories: '++id, categoryId',
  roles: '++id, subcategoryId',
  comuni: '++id, istat, comune, provincia, provinciaNome, regione, regioneNome, cap, codFisco, distrettoCorteAppello, circondarioTribunale, tribunale, procuraRepubblica, giudiceDiPace, unep, distrettoArt11Cpp'
});
sysDb.version(3).stores({
  categories: '++id',
  subcategories: '++id, categoryId',
  roles: '++id, subcategoryId',
  comuni: null
});

let _sysDbResolve = null;
let sysDbReady = new Promise(r => { _sysDbResolve = r; });

async function _openSysDb() {
  try {
    await sysDb.open();
  } catch (e) {
    console.warn('System DB open failed, resetting:', e.message);
    await sysDb.delete();
    sysDb = new Dexie('UXGiustiziaDate');
    sysDb.version(1).stores({
      categories: '++id',
      subcategories: '++id, categoryId',
      roles: '++id, subcategoryId'
    });
    sysDb.version(2).stores({
      categories: '++id',
      subcategories: '++id, categoryId',
      roles: '++id, subcategoryId',
      comuni: '++id, istat, comune, provincia, provinciaNome, regione, regioneNome, cap, codFisco, distrettoCorteAppello, circondarioTribunale, tribunale, procuraRepubblica, giudiceDiPace, unep, distrettoArt11Cpp'
    });
    sysDb.version(3).stores({
      categories: '++id',
      subcategories: '++id, categoryId',
      roles: '++id, subcategoryId',
      comuni: null
    });
    await sysDb.open();
  }
  console.log('System DB opened (deferred).');
  _sysDbResolve();
}

const _FFOO_OPERATIONAL_ROLES = [
  { labelIt: 'Comandante di Stazione / Reparto', labelEn: 'Station / Unit Commander' },
  { labelIt: 'Comandante di Pattuglia', labelEn: 'Patrol Commander' },
  { labelIt: 'Capo Pattuglia / Capo Equipaggio', labelEn: 'Patrol Leader / Crew Leader' },
  { labelIt: 'Componente Pattuglia / Pattugliante', labelEn: 'Patrol Member / Patrol Officer' },
  { labelIt: 'Operante', labelEn: 'Acting Officer' },
  { labelIt: 'Verbalizzante', labelEn: 'Recording Officer' },
  { labelIt: 'Autista di servizio', labelEn: 'Service Driver' },
  { labelIt: 'Ufficiale di P.G. (art. 57 c.p.p.)', labelEn: 'Judicial Police Officer (art. 57 c.p.p.)' },
  { labelIt: 'Agente di P.G. (art. 57 c.p.p.)', labelEn: 'Judicial Police Agent (art. 57 c.p.p.)' },
  { labelIt: 'Agente di P.S.', labelEn: 'Public Security Agent' },
  { labelIt: 'Addetto alle indagini delegate', labelEn: 'Delegated Investigations Officer' },
  { labelIt: 'Personale di rinforzo / supporto', labelEn: 'Reinforcement / Support Personnel' }
];

const _FFOO_SUBCATEGORIES = ['Polizia di Stato', 'Carabinieri', 'Guardia di Finanza', 'Polizia Penitenziaria', 'Polizia Locale'];

const _SEED_FALLBACK = { categories: [
  { labelIt:'Magistratura', labelEn:'Judiciary', subcategories:[{labelIt:'Magistrati Inquirenti',labelEn:'Investigating Magistrates'},{labelIt:'Magistrati Giudicanti',labelEn:'Judging Magistrates'}] },
  { labelIt:'Amministrazione della Giustizia', labelEn:'Justice Administration', subcategories:[{labelIt:'Cancelleria',labelEn:'Court Registry'},{labelIt:'Dirigenza amministrativa',labelEn:'Administrative Management'},{labelIt:'Personale giudiziario',labelEn:'Court Staff'},{labelIt:'Polizia Penitenziaria',labelEn:'Prison Police'}] },
  { labelIt:"Forze dell'Ordine", labelEn:'Law Enforcement', subcategories:[
    {labelIt:'Polizia di Stato',labelEn:'State Police', roles:_FFOO_OPERATIONAL_ROLES},
    {labelIt:'Carabinieri',labelEn:'Carabinieri', roles:_FFOO_OPERATIONAL_ROLES},
    {labelIt:'Guardia di Finanza',labelEn:'Financial Police', roles:_FFOO_OPERATIONAL_ROLES},
    {labelIt:'Polizia Penitenziaria',labelEn:'Prison Police', roles:_FFOO_OPERATIONAL_ROLES},
    {labelIt:'Polizia Locale',labelEn:'Local Police', roles:_FFOO_OPERATIONAL_ROLES}
  ] },
  { labelIt:'Professionisti', labelEn:'Professionals', subcategories:[{labelIt:'Avvocati',labelEn:'Lawyers'},{labelIt:'CTU',labelEn:'Court-Appointed Experts'},{labelIt:'CTP',labelEn:'Party-Appointed Experts'},{labelIt:'Periti',labelEn:'Expert Witnesses'},{labelIt:'Curatori',labelEn:'Curators'},{labelIt:'Custodi',labelEn:'Custodians'},{labelIt:'Amministratori giudiziari',labelEn:'Judicial Administrators'}] },
  { labelIt:'Privati', labelEn:'Private Parties', subcategories:[{labelIt:'Indagati',labelEn:'Suspects'},{labelIt:'Imputati',labelEn:'Defendants'},{labelIt:'Persone Offese',labelEn:'Victims'},{labelIt:'Testimoni',labelEn:'Witnesses'},{labelIt:'Persone Giuridiche',labelEn:'Legal Entities'},{labelIt:'Enti imputati ex 231',labelEn:'Entities charged under D.Lgs. 231'}] }
]};

const SysDB = {
  async reseed() {
    await sysDbReady;
    await sysDb.categories.clear();
    await sysDb.subcategories.clear();
    await sysDb.roles.clear();
    for (const cat of _SEED_FALLBACK.categories) {
      const catId = await sysDb.categories.add({ labelIt: cat.labelIt, labelEn: cat.labelEn });
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const subId = await sysDb.subcategories.add({ labelIt: sub.labelIt, labelEn: sub.labelEn, categoryId: catId });
          if (sub.roles && sub.roles.length) {
            for (const role of sub.roles) {
              await sysDb.roles.add({ labelIt: role.labelIt, labelEn: role.labelEn, subcategoryId: subId, funzione: '', funzioneEn: '', respPenale: '', respDisciplinare: '', respCivile: '', respPenaleEn: '', respDisciplinareEn: '', respCivileEn: '' });
            }
          }
        }
      }
    }
    console.log('System DB: reseeded from inline fallback data.');
  },
  async ensureFFOORoles() {
    await sysDbReady;
    const cats = await sysDb.categories.toArray();
    const ffoCat = cats.find(c => (c.labelIt || '').toLowerCase().includes("forze dell'ordine") || (c.labelEn || '').toLowerCase().includes('law enforcement'));
    if (!ffoCat) return { added: 0, scanned: 0 };
    const subs = await sysDb.subcategories.where('categoryId').equals(ffoCat.id).toArray();
    let added = 0;
    let scanned = 0;
    for (const sub of subs) {
      if (!_FFOO_SUBCATEGORIES.includes(sub.labelIt)) continue;
      scanned++;
      const existingRoles = await sysDb.roles.where('subcategoryId').equals(sub.id).toArray();
      const existingLabels = new Set(existingRoles.map(r => (r.labelIt || '').trim().toLowerCase()));
      for (const role of _FFOO_OPERATIONAL_ROLES) {
        if (!existingLabels.has(role.labelIt.toLowerCase())) {
          await sysDb.roles.add({ labelIt: role.labelIt, labelEn: role.labelEn, subcategoryId: sub.id, funzione: '', funzioneEn: '', respPenale: '', respDisciplinare: '', respCivile: '', respPenaleEn: '', respDisciplinareEn: '', respCivileEn: '' });
          added++;
        }
      }
    }
    if (added > 0) console.log('SysDB.ensureFFOORoles: added', added, 'roles across', scanned, 'FFOO subcategories.');
    return { added, scanned };
  },
  async getCategories() {
    await sysDbReady;
    const cats = await sysDb.categories.toArray();
    return cats.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  },
  async getSubcategories(categoryId) {
    await sysDbReady;
    if (categoryId !== undefined && categoryId !== null) {
      return await sysDb.subcategories.where('categoryId').equals(categoryId).toArray();
    }
    return await sysDb.subcategories.toArray();
  },
  async getRoles(subcategoryId) {
    await sysDbReady;
    if (subcategoryId !== undefined && subcategoryId !== null) {
      return await sysDb.roles.where('subcategoryId').equals(subcategoryId).toArray();
    }
    return await sysDb.roles.toArray();
  },
  async addCategory(labelIt, labelEn) {
    await sysDbReady;
    return await sysDb.categories.add({ labelIt: labelIt.trim(), labelEn: labelEn.trim() });
  },
  async addSubcategory(labelIt, labelEn, categoryId) {
    await sysDbReady;
    return await sysDb.subcategories.add({ labelIt: labelIt.trim(), labelEn: labelEn.trim(), categoryId });
  },
  async addRole(labelIt, labelEn, subcategoryId) {
    await sysDbReady;
    return await sysDb.roles.add({ labelIt: labelIt.trim(), labelEn: labelEn.trim(), subcategoryId, funzione: '', funzioneEn: '', respPenale: '', respDisciplinare: '', respCivile: '', respPenaleEn: '', respDisciplinareEn: '', respCivileEn: '' });
  },
  async updateCategory(id, data) {
    await sysDbReady;
    await sysDb.categories.update(id, data);
  },
  async updateSubcategory(id, data) {
    await sysDbReady;
    await sysDb.subcategories.update(id, data);
  },
  async updateRole(id, data) {
    await sysDbReady;
    await sysDb.roles.update(id, data);
  },
  async deleteCategory(id) {
    await sysDbReady;
    const subs = await sysDb.subcategories.where('categoryId').equals(id).toArray();
    for (const sub of subs) {
      await sysDb.roles.where('subcategoryId').equals(sub.id).delete();
    }
    await sysDb.subcategories.where('categoryId').equals(id).delete();
    await sysDb.categories.delete(id);
  },
  async deleteSubcategory(id) {
    await sysDbReady;
    await sysDb.roles.where('subcategoryId').equals(id).delete();
    await sysDb.subcategories.delete(id);
  },
  async deleteRole(id) {
    await sysDbReady;
    await sysDb.roles.delete(id);
  },
  async getCategory(id) {
    await sysDbReady;
    return await sysDb.categories.get(id);
  },
  async getSubcategory(id) {
    await sysDbReady;
    return await sysDb.subcategories.get(id);
  },
  async getRole(id) {
    await sysDbReady;
    return await sysDb.roles.get(id);
  },
  getLabel(item, lang) {
    if (!item) return '';
    return lang === 'it' ? (item.labelIt || item.labelEn || '') : (item.labelEn || item.labelIt || '');
  },
  async exportAll() {
    await sysDbReady;
    return {
      categories: await sysDb.categories.toArray(),
      subcategories: await sysDb.subcategories.toArray(),
      roles: await sysDb.roles.toArray()
    };
  },
  async importAll(data) {
    await sysDbReady;
    var tables = [sysDb.categories, sysDb.subcategories, sysDb.roles];
    await sysDb.transaction('rw', tables, async function() {
      await sysDb.categories.clear();
      await sysDb.subcategories.clear();
      await sysDb.roles.clear();
      if (data.categories && data.categories.length) await sysDb.categories.bulkPut(data.categories);
      if (data.subcategories && data.subcategories.length) await sysDb.subcategories.bulkPut(data.subcategories);
      if (data.roles && data.roles.length) await sysDb.roles.bulkPut(data.roles);
    });
    var catCount = await sysDb.categories.count();
    var subCount = await sysDb.subcategories.count();
    var roleCount = await sysDb.roles.count();
    console.log('SysDB importAll done — cats:', catCount, 'subs:', subCount, 'roles:', roleCount);
  },
  async importNested(data) {
    await sysDbReady;
    var tables = [sysDb.categories, sysDb.subcategories, sysDb.roles];
    await sysDb.transaction('rw', tables, async function() {
      await sysDb.categories.clear();
      await sysDb.subcategories.clear();
      await sysDb.roles.clear();
      for (const cat of data.categories) {
        const catId = await sysDb.categories.add({ labelIt: cat.labelIt, labelEn: cat.labelEn });
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            const subId = await sysDb.subcategories.add({ labelIt: sub.labelIt, labelEn: sub.labelEn, categoryId: catId });
            if (sub.roles) {
              for (const role of sub.roles) {
                await sysDb.roles.add({ labelIt: role.labelIt, labelEn: role.labelEn, subcategoryId: subId });
              }
            }
          }
        }
      }
      if (data.roles && data.roles.length) await sysDb.roles.bulkPut(data.roles);
    });
    var catCount = await sysDb.categories.count();
    var subCount = await sysDb.subcategories.count();
    var roleCount = await sysDb.roles.count();
    console.log('SysDB importNested done — cats:', catCount, 'subs:', subCount, 'roles:', roleCount);
  }
};

let geoDb = new Dexie('UXGiustiziaGeo');
geoDb.version(1).stores({
  comuni: '++id, istat, comune, provincia, provinciaNome, regione, regioneNome, cap, codFisco, distrettoCorteAppello, circondarioTribunale, tribunale, procuraRepubblica, giudiceDiPace, unep, distrettoArt11Cpp',
  distretti: '++id, nome',
  art11cpp: '++id, nome'
});

let _geoDbResolve = null;
let geoDbReady = new Promise(r => { _geoDbResolve = r; });

async function _openGeoDb() {
  try {
    await geoDb.open();
  } catch (e) {
    console.warn('Geo DB open failed, resetting:', e.message);
    await geoDb.delete();
    geoDb = new Dexie('UXGiustiziaGeo');
    geoDb.version(1).stores({
      comuni: '++id, istat, comune, provincia, provinciaNome, regione, regioneNome, cap, codFisco, distrettoCorteAppello, circondarioTribunale, tribunale, procuraRepubblica, giudiceDiPace, unep, distrettoArt11Cpp',
      distretti: '++id, nome',
      art11cpp: '++id, nome'
    });
    await geoDb.open();
  }
  console.log('Geo DB opened (deferred).');
  _geoDbResolve();
}

const GeoDB = {
  async getAllComuni() {
    await geoDbReady;
    return await geoDb.comuni.toArray();
  },
  async getComuniByRegione(regione) {
    await geoDbReady;
    return await geoDb.comuni.where('regione').equals(regione).toArray();
  },
  async getComuniByProvincia(provincia) {
    await geoDbReady;
    return await geoDb.comuni.where('provincia').equals(provincia).toArray();
  },
  async getComuneByIstat(istat) {
    await geoDbReady;
    return await geoDb.comuni.where('istat').equals(istat).first();
  },
  async getComuneByNome(nome) {
    await geoDbReady;
    return await geoDb.comuni.where('comune').equals(nome).first();
  },
  async searchComuni(query) {
    await geoDbReady;
    var q = query.toLowerCase();
    return await geoDb.comuni.filter(function(c) { return (c.comune || '').toLowerCase().includes(q); }).toArray();
  },
  async getUniqueProcure() {
    await geoDbReady;
    var all = await geoDb.comuni.toArray();
    var map = {};
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      var proc = c.procuraRepubblica;
      if (proc && !map[proc]) {
        map[proc] = { procura: proc, tribunale: c.circondarioTribunale || '', distrettoCorteAppello: c.distrettoCorteAppello || '' };
      }
    }
    var result = Object.values(map);
    result.sort(function(a, b) { return a.procura.localeCompare(b.procura); });
    return result;
  },
  async getUniqueTribunali() {
    await geoDbReady;
    var all = await geoDb.comuni.toArray();
    var map = {};
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      var trib = c.circondarioTribunale;
      if (trib && !map[trib]) {
        map[trib] = { tribunale: trib, procura: c.procuraRepubblica || '', distrettoCorteAppello: c.distrettoCorteAppello || '' };
      }
    }
    var result = Object.values(map);
    result.sort(function(a, b) { return a.tribunale.localeCompare(b.tribunale); });
    return result;
  },
  async lookupByProcura(procuraName) {
    await geoDbReady;
    var c = await geoDb.comuni.filter(function(r) { return r.procuraRepubblica === procuraName; }).first();
    if (!c) return null;
    return { procura: c.procuraRepubblica, tribunale: c.circondarioTribunale || '', distrettoCorteAppello: c.distrettoCorteAppello || '' };
  },
  async lookupByTribunale(tribunaleName) {
    await geoDbReady;
    var c = await geoDb.comuni.filter(function(r) { return r.circondarioTribunale === tribunaleName; }).first();
    if (!c) return null;
    return { procura: c.procuraRepubblica || '', tribunale: c.circondarioTribunale, distrettoCorteAppello: c.distrettoCorteAppello || '' };
  },
  async getComuniCount() {
    await geoDbReady;
    return await geoDb.comuni.count();
  },
  async getDistretti() {
    await geoDbReady;
    return await geoDb.distretti.toArray();
  },
  async getArt11cpp() {
    await geoDbReady;
    return await geoDb.art11cpp.toArray();
  },
  async exportAll() {
    await geoDbReady;
    return {
      comuni: await geoDb.comuni.toArray(),
      distretti: await geoDb.distretti.toArray(),
      art11cpp: await geoDb.art11cpp.toArray()
    };
  },
  async importAll(data) {
    await geoDbReady;
    var tables = [geoDb.comuni, geoDb.distretti, geoDb.art11cpp];
    await geoDb.transaction('rw', tables, async function() {
      await geoDb.comuni.clear();
      await geoDb.distretti.clear();
      await geoDb.art11cpp.clear();
      if (data.comuni && data.comuni.length) await geoDb.comuni.bulkPut(data.comuni);
      if (data.distretti && data.distretti.length) await geoDb.distretti.bulkPut(data.distretti);
      if (data.art11cpp && data.art11cpp.length) await geoDb.art11cpp.bulkPut(data.art11cpp);
    });
    var comuniCount = await geoDb.comuni.count();
    var distrettiCount = await geoDb.distretti.count();
    var art11cppCount = await geoDb.art11cpp.count();
    console.log('GeoDB importAll done — comuni:', comuniCount, 'distretti:', distrettiCount, 'art11cpp:', art11cppCount);
  }
};

let normDb = new Dexie('UXGiustiziaNorme');
const _NORM_STORES_V1 = {
  nodi_normativi: '++id, id_padre, tipo_nodo, ambito, nome, numero, attivo',
  metadati_penali: 'id_nodo, delitto_contravvenzione, procedibilita, flag_art_407',
  metadati_civili: 'id_nodo, tipo_responsabilita',
  elementi_reato: '++id, id_nodo, categoria',
  regole_indagini: '++id',
  regole_prescrizione: '++id',
  collegamenti_normativi: '++id, id_nodo_origine, id_nodo_destinazione, tipo_collegamento',
  procedimenti_norme: '++id, id_procedimento, id_nodo, ruolo',
  metadati_internazionali: 'id_nodo, tipo_violazione, giurisdizione'
};
const _NORM_STORES_V2 = {
  sistemi_giuridici: '++id, sigla',
  fonti_normative: '++id, id_sistema, tipo, ambito',
  nodi_normativi: '++id, id_fonte, id_padre, tipo_nodo, numero, vigente',
  metadati_penali: 'id_norma, tipo_reato, procedibilita, art_407_cpp',
  metadati_civili: 'id_norma, tipo_responsabilita',
  metadati_garanzia: 'id_norma',
  elementi_reato: '++id, id_norma, categoria',
  regole_indagini: '++id',
  regole_prescrizione: '++id',
  collegamenti_normativi: '++id, id_norma_origine, id_norma_destinazione, tipo_collegamento',
  procedimenti_norme: '++id, id_procedimento, id_norma, ruolo',
  metadati_internazionali: 'id_norma, tipo_crimine, competenza'
};
const _NORM_STORES = {
  sistemi_giuridici: '++id, sigla',
  fonti_normative: '++id, id_sistema, tipo',
  nodi_normativi: '++id, id_fonte, id_padre, tipo_nodo, numero, vigente',
  metadati_penali: 'id_norma, tipo_reato, procedibilita, art_407_cpp',
  metadati_civili: 'id_norma, tipo_responsabilita',
  metadati_garanzia: 'id_norma',
  elementi_reato: '++id, id_norma, categoria',
  regole_indagini: '++id',
  regole_prescrizione: '++id',
  collegamenti_normativi: '++id, id_norma_origine, id_norma_destinazione, tipo_collegamento',
  procedimenti_norme: '++id, id_procedimento, id_norma, ruolo',
  metadati_internazionali: 'id_norma, tipo_crimine, competenza'
};
normDb.version(1).stores(_NORM_STORES_V1);
normDb.version(2).stores(_NORM_STORES_V2).upgrade(tx => {
  return tx.table('nodi_normativi').clear().then(() =>
    tx.table('metadati_penali').clear()).then(() =>
    tx.table('metadati_civili').clear()).then(() =>
    tx.table('elementi_reato').clear()).then(() =>
    tx.table('metadati_internazionali').clear()).then(() =>
    tx.table('collegamenti_normativi').clear()).then(() =>
    tx.table('regole_indagini').clear()).then(() =>
    tx.table('regole_prescrizione').clear()).then(() =>
    tx.table('procedimenti_norme').clear()).then(() => {
    console.log('NormDB v1→v2 upgrade: cleared old data for re-import with new schema.');
  });
});
normDb.version(3).stores(_NORM_STORES).upgrade(tx => {
  const allTables = ['sistemi_giuridici','fonti_normative','nodi_normativi','metadati_penali','metadati_civili','metadati_garanzia','elementi_reato','regole_indagini','regole_prescrizione','collegamenti_normativi','procedimenti_norme','metadati_internazionali'];
  let p = Promise.resolve();
  allTables.forEach(t => { p = p.then(() => tx.table(t).clear()); });
  return p.then(() => console.log('NormDB v2→v3 upgrade: cleared all data for semantic ID re-import.'));
});
let _normDbNeedsReimport = false;

let _normDbResolve = null;
let normDbReady = new Promise(r => { _normDbResolve = r; });

async function _openNormDb() {
  try {
    await normDb.open();
  } catch (e) {
    console.warn('Norm DB open failed, resetting:', e.message);
    await normDb.delete();
    normDb = new Dexie('UXGiustiziaNorme');
    normDb.version(1).stores(_NORM_STORES_V1);
    normDb.version(2).stores(_NORM_STORES_V2);
    normDb.version(3).stores(_NORM_STORES);
    await normDb.open();
  }
  const nodiCount = await normDb.nodi_normativi.count();
  if (nodiCount === 0) {
    _normDbNeedsReimport = true;
    console.log('NormDB empty after open — will re-import from JSON.');
  }
  console.log('Norm DB opened.');
  _normDbResolve();
}

const NormDB = {
  async addNodo(data) {
    await normDbReady;
    const id = await normDb.nodi_normativi.add(data);
    return id;
  },
  async updateNodo(id, data) {
    await normDbReady;
    await normDb.nodi_normativi.update(id, data);
  },
  async deleteNodo(id) {
    await normDbReady;
    const children = await normDb.nodi_normativi.where('id_padre').equals(id).toArray();
    for (const child of children) {
      await this.deleteNodo(child.id);
    }
    await normDb.metadati_penali.where('id_norma').equals(id).delete();
    await normDb.metadati_civili.where('id_norma').equals(id).delete();
    await normDb.metadati_garanzia.where('id_norma').equals(id).delete();
    await normDb.elementi_reato.where('id_norma').equals(id).delete();
    await normDb.metadati_internazionali.where('id_norma').equals(id).delete();
    await normDb.collegamenti_normativi.where('id_norma_origine').equals(id).delete();
    await normDb.collegamenti_normativi.where('id_norma_destinazione').equals(id).delete();
    await normDb.procedimenti_norme.where('id_norma').equals(id).delete();
    await normDb.nodi_normativi.delete(id);
  },
  async getNodo(id) {
    await normDbReady;
    return await normDb.nodi_normativi.get(id);
  },
  async getChildren(parentId) {
    await normDbReady;
    return await normDb.nodi_normativi.where('id_padre').equals(parentId).toArray();
  },
  async getRootNodes() {
    await normDbReady;
    return await normDb.nodi_normativi.filter(n => !n.id_padre).toArray();
  },
  async searchNodi(query) {
    await normDbReady;
    const q = query.toLowerCase();
    return await normDb.nodi_normativi.filter(n =>
      (n.rubrica || '').toLowerCase().includes(q) ||
      (n.numero || '').toLowerCase().includes(q) ||
      (n.testo_it || '').toLowerCase().includes(q) ||
      (n.testo_en || '').toLowerCase().includes(q)
    ).limit(50).toArray();
  },
  async getAllNodi() {
    await normDbReady;
    return await normDb.nodi_normativi.toArray();
  },

  async getMetadatiPenali(id_norma) {
    await normDbReady;
    return await normDb.metadati_penali.get(id_norma);
  },
  async setMetadatiPenali(id_norma, data) {
    await normDbReady;
    data.id_norma = id_norma;
    await normDb.metadati_penali.put(data);
  },
  async deleteMetadatiPenali(id_norma) {
    await normDbReady;
    await normDb.metadati_penali.delete(id_norma);
  },

  async getMetadatiCivili(id_norma) {
    await normDbReady;
    return await normDb.metadati_civili.get(id_norma);
  },
  async setMetadatiCivili(id_norma, data) {
    await normDbReady;
    data.id_norma = id_norma;
    await normDb.metadati_civili.put(data);
  },
  async deleteMetadatiCivili(id_norma) {
    await normDbReady;
    await normDb.metadati_civili.delete(id_norma);
  },

  async getMetadatiGaranzia(id_norma) {
    await normDbReady;
    return await normDb.metadati_garanzia.get(id_norma);
  },
  async setMetadatiGaranzia(id_norma, data) {
    await normDbReady;
    data.id_norma = id_norma;
    await normDb.metadati_garanzia.put(data);
  },
  async deleteMetadatiGaranzia(id_norma) {
    await normDbReady;
    await normDb.metadati_garanzia.delete(id_norma);
  },

  async getMetadatiInternazionali(id_norma) {
    await normDbReady;
    return await normDb.metadati_internazionali.get(id_norma);
  },
  async setMetadatiInternazionali(id_norma, data) {
    await normDbReady;
    data.id_norma = id_norma;
    await normDb.metadati_internazionali.put(data);
  },
  async deleteMetadatiInternazionali(id_norma) {
    await normDbReady;
    await normDb.metadati_internazionali.delete(id_norma);
  },

  async getElementiReato(id_norma) {
    await normDbReady;
    return await normDb.elementi_reato.where('id_norma').equals(id_norma).toArray();
  },
  async addElementoReato(data) {
    await normDbReady;
    return await normDb.elementi_reato.add(data);
  },
  async updateElementoReato(id, data) {
    await normDbReady;
    await normDb.elementi_reato.update(id, data);
  },
  async deleteElementoReato(id) {
    await normDbReady;
    await normDb.elementi_reato.delete(id);
  },

  async getRegoleIndagini() {
    await normDbReady;
    return await normDb.regole_indagini.toArray();
  },
  async addRegolaIndagini(data) {
    await normDbReady;
    return await normDb.regole_indagini.add(data);
  },
  async updateRegolaIndagini(id, data) {
    await normDbReady;
    await normDb.regole_indagini.update(id, data);
  },
  async deleteRegolaIndagini(id) {
    await normDbReady;
    await normDb.regole_indagini.delete(id);
  },

  async getRegolePrescrizione() {
    await normDbReady;
    return await normDb.regole_prescrizione.toArray();
  },
  async addRegolaPrescrizione(data) {
    await normDbReady;
    return await normDb.regole_prescrizione.add(data);
  },
  async updateRegolaPrescrizione(id, data) {
    await normDbReady;
    await normDb.regole_prescrizione.update(id, data);
  },
  async deleteRegolaPrescrizione(id) {
    await normDbReady;
    await normDb.regole_prescrizione.delete(id);
  },

  async getCollegamenti(id_norma) {
    await normDbReady;
    const asOrigin = await normDb.collegamenti_normativi.where('id_norma_origine').equals(id_norma).toArray();
    const asDest = await normDb.collegamenti_normativi.where('id_norma_destinazione').equals(id_norma).toArray();
    return { asOrigin, asDest };
  },
  async addCollegamento(data) {
    await normDbReady;
    return await normDb.collegamenti_normativi.add(data);
  },
  async deleteCollegamento(id) {
    await normDbReady;
    await normDb.collegamenti_normativi.delete(id);
  },

  async getProcedimentiNorme(id_norma) {
    await normDbReady;
    return await normDb.procedimenti_norme.where('id_norma').equals(id_norma).toArray();
  },
  async getNormePerProcedimento(id_procedimento) {
    await normDbReady;
    return await normDb.procedimenti_norme.where('id_procedimento').equals(id_procedimento).toArray();
  },
  async addProcedimentoNorma(data) {
    await normDbReady;
    return await normDb.procedimenti_norme.add(data);
  },
  async deleteProcedimentoNorma(id) {
    await normDbReady;
    await normDb.procedimenti_norme.delete(id);
  },

  calcolaTerminiIndagini(metaPenale) {
    if (!metaPenale) return null;
    if (metaPenale.art_407_cpp) return { iniziale: 12, massimo: 24 };
    return { iniziale: 6, massimo: 18 };
  },

  calcolaPrescrizione(metaPenale) {
    if (!metaPenale) return null;
    const max = metaPenale.pena_max_anni || 0;
    if (max <= 0) return null;
    let anni = Math.max(max, 6);
    if (metaPenale.tipo_reato === 'contravvenzione') {
      anni = Math.max(max, 4);
    }
    return anni;
  },

  async getSistemi() {
    await normDbReady;
    return await normDb.sistemi_giuridici.toArray();
  },
  async getSistema(id) {
    await normDbReady;
    return await normDb.sistemi_giuridici.get(id);
  },
  async getFonti(id_sistema) {
    await normDbReady;
    if (id_sistema !== undefined && id_sistema !== null) {
      return await normDb.fonti_normative.where('id_sistema').equals(id_sistema).toArray();
    }
    return await normDb.fonti_normative.toArray();
  },
  async getFonte(id) {
    await normDbReady;
    return await normDb.fonti_normative.get(id);
  },
  async getNodiByFonte(id_fonte) {
    await normDbReady;
    return await normDb.nodi_normativi.where('id_fonte').equals(id_fonte).toArray();
  },

  async exportAll() {
    await normDbReady;
    return {
      sistemi_giuridici: await normDb.sistemi_giuridici.toArray(),
      fonti_normative: await normDb.fonti_normative.toArray(),
      nodi_normativi: await normDb.nodi_normativi.toArray(),
      metadati_penali: await normDb.metadati_penali.toArray(),
      metadati_civili: await normDb.metadati_civili.toArray(),
      metadati_garanzia: await normDb.metadati_garanzia.toArray(),
      elementi_reato: await normDb.elementi_reato.toArray(),
      regole_indagini: await normDb.regole_indagini.toArray(),
      regole_prescrizione: await normDb.regole_prescrizione.toArray(),
      collegamenti_normativi: await normDb.collegamenti_normativi.toArray(),
      procedimenti_norme: await normDb.procedimenti_norme.toArray(),
      metadati_internazionali: await normDb.metadati_internazionali.toArray()
    };
  },
  async importAll(data) {
    await normDbReady;
    const tables = [normDb.sistemi_giuridici, normDb.fonti_normative, normDb.nodi_normativi, normDb.metadati_penali, normDb.metadati_civili, normDb.metadati_garanzia, normDb.elementi_reato, normDb.regole_indagini, normDb.regole_prescrizione, normDb.collegamenti_normativi, normDb.procedimenti_norme, normDb.metadati_internazionali];
    await normDb.transaction('rw', tables, async () => {
      for (const tbl of tables) await tbl.clear();
      if (data.sistemi_giuridici) await normDb.sistemi_giuridici.bulkPut(data.sistemi_giuridici);
      if (data.fonti_normative) await normDb.fonti_normative.bulkPut(data.fonti_normative);
      if (data.nodi_normativi) await normDb.nodi_normativi.bulkPut(data.nodi_normativi);
      if (data.metadati_penali) await normDb.metadati_penali.bulkPut(data.metadati_penali);
      if (data.metadati_civili) await normDb.metadati_civili.bulkPut(data.metadati_civili);
      if (data.metadati_garanzia) await normDb.metadati_garanzia.bulkPut(data.metadati_garanzia);
      if (data.elementi_reato) await normDb.elementi_reato.bulkPut(data.elementi_reato);
      if (data.regole_indagini) await normDb.regole_indagini.bulkPut(data.regole_indagini);
      if (data.regole_prescrizione) await normDb.regole_prescrizione.bulkPut(data.regole_prescrizione);
      if (data.collegamenti_normativi) await normDb.collegamenti_normativi.bulkPut(data.collegamenti_normativi);
      if (data.procedimenti_norme) await normDb.procedimenti_norme.bulkPut(data.procedimenti_norme);
      if (data.metadati_internazionali) await normDb.metadati_internazionali.bulkPut(data.metadati_internazionali);
    });
    console.log('NormDB importAll done — sistemi:', await normDb.sistemi_giuridici.count(), 'fonti:', await normDb.fonti_normative.count(), 'nodi:', await normDb.nodi_normativi.count());
  },

  needsReimport() {
    return _normDbNeedsReimport;
  },
  clearReimportFlag() {
    _normDbNeedsReimport = false;
  },

  buildNodoPath(nodo, allNodi, lang) {
    const parts = [];
    let current = nodo;
    while (current) {
      if (current.tipo_nodo === 'articolo' && current.numero) {
        parts.unshift('art. ' + current.numero);
      } else {
        const nm = (lang === 'en' && current.rubrica_en) ? current.rubrica_en : current.rubrica;
        parts.unshift(current.numero ? (current.numero + ' ' + nm) : nm);
      }
      current = current.id_padre ? allNodi.find(n => n.id === current.id_padre) : null;
    }
    return parts.join(' > ');
  }
};

let db = new Dexie('UXGiustizia');

db.version(2).stores({
  cases: '++id',
  proceedings: '++id, caseId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang'
});

db.version(3).stores({
  cases: '++id',
  proceedings: '++id, caseId, type, status',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType'
}).upgrade(tx => {
  return tx.table('proceedings').toCollection().modify(proc => {
    if (!proc.rgType) proc.rgType = '';
    if (!proc.rgNumber) proc.rgNumber = '';
    if (!proc.year) proc.year = '';
    if (!proc.stato) proc.stato = '';
    if (!proc.regione) proc.regione = '';
    if (!proc.citta) proc.citta = '';
    if (!proc.ufficioGiudiziario) proc.ufficioGiudiziario = '';
    if (!proc.sezione) proc.sezione = '';
    if (!proc.grado) proc.grado = '';
    if (!proc.status) proc.status = 'in_corso';
    if (!proc.dataIscrizione) proc.dataIscrizione = '';
    if (!proc.dataAggiornamento) proc.dataAggiornamento = '';
    if (!proc.tribunale) proc.tribunale = '';
    if (!proc.presidente) proc.presidente = '';
    if (!proc.procuratore) proc.procuratore = '';
    if (!proc.distrettoAppello) proc.distrettoAppello = '';
    if (!proc.compTerr) proc.compTerr = '';
    if (!proc.compFunz) proc.compFunz = '';
    if (!proc.flagAnomalia) proc.flagAnomalia = false;
    if (!proc.flagOmissione) proc.flagOmissione = false;
    if (!proc.violazioneNormativa) proc.violazioneNormativa = '';
    if (!proc.specificData) proc.specificData = {};
  });
});

db.version(4).stores({
  cases: '++id',
  proceedings: '++id, caseId, type, status',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: 'key'
}).upgrade(tx => {
  return tx.table('subjects').toCollection().modify(sub => {
    if (!sub.roles) {
      sub.roles = [];
      if (sub.category || sub.subcategory) {
        sub.roles.push({
          category: sub.category || '',
          subcategory: sub.subcategory || '',
          role: '',
          startDate: '',
          endDate: ''
        });
      }
    }
  });
});

db.version(5).stores({
  cases: '++id',
  proceedings: '++id, caseId, type, status',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
}).upgrade(tx => {
  const createdItems = [];
  let nextId = 1;
  function findOrCreate(listKey, label, parentId) {
    const existing = createdItems.find(c => c.listKey === listKey && c.labelIt === label && (c.parentId || null) === (parentId || null));
    if (existing) return existing.id;
    const item = { id: nextId++, listKey, labelIt: label, labelEn: label, parentId: parentId || null };
    createdItems.push(item);
    return item.id;
  }
  return tx.table('subjects').toCollection().modify(sub => {
    if (!sub.roles) sub.roles = [];
    for (const r of sub.roles) {
      if (r.category && typeof r.category === 'string' && !r.categoryId) {
        const catId = findOrCreate('categories', r.category, null);
        r.categoryId = catId;
        if (r.subcategory && typeof r.subcategory === 'string' && !r.subcategoryId) {
          const subcatId = findOrCreate('subcategories', r.subcategory, catId);
          r.subcategoryId = subcatId;
          if (r.role && typeof r.role === 'string' && !r.roleId) {
            r.roleId = findOrCreate('roles', r.role, subcatId);
          }
        }
      }
      if (!r.categoryId) r.categoryId = null;
      if (!r.subcategoryId) r.subcategoryId = null;
      if (!r.roleId) r.roleId = null;
      delete r.category;
      delete r.subcategory;
      delete r.role;
    }
  }).then(() => {
    if (createdItems.length > 0) {
      return tx.table('customLists').bulkAdd(createdItems);
    }
  });
});

db.version(6).stores({
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
}).upgrade(tx => {
  return tx.table('proceedings').toCollection().modify(proc => {
    if (!proc.fase) proc.fase = '';
    if (!proc.modelloProcura) proc.modelloProcura = '';
    if (!proc.parentProceedingId) proc.parentProceedingId = null;
  });
});

db.version(7).stores({
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  proofs: '++id, actId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
});

db.version(8).stores({
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  facts: '++id, actId',
  proofs: '++id, factId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
}).upgrade(tx => {
  return tx.table('proofs').toCollection().modify(proof => {
    if (proof.actId && !proof.factId) {
      proof.factId = null;
    }
  });
});

const V9_STORES = {
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  facts: '++id, caseId',
  circumstances: '++id, factId',
  factActRelations: '++id, factId, actId',
  proofs: '++id, factId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
};

const V10_STORES = {
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  facts: '++id, dossierId',
  circumstances: '++id, factId',
  factActRelations: '++id, factId, actId',
  proofs: '++id, factId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
};

const V11_STORES = {
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  facts: '++id, dossierId',
  circumstances: '++id, factId',
  factActRelations: '++id, factId, actId',
  proofs: '++id, factId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang, caseId, proceedingId, dossierId',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
};

db.version(9).stores(V9_STORES).upgrade(async tx => {
  const acts = await tx.table('acts').toArray();
  const dossiers = await tx.table('dossiers').toArray();
  const proceedings = await tx.table('proceedings').toArray();

  const dossierMap = {};
  for (const d of dossiers) dossierMap[d.id] = d;
  const procMap = {};
  for (const p of proceedings) procMap[p.id] = p;

  function actToCaseId(actId) {
    const act = acts.find(a => a.id === actId);
    if (!act) return null;
    const dossier = dossierMap[act.dossierId];
    if (!dossier) return null;
    const proc = procMap[dossier.proceedingId];
    if (!proc) return null;
    return proc.caseId || null;
  }

  await tx.table('facts').toCollection().modify(fact => {
    if (fact.actId && !fact.caseId) {
      fact.caseId = actToCaseId(fact.actId);
    }
    if (!fact.caseId) fact.caseId = null;
  });

  const allFacts = await tx.table('facts').toArray();
  const relationsToAdd = [];
  for (const fact of allFacts) {
    if (fact.actId) {
      relationsToAdd.push({
        factId: fact.id,
        actId: fact.actId,
        posizioneAtto: fact.actPosition || ''
      });
    }
  }
  if (relationsToAdd.length > 0) {
    await tx.table('factActRelations').bulkAdd(relationsToAdd);
  }
});

db.version(10).stores(V10_STORES).upgrade(async tx => {
  const dossiers = await tx.table('dossiers').toArray();
  const proceedings = await tx.table('proceedings').toArray();
  const acts = await tx.table('acts').toArray();

  const dossierMap = {};
  for (const d of dossiers) dossierMap[d.id] = d;
  const procMap = {};
  for (const p of proceedings) procMap[p.id] = p;
  const actMap = {};
  for (const a of acts) actMap[a.id] = a;

  function caseIdToDossierId(caseId) {
    const proc = proceedings.find(p => p.caseId === caseId);
    if (!proc) return null;
    const dossier = dossiers.find(d => d.proceedingId === proc.id);
    return dossier ? dossier.id : null;
  }

  function factToDossierId(fact) {
    const rels = [];
    return null;
  }

  await tx.table('facts').toCollection().modify(fact => {
    if (fact.dossierId) return;
    let dossierId = null;
    if (fact.caseId) {
      dossierId = caseIdToDossierId(fact.caseId);
    }
    fact.dossierId = dossierId;
  });
});

const V12_STORES = {
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  facts: '++id, dossierId',
  circumstances: '++id, factId',
  factActRelations: '++id, factId, actId',
  proofs: '++id, factId',
  violations: '++id, factId, actId, normaId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang, caseId, proceedingId, dossierId',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
};

const V13_STORES = {
  cases: '++id',
  proceedings: '++id, caseId, type, status, parentProceedingId',
  dossiers: '++id, proceedingId',
  acts: '++id, dossierId',
  facts: '++id, dossierId',
  circumstances: '++id, factId',
  factActRelations: '++id, factId, actId',
  factProofRelations: '++id, factId, proofId',
  proofs: '++id',
  violations: '++id, factId, actId, normaId',
  subjects: '++id',
  entitySubjects: '++id, entityType, entityId, subjectId',
  files: '++id, actId, entityType, entityId, lang, caseId, proceedingId, dossierId',
  proceedingRoles: '++id, proceedingId, subjectId, roleCode',
  proceedingActions: '++id, proceedingId, subjectId',
  proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
  customLists: '++id, listKey, parentId'
};

db.version(11).stores(V11_STORES).upgrade(async tx => {
  const proceedings = await tx.table('proceedings').toArray();
  const dossiers = await tx.table('dossiers').toArray();
  const acts = await tx.table('acts').toArray();
  const facts = await tx.table('facts').toArray();
  const proofs = await tx.table('proofs').toArray();

  const procMap = {};
  for (const p of proceedings) procMap[p.id] = p;
  const dossierMap = {};
  for (const d of dossiers) dossierMap[d.id] = d;
  const actMap = {};
  for (const a of acts) actMap[a.id] = a;
  const factMap = {};
  for (const f of facts) factMap[f.id] = f;

  function resolveHierarchy(entityType, entityId) {
    let caseId = null, proceedingId = null, dossierId = null;
    if (entityType === 'case') {
      caseId = entityId;
    } else if (entityType === 'proceeding' || entityType === 'proceeding_origin') {
      proceedingId = entityId;
      const p = procMap[entityId];
      if (p) caseId = p.caseId;
    } else if (entityType === 'dossier') {
      dossierId = entityId;
      const d = dossierMap[entityId];
      if (d) { proceedingId = d.proceedingId; const p = procMap[d.proceedingId]; if (p) caseId = p.caseId; }
    } else if (entityType === 'act') {
      const a = actMap[entityId];
      if (a) { dossierId = a.dossierId; const d = dossierMap[a.dossierId]; if (d) { proceedingId = d.proceedingId; const p = procMap[d.proceedingId]; if (p) caseId = p.caseId; } }
    } else if (entityType === 'fact') {
      const f = factMap[entityId];
      if (f) { dossierId = f.dossierId; const d = dossierMap[f.dossierId]; if (d) { proceedingId = d.proceedingId; const p = procMap[d.proceedingId]; if (p) caseId = p.caseId; } }
    } else if (entityType === 'proof') {
      const pr = proofs.find(x => x.id === entityId);
      if (pr && pr.factId) { const f = factMap[pr.factId]; if (f) { dossierId = f.dossierId; const d = dossierMap[f.dossierId]; if (d) { proceedingId = d.proceedingId; const p = procMap[d.proceedingId]; if (p) caseId = p.caseId; } } }
    }
    return { caseId, proceedingId, dossierId };
  }

  await tx.table('files').toCollection().modify(fileRec => {
    if (fileRec.caseId && fileRec.proceedingId) return;
    const h = resolveHierarchy(fileRec.entityType, fileRec.entityId);
    fileRec.caseId = h.caseId;
    fileRec.proceedingId = h.proceedingId;
    fileRec.dossierId = h.dossierId;
  });
});

db.version(12).stores(V12_STORES);

db.version(13).stores(V13_STORES).upgrade(async tx => {
  const proofs = await tx.table('proofs').toArray();
  const fprTable = tx.table('factProofRelations');
  for (const pr of proofs) {
    if (pr.factId) {
      await fprTable.add({
        factId: pr.factId,
        proofId: pr.id,
        relationType: pr.relationType || 'confirms'
      });
    }
    await tx.table('proofs').update(pr.id, { factId: undefined, relationType: undefined });
  }
});

const V14_STORES = Object.assign({}, V13_STORES, {
  circumstanceProofRelations: '++id, circumstanceId, proofId'
});
db.version(14).stores(V14_STORES);

const V15_STORES = Object.assign({}, V14_STORES, {
  actProofRelations: '++id, actId, proofId'
});
db.version(15).stores(V15_STORES);

const V16_STORES = Object.assign({}, V15_STORES, {
  circumstanceActRelations: '++id, circumstanceId, actId'
});
db.version(16).stores(V16_STORES);

const V17_STORES = Object.assign({}, V16_STORES, {
  userProfile: '++id'
});
db.version(17).stores(V17_STORES);

const V18_STORES = Object.assign({}, V17_STORES, {
  circumstances: '++id, factId, normaId'
});
db.version(18).stores(V18_STORES).upgrade(async tx => {
  await tx.table('circumstances').toCollection().modify(c => {
    if (c.normaId === undefined) c.normaId = null;
    if (c.normaCode === undefined) c.normaCode = null;
    if (c.normaTitle === undefined) c.normaTitle = null;
  });
});

const V19_STORES = Object.assign({}, V18_STORES, {
  circumstanceNormaRelations: '++id, circumstanceId, normaId'
});
const V20_STORES = Object.assign({}, V19_STORES, {
  entitySubjects: '++id, entityType, entityId, subjectId, roleId'
});
db.version(19).stores(V19_STORES).upgrade(async tx => {
  const circs = await tx.table('circumstances').toArray();
  const relTable = tx.table('circumstanceNormaRelations');
  for (const c of circs) {
    if (c.normaId) {
      await relTable.add({
        circumstanceId: c.id,
        normaId: c.normaId,
        normaCode: c.normaCode || '',
        normaTitle: c.normaTitle || ''
      });
    }
  }
});
db.version(20).stores(V20_STORES);

const V21_STORES = Object.assign({}, V20_STORES, {
  factDossierRelations: '++id, factId, dossierId',
  circumstanceDossierRelations: '++id, circumstanceId, dossierId'
});
db.version(21).stores(V21_STORES);

const V22_STORES = Object.assign({}, V21_STORES, {
  files: '++id, actId, entityType, entityId, lang, caseId, proceedingId, dossierId, sourceFileId'
});
db.version(22).stores(V22_STORES);

const V23_STORES = Object.assign({}, V22_STORES);
db.version(23).stores(V23_STORES);

const V24_STORES = Object.assign({}, V23_STORES);
db.version(24).stores(V24_STORES).upgrade(async tx => {
  const now = Date.now();
  await tx.table('files').toCollection().modify(f => {
    if (!f.createdAt) f.createdAt = now;
  });
});

const V25_STORES = Object.assign({}, V24_STORES, {
  factCausalRelations: '++id, causeFactId, effectFactId'
});
db.version(25).stores(V25_STORES);

const V26_STORES = Object.assign({}, V25_STORES, {
  proofNormaRelations: '++id, proofId, normaId',
  actActRelations: '++id, actIdA, actIdB'
});
db.version(26).stores(V26_STORES);

const V27_STORES = V26_STORES;
db.version(27).stores(V27_STORES).upgrade(async tx => {
  const rels = await tx.table('factActRelations').toArray();
  for (const r of rels) {
    if (r.posizioneAtto === 'nega') await tx.table('factActRelations').update(r.id, { posizioneAtto: 'contraddice' });
    else if (r.posizioneAtto === 'omette') await tx.table('factActRelations').update(r.id, { posizioneAtto: 'smentisce' });
  }
});
const V28_STORES = V27_STORES;
db.version(28).stores(V28_STORES).upgrade(async tx => {
  const rels = await tx.table('factActRelations').toArray();
  for (const r of rels) {
    if (r.posizioneAtto === 'smentisce') await tx.table('factActRelations').update(r.id, { posizioneAtto: 'contraddice' });
  }
});

const V29_STORES = V28_STORES;
db.version(29).stores(V29_STORES);

const V30_STORES = Object.assign({}, V29_STORES, {
  proceedingRelations: '++id, proceedingIdA, proceedingIdB, relationType'
});
db.version(30).stores(V30_STORES);
const V31_STORES = Object.assign({}, V30_STORES, { proceedingGroups: '++id, caseId' });
db.version(31).stores(V31_STORES);
const V32_STORES = Object.assign({}, V31_STORES, {
  archiviofatti: '++id',
  archiviocircostanze: '++id, archivioFattoId',
  archivioprovefatti: '++id, archivioFattoId',
  archivioCircProofRels: '++id, archivioCircId, archivioProofId'
});
db.version(32).stores(V32_STORES);
const V33_STORES = Object.assign({}, V32_STORES, {
  archivioatti: '++id, archivioFattoId'
});
db.version(33).stores(V33_STORES);
const V34_STORES = Object.assign({}, V33_STORES, {
  proceedings: '++id, caseId, type, status, parentProceedingId, proceedingGroupId'
});
db.version(34).stores(V34_STORES).upgrade(async tx => {
  const groups = await tx.table('proceedingGroups').toArray();
  const firstGroupByTypeCase = {};
  for (const g of groups) {
    const key = g.caseId + '_' + g.type;
    if (!firstGroupByTypeCase[key]) firstGroupByTypeCase[key] = g.id;
  }
  await tx.table('proceedings').toCollection().modify(p => {
    if (!p.proceedingGroupId) {
      const key = p.caseId + '_' + p.type;
      p.proceedingGroupId = firstGroupByTypeCase[key] || null;
    }
  });
});
const V35_STORES = Object.assign({}, V34_STORES);
db.version(35).stores(V35_STORES).upgrade(async tx => {
  await tx.table('files').toCollection().modify(f => {
    if (f.storagePath) {
      const segs = f.storagePath.split('/');
      f.storagePath = segs.map(seg => /^P(\d{3})$/.test(seg) ? 'PP' + seg.slice(1) : seg).join('/');
    }
  });
});
const V36_STORES = Object.assign({}, V35_STORES, {
  archivioCircActRels: '++id, archivioCircId, archivioActId',
  archivioActProofRels: '++id, archivioActId, archivioProofId',
  archivioActActRels: '++id, archivioActIdA, archivioActIdB'
});
db.version(36).stores(V36_STORES);
const V37_STORES_GLOBAL = V36_STORES;
db.version(37).stores(V37_STORES_GLOBAL).upgrade(async tx => {
  try { await tx.table('proofNormaRelations').clear(); } catch (e) { /* table may be empty */ }
});
const V38_STORES_GLOBAL = V37_STORES_GLOBAL;
db.version(38).stores(V38_STORES_GLOBAL);

const V39_STORES_GLOBAL = Object.assign({}, V38_STORES_GLOBAL, {
  acts: '++id',
  facts: '++id'
});
db.version(39).stores(V39_STORES_GLOBAL).upgrade(async tx => {
  const facts = await tx.table('facts').toArray();
  for (const f of facts) {
    if (f.dossierId) {
      const existing = await tx.table('factDossierRelations').where('factId').equals(f.id).toArray();
      const alreadyLinked = existing.some(r => r.dossierId === f.dossierId);
      if (!alreadyLinked) {
        await tx.table('factDossierRelations').add({ factId: f.id, dossierId: f.dossierId });
      }
    }
  }
  const acts = await tx.table('acts').toArray();
  for (const a of acts) {
    if (a.dossierId) {
      const existingActRels = await tx.table('factActRelations').where('actId').equals(a.id).toArray();
      if (existingActRels.length === 0) {
        const factRels = await tx.table('factDossierRelations').where('dossierId').equals(a.dossierId).toArray();
        if (factRels.length > 0) {
          await tx.table('factActRelations').add({ factId: factRels[0].factId, actId: a.id, posizioneAtto: 'afferma' });
        }
      }
    }
  }
});

const V40_STORES_GLOBAL = V39_STORES_GLOBAL;
db.version(40).stores(V40_STORES_GLOBAL).upgrade(async tx => {
  await tx.table('facts').toCollection().modify(f => { delete f.dossierId; });
  await tx.table('acts').toCollection().modify(a => { delete a.dossierId; });
});

const V41_STORES_GLOBAL = Object.assign({}, V40_STORES_GLOBAL, {
  pecMessages: '++id, year, mittente, destinatario, dataInvio, oggetto'
});
db.version(41).stores(V41_STORES_GLOBAL);

const V42_STORES_GLOBAL = Object.assign({}, V41_STORES_GLOBAL, {
  proceedingGroups: '++id, caseId, sortOrder'
});
db.version(42).stores(V42_STORES_GLOBAL).upgrade(async tx => {
  const groups = await tx.table('proceedingGroups').toArray();
  groups.sort((a, b) => a.id - b.id);
  const counters = {};
  for (const g of groups) {
    const key = g.caseId + '_' + (g.type || 'altro');
    counters[key] = (counters[key] || 0) + 1;
    await tx.table('proceedingGroups').update(g.id, { sortOrder: counters[key] });
  }
});

let _dbResolve = null;
let dbReady = new Promise(r => { _dbResolve = r; });

async function _openMainDb() {
  try {
    await db.open();
  } catch (e) {
    console.warn('DB open failed, resetting database:', e.message);
    await db.delete();
    db = new Dexie('UXGiustizia');
    db.version(2).stores({
      cases: '++id', proceedings: '++id, caseId', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang'
    });
    db.version(3).stores({
      cases: '++id', proceedings: '++id, caseId, type, status', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang',
      proceedingRoles: '++id, proceedingId, subjectId, roleCode',
      proceedingActions: '++id, proceedingId, subjectId',
      proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType'
    });
    db.version(4).stores({
      cases: '++id', proceedings: '++id, caseId, type, status', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang',
      proceedingRoles: '++id, proceedingId, subjectId, roleCode',
      proceedingActions: '++id, proceedingId, subjectId',
      proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
      customLists: 'key'
    });
    db.version(5).stores({
      cases: '++id', proceedings: '++id, caseId, type, status', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang',
      proceedingRoles: '++id, proceedingId, subjectId, roleCode',
      proceedingActions: '++id, proceedingId, subjectId',
      proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
      customLists: '++id, listKey, parentId'
    });
    db.version(6).stores({
      cases: '++id', proceedings: '++id, caseId, type, status, parentProceedingId', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang',
      proceedingRoles: '++id, proceedingId, subjectId, roleCode',
      proceedingActions: '++id, proceedingId, subjectId',
      proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
      customLists: '++id, listKey, parentId'
    });
    db.version(7).stores({
      cases: '++id', proceedings: '++id, caseId, type, status, parentProceedingId', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', proofs: '++id, actId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang',
      proceedingRoles: '++id, proceedingId, subjectId, roleCode',
      proceedingActions: '++id, proceedingId, subjectId',
      proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
      customLists: '++id, listKey, parentId'
    });
    db.version(8).stores({
      cases: '++id', proceedings: '++id, caseId, type, status, parentProceedingId', dossiers: '++id, proceedingId',
      acts: '++id, dossierId', facts: '++id, actId', proofs: '++id, factId', subjects: '++id',
      entitySubjects: '++id, entityType, entityId, subjectId',
      files: '++id, actId, entityType, entityId, lang',
      proceedingRoles: '++id, proceedingId, subjectId, roleCode',
      proceedingActions: '++id, proceedingId, subjectId',
      proceedingLinks: '++id, proceedingId, relatedProceedingId, linkType',
      customLists: '++id, listKey, parentId'
    });
    db.version(9).stores(V9_STORES);
    db.version(10).stores(V10_STORES);
    db.version(11).stores(V11_STORES);
    db.version(12).stores(V12_STORES);
    db.version(13).stores(V13_STORES);
    db.version(14).stores(V14_STORES);
    db.version(15).stores(V15_STORES);
    db.version(16).stores(V16_STORES);
    db.version(17).stores(V17_STORES);
    db.version(18).stores(V18_STORES);
    db.version(19).stores(V19_STORES);
    db.version(20).stores(V20_STORES);
    db.version(21).stores(V21_STORES);
    db.version(22).stores(V22_STORES);
    db.version(23).stores(V23_STORES);
    db.version(24).stores(V24_STORES).upgrade(async tx => {
      const now = Date.now();
      await tx.table('files').toCollection().modify(f => {
        if (!f.createdAt) f.createdAt = now;
      });
    });
    db.version(25).stores(V25_STORES);
    db.version(26).stores(V26_STORES);
    db.version(27).stores(V27_STORES);
    db.version(28).stores(V28_STORES);
    db.version(29).stores(V29_STORES);
    db.version(30).stores(V30_STORES);
    db.version(31).stores(V31_STORES);
    db.version(32).stores(V32_STORES);
    db.version(33).stores(V33_STORES);
    db.version(34).stores(V34_STORES).upgrade(async tx => {
      const groups = await tx.table('proceedingGroups').toArray();
      const firstGroupByTypeCase = {};
      for (const g of groups) {
        const key = g.caseId + '_' + g.type;
        if (!firstGroupByTypeCase[key]) firstGroupByTypeCase[key] = g.id;
      }
      await tx.table('proceedings').toCollection().modify(p => {
        if (!p.proceedingGroupId) {
          const key = p.caseId + '_' + p.type;
          p.proceedingGroupId = firstGroupByTypeCase[key] || null;
        }
      });
    });
    db.version(35).stores(V35_STORES).upgrade(async tx => {
      await tx.table('files').toCollection().modify(f => {
        if (f.storagePath) {
          const segs = f.storagePath.split('/');
          f.storagePath = segs.map(seg => /^P(\d{3})$/.test(seg) ? 'PP' + seg.slice(1) : seg).join('/');
        }
      });
    });
    db.version(36).stores(V36_STORES);
    const V37_STORES = V36_STORES;
    db.version(37).stores(V37_STORES).upgrade(async tx => {
      try { await tx.table('proofNormaRelations').clear(); } catch (e) { /* table may be empty */ }
    });
    const V38_STORES = V37_STORES;
    db.version(38).stores(V38_STORES);
    db.version(39).stores(V39_STORES_GLOBAL).upgrade(async tx => {
      const facts = await tx.table('facts').toArray();
      for (const f of facts) {
        if (f.dossierId) {
          const existing = await tx.table('factDossierRelations').where('factId').equals(f.id).toArray();
          const alreadyLinked = existing.some(r => r.dossierId === f.dossierId);
          if (!alreadyLinked) {
            await tx.table('factDossierRelations').add({ factId: f.id, dossierId: f.dossierId });
          }
        }
      }
      const acts = await tx.table('acts').toArray();
      for (const a of acts) {
        if (a.dossierId) {
          const existingActRels = await tx.table('factActRelations').where('actId').equals(a.id).toArray();
          if (existingActRels.length === 0) {
            const factRels = await tx.table('factDossierRelations').where('dossierId').equals(a.dossierId).toArray();
            if (factRels.length > 0) {
              await tx.table('factActRelations').add({ factId: factRels[0].factId, actId: a.id, posizioneAtto: 'afferma' });
            }
          }
        }
      }
    });
    db.version(40).stores(V40_STORES_GLOBAL).upgrade(async tx => {
      await tx.table('facts').toCollection().modify(f => { delete f.dossierId; });
      await tx.table('acts').toCollection().modify(a => { delete a.dossierId; });
    });
    db.version(41).stores(V41_STORES_GLOBAL);
    db.version(42).stores(V42_STORES_GLOBAL).upgrade(async tx => {
      const groups = await tx.table('proceedingGroups').toArray();
      groups.sort((a, b) => a.id - b.id);
      const counters = {};
      for (const g of groups) {
        const key = g.caseId + '_' + (g.type || 'altro');
        counters[key] = (counters[key] || 0) + 1;
        await tx.table('proceedingGroups').update(g.id, { sortOrder: counters[key] });
      }
    });
    await db.open();
  }
  console.log('Main DB opened (deferred).');
  _dbResolve();
}

async function initDatabases() {
  await _openSysDb();
  await _openGeoDb();
  await _openNormDb();
  await _openMainDb();
  DB.cleanOrphanProceedingRelations().catch(e => console.warn('cleanOrphanProceedingRelations error:', e));
  console.log('All databases initialized.');
}

const ROLE_CATALOGS = {
  penale: ['pm', 'gip', 'giudice_dibattimento', 'indagato', 'imputato', 'parte_offesa', 'difensore', 'ctu', 'ausiliario_pg', 'testimone', 'testimone_oculare'],
  civile: ['attore', 'convenuto', 'giudice', 'ctu', 'curatore', 'difensore', 'consulente_parte', 'testimone', 'testimone_oculare'],
  amministrativo: ['ricorrente', 'resistente', 'giudice', 'commissario', 'difensore', 'testimone', 'testimone_oculare'],
  esecuzione: ['giudice_esecuzione', 'creditore_procedente', 'debitore', 'custode', 'delegato_vendita', 'perito', 'testimone', 'testimone_oculare'],
  altro: ['parte', 'giudice', 'difensore', 'consulente', 'perito', 'testimone', 'testimone_oculare']
};

const ACTION_TYPES = [
  'richiesta', 'ordinanza', 'archiviazione', 'omissione', 'deposito',
  'perizia', 'udienza', 'sentenza', 'decreto', 'notifica', 'impugnazione', 'altro'
];

const LINK_TYPES = ['collegato', 'presupposto', 'conseguente', 'derivato'];

const CIRCUMSTANCE_TYPES = ['temporale', 'modale', 'soggettiva', 'tecnica'];

const FACT_POSITIONS = ['afferma', 'contraddice', 'omette', 'travisa', 'non_pronuncia'];

var _suppressAutoSave = false;

function _autoSave() {
  if (_suppressAutoSave) return;
  if (typeof scheduleSaveToFS === 'function') scheduleSaveToFS();
}

const DB = {
  async getCases() {
    return await db.cases.toArray();
  },
  async getCase(id) {
    return await db.cases.get(id);
  },
  async createCase(data) {
    const id = await db.cases.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateCase(id, data) {
    await db.cases.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteCase(id) {
    const procs = await db.proceedings.where('caseId').equals(id).toArray();
    for (const p of procs) await DB.deleteProceeding(p.id);
    await db.entitySubjects.where({ entityType: 'case', entityId: id }).delete();
    await DB.deleteEntityFiles('case', id);
    await db.cases.delete(id);
    _autoSave();
  },

  async getAllProceedings() {
    return await db.proceedings.toArray();
  },
  async getProceedings(caseId) {
    return await db.proceedings.where('caseId').equals(caseId).toArray();
  },
  async getProceeding(id) {
    return await db.proceedings.get(id);
  },
  async createProceeding(data) {
    const id = await db.proceedings.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateProceeding(id, data) {
    await db.proceedings.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteProceeding(id) {
    const dossiers = await db.dossiers.where('proceedingId').equals(id).toArray();
    for (const d of dossiers) await DB.deleteDossier(d.id);
    await db.entitySubjects.where({ entityType: 'proceeding', entityId: id }).delete();
    await DB.deleteEntityFiles('proceeding', id);
    await DB.deleteEntityFiles('proceeding_origin', id);
    await db.proceedingRoles.where('proceedingId').equals(id).delete();
    await db.proceedingActions.where('proceedingId').equals(id).delete();
    await db.proceedingLinks.where('proceedingId').equals(id).delete();
    await db.proceedingRelations.where('proceedingIdA').equals(id).delete();
    await db.proceedingRelations.where('proceedingIdB').equals(id).delete();
    await db.proceedings.delete(id);
    _autoSave();
  },

  async getDossiers(proceedingId) {
    return await db.dossiers.where('proceedingId').equals(proceedingId).toArray();
  },
  async getDossier(id) {
    return await db.dossiers.get(id);
  },
  async createDossier(data) {
    const id = await db.dossiers.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateDossier(id, data) {
    await db.dossiers.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteDossier(id) {
    const factRels = await db.factDossierRelations.where('dossierId').equals(id).toArray();
    for (const fr of factRels) {
      const otherRels = await db.factDossierRelations.where('factId').equals(fr.factId).filter(r => r.dossierId !== id).count();
      if (otherRels === 0) {
        const actRels = await db.factActRelations.where('factId').equals(fr.factId).toArray();
        for (const ar of actRels) {
          const otherFactRels = await db.factActRelations.where('actId').equals(ar.actId).filter(r => r.factId !== fr.factId).count();
          if (otherFactRels === 0) await DB.deleteAct(ar.actId);
        }
        await DB.deleteFact(fr.factId);
      }
    }
    await db.factDossierRelations.where('dossierId').equals(id).delete();
    await db.circumstanceDossierRelations.where('dossierId').equals(id).delete();
    await db.entitySubjects.where({ entityType: 'dossier', entityId: id }).delete();
    await DB.deleteEntityFiles('dossier', id);
    await db.dossiers.delete(id);
    _autoSave();
  },

  async getActs(dossierId) {
    const factRels = await db.factDossierRelations.where('dossierId').equals(dossierId).toArray();
    if (factRels.length === 0) return [];
    const actIds = new Set();
    for (const fr of factRels) {
      const actRels = await db.factActRelations.where('factId').equals(fr.factId).toArray();
      for (const ar of actRels) actIds.add(ar.actId);
    }
    if (actIds.size === 0) return [];
    const acts = await db.acts.where('id').anyOf([...actIds]).toArray();
    return acts.map(a => ({ ...a, dossierId }));
  },
  async getActsByFact(factId) {
    const rels = await db.factActRelations.where('factId').equals(factId).toArray();
    const acts = [];
    for (const rel of rels) {
      const a = await db.acts.get(rel.actId);
      if (a) acts.push({ ...a, factId: rel.factId, posizioneAtto: rel.posizioneAtto, _relationId: rel.id });
    }
    return acts;
  },
  async getAllActs() {
    return await db.acts.toArray();
  },
  async getAct(id) {
    const a = await db.acts.get(id);
    if (!a) return a;
    // dossierId / factId persistiti sul record (origine dell'atto) hanno
    // priorita'; le relazioni factActRelations/factDossierRelations sono
    // un fallback (quando l'atto non e' stato creato con dossierId/factId).
    const actRel = await db.factActRelations.where('actId').equals(id).first();
    let _factId = a.factId || (actRel ? actRel.factId : null);
    let _dossierId = a.dossierId || null;
    if (!_dossierId && _factId) {
      const factRel = await db.factDossierRelations.where('factId').equals(_factId).first();
      if (factRel) _dossierId = factRel.dossierId;
    }
    return { ...a, factId: _factId || null, dossierId: _dossierId || null };
  },
  async createAct(data) {
    // Politica "card sempre orfana rispetto al fatto":
    // - factId puo' essere passato dal caller per coerenza con il contesto
    //   d'origine (file hierarchy, refresh UI), MA la relazione fatto-atto
    //   NON viene piu' creata automaticamente. L'utente deve collegare l'atto
    //   al fatto via drag-and-drop esplicito (handler app.js ~11711).
    // - _skipFactRelation: ridondante in pratica perche' l'auto-link e' stato
    //   rimosso, ma il flag e' accettato per simmetria con DB.createProof e
    //   per documentare l'intenzione del caller. Se in futuro si volesse
    //   ripristinare un auto-link opzionale, il flag e' gia' pronto.
    // posizioneAtto e' accettato ma non piu' applicato in auto-link.
    const { factId, dossierId, posizioneAtto, _skipFactRelation, _isFromDossier, ...actData } = data;
    if (actData.sortOrder == null) {
      if (factId != null) {
        const existing = await db.factActRelations.where('factId').equals(factId).toArray();
        const existingActIds = existing.map(r => r.actId);
        if (existingActIds.length > 0) {
          const existingActs = await db.acts.where('id').anyOf(existingActIds).toArray();
          actData.sortOrder = Math.max(...existingActs.map(a => a.sortOrder || 0)) + 1;
        } else { actData.sortOrder = 0; }
      } else { actData.sortOrder = 0; }
    }
    // Assegnazione cartella ("una card = una cartella"): quando il caller
    // sa gia' se l'atto e' "da fascicolo" (AF) o esterno (A), persistiamo
    // subito folderSeq + folderPrefix. Cosi' il badge UI e la cartella su
    // disco sono coerenti SIN DALLA CREAZIONE, anche prima che i file
    // vengano allegati. Sequenze AF e A sono indipendenti per fascicolo.
    if (_isFromDossier !== undefined && dossierId != null) {
      const wantedPrefix = _isFromDossier ? 'AF' : 'AE';
      // Scope di numerazione: per-fatto se l'atto nasce in un fatto (FT###),
      // altrimenti per-dossier (atto orfano senza fatto di origine).
      const allActs = await db.acts.toArray();
      const sameScope = factId != null
        ? allActs.filter(x => x.factId === factId)
        : allActs.filter(x => x.dossierId === dossierId && !x.factId);
      // 'A' (legacy) e 'AE' condividono lo stesso bucket di numerazione.
      let maxSeq = 0;
      for (const x of sameScope) {
        if (!Number.isFinite(x.folderSeq)) continue;
        const _xKey = (x.folderPrefix === 'A') ? 'AE' : x.folderPrefix;
        if (_xKey === wantedPrefix && x.folderSeq > maxSeq) {
          maxSeq = x.folderSeq;
        }
      }
      actData.folderSeq = maxSeq + 1;
      actData.folderPrefix = wantedPrefix;
    }
    // factId e dossierId vengono persistiti come campi del record per
    // mantenere il legame d'origine (utile per "Modifica Atto da Fascicolo"
    // anche quando non esiste ancora una factActRelation esplicita).
    const id = await db.acts.add({ ...actData, dossierId: dossierId || null, factId: factId || null });
    // Nessuna creazione automatica di factActRelations: la relazione e' una
    // azione utente esplicita (drag-and-drop o "+ Link atto esistente").
    _autoSave();
    return { ...actData, id, factId: factId || null, dossierId: dossierId || null };
  },
  async updateAct(id, data) {
    await db.acts.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteAct(id) {
    await db.factActRelations.where('actId').equals(id).delete();
    await db.actProofRelations.where('actId').equals(id).delete();
    await db.circumstanceActRelations.where('actId').equals(id).delete();
    await db.violations.where('actId').equals(id).delete();
    await DB.deleteEntityFiles('act', id);
    await db.entitySubjects.where({ entityType: 'act', entityId: id }).delete();
    await db.actActRelations.where('actIdA').equals(id).delete();
    await db.actActRelations.where('actIdB').equals(id).delete();
    await db.acts.delete(id);
    _autoSave();
  },

  async getFactsByDossier(dossierId) {
    const rels = await db.factDossierRelations.where('dossierId').equals(dossierId).toArray();
    const facts = [];
    for (const rel of rels) {
      const f = await db.facts.get(rel.factId);
      if (f) facts.push({ ...f, dossierId });
    }
    return facts;
  },
  async getAllFacts() {
    return await db.facts.toArray();
  },
  async getFact(id) {
    const f = await db.facts.get(id);
    if (!f) return f;
    const rel = await db.factDossierRelations.where('factId').equals(id).first();
    return { ...f, dossierId: rel ? rel.dossierId : null };
  },
  async createFact(data) {
    const { dossierId, ...factData } = data;
    if (dossierId != null && factData.sortOrder == null) {
      const rels = await db.factDossierRelations.where('dossierId').equals(dossierId).toArray();
      if (rels.length > 0) {
        const existingFacts = await db.facts.where('id').anyOf(rels.map(r => r.factId)).toArray();
        factData.sortOrder = Math.max(...existingFacts.map(f => f.sortOrder || 0)) + 1;
      } else { factData.sortOrder = 0; }
    } else if (factData.sortOrder == null) { factData.sortOrder = 0; }
    const id = await db.facts.add(factData);
    if (dossierId != null) {
      const existing = await db.factDossierRelations.where('factId').equals(id).filter(r => r.dossierId === dossierId).count();
      if (existing === 0) {
        await db.factDossierRelations.add({ factId: id, dossierId });
      }
    }
    _autoSave();
    return { ...factData, id, dossierId };
  },
  async updateFact(id, data) {
    await db.facts.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async updateFactStats(factId, stats) {
    await db.facts.update(factId, stats);
  },
  async deleteFact(id) {
    // Cattura le prove collegate prima di eliminare le relazioni
    const linkedProofRels = await db.factProofRelations.where('factId').equals(id).toArray();
    const linkedProofIds = linkedProofRels.map(r => r.proofId);
    await db.factProofRelations.where('factId').equals(id).delete();
    // Elimina le prove che diventano orfane (non collegate ad altri fatti)
    for (const proofId of linkedProofIds) {
      const remaining = await db.factProofRelations.where('proofId').equals(proofId).count();
      if (remaining === 0) await DB.deleteProof(proofId);
    }
    await db.factDossierRelations.where('factId').equals(id).delete();
    const circs = await db.circumstances.where('factId').equals(id).toArray();
    for (const c of circs) {
      await db.circumstanceProofRelations.where('circumstanceId').equals(c.id).delete();
      await db.circumstanceDossierRelations.where('circumstanceId').equals(c.id).delete();
      await db.circumstanceNormaRelations.where('circumstanceId').equals(c.id).delete();
    }
    await db.circumstances.where('factId').equals(id).delete();
    await db.factActRelations.where('factId').equals(id).delete();
    await db.factCausalRelations.where('causeFactId').equals(id).delete();
    await db.factCausalRelations.where('effectFactId').equals(id).delete();
    await db.violations.where('factId').equals(id).delete();
    await DB.deleteEntityFiles('fact', id);
    await db.entitySubjects.where({ entityType: 'fact', entityId: id }).delete();
    await db.facts.delete(id);
    _autoSave();
  },

  async getFactCausalRelations(factId) {
    await dbReady;
    const asCause  = await db.factCausalRelations.where('causeFactId').equals(factId).toArray();
    const asEffect = await db.factCausalRelations.where('effectFactId').equals(factId).toArray();
    return [...asCause, ...asEffect];
  },
  async createFactCausalRelation(data) {
    await dbReady;
    // Direction is canonicalized via causeFactId/effectFactId.
    // The UI option "consegue_da" is persisted with swapped IDs and relationType='causa'.
    // Only 'causa' and 'connesso_a' are stored as relationType values.
    const existingDirect = await db.factCausalRelations
      .where({ causeFactId: data.causeFactId, effectFactId: data.effectFactId }).first();
    if (existingDirect) {
      if (existingDirect.relationType !== data.relationType) {
        await db.factCausalRelations.update(existingDirect.id, { relationType: data.relationType });
        _autoSave();
        return { ...existingDirect, relationType: data.relationType };
      }
      return existingDirect;
    }
    const existingReverse = await db.factCausalRelations
      .where({ causeFactId: data.effectFactId, effectFactId: data.causeFactId }).first();
    if (existingReverse && data.relationType === 'connesso_a' && existingReverse.relationType === 'connesso_a') {
      return existingReverse;
    }
    const id = await db.factCausalRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async deleteFactCausalRelation(id) {
    await dbReady;
    await db.factCausalRelations.delete(id);
    _autoSave();
  },

  async getCircumstances(factId) {
    return await db.circumstances.where('factId').equals(factId).toArray();
  },
  async getCircumstancesByDossier(dossierId) {
    const facts = await db.facts.where('dossierId').equals(dossierId).toArray();
    const all = [];
    for (const f of facts) {
      const circs = await db.circumstances.where('factId').equals(f.id).toArray();
      for (const c of circs) {
        c._factTitle = f.title;
        all.push(c);
      }
    }
    return all;
  },
  async getCircumstance(id) {
    return await db.circumstances.get(id);
  },
  async createCircumstance(data) {
    if (data.factId != null && data.sortOrder == null) {
      const existing = await db.circumstances.where('factId').equals(data.factId).toArray();
      data.sortOrder = existing.length > 0 ? Math.max(...existing.map(c => c.sortOrder || 0)) + 1 : 0;
    }
    const id = await db.circumstances.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateCircumstance(id, data) {
    await db.circumstances.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteCircumstance(id) {
    await db.circumstanceProofRelations.where('circumstanceId').equals(id).delete();
    await db.circumstanceDossierRelations.where('circumstanceId').equals(id).delete();
    await db.circumstanceActRelations.where('circumstanceId').equals(id).delete();
    await db.circumstanceNormaRelations.where('circumstanceId').equals(id).delete();
    await db.entitySubjects.where({ entityType: 'circumstance', entityId: id }).delete();
    await db.circumstances.delete(id);
    _autoSave();
  },

  async getFactActRelations(factId) {
    const rels = await db.factActRelations.where('factId').equals(factId).toArray();
    const result = [];
    for (const rel of rels) {
      const act = await db.acts.get(rel.actId);
      result.push({ ...rel, act: act || null });
    }
    return result;
  },
  async getActFactRelations(actId) {
    const rels = await db.factActRelations.where('actId').equals(actId).toArray();
    const result = [];
    for (const rel of rels) {
      const fact = await db.facts.get(rel.factId);
      result.push({ ...rel, fact: fact || null });
    }
    return result;
  },
  async createFactActRelation(data) {
    const id = await db.factActRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateFactActRelation(id, data) {
    await db.factActRelations.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteFactActRelation(id) {
    await db.factActRelations.delete(id);
    _autoSave();
  },

  async getProofs(factId) {
    const rels = await db.factProofRelations.where('factId').equals(factId).toArray();
    const proofs = [];
    for (const rel of rels) {
      const pr = await db.proofs.get(rel.proofId);
      if (pr) proofs.push({ ...pr, relationType: rel.relationType, _relationId: rel.id });
    }
    return proofs;
  },
  async getAllProofs() {
    return await db.proofs.toArray();
  },
  async getProof(id) {
    const p = await db.proofs.get(id);
    if (!p) return p;
    // dossierId / factId persistiti sul record (origine della prova) hanno
    // priorita'; le relazioni factProofRelations / factDossierRelations sono
    // un fallback (quando la prova non e' stata creata con dossierId/factId).
    const proofRel = await db.factProofRelations.where('proofId').equals(id).first();
    let _factId = p.factId || (proofRel ? proofRel.factId : null);
    let _dossierId = p.dossierId || null;
    if (!_dossierId && _factId) {
      const factRel = await db.factDossierRelations.where('factId').equals(_factId).first();
      if (factRel) _dossierId = factRel.dossierId;
    }
    return { ...p, factId: _factId || null, dossierId: _dossierId || null };
  },
  async createProof(data) {
    const { factId, dossierId, relationType, _skipFactRelation, ...proofData } = data;
    if (factId != null && proofData.sortOrder == null) {
      const existingRels = await db.factProofRelations.where('factId').equals(factId).toArray();
      const existingProofIds = existingRels.map(r => r.proofId);
      if (existingProofIds.length > 0) {
        const existingProofs = await db.proofs.where('id').anyOf(existingProofIds).toArray();
        proofData.sortOrder = Math.max(...existingProofs.map(p => p.sortOrder || 0)) + 1;
      } else {
        proofData.sortOrder = 0;
      }
    }
    // factId e dossierId vengono persistiti come campi del record per
    // mantenere il legame d'origine (utile per "Modifica Prova da Fascicolo"
    // anche quando non esiste ancora una factProofRelation esplicita).
    // Se dossierId non e' stato fornito ma c'e' factId, lo deriviamo dal
    // fact: serve per la numerazione delle cartelle prova (PF###/P###),
    // che si raggruppa per dossier.
    let _resolvedDossierId = dossierId || null;
    if (!_resolvedDossierId && factId != null) {
      try {
        const _fact = await db.facts.get(factId);
        if (_fact && _fact.dossierId) _resolvedDossierId = _fact.dossierId;
      } catch (_) {}
    }
    const id = await db.proofs.add({ ...proofData, factId: factId || null, dossierId: _resolvedDossierId });
    if (factId && !_skipFactRelation) {
      await db.factProofRelations.add({ factId, proofId: id, relationType: relationType || 'confirms' });
    }
    _autoSave();
    return { ...proofData, id, factId: factId || null, dossierId: _resolvedDossierId, relationType };
  },
  async updateProof(id, data) {
    const { factId, relationType, ...proofData } = data;
    if (Object.keys(proofData).length > 0) {
      await db.proofs.update(id, proofData);
    }
    _autoSave();
    return { ...data, id };
  },
  async deleteProof(id) {
    await DB.deleteEntityFiles('proof', id);
    await db.entitySubjects.where({ entityType: 'proof', entityId: id }).delete();
    await db.factProofRelations.where('proofId').equals(id).delete();
    await db.circumstanceProofRelations.where('proofId').equals(id).delete();
    await db.actProofRelations.where('proofId').equals(id).delete();
    await db.proofs.delete(id);
    _autoSave();
  },
  async getFactProofRelations(factId) {
    const rels = await db.factProofRelations.where('factId').equals(factId).toArray();
    for (const rel of rels) {
      rel.proof = await db.proofs.get(rel.proofId);
    }
    return rels;
  },
  async getProofFactRelations(proofId) {
    const rels = await db.factProofRelations.where('proofId').equals(proofId).toArray();
    for (const rel of rels) {
      rel.fact = await db.facts.get(rel.factId);
    }
    return rels;
  },
  async createFactProofRelation(data) {
    const existing = await db.factProofRelations
      .where({ factId: data.factId, proofId: data.proofId }).first();
    if (existing) return existing;
    const id = await db.factProofRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateFactProofRelation(id, data) {
    await db.factProofRelations.update(id, data);
    _autoSave();
  },
  async deleteFactProofRelation(id) {
    await db.factProofRelations.delete(id);
    _autoSave();
  },

  async getCircumstanceProofRelations(circumstanceId) {
    return await db.circumstanceProofRelations.where('circumstanceId').equals(circumstanceId).toArray();
  },
  async getProofCircumstanceRelations(proofId) {
    return await db.circumstanceProofRelations.where('proofId').equals(proofId).toArray();
  },
  async createCircumstanceProofRelation(data) {
    const existing = await db.circumstanceProofRelations
      .where({ circumstanceId: data.circumstanceId, proofId: data.proofId }).first();
    if (existing) return existing;
    const id = await db.circumstanceProofRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async deleteCircumstanceProofRelation(id) {
    await db.circumstanceProofRelations.delete(id);
    _autoSave();
  },

  async getCircumstanceNormaRelations(circumstanceId) {
    return await db.circumstanceNormaRelations.where('circumstanceId').equals(circumstanceId).toArray();
  },
  async addCircumstanceNormaRelation(data) {
    const existing = await db.circumstanceNormaRelations
      .where({ circumstanceId: data.circumstanceId, normaId: data.normaId }).first();
    if (existing) return existing;
    const id = await db.circumstanceNormaRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async removeCircumstanceNormaRelation(id) {
    await db.entitySubjects.where({ entityType: 'circNorm', entityId: id }).delete();
    await db.circumstanceNormaRelations.delete(id);
    _autoSave();
  },
  async updateCircumstanceNormaRelation(id, data) {
    await db.circumstanceNormaRelations.update(id, data);
    _autoSave();
    return { ...data, id };
  },

  async getActActRelations(actId) {
    const asA = await db.actActRelations.where('actIdA').equals(actId).toArray();
    const asB = await db.actActRelations.where('actIdB').equals(actId).toArray();
    return [...asA, ...asB];
  },
  async addActActRelation(data) {
    const existing = await db.actActRelations
      .where({ actIdA: data.actIdA, actIdB: data.actIdB }).first();
    if (existing) return existing;
    const existing2 = await db.actActRelations
      .where({ actIdA: data.actIdB, actIdB: data.actIdA }).first();
    if (existing2) return existing2;
    const id = await db.actActRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async removeActActRelation(id) {
    await db.actActRelations.delete(id);
    _autoSave();
  },

  async getProceedingRelations(proceedingId) {
    await dbReady;
    const asA = await db.proceedingRelations.where('proceedingIdA').equals(proceedingId).toArray();
    const asB = await db.proceedingRelations.where('proceedingIdB').equals(proceedingId).toArray();
    return [...asA, ...asB];
  },
  async getProceedingRelationsForCase(procIdArray) {
    await dbReady;
    if (!procIdArray.length) return [];
    const asA = await db.proceedingRelations.where('proceedingIdA').anyOf(procIdArray).toArray();
    const asB = await db.proceedingRelations.where('proceedingIdB').anyOf(procIdArray).toArray();
    const seen = new Set();
    const all = [...asA, ...asB].filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    return all;
  },
  async createProceedingRelation(data) {
    await dbReady;
    const existing = await db.proceedingRelations
      .where({ proceedingIdA: data.proceedingIdA, proceedingIdB: data.proceedingIdB })
      .filter(r => r.relationType === data.relationType).first();
    if (existing) return existing;
    const existingRev = await db.proceedingRelations
      .where({ proceedingIdA: data.proceedingIdB, proceedingIdB: data.proceedingIdA })
      .filter(r => r.relationType === data.relationType).first();
    if (existingRev) return existingRev;
    const id = await db.proceedingRelations.add({ ...data, createdAt: Date.now() });
    _autoSave();
    return { ...data, id };
  },
  async deleteProceedingRelation(id) {
    await dbReady;
    await db.proceedingRelations.delete(id);
    _autoSave();
  },
  async cleanOrphanProceedingRelations() {
    await dbReady;
    const allRels = await db.proceedingRelations.toArray();
    if (!allRels.length) return 0;
    const procIds = new Set((await db.proceedings.toArray()).map(p => p.id));
    const orphans = allRels.filter(r => !procIds.has(r.proceedingIdA) || !procIds.has(r.proceedingIdB));
    for (const o of orphans) await db.proceedingRelations.delete(o.id);
    if (orphans.length) { _autoSave(); console.log('cleanOrphanProceedingRelations: rimossi', orphans.length, 'record orfani'); }
    return orphans.length;
  },

  async getActProofRelations(actId) {
    return await db.actProofRelations.where('actId').equals(actId).toArray();
  },
  async getProofActRelations(proofId) {
    return await db.actProofRelations.where('proofId').equals(proofId).toArray();
  },
  async createActProofRelation(data) {
    const existing = await db.actProofRelations
      .where({ actId: data.actId, proofId: data.proofId }).first();
    if (existing) return existing;
    const id = await db.actProofRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async deleteActProofRelation(id) {
    await db.actProofRelations.delete(id);
    _autoSave();
  },

  async getCircumstanceActRelations(circumstanceId) {
    return await db.circumstanceActRelations.where('circumstanceId').equals(circumstanceId).toArray();
  },
  async getActCircumstanceRelations(actId) {
    return await db.circumstanceActRelations.where('actId').equals(actId).toArray();
  },
  async createCircumstanceActRelation(data) {
    const existing = await db.circumstanceActRelations
      .where({ circumstanceId: data.circumstanceId, actId: data.actId }).first();
    if (existing) return existing;
    const id = await db.circumstanceActRelations.add(data);
    _autoSave();
    return await db.circumstanceActRelations.get(id);
  },
  async deleteCircumstanceActRelation(id) {
    await db.circumstanceActRelations.delete(id);
    _autoSave();
  },

  async getFactDossierRelations(factId) {
    return await db.factDossierRelations.where('factId').equals(factId).toArray();
  },
  async createFactDossierRelation(data) {
    const existing = await db.factDossierRelations
      .where({ factId: data.factId, dossierId: data.dossierId }).first();
    if (existing) return existing;
    const id = await db.factDossierRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async deleteFactDossierRelation(id) {
    await db.factDossierRelations.delete(id);
    _autoSave();
  },

  async getCircumstanceDossierRelations(circumstanceId) {
    return await db.circumstanceDossierRelations.where('circumstanceId').equals(circumstanceId).toArray();
  },
  async createCircumstanceDossierRelation(data) {
    const existing = await db.circumstanceDossierRelations
      .where({ circumstanceId: data.circumstanceId, dossierId: data.dossierId }).first();
    if (existing) return existing;
    const id = await db.circumstanceDossierRelations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async deleteCircumstanceDossierRelation(id) {
    await db.circumstanceDossierRelations.delete(id);
    _autoSave();
  },

  async countViolations() {
    return await db.violations.count();
  },
  async getViolationsByFact(factId) {
    return await db.violations.where('factId').equals(factId).toArray();
  },
  async getViolationsByAct(actId) {
    return await db.violations.where('actId').equals(actId).toArray();
  },
  async getViolation(id) {
    return await db.violations.get(id);
  },
  async createViolation(data) {
    const id = await db.violations.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateViolation(id, data) {
    await db.violations.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteViolation(id) {
    await db.entitySubjects.where({ entityType: 'violation', entityId: id }).delete();
    await db.violations.delete(id);
    _autoSave();
  },
  async deleteViolationsByFact(factId) {
    const viols = await db.violations.where('factId').equals(factId).toArray();
    for (const v of viols) {
      await db.entitySubjects.where({ entityType: 'violation', entityId: v.id }).delete();
    }
    await db.violations.where('factId').equals(factId).delete();
    _autoSave();
  },
  async deleteViolationsByAct(actId) {
    const viols = await db.violations.where('actId').equals(actId).toArray();
    for (const v of viols) {
      await db.entitySubjects.where({ entityType: 'violation', entityId: v.id }).delete();
    }
    await db.violations.where('actId').equals(actId).delete();
    _autoSave();
  },

  async getSubjects() {
    return await db.subjects.toArray();
  },
  async getSubject(id) {
    return await db.subjects.get(id);
  },
  async createSubject(data) {
    const id = await db.subjects.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateSubject(id, data) {
    await db.subjects.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteSubject(id) {
    await db.entitySubjects.where('subjectId').equals(id).delete();
    await db.proceedingRoles.where('subjectId').equals(id).delete();
    await db.proceedingActions.where('subjectId').equals(id).delete();
    await db.subjects.delete(id);
    _autoSave();
  },

  async getEntitySubjects(entityType, entityId) {
    const links = await db.entitySubjects.where({ entityType, entityId }).toArray();
    const result = [];
    for (const link of links) {
      const subject = await db.subjects.get(link.subjectId);
      if (subject) result.push({ ...link, subject });
    }
    return result;
  },
  async linkSubject(data) {
    const id = await db.entitySubjects.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateSubjectLink(id, data) {
    await db.entitySubjects.update(id, data);
    _autoSave();
  },
  async unlinkSubject(id) {
    await db.entitySubjects.delete(id);
    _autoSave();
  },
  async getSubjectLinks(subjectId) {
    const links = await db.entitySubjects.where('subjectId').equals(subjectId).toArray();
    const result = [];
    for (const link of links) {
      let entity = null;
      if (link.entityType === 'case') entity = await db.cases.get(link.entityId);
      else if (link.entityType === 'proceeding') entity = await db.proceedings.get(link.entityId);
      else if (link.entityType === 'dossier') entity = await db.dossiers.get(link.entityId);
      else if (link.entityType === 'act') entity = await db.acts.get(link.entityId);
      else if (link.entityType === 'fact') entity = await db.facts.get(link.entityId);
      result.push({ ...link, entity });
    }
    return result;
  },

  async getSubjectFacts(subjectId) {
    const links = await db.entitySubjects
      .where('subjectId').equals(subjectId)
      .filter(l => l.entityType === 'fact')
      .toArray();
    const result = [];
    for (const link of links) {
      const fact = await db.facts.get(link.entityId);
      if (!fact) continue;
      let dossierTitle = '';
      if (fact.dossierId) {
        const doss = await db.dossiers.get(fact.dossierId);
        if (doss) dossierTitle = doss.title || '';
      }
      result.push({ ...link, fact, dossierTitle });
    }
    return result;
  },

  async linkSubjectToFact(factId, subjectId, roleLabel = '') {
    return this.linkSubject({ entityType: 'fact', entityId: factId, subjectId, roleLabel });
  },
  async unlinkSubjectFromFact(linkId) {
    return this.unlinkSubject(linkId);
  },
  async getFactSubjects(factId) {
    return this.getEntitySubjects('fact', factId);
  },

  async linkSubjectToCircumstance(circId, subjectId, roleLabel = '') {
    return this.linkSubject({ entityType: 'circumstance', entityId: circId, subjectId, roleLabel });
  },
  async unlinkSubjectFromCircumstance(linkId) {
    return this.unlinkSubject(linkId);
  },
  async getCircumstanceSubjects(circId) {
    return this.getEntitySubjects('circumstance', circId);
  },
  async getSubjectCircumstances(subjectId) {
    const sid = Number(subjectId);
    const allLinks = await db.entitySubjects.where('subjectId').equals(sid).toArray();
    const links = allLinks.filter(l => l.entityType === 'circumstance');
    const result = [];
    for (const link of links) {
      const circ = await db.circumstances.get(link.entityId);
      if (!circ) continue;
      let factTitle = '';
      if (circ.factId) {
        const f = await db.facts.get(circ.factId);
        if (f) factTitle = f.title || '';
      }
      result.push({ ...link, circ, factTitle });
    }
    return result;
  },

  async linkSubjectToNorm(entityType, entityId, subjectId, roleId) {
    const existing = await db.entitySubjects.where({ entityType, entityId, subjectId }).toArray();
    const dup = existing.find(e => (e.roleId || null) === (roleId || null));
    if (dup) return dup;
    const rec = { entityType, entityId, subjectId, roleId: roleId || null };
    const id = await db.entitySubjects.add(rec);
    _autoSave();
    return { ...rec, id };
  },
  async unlinkSubjectFromNorm(entityType, entityId, subjectId) {
    const existing = await db.entitySubjects.where({ entityType, entityId, subjectId }).first();
    if (existing) await db.entitySubjects.delete(existing.id);
    _autoSave();
  },
  async getNormSubjectLinks(entityType, entityId) {
    const links = await db.entitySubjects.where({ entityType, entityId }).toArray();
    const result = [];
    for (const link of links) {
      const subject = await db.subjects.get(link.subjectId);
      if (!subject) continue;
      let roleCode = null;
      if (link.roleId) {
        const role = await db.proceedingRoles.get(link.roleId);
        if (role) roleCode = role.roleCode;
      }
      result.push({ ...link, subject, roleCode });
    }
    return result;
  },
  async getSubjectNormLinks(subjectId) {
    const links = await db.entitySubjects
      .where('subjectId').equals(subjectId)
      .filter(l => l.entityType === 'violation' || l.entityType === 'circNorm')
      .toArray();
    const result = [];
    for (const link of links) {
      let entity = null, normaId = null, normaCode = '', normaTitle = '', contextTitle = '';
      if (link.entityType === 'violation') {
        entity = await db.violations.get(link.entityId);
        if (entity) { normaId = entity.normaId; normaCode = entity.normaCode || ''; normaTitle = entity.normaTitle || ''; }
        if (entity && entity.factId) {
          const fact = await db.facts.get(entity.factId);
          contextTitle = fact ? (fact.title || fact.titleEN || '') : '';
        }
      } else if (link.entityType === 'circNorm') {
        entity = await db.circumstanceNormaRelations.get(link.entityId);
        if (entity) { normaId = entity.normaId; normaCode = entity.normaCode || ''; normaTitle = entity.normaTitle || ''; }
        if (entity && entity.circumstanceId) {
          const circ = await db.circumstances.get(entity.circumstanceId);
          contextTitle = circ ? (circ.title || '') : '';
        }
      }
      if (!entity) {
        await db.entitySubjects.delete(link.id);
        continue;
      }
      result.push({ ...link, entity, normaId, normaCode, normaTitle, contextTitle });
    }
    return result;
  },

  async getProceedingRoles(proceedingId) {
    const roles = await db.proceedingRoles.where('proceedingId').equals(proceedingId).toArray();
    const result = [];
    for (const role of roles) {
      const subject = await db.subjects.get(role.subjectId);
      if (subject) result.push({ ...role, subject });
    }
    return result;
  },
  async addProceedingRole(data) {
    const id = await db.proceedingRoles.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateProceedingRole(id, data) {
    await db.proceedingRoles.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async removeProceedingRole(id) {
    await db.proceedingRoles.delete(id);
    _autoSave();
  },

  async getProceedingActions(proceedingId) {
    const actions = await db.proceedingActions.where('proceedingId').equals(proceedingId).toArray();
    const result = [];
    for (const action of actions) {
      const subject = await db.subjects.get(action.subjectId);
      result.push({ ...action, subject: subject || null });
    }
    return result;
  },
  async addProceedingAction(data) {
    const id = await db.proceedingActions.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateProceedingAction(id, data) {
    await db.proceedingActions.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async removeProceedingAction(id) {
    await db.proceedingActions.delete(id);
    _autoSave();
  },

  async getProceedingLinks(proceedingId) {
    const links = await db.proceedingLinks.where('proceedingId').equals(proceedingId).toArray();
    const result = [];
    for (const link of links) {
      const related = await db.proceedings.get(link.relatedProceedingId);
      if (related) result.push({ ...link, related });
    }
    return result;
  },
  async addProceedingLink(data) {
    const id = await db.proceedingLinks.add(data);
    _autoSave();
    return { ...data, id };
  },
  async removeProceedingLink(id) {
    await db.proceedingLinks.delete(id);
    _autoSave();
  },

  async getEntityFiles(entityType, entityId) {
    return await db.files.where({ entityType, entityId }).toArray();
  },
  async getEntityFile(entityType, entityId, lang) {
    return await db.files.where({ entityType, entityId, lang }).first();
  },
  async getFiles(actId) {
    return await db.files.where('actId').equals(actId).toArray();
  },
  async createFile(data) {
    const id = await db.files.add(data);
    _autoSave();
    return { ...data, id };
  },
  async getFile(id) {
    return await db.files.get(id);
  },
  async getFilesBySourceId(sourceFileId) {
    return await db.files.where('sourceFileId').equals(sourceFileId).toArray();
  },
  async getEntityHasSourceFile(entityType, entityId) {
    const myFiles = await db.files.where({ entityType, entityId }).toArray();
    // Esclude i "derivati interni": file con sourceFileId che punta a un
    // altro file della STESSA entita' (es. PDF metadati/hash di
    // un'immagine prova esterna). Questi non devono promuovere la
    // prova/atto a PF/AF: la categoria deve restare PE/AE.
    for (const f of myFiles) {
      if (f.sourceFileId == null) continue;
      const src = await db.files.get(f.sourceFileId);
      if (!src) continue;
      if (src.entityType === entityType && src.entityId === entityId) continue;
      return true;
    }
    return false;
  },
  async getEntityHasPecSource(entityType, entityId) {
    const myFiles = await db.files.where({ entityType, entityId }).toArray();
    for (const f of myFiles) {
      if (f.sourceFileId == null) continue;
      const src = await db.files.get(f.sourceFileId);
      if (src && src.entityType === 'pec') return true;
    }
    return false;
  },
  async getEntityProvenance(entityType, entityId) {
    const myFiles = await db.files.where({ entityType, entityId }).toArray();
    for (const f of myFiles) {
      if (f.sourceFileId == null) continue;
      const src = await db.files.get(f.sourceFileId);
      if (src && src.entityType === 'pec') return 'pec';
      if (src) return 'dossier';
    }
    return 'external';
  },
  async getSharedSourceEntityIds(entityType, entityId) {
    const myFiles = await db.files.where({ entityType, entityId }).toArray();
    const sourceIds = [...new Set(myFiles.filter(f => f.sourceFileId != null).map(f => f.sourceFileId))];
    if (sourceIds.length === 0) return [];
    const counterType = entityType === 'act' ? 'proof' : 'act';
    const counterIds = new Set();
    for (const sid of sourceIds) {
      const sharedFiles = await db.files.where('sourceFileId').equals(sid).toArray();
      sharedFiles.filter(f => f.entityType === counterType).forEach(f => counterIds.add(f.entityId));
    }
    return [...counterIds];
  },
  async getFilesByLinkedOrigId(origFileId) {
    return await db.files.filter(f => f.linkedOrigFileId === origFileId).toArray();
  },
  async updateFile(id, data) {
    await db.files.update(id, data);
    // Invalida la cache di verifica hash per questo file: se cambia
    // blob/hash/path, il badge "H" deve ricalcolare al prossimo render.
    try { if (typeof _HASH_VERIFY_CACHE !== 'undefined') _HASH_VERIFY_CACHE.delete(id); } catch (_) {}
    _autoSave();
  },
  async deleteFile(id) {
    // Cancella SEMPRE anche il file fisico dal disco (oltre al record DB),
    // analogamente a `deleteEntityFiles`. Cosi' tutti i call site
    // (modale Modifica Prova, Modifica Atto, transfer trascrizione,
    // sostituzione PDF, ecc.) eliminano davvero i vecchi file dalla
    // cartella collegata invece di lasciarli come orfani sul disco.
    // I file "riferimento" (`sourceFileId != null`) NON vengono mai
    // eliminati dal FS perche' puntano al file originale del fascicolo
    // che resta valido per altre entita`.
    try {
      const f = await db.files.get(id);
      // I file con `fileRole='image_omissis'` sono file FISICI generati ad
      // hoc (PNG rasterizzato), anche se hanno sourceFileId verso
      // l'originale: vanno cancellati dal disco. Solo i veri "riferimenti"
      // (sourceFileId != null senza ruolo dedicato) restano sul FS.
      const _isPhysical = f && (f.sourceFileId == null || f.fileRole === 'image_omissis' || f.fileRole === 'image_omissis_hash');
      if (_isPhysical && typeof deleteFileFromFS === 'function') {
        try { await deleteFileFromFS(f); } catch (e) { console.log('Could not delete file from FS in DB.deleteFile:', e); }
      }
    } catch (e) { console.log('DB.deleteFile: getFile failed before delete:', e); }
    await db.files.delete(id);
    // Cascade: elimina anche i file dipendenti (sourceFileId === id), p.es.
    // immagini omissis (`fileRole='image_omissis'`) generate dall'originale
    // di una prova-image. Ricorre per gestire eventuali catene a piu' livelli.
    try {
      const dependents = await db.files.where('sourceFileId').equals(id).toArray();
      for (const dep of dependents) {
        try { await this.deleteFile(dep.id); } catch (e) { console.log('Cascade deleteFile failed:', dep.id, e); }
      }
    } catch (e) { console.log('DB.deleteFile cascade lookup failed:', e); }
    // Invalida la cache di verifica hash: il file non esiste piu'.
    try { if (typeof _HASH_VERIFY_CACHE !== 'undefined') _HASH_VERIFY_CACHE.delete(id); } catch (_) {}
    _autoSave();
  },
  async deleteEntityFiles(entityType, entityId) {
    const files = await db.files.where({ entityType, entityId }).toArray();
    for (const f of files) {
      // I file "riferimento" (sourceFileId != null) puntano al file originale del fascicolo:
      // si elimina solo il record DB, mai il file fisico su disco.
      // ECCEZIONE: i file `image_omissis` sono fisici (PNG rasterizzato)
      // anche se hanno sourceFileId verso l'originale.
      if (f.sourceFileId != null && f.fileRole !== 'image_omissis' && f.fileRole !== 'image_omissis_hash') continue;
      if (typeof deleteFileFromFS === 'function') {
        try { await deleteFileFromFS(f); } catch (e) { console.log('Could not delete file from FS:', e); }
      }
    }
    // Invalida la cache di verifica hash per tutti i file rimossi.
    try {
      if (typeof _HASH_VERIFY_CACHE !== 'undefined') {
        for (const f of files) _HASH_VERIFY_CACHE.delete(f.id);
      }
    } catch (_) {}
    await db.files.where({ entityType, entityId }).delete();
    _autoSave();
  },
  async getFilesByCase(caseId) {
    return await db.files.where('caseId').equals(caseId).toArray();
  },
  async getFilesByProceeding(proceedingId) {
    return await db.files.where('proceedingId').equals(proceedingId).toArray();
  },
  async getFilesByDossier(dossierId) {
    return await db.files.where('dossierId').equals(dossierId).toArray();
  },

  async getListItems(listKey, parentId) {
    if (listKey === 'categories') return await SysDB.getCategories();
    if (listKey === 'subcategories') return await SysDB.getSubcategories(parentId);
    if (listKey === 'roles') return await SysDB.getRoles(parentId);
    await dbReady;
    if (parentId !== undefined && parentId !== null) {
      return await db.customLists.where('listKey').equals(listKey).filter(item => item.parentId === parentId).toArray();
    }
    return await db.customLists.where('listKey').equals(listKey).toArray();
  },
  async getListItem(id) {
    return await db.customLists.get(id);
  },
  async addListItem(listKey, labelIt, labelEn, parentId) {
    if (listKey === 'categories') return await SysDB.addCategory(labelIt, labelEn);
    if (listKey === 'subcategories') return await SysDB.addSubcategory(labelIt, labelEn, parentId);
    if (listKey === 'roles') return await SysDB.addRole(labelIt, labelEn, parentId);
    const id = await db.customLists.add({
      listKey,
      labelIt: labelIt.trim(),
      labelEn: labelEn.trim(),
      parentId: parentId || null
    });
    _autoSave();
    return id;
  },
  async deleteListItem(id) {
    await db.customLists.delete(id);
    _autoSave();
  },
  getItemLabel(item, lang) {
    if (!item) return '';
    return lang === 'it' ? (item.labelIt || item.labelEn || '') : (item.labelEn || item.labelIt || '');
  },

  async createProceedingGroup(caseId, type) {
    const existing = await db.proceedingGroups.where('caseId').equals(caseId).toArray();
    const sameType = existing.filter(g => (g.type || 'altro') === (type || 'altro'));
    const maxSort = sameType.reduce((m, g) => Math.max(m, g.sortOrder || 0), 0);
    const sortOrder = maxSort + 1;
    const id = await db.proceedingGroups.add({ caseId, type, sortOrder, createdAt: Date.now() });
    _autoSave();
    return { id, caseId, type, sortOrder };
  },
  async getProceedingGroups(caseId) {
    return await db.proceedingGroups.where('caseId').equals(caseId).sortBy('id');
  },
  async getProceedingGroup(id) {
    return await db.proceedingGroups.get(id);
  },
  async deleteProceedingGroup(id) {
    await DB.deleteEntityFiles('proceedingGroup', id);
    await db.proceedingGroups.delete(id);
    _autoSave();
  },

  async updateProceedingGroup(id, data) {
    const safe = { ...(data || {}) };
    if ('type' in safe) {
      console.warn('updateProceedingGroup: campo "type" ignorato (immutabile dopo la creazione del contenitore).');
      delete safe.type;
    }
    if ('caseId' in safe) {
      console.warn('updateProceedingGroup: campo "caseId" ignorato (immutabile).');
      delete safe.caseId;
    }
    await db.proceedingGroups.update(id, safe);
    _autoSave();
  },

  computeCircumstanceLogicalState(actRelations, proofRelations, natura, inDossierActIds) {
    const proofRels = (proofRelations || []).slice();
    const actRels   = actRelations   || [];
    // Atti provenienti dal fascicolo (sourceFileId valorizzato) valgono
    // anche come PROVA implicita: l'atto di parte/PG e' a tutti gli effetti
    // un documento gia' agli atti del fascicolo, quindi assume valenza
    // probatoria oltre che dichiarativa. La posizione dell'atto sulla
    // circostanza viene mappata in relationType della prova virtuale.
    const _inDoss = inDossierActIds instanceof Set ? inDossierActIds
      : new Set(Array.isArray(inDossierActIds) ? inDossierActIds : []);
    if (_inDoss.size > 0) {
      for (const ar of actRels) {
        if (!_inDoss.has(ar.actId)) continue;
        const pos = ar.posizioneAtto;
        let rt = null;
        if (pos === 'afferma') rt = 'confirms';
        else if (pos === 'contraddice' || pos === 'travisa') rt = 'contradicts';
        if (rt) proofRels.push({ relationType: rt, _virtualFromAct: ar.actId });
      }
    }
    // Relazioni prova-circostanza (relationType: 'confirms' | 'contradicts' | 'describes')
    const hasConfirms    = proofRels.some(r => r.relationType === 'confirms');
    const hasContradicts = proofRels.some(r => r.relationType === 'contradicts');
    const hasAnyProof    = proofRels.length > 0;
    // Posizioni atto reali create dal drag/drop UI
    // ['afferma','contraddice','omette','travisa','non_pronuncia']
    const hasAfferma      = actRels.some(r => r.posizioneAtto === 'afferma');
    const hasContraddice  = actRels.some(r => r.posizioneAtto === 'contraddice');
    const hasOmette       = actRels.some(r => r.posizioneAtto === 'omette');
    const hasTravisa      = actRels.some(r => r.posizioneAtto === 'travisa');
    const hasAnyAct       = actRels.length > 0;
    // Nessun elemento: TO_DOCUMENT se natura classificata, altrimenti NO_PROOFS
    if (!hasAnyProof && !hasAnyAct) {
      if (natura) return 'TO_DOCUMENT';
      return 'NO_PROOFS';
    }
    // Elementi presenti ma natura non classificata → UNCLASSIFIED
    // (precede tutti gli stati legali: l'utente deve prima classificare)
    if (!natura) return 'UNCLASSIFIED';
    // INCOHERENCE: contraddizioni oggettive — priorità massima
    // travisa = distorsione attiva dell'AG → sempre INCOHERENCE
    if (hasTravisa) return 'INCOHERENCE';
    // atto nega/omette ma ci sono prove confermanti
    if ((hasOmette || hasContraddice) && hasConfirms) return 'INCOHERENCE';
    // atto afferma ma le prove contraddicono
    if (hasAfferma && hasContradicts) return 'INCOHERENCE';
    // prove interne contradditorie
    if (hasConfirms && hasContradicts) return 'INCOHERENCE';
    // OMISSION: solo omette (AG esplicitamente ignora la circostanza)
    // contraddice senza prove confermanti → TO_DOCUMENT (AG nega ma utente non ha controprova)
    if (hasOmette) return 'OMISSION';
    // COHERENT: prove confermanti + atto che afferma
    if (hasConfirms && hasAfferma) return 'COHERENT';
    // DOCUMENTED: prove presenti e nessun atto significativo
    // (AG silenziosa; non_pronuncia = non si pronuncia = equivale a silenzio)
    const hasSignificantAct = hasAfferma || hasOmette || hasContraddice || hasTravisa;
    if (hasAnyProof && !hasSignificantAct) return 'DOCUMENTED';
    // Atti significativi senza prove confermanti, o solo prove descrittive
    return 'TO_DOCUMENT';
  },

  computeLogicalState(factActRelations, proofs) {
    const hasActs = factActRelations && factActRelations.length > 0;
    const hasProofs = proofs && proofs.length > 0;

    if (!hasActs) return hasProofs ? 'HAS_PROOFS' : 'NO_ACTS';

    const positions = factActRelations.map(r => r.posizioneAtto).filter(Boolean);
    const hasAfferma = positions.includes('afferma');
    const hasContraddice = positions.includes('contraddice');
    const hasTravisa = positions.includes('travisa');
    const hasOmette = positions.includes('omette');
    const hasNonPronuncia = positions.includes('non_pronuncia');

    if (!hasProofs) {
      if (hasContraddice || hasTravisa) return 'INCOHERENCE';
      if (hasOmette || hasNonPronuncia) return 'OMISSION';
      if (hasAfferma) return 'OMISSION';
      return 'COHERENT';
    }

    const relTypes = proofs.map(p => p.relationType).filter(Boolean);
    const hasConfirms   = relTypes.includes('confirms');
    const hasContradicts = relTypes.includes('contradicts');
    const hasIntegrates = relTypes.includes('integrates');
    const hasIgnored    = relTypes.includes('ignored');

    // Atto nega/travisa: qualunque prova (confermante, contraria, integrante, ignorata) = INCOERENZA
    if ((hasContraddice || hasTravisa) && (hasConfirms || hasContradicts || hasIntegrates || hasIgnored)) return 'INCOHERENCE';
    // Atto afferma il fatto ma prove lo contraddicono → INCOERENZA
    if (hasAfferma && hasContradicts) return 'INCOHERENCE';
    // Atto afferma il fatto ma ignora prove esistenti → OMISSIONE PROBATORIA
    if (hasAfferma && hasIgnored) return 'OMISSION';
    // Atto omette/non si pronuncia: qualunque prova = OMISSIONE
    if ((hasOmette || hasNonPronuncia) && (hasConfirms || hasContradicts || hasIntegrates || hasIgnored)) return 'OMISSION';

    return 'COHERENT';
  },

  async exportAll() {
    return {
      cases: await db.cases.toArray(),
      proceedings: await db.proceedings.toArray(),
      dossiers: await db.dossiers.toArray(),
      acts: await db.acts.toArray(),
      facts: await db.facts.toArray(),
      circumstances: await db.circumstances.toArray(),
      factActRelations: await db.factActRelations.toArray(),
      factProofRelations: await db.factProofRelations.toArray(),
      circumstanceProofRelations: await db.circumstanceProofRelations.toArray(),
      actProofRelations: await db.actProofRelations.toArray(),
      circumstanceActRelations: await db.circumstanceActRelations.toArray(),
      factDossierRelations: await db.factDossierRelations.toArray(),
      circumstanceDossierRelations: await db.circumstanceDossierRelations.toArray(),
      circumstanceNormaRelations: await db.circumstanceNormaRelations.toArray(),
      factCausalRelations: await db.factCausalRelations.toArray(),
      actActRelations: await db.actActRelations.toArray(),
      proceedingRelations: await db.proceedingRelations.toArray(),
      proceedingGroups: await db.proceedingGroups.toArray(),
      proofs: await db.proofs.toArray(),
      violations: await db.violations.toArray(),
      subjects: await db.subjects.toArray(),
      entitySubjects: await db.entitySubjects.toArray(),
      files: await db.files.toArray(),
      proceedingRoles: await db.proceedingRoles.toArray(),
      proceedingActions: await db.proceedingActions.toArray(),
      proceedingLinks: await db.proceedingLinks.toArray(),
      customLists: await db.customLists.toArray(),
      userProfile: await db.userProfile.toArray(),
      archiviofatti: await db.archiviofatti.toArray(),
      archiviocircostanze: await db.archiviocircostanze.toArray(),
      archivioprovefatti: await db.archivioprovefatti.toArray(),
      archivioCircProofRels: await db.archivioCircProofRels.toArray(),
      archivioatti: await db.archivioatti.toArray(),
      pecMessages: await db.pecMessages.toArray()
    };
  },

  async _migrateLegacyRoles(subjects, customListItems) {
    const createdCats = {};
    const createdSubcats = {};
    const maxId = customListItems.length > 0 ? Math.max(...customListItems.map(c => c.id || 0)) : 0;
    let nextId = maxId + 1;

    function findOrCreate(listKey, label, parentId) {
      const key = listKey + ':' + label + ':' + (parentId || '');
      if (listKey === 'categories' && createdCats[key]) return createdCats[key];
      if (listKey === 'subcategories' && createdSubcats[key]) return createdSubcats[key];
      const existing = customListItems.find(c => c.listKey === listKey && c.labelIt === label && (c.parentId || null) === (parentId || null));
      if (existing) return existing.id;
      const id = nextId++;
      const item = { id, listKey, labelIt: label, labelEn: label, parentId: parentId || null };
      customListItems.push(item);
      if (listKey === 'categories') createdCats[key] = id;
      if (listKey === 'subcategories') createdSubcats[key] = id;
      return id;
    }

    for (const sub of subjects) {
      if (!sub.roles) sub.roles = [];
      if (sub.category || sub.subcategory) {
        if (sub.roles.length === 0) {
          sub.roles.push({ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '' });
        }
      }
      for (const r of sub.roles) {
        if (r.category && typeof r.category === 'string' && !r.categoryId) {
          const catId = findOrCreate('categories', r.category, null);
          r.categoryId = catId;
          if (r.subcategory && typeof r.subcategory === 'string' && !r.subcategoryId) {
            const subcatId = findOrCreate('subcategories', r.subcategory, catId);
            r.subcategoryId = subcatId;
            if (r.role && typeof r.role === 'string' && !r.roleId) {
              r.roleId = findOrCreate('roles', r.role, subcatId);
            }
          }
        }
        delete r.category;
        delete r.subcategory;
        delete r.role;
      }
      delete sub.category;
      delete sub.subcategory;
    }
    return { subjects, customListItems };
  },

  async _migrateFactsToV9(data) {
    if (!data.facts || data.facts.length === 0) return data;
    if (data.factActRelations && data.factActRelations.length > 0) return data;

    const acts = data.acts || [];
    const dossiers = data.dossiers || [];
    const proceedings = data.proceedings || [];
    const dossierMap = {};
    for (const d of dossiers) dossierMap[d.id] = d;
    const procMap = {};
    for (const p of proceedings) procMap[p.id] = p;

    function actToCaseId(actId) {
      const act = acts.find(a => a.id === actId);
      if (!act) return null;
      const dossier = dossierMap[act.dossierId];
      if (!dossier) return null;
      const proc = procMap[dossier.proceedingId];
      if (!proc) return null;
      return proc.caseId || null;
    }

    const relations = [];
    let relId = 1;
    for (const fact of data.facts) {
      if (fact.actId && !fact.caseId) {
        fact.caseId = actToCaseId(fact.actId);
      }
      if (fact.actId) {
        relations.push({
          id: relId++,
          factId: fact.id,
          actId: fact.actId,
          posizioneAtto: fact.actPosition || ''
        });
      }
    }
    if (!data.factActRelations) data.factActRelations = relations;
    if (!data.circumstances) data.circumstances = [];
    return data;
  },

  _migrateFactsToV10(data) {
    if (!data.facts || data.facts.length === 0) return data;
    const hasAnyDossierId = data.facts.some(f => f.dossierId);
    if (hasAnyDossierId) return data;

    const proceedings = data.proceedings || [];
    const dossiers = data.dossiers || [];
    function caseIdToDossierId(caseId) {
      const proc = proceedings.find(p => p.caseId === caseId);
      if (!proc) return null;
      const dossier = dossiers.find(d => d.proceedingId === proc.id);
      return dossier ? dossier.id : null;
    }
    for (const fact of data.facts) {
      if (!fact.dossierId && fact.caseId) {
        fact.dossierId = caseIdToDossierId(fact.caseId);
      }
    }
    return data;
  },

  async importAll(data) {
    let customListItems = data.customLists || [];
    let subjects = data.subjects || [];

    const hasLegacy = subjects.some(s =>
      (s.category || s.subcategory) ||
      (s.roles && s.roles.some(r => typeof r.category === 'string' || typeof r.subcategory === 'string'))
    );
    if (hasLegacy) {
      const migrated = await DB._migrateLegacyRoles(subjects, customListItems);
      subjects = migrated.subjects;
      customListItems = migrated.customListItems;
    }
    for (const sub of subjects) {
      if (!sub.roles) sub.roles = [];
    }

    data = await DB._migrateFactsToV9(data);
    data = DB._migrateFactsToV10(data);

    let factProofRelations = data.factProofRelations || [];
    const proofs = data.proofs || [];
    // NB: la vecchia migrazione legacy ricreava factProofRelations da
    // proof.factId quando la lista era vuota. Era dannosa: l'utente che
    // scollegava una prova vedeva la relazione ricomparire alla riapertura.
    // Manteniamo proof.factId come "appartenenza" al fatto (cartella PF###)
    // ma NON lo usiamo più per ripopolare le relazioni logiche.
    for (const pr of proofs) {
      delete pr.relationType;
    }

    await db.transaction('rw', [db.cases, db.proceedings, db.dossiers, db.acts, db.facts, db.circumstances, db.factActRelations, db.factProofRelations, db.circumstanceProofRelations, db.actProofRelations, db.circumstanceActRelations, db.factDossierRelations, db.circumstanceDossierRelations, db.circumstanceNormaRelations, db.factCausalRelations, db.proofNormaRelations, db.actActRelations, db.proceedingRelations, db.proceedingGroups, db.proofs, db.violations, db.subjects, db.entitySubjects, db.files, db.proceedingRoles, db.proceedingActions, db.proceedingLinks, db.customLists, db.userProfile, db.archiviofatti, db.archiviocircostanze, db.archivioprovefatti, db.archivioCircProofRels, db.archivioatti, db.pecMessages], async () => {
      await db.cases.clear();
      await db.proceedings.clear();
      await db.dossiers.clear();
      await db.acts.clear();
      await db.facts.clear();
      await db.circumstances.clear();
      await db.factActRelations.clear();
      await db.factProofRelations.clear();
      await db.circumstanceProofRelations.clear();
      await db.actProofRelations.clear();
      await db.circumstanceActRelations.clear();
      await db.factDossierRelations.clear();
      await db.circumstanceDossierRelations.clear();
      await db.circumstanceNormaRelations.clear();
      await db.factCausalRelations.clear();
      await db.proofNormaRelations.clear();
      await db.actActRelations.clear();
      await db.proceedingRelations.clear();
      if (db.proceedingGroups) await db.proceedingGroups.clear();
      await db.proofs.clear();
      await db.violations.clear();
      await db.subjects.clear();
      await db.entitySubjects.clear();
      await db.files.clear();
      await db.proceedingRoles.clear();
      await db.proceedingActions.clear();
      await db.proceedingLinks.clear();
      await db.customLists.clear();
      await db.userProfile.clear();
      if (db.archiviofatti) await db.archiviofatti.clear();
      if (db.archiviocircostanze) await db.archiviocircostanze.clear();
      if (db.archivioprovefatti) await db.archivioprovefatti.clear();
      if (db.archivioCircProofRels) await db.archivioCircProofRels.clear();
      if (db.archivioatti) await db.archivioatti.clear();
      if (db.pecMessages) await db.pecMessages.clear();

      if (data.cases) await db.cases.bulkAdd(data.cases);
      if (data.proceedings) await db.proceedings.bulkAdd(data.proceedings);
      if (data.dossiers) await db.dossiers.bulkAdd(data.dossiers);
      if (data.acts) await db.acts.bulkAdd(data.acts);
      if (data.facts) await db.facts.bulkAdd(data.facts);
      if (data.circumstances) await db.circumstances.bulkAdd(data.circumstances);
      if (data.factActRelations) await db.factActRelations.bulkAdd(data.factActRelations);
      if (factProofRelations.length) await db.factProofRelations.bulkAdd(factProofRelations);
      if (data.circumstanceProofRelations) await db.circumstanceProofRelations.bulkAdd(data.circumstanceProofRelations);
      if (data.actProofRelations) await db.actProofRelations.bulkAdd(data.actProofRelations);
      if (data.circumstanceActRelations) await db.circumstanceActRelations.bulkAdd(data.circumstanceActRelations);
      if (data.factDossierRelations && data.factDossierRelations.length) {
        await db.factDossierRelations.bulkAdd(data.factDossierRelations);
      } else if (data.facts) {
        const derivedDossierRels = [];
        for (const f of data.facts) {
          if (f.dossierId != null) {
            derivedDossierRels.push({ factId: f.id, dossierId: f.dossierId });
          }
        }
        if (derivedDossierRels.length) await db.factDossierRelations.bulkAdd(derivedDossierRels);
      }
      if (data.circumstanceDossierRelations) await db.circumstanceDossierRelations.bulkAdd(data.circumstanceDossierRelations);
      if (data.circumstanceNormaRelations) {
        await db.circumstanceNormaRelations.bulkAdd(data.circumstanceNormaRelations);
      } else if (data.circumstances) {
        const derivedNormaRels = [];
        for (const c of data.circumstances) {
          if (c.normaId) {
            derivedNormaRels.push({ circumstanceId: c.id, normaId: c.normaId, normaCode: c.normaCode || '', normaTitle: c.normaTitle || '' });
          }
        }
        if (derivedNormaRels.length) await db.circumstanceNormaRelations.bulkAdd(derivedNormaRels);
      }
      if (data.factCausalRelations) await db.factCausalRelations.bulkAdd(data.factCausalRelations);
      if (data.actActRelations) await db.actActRelations.bulkAdd(data.actActRelations);
      if (data.proceedingRelations) await db.proceedingRelations.bulkAdd(data.proceedingRelations);
      if (data.proceedingGroups) await db.proceedingGroups.bulkAdd(data.proceedingGroups);
      if (proofs.length) await db.proofs.bulkAdd(proofs);
      if (data.violations) await db.violations.bulkAdd(data.violations);
      if (subjects.length) await db.subjects.bulkAdd(subjects);
      if (data.entitySubjects) await db.entitySubjects.bulkAdd(data.entitySubjects);
      if (data.files) await db.files.bulkAdd(data.files);
      if (data.proceedingRoles) await db.proceedingRoles.bulkAdd(data.proceedingRoles);
      if (data.proceedingActions) await db.proceedingActions.bulkAdd(data.proceedingActions);
      if (data.proceedingLinks) await db.proceedingLinks.bulkAdd(data.proceedingLinks);
      if (customListItems.length) await db.customLists.bulkAdd(customListItems);
      if (data.userProfile && data.userProfile.length) await db.userProfile.bulkAdd(data.userProfile);
      if (data.archiviofatti && data.archiviofatti.length) await db.archiviofatti.bulkAdd(data.archiviofatti);
      if (data.archiviocircostanze && data.archiviocircostanze.length) await db.archiviocircostanze.bulkAdd(data.archiviocircostanze);
      if (data.archivioprovefatti && data.archivioprovefatti.length) await db.archivioprovefatti.bulkAdd(data.archivioprovefatti);
      if (data.archivioCircProofRels && data.archivioCircProofRels.length) await db.archivioCircProofRels.bulkAdd(data.archivioCircProofRels);
      if (data.archivioatti && data.archivioatti.length) await db.archivioatti.bulkAdd(data.archivioatti);
      if (data.pecMessages && data.pecMessages.length) await db.pecMessages.bulkAdd(data.pecMessages);
    });

    // Normalizzazione post-import: assegna proceedingGroupId ai procedimenti che non ce l'hanno
    const _allProcs = await db.proceedings.toArray();
    const _unassigned = _allProcs.filter(p => !p.proceedingGroupId);
    if (_unassigned.length > 0) {
      const _allGroups = await db.proceedingGroups.toArray();
      // Mappa: caseId_type → primo groupId
      const _firstGroupMap = {};
      for (const g of _allGroups.sort((a, b) => a.id - b.id)) {
        const _k = g.caseId + '_' + g.type;
        if (!_firstGroupMap[_k]) _firstGroupMap[_k] = g.id;
      }
      // Per ogni procedimento senza groupId, crea il gruppo se necessario e assegna
      for (const p of _unassigned) {
        const _k = p.caseId + '_' + p.type;
        if (!_firstGroupMap[_k]) {
          const newGrpId = await db.proceedingGroups.add({ caseId: p.caseId, type: p.type, createdAt: Date.now() });
          _firstGroupMap[_k] = newGrpId;
        }
        await db.proceedings.update(p.id, { proceedingGroupId: _firstGroupMap[_k] });
      }
    }
  },

  async getUserProfile() {
    await dbReady;
    const all = await db.userProfile.toArray();
    return all.length ? all[0] : null;
  },
  async saveUserProfile(data) {
    await dbReady;
    const existing = await db.userProfile.toArray();
    if (existing.length) {
      await db.userProfile.update(existing[0].id, data);
      return existing[0].id;
    } else {
      return await db.userProfile.add(data);
    }
  },


  /* ===== ARCHIVIO MEMO FATTI CRUD ===== */
  async getMemoFatti() {
    await dbReady;
    return await db.archiviofatti.toArray();
  },
  async getMemoFatto(id) {
    await dbReady;
    return await db.archiviofatti.get(id);
  },
  async createMemoFatto(data) {
    await dbReady;
    return await db.archiviofatti.add(data);
  },
  async updateMemoFatto(id, data) {
    await dbReady;
    await db.archiviofatti.update(id, data);
  },
  async deleteMemoFatto(id) {
    await dbReady;
    const circs = await db.archiviocircostanze.where('archivioFattoId').equals(id).toArray();
    for (const c of circs) {
      await db.archivioCircProofRels.where('archivioCircId').equals(c.id).delete();
      if (db.archivioCircActRels) await db.archivioCircActRels.where('archivioCircId').equals(c.id).delete();
    }
    await db.archiviocircostanze.where('archivioFattoId').equals(id).delete();
    // Cancella file su disco di tutte le prove memo
    const proofs = await db.archivioprovefatti.where('archivioFattoId').equals(id).toArray();
    for (const p of proofs) {
      await db.archivioCircProofRels.where('archivioProofId').equals(p.id).delete();
      if (db.archivioActProofRels) await db.archivioActProofRels.where('archivioProofId').equals(p.id).delete();
      await DB.deleteEntityFiles('archivioprovefatto', p.id);
    }
    await db.archivioprovefatti.where('archivioFattoId').equals(id).delete();
    // Cancella file su disco di tutti gli atti memo
    if (db.archivioatti) {
      const atti = await db.archivioatti.where('archivioFattoId').equals(id).toArray();
      for (const a of atti) {
        if (db.archivioCircActRels) await db.archivioCircActRels.where('archivioActId').equals(a.id).delete();
        if (db.archivioActProofRels) await db.archivioActProofRels.where('archivioActId').equals(a.id).delete();
        if (db.archivioActActRels) {
          await db.archivioActActRels.where('archivioActIdA').equals(a.id).delete();
          await db.archivioActActRels.where('archivioActIdB').equals(a.id).delete();
        }
        await DB.deleteEntityFiles('archivioatto', a.id);
      }
      await db.archivioatti.where('archivioFattoId').equals(id).delete();
    }
    await db.archiviofatti.delete(id);
  },
  async getMemoAtti(memoFattoId) {
    await dbReady;
    return await db.archivioatti.where('archivioFattoId').equals(memoFattoId).toArray();
  },
  async getMemoAtto(id) {
    await dbReady;
    return await db.archivioatti.get(id);
  },
  async createMemoAtto(data) {
    await dbReady;
    return await db.archivioatti.add(data);
  },
  async updateMemoAtto(id, data) {
    await dbReady;
    await db.archivioatti.update(id, data);
  },
  async deleteMemoAtto(id) {
    await dbReady;
    if (db.archivioCircActRels) await db.archivioCircActRels.where('archivioActId').equals(id).delete();
    if (db.archivioActProofRels) await db.archivioActProofRels.where('archivioActId').equals(id).delete();
    if (db.archivioActActRels) {
      await db.archivioActActRels.where('archivioActIdA').equals(id).delete();
      await db.archivioActActRels.where('archivioActIdB').equals(id).delete();
    }
    await DB.deleteEntityFiles('archivioatto', id);
    await db.archivioatti.delete(id);
  },
  async getMemoCircostanze(memoFattoId) {
    await dbReady;
    return await db.archiviocircostanze.where('archivioFattoId').equals(memoFattoId).toArray();
  },
  async getMemoCircostanza(id) {
    await dbReady;
    return await db.archiviocircostanze.get(id);
  },
  async createMemoCircostanza(data) {
    await dbReady;
    return await db.archiviocircostanze.add(data);
  },
  async updateMemoCircostanza(id, data) {
    await dbReady;
    await db.archiviocircostanze.update(id, data);
  },
  async deleteMemoCircostanza(id) {
    await dbReady;
    await db.archivioCircProofRels.where('archivioCircId').equals(id).delete();
    await db.archiviocircostanze.delete(id);
  },
  async getMemoProofs(memoFattoId) {
    await dbReady;
    return await db.archivioprovefatti.where('archivioFattoId').equals(memoFattoId).toArray();
  },
  async getMemoProof(id) {
    await dbReady;
    return await db.archivioprovefatti.get(id);
  },
  async createMemoProof(data) {
    await dbReady;
    return await db.archivioprovefatti.add(data);
  },
  async updateMemoProof(id, data) {
    await dbReady;
    await db.archivioprovefatti.update(id, data);
  },
  async deleteMemoProof(id) {
    await dbReady;
    await db.archivioCircProofRels.where('archivioProofId').equals(id).delete();
    if (db.archivioActProofRels) await db.archivioActProofRels.where('archivioProofId').equals(id).delete();
    await DB.deleteEntityFiles('archivioprovefatto', id);
    await db.archivioprovefatti.delete(id);
  },
  async getMemoCircProofRels(memoFattoId) {
    await dbReady;
    const circs = await db.archiviocircostanze.where('archivioFattoId').equals(memoFattoId).toArray();
    const circIds = circs.map(c => c.id);
    const all = await db.archivioCircProofRels.toArray();
    return all.filter(r => circIds.includes(r.archivioCircId));
  },
  async createMemoCircProofRel(archivioCircId, archivioProofId, relationType) {
    await dbReady;
    const existing = await db.archivioCircProofRels.where('archivioCircId').equals(archivioCircId).and(r => r.archivioProofId === archivioProofId).first();
    if (existing) {
      if (relationType && existing.relationType !== relationType) {
        await db.archivioCircProofRels.update(existing.id, { relationType });
      }
      return existing.id;
    }
    return await db.archivioCircProofRels.add({ archivioCircId, archivioProofId, relationType: relationType || null });
  },
  async deleteMemoCircProofRel(archivioCircId, archivioProofId) {
    await dbReady;
    await db.archivioCircProofRels.where('archivioCircId').equals(archivioCircId).and(r => r.archivioProofId === archivioProofId).delete();
  },

  // ── Memo: Circostanza ↔ Atto ────────────────────────────────────────────
  async getMemoCircActRels(memoFattoId) {
    await dbReady;
    const circs = await db.archiviocircostanze.where('archivioFattoId').equals(memoFattoId).toArray();
    const circIds = circs.map(c => c.id);
    const all = await db.archivioCircActRels.toArray();
    return all.filter(r => circIds.includes(r.archivioCircId));
  },
  async createMemoCircActRel(archivioCircId, archivioActId, posizioneAtto) {
    await dbReady;
    const existing = await db.archivioCircActRels.where('archivioCircId').equals(archivioCircId).and(r => r.archivioActId === archivioActId).first();
    if (existing) {
      if (posizioneAtto && existing.posizioneAtto !== posizioneAtto) {
        await db.archivioCircActRels.update(existing.id, { posizioneAtto });
      }
      return existing.id;
    }
    return await db.archivioCircActRels.add({ archivioCircId, archivioActId, posizioneAtto: posizioneAtto || null });
  },
  async deleteMemoCircActRel(archivioCircId, archivioActId) {
    await dbReady;
    await db.archivioCircActRels.where('archivioCircId').equals(archivioCircId).and(r => r.archivioActId === archivioActId).delete();
  },

  // ── Memo: Atto ↔ Prova ──────────────────────────────────────────────────
  async getMemoActProofRels(memoFattoId) {
    await dbReady;
    const atti = await db.archivioatti.where('archivioFattoId').equals(memoFattoId).toArray();
    const actIds = atti.map(a => a.id);
    const all = await db.archivioActProofRels.toArray();
    return all.filter(r => actIds.includes(r.archivioActId));
  },
  async createMemoActProofRel(archivioActId, archivioProofId, relationType) {
    await dbReady;
    const existing = await db.archivioActProofRels.where('archivioActId').equals(archivioActId).and(r => r.archivioProofId === archivioProofId).first();
    if (existing) {
      if (relationType && existing.relationType !== relationType) {
        await db.archivioActProofRels.update(existing.id, { relationType });
      }
      return existing.id;
    }
    return await db.archivioActProofRels.add({ archivioActId, archivioProofId, relationType: relationType || null });
  },
  async deleteMemoActProofRel(archivioActId, archivioProofId) {
    await dbReady;
    await db.archivioActProofRels.where('archivioActId').equals(archivioActId).and(r => r.archivioProofId === archivioProofId).delete();
  },

  // ── Memo: Atto ↔ Atto ───────────────────────────────────────────────────
  async getMemoActActRels(memoFattoId) {
    await dbReady;
    const atti = await db.archivioatti.where('archivioFattoId').equals(memoFattoId).toArray();
    const actIds = atti.map(a => a.id);
    const all = await db.archivioActActRels.toArray();
    return all.filter(r => actIds.includes(r.archivioActIdA) || actIds.includes(r.archivioActIdB));
  },
  async createMemoActActRel(archivioActIdA, archivioActIdB, relationType) {
    await dbReady;
    if (archivioActIdA === archivioActIdB) return null;
    const all = await db.archivioActActRels.toArray();
    const existing = all.find(r =>
      (r.archivioActIdA === archivioActIdA && r.archivioActIdB === archivioActIdB) ||
      (r.archivioActIdA === archivioActIdB && r.archivioActIdB === archivioActIdA));
    if (existing) {
      if (relationType && existing.relationType !== relationType) {
        await db.archivioActActRels.update(existing.id, { relationType });
      }
      return existing.id;
    }
    return await db.archivioActActRels.add({ archivioActIdA, archivioActIdB, relationType: relationType || null });
  },
  async deleteMemoActActRel(relId) {
    await dbReady;
    await db.archivioActActRels.delete(relId);
  },

  /* ===== ARCHIVIO PEC (trasversale ai casi) ===== */
  async getPecMessages() {
    await dbReady;
    return await db.pecMessages.toArray();
  },
  async getPecMessage(id) {
    await dbReady;
    return await db.pecMessages.get(id);
  },
  // Ritorna true se la PEC e collegata come prova/atto a un fatto, ovvero
  // se almeno un file della PEC e stato clonato come pointer in un'entita
  // di tipo 'proof' o 'act' (cfr. _pecClonePecFilesAsPointers in app.js).
  async pecHasProofOrActLink(pecId) {
    await dbReady;
    const srcFiles = await db.files.where({ entityType: 'pec', entityId: parseInt(pecId) }).toArray();
    const ids = srcFiles.map(f => f.id);
    if (!ids.length) return false;
    const pointers = await db.files.where('sourceFileId').anyOf(ids).toArray();
    return pointers.some(p => p.entityType === 'proof' || p.entityType === 'act');
  },
  async createPecMessage(data) {
    await dbReady;
    const rec = Object.assign({ createdAt: Date.now() }, data || {});
    const id = await db.pecMessages.add(rec);
    _autoSave();
    return id;
  },
  async updatePecMessage(id, data) {
    await dbReady;
    await db.pecMessages.update(id, data);
    _autoSave();
  },
  async deletePecMessage(id) {
    await dbReady;
    // Cancella i file fisici/record dei file della PEC e i record-puntatore (sourceFileId)
    const ownFiles = await db.files.where({ entityType: 'pec', entityId: id }).toArray();
    for (const f of ownFiles) {
      // cancella i puntatori che riferiscono i file originali della PEC
      const pointers = await db.files.where('sourceFileId').equals(f.id).toArray();
      for (const p of pointers) await db.files.delete(p.id);
    }
    await DB.deleteEntityFiles('pec', id);
    await db.pecMessages.delete(id);
    _autoSave();
  },
  async wipeAllPecMessages(progressCb) {
    await dbReady;
    const allPec = await db.pecMessages.toArray();
    const pecCount = allPec.length;
    const allPecFiles = await db.files.where('entityType').equals('pec').toArray();
    const fileCount = allPecFiles.length;
    let bytesFreed = 0;
    for (const f of allPecFiles) {
      if (typeof f.size === 'number' && f.size > 0) bytesFreed += f.size;
    }
    // FASE 1 — FILESYSTEM: cancella i file fisici PRIMA della transazione DB.
    // Fail-fast: se uno solo fallisce, abortiamo e non tocchiamo IndexedDB
    // (così lo stato resta coerente: l'utente può riprovare).
    // I record "puntatore" (sourceFileId != null) non hanno file fisico proprio.
    let i = 0;
    for (const f of allPecFiles) {
      i++;
      if (typeof progressCb === 'function') {
        try { progressCb(i, fileCount, f); } catch (_) {}
      }
      if (f.sourceFileId != null) continue;
      if (typeof deleteFileFromFS !== 'function') continue;
      try {
        await deleteFileFromFS(f);
      } catch (e) {
        const err = new Error('Cancellazione file fisico fallita per "' + (f.name || ('id=' + f.id)) + '": ' + (e && e.message ? e.message : e));
        err.fileId = f.id;
        err.phase = 'fs';
        throw err;
      }
    }
    // FASE 2 — DB: transazione atomica su files + pecMessages.
    // Se una qualunque delete fallisce, Dexie rollback dell'intera transazione.
    const pecFileIds = allPecFiles.map(f => f.id);
    await db.transaction('rw', db.files, db.pecMessages, async () => {
      // Cancella i record-puntatore (sourceFileId che riferiscono file PEC)
      if (pecFileIds.length > 0) {
        await db.files.where('sourceFileId').anyOf(pecFileIds).delete();
      }
      // Cancella tutti i record file PEC
      await db.files.where('entityType').equals('pec').delete();
      // Svuota la tabella PEC
      await db.pecMessages.clear();
    });
    _autoSave();
    return { pecCount, fileCount, bytesFreed };
  },

  // Whisper models: la fonte di verità è SOLO la cartella fisica `mod/<modello>/`.
  // Le seguenti API sono mantenute come no-op per compatibilità con codice legacy.
  // La vecchia base IndexedDB `UXGiustiziaModels` viene cancellata da `_purgeLegacyModelsDb()`.
  async hasModel(_modelName) { return false; },
  async getModelFiles(_modelName) { return null; },
  async saveModelFiles(_modelName, _filesMap) { /* no-op: solo cartella fisica */ },
  async deleteModel(_modelName) { /* no-op: solo cartella fisica */ },
  async listModels() { return []; },
  async _purgeLegacyModelsDb() {
    // Ritorna `true` se il DB legacy è stato cancellato; `false` se non era presente.
    // In caso di errore reale (es. `Dexie.delete` rifiutato dal browser) rilancia,
    // così `initApp` può evitare di settare il marker e ritentare al prossimo avvio.
    if (typeof Dexie === 'undefined' || !Dexie.delete) return false;
    if (Dexie.getDatabaseNames) {
      let names = null;
      try { names = await Dexie.getDatabaseNames(); } catch (_) { names = null; }
      if (names && names.indexOf && names.indexOf('UXGiustiziaModels') === -1) return false;
    }
    await Dexie.delete('UXGiustiziaModels');
    console.log('Legacy IDB UXGiustiziaModels purged.');
    return true;
  },

  // ============================================================
  // Jobs DB — "Lavori in corso" (trascrizioni, in futuro OCR/dettature ecc.)
  // ============================================================
  _jobsDb: null,
  async _getJobsDb() {
    if (DB._jobsDb) return DB._jobsDb;
    const jdb = new Dexie('UXGiustiziaJobs');
    jdb.version(1).stores({
      jobs: 'id, type, status, updatedAt',
      jobAssets: '++id, jobId',
      jobChunks: '++id, jobId, segmentIndex'
    });
    await jdb.open();
    DB._jobsDb = jdb;
    return jdb;
  },
  _generateJobId(type) {
    const t = new Date();
    const pad = (n, w) => String(n).padStart(w || 2, '0');
    const slug = (type || 'job').replace(/[^a-z0-9]+/gi, '').toLowerCase() || 'job';
    const rnd = Math.random().toString(36).slice(2, 6);
    return 'uxg-' + slug + '-' + t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate())
      + '-' + pad(t.getHours()) + pad(t.getMinutes()) + pad(t.getSeconds()) + '-' + rnd;
  },
  async createJob(jobData) {
    const jdb = await DB._getJobsDb();
    const now = Date.now();
    const d = jobData || {};
    const id = d.id || DB._generateJobId(d.type);
    const job = {
      id,
      type: d.type || 'unknown',
      title: d.title || '',
      status: d.status || 'active',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      percentComplete: d.percentComplete || 0,
      lang: d.lang || d.language || '',
      language: d.language || d.lang || '',
      model: d.model || '',
      contextCaseId: d.contextCaseId || null,
      audioName: d.audioName || '',
      audioSize: d.audioSize || 0,
      audioType: d.audioType || '',
      audioExt: d.audioExt || '',
      payload: d.payload || {}
    };
    await jdb.jobs.put(job);
    return job;
  },
  async updateJob(id, patch) {
    const jdb = await DB._getJobsDb();
    const cur = await jdb.jobs.get(id);
    if (!cur) return null;
    const merged = Object.assign({}, cur, patch);
    if (patch && patch.payload) {
      merged.payload = Object.assign({}, cur.payload || {}, patch.payload);
    }
    merged.updatedAt = Date.now();
    if (merged.status === 'completed' && !merged.completedAt) merged.completedAt = merged.updatedAt;
    await jdb.jobs.put(merged);
    return merged;
  },
  async getJob(id) {
    const jdb = await DB._getJobsDb();
    return await jdb.jobs.get(id);
  },
  async listJobs(filter) {
    const jdb = await DB._getJobsDb();
    let arr = await jdb.jobs.toArray();
    if (filter && filter.type) arr = arr.filter(j => j.type === filter.type);
    if (filter && filter.status) arr = arr.filter(j => j.status === filter.status);
    arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return arr;
  },
  async deleteJob(id) {
    const jdb = await DB._getJobsDb();
    await jdb.jobs.delete(id);
    await jdb.jobAssets.where('jobId').equals(id).delete();
    await jdb.jobChunks.where('jobId').equals(id).delete();
    if (typeof fsRemoveJobDir === 'function') {
      try { await fsRemoveJobDir(id); } catch (e) { console.warn('fsRemoveJobDir failed:', e); }
    }
  },
  async addJobAsset(jobId, asset) {
    const jdb = await DB._getJobsDb();
    const rec = Object.assign({ jobId, createdAt: Date.now() }, asset);
    return await jdb.jobAssets.add(rec);
  },
  async getJobAssets(jobId) {
    const jdb = await DB._getJobsDb();
    return await jdb.jobAssets.where('jobId').equals(jobId).toArray();
  },
  async updateJobAsset(assetId, updates) {
    const jdb = await DB._getJobsDb();
    return await jdb.jobAssets.update(assetId, updates);
  },
  async appendJobChunks(jobId, chunks) {
    if (!chunks || !chunks.length) return;
    const jdb = await DB._getJobsDb();
    const existing = await jdb.jobChunks.where('jobId').equals(jobId).count();
    const records = chunks.map((c, i) => Object.assign(
      { jobId, segmentIndex: existing + i }, c
    ));
    await jdb.jobChunks.bulkAdd(records);
  },
  async setJobChunks(jobId, chunks) {
    const jdb = await DB._getJobsDb();
    await jdb.jobChunks.where('jobId').equals(jobId).delete();
    if (chunks && chunks.length) {
      const records = chunks.map((c, i) => Object.assign(
        { jobId, segmentIndex: i }, c
      ));
      await jdb.jobChunks.bulkAdd(records);
    }
  },
  async getJobChunks(jobId) {
    const jdb = await DB._getJobsDb();
    const arr = await jdb.jobChunks.where('jobId').equals(jobId).toArray();
    arr.sort((a, b) => (a.segmentIndex || 0) - (b.segmentIndex || 0));
    return arr;
  }
};
