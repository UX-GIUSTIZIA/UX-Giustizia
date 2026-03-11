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

const _SEED_FALLBACK = { categories: [
  { labelIt:'Magistratura', labelEn:'Judiciary', subcategories:[{labelIt:'Magistrati Inquirenti',labelEn:'Investigating Magistrates'},{labelIt:'Magistrati Giudicanti',labelEn:'Judging Magistrates'}] },
  { labelIt:'Amministrazione della Giustizia', labelEn:'Justice Administration', subcategories:[{labelIt:'Cancelleria',labelEn:'Court Registry'},{labelIt:'Dirigenza amministrativa',labelEn:'Administrative Management'},{labelIt:'Personale giudiziario',labelEn:'Court Staff'},{labelIt:'Polizia Penitenziaria',labelEn:'Prison Police'}] },
  { labelIt:"Forze dell'Ordine", labelEn:'Law Enforcement', subcategories:[{labelIt:'Polizia di Stato',labelEn:'State Police'},{labelIt:'Carabinieri',labelEn:'Carabinieri'},{labelIt:'Guardia di Finanza',labelEn:'Financial Police'},{labelIt:'Polizia Penitenziaria',labelEn:'Prison Police'},{labelIt:'Polizia Locale',labelEn:'Local Police'}] },
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
          await sysDb.subcategories.add({ labelIt: sub.labelIt, labelEn: sub.labelEn, categoryId: catId });
        }
      }
    }
    console.log('System DB: reseeded from inline fallback data.');
  },
  async getCategories() {
    await sysDbReady;
    return await sysDb.categories.toArray();
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
  console.log('All databases initialized.');
}

const ROLE_CATALOGS = {
  penale: ['pm', 'gip', 'giudice_dibattimento', 'indagato', 'imputato', 'parte_offesa', 'difensore', 'ctu', 'ausiliario_pg'],
  civile: ['attore', 'convenuto', 'giudice', 'ctu', 'curatore', 'difensore', 'consulente_parte'],
  amministrativo: ['ricorrente', 'resistente', 'giudice', 'commissario', 'difensore'],
  esecuzione: ['giudice_esecuzione', 'creditore_procedente', 'debitore', 'custode', 'delegato_vendita', 'perito'],
  altro: ['parte', 'giudice', 'difensore', 'consulente', 'perito']
};

const ACTION_TYPES = [
  'richiesta', 'ordinanza', 'archiviazione', 'omissione', 'deposito',
  'perizia', 'udienza', 'sentenza', 'decreto', 'notifica', 'impugnazione', 'altro'
];

const LINK_TYPES = ['collegato', 'presupposto', 'conseguente', 'derivato'];

const CIRCUMSTANCE_TYPES = ['temporale', 'modale', 'soggettiva', 'tecnica'];

const FACT_POSITIONS = ['afferma', 'nega', 'omette', 'travisa', 'non_pronuncia'];

