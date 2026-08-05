#!/usr/bin/env python3
"""Verifica que la guia web diga lo mismo que el codigo.

Nacio porque un jugador siguio la documentacion del autor original de Cultivation y una
combinacion no le daba: lo que aplica es el fork, no el upstream. Publicar una tabla que no
calza con el servidor es peor que no publicarla.

Uso:  python3 scripts/verificar-guia.py [ruta-al-workspace]
Sale con 1 si algo no calza, para poder usarlo en CI.
"""
import re
import sys
from pathlib import Path

W = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/jack/workspace/drakescraft")
WEB = W / "drakescraft-web"
fallos, ok = [], []


def revisar(condicion, mensaje):
    (ok if condicion else fallos).append(mensaje)


def limpio(s):
    return s.replace("PLANT_", "").replace("_", " ").title()


# 1 · Cultivation: ningun cruce publicado puede ser inventado.
plants = (W / "Cultivation_Updated/src/main/java/dev/sefiraat/cultivation"
          "/implementation/slimefun/items/Plants.java")
sf = (WEB / "guia-slimefun.html").read_text()
if plants.exists():
    pat = re.compile(r'new \w*Plant\(\s*CultivationStacks\.(\w+),(?:.|\n)*?addBreedingPair\('
                     r'\s*CultivationStacks\.(\w+)\.getItemId\(\),\s*CultivationStacks\.(\w+)\.getItemId\(\)')
    reales = {(limpio(m.group(2)), limpio(m.group(3)), limpio(m.group(1)))
              for m in pat.finditer(plants.read_text())}
    pub = set(re.findall(r'<code>([A-Za-z ]+) \+ ([A-Za-z ]+)</code><p>([A-Za-z ]+)</p>', sf))
    revisar(pub <= reales,
            f"Cultivation: {len(pub)} publicados de {len(reales)} reales; inventados: {sorted(pub - reales)}")

# 2 · Pollos: el numero publicado debe ser su patron de 6 bits.
malos = [i for i, b in re.findall(r'<code>\s*(\d+) · ([01]{6})</code>', sf)
         if format(int(i), "06b") != b]
revisar(not malos, f"Pollos: patrones binarios coherentes; erroneos: {malos}")

# 3 · Rangos: las protecciones deben calzar con los .toml de ProtectionStones.
PROTECCIONES = {"Thor": 601, "Anubis": 721, "Poseidón": 841, "Titán Japeto": 1001,
                "Titán Oceanus": 1301, "Titán Hiperión": 1601, "Titán Cronos": 2001,
                "Titán Caos": 2501}
rangos = (WEB / "guia-rangos.html").read_text()
mal = [k for k, v in PROTECCIONES.items()
       if f"{v}×{v}" not in rangos and f"{v}x{v}" not in rangos]
revisar(not mal, f"Rangos: protecciones publicadas correctas; erroneas: {mal}")

# 4 · Kits: la tienda no puede prometer un kit que la config no define.
try:
    import yaml
    cfg = yaml.safe_load((W / "Odysseia/src/main/resources/config.yml").read_text())
    pur = yaml.safe_load((W / "Odysseia/src/main/resources/purchases.yml").read_text())
    kits = set(cfg["kits"])
    prometidos = {a["parameters"]["kit"] for p in pur["products"].values() for a in p["actions"]
                  if a["type"] == "KIT" and isinstance(a.get("parameters"), dict)}
    revisar(prometidos <= kits, f"Kits: faltantes en config.yml: {sorted(prometidos - kits)}")
except ImportError:
    ok.append("Kits: omitido (falta PyYAML)")

print("=== Verificacion guia web contra codigo ===")
for m in ok:
    print("  OK  ", m)
for m in fallos:
    print("  FAIL", m)
sys.exit(1 if fallos else 0)
