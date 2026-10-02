// Model-specific summaries of manufacturer documentation, checked 2026-09-27.
// A documented method is not a field confirmation. Do not substitute neighbouring models.
const step=(title,text,display='',keys=[])=>({title,text,display,keys});
const method=(label,url,intro,steps,parameters=[])=>({revision:'2026-09-27.1',checkedAt:'2026-09-27',source:{label,url},intro,steps,parameters});
const methods={};
const set=(m,models,value)=>models.forEach(model=>methods[m+'::'+model]=value);
set('Western Scale',['M1'],method('Western Scale M1 — Technical Manual, p. 14–16 et 25–26','https://www.massload.com/wp-content/uploads/2020/04/1.1-WSCL_M1_Tech_09091396380549.pdf',
  'Calibration zéro + span. Conserver la capacité, les unités et les divisions prévues pour cette balance.',[
    step('Accéder à CAL','Maintenir GAUCHE et DROITE ensemble. À PASS, saisir le code de calibration autorisé (0001 à l’usine, sauf modification), puis ENTER.','CAL → PASS',['◀','▶','ENTER']),
    step('Vérifier la configuration','P1.0 : graduation; P1.1 : décimales; P1.4 : capacité; P1.6 : unité primaire (1 = kg, 2 = lb). ENTER valide chaque réglage.','P1.0 / P1.1 / P1.4 / P1.6'),
    step('Capturer le zéro','Plateau vide : ouvrir P1.2 avec ENTER. À E SCL, appuyer encore sur ENTER; attendre le retour à zéro.','E SCL',['ENTER']),
    step('Capturer le span','Ouvrir P1.3. À SPAn, appliquer les masses et saisir leur valeur exacte avec les flèches. Confirmer par ENTER.','SPAn',['ENTER']),
    step('Enregistrer','GAUCHE + DROITE enregistre et ramène au pesage. Retirer les masses, vérifier le zéro puis plusieurs charges connues.','WEIGH',['◀','▶'])
  ]));
set('Rice Lake',['720i'],method('Rice Lake 720i — Technical Manual 103121, §2.1.2 et §5.2','https://www.ricelake.com/media/kgbpq4xa/m_103121_720i_tech_enus_revi.pdf',
  'Calibration frontale standard de la voie sélectionnée. L’accès Configuration nécessite le cavalier J9 prévu par le fabricant.',[
    step('Choisir la voie','MENU → Configuration → ENTER. Dans SCALES, descendre et sélectionner la balance; descendre à GRADS, aller à gauche sur CALIBR, puis descendre à WZERO.','SCALES → CALIBR'),
    step('Zéro','Sans charge, descendre pour afficher WZERO, puis utiliser la touche contextuelle Calibrate. ENTER enregistre le résultat.','WZERO',['Calibrate','ENTER']),
    step('Valeur étalon','Dans WVAL, descendre, saisir la masse exacte et confirmer avec ENTER.','WVAL'),
    step('Span','Appliquer cette masse. Dans WSPAN, descendre puis Calibrate; attendre la fin et confirmer avec ENTER.','WSPAN'),
    step('Sauvegarder','WLIN est optionnel et ses anciens points sont réinitialisés par la calibration. Pour des crochets/chaînes, consulter REZERO dans le manuel. Terminer par Save and Exit puis vérifier les lectures.','Save and Exit')
  ]));
const cpw=method('Adam Equipment CPWplus — manuel USA, §7, p. 11–12','https://adamequipment.com/media/docs/manuals/CPWplus_UM_USA.pdf',
  'La masse sélectionnée doit être d’au moins 10 % de la capacité. CALEr signifie que la calibration n’a pas été enregistrée.',[
    step('Démarrer','En pesage normal, plateau vide, maintenir Tare/Zero pendant quatre secondes. À CAL, choisir kg ou lb avec Unit.','CAL',['Tare/Zero (4 s)','Unit']),
    step('Saisir la masse','Print/Hold affiche L xx. Tare/Zero modifie le chiffre; Print/Hold passe au suivant. Unit confirme la valeur exacte des masses.','L xx'),
    step('Appliquer la charge','Placer la masse choisie au centre, attendre la stabilité et appuyer sur Unit. Le pesage normal revient.','',['Unit']),
    step('Contrôler','Retirer les masses et vérifier le zéro puis les lectures. Une variation dépassant ±20 % de la référence usine provoque CALEr; ne pas considérer cet essai comme réussi.','CALEr = échec')
  ]);
