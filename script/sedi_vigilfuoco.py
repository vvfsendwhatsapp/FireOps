#!/usr/bin/env python3
"""Sedi ufficiali dal sito vigilfuoco.it, una "Mappa sedi" per ogni Comando provinciale.

Per ogni Comando di db/comandi.json (sito web Comando = www.vigilfuoco.it/comando-vvf-...):
  1. pagina del Comando -> link "Mappa sedi della provincia di ...";
  2. nella pagina della mappa i punti stanno nel JSON drupalSettings.leaflet
     (nome della sede con link alla sua scheda, lat, lon).
Il tipo si ricava dal nome ("Distaccamento Volontari di ...", "Distaccamento Aeroportuale ...").
Aosta, Trento e Bolzano non hanno la pagina (corpi regionali/provinciali): restano fuori.

Uscita: db/sedi/vigilfuoco.json, letto da sedi.html per la ricerca "+ Sede".
Uso:    python script/sedi_vigilfuoco.py
"""
import html, json, os, re, sys, time, urllib.request
from datetime import datetime, timezone

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
UA = {"User-Agent": "FireOps-VVF/1.0 (+https://vvfsendwhatsapp.github.io/FireOps/)"}
RE_SETTINGS = re.compile(r'<script[^>]*data-drupal-selector="drupal-settings-json"[^>]*>(.*?)</script>', re.S)


def leggi(url):
    for tent in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if tent == 2:
                raise
            print(f"  riprovo {url}: {e}", file=sys.stderr)
            time.sleep(3)


def testo(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h or ""))).strip()


def tipo(nome):
    n = nome.lower()
    if "volontar" in n: return "volontario"
    if "aeroport" in n or "aereoport" in n: return "aeroportuale"
    if "portual" in n or "porto" in n: return "portuale"
    if "rurale" in n: return "rurale"
    if "sommozzator" in n or "nucleo sub" in n: return "sommozzatori"
    if "elicotter" in n or "reparto volo" in n: return "volo"
    if "didattic" in n or "scuola" in n: return "didattico"
    if "direzione" in n: return "direzione"
    if n.startswith("comando") or "sede centrale" in n: return "centrale"
    if "stagional" in n or "estiv" in n: return "stagionale"
    if "presidio" in n: return "presidio"
    if "distaccamento" in n: return "permanente"
    return "altro"


def comando(sigla, url):
    home = leggi(url)
    m = re.search(r'href="([^"]*mappa-sedi[^"]*)"', home)
    if not m:
        return {"sigla": sigla, "errore": "link mappa non trovato"}
    mappa = m.group(1) if m.group(1).startswith("http") else "https://www.vigilfuoco.it" + m.group(1)
    j = RE_SETTINGS.search(leggi(mappa))
    if not j:
        return {"sigla": sigla, "errore": "dati della mappa non trovati", "mappa": mappa}
    lf = json.loads(j.group(1)).get("leaflet", {})
    sedi = []
    for v in lf.values():
        for f in v.get("features", []):
            a = (f.get("popup") or {}).get("value") or f.get("title") or ""
            href = (re.search(r'href="([^"]+)"', a) or [None, ""])[1]
            nome = testo(a)
            try:
                lat, lon = float(f["lat"]), float(f["lon"])
            except (KeyError, TypeError, ValueError):
                continue
            if "associazione" in nome.lower():      # non sono sedi operative
                continue
            sedi.append({"sigla": sigla, "nome": nome, "tipo": tipo(nome), "lat": round(lat, 6), "lon": round(lon, 6),
                         "url": ("https://www.vigilfuoco.it" + href) if href.startswith("/") else href})
    return {"sigla": sigla, "mappa": mappa, "sedi": sedi}


def main():
    lst = json.load(open(os.path.join(RADICE, "db", "comandi.json"), encoding="utf-8"))
    lst = lst if isinstance(lst, list) else next(v for v in lst.values() if isinstance(v, list))
    comandi = [(c["Provincia"].strip(), c["sito web Comando"].strip()) for c in lst
               if str(c.get("CHS Comando", "")).strip() and "vigilfuoco.it/comando" in str(c.get("sito web Comando", ""))]
    out, errori = [], {}
    for sigla, url in comandi:
        try:
            r = comando(sigla, url)
        except Exception as e:
            r = {"sigla": sigla, "errore": str(e)}
        if r.get("errore"):
            errori[sigla] = r["errore"]
            print(f"{sigla}: {r['errore']}")
        else:
            out += r["sedi"]
            print(f"{sigla}: {len(r['sedi'])} sedi")
        time.sleep(0.5)
    if len(out) < 300:   # sito irraggiungibile o cambiato: non sovrascrivo un file buono con uno vuoto
        raise SystemExit(f"Solo {len(out)} sedi lette: file non aggiornato")
    dest = os.path.join(RADICE, "db", "sedi", "vigilfuoco.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump({"generato": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "fonte": "www.vigilfuoco.it - Mappa sedi dei Comandi",
                   "errori": errori, "sedi": out}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Scritte {len(out)} sedi in {dest} ({len(errori)} Comandi senza dati)")


if __name__ == "__main__":
    main()
