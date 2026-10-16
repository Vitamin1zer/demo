/* LEOSEO — interactions for plain-HTML pages (React components do this themselves).
   [data-tilt] link cards: tilt ±5° + lift 6 px following the pointer. .leo-bar: .is-scrolled after 8 px, anchor scroll-spy.
   Respects prefers-reduced-motion. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tilt(el){
    el.addEventListener('pointermove', function(e){
      if (reduce || e.pointerType === 'touch') return;
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.classList.add('is-tilting');
      el.style.transform = 'perspective(800px) rotateX(' + (-py * 10).toFixed(2) + 'deg) rotateY(' + (px * 10).toFixed(2) + 'deg) translateY(var(--tilt-lift))';
    });
    el.addEventListener('pointerleave', function(){ el.classList.remove('is-tilting'); el.style.transform = ''; });
  }
  var io;
  function init(){
    [].forEach.call(document.querySelectorAll('[data-tilt]'), tilt);
    [].forEach.call(document.querySelectorAll('.leo-bar'), function(b){
      var on = function(){ b.classList.toggle('is-scrolled', window.scrollY > 8); };
      on(); window.addEventListener('scroll', on, { passive: true });
      var links = [].slice.call(b.querySelectorAll('.leo-bar__a[href^="#"]'));
      var els = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
      if (!('IntersectionObserver' in window) || !els.length) return;
      var vis = {};
      io = new IntersectionObserver(function(es){
        es.forEach(function(e){ vis[e.target.id] = e.isIntersecting; });
        var cur = els.filter(function(el){ return vis[el.id]; })[0];
        if (!cur) { var above = els.filter(function(el){ return el.getBoundingClientRect().top < 120; }); cur = above[above.length - 1]; }
        links.forEach(function(a){ if (cur && a.getAttribute('href') === '#' + cur.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      }, { rootMargin: '-72px 0px -55% 0px' });
      els.forEach(function(el){ io.observe(el); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