set('Adam Equipment',['CPW Plus-6','CPW Plus-35'],cpw);
set('Totalcomp',['TWP'],method('Totalcomp TWP — Service Manual, Quick Calibration p. 32','https://totalcomp.com/image/manual_pdf/TWP-Manual-Quick-Set-up.pdf',
  'Procédure non linéaire : zéro puis span. Vérifier les unités et disposer de la masse saisie.',[
    step('Ouvrir la programmation','En pesage, UNIT + PRINT/M+. TARE jusqu’à ProG, ZERO, puis G/N, UNIT, ZERO.','ProG'),
    step('Choisir la calibration','TARE jusqu’à P 2 CAL, ZERO. TARE jusqu’à CAL, puis ZERO pour choisir nonLin.','P 2 CAL → CAL → nonLin'),
    step('Zéro','ZERO affiche Unload. Choisir kg/lb avec UNIT si nécessaire; vider le plateau puis ZERO.','Unload'),
    step('Masse et span','Saisir la masse disponible : G/N déplace le chiffre, TARE l’augmente. ZERO affiche LoAd; appliquer exactement cette masse, attendre la stabilité puis ZERO.','LoAd'),
    step('Fin','PASS précède le redémarrage automatique. Vérifier ensuite zéro et charges connues.','PASS')
  ]));
set('MyWeigh',['KD-8000'],method('My Weigh KD-8000 — manuel fabricant, Calibration','https://myweigh.com/resources/manuals/kd8000.pdf',
  'Utiliser exactement 5 kg de masses connues. Laisser la balance se stabiliser avant l’opération.',[
    step('Entrer en calibration','Balance éteinte, maintenir MODE et marche/arrêt ensemble, relâcher puis attendre CAL.','CAL',['MODE','Marche/arrêt']),
    step('Calibrer','Déposer 5 kg. Attendre quelques secondes puis appuyer sur TARE.','5 kg',['TARE']),
    step('Vérifier','Attendre PASS, retirer les masses, éteindre puis rallumer. Contrôler plusieurs lectures avant de confirmer le résultat.','PASS')
  ]));
set('Sartorius',['Practum2102-1S'],method('Sartorius Secura / Quintix / Practum — §8.2, p. 75','https://api.sartorius.com/document-hub/dam/download/21625/Manual_Secura_Quintix_Practum_WSE6004-e181008.pdf',
  'Practum : ajustage avec une masse externe. La calibration interne CAL-Intern concerne Secura et Quintix, pas ce Practum.',[
    step('Préparer','Mettre de niveau, laisser stabiliser, vider le plateau puis effectuer le zéro.'),
    step('Choisir l’ajustage','Ouvrir le menu en bas à gauche, sélectionner CAL puis CAL-Extern.','CAL → CAL-Extern'),
    step('Choisir la masse','Sélectionner à l’écran la valeur de la masse de calibration disponible. Ne pas déduire la masse de la seule capacité.'),
    step('Exécuter','À l’invite, déposer cette masse. Le cycle démarre automatiquement. Attendre sa fin, retirer la masse et vérifier le zéro et les lectures.')
  ]));
function ranger(count){return method('Ohaus Ranger '+(count?'Count ':'')+'3000 — §4.2, p. EN-13','https://ohaus.ca/product/pdf/ranger-3000'+(count?'-count':'')+'-manual.pdf',
  'Calibration SPAN de la balance principale. Le verrou de calibration/LFT doit autoriser l’opération.',[
    step('Menu','Maintenir Menu jusqu’à mMeNU; relâcher. À C.A.L, YES; à SpaN, YES.','C.A.L → SpaN'),
    step('Zéro','À 0 kg, plateau vide, YES. Attendre la capture du zéro.','0 kg → --C--'),
    step('Span','Lire la masse demandée. NO permet une autre valeur proposée. Poser exactement la masse choisie et confirmer par YES.','--C--'),
    step('Fin','done confirme la réussite et le retour au pesage. Retirer les masses et contrôler les lectures. La linéarité LIN est une opération distincte.','done')
  ]);}
set('Ohaus',['RC31P30','RC31P3'],ranger(true));set('Ohaus',['R31P30'],ranger(false));
set('Ohaus',['V12P6'],method('Ohaus Valor 1000 — §4.1, p. EN-7','https://ohaus.ca/product/pdf/Valor_1000_man.pdf',
  'SPAN utilise une masse égale à la capacité complète. Le menu doit être déverrouillé; consulter le manuel si CAL est inaccessible.',[
    step('Ouvrir CAL','Maintenir Tare/Menu environ trois secondes jusqu’à C.A.L, puis relâcher. On/Off ouvre le menu.','C.A.L'),
    step('Zéro','À SPAN, On/Off. Quand 0.000 kg apparaît et que le plateau est vide, appuyer brièvement sur On/Off.','SPAN → 0.000 kg'),
    step('Span','À l’affichage de la pleine capacité, déposer cette masse exacte puis On/Off.'),
    step('Fin','Cal-E indique un échec. Tare/Menu permet de quitter; vérifier ensuite le zéro et plusieurs charges.','Cal-E = échec')
  ]));
