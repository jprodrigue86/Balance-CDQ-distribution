// Manufacturer-document summaries reviewed 2026-10-25. No field validation is claimed.
// Exact model keys only: no prefix, capacity, neighbouring-model or fuzzy assignment.
const step=(title,text,display='',keys=[])=>({title,text,display,keys});
const documented=(label,url,documentRevision,pages,intro,steps)=>({revision:'2026-10-25.1',checkedAt:'2026-10-25',verificationBasis:'manufacturer-document',fieldVerified:false,source:{label,url,documentRevision,pages},intro,steps,parameters:[]});
const methods=new Map();
const set=(manufacturer,model,value)=>methods.set(manufacturer+'::'+model,value);

set('Ohaus','NVT6201',documented('OHAUS Navigator — 30467926 B, §2.5, EN-4; modèle EN-10','https://ohaus.ca/product/pdf/Navigator-man.pdf','30467926 B ©2018','EN-4; EN-10',
 'NVT6201 : ajustage externe SPAN avec 5 kg. Manuel OHAUS hébergé par son distributeur; contrôle documentaire seulement.',[
 step('Préparer','Mettre de niveau, déverrouiller le transport et laisser chauffer au moins cinq minutes. Vider le plateau.'),
 step('Ouvrir SPAN','Maintenir Menu-Cal jusqu’à mMeNU, puis relâcher. À C.A.L, YES; à SpaN, YES.','C.A.L → SpaN',['Menu-Cal','YES']),
 step('Zéro et masse','Attendre la capture du zéro (--C--). À la demande de masse, déposer exactement 5 kg; attendre la capture et le retour au mode précédent.','--C-- → 5 kg'),
 step('Contrôler','Retirer les masses; vérifier le zéro et plusieurs charges connues avant de confirmer un résultat terrain.')
]));
set('Ohaus','V31XH2',documented('OHAUS Valor 3000 — 80251227 C, §2.5, EN-4','https://www.techadv.com.au/literature/ohaus/userguides/ohaus-valor-3000-user-guide.pdf','80251227 C ©2009','EN-4',
 'V31XH2 : SPAN externe avec 2 kg. Cette référence est distincte du V31XH202 (200 g). Manuel fabricant hébergé par un distributeur.',[
 step('Préparer','Vider le plateau, vérifier le niveau et le déverrouillage du transport.'),
 step('Entrer','Maintenir ENTER/Cal jusqu’à CAL. Appuyer de nouveau puis relâcher pour capturer le zéro.','CAL → -C-',['ENTER/Cal']),
 step('Appliquer','Quand la masse apparaît en grammes, déposer exactement 2 kg. Attendre -C- puis le retour automatique au mode de pesage.','2000 g → -C-'),
 step('Contrôler','Retirer la charge; contrôler le zéro et des masses connues.')
]));
set('Transcell','TI-1520',documented('Transcell TI-1520 — User Manual rév. 1.8, p. 4 et 10–12','https://transcell.com/wp-content/uploads/TI-1520-UG-18.pdf','1.8 — 2012-08-03','4; 10–12',
 'Calibration zéro puis un point SPAN. Vérifier unité, capacité et accès autorisé au commutateur arrière.',[
 step('Accéder','Éteindre, basculer le commutateur arrière SETUP, puis rallumer : F1 apparaît. Naviguer jusqu’à F16.','F1 → F16'),
 step('Zéro','ZERO entre dans F16. Plateau vide, ZERO remet les comptes à zéro; NET/GROSS enregistre. Attendre EndC0.','F16 → EndC0',['ZERO','NET/GROSS']),
 step('SPAN','F17 puis ZERO : C1. Appliquer la masse et saisir sa valeur : UNITS augmente, ZERO diminue; PRINT/TARE déplacent le chiffre. NET/GROSS enregistre.','F17 → C1 → EndC1'),
 step('Fin à un point','À C2 puis C3, NET/GROSS sans saisir de valeur conserve la calibration à un point. Relever les résultats dans F18.'),
 step('Sortir','Remettre le commutateur arrière à sa position initiale. Vérifier zéro et charges. Err0/Err1/Err2 indiquent un échec à corriger; ne pas confirmer cet essai.')
]));
set('VWR','VWR-224TC',documented('VWR T-Series — REV01, §5.2 p. 21; modèle p. 4','https://digitalassets.avantorsciences.com/adaptivemedia/rendition?clid=SAPDAM&id=31b57bab7ce150faebc5d4a76fef276e111df4f9&prid=original&vid=9529f34fe2263a62818a3d959e93dec788a50ff9','REV01 — 2019-01-26','4; 11; 21',
 'Ajustage externe guidé du VWR-224TC. Choisir une masse de la classe et de la valeur demandées par l’instrument.',[
 step('Préparer','Mettre de niveau, laisser stabiliser thermiquement et vider le plateau. Employer un compte disposant des droits nécessaires.'),
 step('Menu','PARAMETERS → Adjustment → External adjustment.','Adjustment → External adjustment'),
 step('Zéro','À Remove weight, vider le plateau et valider à l’écran. Attendre la fin de la détermination du zéro.','Remove weight'),
 step('SPAN','À Put weight, appliquer exactement la masse demandée et valider. À la nouvelle invite Remove weight, retirer la masse.','Put weight → Remove weight'),
 step('Contrôler','Attendre le retour à Adjustment puis vérifier le zéro et plusieurs charges. Aucune masse fixe n’est déduite de la capacité.')
]));
set('Totalcomp','TRWS',documented('Totalcomp TRWS — Service Manual, §10 p. 16, §12 p. 18','https://totalcomp.com/image/manual_pdf/TRWS-manual-totalcomp-New.pdf','Édition sans date/révision imprimée repérée','16; 18',
 'Procédure nonLin du TRWS à menus ProG / P2 CAL. Si ces menus diffèrent, confirmer l’édition avant de poursuivre.',[
 step('Programmation','UNIT + PRINT/M+ en pesage; relâcher au bip. TARE jusqu’à ProG; ZERO. À Pin, presser G/N, UNIT puis ZERO.','ProG → Pin'),
 step('Choisir','TARE jusqu’à P2 CAL, ZERO; TARE jusqu’à CAL, ZERO. Choisir nonLin avec TARE, puis ZERO.','P2 CAL → CAL → nonLin'),
 step('Zéro','À unload, sélectionner kg/lb avec UNIT, vider la plateforme, attendre la stabilité puis ZERO.','unload'),
 step('SPAN','Saisir la valeur exacte : G/N/PRINT déplacent le chiffre, TARE le modifie; ZERO valide. À LoAd, poser cette masse, attendre stabilité puis ZERO.','LoAd'),
 step('Contrôler','Attendre le retour normal. En cas d’erreur, corriger puis recommencer; vérifier ensuite zéro et charges connues.')
]));
set('Ohaus','PX1602/E',documented('OHAUS Pioneer PX — 30372559 D, §5.2.4 EN-25–27; modèle EN-44','https://www.novatech-usa.com/pdf/Ohaus%20PX%20Series%20Manual.pdf','30372559 D ©2018','EN-25–27; EN-44',
 'Variante /E : ajustage externe SPAN. Manuel fabricant hébergé par un distributeur; ne pas choisir InCal.',[
 step('Préparer','Mettre de niveau, stabiliser et vider le plateau.'),
 step('Menu','Maintenir Tare/Menu-Cal; YES ouvre Calibration. Avec NO, sélectionner Span Cal; YES démarre.','Calibration → Span Cal'),
 step('Masse','À Place weights, poser la masse affichée. Function/Mode permet une autre valeur proposée; utiliser exactement la valeur retenue. Ne pas reprendre les 100 g de l’exemple générique du manuel.','Place weights'),
 step('Terminer','Retirer les masses selon les invites. Calibration done confirme la fin; une touche revient à l’écran précédent. Vérifier zéro et charges.','Calibration done')
]));
set('Ohaus','PX163',documented('OHAUS Pioneer PX — 30372559 D, §5.2.2 EN-25; modèle EN-43','https://www.novatech-usa.com/pdf/Ohaus%20PX%20Series%20Manual.pdf','30372559 D ©2018','EN-25; EN-43',
 'PX163 sans /E : ajustage interne InCal. Confirmer le suffixe exact avant utilisation.',[
 step('Préparer','Mettre de niveau, laisser chauffer à la température d’utilisation et vider le plateau.'),
 step('Démarrer','Maintenir Tare/Menu-Cal et sélectionner Internal Cal. L’instrument utilise sa masse interne.','Internal Cal'),
 step('Terminer','Ne pas perturber le cycle; lire son résultat. Après réussite, une touche revient au pesage. Contrôler avec des masses externes connues.')
]));
set('Ohaus','R31P15',documented('OHAUS Ranger 3000 — 30037453 B, §4.2 EN-13; modèle EN-30','https://ohaus.ca/product/pdf/ranger-3000-manual.pdf','30037453 B ©2013','EN-13; EN-30',
 'SPAN du R31P15, explicitement inclus dans le manuel. Le verrou de calibration doit autoriser l’opération.',[
 step('Menu','Maintenir Menu jusqu’à mMeNU puis relâcher. C.A.L → YES; SpaN → YES.','C.A.L → SpaN'),
 step('Zéro','À 0 kg, plateau vide, YES; attendre --C--.','0 kg → --C--'),
 step('SPAN','Poser la masse demandée. NO propose une autre masse; n’appliquer que celle sélectionnée. YES capture la charge.','--C--'),
 step('Contrôler','done confirme la réussite et le retour au pesage. Retirer les masses et vérifier zéro et charges connues.','done')
]));
set('Ohaus','T31P',documented('OHAUS 3000 T31 — 80251064 E, §3.2–3.3.1, EN-15–16','https://www.weighsouth.com/wp-content/uploads/2015/02/Ohaus-T31P-T32XW-Instruction-Manual.pdf','80251064 E ©2012','EN-15–16',
 'SPAN zéro puis charge. Attendre environ cinq minutes après stabilisation à température ambiante; la calibration est indisponible avec LFT activé.',[
 step('Menu','Maintenir Menu jusqu’à MENU. Ouvrir Calibration avec YES puis SPAN avec YES.','Calibration → SPAN'),
 step('Zéro','À 0 clignotant, vider la balance, YES; attendre --C--.','0 → --C--'),
 step('SPAN','Lire la masse demandée; NO augmente la sélection, Back la réduit. Poser exactement la masse sélectionnée puis YES.','--C--'),
 step('Contrôler','La réussite ramène au pesage avec la charge affichée. Retirer la masse et vérifier zéro et charges connues. Exit annule la calibration en cours.')
]));
set('Rice Lake','920i',documented('Rice Lake 920i — 67887 Rev N, §5.2 p. 64–66','https://www.ricelake.com/media/rhxbyhhn/m_67887_920i_tech_enus_revn.pdf','67887 Rev N — 2026-02-02; logiciel v5','64–66',
 'Calibration frontale de la voie sélectionnée. Pour une voie iQUBE2, utiliser sa documentation dédiée.',[
 step('Accéder','Entrer dans SETUP autorisé. SCALES → choisir la voie → CALIBR → WZERO. Retirer les charges; laisser uniquement les crochets/chaînes nécessaires à l’étalonnage.','SCALES → CALIBR'),
 step('Zéro','Ouvrir WZERO, choisir Calibrate et attendre les nouveaux comptes. Enregistrer puis passer à WVAL.','WZERO → Calibrate'),
 step('SPAN','Dans WVAL, saisir et enregistrer la masse exacte. Poser cette masse; ouvrir WSPAN, choisir Calibrate, attendre puis enregistrer.','WVAL → WSPAN'),
 step('Fin','Les anciens points WLIN sont réinitialisés. Si crochets/chaînes utilisés, retirer toutes les charges puis exécuter REZERO selon §5.2.2. Save and Exit enregistre et quitte. Contrôler zéro et charges.','Save and Exit')
]));
set('Mettler Toledo','ACT350',documented('METTLER TOLEDO ACT350 Analog — 30303895 R05, §2.1.2 et §2.2.4','https://www.mt.com/dam/product_organizations/industry/indicators/act350/30303895_R05_MAN_ACT350_UG_EN.pdf','30303895 R05 — 2025-03','2-2; 2-6–2-9',
 'ACT350 analogique : zéro puis SPAN avec masses. Ne pas transposer à ACT350 POWERCELL ou Precision. Confirmer la variante et les droits de calibration.',[
 step('Accéder','Maintenir ENTER trois secondes. UP/DOWN sélectionne Calibration; ENTER ouvre. L’accès frontal exige le mode non approuvé.','Calibration',['ENTER (3 s)','UP','DOWN']),
 step('Configuration','Vérifier GEO et le nombre de points de linéarité. None correspond à zéro plus un point SPAN; conserver la configuration requise.'),
 step('Zéro','Vider la balance et exécuter Adjust Zero. En cas de mouvement, rejeter la capture et corriger l’instabilité.','Adjust Zero'),
 step('SPAN','Lancer l’ajustage SPAN avec masses. Saisir la charge exacte et suivre les invites de capture; réaliser les points intermédiaires si la linéarité est activée. ENTER valide les valeurs.'),
 step('Contrôler','Lire le résultat, puis LEFT revient dans les menus et au pesage. Vérifier zéro et charges connues avant toute confirmation terrain.','',['LEFT'])
]));

