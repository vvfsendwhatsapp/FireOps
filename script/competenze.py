#!/usr/bin/env python3
"""Zone di competenza delle sedi VVF fino alla 6a competenza, su strada.

Per ogni provincia indicata in db/competenze/config.json:
  1. confine della provincia e dei suoi comuni dall'estratto OSM (admin_level 6 e 8);
  2. griglia esagonale H3 sul territorio (risoluzione 8 = celle da ~0,7 km2);
  3. sedi candidate = sedi della provincia + sedi delle province vicine entro
     raggio_esterni_km dal confine (da db/sedi, con le correzioni del foglio);
  4. tempo di percorrenza su strada sede -> centro cella con OSRM (tabella);
  5. tempo di arrivo = tempo di uscita della sede (per tipo) + percorrenza x fattore_mezzo;
  6. per ogni cella le prime 6 sedi in ordine di tempo di arrivo.

Senza --osrm il calcolo usa la linea d'aria (x 1,35 a 50 km/h): serve solo per prove.

Requisiti:  pip install osmium shapely h3
Uso:        python script/competenze.py --pbf area.osm.pbf --osrm http://localhost:5000

Output in --out (default db/competenze):
  <SIGLA>.json          dati compatti per competenze/index.html
  <SIGLA>_celle.csv     una riga per cella con le 6 competenze (per Excel / QGIS)
  index.json            elenco province calcolate
"""
import argparse, csv, glob, io, json, math, os, re, sys, time, urllib.error, urllib.request
from datetime import datetime, timezone

import h3
from shapely.geometry import Point, shape, mapping
from shapely.ops import unary_union
from shapely.strtree import STRtree

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
N_COMPETENZE = 6


