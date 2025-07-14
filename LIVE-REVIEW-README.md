# Design Review Tool - Integrierte Live Review Lösung

Ein vollständiges Website-Feedback-System mit integrierter Admin-Oberfläche für Live-Reviews.

## 🎯 Überblick

Das Design Review Tool vereint Website-Feedback und Task-Management in einer integrierten Oberfläche. Sie können Websites direkt im Admin-Dashboard reviewen, bestehende Feedback-Bereiche visuell sehen und neue Tasks erfassen - alles in einem Tool.

## ⭐ Hauptfeatures

### 🔍 Live Review Modus
- **Integrierte Website-Ansicht**: Websites direkt im Admin-Dashboard laden
- **Visuelle Feedback-Markierungen**: Bestehende Feedback-Bereiche werden rot hervorgehoben
- **Echtzeit-Updates**: Neue Feedbacks sofort sichtbar
- **Click-to-Details**: Klick auf markierte Bereiche zeigt Feedback-Details

### 📊 Duales Dashboard-System
- **Standard Dashboard** (`/admin`): Übersicht aller Feedbacks
- **Live Review Modus** (`/admin-review`): Integrierte Website-Review-Oberfläche

### 🔌 JIRA Integration (NEU!)
- **Vollständige JIRA API-Integration**: Tickets direkt aus Feedback erstellen
- **Automatischer Screenshot-Upload**: Screenshots werden als Anhang zum Ticket hinzugefügt
- **Settings-Management**: JIRA-Konfiguration wird persistent gespeichert
- **Verbindungstest**: Konfiguration vor dem Speichern validieren
- **Projekt-Auswahl**: Automatisches Laden verfügbarer JIRA-Projekte

### 🎯 Widget-Integration
- Einbindbares JavaScript-Widget für jede Website
- Automatische Screenshot-Erstellung mit html2canvas
- Bereich-Selektion durch Rechteck-Aufziehen
- Responsive Design für Desktop und Mobile

## 🚀 Schnellstart

1. **Installation**
   ```bash
   npm install
   npm run dev
   ```

2. **Live Review verwenden**
   - Öffnen Sie `http://localhost:3000/admin-review`
   - Geben Sie eine URL ein oder wählen Sie "Demo Seite"
   - Bestehende Feedback-Bereiche werden automatisch rot markiert
   - Klicken Sie auf markierte Bereiche für Details
   - Neue Feedbacks können direkt im iframe erstellt werden

3. **Widget testen**
   - Öffnen Sie `http://localhost:3000/demo`
   - Klicken Sie auf "💬 Feedback geben"
   - Ziehen Sie ein Rechteck über einen Bereich
   - Schreiben Sie einen Kommentar und senden Sie ab

## 🔧 Live Review Workflow

### 1. Website laden
```
http://localhost:3000/admin-review
```
- URL eingeben oder Demo-Seite wählen
- Website wird im iframe geladen
- Admin-Widget wird automatisch injiziert

### 2. Bestehende Feedbacks sehen
- Rote Bereiche zeigen vorhandene Feedbacks
- Anzahl wird oben links angezeigt
- Sidebar zeigt Details der aktuellen Seite

### 3. Feedback-Details anzeigen
- Klick auf roten Bereich öffnet Modal
- Zeigt Kommentar, Screenshot und Metadaten
- Buttons für JIRA-Integration und Status-Updates