set('Ohaus',['i-DT33P'],method('Ohaus Defender 3000 i-DT33 — 30696592 A, §4.2.2–4.2.3','https://ohaus.ca/product/pdf/Instruction_Manual_3000_Series_Indicators_i-DT33_EN_30696592_A.pdf',
  'Effectuer ZERO avant SPAN. Le verrou de calibration doit être ouvert conformément à la configuration de l’instrument.',[
    step('Menu','Maintenir Menu jusqu’à mM.E.N.U, relâcher. À C.A.L, YES.','C.A.L'),
    step('Zéro','À ZErO, YES. Plateau vide à 0 kg clignotant, YES; attendre --C-- puis DONE.','ZErO'),
    step('Span','À SPAN, YES. Vérifier la masse et l’unité. NO augmente le chiffre, Back le diminue, YES valide et avance.','SPAN'),
    step('Appliquer','Déposer la masse choisie, attendre la stabilité puis YES. Attendre DONE; à Lin, Exit. CAL E signifie que les anciennes données ont été restaurées.','DONE / CAL E'),
    step('Contrôler','Retirer la masse; vérifier le zéro et plusieurs points de charge.')
  ]));
set('Kilotech',['KIN1000'],method('Kilotech KIN 1000 / 2000 WR — guide français, p. 12','https://s3.amazonaws.com/doverco/doverco/content/41700_Documents_KIN1000_2000WR_Guide_Utilisateur.pdf',
  'Accès matériel JP1 requis. Procédure commune du guide KIN 1000 / 2000 WR.',[
    step('Autoriser la calibration','Ouvrir le boîtier selon le manuel et placer JP1 sur ON. Maintenir TARE 1,5 seconde.','CAL SP'),
    step('Zéro','MR affiche CAL 00. Plateau vide, UNIT confirme le zéro; attendre la valeur de masse précédente.','CAL 00'),
    step('Span','Appliquer la masse. À stabilité, M+ augmente le chiffre, MR déplace la sélection; saisir la valeur exacte puis UNIT.'),
    step('Terminer','Le guide indique un affichage erreur 2 après capture : retirer la masse pour revenir à zéro. Remettre JP1 sur OFF, fermer le boîtier et vérifier les lectures. Si l’erreur persiste à vide, signaler l’échec.')
  ]));

set('Rice Lake',['680'],method('Rice Lake 680 — Technical Manual 192627 Rev S, §5.1.1, p. 54','https://www.ricelake.com/media/upvozzam/m_192627_680_tech_enus_revs.pdf',
  'Zéro et span obligatoires. La séquence inclut les écrans de comptes ZEROCNT et SPANCNT.',[
    step('Accéder à CALIBR','Presser le commutateur SETUP selon le manuel. Depuis CONFIG, PRINT/droite deux fois, puis GROSS/NET/bas pour WZERO.','CONFIG → CALIBR → WZERO'),
    step('Zéro','Sans charge, TARE/ENTER exécute WZERO. Attendre OK. Avancer par ZEROCNT jusqu’à WVAL, sans modifier les comptes.','OK → ZEROCNT → WVAL'),
    step('Masse','Ouvrir WVAL, effacer au besoin avec CLEAR et saisir la masse exacte. TARE/ENTER valide et affiche WSPAN.','WVAL → WSPAN'),
    step('Span','Appliquer la masse saisie, attendre la stabilité puis TARE/ENTER. Attendre OK, puis avancer à SPANCNT.','OK → SPANCNT'),
    step('Sortir','MENU ramène au pesage. Vérifier zéro et charges connues. Pour WLIN ou les montages avec crochets/chaînes, consulter les procédures distinctes du manuel.','MENU')
  ]));
set('Rice Lake',['420HE'],method('Rice Lake SURVIVOR 420HE — 87972 Rev C, §4.1, p. 27','https://www.ricelake.com/media/bdfgwpwe/m_87972_420he_enus_revc.pdf',
  'Procédure frontale : les flèches imprimées sur le clavier servent à naviguer; TARE valide les valeurs.',[
    step('Accéder','Entrer en SETUP par le commutateur interne prévu par le manuel. À CONFIG, aller à CALIBR puis descendre à WZERO.','CALIBR'),
    step('Zéro','Vider le plateau; lancer WZERO. Attendre *CAL* puis les comptes A/D. Enregistrer pour passer à WVAL. Ne pas modifier le zéro après le span.','WZERO'),
    step('Masse','Ouvrir WVAL, saisir la valeur exacte des masses et enregistrer.','WVAL'),
    step('Span','À WSPAN, appliquer la masse et lancer la capture. Attendre les comptes A/D, puis enregistrer.','WSPAN'),
    step('Terminer','Sans crochets/chaînes, retirer les masses et remonter à CALIBR puis CONFIG; quitter SETUP. Avec ces accessoires, suivre REZERO, §4.1 étape 6. Contrôler les lectures.')
  ]));