# ---------------------------------------------------------------- utilita'
def km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def leggi_json(p, default=None):
    if not os.path.exists(p):
        return default
    with open(p, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- confini
def leggi_confini(pbf, sigle):
    """Restituisce {sigla: (poligono provincia, [(poligono comune, nome, istat)])} dall'estratto OSM."""
    import osmium
    from shapely import wkb

    iso = {f"IT-{s}": s for s in sigle}
    prov, comuni = {}, []
    fab = osmium.geom.WKBFactory()

    class H(osmium.SimpleHandler):
        def area(self, a):
            t = a.tags
            if t.get("boundary") != "administrative":
                return
            lv = t.get("admin_level")
            if lv not in ("6", "8"):
                return
            try:
                g = wkb.loads(fab.create_multipolygon(a), hex=True)
            except Exception as e:
                print(f"! confine {t.get('name')}: {e}", file=sys.stderr)
                return
            if lv == "6" and t.get("ISO3166-2") in iso:
                prov[iso[t["ISO3166-2"]]] = g
            elif lv == "8":
                comuni.append((g, t.get("name:it") or t.get("name", ""), t.get("ref:ISTAT", "")))

    H().apply_file(pbf, locations=True, idx="flex_mem")
    mancano = [s for s in sigle if s not in prov]
    if mancano:
        raise SystemExit(f"Confine non trovato nell'estratto per: {', '.join(mancano)} (manca ISO3166-2=IT-xx?)")
    out = {}
    for s, g in prov.items():
        dentro = [c for c in comuni if g.contains(c[0].representative_point())]
        out[s] = (g, dentro)
        print(f"{s}: confine ok, {len(dentro)} comuni")
    return out


def confini_da_geojson(path, sigla):
    """Per le prove senza estratto OSM: un GeoJSON col poligono della provincia (ed eventuali comuni con properties.nome)."""
    gj = leggi_json(path)
    feats = gj["features"] if gj.get("type") == "FeatureCollection" else [gj]
    prov = [shape(f["geometry"]) for f in feats if f.get("properties", {}).get("livello", "provincia") == "provincia"]
    com = [(shape(f["geometry"]), f["properties"].get("nome", ""), f["properties"].get("istat", ""))
           for f in feats if f.get("properties", {}).get("livello") == "comune"]
    return {sigla: (unary_union(prov), com)}


# ---------------------------------------------------------------- sedi
NOME_TIPO = {
    "centrale": "Sede centrale", "permanente": "Distaccamento", "volontario": "Distaccamento volontario",
    "aeroportuale": "Distaccamento aeroportuale", "portuale": "Distaccamento portuale", "rurale": "Presidio rurale",
    "stagionale": "Sede stagionale", "presidio": "Presidio", "altro": "Sede",
}
GENERICI = re.compile(r"^(vigili del fuoco|vvf|v\.v\.f\.?|caserma( dei)? (vigili del fuoco|pompieri)|pompieri|"
                      r"vigili del fuoco volontari|distaccamento( vvf| vigili del fuoco)?)$", re.I)
SCARTA = re.compile(r"terreno|futur[ao]|ipotetic|in costruzione|dismess", re.I)


def nome_auto(tipo, comune):
    base = "Vigili del fuoco - " + NOME_TIPO.get(tipo, "Sede")
    return f"{base} di {comune}" if comune else base


def leggi_sedi(cartella_sedi):
    """Sedi da db/sedi/sedi_vvf.csv, con sopra le correzioni piu' recenti: quelle esportate in
    db/sedi/correzioni/*.json e quelle del foglio condiviso (CORREZIONI_CSV), cosi' una sede
    convalidata o aggiunta in sedi.html conta subito, senza aspettare il giro del DB sedi."""
    with open(os.path.join(cartella_sedi, "sedi_vvf.csv"), encoding="utf-8") as f:
        righe = list(csv.DictReader(f))
    righe = applica_correzioni(righe, os.path.join(cartella_sedi, "correzioni"), os.environ.get("CORREZIONI_CSV", ""))
    sedi = []
    for r in righe:
        try:
            lat, lon = float(r["lat"]), float(r["lon"])
        except (TypeError, ValueError):
            continue
        if r.get("stato") in ("chiusa", "non_vvf"):
            continue
        tipo = r.get("tipo") or "altro"
        nome = (r.get("nome") or "").strip()
        if SCARTA.search(nome):
            continue
        if not nome or GENERICI.match(nome):
            nome = nome_auto(tipo, r.get("comune") or "")
        sedi.append({"chiave": f"{r['osm_type']}/{r['osm_id']}", "nome": nome, "tipo": tipo,
                     "sigla": r.get("sigla") or "", "comune": r.get("comune") or "", "lat": lat, "lon": lon})
    return sedi


def leggi_foglio(url):
    """Correzioni dal foglio Google pubblicato in CSV (stesso link del workflow del DB sedi)."""
    if not url:
        return []
    req = urllib.request.Request(url, headers={"User-Agent": "FireOps-competenze/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        testo = r.read().decode("utf-8-sig")
    if testo.lstrip().startswith("<"):
        raise SystemExit("CORREZIONI_CSV restituisce una pagina HTML: il foglio e' pubblicato in CSV?")
    lst = [x for x in csv.DictReader(io.StringIO(testo)) if (x.get("chiave") or "").strip()]
    print(f"Correzioni dal foglio: {len(lst)}")
    return lst


def applica_correzioni(righe, cartella, url_foglio=""):
    corr = []
    for f in sorted(glob.glob(os.path.join(cartella, "*.json"))):
        lst = leggi_json(f, [])
        corr += lst if isinstance(lst, list) else lst.get("correzioni", [])
    corr += leggi_foglio(url_foglio)
    # stessa correzione nel foglio e in un file: una sola copia (per id)
    viste, uniche = set(), []
    for c in corr:
        k = c.get("id") or json.dumps(c, sort_keys=True)
        if k not in viste:
            viste.add(k); uniche.append(c)
    corr = [c for c in uniche if not str(c.get("chiave", "")).startswith("comando/")]   # flag "Comando concluso" di sedi.html
    corr.sort(key=lambda c: str(c.get("timestamp", "")))
    ultima = {c["chiave"]: c for c in corr if c.get("chiave")}       # vince l'ultima per sede
    per_chiave = {f"{r['osm_type']}/{r['osm_id']}": r for r in righe}
    for chiave, c in ultima.items():
        r = per_chiave.get(chiave)
        if r is None:
            if not chiave.startswith("nuova/"):
                continue
            r = {"osm_type": "nuova", "osm_id": chiave.split("/", 1)[1], "nome": "", "tipo": "altro",
                 "sigla": "", "comune": "", "lat": "", "lon": ""}
            per_chiave[chiave] = r
            righe.append(r)
        for k in ("comune", "tipo", "lat", "lon"):
            if str(c.get(k, "")).strip():
                r[k] = str(c[k]).strip()
        r["nome"] = str(c.get("nome") or "").strip()   # vuoto = nome automatico da tipo e comune, come sedi.py
        if not r.get("sigla") and str(c.get("sigla") or "").strip():
            r["sigla"] = str(c["sigla"]).strip().upper()
        if str(c.get("sigla_corretta") or "").strip():   # 'sigla' nel foglio e' la provincia vista in mappa: non affidabile
            r["sigla"] = str(c["sigla_corretta"]).strip().upper()
        r["stato"] = c.get("stato", "")
    print(f"Correzioni applicate da {cartella}: {len(ultima)}")
    return righe


def sedi_candidate(sedi, sigla, confine, cfg):
    tipi = cfg["tipi"]
    pcfg = cfg["province"][sigla]
    raggio = float(pcfg.get("raggio_esterni_km", 30))
    escludi = set(pcfg.get("escludi", []))
    # buffer in gradi approssimato (1 grado lat ~ 111 km)
    lat0 = confine.centroid.y
    fuori = confine.buffer(raggio / (111.32 * math.cos(math.radians(lat0))))
    scelte = []
    for s in sedi:
        if s["tipo"] not in tipi or s["chiave"] in escludi:
            continue
        p = Point(s["lon"], s["lat"])
        dentro = confine.contains(p)
        interna = dentro or s["sigla"] == sigla
        if interna or fuori.contains(p):
            scelte.append({**s, "sigla": sigla if dentro else s["sigla"], "interna": bool(interna)})
    for a in pcfg.get("aggiungi", []):       # sedi aggiunte a mano nel config (es. non ancora in OSM)
        scelte.append({"chiave": a.get("chiave") or f"config/{a['nome']}", "nome": a["nome"], "tipo": a.get("tipo", "permanente"),
                       "sigla": a.get("sigla", sigla), "comune": a.get("comune", ""), "lat": float(a["lat"]), "lon": float(a["lon"]),
                       "interna": a.get("sigla", sigla) == sigla})
    # doppioni: stessa sede a meno di 150 m e stesso tipo -> ne tengo una
    uniche = []
    for s in scelte:
        if any(u["tipo"] == s["tipo"] and km(u["lat"], u["lon"], s["lat"], s["lon"]) < 0.15 for u in uniche):
            continue
        uniche.append(s)
    uniche.sort(key=lambda s: (not s["interna"], s["sigla"], s["nome"]))
    for i, s in enumerate(uniche):
        s["id"] = i
        s["uscita_min"] = float(tipi[s["tipo"]].get("uscita_min", 2))
    return uniche


# ---------------------------------------------------------------- griglia
def griglia(confine, comuni, res):
    celle = set()
    geoms = list(confine.geoms) if confine.geom_type == "MultiPolygon" else [confine]
    for g in geoms:
        celle |= set(h3.geo_to_cells(mapping(g), res))
    # celle a cavallo del confine con centro fuori: le aggiungo se l'esagono tocca la provincia
    bordo = set()
    for c in celle:
        bordo.update(h3.grid_disk(c, 1))
    for c in bordo - celle:
        if confine.intersects(shape(h3.cells_to_geo([c]))):
            celle.add(c)
    celle = sorted(celle)
    albero = STRtree([c[0] for c in comuni]) if comuni else None
    out = []
    for c in celle:
        lat, lon = h3.cell_to_latlng(c)
        ci = -1
        if albero is not None:
            idx = albero.query(Point(lon, lat), predicate="intersects")
            if len(idx):
                ci = int(idx[0])
            else:   # centro fuori provincia: comune piu' vicino
                ci = int(albero.nearest(Point(lon, lat)))
        out.append({"h3": c, "lat": lat, "lon": lon, "comune": ci})
    return out


# ---------------------------------------------------------------- strade
VELOCI = {"motorway", "trunk"}                     # autostrade e strade ad alto scorrimento
ORDINARIE = {"primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "service",
             "road", "track", "primary_link", "secondary_link", "tertiary_link"}


def leggi_strade(pbf, area):
    """Dall'estratto OSM, dentro 'area' (poligono shapely): le strade ordinarie (LineString)
    e le autostrade/superstrade come [(coords [(lon,lat)...], tag)]."""
    import osmium
    from shapely.geometry import LineString, box
    x0, y0, x1, y1 = area.bounds
    ordinarie, veloci = [], []

    class H(osmium.SimpleHandler):
        def way(self, w):
            hw = w.tags.get("highway")
            if hw not in VELOCI and hw not in ORDINARIE:
                return
            if hw == "track" and w.tags.get("tracktype") in ("grade4", "grade5"):
                return
            if w.tags.get("access") in ("no", "private") and hw != "track":
                return
            try:
                cc = [(n.lon, n.lat) for n in w.nodes]
            except osmium.InvalidLocationError:
                return
            if len(cc) < 2 or not any(x0 <= x <= x1 and y0 <= y <= y1 for x, y in cc):
                return
            if hw in VELOCI:
                veloci.append((cc, {"highway": hw, "ref": w.tags.get("ref", ""), "name": w.tags.get("name", ""),
                                    "oneway": w.tags.get("oneway", ""), "id": w.id}))
            else:
                ordinarie.append(LineString(cc))

    H().apply_file(pbf, locations=True, idx="flex_mem")
    print(f"Strade: {len(ordinarie)} ordinarie, {len(veloci)} tratti autostradali/superstrade")
    return ordinarie, veloci


def aggancia_celle(celle, ordinarie):
    """Il centro di ogni cella si porta sul punto piu' vicino della viabilita' ORDINARIA: un esagono
    attraversato dall'autostrada non deve prendere la competenza della carreggiata (lì si arriva
    solo dai caselli). La distanza di aggancio diventa il tratto a piedi."""
    from shapely.ops import nearest_points
    if not ordinarie:
        return
    albero = STRtree(ordinarie)
    for c in celle:
        p = Point(c["lon"], c["lat"])
        g = ordinarie[int(albero.nearest(p))]
        q = nearest_points(g, p)[0]
        c["lat_s"], c["lon_s"] = q.y, q.x
        c["aggancio_m"] = km(c["lat"], c["lon"], q.y, q.x) * 1000


def rotta(a, b):
    """Direzione in gradi (0 = nord) da a=(lon,lat) a b."""
    la1, la2 = math.radians(a[1]), math.radians(b[1])
    dl = math.radians(b[0] - a[0])
    y = math.sin(dl) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


DIREZIONI = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ovest", "Ovest", "Nord-Ovest"]


def tratti_veloci(veloci, area, passo_m=500):
    """Spezza autostrade e superstrade dentro 'area' in tratti di circa passo_m, ognuno con la sua
    direzione di marcia. Le carreggiate separate (oneway) sono gia' due vie in OSM; una strada a
    doppio senso diventa due tratti, uno per senso."""
    from shapely.geometry import LineString
    out = []
    for cc, tag in veloci:
        sensi = [cc]
        ow = tag.get("oneway")
        if ow == "-1":
            sensi = [cc[::-1]]
        elif tag["highway"] == "trunk" and ow not in ("yes", "true", "1"):
            sensi = [cc, cc[::-1]]
        for sc in sensi:
            # lati lunghi (rettilinei con pochi nodi) spezzati, cosi' nessun tratto supera il passo
            fitto = [sc[0]]
            for a, b in zip(sc, sc[1:]):
                n = int(km(a[1], a[0], b[1], b[0]) * 1000 // passo_m)
                fitto += [(a[0] + (b[0] - a[0]) * k / (n + 1), a[1] + (b[1] - a[1]) * k / (n + 1)) for k in range(1, n + 1)] + [b]
            sc = fitto
            pezzo, lung = [sc[0]], 0.0
            for a, b in zip(sc, sc[1:]):
                d = km(a[1], a[0], b[1], b[0]) * 1000
                pezzo.append(b)
                lung += d
                if lung >= passo_m:
                    out.append((pezzo, lung, tag)); pezzo, lung = [b], 0.0
            if len(pezzo) >= 2 and lung > 30:
                out.append((pezzo, lung, tag))
    tratti = []
    for pezzo, lung, tag in out:
        linea = LineString(pezzo)
        if not area.intersects(linea):
            continue
        m = linea.interpolate(0.5, normalized=True)
        # direzione presa sul pezzetto attorno al punto medio, non fra i due estremi (curve)
        a = linea.interpolate(0.45, normalized=True); b = linea.interpolate(0.55, normalized=True)
        br = rotta((a.x, a.y), (b.x, b.y)) if a.distance(b) > 0 else rotta(pezzo[0], pezzo[-1])
        tratti.append({"lat": m.y, "lon": m.x, "bearing": br, "lung": lung,
                       "coords": [(round(y, 5), round(x, 5)) for x, y in pezzo],
                       "ref": tag["ref"] or tag["name"], "classe": tag["highway"],
                       "dir": DIREZIONI[int((br + 22.5) // 45) % 8]})
    # Un solo nome per senso di marcia lungo tutta la strada: l'asse principale della strada
    # (media degli angoli raddoppiati) e i due versi lungo l'asse. Una superstrada che curva
    # non cambia "direzione" a ogni tornante.
    per_strada = {}
    for t in tratti:
        per_strada.setdefault(t["ref"] or "?", []).append(t)
    for lst in per_strada.values():
        sx = sum(math.sin(math.radians(2 * t["bearing"])) * t["lung"] for t in lst)
        cx = sum(math.cos(math.radians(2 * t["bearing"])) * t["lung"] for t in lst)
        asse = (math.degrees(math.atan2(sx, cx)) / 2) % 180            # 0..180
        for t in lst:
            verso = asse if math.cos(math.radians(t["bearing"] - asse)) >= 0 else asse + 180
            t["dir"] = DIREZIONI[int((verso + 22.5) // 45) % 8]
    print(f"Tratti veloci: {len(tratti)} (circa {sum(t['lung'] for t in tratti) / 1000:.0f} km di carreggiata)")
    return tratti


# ---------------------------------------------------------------- percorrenze
def richiesta_osrm(url):
    for tent in range(5):
        try:
            with urllib.request.urlopen(url, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            try:
                return json.load(e)          # OSRM risponde 400 con il codice d'errore in JSON (es. NoSegment)
            except Exception:
                pass
            print(f"OSRM: {e}, riprovo ({tent + 1}/5)", file=sys.stderr)
        except Exception as e:
            print(f"OSRM: {e}, riprovo ({tent + 1}/5)", file=sys.stderr)
        time.sleep(5)
    raise SystemExit("OSRM non risponde")


def tabella_osrm(base, sedi, punti, blocco=400, profilo="driving"):
    """Matrice durate (s) e distanze (m) sede -> punto, piu' la distanza di aggancio alla strada di ogni punto.
    Un punto con 'bearing' (gradi) si aggancia solo a una carreggiata con quella direzione (+-25 gradi):
    serve per le autostrade, dove le due carreggiate hanno competenze diverse."""
    n = len(sedi)
    dur = [[None] * len(punti) for _ in sedi]
    dist = [[None] * len(punti) for _ in sedi]
    aggancio = [0.0] * len(punti)
    src = ";".join(f"{s['lon']:.6f},{s['lat']:.6f}" for s in sedi)
    con_dir = any(p.get("bearing") is not None for p in punti)
    for i0 in range(0, len(punti), blocco):
        parte = punti[i0:i0 + blocco]
        dst = ";".join(f"{c['lon']:.6f},{c['lat']:.6f}" for c in parte)
        url = (f"{base.rstrip('/')}/table/v1/{profilo}/{src};{dst}?sources={';'.join(map(str, range(n)))}"
               f"&destinations={';'.join(map(str, range(n, n + len(parte))))}&annotations=duration,distance")
        # se una carreggiata non si trova con la direzione stretta (NoSegment) si allarga, poi si toglie
        for ampiezza in ((25, 60, None) if con_dir else (None,)):
            u = url
            if ampiezza:
                b = [""] * n + [f"{int(round(c['bearing'])) % 360},{ampiezza}" if c.get("bearing") is not None else "" for c in parte]
                u += "&bearings=" + ";".join(b)
            j = richiesta_osrm(u)
            if j.get("code") == "Ok":
                break
            print(f"  OSRM: {j.get('code')} con direzione +-{ampiezza}: {j.get('message')}", file=sys.stderr)
        if j.get("code") != "Ok":
            raise SystemExit(f"OSRM: {j.get('code')} {j.get('message')}")
        for k, d in enumerate(j["destinations"]):
            aggancio[i0 + k] = float(d.get("distance") or 0)
        for si in range(n):
            for k in range(len(parte)):
                dur[si][i0 + k] = j["durations"][si][k]
                dist[si][i0 + k] = j["distances"][si][k]
        print(f"  OSRM: {i0 + len(parte)}/{len(punti)}")
    return dur, dist, aggancio


def tabella_aria(sedi, celle, tortuosita=1.35, kmh=50.0):
    dur, dist = [], []
    for s in sedi:
        rd, rs = [], []
        for c in celle:
            d = km(s["lat"], s["lon"], c["lat"], c["lon"]) * tortuosita
            rs.append(d * 1000)
            rd.append(d / kmh * 3600)
        dur.append(rd)
        dist.append(rs)
    return dur, dist, [0.0] * len(celle)


# ---------------------------------------------------------------- calcolo
def competenze(sedi, celle, dur, dist, aggancio, cfg):
    fattore = float(cfg.get("fattore_mezzo", 1.0))
    a_piedi = float(cfg.get("velocita_fuori_strada_kmh", 4.0))
    for j, c in enumerate(celle):
        # tratto dalla strada al centro cella: a piedi, solo oltre i primi 100 m
        if "aggancio_m" in c:
            aggancio[j] = c["aggancio_m"] + aggancio[j]
        extra_min = 0.0 if c.get("bearing") is not None else max(0.0, aggancio[j] - 100) / 1000 / a_piedi * 60
        cand = []
        for i, s in enumerate(sedi):
            d = dur[i][j]
            if d is None:
                continue
            arrivo = s["uscita_min"] + d / 60 * fattore + extra_min
            cand.append((arrivo, i, (dist[i][j] or 0) / 1000))
        cand.sort()
        c["comp"] = [(i, round(t, 1), round(k, 1)) for t, i, k in cand[:N_COMPETENZE]]
        c["aggancio"] = int(round(aggancio[j]))
    return celle


def scrivi(sigla, nome_prov, sedi, celle, comuni, cfg, metodo, outdir, tratti=None):
    os.makedirs(outdir, exist_ok=True)
    res = cfg["province"][sigla].get("h3_res", 8)
    out = {
        "provincia": sigla, "nome": nome_prov, "generato": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metodo": metodo, "h3_res": res, "n_competenze": N_COMPETENZE,
        "parametri": {"fattore_mezzo": cfg.get("fattore_mezzo", 1.0), "velocita": cfg.get("velocita", {}), "mezzo": cfg.get("mezzo", {}),
                      "uscita_min": {k: v.get("uscita_min") for k, v in cfg["tipi"].items()},
                      "raggio_esterni_km": cfg["province"][sigla].get("raggio_esterni_km", 30)},
        "sedi": [{k: s[k] for k in ("id", "chiave", "nome", "tipo", "sigla", "comune", "lat", "lon", "uscita_min", "interna")} for s in sedi],
        "comuni": [c[1] for c in comuni],
        # cella: [h3, indice comune, aggancio strada m, sede1, min1, km1, ... sede6, min6, km6]
        "celle": [[c["h3"], c["comune"], c["aggancio"]] + [x for t in c["comp"] for x in t] for c in celle],
        # tratti di autostrada/superstrada per senso di marcia: competenze sulla carreggiata
        "tratti": [{"ref": t["ref"], "classe": t["classe"], "dir": t["dir"], "bearing": round(t["bearing"]),
                    "km": round(t["lung"] / 1000, 2), "coords": t["coords"],
                    "comp": [x for c in t["comp"] for x in c]} for t in (tratti or []) if t.get("comp")],
    }
    with open(os.path.join(outdir, f"{sigla}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(outdir, f"{sigla}_celle.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["h3", "lat", "lon", "comune", "aggancio_strada_m"]
                   + [f"{k}{n}" for n in range(1, N_COMPETENZE + 1) for k in ("sede_", "min_", "km_")])
        for c in celle:
            riga = [c["h3"], round(c["lat"], 6), round(c["lon"], 6), comuni[c["comune"]][1] if c["comune"] >= 0 else "", c["aggancio"]]
            for i, t, k in c["comp"]:
                riga += [sedi[i]["nome"], t, k]
            w.writerow(riga)
    if tratti:
        with open(os.path.join(outdir, f"{sigla}_tratti.csv"), "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["strada", "classe", "direzione", "lat", "lon", "km_tratto"]
                       + [f"{k}{n}" for n in range(1, N_COMPETENZE + 1) for k in ("sede_", "min_", "km_")])
            for t in tratti:
                riga = [t["ref"], t["classe"], t["dir"], round(t["lat"], 6), round(t["lon"], 6), round(t["lung"] / 1000, 2)]
                for i, m, k in t.get("comp", []):
                    riga += [sedi[i]["nome"], m, k]
                w.writerow(riga)
    # riepilogo: celle in 1a competenza per sede
    conta = {}
    for c in celle:
        if c["comp"]:
            conta[c["comp"][0][0]] = conta.get(c["comp"][0][0], 0) + 1
    area = h3.average_hexagon_area(res, unit="km^2")
    for i, n in sorted(conta.items(), key=lambda x: -x[1]):
        print(f"  1a competenza {sedi[i]['nome']}: {n} celle (~{n * area:.0f} km2)")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pbf", help="estratto OSM che copre le province e i dintorni")
    ap.add_argument("--confine", help="GeoJSON del confine (solo prove, al posto di --pbf)")
    ap.add_argument("--osrm", default=os.environ.get("OSRM_URL", ""), help="URL di osrm-routed (es. http://localhost:5000)")
    ap.add_argument("--config", default=os.path.join(RADICE, "db", "competenze", "config.json"))
    ap.add_argument("--sedi", default=os.path.join(RADICE, "db", "sedi"))
    ap.add_argument("--out", default=os.path.join(RADICE, "db", "competenze"))
    ap.add_argument("--provincia", action="append", help="sigla (ripetibile); default tutte quelle del config")
    args = ap.parse_args()

    cfg = leggi_json(args.config)
    sigle = [s.upper() for s in (args.provincia or cfg["province"].keys())]
    if args.confine:
        confini = confini_da_geojson(args.confine, sigle[0])
    elif args.pbf:
        confini = leggi_confini(args.pbf, sigle)
    else:
        raise SystemExit("serve --pbf (o --confine per le prove)")
    sedi_tutte = leggi_sedi(args.sedi)
    metodo = "osrm" if args.osrm else "linea d'aria (prova)"
    indice = leggi_json(os.path.join(args.out, "index.json"), {"province": {}})
    for sigla in sigle:
        confine, comuni = confini[sigla]
        pcfg = cfg["province"][sigla]
        sedi = sedi_candidate(sedi_tutte, sigla, confine, cfg)
        print(f"{sigla}: {len(sedi)} sedi candidate ({sum(s['interna'] for s in sedi)} interne)")
        for s in sedi:
            print(f"   {'*' if s['interna'] else ' '} {s['sigla']:2} {s['tipo']:12} {s['nome']}")
        celle = griglia(confine, comuni, pcfg.get("h3_res", 8))
        print(f"{sigla}: {len(celle)} celle H3 res {pcfg.get('h3_res', 8)}")
        tratti = []
        if args.pbf:
            area = confine.buffer(0.01)     # ~1 km oltre il confine
            ordinarie, veloci = leggi_strade(args.pbf, area)
            aggancia_celle(celle, ordinarie)
            tratti = tratti_veloci(veloci, confine, pcfg.get("passo_tratti_m", 500))
        # le celle si raggiungono dal punto agganciato alla viabilita' ordinaria
        dest = [{"lat": c.get("lat_s", c["lat"]), "lon": c.get("lon_s", c["lon"])} for c in celle]
        if args.osrm:
            dur, dist, agg = tabella_osrm(args.osrm, sedi, dest)
        else:
            dur, dist, agg = tabella_aria(sedi, dest)
        competenze(sedi, celle, dur, dist, agg, cfg)
        if tratti:
            if args.osrm:
                dur, dist, agg = tabella_osrm(args.osrm, sedi, tratti, blocco=250)
            else:
                dur, dist, agg = tabella_aria(sedi, tratti)
            competenze(sedi, tratti, dur, dist, agg, cfg)
        out = scrivi(sigla, pcfg.get("nome", sigla), sedi, celle, comuni, cfg, metodo, args.out, tratti)
        indice["province"][sigla] = {"nome": out["nome"], "generato": out["generato"], "metodo": metodo,
                                     "sedi": len(sedi), "celle": len(celle)}
    with open(os.path.join(args.out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
