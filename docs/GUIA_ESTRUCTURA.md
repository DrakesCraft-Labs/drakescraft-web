# Guía web — estructura y verificación

## Por qué está partida en tres

`guia.html` llegó a 76 KB con nueve secciones, desde comandos hasta hechizos de Crystamae.
Todo en un archivo hacía tres cosas mal: cargaba 380 filas para quien solo quería ver un
comando, mezclaba temas sin relación, y cualquier edición tocaba un archivo enorme.

| Archivo | Contiene | Para quién |
|---|---|---|
| `guia.html` | Comandos, modalidades, sistemas, el servidor | El que llega y no sabe nada |
| `guia-rangos.html` | Los 16 rangos con lo que da cada uno | El que evalúa comprar |
| `guia-slimefun.html` | Cultivation, pollos, SlimeTinker, Crystamae | El que ya juega en serio |

Las tres comparten cabecera, pie y buscador, y se navegan con las pestañas `.guide-tabs`.
El buscador (`scripts/guia.js`) filtra `.guide-row`, así que funciona igual en cada página
sin cambios.

## De dónde sale cada dato

**Nada se escribe a mano.** Todo se extrae del código de los forks, no de la documentación
del autor original — esa fue la causa del reporte de un jugador cuya combinación de
Cultivation no funcionaba: seguía el upstream, y lo que aplica es el fork.

| Sección | Fuente |
|---|---|
| Cultivation, 82 cruces | `Cultivation_Updated` → `Plants.java`, los `addBreedingPair` |
| Pollos, 64 tipos | `GuizhanCraft/GeneticChickengineering-Reborn` → `ChickenTypes.java` |
| SlimeTinker, 96 materiales | `SlimeTinker-drake` → `setup/TinkersMaterials*.java` |
| Crystamae, 69 hechizos | `CrystamaeHistoria-drake` → `magic/SpellType.java` |
| Rangos, protecciones | `plugins/ProtectionStones/blocks/*.toml` en producción |
| Rangos, tamaño de isla | Permisos `<gamemode>.island.range.<n>` de LuckPerms |

## Lo que NO se publica, y por qué

Dos sistemas **no tienen tabla de recetas** y publicar una habría sido inventarla:

- **Genetic Chickengineering**: cada pollo son 6 genes y su número *es* ese patrón en binario.
  Al cruzar, cada padre aporta un gameto por gen. No existe "A + B = C" fijo. Se documenta la
  mecánica y el patrón de cada pollo, que es lo que permite planificar.
- **Crystamae Historia**: el hechizo resultante se resuelve en runtime según los cristales
  usados. Se publican los 69 hechizos que existen, no combinaciones adivinadas.

Es el mismo criterio que con los IDs de Tebex: cuando el dato existe, se extrae; cuando no
existe en forma de tabla, se explica la mecánica.

## Verificación automática

`scripts/verificar-guia.py` comprueba que la guía diga lo mismo que el código:

```bash
python3 scripts/verificar-guia.py
```

Cuatro comprobaciones, sale con código 1 si alguna falla (sirve para CI):

1. Ningún cruce de Cultivation publicado puede ser inventado.
2. El número de cada pollo debe ser su patrón de 6 bits.
3. Las protecciones de los rangos deben calzar con los `.toml`.
4. La tienda no puede prometer un kit que `config.yml` no define.

**Correr esto después de tocar la guía, y también después de tocar los addons** — si alguien
agrega o quita un cruce en Cultivation, la guía queda desactualizada en silencio y solo se
entera un jugador perdiendo el tiempo.

## Al editar

Subir el parámetro `?v=` de los assets en **las tres páginas**. Sin eso, la caché de borde
sirve el CSS viejo con el HTML nuevo: pasó una vez y dejó la portada sin estilos.