set('Rice Lake',['120'],method('Rice Lake 120 — Technical Manual 76699 Rev D, §4.1, p. 27','https://www.ricelake.com/media/d2wpx2ie/m_76699_120_tech_enus_revd.pdf',
  'Procédure du modèle 120. Ne pas la substituer au manuel du 120 Plus.',[
    step('Accéder','Entrer en configuration selon §1.2; CONFIG apparaît. Aller à CALIBR puis WZERO.','CONFIG → CALIBR'),
    step('Zéro','Vider le plateau et lancer WZERO. Attendre *CAL* puis WVAL.','WZERO → WVAL'),
    step('Masse','Placer les masses; ouvrir WVAL, saisir leur valeur exacte et enregistrer pour atteindre WSPAN.','WVAL'),
    step('Span','Lancer WSPAN. Attendre *CAL* puis REZERO.','WSPAN → REZERO'),
    step('Terminer','Sans accessoires de suspension, retirer les masses et passer à EXIT Y pour confirmer la sortie. Si des crochets/chaînes ont servi, appliquer d’abord REZERO comme décrit au §4.1. Vérifier les lectures.','EXIT Y')
  ]));
set('Mettler Toledo',['IND560'],method('METTLER TOLEDO IND560 — User’s Guide, p. 3-11–3-13 (copie du manuel fabricant)','https://bradysystems.com/wp-content/uploads/2012/10/IND560-User-Manual.pdf',
  'Cette procédure concerne la voie à cellules analogiques. Pour IDNet, utiliser le mode service et le manuel de la plateforme.',[
    step('Configuration','Ouvrir SETUP avec un accès autorisé, puis Scale → Calibration. Vérifier unités, capacité et réglage de linéarité.'),
    step('Zéro','Capture Zero, plateau vide, puis START. Attendre le message de fin; ne pas accepter une capture instable.','Capture Zero'),
    step('Masse','Capture Span : saisir Test Load 1 et les autres charges si la linéarité est activée; ENTER.','Capture Span'),
    step('Span','Poser Test Load 1, START. Répéter uniquement les charges supplémentaires demandées.'),
    step('Fin','Capture Span OK confirme le résultat; Calibration Failure indique un échec. EXIT revient à Calibration. Quitter SETUP et contrôler zéro et charges connues.','Capture Span OK')
  ]));
set('Mettler Toledo',['IND246'],method('METTLER TOLEDO IND246 — User’s Guide, p. 3-1 et 3-8–3-9 (copie fabricant)','https://bradysystems.com/wp-content/uploads/2012/10/IND246-User-Manual.pdf',
  'Procédure du terminal analogique de ce manuel. Vérifier la variante; la version POWERCELL possède sa documentation spécifique.',[
    step('Accéder','MENU → SETUP → ENTER, avec le mot de passe autorisé si demandé. Ouvrir Scale → Calibration.'),
    step('Zéro','Set Zero : vider la plateforme et ENTER. Attendre la confirmation; une capture instable doit être reprise.','Set Zero'),
    step('Masse','Set Span → ENTER. Saisir Test Load 1 et Test Load 2 seulement si la linéarité est activée; ENTER.','Set Span'),
    step('Span','Appliquer la première charge; sur Place xxxx, press ENTER, confirmer. Répéter pour la deuxième si demandée.'),
    step('Fin','Attendre Capture Span OK. Flèche gauche revient à Calibration; continuer à gauche pour quitter SETUP. Vérifier les lectures. Calibration Failure n’est pas une réussite.','Capture Span OK')
  ]));
set('Mettler Toledo',['ML104T/31'],method('METTLER TOLEDO ML-T — Operating Instructions, §6.2.3, p. 58','https://manualmachine.com/mettlertoledo/ml54t/15968309-instruction-manual/',
  'Ajustage externe de la série ML-T, incluant ML104T. Vérifier que l’option est disponible sur la variante installée.',[
    step('Préparer','Mettre de niveau, laisser stabiliser et vider le plateau.'),
    step('Ouvrir','Activities → Adjustments and tests → Adjust external.','Adjust external'),
    step('Définir la masse','Régler la valeur de la masse selon son certificat, confirmer puis lancer l’ajustage à l’écran.'),
    step('Exécuter','Suivre les invites : déposer la masse au centre puis la retirer lorsque demandé. Attendre le résultat final, puis vérifier zéro et lectures.')
  ]));
set('A&D',['GP-30K'],method('A&D GP Series — §7-4, p. 28–29','https://weighing.andonline.com/sites/default/files/documents/GP%20Instruction%20Manuel.pdf',
  'Ajustage externe : masses admises pour GP-30K, 20 kg ou 30 kg. Préchauffer au moins 30 minutes, plateau vide.',[
    step('Démarrer','Maintenir CAL jusqu’à Calout, puis relâcher. Cal 0 apparaît. CCout est un test, pas un ajustage.','Calout → Cal 0'),
    step('Choisir la masse','Au besoin SAMPLE ouvre la sélection; RE-ZERO choisit/ajuste la valeur, SAMPLE change le mode, PRINT mémorise et revient à Cal 0.'),
    step('Zéro','Plateau vide et stable, PRINT. Attendre l’affichage de la masse demandée.','PRINT'),
    step('Span','Déposer cette masse, PRINT. Ne pas perturber la mesure. À end, retirer la masse.','end'),
    step('Vérifier','Au retour au pesage, appliquer de nouveau la masse pour contrôler le résultat.')
  ]));
