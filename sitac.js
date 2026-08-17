/*!
 * FireOps VVF — sitac.js — SITAC incendio boschivo
 * Dipendenze (nell'ordine): Leaflet 1.9 · Geoman 2.15 · PolylineDecorator 1.6
 *                           sitac-simboli.js (dati della simbologia)
 *                           sitac-vento.js (vento, cono, fronti)
 * Markup: sezione #sitac-aib di index.html
 * Stile:  style.css, sezione MODULI AGGIUNTIVI
 *
 * IMPIANTO
 * Due colonne: a sinistra i comandi, a destra la mappa. La barra segue
 * l'ordine in cui una SITAC si compila davvero — intervento, posizione,
 * area d'origine, vento, fronte, superficie, e solo dopo le quattro tavole
 * della pubblicazione. La sequenza SUGGERISCE, non impone: una SITAC si
 * apre spesso a incendio già in corso, col numero d'intervento che arriva
 * dopo e il fronte dettato per radio.
 *
 * NIENTE DIALOGHI DEL BROWSER
 * prompt() e confirm() intestano la finestra col dominio del sito
 * (vvfsendwhatsapp.github.io), che in sala operativa non dice niente a
 * nessuno. Al loro posto c'è un modale interno che dice FireOps VVF.
 *
 * DIREZIONE A DUE PUNTI
 * I simboli orientabili (vento, pendenze, lanci, Transit Point) non
 * chiedono un azimut da digitare: si posa il simbolo, si clicca dove
 * punta, e resta una maniglia trascinabile. Su una carta si ragiona per
 * direzioni viste, non per gradi.
 *
 * STATO PREVISTO / IN ATTO
 * La tavola distingue ciò che è pianificato da ciò che è in atto. Non sono
 * voci separate ma un interruttore in cima, che resta fisso mentre si
 * scorre: vale per il prossimo elemento disegnato e viaggia nel GeoJSON
 * insieme al tipo.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.Sitac) return;

function avvia(app){
  /* Bandiere, descrizione e pulsante Espandi stanno nella riga sopra
     #sitac-app, fuori dal riquadro: le ricerche partono dalla sezione. */
  const radice = app.closest('.page-section') || app;
  const q  = s => radice.querySelector(s);
  const qq = s => radice.querySelectorAll(s);

  /* =======================================================================
     0. LINGUE
     La chiave `tipo` nel GeoJSON resta sempre quella tecnica: cambiare
     lingua non tocca in alcun modo i file esportati.
     ===================================================================== */
  const BANDIERE = {
    it:'<svg viewBox="0 0 9 6"><rect width="3" height="6" fill="#008C45"/><rect x="3" width="3" height="6" fill="#F4F5F0"/><rect x="6" width="3" height="6" fill="#CD212A"/></svg>',
    en:'<svg viewBox="0 0 60 30"><clipPath id="cUk"><rect width="60" height="30"/></clipPath><g clip-path="url(#cUk)"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="3"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
    fr:'<svg viewBox="0 0 9 6"><rect width="3" height="6" fill="#002395"/><rect x="3" width="3" height="6" fill="#fff"/><rect x="6" width="3" height="6" fill="#ED2939"/></svg>',
    es:'<svg viewBox="0 0 12 8"><rect width="12" height="8" fill="#AA151B"/><rect y="2" width="12" height="4" fill="#F1BF00"/></svg>'
  };

  const L10N = {
    it:{
      sub:'Segui i passi a sinistra: prima i dati, poi lo scenario, poi le quattro tavole. Doppio clic o Invio per chiudere una linea.',
      gStato:'Stato', statoPrevisto:'Previsto', statoAttivo:'In atto',
      nIntervento:'N. intervento', nDos:'DOS', dosAiuto:'Lettera e tre cifre, es. A123',
      ventoLeggo:'Lettura del vento in corso…',
      ventoErrore:'Vento non disponibile: {e}',
      gPunti:'Punti', gLinee:'Linee', gAree:'Aree',
      areeFuori:'Perimetri fuori tavola SITAC: servono al calcolo di superficie e perimetro.',
      gModifica:'Modifica', gMappa:'Mappa e dati', gEsporta:'Esportazione',
      legenda:'Legenda', legVuota:'Nessun elemento sulla mappa.',
      bSposta:'Sposta', bElimina:'Elimina', bAnnulla:'Annulla ultimo', bPulisci:'Cancella tutto',
      bSfondo:'Sfondo', bImporta:'Importa', bStampa:'Stampa PDF', bCentra:'Centra sulla mia posizione',
      pronto:'Pronto.\nApri un passo a sinistra e scegli uno strumento.',
      spento:'Strumento disattivato.',
      suggLinea:'Clic per i vertici, doppio clic per chiudere.',
      suggArea:'Clic per i vertici, clic sul primo per chiudere.',
      suggSimbolo:'Clic sulla mappa per posizionare.',
      chiediSigla:'Sigla o testo da scrivere nel simbolo',
      chiediNota:'Testo dell\u2019annotazione',
      chiediDirezione:'Clicca sulla mappa dove punta il simbolo.\nPoi puoi trascinare la maniglia.',
      confPulisci:'Cancellare tutti gli elementi disegnati?',
      ok:'Conferma', annulla:'Annulla', titoloModale:'FireOps VVF — SITAC',
      modOn:'Modifica attiva.\nTrascina i vertici o i simboli.', modOff:'Modifica disattivata.',
      elimOn:'Eliminazione attiva.\nClic su un elemento per rimuoverlo.', elimOff:'Eliminazione disattivata.',
      nienteAnnulla:'Niente da annullare.', giaVuota:'La mappa è già vuota.',
      sfondo:'Sfondo: {n}', localizzo:'Localizzazione in corso…',
      posizione:'Posizione: {lat}, {lon}\n±{m} m',
      posErrore:'Posizione non disponibile.\nSu http non locale il GPS è bloccato.',
      nienteExport:'Niente da esportare.',
      geojsonFatto:'GeoJSON: {n} elementi.\nÈ l\'unico formato che rientra qui identico.',
      kmlFatto:'KML: {n} elementi ({a} poligoni).\nApribile in QGIS e Google Earth.',
      fileErrato:'File non valido: {e}', importati:'Importati {n} elementi.',
      conteggio:'{p} punti · {l} linee · {a} aree',
      superficie:'\nSuperficie totale: {v} ha', perimetro:'\nPerimetro totale: {v} km',
      areaDi:'Superficie {a} ha · perimetro {p} km', lunghezzaDi:'Lunghezza {v} km',
      kmlDoc:'SITAC incendio boschivo', kmlAree:'Aree', kmlLinee:'Linee', kmlSimboli:'Simboli',
      sfSat:'Satellite', sfTopo:'Topografico', sfStrada:'Stradale',
      stTitolo:'SITAC — Incendio boschivo', stData:'Redatta il {d}'
    },
    en:{
      sub:'Follow the steps on the left: data first, then the scenario, then the four tables. Double-click or Enter closes a line.',
      gStato:'State', statoPrevisto:'Planned', statoAttivo:'Active',
      nIntervento:'Incident no.', nDos:'DOS', dosAiuto:'One letter and three digits, e.g. A123',
      ventoLeggo:'Reading wind data…',
      ventoErrore:'Wind unavailable: {e}',
      gPunti:'Points', gLinee:'Lines', gAree:'Areas',
      areeFuori:'Polygons outside the SITAC table: used to compute area and perimeter.',
      gModifica:'Edit', gMappa:'Map and data', gEsporta:'Export',
      legenda:'Legend', legVuota:'Nothing on the map yet.',
      bSposta:'Move', bElimina:'Delete', bAnnulla:'Undo last', bPulisci:'Clear all',
      bSfondo:'Basemap', bImporta:'Import', bStampa:'Print PDF', bCentra:'Centre on my position',
      pronto:'Ready.\nOpen a step on the left and pick a tool.',
      spento:'Tool switched off.',
      suggLinea:'Click each vertex, double-click to close.',
      suggArea:'Click each vertex, click the first one to close.',
      suggSimbolo:'Click the map to place it.',
      chiediSigla:'Label to write inside the symbol',
      chiediNota:'Note text',
      chiediDirezione:'Click on the map where the symbol points.\nThen you can drag the handle.',
      confPulisci:'Delete every drawn element?',
      ok:'Confirm', annulla:'Cancel', titoloModale:'FireOps VVF — SITAC',
      modOn:'Edit mode on.\nDrag vertices or symbols.', modOff:'Edit mode off.',
      elimOn:'Delete mode on.\nClick an element to remove it.', elimOff:'Delete mode off.',
      nienteAnnulla:'Nothing to undo.', giaVuota:'The map is already empty.',
      sfondo:'Basemap: {n}', localizzo:'Locating…',
      posizione:'Position: {lat}, {lon}\n±{m} m',
      posErrore:'Position unavailable.\nGPS is blocked on non-local http.',
      nienteExport:'Nothing to export.',
      geojsonFatto:'GeoJSON: {n} elements.\nThe only format that comes back in unchanged.',
      kmlFatto:'KML: {n} elements ({a} polygons).\nOpens in QGIS and Google Earth.',
      fileErrato:'Invalid file: {e}', importati:'{n} elements imported.',
      conteggio:'{p} points · {l} lines · {a} areas',
      superficie:'\nTotal area: {v} ha', perimetro:'\nTotal perimeter: {v} km',
      areaDi:'Area {a} ha · perimeter {p} km', lunghezzaDi:'Length {v} km',
      kmlDoc:'Wildfire SITAC', kmlAree:'Areas', kmlLinee:'Lines', kmlSimboli:'Symbols',
      sfSat:'Satellite', sfTopo:'Topographic', sfStrada:'Street',
      stTitolo:'SITAC — Wildfire', stData:'Drawn on {d}'
    },
    fr:{
      sub:'Suivez les étapes à gauche : les données, puis la situation, puis les quatre tableaux. Double-clic ou Entrée pour fermer une ligne.',
      gStato:'État', statoPrevisto:'Prévu', statoAttivo:'En cours',
      nIntervento:'N° d\'intervention', nDos:'DOS', dosAiuto:'Une lettre et trois chiffres, ex. A123',
      ventoLeggo:'Lecture du vent en cours…',
      ventoErrore:'Vent indisponible : {e}',
      gPunti:'Points', gLinee:'Lignes', gAree:'Zones',
      areeFuori:'Polygones hors tableau SITAC : ils servent au calcul de la surface et du périmètre.',
      gModifica:'Modifier', gMappa:'Carte et données', gEsporta:'Exportation',
      legenda:'Légende', legVuota:'Rien sur la carte pour le moment.',
      bSposta:'Déplacer', bElimina:'Supprimer', bAnnulla:'Annuler le dernier', bPulisci:'Tout effacer',
      bSfondo:'Fond de carte', bImporta:'Importer', bStampa:'Imprimer PDF', bCentra:'Centrer sur ma position',
      pronto:'Prêt.\nOuvrez une étape à gauche et choisissez un outil.',
      spento:'Outil désactivé.',
      suggLinea:'Cliquez chaque sommet, double-clic pour fermer.',
      suggArea:'Cliquez chaque sommet, cliquez le premier pour fermer.',
      suggSimbolo:'Cliquez sur la carte pour le poser.',
      chiediSigla:'Texte à inscrire dans le symbole',
      chiediNota:'Texte de l\u2019annotation',
      chiediDirezione:'Cliquez sur la carte dans la direction du symbole.\nVous pourrez ensuite déplacer la poignée.',
      confPulisci:'Supprimer tous les éléments dessinés ?',
      ok:'Confirmer', annulla:'Annuler', titoloModale:'FireOps VVF — SITAC',
      modOn:'Modification active.\nDéplacez les sommets ou les symboles.', modOff:'Modification désactivée.',
      elimOn:'Suppression active.\nCliquez un élément pour le retirer.', elimOff:'Suppression désactivée.',
      nienteAnnulla:'Rien à annuler.', giaVuota:'La carte est déjà vide.',
      sfondo:'Fond : {n}', localizzo:'Localisation en cours…',
      posizione:'Position : {lat}, {lon}\n±{m} m',
      posErrore:'Position indisponible.\nLe GPS est bloqué en http non local.',
      nienteExport:'Rien à exporter.',
      geojsonFatto:'GeoJSON : {n} éléments.\nSeul format qui revient ici à l\'identique.',
      kmlFatto:'KML : {n} éléments ({a} polygones).\nS\'ouvre dans QGIS et Google Earth.',
      fileErrato:'Fichier invalide : {e}', importati:'{n} éléments importés.',
      conteggio:'{p} points · {l} lignes · {a} zones',
      superficie:'\nSurface totale : {v} ha', perimetro:'\nPérimètre total : {v} km',
      areaDi:'Surface {a} ha · périmètre {p} km', lunghezzaDi:'Longueur {v} km',
      kmlDoc:'SITAC feu de forêt', kmlAree:'Zones', kmlLinee:'Lignes', kmlSimboli:'Symboles',
      sfSat:'Satellite', sfTopo:'Topographique', sfStrada:'Routier',
      stTitolo:'SITAC — Feu de forêt', stData:'Établie le {d}'
    },
    es:{
      sub:'Sigue los pasos de la izquierda: primero los datos, luego la situación, luego las cuatro tablas. Doble clic o Intro para cerrar una línea.',
      gStato:'Estado', statoPrevisto:'Previsto', statoAttivo:'En curso',
      nIntervento:'N.º de intervención', nDos:'DOS', dosAiuto:'Una letra y tres cifras, p. ej. A123',
      ventoLeggo:'Leyendo el viento…',
      ventoErrore:'Viento no disponible: {e}',
      gPunti:'Puntos', gLinee:'Líneas', gAree:'Áreas',
      areeFuori:'Polígonos fuera de la tabla SITAC: sirven para calcular superficie y perímetro.',
      gModifica:'Editar', gMappa:'Mapa y datos', gEsporta:'Exportación',
      legenda:'Leyenda', legVuota:'Todavía no hay nada en el mapa.',
      bSposta:'Mover', bElimina:'Eliminar', bAnnulla:'Deshacer último', bPulisci:'Borrar todo',
      bSfondo:'Fondo', bImporta:'Importar', bStampa:'Imprimir PDF', bCentra:'Centrar en mi posición',
      pronto:'Listo.\nAbre un paso a la izquierda y elige una herramienta.',
      spento:'Herramienta desactivada.',
      suggLinea:'Haz clic en cada vértice, doble clic para cerrar.',
      suggArea:'Haz clic en cada vértice, clic en el primero para cerrar.',
      suggSimbolo:'Haz clic en el mapa para colocarlo.',
      chiediSigla:'Texto que va dentro del símbolo',
      chiediNota:'Texto de la anotación',
      chiediDirezione:'Haz clic en el mapa hacia donde apunta el símbolo.\nLuego puedes arrastrar el tirador.',
      confPulisci:'¿Borrar todos los elementos dibujados?',
      ok:'Confirmar', annulla:'Cancelar', titoloModale:'FireOps VVF — SITAC',
      modOn:'Edición activa.\nArrastra los vértices o los símbolos.', modOff:'Edición desactivada.',
      elimOn:'Eliminación activa.\nHaz clic en un elemento para quitarlo.', elimOff:'Eliminación desactivada.',
      nienteAnnulla:'Nada que deshacer.', giaVuota:'El mapa ya está vacío.',
      sfondo:'Fondo: {n}', localizzo:'Localizando…',
      posizione:'Posición: {lat}, {lon}\n±{m} m',
      posErrore:'Posición no disponible.\nEn http no local el GPS está bloqueado.',
      nienteExport:'Nada que exportar.',
      geojsonFatto:'GeoJSON: {n} elementos.\nEl único formato que vuelve aquí idéntico.',
      kmlFatto:'KML: {n} elementos ({a} polígonos).\nSe abre en QGIS y Google Earth.',
      fileErrato:'Archivo no válido: {e}', importati:'{n} elementos importados.',
      conteggio:'{p} puntos · {l} líneas · {a} áreas',
      superficie:'\nSuperficie total: {v} ha', perimetro:'\nPerímetro total: {v} km',
      areaDi:'Superficie {a} ha · perímetro {p} km', lunghezzaDi:'Longitud {v} km',
      kmlDoc:'SITAC incendio forestal', kmlAree:'Áreas', kmlLinee:'Líneas', kmlSimboli:'Símbolos',
      sfSat:'Satélite', sfTopo:'Topográfico', sfStrada:'Callejero',
      stTitolo:'SITAC — Incendio forestal', stData:'Redactada el {d}'
    }
  };

  /* Le voci dei passi e del percorso guidato del cono stanno qui in blocco
     invece che dentro L10N: sono un'aggiunta successiva, e tenerle insieme
     rende evidente cosa appartiene al percorso e cosa alla tavola. Quello
     che manca in una lingua ricade sull'italiano, come fa `t`. */
  const L10N_EXTRA = {
    it:{ bCono:'Aggiungi cono',
      conoModo:'Come si costruisce il cono?',
      conoSettore:'Dal punto d\u2019innesco', conoSettoreNota:'Settore a 30° dall\u2019origine; un secondo clic dice dove sta il fronte adesso (T0).',
      conoFronte:'Dalla linea del fronte', conoFronteNota:'Si disegna il fronte rilevato e lo si fa avanzare a 15, 30 e 60 minuti.',
      conoTerzo:'Pendenza e vento composti', conoStandby:'Non ancora disponibile (fig. 4 e 5 della pubblicazione).',
      conoVia:'Togli tutti i coni', conoViaNota:'Rimuove le previsioni dalla carta.', conoTolto:'Coni rimossi.',
      conoAnnullato:'Cono annullato.',
      conoClicOrigine:'Clicca sulla mappa il punto d\u2019innesco.',
      conoClicFronte:'Clicca dove sta il fronte adesso (T0).',
      conoClicVento:'Clicca sulla mappa nella direzione verso cui va il vento.',
      conoDisegnaFronte:'Disegna la linea del fronte: clic sui vertici, doppio clic per chiudere.',
      conoDirezione:'Direzione del vento', dirWeb:'Da servizio meteo', dirWebNota:'Open-Meteo, MET Norway, OpenWeatherMap in cascata.',
      dirBussola:'Punta il telefono verso il fumo', dirBussolaNota:'Tieni il telefono verso il fronte e conferma: si legge la bussola.',
      dirBussolaNo:'Bussola non disponibile su questo dispositivo.',
      dirMappa:'Scelta sulla mappa', dirMappaNota:'Un clic nella direzione verso cui va il vento.',
      bussolaLeggo:'Lettura della bussola in corso\u2026 tieni il telefono fermo.',
      conoIntensita:'Intensit\u00e0 del vento', intWeb:'Da servizio meteo', intWebNota:'Arrotondata in eccesso a decine di km/h.',
      intScala:'Scala 10\u2013110 km/h', intScalaNota:'La colonna della tabella 1 della pubblicazione.',
      conoAvanza:'il fuoco avanza di {m} m in un\u2019ora', conoT0:'T0 — fronte rilevato',
      conoFatto:'Cono {a}° · vento {v} km/h verso {d}° ({f})\nFronte a {m} m in un\u2019ora.',
      vento_debole:'Intensit\u00e0 debole', vento_moderato:'Intensit\u00e0 moderata', vento_forte:'Intensit\u00e0 forte',
      nNominativo:'Nominativo', nTelefono:'Telefono',
      nPosizione:'Posizione attuale', bConvalida:'Convalida',
      datiOk:'Dati convalidati: intervento {i}, {n}.',
      datiMancanti:'Mancano o non sono validi: {c}',
      statoPrevista:'Prevista', statoAttiva:'Attiva', statoEffettuata:'Effettuata',
      stVento:'Vento {v} km/h verso {d}° (rilevato alle {o})',
      p1:'Intervento', p2:'Vento locale', p3:'Innesco e superficie coinvolta',
      p4:'Coni di propagazione', p5:'Zona di intervento', p6:'Evoluzione dell\u2019incendio',
      p7:'Dispositivo di intervento', p8:'Azioni', p9:'Modifica', p10:'Esportazione',
      nDos:'ID DOS', dosAiuto:'Quattro caratteri, cifre o lettere. Es. VF 12A4',
      posDos:'Posizione DOS',
      posComeQuale:'Come indichi la posizione del DOS?',
      posGps:'Localizzazione GPS', posGpsNota:'Legge dove sta questo dispositivo.',
      posCoord:'Inserisci le coordinate', posCoordNota:'Gradi decimali, separati da virgola.',
      posMappa:'Clic sulla mappa', posMappaNota:'Un clic dove sta il DOS.',
      posClicMappa:'Clicca sulla mappa la posizione del DOS.',
      chiediCoord:'Coordinate: latitudine, longitudine in gradi decimali',
      coordErrate:'Coordinate non valide.',
      provincia:'Provincia', comando:'Comando afferente',
      geoLeggo:'Ricerca della provincia in corso\u2026',
      geoErrore:'Provincia non determinata: {e}',
      geoFatto:'DOS in provincia di {p}.',
      bVentoDir:'Direzione sulla mappa', bVentoWeb:'Leggi da Open-Meteo',
      ventoTrascina:'Trascina la punta della freccia: indica dove VA il vento.',
      ventoNoDos:'Prima indica la posizione del DOS al passo 1.',
      ventoNota:'La stima da servizio meteo non vede il vento di versante: correggila a vista.',
      ventoImpostato:'Vento {v} km/h verso {d}\u00b0 ({f}).',
      statoDispositivo:'Stato del dispositivo', statoAzioni:'Stato delle azioni',
      bSfondo:'Mappa: {n}',
      p2Nota:'Il rilievo è la posizione di questo dispositivo: in sala operativa non è quella del DOS.',
      pFatto:'\u2713', pManca:'da fare',
      pInneschi:'{n} sul terreno', pFronti:'{n} tracciati', pConi:'{n} coni',
      pEttari:'{v} ha', pNessuno:'nessuno',
      dosDove:'Posizione rilevata. Cosa ne faccio?',
      dosPosa:'Posa qui il simbolo DOS', dosSposta:'Sposta qui il DOS',
      dosSolo:'Tieni solo le coordinate', dosPosato:'DOS posato sulla posizione rilevata.',
      conoElemento:'Da un\u2019area o un fronte gi\u00e0 disegnati',
      conoElementoNota:'Di un\u2019area percorsa si prende il bordo sottovento; di un fronte, il tracciato.',
      conoNienteBase:'Nessuna area percorsa n\u00e9 fronte sulla carta: disegnane uno, o usa gli altri modi.',
      conoScegliBase:'Clicca sulla mappa l\u2019area o il fronte da cui far partire il cono.',
      conoBaseCorta:'La geometria scelta ha troppo pochi vertici.',
      lancioManiglie:'Trascina la punta per direzione e lunghezza, il fianco per la larghezza, il centro per spostarlo.',
      lancioDi:'Asse {a} m · larghezza {b} m · {s} ha',
      ventoQuale:'Con che vento si costruisce?',
      ventoRiusa:'Vento dello scenario — {v} km/h verso {d}\u00b0',
      ventoRiusaNota:'Quello impostato al passo 2 ({f}).',
      ventoAltro:'Un vento locale diverso',
      ventoAltroNota:'Vale solo per questo cono: il quadro dello scenario non cambia.',
      reqInnesco:'punto d\u2019innesco', reqSuperficie:'superficie coinvolta',
      reqManca:'Prima servono: {c}.\nSono i dati su cui poggia tutto il resto.',
      reqBreve:'servono i passi 2 e 3',
      rilLeggo:'Lettura del rilievo in corso\u2026',
      rilErrore:'Rilievo non disponibile: {e} — cono non corretto.',
      rilFatto:'Raggi corretti per pendenza: {k}\nStima empirica, non SI.TA.C.', },
    en:{ bCono:'Add cone', conoModo:'How should the cone be built?',
      conoSettore:'From the point of origin', conoSettoreNota:'30° sector from the origin; a second click marks where the front is now (T0).',
      conoFronte:'From the fire front line', conoFronteNota:'Draw the observed front and push it forward at 15, 30 and 60 minutes.',
      conoTerzo:'Slope and wind combined', conoStandby:'Not available yet (fig. 4 and 5 of the publication).',
      conoVia:'Remove every cone', conoViaNota:'Takes the forecasts off the map.', conoTolto:'Cones removed.',
      conoAnnullato:'Cone cancelled.',
      conoClicOrigine:'Click the point of origin on the map.',
      conoClicFronte:'Click where the front is right now (T0).',
      conoClicVento:'Click on the map in the direction the wind is going.',
      conoDisegnaFronte:'Draw the front line: click each vertex, double-click to close.',
      conoDirezione:'Wind direction', dirWeb:'From weather service', dirWebNota:'Open-Meteo, MET Norway, OpenWeatherMap in turn.',
      dirBussola:'Point the phone at the smoke', dirBussolaNota:'Hold the phone towards the front and confirm: the compass is read.',
      dirBussolaNo:'Compass not available on this device.',
      dirMappa:'Pick on the map', dirMappaNota:'One click in the direction the wind is going.',
      bussolaLeggo:'Reading the compass\u2026 hold the phone still.',
      conoIntensita:'Wind speed', intWeb:'From weather service', intWebNota:'Rounded up to tens of km/h.',
      intScala:'Scale 10\u2013110 km/h', intScalaNota:'The column from table 1 of the publication.',
      conoAvanza:'fire advances {m} m in one hour', conoT0:'T0 — observed front',
      conoFatto:'Cone {a}° · wind {v} km/h towards {d}° ({f})\nFront at {m} m in one hour.',
      vento_debole:'Light', vento_moderato:'Moderate', vento_forte:'Strong',
      nNominativo:'Name', nTelefono:'Phone',
      nPosizione:'Current position', bConvalida:'Validate',
      datiOk:'Data validated: incident {i}, {n}.',
      datiMancanti:'Missing or invalid: {c}',
      statoPrevista:'Planned', statoAttiva:'Active', statoEffettuata:'Done',
      stVento:'Wind {v} km/h towards {d}° (read at {o})',
      p1:'Incident', p2:'DOS position', p3:'Area of origin',
      p4:'Wind and cones', p5:'Fire front', p6:'Area involved',
      p2Nota:'This reads where this device is: in the control room that is not where the DOS stands.',
      pFatto:'\u2713', pManca:'to do',
      pInneschi:'{n} on the ground', pFronti:'{n} drawn', pConi:'{n} cones',
      pEttari:'{v} ha', pNessuno:'none',
      dosDove:'Position acquired. What should I do with it?',
      dosPosa:'Place the DOS symbol here', dosSposta:'Move the DOS here',
      dosSolo:'Keep the coordinates only', dosPosato:'DOS placed on the acquired position.' },
    fr:{ bCono:'Ajouter un c\u00f4ne', conoModo:'Comment construire le c\u00f4ne ?',
      conoSettore:'Depuis le point d\u2019origine', conoSettoreNota:'Secteur \u00e0 30° depuis l\u2019origine ; un second clic indique o\u00f9 est le front (T0).',
      conoFronte:'Depuis la ligne de front', conoFronteNota:'Tracez le front relev\u00e9 et faites-le avancer \u00e0 15, 30 et 60 minutes.',
      conoTerzo:'Pente et vent compos\u00e9s', conoStandby:'Pas encore disponible (fig. 4 et 5 de la publication).',
      conoVia:'Retirer tous les c\u00f4nes', conoViaNota:'Enl\u00e8ve les pr\u00e9visions de la carte.', conoTolto:'C\u00f4nes retir\u00e9s.',
      conoAnnullato:'C\u00f4ne annul\u00e9.',
      conoClicOrigine:'Cliquez le point d\u2019origine sur la carte.',
      conoClicFronte:'Cliquez o\u00f9 se trouve le front maintenant (T0).',
      conoClicVento:'Cliquez sur la carte dans la direction o\u00f9 va le vent.',
      conoDisegnaFronte:'Tracez la ligne de front : cliquez chaque sommet, double-clic pour fermer.',
      conoDirezione:'Direction du vent', dirWeb:'Depuis un service m\u00e9t\u00e9o', dirWebNota:'Open-Meteo, MET Norway, OpenWeatherMap tour \u00e0 tour.',
      dirBussola:'Pointez le t\u00e9l\u00e9phone vers la fum\u00e9e', dirBussolaNota:'Tenez le t\u00e9l\u00e9phone vers le front et confirmez : la boussole est lue.',
      dirBussolaNo:'Boussole indisponible sur cet appareil.',
      dirMappa:'Choix sur la carte', dirMappaNota:'Un clic dans la direction o\u00f9 va le vent.',
      bussolaLeggo:'Lecture de la boussole\u2026 gardez le t\u00e9l\u00e9phone immobile.',
      conoIntensita:'Intensit\u00e9 du vent', intWeb:'Depuis un service m\u00e9t\u00e9o', intWebNota:'Arrondie par exc\u00e8s \u00e0 la dizaine de km/h.',
      intScala:'\u00c9chelle 10\u2013110 km/h', intScalaNota:'La colonne du tableau 1 de la publication.',
      conoAvanza:'le feu avance de {m} m en une heure', conoT0:'T0 — front relev\u00e9',
      conoFatto:'C\u00f4ne {a}° · vent {v} km/h vers {d}° ({f})\nFront \u00e0 {m} m en une heure.',
      vento_debole:'Faible', vento_moderato:'Mod\u00e9r\u00e9e', vento_forte:'Forte',
      nNominativo:'Nom', nTelefono:'T\u00e9l\u00e9phone',
      nPosizione:'Position actuelle', bConvalida:'Valider',
      datiOk:'Donn\u00e9es valid\u00e9es : intervention {i}, {n}.',
      datiMancanti:'Manquant ou invalide : {c}',
      statoPrevista:'Pr\u00e9vue', statoAttiva:'En cours', statoEffettuata:'Effectu\u00e9e',
      stVento:'Vent {v} km/h vers {d}° (relev\u00e9 \u00e0 {o})',
      p1:'Intervention', p2:'Position DOS', p3:'Zone d\u2019origine',
      p4:'Vent et c\u00f4nes', p5:'Front de flamme', p6:'Surface concern\u00e9e',
      p2Nota:'Le relev\u00e9 donne la position de cet appareil : en salle op\u00e9rationnelle ce n\u2019est pas celle du DOS.',
      pFatto:'\u2713', pManca:'\u00e0 faire',
      pInneschi:'{n} sur le terrain', pFronti:'{n} trac\u00e9s', pConi:'{n} c\u00f4nes',
      pEttari:'{v} ha', pNessuno:'aucun',
      dosDove:'Position relev\u00e9e. Qu\u2019en fait-on ?',
      dosPosa:'Poser ici le symbole DOS', dosSposta:'D\u00e9placer le DOS ici',
      dosSolo:'Garder seulement les coordonn\u00e9es', dosPosato:'DOS pos\u00e9 sur la position relev\u00e9e.' },
    es:{ bCono:'A\u00f1adir cono', conoModo:'\u00bfC\u00f3mo se construye el cono?',
      conoSettore:'Desde el punto de origen', conoSettoreNota:'Sector de 30° desde el origen; un segundo clic marca d\u00f3nde est\u00e1 el frente (T0).',
      conoFronte:'Desde la l\u00ednea del frente', conoFronteNota:'Dibuja el frente observado y hazlo avanzar a 15, 30 y 60 minutos.',
      conoTerzo:'Pendiente y viento compuestos', conoStandby:'A\u00fan no disponible (fig. 4 y 5 de la publicaci\u00f3n).',
      conoVia:'Quitar todos los conos', conoViaNota:'Retira las previsiones del mapa.', conoTolto:'Conos retirados.',
      conoAnnullato:'Cono cancelado.',
      conoClicOrigine:'Haz clic en el punto de origen.',
      conoClicFronte:'Haz clic donde est\u00e1 el frente ahora (T0).',
      conoClicVento:'Haz clic en el mapa hacia donde va el viento.',
      conoDisegnaFronte:'Dibuja la l\u00ednea del frente: clic en cada v\u00e9rtice, doble clic para cerrar.',
      conoDirezione:'Direcci\u00f3n del viento', dirWeb:'Desde servicio meteorol\u00f3gico', dirWebNota:'Open-Meteo, MET Norway, OpenWeatherMap en cascada.',
      dirBussola:'Apunta el m\u00f3vil hacia el humo', dirBussolaNota:'Sost\u00e9n el m\u00f3vil hacia el frente y confirma: se lee la br\u00fajula.',
      dirBussolaNo:'Br\u00fajula no disponible en este dispositivo.',
      dirMappa:'Elecci\u00f3n en el mapa', dirMappaNota:'Un clic en la direcci\u00f3n hacia la que va el viento.',
      bussolaLeggo:'Leyendo la br\u00fajula\u2026 mant\u00e9n el m\u00f3vil quieto.',
      conoIntensita:'Intensidad del viento', intWeb:'Desde servicio meteorol\u00f3gico', intWebNota:'Redondeada por exceso a decenas de km/h.',
      intScala:'Escala 10\u2013110 km/h', intScalaNota:'La columna de la tabla 1 de la publicaci\u00f3n.',
      conoAvanza:'el fuego avanza {m} m en una hora', conoT0:'T0 — frente observado',
      conoFatto:'Cono {a}° · viento {v} km/h hacia {d}° ({f})\nFrente a {m} m en una hora.',
      vento_debole:'D\u00e9bil', vento_moderato:'Moderada', vento_forte:'Fuerte',
      nNominativo:'Nombre', nTelefono:'Tel\u00e9fono',
      nPosizione:'Posici\u00f3n actual', bConvalida:'Validar',
      datiOk:'Datos validados: intervenci\u00f3n {i}, {n}.',
      datiMancanti:'Faltan o no son v\u00e1lidos: {c}',
      statoPrevista:'Prevista', statoAttiva:'Activa', statoEffettuata:'Efectuada',
      stVento:'Viento {v} km/h hacia {d}° (medido a las {o})',
      p1:'Intervenci\u00f3n', p2:'Posici\u00f3n DOS', p3:'\u00c1rea de origen',
      p4:'Viento y conos', p5:'Frente de llama', p6:'Superficie afectada',
      p2Nota:'La medici\u00f3n da la posici\u00f3n de este dispositivo: en sala no es la del DOS.',
      pFatto:'\u2713', pManca:'pendiente',
      pInneschi:'{n} en el terreno', pFronti:'{n} trazados', pConi:'{n} conos',
      pEttari:'{v} ha', pNessuno:'ninguno',
      dosDove:'Posici\u00f3n obtenida. \u00bfQu\u00e9 hago con ella?',
      dosPosa:'Coloca aqu\u00ed el s\u00edmbolo DOS', dosSposta:'Mueve aqu\u00ed el DOS',
      dosSolo:'Conserva solo las coordenadas', dosPosato:'DOS colocado en la posici\u00f3n obtenida.' }
  };
  Object.keys(L10N_EXTRA).forEach(k => Object.assign(L10N[k], L10N_EXTRA[k]));

  let lingua = 'it';
  const t = (chiave, val) => {
    let s = (L10N[lingua] && L10N[lingua][chiave]) || L10N.it[chiave] || chiave;
    if (val) Object.keys(val).forEach(k => { s = s.split('{'+k+'}').join(val[k]); });
    return s;
  };
  /* I nomi della tavola esistono in italiano e inglese: per francese e
     spagnolo si ricade sull'italiano, che è la lingua della fonte. */
  const nm = d => { const x = d && d.n; return (x && (x[lingua] || x.it)) || ''; };

  /* =======================================================================
     1. SIMBOLOGIA E CATEGORIE
     ===================================================================== */
  const SIM = NS.SITAC_SIMBOLI || {};
  const LIN = NS.SITAC_LINEE   || {};
  const COL = NS.SITAC_COLORI  || {rosso:'#cc0000', verde:'#009900'};

  /* Le quattro tavole della pubblicazione, coi riquadri interni: i passi
     7-10 riproducono la stessa partizione del documento, così chi ha in
     mano il pieghevole ritrova le voci dove se le aspetta. */
  const TAVOLE = NS.SITAC_TAVOLE || [];
  const RIQUADRI = NS.SITAC_RIQUADRI || {};
  const VECCHI = NS.SITAC_VECCHI || {};
  const nmRiquadro = k => { const x = RIQUADRI[k]; return (x && (x[lingua] || x.it)) || ''; };

  /* Perimetri: la tavola SITAC non prevede poligoni campiti, ma l'area
     percorsa e il fronte attivo sono ciò che si legge per primo su una
     carta, e superficie ed ettari si calcolano solo su un poligono.
     Restano quindi qui, dichiaratamente fuori standard. */
  const AREE = {
    percorsa:   {color:'#6b6b6b', fillColor:'#3a3a3a', fillOpacity:.5, dashArray:'8,6', weight:2,
      n:{it:'Superficie percorsa', en:'Burned area', fr:'Surface parcourue', es:'Superficie quemada'}},
    attiva:     {color:COL.rosso, fillColor:COL.rosso, fillOpacity:.25, weight:3,
      n:{it:'Area a fuoco attivo', en:'Active fire area', fr:'Zone en feu', es:'Área en llamas'}},
    minacciata: {color:'#e8a000', fillColor:'#e8a000', fillOpacity:.15, weight:2, dashArray:'4,5',
      n:{it:'Zona minacciata', en:'Threatened area', fr:'Zone menacée', es:'Zona amenazada'}},
    evacuata:   {color:COL.verde, fillColor:COL.verde, fillOpacity:.15, weight:2,
      n:{it:'Zona evacuata', en:'Evacuated area', fr:'Zone évacuée', es:'Zona evacuada'}},
    bonificata: {color:'#0070c0', fillColor:'#0070c0', fillOpacity:.15, weight:2,
      n:{it:'Zona bonificata', en:'Mopped up area', fr:'Zone noyée', es:'Zona liquidada'}}
  };
  /* Solo queste due contano come "superficie coinvolta": le altre sono
     zone di gestione, non terreno bruciato o in fiamme. */
  const AREE_SUPERFICIE = ['percorsa', 'attiva'];

  /* Annotazione libera: non è nella tavola, ma scrivere un orario o un
     nome sulla carta è la cosa che si fa più spesso in sala operativa. */
  const NOTA = {libero:1, n:{it:'Annotazione', en:'Note', fr:'Annotation', es:'Anotación'}};

  const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g,
    c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

  /* Il colore non è un campo dei simboli: sta dentro il disegno. Per il
     KML, che ne vuole uno solo, si prende il primo del tracciato saltando
     il bianco, che è sempre fondo. I <defs> vanno scartati: contengono la
     campitura del ritardante anche nei lanci d'acqua, che uscirebbero
     rossi invece che azzurri. */
  function coloreSimbolo(k){
    const d = SIM[k];
    if (!d || !d.svg) return COL.rosso;
    const corpo = d.svg({stato:'attivo'}).replace(/<defs>[\s\S]*?<\/defs>/g, '');
    const c = (corpo.match(/#[0-9a-fA-F]{6}/g) || [])
      .filter(x => x.toLowerCase() !== '#ffffff');
    return c[0] || COL.rosso;
  }
  const svgSimbolo = (k, o) => (SIM[k] && SIM[k].svg) ? SIM[k].svg(o || {}) : '';

  /* Sulla mappa il simbolo ha bisogno di un disco chiaro dietro: la
     tavola è disegnata per la carta bianca, e su ortofoto o bosco fitto
     il nero e il rosso sparirebbero. */
  function iconaSimbolo(k, opz){
    const o = opz || {};
    if (k === 'nota')
      return L.divIcon({className:'sitac-etichetta', html: esc(o.testo || ''),
        iconSize:null, iconAnchor:[0,10]});
    /* `rotazione` è un azimut vero; `r0` dice verso dove punta il disegno
       così com'è (il vento è disegnato verso ovest, la pendenza verso
       sud-ovest). Senza la differenza i simboli escono ruotati di novanta
       gradi e le squadre leggono una direzione sbagliata. */
    const d0 = (SIM[k] && SIM[k].r0) || 0;
    const gir = o.rotazione != null
      ? ` style="transform:rotate(${((o.rotazione - d0) % 360 + 360) % 360}deg)"` : '';
    return L.divIcon({className:'sitac-sim',
      html:`<span class="sitac-disco"></span><span class="sitac-glifo"${gir}>${svgSimbolo(k, o)}</span>`,
      iconSize:[42,42], iconAnchor:[21,21], popupAnchor:[0,-21]});
  }

  /* Opzioni di stile per Leaflet: le chiavi nostre non devono arrivargli.
     Previsto = tratto spezzato, come nella tavola. */
  function stileLinea(d, stato){
    const {n, deco, badge, stati, g, sg, r0, ...resto} = d;
    if (stati && stato === 'previsto')
      return Object.assign({}, resto, {dashArray: resto.dashArray || '9,7'});
    return resto;
  }
  const stileArea = d => { const {n, ...resto} = d; return resto; };

  /* =======================================================================
     2. MODALE INTERNO
     Sostituisce prompt e confirm, che intestano la finestra col dominio.
     ===================================================================== */
  const modale = q('#sitac-modale');
  let chiudiModale = null;

  function chiedi(opz){
    return new Promise(risolvi => {
      const soloConferma = !opz.campo;
      modale.querySelector('.sitac-modale-titolo').textContent = t('titoloModale');
      modale.querySelector('.sitac-modale-testo').textContent = opz.testo || '';
      const input = modale.querySelector('#sitac-modale-input');
      const ok = modale.querySelector('#sitac-modale-ok');
      input.style.display = soloConferma ? 'none' : '';
      input.value = opz.valore || '';
      ok.textContent = t('ok');
      ok.style.display = '';   // scegli() lo nasconde: qui va rimesso
      modale.querySelector('#sitac-modale-no').textContent = t('annulla');
      modale.hidden = false;

      const fine = val => {
        modale.hidden = true;
        chiudiModale = null;
        risolvi(val);
      };
      chiudiModale = () => fine(null);
      ok.onclick = () => fine(soloConferma ? true : input.value.trim());
      modale.querySelector('#sitac-modale-no').onclick = () => fine(null);
      input.onkeydown = e => {
        if (e.key === 'Enter'){ e.preventDefault(); fine(input.value.trim()); }
        if (e.key === 'Escape') fine(null);
      };
      setTimeout(() => (soloConferma ? ok : input).focus(), 30);
    });
  }

  /* Scelta a pulsanti: stessi elementi del modale, ma al posto del campo di
     testo un elenco di voci. Serve al percorso guidato del cono, dove ogni
     passo è una scelta fra due o tre. */
  function scegli(opz){
    return new Promise(risolvi => {
      const testo = modale.querySelector('.sitac-modale-testo');
      const input = modale.querySelector('#sitac-modale-input');
      const ok = modale.querySelector('#sitac-modale-ok');
      const no = modale.querySelector('#sitac-modale-no');
      let chiuso = false;
      const fine = val => {
        if (chiuso) return;
        chiuso = true;
        modale.hidden = true; chiudiModale = null;
        ok.style.display = ''; input.style.display = ''; testo.textContent = '';
        risolvi(val);
      };

      modale.querySelector('.sitac-modale-titolo').textContent = t('titoloModale');
      testo.textContent = '';
      const p = document.createElement('p');
      p.textContent = opz.testo || '';
      testo.appendChild(p);
      const el = document.createElement('div');
      el.className = 'sitac-scelte';
      (opz.voci || []).forEach(v => {
        if (v.titolo){
          const h = document.createElement('p');
          h.className = 'sitac-scelta-titolo';
          h.textContent = v.titolo;
          el.appendChild(h);
          return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sitac-scelta';
        b.disabled = !!v.off;
        b.innerHTML = `<b>${esc(v.et)}</b>${v.nota ? `<span>${esc(v.nota)}</span>` : ''}`;
        b.onclick = () => fine(v.k);
        el.appendChild(b);
      });
      testo.appendChild(el);
      input.style.display = 'none';
      ok.style.display = 'none';
      no.textContent = t('annulla');
      no.onclick = () => fine(null);
      chiudiModale = () => fine(null);
      modale.hidden = false;
      setTimeout(() => {
        const b = el.querySelector('button:not([disabled])');
        if (b) b.focus();
      }, 30);
    });
  }

  /* =======================================================================
     2bis. PASSI 1 e 2: INTESTAZIONE E POSIZIONE
     Numero d'intervento e DOS non sono un vezzo burocratico: una SITAC che
     gira fra sale operative e squadre senza dire a quale intervento si
     riferisce, e chi la firma, non serve a niente. Finiscono nel GeoJSON,
     nel nome del file e nella testata di stampa.
     ===================================================================== */
  const inIntervento = q('#sitac-nIntervento');
  const inDos        = q('#sitac-nDos');
  const inNominativo = q('#sitac-nominativo');
  const inTelefono   = q('#sitac-telefono');
  const inPosizione  = q('#sitac-posizione');
  const CHIAVE_SESS  = 'fireops_sitac_intestazione';

    /* VF è fisso e sta nel markup: qui viaggiano solo i 4 caratteri liberi,
    cifre o lettere indifferentemente. Lo strip di ^VF serve ai file
    importati, che portano la sigla intera. */
  function normalizzaDos(v){
    return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      .replace(/^VF/, '').slice(0, 4);
  }
  const dosValido = () => /^[A-Z0-9]{4}$/.test(inDos.value);
  const dosCompleto = () => dosValido() ? 'VF ' + inDos.value : '';
  const interventoValido = () => /^[0-9]+$/.test(inIntervento.value);
  const telefonoValido = () =>
    /^\+?[0-9]{6,15}$/.test(inTelefono.value.replace(/[ .\-]/g, ''));

  function segnaIntestazione(){
    inDos.classList.toggle('campo-mancante', !!inDos.value && !dosValido());
    inIntervento.classList.toggle('campo-mancante',
      !!inIntervento.value && !interventoValido());
    inTelefono.classList.toggle('campo-mancante',
      !!inTelefono.value && !telefonoValido());
    try {
      sessionStorage.setItem(CHIAVE_SESS, JSON.stringify({
        intervento: inIntervento.value, dos: inDos.value,
        nominativo: inNominativo.value, telefono: inTelefono.value,
        posizione: inPosizione.value}));
    } catch(e){ /* sessione non disponibile: si perde solo il ricordo */ }
    /* Il simbolo sulla carta porta la sigla DOS: se la si scrive dopo aver
       posato la posizione, l'etichetta va riscritta o resta vuota. */
    const mDos = dosSullaCarta();
    if (mDos){
      mDos._testo = inDos.value || null;
      mDos.setIcon(iconaSimbolo('dos', {stato:'attivo', testo: mDos._testo}));
      etichettaElemento(mDos);
    }
    aggiornaPassi();
  }
  inIntervento.oninput = () => {
    inIntervento.value = inIntervento.value.replace(/[^0-9]/g, '');
    segnaIntestazione();
  };
  inDos.oninput = () => { inDos.value = normalizzaDos(inDos.value); segnaIntestazione(); };
  inNominativo.oninput = segnaIntestazione;
  inTelefono.oninput = () => {
    inTelefono.value = inTelefono.value.replace(/[^0-9+ ]/g, '');
    segnaIntestazione();
  };

  /* Convalida: la posizione resta facoltativa, perché il GPS in sala
     operativa non dice niente di utile e su http non locale è bloccato.
     Il segno verde sulla testata del passo 1 lo scrive aggiornaPassi. */
  q('#sitac-bConvalida').onclick = () => {
    const manca = [];
    if (!interventoValido()) manca.push(t('nIntervento'));
    if (!dosValido()) manca.push(t('nDos'));
    if (!inNominativo.value.trim()) manca.push(t('nNominativo'));
    if (!telefonoValido()) manca.push(t('nTelefono'));
    segnaIntestazione();
    if (manca.length) return stato(t('datiMancanti', {c: manca.join(', ')}));
    stato(t('datiOk', {i: inIntervento.value, n: inNominativo.value.trim()}));
  };

  try {
    const salvato = JSON.parse(sessionStorage.getItem(CHIAVE_SESS) || '{}');
    inIntervento.value = salvato.intervento || '';
    inDos.value        = salvato.dos || '';
    inNominativo.value = salvato.nominativo || '';
    inTelefono.value   = salvato.telefono || '';
    inPosizione.value  = salvato.posizione || '';
  } catch(e){ /* niente da ripristinare */ }

  const intestazione = () => ({
    intervento: inIntervento.value || null,
    dos: dosCompleto() || null,
    nominativo: inNominativo.value.trim() || null,
    telefono: inTelefono.value.trim() || null,
    posizione: inPosizione.value || null
  });
  function siglaFile(){
    const i = intestazione();
    return (i.intervento ? '_' + i.intervento : '') + (i.dos ? '_' + i.dos.replace(/\s/g, '') : '');
  }

  /* La posizione del DOS non è più "dove sta questo dispositivo": si sceglie
   il modo. In sala operativa il GPS è inutile, e il modo giusto è il clic
   sulla mappa o le coordinate dettate per radio. */
let posDos = null;
let provinciaDos = null;

function scriviPosizione(latlng, acc){
  posDos = L.latLng(latlng.lat, latlng.lng);
  inPosizione.value = `${posDos.lat.toFixed(5)}, ${posDos.lng.toFixed(5)}`
    + (acc ? ` (\u00b1${Math.round(acc)} m)` : '');
  segnaIntestazione();
  posaDos(posDos);
  aggiornaAncoraVento();
  cercaProvincia(posDos);
}

const dosSullaCarta = () => {
  let m = null;
  disegni.eachLayer(x => { if (x._tipo === 'dos' && x.getLatLng) m = x; });
  return m;
};

function posaDos(latlng){
  const gia = dosSullaCarta();
  if (gia){ gia.setLatLng(latlng); aggiornaStato(); return; }
  const m = L.marker(latlng, {draggable:true,
    icon: iconaSimbolo('dos', {stato:'attivo', testo: inDos.value || null})});
  m._tipo = 'dos'; m._genere = 'simbolo'; m._stato = 'attivo';
  m._testo = inDos.value || null;
  m.on('pm:remove', () => scollega(m));
  /* Trascinando il simbolo si sposta il dato, non solo il disegno: sono
     la stessa cosa, e due posizioni DOS diverse sono un errore garantito. */
  m.on('dragend', () => {
    posDos = m.getLatLng();
    inPosizione.value = `${posDos.lat.toFixed(5)}, ${posDos.lng.toFixed(5)}`;
    segnaIntestazione();
    aggiornaAncoraVento();
    cercaProvincia(posDos);
  });
  disegni.addLayer(m);
  etichettaElemento(m);
  aggiornaStato();
}

q('#sitac-bPosizione').onclick = async () => {
  /* La localizzazione l'ha già tentata l'avvio: se ha risposto, `cerchioPosizione`
     è sulla carta e la si può offrire come dato pronto. Se non ha risposto —
     in sala operativa è la norma — proporla di nuovo significa far aspettare
     l'operatore per un timeout che si sa già come finisce. */
  const gps = posizioneOttenuta && cerchioPosizione;
  const voci = [];
  if (gps) voci.push({k:'gps', et:t('posGps'), nota:t('posGpsNota')});
  voci.push({k:'coord', et:t('posCoord'), nota:t('posCoordNota')});
  voci.push({k:'mappa', et:t('posMappa'), nota:t('posMappaNota')});

  const modo = await scegli({testo: t('posComeQuale'), voci});
  if (!modo) return;
  /* Nessuna nuova lettura: si usa quella già acquisita all'avvio. Rileggere
     qui darebbe la stessa posizione dopo qualche secondo d'attesa. */
  if (modo === 'gps') return scriviPosizione(cerchioPosizione.getLatLng());
  if (modo === 'mappa'){
    const p = await attendiClic(t('posClicMappa'));
    if (p) scriviPosizione(p);
    return;
  }
  const v = await chiedi({campo:1, testo: t('chiediCoord'), valore: inPosizione.value});
  if (!v) return;
  const n = v.split(/[,;\s]+/).map(Number).filter(x => !isNaN(x));
  if (n.length < 2 || Math.abs(n[0]) > 90 || Math.abs(n[1]) > 180)
    return stato(t('coordErrate'));
  scriviPosizione(L.latLng(n[0], n[1]));
};

/* Reverse geocoding: da Nominatim si prende ISO3166-2-lvl6, che è la sigla
   della provincia ("IT-BO"). `county` e `state_district` in Italia si
   scambiano di posto a seconda della regione, e il nome del comune non è
   mai quello della provincia: è la confusione già vista nel convertitore. */
async function cercaProvincia(latlng){
  const boxP = q('#sitac-provincia'), boxC = q('#sitac-comando');
  boxP.textContent = '\u2026';
  try {
    const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2`
      + `&lat=${latlng.lat}&lon=${latlng.lng}&zoom=10&addressdetails=1`;
    const r = await fetch(u, {headers:{'Accept':'application/json'}});
    if (!r.ok) throw new Error('nominatim ' + r.status);
    const a = (await r.json()).address || {};
    const iso = a['ISO3166-2-lvl6'] || '';
    const sigla = iso.split('-')[1] || '';
    const nome = a.county || a.state_district || a.province || '';
    if (!sigla && !nome) throw new Error('provincia assente');
    provinciaDos = {sigla, nome};
    boxP.innerHTML = `<b>${esc(sigla)}</b> ${esc(nome)}`;
    mostraComandoAfferente(sigla, nome);
    stato(t('geoFatto', {p: nome || sigla}));
  } catch(e){
    provinciaDos = null;
    boxP.textContent = '\u2014';
    boxC.textContent = '\u2014';
    stato(t('geoErrore', {e: e.message}));
  }
  aggiornaPassi();
}

/* Il Comando resta LOCALE alla SITAC: non si tocca window.FireOpsComandoAttivo
   né si emette l'evento condiviso. Una SITAC su un incendio in provincia
   confinante non deve cambiare il Comando di tutta l'applicazione. */
let comandoSitac = null;
function mostraComandoAfferente(sigla, nome){
  const boxC = q('#sitac-comando');
  const trova = NS.comandoPerProvincia;
  comandoSitac = (typeof trova === 'function') ? trova(sigla, nome) : null;
  if (!comandoSitac){
    boxC.textContent = '\u2014';
    boxC.classList.remove('cliccabile-comando');
    boxC.onclick = null;
    return;
  }
  /* Il canale radio sta in vista accanto al nome: è il dato che si cerca
     per primo quando l'incendio è fuori dal proprio Comando. */
  const ch = comandoSitac['Canale Radio Comando'];
  boxC.innerHTML = `<b>${esc(comandoSitac.Comando)}</b>`
    + (ch ? ` \u00b7 CH ${esc(ch)}` : '');
  boxC.classList.add('cliccabile-comando');
  boxC.onclick = ev => {
    if (typeof NS.apriPopupComando === 'function')
      NS.apriPopupComando(comandoSitac, ev, boxC);
  };
}

  /* =======================================================================
     3. MAPPA
     OSM come predefinito: è lo sfondo con cui si lavora normalmente in SO.
     Topografico per quota e sentieri, satellite per la vegetazione.
     ===================================================================== */
  const sfondi = [
    {k:'sfStrada', l:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {maxZoom:19, attribution:'OpenStreetMap'})},
    {k:'sfTopo', l:L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        {maxZoom:17, attribution:'OpenTopoMap'})},
    {k:'sfSat', l:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {maxZoom:19, attribution:'Esri'})}
  ];
  let iSfondo = 0;

  /* All'apertura si parte dal Comando attivo, non dal centro d'Italia: una
     SITAC si apre quasi sempre su un incendio del proprio territorio.
     `window.FireOpsComandoAttivo` è lo stesso globale condiviso che usano
     script.js e convertitore.js; l'evento più sotto copre il cambio di
     Comando a modulo già avviato. */
  /* I campi di comandi.json hanno l'iniziale maiuscola e tipi non uniformi:
     Latitudine è un numero, Longitudine una stringa con lo zero davanti
     ("012.061362"). Si cerca per forma invece che per nome esatto, e si
     passa sempre da String prima di parseFloat.
     Il ripiego su "Coordinate" copre le righe dove le due colonne separate
     sono vuote: quella c'è sempre. */
  function centroComando(){
    const c = window.FireOpsComandoAttivo;
    if (!c) return null;
    const num = v => parseFloat(String(v == null ? '' : v).trim().replace(',', '.'));
    const perNome = re => {
      const k = Object.keys(c).find(x => re.test(x));
      return k ? num(c[k]) : NaN;
    };
    let la = perNome(/^lat/i), lo = perNome(/^(lon|lng)/i);
    if (isNaN(la) || isNaN(lo)){
      const p = String(c.Coordinate || '').split(/[;\s]*,[;\s]*/);
      if (p.length >= 2){ la = num(p[0]); lo = num(p[1]); }
    }
    return (!isNaN(la) && !isNaN(lo)) ? [la, lo] : null;
  }

  const partenza = centroComando();
  const map = L.map(q('#sitac-mappa'), {center: partenza || [42.74, 12.74],
    zoom: partenza ? 12 : 6, zoomControl:true, layers:[sfondi[0].l]});
  L.control.scale({imperial:false}).addTo(map);

  const disegni = L.featureGroup().addTo(map);   // esportabile
  const decori  = L.layerGroup().addTo(map);     // motivi, maniglie, coni: mai esportati
  map.pm.setGlobalOptions({layerGroup: disegni, snappable:true, snapDistance:15,
    templineStyle:{color:COL.rosso}, hintlineStyle:{color:COL.rosso, dashArray:'5,5'}});

  /* All'apertura si va sulla posizione reale: una SITAC si disegna dove si
     sta operando. Se il GPS non risponde resta il centro del Comando, che
     arriva dall'evento condiviso, o l'Italia centrale. */
  let posizioneOttenuta = false;
  let cerchioPosizione = null;

  function centraSuGps(annuncia){
    if (annuncia) stato(t('localizzo'));
    map.locate({setView:true, maxZoom:15, enableHighAccuracy:true});
  }
  map.on('locationfound', e => {
    posizioneOttenuta = true;
    if (cerchioPosizione) decori.removeLayer(cerchioPosizione);
    cerchioPosizione = L.circleMarker(e.latlng, {radius:7, color:'#fff', weight:2,
      fillColor:'#0070c0', fillOpacity:1, interactive:false}).addTo(decori);
  });
  map.on('locationerror', () => {
    if (posizioneOttenuta) stato(t('posErrore'));
    tornaAlComando();
  });

  /* Ripiego: usato quando il GPS non risponde, o quando il Comando viene
     scelto dopo l'avvio del modulo. Non tocca nulla se l'utente ha già
     disegnato — spostargli la vista sotto le mani è peggio di una vista
     imprecisa. */
  function tornaAlComando(){
    const c = centroComando();
    if (c && !posizioneOttenuta && !disegni.getLayers().length)
      map.setView(c, 12);
  }

  /* =======================================================================
     4. MOTIVI RIPETUTI LUNGO LE LINEE
     Metà della tavola sono tracciati con un simbolo ripetuto: i triangoli
     della difesa in linea, i rombi della linea di sicurezza, la scaletta
     del fronte. PolylineDecorator li ripete e li orienta lungo il percorso.
     ===================================================================== */
  function glifoDeco(tipo, d, col, pieno){
    const riempi = pieno ? col : '#fff';
    let dentro = '';
    if (tipo === 'triangolo')
      dentro = `<path d="M2 ${d-2}L${d/2} 2L${d-2} ${d-2}Z" fill="${riempi}" stroke="${col}" stroke-width="2"/>`;
    else if (tipo === 'rombo')
      dentro = `<path d="M${d/2} 1L${d-1} ${d/2}L${d/2} ${d-1}L1 ${d/2}Z" fill="${riempi}" stroke="${col}" stroke-width="2"/>`;
    else if (tipo === 'croce')
      dentro = `<path d="M2 2L${d-2} ${d-2}M${d-2} 2L2 ${d-2}" stroke="${col}" stroke-width="2.6"/>`;
    else if (tipo === 'scaletta')
      dentro = `<path d="M${d/2} 1V${d-1}" stroke="${col}" stroke-width="2.6"/>`;
    else if (tipo === 'onda')
      dentro = `<path d="M1 ${d-2}V3h${d-2}v${d-5}" fill="none" stroke="${col}" stroke-width="2.4"/>`;
    else if (tipo === 'obliqua')
      dentro = `<path d="M1 ${d-2}L${d-3} 3M${d-3} 3l-5 .5M${d-3} 3l.5 5" fill="none" stroke="${col}" stroke-width="2.2"/>`;
    else if (tipo === 'fulmine' || tipo === 'fulmineOff')
      dentro = `<g transform="scale(${(d/64).toFixed(3)})">`
        + `<path d="M38 5L17 35h11l-5 24 25-33H36l8-21Z" fill="#ffe000" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>`
        + (tipo === 'fulmineOff'
            ? `<path d="M9 9L55 55M55 9L9 55" stroke="${col}" stroke-width="5"/>` : '')
        + `</g>`;
    else if (tipo === 'pilone')
      dentro = `<path d="M${d/2} 2V${d-7}" stroke="${col}" stroke-width="2.4"/>`
        + `<rect x="${d/2-4}" y="${d-8}" width="8" height="6" fill="${col}"/>`;
    return L.divIcon({className:'sitac-deco', iconSize:[d,d], iconAnchor:[d/2,d/2],
      html:`<svg viewBox="0 0 ${d} ${d}" width="${d}" height="${d}">${dentro}</svg>`});
  }

  function motivo(def, stato){
    const dc = def.deco;
    if (!dc) return null;
    const pieno = dc.pieno && !(def.stati && stato === 'previsto');
    const col = def.color || COL.rosso;
    if (dc.tipo === 'punta' || dc.tipo === 'freccia')
      return {offset: dc.tipo === 'punta' ? '100%' : '12%', repeat: dc.passo,
        symbol: L.Symbol.arrowHead({pixelSize: dc.dim, headAngle: 60, polygon: !!pieno,
          pathOptions:{color:col, fillColor:col, fillOpacity: pieno ? 1 : 0,
            weight: pieno ? 1 : 2.5}})};
    /* `dritto` per i glifi che non vanno ruotati lungo il percorso: il
       pilone del filo a sbalzo sta in piedi, non segue la campata. */
    return {offset: dc.passo === '50%' ? '50%' : 8, repeat: dc.passo,
      symbol: L.Symbol.marker({rotate: !dc.dritto,
        markerOptions:{icon: glifoDeco(dc.tipo, dc.dim, col, pieno), interactive:false}})};
  }

  function decora(layer){
    if (layer._deco){ decori.removeLayer(layer._deco); layer._deco = null; }
    const def = LIN[layer._tipo];
    if (!def) return;
    const patterns = [];
    const m = motivo(def, layer._stato);
    if (m) patterns.push(m);
    /* Il badge (4x4, B) sta in testa alla linea: dice di che strada o di
       che azione si tratta, e va letto una volta sola. */
    if (def.badge)
      patterns.push({offset:0, repeat:0, symbol: L.Symbol.marker({rotate:false,
        markerOptions:{interactive:false, icon: L.divIcon({className:'sitac-badge',
          html: esc(def.badge), iconSize:[26,18], iconAnchor:[13,9]})}})});
    if (!patterns.length) return;
    layer._deco = L.polylineDecorator(layer, {patterns});
    decori.addLayer(layer._deco);
  }
  function scollega(layer){
    if (!layer) return;
    if (layer._deco){ decori.removeLayer(layer._deco); layer._deco = null; }
    if (layer._maniglia){ decori.removeLayer(layer._maniglia); layer._maniglia = null; }
    if (layer._asta){ decori.removeLayer(layer._asta); layer._asta = null; }
    scollegaLancio(layer);
  }
  map.on('pm:remove', e => { scollega(e.layer); aggiornaStato(); });

  /* =======================================================================
     5. DIREZIONE: SECONDO PUNTO E MANIGLIA
     Digitare un azimut davanti a una carta non lo fa nessuno. Si clicca
     dove punta, e la maniglia resta lì da trascinare.
     ===================================================================== */
  const R_TERRA = 6378137;
  const rad = x => x * Math.PI / 180;
  const gra = x => x * 180 / Math.PI;

  function azimut(a, b){
    const dLon = rad(b.lng - a.lng);
    const y = Math.sin(dLon) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat))
            - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLon);
    return (gra(Math.atan2(y, x)) + 360) % 360;
  }
  function puntoDaAzimut(c, gradi, metri){
    const d = metri / R_TERRA, br = rad(gradi), la = rad(c.lat), lo = rad(c.lng);
    const lat2 = Math.asin(Math.sin(la)*Math.cos(d) + Math.cos(la)*Math.sin(d)*Math.cos(br));
    const lon2 = lo + Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(la),
      Math.cos(d) - Math.sin(la)*Math.sin(lat2));
    return L.latLng(gra(lat2), gra(lon2));
  }
  /* La maniglia sta sempre a un dito di distanza sullo schermo, non a una
     distanza fissa sul terreno: a zoom 10 sarebbe sotto il simbolo. */
  function distanzaManiglia(){
    const c = map.getCenter();
    const a = map.latLngToContainerPoint(c);
    const b = map.containerPointToLatLng(L.point(a.x + 70, a.y));
    return Math.max(c.distanceTo(b), 30);
  }

  function creaManiglia(layer){
    if (layer._maniglia){ decori.removeLayer(layer._maniglia); }
    if (layer._asta){ decori.removeLayer(layer._asta); }
    const c = layer.getLatLng();
    const p = puntoDaAzimut(c, layer._rotazione || 0, distanzaManiglia());
    layer._asta = L.polyline([c, p], {color:'#0070c0', weight:2, dashArray:'4,5',
      interactive:false}).addTo(decori);
    layer._maniglia = L.marker(p, {draggable:true, keyboard:false,
      icon: L.divIcon({className:'sitac-maniglia', iconSize:[18,18], iconAnchor:[9,9],
        html:'<span></span>'})}).addTo(decori);
    layer._maniglia.on('drag', () => {
      const m = layer._maniglia.getLatLng(), o = layer.getLatLng();
      layer._rotazione = Math.round(azimut(o, m));
      layer.setIcon(iconaSimbolo(layer._tipo, {stato:layer._stato,
        testo:layer._testo, rotazione:layer._rotazione}));
      layer._asta.setLatLngs([o, m]);
      etichettaElemento(layer);
    });
    /* Il simbolo si sposta, la maniglia lo segue mantenendo la direzione */
    layer.on('move', () => {
      if (!layer._maniglia) return;
      const o = layer.getLatLng();
      const np = puntoDaAzimut(o, layer._rotazione || 0, distanzaManiglia());
      layer._maniglia.setLatLng(np);
      layer._asta.setLatLngs([o, np]);
    });
  }

  /* =======================================================================
     5ter. LANCI COME POLIGONI
     Il lancio è l'unico elemento della tavola che ha una dimensione vera
     sul terreno: qui il simbolo resta nella barra, ma sulla carta si
     disegna un'ellisse georeferenziata, orientabile e ridimensionabile.
     ===================================================================== */
  const PASSO_ELLISSE = 6;   // gradi fra due vertici: 60 per giro

  /* Ellisse per punti: `a` lungo l'asse di lancio, `b` di traverso. Il
     punto parametrico (a·cos t, b·sin t) si converte in azimut e distanza,
     così la forma resta corretta anche a latitudini alte. */
  function ellisse(centro, a, b, verso){
    const p = [];
    for (let g = 0; g < 360; g += PASSO_ELLISSE){
      const r = rad(g);
      const x = a * Math.cos(r), y = b * Math.sin(r);
      p.push(puntoDaAzimut(centro, verso + gra(Math.atan2(y, x)),
        Math.sqrt(x*x + y*y)));
    }
    return p;
  }

  /* Il ritardante è rosso e più coperto, l'acqua azzurra e leggera; il
     contorno tratteggiato dice "previsto", come nella tavola. */
  function stileLancio(k, stato){
    const rit = k.indexOf('ritardante') >= 0;
    const col = rit ? COL.rosso : COL.acqua;
    return {color: col, weight: 2.6, fillColor: col,
      fillOpacity: rit ? .35 : .18,
      dashArray: stato === 'attivo' ? null : '6,5'};
  }

  const ellisseDi = l => ellisse(l._centro, l._a, l._b, l._rotazione);

  function scollegaLancio(l){
    if (!l || !l._manig) return;
    l._manig.forEach(m => decori.removeLayer(m));
    l._manig = null;
  }

  function maniglieLancio(l){
    scollegaLancio(l);
    l._manig = [];
    const fai = (classe, dove, applica) => {
      const m = L.marker(dove(), {draggable:true, keyboard:false,
        icon: L.divIcon({className:'sitac-maniglia sitac-mn-' + classe,
          iconSize:[18,18], iconAnchor:[9,9], html:'<span></span>'})}).addTo(decori);
      m.on('drag', () => {
        applica(m.getLatLng());
        l.setLatLngs(ellisseDi(l));
        etichettaElemento(l);
      });
      /* A fine trascinamento le maniglie si rifanno: quella dell'asse ha
         spostato anche le altre, che altrimenti resterebbero indietro. */
      m.on('dragend', () => { maniglieLancio(l); aggiornaStato(); });
      l._manig.push(m);
    };
    /* Punta: direzione e lunghezza insieme — è il gesto con cui si dice
       "il lancio è andato di là, e arriva fin qui". */
    fai('asse', () => puntoDaAzimut(l._centro, l._rotazione, l._a), pt => {
      l._rotazione = Math.round(azimut(l._centro, pt));
      l._a = Math.max(15, Math.round(l._centro.distanceTo(pt)));
    });
    /* Fianco: solo la larghezza, l'asse non si tocca. */
    fai('largo', () => puntoDaAzimut(l._centro, l._rotazione + 90, l._b), pt => {
      l._b = Math.max(8, Math.round(l._centro.distanceTo(pt)));
    });
    fai('centro', () => l._centro, pt => { l._centro = pt; });
  }

  /* `pmIgnore` tiene Geoman fuori: in modalità modifica metterebbe un
     vertice trascinabile su ognuno dei sessanta punti dell'ellisse, e al
     primo strattone la forma non sarebbe più un'ellisse. L'eliminazione
     va quindi gestita a mano. */
  function creaLancio(k, centro, opz){
    const o = opz || {};
    const d = SIM[k].poly;
    const l = L.polygon([], Object.assign({pmIgnore:true},
      stileLancio(k, o.stato || 'previsto')));
    l._tipo = k; l._genere = 'lancio'; l._stato = o.stato || 'previsto';
    l._centro = centro;
    l._a = o.a || d.a; l._b = o.b || d.b;
    l._rotazione = o.rotazione != null ? o.rotazione : 90;
    l.setLatLngs(ellisseDi(l));
    l.on('click', () => {
      if (map.pm.globalRemovalModeEnabled && map.pm.globalRemovalModeEnabled()){
        scollegaLancio(l);
        disegni.removeLayer(l);
        aggiornaStato();
      }
    });
    disegni.addLayer(l);
    etichettaElemento(l);
    maniglieLancio(l);
    return l;
  }

  /* =======================================================================
     5bis. VENTO E CONI DI PROPAGAZIONE
     Si preme il pulsante del passo 4 e si risponde a tre domande: come si
     costruisce il cono, da dove viene la direzione del vento, quanto forte
     soffia. I coni NON sono rilievi ma stime, quindi stanno nei decori e
     non finiscono nel GeoJSON come geometrie: nel file viaggia il dato del
     vento, con l'ora in cui è stato letto, e da quello si ricostruiscono.
     ===================================================================== */
  let ventoCono = null;      // ultimo vento noto: quadro, export e stampa
  let attesaClic = null;
  let attesaLinea = null;

  /* Più coni sulla stessa carta: un incendio con due fronti attivi ne
     vuole due, e cancellare il precedente ogni volta impediva di
     confrontarli. Il vento è uno solo — lo rileva la stessa persona — ma
     ogni cono conserva il proprio, così una deroga locale è possibile. */
  const coni = [];
  let nCono = 0;

  function togliCono(id){
    const i = coni.findIndex(c => c.id === id);
    if (i < 0) return;
    decori.removeLayer(coni[i].layer);
    coni.splice(i, 1);
    aggiornaStato();
  }
  function togliTuttiConi(){
    coni.forEach(c => decori.removeLayer(c.layer));
    coni.length = 0;
  }

  /* Attese: risolvono con null se qualcuno preme Esc o cambia strumento —
     fermaTutto() le chiude, così il percorso guidato non resta appeso. */
  function attendiClic(msg){
    fermaTutto(); spegniPulsanti(); stato(msg);
    return new Promise(risolvi => { attesaClic = risolvi; });
  }
  function attendiLinea(msg){
    fermaTutto(); spegniPulsanti(); stato(msg);
    return new Promise(risolvi => {
      attesaLinea = risolvi;
      map.pm.enableDraw('Line', {pathOptions:{color:COL.rosso, weight:3.5},
        continueDrawing:false});
    });
  }
  map.on('click', e => {
    if (!attesaClic) return;
    const f = attesaClic; attesaClic = null; f(e.latlng);
  });

  const origineSullaCarta = () => {
    let m = null;
    disegni.eachLayer(x => { if (x._tipo === 'origine' && x.getLatLng) m = x; });
    return m;
  };

  /* Basi possibili per il cono: i poligoni che rappresentano fuoco — non
     le zone di gestione — e i fronti già tracciati. */
  const basiCono = () => disegni.getLayers().filter(x =>
    AREE_SUPERFICIE.indexOf(x._tipo) >= 0 || x._tipo === 'fronte');

  function evidenzia(lista, on){
    lista.forEach(l => {
      const el = l._path || (l.getElement && l.getElement());
      if (el && el.classList) el.classList.toggle('sitac-eleggibile', !!on);
    });
  }

  let attesaElemento = null;
  function attendiElemento(lista, msg){
    fermaTutto(); spegniPulsanti(); stato(msg);
    evidenzia(lista, true);
    return new Promise(risolvi => {
      attesaElemento = l => { evidenzia(lista, false); risolvi(l); };
    });
  }
  /* Il FeatureGroup inoltra i clic dei figli e mette il layer in e.layer:
     non serve agganciare un listener per elemento. */
  disegni.on('click', e => {
    if (!attesaElemento) return;
    const f = attesaElemento; attesaElemento = null; f(e.layer);
  });

  /* Il vento non è un simbolo posato sulla carta ma un quadro fisso in alto
     a sinistra, col nord accanto: sulla mappa finiva sotto agli altri
     elementi e si spostava con loro, mentre è un dato dell'intero
     scenario, non di un punto. */
  function mostraVento(vento){
    ventoCono = vento || null;
    const box = q('#sitac-vento');
    if (!box) return;
    if (!vento){ box.hidden = true; box.innerHTML = ''; return; }
    const V = NS.SitacVento;
    const k = V.simboloVento(vento.velocita);
    const d0 = (SIM[k] && SIM[k].r0) || 0;
    box.hidden = false;
    box.innerHTML =
      `<span class="sitac-vento-nord"><svg viewBox="0 0 24 24">`
      + `<path d="M12 2l5 11h-10Z" fill="#cc0000"/>`
      + `<path d="M12 22l-5-9h10Z" fill="#888"/></svg><b>N</b></span>`
      + `<span class="sitac-vento-glifo" style="transform:rotate(`
      + `${((vento.verso - d0) % 360 + 360) % 360}deg)">`
      + `${svgSimbolo(k, {senzaTesto:1})}</span>`
      + `<span class="sitac-vento-dati">${esc(String(vento.velocita))} km/h<br>`
      + `${esc(String(vento.verso))}\u00b0</span>`;
  }

  /* Il vento lo si imposta una volta sola, al passo 2: qui si riusa. La
     domanda si fa lo stesso, perché un secondo fronte può avere un vento
     locale diverso — ma la risposta preimpostata è quella già nota, e
     un'occhiata basta a confermarla. */
  async function scegliVento(punto){
    const V = NS.SitacVento;

    if (ventoCono){
      const scelta = await scegli({testo: t('ventoQuale'), voci:[
        {k:'noto', et: t('ventoRiusa', {v: ventoCono.velocita, d: ventoCono.verso}),
          nota: t('ventoRiusaNota', {f: ventoCono.fonte})},
        {k:'altro', et: t('ventoAltro'), nota: t('ventoAltroNota')}
      ]});
      if (!scelta) return null;
      /* Copia: il cono conserva il vento con cui è stato disegnato, e
         cambiare lo slider dopo non deve riscrivergli sotto i piedi. */
      if (scelta === 'noto') return Object.assign({}, ventoCono);
    }

    return chiediVentoDaCapo(punto);
  }

  /* Il percorso a tre domande di prima: resta per il vento locale di un
     singolo cono e per il caso in cui il passo 2 sia stato saltato. */
  async function chiediVentoDaCapo(punto){
    const V = NS.SitacVento;
    let letto = null;
    const daWeb = async () => {
      if (letto) return letto;
      stato(t('ventoLeggo'));
      letto = await V.leggi(punto.lat, punto.lng);
      return letto;
    };

    const bussolaOk = V.bussolaDisponibile();
    const modo = await scegli({testo: t('conoDirezione'), voci:[
      {k:'web',     et:t('dirWeb'),     nota:t('dirWebNota')},
      {k:'bussola', et:t('dirBussola'),
        nota: bussolaOk ? t('dirBussolaNota') : t('dirBussolaNo'), off: !bussolaOk},
      {k:'mappa',   et:t('dirMappa'),   nota:t('dirMappaNota')}
    ]});
    if (!modo) return null;

    let verso = null, fonte = '';
    if (modo === 'web'){
      const v = await daWeb();
      verso = v.verso; fonte = v.fonte;
    } else if (modo === 'bussola'){
      stato(t('bussolaLeggo'));
      verso = await V.leggiBussola();
      fonte = t('dirBussola');
    } else {
      const p = await attendiClic(t('conoClicVento'));
      if (!p) return null;
      verso = Math.round(azimut(punto, p));
      fonte = t('dirMappa');
    }

    const modoV = await scegli({testo: t('conoIntensita'), voci:[
      {k:'web',   et:t('intWeb'),   nota:t('intWebNota')},
      {k:'scala', et:t('intScala'), nota:t('intScalaNota')}
    ]});
    if (!modoV) return null;

    let velocita;
    if (modoV === 'web'){
      const v = await daWeb();
      velocita = V.arrotondaDecine(v.velocita);
      fonte = (modo === 'web') ? v.fonte : `${fonte} + ${v.fonte}`;
    } else {
      velocita = await scegliVelocita();
      if (!velocita) return null;
    }

    const v = V.ventoDa(velocita, verso, fonte);
    v.letto = new Date().toISOString();
    return v;
  }

  /* La scala è la colonna sinistra della tabella 1: dieci in dieci fino a
     110, raggruppata nelle tre intensità della tavola. Accanto a ogni voce
     quanto avanza il fuoco in un'ora, che è il numero che si cerca. */
  function scegliVelocita(){
    const V = NS.SitacVento;
    const voci = [];
    let banda = null;
    V.SCALA.forEach(v => {
      const b = V.simboloVento(v);
      if (b !== banda){ banda = b; voci.push({titolo: t(b)}); }
      voci.push({k:String(v), et: v + ' km/h',
        nota: t('conoAvanza', {m: Math.round(V.distanzaFronte(v, 60))})});
    });
    return scegli({testo: t('conoIntensita'), voci}).then(x => x ? Number(x) : null);
  }

  async function creaCono(){
    const V = NS.SitacVento;
    if (!V) return stato('sitac-vento.js non caricato.');
    const voci = [];
    const basi = basiCono().length;
    if (coni.length) voci.push({k:'via', et:t('conoVia'), nota:t('conoViaNota')});
    voci.push({k:'elemento', et:t('conoElemento'), nota:t('conoElementoNota'), off: !basi});
    voci.push({k:'settore', et:t('conoSettore'), nota:t('conoSettoreNota')});
    voci.push({k:'fronte',  et:t('conoFronte'),  nota:t('conoFronteNota')});
    voci.push({k:'terzo',   et:t('conoTerzo'),   nota:t('conoStandby'), off:1});
    try {
      const modo = await scegli({testo: t('conoModo'), voci});
      if (!modo) return stato(t('conoAnnullato'));
      if (modo === 'via'){ togliTuttiConi(); aggiornaStato(); return stato(t('conoTolto')); }
      if (modo === 'elemento') await conoDaElemento();
      else if (modo === 'settore') await conoSettore();
      else await conoFronte();
    } catch(e){
      stato(t('ventoErrore', {e: e.message}));
    }
  }

  /* Modo 1: vertice sul punto d'innesco, secondo clic per dire dove sta il
     fronte adesso. Gli archi partono da lì, non dal vertice. */
  async function conoSettore(){
    const V = NS.SitacVento;
    const m = origineSullaCarta();
    const origine = m ? m.getLatLng() : await attendiClic(t('conoClicOrigine'));
    if (!origine) return stato(t('conoAnnullato'));
    const p0 = await attendiClic(t('conoClicFronte'));
    if (!p0) return stato(t('conoAnnullato'));
    const r0 = Math.round(origine.distanceTo(p0));
    const vento = await scegliVento(origine);
    if (!vento) return stato(t('conoAnnullato'));

    /* Il rilievo si legge PRIMA di disegnare. Un cono che si allunga da
       solo mezzo secondo dopo è peggio di mezzo secondo d'attesa: chi
       guarda ha già cominciato a leggerlo.
       Il profilo parte da dove sta il fronte ADESSO, non dal punto
       d'innesco: il terreno già percorso non conta più, il fuoco lo
       attraversa nel prossimo quarto d'ora. */
    let fattori = null, rilErrore = null;
    if (NS.SitacRilievo){
      const dist = V.MINUTI.map(x => V.distanzaFronte(vento.velocita, x));
      /* Con distanze nulle il profilo degenera: passo zero, dislivello
         diviso zero, e la pendenza esce a 90° tagliata al massimo. */
      if (Math.max.apply(null, dist) > 50){
        try {
          stato(t('rilLeggo'));
          const base = V.puntoDaAzimut(origine, vento.verso, r0);
          fattori = (await NS.SitacRilievo.analizza(base, vento.verso, dist)).fattori;
        } catch(e){ rilErrore = e.message; }
      }
    }

    const opz = {colore: COL.rosso, raggio0: r0, etichetta0: t('conoT0'), fattori};
    const layer = V.disegnaCono(origine, vento, opz);
    decori.addLayer(layer);
    const id = ++nCono;
    coni.push({id, layer, vento, fattori, tipo:'settore'});

    /* Spostando l'area d'origine la previsione la segue col vento e i
       fattori di prima: il terreno sotto però è cambiato. Per rileggere
       la pendenza si rifà il percorso. */
    if (m){
      m.off('move.sitacCono').on('move.sitacCono', () => {
        const c = coni.find(x => x.id === id);
        if (!c) return;
        decori.removeLayer(c.layer);
        c.layer = V.disegnaCono(m.getLatLng(), vento, opz);
        decori.addLayer(c.layer);
      });
      m.on('pm:remove', () => togliCono(id));
    }
    riassunto(vento);
    if (fattori) stato($('stato').textContent + '\n' + t('rilFatto', {
      k: fattori.map(f => '\u00d7' + f.k.toFixed(1)).join(' \u00b7 ')}));
    else if (rilErrore) stato($('stato').textContent + '\n'
      + t('rilErrore', {e: rilErrore}));
  }

  /* Modo 2: si disegna il fronte com'è adesso e lo si fa avanzare nel
     tempo, allargandolo di 15° per parte. Serve quando l'incendio è già
     lungo e il punto d'innesco non dice più dove sta la fiamma. */
  async function conoFronte(){
    const V = NS.SitacVento;
    const punti = await attendiLinea(t('conoDisegnaFronte'));
    if (!punti || punti.length < 2) return stato(t('conoAnnullato'));
    const centro = punti[Math.floor(punti.length / 2)];
    const vento = await scegliVento(centro);
    if (!vento) return stato(t('conoAnnullato'));
    const layer = V.disegnaFronti(punti, vento,
      {colore: COL.rosso, etichetta0: t('conoT0')});
    decori.addLayer(layer);
    coni.push({id: ++nCono, layer, vento, tipo:'fronte'});
    riassunto(vento);
  }

  function riassunto(vento){
    const V = NS.SitacVento;
    aggiornaStato();   // prima, altrimenti riscrive sopra il riepilogo
    stato(t('conoFatto', {v: vento.velocita, d: vento.verso, f: vento.fonte,
      a: V.APERTURA, m: Math.round(V.distanzaFronte(vento.velocita, 60))}));
  }
  let attesaDirezione = null;
  map.on('click', e => {
    if (!attesaDirezione) return;
    const layer = attesaDirezione;
    attesaDirezione = null;
    layer._rotazione = Math.round(azimut(layer.getLatLng(), e.latlng));
    layer.setIcon(iconaSimbolo(layer._tipo, {stato:layer._stato,
      testo:layer._testo, rotazione:layer._rotazione}));
    creaManiglia(layer);
    etichettaElemento(layer);
    aggiornaStato();
    if (strumento) riattivaStrumento();
  });

  /* Modo 3: da un'area percorsa o da un fronte già sulla carta. È il caso
     più frequente in sala operativa — l'area la si disegna comunque. */
  async function conoDaElemento(){
    const V = NS.SitacVento;
    const lista = basiCono();
    if (!lista.length) return stato(t('conoNienteBase'));
    const l = lista.length === 1 ? lista[0]
      : await attendiElemento(lista, t('conoScegliBase'));
    if (!l) return stato(t('conoAnnullato'));
    const anello = AREE[l._tipo] ? l.getLatLngs()[0] : l.getLatLngs();
    if (!anello || anello.length < 2) return stato(t('conoBaseCorta'));
    const centro = anello[Math.floor(anello.length / 2)];

    /* Il vento si chiede PRIMA: senza direzione non si sa quale bordo del
       poligono è il fronte e quale è la coda. */
    const vento = await scegliVento(centro);
    if (!vento) return stato(t('conoAnnullato'));

    const punti = AREE[l._tipo] ? V.fronteSottovento(anello, vento.verso) : anello;
    if (punti.length < 2) return stato(t('conoBaseCorta'));

    const layer = V.disegnaFronti(punti, vento,
      {colore: COL.rosso, etichetta0: t('conoT0')});
    decori.addLayer(layer);
    coni.push({id: ++nCono, layer, vento, tipo:'elemento'});
    riassunto(vento);
  }

  /* =====================================================================
     5quater. VENTO LOCALE — PASSO 2
     Direzione a due punti dal DOS: la linea tratteggiata e la punta
     trascinabile dicono dove VA il vento, e il quadro in alto a sinistra
     segue in tempo reale. È la stessa grammatica dei simboli orientabili.
     =================================================================== */
  let ventoAsta = null, ventoPunta = null;
  let ventoVelocita = 0, ventoVerso = 0;

  function applicaVento(fonte){
    if (!ventoVelocita){ mostraVento(null); aggiornaPassi(); return; }
    const v = NS.SitacVento.ventoDa(ventoVelocita, ventoVerso, fonte || 'manuale');
    v.letto = new Date().toISOString();
    mostraVento(v);
    aggiornaPassi();
    stato(t('ventoImpostato', {v:v.velocita, d:v.verso, f:v.fonte}));
  }

  function disegnaFrecciaVento(){
    if (ventoAsta){ decori.removeLayer(ventoAsta); ventoAsta = null; }
    if (ventoPunta){ decori.removeLayer(ventoPunta); ventoPunta = null; }
    if (!posDos) return;
    const d = distanzaManiglia() * 1.8;
    const p = puntoDaAzimut(posDos, ventoVerso, d);
    ventoAsta = L.polyline([posDos, p], {color:'#cc0000', weight:2.5,
      dashArray:'8,6', interactive:false}).addTo(decori);
    ventoPunta = L.marker(p, {draggable:true, keyboard:false,
      icon: L.divIcon({className:'sitac-maniglia sitac-mn-vento',
        iconSize:[20,20], iconAnchor:[10,10], html:'<span></span>'})}).addTo(decori);
    ventoPunta.on('drag', () => {
      ventoVerso = Math.round(azimut(posDos, ventoPunta.getLatLng()));
      ventoAsta.setLatLngs([posDos, ventoPunta.getLatLng()]);
      if (ventoVelocita) applicaVento('mappa');
    });
  }
  /* La freccia sta a distanza fissa sullo SCHERMO: cambiando zoom va rifatta,
     o a zoom 10 finisce sotto il simbolo del DOS. */
  const aggiornaAncoraVento = () => { if (ventoAsta || ventoPunta) disegnaFrecciaVento(); };
  map.on('zoomend', aggiornaAncoraVento);

  q('#sitac-bVentoDir').onclick = () => {
    if (!posDos) return stato(t('ventoNoDos'));
    disegnaFrecciaVento();
    stato(t('ventoTrascina'));
  };

  q('#sitac-bVentoWeb').onclick = async () => {
    if (!posDos) return stato(t('ventoNoDos'));
    stato(t('ventoLeggo'));
    try {
      const v = await NS.SitacVento.leggi(posDos.lat, posDos.lng);
      ventoVerso = v.verso;
      /* Arrotondato a 5: la scala è a step di 5 e un 23,4 km/h dichiara
         una precisione che il dato non ha. */
      ventoVelocita = Math.min(110, Math.round(v.velocita / 5) * 5);
      q('#sitac-ventoScala').value = ventoVelocita;
      q('#sitac-ventoValore').textContent = ventoVelocita + ' km/h';
      disegnaFrecciaVento();
      applicaVento(v.fonte);
    } catch(e){ stato(t('ventoErrore', {e: e.message})); }
  };

  q('#sitac-ventoScala').oninput = function(){
    ventoVelocita = Number(this.value);
    q('#sitac-ventoValore').textContent = ventoVelocita + ' km/h';
    applicaVento('manuale');
  };

  /* =======================================================================
     6. STRUMENTI E PASSI
     ===================================================================== */
  let strumento = null;
    /* Due stati indipendenti, uno per tavola: il dispositivo può essere in atto
    mentre le azioni sono ancora previste, ed è il caso normale. */
  const stati = {dispositivo:'previsto', azioni:'previsto'};
  const statoPer = def => stati[(def && def.g) || ''] || 'previsto';

  /* Uno alla volta: aprendo un passo si chiudono gli altri. Con dieci passi
     e 64 voci di tavola la barra sarebbe altrimenti un elenco lungo il
     doppio dello schermo. */
  function apriFisa(testa){
    const gia = testa.classList.contains('aperto');
    qq('#sitac-barra .sitac-fisa-testa').forEach(b => {
      b.classList.remove('aperto');
      b.setAttribute('aria-expanded', 'false');
      if (b.nextElementSibling) b.nextElementSibling.classList.remove('aperto');
    });
    if (!gia){
      testa.classList.add('aperto');
      testa.setAttribute('aria-expanded', 'true');
      if (testa.nextElementSibling) testa.nextElementSibling.classList.add('aperto');
    }
  }
  function agganciaFisa(dove){
    dove.querySelectorAll('.sitac-fisa-testa').forEach(b => { b.onclick = () => apriFisa(b); });
  }

  /* Stesso formato delle linee: swatch chiara a sinistra, descrizione a
     fianco. I simboli sono disegnati per la carta bianca, quindi la
     swatch resta chiara anche nel tema scuro — e la palette non mente su
     come il simbolo apparirà davvero in mappa. */
  function bottoneSimbolo(k, d){
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.genere = 'simbolo'; b.dataset.chiave = k;
    b.title = nm(d);
    b.innerHTML = `<i class="sitac-swatch">${svgSimbolo(k, {stato: statoPer(d)})}</i>`
      + `<span>${esc(nm(d))}</span>`;
    b.onclick = () => attiva('simbolo', k, b);
    return b;
  }
  function bottoneLinea(k, d){
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.genere = 'linea'; b.dataset.chiave = k;
    b.innerHTML = `<i class="sitac-tratto" style="background:${d.color};
      height:${Math.min(d.weight || 3, 5)}px${d.dashArray
        ? ';background-image:repeating-linear-gradient(90deg,#0000 0 3px,rgba(255,255,255,.85) 3px 6px)' : ''}"></i>`
      + `<span>${esc(nm(d))}</span>`;
    b.onclick = () => attiva('linea', k, b);
    return b;
  }
  function bottoneArea(k, d){
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.genere = 'area'; b.dataset.chiave = k;
    b.innerHTML = `<i class="sitac-tratto" style="height:12px;border-radius:2px;
      background:${d.fillColor};opacity:.85;border:1.5px solid ${d.color}"></i>`
      + `<span>${esc(nm(d))}</span>`;
    b.onclick = () => attiva('area', k, b);
    return b;
  }
  function bottoneAzione(genere, chiave, etichetta){
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.genere = genere; b.dataset.chiave = chiave;
    b.innerHTML = `<span>${esc(etichetta)}</span>`;
    b.onclick = () => attiva(genere, chiave, b);
    return b;
  }

/* =====================================================================
     PREREQUISITI
     I passi 5-8 descrivono un dispositivo e delle azioni su uno scenario:
     senza sapere dove è partito, quanto è grande e dove tira il vento,
     quei simboli sono decorazione. La barra li tiene chiusi e dice cosa
     manca, invece di lasciar disegnare una carta che non si può leggere.
     =================================================================== */
  function mancanti(){
    const m = [];
    if (!ventoCono) m.push(t('p2'));
    if (!disegni.getLayers().some(x => x._tipo === 'origine')) m.push(t('reqInnesco'));
    let sup = 0;
    disegni.eachLayer(x => { if (AREE_SUPERFICIE.indexOf(x._tipo) >= 0) sup += areaMq(x); });
    if (!sup) m.push(t('reqSuperficie'));
    return m;
  }
  const scenarioPronto = () => mancanti().length === 0;

  function creaPulsanti(){
    const tav = q('#sitac-tavola');
    tav.innerHTML = '';

    /* Un passo è una fisarmonica numerata con l'indicatore di stato sulla
       testata. `riempi` può restituire un conteggio fisso (le tavole); i
       passi 3-6 non restituiscono niente e la loro testata la scrive
       aggiornaPassi, perché cambia col disegno. */
    const passo = (n, titolo, id, riempi) => {
      const box = document.createElement('div');
      box.className = 'sitac-fisa';
      const testa = document.createElement('button');
      testa.type = 'button';
      testa.className = 'sitac-fisa-testa';
      testa.setAttribute('aria-expanded', 'false');
      testa.innerHTML = `<span class="freccia">▶</span>`
        + `<span class="sitac-passo-n">${n}</span>`
        + `<span class="sitac-passo-tit">${esc(titolo)}</span>`
        + `<span class="sitac-passo-stato" id="sitac-st${id}"></span>`;
      const corpo = document.createElement('div');
      corpo.className = 'sitac-fisa-corpo';
      const quante = riempi(corpo);
      box.appendChild(testa); box.appendChild(corpo);
      tav.appendChild(box);
      /* Il conteggio si scrive dopo l'append: dentro `riempi` il box non è
         ancora nel DOM, e cercarlo da lì significa trovare il passo prima. */
      if (quante != null)
        box.querySelector('.sitac-passo-stato').textContent = quante;
    };

    /* 3 — innesco e superficie insieme: il punto d'origine e l'area bruciata
       si rilevano nello stesso momento, e separarli obbligava a saltare
       avanti e indietro fra due passi. */
    passo(3, t('p3'), 3, corpo => {
      const el = document.createElement('div');
      el.className = 'sitac-strumenti';
      if (SIM.origine) el.appendChild(bottoneSimbolo('origine', SIM.origine));
      corpo.appendChild(el);
      const ar = document.createElement('div');
      ar.className = 'sitac-strumenti';
      Object.entries(AREE).forEach(([k, d]) => ar.appendChild(bottoneArea(k, d)));
      corpo.appendChild(ar);
      corpo.insertAdjacentHTML('beforeend',
        `<p class="sitac-conta" id="sitac-superficie"></p>`
        + `<p class="sitac-avviso">${esc(t('areeFuori'))}</p>`);
    });

    passo(4, t('p4'), 4, corpo => {
      const el = document.createElement('div');
      el.className = 'sitac-azioni';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'largo';
      b.innerHTML = `<span>${esc(t('bCono'))}</span>`;
      b.onclick = creaCono;
      el.appendChild(b);
      corpo.appendChild(el);
      const lista = document.createElement('div');
      lista.id = 'sitac-coni';
      corpo.appendChild(lista);
    });

    /* La riga di stato sta dentro la tavola a cui si applica: in cima alla
       barra valeva per tutto e scorrendo non la vedeva più nessuno. */
    const rigaStato = (tavola, corpo) => {
      const et = tavola === 'azioni' ? ['statoPrevista','statoEffettuata']
                                     : ['statoPrevisto','statoAttivo'];
      const box = document.createElement('div');
      box.className = 'sitac-stato-sez';
      const tit = document.createElement('span');
      tit.textContent = t(tavola === 'azioni' ? 'statoAzioni' : 'statoDispositivo');
      box.appendChild(tit);
      const g = document.createElement('div');
      g.className = 'sitac-stati';
      ['previsto','attivo'].forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'sitac-stato-btn';
        b.dataset.stato = s; b.dataset.tavola = tavola;
        b.textContent = t(et[i]);
        if (stati[tavola] === s) b.classList.add('attivo');
        b.onclick = () => cambiaStato(tavola, s);
        g.appendChild(b);
      });
      box.appendChild(g);
      corpo.appendChild(box);
    };

    const perRiquadro = (fonte, tavola) => {
      const gruppi = new Map();
      Object.entries(fonte).filter(([, d]) => d.g === tavola).forEach(v => {
        const sg = v[1].sg || '';
        if (!gruppi.has(sg)) gruppi.set(sg, []);
        gruppi.get(sg).push(v);
      });
      return gruppi;
    };

    /* 5-8: le quattro tavole, nell'ordine della pubblicazione. */
    TAVOLE.forEach((tv, i) => {
      passo(5 + i, t('p' + (5 + i)), 'T' + tv.k, corpo => {
        if (stati[tv.k] !== undefined) rigaStato(tv.k, corpo);
        let n = 0;
        const gs = perRiquadro(SIM, tv.k);
        const gl = perRiquadro(LIN, tv.k);
        const chiavi = new Set([...gs.keys(), ...gl.keys()]);
        chiavi.forEach(sg => {
          if (sg) corpo.insertAdjacentHTML('beforeend',
            `<span class="sitac-riquadro">${esc(nmRiquadro(sg))}</span>`);
          const voci = gs.get(sg);
          if (voci){
            const griglia = document.createElement('div');
            griglia.className = 'sitac-strumenti';
            voci.forEach(([k, d]) => griglia.appendChild(bottoneSimbolo(k, d)));
            corpo.appendChild(griglia);
            n += voci.length;
          }
          const linee = gl.get(sg);
          if (linee){
            const el = document.createElement('div');
            el.className = 'sitac-strumenti';
            linee.forEach(([k, d]) => el.appendChild(bottoneLinea(k, d)));
            corpo.appendChild(el);
            n += linee.length;
          }
        });
        if (tv.k === 'azioni'){
          const el = document.createElement('div');
          el.className = 'sitac-strumenti';
          el.appendChild(bottoneAzione('simbolo', 'nota', nm(NOTA)));
          corpo.appendChild(el);
          n += 1;
        }
        /* Zona di intervento ed evoluzione restano sempre agibili: sono
           terreno e scenario, cioè i dati su cui poggia il blocco. */
        if (tv.k === 'dispositivo' || tv.k === 'azioni')
          corpo.querySelectorAll('button[data-chiave]')
            .forEach(b => { b.dataset.bloccabile = '1'; });
        return n;
      });
    });

    agganciaFisa(tav);
    aggiornaPassi();
    if (strumento) marcaAttivo(strumento.genere, strumento.chiave);
  }

  /* Gli indicatori sulle testate: dicono a colpo d'occhio cosa manca senza
     aprire i passi uno per uno. I passi 1 e 2 stanno nel markup fisso, gli
     altri li costruisce creaPulsanti: `segna` esce in silenzio se il
     bersaglio non c'è ancora. */
  function aggiornaPassi(){
    const segna = (id, testo, ok) => {
      const e = q('#sitac-st' + id);
      if (!e) return;
      e.textContent = testo;
      e.classList.toggle('fatto', !!ok);
      e.classList.toggle('manca', !ok);
    };

    const completo = interventoValido() && dosValido()
      && !!inNominativo.value.trim() && telefonoValido() && !!posDos;
    segna(1, completo ? `${t('pFatto')} ${inIntervento.value} \u00b7 ${dosCompleto()}`
      : t('pManca'), completo);
    segna(2, ventoCono ? `${t('pFatto')} ${ventoCono.velocita} km/h \u2192 ${ventoCono.verso}\u00b0`
      : t('pManca'), !!ventoCono);

    const conta = k => disegni.getLayers().filter(x => x._tipo === k).length;
    let sup = 0;
    disegni.eachLayer(x => { if (AREE_SUPERFICIE.indexOf(x._tipo) >= 0) sup += areaMq(x); });
    const nIn = conta('origine');
    segna(3, (nIn || sup)
      ? `${nIn ? t('pInneschi', {n:nIn}) : ''}${nIn && sup ? ' \u00b7 ' : ''}${sup ? t('pEttari', {v:(sup/10000).toFixed(1)}) : ''}`
      : t('pNessuno'), nIn > 0 || sup > 0);
    segna(4, coni.length ? t('pConi', {n:coni.length}) : t('pNessuno'), coni.length > 0);
    const box = q('#sitac-superficie');
    if (box) box.textContent = sup ? t('pEttari', {v:(sup/10000).toFixed(2)}) : '';

    const lista = q('#sitac-coni');
    if (lista){
      lista.innerHTML = '';
      coni.forEach(c => {
        const r = document.createElement('div');
        r.className = 'sitac-cono-voce';
        r.innerHTML = `<span>${c.id} — ${esc(String(c.vento.velocita))} km/h `
          + `\u2192 ${esc(String(c.vento.verso))}\u00b0</span>`;
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = '\u00d7';
        b.onclick = () => togliCono(c.id);
        r.appendChild(b);
        lista.appendChild(r);
      });
    }

    /* Le testate dei passi bloccati si spengono e dicono perché. La
       fisarmonica si apre lo stesso: si deve poter guardare la tavola
       anche quando non la si può ancora usare. */
    const pronto = scenarioPronto();
    ['dispositivo','azioni'].forEach(k => {
      const e = q('#sitac-stT' + k);
      if (!e) return;
      const fisa = e.closest('.sitac-fisa');
      if (fisa) fisa.classList.toggle('sitac-bloccato', !pronto);
      if (!pronto) e.textContent = t('reqBreve');
    });
  }

  function marcaAttivo(genere, chiave){
    const b = q(`#sitac-barra button[data-genere="${genere}"][data-chiave="${chiave}"]`);
    if (b){
      b.classList.add('attivo');
      /* se lo strumento sta in un passo chiuso, lo si apre */
      const corpo = b.closest('.sitac-fisa-corpo');
      if (corpo && !corpo.classList.contains('aperto')) apriFisa(corpo.previousElementSibling);
    }
  }
  /* I due pulsanti di stato non sono strumenti: restano accesi sempre. */
  function spegniPulsanti(){
    qq('#sitac-barra button:not(.sitac-stato-btn):not(.sitac-fisa-testa)')
      .forEach(b => b.classList.remove('attivo'));
  }

  function attiva(genere, chiave, bottone){
    /* Il blocco vale per le tavole 7-8, non per gli strumenti dei passi
       3-4: quelli servono proprio a soddisfare il prerequisito, e
       filtrarli per `g` bloccava l'innesco con la scusa che manca
       l'innesco. Il passo di provenienza sta sul pulsante. */
    if (bottone && bottone.dataset.bloccabile && !scenarioPronto())
      return stato(t('reqManca', {c: mancanti().join(', ')}));

    const gia = bottone && bottone.classList.contains('attivo');
    fermaTutto();
    if (gia){ spegniPulsanti(); stato(t('spento')); return; }
    spegniPulsanti();
    if (bottone) bottone.classList.add('attivo');
    strumento = {genere, chiave};
    riattivaStrumento();
  }
  function riattivaStrumento(){
    if (!strumento) return;
    const {genere, chiave} = strumento;
    if (genere === 'linea'){
      const d = LIN[chiave];
      map.pm.enableDraw('Line', {pathOptions: stileLinea(d, statoPer(d)), continueDrawing:true});
      stato(`${nm(d)}${etichettaStato(d)}\n${t('suggLinea')}`);
    } else if (genere === 'area'){
      const d = AREE[chiave];
      map.pm.enableDraw('Polygon', {pathOptions: stileArea(d), continueDrawing:true});
      stato(`${nm(d)}\n${t('suggArea')}`);
    } else {
      const d = chiave === 'nota' ? NOTA : SIM[chiave];
      map.pm.enableDraw('Marker', {
        markerStyle:{icon: iconaSimbolo(chiave, {stato: statoPer(d)}), draggable:true},
        continueDrawing:true});
      stato(`${nm(d)}${etichettaStato(d)}\n${t('suggSimbolo')}`);
    }
  }

  /* La tavola usa tre coppie: previsto/attivo per i mezzi, prevista/attiva
     per il DOS e le squadre (flag `f`), prevista/effettuata per le azioni. */
  const paroleStato = d => (d && d.g === 'azioni') ? ['statoPrevista','statoEffettuata']
    : (d && d.f) ? ['statoPrevista','statoAttiva'] : ['statoPrevisto','statoAttivo'];
  const etichettaStato = d => (d && (d.s || d.stati))
    ? ` — ${t(paroleStato(d)[statoPer(d) === 'attivo' ? 1 : 0])}` : '';
  const statoDi = (d, s) => (d && (d.s || d.stati))
    ? ` — ${t(paroleStato(d)[s === 'attivo' ? 1 : 0])}` : '';

  function fermaTutto(){
    map.pm.disableDraw();
    /* Solo se accese: Geoman prova a sganciare listener mai agganciati e
       Leaflet stampa "wrong listener type" in console. */
    if (map.pm.globalEditModeEnabled && map.pm.globalEditModeEnabled())
      map.pm.disableGlobalEditMode();
    if (map.pm.globalRemovalModeEnabled && map.pm.globalRemovalModeEnabled())
      map.pm.disableGlobalRemovalMode();
    attesaDirezione = null;
    if (attesaClic){ const f = attesaClic; attesaClic = null; f(null); }
    if (attesaLinea){ const f = attesaLinea; attesaLinea = null; f(null); }
    if (attesaElemento){ const f = attesaElemento; attesaElemento = null; f(null); }
    strumento = null;
  }

  /* Cambio di stato: se uno strumento è in uso va riacceso, perché il
     tratto e il disegno del simbolo dipendono dallo stato. */
  function cambiaStato(tavola, s){
  if (stati[tavola] === s) return;
  stati[tavola] = s;
  const attuale = strumento;
  creaPulsanti();
  if (attuale){
    strumento = attuale;
    marcaAttivo(attuale.genere, attuale.chiave);
    riattivaStrumento();
  }
}

  /* =======================================================================
     7. CREAZIONE
     ===================================================================== */
  map.on('pm:create', async e => {
    const layer = e.layer;
    /* Il fronte del percorso guidato non è un elemento della tavola: si
       prendono i vertici e si butta via il tracciato provvisorio. */
    if (attesaLinea){
      const f = attesaLinea; attesaLinea = null;
      const punti = layer.getLatLngs();
      disegni.removeLayer(layer);
      map.pm.disableDraw();
      f(punti);
      return;
    }
    if (!strumento) return;
    layer._tipo = strumento.chiave;
    layer._genere = strumento.genere;
    const kk = strumento.chiave;
    layer._stato = statoPer(kk === 'nota' ? NOTA
      : (LIN[kk] || AREE[kk] || SIM[kk]));

    if (strumento.genere !== 'simbolo'){
      if (strumento.genere === 'linea'){
        decora(layer);
        layer.on('pm:edit', () => { decora(layer); etichettaElemento(layer); aggiornaStato(); });
      } else {
        layer.on('pm:edit', () => { etichettaElemento(layer); aggiornaStato(); });
      }
      layer.on('pm:remove', () => scollega(layer));
      etichettaElemento(layer);
      aggiornaStato();
      return;
    }

    const k = strumento.chiave;
    const def = k === 'nota' ? NOTA : SIM[k];
    /* I lanci nascono come marcatore per avere il clic di posa, poi il
       marcatore si butta e resta il poligono. */
    if (def.poly){
      const centro = layer.getLatLng();
      disegni.removeLayer(layer);
      creaLancio(k, centro, {stato: statoPer(SIM[k])});
      aggiornaStato();
      stato(`${nm(def)}${etichettaStato(def)}\n${t('lancioManiglie')}`);
      riattivaStrumento();
      return;
    }

    /* Il testo va chiesto prima di mostrare il simbolo: la sigla ci sta
       dentro, e ridisegnarlo dopo farebbe lampeggiare il riquadro vuoto. */
    if (def.libero || def.e){
      map.pm.disableDraw();
      const val = await chiedi({campo:1, testo: t(def.libero ? 'chiediNota' : 'chiediSigla')});
      if (def.libero && !val){ disegni.removeLayer(layer); riattivaStrumento(); return; }
      layer._testo = val || null;
      layer.setIcon(iconaSimbolo(k, {stato:layer._stato, testo:layer._testo}));
      if (!def.r) riattivaStrumento();
    }

    etichettaElemento(layer);
    aggiornaStato();

    if (def.r){
      /* Dopo aggiornaStato, che riscriverebbe sopra l'istruzione. Il
         setTimeout serve perché il clic che ha posato il simbolo è ancora
         in corso e verrebbe consumato subito come direzione, con azimut
         nullo: è il motivo per cui serviva cliccare due volte. */
      map.pm.disableDraw();
      setTimeout(() => { attesaDirezione = layer; }, 0);
      stato(`${nm(def)}\n${t('chiediDirezione')}`);
    }
  });

  /* =======================================================================
     8. ETICHETTE SUGLI ELEMENTI
     Ogni cosa disegnata dice cosa è, nella lingua scelta. Per le aree
     anche superficie e perimetro, per le linee la lunghezza: sono i numeri
     che servono davvero mentre si guarda la carta.
     ===================================================================== */
  function etichettaElemento(layer){
    const k = layer._tipo;
    const def = LIN[k] || AREE[k] || SIM[k] || (k === 'nota' ? NOTA : null);
    if (!def || def.libero){ if (layer.unbindTooltip) layer.unbindTooltip(); return; }
    let testo = nm(def) + statoDi(def, layer._stato);
    if (AREE[k]) testo += '\n' + t('areaDi', {a:(areaMq(layer)/10000).toFixed(2),
      p:(perimetroM(layer)/1000).toFixed(2)});
    else if (LIN[k]) testo += '\n' + t('lunghezzaDi', {v:(lunghezzaM(layer)/1000).toFixed(2)});
    else if (layer._testo) testo += ` — ${layer._testo}`;
    if (layer._genere === 'lancio')
      testo += '\n' + t('lancioDi', {a: layer._a * 2, b: layer._b * 2,
        s: (areaMq(layer) / 10000).toFixed(2)});
    layer.unbindTooltip();
    layer.bindTooltip(testo, {direction:'top', offset:[0, LIN[k] || AREE[k] ? 0 : -22],
      className:'sitac-tip', sticky: !!(LIN[k] || AREE[k])});
  }

  /* =======================================================================
     9. AZIONI
     ===================================================================== */
  const $ = id => q('#sitac-' + id);

  agganciaFisa(q('#sitac-barra'));

  $('bModifica').onclick = function(){
    const on = this.classList.contains('attivo');
    fermaTutto(); spegniPulsanti();
    if (!on){ this.classList.add('attivo'); map.pm.enableGlobalEditMode(); stato(t('modOn')); }
    else stato(t('modOff'));
  };
  $('bElimina').onclick = function(){
    const on = this.classList.contains('attivo');
    fermaTutto(); spegniPulsanti();
    if (!on){ this.classList.add('attivo'); map.pm.enableGlobalRemovalMode(); stato(t('elimOn')); }
    else stato(t('elimOff'));
  };
  $('bAnnulla').onclick = () => {
    const l = disegni.getLayers().pop();
    if (!l) return stato(t('nienteAnnulla'));
    scollega(l);
    disegni.removeLayer(l);
    aggiornaStato();
  };
  $('bPulisci').onclick = async () => {
    if (!disegni.getLayers().length && !coni.length) return stato(t('giaVuota'));
    if (!await chiedi({testo: t('confPulisci')})) return;
    disegni.clearLayers(); decori.clearLayers();
    coni.length = 0;
    mostraVento(null);
    cerchioPosizione = null;
    posizioneOttenuta = false;
    aggiornaStato();
  };
  function etichettaSfondo(){
    $('bSfondo').innerHTML = `<span>${esc(t('bSfondo', {n: t(sfondi[iSfondo].k)}))}</span>`;
  }
  $('bSfondo').onclick = () => {
    map.removeLayer(sfondi[iSfondo].l);
    iSfondo = (iSfondo + 1) % sfondi.length;
    map.addLayer(sfondi[iSfondo].l);
    sfondi[iSfondo].l.bringToBack();
    etichettaSfondo();
  };
  $('bCentra').onclick = () => centraSuGps(true);
  $('bStampa').onclick = stampa;

  /* Legenda: si apre e si chiude, perché su un pannello stretto coprirebbe
     mezza mappa proprio mentre si disegna. */
  const legenda = q('#sitac-legenda');
  q('#sitac-legTesta').onclick = () => legenda.classList.toggle('chiusa');

  /* --- raccolta comune --- */
  function raccogli(){
    return disegni.getLayers().map(l => {
      const f = l.toGeoJSON();
      f.properties = {tipo:l._tipo || null, genere:l._genere || null,
        stato:l._stato || null, testo:l._testo || null, rotazione:l._rotazione || null};
      /* Il poligono viaggia come geometria — QGIS e Google Earth vedono
         l'ingombro vero — ma i parametri viaggiano accanto, così rientrando
         qui l'ellisse torna modificabile invece che come sessanta vertici. */
      if (l._genere === 'lancio')
        Object.assign(f.properties, {a:l._a, b:l._b,
          centro:[l._centro.lng, l._centro.lat]});
      return f;
    });
  }
  const nomeFile = est =>
    `sitac${siglaFile()}_${new Date().toISOString().slice(0,16).replace(/[:T-]/g,'')}.${est}`;
  function scarica(testo, nome, mime){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([testo], {type:mime}));
    a.download = nome; a.click(); URL.revokeObjectURL(a.href);
  }

  $('bGeojson').onclick = () => {
    const feat = raccogli();
    if (!feat.length) return stato(t('nienteExport'));
    /* `apertura` e `quota` viaggiano col vento perché il cono si ricostruisce
       da quei numeri: se un domani cambiassero, un file vecchio va rifatto
       coi suoi. */
    const fc = {type:'FeatureCollection', features:feat,
      properties:Object.assign({applicazione:'FireOps VVF — SITAC',
        simbologia:'SI.TA.C. CNVVF 2021', lingua,
        creato:new Date().toISOString()}, intestazione(),
        ventoCono ? {vento:{velocita:ventoCono.velocita, verso:ventoCono.verso,
          provenienza:ventoCono.provenienza, fonte:ventoCono.fonte,
          letto:ventoCono.letto || null,
          apertura:NS.SitacVento.APERTURA, quota:NS.SitacVento.QUOTA_VENTO}} : {})};
    scarica(JSON.stringify(fc,null,1), nomeFile('geojson'), 'application/geo+json');
    stato(t('geojsonFatto', {n:feat.length}));
  };
  $('bKml').onclick = () => {
    const feat = raccogli();
    if (!feat.length) return stato(t('nienteExport'));
    scarica(costruisciKml(feat), nomeFile('kml'), 'application/vnd.google-earth.kml+xml');
    stato(t('kmlFatto', {n:feat.length,
      a:feat.filter(f => f.geometry.type === 'Polygon').length}));
  };

  /* --- KML ---------------------------------------------------------------
     Il KML vuole i colori in aabbggrr: alfa davanti e i canali RGB invertiti.
     È l'errore classico che fa uscire tutto blu al posto del rosso.
     Fuori da qui la simbologia si perde: KML disegna una linea colorata,
     non i triangoli della difesa in linea. Per ritrovare la SITAC intatta
     serve il GeoJSON.                                                      */
  function kmlCol(hex, alfa){
    const h = String(hex || '#cc0000').replace('#','');
    const a = Math.round(Math.max(0, Math.min(1, alfa == null ? 1 : alfa)) * 255)
      .toString(16).padStart(2,'0');
    return a + h.slice(4,6) + h.slice(2,4) + h.slice(0,2);
  }
  const escX = s => String(s == null ? '' : s).replace(/[<>&'"]/g,
    c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));

  function costruisciKml(feat){
    const stili = [];
    Object.entries(LIN).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><LineStyle><color>${kmlCol(d.color)}</color>`
      + `<width>${d.weight || 3}</width></LineStyle></Style>`));
    Object.entries(AREE).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><LineStyle><color>${kmlCol(d.color)}</color>`
      + `<width>${d.weight || 2}</width></LineStyle>`
      + `<PolyStyle><color>${kmlCol(d.fillColor, d.fillOpacity)}</color>`
      + `<fill>1</fill><outline>1</outline></PolyStyle></Style>`));
    Object.keys(SIM).forEach(k => {
      const c = kmlCol(coloreSimbolo(k));
      stili.push(`<Style id="${k}"><IconStyle><color>${c}</color><scale>1.1</scale>`
        + `<Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>`
        + `</IconStyle><LabelStyle><color>${c}</color></LabelStyle></Style>`);
    });

    const segna = feat.map(f => {
      const tp = f.properties.tipo;
      const def = LIN[tp] || AREE[tp] || SIM[tp] || (tp === 'nota' ? NOTA : null);
      let nome = f.properties.testo || (def ? nm(def) : '') || tp || 'elemento';
      /* Le stesse tre coppie della tavola: un'azione è "effettuata", non
         "in atto". */
      if (def && (def.s || def.stati) && f.properties.stato)
        nome += ` (${t(paroleStato(def)[f.properties.stato === 'attivo' ? 1 : 0])})`;
      const g = f.geometry;
      let geom = '';
      if (g.type === 'Point'){
        geom = `<Point><coordinates>${g.coordinates[0]},${g.coordinates[1]},0</coordinates></Point>`;
      } else if (g.type === 'LineString'){
        geom = `<LineString><tessellate>1</tessellate><coordinates>`
          + g.coordinates.map(c => `${c[0]},${c[1]},0`).join(' ')
          + `</coordinates></LineString>`;
      } else if (g.type === 'Polygon'){
        const chiudi = r => {
          const p = r.slice(), a = p[0], z = p[p.length-1];
          if (a[0] !== z[0] || a[1] !== z[1]) p.push(a);   // il KML pretende l'anello chiuso
          return p.map(c => `${c[0]},${c[1]},0`).join(' ');
        };
        geom = `<Polygon><tessellate>1</tessellate>`
          + `<outerBoundaryIs><LinearRing><coordinates>${chiudi(g.coordinates[0])}</coordinates></LinearRing></outerBoundaryIs>`
          + g.coordinates.slice(1).map(r =>
              `<innerBoundaryIs><LinearRing><coordinates>${chiudi(r)}</coordinates></LinearRing></innerBoundaryIs>`).join('')
          + `</Polygon>`;
      }
      return `<Placemark><name>${escX(nome)}</name><styleUrl>#${escX(tp)}</styleUrl>`
        + `<ExtendedData><Data name="tipo"><value>${escX(tp)}</value></Data>`
        + `<Data name="genere"><value>${escX(f.properties.genere)}</value></Data>`
        + `<Data name="stato"><value>${escX(f.properties.stato)}</value></Data></ExtendedData>`
        + geom + `</Placemark>`;
    });
    const cartella = (titolo, filtro) => {
      const dentro = segna.filter((_, i) => filtro(feat[i]));
      return dentro.length ? `<Folder><name>${escX(titolo)}</name>${dentro.join('')}</Folder>` : '';
    };
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<name>${escX(t('kmlDoc'))}</name>
<description>FireOps VVF — ${escX(new Date().toLocaleString(lingua))}</description>
${stili.join('\n')}
${cartella(t('kmlAree'),    f => AREE[f.properties.tipo])}
${cartella(t('kmlLinee'),   f => LIN[f.properties.tipo])}
${cartella(t('kmlSimboli'), f => SIM[f.properties.tipo] || f.properties.tipo === 'nota')}
</Document></kml>`;
  }

  $('bImporta').onclick = () => $('file').click();
  $('file').onchange = ev => {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { carica(JSON.parse(r.result)); }
      catch(err){ stato(t('fileErrato', {e:err.message})); }
      ev.target.value = '';
    };
    r.readAsText(f);
  };

  function carica(fc){
    let n = 0;
    /* Un file altrui porta con sé il suo intervento: si adottano, invece di
       lasciare in testata i numeri di quello precedente. `p` può mancare
       del tutto in un GeoJSON non nostro, quindi tutto sta dentro il test. */
    const p = fc && fc.properties;
    if (p){
      if (p.intervento) inIntervento.value = String(p.intervento).replace(/[^0-9]/g,'');
      if (p.dos)        inDos.value        = normalizzaDos(p.dos);
      if (p.nominativo) inNominativo.value = String(p.nominativo);
      if (p.telefono)   inTelefono.value   = String(p.telefono);
      /* La posizione rientra come dato vivo, non come testo: senza questo
         il passo 2 crede che il DOS non ci sia. */
      if (p.posizione){
        const c = String(p.posizione).split(/[,;\s]+/).map(Number)
          .filter(x => !isNaN(x));
        if (c.length >= 2){ posDos = L.latLng(c[0], c[1]); posaDos(posDos); cercaProvincia(posDos); }
      }
      /* Il vento rientra come dato, non come disegno: i coni sono stime e
         si rifanno dal pulsante, ma il quadro dice subito con che vento la
         carta è stata redatta. */
      if (p.vento && p.vento.velocita != null && p.vento.verso != null)
        mostraVento(p.vento);
      segnaIntestazione();
    }
    L.geoJSON(fc, {
      pointToLayer: (feat, latlng) => {
        const pr = feat.properties || {};
        const tp = VECCHI[pr.tipo] || pr.tipo;
        if (tp !== 'nota' && !SIM[tp]) return L.marker(latlng, {draggable:true});
        return L.marker(latlng, {draggable:true,
          icon: iconaSimbolo(tp, {stato:pr.stato || 'previsto',
            testo:pr.testo, rotazione:pr.rotazione})});
      },
      style: feat => {
        const pr = feat.properties || {};
        const tp = VECCHI[pr.tipo] || pr.tipo;
        if (LIN[tp]) return stileLinea(LIN[tp], pr.stato || 'previsto');
        if (AREE[tp]) return stileArea(AREE[tp]);
        return {color: COL.rosso};
      },
      onEachFeature: (feat, layer) => {
        const pr = feat.properties || {};
        layer._tipo = VECCHI[pr.tipo] || pr.tipo;
        layer._genere = pr.genere;
        layer._stato = pr.stato || 'previsto';
        layer._testo = pr.testo || null;
        layer._rotazione = pr.rotazione || null;
        disegni.addLayer(layer);
        if (pr.genere === 'lancio' && pr.centro && SIM[layer._tipo] && SIM[layer._tipo].poly){
          disegni.removeLayer(layer);
          creaLancio(layer._tipo, L.latLng(pr.centro[1], pr.centro[0]),
            {stato: layer._stato, a: pr.a, b: pr.b, rotazione: pr.rotazione});
          n++;
          return;
        }
        if (LIN[layer._tipo]){
          decora(layer);
          layer.on('pm:edit', () => { decora(layer); etichettaElemento(layer); aggiornaStato(); });
        } else if (AREE[layer._tipo]){
          layer.on('pm:edit', () => { etichettaElemento(layer); aggiornaStato(); });
        }
        layer.on('pm:remove', () => scollega(layer));
        if (layer._rotazione && SIM[layer._tipo] && SIM[layer._tipo].r) creaManiglia(layer);
        etichettaElemento(layer);
        n++;
      }
    });
    if (n && disegni.getBounds().isValid())
      map.fitBounds(disegni.getBounds(), {padding:[40,40]});
    aggiornaStato();
    stato(t('importati', {n}));
  }

  /* =======================================================================
     10. MISURE
     Superficie con la formula sferica, perimetro e lunghezza sommando le
     distanze fra vertici: sono approssimazioni più che sufficienti alla
     scala di un incendio boschivo.
     ===================================================================== */
  function areaMq(poly){
    const p = poly.getLatLngs && poly.getLatLngs()[0];
    if (!p || p.length < 3) return 0;
    let s = 0;
    for (let i = 0; i < p.length; i++){
      const j = (i+1) % p.length;
      s += rad(p[j].lng - p[i].lng) *
           (2 + Math.sin(rad(p[i].lat)) + Math.sin(rad(p[j].lat)));
    }
    return Math.abs(s * R_TERRA * R_TERRA / 2);
  }
  function perimetroM(poly){
    const p = poly.getLatLngs && poly.getLatLngs()[0];
    if (!p || p.length < 2) return 0;
    let d = 0;
    for (let i = 0; i < p.length; i++) d += p[i].distanceTo(p[(i+1) % p.length]);
    return d;
  }
  function lunghezzaM(linea){
    const p = linea.getLatLngs && linea.getLatLngs();
    if (!p || p.length < 2) return 0;
    let d = 0;
    for (let i = 0; i < p.length - 1; i++) d += p[i].distanceTo(p[i+1]);
    return d;
  }

  /* --- stato e legenda --- */
  function stato(x){ $('stato').textContent = x; }

  function aggiornaStato(){
    const l = disegni.getLayers();
    const linee = l.filter(x => LIN[x._tipo]).length;
    const aree  = l.filter(x => AREE[x._tipo]).length;
    const punti = l.length - linee - aree;
    let sup = 0, per = 0;
    l.filter(x => AREE[x._tipo]).forEach(x => { sup += areaMq(x); per += perimetroM(x); });
    stato(t('conteggio', {p:punti, l:linee, a:aree})
      + (sup ? t('superficie', {v:(sup/10000).toFixed(1)}) : '')
      + (per ? t('perimetro', {v:(per/1000).toFixed(2)}) : ''));
    aggiornaLegenda();
    aggiornaPassi();
  }

  /* La tavola ha 64 voci: una legenda con tutte sarebbe illeggibile.
     Si elencano solo i tipi effettivamente sulla mappa, una volta ciascuno. */
  function aggiornaLegenda(){
    const leg = q('#sitac-legVoci');
    if (!leg) return;
    leg.innerHTML = '';
    const visti = new Map();
    disegni.eachLayer(x => {
      if (!x._tipo) return;
      const chiave = x._tipo + '|' + (x._stato || '');
      if (!visti.has(chiave)) visti.set(chiave, x);
    });
    const quanti = q('#sitac-legQuanti');
    if (quanti) quanti.textContent = visti.size || '';
    if (!visti.size){
      leg.innerHTML = `<div class="sitac-leg-vuota">${esc(t('legVuota'))}</div>`;
      return;
    }
    visti.forEach(x => {
      const k = x._tipo;
      if (LIN[k]){
        const d = LIN[k];
        leg.insertAdjacentHTML('beforeend',
          `<div><i class="sitac-tratto" style="background:${d.color};height:${Math.min(d.weight||3,5)}px"></i>`
          + `<span>${esc(nm(d) + statoDi(d, x._stato))}</span></div>`);
      } else if (AREE[k]){
        const d = AREE[k];
        leg.insertAdjacentHTML('beforeend',
          `<div><i class="sitac-tratto" style="height:11px;border-radius:2px;background:${d.fillColor};
            opacity:.85;border:1.5px solid ${d.color}"></i><span>${esc(nm(d))}</span></div>`);
      } else if (SIM[k]){
        const d = SIM[k];
        leg.insertAdjacentHTML('beforeend',
          `<div><span class="sitac-leg-sim">${svgSimbolo(k, {stato:x._stato})}</span>`
          + `<span>${esc(nm(d) + statoDi(d, x._stato))}</span></div>`);
      } else if (k === 'nota'){
        leg.insertAdjacentHTML('beforeend',
          `<div><span class="sitac-leg-sim">✎</span><span>${esc(nm(NOTA))}</span></div>`);
      }
    });
  }

  /* =======================================================================
     11. CAMBIO LINGUA
     Ridisegna solo le etichette: geometrie, strumento in uso e modalità
     di modifica restano dove sono. Anche i suggerimenti già posati sugli
     elementi vengono riscritti nella nuova lingua.
     ===================================================================== */
  function creaBandiere(){
    const box = q('#sitac-lingue');
    box.innerHTML = '';
    Object.keys(L10N).forEach(lg => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.lingua = lg;
      b.title = lg.toUpperCase();
      b.setAttribute('aria-label', lg.toUpperCase());
      b.innerHTML = BANDIERE[lg];
      if (lg === lingua) b.classList.add('attivo');
      b.onclick = () => cambiaLingua(lg);
      box.appendChild(b);
    });
  }
  function cambiaLingua(lg){
    if (!L10N[lg] || lg === lingua) return;
    lingua = lg;
    applicaLingua();
  }
  function applicaLingua(){
    radice.setAttribute('lang', lingua);
    qq('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
    qq('#sitac-lingue button').forEach(b =>
      b.classList.toggle('attivo', b.dataset.lingua === lingua));
    q('#sitac-bCentra').title = t('bCentra');
    inDos.title = t('dosAiuto');
    creaPulsanti();
    etichettaSfondo();
    disegni.eachLayer(etichettaElemento);
    if (ventoCono) mostraVento(ventoCono);
    if (strumento){
      const d = strumento.genere === 'linea' ? LIN[strumento.chiave]
              : strumento.genere === 'area'  ? AREE[strumento.chiave]
              : (strumento.chiave === 'nota' ? NOTA : SIM[strumento.chiave]);
      const sugg = strumento.genere === 'linea' ? 'suggLinea'
                 : strumento.genere === 'area'  ? 'suggArea' : 'suggSimbolo';
      stato(`${nm(d)}${etichettaStato(d)}\n${t(sugg)}`);
    } else if (disegni.getLayers().length){
      aggiornaStato();
    } else {
      stato(t('pronto'));
      aggiornaLegenda();
    }
  }

  /* Esc annulla lo strumento corrente, o chiude il modale */
  document.addEventListener('keydown', e => {
    if (app.offsetParent === null) return;
    if (e.key !== 'Escape') return;
    if (chiudiModale){ chiudiModale(); return; }
    fermaTutto(); spegniPulsanti(); stato(t('spento'));
  });

  creaBandiere();
  applicaLingua();
  stato(t('pronto'));
  aggiornaLegenda();
  centraSuGps(false);

  /* -------------------------------------------------------------------
     Stampa: la sezione viene appesa al body per il tempo della stampa,
     poi torna esattamente dov'era. Senza questo passaggio il pannello
     resta annegato nel layout di index.html e la mappa esce tagliata.
     La testata (titolo, data, conteggi) esiste solo su carta: a video
     sarebbe una ripetizione del riquadro di stato.
     ----------------------------------------------------------------- */
  function stampa(){
    const testata = q('#sitac-testata-stampa');
    testata.querySelector('.t').textContent = t('stTitolo');
    const i = intestazione();
    testata.querySelector('.i').textContent =
      [i.intervento ? `${t('nIntervento')} ${i.intervento}` : '',
       i.dos ? `${t('nDos')} ${i.dos}` : '',
       i.nominativo || '', i.telefono || ''].filter(Boolean).join('  ·  ');
    testata.querySelector('.d').textContent =
      t('stData', {d:new Date().toLocaleString(lingua)})
      + (ventoCono ? `  ·  ${t('stVento', {v:ventoCono.velocita, d:ventoCono.verso,
          o:ventoCono.letto ? new Date(ventoCono.letto).toLocaleTimeString(lingua) : '—'})}` : '')
      + (coni.some(c => c.fattori) ? `  ·  ${NS.SitacRilievo.avvertenza[lingua]
          || NS.SitacRilievo.avvertenza.it}` : '');
    testata.querySelector('.n').textContent = $('stato').textContent.replace(/\n/g, ' · ');
    legenda.classList.remove('chiusa');   // sulla carta la legenda serve aperta

    const segno = document.createComment('sitac');
    app.parentNode.insertBefore(segno, app);
    document.body.appendChild(app);
    document.body.classList.add('sitac-stampa');
    map.invalidateSize();
    const ripristina = () => {
      document.body.classList.remove('sitac-stampa');
      segno.parentNode.insertBefore(app, segno);
      segno.remove();
      setTimeout(() => map.invalidateSize(), 60);
      window.removeEventListener('afterprint', ripristina);
    };
    window.addEventListener('afterprint', ripristina);
    setTimeout(() => window.print(), 400);
  }

  /* La sezione nasce nel magazzino e vive dentro un pannello che cambia
     larghezza: qui si fanno due cose insieme, il ridisegno della mappa e la
     classe .sitac-stretto (stesso criterio di .um-root.narrow, perche' in
     split-screen un pannello puo' essere stretto anche su schermo largo). */
  const LARGHEZZA_STRETTA = 620;
  function adatta(){
    if (app.offsetParent === null) return;          // in magazzino: niente da fare
    const stretto = app.clientWidth < LARGHEZZA_STRETTA;
    app.classList.toggle('sitac-stretto', stretto);
    /* La riga sopra il riquadro (nota, bandiere, Espandi) vive FUORI da
       #sitac-app: senza una classe sulla sezione resterebbe fuori portata. */
    radice.classList.toggle('sitac-sez-stretta', stretto);
    map.invalidateSize();
  }
  if (window.ResizeObserver) new ResizeObserver(adatta).observe(app);
  setTimeout(adatta, 150);

  /* comando attivo condiviso con script.js / convertitore.js: si sposta la
     vista solo se il GPS non ha risposto e non c'è ancora nulla disegnato */
  window.addEventListener('fireops:comando-attivo-cambiato', ev => {
    const d = ev.detail || {};
    const la = parseFloat(d.lat != null ? d.lat : d.latitudine);
    const lo = parseFloat(d.lon != null ? d.lon : d.longitudine);
    if (!isNaN(la) && !isNaN(lo)){
      if (!posizioneOttenuta && !disegni.getLayers().length) map.setView([la, lo], 12);
    } else tornaAlComando();
  });

  return {
    map, disegni, coni,
    lingua: lg => cambiaLingua(lg),
    stato: (tavola, s) => cambiaStato(tavola, s),
    esportaGeoJson: raccogli,
    vento: () => ventoCono,
    carica,
    pulisci: () => {
      disegni.clearLayers(); decori.clearLayers();
      coni.length = 0; mostraVento(null); cerchioPosizione = null; posizioneOttenuta = false;
      aggiornaStato();
    },
    ridisegna: adatta
  };
}

