#!/usr/bin/env python3
"""DB sedi VVF in Italia (Trentino-Alto Adige incluso) dall'estratto OSM Geofabrik.

Niente Overpass: legge italy-latest.osm.pbf in locale.
Assegna a ogni sede regione, provincia (con sigla) e comune dai confini OSM
(admin_level 4 / 6 / 8) e scrive anche un GeoJSON per ogni provincia.

Requisiti:  osmium-tool (CLI, per il prefiltro)  +  pip install osmium shapely
Uso:        python script/sedi.py --pbf italy-latest.osm.pbf --out db/sedi

Correzioni (modulo convalida di sedi.html), applicate sopra i dati OSM:
  --correzioni-csv URL   foglio Google pubblicato in CSV                 [o variabile d'ambiente CORREZIONI_CSV]
  --correzioni-url URL   Web App Apps Script (GET) del foglio condiviso  [o variabile d'ambiente CORREZIONI_URL]
  --correzioni-dir DIR   cartella con i JSON esportati dalla pagina      [default: <out>/correzioni]

Output in --out:
  sedi_vvf.sqlite / sedi_vvf.geojson / sedi_vvf.csv   (tutte le sedi)
  province/<SIGLA>.geojson                            (una per provincia)
  province/index.json                                 (elenco province con conteggi)
"""
import argparse, csv, glob, io, json, os, re, shutil, sqlite3, subprocess, sys, tempfile, time, urllib.request

import osmium
from shapely import wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

# ---------------------------------------------------------------- prefiltro
# osmium tags-filter: case-sensitive, '*' iniziale = sottostringa. Volutamente largo:
# la selezione vera la fa e_sede() in Python.
ESPRESSIONI = """
nwr/amenity=fire_station
nwr/emergency=fire_station
nwr/building=fire_station
nwr/name=*igili del fuoco
nwr/name=*IGILI DEL FUOCO
nwr/name=*VVF
nwr/name=*vvf
nwr/name=*V.V.F
nwr/name=*euerwehr
nwr/name=*ompieri
nwr/name=*residio
nwr/name=*ortual
nwr/name=*rurale
nwr/name=*Rurale
nwr/name=*ntincendi
nwr/official_name=*igili del fuoco
nwr/operator=*igili del fuoco
nwr/operator=*IGILI DEL FUOCO
nwr/operator=*VVF
nwr/operator=*euerwehr
r/admin_level=4,6,8
"""


def prefiltra(pbf, tmpdir):
    exe = shutil.which("osmium")
    if not exe:
        print("! osmium-tool non trovato: leggo il PBF intero (lento, molta RAM)", file=sys.stderr)
        return pbf
    expr = os.path.join(tmpdir, "espressioni.txt")
    out = os.path.join(tmpdir, "filtrato.osm.pbf")
    with open(expr, "w") as f:
        f.write(ESPRESSIONI)
    t = time.time()
    subprocess.run([exe, "tags-filter", pbf, "-e", expr, "-o", out, "--overwrite"], check=True)
    print(f"Prefiltro: {os.path.getsize(out) / 1e6:.1f} MB in {time.time() - t:.0f}s")
    return out


# ---------------------------------------------------------------- selezione
RE_VVF = re.compile(r"vigili del fuoco|\bv\.?v\.?f\b|feuerwehr|pompieri|corpo nazionale", re.I)
ESCLUDI_CHIAVI = ("highway", "shop", "railway", "public_transport", "historic", "tourism",
                  "memorial", "healthcare", "leisure", "route", "natural", "waterway",
                  "boundary", "place", "power", "advertising")
ESCLUDI_AMENITY = {"restaurant", "cafe", "bar", "pub", "fast_food", "parking", "parking_space",
                   "parking_entrance", "fuel", "school", "kindergarten", "hospital", "clinic",
                   "doctors", "pharmacy", "place_of_worship", "bench", "waste_basket", "toilets",
                   "drinking_water", "fountain", "vending_machine", "grave_yard", "post_box"}
ESCLUDI_EMERGENCY = {"fire_hydrant", "fire_water_pond", "suction_point", "defibrillator",
                     "assembly_point", "fire_extinguisher", "water_tank", "access_point",
                     "phone", "siren", "life_ring", "landing_site", "lifeguard"}


