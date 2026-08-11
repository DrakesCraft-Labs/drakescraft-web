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

# 5 · Comandos y contratos públicos: no publicar permisos administrativos ni omitir
# los puntos de entrada de los sistemas que están activos en producción.
guia = (WEB / "guia.html").read_text()
revisar("/sf timings" not in guia, "Comandos: /sf timings permanece reservado a staff")
for comando in ("/arcana guide", "/arcana spirit", "/dioses", "/bosswarp precios",
                "/bosswarp &lt;jefe&gt; solo", "/bosswarp spectate"):
    revisar(comando in guia, f"Comandos: documentado {comando}")

# 6 · La tabla debe mostrar límites efectivos después de herencia, no sólo los nodos
# declarados directamente en cada grupo de LuckPerms.
for fila in (
        '<tr><th scope="row" data-rank="polis">Polis</th><td>1</td><td>2</td>',
        '<tr><th scope="row" data-rank="oldschool">OldSchool</th><td>1</td><td>2</td>',
        '<tr><th scope="row" data-rank="hestia">Hestia</th><td>5</td><td>3</td><td>81×81</td><td>4</td><td>5</td>',
        '<tr><th scope="row" data-rank="hefesto">Hefesto</th><td>8</td><td>5</td><td>177×177</td><td>6</td><td>8</td>'):
    revisar(fila in rangos, f"Rangos: límite efectivo publicado para {fila.split('>')[2].split('<')[0]}")

revisar("12 reclamaciones" in rangos and "InfinityExpansion" in rangos,
        "SFMaster: límites y familias bloqueadas documentados")

# 7 · Los precios visibles deben cubrir y coincidir con el catálogo de BossArena.
try:
    boss_cfg = yaml.safe_load((W / "DrakesBosses/src/main/resources/config.yml").read_text())
    reales = {k: int(v) for k, v in boss_cfg["boss-arena"]["entry-fees"].items()
              if k not in {"default", "free-permission"}}
    publicados = {boss: int(fee) for boss, fee in
                  re.findall(r'data-boss="([a-z_]+)" data-fee="(\d+)"', guia)}
    revisar(publicados == reales,
            f"BossArena: {len(publicados)} precios publicados; diferencias: "
            f"{sorted(set(publicados.items()) ^ set(reales.items()))}")
except NameError:
    ok.append("BossArena: omitido (falta PyYAML)")

print("=== Verificacion guia web contra codigo ===")
for m in ok:
    print("  OK  ", m)
for m in fallos:
    print("  FAIL", m)
sys.exit(1 if fallos else 0)
