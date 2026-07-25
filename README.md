# 📁 Directory Display App

![Electron](https://img.shields.io/badge/Electron-43.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vitest](https://img.shields.io/badge/Vitest-4.1.10-76E2EA?style=for-the-badge&logo=vitest&logoColor=black)

**Directory Display App** est une application desktop n'exigeant aucun framework lourd (développée en **Vanilla JavaScript ES6+**) basée sur **Electron** et **Vite**. Elle permet d'explorer, de visualiser et de prévisualiser dynamiquement le contenu de dossiers locaux avec une prise en charge étendue de formats de fichiers.

---

## ✨ Fonctionnalités Principales

* 📂 **Exploration de dossiers locaux** :
  * Intégration native Electron IPC pour l'accès direct au système de fichiers local.
  * Navigation fluide via fil d'ariane (breadcrumbs) et arborescence de fichiers.
* 👁️ **Visualiseur & Prévisualisation Multi-Formats** :
  * 🖼️ **Images** : Prise en charge des formats `PNG`, `JPG`, `JPEG`, `GIF`, `WebP`, `SVG`, `BMP`, `ICO`, etc.
  * 📑 **PDF** : Affichage directement intégré dans l'interface.
  * 📄 **Documents Word** : Integration avec `docx-preview` / `Mammoth`.
  * 💻 **Code & Syntaxe** : Coloration syntaxique haute performance avec `Prism.js` (JavaScript, TypeScript, Python, C/C++, Java, C#, SQL, HTML, CSS, Bash, Rust, Go, etc.).
  * 📝 **Fichiers Texte & Config** : Lecture des fichiers `.txt`, `.csv`, `.log`, `.json`, `.yaml`, `.env`, `.ini`, etc., avec tronquage de sécurité au-delà de 1 Mo.
* 📦 **Outil d'archivage intégré** :
  * Script de packaging automatique (`zip-project.js`) pour générer une archive `.zip` propre du projet sans fichiers parasites.
* 🧪 **Suite de tests unitaires** :
  * Tests automatisés avec `Vitest` couvrant la gestion du système de fichiers et les utilitaires de prévisualisation.

---

## 🛠️ Stack Technique

* **Moteur & Framework Desktop** : [Electron](https://www.electronjs.org/) & [Vite](https://vitejs.dev/)
* **Langage & Logique** : Vanilla JavaScript ES6+ (Modules ES)
* **Styling & UI** : [Tailwind CSS](https://tailwindcss.com/) & Icons SVG
* **Coloration Syntaxique** : [Prism.js](https://prismjs.com/)
* **Parsing de Documents** : [docx-preview](https://github.com/VolodymyrBaydalka/docx-preview) / [Mammoth.js](https://github.com/mwilliamson/mammoth.js/)
* **Tests** : [Vitest](https://vitest.dev/)
* **Packaging Desktop** : [Electron Builder](https://www.electron.build/)

---

## 📁 Structure du Projet

```text
DirectoryDisplayApp/
├── electron/
│   ├── main.cjs            # Script principal Electron (IPC, fenêtres, FS native)
│   └── preload.cjs         # Script d'isolation du contexte et d'exposition des API IPC
├── src/
│   ├── filePreview.js      # Logique de détection des formats et gestionnaires de prévisualisation
│   ├── fileSystem.js       # Provider d'accès au FS natif Electron
│   ├── icons.js            # Génération des icônes SVG dynamiques
│   ├── index.css           # Styles CSS principaux et utilitaires Tailwind
│   ├── main.js             # Logique applicative principale UI / DOM
│   └── renderers.js        # Rendu des aperçus de fichiers (Images, PDF, Word, Code)
├── tests/                  # Tests unitaires Vitest
├── index.html              # Point d'entrée HTML5
├── zip-project.js          # Script d'export en archive ZIP nettoyée
├── vite.config.js          # Configuration Vite & Vitest
├── tailwind.config.js      # Configuration Tailwind CSS
└── package.json            # Dépendances et scripts du projet
```

---

## 🚀 Installation & Démarrage

### Prérequis

* [Node.js](https://nodejs.org/) (Version 18+ recommandée)
* `npm` ou `yarn`

### 1. Installation des dépendances

```bash
npm install
```

### 2. Lancement en mode Développement Desktop (Electron)

Lance le serveur Vite de développement ainsi qu'Electron simultanément avec rechargement à chaud (Hot Reload) :

```bash
npm run electron:dev
```

---

## 🧪 Tests Unitaires

Pour exécuter la suite de tests automatisée avec Vitest :

```bash
npm run test
```

---

## 📦 Build & Distribution

### Compiler l'application Desktop (Executable Windows)

Génère les installateurs (`NSIS`) et la version portable pour Windows dans le dossier `/release` :

```bash
npm run electron:build
```

### Générer l'archive ZIP du projet

Crée une archive `DirectoryDisplayApp.zip` nettoyée (excluant `node_modules`, builds temporaires et logs) :

```bash
npm run zip
```
