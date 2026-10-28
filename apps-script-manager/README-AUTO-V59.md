# CDQ Manager V59

Les 125 contrôles de V58 sont conservés. Le graphe fermé inspecte maintenant aussi `pc/report-engine-storage-20261028.mjs`, dépendance réelle du moteur de rapports depuis 27.90. V58 refusait correctement cette dépendance non inspectée; ce refus empêchait toute qualification. Le module est désormais téléchargé, empreinté avant et après le contrôle, et exécuté uniquement depuis ces octets vérifiés. Les gardes contre une dépendance absente ou modifiée restent en place.

Les reçus V58 ne sont pas réutilisés comme V59. La réutilisation reste limitée à 12 heures, avec mêmes empreintes, version, navigateur et suite complète. Les six contrôles négatifs de V58 sont conservés.

La qualification de la modification comprend un contrôle négatif spécifique : retirer la dépendance de stockage inspectée doit être refusé; modifier ses octets après inspection doit aussi être refusé. Le test emploie les véritables sources assemblées.

Les tests restent synthétiques : aucune connexion Drive authentifiée, aucun appareil Samsung, aucune compilation ou publication GitHub ne sont prouvés par ce reçu. Le rendu et les gestes PDF.js sont qualifiés séparément.
