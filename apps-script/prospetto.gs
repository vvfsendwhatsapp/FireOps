/* FireOps - "Prospetto disponibilità": turno e salto turno del personale (su PUMA non ci sono).
 * Foglio: "DB_Turni_Personale", una riga per persona (Chiave = cognome|nome|comando, normalizzati).
 * Da incollare nello stesso progetto Apps Script della Web App usata da Messaggistica, Locator e SAR
 * (quella con URL ...AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec).
 * rispostaJson_() c'e' gia' (utilizzo.gs): non va copiata di nuovo.
 *
 * 1) Dentro doPost(e), dove si smista per "foglio", aggiungere:
 *      if (payload.foglio === "DB_Turni_Personale") return rispostaJson_(turniPersonalePost_(payload));
 * 2) Dentro doGet(e), in cima, aggiungere:
 *      if (e.parameter && e.parameter.turniPersonale !== undefined) return rispostaJson_(turniPersonaleGet_(e.parameter));
 * 3) Password: ogni Comando ha la sua, sul foglio "DB_Password_Comandi" (nascosto e protetto: lo modifica solo
 *    il proprietario del file). Per crearlo esegui UNA volta dall'editor la funzione preparaFoglioPassword()
 *    (menu in alto: scegli la funzione e premi "Esegui"): crea il foglio con tutti i Comandi, lo nasconde e lo
 *    protegge. Poi scrivi le password nella colonna B (un Comando senza password non si puo' modificare).
 *    TP_PASSWORD_ qui sotto e' la password GENERALE (vale per tutti i Comandi): lasciala "cambiami" per non averla.
 *    Leggere i turni resta libero; scriverli si puo' solo con la password, che controlla questo script (non la pagina).
 * 4) Distribuisci di nuovo la Web App ("Gestisci distribuzioni" > matita > "Nuova versione"), accesso "Chiunque".
 *
 * Ogni voce ha l'ora dell'ultima modifica (Aggiornato, in ms): vince la piu' recente, quindi piu' PC
 * possono lavorare insieme. Una voce con turno vuoto e' una cancellazione e resta come riga vuota.
 * Per il personale di PUMA nel foglio NON si scrivono cellulare, codice fiscale o email: solo nominativo,
 * comando, turno e salto. Per i nominativi aggiunti a mano (non presenti su PUMA, colonna Manuale = 1)
 * si scrivono anche qualifica, cellulare e corsi, perche' non stanno da nessun'altra parte; Manuale = 0 vuol dire
 * eliminato. ATTENZIONE: come i turni, questi dati si leggono senza password da chi conosce l'indirizzo della Web App.
 */
const TP_FOGLIO_ = "DB_Turni_Personale";
const TP_INT_ = ["Chiave", "Comando", "Cognome", "Nome", "Turno", "Salto", "Aggiornato", "Manuale", "Qualifica", "Cellulare", "Corsi"];
const TP_PASSWORD_ = "cambiami";   // password GENERALE, vale per tutti i Comandi ("cambiami" = nessuna)
const TP_FOGLIO_PWD_ = "DB_Password_Comandi";
const TP_COMANDI_ = ["Agrigento", "Alessandria", "Ancona", "Aosta", "Arezzo", "Ascoli Piceno", "Asti", "Avellino", "Bari", "Barletta-Andria-Trani", "Belluno", "Benevento", "Bergamo", "Biella", "Bologna", "Bolzano", "Brescia", "Brindisi", "Cagliari", "Caltanissetta", "Campobasso", "Caserta", "Catania", "Catanzaro", "Chieti", "Como", "Cosenza", "Cremona", "Crotone", "Cuneo", "Enna", "Fermo", "Ferrara", "Firenze", "Foggia", "Forlì-Cesena", "Frosinone", "Genova", "Gorizia", "Grosseto", "Imperia", "Isernia", "L'Aquila", "La Spezia", "Latina", "Lecce", "Lecco", "Livorno", "Lodi", "Lombardia COR AIB CURNO", "Lucca", "Macerata", "Mantova", "Massa-Carrara", "Matera", "Messina", "Milano", "Modena", "Monza e della Brianza", "Napoli", "Novara", "Nuoro", "Oristano", "Padova", "Palermo", "Parma", "Pavia", "Perugia", "Pesaro e Urbino", "Pescara", "Piacenza", "Pisa", "Pistoia", "Pordenone", "Potenza", "Prato", "Ragusa", "Ravenna", "Reggio Calabria", "Reggio Emilia", "Rieti", "Rimini", "Roma", "Rovigo", "Salerno", "Sassari", "Savona", "Siena", "Siracusa", "Sondrio", "Taranto", "Teramo", "Terni", "Torino", "Trapani", "Trento", "Treviso", "Trieste", "Udine", "Varese", "Venezia", "Verbano-Cusio-Ossola", "Vercelli", "Verona", "Vibo Valentia", "Vicenza", "Viterbo"];
const TP_TURNI_ = ["", "A", "B", "C", "D", "G", "NO"];   // NO = Non Operativo
const TP_SALTI_ = ["", "1", "2", "3", "4", "5", "6", "7", "8"];
const TP_CHIAVE_RE_ = /^[a-z0-9]{1,60}\|[a-z0-9]{0,60}\|[a-z0-9]{0,60}$/;

