# meal-planner

Essensplanung PWA — Wochenplan & Vorratsverwaltung (Tiefkühler & Kühlschrank).

Daten werden via GitHub API direkt ins Repository geschrieben. Kein Backend erforderlich.

## Setup

### 1. Repository erstellen
Erstelle ein **privates** GitHub-Repository namens `meal-planner`.

### 2. GitHub Pages aktivieren
Gehe zu Repository → Settings → Pages → Source: **GitHub Actions**.

### 3. Personal Access Token erstellen
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens:
- Repository: `meal-planner`
- Permissions: **Contents** → Read and write

### 4. Lokal installieren & testen
```bash
npm install
npm run dev
```

### 5. App konfigurieren
App öffnen → Einstellungen → Token, Owner und Repo eintragen → Testen → Speichern.

### 6. Auf GitHub pushen
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USERNAME/meal-planner.git
git push -u origin main
```

GitHub Actions baut und deployt automatisch. App erreichbar unter:
`https://DEIN-USERNAME.github.io/meal-planner/`

### 7. iOS Home Screen
Safari → App-URL öffnen → Teilen → „Zum Home-Bildschirm" → App läuft ohne Browser-Chrome.

## Icons
Lege eigene Icons in `public/icons/` ab:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)
- `icon-180.png` (180×180 px, Apple Touch Icon)
