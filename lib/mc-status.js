import net from 'node:net';

/**
 * Consulta el estado de un servidor de Minecraft con el Server List Ping,
 * el mismo protocolo que usa el cliente al mostrar la lista de servidores.
 *
 * Se implementa a mano en vez de llamar a un servicio externo tipo mcsrvstat:
 * la portada no debe depender de que un tercero esté vivo para decir cuánta
 * gente hay conectada, y el dato tarda menos viniendo directo.
 */

const TIEMPO_LIMITE_MS = 4000;
const CACHE_MS = 30000;

let cache = { momento: 0, datos: null };

/** Escribe un entero en el formato VarInt del protocolo de Minecraft. */
function varInt(valor) {
  const bytes = [];
  let resto = valor;
  do {
    let byte = resto & 0x7f;
    resto >>>= 7;
    if (resto !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (resto !== 0);
  return Buffer.from(bytes);
}

/** Lee un VarInt y devuelve el valor junto a cuántos bytes ocupó. */
function leerVarInt(buffer, desde = 0) {
  let valor = 0;
  let desplazamiento = 0;
  let leidos = 0;
  while (true) {
    if (desde + leidos >= buffer.length) return null;
    const byte = buffer[desde + leidos];
    valor |= (byte & 0x7f) << desplazamiento;
    leidos += 1;
    if ((byte & 0x80) === 0) break;
    desplazamiento += 7;
    if (desplazamiento > 35) return null;
  }
  return { valor, leidos };
}

/** Empaqueta un paquete con su longitud por delante, como exige el protocolo. */
function paquete(...partes) {
  const cuerpo = Buffer.concat(partes);
  return Buffer.concat([varInt(cuerpo.length), cuerpo]);
}

function cadena(texto) {
  const datos = Buffer.from(texto, 'utf8');
  return Buffer.concat([varInt(datos.length), datos]);
}

/**
 * Pide el estado al servidor. Devuelve null si no responde a tiempo: la portada
 * prefiere no enseñar nada antes que enseñar un número inventado.
 */
function consultar(host, puerto) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: puerto });
    let recibido = Buffer.alloc(0);
    let resuelto = false;

    const terminar = (resultado) => {
      if (resuelto) return;
      resuelto = true;
      socket.destroy();
      resolve(resultado);
    };

    socket.setTimeout(TIEMPO_LIMITE_MS);
    socket.on('timeout', () => terminar(null));
    socket.on('error', () => terminar(null));

    socket.on('connect', () => {
      // 0x00 = handshake; el estado siguiente 1 significa "solo quiero el status".
      const puertoBuffer = Buffer.alloc(2);
      puertoBuffer.writeUInt16BE(puerto);
      socket.write(paquete(varInt(0x00), varInt(770), cadena(host), puertoBuffer, varInt(1)));
      socket.write(paquete(varInt(0x00)));
    });

    socket.on('data', (trozo) => {
      recibido = Buffer.concat([recibido, trozo]);

      const longitud = leerVarInt(recibido, 0);
      if (!longitud) return;
      const total = longitud.leidos + longitud.valor;
      if (recibido.length < total) return;

      const id = leerVarInt(recibido, longitud.leidos);
      if (!id) return terminar(null);
      const cadenaJson = leerVarInt(recibido, longitud.leidos + id.leidos);
      if (!cadenaJson) return terminar(null);

      const inicio = longitud.leidos + id.leidos + cadenaJson.leidos;
      try {
        terminar(JSON.parse(recibido.subarray(inicio, inicio + cadenaJson.valor).toString('utf8')));
      } catch {
        terminar(null);
      }
    });
  });
}

/**
 * Estado del servidor, cacheado medio minuto.
 *
 * El caché existe para que una portada muy visitada no acabe haciendo un ping por
 * visita: el servidor de Minecraft trata cada uno como una conexión entrante.
 */
export async function estadoServidor(host, puerto) {
  const ahora = Date.now();
  if (cache.datos && ahora - cache.momento < CACHE_MS) return cache.datos;

  const bruto = await consultar(host, puerto);
  const datos = bruto
    ? {
        enLinea: true,
        jugadores: bruto.players?.online ?? 0,
        maximo: bruto.players?.max ?? 0,
        version: bruto.version?.name ?? null,
      }
    : { enLinea: false, jugadores: 0, maximo: 0, version: null };

  cache = { momento: ahora, datos };
  return datos;
}
