/* FireOps - registro dei Comandi che usano l'app (foglio "DB_Utilizzo").
 * Da incollare nello stesso progetto Apps Script della Web App usata da Messaggistica e Locator
 * (quella con URL ...AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec).
 *
 * 1) Dentro doPost(e), dove si smista per "foglio", aggiungere:
 *      if (payload.foglio === "DB_Utilizzo") { registraUtilizzo_(payload); return rispostaJson_({ok: true}); }
 *    (payload = JSON.parse(e.postData.contents), come per gli altri fogli)
 * 2) Dentro doGet(e), in cima, aggiungere:
 *      if (e.parameter && e.parameter.utilizzo) return rispostaJson_(elencoUtilizzo_(Number(e.parameter.giorni) || 0));
 * 3) Distribuisci di nuovo la Web App ("Nuova versione"), accesso "Chiunque".
 *
 * Il foglio tiene UNA riga per Comando + piattaforma; l'app mostra solo i nomi dei Comandi che hanno fatto login su desktop.
 * Non si registrano nomi di persone ne' indirizzi IP: solo il Comando.
 */
function rispostaJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function registraUtilizzo_(p) {
  const comando = String(p.comando || "").trim().slice(0, 80);
  if (!comando) return;
  const piattaforma = p.piattaforma === "mobile" ? "mobile" : "desktop";
  const versione = String(p.versione || "").slice(0, 40);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c");
    let sh = ss.getSheetByName("DB_Utilizzo");
    if (!sh) {
      sh = ss.insertSheet("DB_Utilizzo");
      sh.appendRow(["Comando", "Piattaforma", "Versione", "UltimoAccesso", "Aperture"]);
    }
    const dati = sh.getDataRange().getValues();
    for (let i = 1; i < dati.length; i++) {
      if (dati[i][0] === comando && dati[i][1] === piattaforma) {
        sh.getRange(i + 1, 3, 1, 3).setValues([[versione, new Date(), Number(dati[i][4] || 0) + 1]]);
        return;
      }
    }
    sh.appendRow([comando, piattaforma, versione, new Date(), 1]);
  } finally {
    lock.releaseLock();
  }
}

// Elenco unico, storico (tutti i Comandi, senza limite di giorni).
// Prima di rispondere completa DB_Utilizzo con i Comandi presenti in DB_ID_Search (Messaggistica)
// che non ci sono ancora: ultimo invio come UltimoAccesso, numero di invii come Aperture, Piattaforma "storico".
function elencoUtilizzo_(giorni) {
  const ss = SpreadsheetApp.openById("1rcBe5m4StM4KAG5YBEK5BLCIkSQBHLkKhaH7b_Qvb3c");
  let sh = ss.getSheetByName("DB_Utilizzo");
  if (!sh) {
    sh = ss.insertSheet("DB_Utilizzo");
    sh.appendRow(["Comando", "Piattaforma", "Versione", "UltimoAccesso", "Aperture"]);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const presenti = {};
    sh.getDataRange().getValues().slice(1).forEach(r => { if (r[0]) presenti[String(r[0]).trim().toLowerCase()] = true; });
    const fm = ss.getSheetByName("DB_ID_Search");
    if (fm) {
      const v = fm.getDataRange().getValues();
      const h = v.shift().map(x => String(x).trim());
      const cT = h.indexOf("Timestamp"), cC = h.indexOf("Comando");
      const agg = {};
      if (cT > -1 && cC > -1) v.forEach(r => {
        const n = String(r[cC] || "").trim();
        if (!n || presenti[n.toLowerCase()]) return;
        const d = aData(r[cT]);
        const a = agg[n] = agg[n] || {ultimo: null, n: 0};
        a.n++;
        if (d && (!a.ultimo || d > a.ultimo)) a.ultimo = d;
      });
      Object.keys(agg).forEach(n => sh.appendRow([n, "storico", "", agg[n].ultimo || new Date(), agg[n].n]));
    }
  } finally {
    lock.releaseLock();
  }
  const limite = giorni > 0 ? Date.now() - giorni * 86400000 : 0;
  const comandi = sh.getDataRange().getValues().slice(1)
    .filter(r => r[0] && r[3] && new Date(r[3]).getTime() >= limite)
    .map(r => ({comando: r[0], piattaforma: r[1], versione: String(r[2]), ultimo: new Date(r[3]).toISOString(), aperture: Number(r[4] || 0)}))
    .sort((a, b) => b.ultimo.localeCompare(a.ultimo));
  return {comandi: comandi};
}