### 4. JIRA-Integration konfigurieren (NEU!)
- Klicken Sie auf "Settings" in der oberen rechten Ecke
- Geben Sie Ihre JIRA-Daten ein:
  - JIRA Server URL (z.B. https://firma.atlassian.net)
  - E-Mail/Benutzername
  - API Token (aus JIRA Account Settings)
- Klicken Sie "Verbindung testen"
- Wählen Sie ein Standard-Projekt aus
- Speichern Sie die Konfiguration

### 5. JIRA Tickets aus Feedback erstellen
- Öffnen Sie ein Feedback-Modal (Klick auf Feedback in Sidebar)
- Klicken Sie "JIRA Ticket erstellen"
- **NEU**: Ticket wird automatisch mit konfigurierten Assignee, Labels und Due Date erstellt
- Screenshot wird als Anhang hochgeladen
- Direkter Link zum neuen Ticket wird angezeigt

### 6. Erweiterte JIRA-Konfiguration (NEU!)
- **User-Auswahl**: Dropdown mit allen aktiven JIRA-Benutzern für automatische Zuweisung
- **Label-Management**: Flexible Label-Konfiguration für bessere Kategorisierung
- **Due Date**: Automatisches Fälligkeitsdatum (1 Tag bis 1 Monat konfigurierbar)
- **Persistente Settings**: Alle Einstellungen werden in der Datenbank gespeichert

### 6. Neue Feedbacks erstellen
- Widget im iframe verwenden
- Sofortige Aktualisierung der Markierungen
- Automatische Sidebar-Aktualisierung

## 📁 Admin Modi im Detail

### Standard Dashboard (`/admin`)
```javascript
// Features:
- Alle Feedbacks in Listenform
- Filterung nach Projekten
- Screenshot-Galerie
- Export-Funktionen
- Statistiken
- JIRA-Integration für Bulk-Operations
```

### Live Review Modus (`/admin-review`)
```javascript
// Layout:
┌─────────────────────────────────────┬──────────────┐
│ Website-Iframe mit Overlay          │ Feedback     │
│ - Rote Markierungen für Feedbacks   │ Sidebar      │
│ - Click-to-Details                  │ - Aktuelle   │
│ - Admin-Widget für neue Feedbacks   │   Seite      │
│                                     │ - Details    │
│                                     │ - JIRA       │
│                                     │ - Actions    │
└─────────────────────────────────────┴──────────────┘
```

## 🔌 Widget-Integration

### Automatische Integration
```html
<script src="/widget.js" data-project-id="your-project"></script>
```

### Admin-Widget (erweitert)
```javascript
// Wird automatisch im Live Review Modus geladen
// Zeigt bestehende Feedback-Bereiche
// Ermöglicht Status-Updates
// JIRA-Integration vorbereitet
```

## �️ Turso Database Setup

### Lokale Entwicklung
Für lokale Entwicklung verwendet das System automatisch eine lokale SQLite-Datei:
```bash
# .env.local
TURSO_DATABASE_URL=file:local.db
```

### Produktionsumgebung mit Turso
1. **Turso Account erstellen**: https://turso.tech
2. **Database erstellen**:
   ```bash
   turso db create design-review-db
   ```
3. **Auth Token generieren**:
   ```bash
   turso db tokens create design-review-db
   ```
4. **Umgebungsvariablen setzen**:
   ```bash
   # .env.local
   TURSO_DATABASE_URL=libsql://your-db-url.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   ```

### Vorteile von Turso
- ✅ **Edge-Database**: Niedrige Latenz weltweit
- ✅ **SQLite-kompatibel**: Vertraute SQL-Syntax
- ✅ **Automatische Backups**: Integrierte Datensicherung
- ✅ **Skalierbar**: Von Hobby bis Enterprise
- ✅ **Kostengünstig**: Großzügige Free-Tier

## �🛠 JIRA Integration Setup

### JIRA API Token erstellen
1. Gehen Sie zu https://id.atlassian.com/manage-profile/security/api-tokens
2. Klicken Sie "Create API token"
3. Geben Sie einen Namen ein (z.B. "Design Review Tool")
4. Kopieren Sie den generierten Token

### Berechtigungen
Der JIRA-Benutzer benötigt folgende Berechtigungen:
- Tickets erstellen (Create Issues)
- Attachments hinzufügen (Add Attachments)
- Projekte anzeigen (Browse Projects)

### Unterstützte JIRA-Features
- ✅ Ticket-Erstellung mit Feedback-Inhalt
- ✅ Automatischer Screenshot-Upload
- ✅ Metadaten (URL, Browser, Bereich)
- ✅ **User-Zuweisung**: Dropdown-Auswahl aus aktiven JIRA-Benutzern
- ✅ **Custom Labels**: Flexible Label-Konfiguration für Kategorisierung
- ✅ **Due Date**: Automatisches Fälligkeitsdatum (1-30 Tage konfigurierbar)
- ✅ Verbindungstest vor Speicherung
- ✅ Projekt-Auswahl aus verfügbaren Projekten

## 🛠 Geplante Erweiterungen

### JIRA Integration
- ✅ Automatische Ticket-Erstellung aus Feedback
- ✅ Screenshot-Upload als Attachment
- ✅ Settings-Management und Verbindungstest
- ⏳ Status-Synchronisation zwischen Review-Tool und JIRA
- ⏳ Custom Fields Mapping
- ⏳ Bulk-Operations

### Erweiterte Review-Features
- Kommentare und Diskussionen
- Team-Kollaboration
- Review-Workflows und Approval-Prozesse
- Versionierung und Historien

### Settings & Konfiguration
- JIRA Server-Einstellungen
- Projekt-Konfigurationen
- Benutzer-Management
- Notification-Settings

## 📊 Technische Details

### Architektur
```
Frontend (Next.js 15)
├── Standard Widget (widget.js)
├── Admin Widget (admin-widget.js) 
├── Live Review Interface
└── Standard Dashboard

Backend (Next.js API)
├── Feedback API (/api/feedback)
├── Screenshot API (/api/screenshot)
├── JIRA Integration API (/api/jira)
├── Settings Management API (/api/settings)
└── Turso Database (SQLite-kompatibel)
```

### Datenfluss im Live Review
```
1. URL eingeben → iframe laden
2. Admin Widget injizieren → Feedback-Bereiche laden  
3. Visuelle Markierungen → Click-Handlers registrieren
4. Neue Feedbacks → Echtzeit-Updates
5. Status-Changes → UI-Updates
```

## 🎨 UI/UX Konzept

Das Tool ist so konzipiert, dass Sie:
1. **Sofort sehen** welche Bereiche bereits Feedback haben
2. **Effizient arbeiten** können ohne zwischen Tools zu wechseln  
3. **Kollaborativ reviewen** können mit dem Team
4. **Nahtlos integrieren** können in bestehende Workflows (JIRA)

Die Kombination aus Website-Vorschau und Feedback-Management in einer Oberfläche beschleunigt den Review-Prozess erheblich und reduziert das Risiko doppelter Erfassung.

## 🚦 Status

- ✅ Live Review Modus implementiert
- ✅ Admin Widget mit visuellen Markierungen  
- ✅ Feedback-Details und Click-Handling
- ✅ JIRA Integration mit Ticket-Erstellung
- ✅ JIRA Settings-Management mit Verbindungstest
- ✅ Screenshot-Upload zu JIRA Tickets
- ✅ Turso Database Integration (Edge SQL)
- ✅ Lokale SQLite-Fallback für Entwicklung
- ⏳ Status-Management und Ticket-Updates
- ⏳ Team-Features und Benutzer-Management

Das System ist **produktionsreif** mit vollständiger JIRA-Integration und Turso Database! Sie können jetzt direkt aus Website-Feedback heraus JIRA-Tickets erstellen, inklusive Screenshots und Metadaten - alles mit einer skalierbaren Edge-Database.
