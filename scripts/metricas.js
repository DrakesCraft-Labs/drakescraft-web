/* --- Metricas de ocupacion --- */
/* Los datos los calcula un timer en Star cada madrugada y los deja en un JSON. Aqui solo se
   pintan: si la peticion falla no se inventa nada, se dice que no se pudieron cargar. */
(function () {
  var contenedorHoras = document.getElementById('horas');
  if (!contenedorHoras) return;

  function texto(id, valor) {
    var el = document.getElementById(id);
    if (el) el.textContent = valor;
  }

  function pintarHoras(porHora) {
    var maximo = 0;
    for (var h = 0; h < 24; h++) maximo = Math.max(maximo, porHora[String(h)] || 0);
    if (maximo <= 0) maximo = 1;

    var html = '';
    for (var i = 0; i < 24; i++) {
      var v = porHora[String(i)] || 0;
      var alto = Math.round((v / maximo) * 100);
      // La franja de tarde-noche se resalta: es donde se juega de verdad.
      var clase = v >= maximo * 0.75 ? ' is-pico' : '';
      html += '<div class="hora' + clase + '" title="' + String(i).padStart(2, '0') + ':00 · ' + v + ' jugadores">'
            + '<div class="hora__barra" style="height:' + Math.max(alto, 2) + '%"></div>'
            + '<span class="hora__label">' + String(i).padStart(2, '0') + '</span>'
            + '</div>';
    }
    contenedorHoras.innerHTML = html;
  }

  function pintarDias(historico) {
    var cont = document.getElementById('dias');
    if (!cont) return;
    var fechas = Object.keys(historico).sort().slice(-14);
    var maximo = 1;
    fechas.forEach(function (f) { maximo = Math.max(maximo, historico[f]); });

    var html = '';
    fechas.forEach(function (f) {
      var v = historico[f];
      var ancho = Math.round((v / maximo) * 100);
      var partes = f.split('-');
      html += '<div class="dia">'
            + '<span class="dia__fecha">' + partes[2] + '/' + partes[1] + '</span>'
            + '<span class="dia__barra"><i style="width:' + Math.max(ancho, 3) + '%"></i></span>'
            + '<span class="dia__valor">' + v + '</span>'
            + '</div>';
    });
    cont.innerHTML = html;
  }

  // Los nicks salen de los logs y ya vienen filtrados por [A-Za-z0-9_.], pero se escapan igual:
  // el dia que cambie el filtro de origen, esto sigue siendo seguro.
  function limpio(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pintarNicks(id, lista, vacio) {
    var cont = document.getElementById(id);
    if (!cont) return;
    if (!lista || !lista.length) {
      cont.innerHTML = '<p class="nicks__vacio">' + vacio + '</p>';
      return;
    }
    cont.innerHTML = lista.map(function (n) {
      return '<span class="nick">' + limpio(n) + '</span>';
    }).join('');
  }

  function fechaCorta(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] : iso;
  }

  function pintarJugadores(lista) {
    var tabla = document.getElementById('tabla-jugadores');
    var boton = document.getElementById('jugadores-mas');
    if (!tabla || !lista) return;
    var cuerpo = tabla.querySelector('tbody');
    var TOPE = 25;
    var todos = false;

    function render() {
      var visibles = todos ? lista : lista.slice(0, TOPE);
      cuerpo.innerHTML = visibles.map(function (j) {
        return '<tr' + (j.nuevo ? ' class="es-nuevo"' : '') + '>'
             + '<td class="jug__nick">' + limpio(j.nick)
             + (j.nuevo ? ' <span class="etiqueta-nueva">nuevo</span>' : '') + '</td>'
             + '<td>' + j.dias + '</td>'
             + '<td>' + fechaCorta(j.primera) + '</td>'
             + '<td>' + fechaCorta(j.ultima) + '</td>'
             + '<td>' + limpio(j.franja) + '</td>'
             + '</tr>';
      }).join('');
      if (lista.length > TOPE) {
        boton.hidden = false;
        boton.textContent = todos ? 'Ver solo los 25 más habituales' : 'Ver los ' + lista.length + ' jugadores';
      }
    }

    boton.addEventListener('click', function () { todos = !todos; render(); });
    render();
  }

  fetch('/api/metricas', { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || d.error) {
        texto('frase-mes', 'Las métricas todavía no se han generado. Vuelve mañana.');
        return;
      }
      texto('frase-mes', d.frases.mes);
      texto('frase-semana', d.frases.semana);
      texto('frase-hora', 'Media de jugadores conectados a la vez en cada hora, en horario de Chile. La gente suele estar '
            + (d.mes ? d.mes.franja_habitual : '') + '.');

      texto('v-hoy', d.hoy.pico);
      texto('v-ayer', d.ayer.pico);
      texto('v-semana', d.semana ? d.semana.pico_medio : '–');
      texto('v-mes', d.mes ? d.mes.pico_medio : '–');
      texto('v-max', d.mes ? d.mes.pico_maximo : '–');
      texto('v-distintos', d.mes ? d.mes.jugadores_distintos : '–');

      if (d.mes) pintarHoras(d.mes.por_hora);
      if (d.historico) pintarDias(d.historico);

      var deHoy = (d.hoy && d.hoy.jugadores) || [];
      pintarNicks('nicks-hoy', deHoy, 'Todavía no ha entrado nadie hoy.');
      texto('frase-hoy', deHoy.length
        ? 'Han pasado ' + deHoy.length + (deHoy.length === 1 ? ' persona' : ' personas') + ' desde las 00:00.'
        : 'Todavía no ha entrado nadie hoy.');

      pintarNicks('nicks-nuevos', d.nuevos, 'Esta semana no ha llegado nadie nuevo todavía.');
      if (d.frases && d.frases.nuevos) texto('frase-nuevos', d.frases.nuevos);

      pintarJugadores(d.jugadores);

      var cuando = new Date(d.generado);
      texto('pie', 'Calculado el ' + cuando.toLocaleDateString('es-CL') + ' a las '
            + cuando.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
            + '. Se recalcula cada madrugada.');
    })
    .catch(function () {
      texto('frase-mes', 'No se pudieron cargar las métricas.');
    });
})();