function tpFoglio_() {
  const ss = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c");
  let sh = ss.getSheetByName(TP_FOGLIO_);
  if (!sh) {
    sh = ss.insertSheet(TP_FOGLIO_);
    sh.appendRow(TP_INT_);
    sh.setFrozenRows(1);
    sh.getRange("A:F").setNumberFormat("@"); sh.getRange("H:K").setNumberFormat("@");   // tutto testo: il salto "4" non diventa un numero
  }
  // foglio creato con la prima versione (7 colonne): si allunga l'intestazione
  const n = sh.getLastColumn();
  if (n < TP_INT_.length) {
    sh.getRange(1, 1, 1, TP_INT_.length).setValues([TP_INT_]);
    sh.getRange("H:K").setNumberFormat("@");   // cellulare come testo
  }
  return sh;
}

function tpTesto_(v, max) {
  const s = String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // niente formule scritte da fuori
}

// GET ?turniPersonale=<comando normalizzato, vuoto = tutti>
function turniPersonaleGet_(q) {
  const comando = String(q.turniPersonale || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
  const dati = tpFoglio_().getDataRange().getDisplayValues();
  const turni = {};
  for (let i = 1; i < dati.length; i++) {
    const r = dati[i], k = r[0];
    if (!k) continue;
    if (comando && k.split("|")[2] !== comando) continue;
    const v = {t: r[4], s: r[5], ts: Number(r[6]) || 0};
    if (r[7] === "1" || r[7] === "0") Object.assign(v, {m: r[7], n: r[2], com: r[1], q: r[8] || "", c: r[9] || "", corsi: r[10] || ""});
    turni[k] = v;
  }
  return {ok: true, turni: turni, ora: Date.now()};
}

// POST {foglio: "DB_Turni_Personale", password, voci: [{k, comando, cognome, nome, t, s, ts}]}
//      {foglio: "DB_Turni_Personale", password, verifica: true}  → controlla solo la password
// stessa normalizzazione della pagina (normComando in prospetto.js): "Comando Forlì-Cesena" -> "forlicesena"
function tpComando_(s) {
  return String(s || "").replace(/^\s*(comando|direzione)\s+(provinciale\s+)?(vvf\s+)?(di\s+)?/i, "")
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 60);
}

// password del Comando dal foglio nascosto (vuota = Comando non abilitato)
function tpPasswordComando_(cn) {
  const sh = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c").getSheetByName(TP_FOGLIO_PWD_);
  if (!sh || !cn) return "";
  const dati = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < dati.length; i++) if (tpComando_(dati[i][0]) === cn) return String(dati[i][1] || "").trim();
  return "";
}

