# Mission DeepSeek · Usine des projets animée

## Résultat attendu
Construire une version locale interactive dans laquelle on peut suivre un même carton depuis la prise en charge d’un projet jusqu’à sa livraison. Quand un atelier travaille, son opérateur manipule réellement l’objet dans la scène. Quand une tâche attend une revue, le carton reste au contrôle et l’utilisateur peut ouvrir sa fiche pour comprendre pourquoi. L’intention visuelle vient de notre maquette. Le comportement spatial et le rythme seront définis après observation de Warehouse.

Entrées :
- Référence de fonctionnement : https://warehouse.studionivo.net/
- Outil d’analyse : https://github.com/morluto/rea
- Maquette locale : /Users/monmac/CLAUDE WORK/RH-refonte/storyboard-usine/index-v2.html
- Direction artistique : usine-mere.jpg et atelier-recrutmatch.jpg dans le même dossier.
- Brief initial : /Users/monmac/CLAUDE WORK/RH-refonte/echanges/usine-2d/consigne-usine-v2.md

## 1. Préparer l’étude
Créer un espace de travail isolé. Vérifier que les fichiers de maquette et les deux JPG sont présents, y compris s’ils sont hors Git. Conserver une copie de référence pour la comparaison. Utiliser pnpm. Produire d’abord une version locale à données de démonstration. Si ton exécuteur DeepSeek fonctionne uniquement en texte, faire exécuter les observations par l’hôte équipé du navigateur et lui demander les captures avec les actions correspondantes. Aucun verdict visuel sur la seule lecture du HTML.

REA propose une interface MCP et une interface terminal. Relever la version officielle de rea-agents, la figer et consulter son aide avec pnpm dlx rea-agents@VERSION --help (remplacer VERSION par la version retenue). Choisir le mode terminal si aucun client MCP adapté n’est déjà disponible. En MCP, inventorier les outils réellement exposés et retenir ceux d’observation web. Le README documente setup pour la connexion à un agent. L’analyse de ce projet porte uniquement sur l’expérience publique dans un navigateur ordinaire. Conserver version, mode utilisé et limites dans le rapport. Le lecteur web utilisé pour préparer ce brief n’a pas réussi à ouvrir Warehouse. Sa bibliothèque 3D, ses interactions et son comportement mobile restent à établir.

## 2. Observer Warehouse et produire une spécification reproductible
Ouvrir la référence dans un navigateur graphique. Enregistrer une courte séquence à 1440 × 900, puis à 390 × 844 avec interaction tactile si disponible. Observer le premier affichage puis 15 secondes sans geste. Essayer survol, sélection d’un objet, glisser, molette, geste tactile, fermeture du détail et retour à la vue générale. Répéter une fois les interactions qui produisent un changement. Utiliser REA pour préciser les observations lorsque ses outils web le permettent. Si le site refuse de charger, consigner l’erreur exacte et demander une capture vidéo du parcours avant de déclarer la fidélité à la référence.

Créer reference.md avec une ligne par interaction : action, état initial, résultat visible, durée approximative, caméra, éléments restés lisibles, preuve horodatée, décision pour notre usine. Distinguer observation et proposition. Identifier en particulier comment la scène guide le regard, comment un visiteur découvre un objet cliquable et comment il retrouve ses repères après un zoom. Les captures servent à l’étude interne. Créer nos propres modèles, textures, textes et animations.

## 3. Transformer notre maquette en plan de scène
Dans chacun des deux JPG, relever angle de vue, palette dominante, source lumineuse, matériaux, silhouettes, points d’intérêt et zones de circulation. Inventorier les boutons data-k et les fiches associées dans index-v2.html. Produire une table reliant chaque identifiant existant à un objet de scène, une caméra cible et une action clavier. Conserver les quatre ateliers du bureau du chef, leurs indicateurs, la vue générale et le retour depuis un détail.

Dessiner un plan coté simple de l’usine mère et de l’atelier RecrutMatch. Placer le sol, les postes, les convoyeurs et les zones de prise ou de dépôt dans un repère commun. Fixer la taille d’un carton et la hauteur du tapis avant d’animer les personnages. Choisir une caméra orthographique si elle reproduit la perspective dessinée, puis comparer une capture au JPG au même cadrage.

