const PANTHEON = [
  ['Zeus','dios','Cielo, tormenta y viajes','Chispa regia|Mitiga tormenta y rayos.','Paso del rayo|Impulso breve fuera de combate.','Barómetro|Lee cambios meteorológicos cercanos.'],
  ['Hera','dios','Hogar, pactos y defensa','Velo del hogar|Reduce daño ambiental en tu territorio.','Juramento|Soporte temporal para un aliado.','Guardia nupcial|Defensa de grupo limitada.'],
  ['Poseidón','dios','Mar y exploración acuática','Pulmón marino|Respiración y nado mejorados.','Corriente|Impulso acuático limitado.','Marea serena|Pesca y exploración marina.'],
  ['Deméter','dios','Cultivo y abundancia','Mano fértil|Más experiencia de agricultura.','Cosecha ritual|Replanta cultivos propios maduros.','Estación dorada|Ventana de bonificación agrícola.'],
  ['Atenea','dios','Conocimiento y estrategia','Mente táctica|Experiencia de conocimiento configurado.','Análisis|Explica un objeto o máquina permitida.','Consejo|Muestra objetivos y riesgos contextuales.'],
  ['Apolo','dios','Luz y exploración','Luz sagrada|Visión segura en oscuridad.','Destello|Ilumina sin modificar bloques.','Oráculo|Pistas de exploración configuradas.'],
  ['Artemisa','dios','Naturaleza y caza PvE','Paso silvestre|Movilidad en naturaleza.','Rastro|Rastrea criaturas, nunca jugadores.','Luna cazadora|Bonificación PvE nocturna.'],
  ['Ares','dios','Combate PvE y temple','Temple|Menos retroceso en PvE.','Grito bélico|Buff breve contra criaturas.','Vanguardia|Postura solo para PvPDivino.'],
  ['Afrodita','dios','Calma y comercio','Encanto|Mejora intercambios configurados.','Serenidad|Reduce agresión de criaturas.','Pacto|Aura social consentida.'],
  ['Hefesto','dios','Forja, minería y Slimefun','Forja viva|Fundición autorizada.','Pulso de red|Energía a Mass Fabricator y UU Crafter.','Ojo de mena|Marca minerales visibles sin romperlos.'],
  ['Hermes','dios','Movilidad y rutas','Pies alados|Velocidad fuera de combate.','Ascenso de Ícaro|Levitación breve y caída lenta.','Ruta mercante|Costos de viaje configurados.'],
  ['Hestia','dios','Refugio y descanso','Brasa etérea|Fuego controlado en el hogar.','Fogata|Luz temporal sin fuego real.','Refugio|Aura de descanso autorizada.'],
  ['Hades','dios','Nether y tumbas','Guía estigia|Recuperación ligada a tumbas propias.','Velo de ceniza|Resistencia breve en Nether.','Pacto fúnebre|Protección bajo reglas AxGraves.'],
  ['Perséfone','dios','Ciclo y Nether','Semilla sombra|Cultivos autorizados del Nether.','Retorno|Menos hambre tras dimensión peligrosa.','Ciclo|Alterna cultivo y bonificación Nether.'],
  ['Hécate','dios','Rituales y umbrales','Runas|Lectura de rituales permitidos.','Umbral|Rutas seguras sin atravesar claims.','Triple luna|Postura ritual limitada.'],
  ['Dionisio','dios','Bebida y comunidad','Vendimia|Preparación de bebidas configuradas.','Festín|Saciedad limitada para aliados.','Éxtasis|Aura de evento sin combate.'],
  ['Eros','dios','Cooperación consentida','Empatía|Bonifica cooperación de grupo.','Lazo|Comparte apoyo temporal con aliados.','Corazón|Postura social sin PvP normal.'],
  ['Nike','dios','Objetivos y bosses','Impulso|Experiencia por objetivos completos.','Remate|Ventaja breve contra bosses configurados.','Corona|Postura de desafío para eventos.'],
  ['Némesis','dios','Riesgo y equilibrio','Equilibrio|Reduce extremos contra criaturas.','Juicio|Debilita un boss configurado.','Balanza|Riesgo y recompensa PvE.'],
  ['Morfeo','dios','Descanso y sigilo','Descanso|Mejor recuperación al dormir.','Sueño lúcido|Pista personal de exploración.','Niebla|Menor detección de criaturas.'],
  ['Helios','dios','Sol y avance diurno','Calor|Mejor visión de día.','Rayo solar|Destello PvE limitado.','Mediodía|Exploración bajo el sol.'],
  ['Selene','dios','Luna y cautela','Guía lunar|Visión y sigilo nocturnos.','Salto lunar|Caída lenta corta.','Plenilunio|Exploración nocturna segura.'],
  ['Tique','dios','Fortuna acotada','Fortuna menor|Recompensa configurada moderada.','Segunda oportunidad|Reintento no crítico.','Rueda|Evento con recompensa limitada.'],
  ['Océano','titan','Corriente primordial','Corriente primordial|Respiración y nado en agua.','Anillo del mundo|Corriente defensiva propia.','Río celeste|Exploración marina y recuperación.'],
  ['Ceo','titan','Orientación celeste','Eje celeste|Orientación y visión nocturna.','Consulta del polo|Coordenadas y dirección segura.','Cartografía astral|Reduce riesgos de viaje.'],
  ['Crío','titan','Estrellas y viaje','Pastor de estrellas|Movilidad nocturna.','Constelación|Salto lunar fuera de combate.','Estación|Resistencia en viajes largos.'],
  ['Hiperión','titan','Vigilia solar','Vigilia del sol|Visión y recuperación diurna.','Alba|Disipa oscuridad y da brillo.','Cenit|Resistencia ambiental solar.'],
  ['Japeto','titan','Temple y previsión','Temple mortal|Menos daño ambiental.','Previsión|Caída lenta y resistencia.','Legado|Supervivencia y recuperación propia.'],
  ['Cronos','titan','Ritmo y descanso','Ritmo antiguo|Recuperación natural.','Instante robado|Velocidad sin teletransporte.','Edad dorada|Reduce desgaste ambiental.'],
  ['Tea','titan','Vista y resplandor','Vista divina|Menos ceguera y más visión.','Refracción|Ruta de luz de cliente.','Resplandor|Visión y resistencia luminosa.'],
  ['Rea','titan','Amparo y tierra','Madre salvaje|Regeneración fuera de combate.','Amparo|Absorción personal breve.','Montaña viva|Resistencia y estabilidad.'],
  ['Temis','titan','Orden y defensa','Orden sagrado|Menos efectos negativos cortos.','Decreto|Limpia un efecto propio permitido.','Balanza cósmica|Defensa fuera de PvP normal.'],
  ['Mnemósine','titan','Memoria y concentración','Memoria perenne|Conservación de experiencia.','Recuerdo|Información de ubicación actual.','Musa|Concentración y maná configurado.'],
  ['Febe','titan','Oráculo y santuario','Oráculo antiguo|Visión nocturna estable.','Augurio|Pista sin revelar recursos.','Santuario|Protección lunar personal.'],
  ['Tetis','titan','Manantial y recuperación','Fuente nutricia|Respiración y recuperación en agua.','Manantial|Hambre y calor propios.','Cauce|Movilidad acuática y resistencia.']
];