set('CEM',['SMART 6'],method('CEM SMART 6 — manuel fabricant, p. 21, §15','https://www.manualslib.com/manual/2873595/Cem-Smart-6.html?page=21',
  'Calibration de la balance interne uniquement; la température infrarouge et le mécanisme de ventilation ont des opérations distinctes.',[
    step('Préparer','Utiliser une masse étalon traçable de 10 g et un plateau propre.'),
    step('Ouvrir','Menu système en bas à droite → Tools → Calibration. Sélectionner la calibration de la balance.','Tools → Calibration'),
    step('Exécuter','START, puis suivre les invites à l’écran avec la masse de 10 g. Attendre la fin complète du cycle.','10 g'),
    step('Terminer','HOME revient à l’accueil. Vérifier la lecture avant de confirmer le fonctionnement.')
  ]));

set('Mettler Toledo',['Panther'],method('METTLER TOLEDO PANTHER — Technical Manual 10/2008, p. 3-2, 3-5, 3-9','https://www.artisantg.com/info/MettlerToledo_Panther_Manual.pdf',
  'Procédure du terminal PANTHER Analog/DigiTOL décrit dans ce manuel. PRINT sert de touche ENTER.',[
    step('Accéder','Autoriser Setup par SW1-1 selon le manuel, refermer le terminal, puis PRINT + ZERO pour afficher F1.','F1'),
    step('Ouvrir CAL','PRINT entre dans F1; conserver les paramètres de balance prévus. Au sous-bloc CAL, sélectionner 1 pour calibrer. SELECT modifie; PRINT valide.','CAL 1'),
    step('Zéro','À E SCL, vider la plateforme puis PRINT. Attendre le compte à rebours 15 CAL.','E SCL'),
    step('Span','À Add Ld, déposer les masses puis PRINT. Saisir leur valeur exacte sans point décimal; PRINT. En mode lb-oz, saisir les onces. Attendre CAL d.','Add Ld → CAL d'),
    step('Enregistrer','CLEAR jusqu’à CALOFF, puis PRINT pour revenir au pesage. Remettre SW1-1 sur OFF selon le manuel. Contrôler les lectures.','CALOFF')
  ]));
set('Mettler Toledo',['IND236'],method('METTLER TOLEDO IND231/236 — guide 04/2021, §3.1 et §3.4.3.2','https://www.mt.com/dam/product_organizations/industry/IndustrialTerminals/30094013_R04_IND231-236_UG_EN.pdf',
  'Calibration standard F1.3.2. Le mode approuvé bloque les réglages métrologiques tant que le commutateur matériel ne les autorise pas.',[
    step('Accéder','Maintenir MENU et utiliser l’accès technicien autorisé. En mode approuvé, l’accès F1 nécessite le setup-switch décrit au §3.1.1.'),
    step('Ouvrir','Vérifier capacité/division dans F1.2 et GEO dans F1.3.1; ouvrir F1.3.2. La touche droite/F2 ou ENTER valide.','F1.3.2'),
    step('Zéro','Plateau vide, lancer la calibration. À E SCL, confirmer encore et attendre le décompte 10 à 0.','E SCL'),
    step('Span','À Full Ld, confirmer; régler la masse clignotante avec haut/bas. Poser cette masse, confirmer et attendre done.','Full Ld → done'),
    step('Sauvegarder','Remonter au menu racine, quitter à gauche et choisir Save. Confirmer la sortie, puis contrôler zéro et lectures.','Save')
  ]));

set('Rice Lake',['SCT2200'],method('Rice Lake SCT-2200 — Quick Setup Guide 184974 Rev B, p. 1','https://balancepapp.ca/wp-content/uploads/2022/12/a_us_184974_quicksetupguide_sct-2200_revb.pdf',
  'Calibration par masse connue. Le guide distingue cette méthode de la calibration théorique par sensibilité de cellule.',[
    step('Accéder','Allumer avec C/ON-OFF. Pendant l’affichage de la version, presser MODE. PRINT entre dans un paramètre et confirme.'),
    step('Vérifier','Conserver div.deC et CAPAC adaptés à la balance. ZERO/TARE parcourent les choix; MODE sélectionne le chiffre à modifier.'),
    step('Zéro','Plateau vide : sélectionner ZEro puis PRINT. Attendre ERNOT puis STORE?; PRINT accepte.','ZEro → STORE?'),
    step('Span','Régler SPAn à la masse exacte, appliquer cette charge avant de lancer la capture avec PRINT. Attendre ERNOT puis STORE?; PRINT accepte.','SPAn → STORE?'),
    step('Sauvegarder','C jusqu’à SAVE?, puis PRINT. Une autre touche abandonne les changements. Contrôler zéro et charges connues.','SAVE?')
  ]));
