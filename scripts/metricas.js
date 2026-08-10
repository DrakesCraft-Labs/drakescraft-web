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

      var cuando = new Date(d.generado);
      texto('pie', 'Calculado el ' + cuando.toLocaleDateString('es-CL') + ' a las '
            + cuando.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
            + '. Se recalcula cada madrugada.');
    })
    .catch(function () {
      texto('frase-mes', 'No se pudieron cargar las métricas.');
    });
})();