const ASCENSION = [
  'Legado de ascensión|Pasiva mayor que intensifica la afinidad del patron.',
  'Descarga divina|Rayo de efecto contra criaturas hostiles; sin fuego, bloques ni jugadores.',
  'Ascenso divino|Vuelo temporal, impulso y caída segura fuera de combate.',
  'Dominio personal|Una postura local: clima personal, crecimiento, agua, luz o refugio según la senda.',
  'Veredicto|Un golpe PvE de 100 de daño contra una criatura hostil, con gran recarga.',
  'Avatar|Forma colosal temporal con resistencia, fuerza y presencia visible.',
  'Corona final|Pasiva de rango máximo para la especialidad elegida.'
];

const SKILL_TYPES = [
  'Pasiva equipada', 'Activa con recarga', 'Postura temporal', 'Pasiva mayor',
  'Activa ofensiva PvE', 'Activa de movilidad', 'Postura de dominio',
  'Activa de veredicto PvE', 'Postura de avatar', 'Pasiva final'
];

function renderPantheon(filter = 'all') {
  const grid = document.getElementById('divine-grid');
  if (!grid) return;
  grid.innerHTML = PANTHEON.filter(([, type]) => filter === 'all' || type === filter).map(([name, type, domain, ...skills]) => {
    const fullPath = [...skills, ...ASCENSION];
    return `<article class="divine-card"><div class="divine-card__top"><h3>${name}</h3><small>${type === 'titan' ? 'Titán' : 'Dios'}</small></div><p>${domain}</p><ol>${fullPath.map((skill, index) => { const [title, text] = skill.split('|'); return `<li><strong>${title}</strong><span>${SKILL_TYPES[index]}</span><br>${text}</li>`; }).join('')}</ol><p class="divine-card__meta">Niveles 1 a 10 · 1.200 a 42.000 Dragmas</p></article>`;
  }).join('');
}

document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach((entry) => entry.classList.remove('is-active')); button.classList.add('is-active'); renderPantheon(button.dataset.filter); }));
renderPantheon();
