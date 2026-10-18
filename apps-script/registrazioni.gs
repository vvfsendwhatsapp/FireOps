/* FireOps - registrazione del personale per "Gestione ricerca" (foglio "DB_Registrazioni").
 * Da incollare nello stesso progetto Apps Script della Web App usata da Messaggistica, Locator e Info Comandi
 * (quella con URL ...AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec).
 * rispostaJson_() c'e' gia' (utilizzo.gs): non va copiata di nuovo.
 *
 * 1) Dentro doPost(e), dove si smista per "foglio", aggiungere:
 *      if (payload.foglio === "DB_Registrazioni") return rispostaJson_(registraPersona_(payload));
 *    (payload = JSON.parse(e.postData.contents), come per gli altri fogli)
 * 2) Dentro doGet(e), in cima, aggiungere:
 *      if (e.parameter && e.parameter.registrazioni) return rispostaJson_(elencoRegistrazioni_(e.parameter.registrazioni));
 * 3) Distribuisci di nuovo la Web App ("Gestisci distribuzioni" > modifica > "Nuova versione"), accesso "Chiunque".
 *
 * Ogni ricerca ha un codice casuale (nel QR): chi lo conosce si registra e il coordinatore scarica
 * solo le persone di quel codice. Una persona che si registra due volte (stesso id) aggiorna la sua riga.
 * Le righe piu' vecchie di 30 giorni non vengono piu' restituite.
 */
const REG_FOGLIO_ = "DB_Registrazioni";
const REG_INTESTAZIONE_ = ["Ricerca", "Registrata", "Id", "Ente", "Cognome", "Nome", "Qualifica", "Ruolo", "Cellulare", "Specialita", "Note"];

function foglioRegistrazioni_() {
  const ss = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c");
  let sh = ss.getSheetByName(REG_FOGLIO_);
  if (!sh) {
    sh = ss.insertSheet(REG_FOGLIO_);
    sh.appendRow(REG_INTESTAZIONE_);
    sh.setFrozenRows(1);
  }
  return sh;
}

function regTesto_(v, max) { return String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").trim().slice(0, max); }

function registraPersona_(p) {
  const codice = regTesto_(p.ricerca, 20);
  const id = regTesto_(p.id, 40);
  const cognome = regTesto_(p.cognome, 60);
  if (!/^[A-Za-z0-9]{6,20}$/.test(codice) || !id || !cognome) return {ok: false, errore: "dati mancanti"};
  const riga = [codice, new Date(), id, regTesto_(p.ente, 40), cognome, regTesto_(p.nome, 60), regTesto_(p.qual, 60),
    regTesto_(p.ruolo, 60), regTesto_(p.tel, 30), regTesto_((p.spec || []).join ? p.spec.join(",") : p.spec, 80), regTesto_(p.note, 300)];
  // una formula scritta in un campo non deve diventare una formula nel foglio
  for (let i = 3; i < riga.length; i++) if (/^[=+\-@]/.test(riga[i])) riga[i] = "'" + riga[i];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = foglioRegistrazioni_();
    const dati = sh.getDataRange().getValues();
    for (let i = 1; i < dati.length; i++) {
      if (dati[i][0] === codice && dati[i][2] === id) {
        sh.getRange(i + 1, 1, 1, riga.length).setValues([riga]);
        return {ok: true, aggiornata: true};
      }
    }
    sh.appendRow(riga);
    return {ok: true};
  } finally {
    lock.releaseLock();
  }
}

function elencoRegistrazioni_(codice) {
  codice = regTesto_(codice, 20);
  if (!/^[A-Za-z0-9]{6,20}$/.test(codice)) return {ok: false, persone: []};
  const limite = Date.now() - 30 * 24 * 3600 * 1000;
  const persone = foglioRegistrazioni_().getDataRange().getValues().slice(1)
    .filter(r => r[0] === codice && r[1] instanceof Date && r[1].getTime() >= limite)
    .map(r => ({id: String(r[2]), registrata: r[1].toISOString(), ente: String(r[3]), cognome: String(r[4]), nome: String(r[5]),
      qual: String(r[6]), ruolo: String(r[7]), tel: String(r[8]), spec: String(r[9]).split(",").filter(Boolean), note: String(r[10])}));
  return {ok: true, persone: persone};
}