def e_sede(t):
    if "fire_station" in (t.get("amenity"), t.get("emergency"), t.get("building")):
        return True
    if any(k in t for k in ESCLUDI_CHIAVI):
        return False
    if t.get("amenity") in ESCLUDI_AMENITY or t.get("emergency") in ESCLUDI_EMERGENCY:
        return False
    # senza tag fire_station serve un riferimento esplicito ai VVF nel nome/operatore:
    # "presidio", "portuale" ecc. da soli prendono ospedali e autorita' portuali.
    testo = " ".join(t.get(k, "") for k in ("name", "official_name", "operator", "short_name"))
    return bool(RE_VVF.search(testo))


def classifica(t):
    """Euristica sul nome/operatore. Da verificare a mano."""
    s = " ".join(t.get(k, "") for k in ("name", "operator", "official_name", "name:de", "short_name")).lower()
    if "volontari" in s or "freiwillige" in s:
        return "volontario"
    if "aeroport" in s or "aereoport" in s or "airport" in s:
        return "aeroportuale"
    if "portual" in s or "harbour" in s or "harbor" in s:
        return "portuale"
    if "rurale" in s:
        return "rurale"
    if "sede centrale" in s or "comando provinciale" in s or re.match(r"\s*comando\b", s):
        return "centrale"
    if "presidio" in s:
        return "presidio"
    if "berufsfeuerwehr" in s or "permanente" in s:
        return "permanente"
    if any(x in s for x in ("vigili del fuoco", "vvf", "corpo nazionale", "distaccamento", "comando")):
        return "permanente"
    return "altro"


# ---------------------------------------------------------------- lettura PBF
def leggi(path):
    fab = osmium.geom.WKBFactory()
    candidati, confini = [], {4: [], 6: [], 8: []}
    fp = osmium.FileProcessor(path).with_locations().with_areas()
    for o in fp:
        try:
            if o.is_node():
                t = dict(o.tags)
                if t and e_sede(t):
                    candidati.append(("node", o.id, t, Point(o.location.lon, o.location.lat)))
            elif o.is_area():
                t = dict(o.tags)
                if not t:
                    continue
                if t.get("boundary") == "administrative" and t.get("admin_level") in ("4", "6", "8"):
                    g = wkb.loads(fab.create_multipolygon(o), hex=True)
                    confini[int(t["admin_level"])].append((g, t))
                elif e_sede(t):
                    g = wkb.loads(fab.create_multipolygon(o), hex=True)
                    tipo = "way" if o.from_way() else "relation"
                    candidati.append((tipo, o.orig_id(), t, g))
        except Exception as e:  # geometria rotta: la salto
            print(f"! {getattr(o, 'id', '?')}: {e}", file=sys.stderr)
    return candidati, confini


def deduplica(candidati):
    """Se un nodo-sede sta dentro un poligono-sede, tengo il nodo e completo i suoi tag col poligono."""
    nodi = [c for c in candidati if c[0] == "node"]
    poli = [c for c in candidati if c[0] != "node"]
    if not nodi or not poli:
        return candidati
    albero = STRtree([c[3] for c in nodi])
    tieni = []
    for p in poli:
        dentro = [nodi[i] for i in albero.query(p[3], predicate="contains")]
        if dentro:
            for n in dentro:
                for k, v in p[2].items():
                    n[2].setdefault(k, v)
        else:
            tieni.append(p)
    return nodi + tieni


class Localizzatore:
    def __init__(self, confini):
        self.livelli = {}
        for lv, lst in confini.items():
            if lv == 4:  # solo regioni italiane (l'estratto sborda oltre confine)
                lst = [x for x in lst if x[1].get("ISO3166-2", "").startswith("IT-")]
            geoms = [g for g, _ in lst]
            self.livelli[lv] = (STRtree(geoms) if geoms else None, lst)

    def trova(self, lv, pt):
        albero, lst = self.livelli[lv]
        if albero is None:
            return None
        idx = albero.query(pt, predicate="intersects")
        if len(idx) == 0:
            return None
        return min((lst[i] for i in idx), key=lambda x: x[0].area)[1]  # il piu' piccolo se sovrapposti


