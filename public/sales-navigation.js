/* Sales-only navigation: one destination, local feedback, retained venue context. */
(() => {
  'use strict';
  if (window.bdSalesNavigation) return;
  let pending = false, timer, active;
  const message = (text) => {
    let node = document.getElementById('sales-navigation-status');
    if (!node) {
      node = document.createElement('p'); node.id = 'sales-navigation-status';
      node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
      const host = document.querySelector('dialog[open] .editor-header, .pos-top, .sales-entry-shell>header, .sales-topbar');
      (host || document.body).append(node);
    }
    node.textContent = text;
  };
  function reset() {
    pending = false; clearTimeout(timer);
    if (active) { active.removeAttribute('aria-busy'); active.removeAttribute('data-sales-pending'); }
    active = null;
    document.getElementById('sales-navigation-status')?.remove();
  }
  function href(value) {
    let url; try { url = new URL(value, location.href); } catch { return null; }
    if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return null;
    const venue = new URL(location.href).searchParams.get('venue') || localStorage.getItem('bd_active_venue_id');
    if (venue && !url.searchParams.has('venue')) url.searchParams.set('venue', venue);
    url.searchParams.delete('embedded');
    return url.pathname + url.search + url.hash;
  }
  function navigate(value, control) {
    if (pending) return;
    const target = href(value); if (!target) return;
    if (window.bdStandaloneNavigation && !window.bdStandaloneNavigation.confirmDiscard()) return;
    if (!document.dispatchEvent(new CustomEvent('bd:sales-before-navigate', {cancelable:true, detail:{control, target}}))) return;
    pending = true; active = control;
    if (control) { control.setAttribute('aria-busy', 'true'); control.setAttribute('data-sales-pending', 'true'); }
    message('Открываем раздел…');
    // A stalled navigation remains retryable, with no modal or blocking overlay.
    timer = setTimeout(() => { reset(); message('Переход задерживается. Проверьте соединение и нажмите ещё раз.'); }, 12000);
    // Reuse the host inside Sales. Other modules hydrate their domain stores on document startup.
    // Retain that boundary so a just-posted sale is visible in Warehouse/Finance.
    const salesRoute = ['/sales-import','/sales-entry','/cashier'].includes(new URL(target, location.href).pathname);
    if (salesRoute && typeof window.top.bdNavigate === 'function') window.top.bdNavigate(target);
    else (window.top === window.self ? window : window.top).location.assign(target);
  }
  window.bdSalesNavigation = { navigate, href };
  // Registered before the legacy iframe bridge. Stop it from issuing a second action.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const control = event.target.closest?.('a[href], [data-open-route]');
    if (!control || control.matches('[download],[target="_blank"]')) return;
    const value = control.dataset.openRoute || control.getAttribute('href');
    if (!value || value.startsWith('#') || !href(value)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    navigate(value, control);
  }, true);
  window.addEventListener('pageshow', reset);
  window.addEventListener('popstate', reset);
  // A fullscreen Sales iframe owns the entire screen, including safe areas.
  // Read the outer viewport's resolved insets; do not assume iOS propagates env() into frames.
  function syncInsets() {
    if (window.top === window.self) return;
    try {
      const frame = window.frameElement;
      if (!frame || frame.title !== 'Продажи и склад') return;
      const probe = window.top.document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      window.top.document.body.append(probe);
      const style = window.top.getComputedStyle(probe);
      for (const side of ['top','right','bottom','left']) document.documentElement.style.setProperty('--bd-safe-'+side, style.getPropertyValue('padding-'+side));
      probe.remove();
    } catch { /* Cross-origin embeds retain their own CSS env() values. */ }
  }
  syncInsets(); window.addEventListener('resize', syncInsets); window.addEventListener('orientationchange', syncInsets);
})();
