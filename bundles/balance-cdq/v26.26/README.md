# Balance CDQ V26.26

Compte Google: correction du lecteur du réglage Fichiers dans le contrôle Drive au démarrage. Le lecteur cherchait une fonction privée dans une autre IIFE; le réglage public existant est maintenant utilisé. PDF et Sheets continuent de lire le même compte. Sans défaut, le sélecteur reste volontairement présent.

Administrateur: promotion unique de jprodrigue@groupecdq.com dans la liste serveur après déploiement, sans partager ni réinitialiser les codes/NIP. Le Gmail reste administrateur principal et compte propriétaire Apps Script. Les autres utilisateurs sont conservés.

Android: 26.26. Apps Script: V26.26, compatible avec V26.23/R2 ou V26.25; aucun import de données ni suppression de modèle. Installation à confirmer sur téléphone.

## Sélecteur de compte moderne
Sans compte par défaut, une seule fenêtre CDQ permet le choix et une mémorisation explicite. La mémorisation est faite uniquement après validation Google/Drive. Avec un défaut valide, pas de fenêtre CDQ supplémentaire. Google peut encore demander un consentement ou l’ajout d’un compte. Les stocks, NIP, prix et rapports ne sont pas réimportés.
