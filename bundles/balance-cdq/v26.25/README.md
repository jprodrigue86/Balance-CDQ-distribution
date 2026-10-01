# Balance CDQ V26.25 — boutons Inventaire

Correctif UI uniquement, après V26.23/R2.

Six sélecteurs renvoyaient un seul élément DOM avant un forEach. Le rendu échouait avant le branchement des catégories et des fiches. Les collections utilisent désormais le sélecteur multiple existant. Sont concernés les catégories, les prix après recherche, les mouvements depuis une fiche, les emplacements et les actions après confirmation d’un scan. Les comparaisons textuelles et de numéros de série ont maintenant un normaliseur local au module, sans dépendance à une fonction globale de la page hôte.

Aucune modification CSS, aucun import, aucune réinitialisation, aucun module serveur de données remplacé. Android 26.25 et les assets iPhone utilisent cette source corrigée. Le package Apps Script modifie uniquement ces branchements, le normaliseur local et les marqueurs de version.

Le déclenchement automatique sur l’appareil utilisateur reste à observer à l’occasion de cette nouvelle version.
