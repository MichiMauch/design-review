# Widget Integration Guide

## Direkte JavaScript-Integration

Für die einfachste Integration des Feedback-Widgets verwenden Sie das folgende Script-Tag direkt in Ihrer HTML-Seite:

```html
<script src="http://localhost:3000/widget.js" data-project-id="netnode-test" defer></script>
```

### Parameter

- **src**: URL zu Ihrem Design Review Server
- **data-project-id**: Eindeutige Projekt-ID für die Zuordnung des Feedbacks
- **defer**: Lädt das Script nach dem HTML-Parsing (empfohlen)

### Beispiel

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Meine Website</title>
</head>
<body>
    <h1>Willkommen</h1>
    <p>Ihre Website-Inhalte...</p>
    
    <!-- Feedback Widget am Ende der Seite -->
    <script src="http://localhost:3000/widget.js" data-project-id="netnode-test" defer></script>
</body>
</html>
```

### Funktionalität

Das Widget erstellt automatisch:
- ✅ Einen Feedback-Button in der unteren rechten Ecke
- ✅ Ein Auswahlwerkzeug für Bereiche der Seite
- ✅ Ein Formular zur Texteingabe
- ✅ Automatische Screenshot-Erstellung
- ✅ Übertragung an Ihren Design Review Server

### Anpassungen

- **Position**: Das Widget erscheint standardmäßig unten rechts
- **Projekt-ID**: Ändern Sie `data-project-id` für verschiedene Projekte
- **Server-URL**: Passen Sie die `src`-URL an Ihren Server an

### Localhost vs. Production

- **Entwicklung**: `http://localhost:3000/widget.js`
- **Production**: `https://ihr-domain.com/widget.js`

### Browser-Kompatibilität

- ✅ Chrome/Edge (88+)
- ✅ Firefox (85+)
- ✅ Safari (14+)
- ✅ Mobile Browser

### Fehlerbehebung

1. **Widget lädt nicht**: Überprüfen Sie die Server-URL und CORS-Einstellungen
2. **Feedback wird nicht gesendet**: Prüfen Sie die Netzwerk-Registerkarte der Entwicklertools
3. **Script-Fehler**: Stellen Sie sicher, dass das `defer`-Attribut gesetzt ist
