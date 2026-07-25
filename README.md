# 📁 DirectoryDisplayApp — V1.0.0

![Electron](https://img.shields.io/badge/Electron-43.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4.8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4.1.10-76E2EA?style=for-the-badge&logo=vitest&logoColor=black)

**DirectoryDisplayApp** est un explorateur de fichiers guidé et sécurisé pour Windows, conçu pour rendre la navigation et les opérations courantes sur le système de fichiers plus compréhensibles, plus prévisibles et plus sûres.

---

## 📌 Version Stable Actuelle

```text
Version stable actuelle : 1.0.0
```

---

## ✨ Fonctions Disponibles

* 📂 **Arborescence unique** : Navigation intuitive hiérarchique avec un arbre visuel unifié.
* ⚡ **Chargement progressif des dossiers** : Exploration à la demande (*lazy loading*) des répertoires pour optimiser les performances.
* 🔍 **Recherche dans les éléments chargés** : Filtrage instantané du contenu actuellement chargé en mémoire.
* 📊 **Affichage des métadonnées** : Consultation des propriétés détaillées (taille, extension, dates de création/modification, nombre d'éléments, permissions).
* 👁️ **Aperçus compatibles** :
  * Texte enrichi & code avec coloration syntaxique (`Prism.js`).
  * Images (`PNG`, `JPG`, `WebP`, `GIF`, `SVG`, `BMP`, `ICO`).
  * Documents PDF natifs (`.pdf`).
  * Audio / Vidéo (`MP3`, `MP4`, `WAV`, `OGG`, `WebM`).
  * Documents Microsoft Word (`.docx` via `docx-preview`).
* 🚀 **Ouverture externe** : Ouverture sécurisée des fichiers avec le programme Windows par défaut après avertissement explicite.
* ✏️ **Renommage guidé** : Assistant de changement de nom avec validation instantanée et prévention des conflits.
* 📋 **Copie guidée** : Assistant de duplication vers un dossier cible avec barre de progression.
* 🚚 **Déplacement guidé** : Assistant de transfert de fichier/dossier avec vérifications de sécurité.
* 🗑️ **Mise à la Corbeille** : Envoi sécurisé des éléments dans la Corbeille Windows (sans suppression irréversible).
* ↩️ **Annulation des opérations compatibles** : Annulation en un clic (*Undo*) du dernier renommage, de la dernière copie ou du dernier déplacement.
* 🛡️ **Protections des dossiers système** : Verrouillage des racines de lecteurs (`C:\`) et des chemins système critiques (`C:\Windows`, `Program Files`).
* ⌨️ **Navigation au clavier** : Prise en charge complète du focus clavier, raccourcis et fermeture des modales par `Échap`.
* 🎨 **Thèmes de couleur** : Mode clair et mode sombre adaptés.
* 📐 **Panneaux redimensionnables** : Ajustement dynamique de la largeur du volet d'aperçu par poignée tactile/souris.

---

## ⚠️ Limites Connues

* La recherche s'effectue dans les répertoires actuellement chargés dans l'arborescence, elle n'indexe pas l'intégralité du disque dur.
* Seuls les formats de fichiers supportés bénéficient d'un aperçu visuel dans le panneau ; un composant neutre est affiché pour les extensions inconnues.
* Les gros fichiers texte (> 1 Mo) ou binaires peuvent être refusés en prévisualisation pour protéger la mémoire.
* L'annulation d'une opération dépend de l'état actuel du système de fichiers (l'annulation échouera si le fichier a été modifié ou verrouillé par un autre programme).
* La mise à la Corbeille s'appuie sur l'API native Windows et dépend des capacités du volume (p. ex. clés USB ou lecteurs réseau sans Corbeille).
* Aucune suppression définitive (*shift+delete*) n'est proposée par l'application pour des raisons de sécurité.
* Aucun contournement des permissions Windows n'est effectué : l'application s'exécute dans le contexte des privilèges utilisateur actuels.

---

## 🔒 Sécurité & Architecture

DirectoryDisplayApp applique le principe du moindre privilège et une isolation stricte des processus Electron :

* **`nodeIntegration` désactivé** dans le processus de rendu.
* **`contextIsolation` activé** empêchant l'accès direct de l'UI aux APIs Node.js internes.
* **API preload restreinte** : pont IPC minimal et fortement typé (`window.electronAPI`).
* **Validations côté processus principal** : centralisation des contrôles de sécurité et de politique de fichiers dans `electron/security/fileOperationPolicy.cjs`.
* **Protections des chemins système** : interdiction des opérations modifiantes sur les répertoires critiques Windows.
* **Absence d'écrasement silencieux** : refus explicite en cas de conflit de nom existant.
* **Absence de suppression définitive** : aucun appel système destructif irréversible.

---

## 💻 Installation & Développement

### Prérequis

* **Node.js** v18+ (v20 ou v22 recommandée)
* **npm** v9+

### Commandes utiles

```bash
# Installation des dépendances
npm install

# Lancement du serveur Vite seul (Web UI)
npm run dev

# Lancement complet de l'application desktop Electron en mode dev
npm run electron:dev

# Exécution de la suite de tests automatisée
npm test

# Exécution par catégories de tests
npm run test:unit
npm run test:integration
npm run test:electron
npm run test:coverage

# Audit de la qualité de code
npm run lint

# Build de l'interface Web (dist)
npm run build

# Mode prévisualisation de l'application empaquetée
npm run electron:preview

# Compilation des exécutables Windows (Installateur NSIS & Portable)
npm run electron:build

# Génération de l'archive ZIP nettoyée des sources
npm run zip
```

---

## 📁 Structure du Projet

```text
DirectoryDisplayApp/
├── docs/                           # Documentation projet, guides et matrices
│   ├── USER-GUIDE.md               # Guide d'utilisation guidé
│   ├── KNOWN-LIMITATIONS.md        # Limites techniques de la v1.0.0
│   ├── RELEASE-NOTES-v1.0.0.md     # Notes de publication v1.0.0
│   └── V1.0-MANUAL-TESTS.md        # Matrice de validation des tests manuels
├── electron/                       # Processus principal Electron (Main & Preload)
│   ├── main.cjs                    # Fichier principal Electron (IPC, Fenêtres, FS)
│   ├── preload.cjs                 # Pont sécurisé preload (contextBridge)
│   └── security/
│       └── fileOperationPolicy.cjs # Politique globale de sécurité système et chemins
├── src/                            # Code source Frontend (Renderer process)
│   ├── main.js                     # Point d'entrée principal UI & contrôleurs
│   ├── index.css                   # Feuille de style globale Tailwind & thèmes
│   ├── icons.js                    # Générateur d'icônes SVG
│   ├── fileSystem.js               # Service d'accès aux APIs Electron
│   ├── filePreview.js              # Logique et gestionnaires de prévisualisation
│   ├── treeLogic.js                # Algorithmes d'arborescence et lazy-loading
│   ├── assistedRenameValidation.js # Validation des règles de renommage
│   ├── copyWizardValidation.js     # Validation des règles de copie
│   ├── moveWizardValidation.js     # Validation des règles de déplacement
│   ├── trashWizardValidation.js    # Validation des règles de suppression
│   └── renderers/                  # Rendu visuel des composants UI
├── tests/                          # Tests automatisés (Vitest)
│   ├── helpers/                    # Utilitaires de création de répertoires de test
│   └── *.test.js                   # Tests unitaires et d'intégration
├── index.html                      # HTML d'entrée de l'application
├── package.json                    # Configuration et dépendances
├── package-lock.json               # Arbre d'installation figé
├── vite.config.js                  # Configuration Vite & Vitest
├── tailwind.config.js              # Configuration Tailwind CSS
├── postcss.config.js               # Configuration PostCSS
├── eslint.config.js                # Rules et configuration ESLint
└── zip-project.js                  # Script d'archivage automatique des sources
```

---

## 📄 Licence et Mentions Légales

Copyright © 2026 DirectoryDisplayApp. Tous droits réservés.
Ce projet n'est pas sous licence open source publique. Toute reproduction, modification ou distribution non autorisée est strictement interdite.
