/*
 * Shared site menu loader.
 * Replaces the fallback <nav data-site-menu="menu.html"> on each page with the
 * <nav class="site-nav"> from menu.html and marks the current page link.
 * If loading fails (offline, file://, JS disabled), the fallback links stay usable.
 * Everything is scoped to .site-nav; no global/document event handlers are added.
 */
(function () {
  'use strict';

  function pagePath(url) {
    return url.pathname.replace(/index\.html$/, '');
  }

  function markCurrent(nav) {
    var here = pagePath(new URL(window.location.href));
    var links = nav.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (pagePath(new URL(link.href)) === here) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  function loadMenu(fallback) {
    var src = new URL(fallback.getAttribute('data-site-menu'), window.location.href);
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;

    return fetch(src.href, { cache: 'no-cache', signal: controller ? controller.signal : undefined })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var source = doc.querySelector('nav.site-nav');
        if (!source || !source.querySelector('a[href]')) throw new Error('no .site-nav in ' + src.href);
        var nav = document.importNode(source, true);
        // Resolve links relative to menu.html so the menu works from any page location.
        var links = nav.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
          links[i].href = new URL(links[i].getAttribute('href'), src).href;
        }
        nav.setAttribute('data-site-menu-state', 'loaded');
        markCurrent(nav);
        fallback.replaceWith(nav);
      })
      .catch(function (error) {
        fallback.setAttribute('data-site-menu-state', 'fallback');
        if (window.console) console.warn('Site menu: using fallback links (' + error.message + ')');
      })
      .then(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function init() {
    var navs = document.querySelectorAll('nav.site-nav');
    for (var i = 0; i < navs.length; i++) {
      markCurrent(navs[i]);
      if (navs[i].hasAttribute('data-site-menu') && window.fetch && window.DOMParser) {
        loadMenu(navs[i]);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
