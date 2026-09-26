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
      min-height: 100vh;
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
      padding: 16px 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
}
.pg-localizzati .result-top .name {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: .2px;
}
.pg-localizzati .result-top .dist {
      text-align: right;
      font-family: var(--mono);
      font-size: 15px;
      color: var(--red);
      white-space: nowrap;
}
.pg-localizzati .result-top .dist .leg {
      display: block;
      margin-bottom: 3px;
      font-family: var(--sans);
      font-size: 11.5px;
      color: var(--text-dim);
}
.pg-localizzati .result-top .dist .val {
      display: block;
}
.pg-localizzati .result-top .dist .az {
      display: block;
      margin-top: 3px;
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
      max-height: 280px;
      overflow-y: auto;
}
.pg-localizzati .search-item {
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
.pg-localizzati .map-wrap {
      position: relative;
}
.pg-localizzati #resultMap {
      width: 100%;
      height: 220px;
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
.pg-localizzati .route-info {
      margin: 8px 14px 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-dim);
}
.pg-localizzati .route-info strong {
      color: var(--text);
}
.pg-localizzati .route-info.error {
      color: #e8734a;
}
.pg-localizzati .result-name-wrap {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 12px;
      min-width: 0;
}
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
      <button class="locate-btn" id="locateBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.2" stroke="white" stroke-width="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" stroke-width="2" stroke-linecap="round" />
        </svg>
        Trova la mia posizione
      </button>

      <div class="panel" style="margin-top: 10px;">
        <div class="row-group-label target">Inserisci coordinate, OLC o link Maps</div>
        <div class="target-input-box">
          <div class="target-input-row">
            <input type="text" id="targetInput" placeholder="es. 44.48, 11.35, UTM, DMS o OLC...">
            <button type="button" class="target-go-btn" id="targetGoBtn">Vai</button>
          </div>
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

      <button class="link-btn" id="toggleSearchBtn">oppure cerca un comando manualmente</button>
      <div class="status-msg hidden" id="statusMsg"></div>
    </section>

    <section id="search-section" class="hidden">
      <div class="search-wrap">
        <input type="text" class="search-input" id="searchInput" placeholder="Cerca per comando o comune...">
        <div class="search-results hidden" id="searchResults"></div>
      </div>
    </section>

    <section id="result-section" class="hidden">
      <!-- Pannello coordinate Target (se inserito) -->
      <div class="panel side-tgt hidden" id="targetInfoPanel">
        <div class="row-group-label target">Punto Target / Evento</div>
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
          <button type="button" id="routeFoot" class="route-btn foot">🥾 Mostra a piedi</button>
          <button type="button" id="routeCar" class="route-btn car">🚗 Mostra in auto</button>
        </div>
        <div class="route-info hidden" id="routeInfo"></div>
        <button type="button" id="openMapsTarget" class="maps-btn target">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          Naviga al target con Google Maps
        </button>
      </div>

      <div class="panel">
        <div class="map-wrap">
          <div id="resultMap"></div>
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
          <span><i class="dot-comando"></i>Comando</span>
          <span id="legendUser" class="hidden"><i class="dot-user"></i>La tua posizione</span>
          <span id="legendTarget" class="hidden"><i class="dot-target"></i>Target</span>
        </div>
      </div>

      <!-- Pannello coordinate GPS rilevate -->
      <div class="panel side-gps hidden" id="gpsInfoPanel">
        <div class="row-group-label gps">Posizione GPS rilevata</div>
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
      </div>

      <div class="panel cmd-panel">
        <div class="result-top">
          <div class="result-name-wrap">
            <div class="name" id="rComando">—</div>
            <button type="button" id="navToComando" class="nav-cmd-btn" title="Naviga alla sede del Comando">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z" />
              </svg>
              Naviga al Comando
            </button>
          </div>
          <div class="dist" id="rDist"></div>
        </div>
        <div class="result-addr" id="rCmdAddr"></div>
        <div class="result-sub" id="rSub"></div>
        <div class="method-badge" id="rMethod"></div>
        <div class="data-row">
          <div class="label">Canale radio Comando</div>
          <div class="value"><span id="rRadioComando">—</span></div>
        </div>
        <div class="data-row">
          <div class="label">Canale radio Direzione reg.</div>
          <div class="value"><span id="rRadioDirezione">—</span></div>
        </div>
        <div class="data-row">
          <div class="label">SO Comando</div>
          <div class="value" id="rTelComandoWrap">—</div>
        </div>
        <div class="data-row">
          <div class="label">SO Direzione reg.</div>
          <div class="value" id="rTelDirezioneWrap">—</div>
        </div>
        <div class="cmd-conf hidden" id="confinantiPanel">
          <div class="cmd-conf-label">Comandi confinanti</div>
          <div class="chips" id="confinantiChips"></div>
        </div>
      </div>

      <div class="border-note hidden" id="borderNote"></div>

      <button class="link-btn" id="backToSearchBtn">cerca un altro comando</button>
    </section>

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
    // Leaflet serve solo qui: si carica alla prima apertura del modulo.
    // Se la rete non lo fornisce il modulo funziona lo stesso, senza mappa.
    try {
      await Promise.all([
        FireOps.carica("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"),
        FireOps.carica("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js")
      ]);
    } catch (e) {
      console.warn("Leaflet non disponibile: mappa disattivata.", e);
    }

    // ---- Elenco comandi: condiviso dall'app (db/comandi.json, caricato una volta sola) ----
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

    function refreshPhoneLinks() {
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

    function comandoIcon() {
      const svg = '<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="3" y="3" width="18" height="18" transform="rotate(45 12 12)" fill="#000000" stroke="#ffd700" stroke-width="2.5"/>'
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
      if (!mapEl || typeof L === "undefined") return;

      if (!map) {
        map = L.map("resultMap", {attributionControl: true, zoomControl: true, maxZoom: 19});

        const baseLayers = {
          "Stradale": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          }),
          "Topografica": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            maxNativeZoom: 17,
            subdomains: "abc",
            attribution: 'Dati &copy; OpenStreetMap contributors, SRTM | Stile &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)'
          }),
          "Satellite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            maxZoom: 19,
            attribution: 'Immagini &copy; Esri, Maxar, Earthstar Geographics'
          })
        };

        // Ricorda l'ultima scelta (se lo storage non è disponibile, parte "Stradale")
        let saved = "Stradale";
        try {saved = localStorage.getItem("fireops_basemap") || "Stradale";} catch (e) { }
        if (!baseLayers[saved]) saved = "Stradale";
        baseLayers[saved].addTo(map);

        L.control.layers(baseLayers, null, {position: "topleft", collapsed: true}).addTo(map);

        radioCtrl = L.control({position: "bottomleft"});
        radioCtrl.onAdd = function () {
          const d = L.DomUtil.create("div", "map-radio");
          L.DomEvent.disableClickPropagation(d);
          return d;
        };
        radioCtrl.addTo(map);

        map.on("zoomend moveend resize", drawHeadingRay);

        map.on("baselayerchange", function (e) {
          try {localStorage.setItem("fireops_basemap", e.name);} catch (err) { }
        });
      }

      if (comandoMarker) {map.removeLayer(comandoMarker); comandoMarker = null;}
      if (userMarker) {map.removeLayer(userMarker); userMarker = null;}
      if (targetMarker) {map.removeLayer(targetMarker); targetMarker = null;}
      linkLines.forEach(l => map.removeLayer(l));
      linkLines = [];

      radioCtrl.getContainer().innerHTML =
        "<b>" + record.c + "</b><br>📻 Comando <span class='ch'>" + (record.rc || "—") +
        "</span> · DR <span class='ch'>" + (record.rd || "—") + "</span>";

      comandoMarker = L.marker([record.lat, record.lon], {icon: comandoIcon()})
        .addTo(map)
        .bindPopup("Comando " + record.c);

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

        const l1 = L.polyline([[pos.lat, pos.lon], [record.lat, record.lon]], {
          color: "#ffd700", weight: 2.5, dashArray: "4,6", opacity: 0.85
        }).addTo(map);
        lineLabel(l1, pos, record, "cmd-me");          // mia pos. -> Comando
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

      if (boundsArray.length > 1) {
        map.fitBounds(L.latLngBounds(boundsArray), {padding: [40, 40], maxZoom: 16});
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

    function showResult(record, distanceKm, nearbyList, method) {
      currentRecord = record;
      document.getElementById("locate-section").classList.add("hidden");
      document.getElementById("search-section").classList.add("hidden");
      document.getElementById("result-section").classList.remove("hidden");

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
      document.getElementById("rDist").textContent = (distanceKm != null) ? fmtDist(distanceKm) : "";
      document.getElementById("rSub").textContent = record.rg + " · Direzione regionale " + record.dz;

      document.getElementById("rRadioComando").textContent = record.rc || "—";
      document.getElementById("rRadioDirezione").textContent = record.rd || "—";

      const tsc = document.getElementById("rTelComandoWrap");
      tsc.innerHTML = record.tsc
        ? '<a class="value-link" href="' + telHref(record.tsc) + '">' + record.tsc + PHONE_SVG + '</a>'
        : "—";
      const tsd = document.getElementById("rTelDirezioneWrap");
      tsd.innerHTML = record.tsd
        ? '<a class="value-link" href="' + telHref(record.tsd) + '">' + record.tsd + PHONE_SVG + '</a>'
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

        if (newAcc <= bestAccuracy) {
          bestAccuracy = newAcc;
          userPos = {lat: pos.coords.latitude, lon: pos.coords.longitude};
          userAccuracy = newAcc;
          if (newAlt !== null) userAltitude = newAlt;

          const rs = document.getElementById("result-section");
          if (!rs.classList.contains("hidden")) {
            document.getElementById("gpsInfoPanel").classList.remove("hidden");
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

      trackingTimeoutId = setTimeout(function () {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      }, 60000);
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

    function clearRoute() {
      if (routeLayer && map) map.removeLayer(routeLayer);
      routeLayer = null;
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

    async function showRoute(profile, color, modeLabel) {
      const info = document.getElementById("routeInfo");
      const btns = [document.getElementById("routeFoot"), document.getElementById("routeCar")];
      info.classList.remove("hidden", "error");

      if (!targetPos) return;
      if (!userPos) {
        info.classList.add("error");
        info.textContent = "Posizione GPS non ancora ricevuta: attendi la lettura o usa \"Aggiorna posizione\".";
        return;
      }

      btns.forEach(b => b.disabled = true);
      info.textContent = "Calcolo del percorso " + modeLabel + "…";

      try {
        const url = "https://brouter.de/brouter?lonlats=" +
          userPos.lon.toFixed(6) + "," + userPos.lat.toFixed(6) + "|" +
          targetPos.lon.toFixed(6) + "," + targetPos.lat.toFixed(6) +
          "&profile=" + profile + "&alternativeidx=0&format=geojson";

        const ctrl = new AbortController();
        const tmo = setTimeout(() => ctrl.abort(), 20000);
        const r = await fetch(url, {signal: ctrl.signal});
        clearTimeout(tmo);
        if (!r.ok) {
          const msg = (await r.text()).trim().slice(0, 120);
          throw new Error(msg || ("http " + r.status));
        }
        const data = await r.json();
        const feat = data.features && data.features[0];
        if (!feat) throw new Error("nessun percorso");

        const p = feat.properties || {};
        const coords = feat.geometry.coordinates.map(c => [c[1], c[0]]);

        if (routeLayer && map) map.removeLayer(routeLayer);
        routeLayer = L.polyline(coords, {color: color, weight: 5, opacity: 0.9}).addTo(map);
        map.fitBounds(routeLayer.getBounds(), {padding: [40, 40]});
        document.getElementById("resultMap").scrollIntoView({behavior: "smooth", block: "center"});

        const km = (parseFloat(p["track-length"]) / 1000).toFixed(1);
        const asc = p["filtered ascend"] != null ? Math.round(parseFloat(p["filtered ascend"])) : null;
        info.innerHTML = "<strong>" + modeLabel + "</strong>: " + km + " km · " +
          fmtDuration(parseFloat(p["total-time"])) +
          (asc != null ? " · dislivello +" + asc + " m" : "") +
          "<br>Calcolato da BRouter alle " +
          new Date().toLocaleTimeString("it-IT", {hour: "2-digit", minute: "2-digit"}) +
          ", senza traffico.";
      } catch (e) {
        info.classList.add("error");
        info.textContent = "Percorso non disponibile (" + (e.name === "AbortError" ? "tempo scaduto" : e.message) + ").";
      } finally {
        btns.forEach(b => b.disabled = false);
      }
    }

    document.getElementById("routeFoot").addEventListener("click", function () {
      showRoute("hiking-mountain", "#3fa66b", "A piedi");
    });
    document.getElementById("routeCar").addEventListener("click", function () {
      showRoute("car-fast", "#29a9eb", "In auto");
    });
    document.getElementById("navToComando").addEventListener("click", function () {
      if (!currentRecord) return;
      const url = "https://www.google.com/maps/dir/?api=1&destination=" +
        currentRecord.lat.toFixed(6) + "," + currentRecord.lon.toFixed(6) +
        "&travelmode=driving&dir_action=navigate";
      window.open(url, "_blank", "noopener");
    });

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
      document.getElementById("locate-section").classList.remove("hidden");
      window.scrollTo({top: 0, behavior: "smooth"});
    }

    FireOps.onLogo("localizzati", resetApp);
    FireOps.onShow("localizzati", function () {if (map) setTimeout(function () {map.invalidateSize();}, 60);});

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

    async function processTargetInput(inputVal) {
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
        coords = parseCoordinatesInput(inputVal);
      }
      if (!coords || !inItaly(coords)) {
        statusEl.classList.add("error");
        statusEl.textContent = "Formato non riconosciuto o punto fuori dall'Italia. Verifica i dati inseriti.";
        return;
      }

      targetPos = coords;
      clearRoute();
      fetchTargetElevation(targetPos.lat, targetPos.lon);
      statusEl.textContent = "Elaborazione coordinate e avvio tracking GPS (1 min)...";

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

    document.getElementById("targetGoBtn").addEventListener("click", async function () {
      await processTargetInput(document.getElementById("targetInput").value);
    });

    // Gestione pulsante Incolla dagli appunti
    document.getElementById("pasteClipBtn").addEventListener("click", async function () {
      const statusEl = document.getElementById("statusMsg");
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          statusEl.classList.remove("hidden");
          statusEl.classList.add("error");
          statusEl.textContent = "La lettura degli appunti non è supportata da questo browser.";
          return;
        }
        const text = await navigator.clipboard.readText();
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
        statusEl.textContent = "Impossibile accedere agli appunti. Concedi i permessi al browser.";
      }
    });

    document.getElementById("locateBtn").addEventListener("click", function () {
      const btn = this;
      const statusEl = document.getElementById("statusMsg");
      statusEl.classList.remove("hidden", "error");
      statusEl.textContent = "Localizzazione in corso e tracking attivo per 1 min...";
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

    document.getElementById("toggleSearchBtn").addEventListener("click", function () {
      document.getElementById("search-section").classList.remove("hidden");
      document.getElementById("searchInput").focus();
    });

    document.getElementById("backToSearchBtn").addEventListener("click", function () {
      if (watchId !== null) {navigator.geolocation.clearWatch(watchId); watchId = null;}
      if (trackingTimeoutId !== null) {clearTimeout(trackingTimeoutId); trackingTimeoutId = null;}
      clearRoute();
      document.getElementById("result-section").classList.add("hidden");
      document.getElementById("locate-section").classList.remove("hidden");
      document.getElementById("search-section").classList.remove("hidden");
      document.getElementById("searchInput").focus();
    });

    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    searchInput.addEventListener("input", async function () {
      const q = norm(this.value);
      if (q.length < 2) {searchResults.classList.add("hidden"); searchResults.innerHTML = ""; return;}
      await comandiPronti;
      if (!COMANDI.length) {comandiNonDisponibili(); return;}
      const matches = COMANDI.filter(r => norm(r.c).includes(q) || norm(r.cm).includes(q) || norm(r.pr).includes(q)).slice(0, 8);
      searchResults.innerHTML = "";
      if (!matches.length) {searchResults.classList.add("hidden"); return;}
      searchResults.classList.remove("hidden");
      matches.forEach(rec => {
        const item = document.createElement("div");
        item.className = "search-item";
        item.innerHTML = '<span class="sname">' + rec.c + '</span><span class="sprov">' + rec.pr + ' · ' + rec.rg + '</span>';
        item.onclick = () => {selectComando(rec, userPos, targetPos); searchResults.classList.add("hidden"); searchInput.value = "";};
        searchResults.appendChild(item);
      });
    });
  
  }
});