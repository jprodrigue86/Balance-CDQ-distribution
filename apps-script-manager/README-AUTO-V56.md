# Manager V56 — vérifications locales des modules publiés

Le Manager exécute 105 cas synthétiques dans le navigateur : les 83 contrôles
encore pertinents de V55 et 22 nouveaux cas pour les états de fichier, les
réponses locales, les confirmations Drive, les suppressions et les avis de liste.
Les trois tests de l'ancien outbox V2708 sont remplacés par ceux du moteur
réellement distribué. Les cas n'utilisent aucun document ni compte client.

Les modules proviennent de `pc/`, avec leurs dépendances statiques complètes.
Les octets vérifiés sont ceux exécutés en mémoire, ce qui évite qu'une ancienne
copie à la racine ou dans le cache produise un faux résultat positif. Les
empreintes sont comparées de nouveau après les tests. La réutilisation de 12 h
requiert les mêmes fichiers, version du Manager, navigateur et résultats complets.
Les six contre-vérifications de V55 sont conservées. Un échec ou une lecture
impossible invalide le résultat réutilisable.

Les diagnostics lisent les véritables métadonnées Android et PC. Ils donnent un
résultat compact réutilisable pour éviter de refaire les contrôles déterministes
avec Work. Aucun appel à un modèle, workflow GitHub, minuteur récurrent,
déploiement ni envoi de document client n'est ajouté. La lecture des empreintes
publiques reste nécessaire pour ne pas réutiliser un contrôle périmé.

Ces contrôles ne certifient pas l'APK signé, l'appareil Samsung, l'authentification
Google, les PDF clients ou un véritable envoi/sauvegarde sur Drive. Aucun
pourcentage d'économie du quota Work n'est mesuré ou garanti.
