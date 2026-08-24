(function () {
  const ip = 'mc.drakescraft.cl';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setStatus(data) {
    const online = Boolean(data?.enLinea);
    const players = Number.isFinite(data?.jugadores) ? data.jugadores : null;
    const label = online
      ? players === 1 ? '1 jugador construyendo su legado ahora' : `${players} jugadores construyendo su legado ahora`
      : 'Servidor en comprobación';
    document.querySelectorAll('[data-live-status]').forEach((node) => node.classList.toggle('is-online', online));
    document.querySelectorAll('[data-live-label]').forEach((node) => { node.textContent = label; });
    document.querySelectorAll('[data-live-count]').forEach((node) => { node.textContent = online ? `${players} ${players === 1 ? 'jugador conectado' : 'jugadores conectados'}` : 'Estado no disponible'; });
    document.querySelectorAll('[data-live-version]').forEach((node) => { node.textContent = data?.version || 'Java + Bedrock'; });
  }

  async function refreshStatus() {
    try {
      const response = await fetch('/api/server-status', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`Estado HTTP ${response.status}`);
      setStatus(await response.json());
    } catch (error) {
      console.warn('[home] No se pudo consultar el estado de Minecraft', error);
      setStatus(null);
    }
  }

  function copyIp(button) {
    const label = button.querySelector('[data-copy-label]');
    navigator.clipboard.writeText(ip).then(() => {
      const previous = label?.textContent;
      if (label) label.textContent = 'IP copiada';
      window.showToast?.('IP copiada: mc.drakescraft.cl');
      window.setTimeout(() => { if (label) label.textContent = previous; }, 1800);
    }).catch(() => window.showToast?.('Copia esta IP: mc.drakescraft.cl'));
  }

  function setupReveal() {
    const nodes = document.querySelectorAll('.reveal');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    nodes.forEach((node) => observer.observe(node));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-copy-ip]').forEach((button) => button.addEventListener('click', () => copyIp(button)));
    setupReveal();
    refreshStatus();
    window.setInterval(refreshStatus, 60000);
  });
}());