def sigla(tp):
    if not tp:
        return ""
    iso = tp.get("ISO3166-2", "")
    if iso.startswith("IT-") and iso[3:].isalpha():
        return iso[3:]
    ref = tp.get("ref", "")
    return ref if ref.isalpha() and len(ref) == 2 else ""


def nome_it(t):
    return t.get("name:it") or t.get("name", "") if t else ""


# ---------------------------------------------------------------- output
def posizione(loc, pt):
    """regione/provincia/sigla/comune dai confini OSM; None se fuori Italia."""
    reg = loc.trova(4, pt)
    if reg is None:
        return None
    prov, com = loc.trova(6, pt), loc.trova(8, pt)
    if prov is None and reg.get("ISO3166-2") == "IT-23":   # la Valle d'Aosta non ha provincia in OSM
        prov = {"name": "Aosta", "ref": "AO"}
    return {"regione": nome_it(reg), "provincia": nome_it(prov), "sigla": sigla(prov), "comune": nome_it(com)}


VUOTI = {"convalidata": 0, "stato": "", "convalida_utente": "", "convalida_data": "", "note": ""}


def costruisci(candidati, loc):
    righe, fuori = [], 0
    for tipo, oid, t, g in candidati:
        pt = g if g.geom_type == "Point" else g.representative_point()
        pos = posizione(loc, pt)
        if pos is None:
            fuori += 1
            continue
        righe.append({
            "osm_type": tipo, "osm_id": oid,
            "nome": t.get("name") or t.get("official_name") or "",
            "operatore": t.get("operator", ""),
            "tipo": classifica(t),
            "regione": pos["regione"], "provincia": pos["provincia"], "sigla": pos["sigla"],
            "comune": pos["comune"] or t.get("addr:city", ""),
            "via": " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x),
            "cap": t.get("addr:postcode", ""),
            "telefono": t.get("phone") or t.get("contact:phone") or "",
            "sito": t.get("website") or t.get("contact:website") or "",
            "lat": round(pt.y, 6), "lon": round(pt.x, 6),
            **VUOTI,
            "tags": json.dumps(t, ensure_ascii=False, sort_keys=True),
        })
    return righe, fuori


# ---------------------------------------------------------------- correzioni
STATI_OK = {"convalidata", "da_correggere", "non_vvf", "chiusa", "nuova"}
TIPI_OK = {"centrale", "permanente", "volontario", "aeroportuale", "portuale", "rurale", "presidio", "altro"}