/* ---------------------------------------------------------------------
   Avvio
   ------------------------------------------------------------------- */
let istanza = null;

NS.Sitac = {
  /* Idempotente: il sistema pannelli sposta la sezione fra pannello e
     magazzino, quindi init() può essere richiamato quante volte serve. */
  init(){
    if (istanza) { istanza.ridisegna(); return istanza; }

    const app = document.getElementById('sitac-app');
    if (!app) return null;                       // sezione non ancora nel DOM
    const radice = app.closest('.page-section') || app;

    /* La guardia elenca TUTTO quello che avvia() tocca senza rete: se il
       markup è indietro rispetto al codice, si vede subito quale pezzo
       manca invece di un TypeError a metà costruzione. */
    for (const id of ['sitac-barra','sitac-mappa','sitac-tavola','sitac-stato',
                      'sitac-lingue','sitac-modale','sitac-legenda','sitac-legTesta',
                      'sitac-legVoci','sitac-vento','sitac-testata-stampa',
                      'sitac-nIntervento','sitac-nDos','sitac-nominativo',
                      'sitac-telefono','sitac-posizione','sitac-bPosizione',
                      'sitac-bConvalida','sitac-bCentra','sitac-bModifica',
                      'sitac-bElimina','sitac-bAnnulla','sitac-bPulisci',
                      'sitac-bSfondo','sitac-bImporta','sitac-bStampa',
                      'sitac-bGeojson','sitac-bKml','sitac-file',
                      'sitac-provincia','sitac-comando','sitac-bVentoDir','sitac-bVentoWeb','sitac-ventoScala','sitac-ventoValore' ]){
      if (!radice.querySelector('#' + id)){
        console.error('[SITAC] manca #' + id + ' nel markup della sezione.');
        return null;
      }
    }
    const box = radice.querySelector('#sitac-stato');
    if (!NS.SITAC_SIMBOLI || !NS.SITAC_LINEE){
      box.textContent = 'Simbologia mancante: sitac-simboli.js deve precedere sitac.js.';
      console.error('[SITAC] sitac-simboli.js non caricato.');
      return null;
    }
    if (!NS.SitacVento){
      box.textContent = 'Modulo vento mancante: sitac-vento.js deve precedere sitac.js.';
      console.error('[SITAC] sitac-vento.js non caricato.');
      return null;
    }
    if (typeof L === 'undefined' || !L.PM || !L.Symbol || !L.Symbol.arrowHead){
      box.textContent = 'Librerie mancanti: servono Leaflet, Geoman e PolylineDecorator.';
      console.error('[SITAC] Geoman o PolylineDecorator non caricati.');
      return null;
    }
    istanza = avvia(app);
    return istanza;
  },
  get(){ return istanza; }
};

