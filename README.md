# Website Review Tool MVP

Ein minimales MVP für ein Live-Website-Review-Tool mit einbindbarem JavaScript-Widget.

## Features

- **Einbindbares Widget**: Einfache Integration mit einem Script-Tag
- **Live Feedback**: Nutzer können direkt auf der Website Feedback geben
- **Automatische Screenshots**: Mit html2canvas vom aktuellen Viewport
- **SQLite Datenbank**: Lokale Speicherung aller Feedbacks
- **Admin Dashboard**: Übersicht aller eingegangenen Feedbacks
- **Projekt-basiert**: Feedback nach Projekt-ID organisiert

## Technologie Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Datenbank**: SQLite3
- **Screenshots**: html2canvas
- **Icons**: Lucide React

## 📦 Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd design-review
```

2. Dependencies installieren:
```bash
npm install
```

3. Development Server starten:
```bash
npm run dev
```

4. Browser öffnen: [http://localhost:3000](http://localhost:3000)

## 🏗️ Projektstruktur

```
src/
├── app/
│   ├── page.tsx              # Startseite
│   ├── preview/page.tsx      # Preview-Seite
│   ├── config/page.tsx       # JIRA Konfiguration
│   └── api/
│       └── screenshot/route.ts # NodeHive API Integration
├── components/
│   ├── URLInput.tsx          # URL-Eingabe Komponente
│   ├── PreviewViewer.tsx     # Preview mit Kommentar-System
│   ├── CommentList.tsx       # Kommentar-Liste
│   ├── ModeToggle.tsx        # Browse/Comment Mode Toggle
│   └── JiraConfig.tsx        # JIRA Konfiguration
├── lib/
│   ├── types.ts              # TypeScript Interfaces
│   ├── utils.ts              # Utility Functions
│   └── api.ts                # API Helper Functions
```

## 🎯 Verwendung

### 1. URL eingeben
- Geben Sie eine Website-URL auf der Startseite ein
- Das System erstellt automatisch einen Screenshot

### 2. Comment Mode aktivieren
- Wechseln Sie vom Browse Mode in den Comment Mode
- Klicken Sie auf beliebige Stellen im Screenshot
- Fügen Sie Kommentare hinzu

### 3. Kommentare verwalten
- Bearbeiten oder löschen Sie Kommentare
- Exportieren Sie alle Kommentare als JSON

### 4. JIRA Integration (Vorbereitung)
- Konfigurieren Sie Ihre JIRA-Verbindung unter `/config`
- API Token in JIRA erstellen
- Server-URL und Credentials eingeben

## 🔧 API Integration

### NodeHive Screenshot API
Die Anwendung nutzt die NodeHive Preview API:
- Endpoint: `https://preview.nodehive.com`
- Parameter: url, width, height, format
- Standardauflösung: 1200x800 PNG

### JIRA API (Vorbereitung)
Mock-Implementation für zukünftige JIRA-Integration:
- Automatische Ticket-Erstellung
- Screenshot-Anhänge
- Kommentare als Beschreibung

## 🌍 Deployment

### Vercel (Empfohlen)
1. Repository mit Vercel verknüpfen
2. Automatisches Deployment bei Git Push
3. Environment Variables konfigurieren

### Andere Plattformen
Das Projekt ist kompatibel mit:
- Netlify
- AWS Amplify
- Docker

## 📝 Environment Variables

Erstellen Sie eine `.env.local` Datei:

```env
# Optional: Custom API Endpoints
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## 🤝 Contributing

1. Fork das Repository
2. Feature Branch erstellen: `git checkout -b feature/neue-funktion`
3. Commit: `git commit -m 'Neue Funktion hinzufügen'`
4. Push: `git push origin feature/neue-funktion`
5. Pull Request erstellen

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## 🐛 Issues & Support

Bei Problemen oder Fragen erstellen Sie bitte ein [Issue](https://github.com/your-repo/design-review/issues).
# Deploy trigger