set('Anyload',['OCS-L'],method('ANYLOAD OCSL — User’s Guide v2, p. 9–10','https://www.anyload.com/wp-content/uploads/2019/08/Anyload-OCSL-User-Guide-v2.pdf',
  'Identifier la génération avant de commencer : les accès et les unités diffèrent entre versions 1 et 2.',[
    step('Version 2 — accès','Allumer; relâcher ON/OFF à 88888, puis maintenir rapidement TARE jusqu’à LoAd0. Sans charge et à stabilité, TARE capture le zéro.','LoAd0'),
    step('Version 2 — span','La calibration est exclusivement en kg. Saisir la masse réelle : HOLD choisit le chiffre, ON/OFF modifie. Appliquer la masse, stabiliser puis TARE. Attendre End. Ne pas saisir une valeur en lb.','End'),
    step('Version 1 — accès','Choisir l’unité voulue; HOLD + TARE jusqu’à SETUP, puis ON/OFF + HOLD + TARE jusqu’à SCALE. TARE entre; conserver capacité, résolution et décimales prévues.','SCALE'),
    step('Version 1 — captures','À LoAd0, vider puis TARE. À Load1, régler la masse avec HOLD, l’appliquer puis TARE. Si Load2 apparaît, appliquer la seconde masse et TARE, ou ON/OFF pour omettre ce point. Attendre End.'),
    step('Contrôle','Retirer les masses et contrôler les lectures. Si les écrans ne correspondent pas, arrêter et signaler la variante.')
  ]));
set('Mettler Toledo',['IND226'],method('METTLER TOLEDO IND221/IND226 — Mode d’emploi, ajustement F1.3.3, p. 88','https://www.crossco.com/wp-content/uploads/2025/04/Mettler-Toledo-IND221-IND226-Weighing-Terminal-Operation-Manual-CrossCo.pdf',
  'Procédure IND226 de ce manuel, distincte de l’IND226x. Accès superviseur et verrou métrologique selon la configuration.',[
    step('Accéder','Maintenir MENU jusqu’à CoDE; entrer la séquence d’accès autorisée, puis PRINT. Ouvrir F1.3.3; PRINT confirme, TARE passe au choix suivant.'),
    step('Préparer','Vérifier capacité/divisions, GEO dans F1.3.1 et LinOFF/LinOn dans F1.3.2. La demi-charge est demandée uniquement avec LinOn.'),
    step('Zéro','À E SCL, vider puis PRINT. Attendre le décompte de 10 à 0.','E SCL'),
    step('Charges','Si Add Ld apparaît, poser la demi-charge, PRINT, saisir sa valeur puis PRINT. À FULL Ld, répéter avec la charge maximale. Pour saisir : TARE incrémente, F déplace le chiffre, PRINT confirme.','Add Ld / FULL Ld'),
    step('Enregistrer','Attendre donE. ON/OFF affiche SAVE; PRINT enregistre. Contrôler le zéro et plusieurs charges.','donE → SAVE')
  ]));

const method38=(...args)=>Object.assign(method(...args),{revision:'2026-10-02.1',checkedAt:'2026-10-02'});
set('Mettler Toledo',['IND360'],method38('METTLER TOLEDO IND360 — 30654701 rév. 04, §3.5.1.3','https://www.mt.com/dam/product_organizations/industry/Load_Cells/Downloads/Transmitter/ind360/manuals/30654701_04_MAN_UG_IND360_EN.pdf',
  'Interface Web, voie analogique standard de cette révision. Les voies POWERCELL et précision ont leurs propres sections; confirmer la technologie avant de commencer.',[
    step('Préparer','Ouvrir la configuration autorisée, Scale → Calibration. Vérifier GEO, unité et linéarité sans changer les paramètres de la balance.','Scale → Calibration'),
    step('Zéro','Dans Zero Adjust, vider la balance, attendre la stabilité puis START. Attendre Completed; rejeter une capture dynamique et corriger la stabilité.','Zero Adjust',['START']),
    step('Charges','Dans Span Adjust, saisir chaque masse totale cumulative. Poser la première charge puis START. Si plusieurs points sont activés, Continue puis appliquer chaque charge totale demandée.','Span Adjust',['START','Continue']),
    step('Terminer','Completed confirme la capture. Done termine; ESC abandonne sans enregistrer. Retirer les masses et contrôler zéro et charges connues.','Completed',['Done'])
  ]));
