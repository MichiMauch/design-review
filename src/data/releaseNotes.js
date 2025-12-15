// Release Notes - Neue Releases oben hinzufügen
export const releases = [
  {
    version: '1.3',
    date: '15. Dezember 2025',
    features: [
      { type: 'new', text: 'Favicon Generator zum Erstellen aller Icon-Grössen mit HTML-Code' },
      { type: 'new', text: 'Social Media Previews für Facebook, LinkedIn und WhatsApp' },
      { type: 'improved', text: 'Google Preview mit realistischerem Desktop und Mobile Design' },
    ]
  },
  {
    version: '1.2',
    date: '12. Dezember 2025',
    features: [
      { type: 'new', text: 'AI-powered Content-Qualitätsanalyse' },
      { type: 'new', text: 'GTM Cookie Banner Erkennung für Privacy-Analyse' },
      { type: 'fixed', text: 'JIRA Integration 500 Error behoben' },
      { type: 'improved', text: 'Analyse-Tools neu organisiert in Dropdown-Menü' },
    ]
  },
  {
    version: '1.1',
    date: '8. Dezember 2025',
    features: [
      { type: 'new', text: 'Widget Installation Card auf der Settings-Seite' },
      { type: 'new', text: 'Meta-Tags Analyse mit OG und Twitter Card Prüfung' },
      { type: 'new', text: 'Icons-Analyse für Favicons und Touch Icons' },
      { type: 'improved', text: 'Verbesserte SEO-Analyse mit Sortierung' },
    ]
  },
  {
    version: '1.0',
    date: '1. Dezember 2025',
    features: [
      { type: 'new', text: 'Design Review Tool Launch' },
      { type: 'new', text: 'Projekt-Management mit Kanban Board' },
      { type: 'new', text: 'Screenshot-Feedback Widget' },
      { type: 'new', text: 'JIRA Integration' },
      { type: 'new', text: 'Magic Link Authentifizierung' },
    ]
  },
];

// Hilfsfunktion um die neueste Version zu bekommen
export const getLatestVersion = () => releases[0]?.version || '1.0';

// Hilfsfunktion um alle Features einer bestimmten Version zu bekommen
export const getVersionFeatures = (version) => {
  const release = releases.find(r => r.version === version);
  return release?.features || [];
};

// Hilfsfunktion um Anzahl neuer Features zu zählen
// Zeigt die Anzahl Features im neuesten Release wenn noch nicht gelesen
export const getUnreadCount = (lastSeenVersion) => {
  const latestVersion = releases[0]?.version;
  if (lastSeenVersion === latestVersion) return 0;
  return releases[0]?.features?.length || 0;
};
