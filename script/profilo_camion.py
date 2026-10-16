#!/usr/bin/env python3
"""Profilo OSRM per i mezzi VVF (camion), ricavato dal profilo auto ufficiale (car.lua).

Cosa cambia rispetto all'auto:
  - velocita' COSTANTI per tipo di strada, senza traffico (da db/competenze/config.json,
    sezione "velocita"): ordinaria 60 km/h, autostrada 90 km/h, ...;
  - i limiti di velocita' (maxspeed) e il fondo stradale non abbassano piu' la velocita';
  - percorso scelto per il tempo piu' breve (weight_name = duration), niente preferenze;
  - niente penalita' di svolta e semafori (velocita' costante, senza traffico);
  - ingombri di un camion: le strade con limiti di altezza, larghezza, lunghezza o
    peso inferiori al mezzo sono escluse.

Uso:  python script/profilo_camion.py car.lua camion.lua [--config db/competenze/config.json]
Il file prodotto va messo accanto a lib/ del profilo originale (nell'immagine OSRM: /opt).
"""
import argparse, json, os, re, sys

QUI = os.path.dirname(os.path.abspath(__file__))
PREDEFINITE = {"autostrada": 90, "superstrada": 90, "svincolo": 60, "ordinaria": 60}
MEZZO = {"altezza_m": 3.5, "larghezza_m": 2.55, "lunghezza_m": 8.5, "peso_kg": 16000}


def tabella_velocita(v):
    o, a, s, j = v["ordinaria"], v["autostrada"], v["superstrada"], v["svincolo"]
    righe = {
        "motorway": a, "motorway_link": j, "trunk": s, "trunk_link": j,
        "primary": o, "primary_link": o, "secondary": o, "secondary_link": o,
        "tertiary": o, "tertiary_link": o, "unclassified": o, "residential": o,
        "living_street": o, "service": o,
    }
    return "highway = {\n" + ",\n".join(f"        {k:<16}= {int(x)}" for k, x in righe.items()) + "\n      }"


def sostituisci(testo, schema, nuovo, cosa, obbligatorio=True):
    t, n = re.subn(schema, nuovo, testo, count=1, flags=re.S)
    if n == 0 and obbligatorio:
        raise SystemExit(f"profilo_camion: non trovo '{cosa}' in car.lua (versione OSRM diversa?)")
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ingresso")
    ap.add_argument("uscita")
    ap.add_argument("--config", default=os.path.join(os.path.dirname(QUI), "db", "competenze", "config.json"))
    a = ap.parse_args()
    cfg = json.load(open(a.config, encoding="utf-8")) if os.path.exists(a.config) else {}
    v = {**PREDEFINITE, **{k: float(x) for k, x in cfg.get("velocita", {}).items() if k in PREDEFINITE}}
    m = {**MEZZO, **{k: float(x) for k, x in cfg.get("mezzo", {}).items() if k in MEZZO}}
    t = open(a.ingresso, encoding="utf-8").read()

    # velocita' per tipo di strada (il blocco highway dentro "speeds = Sequence {")
    t = sostituisci(t, r"(speeds\s*=\s*Sequence\s*\{\s*)highway\s*=\s*\{.*?\n\s*\}", r"\g<1>" + tabella_velocita(v).replace("\\", "\\\\"),
                    "speeds.highway")
    # tempo piu' breve, senza preferenze di "routability"
    t = sostituisci(t, r"(\n\s*)weight_name(\s*)=\s*'routability'", r"\1weight_name\2= 'duration'", "weight_name")
    # velocita' costanti: niente maxspeed, niente fondo stradale, nessuna riduzione
    t = sostituisci(t, r"\n\s*WayHandlers\.maxspeed,", "\n    -- WayHandlers.maxspeed, (camion VVF: velocita' costanti)", "WayHandlers.maxspeed")
    t = sostituisci(t, r"\n\s*WayHandlers\.surface,", "\n    -- WayHandlers.surface, (camion VVF: velocita' costanti)", "WayHandlers.surface", False)
    t = sostituisci(t, r"(speed_reduction\s*=\s*)[\d.]+", r"\g<1>1.0", "speed_reduction", False)
    # senza traffico: niente penalita' di svolta e semafori (l'inversione a U resta)
    t = sostituisci(t, r"(\n\s*turn_penalty\s*=\s*)[\d.]+", r"\g<1>0", "turn_penalty", False)
    t = sostituisci(t, r"(oncoming_turn_penalty\s*=\s*)[\d.]+", r"\g<1>0", "oncoming_turn_penalty", False)
    t = sostituisci(t, r"(traffic_light_penalty\s*=\s*)[\d.]+", r"\g<1>0", "traffic_light_penalty", False)
    t = sostituisci(t, r"(traffic_signal_penalty\s*=\s*)[\d.]+", r"\g<1>0", "traffic_signal_penalty", False)
    # ingombri del mezzo
    for chiave, campo in (("vehicle_height", "altezza_m"), ("vehicle_width", "larghezza_m"),
                          ("vehicle_length", "lunghezza_m"), ("vehicle_weight", "peso_kg")):
        val = int(m[campo]) if campo == "peso_kg" else m[campo]
        t = sostituisci(t, rf"({chiave}\s*=\s*)[\d.]+", rf"\g<1>{val}", chiave)
    t = sostituisci(t, r"(vehicle_max_speed\s*=\s*)nil", rf"\g<1>{int(max(v.values()))}", "vehicle_max_speed", False)

    t = ("-- FireOps VVF: profilo camion generato da script/profilo_camion.py\n"
         f"-- velocita' km/h: {json.dumps(v)}  mezzo: {json.dumps(m)}\n") + t
    open(a.uscita, "w", encoding="utf-8").write(t)
    print(f"Profilo camion scritto in {a.uscita}: {v}, {m}")


if __name__ == "__main__":
    main()
