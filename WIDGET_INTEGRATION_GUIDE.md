# Widget Integration Guide

## 🎯 Für externe Websites

Da CORS-Beschränkungen die automatische Widget-Injection verhindern, gibt es folgende Alternativen:

### Option 1: Bookmarklet (Einfachste Lösung)

Erstellen Sie ein Bookmarklet, das Benutzer in ihre Browser-Lesezeichen ziehen können:

```javascript
javascript:(function(){
  if(document.getElementById('feedback-widget')) {
    alert('Widget bereits geladen!');
    return;
  }
  var script = document.createElement('script');
  script.src = 'http://localhost:3000/widget.js?external=true';
  script.id = 'feedback-widget';
  script.setAttribute('data-project-id', 'external-review');
  document.head.appendChild(script);
  console.log('Feedback Widget geladen!');
})();
```

**Verwendung:**
1. Benutzer zieht Bookmarklet in Lesezeichen
2. Auf beliebiger Website: Klick auf Bookmarklet
3. Widget wird geladen und funktioniert

### Option 2: Browser Extension

Entwickeln Sie eine kleine Chrome/Firefox Extension:

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "Design Review Widget",
  "version": "1.0",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

### Option 3: Proxy-Lösung

Laden Sie externe Websites durch Ihren eigenen Server:

```javascript
// /api/proxy/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  
  const response = await fetch(targetUrl);
  const html = await response.text();
  
  // HTML modifizieren um Widget zu injizieren
  const modifiedHtml = html.replace(
    '</head>',
    '<script src="/widget.js"></script></head>'
  );
  
  return new Response(modifiedHtml, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

## 🏠 Für eigene/lokale Websites

Direktes Script-Tag einbinden:

```html
<script src="http://localhost:3000/widget.js" 
        data-project-id="my-project"></script>
```

## 🎨 UI-Verbesserung für Admin-Review

Zeigen Sie deutlich an, wann Widget-Injection möglich ist:

- ✅ Grüner Indikator: Same-Origin (localhost, eigene Domain)
- ⚠️ Gelber Indikator: Externe Website, Bookmarklet verfügbar
- ❌ Roter Indikator: Nicht unterstützt

## 📝 Bookmarklet Generator

Erstellen Sie eine Seite, die automatisch Bookmarklets generiert:

```javascript
function generateBookmarklet(projectId, serverUrl) {
  return `javascript:(function(){
    var script = document.createElement('script');
    script.src = '${serverUrl}/widget.js?project=${projectId}';
    document.head.appendChild(script);
  })();`;
}
```
