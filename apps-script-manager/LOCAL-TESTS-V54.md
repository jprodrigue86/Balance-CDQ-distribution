# CDQ Manager V54 — contrôles locaux rapides

Après la lecture d'un projet Google Apps Script, le Manager exécute automatiquement
un ensemble de 86 tests synthétiques dans le navigateur. Le bouton « Relancer les tests locaux »
permet une répétition sur demande. Les résultats détaillés et un rapport JSON sont disponibles.

Les tests importent les modules JavaScript CDQ publiés (décimales, tolérances,
copies locales, sauvegardes et accusés Drive, liste de balances, conformité de feuilles,
file d'envoi, métadonnées PDF) et ne modifient aucun fichier client.

Ces contrôles ne remplacent PAS la validation d'une installation Android réelle,
la compilation/signature d'un APK, les vérifications de sécurité à la publication,
ni un cycle Google Drive avec connexion authentifiée.

Le code des tests est dans local-tests-v54.mjs. La source privée synchronisée contient
le test de qualification reproductible tests/script-manager-local-v54.test.mjs.
Les workflows historiques sont conservés sous ci/archives dans le dépôt privé.
