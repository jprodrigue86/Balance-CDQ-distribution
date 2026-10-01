# Balance CDQ V26.28 — récupération créateur

- scriptManagerRequired : V48
- androidAppRecommended : 26.28
- creator : Récupération réservée au compte Google vérifié de l’administrateur principal configuré côté serveur. Aucun droit créé à partir du courriel saisi ou du compte Drive par défaut.
- recovery : Compte Google propriétaire confirmé, puis NIP existant conservé; NIP oublié: choix et confirmation explicites d’un nouveau NIP, sans code administrateur à générer.
- pin : Réutilise le NIP personnel conservé haché et salé par le serveur. Aucun NIP maître universel, aucun NIP prédéfini et aucun secret inclus dans le package.
- sessions : Aucun jeton appareil/session avant validation du NIP ou création explicite après preuve Google. Ticket consommé une seule fois sous verrou. Le remplacement du NIP révoque uniquement les anciennes sessions du créateur.
- rateLimit : 5 échecs de NIP de récupération: blocage 10 minutes lié au compte, persistant même en changeant de ticket/session.
- technicians : Code d’activation, NIP, biométrie et droits des techniciens inchangés. Le compte professionnel reste administrateur; la récupération autonome créateur utilise le Gmail propriétaire.
- preservation : Aucun import, suppression ou déplacement de fichiers; inventaire, stocks, numéros de série, prix, PDF, migration indépendante, compte Drive et autorisations inchangés.
- inventoryImport : false
- phoneTest : false
- install : Déployer ce package serveur une fois dans Script Manager, puis installer Android 26.28 sans désinstaller. À l’écran d’activation: Récupérer mon accès créateur.
