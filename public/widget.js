// Proxy: Lädt die einfache Widget-Version ohne komplexe Crop-Logik
// Umschalten zwischen widget-new.js (komplex) und widget-simple.js (einfach)
(function() {
  // Immer die moderne Widget-Version laden
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
