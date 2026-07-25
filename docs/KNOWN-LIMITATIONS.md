# ⚠️ Limites Connues et Périmètre — DirectoryDisplayApp V1.0

Ce document répertorie de manière transparente et honnête l'ensemble des limites techniques et choix d'architecture applicables à la version 1.0.0 de **DirectoryDisplayApp**.

---

## 📋 Tableau Synthétique des Limites

| Limite constatée | Raison & Catégorie | Description & Impact |
|---|---|---|
| **Pas d'opérations par lots** | 🎯 *Volontairement hors périmètre V1.0* | Les opérations (renommage, copie, déplacement, mise à la Corbeille) s'exécutent élément par élément afin de garantir une clarté et une sécurité maximales pour l'utilisateur novice. |
| **Pas de glisser-déposer (Drag & Drop)** | 🔒 *Liée à la sécurité & Hors périmètre* | Les transferts se font exclusivement via les assistants guidés avec confirmation explicite pour éviter tout déplacement accidentel lié à une fausse manipulation de souris. |
| **Pas de système d'onglets** | 🎯 *Volontairement hors périmètre V1.0* | La navigation s'effectue dans une vue hiérarchique unique avec arborescence extensible (*TreeView*). |
| **Pas d'accès cloud intégré** | 🎯 *Volontairement hors périmètre V1.0* | L'application est strictement dédiée à l'exploration sécurisée des fichiers locaux et disques durs connectés au poste Windows. |
| **Pas de restauration depuis la Corbeille** | 🪟 *Imposée par Windows* | L'envoi à la Corbeille s'appuie sur l'API native Windows (`shell.trashItem`). La restauration s'effectue directement depuis la Corbeille officielle de Windows. |
| **Historique d'annulation non persistant** | 🧠 *Mémoire de session* | L'annulation du dernier renommage, copie ou déplacement est conservée en mémoire pendant la session active de l'application. Elle réinitialise au redémarrage. |
| **Aperçus limités par taille & format** | ⚡ *Performance & Protection mémoire* | Les fichiers texte volumineux (> 1 Mo) et les formats propriétaires non standards ne sont pas prévisualisés dans l'interface pour éviter toute saturation mémoire. |
| **Plateforme Windows uniquement** | 🪟 *Choix produit & Intégrations Shell* | L'application exploite l'exécutable Windows et l'intégration native Shell (`shell.trashItem`, PowerShell pour la gestion des corbeilles). |
| **Dépendance aux permissions système** | 🔒 *Sécurité OS Windows* | L'application ne contourne aucun privilège Windows. Si le compte utilisateur manque de droits sur un dossier, l'opération est refusée par le système. |
| **Recherche limitée aux éléments chargés** | ⚡ *Performance système* | La barre de recherche filtre instantanément les nœuds déjà chargés dans l'arborescence. Elle n'effectue pas d'indexation globale de tout le disque dur. |

---

## 🔮 Évolutions Envisagées (Post-V1.0)

Les fonctionnalités suivantes sont identifiées et réservées pour les futures versions majeures de l'application :

1. **Sélection multiple et traitements par lots contrôlés** ;
2. **Favoris et raccourcis de dossiers fréquents** ;
3. **Filtres de recherche avancés par extension et date** ;
4. **Prise en charge d'aperçus complémentaires** ;
5. **Persistance de l'historique d'opérations dans un journal local**.
