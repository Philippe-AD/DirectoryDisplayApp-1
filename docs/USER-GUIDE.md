# 📖 Guide d'Utilisation — DirectoryDisplayApp

Bienvenue dans **DirectoryDisplayApp**, votre explorateur de fichiers simple, visuel et sécurisé.
Ce guide vous accompagne pas à pas pour apprendre à utiliser toutes les fonctionnalités de l'application sans risque pour vos données.

---

## 1. Démarrer l'application

1. Cliquez sur l'icône **DirectoryDisplayApp** sur votre bureau ou dans le menu Démarrer.
2. L'écran d'accueil s'affiche, vous proposant de démarrer l'exploration d'un répertoire.
3. Aucune modification de vos fichiers n'est effectuée au démarrage.

---

## 2. Choisir un lecteur ou un dossier

1. Sur l'écran d'accueil, cliquez sur le bouton violet **"Ouvrir un dossier"**.
2. Une fenêtre officielle Windows s'ouvre. Sélectionner le répertoire ou la partition que vous souhaitez explorer (par exemple votre dossier *Documents* ou votre clé USB).
3. L'application charge l'arborescence du dossier sélectionné.

---

## 3. Ouvrir un dossier dans l'arborescence

1. Dans le volet de gauche, cliquez sur la petite flèche à côté d'un dossier pour le dérouler.
2. Le contenu du dossier s'affiche sous forme d'arbre sans recharger l'ensemble du disque.
3. Vous pouvez naviguer de sous-dossier en sous-dossier librement.

---

## 4. Sélectionner un fichier

1. Cliquez sur n'importe quel fichier présent dans l'arborescence.
2. Le fichier est mis en surbrillance.
3. Le volet d'aperçu à droite se met immédiatement à jour avec les informations et la prévisualisation du fichier.

---

## 5. Comprendre les informations affichées

Le volet de droite affiche la fiche d'informations du fichier ou dossier sélectionné :
* **Nom complet** et **Extension** (type de fichier) ;
* **Taille** (exprimée en Octets, Ko, Mo ou Go) ;
* **Dates** de création et de dernière modification ;
* **Chemin d'accès** complet sur votre disque dur ;
* **Permissions** et état du fichier.

---

## 6. Prévisualiser un fichier

DirectoryDisplayApp permet de voir le contenu des fichiers sans les ouvrir dans un autre programme :
* 🖼️ **Images** (`.png`, `.jpg`, `.gif`, `.webp`) : l'image s'affiche directement au centre.
* 📄 **Documents PDF** (`.pdf`) : le document s'affiche avec la possibilité de faire défiler les pages.
* 📝 **Fichiers Texte / Code** (`.txt`, `.json`, `.js`, `.md`) : le texte apparaît avec coloration syntaxique et numérotation des lignes.
* 🎥 **Audio & Vidéo** (`.mp3`, `.mp4`) : un lecteur multimédia vous permet d'écouter ou de visionner le fichier.
* 📑 **Fichiers Word** (`.docx`) : le document est converti visuellement pour une lecture rapide.

> *Remarque : Si un format n'est pas pris en charge ou si le fichier est trop volumineux (> 1 Mo pour du texte), un message explicatif neutre est affiché.*

---

## 7. Ouvrir un fichier avec son application habituelle

1. Si vous souhaitez modifier ou utiliser le fichier dans son logiciel d'origine (Word, Bloc-notes, etc.), cliquez sur le bouton **"Ouvrir avec..."** dans le volet d'aperçu.
2. Un message de confirmation vous demande de valider l'ouverture extérieure.
3. Après validation, Windows ouvre le fichier avec votre application par défaut.

---

## 8. Renommer un fichier

* **Ce qui est modifié** : Seul le nom du fichier ou du dossier sélectionné est changé sur le disque.
* **Confirmation** : Un assistant guidé vous demande de saisir le nouveau nom et de cliquer sur "Valider le renommage".
* **En cas d'échec** : Si un fichier porte déjà ce nom, un message d'avertissement empêche tout écrasement et conserve le nom d'origine.
* **Annulation possible** : Oui ! Cliquez sur le bouton "Annuler l'action" qui apparaît en haut de l'écran.

---

## 9. Copier un fichier

* **Ce qui est modifié** : Un nouveau fichier identique est créé dans le dossier de destination de votre choix. Le fichier original reste intact.
* **Confirmation** : L'assistant de copie vous demande de sélectionner le dossier cible puis de confirmer l'action.
* **En cas d'échec** : Si le dossier cible est protégé ou manque d'espace, la copie s'interrompt proprement sans altérer la source.
* **Annulation possible** : Oui ! L'annulation supprimera la copie créée et laissera votre fichier d'origine intact.

---

## 10. Déplacer un fichier

* **Ce qui est modifié** : Le fichier ou dossier est transféré de son emplacement actuel vers un nouveau dossier.
* **Confirmation** : L'assistant de déplacement vous demande d'indiquer le dossier d'arrivée et de confirmer.
* **En cas d'échec** : Si le fichier est utilisé par un autre logiciel, le déplacement est annulé et le fichier reste à sa place d'origine.
* **Annulation possible** : Oui ! L'annulation ramènera automatiquement le fichier à son emplacement d'origine.

---

## 11. Placer un fichier dans la Corbeille

* **Ce qui est modifié** : Le fichier est retiré de votre dossier et placé dans la Corbeille de Windows.
* **Confirmation** : Une boîte de dialogue d'avertissement vous demande confirmation explicite avant d'envoyer l'élément à la Corbeille.
* **En cas d'échec** : Si l'élément est verrouillé par Windows, un message vous indique l'impossibilité d'effectuer l'action.
* **Annulation possible** : Vous pourrez restaurer le fichier à tout moment depuis la Corbeille Windows directement sur votre bureau.
* **Rappel important** : DirectoryDisplayApp **ne réalise aucune suppression définitive et irréversible**.

---

## 12. Annuler une opération

Lorsque vous effectuez un renommage, une copie ou un déplacement, une bannière de confirmation verte s'affiche en haut de l'écran avec le bouton **"Annuler"**.
* Cliquez sur **"Annuler"** pour revenir immédiatement en arrière.
* L'application restaure la situation exacte précédant l'opération.

---

## 13. Comprendre le mode protégé

Pour vous éviter toute fausse manipulation dramatique :
* Les racines de votre ordinateur (comme le disque `C:\`) et les dossiers système critiques (comme `C:\Windows` ou `C:\Program Files`) sont automatiquement placés en **Mode Protégé**.
* Les boutons de modification (renommer, déplacer, Corbeille) y sont désactivés avec une mention rassurante.

---

## 14. Reconnaître un message de réussite

* Les actions réussies affichent un message d'information **vert** précisant l'action effectuée (ex. *"Le fichier a été renommé avec succès"*).
* Un bouton d'annulation y est immédiatement accessible.

---

## 15. Comprendre pourquoi une opération peut être refusée

Si une opération est bloquée, un message de couleur **ambre** ou **rouge** explique la raison exacte :
1. **Dossier ou fichier protégé par Windows** : L'élément est vital pour le système.
2. **Conflit de nom** : Un fichier porte déjà le même nom au même endroit.
3. **Fichier déjà ouvert** : Le fichier est en cours d'utilisation dans un autre logiciel.
4. **Permissions insuffisantes** : Votre compte utilisateur Windows n'a pas l'autorisation requise sur ce dossier.