/* -----------------------------------------------------------------------
   Aggancio al sistema pannelli.

   La sezione #sitac-aib viaggia fra i due pannelli e il magazzino, e Leaflet
   non sopporta di riapparire senza dimensioni: serve un invalidateSize ogni
   volta che torna a schermo.

   L'osservazione e' limitata ai DUE contenitori dei pannelli, con childList
   e SENZA subtree: le sezioni sono figlie dirette di #corpo-sinistra e
   #corpo-destra, quindi tanto basta. Osservare .split-screen con subtree:true
   sembra piu' sicuro ma e' la scelta sbagliata: ogni tile che Leaflet inserisce
   nella mappa e' una mutazione dentro quel sottoalbero, e ogni spostamento
   della mappa scatenerebbe decine di invalidateSize inutili (misurati: 56 per
   otto spostamenti), ognuno dei quali forza un ricalcolo del layout.
   --------------------------------------------------------------------- */
function agganciaPannelli(){
  const sezione = document.getElementById('sitac-aib');
  if (!sezione) return;

  const risveglia = () => {
    if (sezione.offsetParent === null) return;   // ancora nel magazzino
    const i = NS.Sitac.init();                   // prima apertura: costruisce
    if (i) i.ridisegna();                        // gia' viva: solo ridisegno
  };

  ['corpo-sinistra','corpo-destra'].forEach(id => {
    const corpo = document.getElementById(id);
    if (corpo) new MutationObserver(risveglia).observe(corpo, { childList:true });
  });

  window.addEventListener('resize', () => {
    const i = NS.Sitac.get();
    if (i && sezione.offsetParent !== null) i.ridisegna();
  });

  risveglia();
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', agganciaPannelli);
else agganciaPannelli();

})();