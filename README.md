# 📁 DirectoryDisplayApp

![Electron](https://img.shields.io/badge/Electron-43.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vitest](https://img.shields.io/badge/Vitest-4.1.10-76E2EA?style=for-the-badge&logo=vitest&logoColor=black)

**DirectoryDisplayApp** est une application desktop d'exploration de fichiers guidée et sécurisée pour Windows, développée en **Vanilla JavaScript ES6+** basée sur **Electron** et **Vite**.

---

## ✨ Fonctionnalités Principales

* 📂 **Exploration de dossiers locaux** :
  * Intégration native Electron IPC pour l'accès direct au système de fichiers local.
  * Navigation fluide via fil d'ariane (breadcrumbs) et arborescence de fichiers.
* 👁️ **Visualiseur & Prévisualisation Multi-Formats** :
  * 🖼️ **Images** : Prise en charge des formats `PNG`, `JPG`, `JPEG`, `GIF`, `WebP`, `SVG`, `BMP`, `ICO`, etc.
  * 📑 **PDF** : Affichage directement intégré dans l'interface.
  * 📄 **Documents Word** : Intégration avec `docx-preview`.
  * 💻 **Code & Syntaxe** : Coloration syntaxique haute performance avec `Prism.js`.
  * 📝 **Fichiers Texte & Config** : Lecture des fichiers `.txt`, `.csv`, `.log`, `.json`, `.yaml`, `.env`, `.ini`, etc.
* 📦 **Outil d'archivage intégré** :
  * Script de packaging automatique (`zip-project.js`) pour générer une archive `DirectoryDisplayApp-v1.0.0-rc.1.zip` propre.
* 🧪 **Suite de tests unitaires** :
  * Tests automatisés avec `Vitest` couvrant la gestion du système de fichiers et les utilitaires de prévisualisation.

---

## 🛠️ Stack Technique

* **Moteur & Framework Desktop** : [Electron](https://www.electronjs.org/) & [Vite](https://vitejs.dev/)
* **Langage & Logique** : Vanilla JavaScript ES6+ (Modules ES)
* **Styling & UI** : [Tailwind CSS](https://tailwindcss.com/) & Icons SVG
* **Coloration Syntaxique** : [Prism.js](https://prismjs.com/)
* **Parsing de Documents** : [docx-preview](https://github.com/VolodymyrBaydalka/docx-preview)
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
│   └── renderers/          # Modules de rendu de l'interface utilisateur
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
* `npm`

### 1. Installation des dépendances

```bash
npm install
```

### 2. Lancement en mode Développement Desktop (Electron)

```bash
npm run electron:dev
```

---

## 🧪 Tests Unitaires

Exécuter la suite de tests automatisée avec Vitest :

```bash
npm run test
```

---

## 📦 Build & Distribution

### Compiler l'application Desktop (Executable Windows)

```bash
npm run electron:build
```

### Générer l'archive ZIP du projet

```bash
npm run zip
```

