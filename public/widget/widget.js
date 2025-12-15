// Proxy: Lädt die einfache Widget-Version ohne komplexe Crop-Logik
// Umschalten zwischen widget-new.js (komplex) und widget-simple.js (einfach)
(function() {
  // Finde das aktuelle Script-Element (auch wenn dynamisch geladen)
  var currentScript = document.currentScript ||
    document.querySelector('script[data-project-id][src*="widget.js"]') ||
    document.querySelector('script[src*="widget.js"]');

  // Immer die moderne Widget-Version laden
  var script = document.createElement('script');
  var baseUrl = '';

  if (currentScript && currentScript.src) {
    baseUrl = currentScript.src.replace(/widget\.js.*$/, '');
  }

  script.src = baseUrl + 'widget-new.js';
  script.async = false;

  // Attribute wie data-project-id übernehmen
  if (currentScript) {
    Array.from(currentScript.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        script.setAttribute(attr.name, attr.value);
      }
    });
  }

  // Script einfügen
  if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(script, currentScript.nextSibling);
  } else {
    document.head.appendChild(script);
  }
})();
