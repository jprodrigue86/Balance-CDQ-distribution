# Balance CDQ V26.23 — PUBLICATION AUTORISÉE

Base : Android 26.20 + correctifs serveur cumulatifs V26.21/V26.22.

Cette version contient l’inventaire réel fourni dans `Résumé de l’inventaire (4).xlsx` et les corrections cumulatives prêtes à être déployées via CDQ Script Manager V48.

## Import source
- 136 articles, dans le même ordre que le fichier source.
- Le préfixe `CDQ` est retiré uniquement lorsqu'il est au début du SKU; le reste devient le numéro d'article.
- 40 SKU sont nettoyés ainsi.
- 68 lignes sans SKU restent sans numéro visible; aucun numéro n'est inventé.
- `quantity_available` devient le stock physique initial de la Shop.
- Total physique source vérifié : **1 055**.
- `quantity_available_for_sale` reste une valeur séparée `disponibleVente`.
- Total disponible à la vente source vérifié : **902**.
- `rate` devient `prixClient`, utilisé comme prix de vente au client dans la Liste de prix.
- L'empreinte déterministe des cinq colonnes essentielles du fichier source est `0x540f1af7`; les données préparées produisent la même empreinte.

## Cas particuliers conservés
- Les numéros visibles dupliqués `29` et `3791` sont conservés tels quels; les articles restent distincts grâce à leur `articleId`.
- La disponibilité à la vente `-1` de l'article `7663` est conservée, sans correction silencieuse.
- Les lignes sans SKU sont consultables par nom, fabricant, modèle et catégorie.

## Sécurité de l'import
Au premier chargement de l'inventaire après déploiement V26.23 :
1. la feuille Articles actuelle est copiée dans une sauvegarde horodatée;
2. la feuille Stock actuelle est copiée dans une sauvegarde horodatée;
3. Articles et Stock sont remplacés par les 136 lignes préparées;
4. la feuille Unites (si elle existe) est sauvegardée puis réinitialisée, parce que le fichier source ne contient aucun numéro de série;
5. Mouvements, Alertes et PushTokens sont conservés;
6. un marqueur empêche l'import de se rejouer.

Aucune de ces écritures n'est exécutée tant que V26.23 n'est pas déployée.

## Photos
- **64 correspondances produit à haute confiance** ont maintenant une image fabricant/officielle préparée.
- Ajouts validés : familles et modèles exacts chez Rice Lake, ANYLOAD, Totalcomp, Avery Weigh-Tronix, Kilotech, Flintec, OHAUS, Epson et Neutrik. Les 72 articles restants sans correspondance suffisamment sûre gardent l’icône de catégorie plutôt qu’une mauvaise photo.
- Ajouts supplémentaires vérifiés : Tedea-Huntleigh 1022-30 kg et 240-20 kg.
- Une photo Drive ajoutée manuellement à un article demeure prioritaire sur l'image distante.
- Les produits ambigus restent sans image automatique plutôt que d'afficher une mauvaise photo.
- Exemple de correction de catalogue : `KPC 461-3k` est classé Kilotech / Balances / plateformes / modèle `KPC 461-3K`, sans modifier ses données de stock ou son prix.

## Interface
- Le nom de l'article est affiché en premier; le numéro d'article est secondaire.
- La recherche tient aussi compte du SKU source pour faciliter la transition.
- La Liste de prix affiche nom, numéro, fabricant, quantité disponible à la vente, photo si disponible et prix client.
- L’inventaire général montre le stock physique et la disponibilité à la vente séparément.
- Le détail conserve le stock physique par emplacement et affiche séparément la disponibilité à la vente.
- Les entrées et sorties de stock ajustent aussi la disponibilité à la vente; un transfert Shop ↔ camion ne la modifie pas.

## Corrections cumulatives conservées
- V26.21 : séparation connexion Balance CDQ / compte Google Drive.
- V26.22 : factures dans le CDQ Système historique courant + archivage des PDF après Convertir et envoyer.
- Android requis : **26.20**.

## Publication
Migration terminée et publication autorisée le 1er octobre 2026. V26.23 est le package cumulatif à charger dans CDQ Script Manager V48, puis à appliquer avec **ÉCRIRE + DÉPLOYER**.