## 4. Construire une scène pilote avant de multiplier les ateliers
Proposition technique : moteur 3D web, par exemple Three.js, scène originale exportée en GLB avec pivots nommés, articulations et clips. Réutiliser le moteur local s’il convient. Le DOM porte les fiches et les commandes accessibles. Le moteur porte géométrie, profondeur, éclairage, contacts et déplacements. Utiliser les illustrations comme références artistiques. Modéliser au minimum un convoyeur, un carton, une pince articulée, un poste et un personnage dont les mains peuvent atteindre la zone de travail.

Réaliser un cycle complet d’environ 10 secondes : arrivée du carton, freinage sous le capteur, approche de la pince ouverte, fermeture au contact, levage, transfert, pose, ouverture, retrait. Pendant la prise, rattacher le carton à la pince en conservant sa transformation mondiale. Le détacher après contact avec le support. Synchroniser la vitesse du tapis et celle du carton. Pour le personnage, animer anticipation, transfert du poids du corps, regard vers la tâche, mouvement du bras puis retour au repos. Contrôler les pieds au sol, les ombres de contact et le passage derrière les machines. Garder une caméra fixe pendant ce contrôle pour que les défauts soient visibles.

Livrer un aperçu vidéo du cycle, une vue générale et un gros plan. Visionner au ralenti. Corriger tout glissement, traversée, saut à la prise, changement d’échelle ou boucle qui téléporte le carton en plein cadre. Valider ce pilote visuellement avant d’étendre le décor. Un test automatisé de mouvement ne suffit pas à qualifier les gestes.

## 5. Relier animation et données du dashboard
Créer un jeu de données déterministe avec identifiant de projet, atelier, ouvrier, état, prochaine action et indicateurs. Employer une seule source pour la scène et la fiche. Séparer la progression métier de la phase d’animation : suspendre une animation ou ouvrir une fiche doit conserver l’état du projet.

Programmer trois parcours démontrables :
1. Projet reçu → agent au travail → contrôle réussi → livraison. Le même colis et le même identifiant traversent les postes.
2. Revue bloquée → carton arrêté au contrôle → clic sur le poste → cause et prochaine action visibles. Une commande de démonstration permet la reprise.
3. Deux ateliers actifs → mouvements indépendants → sélection d’un atelier → seule sa fiche s’ouvre, puis retour au cadrage précédent.

Étendre ensuite le langage de mouvement aux deux scènes. Donner une tâche reconnaissable à chaque opérateur. Dériver les huit vignettes de cadrages de la scène ou de courtes séquences capturées dans celle-ci. Suspendre les aperçus hors écran pour éviter huit rendus 3D simultanés.

## 6. Navigation et lisibilité
Appliquer les comportements retenus dans reference.md. Distinguer clic et glisser, limiter les déplacements de caméra, garder les cibles accessibles après redimensionnement. Prévoir sélection clavier et tactile. Synchroniser sélection 3D, titre de la fiche et focus clavier. Au retour, restaurer le cadrage et le focus. Prévoir pause globale et préférence de mouvement réduit avec vue stable, états métier lisibles et accès aux mêmes fiches. En cas d’échec du moteur graphique, afficher la vue illustrée avec liste d’ateliers fonctionnelle.

## 7. Validation et livraison
Comparer référence, maquette et nouvelle scène sur le même parcours. La première comparaison porte sur les interactions observées, la seconde sur l’identité visuelle. Vérifier à 375 px et sur bureau les deux scènes, les quatre ateliers, les huit vignettes, la sélection, le zoom et le retour. Tester pause/reprise en pleine prise du carton et attente prolongée au contrôle. Vérifier qu’aucun événement n’est consommé deux fois. Mesurer cadence et temps de chargement sur les appareils utilisés. Viser 30 images/s au minimum sur le mobile de test et réduire en priorité les ombres et la résolution si nécessaire. Identifier les mesures émulées.

Remettre le prototype ouvrable, la commande pnpm exacte pour le lancer, les sources des modèles et animations, leurs licences, reference.md, les deux vidéos du parcours de démonstration (bureau et mobile) et un compte rendu des écarts. Commencer la présentation par le carton pris puis déposé et le cas de blocage ouvrant la fiche du projet. C’est sur ces deux séquences que l’utilisateur pourra juger le réalisme et l’intérêt du dashboard.
