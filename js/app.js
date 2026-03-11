'use strict';

(function initSidebarResize() {
  const MIN_W = 180, MAX_W = 500;
  const saved = localStorage.getItem('uxg_sidebar_width');
  if (saved) {
    document.documentElement.style.setProperty('--sidebar-width', saved + 'px');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const handle = document.getElementById('resizeHandle');
    const layout = document.querySelector('.app-layout');
    if (!handle || !layout) return;
    let dragging = false;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = layout.getBoundingClientRect();
      let w = e.clientX - rect.left;
      if (w < MIN_W) w = MIN_W;
      if (w > MAX_W) w = MAX_W;
      layout.style.setProperty('--sidebar-width', w + 'px');
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const w = getComputedStyle(layout).getPropertyValue('--sidebar-width');
      localStorage.setItem('uxg_sidebar_width', parseInt(w));
    });
  });
})();

const PROCEDURAL_ROLES = [
  'indagato', 'imputato', 'testimone', 'persona_offesa',
  'parte_civile', 'responsabile_civile', 'civilmente_obbligato',
  'querelante', 'denunciante', 'interventore',
  'pm', 'gip', 'gup', 'giudice_dibattimento', 'giudice_appello', 'giudice_cassazione', 'magistrato',
  'altro'
];

const PHASE_TO_MAGISTRATE_ROLE = {
  'fase_procura': 'pm',
  'fase_gip_fase': 'gip',
  'fase_gup': 'gup',
  'fase_dibattimento_fase': 'giudice_dibattimento',
  'fase_appello_penale': 'giudice_appello',
  'fase_cassazione_penale': 'giudice_cassazione',
  'fase_esecuzione_penale': 'magistrato',
  'fase_appello_civile': 'giudice_appello',
  'fase_cassazione_civile': 'giudice_cassazione'
};

const PM_EVENT_SUBTYPES = {
  'pm_tipo_investigativo': [
    'pm_inv_delega_pg', 'pm_inv_perquisizione', 'pm_inv_sequestro',
    'pm_inv_nomina_ct', 'pm_inv_interrogatorio', 'pm_inv_informazioni',
    'pm_inv_ispezione', 'pm_inv_intercettazioni_delega', 'pm_inv_altro'
  ],
  'pm_tipo_richiesta_gip': [
    'pm_gip_misura_cautelare', 'pm_gip_intercettazioni',
    'pm_gip_incidente_probatorio', 'pm_gip_proroga_indagini', 'pm_gip_convalida_arresto'
  ],
  'pm_tipo_azione_penale': [
    'pm_az_richiesta_archiviazione', 'pm_az_rinvio_giudizio',
    'pm_az_citazione_diretta', 'pm_az_decreto_penale',
    'pm_az_giudizio_immediato', 'pm_az_giudizio_direttissimo'
  ]
};

const PM_DECISION_NEXT_PHASE = {
  'pm_az_richiesta_archiviazione': 'fase_gip_fase',
  'pm_az_rinvio_giudizio': 'fase_gup',
  'pm_az_citazione_diretta': 'fase_dibattimento_fase',
  'pm_az_decreto_penale': 'fase_gip_fase',
  'pm_az_giudizio_immediato': 'fase_dibattimento_fase',
  'pm_az_giudizio_direttissimo': 'fase_dibattimento_fase'
};

const GIP_EVENT_SUBTYPES = {
  'gip_tipo_decisione_pm': [
    'gip_dec_autorizza_cautelare', 'gip_dec_rigetta_cautelare',
    'gip_dec_autorizza_intercettazioni', 'gip_dec_rigetta_intercettazioni',
    'gip_dec_autorizza_proroga', 'gip_dec_rigetta_proroga',
    'gip_dec_emissione_decreto_penale', 'gip_dec_rigetta_decreto_penale',
    'gip_dec_archiviazione_pm', 'gip_dec_restituzione_atti_pm'
  ],
  'gip_tipo_opposizione': [
    'gip_opp_archiviazione_rigetto', 'gip_opp_udienza_camerale',
    'gip_opp_nuove_indagini', 'gip_opp_imputazione_coatta'
  ],
  'gip_tipo_provvedimento_autonomo': [
    'gip_aut_convalida_arresto', 'gip_aut_convalida_sequestro',
    'gip_aut_applicazione_cautelare', 'gip_aut_revoca_cautelare'
  ]
};

const GIP_DECISION_EFFECTS = {
  'gip_dec_archiviazione_pm': { closesPhase: true },
  'gip_opp_archiviazione_rigetto': { closesPhase: true },
  'gip_opp_imputazione_coatta': { nextPhase: 'fase_gup' },
  'gip_opp_nuove_indagini': { returnPhase: 'fase_procura' },
  'gip_dec_restituzione_atti_pm': { returnPhase: 'fase_procura' }
};

const GUP_EVENT_SUBTYPES = {
  'gup_tipo_valutazione': [
    'gup_val_non_luogo', 'gup_val_rinvio_giudizio', 'gup_val_restituzione_atti'
  ],
  'gup_tipo_processuale': [
    'gup_proc_modifica_imputazione', 'gup_proc_riqualificazione',
    'gup_proc_ammissione_prove', 'gup_proc_nullita'
  ],
  'gup_tipo_definizione': [
    'gup_def_patteggiamento', 'gup_def_abbreviato', 'gup_def_messa_prova'
  ]
};

const GUP_DECISION_EFFECTS = {
  'gup_val_non_luogo': { closesPhase: true },
  'gup_val_rinvio_giudizio': { nextPhase: 'fase_dibattimento_fase' },
  'gup_val_restituzione_atti': { returnPhase: 'fase_procura' },
  'gup_def_patteggiamento': { closesPhase: true },
  'gup_def_abbreviato': { closesPhase: true },
  'gup_def_messa_prova': { closesPhase: true }
};

const DIB_EVENT_SUBTYPES = {
  'dib_tipo_preliminare': [
    'dib_prel_costituzione_parti', 'dib_prel_questioni_preliminari',
    'dib_prel_ammissione_prove', 'dib_prel_nullita', 'dib_prel_rinvio'
  ],
  'dib_tipo_istruzione': [
    'dib_istr_escussione_testi', 'dib_istr_esame_imputato',
    'dib_istr_esame_consulenti', 'dib_istr_produzione_documenti', 'dib_istr_perizia'
  ],
  'dib_tipo_decisione': [
    'dib_dec_condanna', 'dib_dec_assoluzione', 'dib_dec_proscioglimento',
    'dib_dec_non_doversi_procedere'
  ],
  'dib_tipo_incidentale': [
    'dib_inc_revoca_cautelare', 'dib_inc_modifica_misura',
    'dib_inc_sospensione', 'dib_inc_separazione'
  ]
};

const DIB_DECISION_EFFECTS = {
  'dib_dec_condanna': { closesPhase: true, enablesAppeal: true },
  'dib_dec_assoluzione': { closesPhase: true, enablesAppeal: true },
  'dib_dec_proscioglimento': { closesPhase: true, enablesAppeal: true },
  'dib_dec_non_doversi_procedere': { closesPhase: true, enablesAppeal: true }
};

const APP_EVENT_SUBTYPES = {
  'app_tipo_ammissibilita': [
    'app_amm_tempestivita', 'app_amm_legittimazione',
    'app_amm_inammissibilita', 'app_amm_ammissibilita'
  ],
  'app_tipo_istruttoria': [
    'app_istr_rinnovazione', 'app_istr_nuovi_atti',
    'app_istr_escussione_testi', 'app_istr_perizia'
  ],
  'app_tipo_decisione': [
    'app_dec_conferma', 'app_dec_riforma', 'app_dec_annullamento',
    'app_dec_proscioglimento', 'app_dec_rideterminazione_pena'
  ],
  'app_tipo_incidentale': [
    'app_inc_sospensione_esecutivita', 'app_inc_revoca_cautelare', 'app_inc_rinvio'
  ]
};

const APP_DECISION_EFFECTS = {
  'app_amm_inammissibilita': { closesPhase: true },
  'app_dec_conferma': { closesPhase: true, enablesCassazione: true },
  'app_dec_riforma': { closesPhase: true, enablesCassazione: true },
  'app_dec_annullamento': { returnPhase: 'fase_dibattimento_fase' },
  'app_dec_proscioglimento': { closesPhase: true },
  'app_dec_rideterminazione_pena': { closesPhase: true, enablesCassazione: true }
};

const CASS_EVENT_SUBTYPES = {
  'cass_tipo_ammissibilita': [
    'cass_amm_termini', 'cass_amm_motivi', 'cass_amm_inammissibilita', 'cass_amm_ammissibilita'
  ],
  'cass_tipo_decisione': [
    'cass_dec_rigetto', 'cass_dec_annullamento_senza_rinvio',
    'cass_dec_annullamento_con_rinvio', 'cass_dec_annullamento_parziale'
  ],
  'cass_tipo_accessorio': [
    'cass_acc_correzione_errore', 'cass_acc_sospensione_esecuzione', 'cass_acc_rimessione'
  ]
};

const CASS_DECISION_EFFECTS = {
  'cass_amm_inammissibilita': { closesPhase: true, definitive: true },
  'cass_dec_rigetto': { closesPhase: true, definitive: true },
  'cass_dec_annullamento_senza_rinvio': { closesPhase: true, definitive: true },
  'cass_dec_annullamento_con_rinvio': { returnPhase: 'fase_appello_penale' },
  'cass_dec_annullamento_parziale': { closesPhase: true }
};

const ESEC_EVENT_SUBTYPES = {
  'esec_tipo_attivazione': [
    'esec_att_ordine_carcerazione', 'esec_att_pena_pecuniaria',
    'esec_att_sospensione_carcerazione', 'esec_att_cumulo_pene'
  ],
  'esec_tipo_incidente': [
    'esec_inc_errore_materiale', 'esec_inc_continuazione',
    'esec_inc_rideterminazione', 'esec_inc_esecutivita'
  ],
  'esec_tipo_misure_alternative': [
    'esec_alt_affidamento_prova', 'esec_alt_detenzione_domiciliare',
    'esec_alt_semiliberta', 'esec_alt_liberazione_anticipata', 'esec_alt_revoca_beneficio'
  ],
  'esec_tipo_estinzione': [
    'esec_est_espiazione', 'esec_est_prescrizione',
    'esec_est_amnistia', 'esec_est_indulto', 'esec_est_morte'
  ]
};

const ESEC_DECISION_EFFECTS = {
  'esec_est_espiazione': { closesPhase: true, definitive: true },
  'esec_est_prescrizione': { closesPhase: true, definitive: true },
  'esec_est_amnistia': { closesPhase: true, definitive: true },
  'esec_est_indulto': { closesPhase: true, definitive: true },
  'esec_est_morte': { closesPhase: true, definitive: true }
};

const PM_DECISION_EFFECTS = {
  'pm_az_richiesta_archiviazione': { nextPhase: 'fase_gip_fase' },
  'pm_az_rinvio_giudizio': { nextPhase: 'fase_gup' },
  'pm_az_citazione_diretta': { nextPhase: 'fase_dibattimento_fase' },
  'pm_az_decreto_penale': { nextPhase: 'fase_gip_fase' },
  'pm_az_giudizio_immediato': { nextPhase: 'fase_dibattimento_fase' },
  'pm_az_giudizio_direttissimo': { nextPhase: 'fase_dibattimento_fase' }
};

const PHASE_EVENT_CONFIG = {
  'fase_procura':           { subtypes: PM_EVENT_SUBTYPES,   effects: PM_DECISION_EFFECTS,    label: 'pmEventsSection',   addLabel: 'addPmEvent',   removeLabel: 'removePmEvent',   tipoLabel: 'pmTipoIntervento',   sottoLabel: 'pmSottoTipo',   isPmStyle: true },
  'fase_gip_fase':          { subtypes: GIP_EVENT_SUBTYPES,  effects: GIP_DECISION_EFFECTS,   label: 'gipEventsSection',  addLabel: 'addGipEvent',  removeLabel: 'removePhaseEvent', tipoLabel: 'gipTipoIntervento',  sottoLabel: 'gipSottoTipo' },
  'fase_gup':               { subtypes: GUP_EVENT_SUBTYPES,  effects: GUP_DECISION_EFFECTS,   label: 'gupEventsSection',  addLabel: 'addGupEvent',  removeLabel: 'removePhaseEvent', tipoLabel: 'gupTipoIntervento',  sottoLabel: 'gupSottoTipo' },
  'fase_dibattimento_fase': { subtypes: DIB_EVENT_SUBTYPES,  effects: DIB_DECISION_EFFECTS,   label: 'dibEventsSection',  addLabel: 'addDibEvent',  removeLabel: 'removePhaseEvent', tipoLabel: 'dibTipoIntervento',  sottoLabel: 'dibSottoTipo' },
  'fase_appello_penale':    { subtypes: APP_EVENT_SUBTYPES,  effects: APP_DECISION_EFFECTS,   label: 'appEventsSection',  addLabel: 'addAppEvent',  removeLabel: 'removePhaseEvent', tipoLabel: 'appTipoIntervento',  sottoLabel: 'appSottoTipo' },
  'fase_cassazione_penale': { subtypes: CASS_EVENT_SUBTYPES, effects: CASS_DECISION_EFFECTS,  label: 'cassEventsSection', addLabel: 'addCassEvent', removeLabel: 'removePhaseEvent', tipoLabel: 'cassTipoIntervento', sottoLabel: 'cassSottoTipo' },
  'fase_esecuzione_penale': { subtypes: ESEC_EVENT_SUBTYPES, effects: ESEC_DECISION_EFFECTS,  label: 'esecEventsSection', addLabel: 'addEsecEvent', removeLabel: 'removePhaseEvent', tipoLabel: 'esecTipoIntervento', sottoLabel: 'esecSottoTipo' }
};

const SALUTATION_LIST = [
  { group: 'Civili', items: ['Sig.', 'Sig.ra', 'Sig.na'] },
  { group: 'Legali', items: ['Avv.', 'Avv.ssa', 'Giudice', 'Pres.', 'Proc.', 'Sost. Proc.', 'Cons.', 'Mag.', 'Canc.'] },
  { group: 'Sanitari', items: ['Dott.', 'Dott.ssa', 'Prof.', 'Prof.ssa', 'Farmacista'] },
  { group: 'Tecnici', items: ['Ing.', 'Arch.', 'Geom.', 'Rag.', 'Per. Ind.', 'Per. Agr.', 'Agr.', 'Notaio'] },
  { group: 'Politici/Istituzionali', items: ['On.', 'Sen.', 'Min.', 'Pref.', 'Sindaco', 'Assessore', 'Consigliere', 'Ambasciatore', 'Console'] },
  { group: 'Religiosi', items: ['Don', 'Mons.', 'Rev.', 'S.E.', 'Card.', 'Padre', 'Suor'] },
  { group: 'Esercito Italiano', items: [
    'Soldato', 'Soldato Sc.', 'Caporale', 'Caporal Magg.', 'Caporal Magg. Sc.',
    'Sergente', 'Serg. Magg.', 'Serg. Magg. Capo',
    'Mar.', 'Mar. Ord.', 'Mar. Capo', 'Mar. Aiut.', 'Primo Mar.',
    'S.Ten.', 'Ten.', 'Cap.', 'Magg.', 'Ten. Col.', 'Col.',
    'Gen. B.', 'Gen. D.', 'Gen. C.A.', 'Gen.'
  ]},
  { group: 'Arma dei Carabinieri', items: [
    'Carabiniere', 'Carabiniere Sc.', 'App. CC', 'App. Sc. CC',
    'Brig. CC', 'Brig. Capo CC', 'Mar. CC', 'Mar. Ord. CC', 'Mar. Capo CC', 'Mar. Aiut. CC', 'Lgt. CC',
    'S.Ten. CC', 'Ten. CC', 'Cap. CC', 'Magg. CC', 'Ten. Col. CC', 'Col. CC',
    'Gen. B. CC', 'Gen. D. CC', 'Gen. C.A. CC', 'Comandante Gen. CC'
  ]},
  { group: 'Polizia di Stato', items: [
    'Ag. PS', 'Ag. Sc. PS', 'Ass. PS', 'Ass. Capo PS',
    'Sovr. PS', 'Sovr. Capo PS', 'Sovr. Coord. PS',
    'Isp. PS', 'Isp. Sup. PS', 'Isp. Capo PS',
    'Comm. PS', 'Comm. Capo PS', 'Vice Questore', 'Primo Dir. PS', 'Dir. Sup. PS', 'Questore', 'Pref. PS'
  ]},
  { group: 'Guardia di Finanza', items: [
    'Fin.', 'Fin. Sc.', 'App. GdF', 'App. Sc. GdF',
    'Brig. GdF', 'Brig. Capo GdF', 'Mar. GdF', 'Mar. Ord. GdF', 'Mar. Capo GdF', 'Mar. Aiut. GdF', 'Lgt. GdF',
    'S.Ten. GdF', 'Ten. GdF', 'Cap. GdF', 'Magg. GdF', 'Ten. Col. GdF', 'Col. GdF',
    'Gen. B. GdF', 'Gen. D. GdF', 'Gen. C.A. GdF', 'Comandante Gen. GdF'
  ]},
  { group: 'Polizia Penitenziaria', items: [
    'Ag. PP', 'Ag. Sc. PP', 'Ass. PP', 'Ass. Capo PP',
    'Sovr. PP', 'Sovr. Capo PP',
    'Isp. PP', 'Isp. Sup. PP', 'Isp. Capo PP',
    'Comm. PP', 'Comm. Capo PP', 'Dir. PP'
  ]},
  { group: 'Corpo Forestale / Carabinieri Forestali', items: [
    'Carabiniere Forestale', 'App. Forestale', 'Brig. Forestale', 'Mar. Forestale',
    'S.Ten. Forestale', 'Ten. Forestale', 'Cap. Forestale', 'Magg. Forestale',
    'Ten. Col. Forestale', 'Col. Forestale', 'Gen. Forestale'
  ]},
  { group: 'Guardia Costiera', items: [
    'Sottocapo GC', 'Capo GC', 'Secondo Capo GC', 'Serg. GC',
    'Mar. GC', 'Mar. Capo GC', 'Primo Mar. GC',
    'Guardiamarina GC', 'S.Ten. Vasc. GC', 'Ten. Vasc. GC', 'Cap. Corv. GC',
    'Cap. Fregata GC', 'Cap. Vasc. GC', 'Contrammiraglio GC', 'Ammiraglio GC'
  ]},
  { group: 'Marina Militare', items: [
    'Marinaio', 'Sottocapo', 'Capo', 'Secondo Capo', 'Serg. MM',
    'Mar. MM', 'Mar. Capo MM', 'Primo Mar. MM',
    'Guardiamarina', 'S.Ten. Vasc.', 'Ten. Vasc.', 'Cap. Corv.',
    'Cap. Fregata', 'Cap. Vasc.', 'Contrammiraglio', 'Ammiraglio Div.', 'Ammiraglio Sq.', 'Ammiraglio'
  ]},
  { group: 'Aeronautica Militare', items: [
    'Aviere', 'Aviere Sc.', 'Primo Aviere', 'Serg. AM', 'Serg. Magg. AM',
    'Mar. AM', 'Mar. Ord. AM', 'Mar. Capo AM', 'Mar. Aiut. AM', 'Primo Mar. AM',
    'S.Ten. AM', 'Ten. AM', 'Cap. AM', 'Magg. AM', 'Ten. Col. AM', 'Col. AM',
    'Gen. B.A.', 'Gen. S.A.', 'Gen. A.S.', 'Gen. A.'
  ]}
];

function _flatSalutationList() {
  const flat = [];
  for (const g of SALUTATION_LIST) {
    for (const item of g.items) {
      flat.push({ label: item, group: g.group });
    }
  }
  return flat;
}

const appMode = 'creator';

let state = {
  selection: null,
  activeSubjectId: null,
  expanded: {},
  pendingFiles: { it: [], en: [] },
  pendingFilesOrigin: { it: [], en: [] },
  pendingProofFiles: { it: [], en: [] },
  activeTab: 'identification',
  indagati: [],
  openForm: null
};

function isCreator() {
  return true;
}

function creatorOnly(html) {
  return html;
}

function initApp() {
  updateFsLogo();
  renderAll();
}

async function renderAll() {
  applyI18n();
  const normePanel = document.getElementById('normeView');
  const rolesPanel = document.getElementById('rolesView');
  const inNorme = normePanel && normePanel.classList.contains('archive-view');
  const inRoles = rolesPanel && rolesPanel.classList.contains('archive-view');
  if (inNorme || inRoles) {
    if (inNorme) { _activateArchiveView('normeView'); _renderNormeView(); }
    if (inRoles) { _activateArchiveView('rolesView'); _renderRolesView(); }
    return;
  }
  await renderTree();
  await renderSubjects();
  if (state.openForm) {
    const f = state.openForm;
    if (f.type === 'case') await showCaseForm(f.editId);
    else if (f.type === 'proceeding') await showProceedingForm(f.parentId, f.editId);
    else if (f.type === 'dossier') await showDossierForm(f.parentId, f.editId);
    else if (f.type === 'act') await showActForm(f.parentId, f.editId);
    else if (f.type === 'fact') await showFactForm(f.parentId, f.editId);
    else if (f.type === 'subject') await showSubjectForm(f.editId);
    else if (f.type === 'circumstance') await showCircumstanceForm(f.parentId, f.editId);
  } else if (state.selection) {
    await showDetail(state.selection.type, state.selection.id);
  } else if (state.activeSubjectId) {
    await showSubjectDetail(state.activeSubjectId);
  } else {
    await renderDashboard();
  }
}

function goToDashboard() {
  state.selection = null;
  state.activeSubjectId = null;
  hideAllPanels();
  document.getElementById('welcomeView').style.display = 'block';
  renderDashboard();
}

/* ========== DASHBOARD ========== */
let dashboardTimelineZoom = 1;

async function renderDashboard() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  const cases = await DB.getCases();
  const allProcs = await DB.getAllProceedings();

  let totalDossiers = 0, totalActs = 0;
  for (const p of allProcs) {
    const dossiers = await DB.getDossiers(p.id);
    totalDossiers += dossiers.length;
    for (const d of dossiers) {
      const acts = await DB.getActs(d.id);
      totalActs += acts.length;
    }
  }

  const allEvents = [];
  for (const proc of allProcs) {
    const sd = proc.specificData || {};
    const phases = sd.phases || [];
    const caseObj = cases.find(c => c.id === proc.caseId);
    const caseTitle = caseObj ? _caseDisplayTitle(caseObj) : '';
    const procEvents = sd.events || [];
    if (procEvents.length > 0) {
      for (const ev of procEvents) {
        if (ev.date) {
          allEvents.push({ date: ev.date, title: ev.title || '', magistrate: ev.magistrate || '', procType: proc.type || 'altro', procTitle: proc.title || '', caseTitle: caseTitle, phaseType: ev.phaseRef || '' });
        }
      }
    } else {
      for (const ph of phases) {
        for (const ev of (ph.events || [])) {
          if (ev.date) {
            allEvents.push({ date: ev.date, title: ev.title || '', magistrate: ev.magistrate || '', procType: proc.type || 'altro', procTitle: proc.title || '', caseTitle: caseTitle, phaseType: ph.tipo || '' });
          }
        }
      }
    }
  }

  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  const statsHtml = `
    <div class="dashboard-stats">
      <div class="stat-card"><div class="stat-value">${cases.length}</div><div class="stat-label">${t('dashboardCases')}</div></div>
      <div class="stat-card"><div class="stat-value">${allProcs.length}</div><div class="stat-label">${t('dashboardProceedings')}</div></div>
      <div class="stat-card"><div class="stat-value">${totalDossiers}</div><div class="stat-label">${t('dashboardDossiers')}</div></div>
      <div class="stat-card"><div class="stat-value">${totalActs}</div><div class="stat-label">${t('dashboardActs')}</div></div>
    </div>`;

  if (cases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9878;</div>
        <h2>${t('welcomeTitle')}</h2>
        <p>${t('welcomeMsg')}</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="dashboard-header"><h2>${t('dashboardTitle')}</h2></div>
    ${statsHtml}
    <div class="timeline-box dashboard-timeline-box">
      <div class="timeline-box-header">
        <h3>${t('globalTimelineTitle')}</h3>
        <div class="timeline-zoom-controls">
          <button class="btn btn-xs" onclick="zoomGlobalTimeline(-1)" title="${t('zoomOut')}">&#8722;</button>
          <button class="btn btn-xs" onclick="zoomGlobalTimeline(0)" title="${t('zoomReset')}">1:1</button>
          <button class="btn btn-xs" onclick="zoomGlobalTimeline(1)" title="${t('zoomIn')}">&#43;</button>
        </div>
      </div>
      <div id="globalTimelineContainer"></div>
    </div>`;

  renderGlobalTimeline(allEvents, cases);
}

function renderGlobalTimeline(allEvents, cases) {
  const container = document.getElementById('globalTimelineContainer');
  if (!container) return;

  if (allEvents.length === 0) {
    container.innerHTML = `<p class="hint">${t('timelineNoEvents')}</p>`;
    return;
  }

  const TIMELINE_LABEL_MAP = { penale: 'timelinePenale', civile: 'timelineCivile', esecuzione: 'timelineEsecutivo', amministrativo: 'timelineAmministrativo', altro: 'timelineAll' };
  const types = [...new Set(allEvents.map(e => e.procType))];

  const filterBtns = [
    `<button class="btn btn-xs timeline-filter-btn active" data-filter="all" onclick="filterGlobalTimeline('all', this)">${t('timelineAll')}</button>`,
    ...types.map(tp => {
      const lbl = t(TIMELINE_LABEL_MAP[tp] || tp) || tp;
      const color = TIMELINE_COLORS[tp] || TIMELINE_COLORS.altro;
      return `<button class="btn btn-xs timeline-filter-btn" data-filter="${tp}" onclick="filterGlobalTimeline('${tp}', this)" style="border-color:${color};color:${color}">${lbl}</button>`;
    })
  ].join('');

  const minDate = new Date(allEvents[0].date);
  const maxDate = new Date(allEvents[allEvents.length - 1].date);
  const totalMs = Math.max(maxDate - minDate, 86400000);

  const groupedByCase = {};
  for (const ev of allEvents) {
    const key = ev.caseTitle || '?';
    if (!groupedByCase[key]) groupedByCase[key] = {};
    if (!groupedByCase[key][ev.procType]) groupedByCase[key][ev.procType] = [];
    groupedByCase[key][ev.procType].push(ev);
  }

  const zoom = dashboardTimelineZoom;
  const chartWidth = Math.max(100, 100 * zoom);

  let lanesHtml = '';
  for (const [caseName, typeGroups] of Object.entries(groupedByCase)) {
    lanesHtml += `<div class="gtl-case-label">${esc(caseName)}</div>`;
    for (const [tp, events] of Object.entries(typeGroups)) {
      const color = TIMELINE_COLORS[tp] || TIMELINE_COLORS.altro;
      const lbl = t(TIMELINE_LABEL_MAP[tp] || tp) || tp;
      const dots = events.map(ev => {
        const pos = ((new Date(ev.date) - minDate) / totalMs) * 100;
        const tip = `${ev.date} — ${ev.title || ev.procTitle}${ev.magistrate ? ' (' + ev.magistrate + ')' : ''}`;
        return `<div class="tl-dot" style="left:${pos}%" title="${esc(tip)}" data-proc-type="${tp}"></div>`;
      }).join('');
      lanesHtml += `
        <div class="tl-lane gtl-lane" data-type="${tp}">
          <div class="tl-lane-label" style="color:${color}">${esc(lbl)}</div>
          <div class="tl-lane-track">
            <div class="tl-lane-line" style="background:${color}"></div>
            ${dots}
          </div>
        </div>`;
    }
  }

  const dateLabels = generateTimelineDateLabels(minDate, maxDate);

  container.innerHTML = `
    <div class="timeline-controls">${filterBtns}</div>
    <div class="gtl-scroll-wrapper">
      <div class="timeline-chart gtl-chart" style="width:${chartWidth}%">
        ${lanesHtml}
        <div class="tl-date-axis">${dateLabels}</div>
      </div>
    </div>`;
}

function zoomGlobalTimeline(dir) {
  if (dir === 0) {
    dashboardTimelineZoom = 1;
  } else if (dir > 0) {
    dashboardTimelineZoom = Math.min(dashboardTimelineZoom * 1.5, 10);
  } else {
    dashboardTimelineZoom = Math.max(dashboardTimelineZoom / 1.5, 1);
  }
  renderDashboard();
}

function filterGlobalTimeline(type, btn) {
  const box = document.getElementById('globalTimelineContainer');
  if (!box) return;
  box.querySelectorAll('.timeline-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  box.querySelectorAll('.tl-lane').forEach(lane => {
    lane.style.display = (type === 'all' || lane.dataset.type === type) ? '' : 'none';
  });
}

/* ========== TREE NAVIGATION ========== */
async function renderTree() {
  const box = document.getElementById('treeNav');
  if (!box) return;
  box.innerHTML = '';

  const cases = await DB.getCases();
  if (cases.length === 0) {
    box.innerHTML = '<p class="hint" style="padding:8px">' + t('welcomeMsg') + '</p>';
    return;
  }

  for (const c of cases) {
    const caseEl = createTreeItem(_caseDisplayTitle(c), 'case', c.id, { label: 'Caso', cls: 'tree-badge-K' }, null, [
      { label: t('addProceeding'), action: () => openForm('proceeding', c.id) }
    ]);
    box.appendChild(caseEl);

    if (state.expanded['case_' + c.id]) {
      const childBox = document.createElement('div');
      childBox.className = 'tree-children';

      const procs = await DB.getProceedings(c.id);
      const rootProcs = procs.filter(p => !p.parentProceedingId);
      const childProcs = procs.filter(p => p.parentProceedingId);

      async function renderProcBranch(p, container) {
        const badge = typeToBadge(p.type, p.specificData?.origineProc);
        const isChild = !!p.parentProceedingId;
        const procTreeTitle = p.protocol ? `[${p.protocol}] ${buildProcTitle(p)}` : buildProcTitle(p);
        const procEl = createTreeItem(procTreeTitle, 'proceeding', p.id, badge, null, [
          { label: t('addDossier'), action: () => openForm('dossier', p.id) }
        ], isChild);
        if (p.specificData?.origineProc === 'integrazione') {
          const lbl = procEl.querySelector('.tree-label');
          if (lbl) {
            const intLabel = document.createElement('div');
            intLabel.className = 'tree-integrazione-label';
            intLabel.textContent = t('origineProc_perIntegrazione');
            lbl.appendChild(intLabel);
            const violBadge = document.createElement('div');
            violBadge.className = 'tree-viol-badge';
            violBadge.textContent = t('origineProc_illegittimo');
            lbl.appendChild(violBadge);
          }
        }
        container.appendChild(procEl);

        const subProcs = childProcs.filter(cp => cp.parentProceedingId === p.id);

        if (state.expanded['proceeding_' + p.id]) {
          const innerBox = document.createElement('div');
          innerBox.className = 'tree-children';

          const dossiers = await DB.getDossiers(p.id);
          for (const d of dossiers) {
            const dossEl = createTreeItem(d.title, 'dossier', d.id, { label: 'Fasc', cls: 'tree-badge-F' }, null, [
              { label: t('addAnalysis'), action: () => showAnalysisContextModal(d.id) }
            ]);
            innerBox.appendChild(dossEl);

            if (state.expanded['dossier_' + d.id]) {
              const dossierChildren = document.createElement('div');
              dossierChildren.className = 'tree-children';

              const facts = await DB.getFactsByDossier(d.id);
              facts.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id);
              if (facts.length > 0) {

                for (const f of facts) {
                  const ctx = f.analysisContext || 'fatto';
                  const ctxBadgeMap = {
                    fatto: { label: t('factBadge'), cls: 'tree-badge-fact-type' },
                    atto: { label: t('actBadge'), cls: 'tree-badge-act-type' },
                    prova: { label: t('proofBadge'), cls: 'tree-badge-proof-type' },
                    circostanza: { label: t('circBadge'), cls: 'tree-badge-circ-type' }
                  };
                  const fBadge = ctxBadgeMap[ctx] || ctxBadgeMap['fatto'];
                  let factSub = '';
                  if (f.factDate) { factSub = _fmtDateShort(f.factDate); if (f.factTime) factSub += ' ' + f.factTime; }
                  const factLabel = f.protocol ? `[${f.protocol}] ${f.title}` : f.title;
                  const factActions = [
                    { label: '✏️', action: () => openFactEditModal(f.id) },
                    { label: '🗑️', action: () => deleteFactFromTree(f.id) }
                  ];
                  const factEl = createTreeItem(factLabel, 'fact', f.id, fBadge, factSub || null, factActions, false, false);

                  dossierChildren.appendChild(factEl);
                }
              }

              innerBox.appendChild(dossierChildren);
            }
          }

          for (const sp of subProcs) {
            await renderProcBranch(sp, innerBox);
          }

          container.appendChild(innerBox);
        }
      }

      for (const p of rootProcs) {
        await renderProcBranch(p, childBox);
      }

      

      box.appendChild(childBox);
    }
  }
}

function typeToBadge(type, origineProc) {
  const clsMap = { penale: 'P', civile: 'C', amministrativo: 'A', esecuzione: 'E', altro: 'X' };
  if (type === 'penale' && origineProc) {
    const origineSuffix = { ufficio: 'origineUfficio', querela: 'origineQuerela', denuncia: 'origineDenuncia', esposto: 'origineEsposto', istanza: 'origineIstanza', integrazione: 'origineIntegrazione' };
    const suffixKey = origineSuffix[origineProc];
    if (suffixKey) return { label: 'P.P. ' + t(suffixKey), cls: 'tree-badge-P' };
  }
  const labels = { penale: 'P.P.', civile: 'P.C.', amministrativo: 'P.A.', esecuzione: 'P.E.', altro: 'P.X.' };
  return { label: labels[type] || 'P.X.', cls: 'tree-badge-' + (clsMap[type] || 'X') };
}

const ACT_TYPE_SUBTYPES = {
  iniziativa: ['denuncia','querela','ricorso','esposto','istanza','segnalazione','richiesta'],
  istruttorio: ['interrogatorio','audizione','perizia','ispezione','accertamento','acquisizione_documenti','sopralluogo'],
  documentazione: ['verbale_udienza','verbale_interrogatorio','verbale_polizia','verbale_ispezione','rapporto','relazione'],
  procedurale: ['notifica','convocazione','citazione','deposito','fissazione_udienza','comunicazione','avviso'],
  decisionale: ['ordinanza','decreto','sentenza','provvedimento','decisione'],
  esecuzione: ['sequestro','ordine_pagamento','esecuzione_provvedimento','pignoramento']
};
const ACT_TYPES = Object.keys(ACT_TYPE_SUBTYPES);

function actTypeLabel(type) { return t('actType_' + (type || '')) || type || ''; }
function actSubtypeLabel(sub) { return t('actSub_' + (sub || '')) || sub || ''; }

function _buildActTypeSubtypeSelects(idPrefix, existingType, existingSubtype) {
  const typeId = idPrefix + 'Type';
  const subId = idPrefix + 'Subtype';
  const typeOpts = ACT_TYPES.map(tp => `<option value="${tp}" ${tp === existingType ? 'selected' : ''}>${actTypeLabel(tp)}</option>`).join('');
  const selType = existingType || ACT_TYPES[0];
  const subs = ACT_TYPE_SUBTYPES[selType] || [];
  const subOpts = subs.map(s => `<option value="${s}" ${s === existingSubtype ? 'selected' : ''}>${actSubtypeLabel(s)}</option>`).join('');
  return `<div style="display:flex;gap:12px">
    <div class="form-group" style="flex:1;margin-bottom:0">
      <label>${t('actType')}</label>
      <select id="${typeId}" data-testid="select-${typeId}" onchange="_onActTypeChange('${idPrefix}')">${typeOpts}</select>
    </div>
    <div class="form-group" style="flex:1;margin-bottom:0">
      <label>${t('actSubtype')}</label>
      <select id="${subId}" data-testid="select-${subId}">${subOpts}</select>
    </div>
  </div>`;
}

function _onActTypeChange(idPrefix) {
  const typeEl = document.getElementById(idPrefix + 'Type');
  const subEl = document.getElementById(idPrefix + 'Subtype');
  if (!typeEl || !subEl) return;
  const subs = ACT_TYPE_SUBTYPES[typeEl.value] || [];
  subEl.innerHTML = subs.map(s => `<option value="${s}">${actSubtypeLabel(s)}</option>`).join('');
}

function actTypeBadge(type, subtype) {
  if (subtype) return actSubtypeLabel(subtype);
  if (type && ACT_TYPE_SUBTYPES[type]) return actTypeLabel(type);
  return type || 'atto';
}

function proofValBadge(val) {
  if (val === 'confirms') return { label: '\u2713', cls: 'tree-badge-confirm' };
  if (val === 'denies' || val === 'contradicts') return { label: '\u2717', cls: 'tree-badge-deny' };
  if (val === 'integrates') return { label: '+', cls: 'tree-badge-confirm' };
  if (val === 'ignored') return { label: '-', cls: 'tree-badge-warn' };
  return { label: '\u25CB', cls: 'tree-badge-neutral' };
}

function factPositionBadge(pos) {
  if (pos === 'afferma') return { label: '\u2713', cls: 'tree-badge-confirm' };
  if (pos === 'nega') return { label: '\u2717', cls: 'tree-badge-deny' };
  if (pos === 'omette') return { label: '!', cls: 'tree-badge-warn' };
  if (pos === 'travisa') return { label: '\u2717', cls: 'tree-badge-deny' };
  return { label: '\u25CB', cls: 'tree-badge-neutral' };
}

function shortYear(y) {
  if (!y) return '';
  const s = String(y);
  return s.length === 4 ? s.slice(2) : s;
}

function _shortenOffice(name) {
  if (!name) return '';
  const abbrevMap = [
    [/Procura Generale della Repubblica presso la Corte d['']Appello di\s*/i, 'P.G.R. '],
    [/Procura Generale della Repubblica di\s*/i, 'P.G.R. '],
    [/Procura della Repubblica presso il Tribunale di\s*/i, 'P.d.R. '],
    [/Procura della Repubblica di\s*/i, 'P.d.R. '],
    [/Corte d['']Appello di\s*/i, 'C.d.A. '],
    [/Tribunale di Sorveglianza di\s*/i, 'T.d.S. '],
    [/Tribunale per i Minorenni di\s*/i, 'T.M. '],
    [/Tribunale di\s*/i, 'Trib. '],
    [/Corte di Cassazione/i, 'Cass.'],
    [/Giudice di Pace di\s*/i, 'G.d.P. '],
  ];
  for (const [regex, abbrev] of abbrevMap) {
    if (regex.test(name)) {
      return name.replace(regex, abbrev).trim();
    }
  }
  return name;
}

const MODELLO_SHORT = { mod21: 'Mod. 21', mod21bis: 'Mod. 21-bis', mod44: 'Mod. 44', mod45: 'Mod. 45' };

function buildProcTitle(p) {
  if (!p) return t('proceeding');
  const short = p.autoritaProcedente ? _shortenOffice(p.autoritaProcedente) : '';
  const rg = p.rgNumber || '';
  const yr = p.year ? shortYear(p.year) : '';
  if (!rg || !yr) return p.title || t('proceeding');
  const firstPhase = p.specificData?.phases?.[0];
  const modello = (p.type === 'penale' && firstPhase?.modello) ? MODELLO_SHORT[firstPhase.modello] || '' : '';
  const regPart = `RGNR n.${rg}/${yr}`;
  const inner = modello ? `${regPart} - ${modello}` : regPart;
  return short ? `${short} (${inner})` : `(${inner})`;
}

function logicStateToBadge(state) {
  if (state === 'INCOHERENCE') return { label: '\u26A0', cls: 'tree-badge-deny' };
  if (state === 'OMISSION') return { label: '!', cls: 'tree-badge-warn' };
  if (state === 'COHERENT') return { label: '\u2713', cls: 'tree-badge-confirm' };
  return { label: '\u25CB', cls: 'tree-badge-neutral' };
}

function createRefTreeItem(label, type, id, badge, subLabel) {
  const isSelected = state.selection && state.selection.type === type && state.selection.id === id;
  const div = document.createElement('div');
  div.className = 'tree-item tree-item-ref' + (isSelected ? ' selected' : '');
  const left = document.createElement('div');
  left.className = 'tree-item-left';
  const spacer = document.createElement('span');
  spacer.className = 'tree-toggle';
  spacer.textContent = '\u25CB';
  spacer.style.fontSize = '8px';
  left.appendChild(spacer);
  if (badge && typeof badge === 'object' && badge.label) {
    const badgeEl = document.createElement('span');
    badgeEl.className = 'tree-badge ' + badge.cls;
    badgeEl.textContent = badge.label;
    left.appendChild(badgeEl);
  }
  const textWrap = document.createElement('span');
  textWrap.className = 'tree-label';
  const mainLabel = document.createElement('span');
  mainLabel.textContent = label;
  textWrap.appendChild(mainLabel);
  if (subLabel) {
    const sub = document.createElement('span');
    sub.style.cssText = 'font-size:10px;color:var(--text-muted);margin-left:6px';
    sub.textContent = subLabel;
    textWrap.appendChild(sub);
  }
  left.appendChild(textWrap);
  div.appendChild(left);
  div.onclick = () => selectRefItem(type, id);
  return div;
}

async function selectRefItem(type, id) {
  state.selection = { type, id };
  hideAllPanels();
  document.getElementById('detailView').style.display = 'block';
  await renderTree();
  await showDetail(type, id);
  await renderLinkedSubjects(type, id);
}

function createTreeItem(label, type, id, badge, subLabel, actions, isChildProc, forceExpandable) {
  const hasChildren = forceExpandable || (type === 'case' || type === 'proceeding' || type === 'dossier');
  const isExpanded = state.expanded[type + '_' + id];
  const isSelected = state.selection && state.selection.type === type && state.selection.id === id;

  const div = document.createElement('div');
  div.className = 'tree-item' + (isSelected ? ' selected' : '') + (isChildProc ? ' tree-item-child-proc' : '');

  const left = document.createElement('div');
  left.className = 'tree-item-left';

  if (hasChildren) {
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.textContent = isExpanded ? '\u25BC' : '\u25B6';
    toggle.onclick = (e) => {
      e.stopPropagation();
      state.expanded[type + '_' + id] = !state.expanded[type + '_' + id];
      renderTree();
    };
    left.appendChild(toggle);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'tree-toggle';
    spacer.textContent = '\u25CF';
    spacer.style.fontSize = '6px';
    left.appendChild(spacer);
  }

  if (badge) {
    const badgeEl = document.createElement('span');
    if (typeof badge === 'object' && badge.label) {
      badgeEl.className = 'tree-badge ' + badge.cls;
      badgeEl.textContent = badge.label;
    } else if (type === 'act') {
      badgeEl.className = 'act-badge act-badge-' + badge;
      badgeEl.textContent = t(badge);
    }
    left.appendChild(badgeEl);
  }

  const textWrap = document.createElement('span');
  textWrap.className = 'tree-label';
  const mainLabel = document.createElement('span');
  mainLabel.textContent = label;
  textWrap.appendChild(mainLabel);

  if (subLabel) {
    const sub = document.createElement('span');
    sub.style.cssText = 'font-size:10px;color:var(--text-muted);display:block;margin-top:1px';
    sub.textContent = subLabel;
    textWrap.appendChild(sub);
  }

  left.appendChild(textWrap);
  div.appendChild(left);

  if (actions && actions.length > 0 && isCreator()) {
    for (const act of actions) {
      const btn = document.createElement('span');
      btn.className = 'tree-add-btn';
      btn.textContent = act.label;
      btn.onclick = (e) => { e.stopPropagation(); act.action(); };
      div.appendChild(btn);
    }
  }

  div.onclick = () => selectItem(type, id);
  return div;
}

function _posLabel(pos) {
  const map = { afferma: 'factPosAfferma', nega: 'factPosNega', omette: 'factPosOmette', travisa: 'factPosTravisa', non_pronuncia: 'factPosNonPronuncia' };
  return t(map[pos] || pos) || pos || '';
}
function _relLabel(rel) {
  const map = { confirms: 'proofRelConfirms', contradicts: 'proofRelContradicts', integrates: 'proofRelIntegrates', ignored: 'proofRelIgnored' };
  return t(map[rel] || rel) || rel || '';
}


async function selectItem(type, id) {
  state.selection = { type, id };
  state._factDetailTab = null;
  state._detailContext = null;
  if (type === 'case') {
    const willExpand = !state.expanded['case_' + id];
    Object.keys(state.expanded).forEach(k => { if (k.startsWith('case_') || k.startsWith('proceeding_') || k.startsWith('dossier_') || k.startsWith('act_') || k.startsWith('fact_')) delete state.expanded[k]; });
    if (willExpand) {
      state.expanded['case_' + id] = true;
      await expandCaseRecursive(id);
    }
  } else if (type === 'proceeding' || type === 'dossier' || type === 'act' || type === 'fact') {
    state.expanded[type + '_' + id] = !state.expanded[type + '_' + id];
  }
  hideAllPanels();
  document.getElementById('detailView').style.display = 'block';
  await renderTree();
  await showDetail(type, id);
  await renderLinkedSubjects(type, id);
}

async function expandCaseRecursive(caseId) {
  const procs = await DB.getProceedings(caseId);
  for (const p of procs) {
    state.expanded['proceeding_' + p.id] = true;
    const dossiers = await DB.getDossiers(p.id);
    for (const d of dossiers) {
      state.expanded['dossier_' + d.id] = true;
    }
  }
}

/* ========== I18N HELPERS FOR ROLES/ACTIONS ========== */
function tRole(code) {
  if (code === 'parte_offesa') return t('parte_offesa_role');
  const procRoleKey = 'procRole_' + code;
  const procRoleVal = t(procRoleKey);
  if (procRoleVal && procRoleVal !== procRoleKey) return procRoleVal;
  return t(code);
}

function tAction(code) {
  const overrides = { archiviazione: 'archiviazione_action', perizia: 'perizia_action', altro: 'altro_action' };
  return t(overrides[code] || code);
}

/* ========== TAB SYSTEM ========== */
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabId));
}

function _detailTabBtn(tabId, activeTab) {
  const badges = { fatto: 'tree-badge-fact-type', atto: 'tree-badge-act-type', prova: 'tree-badge-proof-type' };
  const labels = { fatto: 'factBadge', atto: 'actBadge', prova: 'proofBadge' };
  return `<button class="detail-tab${activeTab === tabId ? ' active' : ''}" onclick="switchFactDetailTab('${tabId}')" data-testid="tab-fact-${tabId}"><span class="tree-badge ${badges[tabId]}">${t(labels[tabId])}</span></button>`;
}

function switchFactDetailTab(tab) {
  state._factDetailTab = tab;
  const container = document.getElementById('detailView');
  if (container) {
    container.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
    container.querySelector(`.detail-tab[data-testid="tab-fact-${tab}"]`)?.classList.add('active');
  }
  const tabFatto = document.getElementById('factTabFatto');
  const tabAtto = document.getElementById('factTabAtto');
  const tabProva = document.getElementById('factTabProva');
  if (tabFatto) tabFatto.style.display = tab === 'fatto' ? '' : 'none';
  if (tabAtto) tabAtto.style.display = tab === 'atto' ? '' : 'none';
  if (tabProva) tabProva.style.display = tab === 'prova' ? '' : 'none';
  if (tab === 'prova' || tab === 'atto') {
    const tabId = 'factTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
      setTimeout(() => _reloadLinkedFilePreviews(tabEl), 100);
    }
  }
}

function _reloadLinkedFilePreviews(container) {
  if (!container) return;
  container.querySelectorAll('.file-viewer').forEach(viewer => {
    const previewContainer = viewer.querySelector('.file-preview-container');
    if (!previewContainer) return;
    const selectedItem = viewer.querySelector('.file-select-item.selected');
    if (!selectedItem) return;
    const fileId = parseInt(selectedItem.dataset.fileId);
    if (!fileId) return;
    previewContainer.innerHTML = '<p class="hint">' + t('loadingPreview') + '</p>';
    DB.getFile(fileId).then(file => {
      if (!file) { previewContainer.innerHTML = '<p class="hint">' + t('previewNotAvailable') + '</p>'; return; }
      if (file.blob) {
        const blob = new Blob([file.blob], { type: file.fileType });
        const url = URL.createObjectURL(blob);
        previewContainer.innerHTML = _buildPreviewInner(url, file);
      } else {
        const cid = 'fp_reload_' + fileId + '_' + Date.now();
        previewContainer.innerHTML = `<div id="${cid}" class="file-preview"><p class="hint">${t('loadingPreview')}</p></div>`;
        loadPreviewFromFS(file, cid);
      }
    });
  });
}

function switchFormTab(tab) {
  const container = document.getElementById('formView');
  if (!container) return;
  container.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
  container.querySelector(`.detail-tab[data-testid="form-tab-${tab}"]`)?.classList.add('active');
  const allTabs = ['fatto', 'atto', 'prova', 'violazioni'];
  allTabs.forEach(t => {
    const el = document.getElementById('formTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

function _getTabOrderKey(context) {
  return 'uxg_tabOrder_' + context;
}

function getSavedTabOrder(context) {
  try {
    const stored = localStorage.getItem(_getTabOrderKey(context));
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}

function saveTabOrder(context, order) {
  try {
    localStorage.setItem(_getTabOrderKey(context), JSON.stringify(order));
  } catch(e) {}
}

function getTabIdFromButton(btn) {
  const testid = btn.getAttribute('data-testid') || '';
  const m = testid.match(/(?:form-tab-|tab-fact-)(.+)$/);
  return m ? m[1] : '';
}

function buildOrderedTabs(context, defaultOrder, renderTab) {
  const saved = getSavedTabOrder(context);
  const order = saved && saved.length === defaultOrder.length && defaultOrder.every(t => saved.includes(t)) ? saved : defaultOrder;
  return order.map((tabId, idx) => renderTab(tabId, idx)).join('');
}

function makeTabsDraggable(containerEl, context) {
  const tabsBar = containerEl.querySelector('.detail-tabs');
  if (!tabsBar) return;
  const allBtns = Array.from(tabsBar.querySelectorAll('.detail-tab'));
  const tabs = allBtns.filter(b => {
    const tid = getTabIdFromButton(b);
    return tid !== 'violazioni';
  });
  if (tabs.length < 2) return;
  let dragSrc = null;

  tabs.forEach(tab => {
    tab.setAttribute('draggable', 'true');

    tab.addEventListener('dragstart', function(e) {
      dragSrc = this;
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    tab.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this !== dragSrc) this.classList.add('drag-over');
    });

    tab.addEventListener('dragleave', function() {
      this.classList.remove('drag-over');
    });

    tab.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      if (dragSrc && dragSrc !== this) {
        const fromIdx = tabs.indexOf(dragSrc);
        const toIdx = tabs.indexOf(this);
        if (fromIdx < toIdx) {
          tabsBar.insertBefore(dragSrc, this.nextSibling);
        } else {
          tabsBar.insertBefore(dragSrc, this);
        }
        const newOrder = Array.from(tabsBar.querySelectorAll('.detail-tab'))
          .map(b => getTabIdFromButton(b))
          .filter(tid => tid !== 'violazioni');
        saveTabOrder(context, newOrder);
      }
    });

    tab.addEventListener('dragend', function() {
      this.classList.remove('dragging');
      tabs.forEach(t => t.classList.remove('drag-over'));
      dragSrc = null;
    });
  });
}

function renderTabs(tabs) {
  return `<div class="tabs">${tabs.map(tb =>
    `<button class="tab-btn ${tb.id === state.activeTab ? 'active' : ''}" data-tab="${tb.id}" onclick="switchTab('${tb.id}')">${tb.label}</button>`
  ).join('')}</div>`;
}

function toggleAccordion(sectionId) {
  const section = document.getElementById('acc-' + sectionId);
  if (!section) return;
  const wasOpen = section.classList.contains('open');
  section.classList.toggle('open', !wasOpen);
}

function toggleAccordionIndagati() {
  const section = document.getElementById('acc-indagati');
  if (!section || section.classList.contains('acc-locked')) return;
  section.classList.toggle('open');
}

function onSoggettiTipoChange() {
  const searchRow = document.getElementById('indagatiSearchRow');
  const listContainer = document.getElementById('indagatiListContainer');
  const sel = document.querySelector('input[name="soggettiTipo"]:checked');
  const isIgnoti = sel && sel.value === 'ignoti';
  if (searchRow) searchRow.style.display = isIgnoti ? 'none' : '';
  if (listContainer) listContainer.style.display = isIgnoti ? 'none' : '';
}

function _dpToggle(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}
function onDP408Change() {
  const on = document.getElementById('fDP_avviso408')?.checked;
  _dpToggle('fDP_avviso408_date_wrap', on);
  _dpToggle('fDP_avviso408_hint', on);
}
function onDP415bisChange() {
  const on = document.getElementById('fDP_415bis')?.checked;
  _dpToggle('fDP_415bis_date_wrap', on);
  _dpToggle('fDP_415bis_hint', on);
}
function onDPQuerelaChange() {
  const on = document.getElementById('fDP_querela')?.checked;
  _dpToggle('fDP_querela_presentata_wrap', on);
  _dpToggle('fDP_querela_date_wrap', on);
}
function onDPParteCivileChange() {
  const on = document.getElementById('fDP_parteCivile')?.checked;
  _dpToggle('fDP_parteCivile_fase_wrap', on);
}
function onDPDecretoChange() {
  const on = document.getElementById('fDP_decretoNotificato')?.checked;
  _dpToggle('fDP_decreto_date_wrap', on);
  _dpToggle('fDP_decreto_termine_wrap', on);
  _dpToggle('fDP_opposizione_wrap', on);
  if (!on) {
    _dpToggle('fDP_opposizione_date_wrap', false);
    _dpToggle('fDP_opposizione_hint', false);
  }
}
function onDPOpposizioneChange() {
  const on = document.getElementById('fDP_opposizione')?.checked;
  _dpToggle('fDP_opposizione_date_wrap', on);
  _dpToggle('fDP_opposizione_hint', on);
  if (on) {
    const existingTypes = (state.procPhases || []).map(p => p.tipo);
    if (!existingTypes.includes('fase_dibattimento_fase')) {
      state.procPhases.push(createNewPhase('fase_dibattimento_fase'));
      state.activePhaseIdx = state.procPhases.length - 1;
      renderPhasesSection();
    }
  }
}

function renderAccordionStart(id, label, open) {
  return `<div id="acc-${id}" class="accordion-section${open ? ' open' : ''}">
    <button type="button" class="accordion-header" onclick="toggleAccordion('${id}')">
      <span class="accordion-icon">\u25B6</span><span>${label}</span>
    </button>
    <div class="accordion-body">`;
}
function renderAccordionEnd() {
  return `</div></div>`;
}

/* ========== FILE DISPLAY HELPERS ========== */
async function getDisplayFile(entityType, entityId) {
  const lang = currentLang;
  let file = await DB.getEntityFile(entityType, entityId, lang);
  let isFallback = false;
  if (!file && lang === 'en') {
    file = await DB.getEntityFile(entityType, entityId, 'it');
    if (file) isFallback = true;
  }
  return { file, isFallback };
}

async function getDisplayFiles(entityType, entityId) {
  const allFiles = await DB.getEntityFiles(entityType, entityId);
  return allFiles || [];
}

function renderFileDisplay(file, isFallback) {
  if (!file) {
    return '<p class="hint">' + t('noFiles') + '</p>';
  }
  let fallbackNotice = '';
  if (isFallback) {
    fallbackNotice = '<div class="file-fallback-notice">' + t('showingFallback') + '</div>';
  }
  const previewHtml = renderFilePreview(file);
  return `
    ${fallbackNotice}
    ${previewHtml}
    <div class="file-item">
      <div class="file-item-info">
        <span class="file-lang-badge file-lang-${file.lang}">${file.lang.toUpperCase()}</span>
        <div class="file-item-name">${esc(file.fileName)}</div>
        <div class="file-item-meta">${formatSize(file.fileSize)} - ${esc(file.fileType)}</div>
      </div>
      <div class="file-item-actions">
        <button class="btn btn-xs" onclick="downloadFile(${file.id})">${t('download')}</button>
      </div>
    </div>
  `;
}

function renderLinkedFileDisplay(files, uid_prefix, entityId) {
  if (!files || files.length === 0) return '';
  const lang = currentLang;
  let filtered = files.filter(f => f.lang === lang);
  let isFallback = false;
  if (filtered.length === 0 && lang === 'en') {
    filtered = files.filter(f => f.lang === 'it');
    isFallback = true;
  }
  if (filtered.length === 0) filtered = files;
  const uid = 'fv_' + uid_prefix + '_' + entityId;
  const fallbackHtml = isFallback ? `<div class="file-fallback-notice">${t('showingFallback')}</div>` : '';
  const listItems = filtered.map((f, i) => `
    <div class="file-select-item ${i === 0 ? 'selected' : ''}" data-file-id="${f.id}" onclick="event.stopPropagation(); selectFileForPreview('${uid}', ${f.id}, this)">
      <div class="file-select-info">
        <span class="file-lang-badge file-lang-${f.lang}">${(f.lang || '').toUpperCase()}</span>
        <span class="file-select-name">${esc(f.fileName)}</span>
        <span class="file-select-meta">${formatSize(f.fileSize)}</span>
      </div>
      <div class="file-select-actions" onclick="event.stopPropagation()">
        <button class="btn btn-xs" onclick="downloadFile(${f.id})">${t('download')}</button>
      </div>
    </div>
  `).join('');
  const firstFile = filtered[0];
  const firstPreview = firstFile ? renderFilePreview(firstFile) : '';
  return `
    ${fallbackHtml}
    <div class="file-viewer" id="${uid}">
      <div class="file-select-list">${listItems}</div>
      <div class="file-preview-container" id="${uid}_preview">${firstPreview}</div>
    </div>
  `;
}

function renderMultiFileDisplay(files, entityType, entityId) {
  if (!files || files.length === 0) {
    return '<p class="hint">' + t('noFiles') + '</p>';
  }
  const lang = currentLang;
  let filtered = files.filter(f => f.lang === lang);
  let isFallback = false;
  if (filtered.length === 0 && lang === 'en') {
    filtered = files.filter(f => f.lang === 'it');
    isFallback = true;
  }
  if (filtered.length === 0) {
    filtered = files;
  }
  const uid = 'fv_' + entityType + '_' + entityId;
  const fallbackHtml = isFallback ? `<div class="file-fallback-notice">${t('showingFallback')}</div>` : '';
  const listItems = filtered.map((f, i) => `
    <div class="file-select-item ${i === 0 ? 'selected' : ''}" data-file-id="${f.id}" onclick="selectFileForPreview('${uid}', ${f.id}, this)">
      <div class="file-select-info">
        <span class="file-lang-badge file-lang-${f.lang}">${(f.lang || '').toUpperCase()}</span>
        <span class="file-select-name">${esc(f.fileName)}</span>
        <span class="file-select-meta">${formatSize(f.fileSize)}</span>
      </div>
      <div class="file-select-actions" onclick="event.stopPropagation()">
        <button class="btn btn-xs" onclick="downloadFile(${f.id})">${t('download')}</button>
        ${creatorOnly(`<button class="btn btn-xs btn-danger" onclick="deleteFileAndRefresh(${f.id}, '${entityType}', ${entityId})">${t('delete')}</button>`)}
      </div>
    </div>
  `).join('');

  const firstFile = filtered[0];
  const firstPreview = firstFile ? renderFilePreview(firstFile) : '';

  return `
    ${fallbackHtml}
    <div class="file-viewer" id="${uid}">
      <div class="file-select-list">${listItems}</div>
      <div class="file-preview-container" id="${uid}_preview">${firstPreview}</div>
    </div>
  `;
}

function selectFileForPreview(uid, fileId, itemEl) {
  const list = itemEl.parentElement;
  list.querySelectorAll('.file-select-item').forEach(el => el.classList.remove('selected'));
  itemEl.classList.add('selected');
  const container = document.getElementById(uid + '_preview');
  if (!container) return;
  container.innerHTML = '<p class="hint">' + t('loadingPreview') + '</p>';
  DB.getFile(fileId).then(file => {
    if (!file) { container.innerHTML = '<p class="hint">' + t('previewNotAvailable') + '</p>'; return; }
    if (file.blob) {
      const blob = new Blob([file.blob], { type: file.fileType });
      const url = URL.createObjectURL(blob);
      container.innerHTML = _buildPreviewInner(url, file);
    } else {
      const cid = 'fp_sel_' + fileId;
      container.innerHTML = `<div id="${cid}" class="file-preview"><p class="hint">${t('loadingPreview')}</p></div>`;
      loadPreviewFromFS(file, cid);
    }
  });
}

function renderFilePreview(file) {
  if (!file) return '';
  const containerId = 'file-preview-' + file.id;
  if (file.blob) {
    const blob = new Blob([file.blob], { type: file.fileType });
    const url = URL.createObjectURL(blob);
    return _buildPreviewHtml(url, file);
  }
  setTimeout(() => loadPreviewFromFS(file, containerId), 50);
  return `<div id="${containerId}" class="file-preview"><p class="hint">${t('loadingPreview')}</p></div>`;
}

async function loadPreviewFromFS(file, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!FS_FILES_HANDLE) {
    container.innerHTML = '<p class="hint">' + t('previewNotAvailable') + '</p>';
    return;
  }
  try {
    const fsFile = await loadPreviewFileFromFS(file);
    if (!fsFile) throw new Error('not found');
    const url = URL.createObjectURL(fsFile);
    container.innerHTML = _buildPreviewInner(url, file);
  } catch (e) {
    container.innerHTML = '<p class="hint">' + t('previewNotAvailable') + '</p>';
  }
}

function _buildPreviewHtml(url, file) {
  return `<div class="file-preview">${_buildPreviewInner(url, file)}</div>`;
}

function _buildPreviewInner(url, file) {
  const type = file.fileType || '';
  if (type.startsWith('image/')) {
    return `<img src="${url}" alt="${esc(file.fileName)}" class="file-preview-img">`;
  }
  if (type === 'application/pdf') {
    return `<iframe src="${url}" class="file-preview-pdf" title="${esc(file.fileName)}"></iframe>`;
  }
  if (type.startsWith('video/')) {
    return `<video src="${url}" controls class="file-preview-video" title="${esc(file.fileName)}"></video>`;
  }
  if (type.startsWith('audio/')) {
    return `<audio src="${url}" controls class="file-preview-audio" title="${esc(file.fileName)}"></audio>`;
  }
  if (type.startsWith('text/') || type === 'application/json' || type === 'application/xml') {
    return `<iframe src="${url}" class="file-preview-text" title="${esc(file.fileName)}"></iframe>`;
  }
  return `<p class="hint">${t('previewNotAvailable')}</p>`;
}

/* ========== DETAIL VIEW ========== */
async function showDetail(type, id) {
  const panel = document.getElementById('detailView');
  panel.style.display = 'block';
  document.getElementById('welcomeView').style.display = 'none';
  document.getElementById('formView').style.display = 'none';
  state.activeSubjectId = null;

  if (type === 'case') await showCaseDetail(id);
  else if (type === 'proceeding') await showProceedingDetail(id);
  else if (type === 'dossier') await showDossierDetail(id);
  else if (type === 'act') await showActDetail(id);
  else if (type === 'fact') await showFactDetail(id);
  else if (type === 'proof') await showProofDetail(id);
}

async function showCaseDetail(id) {
  const c = await DB.getCase(id);
  if (!c) return;
  const panel = document.getElementById('detailView');
  const descr = currentLang === 'it' ? c.descrIt : (c.descrEn || c.descrIt);
  const entityFiles = await getDisplayFiles('case', id);
  const fileHtml = renderMultiFileDisplay(entityFiles, 'case', id);

  panel.innerHTML = `
    <div class="timeline-box">
      <div class="timeline-box-header"><h3>${t('timelineTitle')}</h3></div>
      <div id="caseTimelineContainer"></div>
    </div>
    <div class="detail-panel">
      <div class="detail-header">
        <h2>${esc(_caseDisplayTitle(c))}</h2>
        <div class="detail-header-actions">
          ${creatorOnly(`<button class="btn btn-sm" onclick="openForm('case', null, ${id})">${t('edit')}</button>`)}
          ${creatorOnly(`<button class="btn btn-sm btn-danger" onclick="deleteEntity('case', ${id})">${t('delete')}</button>`)}
        </div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">${t('description')}</div>
        <div class="detail-field-value">${esc(descr) || '-'}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-header"><h3>${t('docIntroduttivoCaso')}</h3></div>
        ${fileHtml}
      </div>
    </div>
  `;
  showLinkedSection('case', id);
  renderCaseTimeline(id);
}

const TIMELINE_COLORS = {
  penale: '#3b82f6',
  civile: '#22c55e',
  esecuzione: '#ef4444',
  amministrativo: '#eab308',
  altro: '#8b5cf6'
};

async function renderCaseTimeline(caseId) {
  const container = document.getElementById('caseTimelineContainer');
  if (!container) return;

  const proceedings = await DB.getProceedings(caseId);
  const allEvents = [];

  for (const proc of proceedings) {
    const sd = proc.specificData || {};
    const phases = sd.phases || [];
    const procEvents = sd.events || [];
    if (procEvents.length > 0) {
      for (const ev of procEvents) {
        if (ev.date) {
          allEvents.push({ date: ev.date, title: ev.title || '', description: ev.description || '', magistrate: ev.magistrate || '', procType: proc.type || 'altro', procTitle: proc.title || '', phaseType: ev.phaseRef || '' });
        }
      }
    } else {
      for (const ph of phases) {
        for (const ev of (ph.events || [])) {
          if (ev.date) {
            allEvents.push({ date: ev.date, title: ev.title || '', description: ev.description || '', magistrate: ev.magistrate || '', procType: proc.type || 'altro', procTitle: proc.title || '', phaseType: ph.tipo || '' });
          }
        }
      }
    }
  }

  if (allEvents.length === 0) {
    container.innerHTML = `<p class="hint">${t('timelineNoEvents')}</p>`;
    return;
  }

  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  const TIMELINE_LABEL_MAP = { penale: 'timelinePenale', civile: 'timelineCivile', esecuzione: 'timelineEsecutivo', amministrativo: 'timelineAmministrativo', altro: 'timelineAll' };
  const types = [...new Set(allEvents.map(e => e.procType))];
  const filterBtns = [
    `<button class="btn btn-xs timeline-filter-btn active" data-filter="all" onclick="filterTimeline('all', this)">${t('timelineAll')}</button>`,
    ...types.map(tp => {
      const lbl = t(TIMELINE_LABEL_MAP[tp] || tp) || tp;
      const color = TIMELINE_COLORS[tp] || TIMELINE_COLORS.altro;
      return `<button class="btn btn-xs timeline-filter-btn" data-filter="${tp}" onclick="filterTimeline('${tp}', this)" style="border-color:${color};color:${color}">${lbl}</button>`;
    })
  ].join('');

  const minDate = new Date(allEvents[0].date);
  const maxDate = new Date(allEvents[allEvents.length - 1].date);
  const totalMs = Math.max(maxDate - minDate, 86400000);

  const groupedByType = {};
  for (const ev of allEvents) {
    if (!groupedByType[ev.procType]) groupedByType[ev.procType] = [];
    groupedByType[ev.procType].push(ev);
  }

  const lanes = Object.entries(groupedByType).map(([tp, events]) => {
    const color = TIMELINE_COLORS[tp] || TIMELINE_COLORS.altro;
    const lbl = t(TIMELINE_LABEL_MAP[tp] || tp) || tp;
    const dots = events.map(ev => {
      const pos = ((new Date(ev.date) - minDate) / totalMs) * 100;
      const tip = `${ev.date} — ${ev.title || ev.procTitle}${ev.magistrate ? ' (' + ev.magistrate + ')' : ''}`;
      return `<div class="tl-dot" style="left:${pos}%" title="${esc(tip)}" data-proc-type="${tp}"></div>`;
    }).join('');
    return `
      <div class="tl-lane" data-type="${tp}">
        <div class="tl-lane-label" style="color:${color}">${esc(lbl)}</div>
        <div class="tl-lane-track">
          <div class="tl-lane-line" style="background:${color}"></div>
          ${dots}
        </div>
      </div>`;
  }).join('');

  const dateLabels = generateTimelineDateLabels(minDate, maxDate);

  container.innerHTML = `
    <div class="timeline-controls">${filterBtns}</div>
    <div class="timeline-chart">
      ${lanes}
      <div class="tl-date-axis">${dateLabels}</div>
    </div>`;
}

function generateTimelineDateLabels(minDate, maxDate) {
  const totalMs = maxDate - minDate;
  const labels = [];
  const steps = Math.min(6, Math.max(2, Math.ceil(totalMs / (86400000 * 30))));

  for (let i = 0; i <= steps; i++) {
    const pct = (i / steps) * 100;
    const d = new Date(minDate.getTime() + (totalMs * i / steps));
    const lbl = _tlFormatDate(d.toISOString().slice(0, 10));
    labels.push(`<span class="tl-date-label" style="left:${pct}%">${lbl}</span>`);
  }
  return labels.join('');
}

function filterTimeline(type, btn) {
  document.querySelectorAll('.timeline-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tl-lane').forEach(lane => {
    if (type === 'all' || lane.dataset.type === type) {
      lane.style.display = '';
    } else {
      lane.style.display = 'none';
    }
  });
}

const PHASE_COLORS = {
  fase_procura: '#6366f1',
  fase_gip_fase: '#3b82f6',
  fase_gup: '#0ea5e9',
  fase_dibattimento_fase: '#14b8a6',
  fase_appello_penale: '#22c55e',
  fase_appello_civile: '#22c55e',
  fase_appello_esec: '#22c55e',
  fase_cassazione_penale: '#f59e0b',
  fase_cassazione_civile: '#f59e0b',
  fase_cassazione_amm: '#f59e0b',
  fase_cassazione_esec: '#f59e0b',
  fase_esecuzione_penale: '#ef4444',
  fase_esecuzione_civile: '#ef4444',
  fase_esecuzione_gen: '#ef4444'
};

function formatDateLocale(dateStr, withDay) {
  if (!dateStr) return '...';
  const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const monKeys = ['monJan','monFeb','monMar','monApr','monMay','monJun','monJul','monAug','monSep','monOct','monNov','monDec'];
  const mon = t(monKeys[d.getMonth()]);
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  let prefix = '';
  if (withDay) {
    const dayKeys = ['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat'];
    prefix = t(dayKeys[d.getDay()]) + ' ';
  }
  if (currentLang === 'en') return `${prefix}${mon} ${dd}, ${yyyy}`;
  return `${prefix}${dd} ${mon} ${yyyy}`;
}

function _fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function _generateProtocol(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const parts = dateStr.split('-');
    return parts[0] + parts[1] + parts[2].substring(0, 2);
  }
  const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function _assignProtocol(caseId, dateStr, entityType, excludeId) {
  const base = _generateProtocol(dateStr);
  if (!base) return '';
  const allProcs = await DB.getProceedings(caseId);
  const allFacts = [];
  const allActs = [];
  for (const p of allProcs) {
    const dossiers = await DB.getDossiers(p.id);
    for (const d of dossiers) {
      const facts = await DB.getFactsByDossier(d.id);
      allFacts.push(...facts);
      const acts = await DB.getActs(d.id);
      allActs.push(...acts);
    }
  }
  const existingProtocols = [];
  for (const p of allProcs) {
    if (p.protocol && !(entityType === 'proceeding' && p.id === excludeId)) {
      existingProtocols.push(p.protocol);
    }
  }
  for (const f of allFacts) {
    if (f.protocol && !(entityType === 'fact' && f.id === excludeId)) {
      existingProtocols.push(f.protocol);
    }
  }
  for (const a of allActs) {
    if (a.protocol && !(entityType === 'act' && a.id === excludeId)) {
      existingProtocols.push(a.protocol);
    }
  }
  for (const f of allFacts) {
    const proofs = await DB.getProofs(f.id);
    for (const pr of proofs) {
      if (pr.protocol && !(entityType === 'proof' && pr.id === excludeId)) {
        existingProtocols.push(pr.protocol);
      }
    }
  }
  if (!existingProtocols.includes(base)) return base;
  let counter = 2;
  while (existingProtocols.includes(`${base}-${counter}`)) counter++;
  return `${base}-${counter}`;
}

function _tlFormatDate(dateStr) {
  return formatDateLocale(dateStr, true);
}

let _tlAllEvents = [];

function renderProceedingTimeline(sd) {
  document.querySelectorAll('.tl-popup').forEach(p => p.remove());
  const container = document.getElementById('procTimelineContainer');
  if (!container) return;
  const phases = sd.phases || [];
  const topEvents = sd.events || [];
  _tlAllEvents = [];

  for (const ev of topEvents) {
    if (ev.date) _tlAllEvents.push({ date: ev.date, title: ev.title || '', description: ev.description || '', magistrate: ev.magistrate || '', phaseType: ev.phaseRef || 'generale', magistratoSubjectId: null });
  }
  for (const ph of phases) {
    for (const ev of (ph.events || [])) {
      if (ev.date) _tlAllEvents.push({ date: ev.date, title: ev.title || '', description: ev.description || '', magistrate: ev.magistrate || '', phaseType: ph.tipo || 'generale', magistratoSubjectId: ph.magistratoSubjectId || null });
    }
  }

  if (_tlAllEvents.length === 0) {
    container.innerHTML = `<p class="hint">${t('timelineNoEvents')}</p>`;
    return;
  }

  _tlAllEvents.sort((a, b) => a.date.localeCompare(b.date));
  const minDate = new Date(_tlAllEvents[0].date);
  const maxDate = new Date(_tlAllEvents[_tlAllEvents.length - 1].date);
  const totalMs = Math.max(maxDate - minDate, 86400000);

  const phaseTypes = [...new Set(_tlAllEvents.map(e => e.phaseType))];

  const grouped = {};
  for (const ev of _tlAllEvents) {
    if (!grouped[ev.phaseType]) grouped[ev.phaseType] = [];
    grouped[ev.phaseType].push(ev);
  }

  let dotIdx = 0;
  const lanes = Object.entries(grouped).map(([pt, events]) => {
    const color = PHASE_COLORS[pt] || '#8b5cf6';
    const lbl = t(pt) || pt;
    const dots = events.map(ev => {
      const pos = ((new Date(ev.date) - minDate) / totalMs) * 100;
      const idx = dotIdx++;
      return `<div class="tl-dot" style="left:${pos}%;color:${color}" data-tl-idx="${idx}" onclick="showTlPopup(this, ${idx})" title="${esc(_tlFormatDate(ev.date))}"></div>`;
    }).join('');
    return `
      <div class="tl-lane" data-type="${pt}">
        <div class="tl-lane-track">
          <div class="tl-lane-line" style="background:${color}"></div>
          ${dots}
        </div>
      </div>`;
  }).join('');

  const legend = phaseTypes.map(pt => {
    const color = PHASE_COLORS[pt] || '#8b5cf6';
    const lbl = t(pt) || pt;
    return `<span class="tl-legend-item"><span class="tl-legend-dot" style="background:${color}"></span>${esc(lbl)}</span>`;
  }).join('');

  const dateLabels = generateTimelineDateLabels(minDate, maxDate);
  container.innerHTML = `
    <div class="tl-header-row">
      <div style="display:flex;gap:4px;align-items:center">
        <button class="btn btn-xs" onclick="tlZoom(1)" data-testid="btn-tl-zoom-in">${t('zoomIn')}</button>
        <button class="btn btn-xs" onclick="tlZoom(-1)" data-testid="btn-tl-zoom-out">${t('zoomOut')}</button>
        <button class="btn btn-xs" onclick="tlZoom(0)" data-testid="btn-tl-zoom-reset">${t('zoomReset')}</button>
      </div>
      <button class="btn btn-xs" onclick="showTlEventListModal()" data-testid="btn-timeline-event-list">${t('timelineEventList')}</button>
    </div>
    <div class="timeline-chart-wrapper" id="tlChartWrapper">
      <div class="timeline-chart" id="tlChart">
        ${lanes}
        <div class="tl-date-axis">${dateLabels}</div>
      </div>
    </div>
    <div class="tl-legend">${legend}</div>`;

  _tlZoomLevel = 1;
  document.addEventListener('click', _closeTlPopup);
}

let _tlZoomLevel = 1;
function tlZoom(dir) {
  const chart = document.getElementById('tlChart');
  if (!chart) return;
  if (dir === 0) {
    _tlZoomLevel = 1;
  } else if (dir === 1) {
    _tlZoomLevel = Math.min(_tlZoomLevel + 0.5, 5);
  } else {
    _tlZoomLevel = Math.max(_tlZoomLevel - 0.5, 1);
  }
  chart.style.minWidth = (_tlZoomLevel * 100) + '%';
}

function _closeTlPopup(e) {
  if (e && (e.target.closest('.tl-popup') || e.target.closest('.tl-dot'))) return;
  document.querySelectorAll('.tl-popup').forEach(p => p.remove());
  document.querySelectorAll('.tl-dot-active').forEach(d => d.classList.remove('tl-dot-active'));
}

async function showTlPopup(dotEl, idx) {
  document.querySelectorAll('.tl-popup').forEach(p => p.remove());
  document.querySelectorAll('.tl-dot-active').forEach(d => d.classList.remove('tl-dot-active'));

  const ev = _tlAllEvents[idx];
  if (!ev) return;

  dotEl.classList.add('tl-dot-active');
  const color = PHASE_COLORS[ev.phaseType] || '#8b5cf6';
  const phaseLbl = t(ev.phaseType) || ev.phaseType;
  const magRoleCode = PHASE_TO_MAGISTRATE_ROLE[ev.phaseType] || 'magistrato';
  const magRoleLabel = t('procRole_' + magRoleCode);

  let magDisplay = '';
  if (ev.magistrate) {
    let salutation = '';
    if (ev.magistratoSubjectId) {
      const subj = await DB.getSubject(ev.magistratoSubjectId);
      if (subj && subj.salutation) salutation = subj.salutation + ' ';
    }
    magDisplay = `${magRoleLabel}: ${salutation}${esc(ev.magistrate)}`;
  }

  const popup = document.createElement('div');
  popup.className = 'tl-popup';
  popup.innerHTML = `
    <div class="tl-popup-phase"><span class="tl-popup-phase-dot" style="background:${color}"></span>${esc(phaseLbl)}</div>
    <div class="tl-popup-date">${_tlFormatDate(ev.date)}</div>
    <div class="tl-popup-title">${esc(ev.title)}</div>
    ${magDisplay ? `<div class="tl-popup-mag">${magDisplay}</div>` : ''}
    ${ev.description ? `<div class="tl-popup-desc">${esc(ev.description)}</div>` : ''}
  `;
  document.body.appendChild(popup);
  const rect = dotEl.getBoundingClientRect();
  popup.style.left = (rect.left + rect.width / 2 - popup.offsetWidth / 2) + 'px';
  popup.style.top = (rect.top - popup.offsetHeight - 12 + window.scrollY) + 'px';
}

function toggleDetailPrintSection() {
  const sec = document.getElementById('detailPrintSection');
  const btn = document.getElementById('btnToggleRolesEvents');
  if (!sec) return;
  sec.classList.toggle('visible');
  if (btn) btn.textContent = sec.classList.contains('visible') ? t('hideRolesEvents') : t('showRolesEvents');
}

async function showTlEventListModal() {
  const existing = document.querySelector('.tl-event-modal-overlay');
  if (existing) existing.remove();

  const rowsArr = [];
  for (const ev of _tlAllEvents) {
    const color = PHASE_COLORS[ev.phaseType] || '#8b5cf6';
    const magRoleCode = PHASE_TO_MAGISTRATE_ROLE[ev.phaseType] || 'magistrato';
    const magRoleLabel = t('procRole_' + magRoleCode);
    let magDisplay = '';
    if (ev.magistrate) {
      let salutation = '';
      if (ev.magistratoSubjectId) {
        const subj = await DB.getSubject(ev.magistratoSubjectId);
        if (subj && subj.salutation) salutation = subj.salutation + ' ';
      }
      magDisplay = `${magRoleLabel}: ${salutation}${esc(ev.magistrate)}`;
    }
    rowsArr.push(`
      <div class="tl-event-modal-row">
        <div class="tl-event-modal-date">${_tlFormatDate(ev.date)}</div>
        <div class="tl-event-modal-phase"><span class="tl-legend-dot" style="background:${color}"></span></div>
        <div class="tl-event-modal-info">
          <div class="tl-event-modal-title">${esc(ev.title)}</div>
          ${magDisplay ? `<div class="tl-event-modal-mag">${magDisplay}</div>` : ''}
          ${ev.description ? `<div class="tl-event-modal-desc">${esc(ev.description)}</div>` : ''}
        </div>
      </div>`);
  }
  const rows = rowsArr.join('');

  const overlay = document.createElement('div');
  overlay.className = 'tl-event-modal-overlay';
  overlay.innerHTML = `
    <div class="tl-event-modal">
      <div class="tl-event-modal-header">
        <span>${t('timelineEventList')}</span>
        <button class="btn btn-xs" onclick="this.closest('.tl-event-modal-overlay').remove()" data-testid="btn-close-event-modal">${t('timelineClose')}</button>
      </div>
      <div class="tl-event-modal-body">${rows}</div>
    </div>`;
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

async function showProceedingDetail(id) {
  const p = await DB.getProceeding(id);
  if (!p) return;
  const panel = document.getElementById('detailView');
  const badge = typeToBadge(p.type, p.specificData?.origineProc);
  const sd = p.specificData || {};

  const specificHtml = await renderSpecificDetailAccordion(p.type, sd, id);

  let parentLabel = '';
  if (p.parentProceedingId) {
    const parentP = await DB.getProceeding(p.parentProceedingId);
    if (parentP) parentLabel = esc(buildProcTitle(parentP));
  }

  const detailTitle = buildProcTitle(p);

  const caseObj = await DB.getCase(p.caseId);
  const caseTitle = caseObj ? _caseDisplayTitle(caseObj) : '';
  const pmName = (sd.phases || []).find(ph => ph.tipo === 'fase_procura')?.magistratoPrincipale || '';

  panel.innerHTML = `
    <div class="detail-panel">
      <div class="print-only-header">
        <div class="print-case-title">${esc(caseTitle)}</div>
        <div class="print-proc-line">
          <span class="print-proc-title">${esc(detailTitle)}</span>
          <span class="tree-badge ${badge.cls}" style="font-size:11px">${badge.label}</span>
          <span class="print-proc-type">${t(p.type)}</span>
        </div>
        ${pmName ? `<div class="print-pm-line">${t('procRole_pm')}: ${esc(pmName)}</div>` : ''}
      </div>
      <div class="proc-form-header no-print">
        <div class="proc-form-header-title has-title">
          ${esc(detailTitle)}
          ${p.protocol ? `<span class="tree-badge tree-badge-neutral" style="font-size:10px;margin-left:8px" data-testid="text-proc-protocol">Prot. ${esc(p.protocol)}</span>` : ''}
          ${sd.origineProc === 'integrazione' ? `<div class="proc-form-header-integrazione">${t('origineProc_perIntegrazione')}</div><div class="proc-form-header-viol">${t('origineProc_illegittimo')}</div>` : ''}
        </div>
        <div class="proc-form-header-controls">
          ${parentLabel ? `<div class="proc-header-info-item"><span class="proc-header-info-label">${t('procPadre')}:</span> ${parentLabel}</div>` : ''}
          <div class="proc-header-info-item"><span class="tree-badge ${badge.cls}" style="font-size:11px">${badge.label}</span> ${t(p.type)}</div>
          ${p.status ? `<div class="proc-header-info-item"><span class="proc-header-status-val">${t(p.status)}</span></div>` : ''}
        </div>
      </div>
      <div class="detail-header-actions no-print" style="margin-bottom:12px;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-sm" onclick="toggleDetailPrintSection()" data-testid="button-toggle-roles-events" id="btnToggleRolesEvents">${t('showRolesEvents')}</button>
        <button class="btn btn-sm" onclick="window.print()" data-testid="button-print-detail">${t('printDetail')}</button>
        ${creatorOnly(`<button class="btn btn-sm" onclick="openForm('proceeding', ${p.caseId}, ${id})">${t('edit')}</button>`)}
        ${creatorOnly(`<button class="btn btn-sm btn-danger" onclick="deleteEntity('proceeding', ${id})">${t('delete')}</button>`)}
      </div>

      <div class="timeline-box" style="margin-bottom:12px">
        <div class="timeline-box-header"><h3>${t('procTimelineTitle')} — ${esc(detailTitle)}</h3></div>
        <div id="procTimelineContainer"></div>
      </div>

      <div class="no-print">${specificHtml}</div>

      <div class="form-section-group print-luogo-section" style="margin-top:12px">
        <div class="phase-section-label" style="margin-bottom:8px">${t('tabLuogo')}</div>
        <div class="detail-grid">
          <div class="detail-grid-row detail-grid-row-5">
            ${detailField(t('luogoFatti'), p.luogoFatti || '-')}
            ${detailField(t('citta'), p.citta || '-')}
            ${detailField(t('provincia'), p.provincia || '-')}
            ${detailField(t('regione'), p.regione || '-')}
            ${detailField(t('stato_geo'), p.stato || '-')}
          </div>
        </div>
      </div>

      ${p.autoritaProcedente ? `
      <div class="form-section-group vigilance-detail-section" style="margin-top:12px">
        <div class="phase-section-label" style="margin-bottom:8px">${t('catenaVigilanza')}</div>
        <div id="detailVigilanceContent"></div>
      </div>` : ''}

      <div class="no-print">${await renderPhasesDetailSection(sd.phases || [], id)}</div>

      <div id="detailPrintSection" class="detail-collapsible">
        <div class="detail-section-fixed print-roles-box">
          <div class="detail-section-title-row">
            <h3 class="detail-section-title">${t('procRolesTitle')}</h3>
            ${creatorOnly(`<button class="btn btn-xs btn-primary no-print" onclick="openAddRoleModal(${id}, '${p.type}')" data-testid="button-add-proc-role">${t('addRole')}</button>`)}
          </div>
          <div id="procRolesListContainer"></div>
        </div>
        ${renderEventsDetailSection(sd.events || [], sd.phases || [])}
      </div>

      ${await renderPhaseEventsPrintSection(sd.phases || [], id, p.autoritaProcedente || '')}

    </div>
  `;
  renderProceedingTimeline(sd);
  renderProceedingRolesDetail(id);
  showLinkedSection('proceeding', id);

  if (p.autoritaProcedente && p.tribunale) {
    const detVigEl = document.getElementById('detailVigilanceContent');
    if (detVigEl) {
      const subjects = await _ensureCachedSubjects();
      detVigEl.innerHTML = buildVigilanceChainForDetail(subjects, p);
    }
  }
}

async function renderIndagatiDetail(indagati) {
  if (!Array.isArray(indagati) || indagati.length === 0) return `<p class="hint">${t('noIndagati')}</p>`;
  await _loadAllLists();
  let html = '';
  for (const entry of indagati) {
    const subj = await DB.getSubject(entry.subjectId);
    const name = subj ? `${esc(subj.lastName)} ${esc(subj.firstName)}` : (entry.label || '?');
    let qualLabel = '';
    if (entry.qualitaDi === 'privato_cittadino') {
      qualLabel = t('privatoCittadino');
    } else if (entry.role) {
      if (entry.role.roleId) { const r = _allRoles.find(x => x.id === entry.role.roleId); if (r) qualLabel = _labelFor(r); }
      else if (entry.role.subcategoryId) { const s = _allSubcategories.find(x => x.id === entry.role.subcategoryId); if (s) qualLabel = _labelFor(s); }
      else if (entry.role.categoryId) { const c = _allCategories.find(x => x.id === entry.role.categoryId); if (c) qualLabel = _labelFor(c); }
    }
    if (!qualLabel && entry.roleLabel) {
      const parts = entry.roleLabel.split(' > ');
      qualLabel = parts[parts.length - 1].trim();
    }
    let roleDisplay = '';
    if (qualLabel) {
      roleDisplay = `${t('inQualitaDi')} ${qualLabel}`;
    } else if (entry.procRole) {
      roleDisplay = t('procRole_' + entry.procRole);
    }
    let reatiEspHtml = '';
    if (entry.reatiEsponente && entry.reatiEsponente.length > 0) {
      const reatiRows = [];
      let allNodi = null;
      try { allNodi = await NormDB.getAllNodi(); } catch(e) {}
      for (const re of entry.reatiEsponente) {
        let lbl = re.label || '-';
        if (allNodi) {
          let nodo = null;
          if (re.nodeId) {
            nodo = allNodi.find(n => n.id === parseInt(re.nodeId));
          }
          if (!nodo && re.label) {
            const numMatch = re.label.match(/art\.\s*(\d+(?:\s*[-‐]\s*\w+)?)/i);
            if (numMatch) {
              const artNum = numMatch[1].replace(/\s+/g, '').trim();
              nodo = allNodi.find(n => n.tipo_nodo === 'articolo' && n.numero === artNum && (n.testo_it || '').length > 0);
              if (nodo) re.nodeId = nodo.id;
            }
          }
          if (nodo) {
            const testo = currentLang === 'en' ? (nodo.testo_en || nodo.testo_it || '') : (nodo.testo_it || '');
            const desc = testo.split('\n')[0].split('.')[0] || nodo.rubrica || '';
            lbl = 'art. ' + (nodo.numero || '') + ' c.p.' + (desc ? ' - ' + desc : '');
          }
        }
        reatiRows.push(`<div class="ipotesi-reato-detail-row">
          <span class="ipotesi-reato-badge">${esc(lbl)}</span>
          ${re.descrizione ? `<span class="ipotesi-reato-desc">${esc(re.descrizione)}</span>` : ''}
        </div>`);
      }
      reatiEspHtml = `<div class="ipotesi-reato-section-detail">${reatiRows.join('')}</div>`;
    }
    html += `<div class="indagato-card indagato-card-2col">
      <div class="indagato-col-left">
        <span class="indagato-name">${name}</span>
        ${roleDisplay ? `<span class="indagato-role">${esc(roleDisplay)}</span>` : ''}
      </div>
      <div class="indagato-col-right">
        ${reatiEspHtml}
      </div>
    </div>`;
  }
  return html;
}

function renderLinkedActsDetail(linkedActIds, allActs) {
  if (!linkedActIds || linkedActIds.length === 0) return '';
  const badges = linkedActIds.map(actId => {
    const act = allActs.find(a => a.id === actId);
    const label = act ? act.title : `Atto #${actId}`;
    const dossierHint = act && act.dossierName ? ` (${esc(act.dossierName)})` : '';
    return `<a href="#" class="badge badge-outline" style="margin:2px;cursor:pointer;text-decoration:none" onclick="event.preventDefault(); navigateToAct(${actId})" data-testid="link-act-${actId}">${esc(label)}${dossierHint}</a>`;
  }).join('');
  return `<div style="margin-top:4px"><span style="font-size:11px;font-weight:600">${t('linkedActs')}:</span> ${badges}</div>`;
}

async function renderPhaseEventsPrintSection(phases, proceedingId, autoritaProcedente) {
  if (!phases || phases.length === 0) return '';
  let allActs = [];
  if (proceedingId) {
    try {
      const dossiers = await DB.getDossiers(proceedingId);
      for (const d of dossiers) {
        const acts = await DB.getActs(d.id);
        for (const a of acts) {
          allActs.push({ id: a.id, title: a.title || `Atto #${a.id}`, dossierName: d.title || d.name || '' });
        }
      }
    } catch (e) {}
  }
  const allegatoMap = {};
  let allegatoCounter = 0;
  for (const ph of phases) {
    const events = ph.tipo === 'fase_procura' ? (ph.pmEvents || []) : (ph.phaseEvents || []);
    for (const ev of events) {
      for (const actId of (ev.linkedActIds || [])) {
        if (!allegatoMap[actId]) {
          allegatoCounter++;
          const act = allActs.find(a => a.id === actId);
          allegatoMap[actId] = {
            num: allegatoCounter,
            title: act ? act.title : `Atto #${actId}`,
            dossierName: act ? act.dossierName : ''
          };
        }
      }
    }
  }
  let html = '';
  for (const ph of phases) {
    let phLabel = ph.tipo ? t(ph.tipo) || ph.tipo : '';
    if (ph.tipo === 'fase_procura' && autoritaProcedente) {
      const pmParts = [autoritaProcedente];
      if (ph.magistratoPrincipale) pmParts.push('PM ' + ph.magistratoPrincipale);
      phLabel = pmParts.join(' - ');
    }
    const events = ph.tipo === 'fase_procura' ? (ph.pmEvents || []) : (ph.phaseEvents || []);
    if (events.length === 0) continue;
    const evHtml = events.map(ev => {
      const tipoLabel = ev.tipo ? t(ev.tipo) : '-';
      const sottoLabel = ev.sottoTipo ? t(ev.sottoTipo) : '-';
      const noteText = currentLang === 'en' ? (ev.notesEn || ev.notes || '') : (ev.notes || '');
      const allegatiRefs = (ev.linkedActIds || []).map(actId => {
        const info = allegatoMap[actId];
        return info ? `${t('vediAllegato')} ${info.num}` : '';
      }).filter(Boolean);
      const allegatiStr = allegatiRefs.length > 0 ? `<div style="margin-top:4px;font-size:11px;font-style:italic">(${allegatiRefs.join('; ')})</div>` : '';
      return `<div style="margin-bottom:6px;padding:6px;border:1px solid #ccc;border-radius:4px">
        <div style="display:flex;gap:16px;font-size:12px">
          <span><strong>${t('pmTipoIntervento')}:</strong> ${tipoLabel}</span>
          <span><strong>${t('pmSottoTipo')}:</strong> ${sottoLabel}</span>
          <span><strong>${t('pmEventDate')}:</strong> ${ev.date || '-'}</span>
        </div>
        ${noteText ? `<div style="margin-top:4px;font-size:12px;text-align:justify"><strong>${t('pmEventNotes')}:</strong> ${esc(noteText)}</div>` : ''}
        ${allegatiStr}
      </div>`;
    }).join('');
    html += `<div style="margin-top:8px">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px">${esc(phLabel)}</div>
      ${evHtml}
    </div>`;
  }
  if (!html && allegatoCounter === 0) return '';
  let coversHtml = '';
  const sortedAllegati = Object.values(allegatoMap).sort((a, b) => a.num - b.num);
  for (const all of sortedAllegati) {
    coversHtml += `<div class="print-allegato-cover">
      <div class="print-allegato-num">${t('allegatoN')} ${all.num}</div>
      <div class="print-allegato-title">${esc(all.title)}</div>
      ${all.dossierName ? `<div class="print-allegato-dossier">${esc(all.dossierName)}</div>` : ''}
    </div>`;
  }
  return `<div class="print-only print-phases-section form-section-group" style="margin-top:12px">
    <div class="phase-section-label" style="margin-bottom:8px">${t('fasiProcedimentali')}</div>
    ${html}
  </div>${coversHtml ? `<div class="print-only">${coversHtml}</div>` : ''}`;
}

async function navigateToAct(actId) {
  const act = await DB.getAct(actId);
  if (!act) return;
  const dossier = await DB.getDossier(act.dossierId);
  if (!dossier) return;
  const proc = await DB.getProceeding(dossier.proceedingId);
  if (!proc) return;
  state.expanded['case_' + proc.caseId] = true;
  state.expanded['proceeding_' + proc.id] = true;
  state.expanded['dossier_' + dossier.id] = true;
  await selectItem('act', actId);
}

async function renderPhasesDetailSection(phases, proceedingId) {
  if (!phases || phases.length === 0) return '';
  const allSubjects = await _ensureCachedSubjects();
  let allActs = [];
  if (proceedingId) {
    try {
      const dossiers = await DB.getDossiers(proceedingId);
      for (const d of dossiers) {
        const acts = await DB.getActs(d.id);
        for (const a of acts) {
          allActs.push({ id: a.id, title: a.title || `Atto #${a.id}`, dossierName: d.title || d.name || '' });
        }
      }
    } catch (e) {}
  }
  const cards = [];
  for (let idx = 0; idx < phases.length; idx++) {
    const ph = phases[idx];
    const phLabel = ph.tipo ? t(ph.tipo) || ph.tipo : `${t('phaseType')} ${idx + 1}`;
    const regLabel = getPhaseRegisterLabel(ph.tipo);
    const regNumberLabel = regLabel ? `N. ${regLabel}` : t('phaseRegNumber');
    const magRoleLabel = t('procRole_' + (PHASE_TO_MAGISTRATE_ROLE[ph.tipo] || 'magistrato'));

    let procuraHtml = '';
    if (ph.tipo === 'fase_procura') {
      const plHtml = (ph.personeLese || []).map(pl => {
        const subj = pl.subjectId ? allSubjects.find(s => s.id === pl.subjectId) : null;
        const name = subj ? `${subj.salutation ? subj.salutation + ' ' : ''}${subj.firstName} ${subj.lastName}` : (pl.name || '-');
        return `<div class="detail-field-value" style="padding:2px 0">${esc(name)}</div>`;
      }).join('');
      if (plHtml) {
        procuraHtml += `
          <div class="form-section-group" style="margin-top:12px">
            <div class="phase-section-label" style="margin-bottom:8px">${t('personaLesa')}</div>
            ${plHtml}
          </div>`;
      }

      const _cpArtsDetail = await _loadCPArticles();
      const irItems = [];
      for (const ir of (ph.indagatiReati || [])) {
        const subj = ir.subjectId ? allSubjects.find(s => s.id === ir.subjectId) : null;
        const name = subj ? `${subj.salutation ? subj.salutation + ' ' : ''}${subj.firstName} ${subj.lastName}` : '-';
        const translatedReati = (ir.reati || []).filter(r => r).map(r => {
          const numMatch = r.match(/art\.\s*(\d+(?:\s*[-‐]\s*\w+)?)/i);
          if (numMatch && _cpArtsDetail.length > 0) {
            const artNum = numMatch[1].replace(/\s+/g, '').trim();
            const found = _cpArtsDetail.find(a => a.numero === artNum);
            if (found) return found.label;
          }
          return r;
        });
        const reati = translatedReati.map(r => `<span class="badge badge-outline" style="margin:2px">${esc(r)}</span>`).join('');
        irItems.push(`<div style="margin-bottom:8px;padding:6px;border:1px solid var(--border);border-radius:4px">
          <div style="font-weight:600">N.${irItems.length + 1} ${esc(name)}</div>
          ${reati ? `<div style="margin-top:4px">${reati}</div>` : ''}
        </div>`);
      }
      const irHtml = irItems.join('');
      if (irHtml) {
        procuraHtml += `
          <div class="form-section-group" style="margin-top:12px">
            <div class="phase-section-label" style="margin-bottom:8px">${t('indagatiReatiSection')}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${irHtml}</div>
          </div>`;
      }

      const pmHtml = (ph.pmEvents || []).map(ev => {
        const tipoLabel = ev.tipo ? t(ev.tipo) : '-';
        const sottoLabel = ev.sottoTipo ? t(ev.sottoTipo) : '-';
        const linkedActsHtml = renderLinkedActsDetail(ev.linkedActIds, allActs);
        return `<div style="margin-bottom:6px;padding:6px;border:1px solid var(--border);border-radius:4px">
          <div class="detail-grid-row detail-grid-row-3">
            ${detailField(t('pmEventDate'), formatDateLocale(ev.date, false))}
            ${detailField(t('pmTipoIntervento'), tipoLabel)}
            ${detailField(t('pmSottoTipo'), sottoLabel)}
          </div>
          ${currentLang === 'en' ? (ev.notesEn ? detailField(t('pmEventNotes'), ev.notesEn) : '') : (ev.notes ? detailField(t('pmEventNotes'), ev.notes) : '')}
          ${linkedActsHtml}
        </div>`;
      }).join('');
      if (pmHtml) {
        procuraHtml += `
          <div class="form-section-group" style="margin-top:12px">
            <div class="phase-section-label" style="margin-bottom:8px">${t('pmEventsSection')}</div>
            ${pmHtml}
          </div>`;
      }
    }

    cards.push(`
      <div class="phase-detail-card">
        <div class="phase-detail-header">
          <span class="phase-detail-num">F${idx + 1}</span>
          <span class="phase-detail-type">${esc(phLabel)}</span>
        </div>
        <div class="phase-detail-fields">
          <div class="detail-grid">
            <div class="detail-grid-row detail-grid-row-6">
              ${detailField(t('phaseOffice'), ph.ufficio || '-')}
              ${detailField(regNumberLabel, ph.numeroRegistro ? ph.numeroRegistro + (ph.anno ? '/' + ph.anno : '') : '-')}
              ${detailField(t('modelloProcura'), ph.modello ? (t(ph.modello + '_short') || t(ph.modello)) : '-')}
              ${detailField(magRoleLabel, ph.magistratoPrincipale || '-')}
              ${detailField(t('dataIscrizione'), ph.dataIscrizione || '-')}
              ${detailField(t('termineIndagini'), ph.termineIndagini || '-')}
            </div>
            ${ph.altriMagistrati ? `<div class="detail-grid-row">${detailField(t('phaseOtherMagistrates'), ph.altriMagistrati)}</div>` : ''}
          </div>
          ${procuraHtml}
        </div>
      </div>`);
  }
  return `
    <div class="detail-section-fixed">
      <h3 class="detail-section-title">${t('fasiProcedimentali')}</h3>
      ${cards.join('')}
    </div>`;
}

function renderEventsDetailSection(events, phases) {
  let allEvents = events || [];
  if (allEvents.length === 0 && phases) {
    for (const ph of phases) {
      if (ph.events && ph.events.length > 0) allEvents = allEvents.concat(ph.events);
    }
  }
  if (allEvents.length === 0) return '';
  allEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return `
    <div class="detail-section-fixed events-detail-section">
      <h3 class="detail-section-title">${t('eventsTimelineTitle')}</h3>
      <div class="events-detail-list">
        ${allEvents.map(ev => `
          <div class="event-detail-row">
            <span class="event-detail-date">${ev.date || '—'}</span>
            <span class="event-detail-title">${esc(ev.title || '')}</span>
            ${ev.magistrate ? `<span class="event-detail-mag">${esc(ev.magistrate)}</span>` : ''}
            ${ev.description ? `<span class="event-detail-desc">${esc(ev.description)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>`;
}

async function renderSpecificDetail(type, sd) {
  if (type === 'penale') {
    return `
      <div id="tab-origineAtto" class="tab-content">
        ${detailField(t('penaleTipoAtto'), sd.tipoAtto ? t(sd.tipoAtto) : '-')}
      </div>
      <div id="tab-indagati" class="tab-content">
        ${await renderIndagatiDetail(sd.indagati)}
      </div>
      `;
  }
  if (type === 'civile') {
    return `
      <div id="tab-parti" class="tab-content">
        ${detailField(t('civileTipo'), sd.tipoCivile ? t(sd.tipoCivile) : '-')}
        ${detailField(t('civileAttore'), sd.attore || '-')}
        ${detailField(t('civileConvenuto'), sd.convenuto || '-')}
      </div>
      <div id="tab-istruttoria" class="tab-content">
        ${detailField(t('civileCTU'), sd.ctu || '-')}
        ${detailField(t('civileDataCTU'), sd.dataCTU || '-')}
        ${detailField(t('civileArticolo'), sd.articolo || '-')}
      </div>
      <div id="tab-decisione" class="tab-content">
        ${detailField(t('civileDecisione'), sd.decisione ? t(sd.decisione) : '-')}
        ${detailField(t('civileDataPubbl'), sd.dataPubbl || '-')}
        ${detailField(t('civileDataComun'), sd.dataComun || '-')}
      </div>`;
  }
  if (type === 'amministrativo') {
    return `
      <div id="tab-ricorso" class="tab-content">
        ${detailField(t('ammTAR'), sd.tar || '-')}
        ${detailField(t('ammRG'), sd.rgTar || '-')}
        ${detailField(t('ammTipoRicorso'), sd.tipoRicorso || '-')}
        ${detailField(t('ammProvvedimento'), sd.provvedimento || '-')}
        ${detailField(t('ammDataNotifica'), sd.dataNotifica || '-')}
      </div>
      <div id="tab-cautelare" class="tab-content">
        ${detailField(t('ammSospensiva'), sd.sospensiva ? t('si') : t('no'))}
        ${detailField(t('ammOrdinanzaCaut'), sd.ordinanzaCaut || '-')}
      </div>
      <div id="tab-appelloAmm" class="tab-content">
        ${detailField(t('ammAppelloCS'), sd.appelloCS ? t('si') : t('no'))}
      </div>`;
  }
  if (type === 'esecuzione') {
    return `
      <div id="tab-pignoramento" class="tab-content">
        ${detailField(t('eseRGE'), sd.rge || '-')}
        ${detailField(t('eseTipo'), sd.tipoEse ? t(sd.tipoEse) : '-')}
        ${detailField(t('esePignoramento'), sd.dataPignoramento || '-')}
      </div>
      <div id="tab-soggetti" class="tab-content">
        ${detailField(t('eseGiudice'), sd.giudice || '-')}
        ${detailField(t('eseCreditore'), sd.creditore || '-')}
        ${detailField(t('eseDebitore'), sd.debitore || '-')}
        ${detailField(t('eseCustode'), sd.custode || '-')}
        ${detailField(t('eseDelegato'), sd.delegato || '-')}
      </div>
      <div id="tab-vendita" class="tab-content">
        ${detailField(t('eseDataAsta'), sd.dataAsta || '-')}
        ${detailField(t('eseStatoVendita'), sd.statoVendita || '-')}
      </div>
      <div id="tab-perizia" class="tab-content">
        ${detailField(t('esePerizia'), sd.perizia || '-')}
      </div>`;
  }
  return '';
}

async function renderProceedingRolesDetail(proceedingId) {
  const container = document.getElementById('procRolesListContainer');
  if (!container) return;
  const roles = await DB.getProceedingRoles(proceedingId);
  if (roles.length === 0) {
    container.innerHTML = `<p class="hint">${t('noProcRoles')}</p>`;
    return;
  }
  const ROLE_ORDER_DETAIL = ['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale', 'responsabile_vigilanza', 'pm', 'indagato', 'imputato', 'gip', 'gup', 'giudice_dibattimento', 'giudice_appello', 'giudice_cassazione', 'magistrato'];
  roles.sort((a, b) => {
    const aIdx = ROLE_ORDER_DETAIL.indexOf(a.roleCode);
    const bIdx = ROLE_ORDER_DETAIL.indexOf(b.roleCode);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
  await _loadAllLists();
  const VIGILANCE_CODES = ['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale'];
  const vigRoles = roles.filter(r => VIGILANCE_CODES.includes(r.roleCode));
  const procRoles = roles.filter(r => !VIGILANCE_CODES.includes(r.roleCode));

  const renderRoleCard = (r) => {
    const salutation = r.subject && r.subject.salutation ? esc(r.subject.salutation) + ' ' : '';
    const name = r.subject ? `${salutation}${esc(r.subject.firstName)} ${esc(r.subject.lastName)}` : '?';
    const roleLabel = tRole(r.roleCode);
    return `
      <div class="proc-role-card" data-testid="proc-role-card-${r.id}">
        <div class="proc-role-info">
          <span class="proc-role-badge">${esc(roleLabel)}</span>
          <span class="proc-role-name">${name}</span>
        </div>
        ${creatorOnly(`<button class="btn btn-xs btn-danger" onclick="removeProcRole(${r.id}, ${proceedingId})" data-testid="button-remove-proc-role-${r.id}">${t('remove')}</button>`)}
      </div>`;
  };

  let html = '';
  if (vigRoles.length > 0) {
    html += `<div class="proc-roles-print-title">${t('catenaVigilanza')}</div>`;
    html += vigRoles.map(renderRoleCard).join('');
  }
  if (procRoles.length > 0) {
    html += `<div class="proc-roles-print-title">${t('soggettiProcessuali')}</div>`;
    html += procRoles.map(renderRoleCard).join('');
  }
  container.innerHTML = html;
}

async function renderFormProcRoles(proceedingId) {
  const container = document.getElementById('formProcRolesContainer');
  if (!container) return;
  const roles = await DB.getProceedingRoles(proceedingId);
  if (roles.length === 0) {
    container.innerHTML = `<p class="hint">${t('noProcRoles')}</p>`;
    return;
  }
  const ROLE_ORDER_FORM = ['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale', 'responsabile_vigilanza', 'pm', 'indagato', 'imputato', 'gip', 'gup', 'giudice_dibattimento', 'giudice_appello', 'giudice_cassazione', 'magistrato'];
  roles.sort((a, b) => {
    const aIdx = ROLE_ORDER_FORM.indexOf(a.roleCode);
    const bIdx = ROLE_ORDER_FORM.indexOf(b.roleCode);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
  await _loadAllLists();
  container.innerHTML = roles.map(r => {
    const salutation = r.subject && r.subject.salutation ? esc(r.subject.salutation) + ' ' : '';
    const name = r.subject ? `${salutation}${esc(r.subject.firstName)} ${esc(r.subject.lastName)}` : '?';
    const roleLabel = tRole(r.roleCode);
    return `
      <div class="proc-role-card" data-testid="form-proc-role-card-${r.id}">
        <div class="proc-role-info">
          <span class="proc-role-badge">${esc(roleLabel)}</span>
          <span class="proc-role-name">${name}</span>
        </div>
      </div>`;
  }).join('');
}

async function renderSpecificDetailAccordion(type, sd, proceedingId) {
  if (type === 'penale') {
    const isUfficio = sd.origineProc === 'ufficio';
    let html = '';

    if (!isUfficio) {
      const soggettiLabel = t('tabIndagati') + (sd.soggettiTipo === 'ignoti' ? ' — ' + t('soggettiIgnoti') : '');
      const indagatiHtml = sd.soggettiTipo === 'ignoti' ? '' : await renderIndagatiDetail(sd.indagati);
      if (indagatiHtml) {
        html += `
          <div class="form-section-group" style="margin-top:12px">
            <div class="phase-section-label" style="margin-bottom:8px">${soggettiLabel}</div>
            ${indagatiHtml}
          </div>`;
      }
    }

    if (!isUfficio) {
      const originFields = `
        <div class="detail-grid">
          <div class="detail-grid-row detail-grid-row-4">
            ${detailField(t('penaleTipoAtto'), sd.tipoAtto ? t(sd.tipoAtto) : '-')}
            ${detailField(t('canaleRicezione'), sd.canaleRicezione ? t(sd.canaleRicezione) : '-')}
            ${detailField(t('dataDeposito'), sd.dataDeposito || '-')}
            ${detailField(t('cittaDeposito'), sd.cittaDeposito || '-')}
          </div>
        </div>`;
      html += `
        <div class="form-section-group" style="margin-top:12px">
          <div class="phase-section-label" style="margin-bottom:8px">${t('tabOrigineAtto')}</div>
          ${originFields}
        </div>`;
    }

    return html;
  }
  if (type === 'civile') {
    return `
      ${renderAccordionStart('det-parti', t('tabParti'), false)}
        ${detailField(t('civileTipo'), sd.tipoCivile ? t(sd.tipoCivile) : '-')}
        ${detailField(t('civileAttore'), sd.attore || '-')}
        ${detailField(t('civileConvenuto'), sd.convenuto || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-istruttoria', t('tabIstruttoria'), false)}
        ${detailField(t('civileCTU'), sd.ctu || '-')}
        ${detailField(t('civileDataCTU'), sd.dataCTU || '-')}
        ${detailField(t('civileArticolo'), sd.articolo || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-decisione', t('tabDecisione'), false)}
        ${detailField(t('civileDecisione'), sd.decisione ? t(sd.decisione) : '-')}
        ${detailField(t('civileDataPubbl'), sd.dataPubbl || '-')}
        ${detailField(t('civileDataComun'), sd.dataComun || '-')}
      ${renderAccordionEnd()}`;
  }
  if (type === 'amministrativo') {
    return `
      ${renderAccordionStart('det-ricorso', t('tabRicorso'), false)}
        ${detailField(t('ammTAR'), sd.tar || '-')}
        ${detailField(t('ammRG'), sd.rgTar || '-')}
        ${detailField(t('ammTipoRicorso'), sd.tipoRicorso || '-')}
        ${detailField(t('ammProvvedimento'), sd.provvedimento || '-')}
        ${detailField(t('ammDataNotifica'), sd.dataNotifica || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-cautelare', t('tabCautelare'), false)}
        ${detailField(t('ammSospensiva'), sd.sospensiva ? t('si') : t('no'))}
        ${detailField(t('ammOrdinanzaCaut'), sd.ordinanzaCaut || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-appelloAmm', t('tabAppelloAmm'), false)}
        ${detailField(t('ammAppelloCS'), sd.appelloCS ? t('si') : t('no'))}
      ${renderAccordionEnd()}`;
  }
  if (type === 'esecuzione') {
    return `
      ${renderAccordionStart('det-pignoramento', t('tabPignoramento'), false)}
        ${detailField(t('eseRGE'), sd.rge || '-')}
        ${detailField(t('eseTipo'), sd.tipoEse ? t(sd.tipoEse) : '-')}
        ${detailField(t('esePignoramento'), sd.dataPignoramento || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-soggetti', t('tabSoggetti'), false)}
        ${detailField(t('eseGiudice'), sd.giudice || '-')}
        ${detailField(t('eseCreditore'), sd.creditore || '-')}
        ${detailField(t('eseDebitore'), sd.debitore || '-')}
        ${detailField(t('eseCustode'), sd.custode || '-')}
        ${detailField(t('eseDelegato'), sd.delegato || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-vendita', t('tabVendita'), false)}
        ${detailField(t('eseDataAsta'), sd.dataAsta || '-')}
        ${detailField(t('eseStatoVendita'), sd.statoVendita || '-')}
      ${renderAccordionEnd()}
      ${renderAccordionStart('det-perizia', t('tabPerizia'), false)}
        ${detailField(t('esePerizia'), sd.perizia || '-')}
      ${renderAccordionEnd()}`;
  }
  return '';
}

function detailField(label, value) {
  return `<div class="detail-field"><div class="detail-field-label">${label}</div><div class="detail-field-value">${esc(value)}</div></div>`;
}

async function showDossierDetail(id) {
  const d = await DB.getDossier(id);
  if (!d) return;
  const panel = document.getElementById('detailView');
  const entityFiles = await getDisplayFiles('dossier', id);
  const fileHtml = renderMultiFileDisplay(entityFiles, 'dossier', id);

  panel.innerHTML = `
    <div class="detail-panel">
      <div class="detail-header">
        <h2>${esc(d.title)}</h2>
        <div class="detail-header-actions">
          ${creatorOnly(`<button class="btn btn-sm" onclick="openForm('dossier', ${d.proceedingId}, ${id})">${t('edit')}</button>`)}
          ${creatorOnly(`<button class="btn btn-sm btn-danger" onclick="deleteEntity('dossier', ${id})">${t('delete')}</button>`)}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-header"><h3>${t('fileSection')}</h3></div>
        ${fileHtml}
      </div>
    </div>
  `;
  showLinkedSection('dossier', id);
}

async function showActDetail(id) {
  const a = await DB.getAct(id);
  if (!a) return;
  const panel = document.getElementById('detailView');
  if (!state._factDetailTab || state._detailContext !== 'act_' + id) {
    state._factDetailTab = 'atto';
    state._detailContext = 'act_' + id;
  }
  const activeTab = state._factDetailTab;

  const actFactRels = await DB.getActFactRelations(id);

  const badgeCls = 'act-badge act-badge-' + a.type;
  const entityFiles = await getDisplayFiles('act', id);
  const fileHtml = renderMultiFileDisplay(entityFiles, 'act', id);

  let worstState = null;
  if (actFactRels.length > 0) {
    worstState = 'COHERENT';
    for (const rel of actFactRels) {
      if (!rel.fact) continue;
      const fProofs = await DB.getProofs(rel.fact.id);
      const fRels = await DB.getFactActRelations(rel.fact.id);
      const fState = DB.computeLogicalState(fRels, fProofs);
      if (fState === 'INCOHERENCE') { worstState = 'INCOHERENCE'; break; }
      if (fState === 'OMISSION' && worstState !== 'INCOHERENCE') worstState = 'OMISSION';
    }
  }
  const stateBadge = worstState ? logicStateBadgeHtml(worstState) : '';

  let linkedFactsHtml = '';
  if (actFactRels.length > 0) {
    linkedFactsHtml = actFactRels.map(rel => {
      const f = rel.fact;
      if (!f) return '';
      const posLabel = rel.posizioneAtto ? tFactPosition(rel.posizioneAtto) : '-';
      return `<div class="proof-link-item" onclick="selectItem('fact', ${f.id})" style="cursor:pointer">
        <span>${esc(f.title)}</span>
        <span class="tree-badge tree-badge-neutral" style="font-size:10px">${posLabel}</span>
      </div>`;
    }).join('');
  } else {
    linkedFactsHtml = `<p class="hint">${t('actNoLinkedFacts')}</p>`;
  }

  let proofsHtml = '';
  if (actFactRels.length > 0) {
    for (const rel of actFactRels) {
      const f = rel.fact;
      if (!f) continue;
      const proofs = await DB.getProofs(f.id);
      if (proofs.length > 0) {
        proofsHtml += `<div class="detail-section"><div class="detail-section-header"><h3>${esc(f.title)}</h3></div><div class="proof-links-list">`;
        proofsHtml += proofs.map(pr => {
          const relLabel = tProofRelType(pr.relationType || 'confirms');
          const relCls = pr.relationType === 'confirms' ? 'tree-badge-confirm' : pr.relationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
          return `<div class="proof-link-item" onclick="selectItem('proof', ${pr.id})" style="cursor:pointer">
            <span class="tree-badge ${relCls}" style="font-size:10px">${relLabel}</span>
            <span>${esc(proofTitle(pr))}</span>
          </div>`;
        }).join('');
        proofsHtml += '</div></div>';
      }
    }
  }
  if (!proofsHtml) proofsHtml = `<p class="hint">${t('factNoLinkedProofs')}</p>`;

  panel.innerHTML = `<div class="detail-panel">
    <div class="detail-header">
      <h2><span class="${badgeCls}" style="font-size:12px;margin-right:8px">${actTypeLabel(a.type)}</span>${a.subtype ? `<span class="tree-badge tree-badge-neutral" style="font-size:11px;margin-right:8px">${actSubtypeLabel(a.subtype)}</span>` : ''}${esc(a.title)}${a.protocol ? ` <span class="tree-badge tree-badge-neutral" style="font-size:10px;margin-left:8px" data-testid="text-act-protocol">Prot. ${esc(a.protocol)}</span>` : ''}</h2>
      ${a.actDate ? `<div class="hint" style="font-size:12px;margin-top:2px">${t('actDate')}: ${_fmtDateShort(a.actDate)}</div>` : ''}
      <div class="detail-header-actions">
        ${stateBadge}
        ${creatorOnly(`<button class="btn btn-sm" onclick="openForm('act', ${a.dossierId}, ${id})">${t('edit')}</button>`)}
        ${creatorOnly(`<button class="btn btn-sm btn-danger" onclick="deleteEntity('act', ${id})">${t('delete')}</button>`)}
      </div>
    </div>
    ${buildOrderedTabs('act', ['atto', 'fatto', 'prova'], (tabId, idx) => {
      if (idx === 0) return `<div class="detail-tabs">` + _detailTabBtn(tabId, activeTab);
      const btn = _detailTabBtn(tabId, activeTab);
      return idx === 2 ? btn + `</div>` : btn;
    })}
    ${buildOrderedTabs('act', ['atto', 'fatto', 'prova'], (tabId) => {
      const vis = activeTab === tabId ? '' : 'display:none';
      const contentMap = {
        atto: `<div class="detail-section"><div class="detail-section-header"><h3>${t('fileSection')}</h3></div>${fileHtml}</div>`,
        fatto: `<div class="detail-section"><div class="detail-section-header"><h3>${t('viewerFactsForAct')}</h3></div><div class="proof-links-list">${linkedFactsHtml}</div></div>`,
        prova: proofsHtml
      };
      return `<div class="detail-tab-content" style="${vis}" id="factTab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}">${contentMap[tabId]}</div>`;
    })}
  </div>`;
  showLinkedSection('act', id);
}


async function computeFactLogicState(fact) {
  const rels = await DB.getFactActRelations(fact.id);
  const proofs = await DB.getProofs(fact.id);
  return DB.computeLogicalState(rels, proofs);
}

function logicStateBadgeHtml(logicState) {
  const ls = (logicState || '').toUpperCase();
  if (ls === 'INCOHERENCE') return `<span class="logic-badge logic-badge-incoherence">${t('factIncoherence')}</span>`;
  if (ls === 'OMISSION') return `<span class="logic-badge logic-badge-omission">${t('factOmission')}</span>`;
  if (ls === 'NO_PROOFS') return `<span class="logic-badge logic-badge-noproofs">${t('factNoProofs')}</span>`;
  return `<span class="logic-badge logic-badge-coherent">${t('factCoherent')}</span>`;
}

function tFactPosition(pos) {
  const map = { afferma: 'factPosAfferma', nega: 'factPosNega', omette: 'factPosOmette', travisa: 'factPosTravisa', non_pronuncia: 'factPosNonPronuncia' };
  return t(map[pos] || pos);
}

function tFactRelevance(rel) {
  const map = { civile: 'factRelevanceCivile', penale: 'factRelevancePenale', amministrativa: 'factRelevanceAmm' };
  return t(map[rel] || rel);
}

function tFactTypology(typ) {
  const map = { materiale: 'factTypeMateriale', tecnico: 'factTypeTecnico', documentale: 'factTypeDocumentale', dichiarativo: 'factTypeDichiarativo' };
  return t(map[typ] || typ);
}

function tProofRelType(rel) {
  const map = { confirms: 'proofRelConfirms', contradicts: 'proofRelContradicts', integrates: 'proofRelIntegrates', ignored: 'proofRelIgnored' };
  return t(map[rel] || rel);
}

function tActProofRelType(rel) {
  const map = { supports: 'actProofRelSupports', contradicts: 'actProofRelContradicts', demonstrates_violation: 'actProofRelDemonstrates_violation', ignored: 'actProofRelIgnored' };
  return t(map[rel] || rel);
}

function tCircProofRelType(rel) {
  const map = { confirms: 'circProofRelConfirms', contradicts: 'circProofRelContradicts', describes: 'circProofRelDescribes' };
  return t(map[rel] || rel);
}

function tCircActRelType(rel) {
  const map = { based_on: 'circActRelBased_on', occurs_in: 'circActRelOccurs_in', ignores: 'circActRelIgnores' };
  return t(map[rel] || rel);
}

function _showRelationTypeModal(options, labelFn, onSelect) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:1400;display:flex;align-items:center;justify-content:center';
  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;min-width:320px;max-width:480px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3)';
  box.innerHTML = `<h4 style="margin:0 0 12px;font-size:14px">${t('selectRelationType')}</h4>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${options.map(opt => `<button class="btn" data-relval="${opt}" style="text-align:left;padding:10px 16px;font-size:14px;white-space:normal;word-break:break-word" data-testid="btn-rel-${opt}">${labelFn(opt)}</button>`).join('')}
    </div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  box.querySelectorAll('[data-relval]').forEach(btn => {
    btn.onclick = () => {
      overlay.remove();
      onSelect(btn.dataset.relval);
    };
  });
}

async function showFactDetail(id) {
  openFactAnalysisModal(id);
}

let _factAnalysisOverlay = null;
let _factAnalysisSelectedId = null;
let _selectedCircumstanceId = null;
let _proofSearchQuery = '';

async function openFactAnalysisModal(factId) {
  const fact = await DB.getFact(factId);
  if (!fact) return;

  if (_factAnalysisOverlay) _factAnalysisOverlay.remove();

  _factAnalysisSelectedId = factId;
  _selectedCircumstanceId = null;
  _proofSearchQuery = '';
  _proofEditActive = false;

  const overlay = document.createElement('div');
  overlay.className = 'fact-analysis-overlay';
  _factAnalysisOverlay = overlay;

  const _defaultColOrder = ['atto', 'fatto', 'prova', 'circostanza'];
  let colOrder = _defaultColOrder;
  try {
    if (fact.columnOrder) {
      const parsed = JSON.parse(fact.columnOrder);
      if (Array.isArray(parsed) && parsed.length === 4 && _defaultColOrder.every(k => parsed.includes(k))) {
        colOrder = parsed;
      }
    }
  } catch (e) { /* fallback to default */ }

  const _colTemplates = {
    fatto: `<div class="fact-column" id="factColFacts">
        <div class="fact-column-header" id="factColFactsHeader">
          <span>${t('factsColumnTitle')}</span>
        </div>
        <div class="fact-column-body" id="factColFactsList"></div>
      </div>`,
    circostanza: `<div class="fact-column" id="factColCircumstances">
        <div class="fact-column-header" id="factColCircHeader">
          <div style="display:flex;align-items:center;gap:6px;width:100%">
            <span>${t('circumstancesColumnTitle')}</span>
            ${creatorOnly(`<button class="btn btn-xs" onclick="_factAnalysisAddCircumstance()" data-testid="button-add-circumstance">${t('addCircumstance')}</button>`)}
          </div>
        </div>
        <div class="fact-column-body" id="factColCircBody"></div>
      </div>`,
    prova: `<div class="fact-column" id="factColProofs">
        <div class="fact-column-header" id="factColProofsHeader">
          <div style="display:flex;align-items:center;gap:6px;width:100%">
            <span>${t('proofsColumnTitle')}</span>
            ${creatorOnly(`<button class="btn btn-xs" onclick="_factAnalysisAddProof()" data-testid="button-add-proof">${t('addProof')}</button>`)}
          </div>
          <div id="proofFilterBadgeContainer"></div>
        </div>
        <div class="fact-column-body" id="factColProofsBody"></div>
      </div>`,
    atto: `<div class="fact-column" id="factColActs">
        <div class="fact-column-header" id="factColActsHeader">
          <div style="display:flex;align-items:center;gap:6px;width:100%">
            <span>${t('actsColumnTitle')}</span>
          </div>
        </div>
        <div class="fact-column-body" id="factColActsBody"></div>
      </div>`
  };

  const columnsHtml = colOrder.map(col => _colTemplates[col] || '').join('');

  const modal = document.createElement('div');
  modal.className = 'fact-analysis-modal';
  modal.innerHTML = `
    <div class="fact-analysis-header" id="factAnalysisHeader">
      <h3 data-testid="text-fact-analysis-title">${t('factAnalysisTitle')}</h3>
      <div style="display:flex;align-items:center;gap:8px">
        ${creatorOnly(`<button class="btn btn-sm${_proofEditActive ? ' btn-edit-mode-active' : ''}" onclick="_toggleProofEditMode()" data-testid="button-global-edit-mode" title="${t('editMode')}">✏️</button>`)}
        <button class="fact-analysis-close" onclick="_closeFactAnalysis()" data-testid="button-fact-analysis-close">✕</button>
      </div>
    </div>
    <div class="fact-columns-layout">
      ${columnsHtml}
    </div>
  `;

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeFactAnalysis(); });
  document.body.appendChild(overlay);

  const proofsCol = document.getElementById('factColProofs');
  const layout = modal.querySelector('.fact-columns-layout');
  if (!_proofEditActive) {
    if (proofsCol) proofsCol.style.display = 'none';
    if (layout) layout.style.gridTemplateColumns = '1fr 1fr 1fr';
  }

  await _updateFactAnalysisColumns(factId);
}

function _closeFactAnalysis() {
  if (_factAnalysisOverlay) {
    _factAnalysisOverlay.remove();
    _factAnalysisOverlay = null;
  }
  _factAnalysisSelectedId = null;
}

let _proofEditActive = false;

async function _toggleProofEditMode() {
  if (!_factAnalysisSelectedId) return;
  _proofEditActive = !_proofEditActive;
  if (!_proofEditActive) {
    _proofSearchQuery = '';
  }
  const proofsCol = document.getElementById('factColProofs');
  const layout = document.querySelector('.fact-columns-layout');
  if (proofsCol) proofsCol.style.display = _proofEditActive ? '' : 'none';
  if (layout) layout.style.gridTemplateColumns = _proofEditActive ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr';
  await _updateFactAnalysisColumns(_factAnalysisSelectedId);
}

async function _openEditFactModal() {
  const factId = _factAnalysisSelectedId;
  if (!factId) return;
  const fact = await DB.getFact(factId);
  if (!fact) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1300;display:flex;align-items:center;justify-content:center';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;max-width:700px;width:95%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)';

  modal.innerHTML = `
    <h3>${t('editFactDetail')}</h3>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('factTitle')} * (IT)</label>
        <input type="text" id="editFactModalTitle" value="${esc(fact.title || '')}" data-testid="input-edit-fact-modal-title" />
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('editFactModalTitle','editFactModalTitleEN','it','en')}
        ${_renderTransArrow('editFactModalTitleEN','editFactModalTitle','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('factTitle')} * (EN)</label>
        <input type="text" id="editFactModalTitleEN" value="${esc(fact.titleEN || '')}" data-testid="input-edit-fact-modal-title-en" />
      </div>
    </div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('factDescription')} (IT)</label>
        <textarea id="editFactModalDesc" rows="3" data-testid="textarea-edit-fact-modal-desc">${esc(fact.description || '')}</textarea>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('editFactModalDesc','editFactModalDescEN','it','en')}
        ${_renderTransArrow('editFactModalDescEN','editFactModalDesc','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('factDescription')} (EN)</label>
        <textarea id="editFactModalDescEN" rows="3" data-testid="textarea-edit-fact-modal-desc-en">${esc(fact.descriptionEN || '')}</textarea>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>${t('factDate')}</label>
        <input type="date" id="editFactModalDate" value="${fact.factDate || ''}" data-testid="input-edit-fact-modal-date" />
      </div>
      <div class="form-group">
        <label>${t('factTime')}</label>
        <input type="time" id="editFactModalTime" value="${fact.factTime || ''}" data-testid="input-edit-fact-modal-time" />
      </div>
    </div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('factPlace')} (IT)</label>
        <input type="text" id="editFactModalPlace" value="${esc(fact.place || '')}" data-testid="input-edit-fact-modal-place" />
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('editFactModalPlace','editFactModalPlaceEN','it','en')}
        ${_renderTransArrow('editFactModalPlaceEN','editFactModalPlace','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('factPlace')} (EN)</label>
        <input type="text" id="editFactModalPlaceEN" value="${esc(fact.placeEN || '')}" data-testid="input-edit-fact-modal-place-en" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="btnSaveEditFact" data-testid="button-save-edit-fact">${t('save')}</button>
      <button class="btn" id="btnCancelEditFact">${t('cancel')}</button>
    </div>
  `;

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  modal.querySelector('#btnCancelEditFact').onclick = () => overlay.remove();
  modal.querySelector('#btnSaveEditFact').onclick = async () => {
    const title = modal.querySelector('#editFactModalTitle').value.trim();
    if (!title) return;
    await DB.updateFact(factId, {
      title,
      titleEN: (modal.querySelector('#editFactModalTitleEN')?.value || '').trim(),
      description: (modal.querySelector('#editFactModalDesc')?.value || '').trim(),
      descriptionEN: (modal.querySelector('#editFactModalDescEN')?.value || '').trim(),
      factDate: modal.querySelector('#editFactModalDate')?.value || null,
      factTime: modal.querySelector('#editFactModalTime')?.value || null,
      place: (modal.querySelector('#editFactModalPlace')?.value || '').trim() || null,
      placeEN: (modal.querySelector('#editFactModalPlaceEN')?.value || '').trim() || null
    });
    overlay.remove();
    await renderAll();
    await _updateFactAnalysisColumns(factId);
  };
}

async function _factAnalysisAddFact() {
  if (!_factAnalysisSelectedId) return;
  const currentFact = await DB.getFact(_factAnalysisSelectedId);
  if (!currentFact) return;
  const dossierId = currentFact.dossierId;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1300;display:flex;align-items:center;justify-content:center';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;max-width:700px;width:95%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)';

  modal.innerHTML = `
    <h3>${t('addFact')}</h3>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('factTitle')} * (IT)</label>
        <input type="text" id="newFactTitle" data-testid="input-new-fact-title" />
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('newFactTitle','newFactTitleEN','it','en')}
        ${_renderTransArrow('newFactTitleEN','newFactTitle','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('factTitle')} * (EN)</label>
        <input type="text" id="newFactTitleEN" data-testid="input-new-fact-title-en" />
      </div>
    </div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('factDescription')} (IT)</label>
        <textarea id="newFactDescription" rows="3" data-testid="textarea-new-fact-description"></textarea>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('newFactDescription','newFactDescriptionEN','it','en')}
        ${_renderTransArrow('newFactDescriptionEN','newFactDescription','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('factDescription')} (EN)</label>
        <textarea id="newFactDescriptionEN" rows="3" data-testid="textarea-new-fact-description-en"></textarea>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>${t('factDate')}</label>
        <input type="date" id="newFactDate" data-testid="input-new-fact-date" />
      </div>
      <div class="form-group">
        <label>${t('factTime')}</label>
        <input type="time" id="newFactTime" data-testid="input-new-fact-time" />
      </div>
    </div>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('factPlace')} (IT)</label>
        <input type="text" id="newFactPlace" data-testid="input-new-fact-place" />
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('newFactPlace','newFactPlaceEN','it','en')}
        ${_renderTransArrow('newFactPlaceEN','newFactPlace','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('factPlace')} (EN)</label>
        <input type="text" id="newFactPlaceEN" data-testid="input-new-fact-place-en" />
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="btnSaveNewFact" data-testid="button-save-new-fact">${t('save')}</button>
      <button class="btn" id="btnCancelNewFact">${t('cancel')}</button>
    </div>
  `;

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  modal.querySelector('#btnSaveNewFact').onclick = async () => {
    const title = modal.querySelector('#newFactTitle').value.trim();
    if (!title) return;
    const newFact = await DB.createFact({
      dossierId,
      title,
      titleEN: modal.querySelector('#newFactTitleEN').value.trim(),
      description: modal.querySelector('#newFactDescription').value.trim(),
      descriptionEN: modal.querySelector('#newFactDescriptionEN').value.trim(),
      factDate: modal.querySelector('#newFactDate').value || null,
      factTime: modal.querySelector('#newFactTime').value || null,
      place: modal.querySelector('#newFactPlace').value.trim() || null,
      placeEN: modal.querySelector('#newFactPlaceEN').value.trim() || null
    });
    overlay.remove();
    await renderAll();
    await _updateFactAnalysisColumns(newFact.id);
  };

  modal.querySelector('#btnCancelNewFact').onclick = () => overlay.remove();
}

function _factAnalysisAddCircumstance() {
  if (!_factAnalysisSelectedId) return;
  openCircumstanceModal(_factAnalysisSelectedId, null, async () => {
    await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  });
}

function _factAnalysisAddProof() {
  if (!_factAnalysisSelectedId) return;
  _openCreateProofModal(_factAnalysisSelectedId, async () => {
    await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  });
}

async function _updateFactAnalysisColumns(factId) {
  _factAnalysisSelectedId = factId;
  const fact = await DB.getFact(factId);
  if (!fact) return;

  const factsListEl = document.getElementById('factColFactsList');
  if (factsListEl) {
    const f = fact;
    const ls = await computeFactLogicState(f);
    const actCount = (await DB.getFactActRelations(f.id)).length;
    const circCount = (await DB.getCircumstances(f.id)).length;
    const factProofRels = await DB.getFactProofRelations(f.id);
    const proofCount = factProofRels.length;
    const factLinkedProofs = [];
    const factLinkedProofRels = [];
    for (const r of factProofRels) {
      const p = r.proof || await DB.getProof(r.proofId);
      if (p) { factLinkedProofs.push(p); factLinkedProofRels.push(r); }
    }
    const factProofsSublist = _renderProofsSublist(factLinkedProofs, {type:'factProof', parentId: f.id}, factLinkedProofRels);
    factsListEl.innerHTML = `<div class="fact-column-item selected"
        ondragover="_factItemDragOver(event)" ondragleave="_factItemDragLeave(event)" ondrop="_proofDropOnFact(event, ${f.id})"
        data-testid="fact-item-${f.id}">
        <div class="fact-column-item-title" style="display:flex;align-items:center;gap:4px">
          <span style="flex:1">${esc(f.title)}</span>
          <button class="btn-fact-info" onclick="event.stopPropagation(); _openFactDetailModal(${f.id})" title="${t('viewFactDetail')}" data-testid="button-fact-info-${f.id}">ℹ️</button>
        </div>
        <div class="fact-column-item-meta">
          ${f.factDate ? esc(f.factDate) : ''}
          ${logicStateBadgeHtml(ls)}
        </div>
        <div class="fact-column-item-badges">
          <span class="fact-link-badge" title="${t('actBadge')}" data-testid="badge-acts-${f.id}">📋 ${actCount}</span>
          <span class="fact-link-badge" title="${t('circumstancesColumnTitle')}" data-testid="badge-circs-${f.id}">🔗 ${circCount}</span>
          <span class="fact-link-badge" title="${t('proofsColumnTitle')}" data-testid="badge-proofs-${f.id}">📎 ${proofCount}</span>
        </div>
        ${factProofsSublist}
      </div>`;
  }

  const factsHeader = document.getElementById('factColFactsHeader');
  if (factsHeader) {
    factsHeader.innerHTML = `
      <span>${t('factsColumnTitle')}</span>
      ${_proofEditActive ? creatorOnly(`<button class="btn btn-xs" onclick="_factAnalysisAddFact()" data-testid="button-add-fact">${t('addFact')}</button>`) : ''}`;
  }

  const analysisHeader = document.getElementById('factAnalysisHeader');
  if (analysisHeader) {
    analysisHeader.innerHTML = `
      <h3 data-testid="text-fact-analysis-title">${t('factAnalysisTitle')}</h3>
      <div style="display:flex;align-items:center;gap:8px">
        ${creatorOnly(`<button class="btn btn-sm${_proofEditActive ? ' btn-edit-mode-active' : ''}" onclick="_toggleProofEditMode()" data-testid="button-global-edit-mode" title="${t('editMode')}">✏️</button>`)}
        <button class="fact-analysis-close" onclick="_closeFactAnalysis()" data-testid="button-fact-analysis-close">✕</button>
      </div>`;
  }

  const circHeader = document.getElementById('factColCircHeader');
  if (circHeader) {
    circHeader.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;width:100%">
        <span>${t('circumstancesColumnTitle')}</span>
        ${_proofEditActive ? creatorOnly(`<button class="btn btn-xs" style="margin-left:auto" onclick="_factAnalysisAddCircumstance()" data-testid="button-add-circumstance">${t('addCircumstance')}</button>`) : ''}
      </div>`;
  }

  const proofHeader = document.getElementById('factColProofsHeader');
  if (proofHeader) {
    let proofHtml = `
      <div style="display:flex;align-items:center;gap:6px;width:100%">
        <span>${t('proofsColumnTitle')}</span>
        ${_proofEditActive ? creatorOnly(`<button class="btn btn-xs" style="margin-left:auto" onclick="_factAnalysisAddProof()" data-testid="button-add-proof">${t('addProof')}</button>`) : ''}
        ${_proofEditActive ? `<span class="help-icon" title="${t('editHintProof')}">?</span>` : ''}
      </div>`;
    proofHeader.innerHTML = proofHtml;
  }

  const circBody = document.getElementById('factColCircBody');
  if (circBody) {
    await _renderLinkedCircumstancesColumn(circBody, fact, factId);
  }

  await _updateProofsColumn(factId);
  await _updateActsColumn(factId);
}

async function _updateActsColumn(factId) {
  const actsHeader = document.getElementById('factColActsHeader');
  if (actsHeader) {
    actsHeader.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;width:100%">
        <span>${t('actsColumnTitle')}</span>
        ${_proofEditActive ? creatorOnly(`<button class="btn btn-xs" style="margin-left:auto" onclick="_factAnalysisLinkAct()" data-testid="button-analysis-link-act">${t('addActLink')}</button>`) : ''}
      </div>`;
  }
  const actsBody = document.getElementById('factColActsBody');
  if (!actsBody) return;
  const rels = (await DB.getFactActRelations(factId)).sort((a, b) => ((a.act?.sortOrder) || 0) - ((b.act?.sortOrder) || 0) || (a.actId - b.actId));
  if (rels.length === 0) {
    actsBody.innerHTML = `<p class="hint" style="padding:12px;font-size:12px;color:var(--text-secondary)">${t('noLinkedActs')}</p>`;
    return;
  }
  const actIds = rels.map(r => r.act?.id).filter(Boolean);
  const allActProofRels = await Promise.all(actIds.map(id => DB.getActProofRelations(id)));
  const actProofRelsMap = {};
  actIds.forEach((id, i) => { actProofRelsMap[id] = allActProofRels[i]; });
  const allProofIds = new Set();
  Object.values(actProofRelsMap).forEach(arr => arr.forEach(r => allProofIds.add(r.proofId)));
  const allProofsArr = await Promise.all([...allProofIds].map(id => DB.getProof(id)));
  const proofsMap = {};
  allProofsArr.forEach(p => { if (p) proofsMap[p.id] = p; });

  const actItems = rels.map(rel => {
    const a = rel.act;
    if (!a) return '';
    const posLabel = rel.posizioneAtto ? tFactPosition(rel.posizioneAtto) : '';
    const posBadge = posLabel ? `<span class="tree-badge tree-badge-neutral" style="font-size:10px">${esc(posLabel)}</span>` : '';
    const unlinkBtn = _proofEditActive ? creatorOnly(`<button class="btn btn-xs" style="font-size:10px;padding:1px 5px" onclick="event.stopPropagation();_factAnalysisUnlinkAct(${rel.id})" data-testid="button-unlink-act-${rel.id}" title="${t('unlink')}">✕</button>`) : '';
    const actPRels = actProofRelsMap[a.id] || [];
    const actProofCount = actPRels.length;
    const proofBadge = actProofCount > 0 ? `<span class="fact-link-badge" title="${t('proofsColumnTitle')}">📎 ${actProofCount}</span>` : `<span class="fact-link-badge" style="color:var(--danger)" title="${t('proofsColumnTitle')}">⚠️ 0</span>`;
    const dropAttrs = _proofEditActive ? `ondragover="_factItemDragOver(event)" ondragleave="_factItemDragLeave(event)" ondrop="_proofDropOnAct(event, ${a.id})"` : '';
    const dragAttrs = _proofEditActive ? `draggable="true" ondragstart="_actDragStart(event, ${a.id})"` : '';
    const linkedProofsWithRels = actPRels.filter(r => proofsMap[r.proofId]);
    const linkedProofs = linkedProofsWithRels.map(r => proofsMap[r.proofId]);
    const proofsSublist = _renderProofsSublist(linkedProofs, {type:'actProof', parentId: a.id}, linkedProofsWithRels);
    return `<div class="fact-column-item" onclick="_factAnalysisViewAct(${a.id}, '${rel.posizioneAtto || 'afferma'}')" data-testid="act-item-${a.id}" style="cursor:${_proofEditActive ? 'grab' : 'pointer'}" ${dropAttrs} ${dragAttrs}>
      <div class="fact-column-item-title" style="display:flex;align-items:center;gap:4px">
        <span style="flex:1">${esc(a.title)}</span>
        ${unlinkBtn}
      </div>
      <div class="fact-column-item-meta" style="display:flex;gap:4px;align-items:center">
        ${a.actDate ? `<span>${esc(a.actDate)}</span>` : ''}
        ${posBadge}
        ${proofBadge}
      </div>
      ${proofsSublist}
    </div>`;
  });
  actsBody.innerHTML = actItems.join('');
}

function _factAnalysisViewAct(actId, position) {
  openViewActModal(actId, position);
}

async function _factAnalysisLinkAct() {
  if (!_factAnalysisSelectedId) return;
  const fact = await DB.getFact(_factAnalysisSelectedId);
  if (!fact) return;
  await openManageActsModal(_factAnalysisSelectedId, async () => {
    await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  });
}

async function _factAnalysisUnlinkAct(relId) {
  await DB.deleteFactActRelation(relId);
  if (_factAnalysisSelectedId) {
    await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  }
}

async function _openFactDetailModal(factId) {
  const fact = await DB.getFact(factId);
  if (!fact) return;
  const logicState = await computeFactLogicState(fact);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '10001';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  let body = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <strong style="font-size:16px">${esc(fact.title)}</strong>
    ${logicStateBadgeHtml(logicState)}
  </div>`;
  if (fact.description) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('factDescription')}</div><div class="fact-col-field-value">${esc(fact.description)}</div></div>`;
  }
  if (fact.factDate) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('factDate')}</div><div class="fact-col-field-value">${esc(fact.factDate)}${fact.factTime ? ' — ' + esc(fact.factTime) : ''}</div></div>`;
  }
  if (fact.place) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('factPlace')}</div><div class="fact-col-field-value">${esc(fact.place)}</div></div>`;
  }

  overlay.innerHTML = `<div class="modal-content" style="max-width:500px" data-testid="modal-fact-detail">
    <div class="modal-header">
      <h3>${t('viewFactDetail')}</h3>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" data-testid="button-close-fact-detail">✕</button>
    </div>
    <div class="modal-body" style="padding:16px 0">${body}</div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;padding:12px 0 0;border-top:1px solid var(--border)">
      ${creatorOnly(`<button class="btn btn-primary btn-sm" onclick="this.closest('.modal-overlay').remove(); _openEditFactModal()" data-testid="button-edit-fact-from-detail">✏️ ${t('edit')}</button>`)}
      <button class="btn btn-sm" onclick="this.closest('.modal-overlay').remove()" data-testid="button-close-fact-detail-footer">${t('close')}</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
}

async function _openCircumstanceDetailModal(circId) {
  const c = await DB.getCircumstance(circId);
  if (!c) return;
  const typeLabel = t('circumstance' + c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '10001';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  let body = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <strong style="font-size:16px">${esc(c.title || c.descrizione || '')}</strong>
    <span class="tree-badge tree-badge-neutral">${typeLabel}</span>
  </div>`;
  if (c.descrizione) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('description')}</div><div class="fact-col-field-value">${esc(c.descrizione)}</div></div>`;
  }
  if (c.descrizioneEN) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('description')} (EN)</div><div class="fact-col-field-value">${esc(c.descrizioneEN)}</div></div>`;
  }
  if (c.title && c.title !== c.descrizione) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('title')}</div><div class="fact-col-field-value">${esc(c.title)}</div></div>`;
  }
  if (c.titleEN) {
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('title')} (EN)</div><div class="fact-col-field-value">${esc(c.titleEN)}</div></div>`;
  }
  const cpRels = await DB.getCircumstanceProofRelations(circId);
  if (cpRels.length > 0) {
    const proofNames = await Promise.all(cpRels.map(async r => {
      const p = await DB.getProof(r.proofId);
      return p ? esc(p.title || '') : '';
    }));
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('linkedProofsHeader')} (${cpRels.length})</div><div class="fact-col-field-value">${proofNames.filter(Boolean).join(', ')}</div></div>`;
  }
  const caRels = await DB.getCircumstanceActRelations(circId);
  if (caRels.length > 0) {
    const actNames = await Promise.all(caRels.map(async r => {
      const a = await DB.getAct(r.actId);
      return a ? esc(a.title || '') : '';
    }));
    body += `<div class="fact-col-field"><div class="fact-col-field-label">${t('linkedActsHeader')} (${caRels.length})</div><div class="fact-col-field-value">${actNames.filter(Boolean).join(', ')}</div></div>`;
  }
  overlay.innerHTML = `<div class="modal-content" style="max-width:500px" data-testid="modal-circumstance-detail">
    <div class="modal-header">
      <h3>${t('viewCircumstanceDetail')}</h3>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" data-testid="button-close-circ-detail">✕</button>
    </div>
    <div class="modal-body" style="padding:16px 0">${body}</div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;padding:12px 0 0;border-top:1px solid var(--border)">
      <button class="btn btn-sm" onclick="this.closest('.modal-overlay').remove()" data-testid="button-close-circ-detail-footer">${t('close')}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function _renderLinkedCircumstancesColumn(circBody, fact, factId) {
  const circumstances = (await DB.getCircumstances(factId)).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id);
  const violations = await DB.getViolationsByFact(factId);
  const logicState = await computeFactLogicState(fact);

  if (circumstances.length > 0 && !_selectedCircumstanceId) {
    _selectedCircumstanceId = circumstances[0].id;
  }

  let html = '';

  html += `<div class="fact-col-section">`;
  if (circumstances.length > 0) {
    const circIds = circumstances.map(c => c.id);
    const allCircPRels = await Promise.all(circIds.map(id => DB.getCircumstanceProofRelations(id)));
    const circPRelsMap = {};
    circIds.forEach((id, i) => { circPRelsMap[id] = allCircPRels[i]; });
    const circProofIds = new Set();
    Object.values(circPRelsMap).forEach(arr => arr.forEach(r => circProofIds.add(r.proofId)));
    const circProofsArr = await Promise.all([...circProofIds].map(id => DB.getProof(id)));
    const circProofsMap = {};
    circProofsArr.forEach(p => { if (p) circProofsMap[p.id] = p; });

    const allCircARels = await Promise.all(circIds.map(id => DB.getCircumstanceActRelations(id)));
    const circARelsMap = {};
    circIds.forEach((id, i) => { circARelsMap[id] = allCircARels[i]; });
    const circActIds = new Set();
    Object.values(circARelsMap).forEach(arr => arr.forEach(r => circActIds.add(r.actId)));
    const circActsArr = await Promise.all([...circActIds].map(id => DB.getAct(id)));
    const circActsMap = {};
    circActsArr.forEach(a => { if (a) circActsMap[a.id] = a; });

    const circItems = circumstances.map(c => {
      const typeLabel = t('circumstance' + c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1));
      const cpRels = circPRelsMap[c.id] || [];
      const cnt = cpRels.length;
      const countBadge = cnt > 0
        ? `<span class="circ-proof-count" title="${cnt} ${t('proofCount')}">${cnt}</span>`
        : `<span class="circ-no-proof" title="${t('noProofLinked')}">⚠️</span>`;
      const selClass = _selectedCircumstanceId === c.id ? ' circ-selected' : '';
      const circProofRelsFiltered = cpRels.filter(r => circProofsMap[r.proofId]);
      const linkedProofs = circProofRelsFiltered.map(r => circProofsMap[r.proofId]);
      const circProofsSublist = _renderProofsSublist(linkedProofs, {type:'circProof', parentId: c.id, factId: factId}, circProofRelsFiltered);
      const caRels = circARelsMap[c.id] || [];
      const caRelsFiltered = caRels.filter(r => circActsMap[r.actId]);
      const linkedActs = caRelsFiltered.map(r => circActsMap[r.actId]);
      const circActsSublist = _renderActsSublist(linkedActs, {circId: c.id}, caRelsFiltered);
      return `<div class="fact-col-detail-item circ-item-clickable${selClass} circ-item-wrap"
        data-testid="circumstance-item-${c.id}"
        data-circ-id="${c.id}"
        onclick="_selectCircumstanceFilter(${c.id})"
        ondragover="_circDragOver(event)"
        ondragleave="_circDragLeave(event)"
        ondrop="_circDrop(event, ${c.id}, ${factId})">
        <span class="tree-badge tree-badge-neutral" style="font-size:10px">${typeLabel}</span>
        <span style="flex:1;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px" onclick="event.stopPropagation(); _openCircumstanceDetailModal(${c.id})" title="${t('viewCircumstanceDetail')}">${esc(c.title || c.descrizione || '')}</span>
        ${countBadge}
        <button class="btn-fact-info" onclick="event.stopPropagation(); _openCircumstanceDetailModal(${c.id})" title="${t('viewCircumstanceDetail')}" data-testid="button-circ-info-${c.id}">ℹ️</button>
        ${_proofEditActive ? creatorOnly(`<button class="btn btn-xs" onclick="event.stopPropagation(); openCircumstanceModal(${factId}, ${c.id}, async () => { await _updateFactAnalysisColumns(${factId}); })" data-testid="button-edit-circ-${c.id}">${t('edit')}</button>`) : ''}
        ${_proofEditActive ? creatorOnly(`<button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); _deleteCircumstanceInAnalysis(${c.id}, ${factId})" data-testid="button-delete-circ-${c.id}">${t('delete')}</button>`) : ''}
        ${circProofsSublist}
        ${circActsSublist}
      </div>`;
    });
    html += circItems.join('');
  } else {
    html += `<p class="hint" style="padding:0 8px">${t('noCircumstances')}</p>`;
  }
  html += `</div>`;

  if (violations.length > 0) {
    const detVNodoPromises = violations.map(v => NormDB.getNodo(v.normaId));
    const detVNodos = await Promise.all(detVNodoPromises);
    const detVFontePromises = detVNodos.map(n => n ? _getFonteInfo(n.id_fonte) : Promise.resolve({ short: '?', css: '', name: '' }));
    const detVFonteInfos = await Promise.all(detVFontePromises);
    html += `<div class="fact-col-section">
      <div class="fact-col-section-title">${t('violationsTab')}</div>`;
    html += violations.map((v, i) => `
      <div class="fact-col-detail-item" style="cursor:pointer" onclick="_toggleLinkedViolationPreview(${v.normaId})" data-testid="detail-violation-${v.normaId}">
        ${_fonteBadgeHtml(detVFonteInfos[i])}
        <span class="tree-badge tree-badge-neutral" style="font-size:10px">${esc(v.normaCode || '')}</span>
        <span>${esc(v.normaTitle || '')}</span>
      </div>`).join('');
    html += `</div>`;
  }

  circBody.innerHTML = html;
}

async function _updateProofsColumn(factId) {
  const proofsBody = document.getElementById('factColProofsBody');
  if (!proofsBody) return;

  let allDbProofs = await DB.getAllProofs();
  const mtIcons = { document: '📄', image: '🖼️', audio: '🎧', video: '🎬' };

  if (_proofSearchQuery) {
    const q = _proofSearchQuery.toLowerCase();
    allDbProofs = allDbProofs.filter(pr => proofTitle(pr).toLowerCase().includes(q));
  }

  const searchInputHtml = `<input type="text" class="proof-search-input" id="proofSearchInput" placeholder="${t('searchProofs')}" oninput="_onProofSearchInput(this.value)" value="${esc(_proofSearchQuery)}" style="margin:4px 0" data-testid="input-proof-search" />`;

  if (allDbProofs.length === 0) {
    proofsBody.innerHTML = `${searchInputHtml}<p class="hint" style="padding:8px">${t('noResults')}</p>`;
    return;
  }

  const proofsHtml = allDbProofs.map(pr => {
    const mt = pr.mediaType || 'document';
    const editActions = _proofEditActive ? `
      ${creatorOnly(`<button class="btn btn-xs" onclick="event.stopPropagation(); openEditProofModal(${pr.id}, async () => { await _updateFactAnalysisColumns(${factId}); })" data-testid="button-edit-proof-${pr.id}">${t('edit')}</button>`)}
      ${creatorOnly(`<button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); _deleteProofInAnalysis(${pr.id}, ${factId})" data-testid="button-delete-proof-${pr.id}">${t('delete')}</button>`)}
    ` : '';
    return `<div class="fact-col-detail-item" draggable="true"
      ondragstart="_proofDragStart(event, ${pr.id})"
      style="cursor:${_proofEditActive ? 'grab' : 'pointer'}"
      onclick="openViewProofModal(${pr.id}, '${pr.relationType || 'confirms'}')"
      data-testid="proof-item-${pr.id}">
      <span style="margin-right:4px">${mtIcons[mt] || '📄'}</span>
      <span style="flex:1">${esc(proofTitle(pr))}</span>
      ${editActions}
    </div>`;
  }).join('');

  proofsBody.innerHTML = `${searchInputHtml}${proofsHtml}`;
}

async function _selectFactInAnalysis(factId) {
  _selectedCircumstanceId = null;
  _proofSearchQuery = '';
  const searchInput = document.getElementById('proofSearchInput');
  if (searchInput) searchInput.value = '';
  await _updateFactAnalysisColumns(factId);
}

function _factItemDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'link';
  const item = event.currentTarget;
  if (!item.classList.contains('drag-over')) item.classList.add('drag-over');
}

function _factItemDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

async function _proofDropOnFact(event, factId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const proofIdStr = event.dataTransfer.getData('application/proof-id');
  const proofId = parseInt(proofIdStr, 10);
  if (!proofId || isNaN(proofId)) return;
  _showRelationTypeModal(['confirms','contradicts','integrates','ignored'], tProofRelType, async (relationType) => {
    await DB.createFactProofRelation({ factId, proofId, relationType });
    if (_factAnalysisSelectedId) await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  });
}

async function _proofDropOnAct(event, actId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const proofIdStr = event.dataTransfer.getData('application/proof-id');
  const proofId = parseInt(proofIdStr, 10);
  if (!proofId || isNaN(proofId)) return;
  _showRelationTypeModal(['supports','contradicts','demonstrates_violation','ignored'], tActProofRelType, async (relationType) => {
    await DB.createActProofRelation({ actId, proofId, relationType });
    if (_factAnalysisSelectedId) await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  });
}

function _actDragStart(event, actId) {
  event.dataTransfer.setData('application/act-id', String(actId));
  event.dataTransfer.effectAllowed = 'link';
}

function _renderActsSublist(acts, unlinkOpts, rels) {
  if (!acts || acts.length === 0) return '';
  const items = acts.map((a, idx) => {
    let unlinkBtn = '';
    if (_proofEditActive && unlinkOpts && unlinkOpts.circId) {
      unlinkBtn = `<button class="btn btn-xs" style="font-size:9px;padding:0 4px;margin-left:auto" onclick="event.stopPropagation();_unlinkActFromCircumstance(${a.id},${unlinkOpts.circId})" data-testid="button-unlink-circ-act-${a.id}" title="${t('unlink')}">✕</button>`;
    }
    const rel = rels && rels[idx];
    const relType = rel?.posizioneAtto || '';
    const relBadge = relType ? `<span class="tree-badge tree-badge-neutral" style="font-size:9px">${tCircActRelType(relType)}</span>` : '';
    const pos = rel?.posizioneAtto || 'afferma';
    return `<div class="proof-sublist-item" style="display:flex;align-items:center;gap:4px;cursor:pointer" onclick="event.stopPropagation(); openViewActModal(${a.id}, '${pos}')"><span>📋</span>${relBadge}<span class="proof-sublist-title" style="flex:1">${esc(a.title || '')}</span>${unlinkBtn}</div>`;
  }).join('');
  return `<div class="fact-item-proofs-row"><div class="proof-sublist-header">${t('linkedActsHeader')}</div>${items}</div>`;
}

function _renderProofsSublist(proofs, unlinkOpts, rels) {
  if (!proofs || proofs.length === 0) return '';
  const mtIcons = { document: '📄', image: '🖼️', audio: '🎧', video: '🎬' };
  const items = proofs.map((pr, idx) => {
    const mt = pr.mediaType || 'document';
    let unlinkBtn = '';
    if (_proofEditActive && unlinkOpts) {
      if (unlinkOpts.type === 'actProof') {
        unlinkBtn = `<button class="btn btn-xs" style="font-size:9px;padding:0 4px;margin-left:auto" onclick="event.stopPropagation();_unlinkProofFromAct(${pr.id},${unlinkOpts.parentId})" data-testid="button-unlink-act-proof-${pr.id}" title="${t('unlink')}">✕</button>`;
      } else if (unlinkOpts.type === 'factProof') {
        unlinkBtn = `<button class="btn btn-xs" style="font-size:9px;padding:0 4px;margin-left:auto" onclick="event.stopPropagation();_unlinkProofFromFact(${pr.id},${unlinkOpts.parentId})" data-testid="button-unlink-fact-proof-${pr.id}" title="${t('unlink')}">✕</button>`;
      } else if (unlinkOpts.type === 'circProof') {
        unlinkBtn = `<button class="btn btn-xs" style="font-size:9px;padding:0 4px;margin-left:auto" onclick="event.stopPropagation();_unlinkProofFromCircumstance(${pr.id},${unlinkOpts.parentId},${unlinkOpts.factId})" data-testid="button-unlink-circ-proof-${pr.id}" title="${t('unlink')}">✕</button>`;
      }
    }
    const rel = rels && rels[idx];
    let relBadge = '';
    if (rel?.relationType) {
      let labelFn = tProofRelType;
      if (unlinkOpts?.type === 'actProof') labelFn = tActProofRelType;
      else if (unlinkOpts?.type === 'circProof') labelFn = tCircProofRelType;
      const relCls = rel.relationType === 'confirms' || rel.relationType === 'supports' ? 'tree-badge-confirm' : rel.relationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
      relBadge = `<span class="tree-badge ${relCls}" style="font-size:9px">${labelFn(rel.relationType)}</span>`;
    }
    const relTypeVal = rel?.relationType || 'confirms';
    return `<div class="proof-sublist-item" style="display:flex;align-items:center;gap:4px;cursor:pointer" onclick="event.stopPropagation(); openViewProofModal(${pr.id}, '${relTypeVal}')"><span>${mtIcons[mt] || '📄'}</span>${relBadge}<span class="proof-sublist-title" style="flex:1">${esc(pr.title || '')}</span>${unlinkBtn}</div>`;
  }).join('');
  return `<div class="fact-item-proofs-row"><div class="proof-sublist-header">${t('linkedProofsHeader')}</div>${items}</div>`;
}

function _proofDragStart(event, proofId) {
  event.dataTransfer.setData('application/proof-id', String(proofId));
  event.dataTransfer.effectAllowed = 'link';
}

function _circDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'link';
  const item = event.currentTarget;
  if (!item.classList.contains('drag-over')) item.classList.add('drag-over');
}

function _circDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

async function _circDrop(event, circId, factId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const proofIdStr = event.dataTransfer.getData('application/proof-id');
  const proofId = parseInt(proofIdStr, 10);
  if (proofId && !isNaN(proofId)) {
    _showRelationTypeModal(['confirms','contradicts','describes'], tCircProofRelType, async (relationType) => {
      await DB.createCircumstanceProofRelation({ circumstanceId: circId, proofId, relationType });
      await _updateFactAnalysisColumns(factId);
    });
    return;
  }
  const actIdStr = event.dataTransfer.getData('application/act-id');
  const actId = parseInt(actIdStr, 10);
  if (actId && !isNaN(actId)) {
    _showRelationTypeModal(['based_on','occurs_in','ignores'], tCircActRelType, async (posizioneAtto) => {
      await DB.createCircumstanceActRelation({ circumstanceId: circId, actId, posizioneAtto });
      await _updateFactAnalysisColumns(factId);
    });
    return;
  }
}

function _proofTargetDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'link';
  const item = event.currentTarget;
  if (!item.classList.contains('drag-over')) item.classList.add('drag-over');
}

function _proofTargetDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

async function _circDropOnProof(event, proofId, factId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const circIdStr = event.dataTransfer.getData('application/circ-id');
  const circId = parseInt(circIdStr, 10);
  if (!circId || isNaN(circId)) return;
  _showRelationTypeModal(['confirms','contradicts','describes'], tCircProofRelType, async (relationType) => {
    await DB.createCircumstanceProofRelation({ circumstanceId: circId, proofId, relationType });
    await _updateFactAnalysisColumns(factId);
  });
}

async function _proofDropOnCirc(event, circId, factId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const proofIdStr = event.dataTransfer.getData('application/proof-id');
  const proofId = parseInt(proofIdStr, 10);
  if (!proofId || isNaN(proofId)) return;
  _showRelationTypeModal(['confirms','contradicts','describes'], tCircProofRelType, async (relationType) => {
    await DB.createCircumstanceProofRelation({ circumstanceId: circId, proofId, relationType });
    await _updateFactAnalysisColumns(factId);
  });
}

async function _selectCircumstanceFilter(circId) {
  if (_selectedCircumstanceId === circId) {
    _selectedCircumstanceId = null;
  } else {
    _selectedCircumstanceId = circId;
  }
  if (_factAnalysisSelectedId) {
    await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  }
}

async function _clearCircumstanceFilter() {
  _selectedCircumstanceId = null;
  if (_factAnalysisSelectedId) {
    await _updateFactAnalysisColumns(_factAnalysisSelectedId);
  }
}

async function _unlinkActFromCircumstance(actId, circId) {
  const rels = await DB.getCircumstanceActRelations(circId);
  const rel = rels.find(r => r.actId === actId);
  if (rel) {
    await DB.deleteCircumstanceActRelation(rel.id);
  }
  if (_factAnalysisSelectedId) await _updateFactAnalysisColumns(_factAnalysisSelectedId);
}

async function _unlinkProofFromAct(proofId, actId) {
  const rels = await DB.getActProofRelations(actId);
  const rel = rels.find(r => r.proofId === proofId);
  if (rel) {
    await DB.deleteActProofRelation(rel.id);
  }
  if (_factAnalysisSelectedId) await _updateFactAnalysisColumns(_factAnalysisSelectedId);
}

async function _unlinkProofFromCircumstance(proofId, circId, factId) {
  const rels = await DB.getCircumstanceProofRelations(circId);
  const rel = rels.find(r => r.proofId === proofId);
  if (rel) {
    await DB.deleteCircumstanceProofRelation(rel.id);
  }
  await _updateFactAnalysisColumns(factId);
}

async function _unlinkProofFromFact(proofId, factId) {
  const rels = await DB.getFactProofRelations(factId);
  const rel = rels.find(r => r.proofId === proofId);
  if (rel) {
    await DB.deleteFactProofRelation(rel.id);
  }
  await _updateFactAnalysisColumns(factId);
}

function _onProofSearchInput(value) {
  _proofSearchQuery = value;
  if (_factAnalysisSelectedId) {
    _updateProofsColumn(_factAnalysisSelectedId);
  }
}

async function _deleteCircumstanceInAnalysis(circId, factId) {
  if (!confirm(t('confirmDelete'))) return;
  await DB.deleteCircumstance(circId);
  await _updateFactAnalysisColumns(factId);
}

async function _deleteProofInAnalysis(proofId, factId) {
  if (!confirm(t('confirmDelete'))) return;
  await DB.deleteProof(proofId);
  await _updateFactAnalysisColumns(factId);
}

async function openFactEditModal(factId, onSaved) {
  const fact = await DB.getFact(factId);
  if (!fact) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)';

  modal.innerHTML = `
    <h3>${t('edit')} — ${esc(fact.title)}</h3>
    <div class="form-group">
      <label>${t('factTitle')} *</label>
      <input type="text" id="editFactTitle" value="${esc(fact.title || '')}" data-testid="input-edit-fact-title" />
    </div>
    <div class="form-group">
      <label>${t('factDescription')}</label>
      <textarea id="editFactDescription" rows="3" data-testid="textarea-edit-fact-description">${esc(fact.description || '')}</textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>${t('factDate')}</label>
        <input type="date" id="editFactDate" value="${fact.factDate || ''}" data-testid="input-edit-fact-date" />
      </div>
      <div class="form-group">
        <label>${t('factTime')}</label>
        <input type="time" id="editFactTime" value="${fact.factTime || ''}" data-testid="input-edit-fact-time" />
      </div>
    </div>
    <div class="form-group">
      <label>${t('factPlace')}</label>
      <input type="text" id="editFactPlace" value="${esc(fact.place || '')}" data-testid="input-edit-fact-place" />
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" id="btnSaveFactEdit" data-testid="button-save-fact-edit">${t('save')}</button>
      <button class="btn" id="btnCancelFactEdit">${t('cancel')}</button>
    </div>
  `;

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  modal.querySelector('#btnSaveFactEdit').onclick = async () => {
    const title = modal.querySelector('#editFactTitle').value.trim();
    if (!title) return;
    await DB.updateFact(factId, {
      title: title,
      description: modal.querySelector('#editFactDescription').value.trim(),
      factDate: modal.querySelector('#editFactDate').value || null,
      factTime: modal.querySelector('#editFactTime').value || null,
      place: modal.querySelector('#editFactPlace').value.trim() || null
    });
    overlay.remove();
    await renderAll();
    if (onSaved) await onSaved();
  };

  modal.querySelector('#btnCancelFactEdit').onclick = () => overlay.remove();
}

async function deleteFactFromTree(factId) {
  const circumstances = await DB.getCircumstances(factId);
  const proofs = await DB.getProofs(factId);
  if (circumstances.length > 0 || proofs.length > 0) {
    alert(t('cannotDeleteFactHasLinked'));
    return;
  }
  if (!confirm(t('confirmDelete'))) return;
  if (_factAnalysisSelectedId === factId) {
    _closeFactAnalysis();
  }
  await DB.deleteFact(factId);
  state.selection = null;
  await renderAll();
}

async function showProofDetail(id) {
  const pr = await DB.getProof(id);
  if (!pr) return;
  const panel = document.getElementById('detailView');
  const factRels = await DB.getProofFactRelations(id);

  let linkedFactsHtml = '';
  if (factRels.length > 0) {
    linkedFactsHtml = `<div class="detail-field"><div class="detail-field-label">${t('entityFact')}</div><div class="detail-field-value">` +
      factRels.map(rel => {
        const f = rel.fact;
        if (!f) return '';
        const relLabel = tProofRelType(rel.relationType || 'confirms');
        const relCls = rel.relationType === 'confirms' ? 'tree-badge-confirm' : rel.relationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
        return `<div class="proof-link-item" onclick="selectItem('fact', ${f.id})" style="cursor:pointer">
          <span class="tree-badge ${relCls}" style="font-size:10px">${relLabel}</span>
          <span>${esc(f.title)}</span>
        </div>`;
      }).join('') + '</div></div>';
  }

  const entityFiles = await getDisplayFiles('proof', id);
  const fileHtml = renderMultiFileDisplay(entityFiles, 'proof', id);

  const dTitle = proofTitle(pr);
  const dNotes = proofNotes(pr);

  const mtLabel = pr.mediaType === 'image' ? t('mediaImage') : pr.mediaType === 'audio' ? t('mediaAudio') : pr.mediaType === 'video' ? t('mediaVideo') : t('mediaDocument');
  const mtIcon = pr.mediaType === 'image' ? '🖼️' : pr.mediaType === 'audio' ? '🎧' : pr.mediaType === 'video' ? '🎬' : '📄';

  let imgDescHtml = '';
  if (pr.mediaType === 'image' && (pr.imageDescriptionIt || pr.imageDescriptionEn)) {
    const descIt = currentLang === 'en' ? (pr.imageDescriptionEn || pr.imageDescriptionIt || '') : (pr.imageDescriptionIt || '');
    imgDescHtml = `<div class="detail-field"><div class="detail-field-label">${t('imageDescriptionIt').replace(' (IT)','')}</div><div class="detail-field-value" style="white-space:pre-wrap">${esc(descIt)}</div></div>`;
  }
  let vidDescHtml = '';
  if (pr.mediaType === 'video' && (pr.videoDescriptionIt || pr.videoDescriptionEn)) {
    const descIt = currentLang === 'en' ? (pr.videoDescriptionEn || pr.videoDescriptionIt || '') : (pr.videoDescriptionIt || '');
    vidDescHtml = `<div class="detail-field"><div class="detail-field-label">${t('videoDescriptionIt').replace(' (IT)','')}</div><div class="detail-field-value" style="white-space:pre-wrap">${esc(descIt)}</div></div>`;
  }
  let transcriptHtml = '';
  if ((pr.mediaType === 'audio' || pr.mediaType === 'video') && (pr.transcriptIt || pr.transcriptEn)) {
    const trText = currentLang === 'en' ? (pr.transcriptEn || pr.transcriptIt || '') : (pr.transcriptIt || '');
    transcriptHtml = `<div class="detail-field"><div class="detail-field-label">${t('proofTranscriptIt').replace(' IT','')}</div><div class="detail-field-value" style="white-space:pre-wrap">${esc(trText)}</div></div>`;
  }

  panel.innerHTML = `
    <div class="detail-panel">
      <div class="detail-header">
        <h2>${esc(dTitle)}${pr.protocol ? ` <span class="tree-badge tree-badge-neutral" style="font-size:10px;margin-left:8px" data-testid="text-proof-protocol">Prot. ${esc(pr.protocol)}</span>` : ''} <span class="tree-badge" style="font-size:10px;margin-left:4px" data-testid="text-proof-media-type">${mtIcon} ${mtLabel}</span></h2>
        ${pr.proofDate ? `<div class="hint" style="font-size:12px;margin-top:2px">${t('proofDate')}: ${_fmtDateShort(pr.proofDate)}${pr.proofTime ? ' — ' + pr.proofTime : ''}</div>` : (pr.proofTime ? `<div class="hint" style="font-size:12px;margin-top:2px">${t('proofTime')}: ${pr.proofTime}</div>` : '')}
        <div class="detail-header-actions">
          ${creatorOnly(`<button class="btn btn-sm" onclick="openForm('proof', null, ${id})">${t('edit')}</button>`)}
          ${creatorOnly(`<button class="btn btn-sm btn-danger" onclick="deleteEntity('proof', ${id})">${t('delete')}</button>`)}
        </div>
      </div>
      ${linkedFactsHtml}
      ${dNotes ? `<div class="detail-field"><div class="detail-field-label">${t('proofNotes')}</div><div class="detail-field-value">${esc(dNotes)}</div></div>` : ''}
      ${imgDescHtml}
      ${vidDescHtml}
      ${transcriptHtml}
      <div class="detail-section">
        <div class="detail-section-header"><h3>${t('fileSection')}</h3></div>
        ${fileHtml}
      </div>
    </div>
  `;
  showLinkedSection('proof', id);
}

/* ========== FILE HANDLING ========== */
async function _resolveFileHierarchy(entityType, parentId) {
  if (entityType === 'act' || entityType === 'fact') {
    const doss = parentId ? await DB.getDossier(parentId) : null;
    if (!doss) return { dossierId: parentId };
    const proc = doss.proceedingId ? await DB.getProceeding(doss.proceedingId) : null;
    return { caseId: proc ? proc.caseId : null, proceedingId: doss.proceedingId, dossierId: parentId };
  }
  if (entityType === 'proof') {
    const fact = parentId ? await DB.getFact(parentId) : null;
    if (!fact || !fact.dossierId) return {};
    const doss = await DB.getDossier(fact.dossierId);
    if (!doss) return { dossierId: fact.dossierId };
    const proc = doss.proceedingId ? await DB.getProceeding(doss.proceedingId) : null;
    return { caseId: proc ? proc.caseId : null, proceedingId: doss.proceedingId, dossierId: fact.dossierId };
  }
  return {};
}

async function storeFileForEntity(file, entityType, entityId, lang, hierarchy) {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  let storagePath = '';
  let diskFileName = '';

  if (FS_FILES_HANDLE) {
    const result = await saveFileToFS(file, entityType, entityId, lang);
    if (result) {
      storagePath = result.storagePath;
      diskFileName = result.diskFileName;
    } else {
      console.warn('saveFileToFS failed for', file.name, entityType, entityId, '- blob will be preserved in DB');
    }
  }

  const h = hierarchy || {};
  await DB.createFile({
    entityType,
    entityId,
    lang,
    actId: entityType === 'act' ? entityId : 0,
    caseId: h.caseId || null,
    proceedingId: h.proceedingId || null,
    dossierId: h.dossierId || null,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
    hash,
    storagePath,
    diskFileName,
    blob: new Uint8Array(buf)
  });
}

async function downloadFile(fileId) {
  const f = await DB.getFile(fileId);
  if (!f) return;
  await downloadFileFromFS(f);
}

async function deleteFileAndRefresh(fileId, entityType, entityId) {
  const f = await DB.getFile(fileId);
  if (f && FS_FILES_HANDLE) {
    await deleteFileFromFS(f);
  }
  await DB.deleteFile(fileId);
  await showDetail(entityType, entityId);
}

/* ========== FILE UPLOAD WIDGET ========== */
function fileUploadWidget(langCode, existingFiles) {
  const inputId = 'fFile_' + langCode;
  const listId = 'fFileList_' + langCode;
  const dropId = 'fFileDrop_' + langCode;
  const label = langCode === 'it' ? t('fileIt') : t('fileEn');
  const badgeCls = 'file-lang-' + langCode;

  let existingHtml = '';
  if (existingFiles && existingFiles.length > 0) {
    existingHtml = existingFiles.map(f =>
      `<div class="file-drop-item existing"><span class="file-lang-badge ${badgeCls}">${langCode.toUpperCase()}</span> ${esc(f.fileName)} <span class="hint">(${formatSize(f.fileSize)})</span></div>`
    ).join('');
  }

  return `
    <div class="file-drop-zone" id="${dropId}"
         ondragover="event.preventDefault(); this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="onDropFiles('${langCode}', event)"
         onclick="document.getElementById('${inputId}').click()">
      <div class="file-drop-label"><span class="file-lang-badge ${badgeCls}" style="font-size:11px">${langCode.toUpperCase()}</span> ${label}</div>
      <div class="file-drop-hint">${t('dragOrClick')}</div>
      <div class="file-drop-list" id="${listId}">${existingHtml}</div>
      <input type="file" id="${inputId}" class="file-input-hidden" multiple onchange="onFormFilesSelected('${langCode}', this)">
    </div>
  `;
}

function fileUploadZones(existingFilesIt, existingFilesEn) {
  return `
    <div class="file-upload-zones">
      ${fileUploadWidget('it', existingFilesIt)}
      ${fileUploadWidget('en', existingFilesEn)}
    </div>
  `;
}

function caseFileUploadWidget(langCode, existingFile, caseIdx) {
  const inputId = 'fCaseFile_' + langCode;
  const listId = 'fCaseFileList_' + langCode;
  const dropId = 'fCaseFileDrop_' + langCode;
  const labelKey = langCode === 'it' ? 'fileIt' : 'fileEn';
  const badgeCls = 'file-lang-' + langCode;
  const idxStr = caseIdx ? String(caseIdx).padStart(3, '0') : '###';
  const autoName = langCode === 'it' ? 'IT_C' + idxStr + '_Atto_Introduttivo_Caso.pdf' : 'EN_C' + idxStr + '_Introductory_Act_Case.pdf';

  let existingHtml = '';
  if (existingFile) {
    existingHtml = `<div class="file-drop-item existing"><span class="file-lang-badge ${badgeCls}">${langCode.toUpperCase()}</span> ${esc(existingFile.fileName)} <span class="hint">(${formatSize(existingFile.fileSize)})</span></div>`;
  }

  return `
    <div class="file-drop-zone" id="${dropId}"
         ondragover="event.preventDefault(); this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="onDropCaseFile('${langCode}', event)"
         onclick="document.getElementById('${inputId}').click()">
      <div class="file-drop-label"><span class="file-lang-badge ${badgeCls}" style="font-size:11px">${langCode.toUpperCase()}</span> <span data-i18n="${labelKey}">${t(labelKey)}</span></div>
      <div class="file-drop-hint">PDF — <span data-i18n="dragOrClick">${t('dragOrClick')}</span></div>
      <div class="file-drop-auto-name"><span data-i18n="autoFileName">${t('autoFileName')}</span>: <strong>${autoName}</strong></div>
      <div class="file-drop-list" id="${listId}">${existingHtml}</div>
      <input type="file" id="${inputId}" class="file-input-hidden" accept=".pdf,application/pdf" onchange="onCaseFileSelected('${langCode}', this)">
    </div>
  `;
}

function caseFileUploadZones(existingFileIt, existingFileEn, caseIdx) {
  return `
    <div class="form-section-box">
      <div class="form-section-box-header" data-i18n="docIntroduttivoCaso">${t('docIntroduttivoCaso')}</div>
      <div class="file-upload-zones">
        ${caseFileUploadWidget('it', existingFileIt, caseIdx)}
        ${caseFileUploadWidget('en', existingFileEn, caseIdx)}
      </div>
    </div>
  `;
}

function onDropCaseFile(lang, event) {
  event.preventDefault();
  const dropZone = document.getElementById('fCaseFileDrop_' + lang);
  if (dropZone) dropZone.classList.remove('drag-over');
  const files = Array.from(event.dataTransfer.files);
  const pdf = files.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (!pdf) { alert(t('onlyPdfAllowed')); return; }
  state.pendingFiles[lang] = [pdf];
  _updateCaseFileDropList(lang);
}

function onCaseFileSelected(lang, input) {
  const files = Array.from(input.files);
  const pdf = files.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (!pdf) { alert(t('onlyPdfAllowed')); input.value = ''; return; }
  state.pendingFiles[lang] = [pdf];
  _updateCaseFileDropList(lang);
  input.value = '';
}

function _updateCaseFileDropList(lang) {
  const listEl = document.getElementById('fCaseFileList_' + lang);
  if (!listEl) return;
  const badgeCls = 'file-lang-' + lang;
  const pending = state.pendingFiles[lang] || [];
  const html = pending.map((f, i) =>
    `<div class="file-drop-item pending">
      <span class="file-lang-badge ${badgeCls}">${lang.toUpperCase()}</span>
      ${esc(f.name)} <span class="hint">(${formatSize(f.size)})</span>
      <button type="button" class="file-drop-remove" onclick="event.stopPropagation(); removeCasePendingFile('${lang}')">&#10005;</button>
    </div>`
  ).join('');
  const existingItems = listEl.querySelectorAll('.file-drop-item.existing');
  const existingHtml = Array.from(existingItems).map(el => el.outerHTML).join('');
  listEl.innerHTML = existingHtml + html;
}

function removeCasePendingFile(lang) {
  state.pendingFiles[lang] = [];
  _updateCaseFileDropList(lang);
}

function _buildCaseFileName(lang, caseIndex) {
  const pad3 = n => String(n).padStart(3, '0');
  if (lang === 'it') return 'IT_C' + pad3(caseIndex) + '_Atto_Introduttivo_Caso.pdf';
  return 'EN_C' + pad3(caseIndex) + '_Introductory_Act_Case.pdf';
}

function onDropFiles(lang, event) {
  event.preventDefault();
  const dropZone = document.getElementById('fFileDrop_' + lang);
  if (dropZone) dropZone.classList.remove('drag-over');
  const files = Array.from(event.dataTransfer.files);
  if (files.length === 0) return;
  for (const f of files) state.pendingFiles[lang].push(f);
  _updateFileDropList(lang);
}

function onFormFilesSelected(lang, input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;
  for (const f of files) state.pendingFiles[lang].push(f);
  _updateFileDropList(lang);
  input.value = '';
}

function _updateFileDropList(lang) {
  const listEl = document.getElementById('fFileList_' + lang);
  if (!listEl) return;
  const badgeCls = 'file-lang-' + lang;
  const pending = state.pendingFiles[lang] || [];
  const html = pending.map((f, i) =>
    `<div class="file-drop-item pending">
      <span class="file-lang-badge ${badgeCls}">${lang.toUpperCase()}</span>
      ${esc(f.name)} <span class="hint">(${formatSize(f.size)})</span>
      <button type="button" class="file-drop-remove" onclick="event.stopPropagation(); removePendingFile('${lang}', ${i})">&#10005;</button>
    </div>`
  ).join('');
  const existingItems = listEl.querySelectorAll('.file-drop-item.existing');
  const existingHtml = Array.from(existingItems).map(el => el.outerHTML).join('');
  listEl.innerHTML = existingHtml + html;
}

function removePendingFile(lang, index) {
  state.pendingFiles[lang].splice(index, 1);
  _updateFileDropList(lang);
}

function fileUploadWidgetOrigin(langCode, existingFiles) {
  const inputId = 'fFileOrigin_' + langCode;
  const listId = 'fFileListOrigin_' + langCode;
  const dropId = 'fFileDropOrigin_' + langCode;
  const label = langCode === 'it' ? t('fileIt') : t('fileEn');
  const badgeCls = 'file-lang-' + langCode;
  let existingHtml = '';
  if (existingFiles && existingFiles.length > 0) {
    existingHtml = existingFiles.map(f =>
      `<div class="file-drop-item existing"><span class="file-lang-badge ${badgeCls}">${langCode.toUpperCase()}</span> ${esc(f.fileName)} <span class="hint">(${formatSize(f.fileSize)})</span></div>`
    ).join('');
  }
  return `
    <div class="file-drop-zone" id="${dropId}"
         ondragover="event.preventDefault(); this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="onDropFilesOrigin('${langCode}', event)"
         onclick="document.getElementById('${inputId}').click()">
      <div class="file-drop-label"><span class="file-lang-badge ${badgeCls}" style="font-size:11px">${langCode.toUpperCase()}</span> ${label}</div>
      <div class="file-drop-hint">${t('dragOrClick')}</div>
      <div class="file-drop-list" id="${listId}">${existingHtml}</div>
      <input type="file" id="${inputId}" class="file-input-hidden" multiple onchange="onFormFilesSelectedOrigin('${langCode}', this)">
    </div>
  `;
}

function fileUploadZonesOrigin(existingFilesIt, existingFilesEn) {
  return `
    <div class="file-upload-zones">
      ${fileUploadWidgetOrigin('it', existingFilesIt)}
      ${fileUploadWidgetOrigin('en', existingFilesEn)}
    </div>
  `;
}

function onDropFilesOrigin(lang, event) {
  event.preventDefault();
  const dropZone = document.getElementById('fFileDropOrigin_' + lang);
  if (dropZone) dropZone.classList.remove('drag-over');
  const files = Array.from(event.dataTransfer.files);
  if (files.length === 0) return;
  for (const f of files) state.pendingFilesOrigin[lang].push(f);
  _updateFileDropListOrigin(lang);
}

function onFormFilesSelectedOrigin(lang, input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;
  for (const f of files) state.pendingFilesOrigin[lang].push(f);
  _updateFileDropListOrigin(lang);
  input.value = '';
}

function _updateFileDropListOrigin(lang) {
  const listEl = document.getElementById('fFileListOrigin_' + lang);
  if (!listEl) return;
  const badgeCls = 'file-lang-' + lang;
  const pending = state.pendingFilesOrigin[lang] || [];
  const html = pending.map((f, i) =>
    `<div class="file-drop-item pending">
      <span class="file-lang-badge ${badgeCls}">${lang.toUpperCase()}</span>
      ${esc(f.name)} <span class="hint">(${formatSize(f.size)})</span>
      <button type="button" class="file-drop-remove" onclick="event.stopPropagation(); removePendingFileOrigin('${lang}', ${i})">&#10005;</button>
    </div>`
  ).join('');
  const existingItems = listEl.querySelectorAll('.file-drop-item.existing');
  const existingHtml = Array.from(existingItems).map(el => el.outerHTML).join('');
  listEl.innerHTML = existingHtml + html;
}

function removePendingFileOrigin(lang, index) {
  state.pendingFilesOrigin[lang].splice(index, 1);
  _updateFileDropListOrigin(lang);
}

function fileUploadWidgetProof(langCode, existingFiles) {
  const inputId = 'fFileProof_' + langCode;
  const listId = 'fFileListProof_' + langCode;
  const dropId = 'fFileDropProof_' + langCode;
  const label = langCode === 'it' ? t('fileIt') : t('fileEn');
  const badgeCls = 'file-lang-' + langCode;
  let existingHtml = '';
  if (existingFiles && existingFiles.length > 0) {
    existingHtml = existingFiles.map(f =>
      `<div class="file-drop-item existing"><span class="file-lang-badge ${badgeCls}">${langCode.toUpperCase()}</span> ${esc(f.fileName)} <span class="hint">(${formatSize(f.fileSize)})</span></div>`
    ).join('');
  }
  return `
    <div class="file-drop-zone" id="${dropId}"
         ondragover="event.preventDefault(); this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="onDropFilesProof('${langCode}', event)"
         onclick="document.getElementById('${inputId}').click()">
      <div class="file-drop-label"><span class="file-lang-badge ${badgeCls}" style="font-size:11px">${langCode.toUpperCase()}</span> ${label}</div>
      <div class="file-drop-hint">${t('dragOrClick')}</div>
      <div class="file-drop-list" id="${listId}">${existingHtml}</div>
      <input type="file" id="${inputId}" class="file-input-hidden" multiple onchange="onFormFilesSelectedProof('${langCode}', this)">
    </div>
  `;
}

function fileUploadZonesProof(existingFilesIt, existingFilesEn) {
  return `
    <div class="file-upload-zones">
      ${fileUploadWidgetProof('it', existingFilesIt)}
      ${fileUploadWidgetProof('en', existingFilesEn)}
    </div>
  `;
}

function onDropFilesProof(lang, event) {
  event.preventDefault();
  const dropZone = document.getElementById('fFileDropProof_' + lang);
  if (dropZone) dropZone.classList.remove('drag-over');
  const files = Array.from(event.dataTransfer.files);
  if (files.length === 0) return;
  for (const f of files) state.pendingProofFiles[lang].push(f);
  _updateFileDropListProof(lang);
}

function onFormFilesSelectedProof(lang, input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;
  for (const f of files) state.pendingProofFiles[lang].push(f);
  _updateFileDropListProof(lang);
  input.value = '';
}

function _updateFileDropListProof(lang) {
  const listEl = document.getElementById('fFileListProof_' + lang);
  if (!listEl) return;
  const badgeCls = 'file-lang-' + lang;
  const pending = state.pendingProofFiles[lang] || [];
  const html = pending.map((f, i) =>
    `<div class="file-drop-item pending">
      <span class="file-lang-badge ${badgeCls}">${lang.toUpperCase()}</span>
      ${esc(f.name)} <span class="hint">(${formatSize(f.size)})</span>
      <button type="button" class="file-drop-remove" onclick="event.stopPropagation(); removePendingFileProof('${lang}', ${i})">&#10005;</button>
    </div>`
  ).join('');
  const existingItems = listEl.querySelectorAll('.file-drop-item.existing');
  const existingHtml = Array.from(existingItems).map(el => el.outerHTML).join('');
  listEl.innerHTML = existingHtml + html;
}

function removePendingFileProof(lang, index) {
  state.pendingProofFiles[lang].splice(index, 1);
  _updateFileDropListProof(lang);
}

/* ========== FORMS ========== */
function openForm(type, parentId, editId) {
  state.pendingFiles = { it: [], en: [] };
  state.pendingFilesOrigin = { it: [], en: [] };
  state.openForm = { type, parentId: parentId || null, editId: editId || null };
  hideAllPanels();
  document.getElementById('formView').style.display = 'block';

  if (type === 'case') showCaseForm(editId);
  else if (type === 'proceeding') showProceedingForm(parentId, editId);
  else if (type === 'dossier') showDossierForm(parentId, editId);
  else if (type === 'act') showActForm(parentId, editId);
  else if (type === 'fact') showFactForm(parentId, editId);
  else if (type === 'subject') showSubjectForm(editId);
  else if (type === 'circumstance') showCircumstanceForm(parentId, editId);
}

async function showCaseForm(editId) {
  const isEdit = !!editId;
  const existing = isEdit ? await DB.getCase(editId) : null;
  const existingFiles = isEdit ? await DB.getEntityFiles('case', editId) : [];
  const existingFileIt = existingFiles.find(f => f.lang === 'it') || null;
  const existingFileEn = existingFiles.find(f => f.lang === 'en') || null;

  let caseIdx = null;
  if (isEdit) {
    const allCases = await DB.getCases();
    allCases.sort((a, b) => a.id - b.id);
    caseIdx = allCases.findIndex(c => c.id === editId) + 1;
  }

  const panel = document.getElementById('formView');
  panel.innerHTML = `
    <div class="form-panel">
      <h2>${t(isEdit ? 'editCase' : 'newCase')}</h2>
      <div class="form-lang-columns">
        <div class="form-lang-section">
          <div class="form-lang-section-header"><span class="form-lang-badge form-lang-badge-it">IT</span> ${t('sectionIt')}</div>
          <div class="form-group">
            <label>${t('caseTitleIt')} <span class="form-required">*</span></label>
            <input id="fCaseTitle" value="${esc(existing?.title || '')}" required data-testid="input-case-title-it">
          </div>
          <div class="form-group">
            <label>${t('descrIt')} <span class="form-required">*</span></label>
            <textarea id="fCaseDescrIt" rows="3" required data-testid="input-case-descr-it">${esc(existing?.descrIt || '')}</textarea>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;justify-content:center;padding-top:28px">
          ${_renderTransArrow('fCaseTitle','fCaseTitleEn','it','en')}
          ${_renderTransArrow('fCaseTitleEn','fCaseTitle','en','it')}
          ${_renderTransArrow('fCaseDescrIt','fCaseDescrEn','it','en')}
          ${_renderTransArrow('fCaseDescrEn','fCaseDescrIt','en','it')}
        </div>
        <div class="form-lang-section">
          <div class="form-lang-section-header"><span class="form-lang-badge form-lang-badge-en">EN</span> ${t('sectionEn')}</div>
          <div class="form-group">
            <label>${t('caseTitleEn')}</label>
            <input id="fCaseTitleEn" value="${esc(existing?.titleEn || '')}" data-testid="input-case-title-en">
          </div>
          <div class="form-group">
            <label>${t('descrEn')}</label>
            <textarea id="fCaseDescrEn" rows="3" data-testid="input-case-descr-en">${esc(existing?.descrEn || '')}</textarea>
          </div>
        </div>
      </div>
      ${caseFileUploadZones(existingFileIt, existingFileEn, caseIdx)}
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveCase(${editId || 'null'})" data-testid="button-save-case">${t('save')}</button>
        <button class="btn" onclick="cancelForm()" data-testid="button-cancel-case">${t('cancel')}</button>
      </div>
    </div>
  `;
}

async function saveCase(editId) {
  const title = document.getElementById('fCaseTitle').value.trim();
  if (!title) { document.getElementById('fCaseTitle').focus(); return; }
  const descrIt = document.getElementById('fCaseDescrIt').value.trim();
  if (!descrIt) { document.getElementById('fCaseDescrIt').focus(); return; }

  const data = {
    title,
    titleEn: document.getElementById('fCaseTitleEn').value.trim(),
    descrIt,
    descrEn: document.getElementById('fCaseDescrEn').value.trim()
  };

  let entityId;
  if (editId) {
    await DB.updateCase(editId, data);
    entityId = editId;
    state.selection = { type: 'case', id: editId };
  } else {
    const c = await DB.createCase(data);
    entityId = c.id;
    state.selection = { type: 'case', id: c.id };
    state.expanded['case_' + c.id] = true;
  }

  const allCases = await DB.getCases();
  allCases.sort((a, b) => a.id - b.id);
  const caseIdx = allCases.findIndex(c => c.id === entityId) + 1;

  if (state.pendingFiles.it.length > 0) {
    const origFile = state.pendingFiles.it[0];
    const renamedName = _buildCaseFileName('it', caseIdx);
    const renamed = new File([origFile], renamedName, { type: 'application/pdf' });
    await storeFileForEntity(renamed, 'case', entityId, 'it', { caseId: entityId });
  }
  if (state.pendingFiles.en.length > 0) {
    const origFile = state.pendingFiles.en[0];
    const renamedName = _buildCaseFileName('en', caseIdx);
    const renamed = new File([origFile], renamedName, { type: 'application/pdf' });
    await storeFileForEntity(renamed, 'case', entityId, 'en', { caseId: entityId });
  }

  state.pendingFiles = { it: [], en: [] };
  state.openForm = null;
  await renderAll();
}

/* ========== PROCEEDING FORM (TABBED) ========== */
async function showProceedingForm(caseId, editId) {
  try {
  const isEdit = !!editId;
  const existing = isEdit ? await DB.getProceeding(editId) : null;
  const types = ['penale', 'civile', 'amministrativo', 'esecuzione', 'altro'];
  const grades = ['procura', 'primo_grado', 'appello', 'cassazione'];
  const statuses = ['attivo', 'archiviato', 'definito', 'sospeso'];
  const modelliProcura = ['mod21', 'mod44', 'mod45', 'mod21bis'];
  const sd = existing?.specificData || {};
  const curType = existing?.type || '';
  const curGrado = existing?.grado || '';
  const curRgType = existing?.rgType || '';

  let initPhases = [];
  if (existing && sd.phases && Array.isArray(sd.phases) && sd.phases.length > 0) {
    initPhases = sd.phases;
  } else if (existing) {
    const regs = sd.registrations;
    if (Array.isArray(regs) && regs.length > 0) {
      initPhases = regs.map((r, i) => ({
        id: 'phase_' + i,
        tipo: r.grado || '',
        ufficio: '',
        numeroRegistro: r.rgNumber || '',
        anno: r.year || '',
        magistratoPrincipale: '',
        altriMagistrati: '',
        events: []
      }));
    } else if (existing.rgNumber) {
      initPhases = [{
        id: 'phase_0',
        tipo: existing.grado || '',
        ufficio: '',
        numeroRegistro: existing.rgNumber || '',
        anno: existing.year || '',
        magistratoPrincipale: '',
        altriMagistrati: '',
        events: []
      }];
    }
  }
  state.procPhases = initPhases;
  state.activePhaseIdx = initPhases.length > 0 ? initPhases.length - 1 : -1;
  state.editProcId = editId || null;
  state.availableActs = [];
  if (editId) { loadProceedingActs(); }

  let initEvents = [];
  if (existing && sd.events && Array.isArray(sd.events)) {
    initEvents = sd.events;
  } else if (existing && sd.phases) {
    for (const ph of (sd.phases || [])) {
      if (ph.events && ph.events.length > 0) {
        for (const ev of ph.events) {
          if (!initEvents.some(e => e.autoId && e.autoId === ev.autoId)) {
            initEvents.push({ ...ev, phaseRef: ph.tipo || '' });
          }
        }
      }
    }
  }
  state.procEvents = initEvents;

  state.activeTab = 'authority';
  if (isEdit && curType === 'penale') {
    const existingLinks = await DB.getEntitySubjects('proceeding', editId);
    const magCodes = new Set(Object.values(PHASE_TO_MAGISTRATE_ROLE));
    magCodes.add('magistrato');
    const nonMagRoles = PROCEDURAL_ROLES.filter(r => !magCodes.has(r));
    const nonMagLabelsIt = nonMagRoles.map(r => (I18N.it['procRole_' + r] || r).toLowerCase());
    const nonMagLabelsEn = nonMagRoles.map(r => (I18N.en['procRole_' + r] || r).toLowerCase());
    const indagatiLinks = existingLinks.filter(l => {
      if (!l.role) return false;
      const rLower = l.role.toLowerCase();
      if (rLower.startsWith('indagato')) return true;
      return nonMagLabelsIt.some(p => rLower.startsWith(p)) || nonMagLabelsEn.some(p => rLower.startsWith(p));
    });
    state.indagati = indagatiLinks.map(l => {
      const entry = { subjectId: l.subjectId, label: `${l.subject.lastName} ${l.subject.firstName}` };
      if (l.qualificaProcessuale) {
        entry.procRole = l.qualificaProcessuale;
      } else if (l.role) {
        const roleLower = l.role.toLowerCase();
        for (const pr of PROCEDURAL_ROLES) {
          const labelIt = (I18N.it['procRole_' + pr] || '').toLowerCase();
          const labelEn = (I18N.en['procRole_' + pr] || '').toLowerCase();
          if (roleLower.startsWith(labelIt) || roleLower.startsWith(labelEn)) {
            entry.procRole = pr;
            break;
          }
        }
        if (!entry.procRole && roleLower.startsWith('indagato')) entry.procRole = 'indagato';
      }
      if (l.dataQualifica) entry.dataQualifica = l.dataQualifica;
      if (l.role && l.role.includes(' | ')) {
        entry.roleLabel = l.role.split(' | ').slice(1).join(' | ');
      }
      return entry;
    });
  } else {
    state.indagati = Array.isArray(sd.indagati) ? [...sd.indagati] : [];
  }

  await _loadCPArticles();

  const allProcs = await DB.getAllProceedings();
  const otherProcs = allProcs.filter(p => !editId || p.id !== editId);

  const buildAutoTitle = (existing) => {
    if (!existing?.rgNumber || !existing?.year) return '';
    return buildProcTitle(existing);
  };
  const initTitle = (existing ? buildAutoTitle(existing) : '') || existing?.title || '';

  const _procOriginFiles = isEdit ? await DB.getEntityFiles('proceeding_origin', editId) : [];
  const _specContent = renderSpecificFormTabContents(curType, sd, _procOriginFiles);
  const _isPenaleObj = curType === 'penale' && _specContent && typeof _specContent === 'object';
  const _specIndagatiHtml = _isPenaleObj ? _specContent.indagati : (typeof _specContent === 'string' ? _specContent : '');
  const _specOrigineAttoHtml = _isPenaleObj ? _specContent.origineAtto : '';
  const _specDirittiHtml = _isPenaleObj ? (_specContent.dirittiProcessuali || '') : '';

  const panel = document.getElementById('formView');
  panel.innerHTML = `
    <div class="form-panel">
      <input type="hidden" id="fProcCaseId" value="${caseId || existing?.caseId || ''}">
      <input type="hidden" id="fProcTitle" value="${esc(initTitle)}">
      <input type="hidden" id="fProcFase" value="${esc(existing?.fase || '')}">

      <div class="proc-form-header">
        <div class="proc-form-header-title ${initTitle ? 'has-title' : ''}" id="procAutoTitleBar">
          <span id="procAutoTitleText">${initTitle ? esc(initTitle) : t(isEdit ? 'editProceeding' : 'newProceeding')}</span>
          <div class="proc-form-header-integrazione" id="procHeaderIntLabel" style="${sd.origineProc === 'integrazione' ? '' : 'display:none'}">${t('origineProc_perIntegrazione')}</div>
          <div class="proc-form-header-viol" id="procHeaderViolBadge" style="${sd.origineProc === 'integrazione' ? '' : 'display:none'}">${t('origineProc_illegittimo')}</div>
        </div>
        <div class="proc-form-header-controls">
          <div class="proc-form-header-type">
            <select id="fProcType" onchange="onProcTypeChange()">
              ${!curType ? `<option value="">${t('selectType')}</option>` : ''}
              ${types.map(tp => `<option value="${tp}" ${curType === tp ? 'selected' : ''}>${t(tp)}</option>`).join('')}
            </select>
          </div>
          <div class="proc-form-header-origine" id="origineProcRow" style="${curType === 'penale' ? '' : 'display:none'}">
            <select id="fOrigineProc" onchange="onOrigineProcChange()" data-testid="select-origine-proc">
              <option value="">— ${t('origineProc')} —</option>
              ${['ufficio','denuncia','querela','istanza','esposto','integrazione'].map(o => `<option value="${o}" ${sd.origineProc === o ? 'selected' : ''}>${t('origineProc_' + o)}</option>`).join('')}
            </select>
          </div>
          <div class="proc-form-header-parent" id="procPadreRow" style="${sd.origineProc === 'integrazione' ? '' : 'display:none'}">
            <select id="fProcPadre">
              <option value="">— ${t('procPadre')} —</option>
              ${otherProcs.map(p => `<option value="${p.id}" ${(existing?.parentProceedingId || '') == p.id ? 'selected' : ''}>${esc(buildProcTitle(p))}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div id="procFormBody" class="${curType ? '' : 'hidden'}">

      <div id="acc-indagati-anchor"></div>
      ${_specIndagatiHtml}

      <div class="form-section-group">
        <div class="phase-section-label" style="margin-bottom:8px">${t('tabLuogo')}</div>
        <div class="form-grid">
          <div class="form-group">
            <label>${t('luogoFatti')}</label>
            <input id="fProcLuogoFatti" value="${esc(existing?.luogoFatti || '')}">
          </div>
          <div class="form-group autocomplete-wrap">
            <label>${t('citta')}</label>
            <input id="fProcCitta" value="${esc(existing?.citta || '')}" autocomplete="off" data-testid="input-proc-citta">
            <div id="fProcCittaSuggestions" class="autocomplete-list"></div>
          </div>
        </div>
        <div class="form-grid form-grid-3">
          <div class="form-group">
            <label>${t('provincia')}</label>
            <input id="fProcProvincia" value="${esc(existing?.provincia || '')}">
          </div>
          <div class="form-group">
            <label>${t('regione')}</label>
            <input id="fProcRegione" value="${esc(existing?.regione || '')}">
          </div>
          <div class="form-group">
            <label>${t('stato_geo')}</label>
            <input id="fProcStato" value="${esc(existing?.stato || '')}">
          </div>
        </div>
      </div>
      <div id="acc-luogo"></div>

      ${_specOrigineAttoHtml}

      <div id="authVigilanceChain" class="form-section-group" style="display:none">
        <div class="phase-section-label" style="margin-bottom:8px">${t('catenaVigilanza')}</div>
        <div id="authVigilanceContent"></div>
      </div>

      <div class="form-block">
        <div class="phases-section-header">
          <h3 class="form-block-label" style="margin:0">${t('fasiProcedimentali')}</h3>
        </div>
        <div id="phasesContainer"></div>
      </div>

      <div class="form-block">
        <h3 class="form-block-label">${t('procRolesTitle')}</h3>
        <div id="formProcRolesContainer"><p class="hint">${t('noProcRoles')}</p></div>
      </div>

      <div class="form-block">
        <h3 class="form-block-label">${t('eventsTimelineTitle')} <button type="button" class="btn btn-xs btn-primary" onclick="addProcEvent()" style="margin-left:8px;text-transform:none">+ ${t('addEvent')}</button></h3>
        <div id="procEventsContainer"></div>
      </div>

      ${_specDirittiHtml}

      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveProceeding(${editId || 'null'})">${t('save')}</button>
        <button class="btn" onclick="cancelForm()">${t('cancel')}</button>
      </div>
      </div>
    </div>
  `;
  if (editId) renderFormProcRoles(editId);
  if (curType === 'penale') renderIndagatiList();
  if (curType) {
    if (curType === 'penale' && (!state.procPhases || state.procPhases.length === 0)) {
      state.procPhases = [createNewPhase('fase_procura')];
      state.activePhaseIdx = 0;
    }
    renderPhasesSection();
    updateFaseOptions(true);
    renderProcEventsSection();
  }
  console.log('showProceedingForm: calling setupCittaAutocomplete');
  setupCittaAutocomplete('fProcCitta', 'fProcCittaSuggestions', {
    provincia: 'fProcProvincia',
    regione: 'fProcRegione',
    stato: 'fProcStato'
  });
  setupCittaAutocomplete('fSpecCittaDeposito', 'fSpecCittaDepositoSuggestions', {}, {
    formatValue: function(c) { return c.comune + (c.provincia ? ' (' + c.provincia + ')' : ''); }
  });
  if (curType === 'penale') {
    setupIndagatoAutocomplete();
    onOrigineProcChange();
  }
  } catch (e) {
    console.error('showProceedingForm error:', e);
    alert('Errore apertura form: ' + e.message);
  }
}

const PROC_STATUSES_BY_TYPE = {
  penale: [
    'pen_indagini_preliminari', 'pen_archiviazione_chiesta', 'pen_archiviato',
    'pen_fase_gip', 'pen_fase_gup', 'pen_rinvio_a_giudizio',
    'pen_dibattimento', 'pen_appello', 'pen_cassazione', 'pen_esecuzione_penale',
    'pen_sospeso',
    'pen_condanna', 'pen_assoluzione', 'pen_patteggiamento', 'pen_prescritto', 'pen_definito'
  ],
  civile: ['attivo', 'pendente', 'istruttoria', 'trattazione', 'udienza_fissata', 'sospeso', 'decisione', 'sentenza_emessa', 'conciliato', 'estinto', 'definito'],
  amministrativo: ['attivo', 'ricorso_pendente', 'udienza_fissata', 'istruttoria', 'sospeso', 'decisione', 'sentenza_emessa', 'ottemperanza_in_corso', 'annullato', 'definito'],
  esecuzione: ['attivo', 'esecuzione_in_corso', 'sospeso', 'opposizione', 'eseguito', 'estinto', 'definito'],
  altro: ['attivo', 'in_corso', 'sospeso', 'archiviato', 'definito']
};

const PENALE_STATUS_PHASES = {
  'pen_indagini_preliminari':  ['fase_procura'],
  'pen_archiviazione_chiesta': ['fase_procura'],
  'pen_archiviato':            ['fase_procura'],
  'pen_fase_gip':              ['fase_procura', 'fase_gip_fase'],
  'pen_fase_gup':              ['fase_procura', 'fase_gip_fase', 'fase_gup'],
  'pen_rinvio_a_giudizio':     ['fase_procura', 'fase_gip_fase', 'fase_gup'],
  'pen_dibattimento':          ['fase_procura', 'fase_gip_fase', 'fase_gup', 'fase_dibattimento_fase'],
  'pen_appello':               ['fase_procura', 'fase_gip_fase', 'fase_gup', 'fase_dibattimento_fase', 'fase_appello_penale'],
  'pen_cassazione':            ['fase_procura', 'fase_gip_fase', 'fase_gup', 'fase_dibattimento_fase', 'fase_appello_penale', 'fase_cassazione_penale'],
  'pen_esecuzione_penale':     ['fase_procura', 'fase_gip_fase', 'fase_gup', 'fase_dibattimento_fase', 'fase_appello_penale', 'fase_cassazione_penale', 'fase_esecuzione_penale'],
  'pen_sospeso':               null,
  'pen_condanna':              null,
  'pen_assoluzione':           null,
  'pen_patteggiamento':        null,
  'pen_prescritto':            null,
  'pen_definito':              null
};

const PHASE_REGISTER_LABELS = {
  'fase_procura': 'RGNR',
  'fase_gip_fase': 'RG GIP',
  'fase_gup': 'RG GUP',
  'fase_dibattimento_fase': 'RGT',
  'fase_appello_penale': 'RGA',
  'fase_cassazione_penale': 'RG Cass.',
  'fase_esecuzione_penale': 'SIEP'
};

function updateProcStatusOptions() {
  const sel = document.getElementById('fProcStatus');
  if (!sel) return;
  const curVal = sel.value;
  const procType = document.getElementById('fProcType')?.value || '';
  if (!procType) {
    sel.innerHTML = `<option value="">${t('selectStatus')}</option>`;
    sel.value = '';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const opts = PROC_STATUSES_BY_TYPE[procType] || ['attivo', 'in_corso', 'sospeso', 'archiviato', 'definito'];
  const placeholder = (!curVal || !opts.includes(curVal)) ? `<option value="">${t('selectStatus')}</option>` : '';
  sel.innerHTML = placeholder + opts.map(s => `<option value="${s}" ${curVal === s ? 'selected' : ''}>${t(s)}</option>`).join('');
  if (!opts.includes(curVal)) sel.value = '';
}

function onProcStatusChange() {
  const sel = document.getElementById('fProcStatus');
  if (!sel) return;
  const placeholder = sel.querySelector('option[value=""]');
  if (placeholder && sel.value) placeholder.remove();

  const procType = document.getElementById('fProcType')?.value || '';
  if (procType === 'penale') {
    applyPenaleStatusPhases(sel.value);
  }
}

function applyPenaleStatusPhases(status) {
  let requiredPhases = PENALE_STATUS_PHASES[status];
  if (requiredPhases === null) return;
  if (!requiredPhases) return;
  if (!state.procPhases) state.procPhases = [];

  const existingTypes = state.procPhases.map(p => p.tipo);

  let added = false;
  for (const phaseType of requiredPhases) {
    if (!existingTypes.includes(phaseType)) {
      state.procPhases.push(createNewPhase(phaseType));
      added = true;
    }
  }

  if (added) {
    state.activePhaseIdx = state.procPhases.length - 1;
    renderPhasesSection();
    updateFaseOptions(false);
  }
}

function getPhaseRegisterLabel(phaseType) {
  return PHASE_REGISTER_LABELS[phaseType] || '';
}

function onOrigineProcChange() {
  const sel = document.getElementById('fOrigineProc');
  if (!sel) return;
  const val = sel.value;
  const accIndagati = document.getElementById('acc-indagati');
  if (accIndagati) {
    if (val === 'ufficio') {
      accIndagati.style.display = 'none';
    } else {
      accIndagati.style.display = '';
    }
  }
  const accOrigineAtto = document.getElementById('acc-origineAtto');
  if (accOrigineAtto) {
    if (val === 'ufficio') {
      accOrigineAtto.style.display = 'none';
    } else {
      accOrigineAtto.style.display = '';
    }
  }
  const padreRow = document.getElementById('procPadreRow');
  if (padreRow) {
    if (val === 'integrazione') {
      padreRow.style.display = '';
    } else {
      padreRow.style.display = 'none';
      const padreSelect = document.getElementById('fProcPadre');
      if (padreSelect) padreSelect.value = '';
    }
  }
  const intLabel = document.getElementById('procHeaderIntLabel');
  if (intLabel) {
    intLabel.style.display = val === 'integrazione' ? '' : 'none';
  }
  const violBadge = document.getElementById('procHeaderViolBadge');
  if (violBadge) {
    violBadge.style.display = val === 'integrazione' ? '' : 'none';
  }
  updateAutoTitle();
}

function onProcTypeChange() {
  const typeSelect = document.getElementById('fProcType');
  const val = typeSelect.value;
  const body = document.getElementById('procFormBody');
  if (!val) {
    body.classList.add('hidden');
    return;
  }
  const placeholder = typeSelect.querySelector('option[value=""]');
  if (placeholder) placeholder.remove();

  body.classList.remove('hidden');
  const origRow = document.getElementById('origineProcRow');
  if (origRow) origRow.style.display = val === 'penale' ? '' : 'none';
  updateSpecificTab();
  setupCittaAutocomplete('fProcCitta', 'fProcCittaSuggestions', {
    provincia: 'fProcProvincia',
    regione: 'fProcRegione',
    stato: 'fProcStato'
  });
  if (!state.procPhases || state.procPhases.length === 0) {
    state.procPhases = [];
    state.activePhaseIdx = -1;
    if (val === 'penale') {
      state.procPhases.push(createNewPhase('fase_procura'));
      state.activePhaseIdx = 0;
    } else {
      const firstPhaseMap = {
        civile: 'fase_primo_grado_civile',
        amministrativo: 'fase_tar',
        esecuzione: 'fase_esecuzione_gen',
        altro: 'fase_generica'
      };
      const autoType = firstPhaseMap[val];
      if (autoType) {
        state.procPhases.push(createNewPhase(autoType));
        state.activePhaseIdx = 0;
      }
    }
  }
  renderPhasesSection();
  updateFaseOptions(true);
}

const PHASE_TYPES_BY_PROC = {
  penale: ['fase_procura', 'fase_gip_fase', 'fase_gup', 'fase_dibattimento_fase', 'fase_appello_penale', 'fase_cassazione_penale', 'fase_esecuzione_penale'],
  civile: ['fase_mediazione', 'fase_primo_grado_civile', 'fase_appello_civile', 'fase_cassazione_civile', 'fase_esecuzione_civile'],
  amministrativo: ['fase_tar', 'fase_consiglio_stato', 'fase_cassazione_amm', 'fase_ottemperanza'],
  esecuzione: ['fase_esecuzione_gen', 'fase_opposizione_esec', 'fase_appello_esec', 'fase_cassazione_esec'],
  altro: ['fase_generica']
};

function getPhaseTypesForProc() {
  const typeEl = document.getElementById('fProcType');
  const procType = typeEl ? typeEl.value : '';
  return PHASE_TYPES_BY_PROC[procType] || ['fase_generica'];
}

function renderPhasesSection() {
  const container = document.getElementById('phasesContainer');
  if (!container) return;
  const phases = state.procPhases || [];
  const hasProcura = phases.some(p => p.tipo === 'fase_procura');
  if (hasProcura && !_cachedSubjects) {
    DB.getSubjects().then(subjects => {
      _cachedSubjects = subjects;
      renderPhasesSection();
    });
    container.innerHTML = '<p class="hint">Loading...</p>';
    return;
  }

  if (phases.length === 0) {
    container.innerHTML = `<p class="hint">${t('noPhases')}</p>`;
    return;
  }

  const phaseTypes = getPhaseTypesForProc();

  const f1Phase = phases.find(p => p.tipo === 'fase_procura');
  const hasF1Geo = !!(f1Phase?.geoData?.tribunale);

  container.innerHTML = phases.map((ph, idx) => {
    const isActive = idx === state.activePhaseIdx;
    const phaseLabel = ph.tipo ? t(ph.tipo) || ph.tipo : `${t('phaseType')} ${idx + 1}`;
    const regLabel = getPhaseRegisterLabel(ph.tipo);
    const regParts = [regLabel ? regLabel + ':' : '', ph.numeroRegistro, ph.anno ? '/' + ph.anno : ''].filter(Boolean).join(' ');
    const summary = [regParts, ph.magistratoPrincipale ? '\u2014 ' + ph.magistratoPrincipale : ''].filter(Boolean).join(' ');

    return `
      <div class="phase-block ${isActive ? 'phase-active' : 'phase-collapsed'}" data-phase-idx="${idx}">
        <div class="phase-header" onclick="togglePhase(${idx})">
          <span class="phase-indicator">${isActive ? '\u25BC' : '\u25B6'}</span>
          <span class="phase-label">F${idx + 1} \u2014 ${esc(phaseLabel)}</span>
          ${summary ? `<span class="phase-summary">${esc(summary)}</span>` : ''}
          ${phases.length > 1 ? `<button type="button" class="btn btn-xs btn-danger phase-remove" onclick="event.stopPropagation(); removePhase(${idx})" title="${t('removePhase')}">&#10005;</button>` : ''}
        </div>
        ${isActive ? renderPhaseBody(ph, idx, phaseTypes) : ''}
      </div>`;
  }).join('');

  const vigChainEl = document.getElementById('authVigilanceChain');
  if (vigChainEl) {
    vigChainEl.style.display = hasF1Geo ? '' : 'none';
  }

  phases.forEach((ph, idx) => {
    if (idx === state.activePhaseIdx) {
      setupMagistrateAutocomplete(idx);
      setupUfficioAutocomplete(idx);
      if (ph.tipo === 'fase_procura') {
        setupProcuraAutocompletes(idx);
        (ph.pmEvents || []).forEach((ev, evIdx) => {
          setupLinkedActAutocomplete(`pmActSearch_${idx}_${evIdx}`, `pmActSugg_${idx}_${evIdx}`, idx, evIdx, 'pm');
        });
      } else {
        (ph.phaseEvents || []).forEach((ev, evIdx) => {
          setupLinkedActAutocomplete(`genActSearch_${idx}_${evIdx}`, `genActSugg_${idx}_${evIdx}`, idx, evIdx, 'generic');
        });
      }
    }
  });

  if (document.getElementById('authVigilanceChain')) {
    refreshVigilanceChain();
  }
}

function renderPhaseBody(ph, idx, phaseTypes) {
  const regLabel = getPhaseRegisterLabel(ph.tipo);
  const regNumberLabel = regLabel ? `N. ${regLabel}` : t('phaseRegNumber');
  const isRGNR = (ph.tipo === 'fase_procura');
  const modelloOptions = ['mod21','mod21bis','mod44','mod45'];
  return `
    <div class="phase-body">
      <div class="phase-section phase-section-ident">
        <div class="phase-section-label">${t('phaseIdentSection')}${regLabel ? ` \u2014 <strong>${regLabel}</strong>` : ''}</div>
        <div class="phase-ident-grid">
          <div class="form-group autocomplete-wrap" style="position:relative">
            <label>${t('phaseOffice')}</label>
            <input id="phaseOffice_${idx}" value="${esc(ph.ufficio || '')}" autocomplete="off" placeholder="${t('searchComunePlaceholder')}" oninput="syncPhaseField(${idx}, 'ufficio', this.value)" data-testid="input-phase-office-${idx}">
            <div id="phaseOfficeSuggestions_${idx}" class="autocomplete-list"></div>
          </div>
          <div class="form-group">
            <label>${regNumberLabel}</label>
            <input id="phaseRegNum_${idx}" value="${esc(ph.numeroRegistro || '')}" oninput="syncPhaseField(${idx}, 'numeroRegistro', this.value); updateAutoTitle()" placeholder="${regLabel || ''}">
          </div>
          <div class="form-group">
            <label>${t('phaseYear')}</label>
            <input id="phaseYear_${idx}" type="number" value="${esc(ph.anno || '')}" oninput="syncPhaseField(${idx}, 'anno', this.value); updateAutoTitle()">
          </div>
          <div class="form-group">
            <label>${t('modelloProcura')}</label>
            ${isRGNR ? `
            <select id="phaseModello_${idx}" onchange="syncPhaseField(${idx}, 'modello', this.value); updateAutoTitle(); autoCalcTermineIndagini(${idx})">
              <option value="">—</option>
              ${modelloOptions.map(m => `<option value="${m}" ${ph.modello === m ? 'selected' : ''}>${t(m)}</option>`).join('')}
            </select>` : `
            <input id="phaseModello_${idx}" value="${esc(ph.modello || '')}" oninput="syncPhaseField(${idx}, 'modello', this.value)">
            `}
          </div>
          <div class="form-group" style="position:relative">
            <label>${t('procRole_' + (PHASE_TO_MAGISTRATE_ROLE[ph.tipo] || 'magistrato'))}</label>
            <div style="display:flex;gap:4px;align-items:center">
              <input id="phaseMag_${idx}" value="${esc(ph.magistratoPrincipale || '')}" autocomplete="off" oninput="syncPhaseField(${idx}, 'magistratoPrincipale', this.value)" data-testid="input-phase-magistrate-${idx}" style="flex:1">
              <button class="btn btn-xs" onclick="openNewSubjectForMagistrate(${idx})" title="${t('newSubjectInline')}" data-testid="btn-add-magistrate-${idx}">+</button>
            </div>
            <div id="phaseMagSuggestions_${idx}" class="autocomplete-list"></div>
          </div>
          <div class="form-group">
            <label>${t('dataIscrizione')}</label>
            <input type="date" id="phaseDataIscr_${idx}" value="${ph.dataIscrizione || ''}" oninput="syncPhaseField(${idx}, 'dataIscrizione', this.value); if(state.procPhases[${idx}]?.tipo==='fase_procura') refreshVigilanceChain(); autoCalcTermineIndagini(${idx})">
          </div>
          <div class="form-group">
            <label>${t('termineIndagini')} <span id="termineIndaginiBadge_${idx}" class="badge badge-info" style="font-size:0.75em"></span></label>
            <input type="date" value="${ph.termineIndagini || ''}" oninput="syncPhaseField(${idx}, 'termineIndagini', this.value)" data-testid="input-termine-indagini-${idx}">
          </div>
        </div>
      </div>

      ${ph.tipo === 'fase_procura' ? renderProcuraSpecificSections(ph, idx) : ''}
      ${PHASE_EVENT_CONFIG[ph.tipo] && ph.tipo !== 'fase_procura' ? renderGenericPhaseEvents(ph, idx) : ''}

    </div>`;
}

function renderProcuraSpecificSections(ph, idx) {
  if (!ph.personeLese) ph.personeLese = [];
  if (!ph.indagatiReati) ph.indagatiReati = [];
  if (!ph.pmEvents) ph.pmEvents = [];

  const indagatiList = state.indagati || [];
  const allSubjects = _cachedSubjects || [];

  const personeLeseHtml = ph.personeLese.map((pl, plIdx) => {
    const subj = pl.subjectId ? allSubjects.find(s => s.id === pl.subjectId) : null;
    const displayName = subj ? `${subj.lastName} ${subj.firstName}` : (pl.name || '');
    return `<div class="repeatable-row">
      <input id="phasePL_${idx}_${plIdx}" value="${esc(displayName)}" autocomplete="off" placeholder="${t('personaLesa')}" oninput="syncPersonaLesaName(${idx}, ${plIdx}, this.value)" data-testid="input-persona-lesa-${idx}-${plIdx}">
      <div id="phasePLSugg_${idx}_${plIdx}" class="autocomplete-list"></div>
      <button class="btn btn-xs btn-danger" onclick="removeProcuraPersonaLesa(${idx}, ${plIdx})" data-testid="btn-remove-pl-${idx}-${plIdx}">&times;</button>
    </div>`;
  }).join('');

  const _cpArtsForReati = (_cachedCPArticles && _cachedCPArticlesLang === currentLang) ? _cachedCPArticles : [];
  const indagatiReatiHtml = ph.indagatiReati.map((ir, irIdx) => {
    const subj = ir.subjectId ? allSubjects.find(s => s.id === ir.subjectId) : null;
    const displayName = subj ? `${subj.lastName} ${subj.firstName}` : '';
    const reatiArr = ir.reati || [];
    if (_cpArtsForReati.length > 0) {
      for (let ri = 0; ri < reatiArr.length; ri++) {
        const numMatch = reatiArr[ri].match(/art\.\s*(\d+(?:\s*[-‐]\s*\w+)?)/i);
        if (numMatch) {
          const artNum = numMatch[1].replace(/\s+/g, '').trim();
          const found = _cpArtsForReati.find(a => a.numero === artNum);
          if (found) reatiArr[ri] = found.label;
        }
      }
    }
    const reatiHtml = reatiArr.map((r, rIdx) => `
      <div class="repeatable-row">
        <input value="${esc(r)}" oninput="syncIndagatoReato(${idx}, ${irIdx}, ${rIdx}, this.value)" placeholder="${t('reatoIpotizzato')}" data-testid="input-reato-${idx}-${irIdx}-${rIdx}" style="flex:1">
        <button class="btn btn-xs btn-danger" onclick="removeIndagatoReato(${idx}, ${irIdx}, ${rIdx})">&times;</button>
        <button class="btn btn-xs" onclick="addReatoToIndagato(${idx}, ${irIdx})" data-testid="btn-add-reato-${idx}-${irIdx}-${rIdx}">+</button>
      </div>
    `).join('');
    return `<div class="repeatable-group">
      <div class="repeatable-group-header">
        <span class="repeatable-group-num">N.${irIdx + 1}</span>
        <button class="btn btn-xs btn-danger" onclick="removeIndagatoReatoEntry(${idx}, ${irIdx})">&times;</button>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label>${t('selectIndagato')}</label>
          <div style="display:flex;gap:4px;align-items:center">
            <div class="autocomplete-wrap" style="flex:1;position:relative">
              <input id="phaseIR_${idx}_${irIdx}" value="${esc(displayName)}" autocomplete="off" placeholder="${t('searchSubjectPlaceholder')}" data-testid="input-indagato-${idx}-${irIdx}">
              <div id="phaseIRSugg_${idx}_${irIdx}" class="autocomplete-list"></div>
            </div>
            <button class="btn btn-xs" onclick="openNewSubjectForIndagato()" title="${t('newSubjectInline')}" data-testid="btn-add-indagato-inline-${idx}-${irIdx}">+</button>
          </div>
        </div>
        <div class="form-group">
          <label>${t('reatiIpotizzati')}</label>
          ${reatiHtml || ''}
        </div>
      </div>
    </div>`;
  }).join('');

  const pmEventsHtml = ph.pmEvents.map((ev, evIdx) => {
    const tipoKeys = Object.keys(PM_EVENT_SUBTYPES);
    const sottoTipi = ev.tipo ? (PM_EVENT_SUBTYPES[ev.tipo] || []) : [];
    const effect = ev.sottoTipo ? (PM_DECISION_EFFECTS[ev.sottoTipo] || null) : null;
    const hasEffect = effect && effect.nextPhase;
    return `<div class="phase-event-box ${hasEffect ? 'has-effect' : ''}">
      <button type="button" class="phase-event-remove" onclick="removePmEvent(${idx}, ${evIdx})" data-testid="btn-remove-pm-${idx}-${evIdx}" title="${t('removePmEvent')}">&times;</button>
      <div class="form-grid form-grid-4">
        <div class="form-group">
          <label>${t('pmEventDate')}</label>
          <input type="date" value="${ev.date || ''}" oninput="syncPmEventField(${idx}, ${evIdx}, 'date', this.value)" data-testid="input-pm-date-${idx}-${evIdx}">
        </div>
        <div class="form-group">
          <label>${t('pmTipoIntervento')}</label>
          <select onchange="onPmEventTipoChange(${idx}, ${evIdx}, this.value)" data-testid="select-pm-tipo-${idx}-${evIdx}">
            <option value="">\u2014</option>
            ${tipoKeys.map(k => `<option value="${k}" ${ev.tipo === k ? 'selected' : ''}>${t(k)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>${t('pmSottoTipo')}</label>
          <select onchange="onPmEventSottoTipoChange(${idx}, ${evIdx}, this.value)" data-testid="select-pm-sotto-${idx}-${evIdx}">
            <option value="">\u2014</option>
            ${sottoTipi.map(s => `<option value="${s}" ${ev.sottoTipo === s ? 'selected' : ''}>${t(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group autocomplete-wrap" style="position:relative">
          <label>${t('linkedActs')}</label>
          <input id="pmActSearch_${idx}_${evIdx}" placeholder="${t('searchActPlaceholder')}" autocomplete="off" data-testid="input-pm-act-search-${idx}-${evIdx}">
          <div id="pmActSugg_${idx}_${evIdx}" class="autocomplete-list"></div>
        </div>
      </div>
      ${(ev.linkedActIds && ev.linkedActIds.length > 0) ? `<div style="margin-top:4px">${renderLinkedActsBadges(ev.linkedActIds, idx, evIdx, 'pm')}</div>` : ''}
      <div style="display:flex;gap:12px;margin-top:6px">
        <div class="form-group" style="flex:1">
          <label>${t('pmEventNotesIt')}</label>
          <textarea id="pmNotesIt_${idx}_${evIdx}" rows="3" oninput="syncPmEventField(${idx}, ${evIdx}, 'notes', this.value)" style="width:100%;resize:vertical" data-testid="input-pm-notes-it-${idx}-${evIdx}">${esc(ev.notes || '')}</textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
          ${_renderTransArrow(`pmNotesIt_${idx}_${evIdx}`,`pmNotesEn_${idx}_${evIdx}`,'it','en')}
          ${_renderTransArrow(`pmNotesEn_${idx}_${evIdx}`,`pmNotesIt_${idx}_${evIdx}`,'en','it')}
        </div>
        <div class="form-group" style="flex:1">
          <label>${t('pmEventNotesEn')}</label>
          <textarea id="pmNotesEn_${idx}_${evIdx}" rows="3" oninput="syncPmEventField(${idx}, ${evIdx}, 'notesEn', this.value)" style="width:100%;resize:vertical" data-testid="input-pm-notes-en-${idx}-${evIdx}">${esc(ev.notesEn || '')}</textarea>
        </div>
      </div>
      ${hasEffect ? `<div style="margin-top:4px;font-size:11px;color:var(--accent);font-weight:600">${_describeEffect(effect, ev.sottoTipo)}</div>` : ''}
    </div>`;
  }).join('');

  return `
    <div class="phase-section phase-section-procura">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="phase-section-label" style="margin:0">${t('personaLesa')}</div>
        <button class="btn btn-xs" onclick="addProcuraPersonaLesa(${idx})" data-testid="btn-add-persona-lesa-${idx}">${t('addPersonaLesa')}</button>
      </div>
      <div id="procuraPersoneLese_${idx}">
        ${personeLeseHtml}
      </div>

      <div class="phase-section-label" style="margin-top:12px;margin-bottom:8px">${t('indagatiReatiSection')}</div>
      <div id="procuraIndagatiReati_${idx}">
        ${indagatiReatiHtml}
      </div>
      <button class="btn btn-xs" onclick="addIndagatoReatoEntry(${idx})" data-testid="btn-add-indagato-reato-${idx}">${t('addIndagatoReato')}</button>

      <div class="phase-section-label" style="margin-top:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>${t('pmEventsSection')}</span>
        <button class="btn btn-xs" onclick="addPmEvent(${idx})" data-testid="btn-add-pm-event-${idx}">${t('addPmEvent')}</button>
      </div>
      <div id="procuraPmEvents_${idx}">
        ${pmEventsHtml}
      </div>
    </div>
  `;
}

function renderGenericPhaseEvents(ph, idx) {
  const config = PHASE_EVENT_CONFIG[ph.tipo];
  if (!config) return '';
  if (!ph.phaseEvents) ph.phaseEvents = [];

  const eventsHtml = ph.phaseEvents.map((ev, evIdx) => {
    const tipoKeys = Object.keys(config.subtypes);
    const sottoTipi = ev.tipo ? (config.subtypes[ev.tipo] || []) : [];
    const effect = ev.sottoTipo ? (config.effects[ev.sottoTipo] || null) : null;
    const hasEffect = effect && (effect.nextPhase || effect.closesPhase || effect.returnPhase || effect.definitive);
    return `<div class="phase-event-box ${hasEffect ? 'has-effect' : ''}">
      <button type="button" class="phase-event-remove" onclick="removeGenericEvent(${idx}, ${evIdx})" data-testid="btn-remove-event-${idx}-${evIdx}" title="${t(config.removeLabel)}">&times;</button>
      <div class="form-grid form-grid-4">
        <div class="form-group">
          <label>${t('phaseEventDate')}</label>
          <input type="date" value="${ev.date || ''}" oninput="syncGenericEventField(${idx}, ${evIdx}, 'date', this.value)" data-testid="input-phase-date-${idx}-${evIdx}">
        </div>
        <div class="form-group">
          <label>${t(config.tipoLabel)}</label>
          <select onchange="onGenericEventTipoChange(${idx}, ${evIdx}, this.value)" data-testid="select-phase-tipo-${idx}-${evIdx}">
            <option value="">\u2014</option>
            ${tipoKeys.map(k => `<option value="${k}" ${ev.tipo === k ? 'selected' : ''}>${t(k)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>${t(config.sottoLabel)}</label>
          <select onchange="onGenericEventSottoChange(${idx}, ${evIdx}, this.value)" data-testid="select-phase-sotto-${idx}-${evIdx}">
            <option value="">\u2014</option>
            ${sottoTipi.map(s => `<option value="${s}" ${ev.sottoTipo === s ? 'selected' : ''}>${t(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group autocomplete-wrap" style="position:relative">
          <label>${t('linkedActs')}</label>
          <input id="genActSearch_${idx}_${evIdx}" placeholder="${t('searchActPlaceholder')}" autocomplete="off" data-testid="input-gen-act-search-${idx}-${evIdx}">
          <div id="genActSugg_${idx}_${evIdx}" class="autocomplete-list"></div>
        </div>
      </div>
      ${(ev.linkedActIds && ev.linkedActIds.length > 0) ? `<div style="margin-top:4px">${renderLinkedActsBadges(ev.linkedActIds, idx, evIdx, 'generic')}</div>` : ''}
      <div class="form-group" style="margin-top:6px">
        <label>${t('phaseEventNotes')}</label>
        <textarea rows="3" oninput="syncGenericEventField(${idx}, ${evIdx}, 'notes', this.value)" style="width:100%;resize:vertical" data-testid="input-phase-notes-${idx}-${evIdx}">${esc(ev.notes || '')}</textarea>
      </div>
      ${hasEffect ? `<div style="margin-top:4px;font-size:11px;color:var(--accent);font-weight:600">${_describeEffect(effect, ev.sottoTipo)}</div>` : ''}
    </div>`;
  }).join('');

  return `
    <div class="phase-section phase-section-procura">
      <div class="phase-section-label" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>${t(config.label)}</span>
        <button class="btn btn-xs" onclick="addGenericEvent(${idx})" data-testid="btn-add-event-${idx}">${t(config.addLabel)}</button>
      </div>
      <div id="phaseEvents_${idx}">
        ${eventsHtml}
      </div>
    </div>
  `;
}

function _describeEffect(effect, sottoTipo) {
  if (effect.definitive) return '\u2192 ' + t('effectDefinitive');
  if (effect.closesPhase && effect.enablesAppeal) return '\u2192 ' + t('effectClosesEnablesAppeal');
  if (effect.closesPhase && effect.enablesCassazione) return '\u2192 ' + t('effectClosesEnablesCassazione');
  if (effect.closesPhase) return '\u2192 ' + t('effectClosesPhase');
  if (effect.nextPhase) return '\u2192 ' + t('effectCreatesPhase') + ': ' + t(effect.nextPhase);
  if (effect.returnPhase) return '\u2192 ' + t('effectReturnPhase') + ': ' + t(effect.returnPhase);
  return '';
}

function addGenericEvent(phaseIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph.phaseEvents) ph.phaseEvents = [];
  ph.phaseEvents.push({ tipo: '', sottoTipo: '', date: '', notes: '', linkedActIds: [] });
  renderPhasesSection();
}

function removeGenericEvent(phaseIdx, evIdx) {
  const ph = state.procPhases[phaseIdx];
  ph.phaseEvents.splice(evIdx, 1);
  renderPhasesSection();
}

function syncGenericEventField(phaseIdx, evIdx, field, val) {
  const ph = state.procPhases[phaseIdx];
  ph.phaseEvents[evIdx][field] = val;
}

function onGenericEventTipoChange(phaseIdx, evIdx, val) {
  const ph = state.procPhases[phaseIdx];
  ph.phaseEvents[evIdx].tipo = val;
  ph.phaseEvents[evIdx].sottoTipo = '';
  renderPhasesSection();
}

function onGenericEventSottoChange(phaseIdx, evIdx, val) {
  const ph = state.procPhases[phaseIdx];
  ph.phaseEvents[evIdx].sottoTipo = val;

  const config = PHASE_EVENT_CONFIG[ph.tipo];
  if (!config) { renderPhasesSection(); return; }
  const effect = config.effects[val];
  if (effect) {
    const existingTypes = (state.procPhases || []).map(p => p.tipo);
    if (effect.nextPhase && !existingTypes.includes(effect.nextPhase)) {
      state.procPhases.push(createNewPhase(effect.nextPhase));
      state.activePhaseIdx = state.procPhases.length - 1;
    }
    if (effect.enablesAppeal && !existingTypes.includes('fase_appello_penale')) {
      state.procPhases.push(createNewPhase('fase_appello_penale'));
    }
    if (effect.enablesCassazione && !existingTypes.includes('fase_cassazione_penale')) {
      state.procPhases.push(createNewPhase('fase_cassazione_penale'));
    }
    if (effect.returnPhase) {
      const returnIdx = (state.procPhases || []).findIndex(p => p.tipo === effect.returnPhase);
      if (returnIdx >= 0) {
        state.activePhaseIdx = returnIdx;
      }
    }
  }
  renderPhasesSection();
}

let _cachedSubjects = null;
async function _ensureCachedSubjects() {
  if (!_cachedSubjects) _cachedSubjects = await DB.getSubjects();
  return _cachedSubjects;
}

const VIGILANCE_CHAIN_ROLES = [
  { key: 'procuratoreRepubblica', roleId: 100, sedeType: 'tribunale' },
  { key: 'presidenteTribunale',   roleId: 112, sedeType: 'tribunale' },
  { key: 'presidenteCorteAppello', roleId: 113, sedeType: 'distretto' },
  { key: 'procuratoreGenerale',   roleId: 110, sedeType: 'distretto' }
];

function findSubjectByRoleAndSede(subjects, roleId, sede, dataIscrizione) {
  if (!sede) return null;
  const sedeLow = sede.trim().toLowerCase();
  const dateRef = dataIscrizione || '';
  for (const subj of subjects) {
    const roles = subj.roles || [];
    for (const r of roles) {
      if (r.roleId !== roleId) continue;
      const rCitta = (r.citta || '').trim().toLowerCase();
      if (rCitta !== sedeLow) continue;
      if (dateRef) {
        if (r.startDate && r.startDate > dateRef) continue;
        if (r.endDate && r.endDate < dateRef) continue;
      }
      return subj;
    }
  }
  return null;
}

function syncPersonaLesaName(phaseIdx, plIdx, val) {
  const ph = state.procPhases[phaseIdx];
  if (ph && ph.personeLese && ph.personeLese[plIdx]) {
    ph.personeLese[plIdx].name = val;
    ph.personeLese[plIdx].subjectId = null;
  }
}

function addProcuraPersonaLesa(phaseIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph.personeLese) ph.personeLese = [];
  ph.personeLese.push({ subjectId: null, name: '' });
  renderPhasesSection();
}

function removeProcuraPersonaLesa(phaseIdx, plIdx) {
  const ph = state.procPhases[phaseIdx];
  ph.personeLese.splice(plIdx, 1);
  renderPhasesSection();
}

function addIndagatoReatoEntry(phaseIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph.indagatiReati) ph.indagatiReati = [];
  ph.indagatiReati.push({ subjectId: null, reati: [''] });
  renderPhasesSection();
}

function removeIndagatoReatoEntry(phaseIdx, irIdx) {
  const ph = state.procPhases[phaseIdx];
  ph.indagatiReati.splice(irIdx, 1);
  renderPhasesSection();
}

function onIndagatoReatoSelect(phaseIdx, irIdx, val) {
  const ph = state.procPhases[phaseIdx];
  ph.indagatiReati[irIdx].subjectId = val ? parseInt(val) : null;
}

function addReatoToIndagato(phaseIdx, irIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph.indagatiReati[irIdx].reati) ph.indagatiReati[irIdx].reati = [];
  ph.indagatiReati[irIdx].reati.push('');
  renderPhasesSection();
}

async function addReatoToIndagatoFromInput(phaseIdx, irIdx) {
  const input = document.getElementById(`phaseNewReato_${phaseIdx}_${irIdx}`);
  const val = input ? input.value.trim() : '';
  if (!val) return;
  const ph = state.procPhases[phaseIdx];
  if (!ph.indagatiReati[irIdx].reati) ph.indagatiReati[irIdx].reati = [];
  if (!ph.indagatiReati[irIdx].reatiNodeIds) ph.indagatiReati[irIdx].reatiNodeIds = [];
  const articles = await _loadCPArticles();
  const match = articles.find(a => a.label === val);
  ph.indagatiReati[irIdx].reati.push(val);
  ph.indagatiReati[irIdx].reatiNodeIds.push(match ? match.id : null);
  renderPhasesSection();
  autoCalcTermineIndagini(phaseIdx);
}

function removeIndagatoReato(phaseIdx, irIdx, rIdx) {
  const ph = state.procPhases[phaseIdx];
  ph.indagatiReati[irIdx].reati.splice(rIdx, 1);
  if (ph.indagatiReati[irIdx].reatiNodeIds) {
    ph.indagatiReati[irIdx].reatiNodeIds.splice(rIdx, 1);
  }
  renderPhasesSection();
  autoCalcTermineIndagini(phaseIdx);
}

async function autoCalcTermineIndagini(phaseIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph || ph.tipo !== 'fase_procura') return;
  const dataIscr = ph.dataIscrizione;
  const inp = document.querySelector(`[data-testid="input-termine-indagini-${phaseIdx}"]`);
  const badge = document.getElementById(`termineIndaginiBadge_${phaseIdx}`);

  const allNodeIds = [];
  (ph.indagatiReati || []).forEach(ir => {
    (ir.reatiNodeIds || []).forEach(nid => { if (nid) allNodeIds.push(nid); });
  });

  if (!dataIscr || allNodeIds.length === 0) {
    if (badge) badge.textContent = '';
    return;
  }

  let maxMesi = 6;
  for (const nid of allNodeIds) {
    try {
      const meta = await NormDB.getMetadatiPenali(nid);
      const termini = NormDB.calcolaTerminiIndagini(meta);
      if (termini && termini.iniziale > maxMesi) maxMesi = termini.iniziale;
    } catch(e) {}
  }

  const d = new Date(dataIscr);
  d.setMonth(d.getMonth() + maxMesi);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  ph.termineIndagini = `${yyyy}-${mm}-${dd}`;

  if (inp) inp.value = ph.termineIndagini;
  if (badge) badge.textContent = `(${maxMesi} ${t('normeMesi')})`;
}

let _cachedCPArticles = null;
let _cachedCPArticlesLang = null;
async function _loadCPArticles() {
  if (_cachedCPArticles && _cachedCPArticlesLang === currentLang) return _cachedCPArticles;
  try {
    const allNodi = await NormDB.getAllNodi();
    const cpNode = allNodi.find(n => n.tipo_nodo === 'codice' && (n.rubrica || '').toLowerCase().includes('penale') && !(n.rubrica || '').toLowerCase().includes('procedura'));
    if (!cpNode) { _cachedCPArticles = []; _cachedCPArticlesLang = currentLang; return []; }
    const cpDescendants = new Set();
    const collectDesc = (parentId) => {
      allNodi.filter(n => n.id_padre === parentId).forEach(n => { cpDescendants.add(n.id); collectDesc(n.id); });
    };
    cpDescendants.add(cpNode.id);
    collectDesc(cpNode.id);
    _cachedCPArticles = allNodi.filter(n => n.tipo_nodo === 'articolo' && cpDescendants.has(n.id_padre)).map(n => {
      const testo = currentLang === 'en' ? (n.testo_en || n.testo_it || '') : (n.testo_it || '');
      const desc = testo.split('\n')[0].split('.')[0] || n.rubrica || '';
      const label = 'art. ' + (n.numero || '') + ' c.p.' + (desc ? ' - ' + desc : '');
      return { id: n.id, numero: n.numero || '', rubrica: n.rubrica || '', desc, label };
    });
    _cachedCPArticles.sort((a, b) => (a.numero || '').localeCompare(b.numero || '', undefined, {numeric: true}));
    _cachedCPArticlesLang = currentLang;
  } catch(e) { _cachedCPArticles = []; _cachedCPArticlesLang = currentLang; }
  return _cachedCPArticles;
}

function syncIndagatoReato(phaseIdx, irIdx, rIdx, val) {
  const ph = state.procPhases[phaseIdx];
  ph.indagatiReati[irIdx].reati[rIdx] = val;
  if (!ph.indagatiReati[irIdx].reatiNodeIds) ph.indagatiReati[irIdx].reatiNodeIds = [];
  if (!val || val.length < 2) {
    ph.indagatiReati[irIdx].reatiNodeIds[rIdx] = null;
    autoCalcTermineIndagini(phaseIdx);
  }
  _showReatoAutocomplete(phaseIdx, irIdx, rIdx, val);
}

async function _showReatoAutocomplete(phaseIdx, irIdx, rIdx, query) {
  const inputId = `input-reato-${phaseIdx}-${irIdx}-${rIdx}`;
  const input = document.querySelector(`[data-testid="${inputId}"]`);
  if (!input) return;
  let dropdown = input.parentElement.querySelector('.reato-autocomplete');
  if (!query || query.length < 2) {
    if (dropdown) dropdown.remove();
    return;
  }
  const articles = await _loadCPArticles();
  const q = query.toLowerCase();
  const matches = articles.filter(a => a.label.toLowerCase().includes(q) || a.numero.includes(q) || a.rubrica.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)).slice(0, 12);
  if (matches.length === 0) {
    if (dropdown) dropdown.remove();
    return;
  }
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'reato-autocomplete';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(dropdown);
  }
  dropdown.innerHTML = matches.map(m => `<div class="reato-ac-item" data-label="${esc(m.label)}" data-nodeid="${m.id}">${esc(m.label)}</div>`).join('');
  dropdown.onclick = (e) => {
    const item = e.target.closest('.reato-ac-item');
    if (!item) return;
    const val = item.dataset.label;
    const nodeId = item.dataset.nodeid;
    input.value = val;
    const ph = state.procPhases[phaseIdx];
    ph.indagatiReati[irIdx].reati[rIdx] = val;
    if (nodeId) {
      if (!ph.indagatiReati[irIdx].reatiNodeIds) ph.indagatiReati[irIdx].reatiNodeIds = [];
      ph.indagatiReati[irIdx].reatiNodeIds[rIdx] = parseInt(nodeId);
    }
    dropdown.remove();
    autoCalcTermineIndagini(phaseIdx);
  };
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.reato-autocomplete') && !e.target.matches('[data-testid^="input-reato-"]') && !e.target.matches('[data-testid^="input-ipotesi-reato-"]')) {
    document.querySelectorAll('.reato-autocomplete').forEach(d => d.remove());
  }
});

async function loadProceedingActs() {
  const procId = state.editProcId;
  if (!procId) { state.availableActs = []; return; }
  try {
    const dossiers = await DB.getDossiers(procId);
    const allActs = [];
    for (const d of dossiers) {
      const acts = await DB.getActs(d.id);
      for (const a of acts) {
        allActs.push({ id: a.id, title: a.title || `Atto #${a.id}`, dossierName: d.title || d.name || '' });
      }
    }
    state.availableActs = allActs;
  } catch (e) {
    state.availableActs = [];
  }
}

function renderLinkedActsBadges(linkedActIds, phaseIdx, evIdx, eventType) {
  if (!linkedActIds || linkedActIds.length === 0) return '';
  const acts = state.availableActs || [];
  return linkedActIds.map((actId, badgeIdx) => {
    const act = acts.find(a => a.id === actId);
    const label = act ? act.title : `Atto #${actId}`;
    const dossierHint = act && act.dossierName ? ` (${esc(act.dossierName)})` : '';
    return `<span class="badge badge-outline" style="margin:2px;display:inline-flex;align-items:center;gap:4px">${esc(label)}${dossierHint}<button type="button" class="btn-badge-remove" onclick="removeLinkedAct('${eventType}', ${phaseIdx}, ${evIdx}, ${badgeIdx})" title="${t('removePmEvent')}">&times;</button></span>`;
  }).join('');
}

function removeLinkedAct(eventType, phaseIdx, evIdx, badgeIdx) {
  const ph = state.procPhases[phaseIdx];
  const evArr = eventType === 'pm' ? ph.pmEvents : ph.phaseEvents;
  if (evArr && evArr[evIdx] && evArr[evIdx].linkedActIds) {
    evArr[evIdx].linkedActIds.splice(badgeIdx, 1);
    renderPhasesSection();
  }
}

function setupLinkedActAutocomplete(inputId, listId, phaseIdx, evIdx, eventType) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list || input._actAutoSetup) return;
  input._actAutoSetup = true;
  let debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const query = this.value.trim().toLowerCase();
    if (query.length < 1) { list.innerHTML = ''; list.classList.remove('visible'); return; }
    debounceTimer = setTimeout(() => {
      const acts = state.availableActs || [];
      const ph = state.procPhases[phaseIdx];
      const evArr = eventType === 'pm' ? ph.pmEvents : ph.phaseEvents;
      const existing = (evArr && evArr[evIdx]) ? (evArr[evIdx].linkedActIds || []) : [];
      const filtered = acts.filter(a => {
        if (existing.includes(a.id)) return false;
        const searchStr = (a.title + ' ' + a.dossierName).toLowerCase();
        return searchStr.includes(query);
      }).slice(0, 10);
      if (filtered.length === 0) { list.innerHTML = ''; list.classList.remove('visible'); return; }
      list.innerHTML = filtered.map(a => {
        const dossierHint = a.dossierName ? ` <span style="opacity:0.6;font-size:11px">(${esc(a.dossierName)})</span>` : '';
        return `<div class="autocomplete-item" data-id="${a.id}">${esc(a.title)}${dossierHint}</div>`;
      }).join('');
      list.classList.add('visible');
      list.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', function(e) {
          e.preventDefault();
          const actId = parseInt(this.dataset.id);
          const ph2 = state.procPhases[phaseIdx];
          const evArr2 = eventType === 'pm' ? ph2.pmEvents : ph2.phaseEvents;
          if (evArr2 && evArr2[evIdx]) {
            if (!evArr2[evIdx].linkedActIds) evArr2[evIdx].linkedActIds = [];
            if (!evArr2[evIdx].linkedActIds.includes(actId)) {
              evArr2[evIdx].linkedActIds.push(actId);
            }
          }
          input.value = '';
          list.innerHTML = ''; list.classList.remove('visible');
          renderPhasesSection();
        });
      });
    }, 150);
  });
  input.addEventListener('blur', function() {
    setTimeout(() => { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
  });
}

function addPmEvent(phaseIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph.pmEvents) ph.pmEvents = [];
  ph.pmEvents.push({ tipo: '', sottoTipo: '', date: '', notes: '', notesEn: '', linkedActIds: [] });
  renderPhasesSection();
}

function removePmEvent(phaseIdx, evIdx) {
  const ph = state.procPhases[phaseIdx];
  ph.pmEvents.splice(evIdx, 1);
  renderPhasesSection();
}

function syncPmEventField(phaseIdx, evIdx, field, val) {
  const ph = state.procPhases[phaseIdx];
  ph.pmEvents[evIdx][field] = val;
}

function onPmEventTipoChange(phaseIdx, evIdx, val) {
  const ph = state.procPhases[phaseIdx];
  ph.pmEvents[evIdx].tipo = val;
  ph.pmEvents[evIdx].sottoTipo = '';
  renderPhasesSection();
}

function onPmEventSottoTipoChange(phaseIdx, evIdx, val) {
  const ph = state.procPhases[phaseIdx];
  ph.pmEvents[evIdx].sottoTipo = val;

  const effect = PM_DECISION_EFFECTS[val];
  if (effect && effect.nextPhase) {
    const existingTypes = (state.procPhases || []).map(p => p.tipo);
    if (!existingTypes.includes(effect.nextPhase)) {
      state.procPhases.push(createNewPhase(effect.nextPhase));
      state.activePhaseIdx = state.procPhases.length - 1;
      renderPhasesSection();
      return;
    }
  }
  renderPhasesSection();
}

function setupProcuraAutocompletes(phaseIdx) {
  const ph = state.procPhases[phaseIdx];
  if (!ph || ph.tipo !== 'fase_procura') return;

  (ph.personeLese || []).forEach((pl, plIdx) => {
    const inputId = `phasePL_${phaseIdx}_${plIdx}`;
    const listId = `phasePLSugg_${phaseIdx}_${plIdx}`;
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;

    let debounceTimer;
    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      const query = this.value.trim().toLowerCase();
      if (query.length < 2) { list.innerHTML = ''; list.classList.remove('visible'); return; }
      debounceTimer = setTimeout(async () => {
        const subjects = await _ensureCachedSubjects();
        const filtered = subjects.filter(s => {
          const full = ((s.lastName || '') + ' ' + (s.firstName || '')).toLowerCase();
          return full.includes(query);
        }).slice(0, 10);
        if (filtered.length === 0) { list.innerHTML = ''; list.classList.remove('visible'); return; }
        list.innerHTML = filtered.map(s => `<div class="autocomplete-item" data-id="${s.id}"><strong>${esc(s.lastName)} ${esc(s.firstName)}</strong></div>`).join('');
        list.classList.add('visible');
        list.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            const subj = filtered.find(s => s.id === parseInt(this.dataset.id));
            if (subj) {
              input.value = `${subj.lastName} ${subj.firstName}`;
              ph.personeLese[plIdx].subjectId = subj.id;
              ph.personeLese[plIdx].name = input.value;
            }
            list.innerHTML = ''; list.classList.remove('visible');
          });
        });
      }, 200);
    });
    input.addEventListener('blur', function() {
      setTimeout(() => { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
    });
    input.addEventListener('change', function() {
      ph.personeLese[plIdx].name = this.value;
    });
  });

  (ph.indagatiReati || []).forEach((ir, irIdx) => {
    const irInput = document.getElementById(`phaseIR_${phaseIdx}_${irIdx}`);
    const irList = document.getElementById(`phaseIRSugg_${phaseIdx}_${irIdx}`);
    if (!irInput || !irList) return;
    let irDebounce;
    irInput.addEventListener('input', function() {
      clearTimeout(irDebounce);
      ph.indagatiReati[irIdx].subjectId = null;
      const q = this.value.trim().toLowerCase();
      if (q.length < 1) { irList.innerHTML = ''; irList.classList.remove('visible'); return; }
      irDebounce = setTimeout(async () => {
        const subjects = await _ensureCachedSubjects();
        const filtered = subjects.filter(s => {
          const full = ((s.firstName || '') + ' ' + (s.lastName || '') + ' ' + (s.lastName || '') + ' ' + (s.firstName || '')).toLowerCase();
          return full.includes(q);
        }).slice(0, 10);
        if (filtered.length === 0) {
          irList.innerHTML = '<div class="autocomplete-item no-result">' + (t('noResults') || 'Nessun risultato') + '</div>';
          irList.classList.add('visible');
          return;
        }
        irList.innerHTML = filtered.map(s => `<div class="autocomplete-item" data-id="${s.id}"><strong>${esc(s.lastName)} ${esc(s.firstName)}</strong></div>`).join('');
        irList.classList.add('visible');
        irList.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            const subj = filtered.find(s => s.id === parseInt(this.dataset.id));
            if (subj) {
              irInput.value = `${subj.lastName} ${subj.firstName}`;
              ph.indagatiReati[irIdx].subjectId = subj.id;
              irList.innerHTML = ''; irList.classList.remove('visible');
              if (!state.indagati) state.indagati = [];
              if (!state.indagati.some(i => i.subjectId === subj.id)) {
                state.indagati.push({ subjectId: subj.id, label: `${subj.lastName} ${subj.firstName}`, procRole: 'indagato' });
                renderIndagatiList();
              }
            }
          });
        });
      }, 200);
    });
    irInput.addEventListener('blur', function() {
      setTimeout(() => { irList.innerHTML = ''; irList.classList.remove('visible'); }, 250);
    });
  });
}

function _geoAbbrev(tipo, nome) {
  const abbrevMap = {
    procura: 'P.d.R.',
    tribunale: 'Trib.',
    corteAppello: 'C.d.A.',
    giudicePace: 'G.d.P.',
    tar: 'TAR',
    corteConti: 'C.d.C.',
    unep: 'UNEP'
  };
  return (abbrevMap[tipo] || tipo) + ' ' + nome;
}

function _renderGeoInfoBadgesReadonly(geoData) {
  if (!geoData) return '';
  const badges = [];
  if (geoData.procura) badges.push({ label: _geoAbbrev('procura', geoData.procura), full: t('geoFullProcura') + ' ' + geoData.procura, tipo: 'procura' });
  if (geoData.tribunale) badges.push({ label: _geoAbbrev('tribunale', geoData.tribunale), full: t('geoFullTribunale') + ' ' + geoData.tribunale, tipo: 'tribunale' });
  if (geoData.corteAppello) badges.push({ label: _geoAbbrev('corteAppello', geoData.corteAppello), full: t('geoFullCorteAppello') + ' ' + geoData.corteAppello, tipo: 'corteAppello' });
  if (geoData.giudicePace) badges.push({ label: _geoAbbrev('giudicePace', geoData.giudicePace), full: geoData.giudicePace, tipo: 'giudicePace' });
  if (geoData.tar) badges.push({ label: _geoAbbrev('tar', geoData.tar), full: 'TAR ' + geoData.tar, tipo: 'tar' });
  if (geoData.corteConti) badges.push({ label: _geoAbbrev('corteConti', geoData.corteConti), full: t('geoFullCorteConti') + ' ' + geoData.corteConti, tipo: 'corteConti' });
  return badges.map(b => `<span class="geo-badge geo-badge-${b.tipo}" title="${esc(b.full)}">${esc(b.label)}</span>`).join('');
}

function _escJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function _renderGeoInfoBadges(geoData) {
  if (!geoData) return '';
  const badges = [];
  if (geoData.procura) badges.push({ label: _geoAbbrev('procura', geoData.procura), full: t('geoFullProcura') + ' ' + geoData.procura, tipo: 'procura' });
  if (geoData.tribunale) badges.push({ label: _geoAbbrev('tribunale', geoData.tribunale), full: t('geoFullTribunale') + ' ' + geoData.tribunale, tipo: 'tribunale' });
  if (geoData.corteAppello) badges.push({ label: _geoAbbrev('corteAppello', geoData.corteAppello), full: t('geoFullCorteAppello') + ' ' + geoData.corteAppello, tipo: 'corteAppello' });
  if (geoData.giudicePace) badges.push({ label: _geoAbbrev('giudicePace', geoData.giudicePace), full: geoData.giudicePace, tipo: 'giudicePace' });
  if (geoData.tar) badges.push({ label: _geoAbbrev('tar', geoData.tar), full: 'TAR ' + geoData.tar, tipo: 'tar' });
  if (geoData.corteConti) badges.push({ label: _geoAbbrev('corteConti', geoData.corteConti), full: t('geoFullCorteConti') + ' ' + geoData.corteConti, tipo: 'corteConti' });
  return badges.map(b => `<span class="geo-badge geo-badge-${b.tipo}" title="${esc(b.full)} — ${t('geoClickToUse')}" onclick="event.stopPropagation(); _copyGeoToUfficio(this, '${_escJs(b.full)}')" data-testid="geo-badge-${b.tipo}">${esc(b.label)}</span>`).join('');
}

function _copyGeoToUfficio(badgeEl, fullName) {
  const panel = badgeEl.closest('.geo-info-panel');
  if (!panel) return;
  const idx = panel.id.replace('phaseGeoInfo_', '');
  const input = document.getElementById('phaseOffice_' + idx);
  if (input) {
    input.value = fullName;
    syncPhaseField(parseInt(idx), 'ufficio', fullName);
  }
}

function setupUfficioAutocomplete(idx) {
  const input = document.getElementById('phaseOffice_' + idx);
  const list = document.getElementById('phaseOfficeSuggestions_' + idx);
  if (!input || !list) return;
  if (input._autocompleteSetup) return;
  input._autocompleteSetup = true;
  let debounceTimer = null;
  let currentResults = [];
  let selectedIdx = -1;

  function highlightItem() {
    list.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('active', i === selectedIdx);
    });
  }

  function selectComune(c) {
    const trib = c.circondarioTribunale || '';
    const procura = trib;
    const prov = c.provincia || '';
    const displayValue = procura ? (_geoAbbrev('procura', prov)) : '';
    input.value = displayValue;
    syncPhaseField(idx, 'ufficio', displayValue);

    const geoData = {
      comune: c.comune,
      provincia: c.provincia,
      procura: trib,
      tribunale: trib,
      corteAppello: c.distrettoCorteAppello || '',
      giudicePace: c.giudiceDiPace || '',
      tar: c.tarSede || '',
      corteConti: c.corteDeiContiSede || ''
    };
    syncPhaseField(idx, 'geoData', geoData);

    list.innerHTML = '';
    list.classList.remove('visible');
    currentResults = [];
    selectedIdx = -1;

    if (state.procPhases[idx]?.tipo === 'fase_procura') {
      refreshVigilanceChain();
    }
  }

  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      list.innerHTML = '';
      list.classList.remove('visible');
      currentResults = [];
      selectedIdx = -1;
      return;
    }
    debounceTimer = setTimeout(async function() {
      try {
        const results = await GeoDB.searchComuni(q);
        currentResults = results.slice(0, 15);
        selectedIdx = -1;
        if (currentResults.length === 0) {
          list.innerHTML = '<div class="autocomplete-item no-result">' + (t('noResults') || 'Nessun risultato') + '</div>';
          list.classList.add('visible');
          return;
        }
        list.innerHTML = currentResults.map(function(c, i) {
          const prov = c.provincia ? ' (' + c.provincia + ')' : '';
          const trib = c.circondarioTribunale ? ' \u2014 ' + _geoAbbrev('procura', c.circondarioTribunale) : '';
          return '<div class="autocomplete-item" data-idx="' + i + '">' + esc(c.comune) + prov + '<span class="autocomplete-hint">' + esc(trib) + '</span></div>';
        }).join('');
        list.classList.add('visible');
      } catch (e) { console.warn('GeoDB search error:', e); }
    }, 150);
  });

  list.addEventListener('mousedown', function(e) {
    e.preventDefault();
    const item = e.target.closest('.autocomplete-item');
    if (!item || item.classList.contains('no-result')) return;
    const i = parseInt(item.dataset.idx);
    if (currentResults[i]) selectComune(currentResults[i]);
  });

  input.addEventListener('keydown', function(e) {
    if (!list.classList.contains('visible') || currentResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, currentResults.length - 1); highlightItem(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); highlightItem(); }
    else if (e.key === 'Enter' && selectedIdx >= 0) { e.preventDefault(); selectComune(currentResults[selectedIdx]); }
    else if (e.key === 'Escape') { list.innerHTML = ''; list.classList.remove('visible'); }
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
  });
}

function syncPhaseField(idx, field, value) {
  if (state.procPhases && state.procPhases[idx]) {
    state.procPhases[idx][field] = value;
  }
}

function renderProcEventsSection() {
  const container = document.getElementById('procEventsContainer');
  if (!container) return;
  const events = state.procEvents || [];
  if (events.length === 0) {
    container.innerHTML = `<p class="hint">${t('noEvents')}</p>`;
    return;
  }
  container.innerHTML = events.map((ev, evIdx) => `
    <div class="event-row" data-event-idx="${evIdx}">
      <div class="form-grid form-grid-4">
        <div class="form-group">
          ${evIdx === 0 ? `<label>${t('eventDate')}</label>` : ''}
          <input type="date" id="procEvDate_${evIdx}" value="${ev.date || ''}" oninput="syncProcEventField(${evIdx}, 'date', this.value)" data-testid="input-proc-event-date-${evIdx}">
        </div>
        <div class="form-group">
          ${evIdx === 0 ? `<label>${t('eventTitle')}</label>` : ''}
          <input id="procEvTitle_${evIdx}" value="${esc(ev.title || '')}" oninput="syncProcEventField(${evIdx}, 'title', this.value)" data-testid="input-proc-event-title-${evIdx}">
        </div>
        <div class="form-group">
          ${evIdx === 0 ? `<label>${t('eventMagistrate')}</label>` : ''}
          <input id="procEvMag_${evIdx}" value="${esc(ev.magistrate || '')}" oninput="syncProcEventField(${evIdx}, 'magistrate', this.value)" data-testid="input-proc-event-magistrate-${evIdx}">
        </div>
        <div class="form-group" style="display:flex;gap:4px;align-items:end">
          <div style="flex:1">
            ${evIdx === 0 ? `<label>${t('eventDescription')}</label>` : ''}
            <input id="procEvDesc_${evIdx}" value="${esc(ev.description || '')}" oninput="syncProcEventField(${evIdx}, 'description', this.value)" data-testid="input-proc-event-desc-${evIdx}">
          </div>
          <button type="button" class="btn btn-xs btn-danger" onclick="removeProcEvent(${evIdx})" title="${t('removeEvent')}" data-testid="button-remove-proc-event-${evIdx}">&#10005;</button>
        </div>
      </div>
    </div>`).join('');
}

function syncProcEventField(evIdx, field, value) {
  if (state.procEvents && state.procEvents[evIdx]) {
    state.procEvents[evIdx][field] = value;
  }
}

function addProcEvent() {
  if (!state.procEvents) state.procEvents = [];
  state.procEvents.push({ date: '', title: '', magistrate: '', description: '' });
  renderProcEventsSection();
}

function removeProcEvent(evIdx) {
  if (!state.procEvents) return;
  state.procEvents.splice(evIdx, 1);
  renderProcEventsSection();
}

function _derivePenaleStatus(phases) {
  if (!phases || phases.length === 0) return '';
  const lastPhase = phases[phases.length - 1];
  const tipo = lastPhase.tipo;
  const statusMap = {
    'fase_procura': 'pen_indagini_preliminari',
    'fase_gip_fase': 'pen_fase_gip',
    'fase_gup': 'pen_fase_gup',
    'fase_dibattimento_fase': 'pen_dibattimento',
    'fase_appello_penale': 'pen_appello',
    'fase_cassazione_penale': 'pen_cassazione',
    'fase_esecuzione_penale': 'pen_esecuzione_penale'
  };
  return statusMap[tipo] || '';
}

function createNewPhase(tipo) {
  const base = {
    id: 'phase_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    tipo: tipo || '',
    ufficio: '', numeroRegistro: '', anno: '',
    magistratoPrincipale: '', altriMagistrati: '',
    dataIscrizione: '', modello: '',
    events: [],
    phaseEvents: []
  };
  if (tipo === 'fase_procura') {
    base.pmEvents = [];
    base.personeLese = [];
    base.indagatiReati = [];
    base.termineIndagini = '';
  }
  return base;
}

function addPhase(tipo) {
  if (!state.procPhases) state.procPhases = [];
  state.procPhases.push(createNewPhase(tipo || ''));
  state.activePhaseIdx = state.procPhases.length - 1;
  renderPhasesSection();
}

function removePhase(idx) {
  state.procPhases.splice(idx, 1);
  if (state.activePhaseIdx >= state.procPhases.length) {
    state.activePhaseIdx = state.procPhases.length - 1;
  }
  renderPhasesSection();
  updateAutoTitle();
}

function togglePhase(idx) {
  state.activePhaseIdx = (state.activePhaseIdx === idx) ? -1 : idx;
  renderPhasesSection();
}

async function setupMagistrateAutocomplete(phaseIdx) {
  const input = document.getElementById('phaseMag_' + phaseIdx);
  const list = document.getElementById('phaseMagSuggestions_' + phaseIdx);
  if (!input || !list) return;

  await _loadAllLists();
  const magInqSub = _allSubcategories.find(s => (s.labelIt || '').toLowerCase() === 'magistrati inquirenti' || (s.labelEn || '').toLowerCase() === 'investigating magistrates');
  const magInqSubId = magInqSub ? magInqSub.id : null;

  let debounce = null;
  input.addEventListener('input', function() {
    clearTimeout(debounce);
    const q = this.value.trim().toLowerCase();
    if (q.length < 2) { list.innerHTML = ''; list.classList.remove('visible'); return; }
    debounce = setTimeout(async () => {
      const allSubjects = await DB.getSubjects();
      const filtered = allSubjects.filter(s => {
        const nameMatch = (`${s.lastName} ${s.firstName}`).toLowerCase().includes(q) || (`${s.firstName} ${s.lastName}`).toLowerCase().includes(q);
        if (!nameMatch) return false;
        if (!magInqSubId) return true;
        if (!s.roles || s.roles.length === 0) return false;
        return s.roles.some(r => r.subcategoryId === magInqSubId);
      }).slice(0, 10);
      if (filtered.length === 0) { list.innerHTML = ''; list.classList.remove('visible'); return; }
      list.innerHTML = filtered.map(s => {
        let roleLabel = '';
        if (s.roles && s.roles.length > 0) {
          const magRole = s.roles.find(r => r.subcategoryId === magInqSubId) || s.roles[0];
          if (magRole.roleId) { const rl = _allRoles.find(x => x.id === magRole.roleId); if (rl) roleLabel = _labelFor(rl); }
          else if (magRole.subcategoryId) { const sc = _allSubcategories.find(x => x.id === magRole.subcategoryId); if (sc) roleLabel = _labelFor(sc); }
        }
        return `<div class="autocomplete-item" data-id="${s.id}">
          <strong>${esc(s.lastName)} ${esc(s.firstName)}</strong>${roleLabel ? ` <span style="color:var(--text-muted);font-size:12px">— ${esc(roleLabel)}</span>` : ''}
        </div>`;
      }).join('');
      list.classList.add('visible');

      list.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', function(e) {
          e.preventDefault();
          const subj = filtered.find(s => s.id === parseInt(this.dataset.id));
          if (subj) {
            const magParts = [subj.salutation, subj.lastName, subj.firstName].filter(Boolean);
            input.value = magParts.join(' ');
            syncPhaseField(phaseIdx, 'magistratoPrincipale', input.value);
            syncPhaseField(phaseIdx, 'magistratoSubjectId', subj.id);
          }
          list.innerHTML = '';
          list.classList.remove('visible');
        });
      });
    }, 200);
  });

  input.addEventListener('blur', function() {
    setTimeout(() => { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
  });
}

function updateFaseOptions(init) {
  const faseSelect = document.getElementById('fProcFase');
  if (!faseSelect) return;
  const firstPhase = state.procPhases && state.procPhases[0];
  const tipo = firstPhase ? firstPhase.tipo : '';

  const PHASE_FASE_MAP = {
    'fase_procura': ['fase_indagini', 'fase_archiviazione', 'fase_rinvio_giudizio'],
    'fase_gip_fase': ['fase_gip', 'fase_udienza_validazione'],
    'fase_gup': ['fase_udienza_preliminare', 'fase_rinvio_giudizio_gup'],
    'fase_dibattimento_fase': ['fase_dibattimento', 'fase_sentenza'],
    'fase_appello_penale': ['fase_appello'],
    'fase_cassazione_penale': ['fase_ricorso'],
    'fase_appello_fase': ['fase_appello'],
    'fase_cassazione_fase': ['fase_ricorso']
  };

  const fasi = PHASE_FASE_MAP[tipo] || [];
  const currentVal = init ? (faseSelect.dataset.initVal || '') : '';

  faseSelect.innerHTML = `<option value="">-</option>` +
    fasi.map(f => `<option value="${f}" ${currentVal === f ? 'selected' : ''}>${t(f)}</option>`).join('');
}

function updateAutoTitle() {
  const firstPhase = state.procPhases && state.procPhases[0];
  const regNumber = firstPhase ? firstPhase.numeroRegistro : '';
  const year = firstPhase ? firstPhase.anno : '';
  const ufficio = firstPhase ? (firstPhase.ufficio || '') : '';
  const titleText = document.getElementById('procAutoTitleText');
  const titleHidden = document.getElementById('fProcTitle');
  const headerTitle = document.getElementById('procAutoTitleBar');
  const procType = document.getElementById('fProcType')?.value || '';

  if (regNumber && year) {
    const yy = shortYear(year);
    const prefix = ufficio ? _shortenOffice(ufficio) : '';
    const modello = (procType === 'penale' && firstPhase?.modello) ? MODELLO_SHORT[firstPhase.modello] || '' : '';
    const regPart = `RGNR n.${regNumber}/${yy}`;
    const inner = modello ? `${regPart} - ${modello}` : regPart;
    const autoTitle = prefix ? `${prefix} (${inner})` : `(${inner})`;
    titleText.textContent = autoTitle;
    titleHidden.value = autoTitle;
    headerTitle.classList.add('has-title');
  } else {
    titleText.textContent = t('newProceeding');
    titleHidden.value = '';
    headerTitle.classList.remove('has-title');
  }
}

function getTypeTabs(type) {
  if (type === 'penale') return [
    { id: 'origineAtto', label: t('tabOrigineAtto') },
    { id: 'indagati', label: t('tabIndagati') }
  ];
  if (type === 'civile') return [
    { id: 'parti', label: t('tabParti') },
    { id: 'istruttoria', label: t('tabIstruttoria') },
    { id: 'decisione', label: t('tabDecisione') }
  ];
  if (type === 'amministrativo') return [
    { id: 'ricorso', label: t('tabRicorso') },
    { id: 'cautelare', label: t('tabCautelare') },
    { id: 'appelloAmm', label: t('tabAppelloAmm') }
  ];
  if (type === 'esecuzione') return [
    { id: 'pignoramento', label: t('tabPignoramento') },
    { id: 'soggetti', label: t('tabSoggetti') },
    { id: 'vendita', label: t('tabVendita') },
    { id: 'perizia', label: t('tabPerizia') }
  ];
  return [];
}

function buildProceedingFormTabs(type) {
  const typeTabs = getTypeTabs(type);
  return [
    { id: 'luogo', label: t('tabLuogo') },
    ...typeTabs
  ];
}

function updateSpecificTab() {
  const type = document.getElementById('fProcType').value;
  const sd = {};
  const formBlock = document.getElementById('procFormBody');
  if (!formBlock) return;

  formBlock.querySelectorAll('.accordion-section.type-specific, .form-section-group.type-specific').forEach(el => el.remove());

  const existingIndagati = document.getElementById('acc-indagati');
  if (existingIndagati) existingIndagati.remove();
  const existingOrigine = document.getElementById('acc-origineAtto');
  if (existingOrigine) existingOrigine.remove();
  const existingDiritti = document.getElementById('acc-dirittiProc');
  if (existingDiritti) existingDiritti.remove();

  const luogoAcc = document.getElementById('acc-luogo');
  const indagatiAnchor = document.getElementById('acc-indagati-anchor');
  if (luogoAcc) {
    const specResult = renderSpecificFormTabContents(type, sd, []);
    if (type === 'penale' && specResult && typeof specResult === 'object') {
      const insertTarget = indagatiAnchor || luogoAcc;
      insertTarget.insertAdjacentHTML('afterend', specResult.indagati);
      luogoAcc.insertAdjacentHTML('afterend', specResult.origineAtto + (specResult.dirittiProcessuali || ''));
      formBlock.querySelectorAll('.accordion-section:not(#acc-luogo):not(#acc-authority)').forEach(el => {
        el.classList.add('type-specific');
      });
    } else {
      const typeHtml = typeof specResult === 'string' ? specResult : '';
      luogoAcc.insertAdjacentHTML('beforebegin', typeHtml);
      formBlock.querySelectorAll('.accordion-section:not(#acc-luogo):not(#acc-authority)').forEach(el => {
        el.classList.add('type-specific');
      });
    }
  }

  state.indagati = [];
  if (type === 'penale') {
    renderIndagatiList();
    setupIndagatoAutocomplete();
    setupCittaAutocomplete('fSpecCittaDeposito', 'fSpecCittaDepositoSuggestions', {}, {
      formatValue: function(c) { return c.comune + (c.provincia ? ' (' + c.provincia + ')' : ''); }
    });
    onOrigineProcChange();
  }
}

function renderSpecificFormTabContents(type, sd, originFiles) {
  originFiles = originFiles || [];
  const originFilesIt = originFiles.filter(f => f.lang === 'it');
  const originFilesEn = originFiles.filter(f => f.lang === 'en');
  if (type === 'penale') {
    const tipoAttoOpts = ['querela', 'denuncia', 'informativa'];
    const dp = sd.dirittiProcessuali || {};
    return {
      dirittiProcessuali: `
      <div id="acc-dirittiProc" class="form-section-group">
        <div class="phase-section-label" style="margin-bottom:8px">${t('tabDirittiProcessuali')}</div>
        <div class="form-grid form-grid-3">
          <div class="form-group">
            <label><input type="checkbox" id="fDP_avviso408" ${dp.richiestaAvvisoArchiviazione ? 'checked' : ''} onchange="onDP408Change()"> ${t('dp_avviso408')}</label>
          </div>
          <div class="form-group" id="fDP_avviso408_date_wrap" style="${dp.richiestaAvvisoArchiviazione ? '' : 'display:none'}">
            <label>${t('dp_dataRichiesta')}</label>
            <input type="date" id="fDP_avviso408_date" value="${dp.dataRichiestaAvviso || ''}">
          </div>
          <div class="form-group" id="fDP_avviso408_hint" style="${dp.richiestaAvvisoArchiviazione ? '' : 'display:none'}">
            <span class="hint" style="font-size:11px">${t('dp_avviso408_hint')}</span>
          </div>
        </div>
        <div class="form-grid form-grid-3" style="margin-top:8px">
          <div class="form-group">
            <label><input type="checkbox" id="fDP_415bis" ${dp.avviso415bisNotificato ? 'checked' : ''} onchange="onDP415bisChange()"> ${t('dp_415bis')}</label>
          </div>
          <div class="form-group" id="fDP_415bis_date_wrap" style="${dp.avviso415bisNotificato ? '' : 'display:none'}">
            <label>${t('dp_data415bis')}</label>
            <input type="date" id="fDP_415bis_date" value="${dp.data415bis || ''}">
          </div>
          <div class="form-group" id="fDP_415bis_hint" style="${dp.avviso415bisNotificato ? '' : 'display:none'}">
            <span class="hint" style="font-size:11px">${t('dp_415bis_hint')}</span>
          </div>
        </div>
        <div class="form-grid form-grid-3" style="margin-top:8px">
          <div class="form-group">
            <label><input type="checkbox" id="fDP_querela" ${dp.reatoAQuerela ? 'checked' : ''} onchange="onDPQuerelaChange()"> ${t('dp_reatoQuerela')}</label>
          </div>
          <div class="form-group" id="fDP_querela_presentata_wrap" style="${dp.reatoAQuerela ? '' : 'display:none'}">
            <label><input type="checkbox" id="fDP_querela_presentata" ${dp.querelaPresentata ? 'checked' : ''}> ${t('dp_querelaPresentata')}</label>
          </div>
          <div class="form-group" id="fDP_querela_date_wrap" style="${dp.reatoAQuerela ? '' : 'display:none'}">
            <label>${t('dp_dataQuerela')}</label>
            <input type="date" id="fDP_querela_date" value="${dp.dataQuerela || ''}">
          </div>
        </div>
        <div class="form-grid form-grid-3" style="margin-top:8px">
          <div class="form-group">
            <label><input type="checkbox" id="fDP_parteCivile" ${dp.costituzioneParteCivile ? 'checked' : ''} onchange="onDPParteCivileChange()"> ${t('dp_parteCivile')}</label>
          </div>
          <div class="form-group" id="fDP_parteCivile_fase_wrap" style="${dp.costituzioneParteCivile ? '' : 'display:none'}">
            <label>${t('dp_faseCostituzione')}</label>
            <input id="fDP_parteCivile_fase" value="${esc(dp.faseCostituzione || '')}">
          </div>
          <div class="form-group"></div>
        </div>
        <div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--border)">
          <div class="form-grid form-grid-3">
            <div class="form-group">
              <label><input type="checkbox" id="fDP_decretoNotificato" ${dp.decretoNotificato ? 'checked' : ''} onchange="onDPDecretoChange()"> ${t('dp_decretoNotificato')}</label>
            </div>
            <div class="form-group" id="fDP_decreto_date_wrap" style="${dp.decretoNotificato ? '' : 'display:none'}">
              <label>${t('dp_dataNotifica')}</label>
              <input type="date" id="fDP_decreto_date" value="${dp.dataNotificaDecreto || ''}">
            </div>
            <div class="form-group" id="fDP_decreto_termine_wrap" style="${dp.decretoNotificato ? '' : 'display:none'}">
              <label>${t('dp_termineOpposizione')}</label>
              <input type="date" id="fDP_decreto_termine" value="${dp.termineOpposizione || ''}">
            </div>
          </div>
          <div class="form-grid form-grid-3" id="fDP_opposizione_wrap" style="${dp.decretoNotificato ? 'margin-top:4px' : 'display:none'}">
            <div class="form-group">
              <label><input type="checkbox" id="fDP_opposizione" ${dp.opposizioneDecretoPenale ? 'checked' : ''} onchange="onDPOpposizioneChange()"> ${t('dp_opposizione')}</label>
            </div>
            <div class="form-group" id="fDP_opposizione_date_wrap" style="${dp.opposizioneDecretoPenale ? '' : 'display:none'}">
              <label>${t('dp_dataOpposizione')}</label>
              <input type="date" id="fDP_opposizione_date" value="${dp.dataOpposizione || ''}">
            </div>
            <div class="form-group" id="fDP_opposizione_hint" style="${dp.opposizioneDecretoPenale ? '' : 'display:none'}">
              <span class="hint" style="font-size:11px;color:var(--accent)">${t('dp_opposizione_hint')}</span>
            </div>
          </div>
        </div>
      </div>`,
      indagati: `
      <div id="acc-indagati" class="form-section-group" style="${sd.origineProc === 'ufficio' ? 'display:none' : ''}">
        <div class="form-section-header">
          <div class="phase-section-label">${t('tabIndagati')}</div>
          <span class="form-section-header-controls">
            <label class="acc-radio"><input type="radio" name="soggettiTipo" value="noti" ${(sd.soggettiTipo || 'noti') === 'noti' ? 'checked' : ''} onchange="onSoggettiTipoChange()"> ${t('soggettiNoti')}</label>
            <label class="acc-radio"><input type="radio" name="soggettiTipo" value="ignoti" ${sd.soggettiTipo === 'ignoti' ? 'checked' : ''} onchange="onSoggettiTipoChange()"> ${t('soggettiIgnoti')}</label>
          </span>
        </div>
        <div id="indagatiSearchRow" class="indagato-add-row indagato-header-search" style="${(sd.soggettiTipo || 'noti') === 'noti' ? '' : 'display:none'}">
          <div class="autocomplete-wrap" style="flex:1;position:relative">
            <input id="indagatoSearchInput" placeholder="${t('searchSubjectPlaceholder')}" autocomplete="off" data-testid="input-indagato-search">
            <div id="indagatoSearchSuggestions" class="autocomplete-list"></div>
          </div>
          <div id="indagatoRolePickerInline" style="display:none"></div>
          <button class="btn btn-xs" onclick="openNewSubjectForIndagato()" title="${t('newSubjectInline')}">+ ${t('newSubjectInline')}</button>
        </div>
        <div class="phase-section-label" style="margin-top:12px;margin-bottom:8px">${t('indagatiEReatoIpotizzati')}</div>
        <div id="indagatiListContainer"></div>
      </div>`,
      origineAtto: `
      <div id="acc-origineAtto" class="form-section-group" style="margin-top:8px">
        <div class="phase-section-label" style="margin-bottom:8px">${t('tabOrigineAtto')}</div>
        <div class="form-grid form-grid-4">
          <div class="form-group"><label>${t('penaleTipoAtto')}</label><select id="fSpecTipoAtto"><option value="">-</option>${tipoAttoOpts.map(o => `<option value="${o}" ${sd.tipoAtto === o ? 'selected' : ''}>${t(o)}</option>`).join('')}</select></div>
          <div class="form-group"><label>${t('canaleRicezione')}</label><select id="fSpecCanaleRicezione"><option value="">-</option>${['canale_ricezione_procura','canale_pg_carabinieri','canale_pg_polizia','canale_pg_finanza','canale_pg_penitenziaria','canale_pg_forestale','canale_pg_locale','canale_pec','canale_altro'].map(o => `<option value="${o}" ${sd.canaleRicezione === o ? 'selected' : ''}>${t(o)}</option>`).join('')}</select></div>
          <div class="form-group"><label>${t('dataDeposito')}</label><input type="date" id="fSpecDataDeposito" value="${sd.dataDeposito || ''}"></div>
          <div class="form-group autocomplete-wrap" style="position:relative"><label>${t('cittaDeposito')}</label><input id="fSpecCittaDeposito" value="${esc(sd.cittaDeposito || '')}" autocomplete="off" placeholder="${t('searchComunePlaceholder')}" data-testid="input-citta-deposito"><div id="fSpecCittaDepositoSuggestions" class="autocomplete-list"></div></div>
        </div>
        <div class="form-group full-width" style="margin-top:12px">
          <label>${t('fileAttoOrigine')}</label>
          ${fileUploadZonesOrigin(originFilesIt, originFilesEn)}
        </div>
      </div>`
    };
  }
  if (type === 'civile') {
    const tipoOpts = ['ordinario', 'sommario', 'esecuzione_civile'];
    const decisOpts = ['sentenza_civile', 'ordinanza_civile', 'sexies'];
    return `
      ${renderAccordionStart('parti', t('tabParti'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('civileTipo')}</label><select id="fSpecTipoCiv"><option value="">-</option>${tipoOpts.map(o => `<option value="${o}" ${sd.tipoCivile === o ? 'selected' : ''}>${t(o)}</option>`).join('')}</select></div>
          <div class="form-group"><label>${t('civileAttore')}</label><input id="fSpecAttore" value="${esc(sd.attore || '')}"></div>
          <div class="form-group"><label>${t('civileConvenuto')}</label><input id="fSpecConvenuto" value="${esc(sd.convenuto || '')}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('istruttoria', t('tabIstruttoria'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('civileCTU')}</label><input id="fSpecCTU" value="${esc(sd.ctu || '')}"></div>
          <div class="form-group"><label>${t('civileDataCTU')}</label><input id="fSpecDataCTU" type="date" value="${sd.dataCTU || ''}"></div>
          <div class="form-group"><label>${t('civileArticolo')}</label><input id="fSpecArticolo" value="${esc(sd.articolo || '')}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('decisione', t('tabDecisione'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('civileDecisione')}</label><select id="fSpecDecis"><option value="">-</option>${decisOpts.map(o => `<option value="${o}" ${sd.decisione === o ? 'selected' : ''}>${t(o)}</option>`).join('')}</select></div>
          <div class="form-group"><label>${t('civileDataPubbl')}</label><input id="fSpecDataPubbl" type="date" value="${sd.dataPubbl || ''}"></div>
          <div class="form-group"><label>${t('civileDataComun')}</label><input id="fSpecDataComun" type="date" value="${sd.dataComun || ''}"></div>
        </div>
      ${renderAccordionEnd()}`;
  }
  if (type === 'amministrativo') {
    return `
      ${renderAccordionStart('ricorso', t('tabRicorso'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('ammTAR')}</label><input id="fSpecTAR" value="${esc(sd.tar || '')}"></div>
          <div class="form-group"><label>${t('ammRG')}</label><input id="fSpecRGTar" value="${esc(sd.rgTar || '')}"></div>
          <div class="form-group"><label>${t('ammTipoRicorso')}</label><input id="fSpecTipoRicorso" value="${esc(sd.tipoRicorso || '')}"></div>
          <div class="form-group full-width"><label>${t('ammProvvedimento')}</label><input id="fSpecProvv" value="${esc(sd.provvedimento || '')}"></div>
          <div class="form-group"><label>${t('ammDataNotifica')}</label><input id="fSpecDataNotif" type="date" value="${sd.dataNotifica || ''}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('cautelare', t('tabCautelare'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('ammSospensiva')}</label><select id="fSpecSosp"><option value="false" ${!sd.sospensiva ? 'selected' : ''}>${t('no')}</option><option value="true" ${sd.sospensiva ? 'selected' : ''}>${t('si')}</option></select></div>
          <div class="form-group full-width"><label>${t('ammOrdinanzaCaut')}</label><input id="fSpecOrdCaut" value="${esc(sd.ordinanzaCaut || '')}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('appelloAmm', t('tabAppelloAmm'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('ammAppelloCS')}</label><select id="fSpecAppCS"><option value="false" ${!sd.appelloCS ? 'selected' : ''}>${t('no')}</option><option value="true" ${sd.appelloCS ? 'selected' : ''}>${t('si')}</option></select></div>
        </div>
      ${renderAccordionEnd()}`;
  }
  if (type === 'esecuzione') {
    const tipoEseOpts = ['immobiliare', 'mobiliare'];
    return `
      ${renderAccordionStart('pignoramento', t('tabPignoramento'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('eseRGE')}</label><input id="fSpecRGE" value="${esc(sd.rge || '')}"></div>
          <div class="form-group"><label>${t('eseTipo')}</label><select id="fSpecTipoEse"><option value="">-</option>${tipoEseOpts.map(o => `<option value="${o}" ${sd.tipoEse === o ? 'selected' : ''}>${t(o)}</option>`).join('')}</select></div>
          <div class="form-group"><label>${t('esePignoramento')}</label><input id="fSpecDataPign" type="date" value="${sd.dataPignoramento || ''}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('soggetti', t('tabSoggetti'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('eseGiudice')}</label><input id="fSpecGiudEse" value="${esc(sd.giudice || '')}"></div>
          <div class="form-group"><label>${t('eseCreditore')}</label><input id="fSpecCreditore" value="${esc(sd.creditore || '')}"></div>
          <div class="form-group"><label>${t('eseDebitore')}</label><input id="fSpecDebitore" value="${esc(sd.debitore || '')}"></div>
          <div class="form-group"><label>${t('eseCustode')}</label><input id="fSpecCustode" value="${esc(sd.custode || '')}"></div>
          <div class="form-group"><label>${t('eseDelegato')}</label><input id="fSpecDelegato" value="${esc(sd.delegato || '')}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('vendita', t('tabVendita'), false)}
        <div class="form-grid">
          <div class="form-group"><label>${t('eseDataAsta')}</label><input id="fSpecDataAsta" type="date" value="${sd.dataAsta || ''}"></div>
          <div class="form-group"><label>${t('eseStatoVendita')}</label><input id="fSpecStatoVend" value="${esc(sd.statoVendita || '')}"></div>
        </div>
      ${renderAccordionEnd()}
      ${renderAccordionStart('perizia', t('tabPerizia'), false)}
        <div class="form-grid">
          <div class="form-group full-width"><label>${t('esePerizia')}</label><textarea id="fSpecPerizia" rows="2">${esc(sd.perizia || '')}</textarea></div>
        </div>
      ${renderAccordionEnd()}`;
  }
  return '';
}

function collectSpecificData(type) {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  if (type === 'penale') {
    const soggettiTipoEl = document.querySelector('input[name="soggettiTipo"]:checked');
    const soggettiTipo = soggettiTipoEl ? soggettiTipoEl.value : 'noti';
    const cb = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const dirittiProcessuali = {
      richiestaAvvisoArchiviazione: cb('fDP_avviso408'),
      dataRichiestaAvviso: g('fDP_avviso408_date'),
      avviso415bisNotificato: cb('fDP_415bis'),
      data415bis: g('fDP_415bis_date'),
      reatoAQuerela: cb('fDP_querela'),
      querelaPresentata: cb('fDP_querela_presentata'),
      dataQuerela: g('fDP_querela_date'),
      costituzioneParteCivile: cb('fDP_parteCivile'),
      faseCostituzione: g('fDP_parteCivile_fase'),
      decretoNotificato: cb('fDP_decretoNotificato'),
      dataNotificaDecreto: g('fDP_decreto_date'),
      termineOpposizione: g('fDP_decreto_termine'),
      opposizioneDecretoPenale: cb('fDP_opposizione'),
      dataOpposizione: g('fDP_opposizione_date')
    };
    const origineProc = g('fOrigineProc');
    return { origineProc, rgnr: g('fSpecRGNR'), rgt: g('fSpecRGT'), gip: g('fSpecGIP'), dibattimento: g('fSpecDibatt'), tipoAtto: g('fSpecTipoAtto'), dataDeposito: g('fSpecDataDeposito'), cittaDeposito: g('fSpecCittaDeposito'), canaleRicezione: g('fSpecCanaleRicezione'), statoPM: g('fSpecStatoPM'), dataRichiestaPM: g('fSpecDataRichPM'), faseGIP: g('fSpecFaseGIP'), dataUdienzaGIP: g('fSpecDataUdGIP'), ordinanzaGIP: g('fSpecOrdGIP'), tipoGiudice: g('fSpecTipoGiud'), dataPredib: g('fSpecDataPredib'), dataDibatt: g('fSpecDataDibatt'), indagati: [...state.indagati], dataUdienzaPrel: g('fSpecDataUdPrel'), esitoGUP: g('fSpecEsitoGUP'), notaGUP: g('fSpecNotaGUP'), soggettiTipo, dirittiProcessuali };
  }
  if (type === 'civile') {
    return { tipoCivile: g('fSpecTipoCiv'), attore: g('fSpecAttore'), convenuto: g('fSpecConvenuto'), ctu: g('fSpecCTU'), dataCTU: g('fSpecDataCTU'), articolo: g('fSpecArticolo'), decisione: g('fSpecDecis'), dataPubbl: g('fSpecDataPubbl'), dataComun: g('fSpecDataComun') };
  }
  if (type === 'amministrativo') {
    return { tar: g('fSpecTAR'), rgTar: g('fSpecRGTar'), tipoRicorso: g('fSpecTipoRicorso'), provvedimento: g('fSpecProvv'), dataNotifica: g('fSpecDataNotif'), sospensiva: g('fSpecSosp') === 'true', ordinanzaCaut: g('fSpecOrdCaut'), appelloCS: g('fSpecAppCS') === 'true' };
  }
  if (type === 'esecuzione') {
    return { rge: g('fSpecRGE'), giudice: g('fSpecGiudEse'), creditore: g('fSpecCreditore'), debitore: g('fSpecDebitore'), tipoEse: g('fSpecTipoEse'), dataPignoramento: g('fSpecDataPign'), custode: g('fSpecCustode'), delegato: g('fSpecDelegato'), perizia: g('fSpecPerizia'), dataAsta: g('fSpecDataAsta'), statoVendita: g('fSpecStatoVend') };
  }
  return {};
}

async function renderIndagatiList() {
  const container = document.getElementById('indagatiListContainer');
  if (!container) return;
  await _loadAllLists();
  const subjects = await DB.getSubjects();
  let html = '';
  if (state.indagati.length === 0) {
    html = `<p class="hint">${t('noIndagati')}</p>`;
  } else {
    for (const entry of state.indagati) {
      const subj = subjects.find(s => s.id === entry.subjectId);
      const name = subj ? `${esc(subj.lastName)} ${esc(subj.firstName)}` : (entry.label || '?');
      let qualLabel = '';
      if (entry.qualitaDi === 'privato_cittadino') {
        qualLabel = t('privatoCittadino');
      } else if (entry.role) {
        if (entry.role.roleId) { const r = _allRoles.find(x => x.id === entry.role.roleId); if (r) qualLabel = _labelFor(r); }
        else if (entry.role.subcategoryId) { const s = _allSubcategories.find(x => x.id === entry.role.subcategoryId); if (s) qualLabel = _labelFor(s); }
        else if (entry.role.categoryId) { const c = _allCategories.find(x => x.id === entry.role.categoryId); if (c) qualLabel = _labelFor(c); }
      }
      if (!qualLabel && entry.roleLabel) {
        const parts = entry.roleLabel.split(' > ');
        qualLabel = parts[parts.length - 1].trim();
      }
      let roleDisplay = '';
      if (qualLabel) {
        roleDisplay = `${t('inQualitaDi')} ${qualLabel}`;
      } else if (entry.procRole) {
        roleDisplay = t('procRole_' + entry.procRole);
      }
      if (!entry.reatiEsponente) entry.reatiEsponente = [];
      let allNodiForReati = null;
      for (const re of entry.reatiEsponente) {
        if (re.nodeId) {
          try {
            if (!allNodiForReati) allNodiForReati = await NormDB.getAllNodi();
            const nodo = allNodiForReati.find(n => n.id === re.nodeId);
            if (nodo) {
              const testo = currentLang === 'en' ? (nodo.testo_en || nodo.testo_it || '') : (nodo.testo_it || '');
              const desc = testo.split('\n')[0].split('.')[0] || nodo.rubrica || '';
              re.label = 'art. ' + (nodo.numero || '') + ' c.p.' + (desc ? ' - ' + desc : '');
            }
          } catch(e) {}
        }
      }
      const reatiRows = entry.reatiEsponente.map((re, reIdx) => `
        <div class="ipotesi-reato-row" data-testid="ipotesi-reato-row-${entry.subjectId}-${reIdx}">
          <div class="autocomplete-wrap" style="flex:1;position:relative;min-width:180px">
            <input value="${esc(re.label || '')}" placeholder="${t('reatoAtteso')}" oninput="syncIpotesiReatoLabel(${entry.subjectId}, ${reIdx}, this.value)" data-testid="input-ipotesi-reato-${entry.subjectId}-${reIdx}" autocomplete="off">
          </div>
          <div style="flex:2;min-width:200px">
            <input value="${esc(re.descrizione || '')}" placeholder="${t('condottaDenunciata')}" oninput="syncIpotesiReatoDesc(${entry.subjectId}, ${reIdx}, this.value)" data-testid="input-ipotesi-desc-${entry.subjectId}-${reIdx}">
          </div>
          <button class="btn btn-xs btn-danger" onclick="removeIpotesiReato(${entry.subjectId}, ${reIdx})" data-testid="btn-remove-ipotesi-${entry.subjectId}-${reIdx}">&times;</button>
        </div>`).join('');

      html += `<div class="indagato-card indagato-card-2col">
        <div class="indagato-col-left">
          <span class="indagato-name">${name}</span>
          ${roleDisplay ? `<span class="indagato-role">${esc(roleDisplay)}</span>` : ''}
          <button class="btn btn-xs btn-danger" onclick="removeIndagato(${entry.subjectId})" style="margin-top:4px">${t('removeIndagato')}</button>
        </div>
        <div class="indagato-col-right">
          ${reatiRows || ''}
          <button class="btn btn-xs" onclick="addIpotesiReato(${entry.subjectId})" data-testid="btn-add-ipotesi-${entry.subjectId}">${t('addIpotesiReato')}</button>
        </div>
      </div>`;
    }
  }
  container.innerHTML = html;
  setupIndagatoAutocomplete();
}


function _getF1Field(field) {
  const f1 = (state.procPhases || []).find(p => p.tipo === 'fase_procura');
  return f1 ? (f1[field] || '') : '';
}
function _getF1GeoField(field) {
  const f1 = (state.procPhases || []).find(p => p.tipo === 'fase_procura');
  return f1?.geoData ? (f1.geoData[field] || '') : '';
}

async function refreshVigilanceChain() {
  const chainBox = document.getElementById('authVigilanceChain');
  const chainContent = document.getElementById('authVigilanceContent');

  const f1 = (state.procPhases || []).find(p => p.tipo === 'fase_procura');
  const geoData = f1?.geoData || {};
  const tribunale = geoData.tribunale || '';
  const distretto = geoData.corteAppello || '';
  const dataIscrizione = f1?.dataIscrizione || '';

  if (!tribunale || !chainBox || !chainContent) {
    if (chainBox) chainBox.style.display = 'none';
    return;
  }

  chainBox.style.display = '';
  const subjects = await _ensureCachedSubjects();

  const html = buildVigilanceChainWithSubjects(subjects, tribunale, distretto, dataIscrizione);
  chainContent.innerHTML = html;
}

function buildVigilanceChainWithSubjects(subjects, tribunale, distretto, dataIscrizione) {
  const chain = VIGILANCE_CHAIN_ROLES.map((def, i) => {
    const sede = def.sedeType === 'tribunale' ? tribunale : distretto;
    const officeLabels = {
      procuratoreRepubblica: t('procuraRepubblicaPresso') + ' ' + tribunale,
      presidenteTribunale: t('tribunaleDi') + ' ' + tribunale,
      presidenteCorteAppello: t('corteAppelloDi') + ' ' + distretto,
      procuratoreGenerale: t('procuraGeneralePresso') + ' ' + distretto
    };
    const found = findSubjectByRoleAndSede(subjects, def.roleId, sede, dataIscrizione);
    return {
      level: i + 1,
      key: def.key,
      role: t(def.key),
      office: officeLabels[def.key] || '',
      subject: found,
      roleId: def.roleId,
      sede: sede
    };
  });

  state._vigilanceSubjectIds = {};
  chain.forEach(item => {
    state._vigilanceSubjectIds[item.key] = item.subject ? item.subject.id : null;
  });

  return `<div class="vigilance-steps">
    ${chain.map((item, i) => {
      const nameHtml = item.subject
        ? `<span class="vigilance-step-subject">${esc(item.subject.lastName)} ${esc(item.subject.firstName)}</span>`
        : `<button class="btn btn-xs vigilance-add-btn" data-vigil-role-id="${item.roleId}" data-vigil-sede="${esc(item.sede)}" data-vigil-label="${esc(item.role)}" data-testid="button-add-vigilance-${item.level}">+ ${t('aggiungiInRubrica')}</button>`;
      return `
      <div class="vigilance-step">
        <div class="vigilance-step-num">${item.level}</div>
        <div class="vigilance-step-info">
          <span class="vigilance-step-role">${esc(item.role)}</span>
          <span class="vigilance-step-office">${esc(item.office)}</span>
          ${nameHtml}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function buildVigilanceChainForDetail(subjects, p) {
  const tribunale = p.tribunale || '';
  const distretto = p.distrettoAppello || '';
  const dataIscrizione = p.dataIscrizioneRuolo || '';
  const stored = p.vigilanceSubjects || {};

  const chain = VIGILANCE_CHAIN_ROLES.map((def, i) => {
    const sede = def.sedeType === 'tribunale' ? tribunale : distretto;
    const officeLabels = {
      procuratoreRepubblica: t('procuraRepubblicaPresso') + ' ' + tribunale,
      presidenteTribunale: t('tribunaleDi') + ' ' + tribunale,
      presidenteCorteAppello: t('corteAppelloDi') + ' ' + distretto,
      procuratoreGenerale: t('procuraGeneralePresso') + ' ' + distretto
    };
    let found = null;
    if (stored[def.key]) {
      found = subjects.find(s => s.id === stored[def.key]) || null;
    }
    if (!found) {
      found = findSubjectByRoleAndSede(subjects, def.roleId, sede, dataIscrizione);
    }
    return { level: i + 1, role: t(def.key), office: officeLabels[def.key] || '', subject: found };
  });

  return `<div class="vigilance-steps">
    ${chain.map((item, i) => `
      <div class="vigilance-step">
        <div class="vigilance-step-num">${item.level}</div>
        <div class="vigilance-step-info">
          <span class="vigilance-step-role">${esc(item.role)}</span>
          <span class="vigilance-step-office">${esc(item.office)}</span>
          ${item.subject ? `<span class="vigilance-step-subject">${esc(item.subject.lastName)} ${esc(item.subject.firstName)}</span>` : `<span class="vigilance-step-missing">${t('nonInRubrica')}</span>`}
        </div>
      </div>
    `).join('')}
  </div>`;
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.vigilance-add-btn');
  if (!btn) return;
  const roleId = parseInt(btn.dataset.vigilRoleId);
  const sede = btn.dataset.vigilSede || '';
  const label = btn.dataset.vigilLabel || '';
  if (roleId) openNewSubjectForVigilance(roleId, sede, label);
});

async function openNewSubjectForVigilance(roleId, sede, roleLabel) {
  await _loadAllLists();
  const magistraturaCat = _allCategories.find(c => (c.labelIt || '').toLowerCase().includes('magistratura'));
  const magistraturaCatId = magistraturaCat ? magistraturaCat.id : null;
  let subcatId = null;
  const roleObj = _allRoles.find(r => r.id === roleId);
  if (roleObj) {
    const subcat = _allSubcategories.find(s => s.id === roleObj.subcategoryId);
    if (subcat) subcatId = subcat.id;
  }

  const prefilledRole = {
    categoryId: magistraturaCatId,
    subcategoryId: subcatId,
    roleId: roleId,
    startDate: '',
    endDate: '',
    citta: sede
  };

  const _modalRoles = [{ ...prefilledRole }];

  function renderModalRolesV() {
    const container = document.getElementById('modalVigilSubjRolesContainer');
    if (!container) return;
    container.innerHTML = _modalRoles.map((r, idx) => {
      const currentLabel = _getCurrentRoleLabel(r);
      const catLabel = r.categoryId ? _labelFor(_allCategories.find(c => c.id === r.categoryId)) : '\u2014';
      const subcatLabel = r.subcategoryId ? _labelFor(_allSubcategories.find(s => s.id === r.subcategoryId)) : '\u2014';
      const roleLbl = r.roleId ? _labelFor(_allRoles.find(rl => rl.id === r.roleId)) : '\u2014';
      return `
      <div class="repeatable-group">
        <div class="repeatable-group-header">
          <span class="repeatable-group-num">#${idx + 1}</span>
          ${_modalRoles.length > 1 ? `<button class="btn btn-xs btn-danger" onclick="document.dispatchEvent(new CustomEvent('modalVigilRoleRemove', {detail:${idx}}))">${t('removeRole')}</button>` : ''}
        </div>
        <div class="form-row form-row-5col">
          <div class="form-group form-group-fifth">
            <label>${t('startDate')} (IN)</label>
            <input type="date" data-mvigil-role-start="${idx}" value="${r.startDate || ''}">
          </div>
          <div class="form-group form-group-fifth">
            <label>${t('endDate')} (OUT)</label>
            <input type="date" data-mvigil-role-end="${idx}" value="${r.endDate || ''}">
          </div>
          <div class="form-group form-group-fifth" style="flex:2 1 0">
            <label>${t('subjectRole')}</label>
            <input readonly value="${esc(currentLabel)}" class="input-readonly">
          </div>
          <div class="form-group form-group-fifth">
            <label>${t('sede')}</label>
            <input readonly value="${esc(r.citta || '')}" class="input-readonly">
          </div>
        </div>
        <div class="role-details-row">
          <div class="form-row">
            <div class="form-group form-group-third"><label>${t('category')}</label><input readonly value="${esc(catLabel)}" class="input-readonly"></div>
            <div class="form-group form-group-third"><label>${t('subcategory')}</label><input readonly value="${esc(subcatLabel)}" class="input-readonly"></div>
            <div class="form-group form-group-third"><label>${t('subjectRole')}</label><input readonly value="${esc(roleLbl)}" class="input-readonly"></div>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-mvigil-role-start]').forEach(inp => {
      inp.onchange = function() { _modalRoles[parseInt(this.getAttribute('data-mvigil-role-start'))].startDate = this.value; };
    });
    container.querySelectorAll('[data-mvigil-role-end]').forEach(inp => {
      inp.onchange = function() { _modalRoles[parseInt(this.getAttribute('data-mvigil-role-end'))].endDate = this.value; };
    });
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content modal-large">
      <h3>${t('aggiungiMagistrato')} - ${esc(roleLabel)}</h3>
      <p class="hint">${t('vigilanceAddHint')} <strong>${esc(roleLabel)}</strong> (${esc(sede)})</p>
      <div class="form-row">
        <div class="form-group" style="flex:0 0 140px;position:relative">
          <label>${t('salutation')}</label>
          <input id="fVigilSubjSalutation" autocomplete="off" data-testid="input-vigil-salutation">
          <div id="fVigilSubjSalutationList" class="autocomplete-list" data-testid="list-vigil-salutation"></div>
        </div>
        <div class="form-group" style="flex:1;min-width:0">
          <label>${t('firstName')} *</label>
          <input id="fVigilSubjFirst" required data-testid="input-vigil-firstname">
        </div>
        <div class="form-group" style="flex:1;min-width:0">
          <label>${t('lastName')} *</label>
          <input id="fVigilSubjLast" required data-testid="input-vigil-lastname">
        </div>
        <div class="form-group" style="flex:0 0 160px;position:relative">
          <label>${t('origin')}</label>
          <input id="fVigilSubjOrigin" autocomplete="off" data-testid="input-vigil-origin">
          <div id="fVigilSubjOriginList" class="autocomplete-list" data-testid="list-vigil-origin"></div>
        </div>
      </div>
      <div class="form-section-header">
        <h3>${t('rolesSection')}</h3>
        <button class="btn btn-xs btn-primary" id="btnVigilAddRole">${t('addRole')}</button>
      </div>
      <div id="modalVigilSubjRolesContainer"></div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnVigilSubjConfirm" data-testid="button-vigil-save">${t('save')}</button>
        <button class="btn" id="btnVigilSubjCancel" data-testid="button-vigil-cancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderModalRolesV();
  setupSalutationAutocomplete('fVigilSubjSalutation', 'fVigilSubjSalutationList');
  setupCittaAutocomplete('fVigilSubjOrigin', 'fVigilSubjOriginList', {}, { formatValue: c => c.comune + (c.provincia ? ' (' + c.provincia + ')' : '') });

  document.getElementById('btnVigilAddRole').onclick = () => {
    _modalRoles.push({ categoryId: magistraturaCatId, subcategoryId: subcatId, roleId: roleId, startDate: '', endDate: '', citta: sede });
    renderModalRolesV();
  };

  const removeHandler = (e) => {
    _modalRoles.splice(e.detail, 1);
    if (_modalRoles.length === 0) _modalRoles.push({ ...prefilledRole });
    renderModalRolesV();
  };
  document.addEventListener('modalVigilRoleRemove', removeHandler);

  document.getElementById('btnVigilSubjConfirm').onclick = async () => {
    const firstName = document.getElementById('fVigilSubjFirst').value.trim();
    const lastName = document.getElementById('fVigilSubjLast').value.trim();
    if (!firstName || !lastName) {
      alert(t('firstNameLastNameRequired'));
      return;
    }
    const salutation = document.getElementById('fVigilSubjSalutation').value.trim();
    const origin = document.getElementById('fVigilSubjOrigin').value.trim();
    const roles = _modalRoles.filter(r => r.categoryId || r.subcategoryId || r.roleId);
    if (salutation) {
      const flat = _flatSalutationList();
      if (!flat.some(f => f.label.toLowerCase() === salutation.toLowerCase())) {
        const existing = await DB.getListItems('salutation');
        if (!existing.some(c => (c.labelIt || '').toLowerCase() === salutation.toLowerCase())) {
          await DB.addListItem('salutation', salutation, salutation, null);
        }
      }
    }
    await DB.createSubject({
      firstName, lastName, salutation, origin, descriptionIt: '', descriptionEn: '',
      categoryId: null, subcategoryId: null, roleId: null, description: '',
      roles: roles
    });
    _cachedSubjects = null;
    document.removeEventListener('modalVigilRoleRemove', removeHandler);
    overlay.remove();
    await refreshVigilanceChain();
  };

  document.getElementById('btnVigilSubjCancel').onclick = () => {
    document.removeEventListener('modalVigilRoleRemove', removeHandler);
    overlay.remove();
  };
}

function setupIndagatoAutocomplete() {
  const input = document.getElementById('indagatoSearchInput');
  const list = document.getElementById('indagatoSearchSuggestions');
  if (!input || !list) return;
  if (input._autocompleteSetup) return;
  input._autocompleteSetup = true;
  let debounceTimer = null;
  let currentResults = [];
  let selectedIdx = -1;

  function highlightItem() {
    list.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('active', i === selectedIdx);
    });
  }

  async function selectSubject(subj) {
    input.value = '';
    list.innerHTML = '';
    list.classList.remove('visible');
    currentResults = [];
    selectedIdx = -1;
    if (state.indagati.some(i => i.subjectId === subj.id)) return;
    await showInlineRolePicker(subj);
  }

  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      list.innerHTML = '';
      list.classList.remove('visible');
      currentResults = [];
      selectedIdx = -1;
      return;
    }
    debounceTimer = setTimeout(async function() {
      const subjects = await DB.getSubjects();
      const alreadyIds = state.indagati.map(i => i.subjectId);
      currentResults = subjects.filter(s => {
        if (alreadyIds.includes(s.id)) return false;
        const full = (s.firstName + ' ' + s.lastName + ' ' + s.lastName + ' ' + s.firstName).toLowerCase();
        return full.includes(q);
      }).slice(0, 10);
      selectedIdx = -1;
      if (currentResults.length === 0) {
        list.innerHTML = '<div class="autocomplete-item no-result">' + (t('noResults') || 'Nessun risultato') + '</div>';
        list.classList.add('visible');
        return;
      }
      list.innerHTML = currentResults.map((s, i) =>
        '<div class="autocomplete-item" data-idx="' + i + '">' + esc(s.lastName) + ' ' + esc(s.firstName) + '</div>'
      ).join('');
      list.classList.add('visible');
    }, 100);
  });

  list.addEventListener('mousedown', function(e) {
    e.preventDefault();
    const item = e.target.closest('.autocomplete-item');
    if (!item || item.classList.contains('no-result')) return;
    const idx = parseInt(item.dataset.idx);
    if (currentResults[idx]) selectSubject(currentResults[idx]);
  });

  input.addEventListener('keydown', function(e) {
    if (!list.classList.contains('visible') || currentResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, currentResults.length - 1); highlightItem(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); highlightItem(); }
    else if (e.key === 'Enter' && selectedIdx >= 0) { e.preventDefault(); selectSubject(currentResults[selectedIdx]); }
    else if (e.key === 'Escape') { list.innerHTML = ''; list.classList.remove('visible'); }
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
  });
}

async function showInlineRolePicker(subj) {
  await _loadAllLists();
  const picker = document.getElementById('indagatoRolePickerInline');
  if (!picker) return;

  const searchWrap = picker.parentElement.querySelector('.autocomplete-wrap');
  if (searchWrap) searchWrap.style.display = 'none';
  const newBtn = picker.parentElement.querySelector('button[onclick*="openNewSubjectForIndagato"]');
  if (newBtn) newBtn.style.display = 'none';

  const roles = subj.roles || [];

  const qualOpts = [`<option value="privato_cittadino">${t('privatoCittadino')}</option>`];
  roles.forEach((r, idx) => {
    let label = '';
    if (r.roleId) { const rl = _allRoles.find(x => x.id === r.roleId); if (rl) label = _labelFor(rl); }
    else if (r.subcategoryId) { const s = _allSubcategories.find(x => x.id === r.subcategoryId); if (s) label = _labelFor(s); }
    else if (r.categoryId) { const c = _allCategories.find(x => x.id === r.categoryId); if (c) label = _labelFor(c); }
    if (label) qualOpts.push(`<option value="existing_${idx}">${esc(label)}</option>`);
  });
  qualOpts.push(`<option value="custom">${t('altroSpecificare')}...</option>`);

  picker.innerHTML = `
    <div class="indagato-role-picker-inline">
      <span class="indagato-picker-name">${esc(subj.lastName)} ${esc(subj.firstName)}</span>
      <select id="indQualSelect" data-testid="select-qualification" title="${t('inQualitaDi')}">
        <option value="">-- ${t('inQualitaDi')} --</option>
        ${qualOpts.join('')}
      </select>
      <button class="btn btn-xs btn-primary" id="btnConfirmIndagatoRole" data-testid="button-confirm-indagato">${t('confirm')}</button>
      <button class="btn btn-xs" id="btnCancelIndagatoRole" data-testid="button-cancel-indagato">${t('cancel')}</button>
    </div>
    <div id="indagatoCustomRoleSelects" style="display:none"></div>
  `;
  picker.style.display = '';

  const _customRole = { categoryId: null, subcategoryId: null, roleId: null };

  function renderCustomSelects() {
    const ctr = document.getElementById('indagatoCustomRoleSelects');
    if (!ctr) return;
    const currentLabel = _getCurrentRoleLabel(_customRole);
    ctr.innerHTML = `
      <div class="form-row" style="margin-top:6px">
        <div class="form-group autocomplete-wrap" style="flex:1;min-width:0">
          <input id="fIndCustRoleSearch" value="${esc(currentLabel)}" autocomplete="off" placeholder="${t('searchRolePlaceholder')}">
          <div id="fIndCustRoleSearch_suggestions" class="autocomplete-list"></div>
        </div>
      </div>
    `;
    const flatList = _buildFlatRoleList();
    const input = document.getElementById('fIndCustRoleSearch');
    const sugBox = document.getElementById('fIndCustRoleSearch_suggestions');
    if (!input || !sugBox) return;
    let _custSelected = !!_customRole.roleId;
    input.addEventListener('input', function() {
      _custSelected = false;
      _customRole.roleId = null;
      _customRole.subcategoryId = null;
      _customRole.categoryId = null;
      const q = this.value.toLowerCase().trim();
      sugBox.innerHTML = '';
      if (!q) { sugBox.style.display = 'none'; return; }
      const matches = flatList.filter(f => f.searchText.includes(q)).slice(0, 12);
      if (matches.length === 0) { sugBox.style.display = 'none'; return; }
      matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerHTML = `<strong>${esc(m.roleLabel)}</strong> <span class="hint">${esc(m.subcatLabel)}</span>`;
        div.addEventListener('mousedown', (e) => {
          e.preventDefault();
          _customRole.roleId = m.roleId;
          _customRole.subcategoryId = m.subcategoryId;
          _customRole.categoryId = m.categoryId;
          input.value = m.displayLabel;
          sugBox.style.display = 'none';
          _custSelected = true;
        });
        sugBox.appendChild(div);
      });
      sugBox.style.display = 'block';
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        sugBox.style.display = 'none';
        if (!_custSelected && input.value.trim()) {
          input.value = '';
          _customRole.roleId = null;
          _customRole.subcategoryId = null;
          _customRole.categoryId = null;
        }
      }, 200);
    });
    input.addEventListener('focus', function() { if (this.value.trim() && !_custSelected) this.dispatchEvent(new Event('input')); });
  }

  document.getElementById('indQualSelect').onchange = function() {
    const ctr = document.getElementById('indagatoCustomRoleSelects');
    if (this.value === 'custom') {
      ctr.style.display = '';
      renderCustomSelects();
    } else {
      ctr.style.display = 'none';
    }
  };

  document.getElementById('btnConfirmIndagatoRole').onclick = async () => {
    const qualSel = document.getElementById('indQualSelect');
    const qualVal = qualSel ? qualSel.value : '';
    if (!qualVal) {
      qualSel.focus();
      qualSel.style.borderColor = 'var(--danger)';
      setTimeout(() => { qualSel.style.borderColor = ''; }, 2000);
      return;
    }

    const entry = { subjectId: subj.id, label: `${subj.lastName} ${subj.firstName}`, procRole: 'indagato' };
    if (qualVal === 'privato_cittadino') {
      entry.qualitaDi = 'privato_cittadino';
    } else if (qualVal.startsWith('existing_')) {
      const roleIdx = parseInt(qualVal.replace('existing_', ''));
      const existingRole = roles[roleIdx];
      if (existingRole) {
        entry.role = { categoryId: existingRole.categoryId || null, subcategoryId: existingRole.subcategoryId || null, roleId: existingRole.roleId || null };
      }
    } else if (qualVal === 'custom') {
      if (!_customRole.roleId) {
        const roleInput = document.getElementById('fIndCustRoleSearch');
        if (roleInput) { roleInput.focus(); roleInput.style.borderColor = 'var(--danger)'; setTimeout(() => { roleInput.style.borderColor = ''; }, 2000); }
        return;
      }
      entry.role = { categoryId: _customRole.categoryId, subcategoryId: _customRole.subcategoryId, roleId: _customRole.roleId };
    }
    state.indagati.push(entry);
    picker.style.display = 'none';
    picker.innerHTML = '';
    if (searchWrap) searchWrap.style.display = '';
    if (newBtn) newBtn.style.display = '';
    _cachedSubjects = null;
    await renderIndagatiList();
    renderPhasesSection();
  };

  document.getElementById('btnCancelIndagatoRole').onclick = () => {
    picker.style.display = 'none';
    picker.innerHTML = '';
    if (searchWrap) searchWrap.style.display = '';
    if (newBtn) newBtn.style.display = '';
  };
}

function removeIndagato(subjectId) {
  state.indagati = state.indagati.filter(i => i.subjectId !== subjectId);
  _cachedSubjects = null;
  renderIndagatiList();
  renderPhasesSection();
}

function addIpotesiReato(subjectId) {
  const entry = state.indagati.find(i => i.subjectId === subjectId);
  if (!entry) return;
  if (!entry.reatiEsponente) entry.reatiEsponente = [];
  entry.reatiEsponente.push({ nodeId: null, label: '', descrizione: '' });
  renderIndagatiList();
}

function removeIpotesiReato(subjectId, reIdx) {
  const entry = state.indagati.find(i => i.subjectId === subjectId);
  if (!entry || !entry.reatiEsponente) return;
  entry.reatiEsponente.splice(reIdx, 1);
  renderIndagatiList();
}

function syncIpotesiReatoLabel(subjectId, reIdx, val) {
  const entry = state.indagati.find(i => i.subjectId === subjectId);
  if (!entry || !entry.reatiEsponente) return;
  entry.reatiEsponente[reIdx].label = val;
  if (!val || val.length < 2) {
    entry.reatiEsponente[reIdx].nodeId = null;
  }
  _showIpotesiReatoAutocomplete(subjectId, reIdx, val);
}

function syncIpotesiReatoDesc(subjectId, reIdx, val) {
  const entry = state.indagati.find(i => i.subjectId === subjectId);
  if (!entry || !entry.reatiEsponente) return;
  entry.reatiEsponente[reIdx].descrizione = val;
}

async function _showIpotesiReatoAutocomplete(subjectId, reIdx, query) {
  const input = document.querySelector(`[data-testid="input-ipotesi-reato-${subjectId}-${reIdx}"]`);
  if (!input) return;
  let dropdown = input.parentElement.querySelector('.reato-autocomplete');
  if (!query || query.length < 2) {
    if (dropdown) dropdown.remove();
    return;
  }
  const articles = await _loadCPArticles();
  const q = query.toLowerCase();
  const matches = articles.filter(a => a.label.toLowerCase().includes(q) || a.numero.includes(q) || a.rubrica.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)).slice(0, 12);
  if (matches.length === 0) {
    if (dropdown) dropdown.remove();
    return;
  }
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'reato-autocomplete';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(dropdown);
  }
  dropdown.innerHTML = matches.map(m => `<div class="reato-ac-item" data-label="${esc(m.label)}" data-nodeid="${m.id}">${esc(m.label)}</div>`).join('');
  dropdown.onclick = (e) => {
    const item = e.target.closest('.reato-ac-item');
    if (!item) return;
    const val = item.dataset.label;
    const nodeId = item.dataset.nodeid;
    input.value = val;
    const entry = state.indagati.find(i => i.subjectId === subjectId);
    if (entry && entry.reatiEsponente && entry.reatiEsponente[reIdx]) {
      entry.reatiEsponente[reIdx].label = val;
      entry.reatiEsponente[reIdx].nodeId = nodeId ? parseInt(nodeId) : null;
    }
    dropdown.remove();
  };
}

async function openNewSubjectForIndagato() {
  await _loadAllLists();
  const _modalRoles = [{ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '', citta: '' }];

  function renderModalRoles() {
    const container = document.getElementById('modalSubjRolesContainer');
    if (!container) return;
    container.innerHTML = _modalRoles.map((r, idx) => {
      const currentLabel = _getCurrentRoleLabel(r);
      const catLabel = r.categoryId ? _labelFor(_allCategories.find(c => c.id === r.categoryId)) : '—';
      const subcatLabel = r.subcategoryId ? _labelFor(_allSubcategories.find(s => s.id === r.subcategoryId)) : '—';
      const roleLabel = r.roleId ? _labelFor(_allRoles.find(rl => rl.id === r.roleId)) : '—';
      return `
      <div class="repeatable-group">
        <div class="repeatable-group-header">
          <span class="repeatable-group-num">#${idx + 1}</span>
          <button class="btn btn-xs btn-danger" onclick="document.dispatchEvent(new CustomEvent('modalRoleRemove', {detail:${idx}}))">${t('removeRole')}</button>
        </div>
        <div class="form-row form-row-5col">
          <div class="form-group form-group-fifth">
            <label>${t('startDate')} (IN)</label>
            <input type="date" data-modal-role-start="${idx}" value="${r.startDate || ''}">
          </div>
          <div class="form-group form-group-fifth">
            <label>${t('endDate')} (OUT)</label>
            <input type="date" data-modal-role-end="${idx}" value="${r.endDate || ''}">
          </div>
          <div class="form-group form-group-fifth autocomplete-wrap" style="flex:2 1 0">
            <label>${t('subjectRole')}</label>
            <input id="fModalRole_role_${idx}" value="${esc(currentLabel)}" autocomplete="off" placeholder="${t('searchRolePlaceholder')}">
            <div id="fModalRole_role_${idx}_suggestions" class="autocomplete-list"></div>
          </div>
          <div class="form-group form-group-fifth autocomplete-wrap">
            <label>${t('sede')}</label>
            <input id="fModalRole_citta_${idx}" value="${esc(r.citta || '')}" autocomplete="off" placeholder="${t('citta')}...">
            <div id="fModalRole_citta_${idx}_suggestions" class="autocomplete-list"></div>
          </div>
          <div class="form-group" style="flex:0 0 auto;align-self:flex-end">
            <button class="btn btn-xs" id="fModalRoleDetailsBtn_${idx}" onclick="toggleRoleDetails(${idx}, 'fModal')" type="button">${t('showCatDetails')}</button>
          </div>
        </div>
        <div id="fModalRoleDetails_${idx}" class="role-details-row" style="display:none">
          <div class="form-row">
            <div class="form-group form-group-third">
              <label>${t('category')}</label>
              <input readonly value="${esc(catLabel)}" class="input-readonly">
            </div>
            <div class="form-group form-group-third">
              <label>${t('subcategory')}</label>
              <input readonly value="${esc(subcatLabel)}" class="input-readonly">
            </div>
            <div class="form-group form-group-third">
              <label>${t('subjectRole')}</label>
              <input readonly value="${esc(roleLabel)}" class="input-readonly">
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-modal-role-start]').forEach(inp => {
      inp.onchange = function() {
        const i = parseInt(this.getAttribute('data-modal-role-start'));
        _modalRoles[i].startDate = this.value;
      };
    });
    container.querySelectorAll('[data-modal-role-end]').forEach(inp => {
      inp.onchange = function() {
        const i = parseInt(this.getAttribute('data-modal-role-end'));
        _modalRoles[i].endDate = this.value;
      };
    });
    _modalRoles.forEach((r, idx) => {
      setupRoleAutocomplete(`fModalRole_role_${idx}`, `fModalRole_role_${idx}_suggestions`, _modalRoles, idx, renderModalRoles);
      const cittaInput = document.getElementById(`fModalRole_citta_${idx}`);
      if (cittaInput) {
        cittaInput.onchange = function() { _modalRoles[idx].citta = this.value; };
        setupCittaAutocomplete(`fModalRole_citta_${idx}`, `fModalRole_citta_${idx}_suggestions`, {});
      }
    });
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content modal-large">
      <h3>${t('newSubjectInline')}</h3>
      <div class="form-row">
        <div class="form-group" style="flex:0 0 140px;position:relative">
          <label>${t('salutation')}</label>
          <input id="fModalSubjSalutation" autocomplete="off" data-testid="input-modal-salutation">
          <div id="fModalSubjSalutationList" class="autocomplete-list" data-testid="list-modal-salutation"></div>
        </div>
        <div class="form-group" style="flex:1;min-width:0">
          <label>${t('firstName')} *</label>
          <input id="fModalSubjFirst" required>
        </div>
        <div class="form-group" style="flex:1;min-width:0">
          <label>${t('lastName')} *</label>
          <input id="fModalSubjLast" required>
        </div>
        <div class="form-group" style="flex:0 0 160px;position:relative">
          <label>${t('origin')}</label>
          <input id="fModalSubjOrigin" autocomplete="off" data-testid="input-modal-origin">
          <div id="fModalSubjOriginList" class="autocomplete-list" data-testid="list-modal-origin"></div>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1">
          <label>${t('descrIt')}</label>
          <textarea id="fModalSubjDescrIt" rows="2"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
          ${_renderTransArrow('fModalSubjDescrIt','fModalSubjDescrEn','it','en')}
          ${_renderTransArrow('fModalSubjDescrEn','fModalSubjDescrIt','en','it')}
        </div>
        <div class="form-group" style="flex:1">
          <label>${t('descrEn')}</label>
          <textarea id="fModalSubjDescrEn" rows="2"></textarea>
        </div>
      </div>
      <div class="form-section-header">
        <h3>${t('rolesSection')}</h3>
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-primary" id="btnModalAddRole">${t('addRole')}</button>
        </div>
      </div>
      <div id="modalSubjRolesContainer"></div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnModalSubjConfirm">${t('save')}</button>
        <button class="btn" id="btnModalSubjCancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderModalRoles();
  setupSalutationAutocomplete('fModalSubjSalutation', 'fModalSubjSalutationList');
  setupCittaAutocomplete('fModalSubjOrigin', 'fModalSubjOriginList', {}, { formatValue: c => c.comune + (c.provincia ? ' (' + c.provincia + ')' : '') });

  document.getElementById('btnModalAddRole').onclick = () => {
    _modalRoles.push({ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '', citta: '' });
    renderModalRoles();
  };

  const removeHandler = (e) => {
    _modalRoles.splice(e.detail, 1);
    if (_modalRoles.length === 0) _modalRoles.push({ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '', citta: '' });
    renderModalRoles();
  };
  document.addEventListener('modalRoleRemove', removeHandler);

  document.getElementById('btnModalSubjConfirm').onclick = async () => {
    const firstName = document.getElementById('fModalSubjFirst').value.trim();
    const lastName = document.getElementById('fModalSubjLast').value.trim();
    if (!firstName || !lastName) {
      alert(t('firstNameLastNameRequired'));
      return;
    }
    const salutation = document.getElementById('fModalSubjSalutation').value.trim();
    const origin = document.getElementById('fModalSubjOrigin').value.trim();
    const descriptionIt = document.getElementById('fModalSubjDescrIt').value.trim();
    const descriptionEn = document.getElementById('fModalSubjDescrEn').value.trim();
    const roles = _modalRoles.filter(r => r.categoryId || r.subcategoryId || r.roleId);
    if (salutation) {
      const flat = _flatSalutationList();
      if (!flat.some(f => f.label.toLowerCase() === salutation.toLowerCase())) {
        const existing = await DB.getListItems('salutation');
        if (!existing.some(c => (c.labelIt || '').toLowerCase() === salutation.toLowerCase())) {
          await DB.addListItem('salutation', salutation, salutation, null);
        }
      }
    }
    const subj = await DB.createSubject({
      firstName, lastName, salutation, origin, descriptionIt, descriptionEn,
      categoryId: null, subcategoryId: null, roleId: null, description: '',
      roles: roles
    });
    _cachedSubjects = null;
    document.removeEventListener('modalRoleRemove', removeHandler);
    overlay.remove();
    await renderSubjects();
    await showInlineRolePicker(subj);
  };

  document.getElementById('btnModalSubjCancel').onclick = () => {
    document.removeEventListener('modalRoleRemove', removeHandler);
    overlay.remove();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.removeEventListener('modalRoleRemove', removeHandler);
      overlay.remove();
    }
  };
}

async function openNewSubjectForMagistrate(phaseIdx) {
  await _loadAllLists();
  const _modalRoles = [{ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '', citta: '' }];

  function renderModalRoles() {
    const container = document.getElementById('modalMagRolesContainer');
    if (!container) return;
    container.innerHTML = _modalRoles.map((r, idx) => {
      const currentLabel = _getCurrentRoleLabel(r);
      const catLabel = r.categoryId ? _labelFor(_allCategories.find(c => c.id === r.categoryId)) : '—';
      const subcatLabel = r.subcategoryId ? _labelFor(_allSubcategories.find(s => s.id === r.subcategoryId)) : '—';
      const roleLabel = r.roleId ? _labelFor(_allRoles.find(rl => rl.id === r.roleId)) : '—';
      return `
      <div class="repeatable-group">
        <div class="repeatable-group-header">
          <span class="repeatable-group-num">#${idx + 1}</span>
          <button class="btn btn-xs btn-danger" onclick="document.dispatchEvent(new CustomEvent('modalMagRoleRemove', {detail:${idx}}))">${t('removeRole')}</button>
        </div>
        <div class="form-row form-row-5col">
          <div class="form-group form-group-fifth">
            <label>${t('startDate')} (IN)</label>
            <input type="date" data-modalmag-role-start="${idx}" value="${r.startDate || ''}">
          </div>
          <div class="form-group form-group-fifth">
            <label>${t('endDate')} (OUT)</label>
            <input type="date" data-modalmag-role-end="${idx}" value="${r.endDate || ''}">
          </div>
          <div class="form-group form-group-fifth autocomplete-wrap" style="flex:2 1 0">
            <label>${t('subjectRole')}</label>
            <input id="fModalMagRole_role_${idx}" value="${esc(currentLabel)}" autocomplete="off" placeholder="${t('searchRolePlaceholder')}">
            <div id="fModalMagRole_role_${idx}_suggestions" class="autocomplete-list"></div>
          </div>
          <div class="form-group form-group-fifth autocomplete-wrap">
            <label>${t('sede')}</label>
            <input id="fModalMagRole_citta_${idx}" value="${esc(r.citta || '')}" autocomplete="off" placeholder="${t('citta')}...">
            <div id="fModalMagRole_citta_${idx}_suggestions" class="autocomplete-list"></div>
          </div>
          <div class="form-group" style="flex:0 0 auto;align-self:flex-end">
            <button class="btn btn-xs" id="fModalMagRoleDetailsBtn_${idx}" onclick="toggleRoleDetails(${idx}, 'fModalMag')" type="button">${t('showCatDetails')}</button>
          </div>
        </div>
        <div id="fModalMagRoleDetails_${idx}" class="role-details-row" style="display:none">
          <div class="form-row">
            <div class="form-group form-group-third">
              <label>${t('category')}</label>
              <input readonly value="${esc(catLabel)}" class="input-readonly">
            </div>
            <div class="form-group form-group-third">
              <label>${t('subcategory')}</label>
              <input readonly value="${esc(subcatLabel)}" class="input-readonly">
            </div>
            <div class="form-group form-group-third">
              <label>${t('subjectRole')}</label>
              <input readonly value="${esc(roleLabel)}" class="input-readonly">
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-modalmag-role-start]').forEach(inp => {
      inp.onchange = function() { _modalRoles[parseInt(this.getAttribute('data-modalmag-role-start'))].startDate = this.value; };
    });
    container.querySelectorAll('[data-modalmag-role-end]').forEach(inp => {
      inp.onchange = function() { _modalRoles[parseInt(this.getAttribute('data-modalmag-role-end'))].endDate = this.value; };
    });
    _modalRoles.forEach((r, idx) => {
      setupRoleAutocomplete(`fModalMagRole_role_${idx}`, `fModalMagRole_role_${idx}_suggestions`, _modalRoles, idx, renderModalRoles);
      const cittaInput = document.getElementById(`fModalMagRole_citta_${idx}`);
      if (cittaInput) {
        cittaInput.onchange = function() { _modalRoles[idx].citta = this.value; };
        setupCittaAutocomplete(`fModalMagRole_citta_${idx}`, `fModalMagRole_citta_${idx}_suggestions`, {});
      }
    });
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content modal-large">
      <h3>${t('newSubjectInline')}</h3>
      <div class="form-row">
        <div class="form-group" style="flex:0 0 140px;position:relative">
          <label>${t('salutation')}</label>
          <input id="fModalMagSubjSalutation" autocomplete="off" data-testid="input-modal-mag-salutation">
          <div id="fModalMagSubjSalutationList" class="autocomplete-list" data-testid="list-modal-mag-salutation"></div>
        </div>
        <div class="form-group" style="flex:1;min-width:0">
          <label>${t('firstName')} *</label>
          <input id="fModalMagSubjFirst" required>
        </div>
        <div class="form-group" style="flex:1;min-width:0">
          <label>${t('lastName')} *</label>
          <input id="fModalMagSubjLast" required>
        </div>
        <div class="form-group" style="flex:0 0 160px;position:relative">
          <label>${t('origin')}</label>
          <input id="fModalMagSubjOrigin" autocomplete="off" data-testid="input-modal-mag-origin">
          <div id="fModalMagSubjOriginList" class="autocomplete-list" data-testid="list-modal-mag-origin"></div>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1">
          <label>${t('descrIt')}</label>
          <textarea id="fModalMagSubjDescrIt" rows="2"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
          ${_renderTransArrow('fModalMagSubjDescrIt','fModalMagSubjDescrEn','it','en')}
          ${_renderTransArrow('fModalMagSubjDescrEn','fModalMagSubjDescrIt','en','it')}
        </div>
        <div class="form-group" style="flex:1">
          <label>${t('descrEn')}</label>
          <textarea id="fModalMagSubjDescrEn" rows="2"></textarea>
        </div>
      </div>
      <div class="form-section-header">
        <h3>${t('rolesSection')}</h3>
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-primary" id="btnModalMagAddRole">${t('addRole')}</button>
        </div>
      </div>
      <div id="modalMagRolesContainer"></div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnModalMagSubjConfirm">${t('save')}</button>
        <button class="btn" id="btnModalMagSubjCancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderModalRoles();
  setupSalutationAutocomplete('fModalMagSubjSalutation', 'fModalMagSubjSalutationList');
  setupCittaAutocomplete('fModalMagSubjOrigin', 'fModalMagSubjOriginList', {}, { formatValue: c => c.comune + (c.provincia ? ' (' + c.provincia + ')' : '') });

  document.getElementById('btnModalMagAddRole').onclick = () => {
    _modalRoles.push({ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '', citta: '' });
    renderModalRoles();
  };

  const removeHandler = (e) => {
    _modalRoles.splice(e.detail, 1);
    if (_modalRoles.length === 0) _modalRoles.push({ categoryId: null, subcategoryId: null, roleId: null, startDate: '', endDate: '', citta: '' });
    renderModalRoles();
  };
  document.addEventListener('modalMagRoleRemove', removeHandler);

  document.getElementById('btnModalMagSubjConfirm').onclick = async () => {
    const firstName = document.getElementById('fModalMagSubjFirst').value.trim();
    const lastName = document.getElementById('fModalMagSubjLast').value.trim();
    if (!firstName || !lastName) {
      alert(t('firstNameLastNameRequired'));
      return;
    }
    const salutation = document.getElementById('fModalMagSubjSalutation').value.trim();
    const origin = document.getElementById('fModalMagSubjOrigin').value.trim();
    const descriptionIt = document.getElementById('fModalMagSubjDescrIt').value.trim();
    const descriptionEn = document.getElementById('fModalMagSubjDescrEn').value.trim();
    const roles = _modalRoles.filter(r => r.categoryId || r.subcategoryId || r.roleId);
    if (salutation) {
      const flat = _flatSalutationList();
      if (!flat.some(f => f.label.toLowerCase() === salutation.toLowerCase())) {
        const existing = await DB.getListItems('salutation');
        if (!existing.some(c => (c.labelIt || '').toLowerCase() === salutation.toLowerCase())) {
          await DB.addListItem('salutation', salutation, salutation, null);
        }
      }
    }
    const subj = await DB.createSubject({
      firstName, lastName, salutation, origin, descriptionIt, descriptionEn,
      categoryId: null, subcategoryId: null, roleId: null, description: '',
      roles: roles
    });
    document.removeEventListener('modalMagRoleRemove', removeHandler);
    overlay.remove();
    await renderSubjects();

    const magInput = document.getElementById(`phaseMag_${phaseIdx}`);
    if (magInput) {
      const magParts = [subj.salutation, subj.lastName, subj.firstName].filter(Boolean);
      magInput.value = magParts.join(' ');
      syncPhaseField(phaseIdx, 'magistratoPrincipale', magInput.value);
      syncPhaseField(phaseIdx, 'magistratoSubjectId', subj.id);
    }
  };

  document.getElementById('btnModalMagSubjCancel').onclick = () => {
    document.removeEventListener('modalMagRoleRemove', removeHandler);
    overlay.remove();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.removeEventListener('modalMagRoleRemove', removeHandler);
      overlay.remove();
    }
  };
}

async function ensureCaseLink(subjectId, proceedingId, role) {
  const proc = await DB.getProceeding(proceedingId);
  if (!proc || !proc.caseId) return;
  const caseLinks = await DB.getEntitySubjects('case', proc.caseId);
  const alreadyLinked = caseLinks.some(l => l.subjectId === subjectId);
  if (!alreadyLinked) {
    await DB.linkSubject({ entityType: 'case', entityId: proc.caseId, subjectId, role: role || '' });
  }
}

async function syncIndagatiLinks(proceedingId) {
  const existing = await DB.getEntitySubjects('proceeding', proceedingId);
  const magCodes = new Set(Object.values(PHASE_TO_MAGISTRATE_ROLE));
  magCodes.add('magistrato');
  const nonMagRoles = PROCEDURAL_ROLES.filter(r => !magCodes.has(r));
  const nonMagLabelsIt = nonMagRoles.map(r => (I18N.it['procRole_' + r] || r).toLowerCase());
  const nonMagLabelsEn = nonMagRoles.map(r => (I18N.en['procRole_' + r] || r).toLowerCase());
  const existingIndagati = existing.filter(l => {
    if (!l.role) return false;
    const rLower = l.role.toLowerCase();
    if (rLower.startsWith('indagato')) return true;
    return nonMagLabelsIt.some(p => rLower.startsWith(p)) || nonMagLabelsEn.some(p => rLower.startsWith(p));
  });
  const existingMap = {};
  for (const link of existingIndagati) existingMap[link.subjectId] = link;
  const newIds = state.indagati.map(i => i.subjectId);

  for (const link of existingIndagati) {
    if (!newIds.includes(link.subjectId)) {
      await DB.unlinkSubject(link.id);
    }
  }

  await _loadAllLists();
  function buildRoleStr(entry) {
    const procLabel = entry.procRole ? t('procRole_' + entry.procRole) : t('procRole_indagato');
    let qualStr = '';
    if (entry.role) {
      if (entry.role.roleId) { const rl = _allRoles.find(r => r.id === entry.role.roleId); if (rl) qualStr = _labelFor(rl); }
      else if (entry.role.subcategoryId) { const sub = _allSubcategories.find(s => s.id === entry.role.subcategoryId); if (sub) qualStr = _labelFor(sub); }
      else if (entry.role.categoryId) { const cat = _allCategories.find(c => c.id === entry.role.categoryId); if (cat) qualStr = _labelFor(cat); }
    }
    return qualStr ? `${procLabel} | ${t('asRole')} ${qualStr}` : procLabel;
  }

  for (const entry of state.indagati) {
    const roleStr = buildRoleStr(entry);
    const qualifica = entry.procRole || 'indagato';
    const dataQ = entry.dataQualifica || new Date().toISOString().slice(0, 10);
    const existingLink = existingMap[entry.subjectId];
    if (existingLink) {
      if (existingLink.role !== roleStr || existingLink.qualificaProcessuale !== qualifica) {
        await DB.unlinkSubject(existingLink.id);
        await DB.linkSubject({ entityType: 'proceeding', entityId: proceedingId, subjectId: entry.subjectId, role: roleStr, qualificaProcessuale: qualifica, dataQualifica: dataQ });
      }
    } else {
      await DB.linkSubject({ entityType: 'proceeding', entityId: proceedingId, subjectId: entry.subjectId, role: roleStr, qualificaProcessuale: qualifica, dataQualifica: dataQ });
      await ensureCaseLink(entry.subjectId, proceedingId, roleStr);
    }
  }
}

async function syncProceedingRoles(proceedingId, type) {
  const existingRoles = await DB.getProceedingRoles(proceedingId);

  if (type === 'penale') {
    const indagatiRoleCodes = ['indagato', 'imputato'];
    const existingIndagatiRoles = existingRoles.filter(r => indagatiRoleCodes.includes(r.roleCode));
    const existingIndagatiMap = {};
    for (const r of existingIndagatiRoles) existingIndagatiMap[r.subjectId] = r;

    const newIndagatiIds = state.indagati.map(i => i.subjectId);
    for (const r of existingIndagatiRoles) {
      if (!newIndagatiIds.includes(r.subjectId)) {
        await DB.removeProceedingRole(r.id);
      }
    }

    for (const entry of state.indagati) {
      const roleCode = entry.procRole || 'indagato';
      const existing = existingIndagatiMap[entry.subjectId];
      if (existing) {
        if (existing.roleCode !== roleCode) {
          await DB.updateProceedingRole(existing.id, { roleCode });
        }
      } else {
        const startDate = entry.dataQualifica || new Date().toISOString().slice(0, 10);
        await DB.addProceedingRole({
          proceedingId, subjectId: entry.subjectId, roleCode,
          startDate, endDate: '', roleStatus: 'active', notes: ''
        });
      }
    }
  }

  const phases = state.procPhases || [];
  const magRoleCodes = Object.values(PHASE_TO_MAGISTRATE_ROLE);
  magRoleCodes.push('magistrato');
  const existingMagRoles = existingRoles.filter(r => magRoleCodes.includes(r.roleCode));
  const existingMagMap = {};
  for (const r of existingMagRoles) {
    const key = r.subjectId + '_' + r.roleCode;
    existingMagMap[key] = r;
  }

  const neededMagRoles = {};
  for (const ph of phases) {
    if (!ph.magistratoPrincipale) continue;
    let subjectId = ph.magistratoSubjectId || null;

    if (!subjectId) {
      const inputNorm = ph.magistratoPrincipale.trim().replace(/\s+/g, ' ').toLowerCase();
      if (inputNorm.length >= 3) {
        const allSubjects = await DB.getSubjects();
        const found = allSubjects.find(s => {
          const fullA = ((s.lastName || '') + ' ' + (s.firstName || '')).trim().replace(/\s+/g, ' ').toLowerCase();
          const fullB = ((s.firstName || '') + ' ' + (s.lastName || '')).trim().replace(/\s+/g, ' ').toLowerCase();
          const sal = (s.salutation || '').trim().toLowerCase();
          const fullC = sal ? (sal + ' ' + fullA).replace(/\s+/g, ' ') : '';
          const fullD = sal ? (sal + ' ' + fullB).replace(/\s+/g, ' ') : '';
          return fullA === inputNorm || fullB === inputNorm || fullC === inputNorm || fullD === inputNorm;
        });
        if (found) {
          subjectId = found.id;
          ph.magistratoSubjectId = found.id;
        }
      }
    }

    if (!subjectId) continue;

    const roleCode = PHASE_TO_MAGISTRATE_ROLE[ph.tipo] || 'magistrato';
    const key = subjectId + '_' + roleCode;
    neededMagRoles[key] = { subjectId, roleCode, phaseType: ph.tipo };
  }

  const magSeenKeys = {};
  for (const r of existingMagRoles) {
    const key = r.subjectId + '_' + r.roleCode;
    if (!neededMagRoles[key] || magSeenKeys[key]) {
      await DB.removeProceedingRole(r.id);
    } else {
      magSeenKeys[key] = true;
    }
  }

  for (const key in neededMagRoles) {
    if (!magSeenKeys[key]) {
      const { subjectId, roleCode } = neededMagRoles[key];
      await DB.addProceedingRole({
        proceedingId, subjectId, roleCode,
        startDate: '', endDate: '', roleStatus: 'active', notes: ''
      });
    }
  }

  const hasProcuraPhase = phases.some(p => p.tipo === 'fase_procura');
  const vigChainKeys = ['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale'];
  const vigRoleCodes = ['responsabile_vigilanza', ...vigChainKeys];

  const existingVigRoles = existingRoles.filter(r => vigRoleCodes.includes(r.roleCode));

  const neededVigRoles = {};
  if (hasProcuraPhase && state._vigilanceSubjectIds) {
    for (const vKey of vigChainKeys) {
      const sid = state._vigilanceSubjectIds[vKey];
      if (sid) {
        const key = sid + '_' + vKey;
        neededVigRoles[key] = { subjectId: sid, roleCode: vKey };
      }
    }
  }

  const vigSeenKeys = {};
  for (const r of existingVigRoles) {
    const key = r.subjectId + '_' + r.roleCode;
    if (!neededVigRoles[key] || vigSeenKeys[key]) {
      await DB.removeProceedingRole(r.id);
    } else {
      vigSeenKeys[key] = true;
    }
  }
  for (const key in neededVigRoles) {
    if (!vigSeenKeys[key]) {
      const { subjectId, roleCode } = neededVigRoles[key];
      await DB.addProceedingRole({
        proceedingId, subjectId, roleCode,
        startDate: '', endDate: '', roleStatus: 'active', notes: ''
      });
    }
  }

  const existingEntityLinks = await DB.getEntitySubjects('proceeding', proceedingId);
  const _allManagedRoleCodes = [...magRoleCodes, ...vigRoleCodes];
  const _allManagedLabelsBoth = [];
  _allManagedRoleCodes.forEach(rc => {
    _allManagedLabelsBoth.push(tLang('procRole_' + rc, 'it'));
    _allManagedLabelsBoth.push(tLang('procRole_' + rc, 'en'));
  });

  const existingManagedEntityLinks = existingEntityLinks.filter(l => {
    if (!l.role) return false;
    return _allManagedLabelsBoth.some(label => l.role === label);
  });

  const allNeededRoles = { ...neededMagRoles };
  for (const key in neededVigRoles) {
    allNeededRoles[key] = neededVigRoles[key];
  }

  const neededSubjectRoleKeys = new Set();
  for (const key in allNeededRoles) neededSubjectRoleKeys.add(key);

  for (const link of existingManagedEntityLinks) {
    const linkRoleLabelIt = _allManagedLabelsBoth.find(lb => lb === link.role);
    if (!linkRoleLabelIt) continue;
    const matchedRoleCode = _allManagedRoleCodes.find(rc =>
      tLang('procRole_' + rc, 'it') === link.role || tLang('procRole_' + rc, 'en') === link.role
    );
    if (!matchedRoleCode) continue;
    const linkKey = link.subjectId + '_' + matchedRoleCode;
    if (!neededSubjectRoleKeys.has(linkKey)) {
      await DB.unlinkSubject(link.id);
    }
  }

  for (const key in allNeededRoles) {
    const { subjectId, roleCode } = allNeededRoles[key];
    const roleLabel = t('procRole_' + roleCode);
    const roleLabelIt = tLang('procRole_' + roleCode, 'it');
    const roleLabelEn = tLang('procRole_' + roleCode, 'en');
    const alreadyLinked = existingEntityLinks.some(l => l.subjectId === subjectId && l.role && (l.role === roleLabelIt || l.role === roleLabelEn));
    if (alreadyLinked) {
      const existing = existingEntityLinks.find(l => l.subjectId === subjectId && l.role && (l.role === roleLabelIt || l.role === roleLabelEn));
      if (existing && existing.role !== roleLabel) {
        await DB.unlinkSubject(existing.id);
        await DB.linkSubject({ entityType: 'proceeding', entityId: proceedingId, subjectId, role: roleLabel });
      }
    } else {
      await DB.linkSubject({ entityType: 'proceeding', entityId: proceedingId, subjectId, role: roleLabel });
    }
  }
}

async function saveProceeding(editId) {
  try {
  const phases = state.procPhases || [];
  const title = document.getElementById('fProcTitle').value.trim();
  const firstPhase = phases[0] || {};
  const rgNumber = firstPhase.numeroRegistro || '';
  const year = firstPhase.anno || '';
  if (!rgNumber || !year) {
    alert(t('rgNumber') + ' + ' + t('year') + ' required');
    return;
  }

  const type = document.getElementById('fProcType').value;
  const caseId = parseInt(document.getElementById('fProcCaseId').value);
  if (!type) { alert('Type required'); return; }
  if (isNaN(caseId)) { alert('Case ID missing'); return; }
  const origineProc = document.getElementById('fOrigineProc')?.value || '';
  const padreVal = document.getElementById('fProcPadre')?.value || '';
  if (origineProc === 'integrazione' && !padreVal) {
    alert(t('integrazionePadreRequired'));
    return;
  }
  const data = {
    title: title || `${rgNumber}/${year}`, type, caseId,
    rgType: '',
    rgNumber,
    year,
    grado: firstPhase.tipo || '',
    fase: document.getElementById('fProcFase')?.value || '',
    modelloProcura: '',
    parentProceedingId: document.getElementById('fProcPadre')?.value ? parseInt(document.getElementById('fProcPadre').value) : null,
    stato: document.getElementById('fProcStato')?.value?.trim() || '',
    regione: document.getElementById('fProcRegione')?.value?.trim() || '',
    provincia: document.getElementById('fProcProvincia')?.value?.trim() || '',
    citta: document.getElementById('fProcCitta')?.value?.trim() || '',
    luogoFatti: document.getElementById('fProcLuogoFatti')?.value?.trim() || '',
    status: _derivePenaleStatus(state.procPhases) || '',
    autoritaProcedente: _getF1Field('ufficio') || '',
    tribunale: _getF1GeoField('tribunale') || '',
    distrettoAppello: _getF1GeoField('corteAppello') || '',
    dataIscrizioneRuolo: _getF1Field('dataIscrizione') || '',
    vigilanceSubjects: state._vigilanceSubjectIds || {},
    specificData: { ...collectSpecificData(type), phases, events: state.procEvents || [] }
  };

  data.protocol = await _assignProtocol(caseId, data.dataIscrizioneRuolo, 'proceeding', editId || null);

  for (const ph of data.specificData.phases) {
    const autoId = 'auto_iscrizione_' + ph.id;
    const events = data.specificData.events;
    const existingIdx = events.findIndex(e => e.autoId === autoId);
    if (ph.dataIscrizione) {
      const uffProc = ph.ufficio ? ' (' + ph.ufficio + ')' : '';
      const evObj = { autoId, date: ph.dataIscrizione, title: t('iscrizioneRuoloEvento') + uffProc, magistrate: ph.magistratoPrincipale || '', description: '', phaseRef: ph.tipo || '' };
      if (existingIdx >= 0) {
        events[existingIdx] = { ...events[existingIdx], ...evObj };
      } else {
        events.push(evObj);
      }
    } else if (existingIdx >= 0) {
      events.splice(existingIdx, 1);
    }
  }

  let entityId;
  if (editId) {
    await DB.updateProceeding(editId, data);
    entityId = editId;
    state.selection = { type: 'proceeding', id: editId };
  } else {
    const p = await DB.createProceeding(data);
    entityId = p.id;
    state.selection = { type: 'proceeding', id: p.id };
    state.expanded['case_' + caseId] = true;
    state.expanded['proceeding_' + p.id] = true;
  }

  if (type === 'penale') {
    await syncIndagatiLinks(entityId);
  }
  await syncProceedingRoles(entityId, type);

  const _procHier = { caseId, proceedingId: entityId };
  for (const f of state.pendingFilesOrigin.it) await storeFileForEntity(f, 'proceeding_origin', entityId, 'it', _procHier);
  for (const f of state.pendingFilesOrigin.en) await storeFileForEntity(f, 'proceeding_origin', entityId, 'en', _procHier);

  state.pendingFiles = { it: [], en: [] };
  state.pendingFilesOrigin = { it: [], en: [] };
  state.openForm = null;
  await renderAll();
  showLinkedSection('proceeding', entityId);
  } catch (e) {
    console.error('saveProceeding error:', e);
    alert('Errore salvataggio: ' + e.message);
  }
}

/* ========== DOSSIER / ACT FORMS (unchanged structure) ========== */
async function showDossierForm(proceedingId, editId) {
  const isEdit = !!editId;
  const existing = isEdit ? await DB.getDossier(editId) : null;
  const existingFiles = isEdit ? await DB.getEntityFiles('dossier', editId) : [];
  const existingFilesIt = existingFiles.filter(f => f.lang === 'it');
  const existingFilesEn = existingFiles.filter(f => f.lang === 'en');

  const panel = document.getElementById('formView');
  panel.innerHTML = `
    <div class="form-panel">
      <h2>${t(isEdit ? 'editDossier' : 'newDossier')}</h2>
      <input type="hidden" id="fDossProcId" value="${proceedingId || existing?.proceedingId || ''}">
      <div class="form-group">
        <label>${t('dossierTitle')}</label>
        <input id="fDossTitle" value="${esc(existing?.title || '')}" required>
      </div>
      ${fileUploadZones(existingFilesIt, existingFilesEn)}
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveDossier(${editId || 'null'})">${t('save')}</button>
        <button class="btn" onclick="cancelForm()">${t('cancel')}</button>
      </div>
    </div>
  `;
}

async function saveDossier(editId) {
  const title = document.getElementById('fDossTitle').value.trim();
  if (!title) { document.getElementById('fDossTitle').focus(); return; }

  if (!editId && state.pendingFiles.it.length === 0) {
    alert(t('fileItRequired'));
    return;
  }
  if (editId && state.pendingFiles.it.length === 0) {
    const existingIt = await DB.getEntityFile('dossier', editId, 'it');
    if (!existingIt) {
      alert(t('fileItRequired'));
      return;
    }
  }

  const proceedingId = parseInt(document.getElementById('fDossProcId').value);
  const data = { title, proceedingId };

  let entityId;
  if (editId) {
    await DB.updateDossier(editId, data);
    entityId = editId;
    state.selection = { type: 'dossier', id: editId };
  } else {
    const d = await DB.createDossier(data);
    entityId = d.id;
    state.selection = { type: 'dossier', id: d.id };
    state.expanded['proceeding_' + proceedingId] = true;
    state.expanded['dossier_' + d.id] = true;
  }

  const _dossProc = await DB.getProceeding(proceedingId);
  const _dossHier = { caseId: _dossProc ? _dossProc.caseId : null, proceedingId, dossierId: entityId };
  for (const f of state.pendingFiles.it) await storeFileForEntity(f, 'dossier', entityId, 'it', _dossHier);
  for (const f of state.pendingFiles.en) await storeFileForEntity(f, 'dossier', entityId, 'en', _dossHier);

  state.pendingFiles = { it: [], en: [] };
  state.openForm = null;
  await renderAll();
}

async function showActForm(dossierId, editId) {
  const isEdit = !!editId;
  const existing = isEdit ? await DB.getAct(editId) : null;
  const existingFiles = isEdit ? await DB.getEntityFiles('act', editId) : [];
  const existingFilesIt = existingFiles.filter(f => f.lang === 'it');
  const existingFilesEn = existingFiles.filter(f => f.lang === 'en');
  const effectiveDossierId = dossierId || existing?.dossierId;

  let allFacts = [];
  if (effectiveDossierId) {
    allFacts = await DB.getFactsByDossier(effectiveDossierId);
  }
  const positionOptions = ['afferma', 'nega', 'omette', 'travisa', 'non_pronuncia'];

  let existingLinkedFacts = [];
  let existingLinkedFactsHtml = '';
  let existingActProofsHtml = '';
  if (isEdit) {
    const actRels = await DB.getActFactRelations(editId);
    existingLinkedFacts = actRels.filter(r => r.fact);
    existingLinkedFactsHtml = existingLinkedFacts.length > 0 ? existingLinkedFacts.map(rel => {
      const f = rel.fact;
      const posLabel = rel.posizioneAtto ? tFactPosition(rel.posizioneAtto) : '-';
      return `<div class="proof-link-item">
        <span>${esc(f.title)}</span>
        <span class="tree-badge tree-badge-neutral" style="font-size:10px">${posLabel}</span>
      </div>`;
    }).join('') : '';
    const allActProofs = [];
    for (const rel of existingLinkedFacts) {
      const proofs = await DB.getProofs(rel.factId);
      allActProofs.push(...proofs);
    }
    existingActProofsHtml = allActProofs.length > 0 ? allActProofs.map(pr => {
      const relLabel = tProofRelType(pr.relationType || 'confirms');
      const relCls = pr.relationType === 'confirms' ? 'tree-badge-confirm' : pr.relationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
      return `<div class="proof-link-item">
        <span class="tree-badge ${relCls}" style="font-size:10px">${relLabel}</span>
        <span>${esc(proofTitle(pr))}</span>
      </div>`;
    }).join('') : '';
  }

  const tabBadges = {
    atto: `<span class="tree-badge tree-badge-act-type">${t('actBadge')}</span>`,
    fatto: `<span class="tree-badge tree-badge-fact-type">${t('factBadge')}</span>`,
    prova: `<span class="tree-badge tree-badge-proof-type">${t('proofBadge')}</span>`
  };
  const tabContents = {
    atto: `<div style="display:flex;gap:12px">
          <div class="form-group" style="flex:1">
            <label>${t('actTitle')} (IT)</label>
            <input id="fActTitle" value="${esc(existing?.title || '')}" required>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
            ${_renderTransArrow('fActTitle','fActTitleEN','it','en')}
            ${_renderTransArrow('fActTitleEN','fActTitle','en','it')}
          </div>
          <div class="form-group" style="flex:1">
            <label>${t('actTitle')} (EN)</label>
            <input id="fActTitleEN" value="${esc(existing?.titleEN || '')}">
          </div>
        </div>
        <div class="form-group">
          <label>${t('actDate')}</label>
          <input type="date" id="fActDate" value="${esc(existing?.actDate || '')}" data-testid="input-act-date">
        </div>
        ${_buildActTypeSubtypeSelects('fAct', existing?.type || '', existing?.subtype || '')}
        ${fileUploadZones(existingFilesIt, existingFilesEn)}`,
    fatto: `${isEdit ? `
        <fieldset class="form-fieldset">
          <legend>${t('linkedFacts')}</legend>
          <div class="proof-links-list">${existingLinkedFactsHtml || '<p class="hint">' + t('noLinkedFacts') + '</p>'}</div>
        </fieldset>` : ''}
        ${allFacts.length > 0 ? `
        <fieldset class="form-fieldset">
          <legend>${t('actLinkFactOnCreate')}</legend>
          <div class="form-group">
            <label>${t('factSelectAct')}</label>
            <select id="fActLinkFact" data-testid="select-act-link-fact">
              <option value="">${t('factNoneSelected')}</option>
              ${allFacts.map(f => `<option value="${f.id}">${esc(f.title)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="fActLinkPosGroup" style="display:none">
            <label>${t('factActPosition')}</label>
            <select id="fActLinkPos" data-testid="select-act-link-position">
              ${positionOptions.map(v => `<option value="${v}">${tFactPosition(v)}</option>`).join('')}
            </select>
          </div>
        </fieldset>
        ` : `<p class="hint" style="font-size:12px">${t('actNoFactsAvailable')}</p>`}`,
    prova: `${isEdit ? `
        <fieldset class="form-fieldset">
          <legend>${t('linkedProofs')}</legend>
          <div class="proof-links-list">${existingActProofsHtml || '<p class="hint">' + t('noLinkedProofs') + '</p>'}</div>
          <div style="margin-top:8px"><button class="btn btn-primary btn-sm" id="btnActManageProofs" data-testid="button-act-manage-proofs">${t('manageProofs')}</button></div>
        </fieldset>` : `<p class="hint">${t('formProofHint')}</p>`}`
  };
  const formTabIds = { atto: 'formTabAtto', fatto: 'formTabFatto', prova: 'formTabProva' };

  const orderedTabs = buildOrderedTabs('act', ['atto', 'fatto', 'prova'], (tabId, idx) => {
    const isFirst = idx === 0;
    return `<button class="detail-tab${isFirst ? ' active' : ''}" onclick="switchFormTab('${tabId}')" data-testid="form-tab-${tabId}">${tabBadges[tabId]}</button>`;
  });
  const orderedContents = buildOrderedTabs('act', ['atto', 'fatto', 'prova'], (tabId, idx) => {
    const isFirst = idx === 0;
    return `<div class="detail-tab-content" id="${formTabIds[tabId]}" style="${isFirst ? '' : 'display:none'}">${tabContents[tabId]}</div>`;
  });

  const panel = document.getElementById('formView');
  panel.innerHTML = `
    <div class="form-panel">
      <h2>${t(isEdit ? 'editAct' : 'newAct')}</h2>
      <input type="hidden" id="fActDossId" value="${effectiveDossierId || ''}">
      <div class="detail-tabs">${orderedTabs}</div>
      ${orderedContents}
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveAct(${editId || 'null'})">${t('save')}</button>
        <button class="btn" onclick="cancelForm()">${t('cancel')}</button>
      </div>
    </div>
  `;

  const linkFactSelect = document.getElementById('fActLinkFact');
  if (linkFactSelect) {
    linkFactSelect.addEventListener('change', () => {
      const posGroup = document.getElementById('fActLinkPosGroup');
      if (posGroup) posGroup.style.display = linkFactSelect.value ? 'block' : 'none';
    });
  }
  const btnActProofs = document.getElementById('btnActManageProofs');
  if (btnActProofs && isEdit) {
    btnActProofs.onclick = async () => {
      const rels = await DB.getActFactRelations(editId);
      const linkedFacts = rels.filter(r => r.fact).map(r => r.fact);
      if (linkedFacts.length === 0) {
        alert(t('noLinkedFacts'));
        return;
      }
      if (linkedFacts.length === 1) {
        await openManageProofsModal(linkedFacts[0].id);
      } else {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.innerHTML = `
          <h3>${t('manageProofs')}</h3>
          <p class="hint" style="margin-bottom:12px">${t('linkedFacts')}</p>
          ${linkedFacts.map(f => `<button class="btn btn-sm" style="display:block;margin-bottom:6px;width:100%" data-factid="${f.id}">${esc(f.title)}</button>`).join('')}
          <div class="form-actions" style="margin-top:12px"><button class="btn" id="btnPickFactClose">${t('close')}</button></div>
        `;
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        content.querySelectorAll('[data-factid]').forEach(btn => {
          btn.onclick = async () => { overlay.remove(); await openManageProofsModal(parseInt(btn.dataset.factid)); };
        });
        content.querySelector('#btnPickFactClose').onclick = () => overlay.remove();
      }
    };
  }
  makeTabsDraggable(panel, 'act');
}

async function saveAct(editId) {
  const title = document.getElementById('fActTitle').value.trim();
  if (!title) { document.getElementById('fActTitle').focus(); return; }

  if (!editId && state.pendingFiles.it.length === 0) {
    alert(t('fileItRequired'));
    return;
  }
  if (editId && state.pendingFiles.it.length === 0) {
    const existingIt = await DB.getEntityFile('act', editId, 'it');
    if (!existingIt) {
      alert(t('fileItRequired'));
      return;
    }
  }

  const dossierId = parseInt(document.getElementById('fActDossId').value);
  const actDate = document.getElementById('fActDate')?.value || '';
  const titleEN = (document.getElementById('fActTitleEN')?.value || '').trim();
  const data = {
    title,
    titleEN,
    type: document.getElementById('fActType').value,
    subtype: document.getElementById('fActSubtype')?.value || '',
    actDate,
    dossierId
  };

  const dossier = await DB.getDossier(dossierId);
  if (dossier) {
    const proc = await DB.getProceeding(dossier.proceedingId);
    if (proc) {
      data.protocol = await _assignProtocol(proc.caseId, actDate, 'act', editId || null);
    }
  }

  let entityId;
  if (editId) {
    await DB.updateAct(editId, data);
    entityId = editId;
    state.selection = { type: 'act', id: editId };
  } else {
    const a = await DB.createAct(data);
    entityId = a.id;
    state.selection = { type: 'act', id: a.id };
    state.expanded['dossier_' + dossierId] = true;
  }

  const linkFactEl = document.getElementById('fActLinkFact');
  if (linkFactEl && linkFactEl.value) {
    const factId = parseInt(linkFactEl.value);
    const posEl = document.getElementById('fActLinkPos');
    const pos = posEl ? posEl.value : 'afferma';
    await DB.createFactActRelation({ factId, actId: entityId, posizioneAtto: pos });
  }

  const _actHier = await _resolveFileHierarchy('act', dossierId);
  for (const f of state.pendingFiles.it) await storeFileForEntity(f, 'act', entityId, 'it', _actHier);
  for (const f of state.pendingFiles.en) await storeFileForEntity(f, 'act', entityId, 'en', _actHier);

  state.pendingFiles = { it: [], en: [] };
  state.openForm = null;
  await renderAll();
}

/* ========== FACT FORM ========== */
async function showFactForm(dossierId, editId) {
  const isEdit = !!editId;
  const existing = isEdit ? await DB.getFact(editId) : null;
  const effectiveDossierId = isEdit ? existing.dossierId : dossierId;

  let existingCircumstancesHtml = '';
  let existingViolationsHtml = '';
  let existingLinkedActsHtml = '';
  let existingProofsHtml = '';
  if (isEdit) {
    const circumstances = await DB.getCircumstances(editId);
    existingCircumstancesHtml = circumstances.length > 0 ? circumstances.map(c => {
      const typeLabel = t('circumstance' + c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1));
      return `<div class="proof-link-item">
        <span class="tree-badge tree-badge-neutral" style="font-size:10px">${typeLabel}</span>
        <span>${esc(c.title || c.descrizione || '')}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs" onclick="openCircumstanceModal(${editId}, ${c.id})">${t('edit')}</button>
          <button class="btn btn-xs btn-danger" onclick="deleteCircumstance(${c.id}, ${editId})">${t('deleteCircumstance')}</button>
        </div>
      </div>`;
    }).join('') : `<p class="hint">${t('noCircumstances')}</p>`;

    const violations = await DB.getViolationsByFact(editId);
    if (violations.length > 0) {
      const vNodoPromises = violations.map(v => NormDB.getNodo(v.normaId));
      const vNodos = await Promise.all(vNodoPromises);
      const vFontePromises = vNodos.map(n => n ? _getFonteInfo(n.id_fonte) : Promise.resolve({ short: '?', css: '', name: '' }));
      const vFonteInfos = await Promise.all(vFontePromises);
      existingViolationsHtml = violations.map((v, i) => `
        <div class="violation-item" data-testid="fact-violation-item-${v.normaId}">
          <div class="violation-item-header">
            ${_fonteBadgeHtml(vFonteInfos[i])}
            <span class="tree-badge tree-badge-neutral">${esc(v.normaCode || '')}</span>
            <span>${esc(v.normaTitle || '')}</span>
            <button class="btn btn-xs btn-details" onclick="_toggleLinkedViolationPreview(${v.normaId})" data-testid="btn-details-fact-violation-${v.id}">${t('normDetails')}</button>
            <button class="btn btn-xs btn-danger" onclick="_deleteFactViolation(${v.id}, ${editId})" data-testid="remove-fact-violation-${v.id}">${t('removeViolation')}</button>
          </div>
          ${v.description ? `<div class="hint" style="font-size:11px;margin-top:2px;margin-left:24px">${esc(v.description)}</div>` : ''}
        </div>`).join('');
    }

    const rels = await DB.getFactActRelations(editId);
    existingLinkedActsHtml = rels.length > 0 ? rels.map(rel => {
      const a = rel.act;
      if (!a) return '';
      return `<div class="proof-link-item" style="display:flex;align-items:center;justify-content:space-between">
        ${_actPosSelect(rel.id, rel.posizioneAtto || 'afferma', editId, false)}
        <span style="flex:1">${esc(a.title)}</span>
        <div style="display:flex;gap:4px;margin-left:8px">
          <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="openViewActModal(${a.id}, '${rel.posizioneAtto || 'afferma'}')" data-testid="button-view-act-${a.id}">${t('viewAct')}</button>
          <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="_unlinkActFromForm(${rel.id}, ${editId})" data-testid="button-unlink-act-${rel.id}">${t('unlink')}</button>
        </div>
      </div>`;
    }).join('') : '';

    const proofs = await DB.getProofs(editId);
    existingProofsHtml = proofs.length > 0 ? proofs.map(pr => {
      return `<div class="proof-link-item" style="display:flex;align-items:center;justify-content:space-between">
        ${_proofRelTypeSelect(pr._relationId, pr.relationType || 'confirms', editId, false)}
        <span style="flex:1">${esc(proofTitle(pr))}</span>
        <div style="display:flex;gap:4px;margin-left:8px">
          <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="openViewProofModal(${pr.id}, '${pr.relationType || 'confirms'}')" data-testid="button-view-proof-${pr.id}">${t('viewProof')}</button>
          <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="_unlinkProofFromForm(${pr.id}, ${editId})" data-testid="button-unlink-proof-${pr.id}">${t('unlink')}</button>
        </div>
      </div>`;
    }).join('') : '';
  }

  const tabBadges = {
    fatto: `<span class="tree-badge tree-badge-fact-type">${t('factBadge')}</span>`,
    atto: `<span class="tree-badge tree-badge-act-type">${t('actBadge')}</span>`,
    prova: `<span class="tree-badge tree-badge-proof-type">${t('proofBadge')}</span>`,
    violazioni: `<span class="tree-badge tree-badge-neutral">${t('violationsTab')}</span>`
  };
  const tabContents = {
    fatto: `<fieldset class="form-fieldset">
          <legend>${t('factSectionId')}</legend>
          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>${t('factTitle')} (IT)</label>
              <input id="fFactTitle" value="${esc(existing?.title || '')}" required data-testid="input-fact-title">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
              ${_renderTransArrow('fFactTitle','fFactTitleEN','it','en')}
              ${_renderTransArrow('fFactTitleEN','fFactTitle','en','it')}
            </div>
            <div class="form-group" style="flex:1">
              <label>${t('factTitle')} (EN)</label>
              <input id="fFactTitleEN" value="${esc(existing?.titleEN || '')}" data-testid="input-fact-title-en">
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>${t('factDescription')} (IT)</label>
              <textarea id="fFactDescr" rows="3" data-testid="input-fact-description">${esc(existing?.description || '')}</textarea>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
              ${_renderTransArrow('fFactDescr','fFactDescrEN','it','en')}
              ${_renderTransArrow('fFactDescrEN','fFactDescr','en','it')}
            </div>
            <div class="form-group" style="flex:1">
              <label>${t('factDescription')} (EN)</label>
              <textarea id="fFactDescrEN" rows="3" data-testid="input-fact-description-en">${esc(existing?.descriptionEN || '')}</textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>${t('factDate')}</label>
              <input type="date" id="fFactDate" value="${esc(existing?.factDate || '')}" data-testid="input-fact-date">
            </div>
            <div class="form-group" style="max-width:120px">
              <label>${t('factTime')}</label>
              <input type="time" id="fFactTime" value="${esc(existing?.factTime || '')}" data-testid="input-fact-time">
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div class="form-group autocomplete-wrap" style="flex:1;position:relative">
              <label>${t('factPlace')} (IT)</label>
              <input id="fFactPlace" value="${esc(existing?.place || '')}" autocomplete="off" data-testid="input-fact-place">
              <div id="fFactPlaceSuggestions" class="autocomplete-list"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
              ${_renderTransArrow('fFactPlace','fFactPlaceEN','it','en')}
              ${_renderTransArrow('fFactPlaceEN','fFactPlace','en','it')}
            </div>
            <div class="form-group" style="flex:1">
              <label>${t('factPlace')} (EN)</label>
              <input id="fFactPlaceEN" value="${esc(existing?.placeEN || '')}" data-testid="input-fact-place-en">
            </div>
          </div>
        </fieldset>
        ${isEdit ? `
        <fieldset class="form-fieldset">
          <legend>${t('factSectionCircumstances')}</legend>
          <div style="margin-bottom:8px">
            <button class="btn btn-xs" onclick="openCircumstanceModal(${editId})">${t('addCircumstance')}</button>
          </div>
          <div class="proof-links-list" data-circ-list="1">${existingCircumstancesHtml}</div>
        </fieldset>
        ` : ''}`,
    atto: `${isEdit ? `
        <fieldset class="form-fieldset">
          <legend>${t('linkedActs')}</legend>
          <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
            <div class="autocomplete-wrap" style="flex:1;position:relative;display:flex;align-items:center">
              <input id="factActSearchInput" placeholder="${t('searchActPlaceholder')}" autocomplete="off" style="flex:1" data-testid="input-fact-act-search">
              <button type="button" class="btn btn-xs" id="btnFactActToggle" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:2px 4px;font-size:10px;line-height:1" data-testid="button-fact-act-toggle">▼</button>
              <div id="factActSearchResults" class="autocomplete-list"></div>
            </div>
            <button class="btn btn-sm btn-primary" id="btnFactLinkAct" disabled data-testid="button-fact-link-act">${t('linkNewAct')}</button>
          </div>
          <div id="factLinkedActsList" class="proof-links-list">${existingLinkedActsHtml || '<p class="hint">' + t('noLinkedActs') + '</p>'}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" id="btnFactCreateAct" data-testid="button-fact-create-act">${t('createNewAct')}</button>
            <button class="btn btn-sm" onclick="openManageActsModal(${editId})" data-testid="button-manage-acts">${t('manageActs')}</button>
          </div>
        </fieldset>` : `<p class="hint">${t('formActHint')}</p>`}`,
    prova: `${isEdit ? `
        <fieldset class="form-fieldset">
          <legend>${t('linkedProofs')}</legend>
          <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
            <div class="autocomplete-wrap" style="flex:1;position:relative;display:flex;align-items:center">
              <input id="factProofSearchInput" placeholder="${t('searchProofPlaceholder')}" autocomplete="off" style="flex:1" data-testid="input-fact-proof-search">
              <button type="button" class="btn btn-xs" id="btnFactProofToggle" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:2px 4px;font-size:10px;line-height:1" data-testid="button-fact-proof-toggle">▼</button>
              <div id="factProofSearchResults" class="autocomplete-list"></div>
            </div>
            <button class="btn btn-sm btn-primary" id="btnFactLinkProof" disabled data-testid="button-fact-link-proof">${t('linkNewProof')}</button>
          </div>
          <div id="factLinkedProofsList" class="proof-links-list">${existingProofsHtml || '<p class="hint">' + t('noLinkedProofs') + '</p>'}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" id="btnFactCreateProof" data-testid="button-fact-create-proof">${t('createNewProof')}</button>
            <button class="btn btn-sm" onclick="openManageProofsModal(${editId})" data-testid="button-manage-proofs">${t('manageProofs')}</button>
          </div>
        </fieldset>` : `<p class="hint">${t('formProofHint')}</p>`}`,
    violazioni: `${isEdit ? `
        <div class="form-group">
          <label>${t('violationSearch')}</label>
          <input id="fFactViolationSearch" placeholder="${t('violationSearchPlaceholder')}" data-testid="input-fact-violation-search" autocomplete="off">
          <div id="factViolationResults" class="violation-search-results" style="display:none"></div>
        </div>
        <div id="factViolationsList" class="violation-list" data-testid="fact-violation-list">
          ${existingViolationsHtml || '<p class="hint">' + t('noViolations') + '</p>'}
        </div>` : `<p class="hint">${t('formViolationHint')}</p>`}`
  };
  const formTabIds = { fatto: 'formTabFatto', atto: 'formTabAtto', prova: 'formTabProva', violazioni: 'formTabViolazioni' };

  const orderedTabs = buildOrderedTabs('fact', ['fatto', 'atto', 'prova'], (tabId, idx) => {
    const isFirst = idx === 0;
    return `<button class="detail-tab${isFirst ? ' active' : ''}" onclick="switchFormTab('${tabId}')" data-testid="form-tab-${tabId}">${tabBadges[tabId]}</button>`;
  });
  const violazioniTab = `<button class="detail-tab" onclick="switchFormTab('violazioni')" data-testid="form-tab-violazioni">${tabBadges.violazioni}</button>`;
  const orderedContents = buildOrderedTabs('fact', ['fatto', 'atto', 'prova'], (tabId, idx) => {
    const isFirst = idx === 0;
    return `<div class="detail-tab-content" id="${formTabIds[tabId]}" style="${isFirst ? '' : 'display:none'}">${tabContents[tabId]}</div>`;
  });
  const violazioniContent = `<div class="detail-tab-content" id="formTabViolazioni" style="display:none">${tabContents.violazioni}</div>`;

  const panel = document.getElementById('formView');
  panel.innerHTML = `
    <div class="form-panel">
      <h2>${t(isEdit ? 'editFact' : 'newFact')}</h2>
      <input type="hidden" id="fFactDossierId" value="${effectiveDossierId || ''}">
      <div class="detail-tabs">${orderedTabs}${violazioniTab}</div>
      ${orderedContents}
      ${violazioniContent}
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveFact(${editId || 'null'})" data-testid="button-save-fact">${t('save')}</button>
        <button class="btn" onclick="cancelForm()">${t('cancel')}</button>
      </div>
    </div>
  `;

  const _factRefresh = async () => { await _refreshFactFormLinkedLists(editId || null); };
  if (effectiveDossierId) {
    _initActSearchLink('factActSearchInput', 'factActSearchResults', 'btnFactLinkAct', 'btnFactActToggle', async () => effectiveDossierId, async () => editId || null, _factRefresh);
    const btnFactCreateAct = document.getElementById('btnFactCreateAct');
    if (btnFactCreateAct) {
      btnFactCreateAct.onclick = () => _openCreateActModal(effectiveDossierId, editId || null, _factRefresh);
    }
  }
  if (editId) {
    const btnFactCreateProof = document.getElementById('btnFactCreateProof');
    if (btnFactCreateProof) {
      btnFactCreateProof.onclick = () => _openCreateProofModal(editId, _factRefresh);
    }
    _initProofSearchLink('factProofSearchInput', 'factProofSearchResults', 'btnFactLinkProof', 'btnFactProofToggle', async () => editId, _factRefresh);
    _initFactViolationSearch(editId);
  }
  setupCittaAutocomplete('fFactPlace', 'fFactPlaceSuggestions', {}, {
    formatValue: (c) => c.comune + (c.provincia ? ' (' + c.provincia + ')' : '')
  });
  makeTabsDraggable(panel, 'fact');
}

async function saveFact(editId) {
  const title = document.getElementById('fFactTitle').value.trim();
  if (!title) { document.getElementById('fFactTitle').focus(); return; }

  const dossierId = parseInt(document.getElementById('fFactDossierId').value);
  const data = {
    title,
    titleEN: (document.getElementById('fFactTitleEN')?.value || '').trim(),
    description: document.getElementById('fFactDescr').value.trim(),
    descriptionEN: (document.getElementById('fFactDescrEN')?.value || '').trim(),
    factDate: document.getElementById('fFactDate').value,
    factTime: document.getElementById('fFactTime').value,
    place: document.getElementById('fFactPlace').value.trim(),
    placeEN: (document.getElementById('fFactPlaceEN')?.value || '').trim(),
    dossierId
  };

  const dossier = await DB.getDossier(dossierId);
  if (dossier) {
    const proc = await DB.getProceeding(dossier.proceedingId);
    if (proc) {
      data.protocol = await _assignProtocol(proc.caseId, data.factDate, 'fact', editId || null);
    }
  }

  let entityId;
  if (editId) {
    await DB.updateFact(editId, data);
    entityId = editId;
    state.selection = { type: 'fact', id: editId };
  } else {
    const f = await DB.createFact(data);
    entityId = f.id;
    state.selection = { type: 'fact', id: f.id };
    state.expanded['dossier_' + dossierId] = true;
  }

  state.openForm = null;
  await renderAll();
}

/* ========== ANALYSIS FORM (unified Fact + Act + Proof + Violations) ========== */
function showAnalysisContextModal(dossierId) {
  const saved = getSavedTabOrder('analysis');
  const defaultOrder = ['atto', 'fatto', 'prova', 'circostanza'];
  const initialOrder = saved && saved.length === 4 && defaultOrder.every(t => saved.includes(t)) ? saved : defaultOrder;

  const badgeMap = {
    circostanza: { cls: 'tree-badge-circ-type', label: 'circBadge' },
    fatto: { cls: 'tree-badge-fact-type', label: 'factBadge' },
    atto: { cls: 'tree-badge-act-type', label: 'actBadge' },
    prova: { cls: 'tree-badge-proof-type', label: 'proofBadge' }
  };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'analysisContextModal';
  overlay.innerHTML = `
    <div class="modal-content analysis-context-modal">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="margin:0">${t('analysisContextTitle')}</h3>
        <button class="btn btn-sm" onclick="document.getElementById('analysisContextModal').remove()" data-testid="btn-close-analysis-modal">&times;</button>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">${t('analysisContextQuestion')}</p>
      <div class="analysis-drag-list" id="analysisDragList">
        ${initialOrder.map(tabId => `
          <div class="analysis-drag-item" draggable="true" data-tab="${tabId}" data-testid="drag-item-${tabId}">
            <span class="analysis-drag-handle">&#9776;</span>
            <span class="tree-badge ${badgeMap[tabId].cls}" style="font-size:12px">${t(badgeMap[tabId].label)}</span>
            <span class="analysis-drag-label">${t(badgeMap[tabId].label)}</span>
          </div>
        `).join('')}
      </div>
      <div class="analysis-context-actions">
        <button class="btn" onclick="document.getElementById('analysisContextModal').remove()" data-testid="btn-cancel-analysis">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="_confirmAnalysisOrder(${dossierId})" data-testid="btn-confirm-analysis">${t('analysisConfirm')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const list = document.getElementById('analysisDragList');
  let dragSrc = null;
  list.querySelectorAll('.analysis-drag-item').forEach(item => {
    item.addEventListener('dragstart', function(e) {
      dragSrc = this;
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this !== dragSrc) this.classList.add('drag-over');
    });
    item.addEventListener('dragleave', function() {
      this.classList.remove('drag-over');
    });
    item.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      if (dragSrc && dragSrc !== this) {
        const items = Array.from(list.querySelectorAll('.analysis-drag-item'));
        const fromIdx = items.indexOf(dragSrc);
        const toIdx = items.indexOf(this);
        if (fromIdx < toIdx) {
          list.insertBefore(dragSrc, this.nextSibling);
        } else {
          list.insertBefore(dragSrc, this);
        }
      }
    });
    item.addEventListener('dragend', function() {
      this.classList.remove('dragging');
      list.querySelectorAll('.analysis-drag-item').forEach(i => i.classList.remove('drag-over'));
    });
  });
}

function _confirmAnalysisOrder(dossierId) {
  const list = document.getElementById('analysisDragList');
  const order = Array.from(list.querySelectorAll('.analysis-drag-item')).map(el => el.dataset.tab);
  saveTabOrder('analysis', order);
  state._analysisTabOrder = order;

  const modalContent = document.querySelector('#analysisContextModal .analysis-context-modal');
  if (!modalContent) return;
  modalContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">${t('addFact')}</h3>
      <button class="btn btn-sm" onclick="document.getElementById('analysisContextModal').remove()" data-testid="btn-close-event-title">&times;</button>
    </div>
    <div class="form-group">
      <label>${t('factTitle')} *</label>
      <input type="text" id="newEventTitle" autofocus data-testid="input-new-event-title" />
    </div>
    <div class="form-group">
      <label>${t('factDescription')}</label>
      <textarea id="newEventDescription" rows="3" data-testid="textarea-new-event-description"></textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label>${t('factDate')}</label>
        <input type="date" id="newEventDate" data-testid="input-new-event-date" />
      </div>
      <div class="form-group">
        <label>${t('factTime')}</label>
        <input type="time" id="newEventTime" data-testid="input-new-event-time" />
      </div>
    </div>
    <div class="form-group">
      <label>${t('factPlace')}</label>
      <input type="text" id="newEventPlace" data-testid="input-new-event-place" />
    </div>
    <div class="analysis-context-actions">
      <button class="btn" onclick="document.getElementById('analysisContextModal').remove()" data-testid="btn-cancel-event">${t('cancel')}</button>
      <button class="btn btn-primary" id="btnConfirmNewEvent" data-testid="btn-confirm-event">${t('save')}</button>
    </div>
  `;
  const inp = modalContent.querySelector('#newEventTitle');
  inp.focus();
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') modalContent.querySelector('#btnConfirmNewEvent').click(); });
  modalContent.querySelector('#btnConfirmNewEvent').onclick = async () => {
    const title = inp.value.trim();
    if (!title) { inp.focus(); return; }
    document.getElementById('analysisContextModal').remove();
    const columnOrder = state._analysisTabOrder || ['atto', 'fatto', 'prova', 'circostanza'];
    const newFact = await DB.createFact({
      dossierId,
      title,
      description: modalContent.querySelector('#newEventDescription').value.trim(),
      factDate: modalContent.querySelector('#newEventDate').value || null,
      factTime: modalContent.querySelector('#newEventTime').value || null,
      place: modalContent.querySelector('#newEventPlace').value.trim() || null,
      analysisContext: columnOrder[0],
      columnOrder: JSON.stringify(columnOrder)
    });
    state.selection = { type: 'fact', id: newFact.id };
    state.expanded['dossier_' + dossierId] = true;
    await renderAll();
    openFactAnalysisModal(newFact.id);
  };
}

const _FONTE_SHORT_NAMES = {
  101: { short: 'Cost.', css: 'fonte-cost' },
  102: { short: 'C.P.', css: 'fonte-penale' },
  103: { short: 'C.P.P.', css: 'fonte-proc-pen' },
  104: { short: 'C.C.', css: 'fonte-civile' },
  105: { short: 'C.P.C.', css: 'fonte-proc-civ' },
  201: { short: 'TFUE', css: 'fonte-ue' },
  202: { short: 'TUE', css: 'fonte-ue' },
  203: { short: 'CDFUE', css: 'fonte-ue' },
  301: { short: 'CEDU', css: 'fonte-cedu' },
  401: { short: 'ONU', css: 'fonte-int' },
  501: { short: 'CPI', css: 'fonte-int' },
};

if (!state._fontiCache) state._fontiCache = {};

async function _getFonteInfo(idFonte) {
  if (!idFonte) return { short: '?', css: '', name: '' };
  if (state._fontiCache[idFonte]) return state._fontiCache[idFonte];
  const known = _FONTE_SHORT_NAMES[idFonte];
  if (known) {
    const fonte = await NormDB.getFonte(idFonte);
    const info = { short: known.short, css: known.css, name: fonte ? (currentLang === 'en' && fonte.nome_en ? fonte.nome_en : fonte.nome) : known.short };
    state._fontiCache[idFonte] = info;
    return info;
  }
  const fonte = await NormDB.getFonte(idFonte);
  if (!fonte) { state._fontiCache[idFonte] = { short: '?', css: '', name: '?' }; return state._fontiCache[idFonte]; }
  const name = currentLang === 'en' && fonte.nome_en ? fonte.nome_en : fonte.nome;
  const short = name.length > 10 ? name.substring(0, 8) + '.' : name;
  const css = fonte.id_sistema === 1 ? '' : (fonte.id_sistema === 2 ? 'fonte-ue' : (fonte.id_sistema === 3 ? 'fonte-cedu' : 'fonte-int'));
  state._fontiCache[idFonte] = { short, css, name };
  return state._fontiCache[idFonte];
}

function _fonteBadgeHtml(fonteInfo) {
  return `<span class="violation-fonte-badge ${fonteInfo.css}" title="${esc(fonteInfo.name)}">${esc(fonteInfo.short)}</span>`;
}

async function _buildViolationNormPreview(normaId, addButtonHtml, factDate) {
  const nodo = await NormDB.getNodo(normaId);
  if (!nodo) return `<div class="violation-preview"><p class="hint">${t('noResults')}</p></div>`;

  const fonteInfo = await _getFonteInfo(nodo.id_fonte);
  const lang = currentLang;
  let html = '<div class="violation-preview">';

  const testoNorma = lang === 'en' ? (nodo.testo_en || nodo.testo_it || '') : (nodo.testo_it || nodo.testo_en || '');
  if (testoNorma) {
    html += `<div class="norm-preview-section"><h4>${t('normText')} — ${esc(fonteInfo.name)}</h4>`;
    html += `<div class="norm-text-content">${esc(testoNorma)}</div>`;
    html += '</div>';
  }

  const [metaPen, metaCiv, metaGar, metaInt, elementi] = await Promise.all([
    NormDB.getMetadatiPenali(normaId),
    NormDB.getMetadatiCivili(normaId),
    NormDB.getMetadatiGaranzia(normaId),
    NormDB.getMetadatiInternazionali(normaId),
    NormDB.getElementiReato(normaId)
  ]);

  if (metaPen) {
    html += `<div class="norm-preview-section"><h4>${t('normMetaPenale')}</h4><div class="norm-meta-grid">`;
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normTipoReato')}:</span> <span class="norm-meta-value">${metaPen.tipo_reato === 'delitto' ? t('normDelitto') : t('normContravvenzione')}</span></div>`;
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normProcedibilita')}:</span> <span class="norm-meta-value">${esc(metaPen.procedibilita || '')}</span></div>`;
    if (metaPen.categoria_delitto) {
      const catLabel = lang === 'en' && metaPen.categoria_delitto_en ? metaPen.categoria_delitto_en : metaPen.categoria_delitto;
      html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normCategoria')}:</span> <span class="norm-meta-value">${esc(catLabel)}</span></div>`;
    }
    if (metaPen.pena_max_anni > 0) {
      html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normPenaDetentiva')}:</span> <span class="norm-meta-value">${metaPen.pena_min_anni}–${metaPen.pena_max_anni} ${t('normAnni')}</span></div>`;
    }
    if (metaPen.multa_max > 0) {
      html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normMulta')}:</span> <span class="norm-meta-value">€${metaPen.multa_min.toLocaleString()}–€${metaPen.multa_max.toLocaleString()}</span></div>`;
    }
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normArrestoFlagranza')}:</span> <span class="norm-meta-value">${metaPen.arresto_flagranza ? t('normSi') : t('normNo')}</span></div>`;
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normArt407')}:</span> <span class="norm-meta-value">${metaPen.art_407_cpp ? t('normSi') : t('normNo')}</span></div>`;
    if (metaPen.reato_proprio) {
      html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normReatoProprio')}:</span> <span class="norm-meta-value">${t('normSi')}${metaPen.qualifica_richiesta ? ' (' + esc(metaPen.qualifica_richiesta) + ')' : ''}</span></div>`;
    }
    html += '</div></div>';

    const prescAnni = NormDB.calcolaPrescrizione(metaPen);
    html += `<div class="norm-prescrizione-section"><h4>${t('normPrescrizione')}</h4>`;
    if (metaPen.pena_max_anni >= 99) {
      html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-badge imprescriptible">${t('normImprescrittibile')}</span></div>`;
      html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normBaseNormativa')}:</span> Art. 157 co. 8 CP</div>`;
    } else if (prescAnni) {
      const prescMax = Math.ceil(prescAnni * 1.25);
      if (factDate) {
        const fd = new Date(factDate);
        if (!isNaN(fd.getTime())) {
          const dataOrd = new Date(fd); dataOrd.setFullYear(dataOrd.getFullYear() + prescAnni);
          const dataMax = new Date(fd); dataMax.setFullYear(dataMax.getFullYear() + prescMax);
          const now = new Date();
          const fmtDate = (d) => d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const ordExpired = dataOrd <= now;
          const maxExpired = dataMax <= now;
          const ordCls = ordExpired ? 'norm-prescrizione-expired' : 'norm-prescrizione-running';
          const maxCls = maxExpired ? 'norm-prescrizione-expired' : 'norm-prescrizione-running';
          const ordBadge = ordExpired
            ? `<span class="norm-prescrizione-badge expired">${t('normPrescrizioneScaduta')}</span>`
            : `<span class="norm-prescrizione-badge running">${t('normPrescrizioneInCorso')}</span>`;
          const maxBadge = maxExpired
            ? `<span class="norm-prescrizione-badge expired">${t('normPrescrizioneScaduta')}</span>`
            : `<span class="norm-prescrizione-badge running">${t('normPrescrizioneInCorso')}</span>`;
          html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normPrescrizioneOrdinaria')}:</span> <span class="norm-prescrizione-date ${ordCls}">${fmtDate(dataOrd)}</span> (${prescAnni} ${t('normPrescrizioneAnni')}) ${ordBadge}</div>`;
          html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normPrescrizioneMax')}:</span> <span class="norm-prescrizione-date ${maxCls}">${fmtDate(dataMax)}</span> (${prescMax} ${t('normPrescrizioneAnni')}) ${maxBadge}</div>`;
        } else {
          html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normPrescrizioneOrdinaria')}:</span> ${prescAnni} ${t('normPrescrizioneAnni')}</div>`;
          html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normPrescrizioneMax')}:</span> ${prescMax} ${t('normPrescrizioneAnni')}</div>`;
          html += `<div class="hint" style="font-size:10px;margin-top:2px">${t('normNoFactDate')}</div>`;
        }
      } else {
        html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normPrescrizioneOrdinaria')}:</span> ${prescAnni} ${t('normPrescrizioneAnni')}</div>`;
        html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normPrescrizioneMax')}:</span> ${prescMax} ${t('normPrescrizioneAnni')}</div>`;
        html += `<div class="hint" style="font-size:10px;margin-top:2px">${t('normNoFactDate')}</div>`;
      }
      html += `<div class="norm-prescrizione-row"><span class="norm-prescrizione-label">${t('normBaseNormativa')}:</span> Art. 157 co. 1 CP / Art. 161 co. 2 CP</div>`;
    }
    html += `<div class="norm-prescrizione-disclaimer">${t('normPrescrizioneDisclaimer')}</div>`;
    html += '</div>';
  }

  if (metaCiv) {
    html += `<div class="norm-preview-section"><h4>${t('normMetaCivile')}</h4><div class="norm-meta-grid">`;
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normTipoResponsabilita')}:</span> <span class="norm-meta-value">${esc(metaCiv.tipo_responsabilita || '')}</span></div>`;
    html += '</div></div>';
  }

  if (metaGar) {
    html += `<div class="norm-preview-section"><h4>${t('normMetaGaranzia')}</h4><div class="norm-meta-grid">`;
    if (metaGar.diritto_tutelato) {
      const dLabel = lang === 'en' && metaGar.diritto_tutelato_en ? metaGar.diritto_tutelato_en : metaGar.diritto_tutelato;
      html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normDirittoTutelato')}:</span> <span class="norm-meta-value">${esc(dLabel)}</span></div>`;
    }
    if (metaGar.obbligo_stato) {
      const oLabel = lang === 'en' && metaGar.obbligo_stato_en ? metaGar.obbligo_stato_en : metaGar.obbligo_stato;
      html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normObbligoStato')}:</span> <span class="norm-meta-value">${esc(oLabel)}</span></div>`;
    }
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normParametroLegittimita')}:</span> <span class="norm-meta-value">${metaGar.parametro_legittimita ? t('normSi') : t('normNo')}</span></div>`;
    html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normApplicabilitaDiretta')}:</span> <span class="norm-meta-value">${metaGar.applicabilita_diretta ? t('normSi') : t('normNo')}</span></div>`;
    html += '</div></div>';
  }

  if (metaInt) {
    html += `<div class="norm-preview-section"><h4>${t('normMetaInternazionale')}</h4><div class="norm-meta-grid">`;
    if (metaInt.tipo_crimine) html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normTipoCrimine')}:</span> <span class="norm-meta-value">${esc(metaInt.tipo_crimine)}</span></div>`;
    if (metaInt.competenza) html += `<div class="norm-meta-item"><span class="norm-meta-label">${t('normCompetenza')}:</span> <span class="norm-meta-value">${esc(metaInt.competenza)}</span></div>`;
    html += '</div></div>';
  }

  if (elementi && elementi.length > 0) {
    html += `<div class="norm-preview-section"><h4>${t('normElementiReato')}</h4>`;
    const catOrder = ['condotta', 'dolo', 'colpa', 'evento', 'oggetto_giuridico', 'soggetto_attivo', 'soggetto_passivo', 'circostanza_aggravante', 'circostanza_attenuante'];
    const catLabels = { condotta: t('normCondotta'), dolo: t('normDolo'), evento: t('normEvento'), oggetto_giuridico: t('normOggettoGiuridico') };
    const sorted = [...elementi].sort((a, b) => {
      const ia = catOrder.indexOf(a.categoria); const ib = catOrder.indexOf(b.categoria);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    for (const el of sorted) {
      const catLabel = catLabels[el.categoria] || (el.categoria || '').replace(/_/g, ' ');
      const desc = lang === 'en' && el.descrizione_en ? el.descrizione_en : (el.descrizione || '');
      html += `<div class="norm-element-item">
        <div class="norm-element-cat">${esc(catLabel)}</div>
        <div class="norm-element-desc">${esc(desc)}</div>
        <div class="norm-element-meta">
          <span>${el.obbligatorio ? t('normObbligatorio') : t('normFacoltativo')}</span>
          ${el.onere_prova ? `<span>${t('normOnereProva')}: ${esc(el.onere_prova)}</span>` : ''}
          ${el.tipo_prova_tipica ? `<span>${t('normTipoProva')}: ${esc(el.tipo_prova_tipica)}</span>` : ''}
        </div>
      </div>`;
    }
    html += '</div>';
  }

  if (addButtonHtml) {
    html += `<div class="norm-preview-actions">${addButtonHtml}</div>`;
  }
  html += '</div>';
  return html;
}

async function _searchViolationNorms(query) {
  const resultsDiv = document.getElementById('analysisViolationResults');
  if (!resultsDiv) return;
  if (!query || query.length < 2) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
    return;
  }
  const norms = await NormDB.searchNodi(query);
  if (!norms.length) {
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `<div class="violation-result-empty hint">${t('noResults')}</div>`;
    return;
  }
  resultsDiv.style.display = 'block';
  const lang = currentLang;
  state._violationSearchResults = {};
  const fontePromises = norms.slice(0, 20).map(n => _getFonteInfo(n.id_fonte));
  const fonteInfos = await Promise.all(fontePromises);
  resultsDiv.innerHTML = norms.slice(0, 20).map((n, i) => {
    const label = (lang === 'en' && n.rubrica_en) ? n.rubrica_en : (n.rubrica || '');
    const code = n.numero || '';
    state._violationSearchResults[n.id] = { normaId: n.id, normaCode: code, normaTitle: label };
    return `<div class="violation-result-item" onclick="_openNormPreviewModal(${n.id}, 'analysis', null)" data-testid="violation-result-${n.id}">
      ${_fonteBadgeHtml(fonteInfos[i])}
      <span class="violation-result-code">${esc(code)}</span>
      <span class="violation-result-label">${esc(label)}</span>
    </div>`;
  }).join('');
}

async function _openNormPreviewModal(normaId, context, factId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay norm-preview-overlay';
  overlay.style.zIndex = '1300';
  const modal = document.createElement('div');
  modal.className = 'modal-content norm-preview-modal';
  modal.innerHTML = `<div class="violation-preview"><p class="hint">...</p></div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  let addBtn = '';
  let factDate = null;
  if (context === 'analysis') {
    addBtn = `<button class="btn btn-sm btn-primary" onclick="_addViolationFromSearch(${normaId})" data-testid="btn-add-violation-${normaId}">${t('normAddViolation')}</button>`;
    const fdEl = document.getElementById('fFactDate');
    if (fdEl && fdEl.value) factDate = fdEl.value;
  } else if (context === 'fact' && factId) {
    addBtn = `<button class="btn btn-sm btn-primary" onclick="_addFactViolation(${normaId}, ${factId})" data-testid="btn-add-fact-violation-${normaId}">${t('normAddViolation')}</button>`;
    const fact = await DB.getFact(factId);
    if (fact) factDate = fact.factDate || fact.date || null;
  } else if (context === 'view') {
    if (state._detailContext && state._detailContext.startsWith('fact_')) {
      const fId = parseInt(state._detailContext.replace('fact_', ''));
      if (fId) { const fact = await DB.getFact(fId); if (fact) factDate = fact.factDate || fact.date || null; }
    }
  }
  const closeBtn = `<button class="btn btn-sm" onclick="this.closest('.modal-overlay').remove()" data-testid="btn-close-norm-preview">${t('close')}</button>`;
  const preview = await _buildViolationNormPreview(normaId, addBtn + closeBtn, factDate);
  modal.innerHTML = preview;
}

function _addViolationFromSearch(normaId) {
  const data = state._violationSearchResults && state._violationSearchResults[normaId];
  if (!data) return;
  if (state._analysisViolations.find(v => v.normaId === normaId)) return;
  state._analysisViolations.push({ normaId: data.normaId, normaCode: data.normaCode, normaTitle: data.normaTitle, description: '' });
  _renderAnalysisViolationsList();
  const searchInput = document.getElementById('fAnalysisViolationSearch');
  if (searchInput) searchInput.value = '';
  const resultsDiv = document.getElementById('analysisViolationResults');
  if (resultsDiv) { resultsDiv.style.display = 'none'; resultsDiv.innerHTML = ''; }
  _closeNormPreviewModal();
}

function _removeAnalysisViolation(normaId) {
  state._analysisViolations = state._analysisViolations.filter(v => v.normaId !== normaId);
  _renderAnalysisViolationsList();
}

async function _renderAnalysisViolationsList() {
  const listDiv = document.getElementById('analysisViolationsList');
  if (!listDiv) return;
  if (!state._analysisViolations.length) {
    listDiv.innerHTML = `<p class="hint">${t('noViolations')}</p>`;
    return;
  }
  const nodoPromises = state._analysisViolations.map(v => NormDB.getNodo(v.normaId));
  const nodos = await Promise.all(nodoPromises);
  const fontePromises = nodos.map(n => n ? _getFonteInfo(n.id_fonte) : Promise.resolve({ short: '?', css: '', name: '' }));
  const fonteInfos = await Promise.all(fontePromises);
  listDiv.innerHTML = state._analysisViolations.map((v, i) => `
    <div class="violation-item" data-testid="violation-item-${v.normaId}">
      <div class="violation-item-header">
        ${_fonteBadgeHtml(fonteInfos[i])}
        <span class="tree-badge tree-badge-neutral">${esc(v.normaCode)}</span>
        <span>${esc(v.normaTitle)}</span>
        <button class="btn btn-xs btn-details" onclick="_toggleLinkedViolationPreview(${v.normaId})" data-testid="btn-details-violation-${v.normaId}">${t('normDetails')}</button>
        <button class="btn btn-xs btn-danger" onclick="_removeAnalysisViolation(${v.normaId})" data-testid="remove-violation-${v.normaId}">${t('removeViolation')}</button>
      </div>
      <div class="form-group" style="margin-top:4px">
        <textarea rows="2" placeholder="${t('violationDescription')}" onchange="state._analysisViolations[${i}].description=this.value" data-testid="violation-desc-${v.normaId}">${esc(v.description)}</textarea>
      </div>
    </div>
  `).join('');
}

function _initFactViolationSearch(factId) {
  const searchInput = document.getElementById('fFactViolationSearch');
  if (!searchInput) return;
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => _searchFactViolationNorms(searchInput.value.trim(), factId), 300);
  });
}

async function _searchFactViolationNorms(query, factId) {
  const resultsDiv = document.getElementById('factViolationResults');
  if (!resultsDiv) return;
  if (!query || query.length < 2) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
    return;
  }
  const norms = await NormDB.searchNodi(query);
  if (!norms.length) {
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `<div class="violation-result-empty hint">${t('noResults')}</div>`;
    return;
  }
  resultsDiv.style.display = 'block';
  const lang = currentLang;
  state._factViolationSearchResults = {};
  const fontePromises = norms.slice(0, 20).map(n => _getFonteInfo(n.id_fonte));
  const fonteInfos = await Promise.all(fontePromises);
  resultsDiv.innerHTML = norms.slice(0, 20).map((n, i) => {
    const label = (lang === 'en' && n.rubrica_en) ? n.rubrica_en : (n.rubrica || '');
    const code = n.numero || '';
    state._factViolationSearchResults[n.id] = { normaId: n.id, normaCode: code, normaTitle: label };
    return `<div class="violation-result-item" onclick="_openNormPreviewModal(${n.id}, 'fact', ${factId})" data-testid="fact-violation-result-${n.id}">
      ${_fonteBadgeHtml(fonteInfos[i])}
      <span class="violation-result-code">${esc(code)}</span>
      <span class="violation-result-label">${esc(label)}</span>
    </div>`;
  }).join('');
}

async function _addFactViolation(normaId, factId) {
  const data = state._factViolationSearchResults && state._factViolationSearchResults[normaId];
  if (!data) return;
  const existing = await DB.getViolationsByFact(factId);
  if (existing.find(v => v.normaId === normaId)) return;
  await DB.createViolation({ factId, normaId: data.normaId, normaCode: data.normaCode, normaTitle: data.normaTitle, description: '' });
  await _refreshFactViolationsList(factId);
  const searchInput = document.getElementById('fFactViolationSearch');
  if (searchInput) searchInput.value = '';
  const resultsDiv = document.getElementById('factViolationResults');
  if (resultsDiv) { resultsDiv.style.display = 'none'; resultsDiv.innerHTML = ''; }
  _closeNormPreviewModal();
}

function _closeNormPreviewModal() {
  const overlay = document.querySelector('.norm-preview-overlay');
  if (overlay) overlay.remove();
}

async function _refreshFactViolationsList(factId) {
  const listDiv = document.getElementById('factViolationsList');
  if (!listDiv) return;
  const violations = await DB.getViolationsByFact(factId);
  if (!violations.length) {
    listDiv.innerHTML = `<p class="hint">${t('noViolations')}</p>`;
    return;
  }
  const nodoPromises = violations.map(v => NormDB.getNodo(v.normaId));
  const nodos = await Promise.all(nodoPromises);
  const fontePromises = nodos.map(n => n ? _getFonteInfo(n.id_fonte) : Promise.resolve({ short: '?', css: '', name: '' }));
  const fonteInfos = await Promise.all(fontePromises);
  listDiv.innerHTML = violations.map((v, i) => `
    <div class="violation-item" data-testid="fact-violation-item-${v.normaId}">
      <div class="violation-item-header">
        ${_fonteBadgeHtml(fonteInfos[i])}
        <span class="tree-badge tree-badge-neutral">${esc(v.normaCode || '')}</span>
        <span>${esc(v.normaTitle || '')}</span>
        <button class="btn btn-xs btn-details" onclick="_toggleLinkedViolationPreview(${v.normaId})" data-testid="btn-details-fact-violation-${v.id}">${t('normDetails')}</button>
        <button class="btn btn-xs btn-danger" onclick="_deleteFactViolation(${v.id}, ${factId})" data-testid="remove-fact-violation-${v.id}">${t('removeViolation')}</button>
      </div>
      ${v.description ? `<div class="hint" style="font-size:11px;margin-top:2px;margin-left:24px">${esc(v.description)}</div>` : ''}
    </div>
  `).join('');
}

async function _toggleLinkedViolationPreview(normaId) {
  await _openNormPreviewModal(normaId, 'view', null);
}

async function _deleteFactViolation(violationId, factId) {
  await DB.deleteViolation(violationId);
  await _refreshFactViolationsList(factId);
}

async function _onManageModalClose(factId) {
  if (state.openForm?.type === 'fact' && state.openForm.editId) {
    await _refreshFactFormLinkedLists(factId);
  } else {
    await renderAll();
  }
}

async function _refreshFactFormLinkedLists(factId) {
  const actsContainer = document.querySelector('#formView .form-fieldset .proof-links-list');
  const fieldsets = document.querySelectorAll('#formView .form-fieldset');
  for (const fs of fieldsets) {
    const legend = fs.querySelector('legend');
    if (!legend) continue;
    const listDiv = fs.querySelector('.proof-links-list');
    if (!listDiv) continue;
    if (legend.textContent === t('linkedActs')) {
      const rels = await DB.getFactActRelations(factId);
      if (rels.length > 0) {
        listDiv.innerHTML = rels.map(rel => {
          const a = rel.act;
          if (!a) return '';
          return `<div class="proof-link-item" style="display:flex;align-items:center;justify-content:space-between">
            ${_actPosSelect(rel.id, rel.posizioneAtto || 'afferma', factId, false)}
            <span style="flex:1">${esc(a.title)}</span>
            <div style="display:flex;gap:4px;margin-left:8px">
              <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="openViewActModal(${a.id}, '${rel.posizioneAtto || 'afferma'}')" data-testid="button-view-act-${a.id}">${t('viewAct')}</button>
              <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="_unlinkActFromForm(${rel.id}, ${factId})" data-testid="button-unlink-act-${rel.id}">${t('unlink')}</button>
            </div>
          </div>`;
        }).join('');
      } else {
        listDiv.innerHTML = `<p class="hint">${t('noLinkedActs')}</p>`;
      }
    }
    if (legend.textContent === t('linkedProofs')) {
      const proofs = await DB.getProofs(factId);
      if (proofs.length > 0) {
        listDiv.innerHTML = proofs.map(pr => {
          return `<div class="proof-link-item" style="display:flex;align-items:center;justify-content:space-between">
            ${_proofRelTypeSelect(pr._relationId, pr.relationType || 'confirms', factId, false)}
            <span style="flex:1">${esc(proofTitle(pr))}</span>
            <div style="display:flex;gap:4px;margin-left:8px">
              <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="openViewProofModal(${pr.id}, '${pr.relationType || 'confirms'}')" data-testid="button-view-proof-${pr.id}">${t('viewProof')}</button>
              <button class="btn btn-xs" style="font-size:10px;padding:2px 6px" onclick="_unlinkProofFromForm(${pr.id}, ${factId})" data-testid="button-unlink-proof-${pr.id}">${t('unlink')}</button>
            </div>
          </div>`;
        }).join('');
      } else {
        listDiv.innerHTML = `<p class="hint">${t('noLinkedProofs')}</p>`;
      }
    }
  }
}

async function _unlinkActFromForm(relId, factId) {
  await DB.deleteFactActRelation(relId);
  await _refreshFactFormLinkedLists(factId);
}

async function _unlinkProofFromForm(proofId, factId) {
  const rels = await DB.getFactProofRelations(factId);
  const rel = rels.find(r => r.proofId === proofId);
  if (rel) await DB.deleteFactProofRelation(rel.id);
  await _refreshFactFormLinkedLists(factId);
}

function _actPosSelect(relationId, currentPos, factId, isAnalysis) {
  const options = ['afferma', 'nega', 'omette', 'travisa', 'non_pronuncia'];
  const optHtml = options.map(v => `<option value="${v}" ${v === currentPos ? 'selected' : ''}>${tFactPosition(v)}</option>`).join('');
  return `<select class="proof-rel-select" style="font-size:10px;padding:1px 4px;max-width:130px" onchange="_changeActPosition(${relationId}, this.value, ${factId}, ${isAnalysis})" data-testid="select-act-pos-${relationId}">${optHtml}</select>`;
}

async function _changeActPosition(relationId, newPos, factId) {
  await DB.updateFactActRelation(relationId, { posizioneAtto: newPos });
  await _refreshFactFormLinkedLists(factId);
}

function _proofRelTypeSelect(relationId, currentType, factId, isAnalysis) {
  const opts = ['confirms','contradicts','integrates','ignored'];
  const optHtml = opts.map(v => `<option value="${v}"${v === currentType ? ' selected' : ''}>${tProofRelType(v)}</option>`).join('');
  return `<select class="proof-rel-select" style="font-size:10px;padding:1px 4px;max-width:110px" onchange="_changeProofRelationType(${relationId}, this.value, ${factId}, ${isAnalysis})" data-testid="select-proof-reltype-${relationId}">${optHtml}</select>`;
}

async function _changeProofRelationType(relationId, newRelType, factId) {
  await DB.updateFactProofRelation(relationId, { relationType: newRelType });
  await _refreshFactFormLinkedLists(factId);
}

async function _deleteActFromForm(actId, factId, isAnalysis, onDeleted) {
  const allRels = await DB.getActFactRelations(actId);
  const otherRels = allRels.filter(r => r.factId !== factId);
  if (otherRels.length > 0) {
    alert(t('cannotDeleteActLinked'));
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '1300';
  overlay.innerHTML = `<div class="modal" style="max-width:400px">
    <h3>${t('confirmDeleteTitle')}</h3>
    <p>${t('confirmDeleteActMsg')}</p>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-danger" id="btnConfirmDeleteAct">${t('delete')}</button>
      <button class="btn btn-sm" id="btnCancelDeleteAct">${t('cancel')}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('btnCancelDeleteAct').onclick = () => overlay.remove();
  document.getElementById('btnConfirmDeleteAct').onclick = async () => {
    await DB.deleteAct(actId);
    overlay.remove();
    if (onDeleted) {
      await onDeleted();
    } else {
      await _refreshFactFormLinkedLists(factId);
    }
  };
}

async function _deleteProofFromForm(proofId, factId, isAnalysis, onDeleted) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '1300';
  overlay.innerHTML = `<div class="modal" style="max-width:400px">
    <h3>${t('confirmDeleteTitle')}</h3>
    <p>${t('confirmDeleteProofMsg')}</p>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-danger" id="btnConfirmDeleteProof">${t('delete')}</button>
      <button class="btn btn-sm" id="btnCancelDeleteProof">${t('cancel')}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('btnCancelDeleteProof').onclick = () => overlay.remove();
  document.getElementById('btnConfirmDeleteProof').onclick = async () => {
    await DB.deleteProof(proofId);
    overlay.remove();
    if (onDeleted) {
      await onDeleted();
    } else {
      await _refreshFactFormLinkedLists(factId);
    }
  };
}

async function showCircumstanceForm(factId, editId) {
  openCircumstanceModal(factId, editId);
}

function openCircumstanceModal(factId, editId, onSaved) {
  const isEdit = !!editId;
  const typeOptions = CIRCUMSTANCE_TYPES;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1300;display:flex;align-items:center;justify-content:center';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;max-width:700px;width:95%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)';

  async function _render() {
    const existing = isEdit ? await DB.getCircumstance(editId) : null;
    modal.innerHTML = `
      <h3>${t(isEdit ? 'editCircumstance' : 'newCircumstance')}</h3>
      <div class="form-group">
        <label>${t('circumstanceType')}</label>
        <select id="fCircType" data-testid="select-circumstance-type">
          ${typeOptions.map(v => `<option value="${v}" ${(existing?.tipo === v) ? 'selected' : ''}>${t('circumstance' + v.charAt(0).toUpperCase() + v.slice(1))}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1">
          <label>${t('circumstanceTitle')} (IT)</label>
          <input id="fCircTitle" value="${esc(existing?.title || '')}" data-testid="input-circumstance-title">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
          ${_renderTransArrow('fCircTitle','fCircTitleEN','it','en')}
          ${_renderTransArrow('fCircTitleEN','fCircTitle','en','it')}
        </div>
        <div class="form-group" style="flex:1">
          <label>${t('circumstanceTitle')} (EN)</label>
          <input id="fCircTitleEN" value="${esc(existing?.titleEN || '')}" data-testid="input-circumstance-title-en">
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1">
          <label>${t('circumstanceDescription')} (IT)</label>
          <textarea id="fCircDescr" rows="3" data-testid="input-circumstance-description">${esc(existing?.descrizione || '')}</textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
          ${_renderTransArrow('fCircDescr','fCircDescrEN','it','en')}
          ${_renderTransArrow('fCircDescrEN','fCircDescr','en','it')}
        </div>
        <div class="form-group" style="flex:1">
          <label>${t('circumstanceDescription')} (EN)</label>
          <textarea id="fCircDescrEN" rows="3" data-testid="input-circumstance-description-en">${esc(existing?.descrizioneEN || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnCircSave" data-testid="button-save-circumstance">${t('save')}</button>
        <button class="btn" id="btnCircCancel">${t('cancel')}</button>
      </div>
    `;
    modal.querySelector('#btnCircSave').onclick = async () => {
      const title = document.getElementById('fCircTitle').value.trim();
      const data = {
        factId,
        tipo: document.getElementById('fCircType').value,
        title,
        titleEN: (document.getElementById('fCircTitleEN')?.value || '').trim(),
        descrizione: document.getElementById('fCircDescr').value.trim(),
        descrizioneEN: (document.getElementById('fCircDescrEN')?.value || '').trim()
      };
      if (isEdit) {
        await DB.updateCircumstance(editId, data);
      } else {
        await DB.createCircumstance(data);
      }
      overlay.remove();
      if (onSaved) await onSaved();
      else { await _refreshCircumstancesList(factId); }
    };
    modal.querySelector('#btnCircCancel').onclick = () => overlay.remove();
  }

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  _render();
}

async function _refreshCircumstancesList(factId) {
  const listEl = document.querySelector('#formView .proof-links-list[data-circ-list]');
  if (!listEl) return;
  const circumstances = await DB.getCircumstances(factId);
  if (circumstances.length > 0) {
    listEl.innerHTML = circumstances.map(c => {
      const typeLabel = t('circumstance' + c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1));
      return `<div class="proof-link-item">
        <span class="tree-badge tree-badge-neutral" style="font-size:10px">${typeLabel}</span>
        <span>${esc(c.title || c.descrizione || '')}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs" onclick="openCircumstanceModal(${factId}, ${c.id})">${t('edit')}</button>
          <button class="btn btn-xs btn-danger" onclick="deleteCircumstance(${c.id}, ${factId})">${t('deleteCircumstance')}</button>
        </div>
      </div>`;
    }).join('');
  } else {
    listEl.innerHTML = `<p class="hint">${t('noCircumstances')}</p>`;
  }
}

async function saveCircumstance(editId) {
  const factId = parseInt(document.getElementById('fCircFactId')?.value);
  if (!factId) return;
  const data = {
    factId,
    tipo: document.getElementById('fCircType').value,
    title: document.getElementById('fCircTitle').value.trim(),
    descrizione: document.getElementById('fCircDescr').value.trim()
  };

  if (editId) {
    await DB.updateCircumstance(editId, data);
  } else {
    await DB.createCircumstance(data);
  }

  state.selection = { type: 'fact', id: factId };
  state.openForm = null;
  await renderAll();
}

async function deleteCircumstance(id, factId) {
  if (!confirm(t('confirmDelete'))) return;
  await DB.deleteCircumstance(id);
  await _refreshCircumstancesList(factId);
}

async function deleteViolation(id, entityType, entityId) {
  if (!confirm(t('confirmDelete'))) return;
  await DB.deleteViolation(id);
  state.selection = { type: entityType, id: entityId };
  await renderAll();
}

async function openLinkActModal(factId) {
  const fact = await DB.getFact(factId);
  if (!fact || !fact.dossierId) return;
  const allActs = await DB.getActs(fact.dossierId);
  const existingRels = await DB.getFactActRelations(factId);
  const linkedActIds = existingRels.map(r => r.actId);
  const available = allActs.filter(a => !linkedActIds.includes(a.id));
  if (available.length === 0) { alert(t('factNoLinkedActs')); return; }

  const positionOptions = ['afferma', 'nega', 'omette', 'travisa', 'non_pronuncia'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('factLinkAct')}</h3>
      <div class="form-group">
        <label>${t('factSelectAct')}</label>
        <select id="linkActSelect" data-testid="select-link-act">
          ${available.map(a => `<option value="${a.id}">${esc(a.title)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('factActPosition')}</label>
        <select id="linkActPosition" data-testid="select-link-act-position">
          ${positionOptions.map(v => `<option value="${v}">${tFactPosition(v)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnLinkActConfirm" data-testid="button-link-act-confirm">${t('confirm')}</button>
        <button class="btn" id="btnLinkActCancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnLinkActConfirm').onclick = async () => {
    const actId = parseInt(document.getElementById('linkActSelect').value);
    const pos = document.getElementById('linkActPosition').value;
    await DB.createFactActRelation({ factId, actId, posizioneAtto: pos });
    overlay.remove();
    await renderAll();
  };
  document.getElementById('btnLinkActCancel').onclick = () => overlay.remove();
}

async function openLinkFactToActModal(actId) {
  const act = await DB.getAct(actId);
  if (!act) return;
  const facts = await DB.getFactsByDossier(act.dossierId);
  const existingRels = await DB.getActFactRelations(actId);
  const linkedFactIds = existingRels.map(r => r.factId);
  const available = facts.filter(f => !linkedFactIds.includes(f.id));
  if (available.length === 0) { alert(t('noFacts')); return; }

  const positionOptions = ['afferma', 'nega', 'omette', 'travisa', 'non_pronuncia'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('factLinkAct')}</h3>
      <div class="form-group">
        <label>${t('entityFact')}</label>
        <select id="linkFactSelect" data-testid="select-link-fact">
          ${available.map(f => `<option value="${f.id}">${esc(f.title)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('factActPosition')}</label>
        <select id="linkFactPosition" data-testid="select-link-fact-position">
          ${positionOptions.map(v => `<option value="${v}">${tFactPosition(v)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnLinkFactConfirm" data-testid="button-link-fact-confirm">${t('confirm')}</button>
        <button class="btn" id="btnLinkFactCancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnLinkFactConfirm').onclick = async () => {
    const fId = parseInt(document.getElementById('linkFactSelect').value);
    const pos = document.getElementById('linkFactPosition').value;
    await DB.createFactActRelation({ factId: fId, actId, posizioneAtto: pos });
    overlay.remove();
    await renderAll();
  };
  document.getElementById('btnLinkFactCancel').onclick = () => overlay.remove();
}

async function unlinkFactActRelation(relId) {
  await DB.deleteFactActRelation(relId);
  await renderAll();
}

async function unlinkFactFromAct(relId) {
  await DB.deleteFactActRelation(relId);
  await renderAll();
}

/* ========== PROOF FORM (modal-only, always linked to a fact) ========== */


function _handleTranscribeFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;
  state._transcribeAudioBlob = file;
  const preview = document.getElementById('transcribeAudioPreview');
  if (preview) {
    if (state._transcribePreviewUrl) URL.revokeObjectURL(state._transcribePreviewUrl);
    const url = URL.createObjectURL(file);
    state._transcribePreviewUrl = url;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|avi|webm|mov)$/i.test(file.name);
    const tag = isVideo ? 'video' : 'audio';
    const videoStyle = isVideo ? ' style="width:100%;max-height:220px;border-radius:6px"' : '';
    const pipBtn2 = (isVideo && document.pictureInPictureEnabled) ? `<button class="btn btn-xs" onclick="_mtTogglePiP()" title="${t('pipDetach')}" data-testid="button-transcribe-pip">🖼 ${t('pipDetach')}</button>` : '';
    preview.innerHTML = `<${tag} id="mtMediaEl" controls src="${url}"${videoStyle} data-testid="audio-transcribe-preview"></${tag}>
      <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
        <div class="hint" style="font-size:11px;flex:1">${esc(file.name)} (${(file.size / 1024 / 1024).toFixed(1)} MB)</div>
        ${pipBtn2}
        <button class="btn btn-sm" onclick="_mtSkip(-5)" data-testid="button-mt-back5">\u23EA \u22125s</button>
        <button class="btn btn-sm" onclick="_mtSkip(5)" data-testid="button-mt-fwd5">\u23E9 +5s</button>
        <label style="font-size:11px;font-weight:600">${t('manualTranscribeSpeed')}:</label>
        <select id="mtSpeedSelect" style="font-size:11px;padding:2px 4px" data-testid="select-mt-speed" onchange="_mtSetSpeed(this.value)">
          <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option>
        </select>
      </div>`;
    preview.style.display = '';
    const mediaEl = document.getElementById('mtMediaEl');
    if (mediaEl) {
      mediaEl.addEventListener('timeupdate', () => {
        const timeEl = document.getElementById('mtCurrentTime');
        if (timeEl) timeEl.textContent = _mtFormatTime(mediaEl.currentTime);
      });
    }
  }
  const btn = document.getElementById('transcribeBtn');
  if (btn) btn.disabled = false;
  const status = document.getElementById('transcribeStatus');
  if (status) { status.textContent = ''; status.className = 'transcribe-status'; }
}

function _mtSetupPlayer(file) {
  const wrap = document.getElementById('mtPlayerWrap');
  if (!wrap) return;
  if (state._mtMediaUrl) URL.revokeObjectURL(state._mtMediaUrl);
  const url = URL.createObjectURL(file);
  state._mtMediaUrl = url;
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|avi|webm)$/i.test(file.name);
  const tag = isVideo ? 'video' : 'audio';
  const pipBtn3 = (isVideo && document.pictureInPictureEnabled) ? `<button class="btn btn-xs" onclick="_mtTogglePiP()" title="${t('pipDetach')}" data-testid="button-mt-pip2">🖼 ${t('pipDetach')}</button>` : '';
  wrap.innerHTML = `
    <${tag} id="mtMediaEl" controls src="${url}" data-testid="mt-media-player"></${tag}>
    <div class="mt-player-controls">
      ${pipBtn3}
      <button class="btn btn-sm" onclick="_mtSkip(-5)" data-testid="button-mt-back5">\u23EA \u22125s</button>
      <button class="btn btn-sm" onclick="_mtSkip(5)" data-testid="button-mt-fwd5">\u23E9 +5s</button>
      <label style="font-size:11px;font-weight:600;margin-left:8px">${t('manualTranscribeSpeed')}:</label>
      <select id="mtSpeedSelect" style="font-size:11px;padding:2px 4px" data-testid="select-mt-speed" onchange="_mtSetSpeed(this.value)">
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1" selected>1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
      </select>
    </div>
  `;
  const mediaEl = document.getElementById('mtMediaEl');
  if (mediaEl) {
    mediaEl.addEventListener('timeupdate', () => {
      const timeEl = document.getElementById('mtCurrentTime');
      if (timeEl) timeEl.textContent = _mtFormatTime(mediaEl.currentTime);
    });
  }
}

async function _toggleAudioRecording() {
  if (state._mediaRecorder && state._mediaRecorder.state === 'recording') {
    state._mediaRecorder.stop();
    const btn = document.getElementById('transcribeRecordBtn');
    if (btn) btn.textContent = t('transcribeRecord');
    const indicator = document.getElementById('transcribeRecordIndicator');
    if (indicator) indicator.style.display = 'none';
    if (state._recordTimerInterval) { clearInterval(state._recordTimerInterval); state._recordTimerInterval = null; }
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state._audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    state._mediaRecorder = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) state._audioChunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(tr => tr.stop());
      state._mediaRecorder = null;
      const blob = new Blob(state._audioChunks, { type: mimeType || 'audio/webm' });
      state._transcribeAudioBlob = blob;
      const preview = document.getElementById('transcribeAudioPreview');
      if (preview) {
        if (state._transcribePreviewUrl) URL.revokeObjectURL(state._transcribePreviewUrl);
        const url = URL.createObjectURL(blob);
        state._transcribePreviewUrl = url;
        preview.innerHTML = `<audio id="mtMediaEl" controls src="${url}" data-testid="audio-transcribe-preview"></audio>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <div class="hint" style="font-size:11px;flex:1">${(blob.size / 1024 / 1024).toFixed(1)} MB</div>
            <button class="btn btn-sm" onclick="_mtSkip(-5)" data-testid="button-mt-back5">\u23EA \u22125s</button>
            <button class="btn btn-sm" onclick="_mtSkip(5)" data-testid="button-mt-fwd5">\u23E9 +5s</button>
            <label style="font-size:11px;font-weight:600">${t('manualTranscribeSpeed')}:</label>
            <select id="mtSpeedSelect" style="font-size:11px;padding:2px 4px" data-testid="select-mt-speed" onchange="_mtSetSpeed(this.value)">
              <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option>
            </select>
          </div>`;
        preview.style.display = '';
        const recMediaEl = document.getElementById('mtMediaEl');
        if (recMediaEl) {
          recMediaEl.addEventListener('timeupdate', () => {
            const timeEl = document.getElementById('mtCurrentTime');
            if (timeEl) timeEl.textContent = _mtFormatTime(recMediaEl.currentTime);
          });
        }
      }
      const btn = document.getElementById('transcribeBtn');
      if (btn) btn.disabled = false;
    };
    recorder.start(1000);
    const btn = document.getElementById('transcribeRecordBtn');
    if (btn) btn.textContent = t('transcribeStop');
    const indicator = document.getElementById('transcribeRecordIndicator');
    if (indicator) indicator.style.display = '';
    let secs = 0;
    state._recordTimerInterval = setInterval(() => {
      secs++;
      const m = String(Math.floor(secs / 60)).padStart(2, '0');
      const s = String(secs % 60).padStart(2, '0');
      const timer = document.getElementById('transcribeTimer');
      if (timer) timer.textContent = `${m}:${s}`;
    }, 1000);
  } catch (err) {
    const status = document.getElementById('transcribeStatus');
    if (status) { status.textContent = t('transcribeNoMic'); status.className = 'transcribe-status error'; }
  }
}

const _TRANSFORMERS_CACHE_NAME = 'transformers-cache';

const _WHISPER_TINY_LOCAL_FILES = [
  'config.json', 'generation_config.json', 'preprocessor_config.json',
  'tokenizer.json', 'tokenizer_config.json', 'vocab.json',
  'added_tokens.json', 'special_tokens_map.json', 'normalizer.json',
  'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'
];

async function _preloadWhisperTinyFromLocal() {
  if (typeof caches === 'undefined') return false;
  const cache = await caches.open(_TRANSFORMERS_CACHE_NAME);
  const baseUrl = 'https://huggingface.co/Xenova/whisper-tiny/resolve/main/';
  let allCached = true;
  for (const file of _WHISPER_TINY_LOCAL_FILES) {
    const url = baseUrl + file;
    const existing = await cache.match(url);
    if (!existing) {
      allCached = false;
      break;
    }
  }
  if (allCached) return true;
  for (const file of _WHISPER_TINY_LOCAL_FILES) {
    const url = baseUrl + file;
    const existing = await cache.match(url);
    if (!existing) {
      const localPath = 'mod/whisper-tiny/' + (file.startsWith('onnx/') ? file.replace('onnx/', '') : file);
      const resp = await fetch(localPath);
      if (resp.ok) {
        const blob = await resp.blob();
        await cache.put(url, new Response(blob));
      }
    }
  }
  return true;
}

async function _restoreModelToCache(modelName) {
  if (typeof caches === 'undefined') return false;
  const filesMap = await DB.getModelFiles(modelName);
  if (!filesMap) return false;
  const cache = await caches.open(_TRANSFORMERS_CACHE_NAME);
  for (const [url, data] of Object.entries(filesMap)) {
    const existing = await cache.match(url);
    if (!existing) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      await cache.put(url, new Response(blob));
    }
  }
  return true;
}

async function _saveModelFromCache(modelName) {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(_TRANSFORMERS_CACHE_NAME);
  const keys = await cache.keys();
  const modelSlug = modelName.replace('/', '%2F');
  const modelUrls = keys.filter(req => req.url.includes(modelSlug) || req.url.includes(modelName));
  if (!modelUrls.length) return;
  const filesMap = {};
  for (const req of modelUrls) {
    const resp = await cache.match(req);
    if (resp) {
      const blob = await resp.blob();
      filesMap[req.url] = blob;
    }
  }
  if (Object.keys(filesMap).length > 0) {
    await DB.saveModelFiles(modelName, filesMap);
  }
}

async function _restoreModelFromModFolder(modelName) {
  if (!FS_DIR_HANDLE) return false;
  if (typeof caches === 'undefined') return false;
  try {
    const modDir = await FS_DIR_HANDLE.getDirectoryHandle('mod');
    const slug = modelName.split('/').pop();
    const modelDir = await modDir.getDirectoryHandle(slug);
    const cache = await caches.open(_TRANSFORMERS_CACHE_NAME);
    const baseUrl = `https://huggingface.co/${modelName}/resolve/main/`;
    const onnxBase = baseUrl + 'onnx/';

    for await (const entry of modelDir.values()) {
      if (entry.kind !== 'file') continue;
      const file = await entry.getFile();
      const isOnnx = entry.name.endsWith('.onnx');
      const url = isOnnx ? onnxBase + entry.name : baseUrl + entry.name;
      const existing = await cache.match(url);
      if (!existing) {
        await cache.put(url, new Response(file));
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function _saveModelToModFolder(modelName) {
  if (!FS_DIR_HANDLE) return false;
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(_TRANSFORMERS_CACHE_NAME);
    const keys = await cache.keys();
    const modelSlug = modelName.replace('/', '%2F');
    const modelUrls = keys.filter(req => req.url.includes(modelSlug) || req.url.includes(modelName));
    if (!modelUrls.length) return false;

    const modDir = await FS_DIR_HANDLE.getDirectoryHandle('mod', { create: true });
    const slug = modelName.split('/').pop();
    const modelDir = await modDir.getDirectoryHandle(slug, { create: true });

    for (const req of modelUrls) {
      const resp = await cache.match(req);
      if (!resp) continue;
      const blob = await resp.blob();
      const urlPath = new URL(req.url).pathname;
      let fileName = urlPath.split('/').pop();
      if (!fileName) continue;
      fileName = decodeURIComponent(fileName);
      const fileHandle = await modelDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    }
    return true;
  } catch (err) {
    console.warn('Could not save model to mod/ folder:', err);
    return false;
  }
}

async function _startTranscription() {
  if (!state._transcribeAudioBlob) {
    const status = document.getElementById('transcribeStatus');
    if (status) { status.textContent = t('transcribeNoAudio'); status.className = 'transcribe-status error'; }
    return;
  }
  const statusEl = document.getElementById('transcribeStatus');
  const progressEl = document.getElementById('transcribeProgress');
  const progressBar = document.getElementById('transcribeProgressBar');
  const resultEl = document.getElementById('transcribeResult');
  const transcribeBtn = document.getElementById('transcribeBtn');
  if (transcribeBtn) transcribeBtn.disabled = true;
  if (progressEl) progressEl.style.display = '';
  if (progressBar) progressBar.style.width = '5%';

  const modelKey = document.getElementById('transcribeModelSelect')?.value || 'base';
  const modelMap = { tiny: 'Xenova/whisper-tiny', base: 'Xenova/whisper-base', small: 'Xenova/whisper-small' };
  const modelName = modelMap[modelKey] || modelMap.base;
  const sizeMap = { tiny: '~150MB', base: '~190MB', small: '~470MB' };
  const modelSize = sizeMap[modelKey] || '~190MB';

  try {
    const isTinyLocal = modelKey === 'tiny';
    const modelInIdb = await DB.hasModel(modelName);
    const modelInMod = !isTinyLocal && !modelInIdb ? await _restoreModelFromModFolder(modelName) : false;
    const modelAvailableLocally = isTinyLocal || modelInIdb || modelInMod;

    if (isTinyLocal && !modelInIdb) {
      if (statusEl) { statusEl.textContent = t('whisperModelLoadingLocal'); statusEl.className = 'transcribe-status'; }
      if (progressBar) progressBar.style.width = '8%';
      await _preloadWhisperTinyFromLocal();
      if (progressBar) progressBar.style.width = '10%';
    } else if (modelInIdb) {
      if (statusEl) { statusEl.textContent = t('whisperModelSavedLocally'); statusEl.className = 'transcribe-status'; }
      if (progressBar) progressBar.style.width = '8%';
      await _restoreModelToCache(modelName);
      if (progressBar) progressBar.style.width = '10%';
    } else if (modelInMod) {
      if (statusEl) { statusEl.textContent = t('whisperModelSavedLocally'); statusEl.className = 'transcribe-status'; }
      if (progressBar) progressBar.style.width = '10%';
    } else {
      const msg = t('whisperModelDownloadConfirm').replace('{size}', modelSize);
      if (!confirm(msg)) {
        if (statusEl) { statusEl.textContent = t('whisperModelCancelled'); statusEl.className = 'transcribe-status'; }
        if (transcribeBtn) transcribeBtn.disabled = false;
        if (progressEl) progressEl.style.display = 'none';
        return;
      }
      if (statusEl) { statusEl.textContent = t('whisperModelDownloading'); statusEl.className = 'transcribe-status'; }
    }

    if (statusEl && !modelAvailableLocally) { statusEl.textContent = t('whisperModelDownloading'); statusEl.className = 'transcribe-status'; }
    else if (statusEl && modelAvailableLocally) { statusEl.textContent = t('whisperModelSavedLocally'); statusEl.className = 'transcribe-status'; }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuf = await state._transcribeAudioBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
    await audioCtx.close();
    const origRate = audioBuffer.sampleRate;
    const origData = audioBuffer.getChannelData(0);
    let float32;
    if (origRate !== 16000) {
      const offCtx = new OfflineAudioContext(1, Math.ceil(origData.length * 16000 / origRate), 16000);
      const src = offCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(offCtx.destination);
      src.start(0);
      const resampled = await offCtx.startRendering();
      float32 = new Float32Array(resampled.getChannelData(0));
    } else {
      float32 = new Float32Array(origData);
    }

    const lang = document.getElementById('transcribeLangSelect')?.value || 'italian';
    let text;

    let useWorker = state._whisperWorkerOk !== false;
    if (useWorker && !state._whisperWorker) {
      try {
        const workerCode = `
let pipelineFn = null, transcriber = null, cachedModel = null;
self.onmessage = async function(e) {
  const { type, modelName, audioData, language } = e.data;
  if (type === 'ping') {
    try {
      importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
      self.postMessage({ type: 'pong' });
    } catch(e) { self.postMessage({ type: 'pong_fail' }); }
    return;
  }
  if (type === 'transcribe') {
    try {
      if (!transcriber || cachedModel !== modelName) {
        if (!pipelineFn) {
          importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
          const T = self.TransformersApi || self.Transformers;
          pipelineFn = T && T[1] ? T[1].pipeline : (T && T.pipeline ? T.pipeline : self.pipeline);
          if (!pipelineFn && typeof pipeline !== 'undefined') pipelineFn = pipeline;
        }
        self.postMessage({ type: 'progress', status: 'loading', progress: 10 });
        transcriber = await pipelineFn('automatic-speech-recognition', modelName, {
          progress_callback: (p) => {
            if (p.status === 'progress' && p.progress) {
              self.postMessage({ type: 'progress', status: 'loading', progress: 10 + p.progress * 0.5 });
            }
          }
        });
        cachedModel = modelName;
      }
      self.postMessage({ type: 'progress', status: 'transcribing', progress: 65 });
      const result = await transcriber(audioData, {
        language: language || 'italian', task: 'transcribe',
        chunk_length_s: 30, stride_length_s: 5, return_timestamps: true,
        no_repeat_ngram_size: 3, repetition_penalty: 1.2
      });
      const text = typeof result === 'string' ? result : (result.text || (result.chunks ? result.chunks.map(c => c.text).join(' ') : ''));
      self.postMessage({ type: 'result', text: text.trim() });
    } catch (err) { self.postMessage({ type: 'error', error: err.message || String(err) }); }
  }
};`;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const w = new Worker(blobUrl);
        const pingOk = await new Promise((res) => {
          const timer = setTimeout(() => res(false), 15000);
          w.onmessage = (ev) => { clearTimeout(timer); res(ev.data.type === 'pong'); };
          w.onerror = () => { clearTimeout(timer); res(false); };
          w.postMessage({ type: 'ping' });
        });
        if (pingOk) { state._whisperWorker = w; } else { w.terminate(); useWorker = false; state._whisperWorkerOk = false; }
      } catch (wErr) { useWorker = false; state._whisperWorkerOk = false; }
    }

    if (useWorker && state._whisperWorker) {
      const worker = state._whisperWorker;
      text = await new Promise((resolve, reject) => {
        worker.onmessage = (ev) => {
          const d = ev.data;
          if (d.type === 'progress') {
            if (progressBar) progressBar.style.width = `${d.progress}%`;
            if (d.status === 'transcribing' && statusEl) { statusEl.textContent = t('transcribeInProgress'); statusEl.className = 'transcribe-status'; }
            if (d.status === 'loading' && statusEl) { statusEl.textContent = t('whisperModelDownloading'); statusEl.className = 'transcribe-status'; }
          } else if (d.type === 'result') { resolve(d.text); }
          else if (d.type === 'error') { reject(new Error(d.error)); }
        };
        worker.onerror = (ev) => reject(new Error(ev.message || 'Worker error'));
        worker.postMessage({ type: 'transcribe', modelName, audioData: float32, language: lang }, [float32.buffer]);
      });
    } else {
      if (!state._whisperPipelines) state._whisperPipelines = {};
      let transcriber = state._whisperPipelines[modelName];
      if (!transcriber) {
        if (statusEl) { statusEl.textContent = t('whisperModelDownloading'); statusEl.className = 'transcribe-status'; }
        const { pipeline: pipelineFn } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        transcriber = await pipelineFn('automatic-speech-recognition', modelName, {
          progress_callback: (p) => {
            if (p.status === 'progress' && p.progress && progressBar) {
              progressBar.style.width = `${10 + p.progress * 0.5}%`;
            }
          }
        });
        state._whisperPipelines[modelName] = transcriber;
      }
      if (progressBar) progressBar.style.width = '65%';
      if (statusEl) { statusEl.textContent = t('transcribeInProgress'); statusEl.className = 'transcribe-status'; }
      const result = await transcriber(float32, {
        language: lang, task: 'transcribe',
        chunk_length_s: 30, stride_length_s: 5, return_timestamps: true,
        no_repeat_ngram_size: 3, repetition_penalty: 1.2
      });
      text = typeof result === 'string' ? result : (result.text || (result.chunks ? result.chunks.map(c => c.text).join(' ') : ''));
      text = text.trim();
    }

    if (progressBar) progressBar.style.width = '100%';
    if (resultEl) resultEl.value = text;
    if (statusEl) { statusEl.textContent = t('transcribeComplete'); statusEl.className = 'transcribe-status success'; }

    if (!modelInIdb && !isTinyLocal) {
      try {
        if (statusEl) { statusEl.textContent = t('whisperSavingModel'); statusEl.className = 'transcribe-status'; }
        await _saveModelFromCache(modelName);
        const savedToMod = await _saveModelToModFolder(modelName);
        const saved = await DB.hasModel(modelName);
        if (saved || savedToMod) {
          _updateWhisperModelStatus();
          if (statusEl) { statusEl.textContent = t('whisperModelSaved'); statusEl.className = 'transcribe-status success'; }
        }
      } catch (saveErr) {
        console.warn('Could not save model to IndexedDB:', saveErr);
      }
    }
  } catch (err) {
    console.error('Transcription error:', err);
    if (statusEl) { statusEl.textContent = err.message || 'Error'; statusEl.className = 'transcribe-status error'; }
  } finally {
    if (transcribeBtn) transcribeBtn.disabled = false;
    setTimeout(() => { if (progressEl) progressEl.style.display = 'none'; }, 2000);
  }
}

function _copyTranscription() {
  const el = document.getElementById('transcribeResult');
  if (el && el.value) {
    navigator.clipboard.writeText(el.value).catch(() => {});
  }
}

function _sendToTranslate(sourceElId) {
  const srcEl = document.getElementById(sourceElId);
  if (!srcEl || !srcEl.value.trim()) return;
  const transSource = document.getElementById('toolsTransSource');
  if (transSource) transSource.value = srcEl.value.trim();
  const tabBtn = document.querySelector('.tools-tab-btn[data-tab="translate"]');
  if (tabBtn) tabBtn.click();
}

function _sendMtToTranslate() {
  const text = _mtFormatAll();
  if (!text) return;
  const transSource = document.getElementById('toolsTransSource');
  if (transSource) transSource.value = text;
  const tabBtn = document.querySelector('.tools-tab-btn[data-tab="translate"]');
  if (tabBtn) tabBtn.click();
}

function _clearAutoTranscription() {
  const el = document.getElementById('transcribeResult');
  if (el) el.value = '';
  const status = document.getElementById('transcribeStatus');
  if (status) status.textContent = '';
}

function _insertTranscriptionIntoNotes() {
  const result = document.getElementById('transcribeResult');
  if (!result || !result.value) return;
  const notes = document.getElementById('fProofNotes');
  if (!notes) return;
  notes.value = notes.value ? notes.value + '\n\n' + result.value : result.value;
  if (state._mediaRecorder && state._mediaRecorder.state === 'recording') state._mediaRecorder.stop();
  if (state._recordTimerInterval) { clearInterval(state._recordTimerInterval); state._recordTimerInterval = null; }

  const overlay = document.querySelector('.tools-modal-overlay');
  if (overlay) overlay.remove();
}

function _toggleDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusEl = document.getElementById('dictationStatus');
  const toggleBtn = document.getElementById('dictationToggleBtn');
  const indicator = document.getElementById('dictationIndicator');
  const resultEl = document.getElementById('dictationResult');

  if (state._speechRecognition) {
    state._speechRecognitionManualStop = true;
    state._speechRecognition.stop();
    state._speechRecognition = null;
    if (toggleBtn) toggleBtn.textContent = t('dictationStart');
    if (indicator) indicator.style.display = 'none';
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'transcribe-status'; }
    if (state._dictationTimerInterval) { clearInterval(state._dictationTimerInterval); state._dictationTimerInterval = null; }
    return;
  }

  if (!SpeechRecognition) {
    if (statusEl) { statusEl.textContent = t('dictationNotSupported'); statusEl.className = 'transcribe-status error'; }
    return;
  }

  const recognition = new SpeechRecognition();
  const lang = document.getElementById('dictationLangSelect')?.value || 'it-IT';
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  state._speechRecognition = recognition;
  state._speechRecognitionManualStop = false;
  state._dictationInterim = '';

  recognition.onstart = () => {
    if (toggleBtn) toggleBtn.textContent = t('dictationStop');
    if (indicator) indicator.style.display = '';
    if (statusEl) { statusEl.textContent = t('dictationListening'); statusEl.className = 'transcribe-status success'; }
    let secs = 0;
    const timerEl = document.getElementById('dictationTimer');
    if (timerEl) timerEl.textContent = '00:00';
    state._dictationTimerInterval = setInterval(() => {
      secs++;
      const m = String(Math.floor(secs / 60)).padStart(2, '0');
      const s = String(secs % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${m}:${s}`;
    }, 1000);
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript && resultEl) {
      const current = resultEl.value;
      const separator = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
      resultEl.value = current + separator + finalTranscript;
      resultEl.scrollTop = resultEl.scrollHeight;
    }
    state._dictationInterim = interimTranscript;
    if (statusEl && state._speechRecognition) {
      statusEl.textContent = interimTranscript ? `${t('dictationListening')} ${interimTranscript}` : t('dictationListening');
      statusEl.className = 'transcribe-status success';
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') return;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      if (statusEl) { statusEl.textContent = t('dictationNoMic'); statusEl.className = 'transcribe-status error'; }
      state._speechRecognition = null;
      if (toggleBtn) toggleBtn.textContent = t('dictationStart');
      if (indicator) indicator.style.display = 'none';
      if (state._dictationTimerInterval) { clearInterval(state._dictationTimerInterval); state._dictationTimerInterval = null; }
    }
  };

  recognition.onend = () => {
    if (!state._speechRecognitionManualStop && state._speechRecognition) {
      if (statusEl) { statusEl.textContent = t('dictationRestarting'); statusEl.className = 'transcribe-status'; }
      try {
        recognition.start();
      } catch (e) {
        state._speechRecognition = null;
        if (toggleBtn) toggleBtn.textContent = t('dictationStart');
        if (indicator) indicator.style.display = 'none';
        if (statusEl) { statusEl.textContent = t('dictationNoMic'); statusEl.className = 'transcribe-status error'; }
        if (state._dictationTimerInterval) { clearInterval(state._dictationTimerInterval); state._dictationTimerInterval = null; }
      }
    } else {
      if (toggleBtn) toggleBtn.textContent = t('dictationStart');
      if (indicator) indicator.style.display = 'none';
      if (state._dictationTimerInterval) { clearInterval(state._dictationTimerInterval); state._dictationTimerInterval = null; }
      state._speechRecognition = null;
    }
  };

  try {
    recognition.start();
  } catch (err) {
    if (statusEl) { statusEl.textContent = t('dictationNoMic'); statusEl.className = 'transcribe-status error'; }
  }
}

function _clearDictation() {
  const el = document.getElementById('dictationResult');
  if (el) el.value = '';
}

function _copyDictation() {
  const el = document.getElementById('dictationResult');
  if (el && el.value) {
    navigator.clipboard.writeText(el.value).catch(() => {});
  }
}

function _insertDictationIntoNotes() {
  const result = document.getElementById('dictationResult');
  if (!result || !result.value) return;
  const notes = document.getElementById('fProofNotes');
  if (!notes) return;
  notes.value = notes.value ? notes.value + '\n\n' + result.value : result.value;
  if (state._speechRecognition) { state._speechRecognitionManualStop = true; state._speechRecognition.stop(); state._speechRecognition = null; }
  if (state._dictationTimerInterval) { clearInterval(state._dictationTimerInterval); state._dictationTimerInterval = null; }

  const overlay = document.querySelector('.tools-modal-overlay');
  if (overlay) overlay.remove();
}

function _initDictationTab(overlay) {
  if (overlay._dictationTabInit) return;
  overlay._dictationTabInit = true;
  const langSel = document.getElementById('dictationLangSelect');
  if (langSel) langSel.value = currentLang === 'en' ? 'en-US' : 'it-IT';
  const insertBtn = document.getElementById('dictationInsertBtn');
  if (insertBtn) {
    const proofNotesEl = document.getElementById('fProofNotes');
    if (!proofNotesEl) {
      insertBtn.disabled = true;
      insertBtn.title = t('transcribeNoProofOpen');
    }
  }
}

const _mtSpeakerColors = ['speaker-color-0','speaker-color-1','speaker-color-2','speaker-color-3','speaker-color-4','speaker-color-5','speaker-color-6','speaker-color-7'];

function _initManualTranscribeTab(overlay) {
  if (overlay._mtTabInit) return;
  overlay._mtTabInit = true;
  if (!state._mtSpeakers) state._mtSpeakers = [`${t('manualTranscribeSpeaker')} 1`, `${t('manualTranscribeSpeaker')} 2`];
  if (state._mtActiveSpeaker === undefined) state._mtActiveSpeaker = 0;
  if (!state._mtLines) state._mtLines = [];
  _mtRenderSpeakerBtn();
  _mtRenderLines();
  const mtInput = document.getElementById('mtInput');
  if (mtInput) {
    mtInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _mtAddLine(); }
    });
  }
  const insertBtn = document.getElementById('mtInsertBtn');
  if (insertBtn) {
    const proofNotesEl = document.getElementById('fProofNotes');
    if (!proofNotesEl) { insertBtn.disabled = true; insertBtn.title = t('transcribeNoProofOpen'); }
  }
}


function _mtSkip(secs) {
  const el = document.getElementById('mtMediaEl');
  if (el) el.currentTime = Math.max(0, el.currentTime + secs);
}

function _mtSetSpeed(val) {
  const el = document.getElementById('mtMediaEl');
  if (el) el.playbackRate = parseFloat(val) || 1;
}

function _mtFormatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

const _mtSpeakerColorValues = ['#2563eb','#dc2626','#16a34a','#9333ea','#ea580c','#0891b2','#be185d','#854d0e'];

function _mtRenderSpeakerBtn() {
  const btn = document.getElementById('mtSplitMain');
  if (!btn) return;
  const idx = state._mtActiveSpeaker || 0;
  const name = state._mtSpeakers[idx] || `${t('manualTranscribeSpeaker')} 1`;
  const color = _mtSpeakerColorValues[idx % _mtSpeakerColorValues.length];
  btn.textContent = '+ ' + name;
  btn.style.background = color;
  btn.style.borderColor = color;
  const arrow = document.getElementById('mtSplitArrow');
  if (arrow) { arrow.style.background = color; arrow.style.borderColor = color; }
}

function _mtToggleDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('mtSpeakerDropdown');
  if (!dd) return;
  if (dd.style.display === 'none') {
    _mtRenderDropdown();
    dd.style.display = '';
    setTimeout(() => document.addEventListener('click', _mtCloseDropdownOnClick, { once: true }), 0);
  } else {
    dd.style.display = 'none';
  }
}

function _mtCloseDropdownOnClick() {
  const dd = document.getElementById('mtSpeakerDropdown');
  if (dd) dd.style.display = 'none';
}

function _mtRenderDropdown() {
  const dd = document.getElementById('mtSpeakerDropdown');
  if (!dd) return;
  let html = '';
  state._mtSpeakers.forEach((name, i) => {
    const color = _mtSpeakerColorValues[i % _mtSpeakerColorValues.length];
    const activeClass = i === state._mtActiveSpeaker ? ' active' : '';
    html += `<div class="mt-speaker-dropdown-item${activeClass}" data-testid="dropdown-speaker-${i}">
      <span class="mt-dd-color" style="background:${color}"></span>
      <span class="mt-dd-name" onclick="_mtSelectSpeaker(${i})">${esc(name)}</span>
      <button class="mt-dd-rename" onclick="event.stopPropagation();_mtRenameSpeaker(${i})" title="${t('manualTranscribeRenameSpeaker')}">✎</button>
    </div>`;
  });
  html += `<div class="mt-speaker-dropdown-sep"></div>`;
  html += `<div class="mt-speaker-dropdown-add" onclick="_mtAddSpeaker()" data-testid="dropdown-add-speaker">${t('manualTranscribeAddSpeaker')}</div>`;
  dd.innerHTML = html;
}

function _mtSelectSpeaker(i) {
  state._mtActiveSpeaker = i;
  _mtRenderSpeakerBtn();
  const dd = document.getElementById('mtSpeakerDropdown');
  if (dd) dd.style.display = 'none';
}

function _mtRenameSpeaker(i) {
  const newName = prompt(t('manualTranscribeRenameSpeaker'), state._mtSpeakers[i]);
  if (newName && newName.trim()) {
    state._mtSpeakers[i] = newName.trim();
    _mtRenderSpeakerBtn();
    _mtRenderDropdown();
    _mtRenderLines();
  }
}

function _mtAddSpeaker() {
  const num = state._mtSpeakers.length + 1;
  const defaultName = `${t('manualTranscribeSpeaker')} ${num}`;
  const name = prompt(t('manualTranscribeAddSpeaker'), defaultName);
  if (!name || !name.trim()) return;
  state._mtSpeakers.push(name.trim());
  state._mtActiveSpeaker = state._mtSpeakers.length - 1;
  _mtRenderSpeakerBtn();
  const dd = document.getElementById('mtSpeakerDropdown');
  if (dd) dd.style.display = 'none';
}

function _mtRenderLines() {
  const container = document.getElementById('mtLines');
  if (!container) return;
  if (!state._mtLines.length) {
    container.innerHTML = '';
    return;
  }
  let html = '';
  state._mtLines.forEach((line, i) => {
    const colorClass = _mtSpeakerColors[line.speakerIndex % _mtSpeakerColors.length];
    html += `<div class="mt-line" data-testid="mt-line-${i}">
      <span class="mt-line-ts">${esc(line.timestamp)}</span>
      <span class="mt-line-speaker ${colorClass}">${esc(line.speaker)}</span>
      <textarea class="mt-line-text" rows="1" onblur="_mtEditLine(${i}, this.value)" data-testid="input-mt-line-text-${i}">${esc(line.text)}</textarea>
      <div class="mt-line-actions">
        ${i > 0 ? `<button class="mt-line-move" onclick="_mtMoveLineUp(${i})" data-testid="button-mt-line-up-${i}">▲</button>` : ''}
        ${i < state._mtLines.length - 1 ? `<button class="mt-line-move" onclick="_mtMoveLineDown(${i})" data-testid="button-mt-line-down-${i}">▼</button>` : ''}
        <button class="mt-line-del" onclick="_mtDeleteLine(${i})" data-testid="button-mt-line-del-${i}">&times;</button>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function _mtAddLine() {
  const input = document.getElementById('mtInput');
  if (!input || !input.value.trim()) return;
  const mediaEl = document.getElementById('mtMediaEl');
  const ts = mediaEl ? _mtFormatTime(mediaEl.currentTime) : '--:--';
  const speakerIndex = state._mtActiveSpeaker || 0;
  state._mtLines.push({
    speaker: state._mtSpeakers[speakerIndex] || `${t('manualTranscribeSpeaker')} 1`,
    speakerIndex,
    timestamp: ts,
    text: input.value.trim()
  });
  input.value = '';
  input.focus();
  _mtRenderLines();
}

function _mtEditLine(i, val) {
  if (state._mtLines[i]) state._mtLines[i].text = val;
}

function _mtDeleteLine(i) {
  state._mtLines.splice(i, 1);
  _mtRenderLines();
}

function _mtMoveLineUp(i) {
  if (i <= 0) return;
  const tmp = state._mtLines[i];
  state._mtLines[i] = state._mtLines[i - 1];
  state._mtLines[i - 1] = tmp;
  _mtRenderLines();
}

function _mtMoveLineDown(i) {
  if (i >= state._mtLines.length - 1) return;
  const tmp = state._mtLines[i];
  state._mtLines[i] = state._mtLines[i + 1];
  state._mtLines[i + 1] = tmp;
  _mtRenderLines();
}

function _mtFormatAll() {
  return state._mtLines.map(l => `[${l.timestamp}] ${l.speaker}: ${l.text}`).join('\n');
}

function _mtReverseAll() {
  state._mtLines.reverse();
  _mtRenderLines();
}

function _mtCopyAll() {
  const text = _mtFormatAll();
  if (text) navigator.clipboard.writeText(text).catch(() => {});
}

function _mtInsertIntoNotes() {
  const text = _mtFormatAll();
  if (!text) return;
  const notes = document.getElementById('fProofNotes');
  if (!notes) return;
  notes.value = notes.value ? notes.value + '\n\n' + text : text;

  const overlay = document.querySelector('.tools-modal-overlay');
  if (overlay) overlay.remove();
}

function _mtLoadFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (state._mtMediaUrl) URL.revokeObjectURL(state._mtMediaUrl);
  state._mtMediaUrl = URL.createObjectURL(file);
  const container = document.getElementById('mtMediaContainer');
  if (!container) return;
  const isVideo = file.type.startsWith('video/');
  if (isVideo) {
    const pipBtn = document.pictureInPictureEnabled ? `<button class="btn btn-xs" onclick="_mtTogglePiP()" style="margin-top:4px" title="${t('pipDetach')}" data-testid="button-mt-pip">🖼 ${t('pipDetach')}</button>` : '';
    container.innerHTML = `<video id="mtMediaEl" controls style="width:100%;max-height:180px" data-testid="mt-media-player"><source src="${state._mtMediaUrl}"></video>${pipBtn}`;
  } else {
    container.innerHTML = `<audio id="mtMediaEl" controls style="width:100%" data-testid="mt-media-player"><source src="${state._mtMediaUrl}"></audio>`;
  }
}

function _mtTogglePiP() {
  const videoEl = document.getElementById('mtMediaEl');
  if (!videoEl || videoEl.tagName !== 'VIDEO') return;
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  } else {
    videoEl.requestPictureInPicture().catch(() => {});
  }
}

function _mtClearAll() {
  if (!state._mtLines.length) return;
  if (!confirm(t('manualTranscribeConfirmClear'))) return;
  state._mtLines = [];
  _mtRenderLines();
}

async function openLinkProofModal(factId) {
  const allProofs = await DB.getAllProofs();
  const linked = await DB.getProofs(factId);
  const linkedIds = new Set(linked.map(p => p.id));
  const available = allProofs.filter(p => !linkedIds.has(p.id));
  if (available.length === 0) { alert(t('factNoLinkedProofs')); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('factLinkExisting')}</h3>
      <div class="form-group">
        <label>${t('proofTitle')}</label>
        <select id="linkProofSelect">
          ${available.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnLinkProofConfirm">${t('confirm')}</button>
        <button class="btn" id="btnLinkProofCancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnLinkProofConfirm').onclick = async () => {
    const proofId = parseInt(document.getElementById('linkProofSelect').value);
    const relType = 'confirms';
    await DB.createFactProofRelation({ factId, proofId, relationType: relType });
    overlay.remove();
    await renderAll();
  };
  document.getElementById('btnLinkProofCancel').onclick = () => overlay.remove();
}

async function unlinkProofFromFact(proofId, factId) {
  const rels = await DB.getFactProofRelations(factId);
  const rel = rels.find(r => r.proofId === proofId);
  if (rel) await DB.deleteFactProofRelation(rel.id);
  await renderAll();
}

function _initInlineCreateAct(prefix, dossierId, getFactId, onCreated) {
  const _pendingFiles = [];
  function _renderFileList() {
    const listEl = document.getElementById(prefix + 'Files');
    if (!listEl) return;
    listEl.innerHTML = _pendingFiles.length > 0 ? _pendingFiles.map((pf, i) =>
      `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px">
        <span class="file-lang-badge file-lang-${pf.lang}" style="font-size:10px">${pf.lang.toUpperCase()}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pf.file.name)}</span>
        <span class="hint">${formatSize(pf.file.size)}</span>
        <button class="btn btn-xs btn-danger" data-removefile="${i}">${t('delete')}</button>
      </div>`
    ).join('') : '';
    listEl.querySelectorAll('[data-removefile]').forEach(btn => {
      btn.onclick = () => { _pendingFiles.splice(parseInt(btn.dataset.removefile), 1); _renderFileList(); };
    });
  }
  document.querySelectorAll(`.file-drop-zone[data-target="${prefix}"]`).forEach(zone => {
    const lang = zone.dataset.droplang;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      for (const f of e.dataTransfer.files) _pendingFiles.push({ file: f, lang });
      _renderFileList();
    });
    zone.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
      inp.onchange = () => { for (const f of inp.files) _pendingFiles.push({ file: f, lang }); _renderFileList(); };
      inp.click();
    });
  });
  const btnSaveId = 'btn' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'Save';
  const btnSave = document.getElementById(btnSaveId);
  if (btnSave) {
    btnSave.onclick = async () => {
      const titleEl = document.getElementById(prefix + 'Title');
      const title = titleEl?.value.trim();
      if (!title) { titleEl?.focus(); return; }
      const factId = await getFactId();
      if (!factId) return;
      const type = document.getElementById(prefix + 'Type')?.value || '';
      const subtype = document.getElementById(prefix + 'Subtype')?.value || '';
      const act = await DB.createAct({ title, type, subtype, dossierId });
      await DB.createFactActRelation({ factId, actId: act.id, posizioneAtto: 'afferma' });
      if (_pendingFiles.length > 0) {
        const hierarchy = await _resolveFileHierarchy('act', dossierId);
        for (const pf of _pendingFiles) await storeFileForEntity(pf.file, 'act', act.id, pf.lang, hierarchy);
      }
      titleEl.value = '';
      _pendingFiles.length = 0;
      _renderFileList();
      if (onCreated) await onCreated();
    };
  }
}

function _initProofSearchLink(inputId, resultsId, btnId, toggleId, getFactId, onLinked) {
  const input = document.getElementById(inputId);
  const resultsDiv = document.getElementById(resultsId);
  const btnLink = document.getElementById(btnId);
  const btnToggle = document.getElementById(toggleId);
  if (!input || !resultsDiv || !btnLink) return;
  let _selectedProofId = null;
  let _debounce = null;

  async function _showList(filter) {
    const factId = await getFactId();
    const allProofs = await DB.getAllProofs();
    const linked = factId ? await DB.getProofs(factId) : [];
    const linkedIds = new Set(linked.map(p => p.id));
    const available = allProofs.filter(p => !linkedIds.has(p.id));
    const matches = filter
      ? available.filter(p => _proofMatchesSearch(p, filter)).slice(0, 15)
      : available;
    if (matches.length === 0) {
      resultsDiv.innerHTML = `<div class="autocomplete-item no-result">${t('noResults')}</div>`;
    } else {
      resultsDiv.innerHTML = matches.map(p =>
        `<div class="autocomplete-item" data-proofid="${p.id}" data-testid="autocomplete-proof-${p.id}">${esc(proofTitle(p))}</div>`
      ).join('');
      resultsDiv.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          _selectedProofId = parseInt(item.dataset.proofid);
          input.value = item.textContent;
          resultsDiv.classList.remove('visible');
          btnLink.disabled = false;
        });
      });
    }
    resultsDiv.classList.add('visible');
  }

  input.addEventListener('input', () => {
    clearTimeout(_debounce);
    _selectedProofId = null;
    btnLink.disabled = true;
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { resultsDiv.classList.remove('visible'); resultsDiv.innerHTML = ''; return; }
    _debounce = setTimeout(() => _showList(q), 250);
  });

  if (btnToggle) {
    btnToggle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (resultsDiv.classList.contains('visible')) {
        resultsDiv.classList.remove('visible');
      } else {
        _showList(null);
      }
    });
  }

  input.addEventListener('focus', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length >= 1) { _showList(q); }
  });

  input.addEventListener('blur', () => { setTimeout(() => { resultsDiv.classList.remove('visible'); }, 200); });

  btnLink.onclick = async () => {
    if (!_selectedProofId) return;
    const factId = await getFactId();
    if (!factId) return;
    await DB.createFactProofRelation({ factId, proofId: _selectedProofId, relationType: 'confirms' });
    input.value = '';
    _selectedProofId = null;
    btnLink.disabled = true;
    resultsDiv.classList.remove('visible');
    if (onLinked) await onLinked();
  };
}

function _openCreateActModal(dossierId, factId, onCreated) {
  let _pendingFiles = [];
  const overlay2 = document.createElement('div');
  overlay2.className = 'modal-overlay';
  overlay2.style.zIndex = '1300';
  const content2 = document.createElement('div');
  content2.className = 'modal-content';
  content2.style.maxWidth = '700px';
  content2.style.width = '95%';

  function _renderFileList() {
    const listEl = content2.querySelector('#modalNewActFiles');
    if (!listEl) return;
    listEl.innerHTML = _pendingFiles.length > 0 ? _pendingFiles.map((pf, i) =>
      `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px">
        <span class="file-lang-badge file-lang-${pf.lang}" style="font-size:10px">${pf.lang.toUpperCase()}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pf.file.name)}</span>
        <span class="hint">${formatSize(pf.file.size)}</span>
        <button class="btn btn-xs btn-danger" data-removefile="${i}">${t('delete')}</button>
      </div>`
    ).join('') : '';
    listEl.querySelectorAll('[data-removefile]').forEach(btn => {
      btn.onclick = () => { _pendingFiles.splice(parseInt(btn.dataset.removefile), 1); _renderFileList(); };
    });
  }

  content2.innerHTML = `
    <h3>${t('createNewAct')}</h3>
    <div style="display:flex;gap:12px">
      <div class="form-group" style="flex:1">
        <label>${t('actTitle')} (IT)</label>
        <input id="modalNewActTitle" required data-testid="input-modal-new-act-title">
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
        ${_renderTransArrow('modalNewActTitle','modalNewActTitleEN','it','en')}
        ${_renderTransArrow('modalNewActTitleEN','modalNewActTitle','en','it')}
      </div>
      <div class="form-group" style="flex:1">
        <label>${t('actTitle')} (EN)</label>
        <input id="modalNewActTitleEN" data-testid="input-modal-new-act-title-en">
      </div>
    </div>
    ${_buildActTypeSubtypeSelects('modalNewAct', '', '')}
    <div class="form-group">
      <label>${t('files')}</label>
      <div id="modalNewActFiles"></div>
      <div class="file-upload-zones" style="display:flex;gap:8px;margin-top:6px">
        <div class="file-drop-zone" data-droplang="it">
          <div class="file-drop-label">📄 IT</div>
          <div style="font-size:11px;color:var(--text-secondary)">${t('dropFiles')}</div>
        </div>
        <div class="file-drop-zone" data-droplang="en">
          <div class="file-drop-label">📄 EN</div>
          <div style="font-size:11px;color:var(--text-secondary)">${t('dropFiles')}</div>
        </div>
      </div>
    </div>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-primary" id="btnModalNewActSave">${t('save')}</button>
      <button class="btn" id="btnModalNewActCancel">${t('cancel')}</button>
    </div>
  `;
  overlay2.appendChild(content2);
  document.body.appendChild(overlay2);

  content2.querySelectorAll('.file-drop-zone[data-droplang]').forEach(zone => {
    const lang = zone.dataset.droplang;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      for (const f of e.dataTransfer.files) _pendingFiles.push({ file: f, lang });
      _renderFileList();
    });
    zone.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true;
      inp.onchange = () => {
        for (const f of inp.files) _pendingFiles.push({ file: f, lang });
        _renderFileList();
      };
      inp.click();
    });
  });

  content2.querySelector('#btnModalNewActSave').onclick = async () => {
    const title = content2.querySelector('#modalNewActTitle').value.trim();
    if (!title) { content2.querySelector('#modalNewActTitle').focus(); return; }
    const titleEN = (content2.querySelector('#modalNewActTitleEN')?.value || '').trim();
    const type = content2.querySelector('#modalNewActType')?.value || '';
    const subtype = content2.querySelector('#modalNewActSubtype')?.value || '';
    const act = await DB.createAct({ title, titleEN, type, subtype, dossierId });
    if (factId) {
      await DB.createFactActRelation({ factId, actId: act.id, posizioneAtto: 'afferma' });
    }
    if (_pendingFiles.length > 0) {
      const hierarchy = await _resolveFileHierarchy('act', dossierId);
      for (const pf of _pendingFiles) {
        await storeFileForEntity(pf.file, 'act', act.id, pf.lang, hierarchy);
      }
    }
    overlay2.remove();
    if (onCreated) await onCreated();
  };
  content2.querySelector('#btnModalNewActCancel').onclick = () => overlay2.remove();
  setTimeout(() => content2.querySelector('#modalNewActTitle')?.focus(), 100);
}

async function openViewActModal(actId, contextPosition) {
  const act = await DB.getAct(actId);
  if (!act) return;
  const files = await DB.getEntityFiles('act', actId);

  let posHtml = '';
  if (contextPosition) {
    const posLabel = tFactPosition(contextPosition);
    posHtml = `<div class="detail-field">
      <div class="detail-field-label">${t('factActPosition')}</div>
      <div class="detail-field-value"><span class="tree-badge tree-badge-neutral">${posLabel}</span></div>
    </div>`;
  }

  const typeLabel = actTypeLabel(act.type || '');
  const subtypeLabel = act.subtype ? actSubtypeLabel(act.subtype) : '';
  const badgeCls = 'act-badge act-badge-' + (act.type || 'atto');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;max-width:900px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)';

  const filesIT = files.filter(f => (f.lang || 'it') === 'it');
  const filesEN = files.filter(f => f.lang === 'en');

  function _renderFileCol(langFiles, label) {
    if (langFiles.length === 0) return `<div class="detail-field-label" style="margin-bottom:6px">${label}</div><p class="hint">${t('noFiles')}</p>`;
    const listItems = langFiles.map((f, i) => `
      <div class="file-select-item ${i === 0 ? 'selected' : ''}" data-file-id="${f.id}" onclick="event.stopPropagation(); selectFileForPreview('vaf_${f.lang}_${actId}', ${f.id}, this)" style="cursor:pointer">
        <div class="file-select-info">
          <span class="file-select-name">${esc(f.fileName)}</span>
          <span class="file-select-meta">${formatSize(f.fileSize)}</span>
        </div>
        <div class="file-select-actions" onclick="event.stopPropagation()">
          <button class="btn btn-xs" onclick="downloadFile(${f.id})">${t('download')}</button>
        </div>
      </div>
    `).join('');
    const firstPreview = renderFilePreview(langFiles[0]);
    return `<div class="detail-field-label" style="margin-bottom:6px">${label}</div>
      <div class="file-viewer" id="vaf_${langFiles[0].lang}_${actId}">
        <div class="file-select-list">${listItems}</div>
        <div class="file-preview-container" id="vaf_${langFiles[0].lang}_${actId}_preview">${firstPreview}</div>
      </div>`;
  }

  const hasFiles = filesIT.length > 0 || filesEN.length > 0;

  modal.innerHTML = `
    <div class="detail-panel" style="border:none;box-shadow:none;padding:0">
      <div class="detail-header" style="margin-bottom:12px">
        <h3 style="margin:0"><span class="${badgeCls}" style="font-size:12px;margin-right:8px">${typeLabel}</span>${subtypeLabel ? `<span class="tree-badge tree-badge-neutral" style="font-size:11px;margin-right:8px">${subtypeLabel}</span>` : ''}${esc(act.title)}</h3>
      </div>
      ${posHtml}
      ${act.description ? `<div class="detail-field">
        <div class="detail-field-label">${t('actDescription')}</div>
        <div class="detail-field-value">${esc(act.description)}</div>
      </div>` : ''}
      ${hasFiles ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
        <div>${_renderFileCol(filesIT, 'IT')}</div>
        <div>${_renderFileCol(filesEN, 'EN')}</div>
      </div>` : ''}
    </div>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn" id="btnViewActClose">${t('close')}</button>
    </div>
  `;

  modal.querySelector('#btnViewActClose').onclick = () => overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function _initActSearchLink(inputId, resultsId, btnId, toggleId, getDossierId, getFactId, onLinked) {
  const input = document.getElementById(inputId);
  const resultsDiv = document.getElementById(resultsId);
  const btnLink = document.getElementById(btnId);
  const btnToggle = document.getElementById(toggleId);
  if (!input || !resultsDiv || !btnLink) return;
  let _selectedActId = null;
  let _debounce = null;

  async function _showList(filter) {
    const factId = await getFactId();
    const dossierId = await getDossierId();
    const allActs = dossierId ? await DB.getActs(dossierId) : await DB.getAllActs();
    const linked = factId ? await DB.getFactActRelations(factId) : [];
    const linkedIds = new Set(linked.map(r => r.actId));
    const available = allActs.filter(a => !linkedIds.has(a.id));
    const matches = filter
      ? available.filter(a => (a.title || '').toLowerCase().includes(filter.toLowerCase())).slice(0, 15)
      : available;
    if (matches.length === 0) {
      resultsDiv.innerHTML = `<div class="autocomplete-item no-result">${t('noResults')}</div>`;
    } else {
      resultsDiv.innerHTML = matches.map(a =>
        `<div class="autocomplete-item" data-actid="${a.id}" data-testid="autocomplete-act-${a.id}">${esc(a.title)}</div>`
      ).join('');
      resultsDiv.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          _selectedActId = parseInt(item.dataset.actid);
          input.value = item.textContent;
          resultsDiv.classList.remove('visible');
          btnLink.disabled = false;
        });
      });
    }
    resultsDiv.classList.add('visible');
  }

  input.addEventListener('input', () => {
    clearTimeout(_debounce);
    _selectedActId = null;
    btnLink.disabled = true;
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) { resultsDiv.classList.remove('visible'); resultsDiv.innerHTML = ''; return; }
    _debounce = setTimeout(() => _showList(q), 250);
  });

  if (btnToggle) {
    btnToggle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (resultsDiv.classList.contains('visible')) {
        resultsDiv.classList.remove('visible');
      } else {
        _showList('');
      }
    });
  }

  input.addEventListener('focus', () => {
    if (input.value.trim().length > 0) _showList(input.value.trim().toLowerCase());
  });
  input.addEventListener('blur', () => {
    setTimeout(() => resultsDiv.classList.remove('visible'), 200);
  });

  btnLink.onclick = async () => {
    if (!_selectedActId) return;
    const factId = await getFactId();
    if (!factId) return;
    await DB.createFactActRelation({ factId, actId: _selectedActId, posizioneAtto: 'afferma' });
    _selectedActId = null;
    input.value = '';
    btnLink.disabled = true;
    resultsDiv.classList.remove('visible');
    if (onLinked) await onLinked();
  };
}

function _openCreateProofModal(factId, onCreated) {
  let _pendingFiles = [];
  const overlay2 = document.createElement('div');
  overlay2.className = 'modal-overlay';
  overlay2.style.zIndex = '1300';
  const content2 = document.createElement('div');
  content2.className = 'modal-content proof-modal-wide';

  function _renderFileList() {
    const listEl = content2.querySelector('#modalNewProofFiles');
    if (!listEl) return;
    listEl.innerHTML = _pendingFiles.length > 0 ? _pendingFiles.map((pf, i) =>
      `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px">
        <span class="file-lang-badge file-lang-${pf.lang}" style="font-size:10px">${pf.lang.toUpperCase()}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pf.file.name)}</span>
        <span class="hint">${formatSize(pf.file.size)}</span>
        <button class="btn btn-xs btn-danger" data-removefile="${i}">${t('delete')}</button>
      </div>`
    ).join('') : '';
    listEl.querySelectorAll('[data-removefile]').forEach(btn => {
      btn.onclick = () => { _pendingFiles.splice(parseInt(btn.dataset.removefile), 1); _renderFileList(); };
    });
  }

  content2.innerHTML = `
    <div class="proof-modal-header">
      <h3>${t('createNewProof')}</h3>
      <div class="header-actions">
        <button type="button" class="btn btn-sm" id="btnMnpOpenTools" style="display:none" data-testid="button-mnp-open-tools">🛠 ${t('openToolsTranscribe')}</button>
        <button class="btn btn-sm btn-primary" id="btnModalNewProofSave" data-testid="button-modal-new-proof-save">${t('create')}</button>
        <button class="btn btn-sm" id="btnModalNewProofCancel" data-testid="button-modal-new-proof-cancel">${t('cancel')}</button>
      </div>
    </div>
    <div class="proof-modal-body">
      <div class="proof-col">
        <div style="display:flex;gap:12px">
          <div class="form-group" style="flex:1">
            <label>${t('proofDate')}</label>
            <input type="date" id="modalNewProofDate" data-testid="input-modal-new-proof-date">
          </div>
          <div class="form-group" style="flex:1">
            <label>${t('proofTime')}</label>
            <input type="time" id="modalNewProofTime" data-testid="input-modal-new-proof-time">
          </div>
        </div>
        <div style="display:flex;gap:12px">
          <div class="form-group" style="flex:1">
            <label>${t('proofTitleIT')}</label>
            <input id="modalNewProofTitle" required data-testid="input-modal-new-proof-title">
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
            ${_renderTransArrow('modalNewProofTitle','modalNewProofTitleEN','it','en')}
            ${_renderTransArrow('modalNewProofTitleEN','modalNewProofTitle','en','it')}
          </div>
          <div class="form-group" style="flex:1">
            <label>${t('proofTitleEN')}</label>
            <input id="modalNewProofTitleEN" data-testid="input-modal-new-proof-title-en">
          </div>
        </div>
        <div style="display:flex;gap:12px">
          <div class="form-group" style="flex:1">
            <label>${t('proofNotesIT')}</label>
            <textarea id="modalNewProofNotes" rows="3" data-testid="input-modal-new-proof-notes"></textarea>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
            ${_renderTransArrow('modalNewProofNotes','modalNewProofNotesEN','it','en')}
            ${_renderTransArrow('modalNewProofNotesEN','modalNewProofNotes','en','it')}
          </div>
          <div class="form-group" style="flex:1">
            <label>${t('proofNotesEN')}</label>
            <textarea id="modalNewProofNotesEN" rows="3" data-testid="input-modal-new-proof-notes-en"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px">
          <div class="file-drop-zone" data-droplang="it" style="flex:1">
            <div class="file-drop-label">📄 IT</div>
            <div style="font-size:11px;color:var(--text-secondary)">${t('dropFiles')}</div>
          </div>
          <div class="file-drop-zone" data-droplang="en" style="flex:1">
            <div class="file-drop-label">📄 EN</div>
            <div style="font-size:11px;color:var(--text-secondary)">${t('dropFiles')}</div>
          </div>
        </div>
        <div id="modalNewProofFiles" style="margin-top:8px"></div>
      </div>
      <div class="proof-col">
        <div class="form-group">
          <label>${t('proofMediaType')}</label>
          <div class="btn-group" id="modalNewProofMediaType" style="display:flex;gap:4px;flex-wrap:wrap" data-testid="select-modal-new-proof-media-type">
            <button type="button" class="btn btn-sm media-type-btn active" data-mtype="document" data-testid="btn-media-document">📄 ${t('mediaDocument')}</button>
            <button type="button" class="btn btn-sm media-type-btn" data-mtype="image" data-testid="btn-media-image">🖼️ ${t('mediaImage')}</button>
            <button type="button" class="btn btn-sm media-type-btn" data-mtype="audio" data-testid="btn-media-audio">🎧 ${t('mediaAudio')}</button>
            <button type="button" class="btn btn-sm media-type-btn" data-mtype="video" data-testid="btn-media-video">🎬 ${t('mediaVideo')}</button>
          </div>
        </div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <div id="mnpImageDescItGroup" class="form-group" style="display:none">
              <label>${t('imageDescriptionIt')}</label>
              <textarea id="modalNewProofImageDescIt" rows="3" data-testid="textarea-modal-new-proof-image-desc-it"></textarea>
            </div>
            <div id="mnpVideoDescItGroup" class="form-group" style="display:none">
              <label>${t('videoDescriptionIt')}</label>
              <textarea id="modalNewProofVideoDescIt" rows="3" data-testid="textarea-modal-new-proof-video-desc-it"></textarea>
            </div>
            <div id="mnpTranscriptItGroup" class="form-group" style="display:none">
              <label>${t('proofTranscriptIt')}</label>
              <textarea id="modalNewProofTranscriptIt" rows="3" data-testid="textarea-modal-new-proof-transcript-it"></textarea>
            </div>
          </div>
          <div id="mnpTransArrows" style="display:none;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
            <span class="mnp-arrow-img" style="display:none">${_renderTransArrow('modalNewProofImageDescIt','modalNewProofImageDescEn','it','en')}</span>
            <span class="mnp-arrow-img" style="display:none">${_renderTransArrow('modalNewProofImageDescEn','modalNewProofImageDescIt','en','it')}</span>
            <span class="mnp-arrow-vid" style="display:none">${_renderTransArrow('modalNewProofVideoDescIt','modalNewProofVideoDescEn','it','en')}</span>
            <span class="mnp-arrow-vid" style="display:none">${_renderTransArrow('modalNewProofVideoDescEn','modalNewProofVideoDescIt','en','it')}</span>
            <span class="mnp-arrow-trans" style="display:none">${_renderTransArrow('modalNewProofTranscriptIt','modalNewProofTranscriptEn','it','en')}</span>
            <span class="mnp-arrow-trans" style="display:none">${_renderTransArrow('modalNewProofTranscriptEn','modalNewProofTranscriptIt','en','it')}</span>
          </div>
          <div style="flex:1">
            <div id="mnpImageDescEnGroup" class="form-group" style="display:none">
              <label>${t('imageDescriptionEn')}</label>
              <textarea id="modalNewProofImageDescEn" rows="3" data-testid="textarea-modal-new-proof-image-desc-en"></textarea>
            </div>
            <div id="mnpVideoDescEnGroup" class="form-group" style="display:none">
              <label>${t('videoDescriptionEn')}</label>
              <textarea id="modalNewProofVideoDescEn" rows="3" data-testid="textarea-modal-new-proof-video-desc-en"></textarea>
            </div>
            <div id="mnpTranscriptEnGroup" class="form-group" style="display:none">
              <label>${t('proofTranscriptEn')}</label>
              <textarea id="modalNewProofTranscriptEn" rows="3" data-testid="textarea-modal-new-proof-transcript-en"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  overlay2.appendChild(content2);
  document.body.appendChild(overlay2);

  let _selectedMediaType = 'document';
  function _toggleMediaTypeFields(mtype) {
    _selectedMediaType = mtype;
    content2.querySelectorAll('.media-type-btn').forEach(b => b.classList.toggle('active', b.dataset.mtype === mtype));
    const show = (id, vis) => { const el = document.getElementById(id); if (el) el.style.display = vis ? '' : 'none'; };
    show('mnpImageDescItGroup', mtype === 'image');
    show('mnpImageDescEnGroup', mtype === 'image');
    show('mnpVideoDescItGroup', mtype === 'video');
    show('mnpVideoDescEnGroup', mtype === 'video');
    show('mnpTranscriptItGroup', mtype === 'audio' || mtype === 'video');
    show('mnpTranscriptEnGroup', mtype === 'audio' || mtype === 'video');
    const arrowsDiv = document.getElementById('mnpTransArrows');
    if (arrowsDiv) {
      arrowsDiv.style.display = (mtype !== 'document') ? 'flex' : 'none';
      arrowsDiv.querySelectorAll('.mnp-arrow-img').forEach(el => el.style.display = mtype === 'image' ? '' : 'none');
      arrowsDiv.querySelectorAll('.mnp-arrow-vid').forEach(el => el.style.display = mtype === 'video' ? '' : 'none');
      arrowsDiv.querySelectorAll('.mnp-arrow-trans').forEach(el => el.style.display = (mtype === 'audio' || mtype === 'video') ? '' : 'none');
    }
    const toolsBtn2 = content2.querySelector('#btnMnpOpenTools');
    if (toolsBtn2) toolsBtn2.style.display = (mtype === 'audio' || mtype === 'video' || mtype === 'image') ? '' : 'none';
  }

  content2.querySelectorAll('.media-type-btn').forEach(btn => {
    btn.onclick = () => _toggleMediaTypeFields(btn.dataset.mtype);
  });

  const toolsBtn = content2.querySelector('#btnMnpOpenTools');
  if (toolsBtn) toolsBtn.onclick = () => openToolsModal(_selectedMediaType === 'image' || _selectedMediaType === 'video' ? 'mediadesc' : 'transcribe');

  content2.querySelectorAll('.file-drop-zone[data-droplang]').forEach(zone => {
    const lang = zone.dataset.droplang;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      for (const f of e.dataTransfer.files) _pendingFiles.push({ file: f, lang });
      _renderFileList();
    });
    zone.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true;
      inp.onchange = () => {
        for (const f of inp.files) _pendingFiles.push({ file: f, lang });
        _renderFileList();
      };
      inp.click();
    });
  });

  content2.querySelector('#btnModalNewProofSave').onclick = async () => {
    const title = content2.querySelector('#modalNewProofTitle').value.trim();
    if (!title) { alert(t('proofTitleRequired')); content2.querySelector('#modalNewProofTitle').focus(); return; }
    const title_en = content2.querySelector('#modalNewProofTitleEN').value.trim();
    const relationType = 'confirms';
    const notes = content2.querySelector('#modalNewProofNotes').value.trim();
    const notes_en = content2.querySelector('#modalNewProofNotesEN').value.trim();
    const proofDate = content2.querySelector('#modalNewProofDate')?.value || '';
    const proofTime = content2.querySelector('#modalNewProofTime')?.value || '';
    const proofData = { title, title_en, relationType, notes, notes_en, factId, mediaType: _selectedMediaType, proofDate, proofTime };
    if (_selectedMediaType === 'image') {
      proofData.imageDescriptionIt = (content2.querySelector('#modalNewProofImageDescIt')?.value || '').trim();
      proofData.imageDescriptionEn = (content2.querySelector('#modalNewProofImageDescEn')?.value || '').trim();
    }
    if (_selectedMediaType === 'video') {
      proofData.videoDescriptionIt = (content2.querySelector('#modalNewProofVideoDescIt')?.value || '').trim();
      proofData.videoDescriptionEn = (content2.querySelector('#modalNewProofVideoDescEn')?.value || '').trim();
    }
    if (_selectedMediaType === 'audio' || _selectedMediaType === 'video') {
      proofData.transcriptIt = (content2.querySelector('#modalNewProofTranscriptIt')?.value || '').trim();
      proofData.transcriptEn = (content2.querySelector('#modalNewProofTranscriptEn')?.value || '').trim();
    }
    const proof = await DB.createProof(proofData);
    if (_pendingFiles.length > 0) {
      const hierarchy = await _resolveFileHierarchy('proof', factId);
      for (const pf of _pendingFiles) {
        await storeFileForEntity(pf.file, 'proof', proof.id, pf.lang, hierarchy);
      }
    }
    overlay2.remove();
    if (onCreated) await onCreated();
  };
  content2.querySelector('#btnModalNewProofCancel').onclick = () => overlay2.remove();
  setTimeout(() => content2.querySelector('#modalNewProofTitle')?.focus(), 100);
}

async function openManageActsModal(factId, onClose) {
  const fact = await DB.getFact(factId);
  if (!fact || !fact.dossierId) return;
  const dossierId = fact.dossierId;
  const positionOptions = ['afferma', 'nega', 'omette', 'travisa', 'non_pronuncia'];
  let _searchFilter = '';

  async function _renderActsList(listContainer) {
    const allActs = await DB.getAllActs();
    const existingRels = await DB.getFactActRelations(factId);
    const linkedActIds = existingRels.map(r => r.actId);
    const relMap = {};
    existingRels.forEach(r => { relMap[r.actId] = r; });

    const filtered = _searchFilter
      ? allActs.filter(a => a.title.toLowerCase().includes(_searchFilter.toLowerCase()))
      : allActs;

    let listHtml = '';
    if (filtered.length > 0) {
      const items = await Promise.all(filtered.map(async (a) => {
        const isLinked = linkedActIds.includes(a.id);
        const rel = relMap[a.id];
        const posLabel = rel?.posizioneAtto ? tFactPosition(rel.posizioneAtto) : '';
        const linkClass = isLinked ? ' style="border-left:3px solid var(--success);padding-left:8px"' : '';
        return `<div class="proof-link-item"${linkClass}>
            <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                ${a.type ? `<span class="tree-badge tree-badge-neutral" style="font-size:9px">${actTypeLabel(a.type)}</span>` : ''}
                ${a.subtype ? `<span class="tree-badge tree-badge-neutral" style="font-size:9px">${actSubtypeLabel(a.subtype)}</span>` : ''}
                ${isLinked ? `<span class="tree-badge tree-badge-confirm" style="font-size:10px">${posLabel}</span>` : ''}
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">${esc(a.title)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:4px;margin-top:4px">
                <select data-posselect="${a.id}" style="font-size:11px;padding:2px 4px">${positionOptions.map(v => `<option value="${v}" ${(rel?.posizioneAtto || 'afferma') === v ? 'selected' : ''}>${tFactPosition(v)}</option>`).join('')}</select>
                ${isLinked
                  ? `<button class="btn btn-xs" data-action="unlink" data-actid="${a.id}" style="font-size:10px">✕ ${t('unlink')}</button>`
                  : `<button class="btn btn-xs btn-primary" data-action="link" data-actid="${a.id}">${t('linkNewAct')}</button>`
                }
                <button class="btn btn-xs btn-danger" data-action="deletedb" data-actid="${a.id}" style="font-size:10px">${t('deleteFromDB')}</button>
              </div>
            </div>
          </div>`;
      }));
      listHtml = items.join('');
    } else {
      listHtml = `<p class="hint">${t('noResults')}</p>`;
    }

    listContainer.innerHTML = listHtml;

    listContainer.querySelectorAll('[data-action="link"]').forEach(btn => {
      btn.onclick = async () => {
        const aId = parseInt(btn.dataset.actid);
        const posSelect = listContainer.querySelector(`[data-posselect="${aId}"]`);
        const pos = posSelect ? posSelect.value : 'afferma';
        await DB.createFactActRelation({ factId, actId: aId, posizioneAtto: pos });
        await _renderActsList(listContainer);
      };
    });
    listContainer.querySelectorAll('[data-action="unlink"]').forEach(btn => {
      btn.onclick = async () => {
        const aId = parseInt(btn.dataset.actid);
        const rel = relMap[aId];
        if (rel) { await DB.deleteFactActRelation(rel.id); }
        await _renderActsList(listContainer);
      };
    });
    listContainer.querySelectorAll('[data-posselect]').forEach(sel => {
      const aId = parseInt(sel.dataset.posselect);
      if (relMap[aId]) {
        sel.onchange = async () => {
          await DB.updateFactActRelation(relMap[aId].id, { posizioneAtto: sel.value });
          await _renderActsList(listContainer);
        };
      }
    });
    listContainer.querySelectorAll('[data-action="deletedb"]').forEach(btn => {
      btn.onclick = async () => {
        const aId = parseInt(btn.dataset.actid);
        _deleteActFromForm(aId, factId, false, async () => { await _renderActsList(listContainer); });
      };
    });
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.cssText = 'max-width:1100px;width:95%;max-height:90vh;display:flex;flex-direction:column';
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="margin:0">${t('manageActs')}</h3>
      <button class="btn btn-sm" id="btnManageActClose" data-testid="btn-close-manage-acts">&times;</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;min-height:0;overflow:hidden">
      <div style="display:flex;flex-direction:column;min-height:0">
        <div class="form-group" style="margin-bottom:8px;flex-shrink:0">
          <input id="manageActSearch" placeholder="${t('searchActPlaceholder')}" data-testid="input-manage-act-search">
        </div>
        <div id="manageActListContainer" style="flex:1;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:6px"></div>
      </div>
      <div style="display:flex;flex-direction:column;min-height:0;border-left:1px solid var(--border);padding-left:16px">
        <h4 style="margin:0 0 8px">${t('createNewAct')}</h4>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <div class="form-group" style="flex:1;margin-bottom:0">
            <label>${t('actTitle')} * (IT)</label>
            <input type="text" id="manageActNewTitle" data-testid="input-new-act-title" />
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;justify-content:center;padding-top:14px">
            ${_renderTransArrow('manageActNewTitle','manageActNewTitleEN','it','en')}
            ${_renderTransArrow('manageActNewTitleEN','manageActNewTitle','en','it')}
          </div>
          <div class="form-group" style="flex:1;margin-bottom:0">
            <label>${t('actTitle')} (EN)</label>
            <input type="text" id="manageActNewTitleEN" data-testid="input-new-act-title-en" />
          </div>
        </div>
        <div style="margin-bottom:8px">
          ${_buildActTypeSubtypeSelects('manageActNew', '', '')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div>
            <label style="font-size:12px;margin-bottom:4px;display:block">${t('fileIt')}</label>
            <div class="file-drop-zone" data-target="manageActNew" data-droplang="it" style="min-height:48px;font-size:11px;padding:8px;text-align:center;border:2px dashed var(--border);border-radius:var(--radius);cursor:pointer" data-testid="drop-zone-act-it">
              📂 ${t('dropFiles')}
            </div>
          </div>
          <div>
            <label style="font-size:12px;margin-bottom:4px;display:block">${t('fileEn')}</label>
            <div class="file-drop-zone" data-target="manageActNew" data-droplang="en" style="min-height:48px;font-size:11px;padding:8px;text-align:center;border:2px dashed var(--border);border-radius:var(--radius);cursor:pointer" data-testid="drop-zone-act-en">
              📂 ${t('dropFiles')}
            </div>
          </div>
        </div>
        <div id="manageActNewFiles" style="margin-bottom:8px"></div>
        <button class="btn btn-primary" id="btnManageActCreate" data-testid="btn-create-act">${t('createNewAct')}</button>
      </div>
    </div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const listContainer = content.querySelector('#manageActListContainer');
  await _renderActsList(listContainer);

  content.querySelector('#manageActSearch').oninput = (e) => {
    _searchFilter = e.target.value;
    _renderActsList(listContainer);
  };

  const _manageActPendingFiles = [];
  function _renderManageActFileList() {
    const listEl = content.querySelector('#manageActNewFiles');
    if (!listEl) return;
    listEl.innerHTML = _manageActPendingFiles.length > 0 ? _manageActPendingFiles.map((pf, i) =>
      `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px">
        <span class="file-lang-badge file-lang-${pf.lang}" style="font-size:10px">${pf.lang.toUpperCase()}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pf.file.name)}</span>
        <span class="hint">${formatSize(pf.file.size)}</span>
        <button class="btn btn-xs btn-danger" data-removemaf="${i}">${t('delete')}</button>
      </div>`
    ).join('') : '';
    listEl.querySelectorAll('[data-removemaf]').forEach(btn => {
      btn.onclick = () => { _manageActPendingFiles.splice(parseInt(btn.dataset.removemaf), 1); _renderManageActFileList(); };
    });
  }

  content.querySelectorAll('.file-drop-zone[data-target="manageActNew"]').forEach(zone => {
    const lang = zone.dataset.droplang;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      for (const f of e.dataTransfer.files) _manageActPendingFiles.push({ file: f, lang });
      _renderManageActFileList();
    });
    zone.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
      inp.onchange = () => { for (const f of inp.files) _manageActPendingFiles.push({ file: f, lang }); _renderManageActFileList(); };
      inp.click();
    });
  });

  content.querySelector('#btnManageActCreate').onclick = async () => {
    const title = content.querySelector('#manageActNewTitle').value.trim();
    if (!title) { content.querySelector('#manageActNewTitle').focus(); return; }
    const type = content.querySelector('#manageActNewType')?.value || '';
    const subtype = content.querySelector('#manageActNewSubtype')?.value || '';
    const titleEN = (content.querySelector('#manageActNewTitleEN')?.value || '').trim();
    const newAct = await DB.createAct({ title, titleEN, type, subtype, dossierId });
    await DB.createFactActRelation({ factId, actId: newAct.id, posizioneAtto: 'afferma' });
    if (_manageActPendingFiles.length > 0) {
      const hierarchy = await _resolveFileHierarchy('act', dossierId);
      for (const pf of _manageActPendingFiles) await storeFileForEntity(pf.file, 'act', newAct.id, pf.lang, hierarchy);
    }
    content.querySelector('#manageActNewTitle').value = '';
    const enField = content.querySelector('#manageActNewTitleEN');
    if (enField) enField.value = '';
    _manageActPendingFiles.length = 0;
    _renderManageActFileList();
    await _renderActsList(listContainer);
  };

  content.querySelector('#btnManageActClose').onclick = async () => {
    overlay.remove();
    if (onClose) { await onClose(); } else { await _onManageModalClose(factId); }
  };
}

async function openManageProofsModal(factId) {
  const relOptions = ['confirms', 'contradicts', 'integrates', 'ignored'];
  let _searchFilter = '';

  async function _renderManageProofsContent(container) {
    const allProofs = await DB.getAllProofs();

    const filtered = _searchFilter
      ? allProofs.filter(p => _proofMatchesSearch(p, _searchFilter))
      : allProofs;

    let listHtml = '';
    if (filtered.length > 0) {
      const items = filtered.map(pr => {
        return `<div class="proof-link-item" style="justify-content:space-between">
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(proofTitle(pr))}</span>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-xs" data-action="editproof" data-proofid="${pr.id}" data-testid="button-edit-proof-${pr.id}">${t('edit')}</button>
              <button class="btn btn-xs btn-danger" data-action="deletedb" data-proofid="${pr.id}">${t('deleteFromDB')}</button>
            </div>
          </div>`;
      });
      listHtml = items.join('');
    } else {
      listHtml = `<p class="hint">${t('noResults')}</p>`;
    }

    container.innerHTML = `
      <h3>${t('manageProofs')}</h3>
      <div class="form-group" style="margin-bottom:12px">
        <input id="manageProofSearch" placeholder="${t('searchProofPlaceholder')}" value="${esc(_searchFilter)}" data-testid="input-manage-proof-search">
      </div>
      <div class="proof-links-list" style="max-height:300px;overflow-y:auto">${listHtml}</div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn" id="btnManageProofClose">${t('close')}</button>
      </div>
    `;

    container.querySelector('#manageProofSearch').oninput = (e) => {
      _searchFilter = e.target.value;
      _renderManageProofsContent(container);
    };
    container.querySelectorAll('[data-action="editproof"]').forEach(btn => {
      btn.onclick = async () => {
        const pId = parseInt(btn.dataset.proofid);
        openEditProofModal(pId, async () => { await _renderManageProofsContent(container); });
      };
    });
    container.querySelectorAll('[data-action="deletedb"]').forEach(btn => {
      btn.onclick = async () => {
        const pId = parseInt(btn.dataset.proofid);
        _deleteProofFromForm(pId, factId, false, async () => { await _renderManageProofsContent(container); });
      };
    });
    container.querySelector('#btnManageProofClose').onclick = async () => { overlay.remove(); await _onManageModalClose(factId); };
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const content = document.createElement('div');
  content.className = 'modal-content';
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  await _renderManageProofsContent(content);
}

async function openViewProofModal(proofId, contextRelationType) {
  const proof = await DB.getProof(proofId);
  if (!proof) return;
  const files = await DB.getEntityFiles('proof', proofId);

  let relHtml = '';
  if (contextRelationType) {
    const relLabel = tProofRelType(contextRelationType);
    const relCls = contextRelationType === 'confirms' ? 'tree-badge-confirm' : contextRelationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
    relHtml = `<div class="detail-field">
      <div class="detail-field-label">${t('proofRelType')}</div>
      <div class="detail-field-value"><span class="tree-badge ${relCls}">${relLabel}</span></div>
    </div>`;
  } else {
    const factRels = await DB.getProofFactRelations(proofId);
    if (factRels.length > 0) {
      relHtml = `<div class="detail-field"><div class="detail-field-label">${t('entityFact')}</div><div class="detail-field-value">` +
        factRels.map(rel => {
          const f = rel.fact;
          if (!f) return '';
          const relLabel = tProofRelType(rel.relationType || 'confirms');
          const relCls = rel.relationType === 'confirms' ? 'tree-badge-confirm' : rel.relationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
          return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><span class="tree-badge ${relCls}" style="font-size:10px">${relLabel}</span><span>${esc(f.title)}</span></div>`;
        }).join('') + '</div></div>';
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.cssText = 'background:var(--bg-panel);border-radius:8px;padding:24px;max-width:900px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3)';

  const filesIT = files.filter(f => (f.lang || 'it') === 'it');
  const filesEN = files.filter(f => f.lang === 'en');

  function _renderFileCol(langFiles, label) {
    if (langFiles.length === 0) return `<div class="detail-field-label" style="margin-bottom:6px">${label}</div><p class="hint">${t('noFiles')}</p>`;
    const listItems = langFiles.map((f, i) => `
      <div class="file-select-item ${i === 0 ? 'selected' : ''}" data-file-id="${f.id}" onclick="event.stopPropagation(); selectFileForPreview('vpf_${f.lang}_${proofId}', ${f.id}, this)" style="cursor:pointer">
        <div class="file-select-info">
          <span class="file-select-name">${esc(f.fileName)}</span>
          <span class="file-select-meta">${formatSize(f.fileSize)}</span>
        </div>
        <div class="file-select-actions" onclick="event.stopPropagation()">
          <button class="btn btn-xs" onclick="downloadFile(${f.id})">${t('download')}</button>
        </div>
      </div>
    `).join('');
    const firstPreview = renderFilePreview(langFiles[0]);
    return `<div class="detail-field-label" style="margin-bottom:6px">${label}</div>
      <div class="file-viewer" id="vpf_${langFiles[0].lang}_${proofId}">
        <div class="file-select-list">${listItems}</div>
        <div class="file-preview-container" id="vpf_${langFiles[0].lang}_${proofId}_preview">${firstPreview}</div>
      </div>`;
  }

  const vTitle = proofTitle(proof);
  const vNotes = proofNotes(proof);
  const hasFiles = filesIT.length > 0 || filesEN.length > 0;
  const mt = proof.mediaType || 'document';
  const mtIcons = { document: '📄', image: '🖼️', audio: '🎧', video: '🎬' };
  const mtLabels = { document: t('mediaDocument'), image: t('mediaImage'), audio: t('mediaAudio'), video: t('mediaVideo') };
  const mtBadge = `<span class="tree-badge" style="font-size:11px;margin-left:8px">${mtIcons[mt] || '📄'} ${mtLabels[mt] || mt}</span>`;

  let mediaFieldsHtml = '';
  if (mt === 'image') {
    const descIt = proof.imageDescriptionIt || '';
    const descEn = proof.imageDescriptionEn || '';
    if (descIt || descEn) {
      mediaFieldsHtml = `<div class="detail-field"><div class="detail-field-label">${t('imageDescriptionIt')} / ${t('imageDescriptionEn')}</div>
        <div class="detail-field-value" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><span class="file-lang-badge file-lang-it" style="font-size:10px">IT</span> ${esc(descIt)}</div>
          <div><span class="file-lang-badge file-lang-en" style="font-size:10px">EN</span> ${esc(descEn)}</div>
        </div></div>`;
    }
  } else if (mt === 'video') {
    const vdIt = proof.videoDescriptionIt || '';
    const vdEn = proof.videoDescriptionEn || '';
    if (vdIt || vdEn) {
      mediaFieldsHtml += `<div class="detail-field"><div class="detail-field-label">${t('videoDescriptionIt')} / ${t('videoDescriptionEn')}</div>
        <div class="detail-field-value" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><span class="file-lang-badge file-lang-it" style="font-size:10px">IT</span> ${esc(vdIt)}</div>
          <div><span class="file-lang-badge file-lang-en" style="font-size:10px">EN</span> ${esc(vdEn)}</div>
        </div></div>`;
    }
  }
  if (mt === 'audio' || mt === 'video') {
    const trIt = proof.transcriptIt || '';
    const trEn = proof.transcriptEn || '';
    if (trIt || trEn) {
      mediaFieldsHtml += `<div class="detail-field"><div class="detail-field-label">${t('proofTranscriptIt')} / ${t('proofTranscriptEn')}</div>
        <div class="detail-field-value" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><span class="file-lang-badge file-lang-it" style="font-size:10px">IT</span> <span style="white-space:pre-wrap">${esc(trIt)}</span></div>
          <div><span class="file-lang-badge file-lang-en" style="font-size:10px">EN</span> <span style="white-space:pre-wrap">${esc(trEn)}</span></div>
        </div></div>`;
    }
  }

  modal.innerHTML = `
    <div class="detail-panel" style="border:none;box-shadow:none;padding:0">
      <div class="detail-header" style="margin-bottom:12px">
        <h3 style="margin:0">${esc(vTitle)}${mtBadge}</h3>
      </div>
      ${relHtml}
      ${vNotes ? `<div class="detail-field">
        <div class="detail-field-label">${t('proofNotes')}</div>
        <div class="detail-field-value">${esc(vNotes)}</div>
      </div>` : ''}
      ${mediaFieldsHtml}
      ${hasFiles ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
        <div>${_renderFileCol(filesIT, 'IT')}</div>
        <div>${_renderFileCol(filesEN, 'EN')}</div>
      </div>` : ''}
    </div>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn" id="btnViewProofClose">${t('close')}</button>
    </div>
  `;

  modal.querySelector('#btnViewProofClose').onclick = () => overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function openEditProofModal(proofId, onSaved) {
  const _pendingFiles = [];

  const overlay2 = document.createElement('div');
  overlay2.className = 'modal-overlay';
  overlay2.style.zIndex = '1300';

  const modal2 = document.createElement('div');
  modal2.className = 'modal-content proof-modal-wide';

  function _renderPendingFiles() {
    const listEl = modal2.querySelector('#editProofPendingFiles');
    if (!listEl) return;
    listEl.innerHTML = _pendingFiles.length > 0 ? _pendingFiles.map((pf, i) =>
      `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px">
        <span class="file-lang-badge file-lang-${pf.lang}" style="font-size:10px">${pf.lang.toUpperCase()}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pf.file.name)}</span>
        <span class="hint">${formatSize(pf.file.size)}</span>
        <button class="btn btn-xs btn-danger" data-removepending="${i}">${t('delete')}</button>
      </div>`
    ).join('') : '';
    listEl.querySelectorAll('[data-removepending]').forEach(btn => {
      btn.onclick = () => { _pendingFiles.splice(parseInt(btn.dataset.removepending), 1); _renderPendingFiles(); };
    });
  }

  async function _renderExistingFiles() {
    const listEl = modal2.querySelector('#editProofExistingFiles');
    if (!listEl) return;
    const files = await DB.getEntityFiles('proof', proofId);
    if (files.length > 0) {
      listEl.innerHTML = files.map(f =>
        `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:12px">
          <span class="file-lang-badge file-lang-${f.lang || 'it'}" style="font-size:10px">${(f.lang || 'it').toUpperCase()}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.fileName)}</span>
          <span class="hint">${formatSize(f.fileSize)}</span>
          <button class="btn btn-xs btn-danger" data-deletefileid="${f.id}">${t('delete')}</button>
        </div>`
      ).join('');
      listEl.querySelectorAll('[data-deletefileid]').forEach(btn => {
        btn.onclick = async () => {
          await DB.deleteFile(parseInt(btn.dataset.deletefileid));
          await _renderExistingFiles();
        };
      });
    } else {
      listEl.innerHTML = '';
    }
  }

  async function _renderEditProof() {
    const proof = await DB.getProof(proofId);
    if (!proof) { overlay2.remove(); return; }
    const mt = proof.mediaType || 'document';
    const showImg = mt === 'image';
    const showVid = mt === 'video';
    const showTrans = mt === 'audio' || mt === 'video';
    modal2.innerHTML = `
      <div class="proof-modal-header">
        <h3>${t('editProof')}</h3>
        <div class="header-actions">
          <button type="button" class="btn btn-sm" id="btnEpOpenTools" style="${showTrans?'':'display:none'}" data-testid="button-ep-open-tools">🛠 ${t('openToolsTranscribe')}</button>
          <button class="btn btn-sm btn-primary" id="btnEditProofSave" data-testid="button-edit-proof-save">${t('save')}</button>
          <button class="btn btn-sm" id="btnEditProofCancel">${t('cancel')}</button>
        </div>
      </div>
      <div class="proof-modal-body">
        <div class="proof-col">
          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>${t('proofDate')}</label>
              <input type="date" id="editProofDate" value="${esc(proof.proofDate || '')}" data-testid="input-edit-proof-date">
            </div>
            <div class="form-group" style="flex:1">
              <label>${t('proofTime')}</label>
              <input type="time" id="editProofTime" value="${esc(proof.proofTime || '')}" data-testid="input-edit-proof-time">
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>${t('proofTitleIT')}</label>
              <input id="editProofTitle" value="${esc(proof.title || '')}" data-testid="input-edit-proof-title">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
              ${_renderTransArrow('editProofTitle','editProofTitleEN','it','en')}
              ${_renderTransArrow('editProofTitleEN','editProofTitle','en','it')}
            </div>
            <div class="form-group" style="flex:1">
              <label>${t('proofTitleEN')}</label>
              <input id="editProofTitleEN" value="${esc(proof.title_en || '')}" data-testid="input-edit-proof-title-en">
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>${t('proofNotesIT')}</label>
              <textarea id="editProofNotes" rows="2" data-testid="input-edit-proof-notes">${esc(proof.notes || '')}</textarea>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
              ${_renderTransArrow('editProofNotes','editProofNotesEN','it','en')}
              ${_renderTransArrow('editProofNotesEN','editProofNotes','en','it')}
            </div>
            <div class="form-group" style="flex:1">
              <label>${t('proofNotesEN')}</label>
              <textarea id="editProofNotesEN" rows="2" data-testid="input-edit-proof-notes-en">${esc(proof.notes_en || '')}</textarea>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div class="file-drop-zone" data-droplang="it" data-target="editProofModal" style="flex:1"><div class="file-drop-label">📄 IT</div><div style="font-size:11px;color:var(--text-secondary)">${t('dropFiles')}</div></div>
            <div class="file-drop-zone" data-droplang="en" data-target="editProofModal" style="flex:1"><div class="file-drop-label">📄 EN</div><div style="font-size:11px;color:var(--text-secondary)">${t('dropFiles')}</div></div>
          </div>
          <div id="editProofExistingFiles" style="margin-top:8px"></div>
          <div id="editProofPendingFiles"></div>
        </div>
        <div class="proof-col">
          <div class="form-group">
            <label>${t('proofMediaType')}</label>
            <div class="btn-group" id="editProofMediaType" style="display:flex;gap:4px;flex-wrap:wrap" data-testid="select-edit-proof-media-type">
              <button type="button" class="btn btn-sm media-type-btn ${mt==='document'?'active':''}" data-mtype="document">📄 ${t('mediaDocument')}</button>
              <button type="button" class="btn btn-sm media-type-btn ${mt==='image'?'active':''}" data-mtype="image">🖼️ ${t('mediaImage')}</button>
              <button type="button" class="btn btn-sm media-type-btn ${mt==='audio'?'active':''}" data-mtype="audio">🎧 ${t('mediaAudio')}</button>
              <button type="button" class="btn btn-sm media-type-btn ${mt==='video'?'active':''}" data-mtype="video">🎬 ${t('mediaVideo')}</button>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div style="flex:1">
              <div id="epImageDescItGroup" class="form-group" style="${showImg?'':'display:none'}">
                <label>${t('imageDescriptionIt')}</label>
                <textarea id="editProofImageDescIt" rows="2" data-testid="textarea-edit-proof-image-desc-it">${esc(proof.imageDescriptionIt || '')}</textarea>
              </div>
              <div id="epVideoDescItGroup" class="form-group" style="${showVid?'':'display:none'}">
                <label>${t('videoDescriptionIt')}</label>
                <textarea id="editProofVideoDescIt" rows="2" data-testid="textarea-edit-proof-video-desc-it">${esc(proof.videoDescriptionIt || '')}</textarea>
              </div>
              <div id="epTranscriptItGroup" class="form-group" style="${showTrans?'':'display:none'}">
                <label>${t('proofTranscriptIt')}</label>
                <textarea id="editProofTranscriptIt" rows="3" data-testid="textarea-edit-proof-transcript-it">${esc(proof.transcriptIt || '')}</textarea>
              </div>
            </div>
            <div id="epTransArrows" style="${mt !== 'document' ? 'display:flex' : 'display:none'};flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
              <span class="ep-arrow-img" style="${showImg?'':'display:none'}">${_renderTransArrow('editProofImageDescIt','editProofImageDescEn','it','en')}</span>
              <span class="ep-arrow-img" style="${showImg?'':'display:none'}">${_renderTransArrow('editProofImageDescEn','editProofImageDescIt','en','it')}</span>
              <span class="ep-arrow-vid" style="${showVid?'':'display:none'}">${_renderTransArrow('editProofVideoDescIt','editProofVideoDescEn','it','en')}</span>
              <span class="ep-arrow-vid" style="${showVid?'':'display:none'}">${_renderTransArrow('editProofVideoDescEn','editProofVideoDescIt','en','it')}</span>
              <span class="ep-arrow-trans" style="${showTrans?'':'display:none'}">${_renderTransArrow('editProofTranscriptIt','editProofTranscriptEn','it','en')}</span>
              <span class="ep-arrow-trans" style="${showTrans?'':'display:none'}">${_renderTransArrow('editProofTranscriptEn','editProofTranscriptIt','en','it')}</span>
            </div>
            <div style="flex:1">
              <div id="epImageDescEnGroup" class="form-group" style="${showImg?'':'display:none'}">
                <label>${t('imageDescriptionEn')}</label>
                <textarea id="editProofImageDescEn" rows="2" data-testid="textarea-edit-proof-image-desc-en">${esc(proof.imageDescriptionEn || '')}</textarea>
              </div>
              <div id="epVideoDescEnGroup" class="form-group" style="${showVid?'':'display:none'}">
                <label>${t('videoDescriptionEn')}</label>
                <textarea id="editProofVideoDescEn" rows="2" data-testid="textarea-edit-proof-video-desc-en">${esc(proof.videoDescriptionEn || '')}</textarea>
              </div>
              <div id="epTranscriptEnGroup" class="form-group" style="${showTrans?'':'display:none'}">
                <label>${t('proofTranscriptEn')}</label>
                <textarea id="editProofTranscriptEn" rows="3" data-testid="textarea-edit-proof-transcript-en">${esc(proof.transcriptEn || '')}</textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    await _renderExistingFiles();

    let _editMediaType = mt;
    function _toggleEditMediaFields(mtype) {
      _editMediaType = mtype;
      modal2.querySelectorAll('.media-type-btn').forEach(b => b.classList.toggle('active', b.dataset.mtype === mtype));
      const show = (id, vis) => { const el = document.getElementById(id); if (el) el.style.display = vis ? '' : 'none'; };
      show('epImageDescItGroup', mtype === 'image');
      show('epImageDescEnGroup', mtype === 'image');
      show('epVideoDescItGroup', mtype === 'video');
      show('epVideoDescEnGroup', mtype === 'video');
      show('epTranscriptItGroup', mtype === 'audio' || mtype === 'video');
      show('epTranscriptEnGroup', mtype === 'audio' || mtype === 'video');
      const epArrowsDiv = document.getElementById('epTransArrows');
      if (epArrowsDiv) {
        epArrowsDiv.style.display = (mtype !== 'document') ? 'flex' : 'none';
        epArrowsDiv.querySelectorAll('.ep-arrow-img').forEach(el => el.style.display = mtype === 'image' ? '' : 'none');
        epArrowsDiv.querySelectorAll('.ep-arrow-vid').forEach(el => el.style.display = mtype === 'video' ? '' : 'none');
        epArrowsDiv.querySelectorAll('.ep-arrow-trans').forEach(el => el.style.display = (mtype === 'audio' || mtype === 'video') ? '' : 'none');
      }
      const epToolsHeaderBtn = modal2.querySelector('#btnEpOpenTools');
      if (epToolsHeaderBtn) epToolsHeaderBtn.style.display = (mtype === 'audio' || mtype === 'video' || mtype === 'image') ? '' : 'none';
    }

    modal2.querySelectorAll('.media-type-btn').forEach(btn => {
      btn.onclick = () => _toggleEditMediaFields(btn.dataset.mtype);
    });

    let _editSelectedMediaType = proof.mediaType || 'document';
    modal2.querySelectorAll('.media-type-btn').forEach(btn => {
      const origClick = btn.onclick;
      btn.onclick = () => { _editSelectedMediaType = btn.dataset.mtype; origClick(); };
    });
    const epToolsBtn = modal2.querySelector('#btnEpOpenTools');
    if (epToolsBtn) epToolsBtn.onclick = () => openToolsModal(_editSelectedMediaType === 'image' || _editSelectedMediaType === 'video' ? 'mediadesc' : 'transcribe');

    modal2.querySelectorAll('.file-drop-zone[data-target="editProofModal"]').forEach(zone => {
      const lang = zone.dataset.droplang;
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        for (const f of e.dataTransfer.files) _pendingFiles.push({ file: f, lang });
        _renderPendingFiles();
      });
      zone.addEventListener('click', () => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
        inp.onchange = () => { for (const f of inp.files) _pendingFiles.push({ file: f, lang }); _renderPendingFiles(); };
        inp.click();
      });
    });

    modal2.querySelector('#btnEditProofSave').onclick = async () => {
      const title = document.getElementById('editProofTitle').value.trim();
      if (!title) { alert(t('proofTitleRequired')); document.getElementById('editProofTitle').focus(); return; }
      const updateData = {
        title,
        title_en: document.getElementById('editProofTitleEN').value.trim(),
        notes: document.getElementById('editProofNotes').value.trim(),
        notes_en: document.getElementById('editProofNotesEN').value.trim(),
        mediaType: _editMediaType,
        proofDate: document.getElementById('editProofDate')?.value || '',
        proofTime: document.getElementById('editProofTime')?.value || ''
      };
      if (_editMediaType === 'image') {
        updateData.imageDescriptionIt = (document.getElementById('editProofImageDescIt')?.value || '').trim();
        updateData.imageDescriptionEn = (document.getElementById('editProofImageDescEn')?.value || '').trim();
      }
      if (_editMediaType === 'video') {
        updateData.videoDescriptionIt = (document.getElementById('editProofVideoDescIt')?.value || '').trim();
        updateData.videoDescriptionEn = (document.getElementById('editProofVideoDescEn')?.value || '').trim();
      }
      if (_editMediaType === 'audio' || _editMediaType === 'video') {
        updateData.transcriptIt = (document.getElementById('editProofTranscriptIt')?.value || '').trim();
        updateData.transcriptEn = (document.getElementById('editProofTranscriptEn')?.value || '').trim();
      }
      await DB.updateProof(proofId, updateData);
      if (_pendingFiles.length > 0) {
        const hierarchy = await _resolveFileHierarchy('proof', null);
        for (const pf of _pendingFiles) await storeFileForEntity(pf.file, 'proof', proofId, pf.lang, hierarchy);
      }
      overlay2.remove();
      if (onSaved) await onSaved();
    };
    modal2.querySelector('#btnEditProofCancel').onclick = () => overlay2.remove();
  }

  overlay2.appendChild(modal2);
  overlay2.addEventListener('click', (e) => { if (e.target === overlay2) overlay2.remove(); });
  document.body.appendChild(overlay2);
  _renderEditProof();
}

/* ========== PROCEEDING ROLES ========== */
async function openAddRoleModal(proceedingId, procType) {
  const subjects = await DB.getSubjects();
  if (subjects.length === 0) { alert(t('noSubjects')); return; }
  await _loadAllLists();
  const roleCatalog = ROLE_CATALOGS[procType] || ROLE_CATALOGS['altro'];

  function subjOptionLabel(s) {
    let label = `${s.lastName} ${s.firstName}`;
    if (s.roles && s.roles.length > 0) {
      const r = s.roles[0];
      let ql = '';
      if (r.roleId) { const rl = _allRoles.find(x => x.id === r.roleId); if (rl) ql = _labelFor(rl); }
      else if (r.subcategoryId) { const sub = _allSubcategories.find(x => x.id === r.subcategoryId); if (sub) ql = _labelFor(sub); }
      else if (r.categoryId) { const cat = _allCategories.find(x => x.id === r.categoryId); if (cat) ql = _labelFor(cat); }
      if (ql) label += ` — ${ql}`;
    }
    return label;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('procRolesTitle')}</h3>
      <div class="form-group">
        <label>${t('selectSubjectForRole')}</label>
        <select id="fRoleSubject">
          ${subjects.map(s => `<option value="${s.id}">${esc(subjOptionLabel(s))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('roleCode')}</label>
        <select id="fRoleCode">
          ${roleCatalog.map(r => `<option value="${r}">${tRole(r)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('roleStartDate')}</label>
        <input type="date" id="fRoleStart">
      </div>
      <div class="form-group">
        <label>${t('roleEndDate')}</label>
        <input type="date" id="fRoleEnd">
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnConfirmRole">${t('confirm')}</button>
        <button class="btn" id="btnCancelRole">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnConfirmRole').onclick = async () => {
    const subjectId = parseInt(document.getElementById('fRoleSubject').value);
    const roleCode = document.getElementById('fRoleCode').value;
    const startDate = document.getElementById('fRoleStart').value;
    const endDate = document.getElementById('fRoleEnd').value;
    await DB.addProceedingRole({
      proceedingId, subjectId, roleCode,
      startDate, endDate, roleStatus: 'active', notes: ''
    });
    overlay.remove();
    await renderProceedingRolesDetail(proceedingId);
  };
  document.getElementById('btnCancelRole').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function removeProcRole(roleId, proceedingId) {
  await DB.removeProceedingRole(roleId);
  await renderProceedingRolesDetail(proceedingId);
}

/* ========== PROCEEDING ACTIONS ========== */
async function openAddActionModal(proceedingId) {
  const subjects = await DB.getSubjects();
  if (subjects.length === 0) { alert(t('noSubjects')); return; }
  const actionTypes = ACTION_TYPES;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('addAction')}</h3>
      <div class="form-group">
        <label>${t('selectSubjectForRole')}</label>
        <select id="fActionSubject">
          ${subjects.map(s => `<option value="${s.id}">${esc(s.lastName)} ${esc(s.firstName)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('actionType')}</label>
        <select id="fActionType">
          ${actionTypes.map(a => `<option value="${a}">${tAction(a)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('actionDate')}</label>
        <input type="date" id="fActionDate">
      </div>
      <div class="form-group">
        <label>${t('actionOutcome')}</label>
        <input id="fActionOutcome">
      </div>
      <div class="form-group">
        <label>${t('actionNotes')}</label>
        <textarea id="fActionNotes" rows="2"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnConfirmAction">${t('confirm')}</button>
        <button class="btn" id="btnCancelAction">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnConfirmAction').onclick = async () => {
    const subjectId = parseInt(document.getElementById('fActionSubject').value);
    const actionType = document.getElementById('fActionType').value;
    const actionDate = document.getElementById('fActionDate').value;
    const outcome = document.getElementById('fActionOutcome').value.trim();
    const notes = document.getElementById('fActionNotes').value.trim();
    await DB.addProceedingAction({
      proceedingId, subjectId, actionType, actionDate, outcome, notes, linkedActId: null
    });
    overlay.remove();
    state.activeTab = 'actions';
    await showDetail('proceeding', proceedingId);
  };
  document.getElementById('btnCancelAction').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function removeProcAction(actionId, proceedingId) {
  await DB.removeProceedingAction(actionId);
  state.activeTab = 'actions';
  await showDetail('proceeding', proceedingId);
}

/* ========== PROCEEDING LINKS ========== */
async function openAddLinkModal(proceedingId) {
  const allProcs = await DB.getAllProceedings();
  const otherProcs = allProcs.filter(p => p.id !== proceedingId);
  if (otherProcs.length === 0) { alert(t('noLinks')); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('addLink')}</h3>
      <div class="form-group">
        <label>${t('linkedProceeding')}</label>
        <select id="fLinkProc">
          ${otherProcs.map(p => `<option value="${p.id}">${esc(buildProcTitle(p))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('linkType')}</label>
        <select id="fLinkType">
          ${LINK_TYPES.map(lt => `<option value="${lt}">${t(lt)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnConfirmProcLink">${t('confirm')}</button>
        <button class="btn" id="btnCancelProcLink">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnConfirmProcLink').onclick = async () => {
    const relatedProceedingId = parseInt(document.getElementById('fLinkProc').value);
    const linkType = document.getElementById('fLinkType').value;
    await DB.addProceedingLink({ proceedingId, relatedProceedingId, linkType });
    overlay.remove();
    state.activeTab = 'links';
    await showDetail('proceeding', proceedingId);
  };
  document.getElementById('btnCancelProcLink').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function removeProcLink(linkId, proceedingId) {
  await DB.removeProceedingLink(linkId);
  state.activeTab = 'links';
  await showDetail('proceeding', proceedingId);
}

/* ========== SUBJECTS ========== */
let _subjectRoles = [];
let _subjectActs = [];
let _allCategories = [];
let _allSubcategories = [];
let _allRoles = [];

async function _loadAllLists() {
  _allCategories = await DB.getListItems('categories');
  _allSubcategories = await DB.getListItems('subcategories');
  _allRoles = await DB.getListItems('roles');
  console.log('Lists loaded — categories:', _allCategories.length, 'subcategories:', _allSubcategories.length, 'roles:', _allRoles.length);
  if (_allCategories.length === 0) {
    console.warn('No categories found — forcing system DB re-seed...');
    await SysDB.reseed();
    _allCategories = await DB.getListItems('categories');
    _allSubcategories = await DB.getListItems('subcategories');
    console.log('After re-seed — categories:', _allCategories.length, 'subcategories:', _allSubcategories.length);
  }
}

function _labelFor(item) {
  return item ? DB.getItemLabel(item, currentLang) : '';
}

async function showSubjectForm(editId) {
  const isEdit = !!editId;
  const existing = isEdit ? await DB.getSubject(editId) : null;
  await _loadAllLists();
  _subjectRoles = existing?.roles ? JSON.parse(JSON.stringify(existing.roles)) : [];
  _subjectActs = [];
  if (isEdit) {
    const links = await DB.getSubjectLinks(editId);
    for (const l of links) {
      if (l.entityType === 'act' && l.entity) {
        _subjectActs.push({ actId: l.entity.id, title: l.entity.title || '' });
      }
    }
  }

  hideAllPanels();
  document.getElementById('formView').style.display = 'block';
  const panel = document.getElementById('formView');
  panel.innerHTML = `
    <div class="form-panel">
      <h2>${t(isEdit ? 'editSubject' : 'newSubject')}</h2>
      <div class="form-row">
        <div class="form-group" style="flex:0 0 160px;position:relative">
          <label>${t('salutation')}</label>
          <input id="fSubSalutation" value="${esc(existing?.salutation || '')}" autocomplete="off" data-testid="input-salutation">
          <div id="fSubSalutationList" class="autocomplete-list" data-testid="list-salutation"></div>
        </div>
        <div class="form-group form-group-half">
          <label>${t('firstName')}</label>
          <input id="fSubFirst" value="${esc(existing?.firstName || '')}" required data-testid="input-first-name">
        </div>
        <div class="form-group form-group-half">
          <label>${t('lastName')}</label>
          <input id="fSubLast" value="${esc(existing?.lastName || '')}" required data-testid="input-last-name">
        </div>
        <div class="form-group" style="flex:0 0 180px;position:relative">
          <label>${t('origin')}</label>
          <input id="fSubOrigin" value="${esc(existing?.origin || '')}" autocomplete="off" data-testid="input-origin">
          <div id="fSubOriginList" class="autocomplete-list" data-testid="list-origin"></div>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <div class="form-group" style="flex:1">
          <label>${t('descrIt')}</label>
          <textarea id="fSubDescrIt" rows="2">${esc(existing?.descriptionIt || '')}</textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center;padding-top:16px">
          ${_renderTransArrow('fSubDescrIt','fSubDescrEn','it','en')}
          ${_renderTransArrow('fSubDescrEn','fSubDescrIt','en','it')}
        </div>
        <div class="form-group" style="flex:1">
          <label>${t('descrEn')}</label>
          <textarea id="fSubDescrEn" rows="2">${esc(existing?.descriptionEn || '')}</textarea>
        </div>
      </div>
      <div class="form-section-header">
        <h3>${t('rolesSection')}</h3>
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-primary" onclick="addSubjectRoleEntry()">${t('addRole')}</button>
        </div>
      </div>
      <div id="subjectRolesContainer"></div>
      <div class="form-section-header">
        <h3>${t('linkedActsSection')}</h3>
      </div>
      <div id="subjectActsReadonly"></div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveSubject(${editId || 'null'})">${t('save')}</button>
        <button class="btn" onclick="cancelForm()">${t('cancel')}</button>
      </div>
    </div>
  `;
  renderSubjectRoleEntries();
  _renderSubjectActsReadonly();
  setupSalutationAutocomplete('fSubSalutation', 'fSubSalutationList');
  setupCittaAutocomplete('fSubOrigin', 'fSubOriginList', {}, { formatValue: c => c.comune + (c.provincia ? ' (' + c.provincia + ')' : '') });
}

function _buildFlatRoleList() {
  const flat = [];
  _allRoles.forEach(role => {
    const subcat = _allSubcategories.find(s => s.id === (role.subcategoryId || role.parentId));
    const cat = subcat ? _allCategories.find(c => c.id === (subcat.categoryId || subcat.parentId)) : null;
    const roleLabel = _labelFor(role);
    const subcatLabel = subcat ? _labelFor(subcat) : '';
    const catLabel = cat ? _labelFor(cat) : '';
    const searchText = (roleLabel + ' ' + subcatLabel + ' ' + catLabel).toLowerCase();
    flat.push({
      roleId: role.id,
      subcategoryId: subcat ? subcat.id : null,
      categoryId: cat ? cat.id : null,
      roleLabel,
      subcatLabel,
      catLabel,
      displayLabel: roleLabel + (subcatLabel ? ' — ' + subcatLabel : ''),
      searchText
    });
  });
  return flat;
}

function _getCurrentRoleLabel(r) {
  if (r.roleId) {
    const role = _allRoles.find(x => x.id === r.roleId);
    if (role) {
      const subcat = _allSubcategories.find(s => s.id === (role.subcategoryId || role.parentId));
      return _labelFor(role) + (subcat ? ' — ' + _labelFor(subcat) : '');
    }
  }
  return '';
}

function setupRoleAutocomplete(inputId, suggestionsId, rolesArr, idx, renderFn) {
  const input = document.getElementById(inputId);
  const sugBox = document.getElementById(suggestionsId);
  if (!input || !sugBox) return;
  const flatList = _buildFlatRoleList();
  let _selectedFromList = !!rolesArr[idx].roleId;

  input.addEventListener('input', function() {
    _selectedFromList = false;
    rolesArr[idx].roleId = null;
    rolesArr[idx].subcategoryId = null;
    rolesArr[idx].categoryId = null;
    const q = this.value.toLowerCase().trim();
    sugBox.innerHTML = '';
    if (!q) { sugBox.style.display = 'none'; return; }
    const matches = flatList.filter(f => f.searchText.includes(q)).slice(0, 12);
    if (matches.length === 0) { sugBox.style.display = 'none'; return; }
    matches.forEach(m => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.innerHTML = `<strong>${esc(m.roleLabel)}</strong> <span class="hint">${esc(m.subcatLabel)}</span>`;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        rolesArr[idx].roleId = m.roleId;
        rolesArr[idx].subcategoryId = m.subcategoryId;
        rolesArr[idx].categoryId = m.categoryId;
        input.value = m.displayLabel;
        sugBox.style.display = 'none';
        _selectedFromList = true;
        _updateRoleDetailsPanel(inputId, rolesArr[idx]);
      });
      sugBox.appendChild(div);
    });
    sugBox.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      sugBox.style.display = 'none';
      if (!_selectedFromList && input.value.trim()) {
        input.value = '';
        rolesArr[idx].roleId = null;
        rolesArr[idx].subcategoryId = null;
        rolesArr[idx].categoryId = null;
      }
    }, 200);
  });
  input.addEventListener('focus', function() { if (this.value.trim() && !_selectedFromList) this.dispatchEvent(new Event('input')); });
}

function _updateRoleDetailsPanel(inputId, roleData) {
  const prefix = inputId.replace(/_role_\d+$/, '');
  const idx = inputId.match(/_(\d+)$/)?.[1];
  if (!idx) return;
  let detailPrefix;
  if (inputId.startsWith('fModalRole_')) detailPrefix = 'fModal';
  else detailPrefix = 'f';
  const detailDiv = document.getElementById(`${detailPrefix}RoleDetails_${idx}`);
  if (!detailDiv) return;
  const catLabel = roleData.categoryId ? _labelFor(_allCategories.find(c => c.id === roleData.categoryId)) : '—';
  const subcatLabel = roleData.subcategoryId ? _labelFor(_allSubcategories.find(s => s.id === roleData.subcategoryId)) : '—';
  const roleLabel = roleData.roleId ? _labelFor(_allRoles.find(rl => rl.id === roleData.roleId)) : '—';
  const inputs = detailDiv.querySelectorAll('input[readonly]');
  if (inputs.length >= 3) {
    inputs[0].value = catLabel;
    inputs[1].value = subcatLabel;
    inputs[2].value = roleLabel;
  }
}

function toggleRoleDetails(idx, prefix) {
  const detailDiv = document.getElementById(`${prefix}RoleDetails_${idx}`);
  const btn = document.getElementById(`${prefix}RoleDetailsBtn_${idx}`);
  if (!detailDiv || !btn) return;
  const visible = detailDiv.style.display !== 'none';
  detailDiv.style.display = visible ? 'none' : 'block';
  btn.textContent = visible ? t('showCatDetails') : t('hideCatDetails');
}

function renderSubjectRoleEntries() {
  const container = document.getElementById('subjectRolesContainer');
  if (!container) return;
  if (_subjectRoles.length === 0) {
    container.innerHTML = '<p class="hint">' + t('noRolesAssigned') + '</p>';
    return;
  }
  container.innerHTML = _subjectRoles.map((r, idx) => {
    const currentLabel = _getCurrentRoleLabel(r);
    const catLabel = r.categoryId ? _labelFor(_allCategories.find(c => c.id === r.categoryId)) : '—';
    const subcatLabel = r.subcategoryId ? _labelFor(_allSubcategories.find(s => s.id === r.subcategoryId)) : '—';
    const roleLabel = r.roleId ? _labelFor(_allRoles.find(rl => rl.id === r.roleId)) : '—';
    return `
    <div class="repeatable-group">
      <div class="repeatable-group-header">
        <span class="repeatable-group-num">#${idx + 1}</span>
        <button class="btn btn-xs btn-danger" onclick="removeSubjectRoleEntry(${idx})">${t('removeRole')}</button>
      </div>
      <div class="form-row form-row-5col">
        <div class="form-group form-group-fifth">
          <label>${t('startDate')} (IN)</label>
          <input type="date" id="fRole_start_${idx}" value="${r.startDate || ''}" onchange="onSubjectRoleFieldChange(${idx}, 'startDate', this.value)">
        </div>
        <div class="form-group form-group-fifth">
          <label>${t('endDate')} (OUT)</label>
          <input type="date" id="fRole_end_${idx}" value="${r.endDate || ''}" onchange="onSubjectRoleFieldChange(${idx}, 'endDate', this.value)">
        </div>
        <div class="form-group form-group-fifth autocomplete-wrap" style="flex:2 1 0">
          <label>${t('subjectRole')}</label>
          <input id="fRole_role_${idx}" value="${esc(currentLabel)}" autocomplete="off" placeholder="${t('searchRolePlaceholder')}">
          <div id="fRole_role_${idx}_suggestions" class="autocomplete-list"></div>
        </div>
        <div class="form-group form-group-fifth autocomplete-wrap">
          <label>${t('sede')}</label>
          <input id="fRole_citta_${idx}" value="${esc(r.citta || '')}" autocomplete="off" placeholder="${t('citta')}..." onchange="onSubjectRoleFieldChange(${idx}, 'citta', this.value)">
          <div id="fRole_citta_${idx}_suggestions" class="autocomplete-list"></div>
        </div>
        <div class="form-group" style="flex:0 0 auto;align-self:flex-end">
          <button class="btn btn-xs" id="fRoleDetailsBtn_${idx}" onclick="toggleRoleDetails(${idx}, 'f')" type="button">${t('showCatDetails')}</button>
        </div>
      </div>
      <div id="fRoleDetails_${idx}" class="role-details-row" style="display:none">
        <div class="form-row">
          <div class="form-group form-group-third">
            <label>${t('category')}</label>
            <input readonly value="${esc(catLabel)}" class="input-readonly">
          </div>
          <div class="form-group form-group-third">
            <label>${t('subcategory')}</label>
            <input readonly value="${esc(subcatLabel)}" class="input-readonly">
          </div>
          <div class="form-group form-group-third">
            <label>${t('subjectRole')}</label>
            <input readonly value="${esc(roleLabel)}" class="input-readonly">
          </div>
        </div>
      </div>
    </div>
  `}).join('');
  _subjectRoles.forEach((r, idx) => {
    setupRoleAutocomplete(`fRole_role_${idx}`, `fRole_role_${idx}_suggestions`, _subjectRoles, idx, renderSubjectRoleEntries);
    setupCittaAutocomplete(`fRole_citta_${idx}`, `fRole_citta_${idx}_suggestions`, {});
  });
}

function addSubjectRoleEntry() {
  _subjectRoles.push({
    categoryId: null,
    subcategoryId: null,
    roleId: null,
    startDate: '',
    endDate: '',
    citta: ''
  });
  renderSubjectRoleEntries();
}

function removeSubjectRoleEntry(idx) {
  _subjectRoles.splice(idx, 1);
  renderSubjectRoleEntries();
}

function onSubjectRoleFieldChange(idx, field, value) {
  if (_subjectRoles[idx]) {
    _subjectRoles[idx][field] = value;
  }
}

function _renderSubjectActsReadonly() {
  const container = document.getElementById('subjectActsReadonly');
  if (!container) return;
  if (_subjectActs.length === 0) {
    container.innerHTML = '<p class="hint">' + t('noLinkedActs') + '</p>';
    return;
  }
  container.innerHTML = _subjectActs.map(entry => {
    return `<div class="fact-col-detail-item" style="cursor:default" data-testid="readonly-act-${entry.actId}">
      <span style="margin-right:4px">📋</span>
      <span style="flex:1">${esc(entry.title || '')}</span>
    </div>`;
  }).join('');
}

/* ========== SUBJECT-ACT LINK MODAL ========== */
let _subjectActOverlay = null;
let _subjectActSelectedId = null;
let _subjectActEditActive = false;
let _subjectActSearchQuery = '';

async function openSubjectActLinkModal() {
  if (_subjectActOverlay) _subjectActOverlay.remove();
  _subjectActSelectedId = null;
  _subjectActEditActive = false;
  _subjectActSearchQuery = '';

  const overlay = document.createElement('div');
  overlay.className = 'fact-analysis-overlay';
  _subjectActOverlay = overlay;

  const modal = document.createElement('div');
  modal.className = 'fact-analysis-modal';
  modal.innerHTML = `
    <div class="fact-analysis-header" id="subjectActHeader">
      <h3 data-testid="text-subject-act-title">${t('subjectActLinkTitle')}</h3>
      <div style="display:flex;align-items:center;gap:8px">
        ${creatorOnly(`<button class="btn btn-sm" onclick="_toggleSubjectActEditMode()" data-testid="button-subject-act-edit-mode" title="${t('editMode')}">✏️</button>`)}
        <button class="fact-analysis-close" onclick="_closeSubjectActModal()" data-testid="button-subject-act-close">✕</button>
      </div>
    </div>
    <div class="fact-columns-layout" style="grid-template-columns:260px 1fr">
      <div class="fact-column" id="saColSubjects">
        <div class="fact-column-header" id="saColSubjectsHeader">
          <span>${t('subjectsColumnTitle')}</span>
        </div>
        <div class="fact-column-body" id="saColSubjectsList"></div>
      </div>
      <div class="fact-column" id="saColActs">
        <div class="fact-column-header" id="saColActsHeader">
          <span>${t('actsColumnTitle')}</span>
        </div>
        <div class="fact-column-body" id="saColActsBody"></div>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeSubjectActModal(); });
  document.body.appendChild(overlay);

  const subjects = await DB.getSubjects();
  if (subjects.length > 0) {
    _subjectActSelectedId = subjects[0].id;
  }
  await _updateSubjectActColumns();
}

function _closeSubjectActModal() {
  if (_subjectActOverlay) {
    _subjectActOverlay.remove();
    _subjectActOverlay = null;
  }
  _subjectActSelectedId = null;
  _subjectActEditActive = false;
  _subjectActSearchQuery = '';
}

async function _toggleSubjectActEditMode() {
  _subjectActEditActive = !_subjectActEditActive;
  if (!_subjectActEditActive) _subjectActSearchQuery = '';
  await _updateSubjectActColumns();
}

async function _selectSubjectInModal(subjectId) {
  _subjectActSelectedId = subjectId;
  _subjectActSearchQuery = '';
  await _updateSubjectActColumns();
}

async function _updateSubjectActColumns() {
  const subjects = await DB.getSubjects();

  const header = document.getElementById('subjectActHeader');
  if (header) {
    header.innerHTML = `
      <h3 data-testid="text-subject-act-title">${t('subjectActLinkTitle')}</h3>
      <div style="display:flex;align-items:center;gap:8px">
        ${creatorOnly(`<button class="btn btn-sm${_subjectActEditActive ? ' btn-edit-mode-active' : ''}" onclick="_toggleSubjectActEditMode()" data-testid="button-subject-act-edit-mode" title="${t('editMode')}">✏️</button>`)}
        <button class="fact-analysis-close" onclick="_closeSubjectActModal()" data-testid="button-subject-act-close">✕</button>
      </div>`;
  }

  const subjectsList = document.getElementById('saColSubjectsList');
  if (subjectsList) {
    const subjectActCounts = {};
    for (const s of subjects) {
      const links = await DB.getSubjectLinks(s.id);
      subjectActCounts[s.id] = links.filter(l => l.entityType === 'act').length;
    }
    subjectsList.innerHTML = subjects.map(s => {
      const isSelected = _subjectActSelectedId === s.id;
      const selClass = isSelected ? ' selected' : '';
      const actCnt = subjectActCounts[s.id] || 0;
      const name = esc((s.salutation ? s.salutation + ' ' : '') + s.firstName + ' ' + s.lastName);
      return `<div class="fact-column-item${selClass}"
        onclick="_selectSubjectInModal(${s.id})"
        ondragover="_saSubjectDragOver(event)"
        ondragleave="_saSubjectDragLeave(event)"
        ondrop="_saActDropOnSubject(event, ${s.id})"
        data-testid="sa-subject-item-${s.id}">
        <div class="fact-column-item-title">${name}</div>
        <div class="fact-column-item-badges">
          <span class="fact-link-badge" title="${t('actsColumnTitle')}">📋 ${actCnt}</span>
        </div>
      </div>`;
    }).join('');
  }

  const actsBody = document.getElementById('saColActsBody');
  if (actsBody && _subjectActSelectedId) {
    await _updateSubjectActsColumn(_subjectActSelectedId);
  } else if (actsBody) {
    actsBody.innerHTML = `<p class="hint" style="padding:8px">${t('noLinkedActsForSubject')}</p>`;
  }
}

async function _updateSubjectActsColumn(subjectId) {
  const actsBody = document.getElementById('saColActsBody');
  if (!actsBody) return;

  const links = await DB.getSubjectLinks(subjectId);
  const linkedActLinks = links.filter(l => l.entityType === 'act' && l.entity);
  const linkedActIds = new Set(linkedActLinks.map(l => l.entityId));

  let linkedHtml = '';
  if (linkedActLinks.length > 0) {
    linkedHtml = linkedActLinks.map(l => {
      const a = l.entity;
      const unlinkBtn = _subjectActEditActive
        ? creatorOnly(`<button class="unlink-proof-btn" onclick="event.stopPropagation(); _unlinkActFromSubject(${l.id}, ${subjectId})" title="${t('unlinkProof')}" data-testid="button-unlink-act-${a.id}">🔗✕</button>`)
        : '';
      return `<div class="fact-col-detail-item" style="cursor:pointer" data-testid="sa-linked-act-${a.id}">
        <span style="margin-right:4px">📋</span>
        <span style="flex:1">${esc(a.title || '')}</span>
        ${unlinkBtn}
      </div>`;
    }).join('');
  } else {
    linkedHtml = `<p class="hint" style="padding:0 8px">${t('noLinkedActsForSubject')}</p>`;
  }

  if (!_subjectActEditActive) {
    actsBody.innerHTML = linkedHtml;
    return;
  }

  let allActs = await DB.getAllActs();
  if (_subjectActSearchQuery) {
    const q = _subjectActSearchQuery.toLowerCase();
    allActs = allActs.filter(a => (a.title || '').toLowerCase().includes(q));
  }
  const unlinkedActs = allActs.filter(a => !linkedActIds.has(a.id));

  let allHtml = '';
  if (unlinkedActs.length > 0) {
    allHtml = unlinkedActs.map(a => {
      return `<div class="fact-col-detail-item linkable" draggable="true"
        ondragstart="_saActDragStart(event, ${a.id})"
        style="cursor:grab"
        data-testid="sa-all-act-${a.id}">
        <span style="margin-right:4px">📋</span>
        <span style="flex:1">${esc(a.title || '')}</span>
      </div>`;
    }).join('');
  } else {
    allHtml = `<p class="hint" style="padding:0 8px">${t('noMoreProofs')}</p>`;
  }

  const searchInputHtml = `<input type="text" class="proof-search-input" id="saActSearchInput" placeholder="${t('searchActPlaceholder')}" oninput="_onSaActSearchInput(this.value)" value="${esc(_subjectActSearchQuery)}" style="margin:4px 0" data-testid="input-sa-act-search" />`;

  actsBody.innerHTML = `
    <div class="proof-split-section">
      <div class="proof-split-label">${t('linkedActsLabel')}</div>
      <div class="proof-split-list">${linkedHtml}</div>
    </div>
    <div class="proof-split-section">
      <div class="proof-split-label" style="display:flex;align-items:center;justify-content:space-between">
        <span>${t('allActsLabel')}</span>
        ${creatorOnly(`<button class="btn btn-xs btn-primary" onclick="_showDossierPicker()" data-testid="button-new-act-from-modal">${t('newActFromModal')}</button>`)}
      </div>
      ${searchInputHtml}
      <div class="proof-split-list">${allHtml}</div>
    </div>`;
}

function _onSaActSearchInput(value) {
  _subjectActSearchQuery = value;
  if (_subjectActSelectedId) _updateSubjectActsColumn(_subjectActSelectedId);
}

function _saActDragStart(event, actId) {
  event.dataTransfer.setData('text/plain', 'act:' + actId);
  event.dataTransfer.effectAllowed = 'link';
}

function _saSubjectDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'link';
  const item = event.currentTarget;
  if (!item.classList.contains('drag-over')) item.classList.add('drag-over');
}

function _saSubjectDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

async function _saActDropOnSubject(event, subjectId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const data = event.dataTransfer.getData('text/plain');
  if (!data.startsWith('act:')) return;
  const actId = parseInt(data.split(':')[1]);
  if (!actId) return;

  const existing = await DB.getSubjectLinks(subjectId);
  const alreadyLinked = existing.some(l => l.entityType === 'act' && l.entityId === actId);
  if (alreadyLinked) return;

  await DB.linkSubject({ entityType: 'act', entityId: actId, subjectId });
  await _updateSubjectActColumns();
}

let _saDossierPickerVisible = false;
let _saDossierSearchQuery = '';
let _saDossierSelectedId = null;
let _saDossierCache = null;

async function _loadAllDossiersWithPath() {
  if (_saDossierCache) return _saDossierCache;
  const cases = await DB.getCases();
  const result = [];
  for (const c of cases) {
    const procs = await DB.getProceedings(c.id);
    for (const p of procs) {
      const dossiers = await DB.getDossiers(p.id);
      for (const d of dossiers) {
        result.push({
          id: d.id,
          name: d.title || d.titleIt || d.titleEn || `Fascicolo #${d.id}`,
          path: `${c.title || c.titleIt || c.titleEn || 'Caso #' + c.id} › ${p.title || p.titleIt || p.titleEn || 'Proc. #' + p.id} › ${d.title || d.titleIt || d.titleEn || 'Fasc. #' + d.id}`
        });
      }
    }
  }
  _saDossierCache = result;
  return result;
}

function _showDossierPicker() {
  _saDossierPickerVisible = true;
  _saDossierSearchQuery = '';
  _saDossierSelectedId = null;
  _saDossierCache = null;
  _renderDossierPicker();
}

function _hideDossierPicker() {
  _saDossierPickerVisible = false;
  _saDossierSearchQuery = '';
  _saDossierSelectedId = null;
  if (_subjectActSelectedId) _updateSubjectActsColumn(_subjectActSelectedId);
}

async function _renderDossierPicker() {
  const actsBody = document.getElementById('saColActsBody');
  if (!actsBody) return;
  const allDossiers = await _loadAllDossiersWithPath();
  let filtered = allDossiers;
  if (_saDossierSearchQuery) {
    const q = _saDossierSearchQuery.toLowerCase();
    filtered = allDossiers.filter(d => d.path.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
  }

  let listHtml = '';
  if (filtered.length > 0) {
    listHtml = filtered.map(d => {
      const selClass = _saDossierSelectedId === d.id ? ' selected' : '';
      return `<div class="fact-column-item${selClass}" onclick="_selectDossierInPicker(${d.id})" data-testid="sa-dossier-item-${d.id}" style="cursor:pointer">
        <div class="fact-column-item-title">${esc(d.name)}</div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${esc(d.path)}</div>
      </div>`;
    }).join('');
  } else {
    listHtml = `<p class="hint" style="padding:8px">${t('noDossiersFound')}</p>`;
  }

  actsBody.innerHTML = `
    <div style="padding:8px;border-bottom:1px solid var(--border)">
      <div style="font-weight:600;margin-bottom:6px">${t('selectDossierFirst')}</div>
      <input type="text" class="proof-search-input" id="saDossierSearchInput"
        placeholder="${t('searchDossierPlaceholder')}"
        oninput="_onSaDossierSearchInput(this.value)"
        value="${esc(_saDossierSearchQuery)}"
        data-testid="input-sa-dossier-search" />
    </div>
    <div style="flex:1;overflow-y:auto">${listHtml}</div>
    <div style="padding:8px;border-top:1px solid var(--border);display:flex;gap:6px;justify-content:flex-end">
      <button class="btn btn-sm" onclick="_hideDossierPicker()" data-testid="button-cancel-dossier">${t('cancelDossierSelection')}</button>
      <button class="btn btn-sm btn-primary${_saDossierSelectedId ? '' : ' disabled'}" onclick="_confirmDossierAndCreateAct()" data-testid="button-confirm-create-act" ${_saDossierSelectedId ? '' : 'disabled'}>${t('confirmCreateAct')}</button>
    </div>`;

  const searchInput = document.getElementById('saDossierSearchInput');
  if (searchInput) searchInput.focus();
}

function _onSaDossierSearchInput(value) {
  _saDossierSearchQuery = value;
  _renderDossierPicker();
}

function _selectDossierInPicker(dossierId) {
  _saDossierSelectedId = dossierId;
  _renderDossierPicker();
}

async function _confirmDossierAndCreateAct() {
  if (!_saDossierSelectedId) return;
  const dossierId = _saDossierSelectedId;
  _saDossierPickerVisible = false;
  _saDossierSearchQuery = '';
  _saDossierSelectedId = null;
  await _openNewActModal(dossierId);
}

let _newActModalOverlay = null;

async function _openNewActModal(dossierId) {
  try {
    if (_newActModalOverlay) _newActModalOverlay.remove();
    state.pendingFiles = { it: [], en: [] };

    const overlay = document.createElement('div');
    overlay.className = 'new-act-modal-overlay';
    overlay.setAttribute('data-testid', 'overlay-new-act-modal');
    _newActModalOverlay = overlay;

    const modal = document.createElement('div');
    modal.className = 'new-act-modal';
    modal.onclick = function(e) { e.stopPropagation(); };
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${t('newActModalTitle')}</h3>
        <button class="modal-close" onclick="_closeNewActModal()" data-testid="button-close-new-act-modal">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>${t('actTitle')}</label>
          <input id="fNewActTitle" required data-testid="input-new-act-title">
        </div>
        <div class="form-group">
          <label>${t('actDate')}</label>
          <input type="date" id="fNewActDate" data-testid="input-new-act-date">
        </div>
        ${_buildActTypeSubtypeSelects('fNewAct', '', '')}
        <input type="hidden" id="fNewActDossId" value="${dossierId}">
        ${fileUploadZones([], [])}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="_closeNewActModal()" data-testid="button-cancel-new-act">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="_saveActFromModal()" data-testid="button-save-new-act">${t('save')}</button>
      </div>
    `;

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeNewActModal(); });
    document.body.appendChild(overlay);

    setTimeout(() => {
      const titleInput = document.getElementById('fNewActTitle');
      if (titleInput) titleInput.focus();
    }, 100);
  } catch (err) {
    console.error('Error opening new act modal:', err);
    alert('Error: ' + err.message);
  }
}

function _closeNewActModal() {
  if (_newActModalOverlay) {
    _newActModalOverlay.remove();
    _newActModalOverlay = null;
  }
  state.pendingFiles = { it: [], en: [] };
  if (_subjectActSelectedId) _updateSubjectActsColumn(_subjectActSelectedId);
}

async function _saveActFromModal() {
  const title = document.getElementById('fNewActTitle').value.trim();
  if (!title) { document.getElementById('fNewActTitle').focus(); return; }

  if (state.pendingFiles.it.length === 0) {
    alert(t('fileItRequired'));
    return;
  }

  const dossierId = parseInt(document.getElementById('fNewActDossId').value);
  const actDate = document.getElementById('fNewActDate')?.value || '';
  const data = {
    title,
    type: document.getElementById('fNewActType')?.value || '',
    subtype: document.getElementById('fNewActSubtype')?.value || '',
    actDate,
    dossierId
  };

  const dossier = await DB.getDossier(dossierId);
  if (dossier) {
    const proc = await DB.getProceeding(dossier.proceedingId);
    if (proc) {
      data.protocol = await _assignProtocol(proc.caseId, actDate, 'act', null);
    }
  }

  const created = await DB.createAct(data);
  const entityId = created.id;

  const _actHier = await _resolveFileHierarchy('act', dossierId);
  for (const f of state.pendingFiles.it) await storeFileForEntity(f, 'act', entityId, 'it', _actHier);
  for (const f of state.pendingFiles.en) await storeFileForEntity(f, 'act', entityId, 'en', _actHier);

  state.pendingFiles = { it: [], en: [] };

  if (_newActModalOverlay) {
    _newActModalOverlay.remove();
    _newActModalOverlay = null;
  }

  await _updateSubjectActColumns();
}

async function _unlinkActFromSubject(linkId, subjectId) {
  await DB.unlinkSubject(linkId);
  await _updateSubjectActColumns();
}

function _promptBilingual(titleKey) {
  const labelIt = prompt(t('enterLabelIt'));
  if (!labelIt || !labelIt.trim()) return null;
  const labelEn = prompt(t('enterLabelEn'));
  if (!labelEn || !labelEn.trim()) {
    alert(t('bothLanguagesRequired'));
    return null;
  }
  return { labelIt: labelIt.trim(), labelEn: labelEn.trim() };
}

async function showRolesView() {
  hideAllPanels();
  document.getElementById('sidebarLeft').style.display = 'none';
  document.getElementById('sidebarRight').style.display = 'none';
  document.querySelector('.app-layout').classList.add('norme-fullwidth');
  _activateArchiveView('rolesView');
  await _loadAllLists();
  _rolesViewState.selectedType = null;
  _rolesViewState.selectedId = null;
  _rolesViewState.addTarget = null;
  _rolesViewState.editMode = false;
  _renderRolesView();
}

const _rolesViewState = {
  selectedType: null,
  selectedId: null,
  addTarget: null,
  editMode: false,
  expandedCats: new Set(),
  expandedSubs: new Set(),
  searchQuery: ''
};

function _renderRolesView() {
  const panel = document.getElementById('rolesView');
  const isCreator = appMode === 'creator';
  const st = _rolesViewState;
  const hasSel = st.selectedType && st.selectedId;
  const canAdd = isCreator && (!hasSel || st.selectedType === 'category' || st.selectedType === 'subcategory');
  const canEdit = isCreator && hasSel;
  let canDelete = false;
  if (isCreator && hasSel) {
    if (st.selectedType === 'category') {
      const item = _allCategories.find(c => c.id === st.selectedId);
      canDelete = item && _allSubcategories.filter(s => (s.categoryId || s.parentId) === item.id).length === 0;
    } else if (st.selectedType === 'subcategory') {
      const item = _allSubcategories.find(s => s.id === st.selectedId);
      canDelete = item && _allRoles.filter(r => (r.subcategoryId || r.parentId) === item.id).length === 0;
    } else if (st.selectedType === 'role') {
      canDelete = true;
    }
  }
  let html = `<div class="archive-toolbar" data-testid="roles-toolbar">`;
  html += `<div class="archive-toolbar-left"><h3>${t('archivioRuoli')}</h3></div>`;
  html += `<div class="archive-toolbar-right">`;
  html += `<button class="btn btn-sm btn-toolbar-new${canAdd ? '' : ' btn-toolbar-disabled'}" onclick="_rolesToolbarNuovo()" ${canAdd ? '' : 'disabled'} data-testid="button-roles-nuovo" title="${hasSel ? '' : t('toolbarNuovoHintRuoli')}"><span class="toolbar-icon">&#43;</span> ${t('toolbarNuovo')}</button>`;
  html += `<button class="btn btn-sm btn-toolbar-edit${canEdit ? '' : ' btn-toolbar-disabled'}" onclick="_rolesEditItem()" ${canEdit ? '' : 'disabled'} data-testid="button-roles-modifica"><span class="toolbar-icon">&#9998;</span> ${t('toolbarModifica')}</button>`;
  html += `<button class="btn btn-sm btn-toolbar-delete${canDelete ? '' : ' btn-toolbar-disabled'}" onclick="_rolesDeleteItem()" ${canDelete ? '' : 'disabled'} data-testid="button-roles-elimina"><span class="toolbar-icon">&#10005;</span> ${t('toolbarElimina')}</button>`;
  html += `<button class="btn btn-sm btn-toolbar-exit" onclick="goToDashboard()" data-testid="button-roles-esci"><span class="toolbar-icon">&#10140;</span> ${t('toolbarEsci')}</button>`;
  html += `</div></div>`;
  html += `<div class="roles-layout">`;
  html += `<div class="roles-sidebar">`;
  html += `<div class="norme-search" style="display:flex;gap:6px;align-items:center"><input type="text" id="rolesSearchInput" placeholder="${t('normeSearch')}" value="${esc(_rolesViewState.searchQuery)}" oninput="_onRolesSearch(this.value)" data-testid="input-roles-search" style="flex:1" />`;
  if (isCreator) html += `<button class="btn btn-xs" onclick="_rolesAddCategory()" data-testid="btn-add-category" title="${t('addCategory')}">+ ${t('category')}</button>`;
  html += `</div>`;
  html += `<div class="roles-tree" id="rolesTree">`;
  if (_rolesViewState.searchQuery) {
    html += _buildRolesSearchResults(_rolesViewState.searchQuery);
  } else {
    html += _buildRolesTree();
  }
  html += `</div></div>`;
  html += `<div class="roles-detail" id="rolesDetail">`;
  html += _renderRolesDetail();
  html += `</div></div>`;
  panel.innerHTML = html;
  _attachRolesTreeEvents();
}

function _buildRolesTree() {
  let html = '';
  const st = _rolesViewState;
  _allCategories.forEach(cat => {
    const isCatSel = st.selectedType === 'category' && st.selectedId === cat.id;
    const subcats = _allSubcategories.filter(s => (s.categoryId || s.parentId) === cat.id);
    const hasCh = subcats.length > 0;
    const isCatExp = st.expandedCats.has(cat.id);
    html += `<div class="norme-tree-item${isCatSel ? ' norme-node-selected' : ''}" style="padding-left:6px" data-type="category" data-id="${cat.id}" data-testid="roles-node-cat-${cat.id}">`;
    if (hasCh) {
      html += `<span class="norme-toggle" data-toggle="cat" data-tid="${cat.id}">${isCatExp ? '▼' : '▶'}</span>`;
    } else {
      html += `<span class="norme-toggle-placeholder"></span>`;
    }
    html += `<span class="norme-node-label"><span class="norme-node-badge norme-badge-roles-cat">${esc(t('category'))}</span> ${esc(_labelFor(cat))}</span>`;
    html += `</div>`;
    if (isCatExp && hasCh) {
      subcats.forEach(sub => {
        const isSubSel = st.selectedType === 'subcategory' && st.selectedId === sub.id;
        const roles = _allRoles.filter(r => (r.subcategoryId || r.parentId) === sub.id);
        const hasRoles = roles.length > 0;
        const isSubExp = st.expandedSubs.has(sub.id);
        html += `<div class="norme-tree-item${isSubSel ? ' norme-node-selected' : ''}" style="padding-left:24px" data-type="subcategory" data-id="${sub.id}" data-testid="roles-node-sub-${sub.id}">`;
        if (hasRoles) {
          html += `<span class="norme-toggle" data-toggle="sub" data-tid="${sub.id}">${isSubExp ? '▼' : '▶'}</span>`;
        } else {
          html += `<span class="norme-toggle-placeholder"></span>`;
        }
        html += `<span class="norme-node-label"><span class="norme-node-badge norme-badge-roles-sub">${esc(t('subcategory'))}</span> ${esc(_labelFor(sub))}</span>`;
        html += `</div>`;
        if (isSubExp && hasRoles) {
          roles.forEach(r => {
            const isRoleSel = st.selectedType === 'role' && st.selectedId === r.id;
            html += `<div class="norme-tree-item${isRoleSel ? ' norme-node-selected' : ''}" style="padding-left:42px" data-type="role" data-id="${r.id}" data-testid="roles-node-role-${r.id}">`;
            html += `<span class="norme-toggle-placeholder"></span>`;
            html += `<span class="norme-node-label"><span class="norme-node-badge norme-badge-roles-role">${esc(t('roleLabel'))}</span> ${esc(_labelFor(r))}</span>`;
            html += `</div>`;
          });
        }
      });
    }
  });
  return html;
}

function _onRolesSearch(val) {
  _rolesViewState.searchQuery = val;
  const treeEl = document.getElementById('rolesTree');
  if (!treeEl) return;
  if (val) {
    treeEl.innerHTML = _buildRolesSearchResults(val);
  } else {
    treeEl.innerHTML = _buildRolesTree();
  }
  _attachRolesTreeEvents();
  const inp = document.getElementById('rolesSearchInput');
  if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
}

function _buildRolesSearchResults(query) {
  const q = query.toLowerCase();
  let html = '';
  const st = _rolesViewState;

  const matchCats = _allCategories.filter(c => (c.labelIt||'').toLowerCase().includes(q) || (c.labelEn||'').toLowerCase().includes(q));
  const matchSubs = _allSubcategories.filter(s => (s.labelIt||'').toLowerCase().includes(q) || (s.labelEn||'').toLowerCase().includes(q));
  const matchRoles = _allRoles.filter(r => (r.labelIt||'').toLowerCase().includes(q) || (r.labelEn||'').toLowerCase().includes(q));

  if (matchCats.length === 0 && matchSubs.length === 0 && matchRoles.length === 0) {
    return `<p class="hint">${t('normeNoResults')}</p>`;
  }

  matchCats.forEach(cat => {
    const sel = st.selectedType === 'category' && st.selectedId === cat.id ? ' norme-node-selected' : '';
    html += `<div class="norme-search-result${sel}" data-type="category" data-id="${cat.id}" data-testid="roles-search-cat-${cat.id}">`;
    html += `<span class="norme-node-badge norme-badge-roles-cat">${esc(t('category'))}</span> `;
    html += `<strong>${esc(_labelFor(cat))}</strong>`;
    html += `</div>`;
  });

  matchSubs.forEach(sub => {
    const sel = st.selectedType === 'subcategory' && st.selectedId === sub.id ? ' norme-node-selected' : '';
    const parentCat = _allCategories.find(c => c.id === (sub.categoryId || sub.parentId));
    const path = parentCat ? _labelFor(parentCat) : '';
    html += `<div class="norme-search-result${sel}" data-type="subcategory" data-id="${sub.id}" data-testid="roles-search-sub-${sub.id}">`;
    html += `<span class="norme-node-badge norme-badge-roles-sub">${esc(t('subcategory'))}</span> `;
    html += `<strong>${esc(_labelFor(sub))}</strong>`;
    if (path) html += `<div class="norme-path-hint">${esc(path)}</div>`;
    html += `</div>`;
  });

  matchRoles.forEach(r => {
    const sel = st.selectedType === 'role' && st.selectedId === r.id ? ' norme-node-selected' : '';
    const parentSub = _allSubcategories.find(s => s.id === (r.subcategoryId || r.parentId));
    const parentCat = parentSub ? _allCategories.find(c => c.id === (parentSub.categoryId || parentSub.parentId)) : null;
    const path = [parentCat ? _labelFor(parentCat) : '', parentSub ? _labelFor(parentSub) : ''].filter(Boolean).join(' → ');
    html += `<div class="norme-search-result${sel}" data-type="role" data-id="${r.id}" data-testid="roles-search-role-${r.id}">`;
    html += `<span class="norme-node-badge norme-badge-roles-role">${esc(t('roleLabel'))}</span> `;
    html += `<strong>${esc(_labelFor(r))}</strong>`;
    if (path) html += `<div class="norme-path-hint">${esc(path)}</div>`;
    html += `</div>`;
  });

  return html;
}

function _attachRolesTreeEvents() {
  const treeEl = document.getElementById('rolesTree');
  if (!treeEl) return;
  treeEl.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      e.stopPropagation();
      const tid = parseInt(toggle.dataset.tid);
      if (toggle.dataset.toggle === 'cat') {
        _rolesViewState.expandedCats.has(tid) ? _rolesViewState.expandedCats.delete(tid) : _rolesViewState.expandedCats.add(tid);
      } else {
        _rolesViewState.expandedSubs.has(tid) ? _rolesViewState.expandedSubs.delete(tid) : _rolesViewState.expandedSubs.add(tid);
      }
      _renderRolesView();
      return;
    }
    const item = e.target.closest('[data-type]');
    if (!item) return;
    const type = item.dataset.type;
    const id = parseInt(item.dataset.id);
    if (type === 'category') { _rolesViewState.expandedCats.has(id) ? _rolesViewState.expandedCats.delete(id) : _rolesViewState.expandedCats.add(id); }
    if (type === 'subcategory') { _rolesViewState.expandedSubs.has(id) ? _rolesViewState.expandedSubs.delete(id) : _rolesViewState.expandedSubs.add(id); }
    _rolesViewState.selectedType = type;
    _rolesViewState.selectedId = id;
    _rolesViewState.addTarget = null;
    _rolesViewState.editMode = false;
    _renderRolesView();
  });
}

function _renderRolesDetail() {
  const st = _rolesViewState;
  const isCreator = appMode === 'creator';
  if (!st.selectedType || !st.selectedId) {
    return `<div class="roles-empty"><p>${t('selectRoleToEdit')}</p></div>`;
  }
  let item = null, parentLabel = '', grandparentLabel = '';
  let parentLabelEn = '', grandparentLabelEn = '';
  let typeLabel = '', childLabel = '', canDelete = false;

  if (st.selectedType === 'category') {
    item = _allCategories.find(c => c.id === st.selectedId);
    if (!item) return '';
    typeLabel = t('category');
    childLabel = t('subcategory');
    canDelete = _allSubcategories.filter(s => (s.categoryId || s.parentId) === item.id).length === 0;
  } else if (st.selectedType === 'subcategory') {
    item = _allSubcategories.find(s => s.id === st.selectedId);
    if (!item) return '';
    const cat = _allCategories.find(c => c.id === (item.categoryId || item.parentId));
    parentLabel = cat ? esc(cat.labelIt) : '';
    parentLabelEn = cat ? esc(cat.labelEn) : '';
    typeLabel = t('subcategory');
    childLabel = t('subjectRole');
    canDelete = _allRoles.filter(r => (r.subcategoryId || r.parentId) === item.id).length === 0;
  } else if (st.selectedType === 'role') {
    item = _allRoles.find(r => r.id === st.selectedId);
    if (!item) return '';
    const sub = _allSubcategories.find(s => s.id === (item.subcategoryId || item.parentId));
    const cat = sub ? _allCategories.find(c => c.id === (sub.categoryId || sub.parentId)) : null;
    parentLabel = sub ? esc(sub.labelIt) : '';
    parentLabelEn = sub ? esc(sub.labelEn) : '';
    grandparentLabel = cat ? esc(cat.labelIt) : '';
    grandparentLabelEn = cat ? esc(cat.labelEn) : '';
    typeLabel = t('subjectRole');
    childLabel = null;
    canDelete = true;
  }

  let html = `<div class="roles-detail-content">`;
  html += `<div class="roles-detail-header">`;
  html += `<h2><span class="roles-type-badge">${esc(typeLabel)}</span> ${esc(_labelFor(item))}</h2>`;
  html += `</div>`;

  html += `<div class="roles-bilingual">`;
  html += `<div class="roles-lang-col"><div class="roles-lang-header">IT</div>`;
  if (st.selectedType === 'role') {
    html += `<div class="mg-role-header-row"><div class="mg-role-header-cell"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${grandparentLabel}</span></div>`;
    html += `<div class="mg-role-header-cell"><span class="mg-field-label">${t('subcategory')}</span><span class="mg-field-val">${parentLabel}</span></div>`;
    html += `<div class="mg-role-header-cell"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelIt)}</span></div></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('competenzaTipo')}</span><span class="mg-field-val">${item.competenzaTipo ? t('competenza_' + item.competenzaTipo) : '\u2014'}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('roleFunzione')}</span><span class="mg-field-val">${esc(item.funzione || '\u2014')}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('respPenale')}</span><span class="mg-field-val">${esc(item.respPenale || '\u2014')}</span></div>`;
    if (item.ipotesiReato) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('ipotesiReato')}</span><span class="mg-field-val">${esc(item.ipotesiReato)}</span></div>`;
    if (item.abrogazione323) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('abrogazione323')}</span><span class="mg-field-val">${esc(item.abrogazione323)}</span></div>`;
    html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaPunizione')}</span><span class="mg-field-val">${esc(item.richiestaPunizione || '\u2014')}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('respDisciplinare')}</span><span class="mg-field-val">${esc(item.respDisciplinare || '\u2014')}</span></div>`;
    if (item.ipotesiDisciplinare) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('ipotesiDisciplinare')}</span><span class="mg-field-val">${esc(item.ipotesiDisciplinare)}</span></div>`;
    html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaDisciplinare')}</span><span class="mg-field-val">${esc(item.richiestaDisciplinare || '\u2014')}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('respCivile')}</span><span class="mg-field-val">${esc(item.respCivile || '\u2014')}</span></div>`;
    if (item.ipotesiCivile) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('ipotesiCivile')}</span><span class="mg-field-val">${esc(item.ipotesiCivile)}</span></div>`;
    html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaCivile')}</span><span class="mg-field-val">${esc(item.richiestaCivile || '\u2014')}</span></div>`;
  } else {
    if (st.selectedType === 'subcategory') html += `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${parentLabel}</span></div>`;
    html += `<div class="mg-field-ro"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelIt)}</span></div>`;
  }
  html += `</div>`;

  html += `<div class="roles-lang-col"><div class="roles-lang-header">EN</div>`;
  if (st.selectedType === 'role') {
    html += `<div class="mg-role-header-row"><div class="mg-role-header-cell"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${grandparentLabelEn}</span></div>`;
    html += `<div class="mg-role-header-cell"><span class="mg-field-label">${t('subcategory')}</span><span class="mg-field-val">${parentLabelEn}</span></div>`;
    html += `<div class="mg-role-header-cell"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelEn)}</span></div></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('competenzaTipo')}</span><span class="mg-field-val">${item.competenzaTipo ? t('competenza_' + item.competenzaTipo) : '\u2014'}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('roleFunzione')}</span><span class="mg-field-val">${esc(item.funzioneEn || '\u2014')}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('respPenale')}</span><span class="mg-field-val">${esc(item.respPenaleEn || '\u2014')}</span></div>`;
    if (item.ipotesiReatoEn) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('ipotesiReato')}</span><span class="mg-field-val">${esc(item.ipotesiReatoEn)}</span></div>`;
    if (item.abrogazione323En) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('abrogazione323')}</span><span class="mg-field-val">${esc(item.abrogazione323En)}</span></div>`;
    html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaPunizione')}</span><span class="mg-field-val">${esc(item.richiestaPunizioneEn || '\u2014')}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('respDisciplinare')}</span><span class="mg-field-val">${esc(item.respDisciplinareEn || '\u2014')}</span></div>`;
    if (item.ipotesiDisciplinareEn) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('ipotesiDisciplinare')}</span><span class="mg-field-val">${esc(item.ipotesiDisciplinareEn)}</span></div>`;
    html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaDisciplinare')}</span><span class="mg-field-val">${esc(item.richiestaDisciplinareEn || '\u2014')}</span></div>`;
    html += `<div class="mg-resp-ro"><span class="mg-field-label">${t('respCivile')}</span><span class="mg-field-val">${esc(item.respCivileEn || '\u2014')}</span></div>`;
    if (item.ipotesiCivileEn) html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('ipotesiCivile')}</span><span class="mg-field-val">${esc(item.ipotesiCivileEn)}</span></div>`;
    html += `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaCivile')}</span><span class="mg-field-val">${esc(item.richiestaCivileEn || '\u2014')}</span></div>`;
  } else {
    if (st.selectedType === 'subcategory') html += `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${parentLabelEn}</span></div>`;
    html += `<div class="mg-field-ro"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelEn)}</span></div>`;
  }
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;
  return html;
}

function _rolesToolbarNuovo() {
  const st = _rolesViewState;
  if (!st.selectedType || !st.selectedId) {
    _rolesAddCategory();
  } else {
    _rolesAddChild();
  }
}

function _rolesAddCategory() {
  _rolesViewState.addTarget = 'category';
  _renderRolesEditForm();
}

function _rolesAddChild() {
  const st = _rolesViewState;
  if (st.selectedType === 'category') st.addTarget = 'subcategory';
  else if (st.selectedType === 'subcategory') st.addTarget = 'role';
  else return;
  _renderRolesEditForm();
}

function _renderRolesEditForm() {
  const detail = document.getElementById('rolesDetail');
  if (!detail) return;
  const st = _rolesViewState;
  const targetLabels = { category: t('category'), subcategory: t('subcategory'), role: t('subjectRole') };
  let html = `<div class="roles-detail-content">`;
  html += `<h3>${t('addElement')} — ${targetLabels[st.addTarget]}</h3>`;
  if (st.addTarget === 'role') {
    html += `<div class="form-row-3-auto">`;
    html += `<div class="form-group"><label>${targetLabels[st.addTarget]} (IT)</label><input id="rvNewLabelIt" autofocus data-testid="input-new-label-it"></div>`;
    html += `<div class="form-group"><label>${targetLabels[st.addTarget]} (EN)</label><input id="rvNewLabelEn" data-testid="input-new-label-en"></div>`;
    html += `<div class="form-group form-group-autofit"><label>${t('competenzaTipo')}</label><select id="rvNewCompetenzaTipo"><option value="art11_diretto">${t('competenza_art11_diretto')}</option><option value="art11_connesso">${t('competenza_art11_connesso')}</option><option value="ordinario">${t('competenza_ordinario')}</option></select></div>`;
    html += `</div>`;
  } else {
    html += `<div class="form-grid form-grid-2">`;
    html += `<div class="form-group"><label>${targetLabels[st.addTarget]} (IT)</label><input id="rvNewLabelIt" autofocus data-testid="input-new-label-it"></div>`;
    html += `<div class="form-group"><label>${targetLabels[st.addTarget]} (EN)</label><input id="rvNewLabelEn" data-testid="input-new-label-en"></div>`;
    html += `</div>`;
  }
  html += `<div class="roles-detail-actions">`;
  html += `<button class="btn btn-xs btn-primary" onclick="_rolesSaveNew()" data-testid="btn-roles-save-new">${t('save')}</button>`;
  html += `<button class="btn btn-xs" onclick="_rolesCancelAdd()" data-testid="btn-roles-cancel-new">${t('cancel')}</button>`;
  html += `</div></div>`;
  detail.innerHTML = html;
  const itInput = document.getElementById('rvNewLabelIt');
  if (itInput) itInput.focus();
}

async function _rolesSaveNew() {
  const st = _rolesViewState;
  const labelIt = (document.getElementById('rvNewLabelIt') || {}).value?.trim();
  const labelEn = (document.getElementById('rvNewLabelEn') || {}).value?.trim();
  if (!labelIt) { const el = document.getElementById('rvNewLabelIt'); if (el) { el.style.borderColor = 'var(--danger)'; el.focus(); } return; }
  if (!labelEn) { const el = document.getElementById('rvNewLabelEn'); if (el) { el.style.borderColor = 'var(--danger)'; el.focus(); } return; }
  if (st.addTarget === 'category') {
    const newId = await DB.addListItem('categories', labelIt, labelEn, null);
    st.selectedType = 'category'; st.selectedId = newId;
  } else if (st.addTarget === 'subcategory') {
    const parentCatId = st.selectedType === 'category' ? st.selectedId : null;
    if (!parentCatId) return;
    const newId = await DB.addListItem('subcategories', labelIt, labelEn, parentCatId);
    st.expandedCats.add(parentCatId);
    st.selectedType = 'subcategory'; st.selectedId = newId;
  } else if (st.addTarget === 'role') {
    const parentSubId = st.selectedType === 'subcategory' ? st.selectedId : null;
    if (!parentSubId) return;
    const newId = await DB.addListItem('roles', labelIt, labelEn, parentSubId);
    const compTipo = (document.getElementById('rvNewCompetenzaTipo') || {}).value || '';
    if (compTipo) await SysDB.roles.update(newId, { competenzaTipo: compTipo });
    st.expandedSubs.add(parentSubId);
    const parentSub = _allSubcategories.find(s => s.id === parentSubId);
    if (parentSub) st.expandedCats.add(parentSub.categoryId || parentSub.parentId);
    st.selectedType = 'role'; st.selectedId = newId;
  }
  await _loadAllLists();
  st.addTarget = null;
  scheduleSaveToFS();
  _renderRolesView();
}

function _rolesCancelAdd() {
  _rolesViewState.addTarget = null;
  _renderRolesView();
}

function _rolesEditItem() {
  _rolesViewState.editMode = true;
  _renderRolesEditDetail();
}

function _renderRolesEditDetail() {
  const detail = document.getElementById('rolesDetail');
  if (!detail) return;
  const st = _rolesViewState;
  let item = null;
  if (st.selectedType === 'category') item = _allCategories.find(c => c.id === st.selectedId);
  else if (st.selectedType === 'subcategory') item = _allSubcategories.find(s => s.id === st.selectedId);
  else if (st.selectedType === 'role') item = _allRoles.find(r => r.id === st.selectedId);
  if (!item) return;
  const typeLabels = { category: t('category'), subcategory: t('subcategory'), role: t('subjectRole') };
  let html = `<div class="roles-detail-content">`;
  html += `<h3>${t('editElement')} — ${typeLabels[st.selectedType]}</h3>`;

  if (st.selectedType === 'role') {
    html += `<div class="form-row-3-auto">`;
    html += `<div class="form-group"><label>${typeLabels[st.selectedType]} (IT)</label><input id="rvEditLabelIt" value="${esc(item.labelIt || '')}"></div>`;
    html += `<div class="form-group"><label>${typeLabels[st.selectedType]} (EN)</label><input id="rvEditLabelEn" value="${esc(item.labelEn || '')}"></div>`;
    html += `<div class="form-group form-group-autofit"><label>${t('competenzaTipo')}</label><select id="rvCompetenzaTipo"><option value="art11_diretto" ${item.competenzaTipo === 'art11_diretto' ? 'selected' : ''}>${t('competenza_art11_diretto')}</option><option value="art11_connesso" ${item.competenzaTipo === 'art11_connesso' ? 'selected' : ''}>${t('competenza_art11_connesso')}</option><option value="ordinario" ${item.competenzaTipo === 'ordinario' ? 'selected' : ''}>${t('competenza_ordinario')}</option></select></div>`;
    html += `</div>`;
  } else {
    html += `<div class="form-grid form-grid-2">`;
    html += `<div class="form-group"><label>${typeLabels[st.selectedType]} (IT)</label><input id="rvEditLabelIt" value="${esc(item.labelIt || '')}"></div>`;
    html += `<div class="form-group"><label>${typeLabels[st.selectedType]} (EN)</label><input id="rvEditLabelEn" value="${esc(item.labelEn || '')}"></div>`;
    html += `</div>`;
  }

  if (st.selectedType === 'role') {
    const roleFields = [
      { labelKey: 'roleFunzione', idIt: 'rvFunzioneIt', idEn: 'rvFunzioneEn', valIt: item.funzione, valEn: item.funzioneEn },
      { labelKey: 'respPenale', idIt: 'rvRespPenaleIt', idEn: 'rvRespPenaleEn', valIt: item.respPenale, valEn: item.respPenaleEn },
      { labelKey: 'ipotesiReato', idIt: 'rvIpotesiReatoIt', idEn: 'rvIpotesiReatoEn', valIt: item.ipotesiReato, valEn: item.ipotesiReatoEn },
      { labelKey: 'richiestaPunizione', idIt: 'rvRichiestaPunizioneIt', idEn: 'rvRichiestaPunizioneEn', valIt: item.richiestaPunizione, valEn: item.richiestaPunizioneEn },
      { labelKey: 'respDisciplinare', idIt: 'rvRespDiscIt', idEn: 'rvRespDiscEn', valIt: item.respDisciplinare, valEn: item.respDisciplinareEn },
      { labelKey: 'ipotesiDisciplinare', idIt: 'rvIpotesiDiscIt', idEn: 'rvIpotesiDiscEn', valIt: item.ipotesiDisciplinare, valEn: item.ipotesiDisciplinareEn },
      { labelKey: 'richiestaDisciplinare', idIt: 'rvRichiestaDisciplinareIt', idEn: 'rvRichiestaDisciplinareEn', valIt: item.richiestaDisciplinare, valEn: item.richiestaDisciplinareEn },
      { labelKey: 'respCivile', idIt: 'rvRespCivIt', idEn: 'rvRespCivEn', valIt: item.respCivile, valEn: item.respCivileEn },
      { labelKey: 'ipotesiCivile', idIt: 'rvIpotesiCivIt', idEn: 'rvIpotesiCivEn', valIt: item.ipotesiCivile, valEn: item.ipotesiCivileEn },
      { labelKey: 'richiestaCivile', idIt: 'rvRichiestaCivileIt', idEn: 'rvRichiestaCivileEn', valIt: item.richiestaCivile, valEn: item.richiestaCivileEn }
    ];
    if (item.abrogazione323 || item.abrogazione323En) {
      roleFields.splice(3, 0, { labelKey: 'abrogazione323', idIt: 'rvAbrogazione323It', idEn: 'rvAbrogazione323En', valIt: item.abrogazione323, valEn: item.abrogazione323En });
    }

    roleFields.forEach(f => {
      html += `<div class="form-grid form-grid-2">`;
      html += `<div class="form-group"><label>${t(f.labelKey)} (IT)</label><textarea id="${f.idIt}" class="rv-autoresize">${esc(f.valIt || '')}</textarea></div>`;
      html += `<div class="form-group"><label>${t(f.labelKey)} (EN)</label><textarea id="${f.idEn}" class="rv-autoresize">${esc(f.valEn || '')}</textarea></div>`;
      html += `</div>`;
    });
  }

  html += `<div class="roles-detail-actions">`;
  html += `<button class="btn btn-xs btn-primary" onclick="_rolesSaveEdit()" data-testid="btn-roles-save-edit">${t('save')}</button>`;
  html += `<button class="btn btn-xs" onclick="_rolesCancelEdit()" data-testid="btn-roles-cancel-edit">${t('cancel')}</button>`;
  html += `</div></div>`;
  detail.innerHTML = html;
  _autoResizeAllTextareas();
}

function _autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
  el.style.overflow = 'hidden';
}

function _autoResizeAllTextareas() {
  document.querySelectorAll('.rv-autoresize').forEach(ta => {
    _autoResizeTextarea(ta);
    ta.addEventListener('input', () => _autoResizeTextarea(ta));
  });
}

async function _rolesSaveEdit() {
  const st = _rolesViewState;
  const labelIt = (document.getElementById('rvEditLabelIt') || {}).value?.trim();
  const labelEn = (document.getElementById('rvEditLabelEn') || {}).value?.trim();
  if (!labelIt) { const el = document.getElementById('rvEditLabelIt'); if (el) { el.style.borderColor = 'var(--danger)'; el.focus(); } return; }
  if (!labelEn) { const el = document.getElementById('rvEditLabelEn'); if (el) { el.style.borderColor = 'var(--danger)'; el.focus(); } return; }
  const updateData = { labelIt, labelEn };
  if (st.selectedType === 'role') {
    updateData.competenzaTipo = (document.getElementById('rvCompetenzaTipo') || {}).value || '';
    updateData.funzione = (document.getElementById('rvFunzioneIt') || {}).value || '';
    updateData.funzioneEn = (document.getElementById('rvFunzioneEn') || {}).value || '';
    updateData.respPenale = (document.getElementById('rvRespPenaleIt') || {}).value || '';
    updateData.ipotesiReato = (document.getElementById('rvIpotesiReatoIt') || {}).value || '';
    const abrog323It = document.getElementById('rvAbrogazione323It');
    if (abrog323It) updateData.abrogazione323 = abrog323It.value || '';
    updateData.richiestaPunizione = (document.getElementById('rvRichiestaPunizioneIt') || {}).value || '';
    updateData.respDisciplinare = (document.getElementById('rvRespDiscIt') || {}).value || '';
    updateData.ipotesiDisciplinare = (document.getElementById('rvIpotesiDiscIt') || {}).value || '';
    updateData.richiestaDisciplinare = (document.getElementById('rvRichiestaDisciplinareIt') || {}).value || '';
    updateData.respCivile = (document.getElementById('rvRespCivIt') || {}).value || '';
    updateData.ipotesiCivile = (document.getElementById('rvIpotesiCivIt') || {}).value || '';
    updateData.richiestaCivile = (document.getElementById('rvRichiestaCivileIt') || {}).value || '';
    updateData.respPenaleEn = (document.getElementById('rvRespPenaleEn') || {}).value || '';
    updateData.ipotesiReatoEn = (document.getElementById('rvIpotesiReatoEn') || {}).value || '';
    const abrog323En = document.getElementById('rvAbrogazione323En');
    if (abrog323En) updateData.abrogazione323En = abrog323En.value || '';
    updateData.richiestaPunizioneEn = (document.getElementById('rvRichiestaPunizioneEn') || {}).value || '';
    updateData.respDisciplinareEn = (document.getElementById('rvRespDiscEn') || {}).value || '';
    updateData.ipotesiDisciplinareEn = (document.getElementById('rvIpotesiDiscEn') || {}).value || '';
    updateData.richiestaDisciplinareEn = (document.getElementById('rvRichiestaDisciplinareEn') || {}).value || '';
    updateData.respCivileEn = (document.getElementById('rvRespCivEn') || {}).value || '';
    updateData.ipotesiCivileEn = (document.getElementById('rvIpotesiCivEn') || {}).value || '';
    updateData.richiestaCivileEn = (document.getElementById('rvRichiestaCivileEn') || {}).value || '';
  }
  if (st.selectedType === 'category') await SysDB.updateCategory(st.selectedId, updateData);
  else if (st.selectedType === 'subcategory') await SysDB.updateSubcategory(st.selectedId, updateData);
  else if (st.selectedType === 'role') await SysDB.updateRole(st.selectedId, updateData);
  await _loadAllLists();
  st.editMode = false;
  scheduleSaveToFS();
  _renderRolesView();
}

function _rolesCancelEdit() {
  _rolesViewState.editMode = false;
  _renderRolesView();
}

async function _rolesDeleteItem() {
  const st = _rolesViewState;
  if (!confirm(t('confirmDeleteMsg'))) return;
  if (st.selectedType === 'category') await SysDB.deleteCategory(st.selectedId);
  else if (st.selectedType === 'subcategory') await SysDB.deleteSubcategory(st.selectedId);
  else if (st.selectedType === 'role') await SysDB.deleteRole(st.selectedId);
  await _loadAllLists();
  st.selectedType = null;
  st.selectedId = null;
  st.editMode = false;
  scheduleSaveToFS();
  _renderRolesView();
}

async function openManageRolesModal() {
  await _loadAllLists();
  let _mgSelectedType = null;
  let _mgSelectedId = null;
  let _mgAddTarget = null;

  function renderManageContent() {
    const container = document.getElementById('manageRolesContent');
    if (!container) return;

    let treeHtml = '';
    _allCategories.forEach(cat => {
      const isCatSel = _mgSelectedType === 'category' && _mgSelectedId === cat.id;
      const subcats = _allSubcategories.filter(s => (s.categoryId || s.parentId) === cat.id);
      let subcatHtml = '';
      subcats.forEach(sub => {
        const isSubSel = _mgSelectedType === 'subcategory' && _mgSelectedId === sub.id;
        const roles = _allRoles.filter(r => (r.subcategoryId || r.parentId) === sub.id);
        const rolesHtml = roles.map(r => {
          const isRoleSel = _mgSelectedType === 'role' && _mgSelectedId === r.id;
          const hasResp = r.funzione || r.respPenale || r.respDisciplinare || r.respCivile;
          return `<li class="mg-tree-item mg-tree-role${isRoleSel ? ' mg-tree-selected' : ''}${hasResp ? ' mg-tree-has-resp' : ''}" data-type="role" data-id="${r.id}"><span class="mg-tree-icon">\u25CB</span>${esc(_labelFor(r))}</li>`;
        }).join('');
        subcatHtml += `<li class="mg-tree-item mg-tree-subcat${isSubSel ? ' mg-tree-selected' : ''}" data-type="subcategory" data-id="${sub.id}"><span class="mg-tree-icon">\u25B8</span><span class="mg-tree-text">${esc(_labelFor(sub))}</span>${rolesHtml ? '<ul>' + rolesHtml + '</ul>' : ''}</li>`;
      });
      treeHtml += `<li class="mg-tree-item mg-tree-cat${isCatSel ? ' mg-tree-selected' : ''}" data-type="category" data-id="${cat.id}"><span class="mg-tree-icon">\u25BC</span><span class="mg-tree-text">${esc(_labelFor(cat))}</span>${subcatHtml ? '<ul>' + subcatHtml + '</ul>' : ''}</li>`;
    });

    container.innerHTML = `
      <div class="mg-layout-3col">
        <div class="mg-tree-panel">
          <ul class="mg-tree">${treeHtml || '<li class="hint">\u2014</li>'}</ul>
        </div>
        <div class="mg-col-it">
          <div class="mg-col-header">IT</div>
          <div id="mgColItContent"></div>
        </div>
        <div class="mg-col-en">
          <div class="mg-col-header">EN</div>
          <div id="mgColEnContent"></div>
        </div>
      </div>
      <div id="mgActionArea"></div>
    `;

    const treeEl = container.querySelector('.mg-tree');
    treeEl.addEventListener('click', (e) => {
      const li = e.target.closest('[data-type]');
      if (!li) return;
      _mgSelectedType = li.dataset.type;
      _mgSelectedId = parseInt(li.dataset.id);
      _mgAddTarget = null;
      _mgEditMode = false;
      renderManageContent();
    });

    renderColumns();
    if (_mgAddTarget) renderAddForm();
  }

  let _mgEditMode = false;

  function renderColumns() {
    const colIt = document.getElementById('mgColItContent');
    const colEn = document.getElementById('mgColEnContent');
    const actionArea = document.getElementById('mgActionArea');
    if (!colIt || !colEn || !actionArea) return;

    if (!_mgSelectedType || !_mgSelectedId) {
      colIt.innerHTML = `<div class="mg-detail-hint">${t('selectRoleToEdit')}</div>`;
      colEn.innerHTML = `<div class="mg-detail-hint">&nbsp;</div>`;
      actionArea.innerHTML = `<div class="mg-action-bar"><button class="btn btn-xs btn-primary" id="mgAddCatBtn">+ ${t('category')}</button></div>`;
      document.getElementById('mgAddCatBtn').onclick = () => { _mgAddTarget = 'category'; renderAddForm(); };
      return;
    }

    let item = null, parentLabel = '', grandparentLabel = '';
    let typeLabel = '', childLabel = '', canDelete = false;

    if (_mgSelectedType === 'category') {
      item = _allCategories.find(c => c.id === _mgSelectedId);
      if (!item) return;
      typeLabel = t('category');
      childLabel = t('subcategory');
      canDelete = _allSubcategories.filter(s => (s.categoryId || s.parentId) === item.id).length === 0;
    } else if (_mgSelectedType === 'subcategory') {
      item = _allSubcategories.find(s => s.id === _mgSelectedId);
      if (!item) return;
      const cat = _allCategories.find(c => c.id === (item.categoryId || item.parentId));
      parentLabel = cat ? esc(cat.labelIt) : '';
      typeLabel = t('subcategory');
      childLabel = t('subjectRole');
      canDelete = _allRoles.filter(r => (r.subcategoryId || r.parentId) === item.id).length === 0;
    } else if (_mgSelectedType === 'role') {
      item = _allRoles.find(r => r.id === _mgSelectedId);
      if (!item) return;
      const sub = _allSubcategories.find(s => s.id === (item.subcategoryId || item.parentId));
      const cat = sub ? _allCategories.find(c => c.id === (sub.categoryId || sub.parentId)) : null;
      parentLabel = sub ? esc(sub.labelIt) : '';
      grandparentLabel = cat ? esc(cat.labelIt) : '';
      typeLabel = t('subjectRole');
      childLabel = null;
      canDelete = true;
    }

    if (_mgEditMode) {
      colIt.innerHTML = `
        ${_mgSelectedType === 'subcategory' ? `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${parentLabel}</span></div>` : ''}
        ${_mgSelectedType === 'role' ? `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${grandparentLabel}</span></div><div class="mg-field-ro"><span class="mg-field-label">${t('subcategory')}</span><span class="mg-field-val">${parentLabel}</span></div>` : ''}
        <div class="mg-field-edit">
          <label>${typeLabel} (IT)</label>
          <input id="mgEditLabelIt" value="${esc(item.labelIt || '')}">
        </div>
        ${_mgSelectedType === 'role' ? `
          <div class="mg-field-edit"><label>${t('competenzaTipo')}</label>
            <select id="mgCompetenzaTipo">
              <option value="art11_diretto" ${item.competenzaTipo === 'art11_diretto' ? 'selected' : ''}>${t('competenza_art11_diretto')}</option>
              <option value="art11_connesso" ${item.competenzaTipo === 'art11_connesso' ? 'selected' : ''}>${t('competenza_art11_connesso')}</option>
              <option value="ordinario" ${item.competenzaTipo === 'ordinario' ? 'selected' : ''}>${t('competenza_ordinario')}</option>
            </select>
          </div>
          <div class="mg-field-edit"><label>${t('roleFunzione')} (IT)</label><textarea id="mgFunzioneIt" rows="2">${esc(item.funzione || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('respPenale')} (IT)</label><textarea id="mgRespPenaleIt" rows="2">${esc(item.respPenale || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('ipotesiReato')} (IT)</label><textarea id="mgIpotesiReatoIt" rows="4">${esc(item.ipotesiReato || '')}</textarea></div>
          ${item.abrogazione323 ? `<div class="mg-field-edit"><label>${t('abrogazione323')} (IT)</label><textarea id="mgAbrogazione323It" rows="2">${esc(item.abrogazione323 || '')}</textarea></div>` : ''}
          <div class="mg-field-edit"><label>${t('richiestaPunizione')} (IT)</label><textarea id="mgRichiestaPunizioneIt" rows="2">${esc(item.richiestaPunizione || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('respDisciplinare')} (IT)</label><textarea id="mgRespDiscIt" rows="2">${esc(item.respDisciplinare || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('ipotesiDisciplinare')} (IT)</label><textarea id="mgIpotesiDiscIt" rows="4">${esc(item.ipotesiDisciplinare || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('richiestaDisciplinare')} (IT)</label><textarea id="mgRichiestaDisciplinareIt" rows="2">${esc(item.richiestaDisciplinare || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('respCivile')} (IT)</label><textarea id="mgRespCivIt" rows="2">${esc(item.respCivile || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('ipotesiCivile')} (IT)</label><textarea id="mgIpotesiCivIt" rows="4">${esc(item.ipotesiCivile || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('richiestaCivile')} (IT)</label><textarea id="mgRichiestaCivileIt" rows="2">${esc(item.richiestaCivile || '')}</textarea></div>
        ` : ''}`;
      const catEn = _mgSelectedType === 'subcategory' ? _allCategories.find(c => c.id === (item.categoryId || item.parentId)) : null;
      const subEn = _mgSelectedType === 'role' ? _allSubcategories.find(s => s.id === (item.subcategoryId || item.parentId)) : null;
      const catEnRole = subEn ? _allCategories.find(c => c.id === (subEn.categoryId || subEn.parentId)) : null;
      colEn.innerHTML = `
        ${_mgSelectedType === 'subcategory' ? `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${catEn ? esc(catEn.labelEn) : ''}</span></div>` : ''}
        ${_mgSelectedType === 'role' ? `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${catEnRole ? esc(catEnRole.labelEn) : ''}</span></div><div class="mg-field-ro"><span class="mg-field-label">${t('subcategory')}</span><span class="mg-field-val">${subEn ? esc(subEn.labelEn) : ''}</span></div>` : ''}
        <div class="mg-field-edit">
          <label>${typeLabel} (EN)</label>
          <input id="mgEditLabelEn" value="${esc(item.labelEn || '')}">
        </div>
        ${_mgSelectedType === 'role' ? `
          <div class="mg-field-edit"><label>${t('roleFunzione')} (EN)</label><textarea id="mgFunzioneEn" rows="2">${esc(item.funzioneEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('respPenale')} (EN)</label><textarea id="mgRespPenaleEn" rows="2">${esc(item.respPenaleEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('ipotesiReato')} (EN)</label><textarea id="mgIpotesiReatoEn" rows="4">${esc(item.ipotesiReatoEn || '')}</textarea></div>
          ${item.abrogazione323En ? `<div class="mg-field-edit"><label>${t('abrogazione323')} (EN)</label><textarea id="mgAbrogazione323En" rows="2">${esc(item.abrogazione323En || '')}</textarea></div>` : ''}
          <div class="mg-field-edit"><label>${t('richiestaPunizione')} (EN)</label><textarea id="mgRichiestaPunizioneEn" rows="2">${esc(item.richiestaPunizioneEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('respDisciplinare')} (EN)</label><textarea id="mgRespDiscEn" rows="2">${esc(item.respDisciplinareEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('ipotesiDisciplinare')} (EN)</label><textarea id="mgIpotesiDiscEn" rows="4">${esc(item.ipotesiDisciplinareEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('richiestaDisciplinare')} (EN)</label><textarea id="mgRichiestaDisciplinareEn" rows="2">${esc(item.richiestaDisciplinareEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('respCivile')} (EN)</label><textarea id="mgRespCivEn" rows="2">${esc(item.respCivileEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('ipotesiCivile')} (EN)</label><textarea id="mgIpotesiCivEn" rows="4">${esc(item.ipotesiCivileEn || '')}</textarea></div>
          <div class="mg-field-edit"><label>${t('richiestaCivile')} (EN)</label><textarea id="mgRichiestaCivileEn" rows="2">${esc(item.richiestaCivileEn || '')}</textarea></div>
        ` : ''}`;
      actionArea.innerHTML = `<div class="mg-action-bar">
        <button class="btn btn-xs btn-primary" id="mgSaveEditBtn">${t('save')}</button>
        <button class="btn btn-xs" id="mgCancelEditBtn">${t('cancel')}</button>
        <span id="mgActionMsg" class="mg-saved-msg" style="display:none"></span>
      </div>`;
      document.getElementById('mgEditLabelIt').focus();
      document.getElementById('mgSaveEditBtn').onclick = async () => {
        const labelIt = document.getElementById('mgEditLabelIt').value.trim();
        const labelEn = document.getElementById('mgEditLabelEn').value.trim();
        if (!labelIt) { document.getElementById('mgEditLabelIt').style.borderColor = 'var(--danger)'; document.getElementById('mgEditLabelIt').focus(); return; }
        if (!labelEn) { document.getElementById('mgEditLabelEn').style.borderColor = 'var(--danger)'; document.getElementById('mgEditLabelEn').focus(); return; }
        const updateData = { labelIt, labelEn };
        if (_mgSelectedType === 'role') {
          updateData.competenzaTipo = (document.getElementById('mgCompetenzaTipo') || {}).value || '';
          updateData.funzione = (document.getElementById('mgFunzioneIt') || {}).value || '';
          updateData.funzioneEn = (document.getElementById('mgFunzioneEn') || {}).value || '';
          updateData.respPenale = (document.getElementById('mgRespPenaleIt') || {}).value || '';
          updateData.ipotesiReato = (document.getElementById('mgIpotesiReatoIt') || {}).value || '';
          const abrog323It = document.getElementById('mgAbrogazione323It');
          if (abrog323It) updateData.abrogazione323 = abrog323It.value || '';
          updateData.richiestaPunizione = (document.getElementById('mgRichiestaPunizioneIt') || {}).value || '';
          updateData.respDisciplinare = (document.getElementById('mgRespDiscIt') || {}).value || '';
          updateData.ipotesiDisciplinare = (document.getElementById('mgIpotesiDiscIt') || {}).value || '';
          updateData.richiestaDisciplinare = (document.getElementById('mgRichiestaDisciplinareIt') || {}).value || '';
          updateData.respCivile = (document.getElementById('mgRespCivIt') || {}).value || '';
          updateData.ipotesiCivile = (document.getElementById('mgIpotesiCivIt') || {}).value || '';
          updateData.richiestaCivile = (document.getElementById('mgRichiestaCivileIt') || {}).value || '';
          updateData.respPenaleEn = (document.getElementById('mgRespPenaleEn') || {}).value || '';
          updateData.ipotesiReatoEn = (document.getElementById('mgIpotesiReatoEn') || {}).value || '';
          const abrog323En = document.getElementById('mgAbrogazione323En');
          if (abrog323En) updateData.abrogazione323En = abrog323En.value || '';
          updateData.richiestaPunizioneEn = (document.getElementById('mgRichiestaPunizioneEn') || {}).value || '';
          updateData.respDisciplinareEn = (document.getElementById('mgRespDiscEn') || {}).value || '';
          updateData.ipotesiDisciplinareEn = (document.getElementById('mgIpotesiDiscEn') || {}).value || '';
          updateData.richiestaDisciplinareEn = (document.getElementById('mgRichiestaDisciplinareEn') || {}).value || '';
          updateData.respCivileEn = (document.getElementById('mgRespCivEn') || {}).value || '';
          updateData.ipotesiCivileEn = (document.getElementById('mgIpotesiCivEn') || {}).value || '';
          updateData.richiestaCivileEn = (document.getElementById('mgRichiestaCivileEn') || {}).value || '';
        }
        if (_mgSelectedType === 'category') await SysDB.updateCategory(_mgSelectedId, updateData);
        else if (_mgSelectedType === 'subcategory') await SysDB.updateSubcategory(_mgSelectedId, updateData);
        else if (_mgSelectedType === 'role') await SysDB.updateRole(_mgSelectedId, updateData);
        await _loadAllLists();
        _mgEditMode = false;
        renderManageContent();
      };
      document.getElementById('mgCancelEditBtn').onclick = () => { _mgEditMode = false; renderManageContent(); };
      return;
    }

    if (_mgSelectedType === 'category') {
      colIt.innerHTML = `<div class="mg-field-ro"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelIt)}</span></div>`;
      colEn.innerHTML = `<div class="mg-field-ro"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelEn)}</span></div>`;
    } else if (_mgSelectedType === 'subcategory') {
      const cat = _allCategories.find(c => c.id === (item.categoryId || item.parentId));
      colIt.innerHTML = `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${cat ? esc(cat.labelIt) : ''}</span></div>
        <div class="mg-field-ro"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelIt)}</span></div>`;
      colEn.innerHTML = `<div class="mg-field-ro"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${cat ? esc(cat.labelEn) : ''}</span></div>
        <div class="mg-field-ro"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelEn)}</span></div>`;
    } else if (_mgSelectedType === 'role') {
      const sub = _allSubcategories.find(s => s.id === (item.subcategoryId || item.parentId));
      const cat = sub ? _allCategories.find(c => c.id === (sub.categoryId || sub.parentId)) : null;
      colIt.innerHTML = `
        <div class="mg-role-header-row">
          <div class="mg-role-header-cell"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${cat ? esc(cat.labelIt) : ''}</span></div>
          <div class="mg-role-header-cell"><span class="mg-field-label">${t('subcategory')}</span><span class="mg-field-val">${sub ? esc(sub.labelIt) : ''}</span></div>
          <div class="mg-role-header-cell"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelIt)}</span></div>
        </div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('competenzaTipo')}</span><span class="mg-field-val">${item.competenzaTipo ? t('competenza_' + item.competenzaTipo) : '\u2014'}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('roleFunzione')}</span><span class="mg-field-val">${esc(item.funzione || '\u2014')}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('respPenale')}</span><span class="mg-field-val">${esc(item.respPenale || '\u2014')}</span></div>
        ${item.ipotesiReato ? `<div class="mg-accordion mg-resp-sub">
          <div class="mg-accordion-header"><span>${t('ipotesiReato')}</span><span class="mg-acc-icon">\u25B6</span></div>
          <div class="mg-accordion-body"><span class="mg-field-val">${esc(item.ipotesiReato)}</span></div>
        </div>` : ''}
        ${item.abrogazione323 ? `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('abrogazione323')}</span><span class="mg-field-val">${esc(item.abrogazione323)}</span></div>` : ''}
        <div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaPunizione')}</span><span class="mg-field-val">${esc(item.richiestaPunizione || '\u2014')}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('respDisciplinare')}</span><span class="mg-field-val">${esc(item.respDisciplinare || '\u2014')}</span></div>
        ${item.ipotesiDisciplinare ? `<div class="mg-accordion mg-resp-sub">
          <div class="mg-accordion-header"><span>${t('ipotesiDisciplinare')}</span><span class="mg-acc-icon">\u25B6</span></div>
          <div class="mg-accordion-body"><span class="mg-field-val">${esc(item.ipotesiDisciplinare)}</span></div>
        </div>` : ''}
        <div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaDisciplinare')}</span><span class="mg-field-val">${esc(item.richiestaDisciplinare || '\u2014')}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('respCivile')}</span><span class="mg-field-val">${esc(item.respCivile || '\u2014')}</span></div>
        ${item.ipotesiCivile ? `<div class="mg-accordion mg-resp-sub">
          <div class="mg-accordion-header"><span>${t('ipotesiCivile')}</span><span class="mg-acc-icon">\u25B6</span></div>
          <div class="mg-accordion-body"><span class="mg-field-val">${esc(item.ipotesiCivile)}</span></div>
        </div>` : ''}
        <div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaCivile')}</span><span class="mg-field-val">${esc(item.richiestaCivile || '\u2014')}</span></div>`;
      colEn.innerHTML = `
        <div class="mg-role-header-row">
          <div class="mg-role-header-cell"><span class="mg-field-label">${t('category')}</span><span class="mg-field-val">${cat ? esc(cat.labelEn) : ''}</span></div>
          <div class="mg-role-header-cell"><span class="mg-field-label">${t('subcategory')}</span><span class="mg-field-val">${sub ? esc(sub.labelEn) : ''}</span></div>
          <div class="mg-role-header-cell"><span class="mg-field-label">${typeLabel}</span><span class="mg-field-val mg-field-val-main">${esc(item.labelEn)}</span></div>
        </div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('competenzaTipo')}</span><span class="mg-field-val">${item.competenzaTipo ? t('competenza_' + item.competenzaTipo) : '\u2014'}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('roleFunzione')}</span><span class="mg-field-val">${esc(item.funzioneEn || '\u2014')}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('respPenale')}</span><span class="mg-field-val">${esc(item.respPenaleEn || '\u2014')}</span></div>
        ${item.ipotesiReatoEn ? `<div class="mg-accordion mg-resp-sub">
          <div class="mg-accordion-header"><span>${t('ipotesiReato')}</span><span class="mg-acc-icon">\u25B6</span></div>
          <div class="mg-accordion-body"><span class="mg-field-val">${esc(item.ipotesiReatoEn)}</span></div>
        </div>` : ''}
        ${item.abrogazione323En ? `<div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('abrogazione323')}</span><span class="mg-field-val">${esc(item.abrogazione323En)}</span></div>` : ''}
        <div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaPunizione')}</span><span class="mg-field-val">${esc(item.richiestaPunizioneEn || '\u2014')}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('respDisciplinare')}</span><span class="mg-field-val">${esc(item.respDisciplinareEn || '\u2014')}</span></div>
        ${item.ipotesiDisciplinareEn ? `<div class="mg-accordion mg-resp-sub">
          <div class="mg-accordion-header"><span>${t('ipotesiDisciplinare')}</span><span class="mg-acc-icon">\u25B6</span></div>
          <div class="mg-accordion-body"><span class="mg-field-val">${esc(item.ipotesiDisciplinareEn)}</span></div>
        </div>` : ''}
        <div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaDisciplinare')}</span><span class="mg-field-val">${esc(item.richiestaDisciplinareEn || '\u2014')}</span></div>
        <div class="mg-resp-ro"><span class="mg-field-label">${t('respCivile')}</span><span class="mg-field-val">${esc(item.respCivileEn || '\u2014')}</span></div>
        ${item.ipotesiCivileEn ? `<div class="mg-accordion mg-resp-sub">
          <div class="mg-accordion-header"><span>${t('ipotesiCivile')}</span><span class="mg-acc-icon">\u25B6</span></div>
          <div class="mg-accordion-body"><span class="mg-field-val">${esc(item.ipotesiCivileEn)}</span></div>
        </div>` : ''}
        <div class="mg-resp-ro mg-resp-sub"><span class="mg-field-label">${t('richiestaCivile')}</span><span class="mg-field-val">${esc(item.richiestaCivileEn || '\u2014')}</span></div>`;
    }

    const newBtnHtml = childLabel ? `<button class="btn btn-xs btn-primary" id="mgNewBtn">+ ${childLabel}</button>` : '';
    actionArea.innerHTML = `<div class="mg-action-bar">
      ${newBtnHtml}
      <button class="btn btn-xs" id="mgEditBtn">${t('editElement')}</button>
      <button class="btn btn-xs btn-danger" id="mgDeleteBtn" ${!canDelete ? 'disabled title="' + t('cannotDeleteHasChildren') + '"' : ''}>${t('deleteElement')}</button>
    </div>`;

    const newBtn = document.getElementById('mgNewBtn');
    if (newBtn) {
      newBtn.onclick = () => {
        if (_mgSelectedType === 'category') _mgAddTarget = 'subcategory';
        else if (_mgSelectedType === 'subcategory') _mgAddTarget = 'role';
        renderAddForm();
      };
    }
    document.querySelectorAll('.mg-accordion-header').forEach(hdr => {
      hdr.onclick = () => {
        hdr.parentElement.classList.toggle('open');
      };
    });
    document.getElementById('mgEditBtn').onclick = () => { _mgEditMode = true; renderManageContent(); };
    document.getElementById('mgDeleteBtn').onclick = async () => {
      if (!canDelete) return;
      if (!confirm(t('confirmDeleteMsg'))) return;
      if (_mgSelectedType === 'category') await SysDB.deleteCategory(_mgSelectedId);
      else if (_mgSelectedType === 'subcategory') await SysDB.deleteSubcategory(_mgSelectedId);
      else if (_mgSelectedType === 'role') await SysDB.deleteRole(_mgSelectedId);
      await _loadAllLists();
      _mgSelectedType = null;
      _mgSelectedId = null;
      _mgEditMode = false;
      renderManageContent();
    };
  }

  function renderAddForm() {
    const actionArea = document.getElementById('mgActionArea');
    if (!actionArea) return;
    const targetLabels = { category: t('category'), subcategory: t('subcategory'), role: t('subjectRole') };
    const colIt = document.getElementById('mgColItContent');
    const colEn = document.getElementById('mgColEnContent');
    if (colIt) colIt.innerHTML = `<div class="mg-field-edit"><label>${targetLabels[_mgAddTarget]} (IT)</label><input id="mgNewLabelIt" placeholder="Italiano..." autofocus></div>`;
    if (colEn) colEn.innerHTML = `<div class="mg-field-edit"><label>${targetLabels[_mgAddTarget]} (EN)</label><input id="mgNewLabelEn" placeholder="English..."></div>`;
    actionArea.innerHTML = `<div class="mg-action-bar">
      <button class="btn btn-xs btn-primary" id="mgConfirmAdd">${t('save')}</button>
      <button class="btn btn-xs" id="mgCancelAdd">${t('cancel')}</button>
    </div>`;
    document.getElementById('mgNewLabelIt').focus();
    document.getElementById('mgCancelAdd').onclick = () => { _mgAddTarget = null; renderManageContent(); };
    document.getElementById('mgConfirmAdd').onclick = async () => {
      const labelIt = document.getElementById('mgNewLabelIt').value.trim();
      const labelEn = document.getElementById('mgNewLabelEn').value.trim();
      if (!labelIt) { document.getElementById('mgNewLabelIt').style.borderColor = 'var(--danger)'; document.getElementById('mgNewLabelIt').focus(); return; }
      if (!labelEn) { document.getElementById('mgNewLabelEn').style.borderColor = 'var(--danger)'; document.getElementById('mgNewLabelEn').focus(); return; }
      if (_mgAddTarget === 'category') {
        const newId = await DB.addListItem('categories', labelIt, labelEn, null);
        _mgSelectedType = 'category'; _mgSelectedId = newId;
      } else if (_mgAddTarget === 'subcategory') {
        const parentId = _mgSelectedType === 'category' ? _mgSelectedId : null;
        if (!parentId) return;
        const newId = await DB.addListItem('subcategories', labelIt, labelEn, parentId);
        _mgSelectedType = 'subcategory'; _mgSelectedId = newId;
      } else if (_mgAddTarget === 'role') {
        const parentId = _mgSelectedType === 'subcategory' ? _mgSelectedId : null;
        if (!parentId) return;
        const newId = await DB.addListItem('roles', labelIt, labelEn, parentId);
        _mgSelectedType = 'role'; _mgSelectedId = newId;
      }
      await _loadAllLists();
      _mgAddTarget = null;
      renderManageContent();
    };
    document.getElementById('mgNewLabelIt').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const en = document.getElementById('mgNewLabelEn'); if (en) en.focus(); } });
    document.getElementById('mgNewLabelEn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const btn = document.getElementById('mgConfirmAdd'); if (btn) btn.click(); } });
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content mg-modal-wide">
      <h3>${t('manageRoles')}</h3>
      <div id="manageRolesContent"></div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-primary" id="mgCloseBtn">${t('close')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderManageContent();

  document.getElementById('mgCloseBtn').onclick = () => { overlay.remove(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function saveSubject(editId) {
  const firstName = document.getElementById('fSubFirst').value.trim();
  const lastName = document.getElementById('fSubLast').value.trim();
  if (!firstName) { document.getElementById('fSubFirst').focus(); return; }
  if (!lastName) { document.getElementById('fSubLast').focus(); return; }
  const salutation = document.getElementById('fSubSalutation').value.trim();
  if (salutation) {
    const flat = _flatSalutationList();
    const isBuiltIn = flat.some(f => f.label.toLowerCase() === salutation.toLowerCase());
    if (!isBuiltIn) {
      const existing = await DB.getListItems('salutation');
      const alreadySaved = existing.some(c => (c.labelIt || '').toLowerCase() === salutation.toLowerCase());
      if (!alreadySaved) {
        await DB.addListItem('salutation', salutation, salutation, null);
      }
    }
  }
  const origin = document.getElementById('fSubOrigin').value.trim();
  const data = {
    firstName,
    lastName,
    salutation,
    origin,
    descriptionIt: document.getElementById('fSubDescrIt').value.trim(),
    descriptionEn: document.getElementById('fSubDescrEn').value.trim(),
    roles: _subjectRoles
  };
  if (editId) {
    await DB.updateSubject(editId, data);
  } else {
    await DB.createSubject(data);
  }

  _subjectRoles = [];
  _subjectActs = [];
  _cachedSubjects = null;
  await renderSubjects();
  cancelForm();
}

function _findItem(list, id) {
  return id ? list.find(x => x.id === id) : null;
}

function _formatDate(dateStr) {
  return formatDateLocale(dateStr, false);
}

function _buildRoleBlockHtml(r) {
  const endDateDisplay = r.endDate ? _formatDate(r.endDate) : t('roleOngoing');
  const dateLine = '<div class="subject-role-line subject-role-dates">' + t('from') + ' ' + _formatDate(r.startDate) + ' ' + t('to') + ' ' + endDateDisplay + '</div>';
  const roleItem = _findItem(_allRoles, r.roleId);
  const subcatItem = _findItem(_allSubcategories, r.subcategoryId);
  const catItem = _findItem(_allCategories, r.categoryId);
  const roleLabel = roleItem ? _labelFor(roleItem) : (subcatItem ? _labelFor(subcatItem) : (catItem ? _labelFor(catItem) : ''));
  const roleParts = [];
  if (roleLabel) roleParts.push('<span class="subject-role-cat">' + roleLabel + '</span>');
  if (r.citta) roleParts.push('<span class="subject-role-citta">' + esc(r.citta) + '</span>');
  const roleLine = roleParts.length
    ? '<div class="subject-role-line">' + roleParts.join('<span class="subject-role-sep"> — </span>') + '</div>'
    : '';
  return '<div class="subject-role-block">' + dateLine + roleLine + '</div>';
}

async function renderSubjects() {
  const box = document.getElementById('allSubjectsList');
  if (!box) return;
  const subjects = await DB.getSubjects();
  if (subjects.length === 0) {
    box.innerHTML = '<p class="hint">' + t('noSubjects') + '</p>';
    return;
  }
  await _loadAllLists();
  box.innerHTML = subjects.map(s => {
    return `
    <div class="subject-card">
      <div class="subject-card-name subject-card-link" onclick="showSubjectDetail(${s.id})">${s.salutation ? esc(s.salutation) + ' ' : ''}${esc(s.firstName)} ${esc(s.lastName)}${s.origin ? ' <span class="subject-origin-hint">— ' + esc(s.origin) + '</span>' : ''}</div>
    </div>
  `}).join('');
}

async function deleteSubjectEntry(id) {
  if (!confirm(t('confirmDelete'))) return;
  await DB.deleteSubject(id);
  _cachedSubjects = null;
  await renderSubjects();
}

function _entityTypeLabel(type) {
  const map = { case: 'entityCase', proceeding: 'entityProceeding', dossier: 'entityDossier', act: 'entityAct' };
  return t(map[type] || type);
}

function _caseDisplayTitle(c) {
  if (!c) return '';
  if (currentLang === 'en' && c.titleEn) return c.titleEn;
  return c.title || '';
}

function _entityName(type, entity) {
  if (!entity) return '(?)';
  if (type === 'case') return _caseDisplayTitle(entity);
  if (type === 'proceeding') {
    const parts = [];
    if (entity.type) parts.push(entity.type);
    if (entity.rgNumber) parts.push(entity.rgNumber);
    if (entity.year) parts.push(entity.year);
    return parts.length ? parts.join(' ') : ('ID ' + entity.id);
  }
  if (type === 'dossier') return entity.title || entity.number || ('ID ' + entity.id);
  if (type === 'act') return entity.title || entity.description || ('ID ' + entity.id);
  return 'ID ' + (entity.id || '');
}

async function showSubjectDetail(subjectId) {
  const s = await DB.getSubject(subjectId);
  if (!s) return;
  await _loadAllLists();

  const panel = document.getElementById('detailView');
  panel.style.display = 'block';
  document.getElementById('welcomeView').style.display = 'none';
  document.getElementById('formView').style.display = 'none';
  state.selection = null;
  state.activeSubjectId = subjectId;

  const descr = currentLang === 'it' ? (s.descriptionIt || '') : (s.descriptionEn || s.descriptionIt || '');

  const roles = s.roles || [];
  const rolesHtml = roles.map(r => _buildRoleBlockHtml(r)).join('');

  const links = await DB.getSubjectLinks(subjectId);
  const procLinks = links.filter(l => l.entityType === 'proceeding' && l.qualificaProcessuale);
  const otherLinks = links.filter(l => !(l.entityType === 'proceeding' && l.qualificaProcessuale));

  let proceduralHtml = '';
  if (procLinks.length > 0) {
    proceduralHtml = procLinks.map(l => {
      const name = esc(_entityName(l.entityType, l.entity));
      const qualLabel = t('procRole_' + l.qualificaProcessuale) || l.qualificaProcessuale;
      const dateStr = l.dataQualifica ? ` <span class="connection-date">(${l.dataQualifica})</span>` : '';
      const clickAction = l.entity ? ` onclick="showDetail('proceeding', ${l.entityId})" class="connection-item connection-clickable"` : ' class="connection-item"';
      return `<div${clickAction} data-testid="proc-link-${l.id}">
        <span class="connection-type-badge qualifica-badge">${esc(qualLabel)}</span>
        <span class="connection-name">${name}</span>
        ${dateStr}
        ${creatorOnly(`<button class="btn btn-xs btn-danger" style="margin-left:auto" onclick="event.stopPropagation(); removeProceduralLink(${l.id}, ${subjectId})" data-testid="btn-remove-proclink-${l.id}">${t('remove')}</button>`)}
      </div>`;
    }).join('');
  } else {
    proceduralHtml = '<p class="hint">' + t('noProceduralLinks') + '</p>';
  }

  let connectionsHtml = '';
  if (otherLinks.length === 0) {
    connectionsHtml = '<p class="hint">' + t('noConnections') + '</p>';
  } else {
    connectionsHtml = otherLinks.map(l => {
      const typeLabel = _entityTypeLabel(l.entityType);
      const name = esc(_entityName(l.entityType, l.entity));
      const roleText = l.role ? '<span class="connection-role">' + esc(l.role) + '</span>' : '';
      const clickable = l.entity ? ` onclick="showDetail('${l.entityType}', ${l.entityId})" class="connection-item connection-clickable"` : ' class="connection-item"';
      return `<div${clickable}>
        <span class="connection-type-badge">${esc(typeLabel)}</span>
        <span class="connection-name">${name}</span>
        ${roleText}
      </div>`;
    }).join('');
  }

  panel.innerHTML = `
    <div class="detail-panel">
      <div class="detail-header">
        <h2>${s.salutation ? esc(s.salutation) + ' ' : ''}${esc(s.firstName)} ${esc(s.lastName)}${s.origin ? ' <span class="subject-origin-hint">— ' + esc(s.origin) + '</span>' : ''}</h2>
        <div class="detail-header-actions">
          ${creatorOnly(`<button class="btn btn-sm" onclick="openForm('subject', null, ${s.id})">${t('edit')}</button>`)}
          ${creatorOnly(`<button class="btn btn-sm btn-danger" onclick="deleteSubjectEntry(${s.id})">${t('delete')}</button>`)}
        </div>
      </div>
      ${descr ? `<div class="detail-field">
        <div class="detail-field-label">${t('description')}</div>
        <div class="detail-field-value">${esc(descr)}</div>
      </div>` : ''}
      <div class="detail-section">
        <div class="detail-section-header"><h3>${t('rolesSection')}</h3></div>
        ${rolesHtml || '<p class="hint">' + t('noRolesAssigned') + '</p>'}
      </div>
      <div class="detail-section">
        <div class="detail-section-header">
          <h3>${t('proceduralQualifications')}</h3>
          ${creatorOnly(`<button class="btn btn-xs" onclick="openAddQualificaForm(${subjectId})" data-testid="btn-add-qualifica">${t('addQualifica')}</button>`)}
        </div>
        <div id="proceduralLinksContainer">${proceduralHtml}</div>
        <div id="addQualificaFormContainer"></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-header"><h3>${t('subjectConnections')}</h3></div>
        ${connectionsHtml}
      </div>
    </div>
  `;
}

async function openAddQualificaForm(subjectId) {
  const container = document.getElementById('addQualificaFormContainer');
  if (!container) return;
  const allProcs = await DB.getAllProceedings();
  const allCases = await DB.getCases();
  const caseMap = {};
  for (const c of allCases) caseMap[c.id] = _caseDisplayTitle(c) || '—';
  const procOptions = allProcs.map(p => {
    const caseTitle = caseMap[p.caseId] || '—';
    const procLabel = p.title || `${p.rgNumber || ''}/${p.year || ''}`;
    return `<option value="${p.id}">${esc(caseTitle)} → ${esc(procLabel)}</option>`;
  }).join('');
  const qualificaOptions = PROCEDURAL_ROLES.map(r => `<option value="${r}">${t('procRole_' + r)}</option>`).join('');
  container.innerHTML = `
    <div class="add-qualifica-form" style="border:1px solid var(--border);border-radius:6px;padding:12px;margin-top:8px;background:var(--bg-secondary)">
      <div class="form-group">
        <label>${t('proceeding')}</label>
        <select id="qualProcSelect" data-testid="select-qualifica-proceeding">${procOptions}</select>
      </div>
      <div class="form-group">
        <label>${t('proceduralQualification')}</label>
        <select id="qualTypeSelect" data-testid="select-qualifica-type">${qualificaOptions}</select>
      </div>
      <div class="form-group">
        <label>${t('qualificaDate')}</label>
        <input type="date" id="qualDateInput" value="${new Date().toISOString().slice(0, 10)}" data-testid="input-qualifica-date">
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="saveQualificaLink(${subjectId})" data-testid="btn-save-qualifica">${t('save')}</button>
        <button class="btn btn-sm" onclick="document.getElementById('addQualificaFormContainer').innerHTML=''" data-testid="btn-cancel-qualifica">${t('cancel')}</button>
      </div>
    </div>
  `;
}

async function saveQualificaLink(subjectId) {
  const procId = parseInt(document.getElementById('qualProcSelect').value);
  const qualifica = document.getElementById('qualTypeSelect').value;
  const dataQ = document.getElementById('qualDateInput').value;
  if (!procId || !qualifica) return;
  const qualLabel = t('procRole_' + qualifica);
  await DB.linkSubject({
    entityType: 'proceeding',
    entityId: procId,
    subjectId: subjectId,
    role: qualLabel,
    qualificaProcessuale: qualifica,
    dataQualifica: dataQ
  });
  const proc = await DB.getProceeding(procId);
  if (proc && proc.caseId) {
    const caseLinks = await DB.getEntitySubjects('case', proc.caseId);
    if (!caseLinks.some(l => l.subjectId === subjectId)) {
      await DB.linkSubject({ entityType: 'case', entityId: proc.caseId, subjectId, role: qualLabel });
    }
  }
  await showSubjectDetail(subjectId);
}

async function removeProceduralLink(linkId, subjectId) {
  if (!confirm(t('confirmDelete'))) return;
  await DB.unlinkSubject(linkId);
  await showSubjectDetail(subjectId);
}

/* ========== SUBJECT TAB TOGGLE ========== */
let _activeSubjectTab = 'all';

function switchSubjectTab(tab) {
  _activeSubjectTab = tab;
  const tabAll = document.getElementById('tabAllSubjects');
  const tabLinked = document.getElementById('tabLinkedSubjects');
  const panelAll = document.getElementById('subjectTabAll');
  const panelLinked = document.getElementById('subjectTabLinked');
  if (tab === 'all') {
    tabAll.classList.add('active');
    tabLinked.classList.remove('active');
    panelAll.style.display = 'block';
    panelLinked.style.display = 'none';
  } else {
    tabAll.classList.remove('active');
    tabLinked.classList.add('active');
    panelAll.style.display = 'none';
    panelLinked.style.display = 'block';
  }
}

/* ========== LINKED SUBJECTS ========== */
function showLinkedSection(entityType, entityId) {
  const tabLinked = document.getElementById('tabLinkedSubjects');
  if (tabLinked) {
    tabLinked.style.display = '';
    document.getElementById('btnLinkSubject').onclick = () => openLinkSubjectForm(entityType, entityId);
  }
  renderLinkedSubjects(entityType, entityId);
  if (_activeSubjectTab !== 'linked') {
    switchSubjectTab('linked');
  }
}

async function renderLinkedSubjects(entityType, entityId) {
  const box = document.getElementById('linkedSubjectsList');
  if (!box || !entityType || !entityId) return;

  const links = await DB.getEntitySubjects(entityType, entityId);
  if (links.length === 0) {
    box.innerHTML = '<p class="hint">' + t('noLinked') + '</p>';
    return;
  }

  await _loadAllLists();
  const ROLE_ORDER = ['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale', 'responsabile_vigilanza', 'pm', 'indagato', 'imputato', 'gip', 'gup', 'giudice_dibattimento', 'giudice_appello', 'giudice_cassazione', 'magistrato'];
  const roleLabelsIt = ROLE_ORDER.map(rc => tLang('procRole_' + rc, 'it'));
  const roleLabelsEn = ROLE_ORDER.map(rc => tLang('procRole_' + rc, 'en'));
  links.sort((a, b) => {
    let aIdx = roleLabelsIt.findIndex(rl => a.role && a.role === rl);
    if (aIdx === -1) aIdx = roleLabelsEn.findIndex(rl => a.role && a.role === rl);
    let bIdx = roleLabelsIt.findIndex(rl => b.role && b.role === rl);
    if (bIdx === -1) bIdx = roleLabelsEn.findIndex(rl => b.role && b.role === rl);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
  const vigRoleCodesSet = new Set(['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale', 'responsabile_vigilanza']);
  const vigLabelsIt = [...vigRoleCodesSet].map(rc => tLang('procRole_' + rc, 'it'));
  const vigLabelsEn = [...vigRoleCodesSet].map(rc => tLang('procRole_' + rc, 'en'));
  const isVigRole = (role) => role && (vigLabelsIt.includes(role) || vigLabelsEn.includes(role));

  const vigLinks = links.filter(l => isVigRole(l.role));
  const procLinks = links.filter(l => !isVigRole(l.role));

  const renderCard = (l) => `
    <div class="subject-card">
      ${l.role ? '<div class="subject-link-role">' + esc(l.role) + '</div>' : ''}
      <div class="subject-card-name">${l.subject.salutation ? esc(l.subject.salutation) + ' ' : ''}${esc(l.subject.firstName)} ${esc(l.subject.lastName)}</div>
      ${creatorOnly(`<div class="subject-card-actions">
        <button class="btn btn-xs btn-danger" onclick="unlinkSubjectEntry(${l.id}, '${entityType}', ${entityId})">${t('unlink')}</button>
      </div>`)}
    </div>`;

  let html = '';
  if (vigLinks.length > 0) {
    html += `<div class="linked-section-title">${t('catenaVigilanza')}</div>`;
    html += vigLinks.map(renderCard).join('');
  }
  if (procLinks.length > 0) {
    html += `<div class="linked-section-title">${t('soggettiProcessuali')}</div>`;
    html += procLinks.map(renderCard).join('');
  }
  box.innerHTML = html;
}

async function openLinkSubjectForm(entityType, entityId) {
  if (!entityType && state.selection) {
    entityType = state.selection.type;
    entityId = state.selection.id;
  }
  if (!entityType || !entityId) return;

  const subjects = await DB.getSubjects();
  if (subjects.length === 0) {
    alert(t('noSubjects'));
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('linkSubjectTitle')}</h3>
      <div class="form-group">
        <label>${t('selectSubject')}</label>
        <select id="fLinkSubject">
          ${subjects.map(s => `<option value="${s.id}">${esc(s.lastName)} ${esc(s.firstName)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('role')}</label>
        <input id="fLinkRole" placeholder="${t('role')}">
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnConfirmLink">${t('confirm')}</button>
        <button class="btn" id="btnCancelLink">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnConfirmLink').onclick = async () => {
    const subjectId = parseInt(document.getElementById('fLinkSubject').value);
    const role = document.getElementById('fLinkRole').value.trim();
    await DB.linkSubject({ entityType, entityId, subjectId, role });
    if (entityType === 'proceeding') {
      await ensureCaseLink(subjectId, entityId, role);
    }
    overlay.remove();
    await renderLinkedSubjects(entityType, entityId);
  };
  document.getElementById('btnCancelLink').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

async function unlinkSubjectEntry(linkId, entityType, entityId) {
  await DB.unlinkSubject(linkId);
  await renderLinkedSubjects(entityType, entityId);
}

/* ========== DELETE ========== */
async function deleteEntity(type, id) {
  if (!confirm(t('confirmDelete'))) return;
  if (type === 'case') await DB.deleteCase(id);
  else if (type === 'proceeding') await DB.deleteProceeding(id);
  else if (type === 'dossier') await DB.deleteDossier(id);
  else if (type === 'act') await DB.deleteAct(id);
  else if (type === 'fact') await DB.deleteFact(id);
  else if (type === 'proof') await DB.deleteProof(id);

  state.selection = null;
  hideAllPanels();
  document.getElementById('welcomeView').style.display = 'block';
  document.getElementById('tabLinkedSubjects').style.display = 'none';
  switchSubjectTab('all');
  await renderAll();
}

/* ========== HELPERS ========== */
function _activateArchiveView(viewId) {
  const el = document.getElementById(viewId);
  if (el) {
    el.style.display = 'flex';
    el.classList.add('archive-view');
  }
  document.getElementById('mainPanel').classList.add('archive-active');
}

function _deactivateArchiveViews() {
  const nv = document.getElementById('normeView');
  const rv = document.getElementById('rolesView');
  if (nv) { nv.classList.remove('archive-view'); nv.style.display = 'none'; }
  if (rv) { rv.classList.remove('archive-view'); rv.style.display = 'none'; }
  document.getElementById('mainPanel').classList.remove('archive-active');
}

function hideAllPanels() {
  document.getElementById('welcomeView').style.display = 'none';
  document.getElementById('formView').style.display = 'none';
  document.getElementById('detailView').style.display = 'none';
  _deactivateArchiveViews();
  document.getElementById('sidebarLeft').style.display = '';
  document.getElementById('sidebarRight').style.display = '';
  document.querySelector('.app-layout').classList.remove('norme-fullwidth');
}

async function cancelForm() {
  hideAllPanels();
  state.pendingFiles = { it: [], en: [] };
  state.pendingProofFiles = { it: [], en: [] };
  state.openForm = null;

  if (state.selection) {
    document.getElementById('detailView').style.display = 'block';
    showDetail(state.selection.type, state.selection.id);
  } else {
    document.getElementById('welcomeView').style.display = 'block';
  }
}

function proofTitle(pr) {
  if (!pr) return '';
  return currentLang === 'en' ? (pr.title_en || pr.title || '') : (pr.title || '');
}
function proofNotes(pr) {
  if (!pr) return '';
  return currentLang === 'en' ? (pr.notes_en || pr.notes || '') : (pr.notes || '');
}
function _proofMatchesSearch(p, q) {
  const low = q.toLowerCase();
  return (p.title || '').toLowerCase().includes(low) ||
    (p.title_en || '').toLowerCase().includes(low) ||
    (p.notes || '').toLowerCase().includes(low) ||
    (p.notes_en || '').toLowerCase().includes(low);
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function setupCittaAutocomplete(inputId, listId, targetIds, options) {
  options = options || {};
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) { console.warn('Autocomplete: elements not found', inputId, listId); return; }
  if (input._autocompleteSetup) return;
  input._autocompleteSetup = true;
  let debounceTimer = null;
  let selectedIdx = -1;
  let currentResults = [];

  function highlightItem() {
    list.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('active', i === selectedIdx);
    });
  }

  function selectComune(c) {
    if (options.formatValue) {
      input.value = options.formatValue(c);
    } else {
      input.value = c.comune;
    }
    if (targetIds.provincia) {
      const provEl = document.getElementById(targetIds.provincia);
      if (provEl) provEl.value = c.provinciaNome ? c.provinciaNome + ' (' + c.provincia + ')' : (c.provincia || '');
    }
    if (targetIds.regione) {
      const regEl = document.getElementById(targetIds.regione);
      if (regEl) regEl.value = c.regioneNome || c.regione || '';
    }
    if (targetIds.stato) {
      const statoEl = document.getElementById(targetIds.stato);
      if (statoEl) statoEl.value = c.stato || 'Italia';
    }
    list.innerHTML = '';
    list.classList.remove('visible');
    currentResults = [];
    selectedIdx = -1;
  }

  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    var q = input.value.trim();
    if (q.length < 2) {
      list.innerHTML = '';
      list.classList.remove('visible');
      currentResults = [];
      selectedIdx = -1;
      return;
    }
    debounceTimer = setTimeout(async function() {
      try {
        var results = await GeoDB.searchComuni(q);
        currentResults = results.slice(0, 15);
        selectedIdx = -1;
        if (currentResults.length === 0) {
          list.innerHTML = '<div class="autocomplete-item no-result">' + (t('noResults') || 'Nessun risultato') + '</div>';
          list.classList.add('visible');
          return;
        }
        list.innerHTML = currentResults.map(function(c, i) {
          var prov = c.provincia ? ' (' + c.provincia + ')' : '';
          return '<div class="autocomplete-item" data-idx="' + i + '">' + esc(c.comune) + prov + '</div>';
        }).join('');
        list.classList.add('visible');
      } catch (err) {
        console.error('Autocomplete search error:', err);
      }
    }, 150);
  });

  list.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var item = e.target.closest('.autocomplete-item');
    if (!item || item.classList.contains('no-result')) return;
    var idx = parseInt(item.dataset.idx);
    if (currentResults[idx]) selectComune(currentResults[idx]);
  });

  input.addEventListener('keydown', function(e) {
    if (!list.classList.contains('visible') || currentResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, currentResults.length - 1); highlightItem(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); highlightItem(); }
    else if (e.key === 'Enter' && selectedIdx >= 0) { e.preventDefault(); selectComune(currentResults[selectedIdx]); }
    else if (e.key === 'Escape') { list.innerHTML = ''; list.classList.remove('visible'); }
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
  });

  console.log('Autocomplete setup complete for:', inputId);
}

function setupSalutationAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;
  if (input._autocompleteSetup) return;
  input._autocompleteSetup = true;
  let debounceTimer = null;
  let selectedIdx = -1;
  let currentResults = [];

  function highlightItem() {
    list.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('active', i === selectedIdx);
    });
  }

  function selectItem(item) {
    input.value = item.label;
    list.innerHTML = '';
    list.classList.remove('visible');
    currentResults = [];
    selectedIdx = -1;
  }

  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      list.innerHTML = '';
      list.classList.remove('visible');
      currentResults = [];
      selectedIdx = -1;
      return;
    }
    debounceTimer = setTimeout(async function() {
      const flat = _flatSalutationList();
      const customItems = await DB.getListItems('salutation');
      for (const c of customItems) {
        const lbl = (currentLang === 'en' && c.labelEn) ? c.labelEn : c.labelIt;
        if (lbl && !flat.some(f => f.label.toLowerCase() === lbl.toLowerCase())) {
          flat.push({ label: lbl, group: 'Personalizzati' });
        }
      }
      currentResults = flat.filter(f => f.label.toLowerCase().includes(q)).slice(0, 20);
      selectedIdx = -1;
      if (currentResults.length === 0) {
        list.innerHTML = '<div class="autocomplete-item no-result">' + (t('noResults') || 'Nessun risultato') + '</div>';
        list.classList.add('visible');
        return;
      }
      let lastGroup = '';
      let html = '';
      currentResults.forEach((item, i) => {
        if (item.group !== lastGroup) {
          html += '<div class="autocomplete-group-header">' + esc(item.group) + '</div>';
          lastGroup = item.group;
        }
        html += '<div class="autocomplete-item" data-idx="' + i + '">' + esc(item.label) + '</div>';
      });
      list.innerHTML = html;
      list.classList.add('visible');
    }, 100);
  });

  list.addEventListener('mousedown', function(e) {
    e.preventDefault();
    const item = e.target.closest('.autocomplete-item');
    if (!item || item.classList.contains('no-result')) return;
    const idx = parseInt(item.dataset.idx);
    if (currentResults[idx]) selectItem(currentResults[idx]);
  });

  input.addEventListener('keydown', function(e) {
    if (!list.classList.contains('visible') || currentResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, currentResults.length - 1); highlightItem(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); highlightItem(); }
    else if (e.key === 'Enter' && selectedIdx >= 0) { e.preventDefault(); selectItem(currentResults[selectedIdx]); }
    else if (e.key === 'Escape') { list.innerHTML = ''; list.classList.remove('visible'); }
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { list.innerHTML = ''; list.classList.remove('visible'); }, 250);
  });
}

/* ========== NORMATIVE DATABASE UI ========== */

let _normeState = {
  allNodi: [],
  rootId: null,
  expandedNodes: new Set(),
  selectedNodeId: null,
  activeTab: 'penale',
  searchQuery: ''
};

async function showNormeView() {
  hideAllPanels();
  document.getElementById('sidebarLeft').style.display = 'none';
  document.getElementById('sidebarRight').style.display = 'none';
  document.querySelector('.app-layout').classList.add('norme-fullwidth');
  _activateArchiveView('normeView');
  _normeState.allNodi = await NormDB.getAllNodi();
  const _rootNode = _normeState.allNodi.find(n => n.tipo_nodo === 'sistema');
  _normeState.rootId = _rootNode ? _rootNode.id : null;
  if (_normeState.allNodi.length === 0 || NormDB.needsReimport()) {
    await _autoInitNormeTemplate();
  } else {
    const localVer = parseInt(localStorage.getItem('normeDataVersion') || '0');
    const sampleNode = _normeState.allNodi.find(n => n.tipo_nodo === 'articolo');
    const needsReimport = localVer < 6 || (sampleNode && !sampleNode.id_fonte);
    if (needsReimport) {
      await _autoInitNormeTemplate();
      localStorage.setItem('normeDataVersion', '6');
    }
  }
  _renderNormeView();
}

async function _autoInitNormeTemplate() {
  const panel = document.getElementById('normeView');
  if (panel) panel.innerHTML = `<div style="text-align:center;padding:40px"><p><strong>${t('normeAutoInit')}</strong></p><div class="spinner"></div></div>`;
  try {
    const resp = await fetch('data/norme-data.json');
    if (resp.ok) {
      const normData = await resp.json();
      console.log('Auto-init: loading bundled norme-data.json — nodi:', (normData.nodi_normativi || []).length, 'elementi:', (normData.elementi_reato || []).length);
      await NormDB.importAll(normData);
    } else {
      console.error('Auto-init: failed to fetch norme-data.json:', resp.status);
    }
  } catch (e) {
    console.error('Auto-init: error loading norme-data.json:', e);
  }
  _normeState.allNodi = await NormDB.getAllNodi();
  const _rootNode = _normeState.allNodi.find(n => n.tipo_nodo === 'sistema');
  _normeState.rootId = _rootNode ? _rootNode.id : null;
  localStorage.setItem('normeDataVersion', '5');
  if (typeof saveDatabaseToFS === 'function') await saveDatabaseToFS();
}

async function _seedNormeTree() {
  let _allNodi = await NormDB.getAllNodi();

  async function add(nome, tipo, ambito, parentId) {
    const existing = _allNodi.find(n => n.rubrica === nome && n.tipo_nodo === tipo && ((!parentId && !n.id_padre) || n.id_padre === parentId));
    if (existing) return existing.id;
    const newId = await NormDB.addNodo({ rubrica: nome, tipo_nodo: tipo, ambito, id_padre: parentId || undefined, vigente: true });
    _allNodi = await NormDB.getAllNodi();
    return newId;
  }

  const root = await add('SISTEMA NORMATIVO', 'sistema', 'nazionale', null);
  if (!root) return;

  const italia = await add('ITALIA', 'stato', 'nazionale', root);
  if (italia) {
    const cost = await add('Costituzione', 'codice', 'nazionale', italia);
    const cp = await add('Codice Penale', 'codice', 'nazionale', italia);
    if (cp) {
      const l1 = await add('Libro I - Dei reati in generale', 'libro', 'nazionale', cp);
      const l2 = await add('Libro II - Dei delitti in particolare', 'libro', 'nazionale', cp);
      if (l2) {
        await add('Titolo I - Dei delitti contro la personalità dello Stato', 'titolo', 'nazionale', l2);
        await add('Titolo II - Dei delitti contro la Pubblica Amministrazione', 'titolo', 'nazionale', l2);
        await add('Titolo III - Dei delitti contro l\'amministrazione della giustizia', 'titolo', 'nazionale', l2);
        await add('Titolo IV - Dei delitti contro il sentimento religioso e la pietà dei defunti', 'titolo', 'nazionale', l2);
        await add('Titolo V - Dei delitti contro l\'ordine pubblico', 'titolo', 'nazionale', l2);
        await add('Titolo VI - Dei delitti contro l\'incolumità pubblica', 'titolo', 'nazionale', l2);
        await add('Titolo VII - Dei delitti contro la fede pubblica', 'titolo', 'nazionale', l2);
        await add('Titolo VIII - Dei delitti contro l\'economia pubblica', 'titolo', 'nazionale', l2);
        await add('Titolo IX - Dei delitti contro la moralità pubblica', 'titolo', 'nazionale', l2);
        await add('Titolo X - Dei delitti contro l\'integrità e la sanità della stirpe', 'titolo', 'nazionale', l2);
        await add('Titolo XI - Dei delitti contro la famiglia', 'titolo', 'nazionale', l2);
        await add('Titolo XII - Dei delitti contro la persona', 'titolo', 'nazionale', l2);
        await add('Titolo XIII - Dei delitti contro il patrimonio', 'titolo', 'nazionale', l2);
      }
      const l3 = await add('Libro III - Delle contravvenzioni in particolare', 'libro', 'nazionale', cp);
    }
    const cpp = await add('Codice di Procedura Penale', 'codice', 'nazionale', italia);
    const cc = await add('Codice Civile', 'codice', 'nazionale', italia);
    const cpc = await add('Codice di Procedura Civile', 'codice', 'nazionale', italia);
    const ls = await add('Leggi Speciali', 'legge_speciale', 'nazionale', italia);
  }

  const ue = await add('UNIONE EUROPEA', 'organizzazione', 'UE', root);
  if (ue) {
    await add('Trattati', 'trattato', 'UE', ue);
    await add('Regolamenti', 'regolamento', 'UE', ue);
    await add('Direttive', 'direttiva', 'UE', ue);
  }

  const cedu = await add('CEDU', 'organizzazione', 'internazionale', root);

  const onu = await add('ONU', 'organizzazione', 'internazionale', root);
  if (onu) {
    await add('Convenzioni', 'convenzione', 'internazionale', onu);
    await add('Patti', 'patto', 'internazionale', onu);
  }

  const cpi = await add('CPI', 'organizzazione', 'internazionale', root);
  if (cpi) {
    await add('Statuto di Roma', 'statuto', 'internazionale', cpi);
  }
}

async function _seedElementiReato() {
  if (typeof ELEMENTI_REATO_DATA === 'undefined') return;
  const allNodi = await NormDB.getAllNodi();
  const root = allNodi.find(n => n.rubrica === 'SISTEMA NORMATIVO' && n.tipo_nodo === 'sistema');
  if (!root) return;
  const italia = allNodi.find(n => n.rubrica === 'ITALIA' && n.tipo_nodo === 'stato' && n.id_padre === root.id);
  if (!italia) return;
  const cp = allNodi.find(n => n.rubrica === 'Codice Penale' && n.tipo_nodo === 'codice' && n.id_padre === italia.id);
  if (!cp) return;

  for (const entry of ELEMENTI_REATO_DATA) {
    const artName = 'Art. ' + entry.art;
    const artNode = allNodi.find(n => n.rubrica === artName && n.tipo_nodo === 'articolo');
    if (!artNode) continue;
    let parentCheck = artNode;
    let underCP = false;
    while (parentCheck) {
      if (parentCheck.id === cp.id) { underCP = true; break; }
      parentCheck = parentCheck.id_padre ? allNodi.find(n => n.id === parentCheck.id_padre) : null;
    }
    if (!underCP) continue;
    const existing = await NormDB.getElementiReato(artNode.id);
    if (existing.length > 0) {
      for (const old of existing) await NormDB.deleteElementoReato(old.id);
    }
    for (const el of entry.elementi) {
      await NormDB.addElementoReato({
        id_norma: artNode.id,
        categoria: el.categoria,
        descrizione: el.descrizione,
        descrizione_en: el.descrizione_en || '',
        obbligatorio: el.obbligatorio,
        onere_prova: el.onere_prova,
        tipo_prova_tipica: el.tipo_prova_tipica || ''
      });
    }
  }
}

async function _seedMetadatiPenali() {
  if (typeof METADATI_PENALI_DATA === 'undefined') return;
  const allNodi = await NormDB.getAllNodi();
  const root = allNodi.find(n => n.rubrica === 'SISTEMA NORMATIVO' && n.tipo_nodo === 'sistema');
  if (!root) return;
  const italia = allNodi.find(n => n.rubrica === 'ITALIA' && n.tipo_nodo === 'stato' && n.id_padre === root.id);
  if (!italia) return;
  const cp = allNodi.find(n => n.rubrica === 'Codice Penale' && n.tipo_nodo === 'codice' && n.id_padre === italia.id);
  if (!cp) return;

  for (const entry of METADATI_PENALI_DATA) {
    const artName = 'Art. ' + entry.art;
    const artNode = allNodi.find(n => n.rubrica === artName && n.tipo_nodo === 'articolo');
    if (!artNode) continue;
    let parentCheck = artNode;
    let underCP = false;
    while (parentCheck) {
      if (parentCheck.id === cp.id) { underCP = true; break; }
      parentCheck = parentCheck.id_padre ? allNodi.find(n => n.id === parentCheck.id_padre) : null;
    }
    if (!underCP) continue;
    const existing = await NormDB.getMetadatiPenali(artNode.id);
    if (existing) continue;
    await NormDB.setMetadatiPenali(artNode.id, {
      tipo_reato: entry.delitto_contravvenzione,
      categoria_delitto: entry.categoria_delitto,
      categoria_delitto_en: entry.categoria_delitto_en || '',
      pena_min_anni: entry.pena_min_anni,
      pena_max_anni: entry.pena_max_anni,
      multa_min: entry.multa_min,
      multa_max: entry.multa_max,
      art_407_cpp: entry.flag_art_407,
      procedibilita: entry.procedibilita,
      reato_proprio: entry.reato_proprio,
      qualifica_richiesta: entry.qualifica_richiesta,
      qualifica_richiesta_en: entry.qualifica_richiesta_en || '',
      reato_omissivo: entry.reato_omissivo,
      reato_permanente: entry.reato_permanente
    });
  }
}

async function _seedCodeData(dataObj, targetNodeName) {
  if (!dataObj) return;
  let _allNodi = await NormDB.getAllNodi();
  const findNode = (nome, tipo, parentId) => _allNodi.find(n => n.rubrica === nome && n.tipo_nodo === tipo && ((!parentId && !n.id_padre) || n.id_padre === parentId));

  async function ensure(nome, tipo, ambito, parentId) {
    let node = findNode(nome, tipo, parentId);
    if (node) return node.id;
    const newId = await NormDB.addNodo({ rubrica: nome, tipo_nodo: tipo, ambito, id_padre: parentId || undefined, vigente: true });
    _allNodi = await NormDB.getAllNodi();
    return newId;
  }

  async function ensureArticle(art, parentId) {
    const nome = 'Art. ' + art.num;
    let node = _allNodi.find(n => n.rubrica === nome && n.tipo_nodo === 'articolo' && n.id_padre === parentId);
    if (node) {
      if ((!node.testo_it && art.it) || (!node.testo_en && art.en)) {
        await NormDB.updateNodo(node.id, { testo_it: art.it || node.testo_it || '', testo_en: art.en || node.testo_en || '' });
        _allNodi = await NormDB.getAllNodi();
      }
      return node.id;
    }
    const newId = await NormDB.addNodo({ rubrica: nome, numero: art.num, tipo_nodo: 'articolo', ambito: 'nazionale', id_padre: parentId, vigente: true, testo_it: art.it || '', testo_en: art.en || '' });
    _allNodi = await NormDB.getAllNodi();
    return newId;
  }

  async function processSection(section, parentId) {
    const sId = await ensure(section.nome, section.tipo, 'nazionale', parentId);
    if (!sId) return;
    if (section.articoli) {
      for (const art of section.articoli) {
        await ensureArticle(art, sId);
      }
    }
    if (section.children) {
      for (const child of section.children) {
        await processSection(child, sId);
      }
    }
  }

  const root = findNode('SISTEMA NORMATIVO', 'sistema', null);
  if (!root) return;
  const italia = findNode('ITALIA', 'stato', root.id);
  if (!italia) return;
  const target = findNode(targetNodeName, 'codice', italia.id);
  if (!target) return;

  for (const section of dataObj.structure) {
    await processSection(section, target.id);
  }
}

function _renderNormeView() {
  const panel = document.getElementById('normeView');
  const isCreator = appMode === 'creator';
  const hasSel = !!_normeState.selectedNodeId;
  const selNode = hasSel ? _normeState.allNodi.find(n => n.id === _normeState.selectedNodeId) : null;
  let canDelete = false;
  if (isCreator && selNode) {
    const children = _normeState.allNodi.filter(n => n.id_padre === selNode.id);
    canDelete = children.length === 0;
  }
  let html = `<div class="archive-toolbar" data-testid="norme-toolbar">`;
  html += `<div class="archive-toolbar-left"></div>`;
  html += `<div class="archive-toolbar-right">`;
  const canAddNorme = isCreator;
  const canEditNorme = isCreator && hasSel;
  html += `<button class="btn btn-sm btn-toolbar-new${canAddNorme ? '' : ' btn-toolbar-disabled'}" onclick="_normeToolbarNuovo()" ${canAddNorme ? '' : 'disabled'} data-testid="button-norme-nuovo" title="${t('toolbarNuovoHintNorme')}"><span class="toolbar-icon">&#43;</span> ${t('toolbarNuovo')}</button>`;
  html += `<button class="btn btn-sm btn-toolbar-edit${canEditNorme ? '' : ' btn-toolbar-disabled'}" onclick="${canEditNorme ? '_editNormeNode(' + _normeState.selectedNodeId + ')' : ''}" ${canEditNorme ? '' : 'disabled'} data-testid="button-norme-modifica"><span class="toolbar-icon">&#9998;</span> ${t('toolbarModifica')}</button>`;
  html += `<button class="btn btn-sm btn-toolbar-delete${canDelete ? '' : ' btn-toolbar-disabled'}" onclick="${canDelete ? '_deleteNormeNode(' + _normeState.selectedNodeId + ')' : ''}" ${canDelete ? '' : 'disabled'} data-testid="button-norme-elimina"><span class="toolbar-icon">&#10005;</span> ${t('toolbarElimina')}</button>`;
  html += `<button class="btn btn-sm btn-toolbar-exit" onclick="goToDashboard()" data-testid="button-norme-esci"><span class="toolbar-icon">&#10140;</span> ${t('toolbarEsci')}</button>`;
  html += `</div></div>`;
  html += `<div class="norme-layout">`;
  html += `<div class="norme-sidebar">`;
  html += `<div class="norme-sidebar-header">`;
  html += `<span class="norme-sidebar-badge">${t('normeSidebarTitle')}</span>`;
  html += `</div>`;
  html += `<div class="norme-search"><input type="text" id="normeSearchInput" placeholder="${t('normeSearch')}" value="${esc(_normeState.searchQuery)}" oninput="_onNormeSearch(this.value)" data-testid="input-norme-search" /></div>`;
  html += `<div class="norme-tree" id="normeTree">`;
  if (_normeState.searchQuery) {
    const q = _normeState.searchQuery.toLowerCase();
    const matches = _normeState.allNodi.filter(n => (n.rubrica||'').toLowerCase().includes(q) || (n.rubrica_en||'').toLowerCase().includes(q) || (n.numero||'').toLowerCase().includes(q) || (n.testo_it||'').toLowerCase().includes(q) || (n.testo_en||'').toLowerCase().includes(q));
    if (matches.length === 0) {
      html += `<p class="hint">${t('normeNoResults')}</p>`;
    } else {
      matches.forEach(n => {
        const desc = (state.lang === 'en' && n.testo_en) ? n.testo_en : (n.testo_it || '');
        const descPreview = desc.length > 120 ? desc.substring(0, 120) + '…' : desc;
        const codeAbbr = _getNormeCodeAbbr(n, _normeState.allNodi);
        const sel = n.id === _normeState.selectedNodeId ? ' norme-node-selected' : '';
        html += `<div class="norme-search-result${sel}" onclick="_selectNormeNode(${n.id})" data-testid="norm-search-result-${n.id}">`;
        html += `<span class="norme-node-badge">${esc(n.badge || _normeNodeTypeLabel(n.tipo_nodo))}</span> `;
        if (codeAbbr) html += `<span class="norme-code-abbr">${esc(codeAbbr)}</span> `;
        html += `<strong>${esc(_nn(n))}</strong>`;
        if (descPreview) html += `<div class="norme-path-hint">${esc(descPreview)}</div>`;
        html += `</div>`;
      });
    }
  } else {
    const roots = _normeState.allNodi.filter(n => !n.id_padre);
    const sistemaOrder = { 'unione europea': 1, 'consiglio d\'europa': 2, 'organizzazione delle nazioni unite': 3, 'corte penale internazionale': 4, 'italia': 5 };
    roots.sort((a, b) => {
      const oa = sistemaOrder[(a.rubrica || '').toLowerCase()] || 3;
      const ob = sistemaOrder[(b.rubrica || '').toLowerCase()] || 3;
      return oa - ob;
    });
    roots.forEach(n => { html += _renderNormeTreeNode(n, 0, isCreator); });
    if (roots.length === 0) html += `<p class="hint">${t('normeNoNodes')}</p>`;
  }
  html += `</div></div>`;
  html += `<div class="norme-detail" id="normeDetail">`;
  if (_normeState.selectedNodeId) {
    html += _renderNormeDetail(_normeState.selectedNodeId);
  } else {
    html += `<div class="norme-empty"><p>${t('normeNoArticle')}</p></div>`;
  }
  html += `</div></div>`;
  panel.innerHTML = html;
}

function _renderNormeTreeNode(node, depth, isCreator) {
  const children = _normeState.allNodi.filter(n => n.id_padre === node.id);
  const hasChildren = children.length > 0;
  const isRoot = node.tipo_nodo === 'sistema';
  const isExpanded = _normeState.expandedNodes.has(node.id);
  const sel = node.id === _normeState.selectedNodeId ? ' norme-node-selected' : '';
  const inactive = node.vigente === false ? ' norme-node-inactive' : '';
  const rowClick = hasChildren ? `_toggleAndSelect(${node.id})` : `_selectNormeNode(${node.id})`;
  let html = `<div class="norme-tree-item${sel}${inactive}${isRoot ? ' norme-tree-sistema' : ''}" style="padding-left:${depth * 18 + 6}px" onclick="${rowClick}" data-testid="norm-tree-node-${node.id}">`;
  if (hasChildren) {
    html += `<span class="norme-toggle">${isExpanded ? '▼' : '▶'}</span>`;
  } else {
    html += `<span class="norme-toggle-placeholder"></span>`;
  }
  html += `<span class="norme-node-label">`;
  const _artLbl = _normeArticleLabel(node, _normeState.allNodi);
  if (_artLbl) {
    html += `<span class="norme-node-badge norme-badge-articolo">${esc(_normeNodeTypeLabel('articolo'))}</span> `;
    html += `${esc(_artLbl)}`;
  } else {
    html += `<span class="norme-node-badge norme-badge-${node.tipo_nodo || 'default'}">${esc(node.badge || _normeNodeTypeLabel(node.tipo_nodo))}</span> `;
    html += `${esc(node.numero ? node.numero + '. ' : '')}${esc(_nn(node))}`;
  }
  html += `</span>`;
  if (isCreator) {
    html += `<button class="btn btn-xs norme-btn-add" onclick="event.stopPropagation(); _addNormeChild(${node.id})" title="${t('normeAddChild')}">+</button>`;
  }
  html += `</div>`;
  if (isExpanded && hasChildren) {
    if (!isRoot) {
      children.sort((a, b) => (a.numero || '').localeCompare(b.numero || '', undefined, {numeric: true}));
    }
    children.forEach(c => { html += _renderNormeTreeNode(c, depth + 1, isCreator); });
  }
  return html;
}

function _getNormeCodeAbbr(node, allNodi) {
  const f = node.id_fonte;
  if (!f) return '';
  const FONTE_ABBR = {
    101: 'Cost.', 102: 'c.p.', 103: 'c.p.p.', 104: 'c.c.', 105: 'c.p.c.', 106: 'L.S.',
    201: 'TUE/TFUE', 202: 'Reg.UE', 203: 'Dir.UE', 204: 'CDFUE',
    301: 'CEDU', 302: 'Corte EDU', 303: 'Prot.CEDU',
    401: 'DUDU', 402: 'CAT', 403: 'ICCPR', 404: 'CED', 405: 'CDU', 406: 'ICESCR',
    501: 'CPI'
  };
  return FONTE_ABBR[f] || '';
}

function _nn(node) {
  if (!node) return '';
  return (currentLang === 'en' && node.rubrica_en) ? node.rubrica_en : (node.rubrica || '');
}

function _normeArticleLabel(node, allNodi) {
  if (node.tipo_nodo !== 'articolo' || !node.numero) return null;
  const abbr = _getNormeCodeAbbr(node, allNodi);
  return 'art. ' + node.numero + (abbr ? ' ' + abbr : '');
}

function _normeNodeTypeLabel(tipo) {
  const map = {
    sistema: t('normeTipoSistema'), stato: t('normeTipoStato'), organizzazione: t('normeTipoOrganizzazione'),
    codice: t('normeTipoCodice'), libro: t('normeTipoLibro'), titolo: t('normeTipoTitolo'),
    capo: t('normeTipoCapo'), sezione: t('normeTipoSezione'), articolo: t('normeTipoArticolo'),
    trattato: t('normeTipoTrattato'), convenzione: t('normeTipoConvenzione'),
    regolamento: t('normeTipoRegolamento'), direttiva: t('normeTipoDirettiva'),
    patto: t('normeTipoPatto'), statuto: t('normeTipoStatuto'), raccolta: t('normeTipoRaccolta'),
    parte: t('normeTipoParte'), legge_speciale: t('normeTipoLeggeSpeciale'),
    sentenza: t('normeTipoSentenza')
  };
  return map[tipo] || tipo || '?';
}

function _normeAmbitoLabel(ambito) {
  const map = { nazionale: t('normeAmbitoNazionale'), UE: t('normeAmbitoUE'), internazionale: t('normeAmbitoInternazionale') };
  return map[ambito] || ambito || '';
}

function _toggleNormeNode(id) {
  const node = _normeState.allNodi.find(n => n.id === id);
  if (_normeState.expandedNodes.has(id)) {
    _normeState.expandedNodes.delete(id);
  } else {
    if (node && node.tipo_nodo === 'sistema') {
      _normeState.allNodi.filter(n => n.tipo_nodo === 'sistema' && n.id !== id).forEach(n => _normeState.expandedNodes.delete(n.id));
    }
    _normeState.expandedNodes.add(id);
  }
  _renderNormeView();
}

function _toggleAndSelect(id) {
  _normeState.selectedNodeId = id;
  _toggleNormeNode(id);
}

function _selectNormeNode(id) {
  _normeState.selectedNodeId = id;
  const node = _normeState.allNodi.find(n => n.id === id);
  if (node) {
    let cur = node;
    while (cur && cur.id_padre) {
      _normeState.expandedNodes.add(cur.id_padre);
      cur = _normeState.allNodi.find(n => n.id === cur.id_padre);
    }
  }
  _renderNormeView();
}

function _onNormeSearch(val) {
  _normeState.searchQuery = val;
  _renderNormeView();
  const inp = document.getElementById('normeSearchInput');
  if (inp) { inp.focus(); inp.setSelectionRange(val.length, val.length); }
}

function _normeToolbarNuovo() {
  if (_normeState.selectedNodeId) {
    _addNormeChild(_normeState.selectedNodeId);
  } else {
    _addNormeRoot();
  }
}

async function _addNormeRoot() {
  _showNormeNodeForm(null);
}

async function _addNormeChild(parentId) {
  _showNormeNodeForm(parentId);
}

function _showNormeNodeForm(parentId, editNode) {
  const isEdit = !!editNode;
  const node = editNode || {};
  const panel = document.getElementById('normeDetail');
  const tipoOptions = ['sistema','stato','organizzazione','codice','libro','titolo','capo','sezione','articolo','trattato','convenzione','regolamento','direttiva','patto','statuto','legge_speciale','sentenza'];
  let html = `<div class="norme-form">`;
  html += `<h3>${isEdit ? t('normeEditNode') : (parentId ? t('normeAddChild') : t('normeAddRoot'))}</h3>`;
  html += `<div class="form-row"><label>${t('normeNodeName')}</label><input type="text" id="nfName" value="${esc(node.rubrica || '')}" data-testid="input-norm-name" /></div>`;
  if (!isEdit) {
    html += `<div class="form-row"><label>${t('normeNodeType')}</label><select id="nfType" data-testid="select-norm-type">`;
    tipoOptions.forEach(o => { html += `<option value="${o}" ${node.tipo_nodo === o ? 'selected' : ''}>${_normeNodeTypeLabel(o)}</option>`; });
    html += `</select></div>`;
  } else {
    html += `<input type="hidden" id="nfType" value="${esc(node.tipo_nodo || 'articolo')}" />`;
  }
  html += `<div class="form-row-inline three-cols">`;
  html += `<div class="form-row"><label>${t('normeNodeStartDate')}</label><input type="date" id="nfStartDate" value="${esc(node.data_inizio_vigenza || '')}" data-testid="input-norm-start-date" /></div>`;
  html += `<div class="form-row"><label>${t('normeNodeEndDate')}</label><input type="date" id="nfEndDate" value="${esc(node.data_fine_vigenza || '')}" data-testid="input-norm-end-date" /></div>`;
  html += `<div class="form-row"><label><input type="checkbox" id="nfActive" ${node.vigente !== false ? 'checked' : ''} data-testid="check-norm-active" /> ${t('normeNodeActive')}</label></div>`;
  html += `</div>`;
  html += `<div class="form-row"><label>${t('normeNodeTextIt')}</label><textarea id="nfTextIt" rows="6" data-testid="input-norm-text-it">${esc(node.testo_it || '')}</textarea></div>`;
  html += `<div class="form-row"><label>${t('normeNodeTextEn')}</label><textarea id="nfTextEn" rows="6" data-testid="input-norm-text-en">${esc(node.testo_en || '')}</textarea></div>`;
  html += `<div class="form-actions">`;
  html += `<button class="btn btn-primary" onclick="_saveNormeNode(${parentId || 'null'}, ${isEdit ? node.id : 'null'})" data-testid="button-save-norm">${t('normeSave')}</button>`;
  html += `<button class="btn btn-secondary" onclick="_selectNormeNode(${_normeState.selectedNodeId || 0})" data-testid="button-cancel-norm">${t('normeCancel')}</button>`;
  html += `</div>`;
  if (isEdit && node.tipo_nodo === 'articolo') {
    html += `<div class="norme-article-sections" id="normeArticleSections"></div>`;
  }
  html += `</div>`;
  panel.innerHTML = html;
  if (isEdit && node.tipo_nodo === 'articolo') {
    setTimeout(() => _renderNormeArticleSections(node, true), 0);
  }
}

async function _saveNormeNode(parentId, editId) {
  const data = {
    rubrica: document.getElementById('nfName').value.trim(),
    tipo_nodo: document.getElementById('nfType').value,
    data_inizio_vigenza: document.getElementById('nfStartDate').value || '',
    data_fine_vigenza: document.getElementById('nfEndDate').value || '',
    vigente: document.getElementById('nfActive').checked,
    testo_it: document.getElementById('nfTextIt').value.trim(),
    testo_en: document.getElementById('nfTextEn').value.trim()
  };
  if (!data.rubrica) return;
  if (parentId) data.id_padre = parentId;
  if (editId) {
    await NormDB.updateNodo(editId, data);
    _normeState.selectedNodeId = editId;
  } else {
    const newId = await NormDB.addNodo(data);
    _normeState.selectedNodeId = newId;
    if (parentId) _normeState.expandedNodes.add(parentId);
  }
  _normeState.allNodi = await NormDB.getAllNodi();
  scheduleSaveToFS();
  _renderNormeView();
}

async function _deleteNormeNode(id) {
  if (!confirm(t('normeDeleteConfirm'))) return;
  await NormDB.deleteNodo(id);
  if (_normeState.selectedNodeId === id) _normeState.selectedNodeId = null;
  _normeState.allNodi = await NormDB.getAllNodi();
  scheduleSaveToFS();
  _renderNormeView();
}

function _renderNormeDetail(nodeId) {
  const node = _normeState.allNodi.find(n => n.id === nodeId);
  if (!node) return `<div class="norme-empty"><p>${t('normeNoArticle')}</p></div>`;
  const isCreator = appMode === 'creator';
  const path = NormDB.buildNodoPath(node, _normeState.allNodi, currentLang);
  let html = `<div class="norme-detail-content">`;
  html += `<div class="norme-detail-header">`;
  html += `<div class="norme-path-breadcrumb">${esc(path)}</div>`;
  const _detailArtLbl = _normeArticleLabel(node, _normeState.allNodi);
  if (_detailArtLbl) {
    html += `<h2><span class="norme-node-badge norme-badge-articolo">${esc(_normeNodeTypeLabel('articolo'))}</span> ${esc(_detailArtLbl)}</h2>`;
  } else {
    html += `<h2><span class="norme-node-badge norme-badge-${node.tipo_nodo || 'default'}">${esc(node.badge || _normeNodeTypeLabel(node.tipo_nodo))}</span> ${esc(node.numero ? node.numero + '. ' : '')}${esc(_nn(node))}</h2>`;
  }
  html += `<div class="norme-meta-row">`;
  if (node.data_inizio_vigenza) html += `<span class="norme-meta-tag">${t('normeNodeStartDate')}: ${esc(node.data_inizio_vigenza)}</span>`;
  if (node.vigente === false) html += `<span class="norme-meta-tag norme-tag-inactive">${t('normeInactive')}</span>`;
  html += `</div>`;
  html += `</div>`;
  const txtIt = node.testo_it || node.descrizioneIt || '';
  const txtEn = node.testo_en || node.descrizione_en || '';
  html += `<div class="norme-text-block">`;
  html += `<div class="norme-text-section">`;
  html += `<div class="norme-text-header"><span class="norme-text-lang-label">IT</span>`;
  if (isCreator) {
    html += txtIt
      ? ` <button class="btn btn-xs btn-secondary" onclick="_editNormeNode(${node.id})" data-testid="button-edit-text-it">${t('normeModifica')}</button>`
      : ` <button class="btn btn-xs btn-primary" onclick="_editNormeNode(${node.id})" data-testid="button-add-text-it">${t('normeAggiungi')}</button>`;
  }
  html += `</div>`;
  html += txtIt ? `<pre>${esc(txtIt)}</pre>` : `<p class="hint">${t('normeNoText')}</p>`;
  html += `</div>`;
  html += `<div class="norme-text-section">`;
  html += `<div class="norme-text-header"><span class="norme-text-lang-label norme-text-alt">EN</span>`;
  if (isCreator) {
    html += txtEn
      ? ` <button class="btn btn-xs btn-secondary" onclick="_editNormeNode(${node.id})" data-testid="button-edit-text-en">${t('normeModifica')}</button>`
      : ` <button class="btn btn-xs btn-primary" onclick="_editNormeNode(${node.id})" data-testid="button-add-text-en">${t('normeAggiungi')}</button>`;
  }
  html += `</div>`;
  html += txtEn ? `<pre>${esc(txtEn)}</pre>` : `<p class="hint">${t('normeNoText')}</p>`;
  html += `</div>`;
  html += `</div>`;
  if (node.tipo_nodo === 'sentenza') {
    html += `<div class="norme-linked-refs" id="normeLinkedRefs"></div>`;
    setTimeout(() => _renderSentenzaLinkedArticles(node.id), 0);
  }
  if (node.tipo_nodo === 'articolo') {
    html += `<div class="norme-article-sections" id="normeArticleSections"></div>`;
    setTimeout(() => _renderNormeArticleSections(node), 0);
    const isCeduArticle = _isUnderCedu(node);
    if (isCeduArticle) {
      html += `<div class="norme-linked-refs" id="normeLinkedSentenze"></div>`;
      setTimeout(() => _renderArticleLinkedSentenze(node.id), 0);
    }
  }
  html += `</div>`;
  return html;
}

function _isUnderCedu(node) {
  let current = node;
  while (current) {
    if (current.tipo_nodo === 'organizzazione' && (current.rubrica === 'CEDU' || (current.rubrica || '').indexOf('CEDU') >= 0 || (current.rubrica || '').indexOf('Convenzione Europea') >= 0 || (current.rubrica || '').indexOf('Corte Europea') >= 0 || current.badge === 'CEDU')) return true;
    current = current.id_padre ? _normeState.allNodi.find(n => n.id === current.id_padre) : null;
  }
  return false;
}

function _getArticleCodeType(node) {
  const fonteId = node.id_fonte;
  if (fonteId) {
    if (fonteId === 101) return 'COST';
    if (fonteId === 102) return 'CP';
    if (fonteId === 103) return 'CPP';
    if (fonteId === 104) return 'CC';
    if (fonteId === 105) return 'CPC';
    if (fonteId === 106) return 'OTHER_CODE';
    if (fonteId >= 200 && fonteId < 300) return 'UE';
    if (fonteId >= 300 && fonteId < 400) return 'CEDU';
    if (fonteId >= 400 && fonteId < 500) return 'ONU';
    if (fonteId >= 500 && fonteId < 600) return 'CPI';
  }
  let cur = node;
  while (cur && cur.id_padre) {
    cur = _normeState.allNodi.find(n => n.id === cur.id_padre);
    if (!cur) break;
    if (cur.id_fonte) return _getArticleCodeType(cur);
    const rub = (cur.rubrica || '').toLowerCase();
    if (cur.tipo_nodo === 'codice' || cur.tipo_nodo === 'stato' || cur.tipo_nodo === 'organizzazione') {
      if (rub.includes('codice penale') && !rub.includes('procedura')) return 'CP';
      if (rub.includes('procedura penale')) return 'CPP';
      if (rub.includes('codice civile') && !rub.includes('procedura')) return 'CC';
      if (rub.includes('procedura civile')) return 'CPC';
      if (rub.includes('costituzione')) return 'COST';
    }
  }
  return 'UNKNOWN';
}

function _getLinkedNodes(collegamenti, nodeId, filterFn) {
  const results = [];
  const seen = new Set();
  for (const link of collegamenti.asOrigin) {
    const otherId = link.id_norma_destinazione;
    if (seen.has(otherId)) continue;
    const otherNode = _normeState.allNodi.find(n => n.id === otherId);
    if (otherNode && filterFn(otherNode)) { seen.add(otherId); results.push(otherNode); }
  }
  for (const link of collegamenti.asDest) {
    const otherId = link.id_norma_origine;
    if (seen.has(otherId)) continue;
    const otherNode = _normeState.allNodi.find(n => n.id === otherId);
    if (otherNode && filterFn(otherNode)) { seen.add(otherId); results.push(otherNode); }
  }
  return results;
}

async function _renderSentenzaLinkedArticles(nodeId) {
  const container = document.getElementById('normeLinkedRefs');
  if (!container) return;
  const collegamenti = await NormDB.getCollegamenti(nodeId);
  const articles = _getLinkedNodes(collegamenti, nodeId, n => n.tipo_nodo === 'articolo');
  if (articles.length === 0) { container.innerHTML = ''; return; }
  let html = `<div class="norme-linked-section">`;
  html += `<h3 class="norme-linked-title">${t('normeArticoliRiferimento')}</h3>`;
  html += `<div class="norme-linked-cards">`;
  for (const artNode of articles) {
    const artLabel = _normeArticleLabel(artNode, _normeState.allNodi) || _nn(artNode);
    const path = NormDB.buildNodoPath(artNode, _normeState.allNodi, currentLang);
    html += `<a href="#" class="norme-linked-card" onclick="event.preventDefault(); _selectNormeNode(${artNode.id})" data-testid="link-article-${artNode.id}">`;
    html += `<span class="norme-node-badge norme-badge-articolo">${esc(_normeNodeTypeLabel('articolo'))}</span>`;
    html += `<span class="norme-linked-label">${esc(artLabel)}</span>`;
    html += `<span class="norme-linked-path">${esc(path)}</span>`;
    html += `</a>`;
  }
  html += `</div></div>`;
  container.innerHTML = html;
}

async function _renderArticleLinkedSentenze(nodeId) {
  const container = document.getElementById('normeLinkedSentenze');
  if (!container) return;
  const collegamenti = await NormDB.getCollegamenti(nodeId);
  const sentenze = _getLinkedNodes(collegamenti, nodeId, n => n.tipo_nodo === 'sentenza');
  if (sentenze.length === 0) { container.innerHTML = ''; return; }
  let html = `<div class="norme-linked-section">`;
  html += `<h3 class="norme-linked-title">${t('normeSentenzeCollegate')}</h3>`;
  html += `<div class="norme-linked-cards">`;
  for (const sNode of sentenze) {
    html += `<a href="#" class="norme-linked-card" onclick="event.preventDefault(); _selectNormeNode(${sNode.id})" data-testid="link-sentenza-${sNode.id}">`;
    html += `<span class="norme-node-badge norme-badge-sentenza">${esc(_normeNodeTypeLabel('sentenza'))}</span>`;
    html += `<span class="norme-linked-label">${esc(_nn(sNode))}</span>`;
    if (sNode.numero) html += `<span class="norme-linked-appno">${t('normeNumeroRicorso')}: ${esc(sNode.numero)}</span>`;
    html += `</a>`;
  }
  html += `</div></div>`;
  container.innerHTML = html;
}

function _editNormeNode(id) {
  const node = _normeState.allNodi.find(n => n.id === id);
  if (node) _showNormeNodeForm(node.id_padre || null, node);
}

async function _renderNormeArticleSections(node, editMode) {
  const container = document.getElementById('normeArticleSections');
  if (!container) return;
  const isCreator = appMode === 'creator';
  const isEdit = !!editMode;
  const nodeId = node.id;
  const codeType = _getArticleCodeType(node);
  const isPenale = (codeType === 'CP' || codeType === 'CPP');
  const isCivile = (codeType === 'CC' || codeType === 'CPC');
  const isConstitution = (codeType === 'COST');
  const isInternational = (codeType === 'CEDU' || codeType === 'ONU' || codeType === 'CPI' || codeType === 'UE' || isConstitution);
  let html = '';

  const showPenale = isPenale || (!isCivile && !isInternational && (await NormDB.getMetadatiPenali(nodeId)));
  const showCivile = isCivile || (!isPenale && !isInternational && (await NormDB.getMetadatiCivili(nodeId)));
  const showInt = isInternational || (!isPenale && !isCivile && (await NormDB.getMetadatiInternazionali(nodeId)));

  if (showPenale || (isCreator && isEdit && (isPenale || codeType === 'UNKNOWN' || codeType === 'OTHER_CODE'))) {
    html += `<div class="norme-inline-block"><h4>${t('normeTabPenale')}</h4>${await _renderNormePenaleTab(nodeId, isCreator, isEdit)}</div>`;
    const hasPenale = await NormDB.getMetadatiPenali(nodeId);
    if (hasPenale) {
      html += `<div class="norme-inline-block"><h4>${t('normeTabCalcoli')}</h4>${await _renderNormeCalcoliTab(nodeId)}</div>`;
    }
    const elemHeader = isEdit
      ? `<h4 class="norme-section-header">${t('normeTabElementi')} <button class="btn btn-xs btn-primary" onclick="_openAddElementoModal(${nodeId})" data-testid="button-add-elemento">+</button></h4>`
      : `<h4>${t('normeTabElementi')}</h4>`;
    html += `<div class="norme-inline-block">${elemHeader}${await _renderNormeElementiTab(nodeId, isCreator, isEdit)}</div>`;
  }

  if (showCivile || (isCreator && isEdit && (isCivile || codeType === 'UNKNOWN' || codeType === 'OTHER_CODE'))) {
    html += `<div class="norme-inline-block"><h4>${t('normeTabCivile')}</h4>${await _renderNormeCivileTab(nodeId, isCreator, isEdit)}</div>`;
  }

  if (showInt || (isCreator && isEdit && (isInternational || codeType === 'UNKNOWN' || codeType === 'OTHER_CODE'))) {
    html += `<div class="norme-inline-block"><h4>${t('normeTabInternazionale')}</h4>${await _renderNormeInternazionaleTab(nodeId, isCreator, isEdit)}</div>`;
  }

  const collHeader = isEdit
    ? `<h4 class="norme-section-header">${t('normeTabCollegamenti')} <button class="btn btn-xs btn-primary" onclick="_openAddCollegamentoModal(${nodeId})" data-testid="button-add-collegamento">+</button></h4>`
    : `<h4>${t('normeTabCollegamenti')}</h4>`;
  html += `<div class="norme-inline-block">${collHeader}${await _renderNormeCollegamentiTab(nodeId, isCreator, isEdit)}</div>`;

  container.innerHTML = html;
}

function _toggleNormeSection(headerEl) {
  const section = headerEl.parentElement;
  section.classList.toggle('open');
}

function _reloadNormeArticleSections(nodeId) {
  const node = _normeState.allNodi.find(n => n.id === nodeId);
  if (!node) return;
  const inEditForm = !!document.querySelector('.norme-form');
  _renderNormeArticleSections(node, inEditForm);
}

async function _renderNormePenaleTab(nodeId, isCreator, editMode) {
  const meta = await NormDB.getMetadatiPenali(nodeId);
  if (!meta) {
    if (!editMode) return `<p class="hint">${t('normeNoPenalData')}</p>`;
    return `<p class="hint">${t('normeNoPenalData')}</p><button class="btn btn-xs btn-primary" onclick="_initPenaleMetadata(${nodeId})">+ ${t('normeTabPenale')}</button>`;
  }
  if (!editMode) {
    const catDelittoVal = (state.lang === 'en' && meta.categoria_delitto_en) ? meta.categoria_delitto_en : (meta.categoria_delitto || '');
    const qualificaVal = (state.lang === 'en' && meta.qualifica_richiesta_en) ? meta.qualifica_richiesta_en : (meta.qualifica_richiesta || '');
    const procLabels = { ufficio: t('normeProcUfficio'), querela: t('normeProcQuerela'), richiesta: t('normeProcRichiesta') };
    let html = `<div class="norme-metadata-view">`;
    html += `<div class="norme-meta-field-inline four-cols">`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeDelitto')} / ${t('normeContravvenzione')}:</span> <span class="norme-meta-value">${meta.tipo_reato === 'delitto' ? t('normeDelitto') : t('normeContravvenzione')}</span></div>`;
    if (catDelittoVal) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeCategoriaDelitto')}:</span> <span class="norme-meta-value">${esc(catDelittoVal)}</span></div>`;
    html += `</div>`;
    html += `<div class="norme-meta-field-inline four-cols">`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normePenaMinAnni')}:</span> <span class="norme-meta-value">${meta.pena_min_anni || '—'}</span></div>`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normePenaMaxAnni')}:</span> <span class="norme-meta-value">${meta.pena_max_anni || '—'}</span></div>`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeMultaMin')}:</span> <span class="norme-meta-value">${meta.multa_min ? '€' + meta.multa_min : '—'}</span></div>`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeMultaMax')}:</span> <span class="norme-meta-value">${meta.multa_max ? '€' + meta.multa_max : '—'}</span></div>`;
    html += `</div>`;
    if (meta.art_407_cpp) html += `<div class="norme-meta-field"><span class="norme-meta-tag norme-tag-active">${t('normeFlagArt407')}</span></div>`;
    html += `<div class="norme-meta-field-inline four-cols">`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeProcedibilita')}:</span> <span class="norme-meta-value">${procLabels[meta.procedibilita] || meta.procedibilita}</span></div>`;
    const flags = [];
    if (meta.reato_proprio) flags.push(`<span class="norme-meta-tag">${esc(t('normeReatoProprio'))}</span>`);
    if (meta.reato_omissivo) flags.push(`<span class="norme-meta-tag">${esc(t('normeReatoOmissivo'))}</span>`);
    if (meta.reato_permanente) flags.push(`<span class="norme-meta-tag">${esc(t('normeReatoPermanente'))}</span>`);
    if (flags.length) html += `<div class="norme-meta-field">${flags.join(' ')}</div>`;
    if (qualificaVal) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeQualificaRichiesta')}:</span> <span class="norme-meta-value">${esc(qualificaVal)}</span></div>`;
    html += `</div>`;
    html += `</div>`;
    return html;
  }
  let html = `<div class="norme-metadata-form">`;
  html += `<div class="form-row-inline four-cols">`;
  html += `<div class="form-row"><label>${t('normeDelitto')} / ${t('normeContravvenzione')}</label>`;
  html += `<select id="nmDelittoContr">`;
  html += `<option value="delitto" ${meta.tipo_reato === 'delitto' ? 'selected' : ''}>${t('normeDelitto')}</option>`;
  html += `<option value="contravvenzione" ${meta.tipo_reato === 'contravvenzione' ? 'selected' : ''}>${t('normeContravvenzione')}</option>`;
  html += `</select></div>`;
  const catDelittoVal = (state.lang === 'en' && meta.categoria_delitto_en) ? meta.categoria_delitto_en : (meta.categoria_delitto || '');
  html += `<div class="form-row"><label>${t('normeCategoriaDelitto')}</label><input type="text" id="nmCatDelitto" value="${esc(catDelittoVal)}" /></div>`;
  html += `</div>`;
  html += `<div class="form-row-inline four-cols">`;
  html += `<div class="form-row"><label>${t('normePenaMinAnni')}</label><input type="number" step="0.5" id="nmPenaMin" value="${meta.pena_min_anni || ''}" /></div>`;
  html += `<div class="form-row"><label>${t('normePenaMaxAnni')}</label><input type="number" step="0.5" id="nmPenaMax" value="${meta.pena_max_anni || ''}" /></div>`;
  html += `<div class="form-row"><label>${t('normeMultaMin')}</label><input type="number" id="nmMultaMin" value="${meta.multa_min || ''}" /></div>`;
  html += `<div class="form-row"><label>${t('normeMultaMax')}</label><input type="number" id="nmMultaMax" value="${meta.multa_max || ''}" /></div>`;
  html += `</div>`;
  html += `<div class="form-row"><label><input type="checkbox" id="nmArt407" ${meta.art_407_cpp ? 'checked' : ''} /> ${t('normeFlagArt407')}</label></div>`;
  html += `<div class="form-row-inline four-cols">`;
  html += `<div class="form-row"><label>${t('normeProcedibilita')}</label>`;
  html += `<select id="nmProcedibilita">`;
  html += `<option value="ufficio" ${meta.procedibilita === 'ufficio' ? 'selected' : ''}>${t('normeProcUfficio')}</option>`;
  html += `<option value="querela" ${meta.procedibilita === 'querela' ? 'selected' : ''}>${t('normeProcQuerela')}</option>`;
  html += `<option value="richiesta" ${meta.procedibilita === 'richiesta' ? 'selected' : ''}>${t('normeProcRichiesta')}</option>`;
  html += `</select></div>`;
  html += `<div class="form-row"><label><input type="checkbox" id="nmReatoProprio" ${meta.reato_proprio ? 'checked' : ''} /> ${t('normeReatoProprio')}</label></div>`;
  const qualificaVal = (state.lang === 'en' && meta.qualifica_richiesta_en) ? meta.qualifica_richiesta_en : (meta.qualifica_richiesta || '');
  html += `<div class="form-row"><label>${t('normeQualificaRichiesta')}</label><input type="text" id="nmQualifica" value="${esc(qualificaVal)}" /></div>`;
  html += `<div class="form-row"><label><input type="checkbox" id="nmOmissivo" ${meta.reato_omissivo ? 'checked' : ''} /> ${t('normeReatoOmissivo')}</label></div>`;
  html += `<div class="form-row"><label><input type="checkbox" id="nmPermanente" ${meta.reato_permanente ? 'checked' : ''} /> ${t('normeReatoPermanente')}</label></div>`;
  html += `</div>`;
  html += `<div class="form-actions"><button class="btn btn-primary" onclick="_savePenaleMetadata(${nodeId})">${t('normeSave')}</button></div>`;
  html += `</div>`;
  return html;
}

async function _initPenaleMetadata(nodeId) {
  await NormDB.setMetadatiPenali(nodeId, {
    tipo_reato: 'delitto', categoria_delitto: '', pena_min_anni: 0, pena_max_anni: 0,
    multa_min: 0, multa_max: 0, art_407_cpp: false, procedibilita: 'ufficio',
    reato_proprio: false, qualifica_richiesta: '', reato_omissivo: false, reato_permanente: false
  });
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _savePenaleMetadata(nodeId) {
  const existing = await NormDB.getMetadatiPenali(nodeId);
  const catInput = document.getElementById('nmCatDelitto').value.trim();
  const qualInput = document.getElementById('nmQualifica').value.trim();
  const data = {
    tipo_reato: document.getElementById('nmDelittoContr').value,
    categoria_delitto: (state.lang === 'en') ? (existing?.categoria_delitto || '') : catInput,
    categoria_delitto_en: (state.lang === 'en') ? catInput : (existing?.categoria_delitto_en || ''),
    pena_min_anni: parseFloat(document.getElementById('nmPenaMin').value) || 0,
    pena_max_anni: parseFloat(document.getElementById('nmPenaMax').value) || 0,
    multa_min: parseFloat(document.getElementById('nmMultaMin').value) || 0,
    multa_max: parseFloat(document.getElementById('nmMultaMax').value) || 0,
    art_407_cpp: document.getElementById('nmArt407').checked,
    procedibilita: document.getElementById('nmProcedibilita').value,
    reato_proprio: document.getElementById('nmReatoProprio').checked,
    qualifica_richiesta: (state.lang === 'en') ? (existing?.qualifica_richiesta || '') : qualInput,
    qualifica_richiesta_en: (state.lang === 'en') ? qualInput : (existing?.qualifica_richiesta_en || ''),
    reato_omissivo: document.getElementById('nmOmissivo').checked,
    reato_permanente: document.getElementById('nmPermanente').checked
  };
  await NormDB.setMetadatiPenali(nodeId, data);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _deletePenaleMetadata(nodeId) {
  await NormDB.deleteMetadatiPenali(nodeId);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _renderNormeCivileTab(nodeId, isCreator, editMode) {
  const meta = await NormDB.getMetadatiCivili(nodeId);
  if (!meta) {
    if (!editMode) return `<p class="hint">${t('normeNoCivilData')}</p>`;
    return `<p class="hint">${t('normeNoCivilData')}</p><button class="btn btn-xs btn-primary" onclick="_initCivileMetadata(${nodeId})">+ ${t('normeTabCivile')}</button>`;
  }
  if (!editMode) {
    const respLabels = { contrattuale: t('normeRespContrattuale'), extracontrattuale: t('normeRespExtracontrattuale') };
    let html = `<div class="norme-metadata-view">`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeTipoResp')}:</span> <span class="norme-meta-value">${respLabels[meta.tipo_responsabilita] || meta.tipo_responsabilita}</span></div>`;
    html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normePrescrAnni')}:</span> <span class="norme-meta-value">${meta.prescrizione_anni || '—'}</span></div>`;
    if (meta.decadenza) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeDecadenza')}:</span> <span class="norme-meta-value">${esc(meta.decadenza)}</span></div>`;
    if (meta.risarcibilita) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeRisarcibilita')}:</span> <span class="norme-meta-value">${esc(meta.risarcibilita)}</span></div>`;
    if (meta.nullita) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeNullita')}:</span> <span class="norme-meta-value">${esc(meta.nullita)}</span></div>`;
    html += `</div>`;
    return html;
  }
  let html = `<div class="norme-metadata-form">`;
  html += `<div class="form-row"><label>${t('normeTipoResp')}</label>`;
  html += `<select id="nmTipoResp">`;
  html += `<option value="contrattuale" ${meta.tipo_responsabilita === 'contrattuale' ? 'selected' : ''}>${t('normeRespContrattuale')}</option>`;
  html += `<option value="extracontrattuale" ${meta.tipo_responsabilita === 'extracontrattuale' ? 'selected' : ''}>${t('normeRespExtracontrattuale')}</option>`;
  html += `</select></div>`;
  html += `<div class="form-row"><label>${t('normePrescrAnni')}</label><input type="number" id="nmPrescrAnni" value="${meta.prescrizione_anni || ''}" /></div>`;
  html += `<div class="form-row"><label>${t('normeDecadenza')}</label><input type="text" id="nmDecadenza" value="${esc(meta.decadenza || '')}" /></div>`;
  html += `<div class="form-row"><label>${t('normeRisarcibilita')}</label><input type="text" id="nmRisarcibilita" value="${esc(meta.risarcibilita || '')}" /></div>`;
  html += `<div class="form-row"><label>${t('normeNullita')}</label><input type="text" id="nmNullita" value="${esc(meta.nullita || '')}" /></div>`;
  html += `<div class="form-actions"><button class="btn btn-primary" onclick="_saveCivileMetadata(${nodeId})">${t('normeSave')}</button></div>`;
  html += `</div>`;
  return html;
}

async function _initCivileMetadata(nodeId) {
  await NormDB.setMetadatiCivili(nodeId, { tipo_responsabilita: 'contrattuale', prescrizione_anni: 0, decadenza: '', risarcibilita: '', nullita: '' });
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _saveCivileMetadata(nodeId) {
  await NormDB.setMetadatiCivili(nodeId, {
    tipo_responsabilita: document.getElementById('nmTipoResp').value,
    prescrizione_anni: parseInt(document.getElementById('nmPrescrAnni').value) || 0,
    decadenza: document.getElementById('nmDecadenza').value.trim(),
    risarcibilita: document.getElementById('nmRisarcibilita').value.trim(),
    nullita: document.getElementById('nmNullita').value.trim()
  });
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _deleteCivileMetadata(nodeId) {
  await NormDB.deleteMetadatiCivili(nodeId);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _renderNormeInternazionaleTab(nodeId, isCreator, editMode) {
  const meta = await NormDB.getMetadatiInternazionali(nodeId);
  if (!meta) {
    if (!editMode) return `<p class="hint">${t('normeNoIntData')}</p>`;
    return `<p class="hint">${t('normeNoIntData')}</p><button class="btn btn-xs btn-primary" onclick="_initIntMetadata(${nodeId})">+ ${t('normeTabInternazionale')}</button>`;
  }
  if (!editMode) {
    let html = `<div class="norme-metadata-view">`;
    if (meta.tipo_crimine) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeIntTipoViolazione')}:</span> <span class="norme-meta-value">${esc(meta.tipo_crimine)}</span></div>`;
    if (meta.imprescrittibile) html += `<div class="norme-meta-field"><span class="norme-meta-tag norme-tag-active">${t('normeIntImprescrittibile')}</span></div>`;
    if (meta.competenza) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeIntGiurisdizione')}:</span> <span class="norme-meta-value">${esc(meta.competenza)}</span></div>`;
    if (meta.obbligo_statale) html += `<div class="norme-meta-field"><span class="norme-meta-label">${t('normeIntObbligoStatale')}:</span> <span class="norme-meta-value">${esc(meta.obbligo_statale)}</span></div>`;
    html += `</div>`;
    return html;
  }
  let html = `<div class="norme-metadata-form">`;
  html += `<div class="form-row"><label>${t('normeIntTipoViolazione')}</label><input type="text" id="nmIntTipoViol" value="${esc(meta.tipo_crimine || '')}" /></div>`;
  html += `<div class="form-row"><label><input type="checkbox" id="nmIntImpr" ${meta.imprescrittibile ? 'checked' : ''} /> ${t('normeIntImprescrittibile')}</label></div>`;
  html += `<div class="form-row"><label>${t('normeIntGiurisdizione')}</label><input type="text" id="nmIntGiurisd" value="${esc(meta.competenza || '')}" /></div>`;
  html += `<div class="form-row"><label>${t('normeIntObbligoStatale')}</label><input type="text" id="nmIntObbligo" value="${esc(meta.obbligo_statale || '')}" /></div>`;
  html += `<div class="form-actions"><button class="btn btn-primary" onclick="_saveIntMetadata(${nodeId})">${t('normeSave')}</button></div>`;
  html += `</div>`;
  return html;
}

async function _initIntMetadata(nodeId) {
  await NormDB.setMetadatiInternazionali(nodeId, { tipo_crimine: '', imprescrittibile: false, competenza: '', obbligo_statale: '' });
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _saveIntMetadata(nodeId) {
  await NormDB.setMetadatiInternazionali(nodeId, {
    tipo_crimine: document.getElementById('nmIntTipoViol').value.trim(),
    imprescrittibile: document.getElementById('nmIntImpr').checked,
    competenza: document.getElementById('nmIntGiurisd').value.trim(),
    obbligo_statale: document.getElementById('nmIntObbligo').value.trim()
  });
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _deleteIntMetadata(nodeId) {
  await NormDB.deleteMetadatiInternazionali(nodeId);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _renderNormeElementiTab(nodeId, isCreator, editMode) {
  const elementi = await NormDB.getElementiReato(nodeId);
  const categorie = ['soggetto','condotta','evento','dolo','colpa','nesso','qualifica','condizione_punibilita'];
  const catLabels = {
    soggetto: t('normeCatSoggetto'), condotta: t('normeCatCondotta'), evento: t('normeCatEvento'), dolo: t('normeCatDolo'),
    colpa: t('normeCatColpa'), nesso: t('normeCatNesso'), qualifica: t('normeCatQualifica'),
    condizione_punibilita: t('normeCatCondizionePunibilita')
  };
  const catOrder = {};
  categorie.forEach((c, i) => { catOrder[c] = i; });
  const sortedElementi = [...elementi].sort((a, b) => (catOrder[a.categoria] ?? 99) - (catOrder[b.categoria] ?? 99));
  let html = `<div class="norme-elementi-list">`;
  if (sortedElementi.length === 0) {
    html += `<p class="hint">${t('normeNoElements')}</p>`;
  }
  sortedElementi.forEach(el => {
    html += `<div class="norme-elemento-card">`;
    html += `<div class="norme-elemento-header"><span class="norme-node-badge">${esc(catLabels[el.categoria] || el.categoria)}</span>`;
    if (el.obbligatorio) html += ` <span class="norme-tag-required">*</span>`;
    if (editMode) html += `<button class="btn btn-xs btn-danger" onclick="_deleteElemento(${el.id}, ${nodeId})">×</button>`;
    html += `</div>`;
    const elDesc = (state.lang === 'en' && el.descrizione_en) ? el.descrizione_en : (el.descrizione || '');
    html += `<p>${esc(elDesc)}</p>`;
    html += `<div class="norme-elemento-meta">`;
    html += `<span>${t('normeElementoOnereProva')}: ${el.onere_prova === 'PM' ? t('normeOnerePM') : t('normeOnerePrivato')}</span>`;
    if (el.tipo_prova_tipica) html += ` | <span>${t('normeElementoTipoProva')}: ${esc(el.tipo_prova_tipica)}</span>`;
    html += `</div></div>`;
  });
  html += `</div>`;
  return html;
}

function _openAddElementoModal(nodeId) {
  const categorie = ['soggetto','condotta','evento','dolo','colpa','nesso','qualifica','condizione_punibilita'];
  const catLabels = {
    soggetto: t('normeCatSoggetto'), condotta: t('normeCatCondotta'), evento: t('normeCatEvento'), dolo: t('normeCatDolo'),
    colpa: t('normeCatColpa'), nesso: t('normeCatNesso'), qualifica: t('normeCatQualifica'),
    condizione_punibilita: t('normeCatCondizionePunibilita')
  };
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('normeAddElemento')}</h3>
      <div class="form-row"><label>${t('normeElementoCategoria')}</label><select id="neCategoria" data-testid="select-elemento-categoria">
        ${categorie.map(c => `<option value="${c}">${catLabels[c] || c}</option>`).join('')}
      </select></div>
      <div class="form-row"><label>${t('normeElementoDescrizione')}</label><textarea id="neDescrizione" rows="3" data-testid="input-elemento-descrizione"></textarea></div>
      <div class="form-row"><label><input type="checkbox" id="neObbligatorio" checked data-testid="check-elemento-obbligatorio" /> ${t('normeElementoObbligatorio')}</label></div>
      <div class="form-row"><label>${t('normeElementoOnereProva')}</label><select id="neOnereProva" data-testid="select-elemento-onere">
        <option value="PM">${t('normeOnerePM')}</option><option value="privato">${t('normeOnerePrivato')}</option>
      </select></div>
      <div class="form-row"><label>${t('normeElementoTipoProva')}</label><input type="text" id="neTipoProva" data-testid="input-elemento-tipo-prova" /></div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnAddElementoConfirm" data-testid="button-confirm-elemento">${t('normeSave')}</button>
        <button class="btn btn-secondary" id="btnAddElementoCancel" data-testid="button-cancel-elemento">${t('normeCancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btnAddElementoConfirm').onclick = async () => {
    await NormDB.addElementoReato({
      id_norma: nodeId,
      categoria: document.getElementById('neCategoria').value,
      descrizione: document.getElementById('neDescrizione').value.trim(),
      obbligatorio: document.getElementById('neObbligatorio').checked,
      onere_prova: document.getElementById('neOnereProva').value,
      tipo_prova_tipica: document.getElementById('neTipoProva').value.trim()
    });
    scheduleSaveToFS();
    overlay.remove();
    _reloadNormeArticleSections(nodeId);
  };
  document.getElementById('btnAddElementoCancel').onclick = () => overlay.remove();
}

async function _deleteElemento(elId, nodeId) {
  await NormDB.deleteElementoReato(elId);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _renderNormeCalcoliTab(nodeId) {
  const meta = await NormDB.getMetadatiPenali(nodeId);
  let html = `<div class="norme-calcoli">`;
  if (!meta) {
    html += `<p class="hint">${t('normeAddPenalFirst')}</p>`;
  } else {
    const termini = NormDB.calcolaTerminiIndagini(meta);
    const prescr = NormDB.calcolaPrescrizione(meta);
    html += `<div class="norme-calcolo-card">`;
    html += `<h4>${t('normeCalcoloTermini')}</h4>`;
    if (termini) {
      html += `<div class="norme-calcolo-result"><span class="norme-calcolo-value">${termini.iniziale}</span> <span>${t('normeMesi')}</span></div>`;
      html += `<div class="norme-calcolo-explain">`;
      if (meta.art_407_cpp) html += `<p>${t('normeCalcArt407')}</p>`;
      else html += `<p>${t('normeCalcOrdinario')}</p>`;
      html += `<p>${t('normeCalcMax')}: <strong>${termini.massimo}</strong> ${t('normeMesi')}</p>`;
      html += `</div>`;
    }
    html += `</div>`;
    html += `<div class="norme-calcolo-card">`;
    html += `<h4>${t('normeCalcoloPrescrizione')}</h4>`;
    if (prescr) {
      html += `<div class="norme-calcolo-result"><span class="norme-calcolo-value">${prescr}</span> <span>${t('normeAnni')}</span></div>`;
      html += `<div class="norme-calcolo-explain"><p>${t('normeCalcPrescrExplain').replace('{0}', meta.pena_max_anni).replace('{1}', meta.tipo_reato === 'contravvenzione' ? '4' : '6').replace('{2}', prescr)} ${t('normeAnni')}</p></div>`;
    } else {
      html += `<p class="hint">${t('normePenaMaxMissing')}</p>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

async function _renderNormeCollegamentiTab(nodeId, isCreator, editMode) {
  const { asOrigin, asDest } = await NormDB.getCollegamenti(nodeId);
  const tipoLabels = {
    presupposto: t('normeLinkPresupposto'), violazione: t('normeLinkViolazione'),
    richiamo: t('normeLinkRichiamo'), contrasto: t('normeLinkContrasto')
  };
  let html = `<div class="norme-collegamenti-list">`;
  if (asOrigin.length === 0 && asDest.length === 0) {
    html += `<p class="hint">${t('normeNoLinks')}</p>`;
  }
  const renderLink = (link, isFrom) => {
    const otherId = isFrom ? link.id_norma_destinazione : link.id_norma_origine;
    const otherNode = _normeState.allNodi.find(n => n.id === otherId);
    const otherLabel = otherNode ? NormDB.buildNodoPath(otherNode, _normeState.allNodi, currentLang) : `Nodo #${otherId}`;
    let h = `<div class="norme-collegamento-card">`;
    h += `<span class="norme-node-badge">${tipoLabels[link.tipo_collegamento] || link.tipo_collegamento}</span> `;
    h += `<span class="norme-link-direction">${isFrom ? '→' : '←'}</span> `;
    h += `<a href="#" onclick="event.preventDefault(); _selectNormeNode(${otherId})">${esc(otherLabel)}</a>`;
    if (editMode) h += ` <button class="btn btn-xs btn-danger" onclick="_deleteCollegamento(${link.id}, ${nodeId})">×</button>`;
    h += `</div>`;
    return h;
  };
  asOrigin.forEach(l => { html += renderLink(l, true); });
  asDest.forEach(l => { html += renderLink(l, false); });
  html += `</div>`;
  return html;
}

function _searchNormeDestination(val) {
  const box = document.getElementById('ncDestSuggestions');
  if (!box) return;
  const q = val.toLowerCase().trim();
  if (!q) { box.innerHTML = ''; return; }
  const matches = _normeState.allNodi.filter(n =>
    n.id !== _normeState.selectedNodeId &&
    ((n.rubrica || '').toLowerCase().includes(q) || (n.rubrica_en || '').toLowerCase().includes(q) || (n.numero || '').toLowerCase().includes(q))
  ).slice(0, 10);
  box.innerHTML = matches.map(m => {
    const path = NormDB.buildNodoPath(m, _normeState.allNodi, currentLang);
    return `<div class="autocomplete-item" onmousedown="event.preventDefault(); _selectNormeDestination(${m.id}, '${esc(path).replace(/'/g, "\\'")}')">${esc(path)}</div>`;
  }).join('');
}

function _selectNormeDestination(id, label) {
  document.getElementById('ncDestId').value = id;
  document.getElementById('ncDestSearch').value = label;
  document.getElementById('ncDestSuggestions').innerHTML = '';
}

function _openAddCollegamentoModal(nodeId) {
  const tipoLabels = {
    presupposto: t('normeLinkPresupposto'), violazione: t('normeLinkViolazione'),
    richiamo: t('normeLinkRichiamo'), contrasto: t('normeLinkContrasto')
  };
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3>${t('normeAddCollegamento')}</h3>
      <div class="form-row"><label>${t('normeTipoCollegamento')}</label><select id="ncTipo" data-testid="select-collegamento-tipo">
        ${Object.entries(tipoLabels).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select></div>
      <div class="form-row"><label>${t('normeNodoDestinazione')}</label>
        <input type="text" id="ncDestSearch" placeholder="${t('normeSearch')}" oninput="_searchNormeDestination(this.value)" data-testid="input-collegamento-search" />
        <input type="hidden" id="ncDestId" />
        <div class="norme-dest-suggestions" id="ncDestSuggestions"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="btnAddCollConfirm" data-testid="button-confirm-collegamento">${t('normeSave')}</button>
        <button class="btn btn-secondary" id="btnAddCollCancel" data-testid="button-cancel-collegamento">${t('normeCancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btnAddCollConfirm').onclick = async () => {
    const destId = parseInt(document.getElementById('ncDestId').value);
    if (!destId) { alert(t('normeSelectDest') || 'Seleziona un nodo destinazione'); return; }
    await NormDB.addCollegamento({
      id_norma_origine: nodeId,
      id_norma_destinazione: destId,
      tipo_collegamento: document.getElementById('ncTipo').value
    });
    scheduleSaveToFS();
    overlay.remove();
    _reloadNormeArticleSections(nodeId);
  };
  document.getElementById('btnAddCollCancel').onclick = () => overlay.remove();
}

async function _deleteCollegamento(linkId, nodeId) {
  await NormDB.deleteCollegamento(linkId);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _renderNormeProcedimentiTab(nodeId, isCreator) {
  const links = await NormDB.getProcedimentiNorme(nodeId);
  const ruoloLabels = {
    imputazione: t('normeRuoloImputazione'),
    violazione_dedotta: t('normeRuoloViolazioneDedotta'),
    richiamo_difensivo: t('normeRuoloRichiamoDifensivo')
  };
  let html = `<div class="norme-procedimenti-list">`;
  if (links.length === 0) {
    html += `<p class="hint">${t('normeNoProceedings')}</p>`;
  }
  for (const link of links) {
    const proc = await DB.getProceeding(link.id_procedimento);
    const procLabel = proc ? (proc.rgType || '') + ' ' + (proc.rgNumber || '') + '/' + (proc.year || '') : `Proc #${link.id_procedimento}`;
    html += `<div class="norme-collegamento-card">`;
    html += `<span class="norme-node-badge">${ruoloLabels[link.ruolo] || link.ruolo}</span> `;
    html += `<span>${esc(procLabel)}</span>`;
    if (isCreator) html += ` <button class="btn btn-xs btn-danger" onclick="_deleteProcedimentoNorma(${link.id}, ${nodeId})">×</button>`;
    html += `</div>`;
  }
  html += `</div>`;
  if (isCreator) {
    const allProcs = await DB.getAllProceedings();
    html += `<div class="norme-add-collegamento">`;
    html += `<h4>${t('normeAddProcedimento')}</h4>`;
    html += `<div class="form-row"><label>${t('normeRuoloProcedimento')}</label><select id="npRuolo">`;
    Object.entries(ruoloLabels).forEach(([k, v]) => { html += `<option value="${k}">${v}</option>`; });
    html += `</select></div>`;
    html += `<div class="form-row"><label>${t('labelProcedimento')}</label><select id="npProcId">`;
    allProcs.forEach(p => {
      const label = (p.rgType || '') + ' ' + (p.rgNumber || '') + '/' + (p.year || '');
      html += `<option value="${p.id}">${esc(label)}</option>`;
    });
    html += `</select></div>`;
    html += `<button class="btn btn-primary btn-xs" onclick="_addProcedimentoNorma(${nodeId})">${t('normeAddProcedimento')}</button>`;
    html += `</div>`;
  }
  return html;
}

async function _addProcedimentoNorma(nodeId) {
  const procId = parseInt(document.getElementById('npProcId').value);
  if (!procId) return;
  await NormDB.addProcedimentoNorma({
    id_procedimento: procId,
    id_norma: nodeId,
    ruolo: document.getElementById('npRuolo').value
  });
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

async function _deleteProcedimentoNorma(linkId, nodeId) {
  await NormDB.deleteProcedimentoNorma(linkId);
  scheduleSaveToFS();
  _reloadNormeArticleSections(nodeId);
}

let _legalDict = null;
async function _loadLegalDict() {
  if (_legalDict) return _legalDict;
  try {
    const resp = await fetch('data/legal-dictionary.json');
    _legalDict = await resp.json();
  } catch (e) { _legalDict = []; }
  return _legalDict;
}

function _insertInProofField(fieldId) {
  const activePane = document.querySelector('.tools-tab-pane.active');
  if (!activePane) return;
  let text = '';
  const paneId = activePane.id;
  if (paneId === 'toolsPaneTranscribe') {
    const el = document.getElementById('transcribeResult');
    if (el && el.value.trim()) text = el.value.trim();
    if (!text) { const mt = _mtFormatAll(); if (mt) text = mt; }
  } else if (paneId === 'toolsPaneDictation') {
    const el = document.getElementById('dictationResult');
    if (el && el.value.trim()) text = el.value.trim();
  } else if (paneId === 'toolsPaneTranslate') {
    const el = document.getElementById('toolsTransResult');
    if (el && el.value.trim()) text = el.value.trim();
  } else if (paneId === 'toolsPaneOcr') {
    const el = document.getElementById('toolsOcrResult');
    if (el && el.value.trim()) text = el.value.trim();
  } else if (paneId === 'toolsPaneMediaDesc') {
    text = _mdGetTextForInsert(fieldId);
  }
  if (!text) return;
  const target = document.getElementById(fieldId);
  if (target) {
    target.value = target.value ? target.value + '\n\n' + text : text;
  }
}

function _mdGetTextForInsert(fieldId) {
  const isIt = fieldId && (fieldId.includes('It') || fieldId.includes('it'));
  if (state._mdMode === 'video') {
    return _mdFormatAll();
  }
  const taId = isIt ? 'mdDescIt' : 'mdDescEn';
  const el = document.getElementById(taId);
  if (el && el.value.trim()) return el.value.trim();
  const fallbackId = isIt ? 'mdDescEn' : 'mdDescIt';
  const fb = document.getElementById(fallbackId);
  return (fb && fb.value.trim()) ? fb.value.trim() : '';
}

function _proofInsertBtns(size) {
  let itId = null, enId = null;
  if (document.getElementById('modalNewProofTranscriptIt')) {
    itId = 'modalNewProofTranscriptIt'; enId = 'modalNewProofTranscriptEn';
  } else if (document.getElementById('editProofTranscriptIt')) {
    itId = 'editProofTranscriptIt'; enId = 'editProofTranscriptEn';
  }
  if (!itId) return '';
  const s = size === 'xs' ? 'style="font-size:10px;padding:2px 6px"' : '';
  const cls = size === 'xs' ? 'btn btn-xs' : 'btn btn-sm';
  return `<button class="${cls}" onclick="_insertInProofField('${itId}')" ${s} title="${t('insertInIt')}" data-testid="button-insert-it">🇮🇹 ↓</button>
          <button class="${cls}" onclick="_insertInProofField('${enId}')" ${s} title="${t('insertInEn')}" data-testid="button-insert-en">🇬🇧 ↓</button>`;
}

function _proofDescInsertBtns(size) {
  const s = size === 'xs' ? 'style="font-size:10px;padding:2px 6px"' : '';
  const cls = size === 'xs' ? 'btn btn-xs' : 'btn btn-sm';
  return `<button class="${cls}" onclick="_doDescInsert('it')" ${s} title="${t('insertInIt')}" data-testid="button-desc-insert-it">🇮🇹 ↓</button>
          <button class="${cls}" onclick="_doDescInsert('en')" ${s} title="${t('insertInEn')}" data-testid="button-desc-insert-en">🇬🇧 ↓</button>`;
}

function _doDescInsert(lang) {
  const suffix = lang === 'it' ? 'It' : 'En';
  const candidates = [
    { id: `modalNewProofImageDesc${suffix}`, groupId: 'mnpImageDesc' + suffix + 'Group' },
    { id: `editProofImageDesc${suffix}`, groupId: 'epImageDesc' + suffix + 'Group' },
    { id: `modalNewProofVideoDesc${suffix}`, groupId: 'mnpVideoDesc' + suffix + 'Group' },
    { id: `editProofVideoDesc${suffix}`, groupId: 'epVideoDesc' + suffix + 'Group' },
  ];
  let targetId = null;
  for (const c of candidates) {
    const el = document.getElementById(c.id);
    if (!el) continue;
    const group = document.getElementById(c.groupId);
    if (group && group.style.display === 'none') continue;
    targetId = c.id;
    break;
  }
  if (targetId) _insertInProofField(targetId);
}

function _renderTransArrow(fromId, toId, fromLang, toLang) {
  const arrow = fromLang === 'it' ? '→' : '←';
  const vis = fromLang === currentLang ? '' : 'display:none;';
  return `<button type="button" class="auto-trans-btn" style="${vis}" data-from-lang="${fromLang}" onclick="_autoTranslateField('${fromId}','${toId}','${fromLang}','${toLang}',this)" title="${fromLang.toUpperCase()}→${toLang.toUpperCase()}" data-testid="button-auto-trans-${fromId}-${toId}"><span class="atb-icon">文A</span><span class="atb-arrow">${arrow}</span></button>`;
}

async function _autoTranslateField(fromId, toId, fromLang, toLang, btn) {
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);
  if (!fromEl || !toEl) return;
  const text = fromEl.value.trim();
  if (!text) return;
  if (!navigator.onLine) { alert(t('translateOffline')); return; }
  if (btn) { btn.disabled = true; }
  const langpair = `${fromLang}|${toLang}`;
  try {
    const chunks = _splitText(text, 500);
    let translated = '';
    for (let i = 0; i < chunks.length; i++) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunks[i])}&langpair=${langpair}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.responseStatus === 200 && data.responseData) {
        translated += (i > 0 ? ' ' : '') + data.responseData.translatedText;
      } else {
        translated += (i > 0 ? ' ' : '') + chunks[i];
      }
    }
    toEl.value = translated;
  } catch (err) {
    alert(t('translateError'));
  }
  if (btn) { btn.disabled = false; }
}

function _mdFormatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function _mdFormatAll() {
  if (!state._mdScenes || !state._mdScenes.length) return '';
  return state._mdScenes.map(s => `[${s.timestamp}] ${t('mediaDescScene')} ${s.sceneNum}: ${s.text}`).join('\n');
}

function _mdRenderScenes() {
  const list = document.getElementById('mdSceneList');
  if (!list) return;
  if (!state._mdScenes || !state._mdScenes.length) {
    list.innerHTML = `<div class="md-empty">${t('mediaDescNoFile')}</div>`;
    return;
  }
  list.innerHTML = state._mdScenes.map((s, i) => `
    <div class="md-scene-line" data-testid="md-scene-line-${i}">
      <span class="md-scene-ts">${s.timestamp}</span>
      <span class="md-scene-badge">${t('mediaDescScene')} ${s.sceneNum}</span>
      <span class="md-scene-text">${esc(s.text)}</span>
      <div class="md-scene-actions">
        ${i > 0 ? `<button class="mt-line-move" onclick="_mdMoveScene(${i},-1)" title="▲" data-testid="button-md-scene-up-${i}">▲</button>` : ''}
        ${i < state._mdScenes.length - 1 ? `<button class="mt-line-move" onclick="_mdMoveScene(${i},1)" title="▼" data-testid="button-md-scene-down-${i}">▼</button>` : ''}
        <button class="mt-line-del" onclick="_mdDeleteScene(${i})" title="✕" data-testid="button-md-scene-del-${i}">✕</button>
      </div>
    </div>
  `).join('');
  list.scrollTop = list.scrollHeight;
}

function _mdAddScene() {
  const ta = document.getElementById('mdSceneInput');
  if (!ta || !ta.value.trim()) return;
  const videoEl = document.getElementById('mdVideoEl');
  const ts = videoEl ? _mdFormatTime(videoEl.currentTime) : '00:00';
  if (!state._mdScenes) state._mdScenes = [];
  if (!state._mdSceneCounter) state._mdSceneCounter = 1;
  state._mdScenes.push({ sceneNum: state._mdSceneCounter, timestamp: ts, text: ta.value.trim() });
  state._mdSceneCounter++;
  ta.value = '';
  ta.focus();
  _mdRenderScenes();
  const addBtn = document.getElementById('mdSceneAddBtn');
  if (addBtn) addBtn.textContent = `+ ${t('mediaDescScene')} ${state._mdSceneCounter}`;
}

function _mdMoveScene(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state._mdScenes.length) return;
  [state._mdScenes[idx], state._mdScenes[newIdx]] = [state._mdScenes[newIdx], state._mdScenes[idx]];
  _mdRenderScenes();
}

function _mdDeleteScene(idx) {
  state._mdScenes.splice(idx, 1);
  _mdRenderScenes();
}

function _mdReverseScenes() {
  if (!state._mdScenes || state._mdScenes.length < 2) return;
  state._mdScenes.reverse();
  _mdRenderScenes();
}

function _mdClearAllScenes() {
  if (!state._mdScenes || !state._mdScenes.length) return;
  if (!confirm(t('mediaDescConfirmClear'))) return;
  state._mdScenes = [];
  state._mdSceneCounter = 1;
  _mdRenderScenes();
  const addBtn = document.getElementById('mdSceneAddBtn');
  if (addBtn) addBtn.textContent = `+ ${t('mediaDescScene')} 1`;
}

async function _mdTranslate(fromLang, toLang) {
  const fromId = fromLang === 'it' ? 'mdDescIt' : 'mdDescEn';
  const toId = fromLang === 'it' ? 'mdDescEn' : 'mdDescIt';
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);
  if (!fromEl || !toEl || !fromEl.value.trim()) return;
  if (!navigator.onLine) { alert(t('translateOffline')); return; }
  const text = fromEl.value.trim();
  const langpair = `${fromLang}|${toLang}`;
  const btn = fromLang === 'it' ? document.getElementById('mdTransToEnBtn') : document.getElementById('mdTransToItBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  try {
    const chunks = _splitText(text, 500);
    let translated = '';
    for (let i = 0; i < chunks.length; i++) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunks[i])}&langpair=${langpair}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.responseStatus === 200 && data.responseData) {
        translated += (i > 0 ? ' ' : '') + data.responseData.translatedText;
      } else {
        translated += (i > 0 ? ' ' : '') + chunks[i];
      }
    }
    toEl.value = translated;
  } catch (err) {
    alert(t('translateError'));
  }
  if (btn) { btn.disabled = false; btn.style.opacity = ''; }
}

let _mdTabInitialized = false;
function _initMediaDescTab(overlay) {
  if (_mdTabInitialized) return;
  _mdTabInitialized = true;
  setTimeout(() => { _mdTabInitialized = false; }, 100);

  if (!state._mdScenes) state._mdScenes = [];
  if (!state._mdSceneCounter) state._mdSceneCounter = 1;

  const fileInput = document.getElementById('mdFileInput');
  const contentArea = document.getElementById('mdContentArea');
  const fileInfo = document.getElementById('mdFileInfo');
  const copyBtn = document.getElementById('mdCopyBtn');
  const clearBtn = document.getElementById('mdClearBtn');
  if (!fileInput || !contentArea) return;

  fileInput.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (state._mdMediaUrl) URL.revokeObjectURL(state._mdMediaUrl);
    state._mdMediaUrl = URL.createObjectURL(file);
    if (fileInfo) fileInfo.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;

    const isVideo = file.type.startsWith('video/');
    state._mdMode = isVideo ? 'video' : 'image';

    if (isVideo) {
      state._mdScenes = [];
      state._mdSceneCounter = 1;
      const pipBtn = document.pictureInPictureEnabled ? `<button class="btn btn-xs" onclick="_mtTogglePiP_md()" style="margin-top:4px" title="${t('pipDetach')}" data-testid="button-md-pip">🖼 ${t('pipDetach')}</button>` : '';
      contentArea.innerHTML = `
        <div class="md-col-left">
          <video id="mdVideoEl" controls style="width:100%;max-height:200px;border-radius:var(--radius)" data-testid="md-video-player"><source src="${state._mdMediaUrl}"></video>
          ${pipBtn}
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <button class="btn btn-xs" onclick="_mdSkip(-5)" data-testid="button-md-back5">⏪ −5s</button>
            <button class="btn btn-xs" onclick="_mdSkip(5)" data-testid="button-md-fwd5">⏩ +5s</button>
            <label style="font-size:11px;font-weight:600">${t('manualTranscribeSpeed')}:</label>
            <select id="mdSpeedSelect" style="font-size:11px;padding:2px 4px" data-testid="select-md-speed" onchange="_mdSetSpeed(this.value)">
              <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option>
            </select>
            <span id="mdCurrentTime" style="font-family:monospace;font-size:11px;color:var(--text-secondary)">00:00</span>
          </div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <button class="btn btn-xs" onclick="_mdReverseScenes()" title="${t('mediaDescReverseOrder')}" data-testid="button-md-reverse">⇅</button>
            <button class="btn btn-xs" onclick="_mdClearAllScenes()" title="${t('manualTranscribeClearAll')}" data-testid="button-md-clear-scenes">✕ ${t('manualTranscribeClearAll')}</button>
          </div>
        </div>
        <div class="md-col-right">
          <div class="md-input-row">
            <button class="md-scene-add-btn" id="mdSceneAddBtn" onclick="_mdAddScene()" data-testid="button-md-add-scene">+ ${t('mediaDescScene')} ${state._mdSceneCounter}</button>
            <textarea id="mdSceneInput" placeholder="${t('mediaDescScenePlaceholder')}" data-testid="textarea-md-scene-input"></textarea>
          </div>
          <div id="mdSceneList" style="flex:1;overflow-y:auto;max-height:280px"></div>
        </div>
      `;
      const videoEl = document.getElementById('mdVideoEl');
      if (videoEl) {
        videoEl.addEventListener('timeupdate', () => {
          const timeEl = document.getElementById('mdCurrentTime');
          if (timeEl) timeEl.textContent = _mdFormatTime(videoEl.currentTime);
        });
      }
      const sceneInput = document.getElementById('mdSceneInput');
      if (sceneInput) {
        sceneInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _mdAddScene(); }
        });
      }
      _mdRenderScenes();
    } else {
      contentArea.innerHTML = `
        <div class="md-col-left">
          <img src="${state._mdMediaUrl}" class="md-preview-img" onclick="_mdZoomImage(this)" alt="" data-testid="md-image-preview">
        </div>
        <div class="md-col-right">
          <div class="md-desc-group">
            <label>${t('imageDescriptionIt')}</label>
            <textarea id="mdDescIt" placeholder="${t('mediaDescPlaceholderIt')}" data-testid="textarea-md-desc-it"></textarea>
            <button class="md-translate-btn" id="mdTransToEnBtn" onclick="_mdTranslate('it','en')" data-testid="button-md-translate-to-en">${t('mediaDescTranslateToEn')}</button>
          </div>
          <div class="md-desc-group">
            <label>${t('imageDescriptionEn')}</label>
            <textarea id="mdDescEn" placeholder="${t('mediaDescPlaceholderEn')}" data-testid="textarea-md-desc-en"></textarea>
            <button class="md-translate-btn" id="mdTransToItBtn" onclick="_mdTranslate('en','it')" data-testid="button-md-translate-to-it">${t('mediaDescTranslateToIt')}</button>
          </div>
        </div>
      `;
    }
  };

  if (copyBtn) {
    copyBtn.onclick = () => {
      let text = '';
      if (state._mdMode === 'video') {
        text = _mdFormatAll();
      } else {
        const it = document.getElementById('mdDescIt');
        const en = document.getElementById('mdDescEn');
        const parts = [];
        if (it && it.value.trim()) parts.push(`[IT] ${it.value.trim()}`);
        if (en && en.value.trim()) parts.push(`[EN] ${en.value.trim()}`);
        text = parts.join('\n\n');
      }
      if (text) navigator.clipboard.writeText(text);
    };
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      if (state._mdMode === 'video') {
        _mdClearAllScenes();
      } else {
        const it = document.getElementById('mdDescIt');
        const en = document.getElementById('mdDescEn');
        if (it) it.value = '';
        if (en) en.value = '';
      }
    };
  }
}

function _mdZoomImage(img) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  overlay.innerHTML = `<img src="${img.src}" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px">`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

function _mdSkip(sec) {
  const el = document.getElementById('mdVideoEl');
  if (el) el.currentTime = Math.max(0, el.currentTime + sec);
}

function _mdSetSpeed(val) {
  const el = document.getElementById('mdVideoEl');
  if (el) el.playbackRate = parseFloat(val);
}

function _mtTogglePiP_md() {
  const videoEl = document.getElementById('mdVideoEl');
  if (!videoEl) return;
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  } else {
    videoEl.requestPictureInPicture().catch(() => {});
  }
}

function openToolsModal(initialTab) {
  if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
  }
  const overlay = document.createElement('div');
  overlay.className = 'tools-modal-overlay';
  overlay.setAttribute('data-testid', 'tools-modal-overlay');

  overlay.innerHTML = `
    <div class="tools-modal" onclick="event.stopPropagation()">
      <div class="tools-modal-header">
        <h2>${t('strumenti')}</h2>
        <button class="tools-modal-close" id="toolsCloseBtn" data-testid="button-tools-close">&times;</button>
      </div>
      <div class="tools-tab-bar">
        <button class="tools-tab-btn active" data-tab="ocr" data-testid="button-tools-tab-ocr">${t('toolsOcr')}</button>
        <button class="tools-tab-btn" data-tab="mediadesc" data-testid="button-tools-tab-mediadesc">${t('toolsDescrizione')}</button>
        <button class="tools-tab-btn" data-tab="transcribe" data-testid="button-tools-tab-transcribe">${t('toolsTrascrizione')}</button>
        <button class="tools-tab-btn" data-tab="dictation" data-testid="button-tools-tab-dictation">${t('toolsDettatura')}</button>
        <button class="tools-tab-btn" data-tab="translate" data-testid="button-tools-tab-translate">${t('toolsTraduzione')}</button>
      </div>
      <div class="tools-tab-content">
        <div class="tools-tab-pane active" id="toolsPaneOcr">
          <div class="tools-ocr-toolbar">
            <label class="btn btn-sm btn-primary" style="display:inline-flex;cursor:pointer" data-testid="button-ocr-load-pdf">
              ${t('ocrLoadPdf')}
              <input type="file" accept=".pdf" id="toolsOcrFile" style="display:none" data-testid="input-ocr-file">
            </label>
            <span id="toolsOcrPageInfo" class="tools-status info" style="display:none" data-testid="text-ocr-page-info"></span>
            <button class="btn btn-sm" id="toolsOcrPrev" style="display:none" data-testid="button-ocr-prev">&laquo;</button>
            <button class="btn btn-sm" id="toolsOcrNext" style="display:none" data-testid="button-ocr-next">&raquo;</button>
            <span style="flex:1"></span>
            <label style="font-size:11px;font-weight:600">${t('ocrLang')}:</label>
            <select id="ocrLangSelect" style="font-size:11px;padding:2px 4px" data-testid="select-ocr-lang">
              <option value="ita">Italiano</option>
              <option value="eng">English</option>
            </select>
            <button class="btn btn-sm btn-primary" id="toolsOcrExtract" style="display:none" data-testid="button-ocr-extract">${t('ocrExtractText')}</button>
            <button class="btn btn-sm" id="toolsOcrExtractSel" style="display:none" data-testid="button-ocr-extract-sel">${t('ocrExtractSelection')}</button>
          </div>
          <div class="tools-progress" id="toolsOcrProgress" style="display:none"><div class="tools-progress-bar" id="toolsOcrProgressBar"></div></div>
          <div id="toolsOcrStatus" style="display:none" class="tools-status info" data-testid="text-ocr-status"></div>
          <div class="tools-ocr-canvas-wrap" id="toolsOcrCanvasWrap">
            <span style="color:#999;font-size:13px" data-testid="text-ocr-placeholder">${t('ocrNoPdf')}</span>
          </div>
          <textarea class="tools-ocr-result" id="toolsOcrResult" readonly placeholder="${t('ocrNoPdf')}" data-testid="textarea-ocr-result"></textarea>
          <div class="tools-ocr-toolbar">
            <button class="btn btn-sm" id="toolsOcrCopy" title="${t('ocrCopyText')}" data-testid="button-ocr-copy">⧉</button>
            <button class="btn btn-sm" onclick="_sendToTranslate('toolsOcrResult')" title="${t('translateBtn')}" data-testid="button-ocr-translate">文A</button>
            ${_proofInsertBtns('sm')}
          </div>
        </div>

        <div class="tools-tab-pane" id="toolsPaneMediaDesc">
          <div class="tools-ocr-toolbar">
            <label class="btn btn-sm btn-primary" style="display:inline-flex;cursor:pointer" data-testid="button-mediadesc-load">
              ${t('mediaDescLoadFile')}
              <input type="file" accept="image/*,video/*" id="mdFileInput" style="display:none" data-testid="input-mediadesc-file">
            </label>
            <span id="mdFileInfo" class="md-file-info" data-testid="text-mediadesc-file-info"></span>
            <span style="flex:1"></span>
            <button class="btn btn-sm" id="mdCopyBtn" title="${t('ocrCopyText')}" data-testid="button-mediadesc-copy">⧉</button>
            <button class="btn btn-sm" id="mdClearBtn" title="${t('manualTranscribeClearAll')}" data-testid="button-mediadesc-clear">✕</button>
            ${_proofDescInsertBtns('sm')}
          </div>
          <div id="mdContentArea" class="md-columns" style="padding:8px 0">
            <div class="md-empty" data-testid="text-mediadesc-empty">${t('mediaDescNoFile')}</div>
          </div>
        </div>

        <div class="tools-tab-pane" id="toolsPaneTranscribe">
          <div class="transcribe-toolbar">
            <label class="btn btn-sm btn-primary" style="cursor:pointer" data-testid="button-transcribe-load">
              ${t('transcribeLoadAudio')}
              <input type="file" accept=".mp3,.wav,.ogg,.m4a,.webm,.flac,.mp4,.mkv,.avi,.webm,audio/*,video/*" id="transcribeFileInput" style="display:none" data-testid="input-transcribe-file">
            </label>
            <button class="btn btn-sm" id="transcribeRecordBtn" onclick="_toggleAudioRecording()" data-testid="button-transcribe-record">${t('transcribeRecord')}</button>
            <button class="btn btn-sm btn-primary" id="transcribeBtn" onclick="_startTranscription()" disabled data-testid="button-transcribe-start">${t('transcribeTranscribe')}</button>
            <span id="transcribeRecordIndicator" style="display:none">
              <span class="transcribe-record-indicator"><span class="transcribe-record-dot"></span><span class="transcribe-timer" id="transcribeTimer">00:00</span></span>
            </span>
            <span style="flex:1"></span>
            <label style="font-size:11px;font-weight:600">${t('transcribeLang')}:</label>
            <select id="transcribeLangSelect" style="font-size:11px;padding:2px 4px" data-testid="select-transcribe-lang">
              <option value="italian">Italiano</option>
              <option value="english">English</option>
            </select>
            <label style="font-size:11px;font-weight:600;margin-left:8px">${t('transcribeModel')}:</label>
            <select id="transcribeModelSelect" style="font-size:11px;padding:2px 4px" data-testid="select-transcribe-model" onchange="_updateWhisperModelStatus()">
              <option value="tiny" selected>Tiny (${t('whisperModelStatusIncluded')})</option>
              <option value="base">Base</option>
              <option value="small">Small</option>
            </select>
            <span id="whisperModelStatus" class="whisper-model-badge" data-testid="text-whisper-model-status"></span>
          </div>

          <div id="transcribeAudioPreview" class="transcribe-audio-preview" style="display:none"></div>
          <div class="transcribe-progress" id="transcribeProgress" style="display:none"><div class="transcribe-progress-bar" id="transcribeProgressBar"></div></div>
          <div id="transcribeStatus" class="transcribe-status" data-testid="text-transcribe-status"></div>
          <div class="transcribe-two-col">
            <div class="transcribe-col-left">
              <div class="transcribe-col-header" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="flex:1;white-space:nowrap">${t('toolsAutoTranscribe')}</span>
                <button class="btn btn-xs" onclick="_copyTranscription()" style="font-size:10px;padding:2px 6px" title="${t('transcribeCopy')}" data-testid="button-transcribe-copy">⧉</button>
                <button class="btn btn-xs" onclick="_clearAutoTranscription()" style="font-size:10px;padding:2px 6px" title="${t('manualTranscribeClearAll')}" data-testid="button-transcribe-clear">✕</button>
                <button class="btn btn-xs" onclick="_sendToTranslate('transcribeResult')" style="font-size:10px;padding:2px 6px" title="${t('translateBtn')}" data-testid="button-transcribe-translate">文A</button>
                ${_proofInsertBtns('xs')}
              </div>
              <textarea class="transcribe-result transcribe-col-textarea" id="transcribeResult" readonly placeholder="${t('transcribePlaceholder')}" data-testid="textarea-transcribe-result"></textarea>
            </div>
            <div class="transcribe-col-right">
              <div class="transcribe-col-header" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="flex:1;white-space:nowrap">${t('toolsManualTranscribe')} <span class="mt-player-time" id="mtCurrentTime" data-testid="text-mt-time"></span></span>
                <button class="btn btn-xs" onclick="_mtReverseAll()" style="font-size:10px;padding:2px 6px" title="${t('mtReverseOrder')}" data-testid="button-mt-reverse">⇅</button>
                <button class="btn btn-xs" onclick="_mtCopyAll()" style="font-size:10px;padding:2px 6px" title="${t('transcribeCopy')}" data-testid="button-mt-copy">⧉</button>
                <button class="btn btn-xs" onclick="_mtClearAll()" style="font-size:10px;padding:2px 6px" title="${t('manualTranscribeClearAll')}" data-testid="button-mt-clear">✕</button>
                <button class="btn btn-xs" onclick="_sendMtToTranslate()" style="font-size:10px;padding:2px 6px" title="${t('translateBtn')}" data-testid="button-mt-translate">文A</button>
                ${_proofInsertBtns('xs')}
              </div>
              <div class="mt-input-row">
                <textarea id="mtInput" rows="1" placeholder="${t('manualTranscribeTextPlaceholder')}" data-testid="input-mt-text"></textarea>
                <div class="mt-split-btn" id="mtSplitBtn" data-testid="button-mt-split">
                  <button class="mt-split-main" id="mtSplitMain" onclick="_mtAddLine()" data-testid="button-mt-add"></button>
                  <button class="mt-split-arrow" id="mtSplitArrow" onclick="_mtToggleDropdown(event)" data-testid="button-mt-split-arrow">▼</button>
                  <div class="mt-speaker-dropdown" id="mtSpeakerDropdown" style="display:none" data-testid="dropdown-mt-speakers"></div>
                </div>
              </div>
              <div class="mt-lines" id="mtLines" data-testid="text-mt-lines"></div>
            </div>
          </div>
        </div>

        <div class="tools-tab-pane" id="toolsPaneDictation">
          <div class="transcribe-toolbar">
            <button class="btn btn-sm btn-primary" id="dictationToggleBtn" onclick="_toggleDictation()" data-testid="button-dictation-toggle">${t('dictationStart')}</button>
            <span id="dictationIndicator" style="display:none">
              <span class="transcribe-record-indicator"><span class="transcribe-record-dot"></span><span class="transcribe-timer" id="dictationTimer">00:00</span></span>
            </span>
            <span style="flex:1"></span>
            <label style="font-size:11px;font-weight:600">${t('transcribeLang')}:</label>
            <select id="dictationLangSelect" style="font-size:11px;padding:2px 4px" data-testid="select-dictation-lang">
              <option value="it-IT">Italiano</option>
              <option value="en-US">English</option>
            </select>
          </div>
          <div class="hint" style="font-size:10px;margin-bottom:6px">${t('dictationHint')}</div>
          <div id="dictationStatus" class="transcribe-status" data-testid="text-dictation-status"></div>
          <textarea class="transcribe-result" id="dictationResult" placeholder="${t('transcribePlaceholder')}" data-testid="textarea-dictation-result"></textarea>
          <div class="transcribe-actions">
            <button class="btn btn-sm" onclick="_clearDictation()" title="${t('dictationClear')}" data-testid="button-dictation-clear">✕</button>
            <button class="btn btn-sm" onclick="_copyDictation()" title="${t('transcribeCopy')}" data-testid="button-dictation-copy">⧉</button>
            <button class="btn btn-sm" onclick="_sendToTranslate('dictationResult')" title="${t('translateBtn')}" data-testid="button-dictation-translate">文A</button>
            ${_proofInsertBtns('sm')}
          </div>
        </div>

        <div class="tools-tab-pane" id="toolsPaneTranslate">
          <div class="tools-translate-bar">
            <label style="font-size:12px;font-weight:600">${t('translateDirection')}:</label>
            <select id="toolsTransDir" data-testid="select-translate-direction">
              <option value="it|en">IT → EN</option>
              <option value="en|it" selected>EN → IT</option>
            </select>
            <button class="btn btn-sm btn-primary" id="toolsTransBtn" data-testid="button-translate">${t('translateBtn')}</button>
            <button class="btn btn-sm" id="toolsTransCopy" title="${t('translateCopy')}" data-testid="button-translate-copy">⧉</button>
            ${_proofInsertBtns('sm')}
          </div>
          <div class="tools-disclaimer">${t('translateDisclaimer')}</div>
          <div class="tools-progress" id="toolsTransProgress" style="display:none"><div class="tools-progress-bar" id="toolsTransProgressBar"></div></div>
          <div id="toolsTransStatus" style="display:none" class="tools-status info" data-testid="text-translate-status"></div>
          <div class="tools-translate-grid">
            <div class="tools-translate-col">
              <label>${t('translateSource')}</label>
              <textarea id="toolsTransSource" placeholder="${t('translateSource')}..." data-testid="textarea-translate-source"></textarea>
            </div>
            <div class="tools-translate-col">
              <label>${t('translateResult')}</label>
              <textarea id="toolsTransResult" readonly placeholder="${t('translateResult')}..." data-testid="textarea-translate-result"></textarea>
            </div>
          </div>
          <div id="toolsTransLegal" style="display:none" class="tools-legal-terms" data-testid="text-translate-legal-terms"></div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const _closeToolsModal = () => {
    if (state._mediaRecorder && state._mediaRecorder.state === 'recording') {
      state._mediaRecorder.stop();
    }
    if (state._recordTimerInterval) { clearInterval(state._recordTimerInterval); state._recordTimerInterval = null; }
    if (state._speechRecognition) { state._speechRecognitionManualStop = true; state._speechRecognition.stop(); state._speechRecognition = null; }
    if (state._dictationTimerInterval) { clearInterval(state._dictationTimerInterval); state._dictationTimerInterval = null; }
    if (state._mtMediaUrl) { URL.revokeObjectURL(state._mtMediaUrl); state._mtMediaUrl = null; }
    const mtMedia = document.getElementById('mtMediaEl');
    if (mtMedia) { mtMedia.pause(); mtMedia.src = ''; }
    if (state._mdMediaUrl) { URL.revokeObjectURL(state._mdMediaUrl); state._mdMediaUrl = null; }
    const mdMedia = document.getElementById('mdVideoEl');
    if (mdMedia) { mdMedia.pause(); mdMedia.src = ''; }
    state._mdScenes = [];
    state._mdSceneCounter = 1;
    overlay.remove();
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeToolsModal(); });
  document.getElementById('toolsCloseBtn').onclick = _closeToolsModal;

  overlay.querySelectorAll('.tools-tab-btn').forEach(btn => {
    btn.onclick = () => {
      overlay.querySelectorAll('.tools-tab-btn').forEach(b => b.classList.remove('active'));
      overlay.querySelectorAll('.tools-tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const paneMap = { ocr: 'toolsPaneOcr', mediadesc: 'toolsPaneMediaDesc', translate: 'toolsPaneTranslate', transcribe: 'toolsPaneTranscribe', dictation: 'toolsPaneDictation' };
      const paneId = paneMap[btn.dataset.tab] || 'toolsPaneOcr';
      document.getElementById(paneId).classList.add('active');
      if (btn.dataset.tab === 'mediadesc') _initMediaDescTab(overlay);
      if (btn.dataset.tab === 'transcribe') { _initTranscribeTab(overlay); _initManualTranscribeTab(overlay); }
      if (btn.dataset.tab === 'dictation') _initDictationTab(overlay);
    };
  });

  _initOcrTab(overlay);
  _initTranslateTab(overlay);

  if (initialTab && initialTab !== 'ocr') {
    const tabBtn = overlay.querySelector(`.tools-tab-btn[data-tab="${initialTab}"]`);
    if (tabBtn) tabBtn.click();
  }
}

function _initOcrTab(overlay) {
  let pdfDoc = null, currentPage = 1, canvas = null, selRect = null, isSelecting = false, selStart = null;

  const fileInput = document.getElementById('toolsOcrFile');
  const canvasWrap = document.getElementById('toolsOcrCanvasWrap');
  const pageInfo = document.getElementById('toolsOcrPageInfo');
  const prevBtn = document.getElementById('toolsOcrPrev');
  const nextBtn = document.getElementById('toolsOcrNext');
  const extractBtn = document.getElementById('toolsOcrExtract');
  const extractSelBtn = document.getElementById('toolsOcrExtractSel');
  const resultTa = document.getElementById('toolsOcrResult');
  const progressWrap = document.getElementById('toolsOcrProgress');
  const progressBar = document.getElementById('toolsOcrProgressBar');
  const statusEl = document.getElementById('toolsOcrStatus');
  const copyBtn = document.getElementById('toolsOcrCopy');

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (typeof pdfjsLib === 'undefined') {
      _showOcrStatus('PDF.js library not loaded', 'error');
      return;
    }
    const ab = await file.arrayBuffer();
    try {
      pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise;
      currentPage = 1;
      await _renderPage();
      [prevBtn, nextBtn, extractBtn, extractSelBtn].forEach(b => b.style.display = '');
      pageInfo.style.display = '';
    } catch (err) {
      _showOcrStatus('PDF loading error', 'error');
    }
  };

  async function _renderPage() {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.5 });
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasWrap.innerHTML = '';
      canvasWrap.appendChild(canvas);
      _setupSelection();
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    pageInfo.textContent = t('ocrPageOf').replace('{0}', currentPage).replace('{1}', pdfDoc.numPages);
    selRect = null;
    const selOverlay = canvasWrap.querySelector('.tools-ocr-sel-overlay');
    if (selOverlay) selOverlay.remove();
  }

  function _setupSelection() {
    canvas.addEventListener('mousedown', e => {
      const rect = canvas.getBoundingClientRect();
      selStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      isSelecting = true;
      let selOverlay = canvasWrap.querySelector('.tools-ocr-sel-overlay');
      if (selOverlay) selOverlay.remove();
    });
    canvas.addEventListener('mousemove', e => {
      if (!isSelecting || !selStart) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const x = Math.min(selStart.x, cx), y = Math.min(selStart.y, cy);
      const w = Math.abs(cx - selStart.x), h = Math.abs(cy - selStart.y);
      let selOverlay = canvasWrap.querySelector('.tools-ocr-sel-overlay');
      if (!selOverlay) {
        selOverlay = document.createElement('div');
        selOverlay.className = 'tools-ocr-sel-overlay';
        canvasWrap.appendChild(selOverlay);
      }
      const canvasRect = canvas.getBoundingClientRect();
      const wrapRect = canvasWrap.getBoundingClientRect();
      const offX = canvasRect.left - wrapRect.left + canvasWrap.scrollLeft;
      const offY = canvasRect.top - wrapRect.top + canvasWrap.scrollTop;
      selOverlay.style.left = (offX + x) + 'px';
      selOverlay.style.top = (offY + y) + 'px';
      selOverlay.style.width = w + 'px';
      selOverlay.style.height = h + 'px';
    });
    canvas.addEventListener('mouseup', e => {
      if (!isSelecting || !selStart) return;
      isSelecting = false;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const x1 = Math.min(selStart.x, cx), y1 = Math.min(selStart.y, cy);
      const x2 = Math.max(selStart.x, cx), y2 = Math.max(selStart.y, cy);
      if (x2 - x1 > 10 && y2 - y1 > 10) {
        selRect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      } else {
        selRect = null;
        const selOverlay = canvasWrap.querySelector('.tools-ocr-sel-overlay');
        if (selOverlay) selOverlay.remove();
      }
    });
  }

  prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; _renderPage(); } };
  nextBtn.onclick = () => { if (pdfDoc && currentPage < pdfDoc.numPages) { currentPage++; _renderPage(); } };

  extractBtn.onclick = async () => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(i => i.str).join(' ').trim();
    if (text.length > 20) {
      resultTa.value = text;
      _showOcrStatus(t('ocrDigitalExtracted'), 'success');
      return;
    }
    await _runOcr(null);
  };

  extractSelBtn.onclick = async () => {
    if (!selRect) { _showOcrStatus(t('ocrNoSelection'), 'info'); return; }
    await _runOcr(selRect);
  };

  async function _runOcr(rect) {
    _showOcrStatus(t('ocrProgress'), 'info');
    progressWrap.style.display = '';
    progressBar.style.width = '0%';

    let imgData;
    if (rect) {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = rect.w;
      tmpCanvas.height = rect.h;
      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      imgData = tmpCanvas.toDataURL('image/png');
    } else {
      imgData = canvas.toDataURL('image/png');
    }

    try {
      if (typeof Tesseract === 'undefined') {
        _showOcrStatus('Loading Tesseract.js...', 'info');
        await _loadScript('js/tesseract.min.js');
      }
      const ocrLang = document.getElementById('ocrLangSelect')?.value || 'ita';
      const worker = await Tesseract.createWorker(ocrLang, 1, {
        workerPath: 'js/tesseract-worker.min.js',
        corePath: 'js/tesseract-core-simd-lstm.wasm.js',
        langPath: 'mod/tessdata',
        logger: m => {
          if (m.status === 'recognizing text') {
            progressBar.style.width = Math.round((m.progress || 0) * 100) + '%';
          }
        }
      });
      const { data } = await worker.recognize(imgData);
      resultTa.value = data.text || '';
      await worker.terminate();
      progressBar.style.width = '100%';
      _showOcrStatus(t('ocrComplete'), 'success');
    } catch (err) {
      _showOcrStatus(t('translateError') + ' ' + (err.message || ''), 'error');
    }
    setTimeout(() => { progressWrap.style.display = 'none'; }, 1500);
  }

  copyBtn.onclick = () => {
    if (resultTa.value) {
      navigator.clipboard.writeText(resultTa.value);
      _showOcrStatus(t('ocrTextCopied'), 'success');
    }
  };

  function _showOcrStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'tools-status ' + (type || 'info');
    statusEl.style.display = '';
    if (type === 'success') setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }
}

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function _initTranslateTab(overlay) {
  const srcTa = document.getElementById('toolsTransSource');
  const resTa = document.getElementById('toolsTransResult');
  const dirSel = document.getElementById('toolsTransDir');
  const transBtn = document.getElementById('toolsTransBtn');
  const copyBtn = document.getElementById('toolsTransCopy');
  const progressWrap = document.getElementById('toolsTransProgress');
  const progressBar = document.getElementById('toolsTransProgressBar');
  const statusEl = document.getElementById('toolsTransStatus');
  const legalEl = document.getElementById('toolsTransLegal');

  transBtn.onclick = async () => {
    const text = srcTa.value.trim();
    if (!text) return;
    const langpair = dirSel.value;

    if (!navigator.onLine) {
      _showTransStatus(t('translateOffline'), 'error');
      return;
    }

    progressWrap.style.display = '';
    progressBar.style.width = '30%';
    _showTransStatus(t('ocrProgress').replace('OCR', ''), 'info');

    try {
      const chunks = _splitText(text, 500);
      let translated = '';
      for (let i = 0; i < chunks.length; i++) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunks[i])}&langpair=${langpair}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.responseStatus === 200 && data.responseData) {
          translated += (i > 0 ? ' ' : '') + data.responseData.translatedText;
        } else {
          translated += (i > 0 ? ' ' : '') + chunks[i];
        }
        progressBar.style.width = Math.round(((i + 1) / chunks.length) * 100) + '%';
      }
      resTa.value = translated;
      _showTransStatus('', 'success');
      statusEl.style.display = 'none';
      await _checkLegalTerms(text, langpair);
    } catch (err) {
      _showTransStatus(t('translateError'), 'error');
    }
    setTimeout(() => { progressWrap.style.display = 'none'; }, 1000);
  };

  copyBtn.onclick = () => {
    if (resTa.value) {
      navigator.clipboard.writeText(resTa.value);
      _showTransStatus(t('translateCopied'), 'success');
    }
  };

  async function _checkLegalTerms(text, langpair) {
    const dict = await _loadLegalDict();
    if (!dict.length) { legalEl.style.display = 'none'; return; }
    const isItToEn = langpair.startsWith('it');
    const srcField = isItToEn ? 'it' : 'en';
    const tgtField = isItToEn ? 'en' : 'it';
    const lower = text.toLowerCase();
    const found = [];
    for (const entry of dict) {
      const term = entry[srcField].toLowerCase();
      if (lower.includes(term) && term.length > 3) {
        found.push(entry);
      }
    }
    found.sort((a, b) => b[srcField].length - a[srcField].length);
    const unique = [];
    const seen = new Set();
    for (const f of found) {
      if (!seen.has(f[srcField].toLowerCase())) {
        seen.add(f[srcField].toLowerCase());
        unique.push(f);
        if (unique.length >= 15) break;
      }
    }
    if (unique.length === 0) { legalEl.style.display = 'none'; return; }
    const areaLabel = (a) => t('dict' + a.charAt(0).toUpperCase() + a.slice(1)) || a;
    legalEl.style.display = '';
    legalEl.innerHTML = `<strong>${t('translateLegalTerms')}</strong>
      <div style="font-size:11px;margin-bottom:4px;color:#666">${t('translateLegalHint')}</div>
      ${unique.map(e => `<div class="term-row">
        <span class="term-orig">${esc(e[srcField])}</span>
        <span class="term-arrow">→</span>
        <span>${esc(e[tgtField])}</span>
        <span class="tools-dict-area" data-area="${e.area}" style="margin-left:6px">${esc(areaLabel(e.area))}</span>
      </div>`).join('')}`;
  }

  function _showTransStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'tools-status ' + (type || 'info');
    statusEl.style.display = msg ? '' : 'none';
    if (type === 'success') setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }
}

function _splitText(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break; }
    let cut = remaining.lastIndexOf('. ', maxLen);
    if (cut < maxLen * 0.3) cut = remaining.lastIndexOf(' ', maxLen);
    if (cut < maxLen * 0.3) cut = maxLen;
    chunks.push(remaining.substring(0, cut + 1));
    remaining = remaining.substring(cut + 1);
  }
  return chunks;
}

/* ============================== */
/* === DEPOSIT PACKAGE SYSTEM === */
/* ============================== */

let _depositSelection = {};
let _depositStep = 1;
let _depositAllData = null;

async function openDepositModal() {
  _depositStep = 1;
  _depositSelection = {};
  _depositAllData = await _collectAllDepositData();

  if (!_depositAllData || _depositAllData.cases.length === 0) {
    alert(t('depositoSelectProc'));
    return;
  }

  _initDepositSelectionAll(true);
  _renderDepositModal();
}

async function _collectAllDepositData() {
  const cases = await DB.getCases();
  const allProcs = [];
  const allDossiers = [];
  const allActs = [];
  const allFacts = [];
  const allCirc = [];
  const allProofs = [];
  const allFactProofRels = [];
  const allFiles = [];
  const allRels = [];
  const allRoles = [];
  const allEntitySubjects = [];
  const allSubjects = await DB.getSubjects();

  for (const c of cases) {
    const caseFiles = await DB.getFilesByCase(c.id);
    allFiles.push(...caseFiles);
    const procs = await DB.getProceedings(c.id);
    for (const p of procs) {
      allProcs.push(p);
      const roles = await DB.getProceedingRoles(p.id);
      allRoles.push(...roles.map(r => ({ ...r, proceedingId: p.id })));
      const eSubjs = await DB.getEntitySubjects('proceeding', p.id);
      allEntitySubjects.push(...eSubjs.map(es => ({ ...es, proceedingId: p.id })));
      const dossiers = await DB.getDossiers(p.id);
      for (const d of dossiers) {
        allDossiers.push(d);
        const acts = await DB.getActs(d.id);
        for (const a of acts) {
          allActs.push(a);
        }
        const facts = await DB.getFactsByDossier(d.id);
        for (const f of facts) {
          allFacts.push(f);
          const circ = await DB.getCircumstances(f.id);
          allCirc.push(...circ);
          const proofs = await DB.getProofs(f.id);
          for (const pr of proofs) {
            if (!allProofs.some(ep => ep.id === pr.id)) {
              allProofs.push(pr);
            }
            allFactProofRels.push({ factId: f.id, proofId: pr.id, relationType: pr.relationType || 'confirms', _relationId: pr._relationId });
          }
          const rels = await DB.getFactActRelations(f.id);
          allRels.push(...rels);
        }
      }
    }
  }

  return { cases, proceedings: allProcs, dossiers: allDossiers, acts: allActs, facts: allFacts, circumstances: allCirc, proofs: allProofs, factProofRelations: allFactProofRels, files: allFiles, factActRelations: allRels, proceedingRoles: allRoles, entitySubjects: allEntitySubjects, subjects: allSubjects };
}

function _initDepositSelectionAll(checked) {
  const d = _depositAllData;
  d.cases.forEach(c => { _depositSelection['case_' + c.id] = checked; });
  d.proceedings.forEach(p => { _depositSelection['proc_' + p.id] = checked; });
  d.dossiers.forEach(ds => { _depositSelection['dossier_' + ds.id] = checked; });
  d.acts.forEach(a => { _depositSelection['act_' + a.id] = checked; });
  d.facts.forEach(f => { _depositSelection['fact_' + f.id] = checked; });
}

function _toggleDepositNode(type, id, checked) {
  const d = _depositAllData;
  if (type === 'case') {
    _depositSelection['case_' + id] = checked;
    const procs = d.proceedings.filter(p => p.caseId === id);
    procs.forEach(p => _toggleDepositNode('proc', p.id, checked));
  } else if (type === 'proc') {
    _depositSelection['proc_' + id] = checked;
    const children = d.proceedings.filter(p => p.parentProceedingId === id);
    children.forEach(cp => _toggleDepositNode('proc', cp.id, checked));
    const dossiers = d.dossiers.filter(ds => ds.proceedingId === id);
    dossiers.forEach(ds => _toggleDepositNode('dossier', ds.id, checked));
  } else if (type === 'dossier') {
    _depositSelection['dossier_' + id] = checked;
    const ds = d.dossiers.find(ds => ds.id === id);
    if (ds) {
      d.facts.filter(f => f.dossierId === id).forEach(f => { _depositSelection['fact_' + f.id] = checked; });
    }
  } else if (type === 'act') {
    _depositSelection['act_' + id] = checked;
  } else if (type === 'fact') {
    _depositSelection['fact_' + id] = checked;
  }
  _updateDepositParentStates();
  _renderDepositTree();
}

function _updateDepositParentStates() {
  const d = _depositAllData;
  for (const p of d.proceedings.filter(pp => !pp.parentProceedingId)) {
    _updateProcParentState(p, d);
  }
  for (const c of d.cases) {
    const procs = d.proceedings.filter(pp => pp.caseId === c.id && !pp.parentProceedingId);
    const anyChecked = procs.some(pp => _depositSelection['proc_' + pp.id]);
    const allChecked = procs.length > 0 && procs.every(pp => _depositSelection['proc_' + pp.id]);
    _depositSelection['case_' + c.id] = allChecked;
  }
}

function _updateProcParentState(p, d) {
  const children = d.proceedings.filter(cp => cp.parentProceedingId === p.id);
  children.forEach(cp => _updateProcParentState(cp, d));
  const dossiers = d.dossiers.filter(ds => ds.proceedingId === p.id);
  for (const ds of dossiers) {
    const dsItems = [];
    d.facts.filter(f => f.dossierId === ds.id).forEach(f => dsItems.push('fact_' + f.id));
    if (dsItems.length > 0) {
      _depositSelection['dossier_' + ds.id] = dsItems.every(k => _depositSelection[k]);
    }
  }
  let allItems = [];
  dossiers.forEach(ds => allItems.push('dossier_' + ds.id));
  children.forEach(cp => allItems.push('proc_' + cp.id));
  if (allItems.length === 0) return;
  const allChecked = allItems.every(k => _depositSelection[k]);
  _depositSelection['proc_' + p.id] = allChecked;
}

function _getDepositEstimatedSize() {
  const d = _depositAllData;
  let totalBytes = 0;
  const selActs = d.acts.filter(a => _depositSelection['act_' + a.id]);
  const selFacts = d.facts.filter(f => _depositSelection['fact_' + f.id]);
  const selActIds = new Set(selActs.map(a => a.id));
  const selFactIds = new Set(selFacts.map(f => f.id));
  const selProofIds = new Set((d.factProofRelations || []).filter(r => selFactIds.has(r.factId)).map(r => r.proofId));

  const selCaseIds = new Set(d.cases.filter(c => _depositSelection['case_' + c.id]).map(c => c.id));
  const selDossierIds = new Set(d.dossiers.filter(ds => _depositSelection['dossier_' + ds.id]).map(ds => ds.id));

  for (const file of d.files) {
    if (file.entityType === 'case' && selCaseIds.has(file.entityId)) totalBytes += file.fileSize || 0;
    else if (file.entityType === 'dossier' && selDossierIds.has(file.entityId)) totalBytes += file.fileSize || 0;
    else if (file.entityType === 'act' && selActIds.has(file.entityId)) totalBytes += file.fileSize || 0;
    else if (file.entityType === 'fact' && selFactIds.has(file.entityId)) totalBytes += file.fileSize || 0;
    else if (file.entityType === 'proof' && selProofIds.has(file.entityId)) totalBytes += file.fileSize || 0;
  }
  return totalBytes;
}

function _formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function _renderDepositModal() {
  let existing = document.getElementById('depositModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'depositModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content deposit-modal">
      <div class="modal-header">
        <h2>${t('depositoTitle')}</h2>
        <button class="modal-close" onclick="document.getElementById('depositModal').remove()">&times;</button>
      </div>
      <div class="deposit-steps">
        <div class="deposit-step ${_depositStep === 1 ? 'active' : ''}" data-step="1">1. ${t('depositoStep1')}</div>
        <div class="deposit-step ${_depositStep === 2 ? 'active' : ''}" data-step="2">2. ${t('depositoStep2')}</div>
      </div>
      <div class="modal-body deposit-body">
        ${_depositStep === 1 ? _renderDepositStep1() : _renderDepositStep2()}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function _renderDepositStep1() {
  const d = _depositAllData;
  const size = _getDepositEstimatedSize();
  let treeHtml = '<div class="deposit-tree" id="depositTree">';
  treeHtml += _buildDepositTree(d);
  treeHtml += '</div>';

  return `
    ${treeHtml}
    <div class="deposit-size-bar">
      <span>${t('depositoEstimatedSize')}: <strong>${_formatFileSize(size)}</strong></span>
    </div>
    <div class="deposit-actions">
      <button class="btn btn-primary" onclick="_depositGoStep2()" data-testid="button-deposit-next">${t('depositoNext')} &rarr;</button>
    </div>
  `;
}

function _buildDepositTree(d) {
  let html = '';
  for (const c of d.cases) {
    const cKey = 'case_' + c.id;
    const cChecked = _depositSelection[cKey] ? 'checked' : '';
    html += `<div class="dep-tree-node dep-level-0">
      <label><input type="checkbox" ${cChecked} onchange="_toggleDepositNode('case', ${c.id}, this.checked)" data-testid="dep-check-case-${c.id}"> <span class="dep-badge dep-badge-case">${t('depositoCase')}</span> ${esc(c.title || c.descriptionIt || '')}</label>`;

    const rootProcs = d.proceedings.filter(p => p.caseId === c.id && !p.parentProceedingId);
    for (const p of rootProcs) {
      html += _buildDepositProcNode(p, d, 1);
    }
    html += '</div>';
  }
  return html;
}

function _buildDepositProcNode(p, d, level) {
  const pKey = 'proc_' + p.id;
  const pChecked = _depositSelection[pKey] ? 'checked' : '';
  const rgInfo = p.rgType ? ` (${p.rgType} ${p.rgNumber || ''})` : '';
  let html = `<div class="dep-tree-node dep-level-${level}">
    <label><input type="checkbox" ${pChecked} onchange="_toggleDepositNode('proc', ${p.id}, this.checked)" data-testid="dep-check-proc-${p.id}"> <span class="dep-badge dep-badge-proc">${t('depositoProceeding')}</span> ${esc(p.title || '')}${esc(rgInfo)}</label>`;

  const childProcs = d.proceedings.filter(cp => cp.parentProceedingId === p.id);
  for (const cp of childProcs) {
    html += _buildDepositProcNode(cp, d, level + 1);
  }

  const dossiers = d.dossiers.filter(ds => ds.proceedingId === p.id);
  for (const ds of dossiers) {
    const dsKey = 'dossier_' + ds.id;
    const dsChecked = _depositSelection[dsKey] ? 'checked' : '';
    html += `<div class="dep-tree-node dep-level-${level + 1} dep-dossier-node">
      <label><input type="checkbox" ${dsChecked} onchange="_toggleDepositNode('dossier', ${ds.id}, this.checked)" data-testid="dep-check-dossier-${ds.id}"> <span class="dep-badge dep-badge-dossier">${t('depositoDossier')}</span> ${esc(ds.title || '')}</label>`;

    const facts = d.facts.filter(f => f.dossierId === ds.id);
    if (facts.length > 0) {
      for (const f of facts) {
        const fKey = 'fact_' + f.id;
        const fChecked = _depositSelection[fKey] ? 'checked' : '';
        const circCount = d.circumstances.filter(ci => ci.factId === f.id).length;
        const proofCount = (d.factProofRelations || []).filter(r => r.factId === f.id).length;
        let extras = [];
        if (circCount > 0) extras.push(`${circCount} ${t('depositoCircumstances')}`);
        if (proofCount > 0) extras.push(`${proofCount} ${t('depositoProofs')}`);
        const extraInfo = extras.length > 0 ? ` <span class="dep-file-info">(${extras.join(', ')})</span>` : '';
        html += `<div class="dep-tree-node dep-level-${level + 2}">
          <label><input type="checkbox" ${fChecked} onchange="_toggleDepositNode('fact', ${f.id}, this.checked)" data-testid="dep-check-fact-${f.id}"> ${esc(f.title || '')}${extraInfo}</label>
        </div>`;
      }
    }

    html += '</div>';
  }
  html += '</div>';
  return html;
}

function _renderDepositTree() {
  const treeEl = document.getElementById('depositTree');
  if (treeEl) {
    treeEl.innerHTML = _buildDepositTree(_depositAllData);
  }
  const sizeBar = document.querySelector('.deposit-size-bar');
  if (sizeBar) {
    const size = _getDepositEstimatedSize();
    sizeBar.innerHTML = `<span>${t('depositoEstimatedSize')}: <strong>${_formatFileSize(size)}</strong></span>`;
  }
}

function _depositGoStep2() {
  const anySelected = Object.values(_depositSelection).some(v => v);
  if (!anySelected) {
    alert(t('depositoNoSelection'));
    return;
  }
  _depositStep = 2;
  _renderDepositModal();
}

function _depositGoStep1() {
  _depositStep = 1;
  _renderDepositModal();
}

function _renderDepositStep2() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="deposit-form">
      <div class="form-group">
        <label>${t('depositoTypeLabel')}</label>
        <div class="deposit-radio-group">
          <label><input type="radio" name="depositoType" value="lawyer" checked onchange="_depositTypeChanged()" data-testid="deposit-type-lawyer"> ${t('depositoTypeLawyer')}</label>
          <label><input type="radio" name="depositoType" value="private" onchange="_depositTypeChanged()" data-testid="deposit-type-private"> ${t('depositoTypePrivate')}</label>
        </div>
      </div>
      <div class="form-group">
        <label>${t('depositoName')}</label>
        <input type="text" id="depositoNameInput" class="form-control" data-testid="deposit-name-input">
      </div>
      <div class="form-group">
        <label>${t('depositoTitle2')}</label>
        <input type="text" id="depositoTitleInput" class="form-control" placeholder="Avv., Sig., Dott." data-testid="deposit-title-input">
      </div>
      <div class="form-group" id="depositoForoGroup">
        <label>${t('depositoForo')}</label>
        <input type="text" id="depositoForoInput" class="form-control" data-testid="deposit-foro-input">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>${t('depositoDate')}</label>
          <input type="date" id="depositoDateInput" class="form-control" value="${today}" data-testid="deposit-date-input">
        </div>
        <div class="form-group">
          <label>${t('depositoPlace')}</label>
          <input type="text" id="depositoPlaceInput" class="form-control" data-testid="deposit-place-input">
        </div>
      </div>
    </div>
    <div class="deposit-actions">
      <button class="btn" onclick="_depositGoStep1()" data-testid="button-deposit-back">&larr; ${t('depositoBack')}</button>
      <button class="btn btn-primary" onclick="_generateDepositPackage()" data-testid="button-deposit-generate">${t('depositoGenerate')}</button>
    </div>
  `;
}

function _depositTypeChanged() {
  const isLawyer = document.querySelector('input[name="depositoType"]:checked')?.value === 'lawyer';
  const foroGroup = document.getElementById('depositoForoGroup');
  if (foroGroup) foroGroup.style.display = isLawyer ? '' : 'none';
}

async function _generateDepositPackage() {
  const d = _depositAllData;
  const depositType = document.querySelector('input[name="depositoType"]:checked')?.value || 'lawyer';
  const depositName = document.getElementById('depositoNameInput')?.value || '';
  const depositTitle = document.getElementById('depositoTitleInput')?.value || '';
  const depositForo = document.getElementById('depositoForoInput')?.value || '';
  const depositDate = document.getElementById('depositoDateInput')?.value || new Date().toISOString().split('T')[0];
  const depositPlace = document.getElementById('depositoPlaceInput')?.value || '';

  if (!depositName.trim()) {
    alert(t('depositoName') + '!');
    return;
  }

  if (!FS_FILES_HANDLE) {
    const ok = confirm(t('depositoNoFsWarning'));
    if (!ok) return;
  }

  const selFactIds = new Set(d.facts.filter(f => _depositSelection['fact_' + f.id]).map(f => f.id));
  const linkedActIds = new Set(d.factActRelations.filter(r => selFactIds.has(r.factId)).map(r => r.actId));
  const selActIds = new Set(d.acts.filter(a => _depositSelection['act_' + a.id] || linkedActIds.has(a.id)).map(a => a.id));
  const selProofIds = new Set((d.factProofRelations || []).filter(r => selFactIds.has(r.factId)).map(r => r.proofId));
  const selProcIds = new Set(d.proceedings.filter(p => _depositSelection['proc_' + p.id]).map(p => p.id));
  const selCaseIds = new Set(d.cases.filter(c => _depositSelection['case_' + c.id]).map(c => c.id));

  const body = document.querySelector('.deposit-body');
  if (body) {
    body.innerHTML = `<div class="deposit-progress">
      <div class="deposit-progress-text">${t('depositoGenerating')}</div>
      <div class="deposit-progress-bar"><div class="deposit-progress-fill" id="depositProgressFill"></div></div>
      <div class="deposit-progress-detail" id="depositProgressDetail"></div>
    </div>`;
  }

  try {
    const zip = new JSZip();
    const fileManifest = [];
    let fileCount = 0;
    const missingFiles = [];

    const selDossierIds = new Set(d.dossiers.filter(ds => {
      const hasActs = d.acts.some(a => a.dossierId === ds.id && selActIds.has(a.id));
      const hasFacts = d.facts.some(f => f.dossierId === ds.id && selFactIds.has(f.id));
      return hasActs || hasFacts;
    }).map(ds => ds.id));

    const relevantFiles = d.files.filter(f => {
      if (f.entityType === 'case' && selCaseIds.has(f.entityId)) return true;
      if ((f.entityType === 'proceeding' || f.entityType === 'proceeding_origin') && selProcIds.has(f.entityId)) return true;
      if (f.entityType === 'dossier' && selDossierIds.has(f.entityId)) return true;
      if (f.entityType === 'act' && selActIds.has(f.entityId)) return true;
      if (f.entityType === 'fact' && selFactIds.has(f.entityId)) return true;
      if (f.entityType === 'proof' && selProofIds.has(f.entityId)) return true;
      return false;
    });

    async function _addFsTreeToZip(dirHandle, zipPrefix, zip, fileManifest, d, detail) {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          try {
            const fileHandle = await dirHandle.getFileHandle(entry.name);
            const file = await fileHandle.getFile();
            const buf = await file.arrayBuffer();
            const filePath = zipPrefix + '/' + entry.name;
            zip.file(filePath, buf);
            fileCount++;
            if (detail) detail.textContent = `${t('depositoProgress')} ${fileCount}: ${entry.name}`;

            let hashHex = '';
            try {
              const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
              hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) { hashHex = 'N/A'; }

            const matchingRec = d.files.find(f => (f.diskFileName === entry.name || f.fileName === entry.name) && f.storagePath && filePath.includes(f.storagePath));
            let entityLabel = '';
            if (matchingRec) {
              if (matchingRec.entityType === 'case') {
                const cs = d.cases.find(c => c.id === matchingRec.entityId);
                entityLabel = (cs ? (cs.title || cs.descriptionIt) : 'Caso') + ' (ID:' + matchingRec.entityId + ')';
              } else if (matchingRec.entityType === 'proceeding' || matchingRec.entityType === 'proceeding_origin') {
                const pr = d.proceedings.find(pp => pp.id === matchingRec.entityId);
                entityLabel = (pr ? (pr.title || 'Procedimento') : 'Procedimento') + ' (ID:' + matchingRec.entityId + ')';
              } else if (matchingRec.entityType === 'dossier') {
                const ds = d.dossiers.find(dd => dd.id === matchingRec.entityId);
                entityLabel = (ds ? ds.title : 'Fascicolo') + ' (ID:' + matchingRec.entityId + ')';
              } else if (matchingRec.entityType === 'act') {
                const act = d.acts.find(a => a.id === matchingRec.entityId);
                entityLabel = (act ? act.title : 'Atto') + ' (ID:' + matchingRec.entityId + ')';
              } else if (matchingRec.entityType === 'fact') {
                const fact = d.facts.find(f => f.id === matchingRec.entityId);
                entityLabel = (fact ? fact.title : 'Fatto') + ' (ID:' + matchingRec.entityId + ')';
              } else if (matchingRec.entityType === 'proof') {
                const proof = d.proofs.find(pr => pr.id === matchingRec.entityId);
                entityLabel = (proof ? proof.title : 'Prova') + ' (ID:' + matchingRec.entityId + ')';
              }
            }

            fileManifest.push({
              num: fileCount,
              fileName: matchingRec ? matchingRec.fileName : entry.name,
              path: filePath,
              entity: entityLabel || filePath,
              entityType: matchingRec ? matchingRec.entityType : '',
              entityId: matchingRec ? matchingRec.entityId : 0,
              size: file.size || 0,
              hash: hashHex,
              date: matchingRec ? (matchingRec.createdAt || '') : ''
            });
          } catch (e) {
            console.warn('Could not read file:', entry.name, e);
          }
        } else if (entry.kind === 'directory') {
          try {
            const subDir = await dirHandle.getDirectoryHandle(entry.name);
            await _addFsTreeToZip(subDir, zipPrefix + '/' + entry.name, zip, fileManifest, d, detail);
          } catch (e) {
            console.warn('Could not read directory:', entry.name, e);
          }
        }
      }
    }

    let allegatiCopied = false;
    if (FS_FILES_HANDLE) {
      try {
        const allegatiDir = await FS_FILES_HANDLE.getDirectoryHandle('allegati');
        const detail = document.getElementById('depositProgressDetail');
        if (detail) detail.textContent = t('depositoProgress') + ' allegati...';
        await _addFsTreeToZip(allegatiDir, 'allegati', zip, fileManifest, d, detail);
        allegatiCopied = true;
      } catch (e) {
        console.log('No allegati folder found in filesystem, falling back to DB records');
      }
    }

    if (!allegatiCopied) {
      const totalFiles = relevantFiles.length;
      for (const fileRec of relevantFiles) {
        fileCount++;
        const detail = document.getElementById('depositProgressDetail');
        if (detail) detail.textContent = `${t('depositoProgress')} ${fileCount}/${totalFiles}: ${fileRec.fileName}`;
        const fill = document.getElementById('depositProgressFill');
        if (fill) fill.style.width = Math.round((fileCount / Math.max(totalFiles, 1)) * 100) + '%';

        let fileData = null;
        let filePath = '';

        if (fileRec.storagePath) {
          filePath = fileRec.storagePath + '/' + (fileRec.diskFileName || fileRec.fileName);
          try {
            const file = await loadPreviewFileFromFS(fileRec);
            if (file) {
              fileData = await file.arrayBuffer();
            }
          } catch (e) {
            console.warn('Could not read file from FS:', fileRec.fileName, e);
          }
        }

        if (!fileData && fileRec.blob) {
          filePath = filePath || ('allegati/' + (fileRec.diskFileName || fileRec.fileName));
          fileData = fileRec.blob;
        }

        if (!fileData && fileRec.id) {
          try {
            const freshRec = await DB.getFile(fileRec.id);
            if (freshRec && freshRec.blob) {
              filePath = filePath || ('allegati/' + (freshRec.diskFileName || freshRec.fileName));
              fileData = freshRec.blob;
            }
          } catch (e) {}
        }

        if (!fileData) {
          missingFiles.push(fileRec.fileName);
        }

        if (fileData) {
          zip.file(filePath, fileData);

          let hashHex = '';
          try {
            const buffer = fileData instanceof ArrayBuffer ? fileData : await new Blob([fileData]).arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          } catch (e) {
            hashHex = 'N/A';
          }

          let entityLabel = fileRec.entityType;
          if (fileRec.entityType === 'case') {
            const cs = d.cases.find(c => c.id === fileRec.entityId);
            entityLabel = (cs ? (cs.title || cs.descriptionIt) : 'Caso') + ' (ID:' + fileRec.entityId + ')';
          } else if (fileRec.entityType === 'proceeding' || fileRec.entityType === 'proceeding_origin') {
            const pr = d.proceedings.find(pp => pp.id === fileRec.entityId);
            entityLabel = (pr ? (pr.title || 'Procedimento') : 'Procedimento') + ' (ID:' + fileRec.entityId + ')';
          } else if (fileRec.entityType === 'dossier') {
            const ds = d.dossiers.find(dd => dd.id === fileRec.entityId);
            entityLabel = (ds ? ds.title : 'Fascicolo') + ' (ID:' + fileRec.entityId + ')';
          } else if (fileRec.entityType === 'act') {
            const act = d.acts.find(a => a.id === fileRec.entityId);
            entityLabel = (act ? act.title : 'Atto') + ' (ID:' + fileRec.entityId + ')';
          } else if (fileRec.entityType === 'fact') {
            const fact = d.facts.find(f => f.id === fileRec.entityId);
            entityLabel = (fact ? fact.title : 'Fatto') + ' (ID:' + fileRec.entityId + ')';
          } else if (fileRec.entityType === 'proof') {
            const proof = d.proofs.find(pr => pr.id === fileRec.entityId);
            entityLabel = (proof ? proof.title : 'Prova') + ' (ID:' + fileRec.entityId + ')';
          }

          fileManifest.push({
            num: fileCount,
            fileName: fileRec.fileName,
            path: filePath,
            entity: entityLabel,
            entityType: fileRec.entityType,
            entityId: fileRec.entityId,
            size: fileRec.fileSize || 0,
            hash: hashHex,
            date: fileRec.createdAt || ''
          });
        }
      }
    }

    const opts = {
      depositType, depositName, depositTitle, depositForo, depositDate, depositPlace,
      selActIds, selFactIds, selProofIds, selProcIds, selCaseIds, fileManifest
    };

    const htmlPages = _generateDepositHTML(d, opts);
    for (const [filename, html] of Object.entries(htmlPages)) {
      zip.file(filename, html);
    }

    const manifestPdf = _genManifestPDF(fileManifest, d, opts);
    zip.file('manifesto_integrita.pdf', manifestPdf);

    const attestPdf = _genAttestPDF(opts);
    zip.file('attestazione_conformita.pdf', attestPdf);

    const listaPdf = _genListaDepositoPDF(d, opts);
    zip.file('lista_deposito.pdf', listaPdf);

    const blob = await zip.generateAsync({ type: 'blob' }, metadata => {
      const fill = document.getElementById('depositProgressFill');
      if (fill) fill.style.width = Math.round(metadata.percent) + '%';
    });

    const firstCase = d.cases.find(c => selCaseIds.has(c.id));
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const zipName = 'Deposito_' + dateStr + '_' + timeStr + '.zip';

    let savedPath = '';
    if (FS_DIR_HANDLE) {
      try {
        const folderName = 'Estratti_per_deposito';
        let depFolder;
        try {
          depFolder = await FS_DIR_HANDLE.getDirectoryHandle(folderName, { create: true });
        } catch (e) {
          depFolder = FS_DIR_HANDLE;
        }
        const fileHandle = await depFolder.getFileHandle(zipName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        savedPath = folderName + '/' + zipName;
      } catch (e) {
        console.warn('Could not save to working folder, falling back to download:', e);
        triggerDownload(new File([blob], zipName, { type: 'application/zip' }), zipName);
      }
    } else {
      triggerDownload(new File([blob], zipName, { type: 'application/zip' }), zipName);
    }

    if (body) {
      let successMsg = savedPath
        ? t('depositoComplete') + '<br><span class="deposit-saved-path">' + t('depositoSavedTo') + ': <strong>' + esc(savedPath) + '</strong></span>'
        : t('depositoComplete');
      if (missingFiles.length > 0) {
        successMsg += `<div class="deposit-warning" style="margin-top:12px;padding:8px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;color:#92400e;font-size:12px;text-align:left">
          <strong>${t('depositoMissingFilesTitle')}</strong> (${missingFiles.length})<br>
          ${missingFiles.map(f => esc(f)).join('<br>')}
        </div>`;
      }
      body.innerHTML = `<div class="deposit-progress">
        <div class="deposit-progress-text deposit-success">${successMsg}</div>
        <div style="text-align:center;margin-top:16px"><button class="btn" onclick="document.getElementById('depositModal').remove()" data-testid="button-deposit-close">${t('close')}</button></div>
      </div>`;
    }
  } catch (e) {
    console.error('Deposit generation error:', e);
    if (body) {
      body.innerHTML = `<div class="deposit-progress">
        <div class="deposit-progress-text deposit-error">${t('depositoError')}: ${esc(e.message)}</div>
        <div style="text-align:center;margin-top:16px"><button class="btn" onclick="document.getElementById('depositModal').remove()" data-testid="button-deposit-error-close">${t('close')}</button></div>
      </div>`;
    }
  }
}

function _generateDepositHTML(d, opts) {
  const { selActIds, selFactIds, selProcIds, selCaseIds, fileManifest } = opts;
  const _e = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const selCases = d.cases.filter(c => selCaseIds.has(c.id));
  const selProcs = d.proceedings.filter(p => selProcIds.has(p.id));

  const pages = [];
  let treeHtml = '';
  let allSubjectsHtml = '';
  let firstSlider = 'dashboard.html';

  const totalProcs = selProcs.length;
  let totalDossiers = 0, totalActs = 0, totalFacts = 0;
  for (const p of selProcs) {
    const dossiers = d.dossiers.filter(ds => ds.proceedingId === p.id);
    totalDossiers += dossiers.length;
    for (const ds of dossiers) {
      totalActs += d.acts.filter(a => a.dossierId === ds.id && opts.selActIds.has(a.id)).length;
      totalFacts += d.facts.filter(f => f.dossierId === ds.id && opts.selFactIds.has(f.id)).length;
    }
  }

  const allEvents = [];
  const tlColors = { penale: '#3b82f6', civile: '#22c55e', esecuzione: '#ef4444', amministrativo: '#eab308', altro: '#8b5cf6' };
  for (const proc of selProcs) {
    const sd = proc.specificData || {};
    const phases = sd.phases || [];
    const caseObj = selCases.find(cc => cc.id === proc.caseId);
    const cTitle = caseObj ? ((currentLang === 'en' && caseObj.titleEn) ? caseObj.titleEn : (caseObj.title || '')) : '';
    for (const ph of phases) {
      for (const ev of (ph.events || [])) {
        if (ev.data || ev.date) {
          allEvents.push({ date: ev.data || ev.date, title: ev.title || ev.tipo || '', procType: proc.type || 'altro', procTitle: proc.title || '', caseTitle: cTitle });
        }
      }
    }
  }
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  let timelineHtml = '';
  if (allEvents.length > 0) {
    const minD = new Date(allEvents[0].date);
    const maxD = new Date(allEvents[allEvents.length - 1].date);
    const totalMs = Math.max(maxD - minD, 86400000);
    const groupedByCase = {};
    for (const ev of allEvents) {
      const key = ev.caseTitle || '?';
      if (!groupedByCase[key]) groupedByCase[key] = {};
      if (!groupedByCase[key][ev.procType]) groupedByCase[key][ev.procType] = [];
      groupedByCase[key][ev.procType].push(ev);
    }
    let lanesHtml = '';
    for (const [caseName, typeGroups] of Object.entries(groupedByCase)) {
      lanesHtml += `<div style="font-size:11px;font-weight:700;color:#64748b;padding:8px 0 2px;text-transform:uppercase;letter-spacing:0.5px">${_e(caseName)}</div>`;
      for (const [tp, events] of Object.entries(typeGroups)) {
        const color = tlColors[tp] || tlColors.altro;
        const lbl = t('timeline' + tp.charAt(0).toUpperCase() + tp.slice(1)) || tp;
        const dots = events.map(ev => {
          const pos = ((new Date(ev.date) - minD) / totalMs) * 100;
          return `<div style="position:absolute;left:${pos}%;top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff" title="${_e(_depFmtDate(ev.date) + ' — ' + (ev.title || ev.procTitle))}"></div>`;
        }).join('');
        lanesHtml += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="width:90px;font-size:11px;color:${color};font-weight:600;flex-shrink:0">${_e(lbl)}</div>
          <div style="flex:1;position:relative;height:20px;background:#f1f5f9;border-radius:3px">
            <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:${color};transform:translateY(-50%)"></div>
            ${dots}
          </div>
        </div>`;
      }
    }
    const minLabel = _depFmtDate(allEvents[0].date);
    const maxLabel = _depFmtDate(allEvents[allEvents.length - 1].date);
    timelineHtml = `<div class="detail-section"><div class="detail-section-header"><h3>${t('globalTimelineTitle')}</h3></div>
      <div style="padding:8px 0">${lanesHtml}
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:4px"><span>${_e(minLabel)}</span><span>${_e(maxLabel)}</span></div>
      </div></div>`;
  }

  let dashContent = `<section class="detail-panel dep-detail-section">
    <div class="detail-header"><h2>${t('dashboardTitle')}</h2></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#7c3aed">${selCases.length}</div><div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.5px">${t('dashboardCases')}</div></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#7c3aed">${totalProcs}</div><div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.5px">${t('dashboardProceedings')}</div></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#7c3aed">${totalActs}</div><div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.5px">${t('dashboardActs')}</div></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#7c3aed">${totalFacts}</div><div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.5px">${t('depositoFacts')}</div></div>
    </div>
    ${timelineHtml}
  </section>`;
  pages.push({ filename: 'dashboard.html', content: dashContent });

  for (const c of selCases) {
    const caseDisplayTitle = (currentLang === 'en' && c.titleEn) ? c.titleEn : (c.title || '');
    const caseFilename = `case_${c.id}.html`;
    treeHtml += `<details class="tree-acc tree-acc-case" open><summary class="tree-acc-summary tree-case-link"><a href="slider/${caseFilename}" target="mainframe" class="tree-link"><span class="tree-badge tree-badge-K">${t('caso')}</span> <span class="tree-link-title">${_e(caseDisplayTitle)}</span></a></summary>`;

    const caseDescr = currentLang === 'it' ? (c.descrIt || '') : (c.descrEn || c.descrIt || '');
    const caseFiles = d.files.filter(f => f.entityType === 'case' && f.entityId === c.id);
    let caseFileHtml = '';
    if (caseFiles.length > 0) {
      caseFileHtml = `<div class="detail-section"><div class="detail-section-header"><h3>${t('docIntroduttivoCaso')}</h3></div><div class="dep-files">`;
      for (const f of caseFiles) {
        const mf = opts.fileManifest.find(m => m.entityType === f.entityType && m.entityId === f.entityId && m.fileName === f.fileName);
        const href = mf ? '../' + mf.path : f.fileName;
        caseFileHtml += `<a href="${_e(href)}" target="_blank" class="dep-file-link">${_e(f.fileName)}</a> `;
      }
      caseFileHtml += '</div></div>';
    }
    pages.push({
      filename: caseFilename,
      content: `<section class="detail-panel dep-detail-section">
        <div class="detail-header"><h2>${_e(caseDisplayTitle)}</h2></div>
        ${caseDescr ? `<div class="detail-field"><div class="detail-field-label">${t('description')}</div><div class="detail-field-value">${_e(caseDescr)}</div></div>` : ''}
        ${caseFileHtml}
      </section>`
    });

    const caseProcs = selProcs.filter(p => p.caseId === c.id && !p.parentProceedingId);
    for (const p of caseProcs) {
      const res = _genDepositProcTree(p, c, d, opts, _e);
      treeHtml += res.tree;
      for (const pg of res.pages) pages.push(pg);
      allSubjectsHtml += res.subjects;
    }
    treeHtml += '</details>';
  }

  const seenSubjIds = new Set();
  const selProcList = d.proceedings.filter(p => selProcIds.has(p.id));
  for (const p of selProcList) {
    const procRoles = d.proceedingRoles.filter(r => r.proceedingId === p.id);
    for (const role of procRoles) {
      const subj = role.subject;
      if (!subj || seenSubjIds.has(subj.id)) continue;
      seenSubjIds.add(subj.id);
      const fullName = (subj.salutation ? subj.salutation + ' ' : '') + (subj.firstName || '') + ' ' + (subj.lastName || '');
      let subjContent = `<section class="detail-panel dep-detail-section">
        <div class="detail-header"><h2>${_e(fullName)}</h2></div>`;
      subjContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('subjectData')}</h3></div>`;
      if (subj.fiscalCode) subjContent += `<div class="detail-field"><div class="detail-field-label">${t('fiscalCode')}</div><div class="detail-field-value">${_e(subj.fiscalCode)}</div></div>`;
      if (subj.birthDate) subjContent += `<div class="detail-field"><div class="detail-field-label">${t('birthDate')}</div><div class="detail-field-value">${_e(subj.birthDate)}</div></div>`;
      if (subj.birthPlace) subjContent += `<div class="detail-field"><div class="detail-field-label">${t('birthPlace')}</div><div class="detail-field-value">${_e(subj.birthPlace)}</div></div>`;
      if (subj.gender) subjContent += `<div class="detail-field"><div class="detail-field-label">${t('gender')}</div><div class="detail-field-value">${_e(t(subj.gender) || subj.gender)}</div></div>`;
      if (subj.address) subjContent += `<div class="detail-field"><div class="detail-field-label">${t('address')}</div><div class="detail-field-value">${_e(subj.address)}</div></div>`;
      if (subj.notes) subjContent += `<div class="detail-field"><div class="detail-field-label">${t('notes')}</div><div class="detail-field-value">${_e(subj.notes)}</div></div>`;
      subjContent += '</div>';
      const subjRoles = d.proceedingRoles.filter(r => r.subjectId === subj.id && selProcIds.has(r.proceedingId));
      if (subjRoles.length > 0) {
        subjContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('proceedingRoles')}</h3></div><div class="proof-links-list">`;
        for (const sr of subjRoles) {
          const proc = d.proceedings.find(pp => pp.id === sr.proceedingId);
          const procTitle = proc ? (proc.title || '') : '';
          const roleLabel = t(sr.roleCode) || sr.roleCode || '';
          subjContent += `<div class="proof-link-item"><a href="proc_${sr.proceedingId}.html">${_e(procTitle)}</a> <span class="tree-badge tree-badge-neutral">${_e(roleLabel)}</span>`;
          if (sr.qualification) subjContent += ` <span style="color:#64748b;font-size:11px">${_e(sr.qualification)}</span>`;
          if (sr.dateFrom) subjContent += ` <span style="color:#94a3b8;font-size:10px">${_e(_depFmtDate(sr.dateFrom))}${sr.dateTo ? ' — ' + _e(_depFmtDate(sr.dateTo)) : ''}</span>`;
          subjContent += '</div>';
        }
        subjContent += '</div></div>';
      }
      subjContent += '</section>';
      pages.push({ filename: `subj_${subj.id}.html`, content: subjContent });
    }
  }

  const css = _getDepositCSS();
  const sliderCss = _getSliderCSS();
  const genDate = new Date().toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const caseTitle = _e(selCases[0]?.title || selCases[0]?.descriptionIt || '');

  const indexHtml = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UX GIUSTIZIA - ${caseTitle}</title>
<style>${css}</style>
</head>
<body>
<header class="dep-header">
  <div class="dep-header-logo"><a href="slider/dashboard.html" target="mainframe" style="color:inherit;text-decoration:none" title="Home">UXG</a></div>
  <div class="dep-header-info">
    <h1>${caseTitle}</h1>
    <p>${t('depositoGenerated')}: ${genDate}</p>
  </div>
  <a href="slider/dashboard.html" target="mainframe" class="dep-header-home" title="Home">&#x2302; Home</a>
</header>
<div class="app-layout">
  <aside class="sidebar-left">
    <div class="sidebar-section">
      <div class="sidebar-section-header"><h3>${t('navTitle')}</h3></div>
      <div class="tree-nav">${treeHtml}</div>
    </div>
  </aside>
  <iframe name="mainframe" class="main-panel" src="slider/${firstSlider}" frameborder="0"></iframe>
  <aside class="sidebar-right">
    <div class="sidebar-section">
      <div class="sidebar-section-header"><h3>${t('depositoSectionSubjects')}</h3></div>
      ${allSubjectsHtml || '<p class="hint">' + t('depositoNoData') + '</p>'}
    </div>
  </aside>
</div>
</body>
</html>`;

  const result = {};
  result['index.html'] = indexHtml;
  for (const pg of pages) {
    result['slider/' + pg.filename] = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
<meta charset="UTF-8">
<style>${sliderCss}</style>
</head>
<body>
<div class="zoom-bar"><a href="${pg.filename}" target="_blank" class="zoom-link" title="Zoom">&#x26F6; Zoom</a></div>
${pg.content}
</body>
</html>`;
  }
  return result;
}

function _depFmtDate(dateStr) {
  if (!dateStr) return '-';
  const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const monKeys = ['monJan','monFeb','monMar','monApr','monMay','monJun','monJul','monAug','monSep','monOct','monNov','monDec'];
  const mon = t(monKeys[d.getMonth()]);
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  if (currentLang === 'en') return `${mon} ${dd}, ${yyyy}`;
  return `${dd} ${mon} ${yyyy}`;
}

function _depDetailField(label, value, _e) {
  return `<div class="detail-field"><div class="detail-field-label">${label}</div><div class="detail-field-value">${_e(value || '-')}</div></div>`;
}

function _depGetPhaseRegLabel(phaseType) {
  const map = { 'fase_procura': 'RGNR', 'fase_gip_fase': 'RG GIP', 'fase_gup': 'RG GUP', 'fase_dibattimento_fase': 'RGT', 'fase_appello_penale': 'RGA', 'fase_cassazione_penale': 'RG Cass.', 'fase_esecuzione_penale': 'SIEP' };
  return map[phaseType] || '';
}

function _depPhaseMagRole(phaseType) {
  const map = { 'fase_procura': 'pm', 'fase_gip_fase': 'gip', 'fase_gup': 'gup', 'fase_dibattimento_fase': 'giudice_dibattimento', 'fase_appello_penale': 'giudice_appello', 'fase_cassazione_penale': 'giudice_cassazione', 'fase_esecuzione_penale': 'magistrato', 'fase_appello_civile': 'giudice_appello', 'fase_cassazione_civile': 'giudice_cassazione' };
  return map[phaseType] || 'magistrato';
}

function _depAccSection(title, fieldsHtml) {
  return `<details class="dep-phase-details"><summary class="dep-phase-summary">${title}</summary><div class="dep-phase-body">${fieldsHtml}</div></details>`;
}

function _genDepositSpecificData(type, sd, d, _e) {
  if (type === 'penale') {
    const isUfficio = sd.origineProc === 'ufficio';
    let html = '';
    if (!isUfficio) {
      if (sd.indagati && sd.indagati.length > 0) {
        const soggettiLabel = t('tabIndagati') + (sd.soggettiTipo === 'ignoti' ? ' — ' + t('soggettiIgnoti') : '');
        let indHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        for (let i = 0; i < sd.indagati.length; i++) {
          const entry = sd.indagati[i];
          const subj = entry.subjectId ? d.subjects.find(s => s.id === entry.subjectId) : null;
          const name = subj ? `${subj.salutation ? subj.salutation + ' ' : ''}${subj.firstName || ''} ${subj.lastName || ''}` : (entry.label || '-');
          let qualLabel = '';
          if (entry.qualitaDi === 'privato_cittadino') qualLabel = t('privatoCittadino');
          else if (entry.roleLabel) { const parts = entry.roleLabel.split(' > '); qualLabel = parts[parts.length - 1].trim(); }
          indHtml += `<div class="dep-indagato-card"><div style="font-weight:600">N.${i + 1} ${_e(name)}</div>${qualLabel ? `<div style="margin-top:2px;font-size:11px;color:#64748b">${_e(qualLabel)}</div>` : ''}</div>`;
        }
        indHtml += '</div>';
        html += `<div class="detail-section"><div class="detail-section-header"><h3>${soggettiLabel}</h3></div>${sd.soggettiTipo === 'ignoti' ? '' : indHtml}</div>`;
      }
      html += `<div class="detail-section"><div class="detail-section-header"><h3>${t('tabOrigineAtto')}</h3></div>
        <div class="detail-grid"><div class="detail-grid-row detail-grid-row-4">
          ${_depDetailField(t('penaleTipoAtto'), sd.tipoAtto ? t(sd.tipoAtto) : '-', _e)}
          ${_depDetailField(t('canaleRicezione'), sd.canaleRicezione ? t(sd.canaleRicezione) : '-', _e)}
          ${_depDetailField(t('dataDeposito'), _depFmtDate(sd.dataDeposito), _e)}
          ${_depDetailField(t('cittaDeposito'), sd.cittaDeposito, _e)}
        </div></div>
      </div>`;
    }
    return html;
  }
  if (type === 'civile') {
    return _depAccSection(t('tabParti'),
        _depDetailField(t('civileTipo'), sd.tipoCivile ? t(sd.tipoCivile) : '-', _e) +
        _depDetailField(t('civileAttore'), sd.attore, _e) +
        _depDetailField(t('civileConvenuto'), sd.convenuto, _e)
      ) +
      _depAccSection(t('tabIstruttoria'),
        _depDetailField(t('civileCTU'), sd.ctu, _e) +
        _depDetailField(t('civileDataCTU'), _depFmtDate(sd.dataCTU), _e) +
        _depDetailField(t('civileArticolo'), sd.articolo, _e)
      ) +
      _depAccSection(t('tabDecisione'),
        _depDetailField(t('civileDecisione'), sd.decisione ? t(sd.decisione) : '-', _e) +
        _depDetailField(t('civileDataPubbl'), _depFmtDate(sd.dataPubbl), _e) +
        _depDetailField(t('civileDataComun'), _depFmtDate(sd.dataComun), _e)
      );
  }
  if (type === 'amministrativo') {
    return _depAccSection(t('tabRicorso'),
        _depDetailField(t('ammTAR'), sd.tar, _e) +
        _depDetailField(t('ammRG'), sd.rgTar, _e) +
        _depDetailField(t('ammTipoRicorso'), sd.tipoRicorso, _e) +
        _depDetailField(t('ammProvvedimento'), sd.provvedimento, _e) +
        _depDetailField(t('ammDataNotifica'), _depFmtDate(sd.dataNotifica), _e)
      ) +
      _depAccSection(t('tabCautelare'),
        _depDetailField(t('ammSospensiva'), sd.sospensiva ? t('si') : t('no'), _e) +
        _depDetailField(t('ammOrdinanzaCaut'), sd.ordinanzaCaut, _e)
      ) +
      _depAccSection(t('tabAppelloAmm'),
        _depDetailField(t('ammAppelloCS'), sd.appelloCS ? t('si') : t('no'), _e)
      );
  }
  if (type === 'esecuzione') {
    return _depAccSection(t('tabPignoramento'),
        _depDetailField(t('eseRGE'), sd.rge, _e) +
        _depDetailField(t('eseTipo'), sd.tipoEse ? t(sd.tipoEse) : '-', _e) +
        _depDetailField(t('esePignoramento'), _depFmtDate(sd.dataPignoramento), _e)
      ) +
      _depAccSection(t('tabSoggetti'),
        _depDetailField(t('eseGiudice'), sd.giudice, _e) +
        _depDetailField(t('eseCreditore'), sd.creditore, _e) +
        _depDetailField(t('eseDebitore'), sd.debitore, _e) +
        _depDetailField(t('eseCustode'), sd.custode, _e) +
        _depDetailField(t('eseDelegato'), sd.delegato, _e)
      ) +
      _depAccSection(t('tabVendita'),
        _depDetailField(t('eseDataAsta'), _depFmtDate(sd.dataAsta), _e) +
        _depDetailField(t('eseStatoVendita'), sd.statoVendita, _e)
      ) +
      _depAccSection(t('tabPerizia'),
        _depDetailField(t('esePerizia'), sd.perizia, _e)
      );
  }
  return '';
}

function _genDepositProcTree(p, c, d, opts, _e) {
  const { selActIds, selFactIds, selProcIds } = opts;
  const sd = p.specificData || {};
  let tree = '';
  const pages = [];
  let subjects = '';

  const procBadge = typeToBadge(p.type, p.specificData?.origineProc);
  tree += `<details class="tree-acc tree-acc-proc" open><summary class="tree-acc-summary"><a href="slider/proc_${p.id}.html" target="mainframe" class="tree-link"><span class="tree-badge ${procBadge.cls}">${_e(procBadge.label)}</span> <span class="tree-link-title">${_e(p.title || '')}</span></a></summary>`;

  let parentProcHdr = '';
  if (p.parentProceedingId) {
    const parentP = d.proceedings.find(pp => pp.id === p.parentProceedingId);
    if (parentP) parentProcHdr = `<div class="proc-header-info-item"><span class="proc-header-info-label">${t('procPadre')}:</span> ${_e(parentP.title || '')}</div>`;
  }

  let procContent = `<section class="detail-panel dep-detail-section">
    <div class="proc-form-header">
      <div class="proc-form-header-title has-title">${_e(p.title || '')}
        ${sd.origineProc === 'integrazione' ? `<div class="proc-form-header-integrazione">${t('origineProc_perIntegrazione')}</div>` : ''}
      </div>
      <div class="proc-form-header-controls">
        ${parentProcHdr}
        <div class="proc-header-info-item"><span class="tree-badge ${procBadge.cls}" style="font-size:11px">${_e(procBadge.label)}</span> ${_e(t(p.type) || p.type || '')}</div>
        ${p.status ? `<div class="proc-header-info-item"><span class="proc-header-status-val">${_e(t(p.status) || p.status || '')}</span></div>` : ''}
        ${p.rgType ? `<div class="proc-header-info-item">${_e(p.rgType)} ${_e(p.rgNumber || '')}/${_e(p.year || '')}</div>` : ''}
      </div>
    </div>`;

  const specificDataHtml = _genDepositSpecificData(p.type, sd, d, _e);
  if (specificDataHtml) procContent += specificDataHtml;

  if (p.luogoFatti || p.citta || p.provincia || p.regione || p.stato) {
    procContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('tabLuogo')}</h3></div>
      <div class="detail-grid"><div class="detail-grid-row detail-grid-row-5">
        <div class="detail-field"><div class="detail-field-label">${t('luogoFatti')}</div><div class="detail-field-value">${_e(p.luogoFatti || '-')}</div></div>
        <div class="detail-field"><div class="detail-field-label">${t('citta')}</div><div class="detail-field-value">${_e(p.citta || '-')}</div></div>
        <div class="detail-field"><div class="detail-field-label">${t('provincia')}</div><div class="detail-field-value">${_e(p.provincia || '-')}</div></div>
        <div class="detail-field"><div class="detail-field-label">${t('regione')}</div><div class="detail-field-value">${_e(p.regione || '-')}</div></div>
        <div class="detail-field"><div class="detail-field-label">${t('stato_geo')}</div><div class="detail-field-value">${_e(p.stato || '-')}</div></div>
      </div></div>
    </div>`;
  }

  if (sd.phases && sd.phases.length > 0) {
    procContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('fasiProcedimentali')}</h3></div>`;
    for (let idx = 0; idx < sd.phases.length; idx++) {
      const phase = sd.phases[idx];
      const phaseLabel = t(phase.tipo) || t(phase.type) || phase.tipo || phase.type || '';
      const regLabel = _depGetPhaseRegLabel(phase.tipo);
      const regNumberLabel = regLabel ? `N. ${regLabel}` : t('phaseRegNumber');
      const magRoleLabel = t('procRole_' + (_depPhaseMagRole(phase.tipo) || 'magistrato'));

      procContent += `<details class="dep-phase-details" open><summary class="dep-phase-summary"><span class="dep-phase-num">F${idx + 1}</span> ${_e(phaseLabel)}</summary><div class="dep-phase-body">`;

      let magDisplay = phase.magistratoPrincipale || '';
      if (magDisplay && phase.magistratoSubjectId) {
        const magSubj = d.subjects.find(s => s.id === phase.magistratoSubjectId);
        if (magSubj && magSubj.salutation) magDisplay = magSubj.salutation + ' ' + magDisplay;
      }

      procContent += `<div class="detail-grid"><div class="detail-grid-row detail-grid-row-6">
        ${_depDetailField(t('phaseOffice'), phase.ufficio, _e)}
        ${_depDetailField(regNumberLabel, phase.numeroRegistro ? phase.numeroRegistro + (phase.anno ? '/' + phase.anno : '') : '-', _e)}
        ${_depDetailField(t('modelloProcura'), phase.modello ? (t(phase.modello + '_short') || t(phase.modello) || phase.modello) : '-', _e)}
        ${_depDetailField(magRoleLabel, magDisplay, _e)}
        ${_depDetailField(t('dataIscrizione'), _depFmtDate(phase.dataIscrizione), _e)}
        ${_depDetailField(t('termineIndagini'), _depFmtDate(phase.termineIndagini), _e)}
      </div></div>`;

      if (phase.altriMagistrati) {
        procContent += `<div class="detail-grid"><div class="detail-grid-row">${_depDetailField(t('phaseOtherMagistrates'), phase.altriMagistrati, _e)}</div></div>`;
      }

      if (phase.tipo === 'fase_procura') {
        const plList = phase.personeLese || [];
        if (plList.length > 0) {
          procContent += `<div class="dep-sub-section"><div class="dep-sub-section-label">${t('personaLesa')}</div>`;
          for (const pl of plList) {
            const subj = pl.subjectId ? d.subjects.find(s => s.id === pl.subjectId) : null;
            const name = subj ? `${subj.salutation ? subj.salutation + ' ' : ''}${subj.firstName || ''} ${subj.lastName || ''}` : (pl.name || '-');
            procContent += `<div style="padding:2px 0">${_e(name)}</div>`;
          }
          procContent += '</div>';
        }

        const irList = phase.indagatiReati || [];
        if (irList.length > 0) {
          procContent += `<div class="dep-sub-section"><div class="dep-sub-section-label">${t('indagatiReatiSection')}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">`;
          for (let i = 0; i < irList.length; i++) {
            const ir = irList[i];
            const subj = ir.subjectId ? d.subjects.find(s => s.id === ir.subjectId) : null;
            const name = subj ? `${subj.salutation ? subj.salutation + ' ' : ''}${subj.firstName || ''} ${subj.lastName || ''}` : '-';
            const reati = (ir.reati || []).filter(r => r).map(r => `<span class="badge badge-outline">${_e(r)}</span>`).join(' ');
            procContent += `<div class="dep-indagato-card"><div style="font-weight:600">N.${i + 1} ${_e(name)}</div>${reati ? `<div style="margin-top:4px">${reati}</div>` : ''}</div>`;
          }
          procContent += '</div></div>';
        }

        const pmEvts = phase.pmEvents || [];
        if (pmEvts.length > 0) {
          procContent += `<div class="dep-sub-section"><div class="dep-sub-section-label">${t('pmEventsSection')}</div>`;
          for (const ev of pmEvts) {
            const tipoLabel = ev.tipo ? (t(ev.tipo) || ev.tipo) : '-';
            const sottoLabel = ev.sottoTipo ? (t(ev.sottoTipo) || ev.sottoTipo) : '-';
            procContent += `<div class="dep-pm-event"><div class="detail-grid"><div class="detail-grid-row detail-grid-row-3">
              ${_depDetailField(t('pmEventDate'), _depFmtDate(ev.date), _e)}
              ${_depDetailField(t('pmTipoIntervento'), tipoLabel, _e)}
              ${_depDetailField(t('pmSottoTipo'), sottoLabel, _e)}
            </div></div>`;
            const evNotes = currentLang === 'en' ? (ev.notesEn || '') : (ev.notes || '');
            if (evNotes) procContent += `${_depDetailField(t('pmEventNotes'), evNotes, _e)}`;
            if (ev.linkedActIds && ev.linkedActIds.length > 0) {
              const actBadges = ev.linkedActIds.map(actId => {
                const act = d.acts.find(a => a.id === actId);
                const label = act ? (act.title || t('act')) : t('act') + ' #' + actId;
                return `<a href="act_${actId}.html" class="badge badge-outline" style="margin:2px;text-decoration:none">${_e(label)}</a>`;
              }).join('');
              procContent += `<div style="margin-top:4px"><span style="font-size:11px;font-weight:600">${t('linkedActs')}:</span> ${actBadges}</div>`;
            }
            procContent += '</div>';
          }
          procContent += '</div>';
        }
      }

      const events = phase.events || phase.eventi || [];
      if (events.length > 0) {
        procContent += '<table class="dep-events-table"><thead><tr><th>' + t('type') + '</th><th>' + t('date') + '</th><th>' + t('notes') + '</th></tr></thead><tbody>';
        for (const ev of events) {
          const evType = ev.tipo || ev.type || '';
          const evSubType = ev.sottoTipo || ev.subType || '';
          const evLabel = (t(evType) || evType) + (evSubType ? ' — ' + (t(evSubType) || evSubType) : '');
          procContent += `<tr><td>${_e(evLabel)}</td><td>${_e(_depFmtDate(ev.data || ev.date || ''))}</td><td>${_e(ev.note || ev.notes || '')}</td></tr>`;
        }
        procContent += '</tbody></table>';
      }

      procContent += '</div></details>';
    }
    procContent += '</div>';
  }

  const procRoles = d.proceedingRoles.filter(r => r.proceedingId === p.id);
  if (procRoles.length > 0) {
    procContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('procRolesTitle')}</h3></div><div class="proof-links-list">`;
    for (const role of procRoles) {
      const subj = role.subject;
      if (!subj) continue;
      const fullName = (subj.salutation ? subj.salutation + ' ' : '') + (subj.firstName || '') + ' ' + (subj.lastName || '');
      const roleLabel = t(role.roleCode) || role.roleCode || '';
      procContent += `<div class="proof-link-item"><a href="subj_${subj.id}.html">${_e(fullName)}</a> <span class="tree-badge tree-badge-neutral">${_e(roleLabel)}</span>`;
      if (role.qualification) procContent += ` <span style="color:#64748b;font-size:11px">${_e(role.qualification)}</span>`;
      if (role.dateFrom) procContent += ` <span style="color:#94a3b8;font-size:10px">${_e(_depFmtDate(role.dateFrom))}${role.dateTo ? ' — ' + _e(_depFmtDate(role.dateTo)) : ''}</span>`;
      procContent += '</div>';
    }
    procContent += '</div></div>';
  }

  const procFileList = d.files.filter(f => (f.entityType === 'proceeding' || f.entityType === 'proceeding_origin') && f.entityId === p.id);
  if (procFileList.length > 0) {
    procContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('fileSection')}</h3></div><div class="dep-files">`;
    for (const f of procFileList) {
      const mf = opts.fileManifest.find(m => m.entityType === f.entityType && m.entityId === f.entityId && m.fileName === f.fileName);
      const href = mf ? '../' + mf.path : f.fileName;
      procContent += `<a href="${_e(href)}" target="_blank" class="dep-file-link">${_e(f.fileName)}</a> `;
    }
    procContent += '</div></div>';
  }
  procContent += '</section>';
  let procSubjects = '';
  const procEntitySubjects = (d.entitySubjects || []).filter(es => es.proceedingId === p.id);
  if (procEntitySubjects.length > 0) {
    const vigCodes = ['procuratoreRepubblica', 'presidenteTribunale', 'presidenteCorteAppello', 'procuratoreGenerale', 'responsabile_vigilanza'];
    const vigLabels = vigCodes.flatMap(rc => [t('procRole_' + rc), I18N.it['procRole_' + rc], I18N.en['procRole_' + rc]].filter(Boolean));
    const isVig = (role) => role && vigLabels.includes(role);
    const vigLinks = procEntitySubjects.filter(l => isVig(l.role));
    const procLinks = procEntitySubjects.filter(l => !isVig(l.role));

    const renderSubjCard = (l) => {
      const subj = l.subject;
      if (!subj) return '';
      const fullName = (subj.salutation ? subj.salutation + ' ' : '') + (subj.firstName || '') + ' ' + (subj.lastName || '');
      return `<a href="slider/subj_${subj.id}.html" target="mainframe" class="subject-card-link"><div class="subject-card">
        <div class="subject-card-name">${_e(fullName)}</div>
        ${l.role ? `<div class="subject-card-role">${_e(l.role)}</div>` : ''}
      </div></a>`;
    };

    procSubjects += `<div class="linked-section-title">${_e(p.title || t('depositoProceeding'))}</div>`;
    if (vigLinks.length > 0) {
      procSubjects += `<div class="linked-section-title" style="font-size:10px;color:#7c3aed">${t('catenaVigilanza')}</div>`;
      procSubjects += vigLinks.map(renderSubjCard).join('');
    }
    if (procLinks.length > 0) {
      procSubjects += `<div class="linked-section-title" style="font-size:10px;color:#7c3aed">${t('soggettiProcessuali')}</div>`;
      procSubjects += procLinks.map(renderSubjCard).join('');
    }
    subjects += `<div class="dep-subj-group">${procSubjects}</div>`;
  }

  pages.push({ filename: `proc_${p.id}.html`, content: procContent, subjects: procSubjects });

  const dossiers = d.dossiers.filter(ds => ds.proceedingId === p.id);
  for (const ds of dossiers) {
    const dsActs = d.acts.filter(a => a.dossierId === ds.id && selActIds.has(a.id));
    const dsFacts = d.facts.filter(f => f.dossierId === ds.id && selFactIds.has(f.id));
    const dossierFiles = d.files.filter(f => f.entityType === 'dossier' && f.entityId === ds.id);

    tree += `<details class="tree-acc tree-acc-dossier" open><summary class="tree-acc-summary tree-dossier-label"><a href="slider/dossier_${ds.id}.html" target="mainframe" class="tree-link tree-link-dossier"><span class="tree-badge tree-badge-F">${t('fascBadge')}</span> <span class="tree-link-title">${_e(ds.title || t('depositoDossier'))}</span></a></summary>`;

    let dossierContent = `<section class="detail-panel dep-detail-section">
      <div class="detail-header"><h2>${_e(ds.title || t('depositoDossier'))}</h2></div>`;
    if (ds.description) dossierContent += `<div class="detail-field"><div class="detail-field-label">${t('description')}</div><div class="detail-field-value">${_e(ds.description)}</div></div>`;
    if (dossierFiles.length > 0) {
      dossierContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('fileSection')}</h3></div><div class="dep-files">`;
      for (const f of dossierFiles) {
        const mf = opts.fileManifest.find(m => m.entityType === f.entityType && m.entityId === f.entityId && m.fileName === f.fileName);
        const href = mf ? '../' + mf.path : f.fileName;
        dossierContent += `<a href="${_e(href)}" target="_blank" class="dep-file-link">${_e(f.fileName)}</a> `;
      }
      dossierContent += '</div></div>';
    }
    if (dsActs.length > 0) {
      dossierContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('depositoActs')} (${dsActs.length})</h3></div><div class="proof-links-list">`;
      for (const a of dsActs) {
        const badgeCls = 'act-badge act-badge-' + (a.type || '');
        dossierContent += `<div class="proof-link-item"><a href="act_${a.id}.html"><span class="${badgeCls}">${_e(actTypeLabel(a.type))}</span>${a.subtype ? ` <span class="tree-badge tree-badge-neutral">${_e(actSubtypeLabel(a.subtype))}</span>` : ''} ${_e(a.title || '')}</a></div>`;
      }
      dossierContent += '</div></div>';
    }
    if (dsFacts.length > 0) {
      dossierContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('depositoFacts')} (${dsFacts.length})</h3></div><div class="proof-links-list">`;
      for (const f of dsFacts) {
        const factRels = d.factActRelations.filter(r => r.factId === f.id);
        const factProofRels = (d.factProofRelations || []).filter(r => r.factId === f.id);
        const factProofs = factProofRels.map(r => { const p = d.proofs.find(pp => pp.id === r.proofId); return p ? { ...p, relationType: r.relationType } : null; }).filter(Boolean);
        const ls = DB.computeLogicalState(factRels, factProofs);
        const lsCls = ls === 'INCOHERENCE' ? 'logic-badge-incoherence' : ls === 'OMISSION' ? 'logic-badge-omission' : ls === 'COHERENT' ? 'logic-badge-coherent' : 'logic-badge-noproofs';
        const lsLbl = ls === 'INCOHERENCE' ? t('factIncoherence') : ls === 'OMISSION' ? t('factOmission') : ls === 'COHERENT' ? t('factCoherent') : t('factNoProofs');
        dossierContent += `<div class="proof-link-item"><a href="fact_${f.id}.html">${_e(f.title || '')}</a> <span class="logic-badge ${lsCls}">${_e(lsLbl)}</span></div>`;
      }
      dossierContent += '</div></div>';
    }
    dossierContent += '</section>';
    pages.push({ filename: `dossier_${ds.id}.html`, content: dossierContent });

    if (dsActs.length > 0) {
      for (const a of dsActs) {
        const badgeCls = 'act-badge act-badge-' + (a.type || '');
        const actRels = d.factActRelations.filter(r => r.actId === a.id);
        const linkedFacts = actRels.filter(r => selFactIds.has(r.factId));

        let actWorstState = null;
        if (actRels.length > 0) {
          actWorstState = 'COHERENT';
          for (const rel of actRels) {
            const relFact = d.facts.find(ff => ff.id === rel.factId);
            if (!relFact) continue;
            const fProofRels = (d.factProofRelations || []).filter(r => r.factId === relFact.id);
            const fProofs = fProofRels.map(r => { const p = d.proofs.find(pp => pp.id === r.proofId); return p ? { ...p, relationType: r.relationType } : null; }).filter(Boolean);
            const fRels = d.factActRelations.filter(r => r.factId === relFact.id);
            const fState = DB.computeLogicalState(fRels, fProofs);
            if (fState === 'INCOHERENCE') { actWorstState = 'INCOHERENCE'; break; }
            if (fState === 'OMISSION' && actWorstState !== 'INCOHERENCE') actWorstState = 'OMISSION';
          }
        }
        const actStateBadgeCls = actWorstState === 'INCOHERENCE' ? 'logic-badge-incoherence' : actWorstState === 'OMISSION' ? 'logic-badge-omission' : actWorstState === 'COHERENT' ? 'logic-badge-coherent' : '';
        const actStateLabel = actWorstState === 'INCOHERENCE' ? t('factIncoherence') : actWorstState === 'OMISSION' ? t('factOmission') : actWorstState === 'COHERENT' ? t('factCoherent') : '';
        const actStateBadge = actWorstState ? `<span class="logic-badge ${actStateBadgeCls}" style="margin-left:8px">${_e(actStateLabel)}</span>` : '';

        let actContent = `<section class="detail-panel dep-detail-section">
          <div class="detail-header"><h2><span class="${badgeCls}">${_e(actTypeLabel(a.type))}</span>${a.subtype ? ` <span class="tree-badge tree-badge-neutral">${_e(actSubtypeLabel(a.subtype))}</span>` : ''} ${_e(a.title || '')}${actStateBadge}</h2></div>`;

        if (a.parentId) {
          const parentAct = d.acts.find(pa => pa.id === a.parentId);
          if (parentAct) actContent += `<div class="detail-field"><div class="detail-field-label">${t('actParent')}</div><div class="detail-field-value">${_e(parentAct.title || '')}</div></div>`;
        }

        const actFiles = d.files.filter(f => f.entityType === 'act' && f.entityId === a.id);
        if (actFiles.length > 0) {
          actContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('fileSection')}</h3></div><div class="dep-files">`;
          for (const f of actFiles) {
            const mf = opts.fileManifest.find(m => m.entityType === f.entityType && m.entityId === f.entityId && m.fileName === f.fileName);
            const href = mf ? '../' + mf.path : f.fileName;
            actContent += `<a href="${_e(href)}" target="_blank" class="dep-file-link">${_e(f.fileName)}</a> `;
          }
          actContent += '</div></div>';
        }

        if (linkedFacts.length > 0) {
          actContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('viewerFactsForAct')}</h3></div><div class="proof-links-list">`;
          for (const rel of linkedFacts) {
            const fact = d.facts.find(f => f.id === rel.factId);
            if (fact) {
              const posLabel = rel.posizioneAtto ? (t('factPos' + rel.posizioneAtto.charAt(0).toUpperCase() + rel.posizioneAtto.slice(1)) || rel.posizioneAtto) : '-';
              actContent += `<div class="proof-link-item"><a href="fact_${fact.id}.html">${_e(fact.title || '')}</a> <span class="tree-badge tree-badge-neutral">${_e(posLabel)}</span></div>`;
            }
          }
          actContent += '</div></div>';
        }
        actContent += '</section>';
        pages.push({ filename: `act_${a.id}.html`, content: actContent, subjects: procSubjects });
      }
    }

    if (dsFacts.length > 0) {
      for (const f of dsFacts) {
        const factRels = d.factActRelations.filter(r => r.factId === f.id);
        const factProofRels2 = (d.factProofRelations || []).filter(r => r.factId === f.id);
        const factProofs = factProofRels2.map(r => { const p = d.proofs.find(pp => pp.id === r.proofId); return p ? { ...p, relationType: r.relationType } : null; }).filter(Boolean);
        const factCirc = d.circumstances.filter(ci => ci.factId === f.id);
        const logicState = DB.computeLogicalState(factRels, factProofs);
        const lsBadgeCls = logicState === 'INCOHERENCE' ? 'logic-badge-incoherence' : logicState === 'OMISSION' ? 'logic-badge-omission' : logicState === 'COHERENT' ? 'logic-badge-coherent' : 'logic-badge-noproofs';
        const lsLabel = logicState === 'INCOHERENCE' ? t('factIncoherence') : logicState === 'OMISSION' ? t('factOmission') : logicState === 'COHERENT' ? t('factCoherent') : t('factNoProofs');

        let factDateStr = '';
        if (f.factDate) { factDateStr = _depFmtDate(f.factDate); if (f.factTime) factDateStr += ' ' + f.factTime; }
        tree += `<div class="tree-leaf tree-fact"><a href="slider/fact_${f.id}.html" target="mainframe" class="tree-link">${_e(f.title || '')}${factDateStr ? ' <span style="font-size:10px;color:#94a3b8">' + _e(factDateStr) + '</span>' : ''} <span class="logic-badge ${lsBadgeCls}">${_e(lsLabel)}</span></a></div>`;

        let factContent = `<section class="detail-panel dep-detail-section">
          <div class="detail-header"><h2>${_e(f.title || '')}</h2><div class="detail-header-actions"><span class="logic-badge ${lsBadgeCls}">${_e(lsLabel)}</span></div></div>`;

        factContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('factSectionId')}</h3></div>`;
        if (f.description) factContent += `<div class="detail-field"><div class="detail-field-label">${t('factDescription')}</div><div class="detail-field-value">${_e(f.description)}</div></div>`;
        if (f.factDate || f.date) factContent += `<div class="detail-field"><div class="detail-field-label">${t('factDate')}</div><div class="detail-field-value">${_e(_depFmtDate(f.factDate || f.date))}${f.factTime ? ' — ' + _e(f.factTime) : ''}</div></div>`;
        if (f.place || f.luogo) factContent += `<div class="detail-field"><div class="detail-field-label">${t('factPlace')}</div><div class="detail-field-value">${_e(f.place || f.luogo)}</div></div>`;
        factContent += '</div>';

        if (factCirc.length > 0) {
          factContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('factSectionCircumstances')}</h3></div><div class="proof-links-list">`;
          for (const ci of factCirc) {
            const typeLabel = ci.tipo ? (t('circumstance' + ci.tipo.charAt(0).toUpperCase() + ci.tipo.slice(1)) || ci.tipo) : (t(ci.type) || ci.type || '');
            factContent += `<div class="proof-link-item"><span class="tree-badge tree-badge-neutral">${_e(typeLabel)}</span> <span>${_e(ci.title || ci.descrizione || ci.description || '')}</span></div>`;
          }
          factContent += '</div></div>';
        }

        if (factProofs.length > 0) {
          factContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('factSectionProofs')}</h3></div><div class="proof-links-list">`;
          for (const pr of factProofs) {
            const relCls = pr.relationType === 'confirms' ? 'tree-badge-confirm' : pr.relationType === 'contradicts' ? 'tree-badge-deny' : 'tree-badge-neutral';
            const relLabel = pr.relationType ? (t('proofRel' + pr.relationType.charAt(0).toUpperCase() + pr.relationType.slice(1)) || pr.relationType) : '';
            factContent += `<div class="proof-link-item"><span class="tree-badge ${relCls}">${_e(relLabel)}</span> <span>${_e(pr.title || '')}</span>`;
            if (pr.notes) factContent += `<div style="font-size:11px;color:#64748b;margin-top:2px">${_e(pr.notes)}</div>`;
            const proofFiles = d.files.filter(pf => pf.entityType === 'proof' && pf.entityId === pr.id);
            if (proofFiles.length > 0) {
              factContent += '<div class="dep-files" style="margin-top:4px">';
              for (const pf of proofFiles) {
                const mf = opts.fileManifest.find(m => m.entityType === pf.entityType && m.entityId === pf.entityId && m.fileName === pf.fileName);
                const href = mf ? '../' + mf.path : pf.fileName;
                factContent += `<a href="${_e(href)}" target="_blank" class="dep-file-link">${_e(pf.fileName)}</a> `;
              }
              factContent += '</div>';
            }
            factContent += '</div>';
          }
          factContent += '</div></div>';
        }

        const linkedActs = factRels.filter(r => selActIds.has(r.actId));
        if (linkedActs.length > 0) {
          factContent += `<div class="detail-section"><div class="detail-section-header"><h3>${t('factSectionPosition')}</h3></div><div class="proof-links-list">`;
          for (const rel of linkedActs) {
            const act = d.acts.find(a => a.id === rel.actId);
            if (act) {
              const posLabel = rel.posizioneAtto ? (t('factPos' + rel.posizioneAtto.charAt(0).toUpperCase() + rel.posizioneAtto.slice(1)) || rel.posizioneAtto) : '-';
              factContent += `<div class="proof-link-item"><a href="act_${act.id}.html">${_e(act.title || '')}</a> <span class="tree-badge tree-badge-neutral">${_e(posLabel)}</span></div>`;
            }
          }
          factContent += '</div></div>';
        }
        factContent += '</section>';
        pages.push({ filename: `fact_${f.id}.html`, content: factContent, subjects: procSubjects });
      }
    }
    tree += '</details>';
  }

  const childProcs = d.proceedings.filter(cp => cp.parentProceedingId === p.id && selProcIds.has(cp.id));
  for (const cp of childProcs) {
    const childRes = _genDepositProcTree(cp, c, d, opts, _e);
    tree += childRes.tree;
    for (const pg of childRes.pages) pages.push(pg);
    subjects += childRes.subjects;
  }

  tree += '</details>';
  return { tree, pages, subjects };
}

function _genStandaloneDocCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #1e293b; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
    .doc-header { border-bottom: 3px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
    .doc-logo { background: #7c3aed; color: #fff; font-weight: 700; font-size: 18px; padding: 6px 12px; border-radius: 6px; }
    .doc-header h1 { font-size: 1.2rem; color: #1e293b; }
    .doc-header p { font-size: 0.85rem; color: #64748b; }
    .doc-note { font-style: italic; color: #64748b; margin-bottom: 20px; font-size: 0.85rem; }
    .doc-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.85rem; }
    .doc-table th, .doc-table td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
    .doc-table thead th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .doc-table tbody tr:nth-child(even) { background: #f8fafc; }
    .doc-hash { font-family: monospace; font-size: 0.7rem; word-break: break-all; color: #64748b; }
    .doc-path { font-family: monospace; font-size: 0.75rem; word-break: break-all; }
    .doc-back { display: inline-block; margin-top: 20px; color: #7c3aed; text-decoration: none; font-size: 0.85rem; }
    .doc-attest-body { border: 2px solid #1e293b; border-radius: 8px; padding: 40px; margin-top: 20px; }
    .doc-attest-text { text-align: justify; line-height: 1.8; margin-bottom: 40px; font-size: 1rem; }
    .doc-attest-fields { display: flex; flex-wrap: wrap; gap: 32px; margin-bottom: 48px; }
    .doc-attest-field { display: flex; gap: 8px; }
    .doc-attest-label { font-weight: 600; color: #64748b; }
    .doc-attest-value { color: #1e293b; }
    .doc-attest-sign { margin-top: 48px; text-align: right; }
    .doc-attest-sign-line { width: 300px; border-bottom: 1px solid #1e293b; margin: 80px 0 8px auto; }
    .doc-attest-sign-name { font-style: italic; color: #64748b; }
    .doc-print-btn { display: none; }
    @media print {
      .doc-print-btn, .doc-back { display: none !important; }
      body { padding: 20px; }
      .doc-header { border-bottom: 3px solid #000; }
      .doc-logo { background: #000; }
      .doc-attest-body { border: 2px solid #000; }
    }
  `;
}

function _genManifestStandaloneHTML(fileManifest, d, opts) {
  const _e = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const selCases = d.cases.filter(c => opts.selCaseIds.has(c.id));
  const caseTitle = selCases[0]?.title || selCases[0]?.descriptionIt || '';
  const genDate = new Date().toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let tableRows = '';
  if (fileManifest.length === 0) {
    tableRows = `<tr><td colspan="5" style="text-align:center;color:#64748b">${t('depositoNoData')}</td></tr>`;
  } else {
    for (const m of fileManifest) {
      tableRows += `<tr>
        <td>${m.num}</td>
        <td>${_e(m.fileName)}</td>
        <td>${_e(m.entity)}</td>
        <td>${_formatFileSize(m.size)}</td>
        <td class="doc-hash">${_e(m.hash)}</td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('depositoManifestTitle')} — ${_e(caseTitle)}</title>
<style>${_genStandaloneDocCSS()}</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-logo">UXG</div>
    <div>
      <h1>${t('depositoManifestTitle')}</h1>
      <p>${_e(caseTitle)} — ${genDate}</p>
    </div>
  </div>

  <p class="doc-note">${t('depositoHashNote')}</p>

  <table class="doc-table">
    <thead><tr>
      <th>${t('depositoManifestNum')}</th>
      <th>${t('depositoManifestFile')}</th>
      <th>${t('depositoManifestEntity')}</th>
      <th>${t('depositoManifestSize')}</th>
      <th>${t('depositoManifestHash')}</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <p style="margin-top:16px;font-size:0.8rem;color:#64748b">${t('depositoManifestTotal')}: <strong>${fileManifest.length}</strong> ${fileManifest.length === 1 ? 'file' : 'files'}</p>

  <a href="index.html" class="doc-back">&larr; ${t('depositoBackToIndex')}</a>
</body>
</html>`;
}

function _genAttestStandaloneHTML(opts) {
  const { depositType, depositName, depositTitle, depositForo, depositDate, depositPlace } = opts;
  const _e = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fullName = (depositTitle ? depositTitle + ' ' : '') + depositName;
  const selCases = _depositAllData.cases.filter(c => opts.selCaseIds.has(c.id));
  const caseTitle = selCases[0]?.title || selCases[0]?.descriptionIt || '';

  let attestText = '';
  if (depositType === 'lawyer') {
    attestText = t('depositoAttestLawyer').replace('{name}', _e(fullName)).replace('{foro}', _e(depositForo));
  } else {
    attestText = t('depositoAttestPrivate').replace('{name}', _e(fullName));
  }

  return `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('depositoAttestTitle')} — ${_e(caseTitle)}</title>
<style>${_genStandaloneDocCSS()}</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-logo">UXG</div>
    <div>
      <h1>${t('depositoAttestTitle')}</h1>
      <p>${_e(caseTitle)}</p>
    </div>
  </div>

  <div class="doc-attest-body">
    <p class="doc-attest-text">${attestText}</p>
    <div class="doc-attest-fields">
      <div class="doc-attest-field">
        <span class="doc-attest-label">${t('depositoAttestPlace')}:</span>
        <span class="doc-attest-value">${_e(depositPlace)}</span>
      </div>
      <div class="doc-attest-field">
        <span class="doc-attest-label">${t('depositoAttestDate')}:</span>
        <span class="doc-attest-value">${_e(depositDate)}</span>
      </div>
    </div>
    <div class="doc-attest-sign">
      <span class="doc-attest-label">${t('depositoAttestSign')}</span>
      <div class="doc-attest-sign-line"></div>
      <span class="doc-attest-sign-name">${_e(fullName)}</span>
    </div>
  </div>

  <a href="index.html" class="doc-back">&larr; ${t('depositoBackToIndex')}</a>
</body>
</html>`;
}

function _genManifestPDF(fileManifest, d, opts) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 15, mr = 15, mt = 15;
  const usable = pw - ml - mr;
  const selCases = d.cases.filter(c => opts.selCaseIds.has(c.id));
  const caseTitle = selCases[0]?.title || selCases[0]?.descriptionIt || '';
  const genDate = new Date().toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('UXG', ml, 11);
  doc.setFontSize(11);
  doc.text(t('depositoManifestTitle'), ml + 18, 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(caseTitle + ' \u2014 ' + genDate, ml + 18, 13);

  let y = 26;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text(t('depositoHashNote'), ml, y);
  y += 8;

  const cols = [
    { label: t('depositoManifestNum'), w: usable * 0.05 },
    { label: t('depositoManifestFile'), w: usable * 0.28 },
    { label: t('depositoManifestEntity'), w: usable * 0.18 },
    { label: t('depositoManifestSize'), w: usable * 0.08 },
    { label: t('depositoManifestHash'), w: usable * 0.41 }
  ];

  function drawHeader(yPos) {
    doc.setFillColor(241, 245, 249);
    doc.rect(ml, yPos - 4, usable, 6, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    let cx = ml + 1;
    for (const col of cols) {
      doc.text(col.label, cx, yPos);
      cx += col.w;
    }
    doc.setFont('helvetica', 'normal');
    return yPos + 5;
  }

  y = drawHeader(y);

  doc.setFontSize(6);
  doc.setTextColor(30, 41, 59);

  for (const m of fileManifest) {
    if (y > ph - 15) {
      doc.addPage();
      y = mt;
      y = drawHeader(y);
      doc.setFontSize(6);
      doc.setTextColor(30, 41, 59);
    }
    let cx = ml + 1;
    const row = [
      String(m.num),
      m.fileName || '',
      m.entity || '',
      _formatFileSize(m.size),
      m.hash || ''
    ];
    for (let i = 0; i < cols.length; i++) {
      const cellW = cols[i].w - 2;
      const lines = doc.splitTextToSize(row[i], cellW);
      doc.text(lines[0] || '', cx, y);
      cx += cols[i].w;
    }
    if ((fileManifest.indexOf(m) % 2) === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(ml, y - 3.2, usable, 4.2, 'F');
      cx = ml + 1;
      for (let i = 0; i < cols.length; i++) {
        const cellW = cols[i].w - 2;
        const lines = doc.splitTextToSize(row[i], cellW);
        doc.text(lines[0] || '', cx, y);
        cx += cols[i].w;
      }
    }
    y += 4.5;
  }

  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(t('depositoManifestTotal') + ': ' + fileManifest.length + (fileManifest.length === 1 ? ' file' : ' files'), ml, y);

  return doc.output('arraybuffer');
}

function _genAttestPDF(opts) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ml = 20, mr = 20;
  const usable = pw - ml - mr;
  const { depositType, depositName, depositTitle, depositForo, depositDate, depositPlace } = opts;
  const fullName = (depositTitle ? depositTitle + ' ' : '') + depositName;
  const selCases = _depositAllData.cases.filter(c => opts.selCaseIds.has(c.id));
  const caseTitle = selCases[0]?.title || selCases[0]?.descriptionIt || '';

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('UXG', ml, 13);
  doc.setFontSize(13);
  doc.text(t('depositoAttestTitle'), ml + 20, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(caseTitle, ml + 20, 16);

  let y = 40;

  let attestText = '';
  if (depositType === 'lawyer') {
    attestText = t('depositoAttestLawyer').replace('{name}', fullName).replace('{foro}', depositForo);
  } else {
    attestText = t('depositoAttestPrivate').replace('{name}', fullName);
  }
  attestText = attestText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(attestText, usable);
  doc.text(lines, ml, y);
  y += lines.length * 5 + 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(t('depositoAttestPlace') + ':', ml, y);
  doc.setFont('helvetica', 'normal');
  doc.text(depositPlace || '', ml + 30, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(t('depositoAttestDate') + ':', ml, y);
  doc.setFont('helvetica', 'normal');
  doc.text(depositDate || '', ml + 30, y);
  y += 25;

  doc.setFont('helvetica', 'bold');
  doc.text(t('depositoAttestSign'), pw - mr - 60, y);
  y += 20;
  doc.setDrawColor(30, 41, 59);
  doc.line(pw - mr - 70, y, pw - mr, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(fullName, pw - mr - 70, y);

  return doc.output('arraybuffer');
}

function _genListaDepositoPDF(d, opts) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 20, mr = 20;
  const usable = pw - ml - mr;
  const { selActIds, selFactIds, selProcIds, selCaseIds } = opts;
  const selCases = d.cases.filter(c => selCaseIds.has(c.id));
  const selProcs = d.proceedings.filter(p => selProcIds.has(p.id));
  const genDate = new Date().toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const caseTitle = selCases[0]?.title || selCases[0]?.descriptionIt || '';

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('UXG', ml, 13);
  doc.setFontSize(13);
  doc.text(t('depositoDocSection'), ml + 20, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(caseTitle + ' \u2014 ' + genDate, ml + 20, 16);

  let y = 32;

  function checkPage(need) {
    if (y + need > ph - 15) { doc.addPage(); y = 20; }
  }

  function printLine(text, indent, bold, fontSize, color) {
    checkPage(6);
    doc.setFontSize(fontSize || 9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color ? color[0] : 30, color ? color[1] : 41, color ? color[2] : 59);
    const x = ml + (indent || 0);
    const lines = doc.splitTextToSize(text, usable - (indent || 0));
    doc.text(lines, x, y);
    y += lines.length * (fontSize ? fontSize * 0.45 : 4) + 1.5;
  }

  for (const c of selCases) {
    const title = (currentLang === 'en' && c.titleEn) ? c.titleEn : (c.title || '');
    printLine(title, 0, true, 11);
    y += 2;

    const caseProcs = selProcs.filter(p => p.caseId === c.id && !p.parentProceedingId);
    for (const p of caseProcs) {
      _printProcTreePDF(doc, d, opts, p, 4, printLine, checkPage);
    }
  }

  y += 6;
  checkPage(20);
  doc.setDrawColor(226, 232, 240);
  doc.line(ml, y, pw - mr, y);
  y += 6;
  printLine(t('depositoSectionManifest') + '  \u2014  manifesto_integrita.pdf', 0, false, 8, [100, 116, 139]);
  printLine(t('depositoSectionAttest') + '  \u2014  attestazione_conformita.pdf', 0, false, 8, [100, 116, 139]);

  return doc.output('arraybuffer');
}

function _printProcTreePDF(doc, d, opts, p, indent, printLine, checkPage) {
  const { selActIds, selFactIds, selProcIds } = opts;
  const typeLabel = t(p.type) || p.type || '';
  printLine('[' + typeLabel + '] ' + (p.title || ''), indent, true, 9);

  const dossiers = d.dossiers.filter(ds => ds.proceedingId === p.id);
  for (const ds of dossiers) {
    const dsActs = d.acts.filter(a => a.dossierId === ds.id && selActIds.has(a.id));
    const dsFacts = d.facts.filter(f => f.dossierId === ds.id && selFactIds.has(f.id));
    if (dsActs.length === 0 && dsFacts.length === 0) continue;

    printLine(ds.title || t('depositoDossier'), indent + 4, false, 8, [71, 85, 105]);

    if (dsActs.length > 0) {
      printLine(t('depositoActs') + ':', indent + 8, false, 7.5, [100, 116, 139]);
      for (const a of dsActs) {
        const actType = t(a.type) || a.type || '';
        printLine('[' + actType + '] ' + (a.title || ''), indent + 12, false, 8);
      }
    }
    if (dsFacts.length > 0) {
      printLine(t('depositoFacts') + ':', indent + 8, false, 7.5, [100, 116, 139]);
      for (const f of dsFacts) {
        const factRels = d.factActRelations.filter(r => r.factId === f.id);
        const factProofRels3 = (d.factProofRelations || []).filter(r => r.factId === f.id);
        const factProofs = factProofRels3.map(r => { const p = d.proofs.find(pp => pp.id === r.proofId); return p ? { ...p, relationType: r.relationType } : null; }).filter(Boolean);
        const logicState = DB.computeLogicalState(factRels, factProofs);
        const lsLabel = logicState === 'INCOHERENCE' ? t('factIncoherence') : logicState === 'OMISSION' ? t('factOmission') : logicState === 'COHERENT' ? t('factCoherent') : t('factNoProofs');
        printLine((f.title || '') + '  [' + lsLabel + ']', indent + 12, false, 8);
      }
    }
  }

  const childProcs = d.proceedings.filter(cp => cp.parentProceedingId === p.id && selProcIds.has(cp.id));
  for (const cp of childProcs) {
    _printProcTreePDF(doc, d, opts, cp, indent + 6, printLine, checkPage);
  }
}

function _getDepositCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #1e293b; background: #f1f5f9; line-height: 1.5; }
    a { color: #7c3aed; text-decoration: none; }

    .dep-header { background: #1e293b; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 10; }
    .dep-header-logo { background: #7c3aed; color: #fff; font-weight: 700; font-size: 18px; padding: 6px 12px; border-radius: 6px; }
    .dep-header-info { flex: 1; }
    .dep-header-info h1 { font-size: 1.1rem; margin-bottom: 2px; font-weight: 600; }
    .dep-header-info p { opacity: 0.6; font-size: 0.8rem; }
    .dep-header-home { color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 6px 14px; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
    .dep-header-home:hover { background: rgba(255,255,255,0.1); }

    .app-layout { display: grid; grid-template-columns: 280px 1fr 240px; min-height: calc(100vh - 56px); }

    .sidebar-left { background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 12px 8px; position: sticky; top: 56px; height: calc(100vh - 56px); overflow-y: auto; }
    .sidebar-right { background: #f8fafc; border-left: 1px solid #e2e8f0; padding: 12px 8px; position: sticky; top: 56px; height: calc(100vh - 56px); overflow-y: auto; }
    .sidebar-section-header h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; }

    .main-panel { border: none; width: 100%; height: 100%; min-height: calc(100vh - 56px); }

    .tree-nav { font-size: 13px; }
    .tree-acc { border: none; margin: 0; padding: 0; }
    .tree-acc-summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 1px 4px; border-radius: 4px; font-size: 12px; position: relative; padding-left: 16px; }
    .tree-acc-summary::-webkit-details-marker { display: none; }
    .tree-acc-summary::marker { display: none; content: ''; }
    .tree-acc-summary::before { content: '\\25B6'; font-size: 8px; color: #94a3b8; position: absolute; left: 2px; top: 50%; transform: translateY(-50%); transition: transform 0.15s; }
    .tree-acc[open] > .tree-acc-summary::before { transform: translateY(-50%) rotate(90deg); }
    .tree-acc > *:not(summary) { padding-left: 12px; }
    .tree-acc-case > .tree-acc-summary { font-weight: 700; font-size: 14px; color: #1e293b; padding: 2px 4px 2px 16px; }
    .tree-acc-proc { margin-top: 1px; }
    .tree-acc-dossier { margin-top: 1px; }
    .tree-dossier-label { color: #64748b; font-size: 12px; font-weight: 600; }
    .tree-link-dossier { font-weight: 600; color: #64748b; }
    .tree-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; padding: 4px 0 2px; }
    .tree-leaf { padding: 1px 0; }
    .tree-act, .tree-fact { padding-left: 4px; }
    .tree-docs { margin-top: 12px; }
    .tree-link { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 4px; color: #334155; text-decoration: none; font-size: 12px; white-space: nowrap; overflow: hidden; }
    .tree-link-title { overflow: hidden; text-overflow: ellipsis; }
    .tree-doc-link { font-weight: 600; color: #7c3aed; }
    .tree-case-link .tree-link { font-weight: 700; font-size: 14px; color: #1e293b; }
    .tree-link-active { background: #ede9fe; color: #7c3aed; font-weight: 600; }

    .tree-badge { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; border: 1px solid; flex-shrink: 0; letter-spacing: 0.05em; }
    .tree-badge-penale { background: #fee2e2; border-color: #f87171; color: #991b1b; }
    .tree-badge-civile { background: #dbeafe; border-color: #60a5fa; color: #1e40af; }
    .tree-badge-esecuzione { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    .tree-badge-amministrativo { background: #d1fae5; border-color: #34d399; color: #065f46; }
    .tree-badge-altro { background: #f3f4f6; border-color: #9ca3af; color: #374151; }
    .tree-badge-P { background: #fee2e2; border-color: #f87171; color: #991b1b; }
    .tree-badge-C { background: #dbeafe; border-color: #60a5fa; color: #1e40af; }
    .tree-badge-confirm { background: #d1fae5; border-color: #34d399; color: #065f46; }
    .tree-badge-deny { background: #fee2e2; border-color: #f87171; color: #991b1b; }
    .tree-badge-neutral { background: #f3f4f6; border-color: #9ca3af; color: #374151; }
    .tree-badge-K { background: #ede9fe; border-color: #a78bfa; color: #5b21b6; }
    .tree-badge-F { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    .tree-badge-warn { background: #fef3c7; border-color: #f59e0b; color: #92400e; }

    .linked-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; padding: 6px 0 4px; margin-top: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 6px; }
    .linked-section-title:first-child { margin-top: 0; }
    .subject-card { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 6px; font-size: 12px; background: #fff; }
    .subject-card-name { font-weight: 600; font-size: 13px; color: #1e293b; }
    .subject-card-role { color: #7c3aed; font-size: 11px; font-weight: 600; margin-top: 2px; }
    .subject-card-qual { color: #64748b; font-size: 11px; margin-top: 1px; }
    .subject-card-dates { color: #94a3b8; font-size: 10px; margin-top: 2px; }

    a.subject-card-link { text-decoration: none; color: inherit; display: block; cursor: pointer; }

    .hint { font-size: 11px; color: #94a3b8; margin-top: 8px; }

    @media (max-width: 900px) {
      .app-layout { grid-template-columns: 1fr; }
      .sidebar-left, .sidebar-right { position: static; height: auto; }
    }
    @media print {
      .sidebar-left, .sidebar-right { display: none; }
      .app-layout { display: block; }
      .dep-header { background: #fff; color: #000; border-bottom: 2px solid #000; position: static; }
      .dep-header-logo { background: #000; }
      .dep-header-home { display: none; }
    }
  `;
}

function _getSliderCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #1e293b; background: #f1f5f9; line-height: 1.5; padding: 24px 32px; }
    a { color: #7c3aed; text-decoration: none; }

    .detail-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; width: 100%; }
    .dep-detail-section { margin-bottom: 20px; }
    .dep-act-panel, .dep-fact-panel { margin-bottom: 12px; padding: 20px; }
    .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; gap: 12px; flex-wrap: wrap; }
    .detail-header h2 { font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .detail-header-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }
    .detail-field { margin-bottom: 16px; }
    .detail-field-label { font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px; text-transform: uppercase; }
    .detail-field-value { font-size: 14px; color: #1e293b; line-height: 1.5; text-align: justify; }
    .detail-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .detail-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; }
    .detail-section-header h3 { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #64748b; text-transform: uppercase; }

    .detail-grid { display: flex; flex-direction: column; gap: 10px; }
    .detail-grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-grid-row.detail-grid-row-3 { grid-template-columns: 1fr 1fr 1fr; }
    .detail-grid-row.detail-grid-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .detail-grid-row.detail-grid-row-5 { grid-template-columns: 1fr 1fr 1fr 1fr 1fr; }
    .detail-grid-row.detail-grid-row-6 { grid-template-columns: 1fr 1fr 1fr 1fr auto auto; }

    .proof-link-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 4px; background: #f8fafc; font-size: 13px; }
    .proof-links-list { margin-top: 8px; }

    .proc-form-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: #1e293b; color: white; border-radius: 6px; margin-bottom: 16px; }
    .proc-form-header-title { font-size: 15px; font-weight: 600; letter-spacing: 0.3px; opacity: 0.8; }
    .proc-form-header-title.has-title { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; opacity: 1; }
    .proc-form-header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .proc-form-header-integrazione { font-size: 11px; opacity: 0.7; margin-top: 2px; }
    .proc-header-info-item { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.13); border: 1px solid rgba(255,255,255,0.25); border-radius: 4px; padding: 4px 10px; font-size: 13px; font-weight: 600; color: white; }
    .proc-header-status-val { text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px; }

    .act-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
    .act-badge-atto { background: #dbeafe; color: #1e40af; }
    .act-badge-smentita { background: #fce7f3; color: #9d174d; }
    .act-badge-prova { background: #d1fae5; color: #065f46; }

    .logic-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }
    .logic-badge-incoherence { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .logic-badge-omission { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
    .logic-badge-coherent { background: #d1fae5; color: #065f46; border: 1px solid #34d399; }
    .logic-badge-noproofs { background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; }

    .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 500; }
    .badge-outline { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }

    .tree-badge { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; border: 1px solid; flex-shrink: 0; letter-spacing: 0.05em; }
    .tree-badge-confirm { background: #d1fae5; border-color: #34d399; color: #065f46; }
    .tree-badge-deny { background: #fee2e2; border-color: #f87171; color: #991b1b; }
    .tree-badge-neutral { background: #f3f4f6; border-color: #9ca3af; color: #374151; }

    .dep-indagato-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; background: #f8fafc; }
    .dep-magistrato { font-size: 0.8rem; color: rgba(255,255,255,0.7); margin-left: 8px; }
    .dep-dossier-header { font-size: 14px; font-weight: 700; color: #475569; margin: 24px 0 8px; padding: 8px 12px; background: #f1f5f9; border-left: 3px solid #64748b; border-radius: 0 4px 4px 0; }

    .dep-phase-details { margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .dep-phase-summary { padding: 10px 14px; background: #f8fafc; cursor: pointer; font-weight: 500; font-size: 13px; }
    .dep-phase-body { padding: 12px 14px; }
    .dep-phase-num { display: inline-block; background: #e2e8f0; color: #334155; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 6px; }
    .dep-sub-section { margin-top: 12px; }
    .dep-sub-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; }
    .dep-pm-event { margin-bottom: 6px; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; }
    .dep-events-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .dep-events-table th { text-align: left; padding: 6px 10px; background: #f1f5f9; font-weight: 600; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
    .dep-events-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }

    .dep-files { margin: 8px 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .dep-file-link { display: inline-block; padding: 4px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; color: #334155; text-decoration: none; font-size: 12px; }

    .zoom-bar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .zoom-link { display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 3px 8px; height: 28px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; color: #7c3aed; font-size: 12px; font-weight: 600; text-decoration: none; }

    @media (max-width: 600px) {
      body { padding: 12px; }
      .detail-grid-row, .detail-grid-row.detail-grid-row-3, .detail-grid-row.detail-grid-row-4, .detail-grid-row.detail-grid-row-5, .detail-grid-row.detail-grid-row-6 { grid-template-columns: 1fr; }
    }
  `;
}

/* === END DEPOSIT PACKAGE SYSTEM === */

function _initTranscribeTab(overlay) {
  if (overlay._transcribeTabInit) return;
  overlay._transcribeTabInit = true;
  const fileInput = document.getElementById('transcribeFileInput');
  if (fileInput) fileInput.addEventListener('change', _handleTranscribeFileLoad);
  const langSel = document.getElementById('transcribeLangSelect');
  if (langSel) langSel.value = currentLang === 'en' ? 'english' : 'italian';
  const insertBtn = document.getElementById('transcribeInsertBtn');
  if (insertBtn) {
    const proofNotesEl = document.getElementById('fProofNotes');
    if (!proofNotesEl) {
      insertBtn.disabled = true;
      insertBtn.title = t('transcribeNoProofOpen');
    }
  }
  _updateWhisperModelStatus();
}

async function _updateWhisperModelStatus() {
  const badge = document.getElementById('whisperModelStatus');
  if (!badge) return;
  const modelKey = document.getElementById('transcribeModelSelect')?.value || 'base';
  const modelMap = { tiny: 'Xenova/whisper-tiny', base: 'Xenova/whisper-base', small: 'Xenova/whisper-small' };
  const modelName = modelMap[modelKey] || modelMap.base;
  try {
    if (modelKey === 'tiny') {
      badge.textContent = t('whisperModelStatusIncluded');
      badge.className = 'whisper-model-badge saved';
      return;
    }
    const saved = await DB.hasModel(modelName);
    let inMod = false;
    if (!saved && FS_DIR_HANDLE) {
      try {
        const modDir = await FS_DIR_HANDLE.getDirectoryHandle('mod');
        const slug = modelName.split('/').pop();
        await modDir.getDirectoryHandle(slug);
        inMod = true;
      } catch (e) {}
    }
    if (saved || inMod) {
      badge.textContent = t('whisperModelStatusSaved');
      badge.className = 'whisper-model-badge saved';
    } else {
      badge.textContent = t('whisperModelStatusNotSaved');
      badge.className = 'whisper-model-badge not-saved';
    }
  } catch (e) {
    badge.textContent = '';
  }
}