set('Mettler Toledo',['IND780'],method38('METTLER TOLEDO IND780 — 64057242 rév. 15, §3.5.1.4','https://www.mt.com/dam/product_organizations/industry/IndustrialTerminals/64057242_R15_IND780_TM_EN.pdf',
  'Captures pour une voie analogique ou POWERCELL. IDNet et SICS utilisent des commandes distinctes; ne pas leur appliquer cette séquence.',[
    step('Choisir la voie','Dans la configuration autorisée, ouvrir la calibration de la balance sélectionnée. Vérifier unités, GEO et points de linéarité.','Scale → Calibration'),
    step('Zéro','Capture Zero : vider la balance, attendre la stabilité, START. Vérifier la réussite puis EXIT. Si du mouvement est signalé, ESC rejette la capture.','Capture Zero',['START','EXIT']),
    step('Span','Capture Span : saisir Test Load 1 et les autres charges si la linéarité est active; ENTER. Poser la première charge, START, puis suivre les charges demandées.','Capture Span',['ENTER','START']),
    step('Contrôle','Attendre Capture Span OK puis EXIT. Une Calibration Failure demande de corriger la cause et recommencer. Retirer les masses, contrôler le zéro et plusieurs charges.','Capture Span OK',['EXIT'])
  ]));
set('A&D',['AD4321'],method38('A&D AD-4321 A/B — imno-4321-022a/b rév. 2, p. 12–14','https://www.aandd.jp/products/manual/indicators/ad4321.pdf',
  'Le manuel distingue deux générations. Stabiliser thermiquement l’ensemble et vérifier capacité/division sur les DIP avant la calibration.',[
    step('Après janvier 1986','Commutateur CAL vers le haut. STANDBY/OPERATE affiche CAL; ZERO choisit CAL-1.','CAL → CAL-1'),
    step('Zéro et span — CAL-1','Plateau vide et stable : STANDBY/OPERATE. Appliquer les masses. ZERO déplace le curseur à gauche, TARE à droite, GROSS/NET augmente le chiffre. Saisir la masse exacte puis STANDBY/OPERATE.'),
    step('Ancienne génération','Écran en veille : CAL vers le haut, STANDBY/OPERATE. Plateau vide et stable, STANDBY/OPERATE. Poser la pleine capacité; ZERO, GROSS/NET et TARE règlent les trois chiffres selon la capacité (voir schéma p. 13). Valider STANDBY/OPERATE.'),
    step('Enregistrer et vérifier','Après une capture réussie, CAL vers le bas mémorise les valeurs. Vérifier retour à zéro et masses. Si un code d’erreur apparaît, consulter p. 13–14 avant de poursuivre.','CAL OFF')
  ]));
set('Cardinal',['210-FE'],method38('Cardinal 210FE avec USB — 8200-0727-2M rév. A, p. 31–33 et 42–43','https://cardinalscale.com/themes/ee/site/default/asset/img/resources/resources_brochures/8200-0727-2M_210FE_USB-Installation-Technical.pdf',
  'Procédure du matériel avec USB de ce manuel. Confirmer cette variante sur l’appareil. Ajustage complet à deux points : balance vide, puis masse connue.',[
    step('Accéder à CAL','Appareil allumé : presser puis relâcher le commutateur de calibration accessible à l’arrière. Répéter jusqu’au menu CAL. ENTER, 1/YES, ENTER.','CAL',['ENTER','1/YES','ENTER']),
    step('Premier point : zéro','À CAL1, vider la balance, attendre la stabilité puis ENTER. Attendre les tirets puis CAL2.','CAL1',['ENTER']),
    step('Second point : masse','À CAL2, saisir la valeur des masses avec le clavier numérique. Poser exactement ces masses, attendre la stabilité puis ENTER. Attendre le retour au menu SIO.','CAL2 → SIO',['ENTER']),
    step('Quitter et contrôler','Les données validées par ENTER sont conservées. Revenir à un menu avec le commutateur puis quitter par la touche de sortie indiquée au manuel, ou éteindre/rallumer. Contrôler zéro et plusieurs charges.')
  ]));

