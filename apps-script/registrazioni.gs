/* FireOps - "Gestione ricerca": ricerche aperte e registrazione del personale.
 * Fogli: "DB_Ricerche_Gestione" (ricerche aperte/chiuse) e "DB_Registrazioni" (persone registrate).
 * Da incollare nello stesso progetto Apps Script della Web App usata da Messaggistica, Locator e Info Comandi
 * (quella con URL ...AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec).
 * rispostaJson_() c'e' gia' (utilizzo.gs): non va copiata di nuovo.
 *
 * 1) Dentro doPost(e), dove si smista per "foglio", aggiungere:
 *      if (payload.foglio === "DB_Registrazioni" || payload.foglio === "DB_Ricerche_Gestione") return rispostaJson_(gestioneRicercaPost_(payload));
 *    (payload = JSON.parse(e.postData.contents), come per gli altri fogli)
 * 2) Dentro doGet(e), in cima, aggiungere:
 *      if (e.parameter && (e.parameter.registrazioni || e.parameter.ricercheAperte !== undefined)) return rispostaJson_(gestioneRicercaGet_(e.parameter));
 * 3) Distribuisci di nuovo la Web App ("Gestisci distribuzioni" > modifica > "Nuova versione"), accesso "Chiunque".
 *
 * ID ricerca: stesso formato di Messaggistica (numero intervento a 8 cifre _ anno _ sigla Comando,
 * es. 00000456_2026_ComFC), ma scelto dal coordinatore in Gestione ricerca.
 * Chi apre la ricerca riceve una "chiave" segreta: solo con quella si leggono i registrati
 * (l'ID si indovina facilmente, i nomi e i cellulari no) e si chiude la ricerca.
 * Ci si puo' registrare solo a una ricerca aperta.
 */
const GR_RICERCHE_ = "DB_Ricerche_Gestione";
const GR_RICERCHE_INT_ = ["IdRicerca", "Sigla", "Comando", "Nome", "Chiave", "Stato", "Aperta", "Chiusa"];
const GR_REG_ = "DB_Registrazioni";
const GR_REG_INT_ = ["Ricerca", "Registrata", "Id", "Ente", "Cognome", "Nome", "Qualifica", "Ruolo", "Cellulare", "Specialita", "Note"];
const GR_ID_RE_ = /^[A-Za-z0-9_]{6,40}$/;

function grFoglio_(nome, intestazione) {
  const ss = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c");
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.appendRow(intestazione);
    sh.setFrozenRows(1);
  }
  return sh;
}

function grTesto_(v, max) { return String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").trim().slice(0, max); }
// una formula scritta in un campo non deve diventare una formula nel foglio
function grCella_(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }

function grTrovaRicerca_(sh, id) {
  const dati = sh.getDataRange().getValues();
  for (let i = 1; i < dati.length; i++) if (String(dati[i][0]) === id) return {riga: i + 1, v: dati[i]};
  return null;
}

function gestioneRicercaPost_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.foglio === GR_RICERCHE_) return grRicercaPost_(p);
    return grRegistra_(p);
  } finally {
    lock.releaseLock();
  }
}

// azione "apri": crea o riapre (stessa chiave) | azione "chiudi" | azione "rinomina"
function grRicercaPost_(p) {
  const id = grTesto_(p.id, 40), chiave = grTesto_(p.chiave, 40);
  if (!GR_ID_RE_.test(id) || chiave.length < 12) return {ok: false, errore: "dati mancanti"};
  const sh = grFoglio_(GR_RICERCHE_, GR_RICERCHE_INT_);
  const r = grTrovaRicerca_(sh, id);
  if (r && String(r.v[4]) !== chiave) return {ok: false, errore: "ID gia' usato da un'altra ricerca"};
  const nome = grCella_(grTesto_(p.nome, 80));
  if (p.azione === "apri") {
    if (r) {
      sh.getRange(r.riga, 4).setValue(nome);
      sh.getRange(r.riga, 6, 1, 3).setValues([["aperta", r.v[6] || new Date(), ""]]);
    } else {
      sh.appendRow([id, grTesto_(p.sigla, 12), grCella_(grTesto_(p.comando, 60)), nome, chiave, "aperta", new Date(), ""]);
    }
    return {ok: true};
  }
  if (!r) return {ok: false, errore: "ricerca inesistente"};
  if (p.azione === "chiudi") { sh.getRange(r.riga, 6, 1, 3).setValues([["chiusa", r.v[6], new Date()]]); return {ok: true}; }
  if (p.azione === "rinomina") { sh.getRange(r.riga, 4).setValue(nome); return {ok: true}; }
  return {ok: false, errore: "azione sconosciuta"};
}