// DA ESEGUIRE UNA VOLTA DALL'EDITOR: crea "DB_Password_Comandi" con tutti i Comandi, lo nasconde e lo protegge
function preparaFoglioPassword() {
  const ss = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c");
  let sh = ss.getSheetByName(TP_FOGLIO_PWD_);
  if (!sh) {
    sh = ss.insertSheet(TP_FOGLIO_PWD_);
    sh.getRange(1, 1, 1, 3).setValues([["Comando", "Password", "Note"]]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange("A:C").setNumberFormat("@");
    sh.getRange(2, 1, TP_COMANDI_.length, 1).setValues(TP_COMANDI_.map(c => [c]));
    sh.autoResizeColumn(1);
  }
  sh.hideSheet();
  // protezione: resta modificabile solo dal proprietario del file
  const prot = sh.protect().setDescription("Password Prospetto disponibilità: solo proprietario");
  const me = Session.getEffectiveUser();
  prot.addEditor(me);
  prot.removeEditors(prot.getEditors().filter(u => u.getEmail() !== me.getEmail()));
  if (prot.canDomainEdit()) prot.setDomainEdit(false);
  return "Foglio " + TP_FOGLIO_PWD_ + " pronto: nascosto e protetto. Scrivi le password nella colonna B.";
}

// POST {foglio: "DB_Turni_Personale", comando, password, voci: [{k, comando, cognome, nome, t, s, ts, ...}]}
//      {foglio: "DB_Turni_Personale", comando, password, verifica: true}  → controlla solo la password
// La password vale per il suo Comando: si scrivono solo le voci di quel Comando (terza parte della chiave).
// La password generale (TP_PASSWORD_) vale per tutti.
function turniPersonalePost_(p) {
  const cn = tpComando_(p.comando), pw = String(p.password || "");
  const generale = TP_PASSWORD_ !== "cambiami" && pw === TP_PASSWORD_;
  const delComando = !!cn && !!pw && pw === tpPasswordComando_(cn);
  if (!generale && !delComando) {
    Utilities.sleep(800);   // rallenta chi prova password a raffica
    if (!cn && TP_PASSWORD_ === "cambiami") return {ok: false, errore: "scegli un Comando"};
    return {ok: false, errore: cn && !tpPasswordComando_(cn) && !generale ? "nessuna password impostata per questo Comando" : "password errata"};
  }
  if (p.verifica) return {ok: true, generale: generale};
  // la stessa persona due volte nello stesso invio: vale la modifica piu' recente
  const unica = {};
  (Array.isArray(p.voci) ? p.voci.slice(0, 1000) : []).forEach(v => {
    const k = String((v && v.k) || "");
    if (!unica[k] || (Number(v.ts) || 0) > (Number(unica[k].ts) || 0)) unica[k] = v;
  });
  const voci = Object.keys(unica).map(k => unica[k]);
  if (!voci.length) return {ok: true, salvati: 0};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = tpFoglio_();
    const dati = sh.getDataRange().getValues();
    const riga = {};
    for (let i = 1; i < dati.length; i++) if (dati[i][0]) riga[String(dati[i][0])] = i + 1;
    let salvati = 0, ignorati = 0;
    const nuove = [];
    voci.forEach(v => {
      const k = String(v.k || "");
      const t = String(v.t || ""), s = (t === "G" || t === "NO") ? "" : String(v.s || "");
      const ts = Math.min(Number(v.ts) || 0, Date.now() + 60000);
      if (!TP_CHIAVE_RE_.test(k) || TP_TURNI_.indexOf(t) < 0 || TP_SALTI_.indexOf(s) < 0 || !ts) { ignorati++; return; }
      if (!generale && k.split("|")[2] !== cn) { ignorati++; return; }   // voce di un altro Comando: non con questa password
      const man = v.m === "1" || v.m === "0" ? v.m : "";
      const valori = [k, tpTesto_(v.comando, 80), tpTesto_(v.cognome, 80), tpTesto_(v.nome, 60), t, s, ts, man,
        man ? tpTesto_(v.q, 20) : "", man ? tpTesto_(String(v.c || "").replace(/[^\d+ ]/g, ""), 20) : "",
        man ? tpTesto_(Array.isArray(v.corsi) ? v.corsi.join(" | ") : v.corsi, 1500) : ""];
      const n = riga[k];
      if (n) {
        if (Number(dati[n - 1][6]) >= ts) { ignorati++; return; }   // sul foglio c'e' gia' una modifica piu' recente
        sh.getRange(n, 1, 1, valori.length).setValues([valori]);
      } else {
        nuove.push(valori);
      }
      salvati++;
    });
    if (nuove.length) sh.getRange(sh.getLastRow() + 1, 1, nuove.length, TP_INT_.length).setValues(nuove);
    return {ok: true, salvati: salvati, ignorati: ignorati};
  } finally {
    lock.releaseLock();
  }
}