set('Ohaus','SPX8200',documented('OHAUS Scout SPX — 30268991 C, §3.3 EN-5; modèle EN-17','https://www.novatech-usa.com/pdf/Ohaus%20Scout%20SPX%20Instruction%20Manual.pdf','30268991 C ©2016','EN-3–5; EN-17',
 'SPX8200 : SPAN externe, masse nominale 8 kg. Manuel fabricant hébergé par un distributeur.',[
 step('Préparer','Mettre de niveau, libérer le verrou de transport et laisser chauffer cinq minutes. Le commutateur de sécurité doit autoriser la calibration; plateau vide.'),
 step('Menu','Maintenir Menu jusqu’à mMeNU puis relâcher. À C.A.L, YES; à SpaN, YES.','C.A.L → SpaN'),
 step('Zéro et charge','Attendre --C-- puis la masse demandée. Le tableau SPX8200 indique 8 kg; NO propose les autres valeurs autorisées. Poser exactement la masse affichée; la capture est automatique.','--C--'),
 step('Fin','done confirme la réussite et le retour au mode précédent. Retirer les masses, contrôler zéro et charges connues.','done')
]));
set('Rice Lake','880',documented('Rice Lake 880 — 158387 Rev L, §4.1, p. 69–70','https://www.ricelake.com/media/3d1nyh2t/m_158387_880_technical_enus_revl.pdf','158387 Rev L — 2025-11-03; firmware v4.0','43; 68–70',
 'Calibration frontale du 880. Confirmer le firmware et la configuration; le manuel cité vise la version 4.0.',[
 step('Accéder','Entrer en configuration par le commutateur arrière autorisé, ou MENU si la piste d’audit le permet. SETUP → SCALE → CALIBR.','CALIBR'),
 step('Zéro','TARE ouvre WZERO puis ses comptes. Vider la plateforme, en conservant les accessoires nécessaires aux masses. TARE capture le zéro; attendre WVAL.','WZERO → WVAL',['TARE']),
 step('Valeur','TARE ouvre WVAL. Flèches gauche/droite : chiffre; haut/bas : valeur. TARE valide les chiffres, gauche/droite règle la décimale, puis TARE enregistre.','WVAL'),
 step('SPAN','À WSPAN, TARE affiche les comptes. Poser la masse égale à WVAL; TARE capture. Attendre WLIN. Les anciens points de linéarité sont effacés par WZERO.','WSPAN → WLIN'),
 step('Fin','Si des accessoires de suspension ont servi, retirer masses et accessoires puis exécuter REZERO (§4.1.2). MENU revient au pesage. Vérifier zéro et charges.')
]));
set('Rice Lake','320IS',documented('Rice Lake 320IS — 74612 Rev C, §1.3–1.4 et §4.1 p. 33','https://nicolscales.com/wp-content/uploads/2016/04/320IS-installation-Manual.pdf','74612 Rev C — 2015-06; logiciel v2.1','1–4; 20; 33',
 '320IS à cinq touches, logiciel 2.1. Personnel qualifié : respecter les conditions de sécurité intrinsèque du manuel avant tout accès arrière.',[
 step('Accéder','Ouvrir l’accès au commutateur SETUP conformément au manuel; un appui avec outil non métallique affiche CONFIG. PRINT mène à CALIBR; GROSS/NET descend vers WZERO.','CONFIG → CALIBR → WZERO'),
 step('Zéro','Plateforme vide, accessoires de suspension éventuels en place : TARE capture le zéro. Attendre *CAL* puis les comptes; TARE enregistre et passe à WVAL.','WZERO → WVAL'),
 step('SPAN','Poser la masse connue. Ouvrir WVAL, saisir sa valeur avec les touches de navigation et valider TARE. À WSPAN, TARE capture; attendre les comptes puis TARE enregistre.','WVAL → WSPAN'),
 step('Fin','Avec accessoires, les retirer avec les masses et exécuter REZERO. Sinon, remonter directement vers CALIBR. Revenir à CONFIG puis ZERO quitte. Remettre la vis d’accès; contrôler zéro et charges.')
]));