function _autoSave() {
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
    const acts = await db.acts.where('dossierId').equals(id).toArray();
    for (const a of acts) await DB.deleteAct(a.id);
    const facts = await db.facts.where('dossierId').equals(id).toArray();
    for (const f of facts) await DB.deleteFact(f.id);
    await db.entitySubjects.where({ entityType: 'dossier', entityId: id }).delete();
    await DB.deleteEntityFiles('dossier', id);
    await db.dossiers.delete(id);
    _autoSave();
  },

  async getActs(dossierId) {
    return await db.acts.where('dossierId').equals(dossierId).toArray();
  },
  async getAllActs() {
    return await db.acts.toArray();
  },
  async getAct(id) {
    return await db.acts.get(id);
  },
  async createAct(data) {
    if (data.dossierId != null && data.sortOrder == null) {
      const existing = await db.acts.where('dossierId').equals(data.dossierId).toArray();
      data.sortOrder = existing.length > 0 ? Math.max(...existing.map(a => a.sortOrder || 0)) + 1 : 0;
    }
    const id = await db.acts.add(data);
    _autoSave();
    return { ...data, id };
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
    await db.acts.delete(id);
    _autoSave();
  },

  async getFactsByDossier(dossierId) {
    return await db.facts.where('dossierId').equals(dossierId).toArray();
  },
  async getAllFacts() {
    return await db.facts.toArray();
  },
  async getFact(id) {
    return await db.facts.get(id);
  },
  async createFact(data) {
    if (data.dossierId != null && data.sortOrder == null) {
      const existing = await db.facts.where('dossierId').equals(data.dossierId).toArray();
      data.sortOrder = existing.length > 0 ? Math.max(...existing.map(f => f.sortOrder || 0)) + 1 : 0;
    }
    const id = await db.facts.add(data);
    _autoSave();
    return { ...data, id };
  },
  async updateFact(id, data) {
    await db.facts.update(id, data);
    _autoSave();
    return { ...data, id };
  },
  async deleteFact(id) {
    await db.factProofRelations.where('factId').equals(id).delete();
    const circs = await db.circumstances.where('factId').equals(id).toArray();
    for (const c of circs) {
      await db.circumstanceProofRelations.where('circumstanceId').equals(c.id).delete();
    }
    await db.circumstances.where('factId').equals(id).delete();
    await db.factActRelations.where('factId').equals(id).delete();
    await db.violations.where('factId').equals(id).delete();
    await DB.deleteEntityFiles('fact', id);
    await db.entitySubjects.where({ entityType: 'fact', entityId: id }).delete();
    await db.facts.delete(id);
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
    await db.circumstanceActRelations.where('circumstanceId').equals(id).delete();
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
    return await db.proofs.get(id);
  },
  async createProof(data) {
    const { factId, relationType, ...proofData } = data;
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
    const id = await db.proofs.add(proofData);
    if (factId) {
      await db.factProofRelations.add({ factId, proofId: id, relationType: relationType || 'confirms' });
    }
    _autoSave();
    return { ...proofData, id, factId, relationType };
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
    await db.violations.delete(id);
    _autoSave();
  },
  async deleteViolationsByFact(factId) {
    await db.violations.where('factId').equals(factId).delete();
    _autoSave();
  },
  async deleteViolationsByAct(actId) {
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
      result.push({ ...link, entity });
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
  async updateFile(id, data) {
    await db.files.update(id, data);
    _autoSave();
  },
  async deleteFile(id) {
    await db.files.delete(id);
    _autoSave();
  },
  async deleteEntityFiles(entityType, entityId) {
    const files = await db.files.where({ entityType, entityId }).toArray();
    for (const f of files) {
      if (typeof deleteFileFromFS === 'function') {
        try { await deleteFileFromFS(f); } catch (e) { console.log('Could not delete file from FS:', e); }
      }
    }
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

  computeLogicalState(factActRelations, proofs) {
    if (!proofs || proofs.length === 0) return 'NO_PROOFS';
    if (!factActRelations || factActRelations.length === 0) return 'NO_PROOFS';

    const positions = factActRelations.map(r => r.posizioneAtto).filter(Boolean);
    const relTypes = proofs.map(p => p.relationType).filter(Boolean);

    const hasConfirms = relTypes.includes('confirms');
    const hasContradicts = relTypes.includes('contradicts');

    const hasAfferma = positions.includes('afferma');
    const hasNega = positions.includes('nega');
    const hasTravisa = positions.includes('travisa');
    const hasOmette = positions.includes('omette');
    const hasNonPronuncia = positions.includes('non_pronuncia');

    if ((hasNega || hasTravisa) && hasConfirms) return 'INCOHERENCE';
    if (hasAfferma && hasContradicts) return 'INCOHERENCE';
    if ((hasOmette || hasNonPronuncia) && (hasConfirms || hasContradicts)) return 'OMISSION';

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
      proofs: await db.proofs.toArray(),
      violations: await db.violations.toArray(),
      subjects: await db.subjects.toArray(),
      entitySubjects: await db.entitySubjects.toArray(),
      files: await db.files.toArray(),
      proceedingRoles: await db.proceedingRoles.toArray(),
      proceedingActions: await db.proceedingActions.toArray(),
      proceedingLinks: await db.proceedingLinks.toArray(),
      customLists: await db.customLists.toArray()
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
    if (factProofRelations.length === 0 && proofs.some(p => p.factId)) {
      let nextFprId = 1;
      for (const pr of proofs) {
        if (pr.factId) {
          factProofRelations.push({
            id: nextFprId++,
            factId: pr.factId,
            proofId: pr.id,
            relationType: pr.relationType || 'confirms'
          });
        }
      }
    }
    for (const pr of proofs) {
      delete pr.factId;
      delete pr.relationType;
    }

    await db.transaction('rw', [db.cases, db.proceedings, db.dossiers, db.acts, db.facts, db.circumstances, db.factActRelations, db.factProofRelations, db.circumstanceProofRelations, db.actProofRelations, db.circumstanceActRelations, db.proofs, db.violations, db.subjects, db.entitySubjects, db.files, db.proceedingRoles, db.proceedingActions, db.proceedingLinks, db.customLists], async () => {
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
      await db.proofs.clear();
      await db.violations.clear();
      await db.subjects.clear();
      await db.entitySubjects.clear();
      await db.files.clear();
      await db.proceedingRoles.clear();
      await db.proceedingActions.clear();
      await db.proceedingLinks.clear();
      await db.customLists.clear();

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
      if (proofs.length) await db.proofs.bulkAdd(proofs);
      if (data.violations) await db.violations.bulkAdd(data.violations);
      if (subjects.length) await db.subjects.bulkAdd(subjects);
      if (data.entitySubjects) await db.entitySubjects.bulkAdd(data.entitySubjects);
      if (data.files) await db.files.bulkAdd(data.files);
      if (data.proceedingRoles) await db.proceedingRoles.bulkAdd(data.proceedingRoles);
      if (data.proceedingActions) await db.proceedingActions.bulkAdd(data.proceedingActions);
      if (data.proceedingLinks) await db.proceedingLinks.bulkAdd(data.proceedingLinks);
      if (customListItems.length) await db.customLists.bulkAdd(customListItems);
    });
  },

  _modelsDb: null,
  async _getModelsDb() {
    if (DB._modelsDb) return DB._modelsDb;
    const mdb = new Dexie('UXGiustiziaModels');
    mdb.version(1).stores({ models: 'name' });
    await mdb.open();
    DB._modelsDb = mdb;
    return mdb;
  },
  async hasModel(modelName) {
    const mdb = await DB._getModelsDb();
    const rec = await mdb.models.get(modelName);
    return !!(rec && rec.files && Object.keys(rec.files).length > 0);
  },
  async getModelFiles(modelName) {
    const mdb = await DB._getModelsDb();
    const rec = await mdb.models.get(modelName);
    return rec ? rec.files : null;
  },
  async saveModelFiles(modelName, filesMap) {
    const mdb = await DB._getModelsDb();
    await mdb.models.put({ name: modelName, files: filesMap });
  },
  async deleteModel(modelName) {
    const mdb = await DB._getModelsDb();
    await mdb.models.delete(modelName);
  },
  async listModels() {
    const mdb = await DB._getModelsDb();
    return await mdb.models.toArray();
  }
};
