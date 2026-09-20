// ==========================================================================
// FireOps VVF — MESSAGGISTICA (messaggistica-bis.js)
//
// Estratto da script-bis.js: messaggio precompilato multilingua (28 lingue),
// link invio coordinate (Con/Senza + locator.html), invio via WhatsApp
// Web/Desktop/Telegram, e il pannello di riepilogo messaggi (24h) con
// mappe Leaflet e incrocio con le posizioni ricevute.
//
// Autonomo rispetto a script-bis.js: non usa variabili della sua closure.
// Ciò che serve da fuori arriva solo da due canali, entrambi già esposti
// prima che questo file venga eseguito (fireops-core.js e la parte iniziale
// di script-bis.js sono sempre caricati prima, nell'ordine di MODULI):
//   - window.FireOps.*        — utilità condivise (combo, orario, turno...)
//   - window.FireOpsComandi   — l'elenco Comandi, popolato da script-bis.js
//   - l'evento "fireops:comando-attivo-cambiato" — per rigenerare il
//     messaggio quando cambia il Comando attivo, invece di essere chiamati
//     direttamente da attivaComando() in un altro file
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const CHIAVE_STORAGE = "fireops_comando_selezionato";

    // ==========================================================
    // PAGINA MESSAGGISTICA: messaggio precompilato multilingua
    // + invio tramite WhatsApp Web, WhatsApp Desktop o Telegram
    // ==========================================================
    const inputPrefissoMsg = document.getElementById("msg-prefisso-input");
    const hiddenPrefissoMsg = document.getElementById("msg-prefisso");
    const dropdownPrefissoMsg = document.getElementById("msg-prefisso-dropdown");

    const inputLinguaMsg = document.getElementById("msg-lingua-input");
    const hiddenLinguaMsg = document.getElementById("msg-lingua");
    const dropdownLinguaMsg = document.getElementById("msg-lingua-dropdown");

    const inputNumeroMsg = document.getElementById("msg-numero");
    const textareaMsg = document.getElementById("msg-testo");
    const btnWhatsappWeb = document.getElementById("btn-whatsapp-web");
    const btnWhatsappApp = document.getElementById("btn-whatsapp-app");
    const btnInviaTelegram = document.getElementById("btn-invia-telegram");
    const btnPulisciCampiMsg = document.getElementById("btn-msg-pulisci-campi");

    // Riferimenti ai combo ricercabili di prefisso/lingua, valorizzati dentro
    // popolaSelectPrefissoMsg/popolaSelectLinguaMsg: servono qui fuori per
    // poterli riportare al valore predefinito dal pulsante "Pulizia Campi".
    let comboPrefissoMsg = null;
    let comboLinguaMsg = null;

    const PREFISSO_PREDEFINITO = "39";  // Italia
    const LINGUA_PREDEFINITA = "it";    // Italiano

    // ==========================================================
    // LINK LOCATOR: sigla comando, ID ricerca, URL completo
    // (per la checkbox "Messaggio con link invio coordinate")
    // ==========================================================
    const chkLinkCoordinate = document.getElementById("msg-chk-link-coordinate");
    const rigaLinkCoordinateEl = document.getElementById("msg-riga-link-coordinate");
    const inputNumeroIntervento = document.getElementById("msg-numero-intervento");
    const selectAnnoIntervento = document.getElementById("msg-anno-intervento");
    const btnLinkCon = document.getElementById("msg-btn-link-con");
    const btnLinkSenza = document.getElementById("msg-btn-link-senza");

    // "Com" + Provincia (letta da comandi.json, non da una tabella a mano)
    function siglaComando(comandoObj) {
        if (!comandoObj || !comandoObj.Provincia) return "";
        return "Com" + String(comandoObj.Provincia).trim().toUpperCase();
    }

    // Prime 3 lettere della prima parola del nome regione + "DR"
    // (Emilia-Romagna -> EMIDR, Veneto e TAA -> VENDR, Friuli Venezia Giulia -> FRIDR)
    function siglaDirezione(nomeDirezione) {
        if (!nomeDirezione) return "";
        const primaParola = String(nomeDirezione).trim().split(/[\s'-]/)[0];
        return primaParola.slice(0, 3).toUpperCase() + "DR";
    }

    function costruisciIdRicerca(numeroIntervento, annoIntervento, sigla) {
        const numeroPad = String(numeroIntervento).replace(/\D/g, "").padStart(6, "0").slice(-6);
        return `${numeroPad}_${annoIntervento}_${sigla}`;
    }

    // URL reale confermato del locator pubblicato su GitHub Pages.
    const URL_BASE_LOCATOR = "https://vvfsendwhatsapp.github.io/FireOps/locator.html";

    function generaLinkLocator(comandoObj, numeroIntervento, annoIntervento, lingua) {
        const sigla = siglaComando(comandoObj);
        const id = costruisciIdRicerca(numeroIntervento, annoIntervento, sigla);
        // "sede" non serve più: il Comando è già nel parametro "comando",
        // non ha senso ripeterlo.
        const parametri = new URLSearchParams({
            id,
            comando: comandoObj.Comando || "",
            lingua: lingua || "it"
        });
        return `${URL_BASE_LOCATOR}?${parametri.toString()}`;
    }

    // Ritorna il solo URL (stringa vuota se la checkbox non è spuntata o
    // mancano dati): la posizione nel messaggio la decide adesso
    // costruisciCorpoMessaggio, non più un semplice testo accodato in coda.
    function rigaLinkCoordinate(comandoObj, lingua) {
        if (!chkLinkCoordinate || !chkLinkCoordinate.checked) return "";
        if (!inputNumeroIntervento || !inputNumeroIntervento.value.trim()) return "";
        if (!comandoObj) return "";

        const anno = selectAnnoIntervento ? selectAnnoIntervento.value : new Date().getFullYear();
        return generaLinkLocator(comandoObj, inputNumeroIntervento.value, anno, lingua);
    }

    function initLinkCoordinateUI() {
        if (!chkLinkCoordinate || !rigaLinkCoordinateEl || !inputNumeroIntervento || !selectAnnoIntervento
            || !btnLinkCon || !btnLinkSenza) return;

        const annoCorrente = new Date().getFullYear();
        selectAnnoIntervento.innerHTML = "";
        [annoCorrente - 1, annoCorrente, annoCorrente + 1].forEach(anno => {
            const opt = document.createElement("option");
            opt.value = anno;
            opt.textContent = anno;
            if (anno === annoCorrente) opt.selected = true;
            selectAnnoIntervento.appendChild(opt);
        });

        // Abilita/disabilita numero e anno intervento in base allo stato "Con/Senza",
        // invece di mostrarli/nasconderli: restano sempre visibili, ma grigi
        // e non interagibili quando è selezionato "Senza".
        function aggiornaAbilitazioneCampi() {
            const attivo = chkLinkCoordinate.checked;
            inputNumeroIntervento.disabled = !attivo;
            selectAnnoIntervento.disabled = !attivo;
            inputNumeroIntervento.style.opacity = attivo ? "1" : ".45";
            selectAnnoIntervento.style.opacity = attivo ? "1" : ".45";
        }

        // Pulsanti "Con"/"Senza" che si alternano: solo uno attivo alla volta.
        // Il checkbox nascosto resta come unica fonte di verità dello stato
        // (lo leggono rigaLinkCoordinate() e validaCampiMessaggistica()),
        // i pulsanti lo pilotano invece di essere pilotati da lui.
        // Il colore rosso/verde del pulsante attivo lo aggiorna
        // validaCampiMessaggistica() (dipende anche da prefisso/numero/
        // lingua, non solo dal numero intervento), quindi qui basta
        // richiamarla: non serve più una funzione di colore separata.
        function impostaLinkCoordinate(attivo) {
            chkLinkCoordinate.checked = attivo;
            btnLinkCon.classList.toggle("attivo", attivo);
            btnLinkSenza.classList.toggle("attivo", !attivo);
            // Ad ogni aggiornamento (in entrambe le direzioni) il numero
            // intervento si pulisce: non deve restare un valore vecchio
            // riferito a un intervento diverso.
            inputNumeroIntervento.value = "";
            aggiornaAbilitazioneCampi();
            validaCampiMessaggistica();
            generaMessaggioMessaggistica();
        }

        btnLinkCon.addEventListener("click", () => impostaLinkCoordinate(true));
        btnLinkSenza.addEventListener("click", () => impostaLinkCoordinate(false));

        inputNumeroIntervento.addEventListener("input", () => {
            inputNumeroIntervento.value = inputNumeroIntervento.value.replace(/\D/g, "").slice(0, 6);
            validaCampiMessaggistica();
            generaMessaggioMessaggistica();
        });

        selectAnnoIntervento.addEventListener("change", generaMessaggioMessaggistica);

        aggiornaAbilitazioneCampi(); // stato iniziale coerente con l'HTML ("Senza" attivo)
        validaCampiMessaggistica(); // colora Con/Senza fin da subito, coerente con gli altri campi
    }
    initLinkCoordinateUI();

    // Pulsante "*" — Pulizia Campi: riporta prefisso, numero e lingua ai
    // valori di partenza. Non tocca la sezione "link invio coordinate"
    // (Con/Senza, numero e anno intervento), che si pulisce da sé a ogni
    // cambio di stato.
    if (btnPulisciCampiMsg) {
        btnPulisciCampiMsg.addEventListener("click", () => {
            if (comboPrefissoMsg) comboPrefissoMsg.impostaValore(PREFISSO_PREDEFINITO);
            if (inputNumeroMsg) inputNumeroMsg.value = "";
            if (comboLinguaMsg) comboLinguaMsg.impostaValore(LINGUA_PREDEFINITA);
            validaCampiMessaggistica();
            generaMessaggioMessaggistica();
        });
    }

    // ==========================================================
    // COMBOBOX RICERCABILE: input di testo + lista filtrata a comparsa,
    // usato per Prefisso internazionale e Lingua messaggio (utile con
    // elenchi lunghi, specialmente su mobile).
    // ==========================================================
    function creaComboRicercabile(opzioni) { return FireOps.creaCombo(opzioni); }

    // Popola il campo ricercabile dei prefissi internazionali (default: 39 - Italia)
    function popolaSelectPrefissoMsg(listaPrefissi) {
        if (!inputPrefissoMsg) return;

        comboPrefissoMsg = creaComboRicercabile({
            input: inputPrefissoMsg,
            hidden: hiddenPrefissoMsg,
            dropdown: dropdownPrefissoMsg,
            elenco: listaPrefissi,
            cercaValore: p => p.Valore,
            mostraTesto: p => p.Prefissi,
            onScelta: validaCampiMessaggistica
        });

        if (listaPrefissi.some(p => p.Valore === PREFISSO_PREDEFINITO)) {
            comboPrefissoMsg.impostaValore(PREFISSO_PREDEFINITO);
        }

        validaCampiMessaggistica();
    }
    window.popolaSelectPrefissoMsg = popolaSelectPrefissoMsg;

    // Popola il campo ricercabile delle lingue disponibili (default: Italiano)
    function popolaSelectLinguaMsg(listaLingue) {
        if (!inputLinguaMsg) return;

        comboLinguaMsg = creaComboRicercabile({
            input: inputLinguaMsg,
            hidden: hiddenLinguaMsg,
            dropdown: dropdownLinguaMsg,
            elenco: listaLingue,
            cercaValore: l => l.code,
            mostraTesto: l => l.lingua,
            onScelta: generaMessaggioMessaggistica
        });

        if (listaLingue.some(l => l.code === LINGUA_PREDEFINITA)) {
            comboLinguaMsg.impostaValore(LINGUA_PREDEFINITA);
        }

        // Alla prima generazione disponibile, genera subito il messaggio
        generaMessaggioMessaggistica();
    }
    window.popolaSelectLinguaMsg = popolaSelectLinguaMsg;
    function aggiornaColoreCampo(el, ok) {
        if (!el) return;
        if (ok) {
            el.style.borderColor = "#4cd94c";
            el.style.boxShadow = "0 0 0 1px #4cd94c";
        } else {
            el.style.borderColor = "";
            el.style.boxShadow = "";
        }
    }

    // Bordo rosso/verde sul pulsante Con/Senza attualmente attivo: verde
    // solo se OGNI campo obbligatorio per quello stato è a posto — prefisso,
    // numero, lingua sempre; numero intervento in più se "Con" è attivo.
    // "tuttiCompilati" (calcolato da validaCampiMessaggistica) è già
    // esattamente questa condizione: con "Senza" attivo numeroInterventoOk
    // vale sempre true, quindi lì basta prefisso+numero+lingua.
    function aggiornaColoreValidazioneLink(tuttiCompilati) {
        if (!chkLinkCoordinate || !btnLinkCon || !btnLinkSenza) return;
        const attivo = chkLinkCoordinate.checked;
        const colore = tuttiCompilati ? "#4cd94c" : "var(--danger-color)";

        const bottoneAttivo = attivo ? btnLinkCon : btnLinkSenza;
        const bottoneInattivo = attivo ? btnLinkSenza : btnLinkCon;

        bottoneAttivo.style.borderColor = colore;
        bottoneAttivo.style.boxShadow = "0 0 0 1px " + colore;
        bottoneInattivo.style.borderColor = "";
        bottoneInattivo.style.boxShadow = "";
    }

    function validaCampiMessaggistica() {
        const prefissoOk = !!(hiddenPrefissoMsg && hiddenPrefissoMsg.value);
        const numeroOk = !!(inputNumeroMsg && inputNumeroMsg.value.trim());
        const linguaOk = !!(hiddenLinguaMsg && hiddenLinguaMsg.value);

        // Numero intervento obbligatorio solo se "link coordinate" è spuntato
        const linkRichiesto = !!(chkLinkCoordinate && chkLinkCoordinate.checked);
        const numeroInterventoOk = !linkRichiesto || !!(inputNumeroIntervento && inputNumeroIntervento.value.trim());

        if (inputPrefissoMsg) inputPrefissoMsg.classList.toggle("campo-mancante", !prefissoOk);
        if (inputNumeroMsg) inputNumeroMsg.classList.toggle("campo-mancante", !numeroOk);
        if (inputLinguaMsg) inputLinguaMsg.classList.toggle("campo-mancante", !linguaOk);
        if (inputNumeroIntervento) inputNumeroIntervento.classList.toggle("campo-mancante", linkRichiesto && !numeroInterventoOk);

        aggiornaColoreCampo(inputPrefissoMsg, prefissoOk);
        aggiornaColoreCampo(inputNumeroMsg, numeroOk);
        aggiornaColoreCampo(inputLinguaMsg, linguaOk);

        const tuttiCompilati = prefissoOk && numeroOk && linguaOk && numeroInterventoOk;
        aggiornaColoreValidazioneLink(tuttiCompilati);
        [btnWhatsappWeb, btnWhatsappApp, btnInviaTelegram].forEach(btn => {
            if (btn) btn.disabled = !tuttiCompilati;
        });

        return { prefissoOk, numeroOk, linguaOk, numeroInterventoOk, tuttiCompilati };
    }
    window.validaCampiMessaggistica = validaCampiMessaggistica;

    if (inputNumeroMsg) {
        inputNumeroMsg.addEventListener("input", validaCampiMessaggistica);
    }

    // Testi del messaggio tradotti (solo il corpo istruttivo: il footer con
    // data/ora/turno resta sempre in italiano, essendo un dato operativo).
    // Lingue non presenti in questo elenco ricadono automaticamente sull'italiano.
    const TRADUZIONI_MESSAGGIO = {
        it: `🚒 *Vigili del Fuoco {{COMANDO}}* 🚒

Messaggio generato automaticamente.

Utilizzi questo numero per inviarci posizione, foto, video o altre informazioni dell'evento che ci ha comunicato.

*QUESTO NON È UN NUMERO PER LE EMERGENZE*
e NON lo utilizzi per altri scopi o in altre occasioni senza la nostra autorizzazione.

Per tutte le richieste di soccorso chiami il
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Per l'invio delle coordinate:
1. Clicchi sulla "graffetta" (Android) 📎 o sul "più" (Apple) ➕
2. Clicchi su "Posizione" ⛳
3. Se necessario segua le indicazioni del dispositivo per consentire a WhatsApp di accedere alla posizione 🆗️
4. Attenda qualche istante per aumentare la precisione ⏰
5. Clicchi su "Posizione attuale" 🎯

*Rimanga al sicuro, nella posizione che ci ha condiviso e lasci libera la linea telefonica.*`,

        en: `🚒 *Fire Brigade {{COMANDO}}* 🚒

Automatically generated message.

Please use this number to send us your location, photos, videos, or other information about the incident you reported.

*THIS IS NOT AN EMERGENCY NUMBER*
and DO NOT use it for any other purpose or occasion without our permission.

For all emergency requests, call
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

To send coordinates:
1. Click on the "paperclip" (Android) 📎 or the "plus" (Apple) ➕
2. Click on "Location" ⛳
3. If necessary, follow the device's prompts to allow WhatsApp to access your location 🆗️
4. Wait a few moments to increase accuracy ⏰
5. Click on "Current Location" 🎯

*Stay safe, in the location you shared with us, and keep your phone line free.*`,

        es: `🚒 *Bomberos {{COMANDO}}* 🚒

Mensaje generado automáticamente.

Utilice este número para enviarnos su ubicación, fotos, videos u otra información sobre el incidente que reportó.

*ESTE NO ES UN NÚMERO DE EMERGENCIA*
y NO lo utilice para ningún otro propósito o ocasión sin nuestra autorización.

Para cualquier solicitud de emergencia, llame al
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Para enviar coordenadas:
1. Haga clic en el icono del clip (Android) 📎 o en el signo más (+) (Apple) ➕
2. Haga clic en "Ubicación" ⛳
3. Si es necesario, siga las instrucciones del dispositivo para permitir que WhatsApp acceda a su ubicación 🆗️
4. Espere unos instantes para que la ubicación sea más precisa ⏰
5. Haga clic en "Ubicación actual" 🎯

*Manténgase a salvo en la ubicación que nos indicó y mantenga su línea telefónica libre.*`,

        fr: `🚒 *Sapeur Pompiers {{COMANDO}}* 🚒

Message automatique.

Veuillez utiliser ce numéro pour nous envoyer votre position, des photos, des vidéos ou toute autre information concernant l'incident que vous avez signalé.

*CECI N'EST PAS UN NUMÉRO D'URGENCE*

et NE L'UTILISEZ PAS à d'autres fins sans notre autorisation.

Pour toute urgence, appelez le
☎️🆘️

*{{NUM}}*

🇪🇺🇮🇹

Pour envoyer vos coordonnées :

1. Cliquez sur le trombone (Android) 📎 ou le plus (Apple) ➕

2. Cliquez sur « Position » ⛳

3. Si nécessaire, suivez les instructions de votre appareil pour autoriser WhatsApp à accéder à votre position 🆗️

4. Patientez quelques instants pour une meilleure précision ⏰

5. Cliquez sur « Position actuelle » 🎯

*Restez en sécurité à l'endroit que vous nous avez indiqué et assurez-vous que votre ligne téléphonique est libre.*

Crédit : VVFsendWhatsApp

Vendredi 31 juillet 2026, 12 h 04 - Équipe A3`,

        sq: `🚒 *Brigada e Zjarrfikësve {{COMANDO}}* 🚒

Mesazh i gjeneruar automatikisht.

Ju lutemi përdorni këtë numër për të na dërguar vendndodhjen tuaj, fotot, videot ose informacione të tjera në lidhje me incidentin që raportuat.

*KY NUK ËSHTË NJË NUMËR URGJENCE*
dhe MOS e përdorni për asnjë qëllim ose rast tjetër pa lejen tonë.

Për të gjitha kërkesat emergjente, telefononi
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Për të dërguar koordinatat:
1. Klikoni mbi "kapësen e letrës" (Android) 📎 ose "plus" (Apple) ➕
2. Klikoni mbi "Vendndodhjen" ⛳
3. Nëse është e nevojshme, ndiqni udhëzimet e pajisjes për të lejuar WhatsApp të hyjë në vendndodhjen tuaj 🆗️
4. Prisni disa momente për të rritur saktësinë ⏰
5. Klikoni mbi "Vendndodhja aktuale" 🎯

*Qëndroni të sigurt, në vendndodhjen që keni ndarë me ne, dhe mbajeni linjën tuaj telefonike të lirë.*`,

        ar: `🚒 *فرقة الإطفاء {{COMANDO}}* 🚒

رسالة مُولّدة تلقائيًا.

يُرجى استخدام هذا الرقم لإرسال موقعك، أو صورك، أو مقاطع الفيديو الخاصة بك، أو أي معلومات أخرى حول الحادث الذي أبلغت عنه.

*هذا ليس رقم طوارئ*
ولا تستخدمه لأي غرض آخر أو في أي مناسبة أخرى دون إذننا.


لجميع طلبات الطوارئ، اتصل على

☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

لإرسال الإحداثيات:

١. انقر على رمز المشبك (أندرويد) 📎 أو رمز الزائد (آبل) ➕

٢. انقر على "الموقع" ⛳

٣. إذا لزم الأمر، اتبع تعليمات جهازك للسماح لتطبيق واتساب بالوصول إلى موقعك 🆗️

٤. انتظر لحظات لزيادة دقة الموقع ⏰

٥. انقر على "الموقع الحالي" 🎯

*ابقَ آمنًا في الموقع الذي شاركته معنا، وتأكد من خلو خط هاتفك.*`,

        bg: `🚒 *Пожарна бригада {{COMANDO}}* 🚒

Автоматично генерирано съобщение.

Моля, използвайте този номер, за да ни изпратите вашето местоположение, снимки, видеоклипове или друга информация за инцидента, за който съобщихте.

*ТОВА НЕ Е НОМЕР ЗА СПЕШНИ СЛУЧАИ*
и НЕ го използвайте за други цели или случаи без наше разрешение.

За всички спешни заявки, обадете се на
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

За да изпратите координати:
1. Кликнете върху „кламер“ (Android) 📎 или „плюс“ (Apple) ➕
2. Кликнете върху „Местоположение“ ⛳
3. Ако е необходимо, следвайте инструкциите на устройството, за да позволите на WhatsApp достъп до вашето местоположение 🆗️
4. Изчакайте няколко минути, за да увеличите точността ⏰
5. Кликнете върху „Текущо местоположение“ 🎯

*Бъдете в безопасност, на мястото, което споделихте с нас, и дръжте телефонната си линия свободна.*`,

        cs: `🚒 *Hasičský sbor {{COMANDO}}* 🚒

Automaticky generovaná zpráva.

Použijte prosím toto číslo k zaslání vaší polohy, fotografií, videí nebo dalších informací o incidentu, který jste nahlásili.

*TOTO NENÍ ČÍSLO PRO NOUZOVÉ VOLITELNÉ SITUACE*
a NEPOUŽÍVEJTE ho k žádnému jinému účelu ani příležitosti bez našeho svolení.

V případě nouze volejte
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Odeslání souřadnic:
1. Klikněte na „sponku“ (Android) 📎 nebo „plus“ (Apple) ➕
2. Klikněte na „Poloha“ ⛳
3. V případě potřeby postupujte podle pokynů na zařízení, abyste povolili aplikaci WhatsApp přístup k vaší poloze 🆗️
4. Pro zvýšení přesnosti chvíli počkejte ⏰
5. Klikněte na „Aktuální poloha“ 🎯

*Zůstaňte v bezpečí, na místě, které jste s námi sdíleli, a mějte volnou telefonní linku.*`,

        "zh-CN": `🚒 *消 防 队 {{COMANDO}}* 🚒

自 动 生 成 的 消 息 。

使 用 此 号 码 向 我 们 发 送 您 与 我 们 交 流 的 活 动 的 位 置，照 片，视 频 或 其 他 信 息 。

*这 不 是 紧 急 号 码*
未 经 我 们 的 允 许，请 勿 将 其 用 于 任 何 其 他 目 的 或 在 其 他 场 合 使 用 。

对 于 所 有 遇 险 电 话，请 致 电
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

发 送 坐 标：
1. 单 击 “回 形 针”（Android）📎 或 “加 号”（Apple）➕
2. 单 击“位置” ⛳
3. 如 有 必 要，请 按 照 设 备 的 说 明 进 行 操 作，以 允 许 WhatsApp 访 问 您 的 位 置 location️
4. 等 待 片 刻 以 提 高 准 确 性 ⏰
5. 单 击 “当 前 位 置” 🎯

*请 确 保 与 您 共 享 的 位 置 安 全，并 保 持 电 话 线 畅 通 。*`,

        hr: `🚒 *Vatrogasna brigada {{COMANDO}}* 🚒

Automatski generirana poruka.

Molimo vas da nam na ovaj broj pošaljete svoju lokaciju, fotografije, videozapise ili druge informacije o incidentu koji ste prijavili.

*OVO NIJE BROJ ZA HITNE SLUČAJEVE*
i NE KORISTITE ga ni u koju drugu svrhu ili prigodu bez našeg dopuštenja.

Za sve hitne zahtjeve nazovite
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Za slanje koordinata:
1. Kliknite na "spajalicu" (Android) 📎 ili "plus" (Apple) ➕
2. Kliknite na "Lokacija" ⛳
3. Ako je potrebno, slijedite upute uređaja kako biste WhatsAppu omogućili pristup vašoj lokaciji 🆗️
4. Pričekajte nekoliko trenutaka kako biste povećali točnost ⏰
5. Kliknite na "Trenutna lokacija" 🎯

*Ostanite sigurni, na lokaciji koju ste podijelili s nama i neka vaša telefonska linija bude slobodna.*`,

        da: `🚒 *Brandvæsen {{COMANDO}}* 🚒

Automatisk genereret besked.

Brug venligst dette nummer til at sende os din placering, fotos, videoer eller andre oplysninger om den hændelse, du har rapporteret.

*DETTE ER IKKE ET NØDNUMMER*
og brug det IKKE til andre formål eller lejligheder uden vores tilladelse.

Ved alle nødsituationer, ring
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

S dan sender du koordinater:
1. Klik på "papirklipsen" (Android) 📎 eller "plusset" (Apple) ➕
2. Klik på "Placering" ⛳
3. Følg om nødvendigt enhedens instruktioner for at give WhatsApp adgang til din placering 🆗️
4. Vent et par øjeblikke for at øge nøjagtigheden ⏰
5. Klik på "Aktuel placering" 🎯

*Vær sikker på den placering, du delte med os, og hold din telefonlinje fri.*`,

        et: `🚒 *Tuletõrje {{COMANDO}}* 🚒

Automaatselt genereeritud sõnum.

Palun kasutage seda numbrit, et saata meile oma asukoht, fotod, videod või muu teave teatatud juhtumi kohta.

*SEE EI OLE HÄDAABINUMBER*
ja ÄRGE kasutage seda muul eesmärgil ega sündmusel ilma meie loata.

Kõikide hädaolukordade korral helistage numbril
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Koordinaatide saatmiseks:
1. Klõpsake kirjaklambril (Android) 📎 või plussmärgil (Apple) ➕
2. Klõpsake valikul „Asukoht" ⛳
3. Vajadusel järgige seadme juhiseid, et lubada WhatsAppil teie asukohale juurde pääseda 🆗️
4. Oodake täpsuse suurendamiseks paar hetke ⏰
5. Klõpsake valikul „Praegune asukoht" 🎯

*Jääge turvaliselt meiega jagatud asukohas ja hoidke oma telefoniliin vaba.*`,

        fi: `🚒 *Palokunta {{COMANDO}}* 🚒

Automaattisesti luotu viesti.

Käytä tätä numeroa lähettääksesi meille sijaintisi, valokuvia, videoita tai muita tietoja ilmoittamastasi tapahtumasta.

*TÄMÄ EI OLE HÄTÄNUMERO*
ÄLÄKÄ käytä sitä mihinkään muuhun tarkoitukseen tai tilanteeseen ilman lupaamme.

Hätätilanteissa soita numeroon
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Lähetä koordinaatit seuraavasti:
1. Napsauta "paperiliitintä" (Android) 📎 tai "plus"-merkkiä (Apple) ➕
2. Napsauta "Sijainti" ⛳
3. Tarvittaessa seuraa laitteen ohjeita, jotta WhatsApp voi käyttää sijaintiasi 🆗️
4. Odota hetki tarkkuuden lisäämiseksi ⏰
5. Napsauta "Nykyinen sijainti" 🎯

*Pysy turvassa jakamassasi sijainnissa ja pidä puhelinlinjasi vapaana.*`,

        el: `🚒 *Πυροσβεστική Υπηρεσία {{COMANDO}}* 🚒

Αυτόματα δημιουργημένο μήνυμα.

Χρησιμοποιήστε αυτόν τον αριθμό για να μας στείλετε την τοποθεσία σας, φωτογραφίες, βίντεο ή άλλες πληροφορίες σχετικά με το περιστατικό που αναφέρατε.

*ΑΥΤΟΣ ΔΕΝ ΕΙΝΑΙ ΑΡΙΘΜΟΣ ΕΚΤΑΚΤΗΣ ΑΝΑΓΚΗΣ*
και ΜΗΝ τον χρησιμοποιείτε για κανέναν άλλο σκοπό ή περίσταση χωρίς την άδειά μας.

Για όλα τα αιτήματα έκτακτης ανάγκης, καλέστε
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Για να στείλετε συντεταγμένες:
1. Κάντε κλικ στον "συνδετήρα" (Android) 📎 ή στο "συν" (Apple) ➕
2. Κάντε κλικ στην "Τοποθεσία" ⛳
3. Εάν είναι απαραίτητο, ακολουθήστε τις οδηγίες της συσκευής για να επιτρέψετε στο WhatsApp να έχει πρόσβαση στην τοποθεσία σας 🆗️
4. Περιμένετε λίγα λεπτά για να αυξήσετε την ακρίβεια ⏰
5. Κάντε κλικ στην "Τρέχουσα τοποθεσία" 🎯

*Μείνετε ασφαλείς, στην τοποθεσία που μας κοινοποιήσατε, και κρατήστε την τηλεφωνική σας γραμμή ελεύθερη.*`,

        ga: `🚒 *Briogáid Dóiteáin {{COMANDO}}* 🚒

Teachtaireacht a ghintear go huathoibríoch.

Úsáid an uimhir seo le do shuíomh, grianghraif, físeáin, nó faisnéis eile faoin eachtra a thuairiscigh tú a sheoladh chugainn.

*NÍ UIMHIR ÉIGEANDÁLA É SEO*
agus NÁ húsáid í chun aon chríche nó ócáide eile gan ár gcead.

I gcás gach iarratais éigeandála, glaoigh ar
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Chun comhordanáidí a sheoladh:
1. Cliceáil ar an "gearrthóg páipéir" (Android) 📎 nó an "móide" (Apple) ➕
2. Cliceáil ar "Suíomh" ⛳
3. Más gá, lean leideanna an fheiste chun ligean do WhatsApp rochtain a fháil ar do shuíomh 🆗️
4. Fan cúpla nóiméad chun cruinneas a mhéadú ⏰
5. Cliceáil ar "Suíomh Reatha" 🎯

*Fan sábháilte, sa suíomh a roinn tú linn, agus coinnigh do líne teileafóin saor.*`,

        lv: `🚒 *Ugunsdzēsības brigāde {{COMANDO}}* 🚒

Automātiski ģenerēts ziņojums.

Lūdzu, izmantojiet šo numuru, lai nosūtītu mums savu atrašanās vietu, fotoattēlus, videoklipus vai citu informāciju par ziņoto incidentu.

*ŠIS NAV ĀRKĀRTAS NUMURS*
un NEIZMANTOJIET to nekādiem citiem mērķiem vai gadījumiem bez mūsu atļaujas.

Visiem ārkārtas pieprasījumiem zvaniet uz numuru
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Lai nosūtītu koordinātas:
1. Noklikšķiniet uz "saspraudes" (Android) 📎 vai "plus" (Apple) ➕
2. Noklikšķiniet uz "Atrašanās vieta" ⛳
3. Ja nepieciešams, izpildiet ierīces norādījumus, lai atļautu WhatsApp piekļūt jūsu atrašanās vietai 🆗️
4. Uzgaidiet dažas minūtes, lai palielinātu precizitāti ⏰
5. Noklikšķiniet uz "Pašreizējā atrašanās vieta" 🎯

*Esiet drošībā, atrodieties atrašanās vietā, kuru kopīgojāt ar mums, un turiet tālruņa līniju brīvu.*`,

        lt: `🚒 *Ugniagesių brigada {{COMANDO}}* 🚒

Automatiškai sugeneruotas pranešimas.

Prašome naudoti šį numerį, jei norite atsiųsti mums savo buvimo vietą, nuotraukas, vaizdo įrašus ar kitą informaciją apie įvykį, apie kurį pranešėte.

*TAI NĖRA PAGALBOS NUMERIS*
ir NENAUDOKITE jo jokiais kitais tikslais ar progomis be mūsų leidimo.

Dėl visų skubių užklausų skambinkite
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Norėdami išsiųsti koordinates:
1. Spustelėkite „sąvaržėlę“ („Android“) 📎 arba „pliusą“ („Apple“) ➕
2. Spustelėkite „Vieta“ ⛳
3. Jei reikia, vykdykite įrenginio nurodymus, kad leistumėte „WhatsApp“ pasiekti jūsų buvimo vietą 🆗️
4. Palaukite kelias minutes, kad padidintumėte tikslumą ⏰
5. Spustelėkite „Dabartinė vieta“ 🎯

*Būkite saugūs, toje vietoje, kurią su mumis pasidalinote, ir palaikykite telefono liniją laisvą.*`,

        mt: `🚒 *Brigata tat-Tifi tan-Nar {{COMANDO}}* 🚒

Messaġġ iġġenerat awtomatikament.

Jekk jogħġbok uża dan in-numru biex tibgħatilna l-post tiegħek, ritratti, vidjows, jew informazzjoni oħra dwar l-inċident li rrappurtajt.

*DAN MHUX NUMRU TA' EMERĠENZA*
u TUŻAHX għal xi skop jew okkażjoni oħra mingħajr il-permess tagħna.

Għal kull talba ta' emerġenza, ċempel
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Biex tibgħat koordinati:
1. Ikklikkja fuq il-"paperclip" (Android) 📎 jew il-"plus" (Apple) ➕
2. Ikklikkja fuq "Location" ⛳
3. Jekk meħtieġ, segwi l-istruzzjonijiet tal-apparat biex tippermetti lil WhatsApp jaċċessa l-lokazzjoni tiegħek 🆗️
4. Stenna ftit mumenti biex iżżid il-preċiżjoni ⏰
5. Ikklikkja fuq "Current Location" 🎯

*Ibqa' sigur, fil-lokazzjoni li qsamt magħna, u żomm il-linja tat-telefon tiegħek ħielsa.*`,

        nl: `🚒 *Brandweer {{COMANDO}}* 🚒

Automatisch gegenereerd bericht.

Gebruik dit nummer om ons uw locatie, foto's, video's of andere informatie over het gemelde incident te sturen.

*DIT IS GEEN NOODNUMMER*
en gebruik het NIET voor andere doeleinden of gelegenheden zonder onze toestemming.

Voor alle noodgevallen, bel
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Om coördinaten te verzenden:
1. Klik op het paperclip-icoon (Android) 📎 of het plusteken (Apple) ➕
2. Klik op 'Locatie' ⛳
3. Volg indien nodig de aanwijzingen van uw apparaat om WhatsApp toegang te geven tot uw locatie 🆗️
4. Wacht even voor een nauwkeurigere locatie ⏰
5. Klik op 'Huidige locatie' 🎯

*Blijf veilig op de locatie die u met ons hebt gedeeld en houd uw telefoonlijn vrij.*`,

        pl: `🚒 *Straż Pożarna {{COMANDO}}* 🚒

Wiadomość generowana automatycznie.

Użyj tego numeru, aby przesłać nam swoją lokalizację, zdjęcia, filmy lub inne informacje dotyczące zgłoszonego zdarzenia.

*TO NIE JEST NUMER ALARMOWY*
i NIE UŻYWAJ go w żadnym innym celu ani z żadnej innej okazji bez naszej zgody.

W nagłych wypadkach prosimy dzwonić pod numer
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Aby wysłać współrzędne:
1. Kliknij „spinacz” (Android) 📎 lub „plus” (Apple) ➕
2. Kliknij „Lokalizacja” ⛳
3. W razie potrzeby postępuj zgodnie z instrukcjami urządzenia, aby zezwolić WhatsApp na dostęp do Twojej lokalizacji 🆗️
4. Odczekaj chwilę, aby zwiększyć dokładność ⏰
5. Kliknij „Aktualna lokalizacja” 🎯

*Bądź bezpieczny w podanej nam lokalizacji i nie wyłączaj telefonu.*`,

        pt: `🚒 *Corpo de Bombeiros {{COMANDO}}* 🚒

Mensagem gerada automaticamente.

Por favor, utilize este número para nos enviar sua localização, fotos, vídeos ou outras informações sobre o incidente que você relatou.

*ESTE NÃO É UM NÚMERO DE EMERGÊNCIA*
e NÃO o utilize para qualquer outra finalidade ou ocasião sem nossa permissão.

Para todas as solicitações de emergência, ligue para
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Para enviar as coordenadas:
1. Clique no ícone de clipe de papel (Android) 📎 ou no ícone de mais (Apple) ➕
2. Clique em "Localização" ⛳
3. Se necessário, siga as instruções do dispositivo para permitir que o WhatsApp acesse sua localização 🆗️
4. Aguarde alguns instantes para aumentar a precisão ⏰
5. Clique em "Localização atual" 🎯

*Mantenha-se em segurança, no local que você compartilhou conosco, e mantenha sua linha telefônica livre.*`,

        ro: `🚒 *Brigada de Pompieri {{COMANDO}}* 🚒

Mesaj generat automat.

Vă rugăm să folosiți acest număr pentru a ne trimite locația dvs., fotografii, videoclipuri sau alte informații despre incidentul pe care l-ați raportat.

*ACESTA NU ESTE UN NUMĂR DE URGENȚĂ*
și NU îl utilizați în niciun alt scop sau ocazie fără permisiunea noastră.

Pentru toate solicitările de urgență, sunați
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Pentru a trimite coordonate:
1. Faceți clic pe „agrafă” (Android) 📎 sau pe „plus” (Apple) ➕
2. Faceți clic pe „Locație” ⛳
3. Dacă este necesar, urmați instrucțiunile dispozitivului pentru a permite WhatsApp să acceseze locația dvs. 🆗️
4. Așteptați câteva momente pentru a crește precizia ⏰
5. Faceți clic pe „Locație curentă” 🎯

*Rămâneți în siguranță, în locația pe care ați partajat-o cu noi și păstrați-vă linia telefonică liberă.*`,

        ru: `🚒 *Номер телефона пожарной охраны* 🚒

Автоматически сгенерированное сообщение.

Пожалуйста, используйте этот номер, чтобы отправить нам ваше местоположение, фотографии, видео или другую информацию об инциденте, о котором вы сообщили.

*ЭТО НЕ НОМЕР ДЛЯ ЭКСТРЕННЫХ СИТУАЦИЙ*
и НЕ ИСПОЛЬЗУЙТЕ ЕГО ДЛЯ КАКИХ-ЛИБО ДРУГИХ ЦЕЛЕЙ БЕЗ НАШЕГО РАЗРЕШЕНИЯ.


Для всех экстренных случаев звоните:
☎️🆘️
*Н-Н-Н*
🇪🇺🇮🇹

Чтобы отправить координаты:
1. Нажмите на значок «скрепка» (Android) 📎 или «плюс» (Apple) ➕
2. Нажмите на «Местоположение» ⛳
3. При необходимости следуйте инструкциям устройства, чтобы разрешить WhatsApp доступ к вашему местоположению 🆗️
4. Подождите несколько минут для повышения точности ⏰
5. Нажмите на «Текущее местоположение» 🎯

*Оставайтесь в безопасности, в указанном вами местоположении, и держите телефонную линию свободной.*`,

        sk: `🚒 *Hasičský zbor {{COMANDO}}* 🚒

Automaticky vygenerovaná správa.

Použite toto číslo na zaslanie vašej polohy, fotografií, videí alebo iných informácií o incidente, ktorý ste nahlásili.

*TOTO NIE JE NÚDZOVÉ ČÍSLO*
a NEPOUŽÍVAJTE ho na žiadny iný účel ani príležitosť bez nášho súhlasu.

V prípade všetkých núdzových požiadaviek volajte na číslo
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Ak chcete odoslať súradnice:
1. Kliknite na „sponku“ (Android) 📎 alebo „plus“ (Apple) ➕
2. Kliknite na „Poloha“ ⛳
3. V prípade potreby postupujte podľa pokynov na zariadení, aby ste povolili aplikácii WhatsApp prístup k vašej polohe 🆗️
4. Počkajte chvíľu, aby ste zvýšili presnosť ⏰
5. Kliknite na „Aktuálna poloha“ 🎯

*Zostaňte v bezpečí, na mieste, ktoré ste s nami zdieľali, a majte voľnú telefónnu linku.*`,

        sl: `🚒 *Gasilska brigada {{COMANDO}}* 🚒

Samodejno ustvarjeno sporočilo.

Prosimo, uporabite to številko, da nam pošljete svojo lokacijo, fotografije, videoposnetke ali druge informacije o incidentu, ki ste ga prijavili.

*TO NI ŠTEVILKA ZA NUJNE PRIMERE*
in je NE uporabljajte za noben drug namen ali priložnost brez našega dovoljenja.

Za vse nujne primere pokličite
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Za pošiljanje koordinat:
1. Kliknite na "sponko za papir" (Android) 📎 ali "plus" (Apple) ➕
2. Kliknite na "Lokacija" ⛳
3. Po potrebi sledite navodilom naprave, da WhatsAppu omogočite dostop do vaše lokacije 🆗️
4. Počakajte nekaj trenutkov, da povečate natančnost ⏰
5. Kliknite na "Trenutna lokacija" 🎯

*Ostanite varni na lokaciji, ki ste jo delili z nami, in imejte telefonsko linijo prosto.*`,

        sv: `🚒 *Brandkåren {{COMANDO}}* 🚒

Automatiskt genererat meddelande.

Använd detta nummer för att skicka oss din plats, foton, videor eller annan information om den händelse du rapporterade.

*DETTA ÄR INTE ETT NÖDNUMMER*
och ANVÄND det INTE för något annat ändamål eller tillfälle utan vårt tillstånd.

För alla nödförfrågningar, ring
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

För att skicka koordinater:
1. Klicka på "gem" (Android) 📎 eller "plus" (Apple) ➕
2. Klicka på "Plats" ⛳
3. Om det behövs, följ enhetens anvisningar för att tillåta WhatsApp att komma åt din plats 🆗️
4. Vänta några ögonblick för att öka noggrannheten ⏰
5. Klicka på "Nuvarande plats" 🎯

*Var säker på den plats du delade med oss och håll din telefonlinje ledig.*`,

        de: `🚒 *Feuerwehr {{COMANDO}}* 🚒

Automatisch generierte Nachricht.

Bitte nutzen Sie diese Nummer, um uns Ihren Standort, Fotos, Videos oder andere Informationen zu dem von Ihnen gemeldeten Vorfall zu senden.

*DIES IST KEINE NOTRUFNUMMER*
und verwenden Sie sie NICHT ohne unsere Genehmigung für andere Zwecke oder Anlässe.

Für alle Notfälle rufen Sie bitte an:

☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

So senden Sie Ihre Koordinaten:
1. Tippen Sie auf die Büroklammer (Android) 📎 oder das Pluszeichen (Apple) ➕.
2. Tippen Sie auf „Standort" ⛳.
3. Folgen Sie gegebenenfalls den Anweisungen Ihres Geräts, um WhatsApp den Zugriff auf Ihren Standort zu erlauben 🆗️.
4. Warten Sie einen Moment, um die Genauigkeit zu erhöhen ⏰.
5. Tippen Sie auf „Aktueller Standort" 🎯.

*Bleiben Sie an dem Ort, den Sie uns mitgeteilt haben, und halten Sie Ihre Telefonleitung frei.*`,

        hu: `🚒 *Tűzoltóság {{COMANDO}}* 🚒

Automatikusan generált üzenet.

Kérjük, ezt a számot használja, ha tartózkodási helyét, fotóit, videóit vagy egyéb információkat szeretne küldeni nekünk a jelentett incidensről.

*EZ NEM SÜRGŐSSÉGI SZÁM*
és NE használja semmilyen más célra vagy alkalomra az engedélyünk nélkül.

Minden vészhelyzeti kérés esetén hívja a következő számot:
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Koordináták küldéséhez:
1. Kattintson a "gemkapocs" (Android) 📎 vagy a "plusz" (Apple) ikonra ➕
2. Kattintson a "Helyszín" ⛳ elemre
3. Szükség esetén kövesse az eszköz utasításait, hogy engedélyezze a WhatsAppnak a tartózkodási helyének elérését 🆗️
4. Várjon néhány percet a pontosság növelése érdekében ⏰
5. Kattintson a "Jelenlegi tartózkodási hely" 🎯 elemre

*Maradjon biztonságban, a velünk megosztott helyen, és tartsa szabadon a telefonvonalát.*`
    };

    // Istruzioni brevi "clicca sul link" tradotte in tutte le lingue del
    // dizionario messaggi. Non serve conoscere il testo manuale originale
    // di ciascuna lingua per sostituirlo: costruisciCorpoMessaggio individua
    // il blocco istruzioni per STRUTTURA (fra le bandiere UE/IT e la frase
    // finale in grassetto), non per confronto testuale — quindi funziona
    // identicamente per tutte le 27 lingue, comprese quelle con formattazione
    // diversa (righe vuote extra in francese/arabo, virgolette diverse ecc.).
    const ISTRUZIONI_LINK = {
        it: 'Per l\'invio delle coordinate:\n1. Clicca sul link 🔗\n2. Autorizzi l\'accesso alla posizione se richiesto ✅',
        en: 'To send coordinates:\n1. Click on the link 🔗\n2. Allow location access if prompted ✅',
        es: 'Para enviar coordenadas:\n1. Haga clic en el enlace 🔗\n2. Permita el acceso a la ubicación si se solicita ✅',
        fr: 'Pour envoyer vos coordonnées :\n1. Cliquez sur le lien 🔗\n2. Autorisez l\'accès à la position si demandé ✅',
        sq: 'Për të dërguar koordinatat:\n1. Klikoni mbi lidhjen 🔗\n2. Lejoni qasjen në vendndodhje nëse kërkohet ✅',
        ar: 'لإرسال الإحداثيات:\n١. انقر على الرابط 🔗\n٢. اسمح بالوصول إلى الموقع إذا طُلب ذلك ✅',
        bg: 'За да изпратите координати:\n1. Кликнете върху връзката 🔗\n2. Разрешете достъп до местоположението, ако бъдете попитани ✅',
        cs: 'Odeslání souřadnic:\n1. Klikněte na odkaz 🔗\n2. Povolte přístup k poloze, pokud budete vyzváni ✅',
        "zh-CN": '发 送 坐 标：\n1. 点 击 链 接 🔗\n2. 如 有 提 示，请 允 许 访 问 位 置 ✅',
        hr: 'Za slanje koordinata:\n1. Kliknite na poveznicu 🔗\n2. Dopustite pristup lokaciji ako se to zatraži ✅',
        da: 'Sådan sender du koordinater:\n1. Klik på linket 🔗\n2. Tillad adgang til placering, hvis du bliver bedt om det ✅',
        et: 'Koordinaatide saatmiseks:\n1. Klõpsake lingil 🔗\n2. Lubage asukohale juurdepääs, kui seda küsitakse ✅',
        fi: 'Lähetä koordinaatit seuraavasti:\n1. Napsauta linkkiä 🔗\n2. Salli sijainnin käyttö, jos sitä pyydetään ✅',
        el: 'Για να στείλετε συντεταγμένες:\n1. Κάντε κλικ στον σύνδεσμο 🔗\n2. Επιτρέψτε την πρόσβαση στην τοποθεσία εάν σας ζητηθεί ✅',
        ga: 'Chun comhordanáidí a sheoladh:\n1. Cliceáil ar an nasc 🔗\n2. Ceadaigh rochtain ar an suíomh má iarrtar é ✅',
        lv: 'Lai nosūtītu koordinātas:\n1. Noklikšķiniet uz saites 🔗\n2. Atļaujiet piekļuvi atrašanās vietai, ja tas tiek pieprasīts ✅',
        lt: 'Norėdami išsiųsti koordinates:\n1. Spustelėkite nuorodą 🔗\n2. Leiskite pasiekti buvimo vietą, jei bus paprašyta ✅',
        mt: 'Biex tibgħat koordinati:\n1. Ikklikkja fuq il-link 🔗\n2. Ippermetti l-aċċess għal-lokazzjoni jekk mitlub ✅',
        nl: 'Om coördinaten te verzenden:\n1. Klik op de link 🔗\n2. Sta toegang tot locatie toe indien gevraagd ✅',
        pl: 'Aby wysłać współrzędne:\n1. Kliknij link 🔗\n2. Zezwól na dostęp do lokalizacji, jeśli zostaniesz o to poproszony ✅',
        pt: 'Para enviar as coordenadas:\n1. Clique no link 🔗\n2. Permita o acesso à localização, se solicitado ✅',
        ro: 'Pentru a trimite coordonate:\n1. Faceți clic pe link 🔗\n2. Permiteți accesul la locație dacă vi se solicită ✅',
        ru: 'Чтобы отправить координаты:\n1. Нажмите на ссылку 🔗\n2. Разрешите доступ к местоположению, если будет предложено ✅',
        sk: 'Ak chcete odoslať súradnice:\n1. Kliknite na odkaz 🔗\n2. Povoľte prístup k polohe, ak sa zobrazí výzva ✅',
        sl: 'Za pošiljanje koordinat:\n1. Kliknite na povezavo 🔗\n2. Če boste pozvani, dovolite dostop do lokacije ✅',
        sv: 'För att skicka koordinater:\n1. Klicka på länken 🔗\n2. Tillåt platsåtkomst om du blir tillfrågad ✅',
        de: 'So senden Sie Ihre Koordinaten:\n1. Klicken Sie auf den Link 🔗\n2. Erlauben Sie den Zugriff auf den Standort, falls Sie dazu aufgefordert werden ✅',
        hu: 'Koordináták küldéséhez:\n1. Kattintson a linkre 🔗\n2. Engedélyezze a helyhozzáférést, ha erre kéri a rendszer ✅'
    };

    // Individua il blocco "bandiere → istruzioni manuali → frase di chiusura"
    // per struttura: inizia subito dopo 🇪🇺🇮🇹, finisce appena prima della
    // prima riga in grassetto (quella che apre con "*"). Funziona uguale in
    // ogni lingua perché quella struttura a tre parti è identica ovunque,
    // anche se il testo delle istruzioni cambia da lingua a lingua.
    const BLOCCO_ISTRUZIONI_RE = /🇪🇺🇮🇹\n\n[\s\S]*?\n\n(?=\*)/;

    // Costruisce il corpo del messaggio sostituendo Comando e numero emergenza,
    // ricadendo sull'italiano se la lingua scelta non ha ancora una traduzione.
    // "link" è l'URL del locator (stringa vuota se non richiesto): quando
    // presente, sostituisce in un colpo solo bandiere+istruzioni manuali con
    // bandiere+link+istruzioni brevi, nella stessa lingua del messaggio.
    function costruisciCorpoMessaggio(codiceLingua, nomeComando, numeroEmergenzaFormattato, link) {
        const modello = TRADUZIONI_MESSAGGIO[codiceLingua] || TRADUZIONI_MESSAGGIO.it;
        let testo = modello
            .split("{{COMANDO}}").join(nomeComando.toUpperCase())
            .split("{{NUM}}").join(numeroEmergenzaFormattato);

        if (link) {
            const istruzioniLink = ISTRUZIONI_LINK[codiceLingua] || ISTRUZIONI_LINK.it;
            testo = testo.replace(
                BLOCCO_ISTRUZIONI_RE,
                "🇪🇺🇮🇹\n\n" + link + "\n\n" + istruzioniLink + "\n\n"
            );
        }

        return testo;
    }

    // Calcola lo scarto orario attuale di Roma rispetto a UTC (1 = CET, 2 = CEST)
    function calcolaOffsetRoma(data) { return FireOps.offsetOreRoma(data); }

    // Costruisce il piè di pagina (sempre in italiano): credito, data/ora/turno, fuso orario
    function costruisciPieDiPaginaMessaggio() {
        const adesso = new Date();
        const componenti = FireOps.componentiRoma(adesso);
        const pad = n => String(n).padStart(2, "0");

        const nomeGiorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "Europe/Rome" }).format(adesso);
        const nomeGiornoMaiuscolo = nomeGiorno.charAt(0).toUpperCase() + nomeGiorno.slice(1);

        const dataFormattata = `${pad(componenti.day)}.${pad(componenti.month)}.${componenti.year}`;
        const oraFormattata = `${pad(componenti.hour)}:${pad(componenti.minute)}:${pad(componenti.second)}`;
        const turno = FireOps.turnoVVF();

        const offsetOre = calcolaOffsetRoma(adesso);
        const etichettaFuso = offsetOre === 2 ? "CEST" : "CET";

        return `Credits: FireOps VVF\n${nomeGiornoMaiuscolo} ${dataFormattata} ore ${oraFormattata} - Turno ${turno}\n(GMT+0${offsetOre}.00) Roma (${etichettaFuso})`;
    }

    // Rigenera il messaggio completo nella textarea, in base al Comando attivo e alla lingua scelta.
    // Se la lingua non è ancora stata scelta, l'anteprima resta vuota (non compare).
    function generaMessaggioMessaggistica() {
        if (!textareaMsg || !hiddenLinguaMsg) return;

        const stato = validaCampiMessaggistica();

        if (!stato.linguaOk) {
            textareaMsg.value = "";
            textareaMsg.placeholder = "Seleziona una lingua per generare l'anteprima del messaggio.";
            return;
        }

        const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE);
        const comandoAttivo = (window.FireOpsComandi || []).find(c => c.Comando === nomeComandoAttivo);

        if (!comandoAttivo) {
            textareaMsg.value = "Seleziona prima un Comando dalla schermata iniziale per generare il messaggio.";
            return;
        }

        const codiceLingua = hiddenLinguaMsg.value || LINGUA_PREDEFINITA;
        const valoreEmergenza = comandoAttivo["115/NUE OUT"] || "112";
        const numeroEmergenzaFormattato = String(valoreEmergenza).split("").join(" ");

        // Calcolato PRIMA del corpo: il link va inserito dentro il testo
        // (dopo le bandiere UE/IT), non più accodato in fondo al messaggio.
        const link = rigaLinkCoordinate(comandoAttivo, codiceLingua);
        const corpo = costruisciCorpoMessaggio(codiceLingua, comandoAttivo.Comando, numeroEmergenzaFormattato, link);
        const pieDiPagina = costruisciPieDiPaginaMessaggio();

        textareaMsg.value = `${corpo}\n${pieDiPagina}`;
    }
    window.generaMessaggioMessaggistica = generaMessaggioMessaggistica;

    // Compone il numero completo (prefisso + numero) ripulito da spazi/simboli
    function numeroCompletoPulito() {
        const prefisso = (hiddenPrefissoMsg && hiddenPrefissoMsg.value || "").replace(/\D/g, "");
        const numero = (inputNumeroMsg && inputNumeroMsg.value || "").replace(/\D/g, "");
        return { prefisso, numero };
    }

    // URL della Web App Apps Script che scrive sul foglio "DB_ID_Search"
    // dello spreadsheet FIREOPS Locator (lo stesso usato da locator.html per
    // "DB_Locator_People"). Stesso pattern lì visto: POST con mode:'no-cors',
    // quindi non possiamo leggere l'esito reale della scrittura.
    // TODO: incolla qui l'URL della Web App. Se riusi la STESSA Web App già
    // distribuita per locator.html, il doPost() lato Apps Script deve
    // instradare in base al campo "foglio" del payload — vedi il codice di
    // esempio nella risposta.
    const WEBAPP_URL_ID_SEARCH = "https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec";

    // Registra su Google Sheet ogni invio di messaggio, qualunque sia il
    // canale scelto. Non blocca né condiziona l'invio vero e proprio: se la
    // scrittura fallisce o l'URL non è ancora configurato, l'utente continua
    // comunque a poter inviare il messaggio.
    function inviaRigaDbIdSearch(canale) {
        if (!WEBAPP_URL_ID_SEARCH || !WEBAPP_URL_ID_SEARCH.startsWith("https://")) return;

        const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE);
        const comandoAttivo = (window.FireOpsComandi || []).find(c => c.Comando === nomeComandoAttivo);
        const linkAttivo = !!(chkLinkCoordinate && chkLinkCoordinate.checked);
        const sigla = comandoAttivo ? siglaComando(comandoAttivo) : "";
        const numeroInt = inputNumeroIntervento ? inputNumeroIntervento.value.trim() : "";
        const annoInt = selectAnnoIntervento ? selectAnnoIntervento.value : "";
        const { prefisso, numero } = numeroCompletoPulito();

        const payload = {
            foglio: "DB_ID_Search",
            canale: canale,
            comando: comandoAttivo ? comandoAttivo.Comando : "",
            prefisso: prefisso,
            numeroTelefono: numero,
            lingua: (hiddenLinguaMsg && hiddenLinguaMsg.value) || "",
            linkCoordinateAttivo: linkAttivo,
            idRicerca: (linkAttivo && numeroInt) ? costruisciIdRicerca(numeroInt, annoInt, sigla) : "",
            numeroIntervento: numeroInt,
            annoIntervento: annoInt,
            timestamp: new Date().toISOString()
        };

        fetch(WEBAPP_URL_ID_SEARCH, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        }).catch(() => {}); // fire-and-forget: un errore qui non deve mai bloccare l'invio del messaggio
    }

    // Imposta lo stato "archiviata" di un messaggio (in entrambi i sensi:
    // archivia E disarchivia, stesso payload con "valore" diverso). Stesso
    // pattern fire-and-forget di inviaRigaDbIdSearch: mode:'no-cors' non
    // permette di leggere l'esito reale, l'interfaccia si aggiorna subito
    // (ottimisticamente) al click — vedi costruisciRigaRiepilogo.
    // IdRicerca da solo non basta a identificare la riga: lo stesso
    // intervento può generare più righe (un invio per canale — WhatsApp
    // Web, Desktop, Telegram — se l'operatore ne usa più di uno), quindi
    // si abbina anche il Timestamp esatto di QUESTA riga.
    function impostaArchiviazioneMessaggio(messaggio, valore) {
        if (!WEBAPP_URL_ID_SEARCH || !WEBAPP_URL_ID_SEARCH.startsWith("https://")) return;

        const payload = {
            foglio: "DB_ID_Search",
            azione: "imposta-archiviata",
            idRicerca: messaggio.IdRicerca || "",
            timestamp: messaggio.Timestamp || "",
            valore: !!valore,
        };

        fetch(WEBAPP_URL_ID_SEARCH, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        }).catch(() => {});
    }

    if (btnWhatsappWeb) {
        btnWhatsappWeb.addEventListener("click", () => {
            if (!validaCampiMessaggistica().tuttiCompilati) return;
            generaMessaggioMessaggistica(); // aggiorna l'orario (con i secondi) al momento dell'invio
            const { prefisso, numero } = numeroCompletoPulito();
            if (!numero) {
                alert("Inserisci un numero di telefono valido.");
                return;
            }
            inviaRigaDbIdSearch("WhatsApp Web");
            const testoCodificato = encodeURIComponent(textareaMsg.value);
            // WhatsApp vuole il prefisso senza "+" (es. 39...)
            const url = `https://web.whatsapp.com/send?phone=${prefisso}${numero}&text=${testoCodificato}`;
            window.open(url, "_blank", "noopener");
        });
    }

    if (btnWhatsappApp) {
        btnWhatsappApp.addEventListener("click", () => {
            if (!validaCampiMessaggistica().tuttiCompilati) return;
            generaMessaggioMessaggistica(); // aggiorna l'orario (con i secondi) al momento dell'invio
            const { prefisso, numero } = numeroCompletoPulito();
            if (!numero) {
                alert("Inserisci un numero di telefono valido.");
                return;
            }
            inviaRigaDbIdSearch("WhatsApp Desktop");
            const testoCodificato = encodeURIComponent(textareaMsg.value);
            // WhatsApp Desktop (app installata) tramite protocollo whatsapp://
            window.location.href = `whatsapp://send?phone=${prefisso}${numero}&text=${testoCodificato}`;
        });
    }

    if (btnInviaTelegram) {
        btnInviaTelegram.addEventListener("click", () => {
            if (!validaCampiMessaggistica().tuttiCompilati) return;
            generaMessaggioMessaggistica(); // aggiorna l'orario (con i secondi) al momento dell'invio
            const testo = textareaMsg.value;
            if (!testo.trim()) {
                alert("Il messaggio è vuoto.");
                return;
            }

            inviaRigaDbIdSearch("Telegram");

            // Copia sempre il testo negli appunti: Telegram non supporta
            // testo precompilato quando si apre una chat da numero di telefono
            navigator.clipboard.writeText(testo).catch(() => {});

            const { prefisso, numero } = numeroCompletoPulito();
            if (numero) {
                // Telegram richiede il "+" davanti al numero completo
                window.open(`https://t.me/+${prefisso}${numero}`, "_blank", "noopener");
            } else {
                // Nessun numero indicato: apre la condivisione generica con testo precompilato
                window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(testo)}`, "_blank", "noopener");
            }
        });
    }

    // ==========================================================
    // RIEPILOGO MESSAGGI (24h) — pannello overlay
    //
    // Legge (GET) dalla stessa Web App Apps Script usata per scrivere
    // (WEBAPP_URL_ID_SEARCH): un doGet(e) restituisce le righe recenti di
    // DB_ID_Search (messaggi con link inviato) e di DB_Locator_People
    // (posizioni ricevute), già filtrate lato server per comando e per le
    // ultime 24h. Il codice Apps Script è nella risposta della chat.
    // ==========================================================

    const btnRiepilogoMsg = document.getElementById("btn-riepilogo-msg");
    const frecciaRiepilogoMsg = document.getElementById("btn-riepilogo-msg")?.querySelector(".riepilogo-msg-tab-freccia");
    const overlayRiepilogoMsg = document.getElementById("riepilogo-msg-overlay");
    const corpoRiepilogoMsg = document.getElementById("riepilogo-msg-corpo");
    const chkRiepilogoLimitrofi = document.getElementById("riepilogo-msg-limitrofi");
    const chiudiRiepilogoMsgBtn = document.getElementById("riepilogo-msg-chiudi");
    const btnAggiornaRiepilogo = document.getElementById("riepilogo-msg-aggiorna");
    const elCaricamentoRiepilogo = document.getElementById("riepilogo-msg-caricamento");

    // Il foglio può restituire i numeri col separatore decimale italiano
    // (virgola) se la colonna è testo anziché numero vero: Number() da solo
    // non lo capisce ("41,12" → NaN). Prova prima il valore così com'è, poi
    // con la virgola convertita in punto.
    function numeroLocale(v) {
        if (v === null || v === undefined || v === "") return NaN;
        const diretto = Number(v);
        if (isFinite(diretto)) return diretto;
        return Number(String(v).replace(",", "."));
    }

    // Ultime 3-4 cifre visibili, il resto mascherato con dei pallini — mai
    // il numero completo in un riepilogo che può restare a schermo in sala.
    function maschera(numero) {
        const pulito = String(numero || "").replace(/\D/g, "");
        if (pulito.length <= 4) return pulito;
        const visibili = pulito.slice(-4);
        return "•".repeat(pulito.length - 4) + visibili;
    }

    // Stessa logica di lettura dei comandi limitrofi già usata nel riepilogo
    // Comando (campo "Concatena Comandi Confinanti", nomi separati da ";").
    function nomiComandiLimitrofi(nomeComando) {
        const comando = (window.FireOpsComandi || []).find(c => c.Comando === nomeComando);
        if (!comando) return [];
        return (comando["Concatena Comandi Confinanti"] || "")
            .split(";")
            .map(n => n.trim())
            .filter(n => n.length > 0);
    }

    // Messaggistica deve essere attiva in uno dei due pannelli perché la
    // tab abbia senso — se l'utente l'ha cambiata in entrambi, sparisce.
    function messaggisticaAttivaInUnPannello() {
        const sezioneMsg = document.getElementById("messaggistica");
        return !!(sezioneMsg && sezioneMsg.closest(".pannello"));
    }

    // Replica locale di toggleFullscreenPagina() (script-bis.js): questo
    // file è autonomo (vedi intestazione) e non condivide la closure di
    // script-bis.js, quindi non può chiamare quella funzione direttamente —
    // stesso principio già seguito per turno/data/ora, duplicate qui per lo
    // stesso motivo. La tab fa le veci del pulsante Espandi/Riduci: il div
    // di Messaggistica (un CONTENITORE UNICO, non due box separati con lo
    // spazio del layout in mezzo) si allunga a coprire anche lo spazio
    // dell'altro pannello — stesso identico meccanismo di Convertitore e
    // SITAC (.pannello-fullscreen), non una novità inventata qui.
    function toggleFullscreenMessaggistica() {
        if (!btnRiepilogoMsg) return;
        const pannello = btnRiepilogoMsg.closest(".pannello");
        if (!pannello) return;

        const splitScreenEl = document.querySelector(".split-screen");
        const sezioneMsg = document.getElementById("messaggistica");

        // Larghezza vera del modulo messaggio misurata PRIMA di espandere:
        // niente calc(50% - 8px) che assume "il contenitore raddoppia
        // esattamente" (fragile — dipende da gap/padding che possono
        // scostarsi). Fissata in pixel, la colonna del messaggio resta
        // sempre esattamente quella di partenza, qualunque sia la
        // larghezza reale del pannello prima e dopo.
        const paginaBox = sezioneMsg && sezioneMsg.querySelector(".pagina-box");
        if (paginaBox && !pannello.classList.contains("pannello-fullscreen")) {
            const larghezza = paginaBox.getBoundingClientRect().width;
            if (larghezza > 0 && sezioneMsg) {
                sezioneMsg.style.setProperty("--larghezza-messaggio", larghezza + "px");
            }
        }

        const inFullscreen = pannello.classList.toggle("pannello-fullscreen");

        if (splitScreenEl) splitScreenEl.classList.toggle("ha-pannello-fullscreen", inFullscreen);
        document.body.classList.toggle("fullscreen-attivo", inFullscreen);

        btnRiepilogoMsg.classList.toggle("aperta", inFullscreen);
        if (overlayRiepilogoMsg) overlayRiepilogoMsg.hidden = !inFullscreen;
        if (frecciaRiepilogoMsg) frecciaRiepilogoMsg.textContent = inFullscreen ? "◂" : "▸";

        if (inFullscreen) caricaRiepilogoMessaggi();
        setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
    }

    // Richiude SOLO se è aperto — a differenza del toggle della tab, questi
    // due punti (cambio pannello, apertura convertitore) devono spegnere
    // l'espansione se attiva, mai accenderla per sbaglio.
    function chiudiFullscreenMessaggisticaSeAperto() {
        if (!btnRiepilogoMsg || !overlayRiepilogoMsg) return;
        // Lo stato vero è "è aperto?" (overlay non hidden), non "il
        // pannello si trova ancora con closest()?": se questa funzione
        // viene chiamata DOPO che #messaggistica è già stata spostata
        // altrove (spostaSezione fa appendChild in un altro contenitore),
        // closest(".pannello") non la trova più e prima usciva in
        // silenzio senza pulire nulla — la tab restava "aperta" e
        // l'overlay "hidden=false" per sempre, anche quando Messaggistica
        // ricompariva altrove in un pannello normale.
        if (overlayRiepilogoMsg.hidden) return;

        const pannello = btnRiepilogoMsg.closest(".pannello");
        if (pannello && pannello.classList.contains("pannello-fullscreen")) {
            toggleFullscreenMessaggistica();
            return;
        }

        // Pannello non più raggiungibile: resetta lo stato a mano, dato
        // che toggleFullscreenMessaggistica() da sola richiede di trovarlo.
        overlayRiepilogoMsg.hidden = true;
        btnRiepilogoMsg.classList.remove("aperta");
        if (frecciaRiepilogoMsg) frecciaRiepilogoMsg.textContent = "▸";
        document.body.classList.remove("fullscreen-attivo");
        const splitScreenEl = document.querySelector(".split-screen");
        if (splitScreenEl) splitScreenEl.classList.remove("ha-pannello-fullscreen");
    }

    // La tab deve sapere su quale bordo del proprio pannello agganciarsi:
    // destro se Messaggistica è nel pannello sinistro (rivolto verso
    // l'altro), sinistro se è nel pannello destro. Le stesse classi vanno
    // anche sulla SEZIONE (non solo sulla tab): servono al CSS per dare al
    // contenuto un padding extra su quel lato — senza, il testo di
    // Messaggistica parte da dove parte sempre (16px, il padding di
    // .pannello-corpo) e finisce SOTTO la tab, che è larga 34px e
    // posizionata rispetto al pannello, non al contenuto.
    function aggiornaLatoTab() {
        if (!btnRiepilogoMsg) return;
        const sezioneMsg = document.getElementById("messaggistica");
        const pannelloMsg = sezioneMsg && sezioneMsg.closest(".pannello");
        if (!pannelloMsg) return;
        const aSinistra = pannelloMsg.id === "pannello-sinistra";
        btnRiepilogoMsg.classList.toggle("lato-destro-interno", aSinistra);
        btnRiepilogoMsg.classList.toggle("lato-sinistro-interno", !aSinistra);
        if (sezioneMsg) {
            sezioneMsg.classList.toggle("lato-destro-interno", aSinistra);
            sezioneMsg.classList.toggle("lato-sinistro-interno", !aSinistra);
        }
    }

    // La tab compare (sempre, non solo con dati: senza, l'aggiornamento
    // periodico la fa apparire/sparire e sembra uno spazio sbagliato nel
    // layout) finché Messaggistica è attiva in un pannello. Si "accende"
    // (classe "con-dati") solo quando ci sono davvero messaggi con link.
    function aggiornaVisualizzazioneTab() {
        if (!btnRiepilogoMsg) return;
        btnRiepilogoMsg.hidden = !messaggisticaAttivaInUnPannello();
        btnRiepilogoMsg.classList.toggle("con-dati", haDatiRiepilogo);
        aggiornaLatoTab();
    }

    // Unica fonte di verità su "ci sono dati da mostrare?", aggiornata da
    // aggiornaVisibilitaTab().
    let haDatiRiepilogo = false;

    // Un unico punto sulla mini-mappa (marker + cerchio di precisione),
    // riusando lo stesso linguaggio visivo della mappa Comando: cerchio
    // semitrasparente il cui raggio è l'accuratezza in metri.
    // Un punto per riga (marker + cerchio di precisione), col popup che
    // mostra tutti i dati disponibili per quella posizione — non solo lat/lon.
    // Ultima posizione ricevuta (timestamp più recente) fra le righe di un
    // ID ricerca: è quella da proporre nel convertitore coordinate — non
    // la più precisa, ma l'ultima nel tempo (il locator manda fino a 3
    // tentativi solo se la precisione migliora, quindi in pratica coincidono
    // quasi sempre, ma il criterio chiesto è "ultima", non "più precisa").
    function puntoUltimo(righePosizione) {
        return righePosizione.reduce((ultimo, riga) => {
            if (!ultimo) return riga;
            const tUltimo = ultimo.Timestamp ? new Date(ultimo.Timestamp).getTime() : 0;
            const tRiga = riga.Timestamp ? new Date(riga.Timestamp).getTime() : 0;
            return tRiga > tUltimo ? riga : ultimo;
        }, null);
    }

    // La posizione con il raggio di precisione più piccolo, cioè quella
    // "migliore" da mostrare sola sulla mappa di default. Se nessuna riga
    // ha un'Accuratezza leggibile, ricade sull'ultima per timestamp: la
    // mappa non deve mai restare vuota solo perché manca quel dato.
    function posizionePiuPrecisa(righePosizione) {
        const conRaggio = righePosizione
            .map(riga => ({ riga, raggio: numeroLocale(riga.Accuratezza) }))
            .filter(v => isFinite(v.raggio) && v.raggio > 0);
        if (!conRaggio.length) return puntoUltimo(righePosizione);
        return conRaggio.reduce((migliore, v) => v.raggio < migliore.raggio ? v : migliore).riga;
    }

    // "statoMappa" è un oggetto {mappa, gruppo} tenuto dal chiamante (una
    // per ogni riga di messaggio): permette di ridisegnare i punti sulla
    // STESSA mappa Leaflet già creata invece di ricrearla da zero ogni
    // volta che si passa da "solo la più precisa" a "tutte" — Leaflet non
    // ammette due L.map() sullo stesso contenitore senza distruggere la
    // prima esplicitamente, e ricrearla perderebbe anche lo zoom scelto
    // dall'operatore.

    // Precisione arrotondata al metro (Math.round, non tronca a caso), e
    // oltre 1000 m non si mostra il valore esatto — sopra quella soglia
    // non è un dato utile su cui orientarsi, solo rumore. testoPrecisione
    // resta testo semplice (usato anche nel popup del marker, che non ha
    // bisogno di colore); soloSoglia dice al chiamante se colorarla di
    // rosso (solo la tabella lo fa, il popup no).
    function testoPrecisione(raggio) {
        if (!isFinite(raggio) || raggio <= 0) return "-";
        const arrotondato = Math.round(raggio);
        return arrotondato > 1000 ? "> 1000 m" : ("± " + arrotondato + " m");
    }
    function precisioneOltreSoglia(raggio) {
        return isFinite(raggio) && Math.round(raggio) > 1000;
    }

    // mostraTutte=false (default): un solo marker, quello più preciso, con
    // il suo cerchio di precisione. mostraTutte=true: tutti i marker delle
    // posizioni ricevute, senza cerchi (troppi cerchi sovrapposti confondono
    // più che aiutare). posizioneForzata: se l'operatore ha selezionato una
    // riga in tabella, è LEI a decidere cosa disegnare — ha priorità su
    // mostraTutte, che in quel caso viene ignorato.
    function disegnaPuntiPosizione(mappaEl, righePosizioneComplete, statoMappa, opzioni) {
        if (!window.L || !righePosizioneComplete.length) return;
        const mostraTutte = !!(opzioni && opzioni.mostraTutte);
        const posizioneForzata = opzioni && opzioni.posizioneForzata;

        // Numerazione cronologica (1 = più vecchia) calcolata SEMPRE su
        // tutte le posizioni ricevute, indipendentemente da quante se ne
        // disegnano: il numero di una riga deve restare lo stesso sia in
        // modalità "solo la più precisa" sia in modalità "tutte", o non
        // corrisponderebbe più al numero nella tabella a fianco.
        const righeOrdinate = righePosizioneComplete.slice().sort((a, b) => {
            const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
            const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
            return ta - tb;
        });
        const numeroDiRiga = new Map();
        righeOrdinate.forEach((riga, indice) => numeroDiRiga.set(riga, indice + 1));

        const daDisegnare = posizioneForzata
            ? [posizioneForzata]
            : (mostraTutte ? righeOrdinate : [posizionePiuPrecisa(righePosizioneComplete)].filter(Boolean));

        // Leaflet richiede una vista iniziale (centro+zoom) prima di poter
        // calcolare i bounds di un cerchio: Circle.getBounds() legge la
        // proiezione interna della mappa, che non esiste finché non è stata
        // chiamata almeno una volta setView(). Senza, fitBounds() va in
        // errore ("Cannot read properties of undefined (reading
        // 'layerPointToLatLng')") appena il gruppo contiene un cerchio di
        // precisione — e quell'errore blocca tutto il resto della funzione,
        // compreso il centraggio finale. Creata una sola volta: le chiamate
        // successive (cambio modalità) riusano statoMappa.mappa.
        if (!statoMappa.mappa) {
            const primoValido = righeOrdinate
                .map(r => [numeroLocale(r.Lat), numeroLocale(r.Lng)])
                .find(([lat, lng]) => isFinite(lat) && isFinite(lng));

            statoMappa.mappa = L.map(mappaEl, { attributionControl: false })
                .setView(primoValido || [41.9, 12.5], primoValido ? 15 : 5);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
                .addTo(statoMappa.mappa);
        }
        const mappa = statoMappa.mappa;

        // Cambio modalità: via i marker/cerchi di prima, si ridisegna da capo
        if (statoMappa.gruppo) mappa.removeLayer(statoMappa.gruppo);

        // Stesso linguaggio visivo dei rombi numerati dei Reparti Volo nel
        // convertitore coordinate: cerchio pieno con il numero al centro.
        function iconaPuntoNumerato(numero) {
            return L.divIcon({
                className: "",
                html: `<div style="width:24px;height:24px;border-radius:50%;background:#AF2B1E;border:2px solid #121212;box-shadow:0 0 6px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;">
                           <span style="color:#fff;font:bold 12px Arial;">${numero}</span>
                       </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
        }

        const gruppo = L.featureGroup();
        daDisegnare.forEach(riga => {
            const lat = numeroLocale(riga.Lat), lng = numeroLocale(riga.Lng);
            if (!isFinite(lat) || !isFinite(lng)) return;

            const raggio = numeroLocale(riga.Accuratezza);
            const altitudine = numeroLocale(riga.Altitudine);
            const accAltitudine = numeroLocale(riga.AccuratezzaAltitudine);
            const direzione = numeroLocale(riga.Direzione);
            const velocita = numeroLocale(riga.Velocita);
            const orario = riga.Timestamp ? new Date(riga.Timestamp).toLocaleString("it-IT") : "-";
            const numero = numeroDiRiga.get(riga);

            const marker = L.marker([lat, lng], { icon: iconaPuntoNumerato(numero) }).addTo(gruppo);
            marker.bindPopup(`
                <b>Punto ${numero} — ${riga.Fonte || "Posizione"}</b><br>
                Orario: ${orario}<br>
                Lat/Lon: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                Precisione: ${testoPrecisione(raggio)}<br>
                Altitudine: ${isFinite(altitudine) ? altitudine + " m" : "-"}${isFinite(accAltitudine) ? " (± " + accAltitudine + " m)" : ""}<br>
                Direzione: ${isFinite(direzione) ? direzione + "°" : "-"}<br>
                Velocità: ${isFinite(velocita) ? velocita + " km/h" : "-"}
            `);

            // Il cerchio di precisione compare solo quando è mostrata UNA
            // sola posizione: con tutte le posizioni insieme i cerchi si
            // sovrappongono e confondono più di quanto aiutino.
            // Il cerchio di precisione compare quando è mostrata UNA sola
            // posizione (di default, o perché selezionata a mano): con
            // tutte le posizioni insieme i cerchi si sovrappongono e
            // confondono più di quanto aiutino.
            if (daDisegnare.length === 1 && isFinite(raggio) && raggio > 0) {
                L.circle([lat, lng], {
                    radius: raggio, color: "#AF2B1E", fillColor: "#AF2B1E", fillOpacity: 0.15, weight: 1
                }).addTo(gruppo);
            }
        });
        gruppo.addTo(mappa);
        statoMappa.gruppo = gruppo;

        // BUG: fitBounds veniva chiamato quando il contenitore poteva
        // essere ancora a dimensione zero (l'accordion si è appena aperto,
        // il layout del browser non si è ancora assestato) — Leaflet
        // calcolava lo zoom su un riquadro 0×0 e il centraggio falliva
        // silenziosamente. Un setTimeout a tempo fisso è solo una stima:
        // se il layout ci mette di più (pannello grande, dispositivo
        // lento), scatta comunque troppo presto. Con un doppio
        // requestAnimationFrame si aspetta invece che il browser abbia
        // DAVVERO finito il primo giro di layout/paint prima di misurare.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                mappa.invalidateSize();
                if (gruppo.getLayers().length) mappa.fitBounds(gruppo.getBounds().pad(0.3));
                else mappa.setView([41.9, 12.5], 5);
            });
        });
    }

    // Elenco di TUTTE le posizioni ricevute, più recenti in cima, con la
    // precisione indicata riga per riga (non è un criterio di
    // ordinamento: serve solo a leggerla a colpo d'occhio). Il numero in
    // prima colonna è lo stesso che compare sul marker corrispondente
    // sulla mappa, in modalità "tutte" — così una riga si ritrova subito.
    function costruisciTabellaPosizioni(righePosizioneComplete, numeroDiRiga) {
        const righeVisibili = righePosizioneComplete
            .filter(riga => isFinite(numeroLocale(riga.Lat)) && isFinite(numeroLocale(riga.Lng)))
            .slice()
            .sort((a, b) => {
                const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
                const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
                return tb - ta; // più recenti in cima
            });

        const righeHtml = righeVisibili.map(riga => {
            const raggio = numeroLocale(riga.Accuratezza);
            // Data oltre all'ora: le 24h di finestra possono attraversare
            // la mezzanotte, e "14:39" da solo non direbbe più di che giorno.
            const ricevuta = riga.Timestamp
                ? new Date(riga.Timestamp).toLocaleString("it-IT", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
                })
                : "-";
            const numero = numeroDiRiga.get(riga) || "-";
            const classePrecisione = precisioneOltreSoglia(raggio) ? " riepilogo-msg-precisione-alta" : "";
            return `<tr class="riepilogo-msg-riga-posizione" data-numero="${numero}" tabindex="0">
                <td>${numero}</td>
                <td>${ricevuta}</td>
                <td class="${classePrecisione}">${testoPrecisione(raggio)}</td>
            </tr>`;
        }).join("");

        return `<table class="riepilogo-tabella riepilogo-msg-tab-posizioni">
            <thead><tr><th>ID_POS</th><th>Ricevuta</th><th>Precisione</th></tr></thead>
            <tbody>${righeHtml}</tbody>
        </table>`;
    }

    // Porta al Convertitore Coordinate con lat/lon già impostate in formato
    // DD e avvia la conversione. Cambia il pannello che ospita la
    // Messaggistica (l'unico di cui siamo certi lato): l'altro resta come sta.
    // Il formato viene forzato su "dd" PRIMA di riempire i campi: convertitore.js
    // legge le coordinate in base a quale formato è selezionato nel menu (non
    // in base a quali campi sono compilati) — se l'utente lo aveva lasciato su
    // un altro formato (es. UTM), riempire i campi DD da soli non basterebbe.
    function apriInConvertitore(lat, lon) {
        const sezioneMsg = document.getElementById("messaggistica");
        const pannelloMsg = sezioneMsg && sezioneMsg.closest(".pannello");
        const selettore = pannelloMsg && pannelloMsg.id === "pannello-sinistra"
            ? document.getElementById("select-pannello-sinistra")
            : document.getElementById("select-pannello-destra");

        // Chiude PRIMA di cambiare pagina: appena scatta il cambio,
        // spostaSezione() sposta #messaggistica fuori dal pannello
        // (appendChild altrove) — chiuderla DOPO significherebbe cercarla
        // quando non c'è già più lì, il caso limite che la funzione qui
        // sopra ora gestisce comunque, ma è più semplice e diretto non
        // doverci contare.
        chiudiFullscreenMessaggisticaSeAperto();

        if (selettore) {
            selettore.value = "convertitore";
            selettore.dispatchEvent(new Event("change"));
        }

        // I campi del convertitore esistono solo dopo che spostaSezione() lo
        // ha inserito nel pannello: un piccolo ritardo basta ad aspettare
        // quel passaggio sincrono innescato dal cambio di select qui sopra.
        setTimeout(() => {
            const selectFormatoConv = document.getElementById("coord-formato-input");
            const campoLat = document.getElementById("coord-dd-lat");
            const campoLon = document.getElementById("coord-dd-lon");
            const segnoLat = document.getElementById("coord-dd-lat-segno");
            const segnoLon = document.getElementById("coord-dd-lon-segno");
            const btnConverti = document.getElementById("btn-coord-converti");
            if (!campoLat || !campoLon) return;

            if (selectFormatoConv && selectFormatoConv.value !== "dd") {
                selectFormatoConv.value = "dd";
                selectFormatoConv.dispatchEvent(new Event("change"));
            }

            if (segnoLat) segnoLat.value = lat < 0 ? "-" : "+";
            if (segnoLon) segnoLon.value = lon < 0 ? "-" : "+";
            campoLat.value = Math.abs(lat).toFixed(6);
            campoLon.value = Math.abs(lon).toFixed(6);

            // Se il Convertitore ha già fatto una conversione in questa
            // sessione, il pulsante non è più "Converti" ma "✏️ Modifica
            // dati inseriti" (conversioneFatta=true dentro convertitore.js):
            // un click in quello stato sblocca solo i campi per la modifica
            // e NON converte. .value= non genera eventi "input"/"change" da
            // solo, quindi senza questo il pulsante resterebbe bloccato in
            // modalità "Modifica" e il click sotto non farebbe nulla.
            // convertitore.js ascolta "input" in delega su tutto il
            // contenitore: farlo partire da qui basta a resettare lo stato,
            // che è esattamente ciò che serve prima del click vero.
            campoLat.dispatchEvent(new Event("input", { bubbles: true }));
            campoLon.dispatchEvent(new Event("input", { bubbles: true }));

            if (btnConverti) btnConverti.click();
        }, 50);
    }

    // Costruisce la riga di un singolo messaggio: stato (in attesa/ricevuto)
    // e, se ricevuto, l'accordion con la mini-mappa e il link al convertitore.
    function costruisciRigaRiepilogo(messaggio, righePosizione) {
        const ricevuto = righePosizione.length > 0;
        const idMappa = "riepilogo-mappa-" + Math.random().toString(36).slice(2, 9);

        const div = document.createElement("div");
        div.className = "riepilogo-msg-voce";
        // Dataset invece di richiedere i dati originali: riordinaRigheRiepilogo()
        // li legge direttamente dal DOM per il riordino immediato al click
        // su "Archivia" (aggiornamento ottimistico).
        div.dataset.timestamp = messaggio.Timestamp || "";

        const badge = ricevuto
            ? `<span class="riepilogo-msg-stato ricevuto">✅ Posizione ricevuta</span>`
            : `<span class="riepilogo-msg-stato in-attesa">⏳ In attesa della posizione</span>`;

        // Intestazione a frase invece dei campi affiancati e compressi:
        // telefono e canale dentro il discorso, non su una riga a parte.
        // Numero/anno intervento sono facoltativi: compaiono solo se il
        // messaggio li porta (il link "Con" li registra, "Senza" no — vedi
        // msg-numero-intervento in initLinkCoordinateUI). Vanno a capo
        // rispetto al resto della frase: sono il dato dell'intervento, non
        // la continuazione del discorso su chi/come/quando è stato inviato.
        const dataInvio = messaggio.Timestamp
            ? new Date(messaggio.Timestamp).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "-";
        const oraInvio = messaggio.Timestamp
            ? new Date(messaggio.Timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
            : "-";
        const rigaIntervento = (messaggio.NumeroIntervento || messaggio.AnnoIntervento)
            ? `<br>Intervento N. <b>${messaggio.NumeroIntervento || "-"}</b> Anno <b>${messaggio.AnnoIntervento || "-"}</b>`
            : "";

        // Tutto il contenuto normale vive dentro un involucro
        // ".riepilogo-msg-voce-corpo": il bottone "Archivia" NON ci sta
        // dentro, è un fratello a tutta altezza sul bordo destro (come la
        // tab verticale del riepilogo stesso) — .riepilogo-msg-voce
        // diventa un flex row con questi due soli figli diretti.
        // Il badge "Posizione ricevuta/In attesa" sta sulla stessa riga
        // di ID Messaggio, in alto a destra — non più sotto la frase.
        div.innerHTML = `
            <div class="riepilogo-msg-voce-corpo">
                <div class="riepilogo-msg-riga-id">
                    <span>ID Messaggio: <b>${messaggio.IdRicerca || "-"}</b></span>
                    ${badge}
                </div>
                <div class="riepilogo-msg-riga-testa">
                    <p class="riepilogo-msg-frase">
                        Messaggio inviato al n° <b>${maschera(messaggio.NumeroTelefono)}</b> con <b>${messaggio.Canale || "-"}</b>
                        il <b>${dataInvio}</b> alle ore <b>${oraInvio}</b>
                        dal comando di <b>${messaggio.Comando || "-"}</b>${rigaIntervento}
                    </p>
                </div>
            </div>
        `;
        const corpo = div.querySelector(".riepilogo-msg-voce-corpo");

        // "Archivia": sempre visibile, ma cliccabile SOLO per il Comando
        // TITOLARE (quello attivo in questa sessione) — un altro Comando
        // che vede lo stesso messaggio come limitrofo lo vede comunque (per
        // sapere che esiste quella possibilità), ma disabilitato: non è
        // "suo" da archiviare. Presente anche a messaggio ancora "in
        // attesa", non solo "ricevuto": archiviare vuol dire "questa
        // conversazione è chiusa", indipendentemente dalla posizione.
        // Resta cliccabile anche da archiviato: un secondo clic lo riporta
        // attivo, non è un'azione a senso unico.
        const comandoAttivoSessione = sessionStorage.getItem(CHIAVE_STORAGE);
        const titolare = !!(comandoAttivoSessione && messaggio.Comando === comandoAttivoSessione);

        let archiviato = String(messaggio.Archiviata).toUpperCase() === "TRUE";
        // "Mostra su mappa" e "Apri nel convertitore" (se il messaggio è
        // ricevuto: esistono solo in quel caso) vengono registrati qui e
        // bloccati/sbloccati insieme allo stato di archiviazione — un
        // messaggio archiviato è una conversazione chiusa, non ha senso
        // continuare a cercarne la posizione o passarla al convertitore.
        const bottoniDaBloccareSeArchiviato = [];
        function applicaBloccoSeArchiviato() {
            bottoniDaBloccareSeArchiviato.forEach(btn => { btn.disabled = archiviato; });
        }

        div.dataset.archiviato = archiviato ? "true" : "false";
        div.classList.toggle("archiviata", archiviato);

        const btnArchivia = document.createElement("button");
        btnArchivia.type = "button";
        btnArchivia.disabled = !titolare;

        function aggiornaAspettoBottoneArchivia() {
            btnArchivia.className = "riepilogo-msg-archivia-tab" + (archiviato ? " archiviato" : "");
            btnArchivia.title = !titolare
                ? "Puoi archiviare solo i messaggi del tuo Comando"
                : (archiviato ? "Clic per riattivare" : "Archivia messaggio");
            btnArchivia.setAttribute("aria-label", btnArchivia.title);
            // Icona + scritta verticale, stesso principio della tab
            // "Riepilogo messaggi" (icona sopra, testo ruotato sotto):
            // resta leggibile anche nella fascia stretta.
            btnArchivia.innerHTML = `<span class="riepilogo-msg-archivia-icona">🗄️</span><span class="riepilogo-msg-archivia-testo">${archiviato ? "Sblocca" : "Archivia"}</span>`;
        }
        aggiornaAspettoBottoneArchivia();

        btnArchivia.addEventListener("click", () => {
            // Aggiornamento ottimistico: mode:'no-cors' non permette di
            // leggere l'esito reale della scrittura (stesso limite di
            // inviaRigaDbIdSearch), quindi l'interfaccia si aggiorna
            // subito e non aspetta conferma dal foglio. Archiviare non
            // fa sparire la riga: resta a video (in grigio, spinta in
            // fondo alla lista) finché non esce da sé dalla finestra
            // delle 24h — e resta sempre possibile tornare indietro.
            archiviato = !archiviato;
            div.dataset.archiviato = archiviato ? "true" : "false";
            div.classList.toggle("archiviata", archiviato);
            aggiornaAspettoBottoneArchivia();
            applicaBloccoSeArchiviato();
            riordinaRigheRiepilogo();
            impostaArchiviazioneMessaggio(messaggio, archiviato);
        });

        div.appendChild(btnArchivia); // fratello di .riepilogo-msg-voce-corpo, non dentro

        if (ricevuto) {
            const azioni = document.createElement("div");
            azioni.className = "riepilogo-msg-azioni";
            azioni.innerHTML = `
                <button type="button" class="btn-toggle-radar riepilogo-msg-toggle-mappa">🗺️ Mostra su mappa (${righePosizione.length})</button>
                <button type="button" class="btn-toggle-radar riepilogo-msg-apri-convertitore">📐 Apri nel convertitore</button>
            `;
            corpo.appendChild(azioni);

            // Mappa + tabella posizioni dentro la riga (accordion): si
            // espande sotto ai pulsanti, invece di aprire il popup grande
            // sull'altro pannello. Mappa 2/3, tabella 1/3 — creata una sola
            // volta, alla prima apertura.
            const mappaWrap = document.createElement("div");
            mappaWrap.className = "riepilogo-msg-mappa-wrap";
            mappaWrap.hidden = true;
            mappaWrap.innerHTML = `
                <div class="riepilogo-msg-mappa-tabella-layout">
                    <div class="riepilogo-msg-mappa-col">
                        <div id="${idMappa}" class="riepilogo-msg-mappa"></div>
                    </div>
                    <div class="riepilogo-msg-tabella-posizioni-col">
                        <button type="button" class="btn-toggle-radar riepilogo-msg-mostra-tutte">📍 Mostra tutte le posizioni</button>
                        <div class="riepilogo-msg-tabella-posizioni-contenuto"></div>
                    </div>
                </div>
            `;
            corpo.appendChild(mappaWrap);

            // Numerazione cronologica (1 = più vecchia) condivisa fra mappa
            // e tabella: calcolata una sola volta, qui, così i due usano
            // sempre lo stesso numero per la stessa posizione.
            const righeOrdinateCronologia = righePosizione.slice().sort((a, b) => {
                const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
                const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
                return ta - tb;
            });
            const numeroDiRiga = new Map();
            righeOrdinateCronologia.forEach((riga, indice) => numeroDiRiga.set(riga, indice + 1));
            // Direzione inversa, per risalire dalla riga di tabella cliccata
            // (che conosce solo il numero, messo in data-numero) alla
            // posizione vera.
            const rigaPerNumero = new Map();
            numeroDiRiga.forEach((numero, riga) => rigaPerNumero.set(numero, riga));

            // Il pulsante "Mostra tutte le posizioni" sta FUORI da questo
            // contenitore (è sopra di lui, non dentro): .innerHTML qui
            // sostituisce solo il contenuto della tabella, non lo tocca.
            const contenitoreTabella = mappaWrap.querySelector(".riepilogo-msg-tabella-posizioni-contenuto");
            contenitoreTabella.innerHTML = costruisciTabellaPosizioni(righePosizione, numeroDiRiga);

            let mappaCreata = false;
            let mostraTutteLePosizioni = false;
            let posizioneSelezionata = null;
            const statoMappa = {}; // {mappa, gruppo}: mantiene la stessa mappa Leaflet fra i vari modi

            // Un solo punto di ridisegno: selezione, "mostra tutte" e prima
            // apertura passano tutti da qui, così la logica di priorità
            // (selezionata > mostra-tutte > più precisa) vive in un posto
            // solo. Non fa nulla se la mappa non è ancora stata aperta:
            // la selezione resta comunque in memoria e verrà rispettata
            // alla prima apertura vera.
            function ridisegnaMappaSeCreata() {
                if (!mappaCreata) return;
                disegnaPuntiPosizione(document.getElementById(idMappa), righePosizione, statoMappa, {
                    mostraTutte: mostraTutteLePosizioni,
                    posizioneForzata: posizioneSelezionata,
                });
            }

            // Toglie la selezione manuale (se c'è) e ne pulisce il segno
            // visivo in tabella: serve quando un altro comando prende il
            // sopravvento (es. "Mostra tutte le posizioni"), perché una
            // posizione selezionata avrebbe sempre la priorità e quel
            // pulsante sembrerebbe non fare nulla.
            function toglieSelezione() {
                posizioneSelezionata = null;
                contenitoreTabella.querySelectorAll(".riepilogo-msg-riga-posizione.selezionata")
                    .forEach(r => r.classList.remove("selezionata"));
            }

            const btnMostraTutte = mappaWrap.querySelector(".riepilogo-msg-mostra-tutte");

            // Posizione scelta a mano dall'operatore cliccando una riga
            // della tabella: appena selezionata deve vedersi SUBITO sulla
            // mappa (non solo determinare cosa va al convertitore). Un
            // solo clic selettivo (come un radio): cliccare la stessa riga
            // di nuovo la deseleziona e si torna al criterio automatico.
            contenitoreTabella.addEventListener("click", (ev) => {
                const riga = ev.target.closest(".riepilogo-msg-riga-posizione");
                if (!riga) return;
                const numero = parseInt(riga.dataset.numero, 10);
                const posizioneDellaRiga = rigaPerNumero.get(numero) || null;

                const eraGiaSelezionata = riga.classList.contains("selezionata");
                contenitoreTabella.querySelectorAll(".riepilogo-msg-riga-posizione.selezionata")
                    .forEach(r => r.classList.remove("selezionata"));

                if (eraGiaSelezionata) {
                    posizioneSelezionata = null; // deseleziona: torna al criterio automatico
                } else {
                    riga.classList.add("selezionata");
                    posizioneSelezionata = posizioneDellaRiga;
                }
                ridisegnaMappaSeCreata();
            });

            const btnToggleMappa = azioni.querySelector(".riepilogo-msg-toggle-mappa");
            btnToggleMappa.addEventListener("click", (ev) => {
                ev.stopPropagation();
                mappaWrap.hidden = !mappaWrap.hidden;
                // Il pulsante dice cosa succederebbe al PROSSIMO clic, non
                // cosa è appena successo: aperta -> offre di nasconderla.
                // La classe "attivo" (stessa usata ovunque nell'app per un
                // pulsante "acceso") lo colora diversamente da chiuso.
                btnToggleMappa.textContent = mappaWrap.hidden
                    ? `🗺️ Mostra su mappa (${righePosizione.length})`
                    : "🙈 Nascondi mappa";
                btnToggleMappa.classList.toggle("attivo", !mappaWrap.hidden);
                mappaWrap.classList.toggle("espansa", !mappaWrap.hidden);
                if (!mappaWrap.hidden && !mappaCreata) {
                    mappaCreata = true;
                    ridisegnaMappaSeCreata();
                }
            });

            btnMostraTutte.addEventListener("click", (ev) => {
                ev.stopPropagation();
                mostraTutteLePosizioni = !mostraTutteLePosizioni;
                btnMostraTutte.textContent = mostraTutteLePosizioni ? "📍 Solo la più precisa" : "📍 Mostra tutte le posizioni";
                btnMostraTutte.classList.toggle("attivo", mostraTutteLePosizioni);
                // Una posizione selezionata a mano avrebbe sempre la
                // priorità su questo pulsante (vedi ridisegnaMappaSeCreata):
                // senza toglierla, "Mostra tutte" sembrerebbe non fare
                // nulla se prima era stata scelta una riga in tabella.
                toglieSelezione();
                ridisegnaMappaSeCreata();
            });

            const btnApriConvertitore = azioni.querySelector(".riepilogo-msg-apri-convertitore");
            btnApriConvertitore.addEventListener("click", () => {
                // Se l'operatore ha selezionato una riga in tabella, è
                // quella a decidere — altrimenti si ricade sul criterio
                // di sempre, l'ultima posizione ricevuta.
                const scelta = posizioneSelezionata || puntoUltimo(righePosizione);
                if (scelta) apriInConvertitore(numeroLocale(scelta.Lat), numeroLocale(scelta.Lng));
            });

            // Un messaggio archiviato è una conversazione chiusa: niente
            // senso a continuare a guardarne la mappa o a passarne la
            // posizione al convertitore. Registrati qui (esistono solo
            // se ricevuto=true) e applica subito lo stato iniziale, per
            // il caso di un messaggio già archiviato al primo caricamento.
            bottoniDaBloccareSeArchiviato.push(btnToggleMappa, btnApriConvertitore);
            applicaBloccoSeArchiviato();
        }

        return div;
    }

    // Elenco comandi da interrogare: quello attivo, più i limitrofi se la
    // checkbox è spuntata. Condiviso fra il caricamento della lista e il
    // controllo "ci sono dati?" che decide se mostrare la tab.
    function comandiDaInterrogare() {
        const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE);
        if (!nomeComandoAttivo) return null;
        const comandi = [nomeComandoAttivo];
        if (chkRiepilogoLimitrofi && chkRiepilogoLimitrofi.checked) {
            comandi.push(...nomiComandiLimitrofi(nomeComandoAttivo));
        }
        return comandi;
    }

    // Un solo punto che parla con la Web App: sia il caricamento della lista
    // sia il controllo di visibilità della tab passano da qui, stessa query.
    function fetchDatiRiepilogo() {
        if (!WEBAPP_URL_ID_SEARCH || !WEBAPP_URL_ID_SEARCH.startsWith("https://")) {
            return Promise.reject(new Error("Web App non configurata"));
        }
        const comandi = comandiDaInterrogare();
        if (!comandi) return Promise.reject(new Error("Nessun Comando attivo"));

        const parametri = new URLSearchParams({ comandi: comandi.join(","), ore: "24" });
        return fetch(`${WEBAPP_URL_ID_SEARCH}?${parametri.toString()}`).then(r => r.json());
    }

    // Nodi DOM già costruiti per ciascun messaggio (chiave: IdRicerca), con
    // la loro "firma" (stato ricevuto/in-attesa + quante posizioni). Serve
    // per il refresh in background: confrontando la firma nuova con quella
    // salvata si sa SUBITO se una riga va ricostruita o lasciata stare —
    // senza, ogni giro da 60s buttava via e rifaceva tutto, chiudendo per
    // forza qualunque mappa l'operatore avesse aperto dentro una riga.
    let righeRiepilogoAttuali = new Map();

    // Riordina le righe già a schermo leggendo i dataset che ciascuna porta
    // su di sé (archiviato/timestamp), senza bisogno dei dati originali:
    // serve per il riordino IMMEDIATO al click su "Archivia" (aggiornamento
    // ottimistico, prima ancora che arrivi il prossimo refresh dal foglio).
    // Stessa regola di aggiornaRiepilogoIncrementale: non archiviati prima
    // (più recenti in cima), archiviati in fondo.
    function riordinaRigheRiepilogo() {
        const righe = Array.from(corpoRiepilogoMsg.children).filter(el => el.classList.contains("riepilogo-msg-voce"));
        righe.sort((a, b) => {
            const archA = a.dataset.archiviato === "true" ? 1 : 0;
            const archB = b.dataset.archiviato === "true" ? 1 : 0;
            if (archA !== archB) return archA - archB;
            return new Date(b.dataset.timestamp || 0) - new Date(a.dataset.timestamp || 0);
        });
        corpoRiepilogoMsg.replaceChildren(...righe);
    }

    // "Ricevuto con 3 posizioni" e "ricevuto con 3 posizioni" sono la
    // stessa situazione: non serve confrontare lat/lon riga per riga,
    // basta il conteggio — se cambia, è arrivato qualcosa di nuovo.
    function firmaRighePosizione(righePosizione) {
        return righePosizione.length > 0 ? ("ricevuto:" + righePosizione.length) : "in-attesa";
    }

    // Confronta i dati appena scaricati con le righe già a schermo e
    // aggiorna SOLO quelle cambiate. corpoRiepilogoMsg.replaceChildren
    // riordina i nodi esistenti senza distruggerli (stesso riferimento =
    // stesso accordion aperto, stessa mappa già disegnata dentro); un nodo
    // nuovo lo crea da zero, uno sparito dai dati semplicemente non viene
    // più incluso nell'elenco passato a replaceChildren.
    function aggiornaRiepilogoIncrementale(messaggi, posizioni) {
        if (!messaggi.length) {
            corpoRiepilogoMsg.innerHTML = `<p class="pagina-nota">Nessun messaggio con link nelle ultime 24 ore.</p>`;
            righeRiepilogoAttuali = new Map();
            return;
        }

        // Non archiviati prima (più recenti in cima come sempre),
        // archiviati in fondo (fra loro, sempre dal più recente).
        const ordinati = messaggi.slice().sort((a, b) => {
            const archA = String(a.Archiviata).toUpperCase() === "TRUE" ? 1 : 0;
            const archB = String(b.Archiviata).toUpperCase() === "TRUE" ? 1 : 0;
            if (archA !== archB) return archA - archB;
            return new Date(b.Timestamp) - new Date(a.Timestamp);
        });
        const mappaAggiornata = new Map();
        const elementiOrdinati = [];

        ordinati.forEach((messaggio, indice) => {
            // Fallback se un messaggio arrivasse senza IdRicerca: non
            // dovrebbe succedere (il link lo richiede), ma non deve
            // rompere il confronto per gli altri se capita.
            const chiave = messaggio.IdRicerca || ("_senza-id-" + indice);
            const righePosizione = posizioni.filter(p => p.IdRicerca === messaggio.IdRicerca);
            // Include lo stato "archiviata": se cambia da un'altra sessione
            // (un'altra postazione dello stesso Comando), il pulsante deve
            // aggiornarsi da solo al giro di refresh successivo, non solo
            // quando l'archiviazione parte da questa stessa riga.
            const firma = firmaRighePosizione(righePosizione) + "|arch:" + String(messaggio.Archiviata).toUpperCase();
            const esistente = righeRiepilogoAttuali.get(chiave);

            const elemento = (esistente && esistente.firma === firma)
                ? esistente.elemento // invariato: si riusa lo stesso nodo
                : costruisciRigaRiepilogo(messaggio, righePosizione); // nuovo o cambiato

            mappaAggiornata.set(chiave, { elemento, firma });
            elementiOrdinati.push(elemento);
        });

        righeRiepilogoAttuali = mappaAggiornata;
        corpoRiepilogoMsg.replaceChildren(...elementiOrdinati);
    }

    function caricaRiepilogoMessaggi() {
        if (!corpoRiepilogoMsg) return;
        if (!WEBAPP_URL_ID_SEARCH || !WEBAPP_URL_ID_SEARCH.startsWith("https://")) {
            corpoRiepilogoMsg.innerHTML = `<p class="pagina-nota">Web App non ancora configurata (WEBAPP_URL_ID_SEARCH).</p>`;
            righeRiepilogoAttuali = new Map();
            if (elCaricamentoRiepilogo) elCaricamentoRiepilogo.hidden = true;
            return;
        }
        if (!comandiDaInterrogare()) {
            corpoRiepilogoMsg.innerHTML = `<p class="pagina-nota">Seleziona prima un Comando.</p>`;
            righeRiepilogoAttuali = new Map();
            if (elCaricamentoRiepilogo) elCaricamentoRiepilogo.hidden = true;
            return;
        }

        // "Caricamento..." solo al primo giro (corpo ancora vuoto): un
        // refresh in background su una lista già a schermo non deve farla
        // sparire nemmeno per un istante, altrimenti è uguale a prima.
        if (righeRiepilogoAttuali.size === 0) {
            corpoRiepilogoMsg.innerHTML = `<p class="pagina-nota">Caricamento...</p>`;
        }

        // La clessidra invece compare SEMPRE mentre una richiesta è in
        // volo, anche sui refresh in background: è lì apposta per far
        // vedere che sta succedendo qualcosa quando la lista non cambia
        // visibilmente da sola.
        if (elCaricamentoRiepilogo) elCaricamentoRiepilogo.hidden = false;

        fetchDatiRiepilogo()
            .then(dati => aggiornaRiepilogoIncrementale(dati.messaggi || [], dati.posizioni || []))
            .catch(() => {
                // Con righe già a schermo un errore di rete passeggero non
                // le tocca: restano com'erano, si riprova al giro dopo.
                if (righeRiepilogoAttuali.size === 0) {
                    corpoRiepilogoMsg.innerHTML = `<p class="pagina-nota">Errore nel caricamento del riepilogo.</p>`;
                }
            })
            .finally(() => {
                // Sia in caso di successo sia di errore: la richiesta non
                // è più "in volo".
                if (elCaricamentoRiepilogo) elCaricamentoRiepilogo.hidden = true;
            });
    }

    // Non decide più se la tab compare (ora è sempre visibile): dice solo
    // se "accenderla" — classe "con-dati" — perché c'è almeno un messaggio
    // con link nelle ultime 24h.
    function aggiornaVisibilitaTab() {
        if (!WEBAPP_URL_ID_SEARCH || !WEBAPP_URL_ID_SEARCH.startsWith("https://") || !comandiDaInterrogare()) {
            haDatiRiepilogo = false;
            aggiornaVisualizzazioneTab();
            return;
        }
        fetchDatiRiepilogo()
            .then(dati => {
                haDatiRiepilogo = !!(dati.messaggi && dati.messaggi.length);
                aggiornaVisualizzazioneTab();
            })
            .catch(() => {
                haDatiRiepilogo = false;
                aggiornaVisualizzazioneTab();
            });
    }

    if (btnAggiornaRiepilogo) btnAggiornaRiepilogo.addEventListener("click", caricaRiepilogoMessaggi);

    // Aggiornamento automatico ogni 60 secondi: la lista solo se il
    // pannello è aperto (non ha senso interrogare il foglio a vuoto se
    // nessuno lo sta guardando), la visibilità della tab sempre — è così
    // che ci si accorge che è arrivato un nuovo messaggio senza doverlo
    // aprire per controllare.
    setInterval(() => {
        if (overlayRiepilogoMsg && !overlayRiepilogoMsg.hidden) caricaRiepilogoMessaggi();
        aggiornaVisibilitaTab();
    }, 60000);

    if (btnRiepilogoMsg) {
        btnRiepilogoMsg.addEventListener("click", (ev) => {
            ev.stopPropagation();
            toggleFullscreenMessaggistica();
        });
    }
    // "Chiudi" (X) sul riquadro riepilogo: stessa azione della tab, riduce
    // di nuovo Messaggistica — non c'è più un "fuori" da cui richiudere,
    // ora è parte dello stesso contenitore che si allunga/accorcia.
    if (chiudiRiepilogoMsgBtn) chiudiRiepilogoMsgBtn.addEventListener("click", toggleFullscreenMessaggistica);
    if (chkRiepilogoLimitrofi) chkRiepilogoLimitrofi.addEventListener("change", () => {
        caricaRiepilogoMessaggi();
        aggiornaVisibilitaTab();
    });

    // Cambiare la pagina mostrata in un pannello, mentre Messaggistica è
    // espansa altrove, lascerebbe l'espansione aperta su un pannello che
    // ormai è un'altra pagina: si riduce appena l'utente cambia selezione.
    // La tab va ricontrollata (Messaggistica potrebbe non essere più
    // attiva in nessuno dei due pannelli).
    const selettorePannelloSx = document.getElementById("select-pannello-sinistra");
    const selettorePannelloDx = document.getElementById("select-pannello-destra");
    [selettorePannelloSx, selettorePannelloDx].forEach(sel => {
        if (sel) sel.addEventListener("change", () => {
            chiudiFullscreenMessaggisticaSeAperto();
            aggiornaVisualizzazioneTab();
        });
    });
    aggiornaVisualizzazioneTab(); // stato iniziale (nascosta finché non si sa se ci sono dati)
    aggiornaVisibilitaTab(); // stato iniziale: mostra la tab solo se ci sono già dati

    // Il messaggio precompilato dipende dal Comando attivo: quando cambia
    // (lo dice attivaComando() in script-bis.js con questo evento, la stessa
    // via già usata da convertitore.js) lo rigeneriamo qui.
    document.addEventListener("fireops:comando-attivo-cambiato", () => {
        generaMessaggioMessaggistica();
        aggiornaVisibilitaTab(); // Comando diverso = messaggi diversi, magari nessuno
        // aggiornaVisibilitaTab() da sola ricontrolla solo se la TAB deve
        // accendersi o no — non tocca la lista già a video. Se il
        // riepilogo è aperto in quel momento, senza questa riga restava
        // fermo sui messaggi del Comando precedente fino al refresh
        // automatico di sfondo (fino a 60 secondi dopo).
        if (overlayRiepilogoMsg && !overlayRiepilogoMsg.hidden) caricaRiepilogoMessaggi();
    });
});