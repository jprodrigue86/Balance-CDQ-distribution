# CDQ Script Manager V55 — automatisation économique

Version : 2026-10-24. Cette page documente le fonctionnement réel, pas une promesse d'exécution en arrière-plan.

## Ce qui s'exécute automatiquement dans Manager
- Au chargement de l'application, un contrôleur purement navigateur vérifie l'empreinte SHA-256 de **12 ressources** (9 vrais modules partagés CDQ, moteur de tests, contrôleur, manifeste de version).
- Le contrôle de source contourne le service worker grâce au marqueur `cdq_diag`; une page HTML de secours ou une perte de réseau ne peut pas donner un résultat positif.
- En l'absence d'un reçu réutilisable, le moteur exécute **86 tests réels de fonctions JavaScript** avec des données fictives : décimales, tolérances, copies PDF locales, intégrité des accusés d'enregistrement, listes, feuilles, file d'envoi et métadonnées.
- Le contrôleur vérifie aussi six cas négatifs **pour leur raison exacte** : tests altérés, incomplets, dupliqués, navigateur différent, preuve expirée, prétention de publication non autorisée.
- Les ressources sont relues après les tests, afin d'écarter toute validation faite pendant un changement de version.
- Si les empreintes, le navigateur, la version et la suite de tests n'ont pas changé, le résultat positif peut être réutilisé **12 heures maximum**. Toute nouvelle erreur efface l'ancien succès mis en cache.
- Le bouton « Relancer les tests locaux » force une nouvelle vérification.
- À la lecture d'un projet Google, Manager rejoint la même exécution (il ne lance pas un doublon), puis joint un **résumé non sensible** au diagnostic privé déjà disponible pour Drive lorsque l'utilisateur a autorisé son enregistrement.

## Travail dans les futures conversations et dans Work
Après le GO de l'utilisateur, privilégier le reçu CDQ Manager V55 si les empreintes et la portée sont pertinentes. Les vérifications locales peuvent fonctionner pendant que l'utilisateur utilise Manager sans décompter d'exécutions GitHub Actions. Le diagnostic Drive peut fournir les résultats sans retranscrire 86 tests dans une conversation.

**Limites :** les 86 tests vérifient le code **public partagé actuellement servi**, pas les modifications privées non publiées, ni une véritable session Google Drive, ni le téléphone Samsung, ni un APK signé, ni les calculs embarqués dans chaque PDF Acrobat. Aucun résultat Manager n'autorise automatiquement la publication. Les contrôles de candidat, de signature, d'installation et d'enregistrement réel demeurent nécessaires selon les changements.

Le site Web et la PWA ne peuvent pas garantir des tâches persistantes téléphone fermé. CDQ Manager ne possède **pas** de passerelle sécurisée lui permettant de lancer directement des compilations signées sur GitHub. Les exécuteurs natifs ou distants existants doivent donc être utilisés séparément par Work, avec l'autorisation nécessaire et sans surveillance répétitive.

## Sécurité
- Pas de jeton GitHub embarqué dans le site.
- Pas de modification des rapports clients par le moteur de tests.
- Pas de contrôle de publication dans le rapport de tests.
- Une erreur de chargement/configuration est affichée comme « non confirmée », pas comme un défaut démontré de CDQ.
- Un service worker est testé séparément : un module absent n'est jamais remplacé par l'accueil HTML, et les empreintes nécessitent le réseau. L'écriture du cache est attachée synchroniquement au cycle de vie de l'événement.
- Les tests négatifs vérifient le **motif attendu** de refus pour éviter les faux succès.

## Validation initiale de V55
Source de validation : `work/cdq-manager-v55-automation-20261024` dans le dépôt privé.
Trois passes séparées dans `tests/manager-v55-orchestrator.test.mjs` :
1. Syntaxe et manifeste, 12 ressources et 9 groupes.
2. 86 tests du vrai code, validation des accusés, cache, cas de refus prévus.
3. Mutation de module, perte de ressource, relecture, cohérence de l'interface et du diagnostic Drive.

Validation de navigateur : `tests/manager-v55-browser.mjs`, avec interface véritable, test de réutilisation et injection de module HTML corrompu. Les scripts de validation sont historiques; ne pas lancer de nouvelle compilation Android juste pour ces tests.

## Flux recommandé
1. GO → correction ciblée.
2. Vérification rapide CDQ Manager si code public actuel concerné.
3. Pour du code privé modifié : qualification des parties modifiées avant publication par un exécuteur adapté.
4. GitHub réservé aux étapes natives indispensables, signature, compilation et publication autorisée.
5. Validation réelle sur Android/Drive lorsque nécessaire.
6. Rapport bref avec preuve, version, limites et erreurs; aucune boucle de relances.
