/* FireOps VVF - modulo "localizzati"
 * Caricato da fireops-app.js alla prima apertura (#/localizzati).
 * CSS e HTML sono qui dentro; lo stile è limitato a .pg-localizzati per non toccare gli altri moduli.
 */
FireOps.registra({
  id: "localizzati",

  css: `
.pg-localizzati {
      --bg: #10141a;
      --panel: #171d25;
      --panel-2: #1d242e;
      --line: #2a323d;
      --red: #ffd700;
      --red-dim: #e6c200;
      --amber: #e6c200;
      --text: #eceff3;
      --text-dim: #8b96a3;
      --green: #3fa66b;
      --cyan: #29a9eb;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Consolas, "Liberation Mono", monospace;
}
.pg-localizzati, .pg-localizzati * {
      box-sizing: border-box;
}
.pg-localizzati {
      margin: 0;
      padding: 0;
}
.pg-localizzati {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      -webkit-font-smoothing: antialiased;
      min-height: calc(100vh - var(--foh-h, 213px));
      min-height: calc(100dvh - var(--foh-h, 213px));
      padding-bottom: 64px;
}
.pg-localizzati .wrap {
      max-width: 520px;
      margin: 0 auto;
      padding: 0 16px;
}
.pg-localizzati header {
      padding: 20px 16px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--line);
}
.pg-localizzati .mark {
      flex: none;
      width: 34px;
      height: 34px;
      object-fit: contain;
      cursor: pointer;
}
.pg-localizzati .htitle {
      flex: 1;
      min-width: 0;
}
.pg-localizzati .htitle h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: .1px;
}
.pg-localizzati .htitle p {
      margin: 2px 0 0;
      font-size: 12.5px;
      color: var(--text-dim);
}
.pg-localizzati .home-btn {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--panel-2);
      border: 1px solid var(--line);
      color: var(--text);
      cursor: pointer;
      text-decoration: none;
}
.pg-localizzati .home-btn:active {
      background: var(--line);
}
.pg-localizzati section {
      margin-top: 18px;
}
.pg-localizzati .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 4px;
      overflow: hidden;
}
.pg-localizzati .panel+.panel {
      margin-top: 10px;
}
.pg-localizzati .row-group-label {
      padding: 10px 14px 6px;
      font-size: 12.5px;
      color: var(--text-dim);
      border-left: 3px solid var(--line);
}
.pg-localizzati .row-group-label.gps {
      border-left-color: var(--red);
}
.pg-localizzati .row-group-label.target {
      border-left-color: #e84747;
}
.pg-localizzati .locate-btn {
      width: 100%;
      padding: 16px;
      font-size: 16px;
      font-weight: 700;
      color: #000;
      background: var(--red);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
}
.pg-localizzati .locate-btn:active {
      background: var(--red-dim);
}
.pg-localizzati .locate-btn svg {
      flex: none;
}
.pg-localizzati .locate-btn svg circle, .pg-localizzati .locate-btn svg path {
      stroke: #000 !important;
}
.pg-localizzati .locate-btn.loading {
      opacity: .7;
}
.pg-localizzati #locate-section { display: contents; }
.pg-localizzati .wrap { max-width: 100%; overflow-x: clip; padding-top: 16px; }
/* il pulsante aperto resta agganciato sotto l'intestazione mentre il resto scorre; i chiusi stanno fermi in alto */
.pg-localizzati .act3-grp.on { position: sticky; top: var(--foh-h, 130px); z-index: 1300; background: var(--bg); padding: 16px 0 8px; margin-top: -16px; margin-bottom: 4px; }
.pg-localizzati .act3 { margin: 0 0 10px; min-height: 56px; padding-left: 12px; padding-right: 38px; }
.pg-localizzati .act3.coord { background: #d8262f; color: #fff; }
.pg-localizzati .act3.coord:active { background: #a81b23; }
.pg-localizzati .act3.coord svg path, .pg-localizzati .act3.coord svg circle, .pg-localizzati .act3.coord svg rect { stroke: #fff !important; }
.pg-localizzati .act3.cmd { background: #cfd5dd; color: #10141a; }
.pg-localizzati .act3.cmd:active { background: #aeb6c1; }
.pg-localizzati #locateBtn.act3 { background: #ffd400; color: #000; }
.pg-localizzati #locateBtn.act3:active { background: #d9b500; }
.pg-localizzati .act3.cmd svg path, .pg-localizzati .act3.cmd svg circle { stroke: currentColor !important; }
.pg-localizzati .act3 { position: relative; }
.pg-localizzati .act3 .chev { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 20px; line-height: 1; transition: transform .15s; }
.pg-localizzati .act3.on .chev { transform: translateY(-50%) rotate(180deg); }
.pg-localizzati .act3.on { outline: 2px solid #fff; outline-offset: -4px; }
.pg-localizzati .act3.cmd.on { outline-color: #10141a; }
.pg-localizzati .act3-grp { display: flex; gap: 8px; align-items: stretch; margin: 0 0 10px; }
.pg-localizzati .act3-grp .act3 { flex: 1 1 auto; min-width: 0; margin: 0; }
.pg-localizzati .act3-reset { flex: none; width: 64px; min-height: 56px; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font-size: 22px; line-height: 1; font-weight: 700; color: var(--text, #eceff3); background: var(--panel-2, #1d242e); border: 1px dashed var(--text-dim, #8b95a3); border-radius: 4px; cursor: pointer; }
.pg-localizzati .act3-reset small { font-size: 10.5px; font-weight: 700; }
.pg-localizzati .act3-reset.hidden { display: none !important; }
.pg-localizzati .act3-reset:active { background: var(--line, #2a323d); }
.pg-localizzati .link-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: none;
      border: none;
      color: var(--text-dim);
      font-size: 13.5px;
      padding: 12px 8px 2px;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
}
.pg-localizzati .link-btn:active {
      color: var(--text);
}
.pg-localizzati .status-msg {
      margin-top: 10px;
      font-size: 13px;
      color: var(--amber);
      padding: 0 2px;
      line-height: 1.5;
}
.pg-localizzati .status-msg.error {
      color: #e8734a;
}
.pg-localizzati .target-input-box {
      padding: 12px 14px;
}
.pg-localizzati .target-input-row {
      display: flex;
      gap: 8px;
}
.pg-localizzati .target-input-row input {
      flex: 1;
      padding: 12px 14px;
      font-size: 14px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-family: var(--mono);
}
.pg-localizzati .target-input-row input:focus {
      outline: none;
      border-color: #e84747;
}
.pg-localizzati .target-go-btn {
      padding: 0 16px;
      background: #e84747;
      color: #fff;
      font-weight: 700;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
}
.pg-localizzati .target-go-btn:active {
      opacity: .85;
}
.pg-localizzati .paste-clip-btn {
      width: 100%;
      margin-top: 8px;
      padding: 10px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
}
.pg-localizzati .paste-clip-btn:active {
      background: var(--line);
}
.pg-localizzati .cmd-panel {
      border-left: 3px solid var(--text-dim);
}
.pg-localizzati .cmd-conf {
      border-top: 1px solid var(--line);
}
.pg-localizzati .cmd-conf-label {
      padding: 10px 14px 0;
      font-size: 12.5px;
      color: var(--text-dim);
}
.pg-localizzati .result-top {
      padding: 10px 14px 2px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
}
.pg-localizzati .result-top .result-name-wrap { flex-direction: column; align-items: flex-start; gap: 0; }
.pg-localizzati .result-top .name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: .2px;
      line-height: 1.15;
}
.pg-localizzati .result-top .dist {
      text-align: right;
      font-family: var(--mono);
      font-size: 14px;
      color: var(--red);
      white-space: nowrap;
}
.pg-localizzati .result-top .dist:empty { display: none; }
.pg-localizzati .result-top .dist .leg {
      display: block;
      margin-bottom: 1px;
      font-family: var(--sans);
      font-size: 11px;
      color: var(--text-dim);
}
.pg-localizzati .result-top .dist .val {
      display: block;
      font-size: 17px;
      font-weight: 700;
}
.pg-localizzati .result-top .dist .az {
      display: block;
      margin-top: 0;
      font-size: 13px;
      color: inherit;
      text-align: right;
}
.pg-localizzati .result-top .dist.is-target {
      color: #e84747;
}
.pg-localizzati .leg .c-cmd {
      color: #b8c0ca;
      font-weight: 700;
}
.pg-localizzati .leg .c-tgt {
      color: #e84747;
      font-weight: 700;
}
.pg-localizzati .leg .c-me {
      color: var(--red);
      font-weight: 700;
}
.pg-localizzati .result-sub {
      padding: 0 14px 14px;
      font-size: 13px;
      color: var(--text-dim);
      margin-top: -8px;
}
.pg-localizzati .result-addr {
      padding: 0 14px 12px;
      margin-top: -6px;
      font-size: 13.5px;
      line-height: 1.45;
      color: var(--text);
}
.pg-localizzati .result-addr .loc {
      display: block;
      color: var(--text-dim);
}
.pg-localizzati .border-note+.panel {
      margin-top: 10px;
}
.pg-localizzati .data-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-top: 1px solid var(--line);
      min-height: 26px;
}
.pg-localizzati .data-row .label {
      font-size: 14px;
      color: var(--text-dim);
}
.pg-localizzati .data-row .value {
      font-family: var(--mono);
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
}
.pg-localizzati a.value-link {
      color: var(--text);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
}
.pg-localizzati a.value-link:active {
      color: var(--amber);
}
.pg-localizzati .border-note {
      margin-top: 10px;
      padding: 12px 14px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-left: 3px solid var(--amber);
      border-radius: 4px;
      font-size: 13px;
      color: var(--text-dim);
      line-height: 1.55;
}
.pg-localizzati .border-note strong {
      color: var(--text);
}
.pg-localizzati .method-badge {
      padding: 0 14px 14px;
      margin-top: -6px;
      font-size: 12px;
}
.pg-localizzati .method-badge.geo {
      color: var(--red);
}
.pg-localizzati .method-badge.dist {
      color: var(--amber);
}
.pg-localizzati .method-badge.manual {
      color: var(--text-dim);
}
.pg-localizzati .method-badge.tgt {
      color: #e84747;
}
.pg-localizzati .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 14px 14px;
}
.pg-localizzati .chip {
      font-size: 13px;
      padding: 7px 12px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 20px;
      color: var(--text);
      cursor: pointer;
}
.pg-localizzati .chip:active {
      border-color: var(--amber);
}
.pg-localizzati .search-wrap {
      position: relative;
}
.pg-localizzati input.search-input {
      width: 100%;
      padding: 14px 14px;
      font-size: 16px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-family: var(--sans);
}
.pg-localizzati input.search-input:focus {
      outline: none;
      border-color: var(--amber);
}
.pg-localizzati .search-results {
      margin-top: 6px;
      border: 1px solid var(--line);
      border-radius: 4px;
      overflow: hidden;
      max-height: 60vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
}
.pg-localizzati .search-grp {
      position: sticky;
      top: 0;
      padding: 8px 14px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: .6px;
      text-transform: uppercase;
      background: var(--panel-2);
      color: var(--text-dim);
      border-top: 1px solid var(--line);
}
.pg-localizzati .search-item.dir .sname { font-weight: 700; color: #ffd700; }
.pg-localizzati .search-item {
      min-height: 48px;
      padding: 12px 14px;
      border-top: 1px solid var(--line);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
}
.pg-localizzati .search-item:first-child {
      border-top: none;
}
.pg-localizzati .search-item:active {
      background: var(--panel-2);
}
.pg-localizzati .search-item .sname {
      font-size: 15px;
}
.pg-localizzati .search-item .sprov {
      font-family: var(--mono);
      font-size: 12.5px;
      color: var(--text-dim);
}
.pg-localizzati .hidden {
      display: none !important;
}
.pg-localizzati .route-btn.ar { border-color: #ffd700; color: #ffd700; }
.pg-localizzati .ar-ov { position: fixed; inset: 0; z-index: 4000; background: #000; color: #fff; overflow: hidden; }
.pg-localizzati .ar-ov video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pg-localizzati .ar-ov canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.pg-localizzati .ar-top { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: 12px;
      padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 14px; background: linear-gradient(rgba(0,0,0,.75), rgba(0,0,0,0)); }
.pg-localizzati #arArrow { flex: none; width: 54px; height: 54px; border-radius: 50%; background: rgba(255,215,0,.95); color: #10141a;
      display: flex; align-items: center; justify-content: center; font-size: 28px; line-height: 1; transition: transform .15s linear; }
.pg-localizzati .ar-txt { display: flex; flex-direction: column; min-width: 0; text-shadow: 0 1px 3px #000; }
.pg-localizzati .ar-txt b { font-size: 18px; }
.pg-localizzati .ar-txt span { font-size: 13px; opacity: .92; }
.pg-localizzati .ar-msg { position: absolute; left: 14px; right: 14px; top: 96px; padding: 10px 12px; border-radius: 8px;
      background: rgba(0,0,0,.78); border: 1px solid #ffd700; font-size: 13.5px; line-height: 1.4; }
.pg-localizzati .ar-bot { position: absolute; left: 0; right: 0; bottom: 0; display: flex; gap: 8px;
      padding: 14px 12px calc(14px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.8)); }
.pg-localizzati .ar-bot button { flex: 1; min-height: 50px; border-radius: 10px; border: 1px solid rgba(255,255,255,.35);
      background: rgba(20,24,30,.8); color: #fff; font: 700 14px system-ui; cursor: pointer; }
.pg-localizzati .ar-bot button:active { background: #ffd700; color: #000; }
.pg-localizzati .map-wrap {
      position: relative;
      z-index: 0;            /* contiene gli z-index interni di Leaflet (400-1000): la mappa passa dietro al tasto fisso */
      isolation: isolate;
}
.pg-localizzati #resultMap {
      width: 100%;
      height: 330px;
      background: #e5e3df;
}
.pg-localizzati .map-wrap.map-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      z-index: 9999;
      background: var(--bg);
}
.pg-localizzati .map-wrap.map-fullscreen #resultMap {
      width: 100%;
      height: 100%;
      border-radius: 0;
}
body.map-open {
      overflow: hidden;
}
.pg-localizzati .leaflet-container {
      font-family: var(--sans);
}
.pg-localizzati .leaflet-control-attribution {
      font-size: 10px !important;
}
.pg-localizzati .map-expand-btn, .pg-localizzati .map-center-btn, .pg-localizzati .map-target-btn {
      position: absolute;
      top: 10px;
      z-index: 1200;
      width: 34px;
      height: 34px;
      border-radius: 4px;
      background: var(--panel);
      border: 1px solid var(--line);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
}
.pg-localizzati .map-expand-btn {
      right: 10px;
}
.pg-localizzati .map-center-btn {
      right: 52px;
}
.pg-localizzati .map-target-btn {
      right: 94px;
}
.pg-localizzati .map-expand-btn:active, .pg-localizzati .map-center-btn:active, .pg-localizzati .map-target-btn:active {
      background: var(--panel-2);
}
.pg-localizzati .map-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 14px;
      border-top: 1px solid var(--line);
      font-size: 12px;
      color: var(--text-dim);
}
.pg-localizzati .map-legend span {
      display: flex;
      align-items: center;
      gap: 6px;
}
.pg-localizzati .map-legend i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex: none;
}
.pg-localizzati .map-legend i.dot-comando {
      background: #000;
      border: 1px solid var(--red);
}
.pg-localizzati .map-legend i.rombo { border-radius: 0; width: 9px; height: 9px; transform: rotate(45deg); background: #8a94a3; border: 2px solid #ffd700; margin: 0 3px; box-shadow: 0 0 0 1px #000; }
.pg-localizzati .map-legend i.rombo.int { border-color: #e84747; }
.pg-localizzati .map-legend i.rombo.sel { border-color: #000; }
.pg-localizzati .map-legend i.dot-user {
      background: var(--red);
}
.pg-localizzati .map-legend i.dot-target {
      background: #e84747;
}
.pg-localizzati .src-tag {
      font-family: var(--sans);
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      margin-left: 6px;
      text-transform: uppercase;
      letter-spacing: .3px;
      color: #000;
      vertical-align: middle;
}
.pg-localizzati .src-tag.rx {
      background: var(--green);
}
.pg-localizzati .src-tag.calc {
      background: var(--cyan);
}
.pg-localizzati .refresh-gps-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: calc(100% - 28px);
      margin: 4px 14px 14px;
      padding: 10px;
      background: var(--panel-2);
      border: 1px solid var(--red);
      border-radius: 4px;
      color: var(--red);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
}
.pg-localizzati .refresh-gps-btn:active {
      background: var(--line);
}
.pg-localizzati .refresh-gps-btn:disabled {
      opacity: .6;
      cursor: default;
}
.pg-localizzati .refresh-gps-btn.spin svg {
      animation: spin 1s linear infinite;
}
@keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
.pg-localizzati .copyable {
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
}
.pg-localizzati .copyable::after {
      content: "⧉";
      margin-left: 8px;
      color: var(--text-dim);
      font-size: 14px;
}
.pg-localizzati .copyable:active {
      color: var(--amber);
}
.pg-localizzati .copyable.copied, .pg-localizzati .copyable.copied::after {
      color: var(--green);
}
.pg-localizzati .copyable.copied::after {
      content: "✓ copiato";
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 700;
}
.pg-localizzati .maps-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: calc(100% - 28px);
      margin: 10px 14px 14px;
      padding: 10px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
}
.pg-localizzati .maps-btn:active {
      background: var(--line);
}
.pg-localizzati .maps-btn.target {
      border-color: #e84747;
}
.pg-localizzati .route-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 14px 0;
}
.pg-localizzati .route-btn {
      flex: 1;
      padding: 10px 6px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
}
.pg-localizzati .route-btn:active {
      background: var(--line);
}
.pg-localizzati .route-btn:disabled {
      opacity: .6;
      cursor: default;
}
.pg-localizzati .route-btn.foot {
      border-color: var(--green);
}
.pg-localizzati .route-btn.car {
      border-color: var(--cyan);
}
.pg-localizzati .route-btn.mix {
      flex-basis: 100%;
      border-color: #e84747;
}
.pg-localizzati .route-btn small {
      display: block;
      font-weight: 400;
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
}
.pg-localizzati .route-btn.attivo {
      background: #e84747;
      border-color: #e84747;
      color: #fff;
}
.pg-localizzati .route-btn.attivo small {
      color: #fff;
}
.pg-localizzati .route-hint {
      margin: 6px 14px 0;
      font-size: 11px;
      color: var(--text-dim);
}
/* riepilogo come il riquadro della carta di FireOps: titolo rosso, righe brevi */
.pg-localizzati .route-info {
      margin: 8px 14px 0;
      padding: 8px 12px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text);
      background: rgba(18, 18, 18, .9);
      border: 1px solid #e84747;
      border-radius: 6px;
}
.pg-localizzati .route-info .rt-titolo {
      color: #e84747;
      font-weight: 700;
      margin-bottom: 2px;
}
.pg-localizzati .route-info .rt-nota {
      color: var(--text-dim);
      font-size: 11px;
      margin-top: 4px;
}
.pg-localizzati .route-info .rt-avviso {
      color: #e8734a;
}
.pg-localizzati .route-info strong {
      color: var(--text);
}
.pg-localizzati .route-export {
      display: flex;
      gap: 8px;
      padding: 8px 14px 0;
}
.pg-localizzati .route-export button {
      flex: 1;
      padding: 9px 6px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
}
/* legenda sulla carta, uguale a quella di FireOps; compare solo con un percorso */
.pg-localizzati .route-legenda {
      position: absolute;
      right: 8px;
      bottom: 22px;              /* sopra l'attribuzione; a sinistra c'e' l'etichetta del Comando */
      z-index: 1100;
      background: rgba(18, 18, 18, .9);
      border: 1px solid #e84747;
      border-radius: 6px;
      padding: 6px 9px;
      font-size: 11px;
      color: #eee;
      pointer-events: none;
}
.pg-localizzati .route-legenda div {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
}
.pg-localizzati .route-legenda div + div {
      margin-top: 3px;
}
.pg-localizzati .route-info.error {
      color: #e8734a;
      border-color: #e8734a;
}
.pg-localizzati .result-name-wrap {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 12px;
      min-width: 0;
}
.pg-localizzati .pan-det > summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; min-height: 44px; box-sizing: border-box; }
.pg-localizzati .pan-det > summary::-webkit-details-marker { display: none; }
.pg-localizzati .pan-det > summary::after { content: "▾"; font-size: 16px; margin-left: 8px; transition: transform .15s; }
.pg-localizzati .pan-det[open] > summary::after { transform: rotate(180deg); }
.pg-localizzati .cmd-tag { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #e84747; margin-bottom: 2px; }
.pg-localizzati .cmd-panel.modo-gps .cmd-tag { color: #ffd700; }
.pg-localizzati .cmd-panel.modo-cerca .cmd-tag { color: #9aa5b4; }
.pg-localizzati .cmd-dove { margin: 2px 14px 10px 14px; border: 1px solid var(--line, #2a323d); border-radius: 12px; background: var(--panel-2, #1d242e); }
.pg-localizzati .cmd-dove > summary { list-style: none; cursor: pointer; min-height: 40px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; font-size: 14px; font-weight: 600; color: var(--text, #eceff3); }
.pg-localizzati .cmd-dove > summary::-webkit-details-marker { display: none; }
.pg-localizzati .cmd-dove > summary::after { content: "▾"; font-size: 16px; transition: transform .15s; }
.pg-localizzati .cmd-dove[open] > summary::after { transform: rotate(180deg); }
.pg-localizzati .cmd-dove > .cmd-actions { margin: 0 12px 12px; }
.pg-localizzati .cmd-dove > .result-addr { margin: 0 16px 14px; padding: 0; }
.pg-localizzati .nav-cmd-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      background: var(--red);
      border: none;
      border-radius: 20px;
      color: #000;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
}
.pg-localizzati .nav-cmd-btn:active {
      background: var(--red-dim);
}
.pg-localizzati .cmd-actions { display: flex; gap: 8px; margin: 10px 12px 6px; }
.pg-localizzati .cmd-actions .nav-cmd-btn { flex: 1 1 0; min-width: 0; box-sizing: border-box; justify-content: center; min-height: 52px; padding: 10px 14px; border: 1px solid transparent; border-radius: 12px; font-size: 15.5px; }
.pg-localizzati .nav-cmd-btn.alt { background: var(--panel-2, #1d242e); color: var(--text, #eceff3); border: 1px solid var(--line, #2a323d); }
.pg-localizzati .nav-cmd-btn.alt:active { background: var(--line, #2a323d); }
.pg-localizzati .place-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, .7);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 60px 16px 16px;
}
.pg-localizzati .place-box {
      width: 100%;
      max-width: 440px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 16px;
}
.pg-localizzati .place-box h3 {
      margin: 0 0 4px;
      font-size: 16px;
}
.pg-localizzati .place-box p {
      margin: 0 0 12px;
      font-size: 13px;
      color: var(--text-dim);
      line-height: 1.5;
}
.pg-localizzati .place-box input {
      width: 100%;
      padding: 13px 14px;
      font-size: 16px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text);
      font-family: var(--sans);
}
.pg-localizzati .place-box input:focus {
      outline: none;
      border-color: var(--red);
}
.pg-localizzati .place-list {
      margin-top: 8px;
      max-height: 260px;
      overflow-y: auto;
      border-radius: 4px;
}
.pg-localizzati .place-item {
      padding: 12px 14px;
      background: var(--panel-2);
      border-top: 1px solid var(--line);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      gap: 10px;
}
.pg-localizzati .place-item:first-child {
      border-top: none;
}
.pg-localizzati .place-item:active {
      background: var(--line);
}
.pg-localizzati .place-item .pn {
      font-size: 15px;
}
.pg-localizzati .place-item .pp {
      font-size: 12.5px;
      color: var(--text-dim);
      text-align: right;
}
.pg-localizzati .place-msg {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-dim);
}
.pg-localizzati .place-cancel {
      margin-top: 12px;
      width: 100%;
      padding: 10px;
      background: none;
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--text-dim);
      font-size: 13px;
      cursor: pointer;
}
.pg-localizzati .panel.side-tgt {
      border-left: 3px solid #e84747;
}
.pg-localizzati .panel.side-gps {
      border-left: 3px solid var(--red);
}
.pg-localizzati .side-tgt .row-group-label, .pg-localizzati .side-gps .row-group-label {
      border-left: 0;
}
.pg-localizzati .map-radio {
      background: rgba(16, 20, 26, .88);
      color: var(--text);
      border: 1px solid var(--line);
      border-left: 3px solid var(--amber);
      border-radius: 4px;
      padding: 6px 9px;
      font-size: 12px;
      line-height: 1.45;
}
.pg-localizzati .map-radio .ch {
      font-family: var(--mono);
      font-weight: 700;
      color: var(--amber);
}
.pg-localizzati .ll-wrap {
      position: absolute;
      left: 0;
      top: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 9px;
      font-family: var(--mono);
      font-size: 11.5px;
      font-weight: 700;
      white-space: nowrap;
      pointer-events: none;
      text-shadow: 0 0 3px #10141a, 0 0 3px #10141a, 0 0 2px #10141a;
}
.pg-localizzati .ll-wrap.cmd-me {
      color: #ffd700;
}
.pg-localizzati .ll-wrap.cmd-tgt {
      color: #e84747;
}
.pg-localizzati .ll-wrap.me-tgt {
      color: #e8a33d;
}
.pg-localizzati .u-ico { position: relative; width: 44px; height: 44px;
}
.pg-localizzati .u-hdg { position: absolute; inset: 0; display: none; transform-origin: 50% 50%;
}
.pg-localizzati .u-ico.has-hdg .u-hdg { display: block;
}
.pg-localizzati .u-dot { position: absolute; left: 13px; top: 13px;
}
`,

  html: `
  <div class="wrap">

    <section id="locate-section">
      <div class="act3-grp" id="grpCoord">
      <button class="locate-btn act3 coord" id="coordBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" stroke="white" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.6" stroke="white" stroke-width="2"/></svg>
        Inserisci coordinate
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      <button type="button" class="act3-reset hidden" id="resetCoord" title="Reset coordinate: cambia i dati" aria-label="Reset coordinate: cambia i dati">↺<small>Reset</small></button>
      </div>
      <div class="panel hidden" id="coordPanel" style="margin: 0 0 10px;">
        <div class="row-group-label target">Inserisci coordinate, OLC o link Maps</div>
        <div class="target-input-box">
          <div class="target-input-row">
            <input type="text" id="targetInput" placeholder="Coordinate, link Maps, UTM, DMS, OLC… anche dentro a un testo" autocomplete="off" autocapitalize="off" spellcheck="false">
            <button type="button" class="target-go-btn" id="targetGoBtn">Vai</button>
          </div>
          <div id="targetDetect" style="font-size:12px;opacity:.85;min-height:16px;margin:4px 2px 0"></div>
          <button type="button" id="pasteClipBtn" class="paste-clip-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" />
              <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" stroke-width="2" />
            </svg>
            Incolla coordinate dagli appunti, anche link!
          </button>
        </div>
      </div>

      <div class="act3-grp" id="grpGps">
      <button class="locate-btn act3" id="locateBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.2" stroke="white" stroke-width="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" stroke-width="2" stroke-linecap="round" />
        </svg>
        Trova la mia posizione
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      <button type="button" class="act3-reset hidden" id="resetGps" title="Reset posizione: nuova lettura GPS" aria-label="Reset posizione: nuova lettura GPS">↺<small>Reset</small></button>
      </div>
      <div class="act3-grp" id="grpCerca">
      <button class="locate-btn act3 cmd" id="toggleSearchBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Cerca un comando diverso
        <span class="chev" aria-hidden="true">▾</span>
      </button>
      <button type="button" class="act3-reset hidden" id="resetCerca" title="Reset comando: sceglierne un altro" aria-label="Reset comando: sceglierne un altro">↺<small>Reset</small></button>
      </div>
      <div class="status-msg hidden" id="statusMsg"></div>
    </section>

    <section id="search-section" class="hidden">
      <div class="search-wrap">
        <input type="text" class="search-input" id="searchInput" placeholder="Filtra per comando, comune, provincia o regione">
        <div class="search-results hidden" id="searchResults"></div>
      </div>
    </section>

    <section id="result-section" class="hidden">
      <div class="panel">
        <div class="map-wrap">
          <div id="resultMap"></div>
          <div class="route-legenda hidden" id="routeLegenda">
            <div><span style="display:inline-block;width:16px;border-top:4px solid #e84747"></span> Mezzo VF</div>
            <div><span style="display:inline-block;width:16px;border-top:3px dotted #e84747"></span> A piedi</div>
            <div><span style="font-size:12px">🥾</span> Punto di cambio</div>
            <div><span style="display:inline-block;width:14px;height:6px;background:repeating-linear-gradient(45deg,#e84747 0 3px,#fff 3px 6px)"></span> Sbarra / cancello</div>
          </div>
          <button type="button" id="mapTargetBtn" class="map-target-btn hidden" title="Centra sul target"
            aria-label="Centra sul target">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e84747" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
              <circle cx="12" cy="10" r="2.5" fill="#e84747" />
            </svg>
          </button>
          <button type="button" id="mapCenterBtn" class="map-center-btn" title="Centra sulla mia posizione"
            aria-label="Centra sulla mia posizione">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <button type="button" id="mapExpandBtn" class="map-expand-btn" title="Ingrandisci mappa"
            aria-label="Ingrandisci mappa"></button>
        </div>
        <div class="map-legend" id="mapLegend">
          <span id="legQui"><i class="rombo qui"></i>Comando qui</span>
          <span id="legInt" class="hidden"><i class="rombo int"></i>Comando INT</span>
          <span id="legSel" class="hidden"><i class="rombo sel"></i>Comando sel</span>
          <span id="legendUser" class="hidden"><i class="dot-user"></i>La tua posizione</span>
          <span id="legendTarget" class="hidden"><i class="dot-target"></i>Target</span>
        </div>
      </div>

      <!-- Pannello coordinate Target (se inserito) -->
      <div class="panel side-tgt hidden" id="targetInfoPanel">
        <details class="pan-det" id="tgtDet"><summary class="row-group-label target">Punto Target / Evento</summary>
        <div class="data-row">
          <div class="label">Coordinate Target</div>
          <div class="value copyable" id="rTargetCoords" title="Tocca per copiare">—</div>
        </div>
        <div class="data-row">
          <div class="label">Distanza mia pos. → target</div>
          <div class="value" id="rTargetDist">—</div>
        </div>
        <div class="data-row">
          <div class="label">Azimut mia pos. → target</div>
          <div class="value" id="rTargetAz">—</div>
        </div>
        <div class="data-row" id="targetAltRow">
          <div class="label">Quota <span class="src-tag calc"
              title="Stimata da modello digitale del terreno (Open-Meteo)">calcolata</span></div>
          <div class="value" id="rTargetAlt">—</div>
        </div>
        <div class="route-row">
          <button type="button" id="routeMix" class="route-btn mix">🚒 Soccorso<small>mezzo VF fin dove arriva, poi a piedi</small></button>
        </div>
        <div class="route-hint">Sulla carta: linea piena = mezzo, puntinata = a piedi, 🥾 = punto di cambio, 🚧 = sbarre</div>
        <div class="route-info hidden" id="routeInfo"></div>
        <div class="route-export hidden" id="routeExport">
          <button type="button" id="routeKml" title="Traccia e punti per Locus Map, Google Earth, OruxMaps">💾 KML (Locus Map)</button>
          <button type="button" id="routeGpx" title="Traccia e punti (partenza, cambio, sbarre, arrivo) per GPS da montagna e app outdoor">🛰️ GPX</button>
          <button type="button" id="routeAR" class="route-btn ar">📷 Guida in realtà aumentata</button>
        </div>
        <button type="button" id="openMapsTarget" class="maps-btn target">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          Naviga al target con Google Maps
        </button>
        </details>
      </div>

      <!-- Pannello coordinate GPS rilevate -->
      <div class="panel side-gps hidden" id="gpsInfoPanel">
        <details class="pan-det" id="gpsDet"><summary class="row-group-label gps">Posizione GPS rilevata</summary>
        <div class="data-row">
          <div class="label">Coordinate GPS</div>
          <div class="value copyable" id="rGpsCoords" title="Tocca per copiare">—</div>
        </div>
        <div class="data-row" id="gpsAccuracyRow">
          <div class="label">Precisione</div>
          <div class="value" id="rGpsAccuracy">—</div>
        </div>
        <div class="data-row hidden" id="gpsAltitudeRow">
          <div class="label">Quota <span class="src-tag rx" title="Misurata dal ricevitore GPS del dispositivo">ricevuta
              GPS</span></div>
          <div class="value" id="rGpsAltitude">—</div>
        </div>
        <div class="data-row">
          <div class="label">Azimut mia pos. → Comando</div>
          <div class="value" id="rCmdAz">—</div>
        </div>
        <button type="button" id="refreshGpsBtn" class="refresh-gps-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 11-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span id="refreshGpsLabel">Aggiorna posizione</span>
        </button>
        </details>
      </div>

      <div class="panel cmd-panel">
        <div class="result-top">
          <div class="result-name-wrap">
            <div class="cmd-tag" id="rCmdTag"></div>
            <div class="name" id="rComando">—</div>
          </div>
          <div class="dist" id="rDist"></div>
        </div>
        <details class="cmd-dove" id="cmdDove">
          <summary>📍 Dove si trova · Naviga</summary>
          <div class="cmd-actions">
            <button type="button" id="navToComando" class="nav-cmd-btn" title="Naviga alla sede del Comando con Google Maps">🧭 Naviga al comando VVF</button>
          </div>
          <div class="result-addr" id="rCmdAddr"></div>
        </details>
        <div class="result-sub" id="rSub"></div>
        <div class="method-badge" id="rMethod"></div>
        <div class="data-row">
          <div class="label" id="lblRadioC">Canale radio Comando</div>
          <div class="value"><span id="rRadioComando">—</span></div>
        </div>
        <div class="data-row">
          <div class="label" id="lblRadioD">Canale radio Direzione reg.</div>
          <div class="value"><span id="rRadioDirezione">—</span></div>
        </div>
        <div class="data-row">
          <div class="label" id="lblSoC">SO Comando</div>
          <div class="value" id="rTelComandoWrap">—</div>
        </div>
        <div class="data-row">
          <div class="label" id="lblSoD">SO Direzione reg.</div>
          <div class="value" id="rTelDirezioneWrap">—</div>
        </div>
        <div class="cmd-conf hidden" id="confinantiPanel">
          <div class="cmd-conf-label">Comandi confinanti</div>
          <div class="chips" id="confinantiChips"></div>
        </div>
      </div>

      <div class="border-note hidden" id="borderNote"></div>

      <button class="link-btn" id="backToSearchBtn">cerca un altro comando</button>
      <button class="link-btn" id="resetDataBtn">Reset dati</button>
    </section>

  </div>

  <div class="ar-ov hidden" id="arOv">
    <video id="arVideo" playsinline muted autoplay></video>
    <canvas id="arCv"></canvas>
    <div class="ar-top"><div id="arArrow">➤</div><div class="ar-txt"><b id="arNext">—</b><span id="arSub"></span></div></div>
    <div class="ar-msg hidden" id="arMsg"></div>
    <div class="ar-bot">
      <button type="button" id="arClose">✕ Chiudi</button>
      <button type="button" id="arMinus" aria-label="Sposta a sinistra">◀ 5°</button>
      <button type="button" id="arAlign">🎯 Allinea</button>
      <button type="button" id="arPlus" aria-label="Sposta a destra">5° ▶</button>
    </div>
  </div>
  <div class="place-modal hidden" id="placeModal">
    <div class="place-box">
      <h3>Inserire una località</h3>
      <p>Il codice OLC corto (<span id="placeCode">—</span>) ha bisogno di un punto di riferimento vicino, entro circa
        50 km. Scrivi il comune e scegli dall'elenco.</p>
      <input type="text" id="placeInput" placeholder="Comune, es. Cesena" autocomplete="off">
      <div class="place-list" id="placeList"></div>
      <div class="place-msg hidden" id="placeMsg"></div>
      <button type="button" class="place-cancel" id="placeCancel">Annulla</button>
    </div>
  </div>
  
`,

  async init(root) {
    // ---- Leaflet: serve solo qui, si carica alla prima apertura del modulo ----
    // Più fonti in ordine: se una CDN non risponde si prova la successiva.
    // Se nessuna risponde il modulo funziona senza mappa e riprova alla ricerca successiva.
    const LEAFLET = [
      {css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
       js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"},
      {css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
       js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"},
      {css: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
       js: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"}
    ];
    let leafletInCorso = null;
    let leafletErrore = "";

    function assicuraLeaflet() {
      if (typeof L !== "undefined") return Promise.resolve(true);
      if (leafletInCorso) return leafletInCorso;
      leafletInCorso = (async () => {
        for (const f of LEAFLET) {
          try {
            await Promise.all([FireOps.carica(f.css), FireOps.carica(f.js)]);
            if (typeof L !== "undefined") return true;
          } catch (e) {
            leafletErrore = e && e.message ? e.message : String(e);
            console.warn("Leaflet: fonte non disponibile", f.js, e);
          }
        }
        return false;
      })().finally(() => { leafletInCorso = null; });
      return leafletInCorso;
    }

    // Messaggio dentro il riquadro mappa quando Leaflet manca
    function mappaNonDisponibile(msg) {
      const el = document.getElementById("resultMap");
      if (!el || map) return;
      el.innerHTML = '<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'gap:10px;padding:16px;text-align:center;background:#1d242e;color:#8b96a3;font-size:13px;line-height:1.45">' +
        '<div>' + msg + '</div>' +
        '<button type="button" id="mapRetryBtn" style="padding:8px 14px;border-radius:6px;border:1px solid #2a323d;' +
        'background:#171d25;color:#eceff3;font-weight:700;cursor:pointer">Riprova mappa</button></div>';
      document.getElementById("mapRetryBtn").addEventListener("click", function () {
        el.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#8b96a3;font-size:13px">Caricamento mappa…</div>';
        assicuraLeaflet().then(function (ok) {
          if (ok && currentRecord) {el.innerHTML = ""; updateMap(currentRecord, userPos, targetPos);}
          else mappaNonDisponibile("Mappa ancora non disponibile: la libreria delle mappe non si scarica su questa rete.");
        });
      });
    }

    await assicuraLeaflet();

    // ---- Elenco comandi: condiviso dall'app (db/comandi.json, caricato una volta sola) ----
    let azioneAttiva = null;   // quale dei tre pulsanti ha prodotto il risultato: coord, gps, cerca
    let COMANDI = [];
    const comandiPronti = FireOps.comandi().then(d => { COMANDI = d; return true; }).catch(() => false);

    // Messaggio unico se l'elenco comandi non è caricabile
    function comandiNonDisponibili() {
      const statusEl = document.getElementById("statusMsg");
      statusEl.classList.remove("hidden");
      statusEl.classList.add("error");
      statusEl.textContent = "Elenco comandi non caricato: controlla la connessione e ricarica la pagina.";
    }

    function norm(s) {
      return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function fmtDist(km) {
      if (km == null || isNaN(km)) return "—";
      return km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km";
    }

    function bearingDeg(lat1, lon1, lat2, lon2) {
      const r = Math.PI / 180;
      const p1 = lat1 * r, p2 = lat2 * r, dl = (lon2 - lon1) * r;
      const y = Math.sin(dl) * Math.cos(p2);
      const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
      return (Math.atan2(y, x) / r + 360) % 360;
    }

    const ROSA = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    function fmtAz(deg) {
      const d = Math.round(deg) % 360;
      return String(d).padStart(3, "0") + "° " + ROSA[Math.round(deg / 22.5) % 16];
    }

    function updateNavInfo() {
      const tDist = document.getElementById("rTargetDist");
      const tAz = document.getElementById("rTargetAz");
      if (targetPos) {
        if (userPos) {
          tDist.textContent = fmtDist(haversine(userPos.lat, userPos.lon, targetPos.lat, targetPos.lon));
          tAz.textContent = fmtAz(bearingDeg(userPos.lat, userPos.lon, targetPos.lat, targetPos.lon));
        } else {
          tDist.textContent = "In attesa GPS…";
          tAz.textContent = "In attesa GPS…";
        }
      }
      const cAz = document.getElementById("rCmdAz");
      if (userPos && currentRecord) {
        cAz.textContent = fmtAz(bearingDeg(userPos.lat, userPos.lon, currentRecord.lat, currentRecord.lon)) +
          " · " + fmtDist(haversine(currentRecord.lat, currentRecord.lon, userPos.lat, userPos.lon));
      } else {
        cAz.textContent = "—";
      }

      // In alto a destra: Comando -> target (o -> mia posizione se non c'è target)
      const rDist = document.getElementById("rDist");
      const ref = targetPos || userPos;
      if (ref && currentRecord) {
        rDist.innerHTML = "";

        const leg = document.createElement("span");
        leg.className = "leg";
        leg.innerHTML = targetPos
          ? '<span class="c-cmd">Comando</span> → <span class="c-tgt">Target</span>'
          : '<span class="c-me">Mia pos.</span> → <span class="c-cmd">Comando</span>';

        const val = document.createElement("span");
        val.className = "val";
        val.textContent = fmtDist(haversine(currentRecord.lat, currentRecord.lon, ref.lat, ref.lon));

        // con target: Comando -> target (partenza squadra); senza: mia pos. -> Comando
        const brg = targetPos
          ? bearingDeg(currentRecord.lat, currentRecord.lon, ref.lat, ref.lon)
          : bearingDeg(ref.lat, ref.lon, currentRecord.lat, currentRecord.lon);
        const az = document.createElement("span");
        az.className = "az";
        az.textContent = "Az " + fmtAz(brg);

        rDist.append(leg, val, az);
        rDist.classList.toggle("is-target", !!targetPos);
      } else {
        rDist.textContent = "";
      }
    }

    // "Via X, , 72100, Brindisi, BR" -> {street: "Via X", loc: "72100 Brindisi (BR)"}
    function fmtAddr(ind) {
      const p = (ind || "").split(",").map(s => s.trim());
      let pr = "", city = "", cap = "";
      if (p.length && /^[A-Z]{2}$/.test(p[p.length - 1])) pr = p.pop();
      if (p.length) city = p.pop();
      if (p.length && /^\d{5}$/.test(p[p.length - 1])) cap = p.pop();
      return {
        street: p.filter(Boolean).join(", "),
        loc: [cap, city].filter(Boolean).join(" ") + (pr ? " (" + pr + ")" : "")
      };
    }

    let currentRecord = null;
    let userPos = null;
    let userAccuracy = null;
    let userAltitude = null;
    let targetPos = null;
    let watchId = null;
    let trackingTimeoutId = null;

    // Il prefisso 4146 lo gestisce l'intestazione comune (fireops-header.js)
    function telHref(num) {
      return window.FireOpsDial ? FireOpsDial.telHref(num) : "tel:" + (num || "").toString().replace(/[^0-9+]/g, "");
    }

    // i numeri SO non chiamano: finiscono nel campo in alto, da dove si sceglie 4146, senza 4146, WhatsApp o Telegram
    ["rTelComandoWrap", "rTelDirezioneWrap"].forEach(id => {
      document.getElementById(id).addEventListener("click", function (e) {
        const a = e.target.closest("a[data-num]");
        if (!a) return;
        e.preventDefault();
        if (window.FireOpsDial && FireOpsDial.imposta) FireOpsDial.imposta(a.dataset.num);
        window.scrollTo({top: 0, behavior: "smooth"});
      });
    });

    function refreshPhoneLinks() {
      return;
      if (!currentRecord) return;
      const tscA = document.querySelector("#rTelComandoWrap a.value-link");
      if (tscA && currentRecord.tsc) tscA.href = telHref(currentRecord.tsc);
      const tsdA = document.querySelector("#rTelDirezioneWrap a.value-link");
      if (tsdA && currentRecord.tsd) tsdA.href = telHref(currentRecord.tsd);
    }

    document.addEventListener("fireops:prefisso", refreshPhoneLinks);

    /* ---- Mappa Leaflet ---- */
    let map = null;
    let comandoMarker = null;
    let comandoQuiMarker = null;
    let userMarker = null;
    let targetMarker = null;
    let linkLines = [];
    let radioCtrl = null;
    let heading = null;        // gradi dal nord, null = bussola non disponibile
    let compassAsked = false;

    function userIcon() {
      const html = '<div class="u-ico">' +
        '<svg class="u-dot" width="18" height="18" viewBox="0 0 18 18">' +
        '<circle cx="9" cy="9" r="7" fill="#ffd700" stroke="#10141a" stroke-width="2.5"/></svg>' +
        '</div>';
      return L.divIcon({className: "", html: html, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -12]});
    }

    let hdgMarks = null;

    // chevron che punta verso l'alto (nord) e viene ruotato come il semiasse
    function chevronIcon(deg) {
      const d = "M3 9 L7 4 L11 9";
      return L.divIcon({
        className: "", iconSize: [14, 14], iconAnchor: [7, 7],
        html: '<svg width="14" height="14" viewBox="0 0 14 14" style="transform:rotate(' + deg + 'deg)">' +
          '<path d="' + d + '" fill="none" stroke="#10141a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="' + d + '" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>'
      });
    }

    let hdgCasing = null, hdgLine = null, hdgRaf = null;

    // Semiasse dalla mia posizione fino oltre il bordo della mappa, nella direzione del telefono
    function drawHeadingRay() {
      // la mappa deve avere già centro e zoom, altrimenti Leaflet lancia un errore
      if (!map || !map._loaded || !userPos || heading == null) {
        if (map && hdgLine) {map.removeLayer(hdgCasing); map.removeLayer(hdgLine); hdgCasing = hdgLine = null;}
        if (hdgMarks) hdgMarks.clearLayers();
        return;
      }
      const z = map.getZoom();
      const p0 = map.project([userPos.lat, userPos.lon], z);
      const size = map.getSize();
      const c = map.project(map.getCenter(), z);
      // abbastanza lungo da uscire dallo schermo anche se sono fuori vista
      const len = Math.hypot(size.x, size.y) + p0.distanceTo(c) + 50;
      const r = heading * Math.PI / 180;
      const p1 = p0.add(L.point(Math.sin(r) * len, -Math.cos(r) * len));
      const ll = [map.unproject(p0, z), map.unproject(p1, z)];

      if (!hdgLine) {
        hdgCasing = L.polyline(ll, {color: "#10141a", weight: 5, opacity: 0.6, interactive: false}).addTo(map);
        hdgLine = L.polyline(ll, {color: "#ffd700", weight: 2.5, opacity: 0.95, interactive: false}).addTo(map);
      } else {
        hdgCasing.setLatLngs(ll);
        hdgLine.setLatLngs(ll);
      }

      // chevron di verso lungo il semiasse, a partire da 60 px dal pallino
      if (!hdgMarks) hdgMarks = L.layerGroup().addTo(map);
      hdgMarks.clearLayers();
      const ux = Math.sin(r), uy = -Math.cos(r);
      for (let d = 60; d < len; d += 90) {
        const pt = map.unproject(p0.add(L.point(ux * d, uy * d)), z);
        L.marker(pt, {icon: chevronIcon(heading), interactive: false, keyboard: false}).addTo(hdgMarks);
      }
    }

    // la bussola manda decine di eventi al secondo: si ridisegna al massimo una volta per frame
    function applyHeading() {
      if (hdgRaf) return;
      hdgRaf = requestAnimationFrame(function () {hdgRaf = null; drawHeadingRay();});
    }

    function screenAngle() {
      return (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    }

    function onOrient(e) {
      let h = null;
      if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;   // iOS
      else if (e.absolute && e.alpha != null) h = 360 - e.alpha;                    // Android
      if (h == null) return;
      heading = (h + screenAngle() + 360) % 360;
      applyHeading();
    }

    // iOS chiede il permesso e va chiamato dentro un tocco dell'utente
    function startCompass() {
      if (compassAsked) return;
      compassAsked = true;
      const go = function () {
        if ("ondeviceorientationabsolute" in window) window.addEventListener("deviceorientationabsolute", onOrient);
        else window.addEventListener("deviceorientation", onOrient);
      };
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission().then(function (s) {if (s === "granted") go();}).catch(function () { });
      } else {
        go();
      }
    }
    document.addEventListener("click", startCompass, true);

    // Comandi: sempre un rombo grigio; il bordo dice a cosa si riferisce (giallo = qui, rosso = intervento, chiaro = scelto)
    const BORDO_CMD = {qui: "#ffd700", int: "#e84747", sel: "#000000"};
    function comandoIcon(tipo) {
      const col = BORDO_CMD[tipo] || BORDO_CMD.qui;
      // rombo disegnato come poligono (niente rotazione = bordi netti), con un filo nero fuori dal bordo colorato
      const pt = "13,2.5 23.5,13 13,23.5 2.5,13";
      const svg = '<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">'
        + '<polygon points="' + pt + '" fill="none" stroke="#000" stroke-width="5.5" stroke-linejoin="miter"/>'
        + '<polygon points="' + pt + '" fill="#8a94a3" stroke="' + col + '" stroke-width="3.5" stroke-linejoin="miter"/>'
        + '</svg>';
      return L.divIcon({className: "", html: svg, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -10]});
    }

    function dotIcon(color) {
      const svg = '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">'
        + '<circle cx="9" cy="9" r="7" fill="' + color + '" stroke="#10141a" stroke-width="2.5"/>'
        + '</svg>';
      return L.divIcon({className: "", html: svg, iconSize: [18, 18], iconAnchor: [9, 9]});
    }

    // Etichetta ruotata come la linea, al centro: sopra distanza, sotto azimut (da "from" verso "to")
    function lineLabel(line, from, to, cls) {
      if (!map || !map._loaded) return;
      const dist = fmtDist(haversine(from.lat, from.lon, to.lat, to.lon));
      const az = fmtAz(bearingDeg(from.lat, from.lon, to.lat, to.lon));

      // angolo a schermo: in Mercatore non dipende dallo zoom
      const a = map.project([from.lat, from.lon], 12);
      const b = map.project([to.lat, to.lon], 12);
      let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      if (ang > 90) ang -= 180;          // testo mai capovolto
      if (ang < -90) ang += 180;

      const mid = map.unproject(a.add(b).divideBy(2), 12);
      const html = '<div class="ll-wrap ' + cls + '" style="transform:translate(-50%,-50%) rotate(' + ang + 'deg)">' +
        '<span>' + dist + '</span><span>' + az + '</span></div>';

      const m = L.marker(mid, {
        icon: L.divIcon({className: "", html: html, iconSize: [0, 0]}),
        interactive: false, keyboard: false, zIndexOffset: -1000
      }).addTo(map);
      linkLines.push(m);   // così viene rimossa insieme alle linee
    }

    function updateMap(record, pos, target, fit) {
      if (fit === undefined) fit = true;
      const mapEl = document.getElementById("resultMap");
      if (!mapEl) return;
      if (typeof L === "undefined") {
        mappaNonDisponibile("Mappa non disponibile: la libreria delle mappe non si è scaricata" +
          (leafletErrore ? " (" + leafletErrore + ")" : "") + ".");
        // riprova in silenzio: se arriva, disegna la mappa
        assicuraLeaflet().then(function (ok) {
          if (ok && currentRecord === record) {mapEl.innerHTML = ""; updateMap(record, pos, target, fit);}
        });
        return;
      }

      if (!map) {
        map = L.map("resultMap", {attributionControl: true, zoomControl: true, maxZoom: 19});

        /* Sfondi: selettore condiviso di FireOps (stradale, satellite, topografica
           e uno sfondo in trasparenza sopra); la scelta vale per tutte le mappe */
        if (window.FireOpsSfondi) FireOpsSfondi.aggiungi(map, {posizione: "topleft"});
        else L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 19, attribution: "&copy; OpenStreetMap"}).addTo(map);

        radioCtrl = L.control({position: "bottomleft"});
        radioCtrl.onAdd = function () {
          const d = L.DomUtil.create("div", "map-radio");
          L.DomEvent.disableClickPropagation(d);
          return d;
        };
        radioCtrl.addTo(map);

        map.on("zoomend moveend resize", drawHeadingRay);

      }

      // Leaflet: project()/lineLabel() richiedono centro e zoom già impostati (mappa appena creata)
      if (!map._loaded) map.setView([record.lat, record.lon], 13, {animate: false});
      map.invalidateSize();   // il contenitore era nascosto: ricalcola le dimensioni

      if (comandoMarker) {map.removeLayer(comandoMarker); comandoMarker = null;}
      if (userMarker) {map.removeLayer(userMarker); userMarker = null;}
      if (targetMarker) {map.removeLayer(targetMarker); targetMarker = null;}
      linkLines.forEach(l => map.removeLayer(l));
      linkLines = [];

      radioCtrl.getContainer().innerHTML =
        "<b>" + record.c + "</b><br>📻 Comando <span class='ch'>" + (record.rc || "—") +
        "</span> · DR <span class='ch'>" + (record.rd || "—") + "</span>";

      if (comandoQuiMarker) {map.removeLayer(comandoQuiMarker); comandoQuiMarker = null;}
      const modoMappa = azioneAttiva === "coord" ? "coord" : (azioneAttiva === "cerca" ? "cerca" : "gps");
      const tipoCmd = modoMappa === "coord" ? "int" : (modoMappa === "cerca" ? "sel" : "qui");
      // tasto 1: anche il comando della mia posizione (se diverso dall'intervento); tasto 2: solo il mio comando
      const quiRec = (modoMappa === "coord" && window.FireOpsDial && FireOpsDial.comandoQui) ? FireOpsDial.comandoQui() : null;
      if (quiRec && quiRec.lat != null && quiRec.c !== record.c) {
        comandoQuiMarker = L.marker([quiRec.lat, quiRec.lon], {icon: comandoIcon("qui")})
          .addTo(map)
          .bindPopup("Comando qui: " + quiRec.c);
      }
      comandoMarker = L.marker([record.lat, record.lon], {icon: comandoIcon(tipoCmd)})
        .addTo(map)
        .bindPopup((tipoCmd === "int" ? "Comando INT: " : tipoCmd === "sel" ? "Comando sel: " : "Comando qui: ") + record.c);
      const mostraLeg = (id, on) => document.getElementById(id).classList.toggle("hidden", !on);
      mostraLeg("legQui", tipoCmd === "qui" || !!comandoQuiMarker);
      mostraLeg("legInt", tipoCmd === "int");
      mostraLeg("legSel", tipoCmd === "sel");

      const legendUser = document.getElementById("legendUser");
      const legendTarget = document.getElementById("legendTarget");

      const boundsArray = [[record.lat, record.lon]];

      if (pos) {
        userMarker = L.marker([pos.lat, pos.lon], {icon: userIcon()})
          .addTo(map)
          .bindPopup("La tua posizione GPS");
        applyHeading();
        legendUser.classList.remove("hidden");
        boundsArray.push([pos.lat, pos.lon]);

        const baseL = comandoQuiMarker ? FireOpsDial.comandoQui() : record;
        const l1 = L.polyline([[pos.lat, pos.lon], [baseL.lat, baseL.lon]], {
          color: "#ffd700", weight: 2.5, dashArray: "4,6", opacity: 0.85
        }).addTo(map);
        lineLabel(l1, pos, baseL, "cmd-me");          // mia pos. -> Comando
        linkLines.push(l1);
      } else {
        legendUser.classList.add("hidden");
      }

      if (target) {
        targetMarker = L.marker([target.lat, target.lon], {icon: dotIcon("#e84747")})
          .addTo(map)
          .bindPopup("Punto Target / Evento");
        legendTarget.classList.remove("hidden");
        boundsArray.push([target.lat, target.lon]);

        const l2 = L.polyline([[target.lat, target.lon], [record.lat, record.lon]], {
          color: "#e84747", weight: 2.5, dashArray: "6,4", opacity: 0.9
        }).addTo(map);
        lineLabel(l2, record, target, "cmd-tgt");      // Comando -> target
        linkLines.push(l2);

        if (pos) {
          const l3 = L.polyline([[pos.lat, pos.lon], [target.lat, target.lon]], {
            color: "#e8a33d", weight: 2, opacity: 0.7
          }).addTo(map);
          lineLabel(l3, pos, target, "me-tgt");        // mia pos. -> target
          linkLines.push(l3);
        }
      } else {
        legendTarget.classList.add("hidden");
      }

      document.getElementById("mapTargetBtn").classList.toggle("hidden", !target);

      drawHeadingRay();   // segue la nuova posizione (o sparisce se non c'è GPS)

      if (!fit) return;   // aggiornamento da tracking: non toccare zoom/pan dell'utente

      map.invalidateSize();
      if (boundsArray.length > 1) {
        map.fitBounds(L.latLngBounds(boundsArray), {padding: [40, 40], maxZoom: 16, animate: false});
      } else {
        map.setView([record.lat, record.lon], 13);
      }

      setTimeout(function () {map.invalidateSize();}, 60);
    }

    // Mirino: centra sulla mia posizione (senza GPS, sul Comando)
    document.getElementById("mapCenterBtn").addEventListener("click", function () {
      if (!map || !currentRecord) return;
      if (userPos) {
        map.setView([userPos.lat, userPos.lon], Math.max(map.getZoom(), 16));
      } else {
        map.setView([currentRecord.lat, currentRecord.lon], 13);
      }
    });

    // Segnaposto rosso: centra sul target
    document.getElementById("mapTargetBtn").addEventListener("click", function () {
      if (!map || !targetPos) return;
      map.setView([targetPos.lat, targetPos.lon], Math.max(map.getZoom(), 16));
    });

    const EXPAND_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V3h6M3 3l6 6M21 9V3h-6M21 3l-6 6M3 15v6h6M3 21l6-6M21 15v6h-6M21 21l-6-6"/></svg>';
    const COLLAPSE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6H3M9 9L3 3M15 3v6h6M15 9l6-6M9 21v-6H3M9 15l-6 6M15 21v-6h6M15 15l6 6"/></svg>';
    let isMapFullscreen = false;

    function setMapFullscreen(on) {
      isMapFullscreen = on;
      const wrapEl = document.querySelector(".map-wrap");
      const btn = document.getElementById("mapExpandBtn");
      wrapEl.classList.toggle("map-fullscreen", on);
      btn.classList.toggle("fullscreen", on);
      document.body.classList.toggle("map-open", on);
      btn.innerHTML = on ? COLLAPSE_ICON : EXPAND_ICON;
      btn.title = on ? "Chiudi mappa a schermo intero" : "Ingrandisci mappa";
      btn.setAttribute("aria-label", btn.title);
      if (on) {
        applyFullscreenMapHeight();
      } else {
        wrapEl.style.height = "";
      }
      setTimeout(function () {if (map) map.invalidateSize();}, 200);
    }

    function applyFullscreenMapHeight() {
      if (!isMapFullscreen) return;
      const wrapEl = document.querySelector(".map-wrap");
      const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
      wrapEl.style.height = h + "px";
      if (map) map.invalidateSize();
    }

    window.addEventListener("resize", applyFullscreenMapHeight);
    window.addEventListener("orientationchange", applyFullscreenMapHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", applyFullscreenMapHeight);
    }

    document.getElementById("mapExpandBtn").innerHTML = EXPAND_ICON;
    document.getElementById("mapExpandBtn").addEventListener("click", function () {
      setMapFullscreen(!isMapFullscreen);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isMapFullscreen) setMapFullscreen(false);
    });

    async function reverseGeocodeProvincia(lat, lon) {
      await comandiPronti;
      try {
        const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lon + "&addressdetails=1&accept-language=it&zoom=8";
        const ctrl = new AbortController();
        const tmo = setTimeout(() => ctrl.abort(), 7000);
        const resp = await fetch(url, {headers: {"Accept": "application/json"}, signal: ctrl.signal});
        clearTimeout(tmo);
        if (!resp.ok) throw new Error("http " + resp.status);
        const data = await resp.json();
        const addr = data.address || {};

        let provCode = null;
        if (addr["ISO3166-2-lvl6"]) {
          provCode = addr["ISO3166-2-lvl6"].split("-").pop().toUpperCase();
        }
        let rec = provCode ? COMANDI.find(r => r.pr === provCode) : null;

        if (!rec && addr.county) {
          const countyName = norm(addr.county.replace(/^(provincia di|libera consortile di|libero consorzio( comunale)? di|citt[aà] metropolitana di)\s*/i, ""));
          rec = COMANDI.find(r => norm(r.cm) === countyName || norm(r.c) === countyName);
        }
        return rec || null;
      } catch (e) {
        return null;
      }
    }

    // Comando con sede più vicina (quando la provincia non è determinabile via rete)
    function comandoPiuVicino(p) {
      if (!COMANDI.length) return null;
      const withDist = COMANDI.map(r => ({rec: r, dist: haversine(p.lat, p.lon, r.lat, r.lon)}))
        .sort((a, b) => a.dist - b.dist);
      return withDist;
    }

    function olcDecode(code) {
      const A = "23456789CFGHJMPQRVWX";
      code = code.toUpperCase().replace("+", "");
      const pairVals = [20, 1, 0.05, 0.0025, 0.000125];
      const pairLen = Math.min(code.length, 10);
      if (pairLen < 2 || pairLen % 2 !== 0) return null;
      let lat = -90, lon = -180, latRes = 0, lonRes = 0;
      for (let i = 0; i < pairLen; i += 2) {
        const a = A.indexOf(code[i]), b = A.indexOf(code[i + 1]);
        if (a < 0 || b < 0) return null;
        const r = pairVals[i / 2];
        lat += a * r; lon += b * r;
        latRes = r; lonRes = r;
      }
      for (let i = 10; i < code.length; i++) {
        const idx = A.indexOf(code[i]);
        if (idx < 0) return null;
        latRes /= 5; lonRes /= 4;
        lat += Math.floor(idx / 4) * latRes;
        lon += (idx % 4) * lonRes;
      }
      return {lat: lat + latRes / 2, lon: lon + lonRes / 2};
    }

    /* --- Motore di Parsing Avanzato (OLC, UTM, DMS, DMM, Decimali, Link Maps) con pulizia caratteri --- */
    function inItaly(p) {return p && p.lat >= 35 && p.lat <= 48 && p.lon >= 6 && p.lon <= 19;}

    function parseCoordinatesInput(text) {
      if (!text) return null;
      text = text.trim();

      // 1. Controllo Open Location Code (Plus Codes) base (es. 8FVG+XX o 8FVGXX+XX)
      const olcRegex = /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{0,7}$/i;
      if (olcRegex.test(text)) return olcDecode(text);

      // 2. Link Google Maps o stringhe con @lat,lon oppure q=lat,lon oppure ll=lat,lon
      let match = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) return {lat: parseFloat(match[1]), lon: parseFloat(match[2])};
      match = text.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) return {lat: parseFloat(match[1]), lon: parseFloat(match[2])};
      match = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (match) return {lat: parseFloat(match[1]), lon: parseFloat(match[2])};

      // 3. UTM (formato es: 32T 500000 5000000 oppure 32N 500000 5000000)
      const utmRegex = /^(\d{1,2})\s*([C-X])\s*([0-9.,]+)\s*([0-9.,]+)$/i;
      let utmMatch = text.match(utmRegex);
      if (utmMatch) {
        let zone = parseInt(utmMatch[1]);
        let hem = utmMatch[2].toUpperCase();
        let easting = parseFloat(utmMatch[3].replace(/\./g, '').replace(',', '.'));
        let northing = parseFloat(utmMatch[4].replace(/\./g, '').replace(',', '.'));
        let isNorth = (hem >= 'N');
        let latLon = utmToLatLon(easting, northing, zone, isNorth);
        if (latLon) return latLon;
      }
      if (!text.includes(".") && /^\s*-?\d+,\d+\s*[;\s]\s*-?\d+,\d+\s*$/.test(text)) {
        text = text.replace(/,/g, ".").replace(/\s*[;\s]\s*/, " ");
      }

      // virgola decimale nei secondi/minuti (es. 37,7") quando ci sono i simboli ° ' "
      if (/[°º'’′"”″]/.test(text)) text = text.replace(/(\d),(\d)/g, "$1.$2");

      // 4. Rimozione caratteri speciali superflui per coordinate decimali o sessagesimali grezze (, ° ' " N S E W)
      let cleaned = text.toUpperCase()
        .replace(/[°º]/g, ' ')
        .replace(/['’′]/g, ' ')
        .replace(/["”″]/g, ' ')
        .replace(/[,]/g, ' ');

      // Estrazione di tutti i numeri presenti nella stringa pulita
      let nums = cleaned.match(/-?\d+(?:\.\d+)?/g);
      if (!nums || nums.length < 2) return null;

      let fNums = nums.map(Number);

      if (![2, 4, 6].includes(fNums.length)) return null;

      // Controllo orientamento cardinale esplicito (N/S ed E/W)
      let hasSouth = /\d\s*S\b|\bS\s*\d/.test(cleaned);
      let hasWest = /\d\s*W\b|\bW\s*\d/.test(cleaned);

      // A. Controllo DMS (Gradi, Minuti, Secondi) -> es. 44 28 30 N 11 21 00 E (6 numeri totali)
      if (fNums.length === 6) {
        let lat = fNums[0] + fNums[1] / 60 + fNums[2] / 3600;
        let lon = fNums[3] + fNums[4] / 60 + fNums[5] / 3600;
        if (hasSouth) lat = -lat;
        if (hasWest) lon = -lon;
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return {lat: lat, lon: lon};
        }
      }

      // B. Controllo DMM (Gradi, Minuti decimali) -> es. 44 28.5 N 11 21.2 E (4 numeri totali)
      if (fNums.length === 4) {
        let lat = fNums[0] + fNums[1] / 60;
        let lon = fNums[2] + fNums[3] / 60;
        if (hasSouth) lat = -lat;
        if (hasWest) lon = -lon;
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return {lat: lat, lon: lon};
        }
      }

      // C. Coordinate Decimali standard (2 numeri)
      if (fNums.length === 2) {
        let lat = fNums[0];
        let lon = fNums[1];
        if (hasSouth) lat = -Math.abs(lat);
        if (hasWest) lon = -Math.abs(lon);
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return {lat: lat, lon: lon};
        }
      }

      return null;
    }

    // Funzione di conversione UTM -> Lat/Lon approssimata WGS84 per uso operativo
    function utmToLatLon(easting, northing, zone, isNorth) {
      try {
        let k0 = 0.9996;
        let a = 6378137.0;
        let eccSquared = 0.00669438;
        let e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

        let x = easting - 500000.0;
        let y = northing;
        if (!isNorth) y -= 10000000.0;

        let longOrigin = (zone - 1) * 6 - 180 + 3.0;
        let m = y / k0;
        let mu = m / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256));

        let phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
          + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
          + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

        let N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1) * Math.sin(phi1));
        let T1 = Math.tan(phi1) * Math.tan(phi1);
        let C1 = eccSquared / (1 - eccSquared) * Math.cos(phi1) * Math.cos(phi1);
        let R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1) * Math.sin(phi1), 1.5);
        let D = x / (N1 * k0);

        let lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccSquared) * D * D * D * D / 24
          + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccSquared - 3 * C1 * C1) * D * D * D * D * D * D / 720);
        lat = lat * 180 / Math.PI;

        let lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccSquared + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1);
        lon = longOrigin + lon * 180 / Math.PI;

        return {lat: lat, lon: lon};
      } catch (e) {
        return null;
      }
    }

    const PHONE_SVG = ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 3h4l2 5-2.5 1.5a11 11 0 005 5L16 12l5 2v4a2 2 0 01-2 2C10.6 20 4 13.4 4 5a2 2 0 012-2z" stroke="currentColor" stroke-width="1.6"/></svg>';

    // Tasto 1 (coordinate): target + posizione + comando; tasto 2 (GPS): posizione + comando; tasto 3 (cerca): solo comando
    function pannelliPerModo() {
      const m = azioneAttiva === "coord" ? "coord" : (azioneAttiva === "cerca" ? "cerca" : "gps");
      document.getElementById("targetInfoPanel").classList.toggle("hidden", !(m === "coord" && targetPos));
      document.getElementById("gpsInfoPanel").classList.toggle("hidden", m === "cerca" || !userPos);
    }

    function showResult(record, distanceKm, nearbyList, method) {
      currentRecord = record;
      if (!azioneAttiva) azioneAttiva = "gps";
      document.getElementById("locate-section").classList.remove("hidden");
      document.getElementById("search-section").classList.add("hidden");
      document.getElementById("coordPanel").classList.add("hidden");
      document.getElementById("result-section").classList.remove("hidden");
      if (window.__aggiornaPulsantiLocalizzati) window.__aggiornaPulsantiLocalizzati();
      document.getElementById("cmdDove").open = false;
      document.getElementById("navToComando").textContent = record.eDirezione ? "🧭 Naviga alla direzione regionale" : "🧭 Naviga al comando VVF";

      const targetPanel = document.getElementById("targetInfoPanel");
      const gpsPanel = document.getElementById("gpsInfoPanel");
      const gpsAccuracyRow = document.getElementById("gpsAccuracyRow");
      const gpsAltitudeRow = document.getElementById("gpsAltitudeRow");

      if (targetPos) {
        targetPanel.classList.remove("hidden");
        document.getElementById("rTargetCoords").textContent = targetPos.lat.toFixed(6) + "°, " + targetPos.lon.toFixed(6) + "°";
      } else {
        targetPanel.classList.add("hidden");
      }

      if (userPos) {
        gpsPanel.classList.remove("hidden");
        document.getElementById("rGpsCoords").textContent = userPos.lat.toFixed(6) + "°, " + userPos.lon.toFixed(6) + "°";
        document.getElementById("rGpsAccuracy").textContent = (userAccuracy != null) ? Math.round(userAccuracy) + " metri" : "Non disponibile";
        gpsAccuracyRow.classList.remove("hidden");
        if (userAltitude != null) {
          document.getElementById("rGpsAltitude").textContent = Math.round(userAltitude) + " m s.l.m.";
          gpsAltitudeRow.classList.remove("hidden");
        } else {
          gpsAltitudeRow.classList.add("hidden");
        }
      } else {
        gpsPanel.classList.add("hidden");
      }
      document.getElementById("rComando").textContent = record.c;
      // distingue il comando dell'intervento (target scelto) da quello della propria posizione (in alto)
      const modo = azioneAttiva === "coord" ? "coord" : (azioneAttiva === "cerca" ? "cerca" : "gps");
      pannelliPerModo();
      const tag = document.getElementById("rCmdTag");
      tag.textContent = modo === "coord" ? "Comando INT" : (modo === "gps" ? "Comando qui" : "Comando sel");
      const pannello = document.querySelector(".pg-localizzati .cmd-panel");
      pannello.classList.remove("modo-coord", "modo-gps", "modo-cerca");
      pannello.classList.add("modo-" + modo);
      document.getElementById("lblRadioC").textContent = "Radio Comando";
      document.getElementById("lblRadioD").textContent = "Radio Direzione";
      document.getElementById("lblSoC").textContent = "SO Comando";
      document.getElementById("lblSoD").textContent = "SO Direzione";
      document.getElementById("rDist").textContent = (distanceKm != null) ? fmtDist(distanceKm) : "";
      document.getElementById("rSub").textContent = record.rg + " · Direzione regionale " + record.dz;

      document.getElementById("rRadioComando").textContent = record.rc || "—";
      document.getElementById("rRadioDirezione").textContent = record.rd || "—";

      const tsc = document.getElementById("rTelComandoWrap");
      tsc.innerHTML = record.tsc
        ? '<a class="value-link" href="javascript:void(0)" data-num="' + record.tsc + '" title="Scrive il numero nel campo in alto">' + record.tsc + PHONE_SVG + '</a>'
        : "—";
      const tsd = document.getElementById("rTelDirezioneWrap");
      tsd.innerHTML = record.tsd
        ? '<a class="value-link" href="javascript:void(0)" data-num="' + record.tsd + '" title="Scrive il numero nel campo in alto">' + record.tsd + PHONE_SVG + '</a>'
        : "—";

      const a = fmtAddr(record.ind);
      const addrEl = document.getElementById("rCmdAddr");
      addrEl.innerHTML = "";
      if (a.street) addrEl.appendChild(document.createTextNode(a.street));
      if (a.loc) {
        const s = document.createElement("span");
        s.className = "loc";
        s.textContent = a.loc;
        addrEl.appendChild(s);
      }
      addrEl.classList.toggle("hidden", !a.street && !a.loc);

      const methodEl = document.getElementById("rMethod");
      const borderNote = document.getElementById("borderNote");
      if (method === "geo") {
        methodEl.className = "method-badge geo";
        methodEl.textContent = targetPos ? "Competenza determinata dal punto target inserito" : "Determinato dalla provincia di competenza";
        borderNote.classList.add("hidden");
      } else if (method === "dist") {
        methodEl.className = "method-badge dist";
        methodEl.textContent = "Stima per vicinanza — provincia non determinabile via rete";
        borderNote.classList.remove("hidden");
        borderNote.innerHTML = "Non è stato possibile determinare la provincia via rete: mostrato il comando con sede più vicina. Verifica la competenza effettiva, specie vicino a un confine provinciale.";
      } else {
        methodEl.className = "method-badge manual";
        methodEl.textContent = "";
        borderNote.classList.add("hidden");
      }

      methodEl.classList.toggle("tgt", !!targetPos);

      const confPanel = document.getElementById("confinantiPanel");
      const chips = document.getElementById("confinantiChips");
      chips.innerHTML = "";
      if (record.conf && record.conf.length) {
        confPanel.classList.remove("hidden");
        record.conf.forEach(name => {
          const rec = COMANDI.find(x => x.c === name);
          if (!rec) return;
          const chip = document.createElement("div");
          chip.className = "chip";
          chip.textContent = name;
          chip.onclick = () => selectComando(rec, userPos, targetPos);
          chips.appendChild(chip);
        });
      } else {
        confPanel.classList.add("hidden");
      }

      updateNavInfo();
      updateMap(record, userPos, targetPos);
      window.scrollTo({top: 0, behavior: "smooth"});
    }

    function selectComando(record, pos, target) {
      let refPt = target || pos;
      let dist = null;
      if (refPt) {
        dist = haversine(refPt.lat, refPt.lon, record.lat, record.lon);
      }
      showResult(record, dist, null, "manual");
    }

    function startGpsTracking() {
      if (!navigator.geolocation) return;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (trackingTimeoutId !== null) clearTimeout(trackingTimeoutId);

      let bestAccuracy = userAccuracy !== null ? userAccuracy : Infinity;

      watchId = navigator.geolocation.watchPosition(function (pos) {
        const newAcc = pos.coords.accuracy;
        const newAlt = pos.coords.altitude;

        if (newAcc <= bestAccuracy || newAcc <= 50) {
          bestAccuracy = Math.max(newAcc, 20);
          userPos = {lat: pos.coords.latitude, lon: pos.coords.longitude};
          userAccuracy = newAcc;
          if (newAlt !== null) userAltitude = newAlt;

          const rs = document.getElementById("result-section");
          if (!rs.classList.contains("hidden")) {
            pannelliPerModo();
            document.getElementById("rGpsCoords").textContent = userPos.lat.toFixed(6) + "°, " + userPos.lon.toFixed(6) + "°";
            document.getElementById("rGpsAccuracy").textContent = Math.round(userAccuracy) + " metri";
            if (userAltitude !== null) {
              document.getElementById("rGpsAltitude").textContent = Math.round(userAltitude) + " m s.l.m.";
              document.getElementById("gpsAltitudeRow").classList.remove("hidden");
            }
            if (currentRecord) {
              if (!targetPos) {
                document.getElementById("rDist").textContent =
                  fmtDist(haversine(userPos.lat, userPos.lon, currentRecord.lat, currentRecord.lon));
              }
              if (map) updateMap(currentRecord, userPos, targetPos, false);
              updateNavInfo();
            }
          }
        }
      }, function (err) { }, {enableHighAccuracy: true, timeout: 5000, maximumAge: 0});

    }

    /* il tracciamento resta attivo mentre ci si sposta; si ferma uscendo dal modulo */
    function stopGpsTracking() {
      if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} watchId = null; }
    }

    async function refreshPosition() {
      const btn = document.getElementById("refreshGpsBtn");
      const label = document.getElementById("refreshGpsLabel");
      if (!navigator.geolocation) {
        label.textContent = "GPS non supportato";
        return;
      }
      btn.disabled = true;
      btn.classList.add("spin");
      label.textContent = "Aggiornamento…";

      const done = function (msg) {
        btn.disabled = false;
        btn.classList.remove("spin");
        label.textContent = msg || "Aggiorna posizione";
        if (msg) setTimeout(function () {label.textContent = "Aggiorna posizione";}, 3000);
      };

      navigator.geolocation.getCurrentPosition(async function (pos) {
        userPos = {lat: pos.coords.latitude, lon: pos.coords.longitude};
        userAccuracy = pos.coords.accuracy;
        userAltitude = pos.coords.altitude;   // sostituisce anche la quota (può tornare null)

        startGpsTracking();                   // riparte il tracking di 1 min dalla nuova precisione

        document.getElementById("rGpsCoords").textContent = userPos.lat.toFixed(6) + "°, " + userPos.lon.toFixed(6) + "°";
        document.getElementById("rGpsAccuracy").textContent = Math.round(userAccuracy) + " metri";
        const altRow = document.getElementById("gpsAltitudeRow");
        if (userAltitude != null) {
          document.getElementById("rGpsAltitude").textContent = Math.round(userAltitude) + " m s.l.m.";
          altRow.classList.remove("hidden");
        } else {
          altRow.classList.add("hidden");
        }

        // Con un target inserito la competenza dipende dal target: non si cambia.
        if (!targetPos) {
          const geoRec = await reverseGeocodeProvincia(userPos.lat, userPos.lon);
          const borderNote = document.getElementById("borderNote");
          if (geoRec) {
            if (!currentRecord || geoRec.c !== currentRecord.c) {
              const prev = currentRecord ? currentRecord.c : null;
              showResult(geoRec, haversine(userPos.lat, userPos.lon, geoRec.lat, geoRec.lon), null, "geo");
              if (prev) {
                borderNote.classList.remove("hidden");
                borderNote.innerHTML = "<strong>Comando aggiornato:</strong> da " + prev + " a " + geoRec.c + " (cambio di provincia).";
              }
            } else {
              document.getElementById("rDist").textContent =
                fmtDist(haversine(userPos.lat, userPos.lon, currentRecord.lat, currentRecord.lon));
              updateMap(currentRecord, userPos, targetPos);
              updateNavInfo();
            }
          } else if (currentRecord) {
            // Provincia non determinabile: si tiene il comando attuale ma si avvisa
            document.getElementById("rDist").textContent =
              fmtDist(haversine(userPos.lat, userPos.lon, currentRecord.lat, currentRecord.lon));
            updateMap(currentRecord, userPos, targetPos);
            updateNavInfo();
            borderNote.classList.remove("hidden");
            borderNote.innerHTML = "Posizione aggiornata, ma non è stato possibile verificare la provincia via rete: il comando mostrato potrebbe non essere più quello competente.";
          }
        } else if (currentRecord) {
          updateMap(currentRecord, userPos, targetPos);
          updateNavInfo();
        }
        done();
      }, function (err) {
        done(err.code === 1 ? "Permesso negato" : "Posizione non disponibile");
      }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 0});
    }

    document.getElementById("refreshGpsBtn").addEventListener("click", refreshPosition);

    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      // Fallback per browser senza Clipboard API
      return new Promise(function (resolve, reject) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy") ? resolve() : reject();
        } catch (e) {reject(e);}
        document.body.removeChild(ta);
      });
    }

    function bindCopyCoords(id, getPos) {
      const el = document.getElementById(id);
      let tmo = null;
      el.addEventListener("click", function () {
        const p = getPos();
        if (!p) return;
        const text = p.lat.toFixed(6) + ", " + p.lon.toFixed(6);
        copyText(text).then(function () {
          el.classList.add("copied");
          clearTimeout(tmo);
          tmo = setTimeout(function () {el.classList.remove("copied");}, 1500);
        }).catch(function () {
          window.prompt("Copia le coordinate:", text);
        });
      });
    }

    bindCopyCoords("rTargetCoords", function () {return targetPos;});
    bindCopyCoords("rGpsCoords", function () {return userPos;});

    document.getElementById("openMapsTarget").addEventListener("click", function () {
      if (!targetPos) return;
      const url = "https://www.google.com/maps/dir/?api=1&destination=" +
        targetPos.lat.toFixed(6) + "," + targetPos.lon.toFixed(6) +
        "&travelmode=driving&dir_action=navigate";
      window.open(url, "_blank", "noopener");
    });

    let routeLayer = null;

    let ultimoPercorso = null;   // per l'esportazione KML

    function clearRoute() {
      if (routeLayer && map) map.removeLayer(routeLayer);
      routeLayer = null;
      ultimoPercorso = null;
      document.getElementById("routeExport").classList.add("hidden");
      document.getElementById("routeLegenda").classList.add("hidden");
      document.querySelectorAll(".pg-localizzati .route-btn").forEach(b => b.classList.remove("attivo"));
      const info = document.getElementById("routeInfo");
      info.classList.add("hidden");
      info.classList.remove("error");
      info.textContent = "";
    }

    function fmtDuration(sec) {
      const m = Math.round(sec / 60);
      if (m < 60) return m + " min";
      return Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") + " min";
    }

    /* ================= PERCORSI: soccorso / solo mezzo / solo piedi =================
     * Stesso motore del Convertitore coordinate:
     *  - mezzo: profilo BRouter "soccorso" (ignora i divieti di accesso, passa sbarre e cancelli con una
     *    penalità, percorre le piste forestali), caricato sul server al primo uso; BRouter aggancia l'arrivo
     *    all'ultimo punto raggiungibile dal mezzo = punto di cambio;
     *  - da lì a piedi (hiking-mountain) fino al target;
     *  - tempi: a piedi DIN 33466, in auto dalle velocità medie per tipo di strada.
     */
    const PROFILO_PIEDI_BROUTER = "hiking-mountain";
    const PROFILO_AUTO_RISERVA = "car-fast";
    const SOGLIA_TRATTO_PIEDI_M = 30;      // sotto: il mezzo arriva sul target
    const TEMPO_SBARRA_MIN = 1;            // apertura di una sbarra/cancello
    const CHIAVE_PROFILO_SOCCORSO = "fireops_brouter_profilo_soccorso";
    const COLORE_PERCORSO = "#e84747";

    const PROFILO_SOCCORSO_BROUTER = `
# FireOps VVF - profilo "soccorso" per mezzi VF.
# Come un'auto, ma ignora i divieti di accesso, passa sbarre e
# cancelli con una piccola penalita' e percorre le piste forestali.
# Restano escluse le vie che un mezzo fisicamente non percorre.

---context:global
assign validForCars        = true
assign processUnusedTags   = true
assign turnInstructionMode = 1

---context:way
assign isoneway   = or oneway=yes junction=roundabout
assign contromano = and isoneway reversedirection=yes

assign costobase =
       switch highway=motorway|trunk                 1
       switch highway=motorway_link|trunk_link       1.3
       switch highway=primary|primary_link           1.2
       switch highway=secondary|secondary_link       1.3
       switch highway=tertiary|tertiary_link         1.4
       switch highway=unclassified|road              1.6
       switch highway=residential|living_street      1.8
       switch highway=service                        2.2
       switch highway=pedestrian                     4
       switch highway=track
              switch tracktype=grade1 2.5
              switch tracktype=grade2 3.5
              switch tracktype=grade3 5
              switch tracktype=grade4 8
              switch tracktype=grade5 12
              4
       10000

assign costfactor  = switch contromano 10000 costobase
assign turncost    = 90
assign initialcost = 0

---context:node
assign initialcost =
       switch barrier=bollard|block|stile|cycle_barrier|kissing_gate|turnstile 1000000
       switch barrier=gate|lift_gate|swing_gate|chain 300
       0
`;

    async function idProfiloSoccorso(rinnova) {
      if (!rinnova) {
        try {
          const salvato = sessionStorage.getItem(CHIAVE_PROFILO_SOCCORSO);
          if (salvato) return salvato;
        } catch (err) { }
      }
      const r = await fetch("https://brouter.de/brouter/profile", {method: "POST", body: PROFILO_SOCCORSO_BROUTER});
      if (!r.ok) throw new Error("Caricamento profilo: HTTP " + r.status);
      const dati = await r.json();
      if (!dati.profileid) throw new Error("Profilo rifiutato: " + (dati.error || "motivo non indicato"));
      try {sessionStorage.setItem(CHIAVE_PROFILO_SOCCORSO, dati.profileid);} catch (err) { }
      return dati.profileid;
    }

    async function richiestaBRouter(lonlats, profilo) {
      const ctrl = new AbortController();
      const tmo = setTimeout(() => ctrl.abort(), 25000);
      try {
        const r = await fetch("https://brouter.de/brouter?lonlats=" + lonlats + "&profile=" + encodeURIComponent(profilo) +
          "&alternativeidx=0&format=geojson", {signal: ctrl.signal});
        const testo = await r.text();
        if (!r.ok) throw new Error(testo.trim().slice(0, 120) || ("http " + r.status));
        return JSON.parse(testo);
      } finally {clearTimeout(tmo);}
    }

    // prima il profilo soccorso (un secondo tentativo a profilo ricaricato), poi l'auto civile di riserva
    async function percorsoAutoSoccorso(lonlats) {
      for (const rinnova of [false, true]) {
        try {
          const id = await idProfiloSoccorso(rinnova);
          return {geojson: await richiestaBRouter(lonlats, id), profiloSoccorso: true};
        } catch (err) {
          console.warn("Profilo soccorso non utilizzabile:", err.message);
        }
      }
      return {geojson: await richiestaBRouter(lonlats, PROFILO_AUTO_RISERVA), profiloSoccorso: false};
    }

    function coordsGeojson(g) {
      const f = g && g.features && g.features[0];
      return (f && f.geometry && f.geometry.coordinates) || [];
    }
    function propGeojson(g) {return (g && g.features && g.features[0] && g.features[0].properties) || {};}

    // sbarre e cancelli attraversati, dalla tabella "messages" (coordinate in milionesimi di grado)
    function sbarreDalPercorso(prop) {
      const m = prop && prop.messages;
      if (!Array.isArray(m) || m.length < 2) return [];
      const t = m[0], iLon = t.indexOf("Longitude"), iLat = t.indexOf("Latitude"), iNodo = t.indexOf("NodeTags");
      if (iLon < 0 || iLat < 0 || iNodo < 0) return [];
      return m.slice(1).filter(r => /barrier=/.test(String(r[iNodo] || ""))).map(r => ({
        lon: parseFloat(r[iLon]) / 1e6, lat: parseFloat(r[iLat]) / 1e6,
        tag: (String(r[iNodo]).match(/barrier=\S+/) || [""])[0]
      }));
    }

    // dislivelli con isteresi: le quote SRTM oscillano di qualche metro anche in piano
    function dislivelliFiltrati(quote, soglia) {
      soglia = soglia || 5;
      let salita = 0, discesa = 0, rif = null;
      quote.forEach(q => {
        if (typeof q !== "number" || isNaN(q)) return;
        if (rif === null) {rif = q; return;}
        const d = q - rif;
        if (d >= soglia) {salita += d; rif = q;} else if (d <= -soglia) {discesa -= d; rif = q;}
      });
      return {salita: salita, discesa: discesa};
    }

    // DIN 33466: 4 km/h in piano, 300 m/h in salita, 500 m/h in discesa; max(orizz., vert.) + metà del minore
    function tempoPiediMin(km, salitaM, discesaM) {
      if (!(km > 0)) return null;
      const hO = km / 4, hV = (salitaM || 0) / 300 + (discesaM || 0) / 500;
      return Math.round((Math.max(hO, hV) + Math.min(hO, hV) / 2) * 60);
    }

    // velocità MEDIE per tipo di strada (incroci e curve compresi)
    const VEL_STRADA = {
      motorway: 100, motorway_link: 60, trunk: 80, trunk_link: 50, primary: 60, primary_link: 40,
      secondary: 50, secondary_link: 35, tertiary: 40, tertiary_link: 30, unclassified: 35, road: 30,
      residential: 25, living_street: 10, service: 15, track: 15
    };
    const VEL_STERRATO = {grade1: 25, grade2: 20, grade3: 15, grade4: 10, grade5: 8};
    function velocitaTratto(tagTesto) {
      const tag = {};
      tagTesto.split(/\s+/).forEach(c => {const i = c.indexOf("="); if (i > 0) tag[c.slice(0, i)] = c.slice(i + 1);});
      let v = VEL_STRADA[tag.highway] || 30;
      if (tag.highway === "track" && VEL_STERRATO[tag.tracktype]) v = VEL_STERRATO[tag.tracktype];
      const lim = parseFloat(tag.maxspeed);
      if (!isNaN(lim) && lim > 0) v = Math.min(v, lim * 0.85);
      return Math.max(v, 5);
    }
    function tempoAutoMin(prop) {
      const m = prop && prop.messages;
      if (!Array.isArray(m) || m.length < 2) return null;
      const iDist = m[0].indexOf("Distance"), iTag = m[0].indexOf("WayTags");
      if (iDist < 0 || iTag < 0) return null;
      let sec = 0;
      m.slice(1).forEach(r => {
        const metri = parseFloat(r[iDist]);
        if (metri > 0) sec += metri / (velocitaTratto(String(r[iTag] || "")) / 3.6);
      });
      return sec > 0 ? Math.round(sec / 60) : null;
    }
    function testoDurata(min) {
      return min >= 60 ? Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0") + " min" : min + " min";
    }

    const TITOLI_PERCORSO = {soccorso: "🚒 Percorso di soccorso", auto: "🚒 Solo mezzo", piedi: "🥾 Solo piedi"};
    const BOTTONE_PERCORSO = {soccorso: "routeMix", auto: "routeCar", piedi: "routeFoot"};

    // punto di cambio: lo scarponcino, come nella carta di FireOps
    function iconaPuntoCambio() {
      return L.divIcon({className: "", iconSize: [26, 26], iconAnchor: [13, 13],
        html: '<div style="width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid ' + COLORE_PERCORSO +
          ';display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 6px rgba(0,0,0,.6)">🥾</div>'});
    }

    async function calcolaPercorso(modalita) {
      const info = document.getElementById("routeInfo");
      document.getElementById("tgtDet").open = true;
      const btns = [document.getElementById("routeMix")];
      info.classList.remove("hidden", "error");
      if (!targetPos) return;
      if (!userPos) {
        info.classList.add("error");
        info.textContent = "Posizione GPS non ancora ricevuta: attendi la lettura o usa \"Aggiorna posizione\".";
        return;
      }
      btns.forEach(b => {b.disabled = true; b.classList.toggle("attivo", b.id === BOTTONE_PERCORSO[modalita]);});
      document.getElementById("routeExport").classList.add("hidden");
      ultimoPercorso = null;
      info.textContent = "Calcolo del percorso…";
      try {
        const latP = userPos.lat, lonP = userPos.lon, latT = targetPos.lat, lonT = targetPos.lon;
        const conMezzo = modalita !== "piedi", conPiedi = modalita !== "auto";

        // 1 - col mezzo, dalla posizione verso il target
        let auto = null;
        if (conMezzo) {
          try {auto = await percorsoAutoSoccorso(lonP + "," + latP + "|" + lonT + "," + latT);}
          catch (err) {console.warn("Tratto col mezzo non calcolabile:", err);}
        }
        const coordAuto = auto ? coordsGeojson(auto.geojson) : [];
        const propAuto = auto ? propGeojson(auto.geojson) : {};
        const fineAuto = coordAuto.length
          ? {lat: coordAuto[coordAuto.length - 1][1], lon: coordAuto[coordAuto.length - 1][0]}
          : {lat: latP, lon: lonP};
        const restanteM = haversine(fineAuto.lat, fineAuto.lon, latT, lonT) * 1000;

        // 2 - a piedi: dal punto di cambio (o dalla posizione, in "solo piedi")
        let coordPiedi = [], propPiedi = {};
        if (conPiedi && restanteM > SOGLIA_TRATTO_PIEDI_M) {
          try {
            const g = await richiestaBRouter(fineAuto.lon + "," + fineAuto.lat + "|" + lonT + "," + latT, PROFILO_PIEDI_BROUTER);
            coordPiedi = coordsGeojson(g);
            propPiedi = propGeojson(g);
          } catch (err) {console.warn("Tratto a piedi non calcolabile:", err);}
        }

        if (!coordAuto.length && !coordPiedi.length) {
          throw new Error("BRouter non raggiungibile o punti fuori dalla rete viaria");
        }

        const haCambio = coordAuto.length > 0 && coordPiedi.length > 0;
        const fermoPrima = modalita === "auto" && coordAuto.length > 0 && restanteM > SOGLIA_TRATTO_PIEDI_M;
        const sbarre = (auto && auto.profiloSoccorso) ? sbarreDalPercorso(propAuto) : [];

        // disegno: mezzo pieno, piedi puntinato, cambio e sbarre segnati
        const aLatLng = c => [c[1], c[0]];
        const layers = [];
        if (coordAuto.length) layers.push(L.polyline(coordAuto.map(aLatLng), {color: COLORE_PERCORSO, weight: 5, opacity: 0.85}));
        if (coordPiedi.length) layers.push(L.polyline(coordPiedi.map(aLatLng), {color: COLORE_PERCORSO, weight: 4, opacity: 0.95, dashArray: "1 9", lineCap: "round"}));
        let cambio = null;
        if (haCambio || fermoPrima) {
          cambio = fineAuto;
          const titolo = haCambio ? "Punto di cambio: lascia il mezzo" : "Fine percorribilità del mezzo";
          const testo = haCambio ? "Fine percorribilità del mezzo: si prosegue a piedi" : "Il mezzo si ferma a " + Math.round(restanteM) + " m dal target";
          const mUrl = "https://www.google.com/maps/dir/?api=1&destination=" + cambio.lat.toFixed(6) + "," + cambio.lon.toFixed(6) + "&travelmode=driving&dir_action=navigate";
          layers.push(L.marker([cambio.lat, cambio.lon], {zIndexOffset: 2000, title: titolo, icon: iconaPuntoCambio()})
            .bindPopup("<b>" + titolo + "</b><br>" + testo + "<br>" + cambio.lat.toFixed(6) + ", " + cambio.lon.toFixed(6) +
              "<br><a href='" + mUrl + "' target='_blank' rel='noopener'>Naviga fin qui</a>"));
        }
        sbarre.forEach(sb => {
          layers.push(L.marker([sb.lat, sb.lon], {title: "Sbarra / cancello", icon: L.divIcon({className: "", iconSize: [22, 8], iconAnchor: [11, 4],
            html: '<div style="width:22px;height:8px;background:repeating-linear-gradient(45deg,#e84747 0 5px,#fff 5px 10px);border:1px solid #121212;border-radius:2px;box-shadow:0 0 4px rgba(0,0,0,.6)"></div>'})})
            .bindPopup("<b>Sbarra / cancello</b><br>" + sb.tag.replace(/[<>&"]/g, "") + "<br>Prevedere apertura o chiave"));
        });
        if (routeLayer && map) map.removeLayer(routeLayer);
        routeLayer = L.featureGroup(layers).addTo(map);
        document.getElementById("routeLegenda").classList.remove("hidden");
        map.fitBounds(routeLayer.getBounds(), {padding: [40, 40]});
        document.getElementById("resultMap").scrollIntoView({behavior: "smooth", block: "center"});

        // misure e tempi
        const kmAuto = (parseFloat(propAuto["track-length"]) || 0) / 1000;
        const kmPiedi = (parseFloat(propPiedi["track-length"]) || 0) / 1000;
        let minAuto = 0;
        if (coordAuto.length) {
          minAuto = tempoAutoMin(propAuto);
          if (minAuto === null) {const sec = parseFloat(propAuto["total-time"]); minAuto = isNaN(sec) ? 0 : Math.round(sec / 60);}
          minAuto += sbarre.length * TEMPO_SBARRA_MIN;
        }
        const dis = dislivelliFiltrati(coordPiedi.map(c => parseFloat(c[2])));
        const minPiedi = coordPiedi.length ? (tempoPiediMin(kmPiedi, dis.salita, dis.discesa) || 0) : 0;
        const minTot = minAuto + minPiedi;
        const disAuto = dislivelliFiltrati(coordAuto.map(c => parseFloat(c[2])));

        const righe = [];
        righe.push('<div class="rt-titolo">' + TITOLI_PERCORSO[modalita] + "</div>");
        righe.push("Distanza percorso: " + (kmAuto + kmPiedi).toFixed(2) + " km · Tempo: <strong>circa " + testoDurata(minTot) + "</strong>");
        if (haCambio) {
          righe.push("🚒 Mezzo: " + kmAuto.toFixed(2) + " km · " + testoDurata(minAuto));
          righe.push("🥾 A piedi: " + kmPiedi.toFixed(2) + " km · " + testoDurata(minPiedi));
        }
        if (sbarre.length) righe.push("🚧 Sbarre/cancelli: " + sbarre.length);
        const salitaTot = Math.round(dis.salita + disAuto.salita), discTot = Math.round(dis.discesa + disAuto.discesa);
        if (salitaTot || discTot) righe.push("Dislivello: +" + salitaTot + " m / −" + discTot + " m");
        if (cambio) righe.push("🥾 <strong>" + (haCambio ? "Punto di cambio " : "Il mezzo si ferma a ") + cambio.lat.toFixed(6) + ", " + cambio.lon.toFixed(6) + "</strong> " +
          '<a class="value-link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + cambio.lat.toFixed(6) + "," + cambio.lon.toFixed(6) + '&travelmode=driving&dir_action=navigate">Naviga fin lì</a>');
        if (auto && !auto.profiloSoccorso) righe.push('<span class="rt-avviso">⚠️ Profilo mezzo VF non disponibile: calcolato come auto civile (sbarre e divieti rispettati).</span>');
        else if (conMezzo && !coordAuto.length) righe.push('<span class="rt-avviso">⚠️ Tratto col mezzo non calcolabile: solo a piedi.</span>');
        else if (fermoPrima) righe.push('<span class="rt-avviso">⚠️ Il mezzo si ferma a ' + Math.round(restanteM) + " m dal target (in linea d'aria).</span>");
        righe.push('<div class="rt-nota">Calcolato da BRouter alle ' + new Date().toLocaleTimeString("it-IT", {hour: "2-digit", minute: "2-digit"}) +
          "; tempi: a piedi DIN 33466, mezzo da velocità medie per tipo di strada, senza traffico.</div>");
        info.innerHTML = righe.join("<br>").replace(/<br><div/g, "<div").replace(/<\/div><br>/g, "</div>");
        ultimoPercorso = {modalita: modalita, coordAuto: coordAuto, coordPiedi: coordPiedi, sbarre: sbarre,
          partenza: {lat: latP, lon: lonP}, target: {lat: latT, lon: lonT}, cambio: cambio, haCambio: haCambio,
          kmAuto: kmAuto, kmPiedi: kmPiedi, minAuto: minAuto, minPiedi: minPiedi, minTot: minTot};
        document.getElementById("routeExport").classList.remove("hidden");
      } catch (e) {
        info.classList.add("error");
        info.textContent = "Percorso non disponibile (" + (e.name === "AbortError" ? "tempo scaduto" : e.message) + ").";
      } finally {
        btns.forEach(b => b.disabled = false);
      }
    }

    /* KML per Locus Map (va bene anche per Google Earth e OruxMaps): i due tratti
       separati con colori diversi (il KML non ha il tratteggio) e i punti utili sul
       campo. Sul telefono si apre la condivisione, cosi' si sceglie "Locus Map". */
    function kmlPercorso(p) {
      const xml = t => String(t).replace(/[<>&"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"}[c]));
      const linea = c => c.map(x => x[0] + "," + x[1] + "," + (isFinite(parseFloat(x[2])) ? parseFloat(x[2]).toFixed(1) : 0)).join(" ");
      const punto = (nome, desc, lat, lon, stile) => "    <Placemark><name>" + xml(nome) + "</name><description>" + xml(desc) +
        "</description><styleUrl>#" + stile + "</styleUrl><Point><coordinates>" + lon.toFixed(6) + "," + lat.toFixed(6) + ",0</coordinates></Point></Placemark>";
      const traccia = (nome, desc, c, stile) => "    <Placemark><name>" + xml(nome) + "</name><description>" + xml(desc) +
        "</description><styleUrl>#" + stile + "</styleUrl><LineString><tessellate>1</tessellate><coordinates>" + linea(c) + "</coordinates></LineString></Placemark>";
      const icona = (id, colore, href) => '    <Style id="' + id + '"><IconStyle><color>' + colore + "</color><Icon><href>" + href + "</href></Icon></IconStyle></Style>";
      const quando = new Date().toLocaleString("it-IT", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
      const nome = TITOLI_PERCORSO[p.modalita].replace(/^\S+\s/, "") + " FireOps " + quando;
      const parti = [];
      if (p.coordAuto.length) parti.push(traccia("Mezzo VF", p.kmAuto.toFixed(2) + " km, circa " + testoDurata(p.minAuto), p.coordAuto, "mezzo"));
      if (p.coordPiedi.length) parti.push(traccia("A piedi", p.kmPiedi.toFixed(2) + " km, circa " + testoDurata(p.minPiedi), p.coordPiedi, "piedi"));
      parti.push(punto("Squadra VF", "Partenza", p.partenza.lat, p.partenza.lon, "squadra"));
      if (p.cambio) parti.push(punto(p.haCambio ? "Punto di cambio" : "Fine percorribilita' mezzo",
        p.haCambio ? "Si lascia il mezzo, si prosegue a piedi" : "Il mezzo si ferma qui", p.cambio.lat, p.cambio.lon, "cambio"));
      p.sbarre.forEach((sb, i) => parti.push(punto("Sbarra " + (i + 1), sb.tag + " - prevedere apertura o chiave", sb.lat, sb.lon, "sbarra")));
      parti.push(punto("Arrivo (target)", "Punto di arrivo / target intervento", p.target.lat, p.target.lon, "target"));
      const ic = "https://maps.google.com/mapfiles/kml/";
      return '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>' + xml(nome) + "</name>\n" +
        "    <description>" + xml("Distanza " + (p.kmAuto + p.kmPiedi).toFixed(2) + " km, tempo circa " + testoDurata(p.minTot) + ". Calcolato da FireOps VVF (BRouter).") + "</description>\n" +
        '    <Style id="mezzo"><LineStyle><color>ff4747e8</color><width>5</width></LineStyle></Style>\n' +
        '    <Style id="piedi"><LineStyle><color>ff008cff</color><width>4</width></LineStyle></Style>\n' +
        icona("squadra", "ff00d7ff", ic + "shapes/firedept.png") + "\n" +
        icona("cambio", "ffffffff", ic + "shapes/hiker.png") + "\n" +
        icona("sbarra", "ff4747e8", ic + "shapes/caution.png") + "\n" +
        icona("target", "ff4747e8", ic + "paddle/red-circle.png") + "\n" +
        parti.join("\n") + "\n  </Document>\n</kml>\n";
    }
    /* GPX 1.1: stesse tracce e stessi punti del KML (partenza, cambio, sbarre e punto di arrivo) */
    function gpxPercorso(p) {
      const xml = t => String(t).replace(/[<>&"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"}[c]));
      const quando = new Date().toLocaleString("it-IT", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
      const nome = TITOLI_PERCORSO[p.modalita].replace(/^\S+\s/, "") + " FireOps " + quando;
      const wpt = (nome, lat, lon, sym) => '  <wpt lat="' + lat.toFixed(6) + '" lon="' + lon.toFixed(6) + '"><name>' + xml(nome) + "</name><sym>" + sym + "</sym></wpt>";
      const trk = (nome, c) => '  <trk><name>' + xml(nome) + "</name><trkseg>\n" + c.map(x => '    <trkpt lat="' + x[1] + '" lon="' + x[0] + '">' + (isFinite(parseFloat(x[2])) ? "<ele>" + parseFloat(x[2]).toFixed(1) + "</ele>" : "") + "</trkpt>").join("\n") + "\n  </trkseg></trk>";
      const parti = [wpt("Squadra VF", p.partenza.lat, p.partenza.lon, "Flag, Blue")];
      if (p.cambio) parti.push(wpt(p.haCambio ? "Punto di cambio" : "Fine percorribilita' mezzo", p.cambio.lat, p.cambio.lon, "Parking Area"));
      p.sbarre.forEach((sb, i) => parti.push(wpt("Sbarra " + (i + 1), sb.lat, sb.lon, "Danger Area")));
      parti.push(wpt("Arrivo (target)", p.target.lat, p.target.lon, "Flag, Red"));
      if (p.coordAuto.length) parti.push(trk("Mezzo VF", p.coordAuto));
      if (p.coordPiedi.length) parti.push(trk("A piedi", p.coordPiedi));
      return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="FireOps VVF" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>' + xml(nome) + "</name><time>" + new Date().toISOString() + "</time></metadata>\n" + parti.join("\n") + "\n</gpx>\n";
    }
    async function esportaKml(formato) {
      if (!ultimoPercorso) return;
      const gpx = formato === "gpx";
      const d = new Date(), z = n => String(n).padStart(2, "0");
      const nomeFile = "percorso-fireops-" + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()) + (gpx ? ".gpx" : ".kml");
      const blob = gpx ? new Blob([gpxPercorso(ultimoPercorso)], {type: "application/gpx+xml"}) : new Blob([kmlPercorso(ultimoPercorso)], {type: "application/vnd.google-earth.kml+xml"});
      try {
        const file = new File([blob], nomeFile, {type: blob.type});
        if (navigator.canShare && navigator.canShare({files: [file]})) {
          await navigator.share({files: [file], title: "Percorso FireOps"});
          return;
        }
      } catch (e) {
        if (e && e.name === "AbortError") return;   // condivisione annullata dall'utente
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nomeFile;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    document.getElementById("routeKml").addEventListener("click", () => esportaKml("kml"));
    document.getElementById("routeGpx").addEventListener("click", () => esportaKml("gpx"));

    document.getElementById("routeMix").addEventListener("click", function () {calcolaPercorso("soccorso");});
    /* ================= GUIDA IN REALTÀ AUMENTATA =================
     * Camera posteriore + GPS + sensori di orientamento: il percorso calcolato viene disegnato sul terreno
     * davanti a te (nastro con frecce), con i segnali del punto di cambio, delle sbarre e del target.
     * Indicativo: GPS ±5-10 m e bussola ±10-20°. Se la bussola è storta: "Allinea" (inquadra il punto
     * indicato e tocca) oppure ±5°.
     */
    let arRoute = null;       // {pts:[{lat,lon,seg}], cambioIdx, sbarre:[{lat,lon}], target:{lat,lon}}
    let arStop = null;

    // il percorso da disegnare è l'ultimo calcolato (lo stesso dell'esportazione KML)
    function arCostruisciPercorso() {
      const u = ultimoPercorso;
      if (!u) return null;
      const pts = u.coordAuto.map(function (c) {return {lat: c[1], lon: c[0], seg: "a"};});
      u.coordPiedi.forEach(function (c, i) {if (!(i === 0 && pts.length)) pts.push({lat: c[1], lon: c[0], seg: "p"});});
      if (pts.length < 2) return null;
      return {pts: pts, cambioIdx: u.haCambio ? u.coordAuto.length - 1 : null,
        sbarre: (u.sbarre || []).map(function (x) {return {lat: x.lat, lon: x.lon};}), target: {lat: u.target.lat, lon: u.target.lon}};
    }

    // MATH-START
    const AR_CAM_H = 1.6;     // altezza della fotocamera da terra, m
    const AR_NEAR = 0.5;      // piano vicino, m
    const AR_FOVK = 0.82;     // lunghezza focale = FOVK x lato lungo dello schermo (circa 63° sul lato lungo)

    function arEnu(lat0, lon0, lat, lon) {
      return {e: (lon - lon0) * Math.cos(lat0 * Math.PI / 180) * 111320, n: (lat - lat0) * 110574};
    }
    // matrice W3C dispositivo -> terra (x=Est, y=Nord, z=su), Z-X'-Y''
    function arRot(aD, bD, gD) {
      const r = Math.PI / 180, cA = Math.cos(aD * r), sA = Math.sin(aD * r), cB = Math.cos(bD * r), sB = Math.sin(bD * r),
        cG = Math.cos(gD * r), sG = Math.sin(gD * r);
      return [
        [cA * cG - sA * sB * sG, -cB * sA, cG * sA * sB + cA * sG],
        [cG * sA + cA * sB * sG, cA * cB, sA * sG - cA * cG * sB],
        [-cB * sG, sB, cB * cG]
      ];
    }
    // direzione (dal nord, in senso orario) verso cui guarda la fotocamera posteriore
    function arAzimuth(R) {
      return (Math.atan2(-R[0][2], -R[1][2]) * 180 / Math.PI + 360) % 360;
    }
    // punto del mondo {e,n,u} rispetto alla fotocamera -> coordinate camera {x destra, y su, z avanti}
    function arCam(R, v, scr) {
      const dx = R[0][0] * v.e + R[1][0] * v.n + R[2][0] * v.u;
      const dy = R[0][1] * v.e + R[1][1] * v.n + R[2][1] * v.u;
      const dz = R[0][2] * v.e + R[1][2] * v.n + R[2][2] * v.u;
      let x, y;
      switch (((Math.round(scr / 90) * 90) % 360 + 360) % 360) {
        case 90: x = -dy; y = dx; break;
        case 180: x = -dx; y = -dy; break;
        case 270: x = dy; y = -dx; break;
        default: x = dx; y = dy;
      }
      return {x: x, y: y, z: -dz};
    }
    function arProj(c, W, H, f) {return {x: W / 2 + f * c.x / c.z, y: H / 2 - f * c.y / c.z};}

    // punto della polilinea (in metri locali) più vicino a p: {i: indice segmento, t: 0-1, d: distanza, s: ascissa curvilinea}
    function arNearest(pts, cum, p) {
      let best = null;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.e - a.e, dn = b.n - a.n, L2 = dx * dx + dn * dn;
        let t = L2 > 0 ? ((p.e - a.e) * dx + (p.n - a.n) * dn) / L2 : 0;
        t = Math.max(0, Math.min(1, t));
        const qe = a.e + t * dx, qn = a.n + t * dn, d = Math.hypot(p.e - qe, p.n - qn);
        if (!best || d < best.d) best = {i: i, t: t, d: d, s: cum[i] + t * (cum[i + 1] - cum[i]), e: qe, n: qn};
      }
      return best;
    }
    // punto a ascissa s lungo la polilinea
    function arAt(pts, cum, s) {
      s = Math.max(0, Math.min(cum[cum.length - 1], s));
      let i = 0;
      while (i < pts.length - 2 && cum[i + 1] < s) i++;
      const L = cum[i + 1] - cum[i], t = L > 0 ? (s - cum[i]) / L : 0;
      return {e: pts[i].e + t * (pts[i + 1].e - pts[i].e), n: pts[i].n + t * (pts[i + 1].n - pts[i].n), i: i};
    }
    // taglia un segmento (a, b in camera) al piano vicino: restituisce [ta, tb] in 0-1 oppure null
    function arClipT(za, zb, near) {
      if (za < near && zb < near) return null;
      let t0 = 0, t1 = 1;
      if (za < near) t0 = (near - za) / (zb - za);
      if (zb < near) t1 = (near - za) / (zb - za);
      return [t0, t1];
    }
    // differenza angolare con segno, -180..180
    function arDiffAng(a, b) {return ((b - a + 540) % 360) - 180;}
    // MATH-END

    function arStart() {
      arRoute = arCostruisciPercorso();
      if (!arRoute) return;
      const ov = document.getElementById("arOv"), vid = document.getElementById("arVideo"), cv = document.getElementById("arCv");
      const g = cv.getContext("2d");
      const msg = document.getElementById("arMsg");
      const top = {arrow: document.getElementById("arArrow"), next: document.getElementById("arNext"), sub: document.getElementById("arSub")};
      const showMsg = function (t) {msg.textContent = t; msg.classList.remove("hidden");};
      msg.classList.add("hidden");
      ov.classList.remove("hidden");

      // geometria in metri locali (origine = primo punto)
      const o = arRoute.pts[0];
      const loc = arRoute.pts.map(function (p) {return arEnu(o.lat, o.lon, p.lat, p.lon);});
      const cum = [0];
      for (let i = 1; i < loc.length; i++) cum.push(cum[i - 1] + Math.hypot(loc[i].e - loc[i - 1].e, loc[i].n - loc[i - 1].n));
      const sCambio = arRoute.cambioIdx != null ? cum[arRoute.cambioIdx] : null;
      const pins = [];
      if (arRoute.cambioIdx != null) pins.push({k: "cambio", p: arRoute.pts[arRoute.cambioIdx], t: "🅿 Lascia il mezzo", col: "#ffd700", tc: "#10141a", edge: true});
      arRoute.sbarre.forEach(function (s) {pins.push({k: "sbarra", p: s, t: "🚧 Sbarra", col: "#fff", tc: "#e84747", edge: false});});
      pins.push({k: "target", p: arRoute.target, t: "🎯 Target", col: "#e84747", tc: "#fff", edge: true});

      let opened = true;

      // ---- sensori ----
      const ori = {a: 0, b: 90, g: 0, ok: false, cmp: null, off: null, abs: false};
      let yawOff = 0;
      const sm = function (cur, nw, k, circ) {
        if (cur === null || cur === undefined) return nw;
        if (!circ) return cur + (nw - cur) * k;
        return (cur + arDiffAng(cur, nw) * k + 360) % 360;
      };
      let fa = null, fb = null, fg = null, offF = null;
      const onOri = function (e) {
        if (e.alpha == null || e.beta == null) return;
        let a = e.alpha;
        if (typeof e.webkitCompassHeading === "number") {          // iOS: alpha relativo, bussola a parte
          const d = arDiffAng(a, (360 - e.webkitCompassHeading + 360) % 360);
          offF = offF === null ? d : (offF + arDiffAng(offF, d) * 0.03);
          a = a + offF;
          ori.abs = true;
        } else if (e.absolute) {
          ori.abs = true;
        }
        fa = sm(fa, (a + 360) % 360, 0.35, true);
        fb = sm(fb, e.beta, 0.35, false);
        fg = sm(fg, e.gamma || 0, 0.35, false);
        ori.ok = true;
      };
      const evName = ("ondeviceorientationabsolute" in window) ? "deviceorientationabsolute" : "deviceorientation";
      const startSensors = function () {window.addEventListener(evName, onOri);};
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission().then(function (s) {
          if (s === "granted") startSensors(); else showMsg("Permesso ai sensori di movimento negato: senza bussola la guida AR non funziona.");
        }).catch(function () {showMsg("Sensori di movimento non disponibili.");});
      } else {
        startSensors();
      }

      // ---- GPS ----
      let pos = userPos ? {lat: userPos.lat, lon: userPos.lon, acc: userAccuracy} : null, gpsId = null;
      if (navigator.geolocation) {
        gpsId = navigator.geolocation.watchPosition(function (p) {
          pos = {lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy};
        }, function () {showMsg("Posizione GPS non disponibile.");}, {enableHighAccuracy: true, maximumAge: 1000, timeout: 20000});
      }

      // ---- fotocamera ----
      let stream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: "environment"}}, audio: false}).then(function (s) {
          stream = s; vid.srcObject = s; vid.play().catch(function () { });
          if (!opened) s.getTracks().forEach(function (t) {t.stop();});
        }).catch(function () {showMsg("Fotocamera non disponibile: concedi il permesso. La guida resta visibile su sfondo nero.");});
      } else {
        showMsg("Questo browser non permette l'uso della fotocamera.");
      }

      // ---- disegno ----
      let raf = 0, lastHud = 0, nextPin = null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = function () {
        cv.width = Math.round(ov.clientWidth * dpr); cv.height = Math.round(ov.clientHeight * dpr);
      };
      resize();
      window.addEventListener("resize", resize);

      const R2 = function () {return arRot((fa + yawOff + 360) % 360, fb, fg);};

      function frame() {
        if (!opened) return;
        raf = requestAnimationFrame(frame);
        const W = cv.width, H = cv.height;
        g.clearRect(0, 0, W, H);
        if (!ori.ok || !pos) {
          g.fillStyle = "#fff"; g.font = (14 * dpr) + "px system-ui"; g.textAlign = "center";
          g.fillText(!pos ? "In attesa del GPS…" : "In attesa dei sensori…", W / 2, H / 2);
          return;
        }
        const R = R2(), scr = screenAngle(), f = AR_FOVK * Math.max(W, H);
        const me = arEnu(o.lat, o.lon, pos.lat, pos.lon);            // io, nel sistema locale
        const near = arNearest(loc, cum, me);
        const camAz = arAzimuth(R);
        const toCam = function (e, n, u) {return arCam(R, {e: e - me.e, n: n - me.n, u: u - AR_CAM_H}, scr);};

        // nastro del percorso, da dove sono a 450 m avanti
        const sEnd = Math.min(cum[cum.length - 1], near.s + 450);
        const seq = [{e: near.e, n: near.n}];
        for (let i = near.i + 1; i < loc.length && cum[i] < sEnd; i++) seq.push({e: loc[i].e, n: loc[i].n});
        const last = arAt(loc, cum, sEnd); seq.push({e: last.e, n: last.n});
        const HW = 0.9;   // mezza larghezza del nastro, m
        const poly = function (pts, fill, stroke) {
          g.beginPath();
          pts.forEach(function (p, i) {if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y);});
          g.closePath();
          if (fill) {g.fillStyle = fill; g.fill();}
          if (stroke) {g.strokeStyle = stroke; g.lineWidth = 2 * dpr; g.stroke();}
        };
        for (let i = seq.length - 2; i >= 0; i--) {                       // dal lontano al vicino
          const a = seq[i], b = seq[i + 1];
          const ca = toCam(a.e, a.n, 0), cb = toCam(b.e, b.n, 0);
          const cl = arClipT(ca.z, cb.z, AR_NEAR);
          if (!cl) continue;
          const A = {e: a.e + cl[0] * (b.e - a.e), n: a.n + cl[0] * (b.n - a.n)};
          const B = {e: a.e + cl[1] * (b.e - a.e), n: a.n + cl[1] * (b.n - a.n)};
          const L = Math.hypot(B.e - A.e, B.n - A.n) || 1, ne = -(B.n - A.n) / L * HW, nn = (B.e - A.e) / L * HW;
          const q = [[A.e + ne, A.n + nn], [B.e + ne, B.n + nn], [B.e - ne, B.n - nn], [A.e - ne, A.n - nn]].map(function (p) {
            const c = toCam(p[0], p[1], 0); return arProj({x: c.x, y: c.y, z: Math.max(c.z, AR_NEAR)}, W, H, f);
          });
          const sIdx = Math.min(near.i + i, arRoute.pts.length - 2);
          const piedi = arRoute.pts[sIdx + 1] && arRoute.pts[sIdx + 1].seg === "p";
          poly(q, piedi ? "rgba(63,166,107,.62)" : "rgba(255,215,0,.55)", piedi ? "rgba(255,255,255,.9)" : "rgba(16,20,26,.8)");
        }
        // frecce sul terreno, ogni 7 m nei primi 70 m
        for (let s = near.s + 4; s < Math.min(sEnd, near.s + 70); s += 7) {
          const p = arAt(loc, cum, s), p2 = arAt(loc, cum, s + 1.5);
          const L = Math.hypot(p2.e - p.e, p2.n - p.n) || 1, de = (p2.e - p.e) / L, dn = (p2.n - p.n) / L;
          const tri = [[p.e + de * 1.4, p.n + dn * 1.4], [p.e - de * 0.7 - dn * 0.8, p.n - dn * 0.7 + de * 0.8], [p.e - de * 0.7 + dn * 0.8, p.n - dn * 0.7 - de * 0.8]].map(function (v) {return toCam(v[0], v[1], 0.02);});
          if (tri.some(function (c) {return c.z < AR_NEAR;})) continue;
          poly(tri.map(function (c) {return arProj(c, W, H, f);}), "rgba(255,255,255,.95)", null);
        }

        // segnali
        const info = [];
        pins.forEach(function (pn) {
          const pe = arEnu(o.lat, o.lon, pn.p.lat, pn.p.lon);
          const dist = Math.hypot(pe.e - me.e, pe.n - me.n);
          if (pn.k === "sbarra" && dist > 400) return;
          const cTop = toCam(pe.e, pe.n, 3.2), cBase = toCam(pe.e, pe.n, 0);
          const label = pn.t + " · " + (dist >= 1000 ? (dist / 1000).toFixed(1) + " km" : Math.round(dist) + " m");
          g.font = "700 " + (13 * dpr) + "px system-ui"; g.textAlign = "center";
          if (cTop.z > AR_NEAR) {
            const pt = arProj(cTop, W, H, f), pb = arProj({x: cBase.x, y: cBase.y, z: Math.max(cBase.z, AR_NEAR)}, W, H, f);
            g.strokeStyle = pn.col; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(pt.x, pt.y); g.lineTo(pb.x, pb.y); g.stroke();
            const tw = g.measureText(label).width + 16 * dpr, th = 24 * dpr;
            const bx = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pt.x));
            g.fillStyle = pn.col;
            g.beginPath(); g.roundRect ? g.roundRect(bx - tw / 2, pt.y - th - 4 * dpr, tw, th, 12 * dpr) : g.rect(bx - tw / 2, pt.y - th - 4 * dpr, tw, th); g.fill();
            g.fillStyle = pn.tc; g.fillText(label, bx, pt.y - 10 * dpr);
          } else if (pn.edge) {
            const brg = (Math.atan2(pe.e - me.e, pe.n - me.n) * 180 / Math.PI + 360) % 360, rel = arDiffAng(camAz, brg);
            const right = rel > 0, ex = right ? W - 14 * dpr : 14 * dpr;
            g.fillStyle = pn.col; g.beginPath();
            g.moveTo(ex, H * 0.55); g.lineTo(ex + (right ? -22 : 22) * dpr, H * 0.55 - 14 * dpr); g.lineTo(ex + (right ? -22 : 22) * dpr, H * 0.55 + 14 * dpr); g.closePath(); g.fill();
            g.fillStyle = "#fff"; g.textAlign = right ? "right" : "left";
            g.fillText(label, ex + (right ? -28 : 28) * dpr, H * 0.55 + 5 * dpr);
          }
          info.push({pn: pn, dist: dist});
        });

        // HUD (4 volte al secondo)
        const now = performance.now();
        if (now - lastHud > 250) {
          lastHud = now;
          const fuori = near.d > 30;
          const passatoCambio = sCambio === null || near.s > sCambio - 12;
          const target = passatoCambio ? "target" : "cambio";
          const meta = pins.filter(function (p) {return p.k === target;})[0];
          const sMeta = target === "cambio" ? sCambio : cum[cum.length - 1];
          const ahead = fuori ? {e: near.e, n: near.n} : arAt(loc, cum, near.s + 20);
          const brg = (Math.atan2(ahead.e - me.e, ahead.n - me.n) * 180 / Math.PI + 360) % 360;
          const rel = arDiffAng(camAz, brg);
          top.arrow.style.transform = "rotate(" + (rel - 90 + 0) + "deg)";
          const rem = fuori ? near.d : Math.max(0, sMeta - near.s);
          const fmt = function (m) {return m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m";};
          top.next.textContent = fuori ? "Fuori percorso: " + fmt(near.d) + " dalla linea" : (target === "cambio" ? "Lascia il mezzo tra " : "Target tra ") + fmt(rem);
          top.next.style.color = fuori ? "#ffb4a2" : "#fff";
          top.sub.textContent = (Math.abs(rel) < 12 ? "Davanti a te" : (rel > 0 ? "Gira a destra " : "Gira a sinistra ") + Math.round(Math.abs(rel)) + "°") +
            " · GPS ±" + (pos.acc != null ? Math.round(pos.acc) : "?") + " m" + (ori.abs || yawOff ? "" : " · bussola non calibrata: usa Allinea");
          nextPin = meta || null;
        }
      }
      raf = requestAnimationFrame(frame);

      // allineamento: inquadra il punto indicato e tocca → la bussola si corregge
      const align = function () {
        if (!ori.ok || !pos || !nextPin) return;
        const R = arRot((fa + yawOff + 360) % 360, fb, fg), az = arAzimuth(R);
        const pe = arEnu(o.lat, o.lon, nextPin.p.lat, nextPin.p.lon), me = arEnu(o.lat, o.lon, pos.lat, pos.lon);
        const brg = (Math.atan2(pe.e - me.e, pe.n - me.n) * 180 / Math.PI + 360) % 360;
        yawOff = (yawOff + (az - brg) + 720) % 360;
        showMsg("Bussola allineata su: " + nextPin.t.replace(/^\S+\s/, "") + ".");
        setTimeout(function () {msg.classList.add("hidden");}, 2500);
      };
      const nudge = function (d) {yawOff = (yawOff + d + 360) % 360;};
      const bAlign = document.getElementById("arAlign"), bM = document.getElementById("arMinus"), bP = document.getElementById("arPlus"), bC = document.getElementById("arClose");
      bAlign.onclick = align;
      bM.onclick = function () {nudge(-5);};    // ◀ sposta la scena a sinistra
      bP.onclick = function () {nudge(5);};     // ▶ sposta la scena a destra
      const stop = function () {
        opened = false;
        cancelAnimationFrame(raf);
        window.removeEventListener(evName, onOri);
        window.removeEventListener("resize", resize);
        if (gpsId !== null) navigator.geolocation.clearWatch(gpsId);
        if (stream) stream.getTracks().forEach(function (t) {t.stop();});
        vid.srcObject = null;
        ov.classList.add("hidden");
        arStop = null;
      };
      bC.onclick = stop;
      arStop = stop;
    }

    document.getElementById("routeAR").addEventListener("click", arStart);

    document.getElementById("navToComando").addEventListener("click", function () {
      if (!currentRecord) return;
      const url = "https://www.google.com/maps/dir/?api=1&destination=" +
        currentRecord.lat.toFixed(6) + "," + currentRecord.lon.toFixed(6) +
        "&travelmode=driving&dir_action=navigate";
      window.open(url, "_blank", "noopener");
    });

    // Il Comando diventa il target: coordinate, quota, mappa e percorso come per un punto inserito a mano
    function comandoComeTarget() {
      if (!currentRecord) return false;
      targetPos = {lat: currentRecord.lat, lon: currentRecord.lon};
      document.getElementById("targetInput").value = targetPos.lat.toFixed(6) + ", " + targetPos.lon.toFixed(6);
      clearRoute();
      fetchTargetElevation(targetPos.lat, targetPos.lon);
      startGpsTracking();
      const tp = document.getElementById("targetInfoPanel");
      tp.classList.remove("hidden");
      document.getElementById("rTargetCoords").textContent = targetPos.lat.toFixed(6) + "°, " + targetPos.lon.toFixed(6) + "°";
      document.getElementById("rMethod").classList.add("tgt");
      updateNavInfo();
      updateMap(currentRecord, userPos, targetPos);
      return true;
    }

    // Il logo nell'intestazione azzera la pagina; la casetta porta alla home
    function resetApp() {
      clearRoute();
      if (watchId !== null) {navigator.geolocation.clearWatch(watchId); watchId = null;}
      if (trackingTimeoutId !== null) {clearTimeout(trackingTimeoutId); trackingTimeoutId = null;}
      currentRecord = null;
      userPos = null;
      userAccuracy = null;
      userAltitude = null;
      targetPos = null;

      if (isMapFullscreen) setMapFullscreen(false);

      document.getElementById("targetInput").value = "";
      document.getElementById("searchInput").value = "";
      document.getElementById("searchResults").classList.add("hidden");
      document.getElementById("statusMsg").classList.add("hidden");
      document.getElementById("statusMsg").textContent = "";

      document.getElementById("result-section").classList.add("hidden");
      document.getElementById("search-section").classList.add("hidden");
      document.getElementById("coordPanel").classList.add("hidden");
      azioneAttiva = null;
      document.getElementById("locate-section").classList.remove("hidden");
      if (window.__aggiornaPulsantiLocalizzati) window.__aggiornaPulsantiLocalizzati();
      window.scrollTo({top: 0, behavior: "smooth"});
    }

    document.getElementById("resetDataBtn").addEventListener("click", function () {
      if (confirm("Cancellare posizione, punto target e percorso?")) resetApp();
    });
    FireOps.onHide("localizzati", function () {if (arStop) arStop(); stopGpsTracking();});
    FireOps.onLogo("localizzati", resetApp);
    FireOps.onShow("localizzati", function () {
      if (map) setTimeout(function () {map.invalidateSize();}, 60);
      if (watchId === null && userPos && !document.getElementById("result-section").classList.contains("hidden")) startGpsTracking();
      // arrivo dal comando nell'intestazione: localizza subito se non c'è già un risultato
      if (FireOps.consumaAutoLocalizzati() &&
          document.getElementById("result-section").classList.contains("hidden")) {
        document.getElementById("locateBtn").click();
      }
      // testo o link ricevuto da "Condividi > FireOps": lo inserisce e lo elabora
      const cond = FireOps.consumaCondiviso && FireOps.consumaCondiviso();
      if (cond) {
        document.getElementById("coordPanel").classList.remove("hidden");
        document.getElementById("search-section").classList.add("hidden");
        if (window.__aggiornaPulsantiLocalizzati) window.__aggiornaPulsantiLocalizzati();
        document.getElementById("targetInput").value = cond;
        document.getElementById("targetInput").dispatchEvent(new Event("input"));
        processTargetInput(cond);
      }
    });

    async function fetchTargetElevation(lat, lon) {
      const el = document.getElementById("rTargetAlt");
      el.textContent = "…";
      try {
        const ctrl = new AbortController();
        const tmo = setTimeout(() => ctrl.abort(), 7000);
        const r = await fetch("https://api.open-meteo.com/v1/elevation?latitude=" + lat + "&longitude=" + lon, {signal: ctrl.signal});
        clearTimeout(tmo);
        if (!r.ok) throw new Error("http " + r.status);
        const d = await r.json();
        const h = d.elevation && d.elevation[0];
        el.textContent = (h != null) ? Math.round(h) + " m s.l.m." : "Non disponibile";
      } catch (e) {
        el.textContent = "Non disponibile";
      }
    }

    // Apre il popup e restituisce {lat, lon} scelto, oppure null se annullato
    function askPlace(code) {
      return new Promise(function (resolve) {
        const modal = document.getElementById("placeModal");
        const input = document.getElementById("placeInput");
        const list = document.getElementById("placeList");
        const msg = document.getElementById("placeMsg");
        let tmo = null, reqId = 0;

        document.getElementById("placeCode").textContent = code;
        input.value = "";
        list.innerHTML = "";
        msg.classList.add("hidden");
        modal.classList.remove("hidden");
        setTimeout(function () {input.focus();}, 50);

        function close(result) {
          modal.classList.add("hidden");
          input.removeEventListener("input", onInput);
          document.getElementById("placeCancel").removeEventListener("click", onCancel);
          modal.removeEventListener("click", onBackdrop);
          clearTimeout(tmo);
          resolve(result);
        }
        function onCancel() {close(null);}
        function onBackdrop(e) {if (e.target === modal) close(null);}

        function showMsg(t) {msg.textContent = t; msg.classList.remove("hidden");}

        async function search(q) {
          const id = ++reqId;
          msg.classList.add("hidden");
          try {
            const url = "https://photon.komoot.io/api/?limit=10" +
              "&bbox=6.6,35.4,18.8,47.2&osm_tag=place&q=" + encodeURIComponent(q);
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 6000);
            const r = await fetch(url, {signal: ctrl.signal});
            clearTimeout(t);
            if (!r.ok) throw new Error("http " + r.status);
            const data = await r.json();
            if (id !== reqId) return;   // risposta vecchia, ignorata

            const seen = {};
            const items = (data.features || []).filter(function (f) {
              const p = f.properties || {};
              if (p.countrycode !== "IT" || !p.name) return false;
              const key = p.name + "|" + (p.county || p.state || "");
              if (seen[key]) return false;
              seen[key] = true;
              return true;
            }).slice(0, 6);

            list.innerHTML = "";
            if (!items.length) {showMsg("Nessun risultato. Prova a scrivere il nome per intero."); return;}
            items.forEach(function (f) {
              const p = f.properties;
              const row = document.createElement("div");
              row.className = "place-item";
              const n = document.createElement("span");
              n.className = "pn";
              n.textContent = p.name;
              const pr = document.createElement("span");
              pr.className = "pp";
              pr.textContent = [p.county, p.state].filter(Boolean).join(" · ");
              row.appendChild(n);
              row.appendChild(pr);
              row.addEventListener("click", function () {
                close({lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0]});
              });
              list.appendChild(row);
            });
          } catch (e) {
            if (id !== reqId) return;
            list.innerHTML = "";
            showMsg("Ricerca non disponibile (" + (e.name === "AbortError" ? "tempo scaduto" : e.message) + ").");
          }
        }

        function onInput() {
          clearTimeout(tmo);
          const q = input.value.trim();
          if (q.length < 3) {list.innerHTML = ""; msg.classList.add("hidden"); return;}
          tmo = setTimeout(function () {search(q);}, 350);
        }

        input.addEventListener("input", onInput);
        document.getElementById("placeCancel").addEventListener("click", onCancel);
        modal.addEventListener("click", onBackdrop);
      });
    }

    const OLC_SHORT_RE = /^([23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{0,7})\s*(.*)$/i;

    // Ricostruisce un codice corto a partire da un punto di riferimento
    function olcRecoverShort(shortCode, ref) {
      const d = olcDecode("2222" + shortCode.toUpperCase());
      if (!d) return null;
      const offLat = d.lat + 90;    // posizione dentro il quadrato di 1°
      const offLon = d.lon + 180;
      let lat = Math.floor(ref.lat) + offLat;
      let lon = Math.floor(ref.lon) + offLon;
      if (lat - ref.lat > 0.5) lat -= 1; else if (lat - ref.lat < -0.5) lat += 1;
      if (lon - ref.lon > 0.5) lon -= 1; else if (lon - ref.lon < -0.5) lon += 1;
      return {lat: lat, lon: lon};
    }

    async function geocodeItalyPlace(name) {
      try {
        const ctrl = new AbortController();
        const tmo = setTimeout(() => ctrl.abort(), 7000);
        const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&q=" +
          encodeURIComponent(name), {headers: {"Accept": "application/json"}, signal: ctrl.signal});
        clearTimeout(tmo);
        if (!r.ok) return null;
        const a = await r.json();
        return a && a[0] ? {lat: parseFloat(a[0].lat), lon: parseFloat(a[0].lon)} : null;
      } catch (e) {
        return null;
      }
    }

    // Restituisce {coords} oppure {error}; null se non è un codice corto
    async function resolveShortOlc(text) {
      const m = (text || "").trim().match(OLC_SHORT_RE);
      if (!m) return null;
      const code = m[1], place = m[2].trim();
      let ref = null;
      if (place) {
        ref = await geocodeItalyPlace(place);
        if (!ref) return {error: "Località \"" + place + "\" non trovata (o rete non disponibile). Controlla il nome."};
      } else if (userPos) {
        ref = userPos;
      } else {
        ref = await askPlace(code);
        if (!ref) return {error: "Annullato: per un codice OLC corto serve una località di riferimento."};
      }
      const coords = olcRecoverShort(code, ref);
      return coords ? {coords: coords} : {error: "Codice OLC non valido."};
    }

    /* --- Estrazione coordinate da testo libero, link di mappe e valori incollati --- */
    function estraiCoordinateDaTesto(raw) {
      let t = String(raw || "");
      try { t = decodeURIComponent(t); } catch (e) {}
      t = t.replace(/ /g, " ").replace(/&amp;/g, "&");
      const N = "(-?\\d+(?:\\.\\d+)?)";
      const ok = (la, lo) => {
        la = parseFloat(la); lo = parseFloat(lo);
        return isFinite(la) && isFinite(lo) && (la !== 0 || lo !== 0) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? {lat: la, lon: lo} : null;
      };
      /* 0. coordinate etichettate ("Lat. = 43,9448 Long. = 11,90802"), come nei messaggi di intervento */
      const et = t.match(/\blat(?:itudine)?\.?\s*[=:]?\s*(-?\d{1,2}(?:[.,]\d+)?)[\s,;]+lon(?:g|gitudine)?\.?\s*[=:]?\s*(-?\d{1,3}(?:[.,]\d+)?)/i);
      if (et) { const c = ok(et[1].replace(",", "."), et[2].replace(",", ".")); if (c) return {coords: c}; }
      /* 1. link di mappe (Google, OSM, Apple, Bing, Waze, geo:, ...) */
      if (/:\/\/|geo:|www\.|maps/i.test(t)) {
        const pats = [
          new RegExp("@" + N + ",\\s*" + N),
          new RegExp("!3d" + N + "!4d" + N),
          new RegExp("[?&#;](?:q|ll|sll|query|daddr|saddr|destination|center|cbll|coordinate|coordinates|pos|loc|to|ref)=(?:loc:|ll\\.|geo:)?\\s*" + N + "\\s*[,;~ ]\\s*" + N, "i"),
          new RegExp("[?&]mlat=" + N + "&mlon=" + N, "i"),
          new RegExp("[?&]lat=" + N + "&(?:lon|lng|long)=" + N, "i"),
          new RegExp("#map=\\d+(?:\\.\\d+)?/" + N + "/" + N),
          new RegExp("geo:" + N + ",\\s*" + N, "i"),
          new RegExp("/(?:place|search|dir|maps)/(?:[^/@]*/)?" + N + ",\\s*\\+?" + N, "i"),
          new RegExp("[?&]cp=" + N + "~" + N, "i")
        ];
        for (const re of pats) {
          const m = t.match(re);
          if (m) { const c = ok(m[1], m[2]); if (c) return {coords: c}; }
        }
        if (/goo\.gl|maps\.app|bit\.ly|tinyurl|what3words|w3w\.co|share\.google|\/\/t\.co/i.test(t)) {
          return {error: "Link abbreviato: non contiene le coordinate. Aprilo, copia il link completo dalla barra del browser (o le coordinate) e incollalo qui."};
        }
      }
      /* 2. codice Plus Code intero dentro al testo */
      const olc = t.match(/\b[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,7}(?![23456789CFGHJMPQRVWX])/i);
      if (olc) { const c = olcDecode(olc[0]); if (c) return {coords: c}; }
      /* 3. UTM dentro al testo (es. 32T 291234 4775201) */
      const utm = t.match(/\b\d{1,2}\s*[C-X]\s+\d{5,7}(?:[.,]\d+)?\s+\d{6,8}(?:[.,]\d+)?\b/i);
      if (utm) { const c = parseCoordinatesInput(utm[0]); if (c) return {coords: c}; }
      /* 4. valori numerici (decimali, gradi-minuti, DMS, con N S E W/O) in mezzo al testo */
      const norm = s => s.replace(/(\d[\s°º'’′"”″]*)O\b/gi, "$1W").replace(/\bO(\s*\d)/gi, "W$1").trim();
      t = t.replace(/\b(?:latitudine|longitudine|lat|lon|lng|long|coordinate|coord|gps|posizione)\b\s*[:=]?/gi, " ");
      const runs = t.match(/[NSEWOnsewo]?[\s\d.,;°º'’′"”″+\-\/NSEWOnsewo]{6,}/g) || [];
      const cand = runs.map(norm).filter(r => (r.match(/\d+/g) || []).length >= 2)
        .map(r => r.replace(/[\/;]/g, " ").replace(/^[\s,+]+|[\s,]+$/g, ""))
        .sort((a, b) => b.length - a.length);
      for (const r of cand) {
        const c = parseCoordinatesInput(r);
        if (c) return {coords: c};
      }
      return null;
    }

    async function processTargetInput(inputVal) {
      azioneAttiva = "coord";
      const statusEl = document.getElementById("statusMsg");
      statusEl.classList.remove("hidden", "error");

      let coords = null;
      const shortRes = await resolveShortOlc(inputVal);
      if (shortRes) {
        if (shortRes.error) {
          statusEl.classList.add("error");
          statusEl.textContent = shortRes.error;
          return;
        }
        coords = shortRes.coords;
      } else {
        const lungo = String(inputVal || "").trim().length > 40;
        const est0 = lungo ? estraiCoordinateDaTesto(inputVal) : null;
        coords = est0 && est0.coords ? est0.coords : parseCoordinatesInput(inputVal);
        if (!coords) {
          const est = est0 || estraiCoordinateDaTesto(inputVal);
          if (est && est.error) {
            statusEl.classList.add("error");
            statusEl.textContent = est.error;
            return;
          }
          if (est) coords = est.coords;
        }
      }
      if (coords && coords.lat === 0 && coords.lon === 0) coords = null;
      if (!coords) {
        /* geo:0,0?q=indirizzo (es. "Apri con" di Telegram): niente coordinate, solo l'indirizzo */
        const mg = String(inputVal || "").match(/geo:0,0\?q=([^&\s]+)/i);
        if (mg) {
          let ind = mg[1]; try { ind = decodeURIComponent(ind.replace(/\+/g, " ")); } catch (e) {}
          statusEl.textContent = "Il link contiene solo l'indirizzo, non le coordinate: lo cerco sulla mappa…";
          const g = await geocodeItalyPlace(ind);
          if (g) coords = g;
          else {
            statusEl.classList.add("error");
            statusEl.textContent = "Questo link contiene solo l'indirizzo (" + ind + "), senza coordinate. Seleziona il testo del messaggio e usa Condividi > FireOps, oppure incollalo: le coordinate Lat/Long sono nel testo.";
            return;
          }
        }
      }
      if (!coords || !inItaly(coords)) {
        statusEl.classList.add("error");
        statusEl.textContent = "Formato non riconosciuto o punto fuori dall'Italia. Verifica i dati inseriti.";
        return;
      }

      targetPos = coords;
      clearRoute();
      fetchTargetElevation(targetPos.lat, targetPos.lon);
      statusEl.textContent = "Elaborazione coordinate e avvio tracking GPS ...";

      startGpsTracking();

      const geoRec = await reverseGeocodeProvincia(targetPos.lat, targetPos.lon);
      statusEl.classList.add("hidden");

      if (geoRec) {
        showResult(geoRec, haversine(targetPos.lat, targetPos.lon, geoRec.lat, geoRec.lon), null, "geo");
      } else {
        const vicini = comandoPiuVicino(targetPos);
        if (!vicini) {comandiNonDisponibili(); return;}
        showResult(vicini[0].rec, vicini[0].dist, vicini.slice(1), "dist");
      }
    }

    /* anteprima: mostra subito cosa viene riconosciuto mentre si scrive o si incolla */
    document.getElementById("targetInput").addEventListener("input", function () {
      const el = document.getElementById("targetDetect");
      const v = this.value.trim();
      if (!v) { el.textContent = ""; return; }
      let c = null, err = "";
      try {
        if (v.length > 40) { const e0 = estraiCoordinateDaTesto(v); if (e0 && e0.coords) c = e0.coords; }
        if (!c) c = parseCoordinatesInput(v);
        if (!c) { const e = estraiCoordinateDaTesto(v); if (e && e.coords) c = e.coords; else if (e && e.error) err = e.error; }
      } catch (e) {}
      if (c && c.lat === 0 && c.lon === 0) c = null;
      if (/geo:0,0\?q=/i.test(v)) el.textContent = "Solo indirizzo, senza coordinate: lo cerco sulla mappa.";
      else if (c) el.textContent = "✓ Rilevato: " + c.lat.toFixed(6) + ", " + c.lon.toFixed(6) + (inItaly(c) ? "" : " (fuori dall'Italia)");
      else if (OLC_SHORT_RE.test(v)) el.textContent = "Codice OLC corto: si userà la località di riferimento.";
      else el.textContent = err || "Nessuna coordinata riconosciuta (ancora)…";
    });

    /* incollando un link o un intero messaggio nel campo, parte subito la ricerca */
    document.getElementById("targetInput").addEventListener("paste", function () {
      const el = this;
      setTimeout(function () {
        if (el.value.trim().length > 6) processTargetInput(el.value);
      }, 60);
    });

    document.getElementById("targetGoBtn").addEventListener("click", async function () {
      await processTargetInput(document.getElementById("targetInput").value);
    });

    // Gestione pulsante Incolla dagli appunti
    document.getElementById("pasteClipBtn").addEventListener("click", async function () {
      const statusEl = document.getElementById("statusMsg");
      try {
        let text = "";
        try { if (window.FireOpsAndroid && FireOpsAndroid.appunti) text = FireOpsAndroid.appunti(); } catch (e) {}
        if (!text && navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText();
        else if (!text) {
          statusEl.classList.remove("hidden");
          statusEl.classList.add("error");
          statusEl.textContent = "Lettura appunti non disponibile: tieni premuto nel campo sopra e scegli Incolla.";
          document.getElementById("targetInput").focus();
          return;
        }
        if (!text || !text.trim()) {
          statusEl.classList.remove("hidden");
          statusEl.classList.add("error");
          statusEl.textContent = "Gli appunti sono vuoti.";
          return;
        }
        document.getElementById("targetInput").value = text.trim();
        await processTargetInput(text);
      } catch (err) {
        statusEl.classList.remove("hidden");
        statusEl.classList.add("error");
        statusEl.textContent = "Impossibile leggere gli appunti: tieni premuto nel campo sopra e scegli Incolla.";
        document.getElementById("targetInput").focus();
      }
    });

    document.getElementById("locateBtn").addEventListener("click", function () {
      if (!document.getElementById("result-section").classList.contains("hidden")) { chiudiRisultato(); return; }
      azioneAttiva = "gps";
      const btn = this;
      const statusEl = document.getElementById("statusMsg");
      statusEl.classList.remove("hidden", "error");
      statusEl.textContent = "Localizzazione in corso e tracking attivo...";
      btn.classList.add("loading");
      targetPos = null;

      if (!navigator.geolocation) {
        statusEl.classList.add("error");
        statusEl.textContent = "Il dispositivo non supporta la geolocalizzazione. Cerca il comando manualmente.";
        btn.classList.remove("loading");
        return;
      }

      navigator.geolocation.getCurrentPosition(async function (pos) {
        userPos = {lat: pos.coords.latitude, lon: pos.coords.longitude};
        userAccuracy = pos.coords.accuracy;
        if (pos.coords.altitude !== null) userAltitude = pos.coords.altitude;

        startGpsTracking();

        statusEl.textContent = "Determinazione provincia di competenza...";

        const geoRec = await reverseGeocodeProvincia(userPos.lat, userPos.lon);
        btn.classList.remove("loading");
        statusEl.classList.add("hidden");

        if (geoRec) {
          showResult(geoRec, haversine(userPos.lat, userPos.lon, geoRec.lat, geoRec.lon), null, "geo");
        } else {
          const vicini = comandoPiuVicino(userPos);
          if (!vicini) {comandiNonDisponibili(); return;}
          showResult(vicini[0].rec, vicini[0].dist, vicini.slice(1), "dist");
        }
      }, function (err) {
        btn.classList.remove("loading");
        statusEl.classList.add("error");
        if (err.code === 1) statusEl.textContent = "Permesso posizione negato. Cerca il comando manualmente.";
        else if (err.code === 2) statusEl.textContent = "Posizione non disponibile. Cerca il comando manualmente.";
        else statusEl.textContent = "Localizzazione non riuscita. Cerca il comando manualmente.";
      }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
    });

    /* i tre pulsanti: aprendone uno (rosso o grigio) gli altri si chiudono e spariscono; la freccia sul pulsante aperto lo richiude */
    function aggiornaPulsanti() {
      const $ = id => document.getElementById(id);
      const risultato = !$("result-section").classList.contains("hidden");
      const coordAperto = !$("coordPanel").classList.contains("hidden");
      const cercaAperto = !$("search-section").classList.contains("hidden");
      let attivo = null;                                   // il pulsante aperto: gli altri spariscono
      if (risultato) attivo = azioneAttiva || "gps";
      else if (coordAperto) attivo = "coord";
      else if (cercaAperto) attivo = "cerca";
      const mappa = {coord: "coordBtn", gps: "locateBtn", cerca: "toggleSearchBtn"};
      const resetId = {coord: "resetCoord", gps: "resetGps", cerca: "resetCerca"};
      Object.keys(mappa).forEach(k => {
        $(mappa[k]).classList.toggle("on", attivo === k);
        $(mappa[k]).classList.toggle("hidden", !!attivo && attivo !== k);
        $(resetId[k]).classList.toggle("hidden", attivo !== k);
        const g = $({coord: "grpCoord", gps: "grpGps", cerca: "grpCerca"}[k]);
        g.classList.toggle("on", attivo === k);
        g.classList.toggle("hidden", !!attivo && attivo !== k);
      });
    }
    /* richiude il risultato (o il riquadro) e riporta i tre pulsanti */
    function chiudiRisultato() {
      if (watchId !== null) {navigator.geolocation.clearWatch(watchId); watchId = null;}
      if (trackingTimeoutId !== null) {clearTimeout(trackingTimeoutId); trackingTimeoutId = null;}
      clearRoute();
      azioneAttiva = null;
      document.getElementById("result-section").classList.add("hidden");
      document.getElementById("coordPanel").classList.add("hidden");
      document.getElementById("search-section").classList.add("hidden");
      document.getElementById("locate-section").classList.remove("hidden");
      document.getElementById("statusMsg").classList.add("hidden");
      aggiornaPulsanti();
      window.scrollTo({top: 0, behavior: "smooth"});
    }
    window.__aggiornaPulsantiLocalizzati = aggiornaPulsanti;
    /* un tasto Reset per ognuno dei tre: azzera i dati e ripropone la stessa scelta, pronta per nuovi dati */
    document.getElementById("resetCoord").addEventListener("click", function () {
      resetApp();
      document.getElementById("coordPanel").classList.remove("hidden");
      document.getElementById("targetDetect").textContent = "";
      aggiornaPulsanti();
      document.getElementById("targetInput").focus();
    });
    document.getElementById("resetCerca").addEventListener("click", function () {
      resetApp();
      document.getElementById("search-section").classList.remove("hidden");
      aggiornaPulsanti();
      mostraElenco();
    });
    document.getElementById("resetGps").addEventListener("click", function () {
      resetApp();
      document.getElementById("locateBtn").click();
    });
    document.getElementById("toggleSearchBtn").addEventListener("click", function () {
      if (!document.getElementById("result-section").classList.contains("hidden")) { chiudiRisultato(); return; }
      const sec = document.getElementById("search-section"), apri = sec.classList.contains("hidden");
      sec.classList.toggle("hidden", !apri);
      document.getElementById("coordPanel").classList.add("hidden");
      aggiornaPulsanti();
      if (apri) mostraElenco();
    });
    document.getElementById("coordBtn").addEventListener("click", function () {
      if (!document.getElementById("result-section").classList.contains("hidden")) { chiudiRisultato(); return; }
      const pn = document.getElementById("coordPanel"), apri = pn.classList.contains("hidden");
      pn.classList.toggle("hidden", !apri);
      document.getElementById("search-section").classList.add("hidden");
      aggiornaPulsanti();
      if (apri) document.getElementById("targetInput").focus();
    });

    document.getElementById("backToSearchBtn").addEventListener("click", function () {
      chiudiRisultato();
      document.getElementById("search-section").classList.remove("hidden");
      aggiornaPulsanti();
      mostraElenco();
    });

    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    /* Direzione regionale come "comando" scelto a mano: usa le coordinate del comando della sua città */
    let DIREZIONI = null;
    async function direzioni() {
      if (DIREZIONI) return DIREZIONI;
      try { DIREZIONI = await FireOps.direzioni(); } catch (e) { DIREZIONI = []; }
      return DIREZIONI;
    }
    /* elenco completo (comandi e direzioni), raggruppato per direzione; con testo nel campo si filtra */
    async function mostraElenco() {
      await comandiPronti;
      if (!COMANDI.length) {comandiNonDisponibili(); return;}
      const q = norm(searchInput.value);
      const ok = r => !q || norm(r.c).includes(q) || norm(r.cm).includes(q) || norm(r.pr).includes(q) || norm(r.rg).includes(q) || norm(r.dz).includes(q);
      const gruppi = {};
      (await direzioni()).forEach(d => { (gruppi[d.dz] = gruppi[d.dz] || {dir: d, com: []}); });
      COMANDI.forEach(r => { if (gruppi[r.dz]) gruppi[r.dz].com.push(r); });
      searchResults.innerHTML = "";
      let n = 0;
      Object.keys(gruppi).sort((a, b) => a.localeCompare(b, "it")).forEach(nome => {
        const g = gruppi[nome];
        const righe = [];
        if (ok(g.dir)) righe.push(g.dir);
        g.com.sort((a, b) => a.c.localeCompare(b.c, "it")).forEach(r => { if (ok(r)) righe.push(r); });
        if (!righe.length) return;
        const h = document.createElement("div");
        h.className = "search-grp";
        h.textContent = nome;
        searchResults.appendChild(h);
        righe.forEach(rec => {
          n++;
          const item = document.createElement("div");
          item.className = "search-item" + (rec.eDirezione ? " dir" : "");
          item.innerHTML = '<span class="sname">' + (rec.eDirezione ? "🏛 " : "") + rec.c + '</span><span class="sprov">' + rec.pr + '</span>';
          item.onclick = () => {azioneAttiva = "cerca"; selectComando(rec, userPos, targetPos); searchResults.classList.add("hidden"); searchInput.value = "";};
          searchResults.appendChild(item);
        });
      });
      searchResults.classList.toggle("hidden", !n);
      if (!n) { const e = document.createElement("div"); e.className = "search-item"; e.textContent = "Nessun comando trovato."; searchResults.appendChild(e); searchResults.classList.remove("hidden"); }
    }
    window.__mostraElencoComandi = mostraElenco;
    searchInput.addEventListener("input", mostraElenco);
  
  }
});
