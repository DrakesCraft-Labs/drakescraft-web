/*
 * Bootstrap integration bridge.
 *
 * The legacy portal already has functional navigation and checkout scripts.
 * This only maps stable, semantic regions to Bootstrap components/utility
 * classes; it never reads or changes payment, Tebex or catalogue state.
 */
(function bootstrapDrakesBridge() {
  const addClasses = (selector, ...classes) => {
    document.querySelectorAll(selector).forEach((element) => element.classList.add(...classes));
  };

  const applyBridge = () => {
    addClasses('.site-nav', 'navbar');
    addClasses('.site-nav__bar', 'container');
    addClasses('.brand', 'navbar-brand');
    addClasses('.site-nav__links', 'navbar-nav');
    addClasses('.nav-toggle', 'navbar-toggler');
    addClasses('.nav-discord', 'btn', 'btn-sm');
    addClasses('.home-button', 'btn');
    addClasses('.btn-scroll-catalog', 'btn');
    addClasses('.btn-compare-ranks', 'btn');
    addClasses('.guide-grid > article, .team-grid > article, .prose-page__grid > article', 'card');
    addClasses('.store-product-card, .command-card, .rank-card, .metric-card, .boss-card, .dios-card', 'card');
    addClasses('.store-status-pill, .health-badge, .count-badge', 'badge');
    addClasses('.checkout-form-modern input, .checkout-form-modern select, .checkout-form-modern textarea', 'form-control');
    addClasses('.checkout-submit, .store-add-button', 'btn');
    addClasses('.store-tabs-modern button, .platform-btn, .filter-button', 'btn');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBridge, { once: true });
  } else {
    applyBridge();
  }
})();
