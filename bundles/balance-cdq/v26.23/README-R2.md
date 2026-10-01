# V26.23 R2 et application 26.24

Le package serveur R2 conserve tous les correctifs V26.21/V26.22/V26.23.
Le refus Google « project is too large to save » est traité en retirant
13 anciens segments intégrés v2291, uniquement après contrôle SHA-256,
absence de référence, relecture concurrente et sauvegarde du Manager.
Le modèle v2519, son chargeur et les fichiers clients restent intacts.
La réduction connue est de 10 504 828 octets sur la sauvegarde du 27 septembre;
la taille du projet Google actuel doit être confirmée après son écriture.

Android/iPhone 26.24 inclut le catalogue réel (photos, disponibilité vente,
prix client, SKU) dans l'interface embarquée, tout en conservant la recherche
par numéro de série et les corrections précédentes.
Le canal automatique est le canal Android natif stable existant; aucun
ancien canal à signature incompatible n'est réactivé.
Le pipeline de publication conserve la vérification du certificat historique.

La publication du package ne constitue ni une écriture Apps Script, ni une
confirmation de fin de migration. Aucun basculement Drive n'est effectué.