set('Rice Lake','IQ Plus 355',documented('Rice Lake IQ plus 355 — 66503 Rev A, §4.1 p. 25','https://www.ricelake.com/media/5yghru0c/m_66503_installation_rev-a.pdf','66503 Rev A — 2014-08-13; version 1.17','2; 14; 25',
 'Seulement IQ plus 355 explicitement identifié. Confirmer la version et les unités avant calibration; 355 seul reste à identifier.',[
 step('Accéder','Par l’accès arrière autorisé, presser SETUP : CONFIG. PRINT mène à CALIBR; GROSS/NET descend vers WZERO.','CONFIG → CALIBR → WZERO'),
 step('Zéro','Vider la plateforme; laisser les accessoires de suspension nécessaires. TARE capture le zéro; attendre *CAL* puis les comptes. TARE enregistre et passe à WVAL.','WZERO → WVAL'),
 step('Masse','Poser la masse connue. TARE ouvre WVAL; UNITS/PRINT choisissent le chiffre, ZERO/GROSS-NET changent sa valeur. TARE enregistre la valeur exacte.','WVAL'),
 step('SPAN','À WSPAN, TARE capture la charge; attendre les comptes puis TARE enregistre. Ne plus modifier les comptes de WZERO après cette étape.','WSPAN → REZERO'),
 step('Fin','Si des accessoires ont servi, retirer masses et accessoires puis exécuter REZERO et enregistrer. Sinon remonter vers CALIBR. Revenir à CONFIG puis ZERO quitte. Refermer l’accès; contrôler zéro et charges.')
]));
set('Condec','UMC600',documented('Condec UMC600 — 30261, §5.1–5.2 p. 47','https://www.ricelake.com/media/dwje5y5g/m_30261_umc600-1.pdf','30261 — 2003-02','32; 47–48',
 'Calibration à pente unique, option 6 désactivée. Accès matériel réservé au technicien qualifié; confirmer les paramètres avant intervention.',[
 step('Zéro analogique','Balance vide, fermer SW1-3 (dead load) : C clignote. Ajuster le potentiomètre dead load au voisinage de zéro.','C'),
 step('Zéro numérique','Ouvrir SW1-3 puis fermer SW1-1. ZERO lance ---CAL, puis l’affichage revient à zéro.','---CAL',['ZERO']),
 step('SPAN','Poser la masse connue; attendre l’extinction de MOTION. Saisir sa valeur exacte au clavier, puis ENT. Attendre ---CAL puis la valeur de la charge.','---CAL',['ENT']),
 step('Fin','Retirer la charge et vérifier le zéro. Ouvrir tous les interrupteurs SW1 pour revenir au mode normal. Refermer et fixer la barre centrale; contrôler plusieurs charges. Si option 6 active, suivre la linéarisation dédiée §5.3.')
]));

