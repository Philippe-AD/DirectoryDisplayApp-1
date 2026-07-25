# Changelog

Toutes les modifications notables apportées au projet **DirectoryDisplayApp** sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [1.0.0] - 2026-07-25

### Ajouté
* 📂 **Exploration guidée** : Navigation hiérarchique visuelle par arborescence extensible (*TreeView*) avec chargement progressif des répertoires (*lazy loading*).
* 👁️ **Visualiseur multi-formats** : Prévisualisation intégrée pour les textes, le code source (coloration syntaxique `Prism.js`), les images (`PNG`, `JPG`, `WebP`, `SVG`, `GIF`), les documents `PDF`, les fichiers multimédias (`MP3`, `MP4`) et les documents Microsoft Word (`.docx` via `docx-preview`).
* ✏️ **Assistants d'opérations guidées** : Assistants étape par étape pour le renommage de fichiers, la copie guidée vers un dossier cible, le déplacement guidé et la mise à la Corbeille Windows.
* ↩️ **Annulation des opérations** : Fonctionnalité d'annulation immédiate (*Undo*) en un clic pour restaurer l'état initial après un renommage, une copie ou un déplacement.
* 🛡️ **Mode Protégé automatique** : Verrouillage des racines de lecteurs (`C:\`) et des répertoires système Windows critiques (`C:\Windows`, `C:\Program Files`).
* 🔍 **Recherche dans les éléments chargés** : Filtrage dynamique et instantané des éléments affichés avec mise en surbrillance.
* 🎨 **Thèmes & Adaptabilité** : Support des thèmes clair et sombre, poignée tactile/souris de redimensionnement de panneau et raccourcis clavier.

### Stabilisé
* 🔒 Validation stricte des règles de nommage et interdiction systématique de tout écrasement silencieux de fichiers existants.
* ⚡ Gestion prudente des ressources système et blocage préventif des gros fichiers texte (> 1 Mo) pour protéger la mémoire.
* 🧪 Suite de tests automatisés Vitest comprenant 18 fichiers de test et 193 cas d'asservissement validés.

### Sécurité
* 🛡️ Isolation stricte du processus de rendu (`nodeIntegration: false`, `contextIsolation: true`).
* 🌉 Exposition restreinte et typée des API IPC via un script Preload sécurisé (`contextBridge`).
* 🏰 Centralisation de la politique de sécurité des accès et des chemins système dans `electron/security/fileOperationPolicy.cjs`.
* 🚫 Absence totale de suppression définitive irréversible dans l'application.

### Corrigé
* 🧹 Purge intégrale de l'ancienne marque résiduelle "Cloud Dock" et harmonisation de l'identité `DirectoryDisplayApp`.
* 🛠️ Ajout de la dépendance `@vitest/coverage-v8` pour garantir le passage à 100% de la commande `npm run test:coverage`.

### Limites connues
* Opérations par lots et glisser-déposer volontairement hors périmètre pour privilégier la sécurité.
* Portabilité limitée aux environnements Windows.
