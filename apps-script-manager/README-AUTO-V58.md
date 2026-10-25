# CDQ Manager V58

Les cas V57 sont conservés, avec onze contrôles ciblés des corrections 27.84 : consultation sans fausse sauvegarde, reprise Drive, erreur terminale REPORT_DELETED sans perte de réponses, récupération explicite dans un nouveau rapport sans doublon, grille PC, sélection mobile, médias de calibration exacts et détection après une sauvegarde réussie. Le compteur est calculé à partir du catalogue des cas, y compris dans le diagnostic privé.

Les contrôles exécutent les octets publiés après empreinte et un graphe de dépendances fermé. Les médias du catalogue sont aussi empreintés et comparés aux SHA-256 des sources documentées. Le reçu reste réutilisable au maximum 12 heures si la version, l'environnement et chaque empreinte sont identiques. Un échec, une source absente ou un changement pendant le contrôle invalide le reçu. Les six contrôles négatifs conservent leur raison de rejet.

Les tests Node utilisent JSDOM; les coordonnées réelles sont contrôlées par `tests/v2784-browser.cjs` sous Chromium aux largeurs PC 900/1400 et mobile 320/430. La présence de ce scénario ne signifie pas qu'il a été exécuté. Aucun accès Drive authentifié, appareil Android réel, publication ou lancement GitHub n'est autorisé par le reçu.