const pending=new Map([
 ['GSE::350',{reason:'Le manuel fabricant 350/355 v2.0 (2004), chapitre 5, est repéré. Les glyphes du clavier dans la séquence d’accès ne sont pas lisibles dans la copie consultée; confirmer boutons et révision avant de détailler.',url:'https://www.loadmasterscale.com/wp-content/uploads/2017/08/GSE_350_tech_manual.pdf'}],
 ['Avery Weigh-Tronix::ZM303',{reason:'Le manuel de service AWT35-500723 est repéré mais sa révision et la section SPAN complète restent à contrôler. Le manuel utilisateur seul ne documente pas la calibration de service.',url:'https://www.averyweigh-tronix.com/wp-content/uploads/2024/07/ZM303-User-Manual-EN.pdf'}],
 ['Kilotech::KCS301',{reason:'Le constructeur confirme la famille KCS 301 et ses quatre capacités. Aucune séquence de calibration fabricant propre à KCS301 n’a été retrouvée; le manuel KCS1000 repéré concerne une autre famille et n’est pas transposé.',url:'https://www.kilotech.com/product/K851204'}],
 ['Ohaus::CX5200',{reason:'Le manuel OHAUS 30467754 B (2018), §3.2 EN-3, confirme la séquence et la masse de 2 kg. Les pictogrammes des deux touches doivent encore être contrôlés visuellement avant de détailler les commandes.',url:'https://ohaus.ca/product/pdf/CX_Man.pdf'}],
 ['WEIGH South::WS10',{reason:'Le manuel WS10 édition 10052001A documente C05/C06 (§3.1–3.2, pages PDF 11–13). La légende graphique des touches et la variante du clavier restent à contrôler; aucune commande non confirmée n’est attribuée.',url:'https://www.weighsouth.com/wp-content/uploads/2020/07/WS10-User-Manual-V3.pdf'}],
 ['Kilotech::KWD 500-05',{reason:'Une procédure KWD500 première génération (1999, Rev00) a été repérée, mais la génération du KWD500-05 client n’est pas établie. Confirmer plaque, capacité et clavier avant association.',url:'https://www.kilotech.com/s/content/technical-support'}],
 ['Rice Lake::355',{reason:'Le manuel IQ plus 355 existe, mais le rapport ne donne que 355. Confirmer la plaque IQ plus 355 et sa version avant association.',url:'https://www.ricelake.com/media/5yghru0c/m_66503_installation_rev-a.pdf'}],
 ['Ishida::CCW RVE214W',{reason:'La fiche constructeur RVE identifie la famille; obtenir le manuel de service et la révision du contrôleur de cette variante avant de détailler la calibration des têtes.',url:'https://www.ishida.com/eu/en/products/documents/upload/RVE-214W-220W-datasheet-EN.pdf'}]
]);

export function applyCalibrationMethodsV2784(devices){
 for(const d of devices||[]){
  const key=d.manufacturer+'::'+d.model,value=methods.get(key);
  if(value){d.method=value;d.verified=true;d.status='documented';delete d.review;}
  else if(!d.method&&pending.has(key)){d.review={label:'Procédure à confirmer',...pending.get(key),checkedAt:'2026-10-25'};}
 }
}
export const calibrationMethodKeysV2784=Object.freeze([...methods.keys()]);