const reviews={
  'Rice Lake::SCT2200':['Commandes à vérifier','Le manuel technique décrit la calibration par masse connue (§4.2.3). Les pictogrammes de commande doivent encore être vérifiés avant de publier une séquence de touches.','https://www.ricelake.com/media/yuqb2sk2/m_183522_sct-2200_tech_enus_revg.pdf'],
  'Mettler Toledo::IND360':['Variante à préciser','Préciser la version logicielle, l’application (standard, réservoir, dosage…) et le type de plateforme pour choisir la procédure correspondante.','https://www.mt.com/es/es/home/library/datasheets/industrial-scales/terminals/ind360-downloads.html'],
  'Mettler Toledo::IND700':['Manuel technique à obtenir','La fiche fabricant identifie plusieurs technologies de pesage. Il faut le manuel technique et la configuration de la voie avant de détailler l’ajustage.','https://www.mt.com/dam/ind/brochures/industrial-scales/scale-indicators/ind700/IND700_Brochure-EN-PB-B-STI-20260127-00190160.pdf'],
  'Mettler Toledo::IND226':['Manuel à contrôler','Le manuel IND221/IND226 a été repéré. Vérifier la révision et la procédure F1.3; ne pas appliquer celle de l’IND226x.','https://www.crossco.com/wp-content/uploads/2025/04/Mettler-Toledo-IND221-IND226-Weighing-Terminal-Operation-Manual-CrossCo.pdf'],
  'Mettler Toledo::IND780':['Voie à préciser','Préciser le numéro et la technologie de voie (analogique, IDNet, POWERCELL/PDX); obtenir la section Calibration du manuel technique.','https://www.mt.com/id/id/home/library/operating-instructions/industrial-scales/IND780_User_Guide.html'],
  'A&D::AD4321':['Référence à préciser','Confirmer le suffixe exact et la révision sur la plaque (AD-4321A/B ou autre). La référence saisie seule ne permet pas de choisir les commandes.','https://www.aandd.jp/products/manual/manual_indicators.html'],
  'Avery Weigh-Tronix::ZM305-SD1':['Manuel de service requis','Le manuel utilisateur public ne suffit pas à confirmer la séquence de service et les droits nécessaires. Obtenir la procédure de la variante SD1.','https://www.averyweigh-tronix.com/product/zm305-multi-function-weight-indicator'],
  'Cardinal::210-FE':['Révision à confirmer','Le manuel 210FE avec USB est disponible. Confirmer la génération matérielle et les menus de l’appareil avant de lui associer cette procédure.','https://cardinalscale.com/resources/manuals/210FE'],
  'VWR::VWR-224TC':['Manuel exact à obtenir','La gamme T comprend plusieurs générations. Confirmer le manuel incluant explicitement VWR-224TC avant de publier les commandes.','https://www.vwr.com/us/en/product/25251787/vwr-t-balances'],
  'Mettler Toledo::SW':['Modèle à préciser','SW est une référence trop courte. Relever le modèle complet et photographier le clavier et la plaque.',''],
  'Sartorius::Entris':['Modèle à préciser','Entris désigne une gamme. Relever le code complet et la présence d’un ajustage interne ou externe.',''],
  'Kilotech::KWD 500-05':['Procédure de service requise','Le guide utilisateur renvoie au service Kilotech pour la procédure et les codes de calibration. La feuille de calibration doit être obtenue et contrôlée.','https://balancepapp.ca/wp-content/uploads/2022/12/KWD500_OM_Eng.pdf'],
  'Anyload::OCS-L':['Manuel OCSL à contrôler','Vérifier le guide OCSL et sa correspondance avec le clavier ou la télécommande installée. Ne pas substituer les commandes d’un autre OCS.','https://www.anyload.com/fr/products-guides-and-manuals/scales/'],
  'Kilotech::KHS-200-30':['Procédure de service requise','Le guide décrit l’utilisation et les erreurs, mais la séquence de calibration doit être confirmée dans la documentation de service du KHS-200-30.','https://www.kilotech.com/s/content/technical-support'],
  'Kilotech::KWS SW-12':['Procédure de service requise','Obtenir la procédure KWS-SW-12 et confirmer le verrou métrologique. Le guide utilisateur ne suffit pas pour une séquence de calibration.','https://irp.cdn-website.com/34376df9/files/uploaded/kws_sw_manuel.pdf'],
  'Digi::SM-5600B':['Manuel de service requis','Confirmer la variante B et la révision logicielle; obtenir les instructions de calibration SM-5600 correspondantes.','https://www.industry.gov.au/national-measurement-institute/nmi-services/pattern-approval/certificates-approval/teraoka-model-digi-sm-5600-weighing-instrument'],
  'Camry::ACS-30-JE51':['Procédure exacte à obtenir','Le guide commercial de cette famille ne confirme pas une séquence de service. Relever la révision et obtenir la procédure ACS-30-JE51.',''],
  'UWE::AFW':['Variante à préciser','AFW couvre plusieurs capacités et variantes B/F. Relever la référence complète et le clavier pour choisir la procédure.',''],
  'Rice Lake::IQ-710-2A':['Référence à confirmer','La fiche client indique IQ-710-2A. Confirmer la plaque avant toute association au manuel de l’indicateur IQ plus 710; ne pas déduire l’équivalence du nombre 710.','']
};
export function applyCalibrationMethods(devices){
  for(const d of devices){const value=methods[d.manufacturer+'::'+d.model];if(value){d.method=value;d.verified=true;d.status='documented';}}
  for(const d of devices){const r=reviews[d.manufacturer+'::'+d.model];if(r&&!d.verified)d.review={label:r[0],reason:r[1],url:r[2],checkedAt:'2026-09-27'};}
  // These names designate indicators even when recorded in a report's Balance section.
  for(const d of devices)if(['Ohaus::i-DT33P','Kilotech::KIN1000'].includes(d.manufacturer+'::'+d.model))d.category='indicator';
}
export {method,step,methods};
