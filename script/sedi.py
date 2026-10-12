#!/usr/bin/env python3
"""Costruisce il DB delle sedi VVF in Italia (Trentino-Alto Adige incluso) da OpenStreetMap.

Solo libreria standard. Uso:  python3 build_sedi_vvf.py
Output (default in db/sedi): sedi_vvf.sqlite, sedi_vvf.geojson, sedi_vvf.csv
Opzione: --out CARTELLA
"""
import argparse, csv, json, os, sqlite3, sys, time, urllib.parse, urllib.request

MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# Una query per regione (ISO 3166-2): piu' leggere e danno la regione gratis.
REGIONI = {
    "IT-65": "Abruzzo", "IT-77": "Basilicata", "IT-78": "Calabria", "IT-72": "Campania",
    "IT-45": "Emilia-Romagna", "IT-36": "Friuli-Venezia Giulia", "IT-62": "Lazio",
    "IT-42": "Liguria", "IT-25": "Lombardia", "IT-57": "Marche", "IT-67": "Molise",
    "IT-21": "Piemonte", "IT-75": "Puglia", "IT-88": "Sardegna", "IT-82": "Sicilia",
    "IT-52": "Toscana", "IT-32": "Trentino-Alto Adige", "IT-55": "Umbria",
    "IT-23": "Valle d'Aosta", "IT-34": "Veneto",
}

QUERY = """[out:json][timeout:120];
area["ISO3166-2"="{iso}"]->.a;
(
  nwr["amenity"="fire_station"](area.a);
  nwr["emergency"="fire_station"](area.a);
  nwr["building"="fire_station"](area.a);
  nwr["name"~"presidio|nucleo|portual|rurale|antincendio|vigili del fuoco|vvf",i]["amenity"!~"^(restaurant|cafe|bar|school|parking|fuel)$"]["shop"!~"."]["highway"!~"."](area.a);
  nwr["operator"~"vigili del fuoco|vvf",i]["amenity"!~"^(parking|fuel)$"]["highway"!~"."](area.a);
);
out center tags;"""


def overpass(query):
    data = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for url in MIRRORS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "FireOps-sedi-vvf/1.0"})
                with urllib.request.urlopen(req, timeout=180) as r:
                    return json.load(r)
            except Exception as e:  # noqa: BLE001
                last = e
                time.sleep(5)
    raise RuntimeError(f"Overpass non raggiungibile: {last}")


def classifica(tags):
    """Euristica: permanente / volontario / aeroportuale / altro. Da verificare a mano."""
    s = " ".join(tags.get(k, "") for k in ("name", "operator", "official_name", "name:de", "short_name")).lower()
    if "volontari" in s or "freiwillige" in s or "volontaria" in s:
        return "volontario"
    if "aeroport" in s or "airport" in s:
        return "aeroportuale"
    if "portual" in s or "harbour" in s or "harbor" in s:
        return "portuale"
    if "rurale" in s:
        return "rurale"
    if "presidio" in s:
        return "presidio"
    if any(x in s for x in ("vigili del fuoco", "vvf", "berufsfeuerwehr", "corpo nazionale", "distaccamento", "comando")):
        return "permanente"
    return "altro"


def riga(el, regione):
    t = el.get("tags", {})
    lat = el.get("lat") or el.get("center", {}).get("lat")
    lon = el.get("lon") or el.get("center", {}).get("lon")
    if lat is None or lon is None:
        return None
    return {
        "osm_type": el["type"], "osm_id": el["id"],
        "nome": t.get("name") or t.get("official_name") or "",
        "operatore": t.get("operator", ""),
        "tipo": classifica(t),
        "regione": regione,
        "provincia": t.get("addr:province", ""),
        "comune": t.get("addr:city", ""),
        "via": " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x),
        "cap": t.get("addr:postcode", ""),
        "telefono": t.get("phone") or t.get("contact:phone") or "",
        "sito": t.get("website") or t.get("contact:website") or "",
        "lat": lat, "lon": lon,
        "tags": json.dumps(t, ensure_ascii=False),
    }


def scrivi(righe, outdir="db/sedi", nome="sedi_vvf"):
    os.makedirs(outdir, exist_ok=True)
    base = os.path.join(outdir, nome)
    if os.path.exists(base + ".sqlite"):
        os.remove(base + ".sqlite")
    cols = list(righe[0].keys())
    db = sqlite3.connect(base + ".sqlite")
    db.execute("DROP TABLE IF EXISTS sedi")
    db.execute("CREATE TABLE sedi (%s, PRIMARY KEY (osm_type, osm_id))" % ", ".join(cols))
    db.executemany("INSERT INTO sedi VALUES (%s)" % ",".join("?" * len(cols)),
                   [tuple(r[c] for c in cols) for r in righe])
    db.execute("CREATE INDEX idx_reg ON sedi(regione, tipo)")
    db.execute("CREATE INDEX idx_pos ON sedi(lat, lon)")
    db.commit(); db.close()
    with open(base + ".csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[c for c in cols if c != "tags"], extrasaction="ignore")
        w.writeheader(); w.writerows(righe)
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
              "properties": {k: v for k, v in r.items() if k not in ("lat", "lon", "tags")}} for r in righe]
    with open(base + ".geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="db/sedi", help="cartella di output (default: db/sedi)")
    args = ap.parse_args()
    viste, righe = set(), []
    for iso, nome in REGIONI.items():
        print(f"{nome}...", end=" ", flush=True)
        els = overpass(QUERY.format(iso=iso)).get("elements", [])
        n = 0
        for el in els:
            k = (el["type"], el["id"])
            if k in viste:
                continue
            r = riga(el, nome)
            if r:
                viste.add(k); righe.append(r); n += 1
        print(n)
        time.sleep(2)
    if not righe:
        sys.exit("Nessun risultato")
    scrivi(righe, args.out)
    print(f"Totale: {len(righe)} sedi -> {args.out}/sedi_vvf.sqlite / .geojson / .csv")


if __name__ == "__main__":
    main()