def leggi_correzioni(url, cartella, csv_url=""):
    tutte = []
    if csv_url:
        req = urllib.request.Request(csv_url, headers={"User-Agent": "FireOps-sedi/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:   # il link pubblicato fa redirect: urllib lo segue
            testo = r.read().decode("utf-8-sig")
        if testo.lstrip().startswith("<"):
            raise RuntimeError("il link CSV restituisce una pagina HTML: il foglio e' pubblicato in CSV?")
        lst = [x for x in csv.DictReader(io.StringIO(testo)) if (x.get("chiave") or "").strip()]
        tutte += lst
        print(f"Correzioni dal foglio (CSV pubblicato): {len(lst)}")
    if url:
        req = urllib.request.Request(url, headers={"User-Agent": "FireOps-sedi/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:   # Apps Script risponde con redirect: urllib lo segue
            j = json.load(r)
        if not j.get("ok"):
            raise RuntimeError(f"Apps Script: {j}")
        tutte += j.get("correzioni", [])
        print(f"Correzioni dal foglio: {len(j.get('correzioni', []))}")
    for f in sorted(glob.glob(os.path.join(cartella, "*.json"))):
        with open(f, encoding="utf-8") as fh:
            lst = json.load(fh)
        tutte += lst if isinstance(lst, list) else lst.get("correzioni", [])
        print(f"Correzioni da {f}: {len(lst)}")
    # stessa correzione presente sia nel foglio sia in un file: tengo una sola copia (per id)
    viste, uniche = set(), []
    for c in tutte:
        k = c.get("id") or json.dumps(c, sort_keys=True)
        if k not in viste:
            viste.add(k); uniche.append(c)
    uniche.sort(key=lambda c: str(c.get("timestamp", "")))
    ultima = {}
    for c in uniche:                       # vince l'ultima correzione per ogni sede
        if c.get("chiave") and c.get("stato") in STATI_OK:
            ultima[c["chiave"]] = c
    return ultima


def applica_correzioni(righe, ultima, loc):
    per_chiave = {f"{r['osm_type']}/{r['osm_id']}": r for r in righe}
    province = {}                            # sigla -> (provincia, regione), dai dati OSM
    for r in righe:
        if r["sigla"] and r["sigla"] not in province:
            province[r["sigla"]] = (r["provincia"], r["regione"])
    usate, scartate, nuove, orfane = 0, 0, 0, 0
    for chiave, c in ultima.items():
        r = per_chiave.get(chiave)
        if r is None:
            if not chiave.startswith("nuova/"):
                orfane += 1                # sede sparita da OSM: la correzione resta nel foglio, qui non serve
                continue
            r = {"osm_type": "nuova", "osm_id": chiave.split("/", 1)[1], "nome": "", "operatore": "", "tipo": "altro",
                 "regione": "", "provincia": "", "sigla": "", "comune": "", "via": "", "cap": "", "telefono": "",
                 "sito": "", "lat": 0.0, "lon": 0.0, **VUOTI, "tags": "{}"}
            per_chiave[chiave] = r; righe.append(r); nuove += 1
        for k in ("nome", "comune", "via", "telefono"):
            if str(c.get(k, "")).strip():
                r[k] = str(c[k]).strip()
        if c.get("tipo") in TIPI_OK:
            r["tipo"] = c["tipo"]
        try:
            lat, lon = float(c.get("lat") or "x"), float(c.get("lon") or "x")
        except ValueError:
            lat = lon = None
        if lat is not None:
            r["lat"], r["lon"] = round(lat, 6), round(lon, 6)
            pos = posizione(loc, Point(lon, lat))
            if pos:
                r.update({k: v for k, v in pos.items() if v and not (k == "comune" and str(c.get("comune", "")).strip())})
        # provincia corretta a mano (es. distaccamento che dipende da un altro Comando): vince sui confini OSM
        sg = str(c.get("sigla_corretta") or "").strip().upper()
        if sg and sg in province:
            r["sigla"], r["provincia"], r["regione"] = sg, province[sg][0], province[sg][1]
        r["stato"] = c["stato"]
        # flag separato: 1 = controllata e confermata da un operatore (convalidata o inserita a mano)
        r["convalidata"] = 1 if c["stato"] in ("convalidata", "nuova") else 0
        r["convalida_utente"] = str(c.get("utente", ""))
        r["convalida_data"] = str(c.get("timestamp", ""))[:19]
        r["note"] = str(c.get("note", ""))
        usate += 1
    # tolgo le scartate e le sedi aggiunte a mano finite fuori dall'Italia (nessuna regione)
    tenute = [r for r in righe if r["stato"] not in ("non_vvf", "chiusa") and r["lat"]
              and (r["osm_type"] != "nuova" or r["regione"])]
    scartate = len(righe) - len(tenute)
    print(f"Correzioni applicate: {usate} (nuove sedi: {nuove}, tolte non VVF/chiuse: {scartate}, "
          f"riferite a sedi non piu' in OSM: {orfane})")
    return tenute


def geojson(righe):
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
         "properties": {k: v for k, v in r.items() if k not in ("lat", "lon", "tags")}} for r in righe]}


def scrivi(righe, outdir):
    os.makedirs(outdir, exist_ok=True)
    base = os.path.join(outdir, "sedi_vvf")
    cols = list(righe[0].keys())

    tmp = base + ".sqlite.tmp"
    if os.path.exists(tmp):
        os.remove(tmp)
    db = sqlite3.connect(tmp)
    db.execute("CREATE TABLE sedi (%s, PRIMARY KEY (osm_type, osm_id))" % ", ".join(cols))
    db.executemany("INSERT INTO sedi VALUES (%s)" % ",".join("?" * len(cols)),
                   [tuple(r[c] for c in cols) for r in righe])
    db.execute("CREATE INDEX idx_prov ON sedi(sigla, tipo)")
    db.execute("CREATE INDEX idx_reg ON sedi(regione)")
    db.execute("CREATE INDEX idx_pos ON sedi(lat, lon)")
    db.execute("CREATE INDEX idx_conv ON sedi(convalidata)")
    db.commit(); db.close()
    os.replace(tmp, base + ".sqlite")

    with open(base + ".csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[c for c in cols if c != "tags"], extrasaction="ignore")
        w.writeheader(); w.writerows(righe)
    with open(base + ".geojson", "w", encoding="utf-8") as f:
        json.dump(geojson(righe), f, ensure_ascii=False)
    # solo le sedi controllate da un operatore (flag convalidata = 1)
    with open(base + "_convalidate.geojson", "w", encoding="utf-8") as f:
        json.dump(geojson([r for r in righe if r.get("convalidata")]), f, ensure_ascii=False)

    pdir = os.path.join(outdir, "province")
    if os.path.isdir(pdir):
        shutil.rmtree(pdir)
    os.makedirs(pdir)
    per_prov = {}
    for r in righe:
        per_prov.setdefault(r["sigla"] or "XX", []).append(r)
    indice = []
    for s, lst in sorted(per_prov.items()):
        with open(os.path.join(pdir, f"{s}.geojson"), "w", encoding="utf-8") as f:
            json.dump(geojson(lst), f, ensure_ascii=False)
        indice.append({"sigla": s, "provincia": lst[0]["provincia"], "regione": lst[0]["regione"],
                       "sedi": len(lst), "convalidate": sum(1 for r in lst if r.get("convalidata")),
                       "file": f"province/{s}.geojson"})
    with open(os.path.join(pdir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)
    return len(per_prov)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True, help="estratto Geofabrik, es. italy-latest.osm.pbf")
    ap.add_argument("--out", default="db/sedi")
    ap.add_argument("--min", type=int, default=500, help="sotto questo numero di sedi non scrive nulla (protezione)")
    ap.add_argument("--correzioni-csv", default=os.environ.get("CORREZIONI_CSV", ""),
                    help="URL del foglio Google pubblicato in CSV (File > Condividi > Pubblica sul web)")
    ap.add_argument("--correzioni-url", default=os.environ.get("CORREZIONI_URL", ""),
                    help="in alternativa: URL /exec della Web App Apps Script")
    ap.add_argument("--correzioni-dir", default=None)
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        t = time.time()
        src = prefiltra(args.pbf, tmp)
        candidati, confini = leggi(src)
    print(f"Letti {len(candidati)} candidati, confini: "
          + ", ".join(f"liv.{k}={len(v)}" for k, v in confini.items()) + f" ({time.time() - t:.0f}s)")

    candidati = deduplica(candidati)
    loc = Localizzatore(confini)
    righe, fuori = costruisci(candidati, loc)
    senza_prov = sum(1 for r in righe if not r["sigla"])
    print(f"Sedi in Italia: {len(righe)}  (scartate fuori confine: {fuori}, senza provincia: {senza_prov})")

    if len(righe) < args.min:
        sys.exit(f"Solo {len(righe)} sedi (< {args.min}): qualcosa non va, non scrivo niente.")
    cdir = args.correzioni_dir or os.path.join(args.out, "correzioni")
    try:
        righe = applica_correzioni(righe, leggi_correzioni(args.correzioni_url, cdir, args.correzioni_csv), loc)
    except Exception as e:   # il foglio non risponde: scrivo comunque i dati OSM, ma lo segnalo forte
        print(f"::warning::Correzioni NON applicate: {e}")
    righe.sort(key=lambda r: (r["regione"], r["sigla"], r["comune"], r["nome"]))
    n = scrivi(righe, args.out)
    tipi = {}
    for r in righe:
        tipi[r["tipo"]] = tipi.get(r["tipo"], 0) + 1
    conv = sum(1 for r in righe if r.get("convalidata"))
    print(f"Scritto {args.out}: {len(righe)} sedi ({conv} convalidate, {len(righe) - conv} da controllare), "
          f"{n} province. Tipi: {tipi}")


if __name__ == "__main__":
    main()