function grRegistra_(p) {
  const codice = grTesto_(p.ricerca, 40);
  const id = grTesto_(p.id, 40);
  const cognome = grTesto_(p.cognome, 60);
  if (!GR_ID_RE_.test(codice) || !id || !cognome) return {ok: false, errore: "dati mancanti"};
  const ric = grTrovaRicerca_(grFoglio_(GR_RICERCHE_, GR_RICERCHE_INT_), codice);
  if (!ric || ric.v[5] !== "aperta") return {ok: false, errore: "ricerca chiusa o inesistente"};
  const riga = [codice, new Date(), id, grTesto_(p.ente, 40), cognome, grTesto_(p.nome, 60), grTesto_(p.qual, 60),
    grTesto_(p.ruolo, 60), grTesto_(p.tel, 30), grTesto_((p.spec || []).join ? p.spec.join(",") : p.spec, 80), grTesto_(p.note, 300)];
  for (let i = 3; i < riga.length; i++) riga[i] = grCella_(riga[i]);

  const sh = grFoglio_(GR_REG_, GR_REG_INT_);
  const dati = sh.getDataRange().getValues();
  for (let i = 1; i < dati.length; i++) {
    if (String(dati[i][0]) === codice && String(dati[i][2]) === id) {
      sh.getRange(i + 1, 1, 1, riga.length).setValues([riga]);
      return {ok: true, aggiornata: true};
    }
  }
  sh.appendRow(riga);
  return {ok: true};
}

function gestioneRicercaGet_(q) {
  const shR = grFoglio_(GR_RICERCHE_, GR_RICERCHE_INT_);
  // Ricerche aperte (di un Comando, o una sola per ID): senza chiave, solo ID, nome e Comando
  if (q.ricercheAperte !== undefined) {
    const sigla = grTesto_(q.ricercheAperte, 12).toUpperCase(), solo = grTesto_(q.id, 40);
    const ricerche = shR.getDataRange().getValues().slice(1)
      .filter(r => r[5] === "aperta" && (solo ? String(r[0]) === solo : (!sigla || String(r[1]).toUpperCase() === sigla)))
      .map(r => ({id: String(r[0]), sigla: String(r[1]), comando: String(r[2]), nome: String(r[3]), aperta: r[6] instanceof Date ? r[6].toISOString() : ""}));
    return {ok: true, ricerche: ricerche};
  }
  // Registrati: solo con la chiave della ricerca
  const codice = grTesto_(q.registrazioni, 40);
  const ric = GR_ID_RE_.test(codice) ? grTrovaRicerca_(shR, codice) : null;
  if (!ric || String(ric.v[4]) !== grTesto_(q.chiave, 40)) return {ok: false, errore: "chiave non valida", persone: []};
  const persone = grFoglio_(GR_REG_, GR_REG_INT_).getDataRange().getValues().slice(1)
    .filter(r => String(r[0]) === codice)
    .map(r => ({id: String(r[2]), registrata: r[1] instanceof Date ? r[1].toISOString() : "", ente: String(r[3]), cognome: String(r[4]), nome: String(r[5]),
      qual: String(r[6]), ruolo: String(r[7]), tel: String(r[8]), spec: String(r[9]).split(",").filter(Boolean), note: String(r[10])}));
  return {ok: true, stato: String(ric.v[5]), persone: persone};
}
