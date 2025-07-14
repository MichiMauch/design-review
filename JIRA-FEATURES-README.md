# JIRA Integration - Erweiterte Features

## 🚀 Neue Features für JIRA-Integration

### 1. Automatische User-Zuweisung
**Assignee-Auswahl:**
- Dynamisches Dropdown mit allen aktiven JIRA-Benutzern
- Account-IDs werden automatisch abgerufen
- Fallback auf manuelle Account-ID-Eingabe

```javascript
// Automatisch geladene User-Liste:
👤 Max Mustermann (max@firma.com)
👤 Anna Schmidt (anna@firma.com)
👤 Tom Weber (tom@firma.com)
```

### 2. Flexible Label-Verwaltung
**Standard-Labels:**
- Komma-getrennte Label-Liste
- Automatische Hinzufügung zu allen Tickets
- Standard-Labels: `website-feedback, design-review`

```
Beispiel: website-feedback, bug, ui-issue, urgent
```

### 3. Intelligentes Fälligkeitsdatum
**Due Date Konfiguration:**
- Dropdown mit vordefinierten Zeiträumen
- Automatische Berechnung ab Ticket-Erstellung
- Optionen: 1 Tag, 3 Tage, 1 Woche, 2 Wochen, 1 Monat

## 🔧 Konfiguration

### JIRA Settings Modal
Das erweiterte Settings-Modal bietet jetzt:

1. **Server-Konfiguration**
   - JIRA Server URL
   - Benutzername/E-Mail
   - API Token

2. **Projekt-Auswahl**
   - Automatische Projekt-Liste nach Verbindungstest
   - Standard-Issue-Type (Task, Bug, Story, etc.)

3. **User-Management**
   - Dropdown mit aktiven JIRA-Benutzern
   - Account-ID-basierte Zuweisung
   - Fallback auf manuelle Eingabe

4. **Label-Konfiguration**
   - Mehrzeiliges Textarea für bessere Übersicht
   - Automatische Label-Zuweisung

5. **Datum-Management**
   - Vordefinierte Fälligkeitsdauer
   - Keine Zeitzone-Probleme (UTC-basiert)

## 🔄 API-Erweiterungen

### Neue JIRA API Endpoints:

**GET /api/jira?action=getUsers**
```javascript
// Response:
{
  "success": true,
  "users": [
    {
      "accountId": "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077",
      "displayName": "Max Mustermann",
      "emailAddress": "max@firma.com",
      "active": true
    }
  ]
}
```

**POST /api/jira (createTicket mit erweiterten Feldern)**
```javascript
// Request Body:
{
  "action": "createTicket",
  "feedback": { /* feedback data */ },
  "jiraConfig": {
    "defaultAssignee": "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077",
    "defaultLabels": "website-feedback, bug, urgent",
    "defaultDueDateDays": "7"
  }
}
```

## 🎯 Verwendung

### 1. Initial-Setup
```bash
# 1. Admin-Review öffnen
http://localhost:3000/admin-review

# 2. Settings öffnen (⚙️ Icon)

# 3. JIRA-Credentials eingeben

# 4. "Verbindung testen" klicken
# → Lädt automatisch Projekte und User

# 5. Konfiguration speichern
```

### 2. Ticket-Erstellung
```bash
# 1. Feedback in der Sidebar auswählen

# 2. "JIRA Ticket erstellen" klicken

# 3. Ticket wird automatisch erstellt mit:
#    ✅ Assignee (falls konfiguriert)
#    ✅ Labels (automatisch hinzugefügt)
#    ✅ Due Date (berechnet)
#    ✅ Screenshot (als Anhang)
```

## 📋 Ticket-Struktur

### Automatisch generiertes JIRA-Ticket:
```
Titel: Website Feedback: [Feedback-Text (erste 100 Zeichen)]

Beschreibung:
Feedback von der Website:

[Vollständiger Feedback-Text]

URL: https://example.com/page
Erstellt am: 13.07.2025, 14:30:00
Markierter Bereich: 300×200px bei Position (150, 400)

Anhänge:
📎 feedback-123-screenshot.png

Labels: website-feedback, design-review, bug
Assignee: Max Mustermann
Due Date: 20.07.2025 (7 Tage ab heute)
```

## 🚨 Wichtige Hinweise

### Account-IDs vs. E-Mails
- JIRA Cloud verwendet Account-IDs, nicht E-Mail-Adressen
- User-Dropdown zeigt E-Mail für bessere Lesbarkeit
- Intern wird Account-ID für API-Calls verwendet

### Label-Limitierungen
- JIRA hat Label-Längenbeschränkungen
- Keine Leerzeichen in Labels erlaubt
- Automatische Bereinigung: `my label` → `my-label`

### Due Date Format
- JIRA erwartet Format: `YYYY-MM-DD`
- Automatische UTC-Berechnung ohne Zeitzone-Probleme
- Fälligkeitsdatum ist optional

## 🔄 Workflow-Integration

### Kompletter Review-zu-JIRA Workflow:
```
1. 📱 User gibt Feedback über Widget
2. 📊 Feedback erscheint in Admin-Review
3. 🔍 Admin reviewt Feedback visuell
4. ⚙️ Admin konfiguriert JIRA (einmalig)
5. 🎫 Admin erstellt JIRA-Ticket mit einem Klick
6. 📋 Ticket enthält alle Kontext-Informationen
7. 👥 Team kann in JIRA weiterarbeiten
```

Diese Integration macht das Design Review Tool zu einer vollständigen Feedback-zu-Task-Management-Pipeline!
