// Proxy: Lädt immer die aktuelle Widget-Logik aus widget-new.js
// Dies stellt sicher, dass /public/widget.js immer die aktuelle Version verwendet
(function() {
  var script = document.createElement('script');
  script.src = (document.currentScript && document.currentScript.src.replace(/widget\.js$/, 'widget-new.js')) || '/public/widget-new.js';
  script.async = false;
  // Attribute wie data-project-id übernehmen
  if (document.currentScript) {
    Array.from(document.currentScript.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        script.setAttribute(attr.name, attr.value);
      }
    });
  }
  document.currentScript.parentNode.insertBefore(script, document.currentScript.nextSibling);
})();
