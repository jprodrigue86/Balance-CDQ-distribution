import {method,step} from './calibration-methods-v2566.mjs';
const documented=(label,url,intro,steps)=>Object.assign(method(label,url,intro,steps),{revision:'2026-10-04.1',checkedAt:'2026-10-04'});
const rice480=documented('Rice Lake 480 / 480 Plus — 119201 Rev P, §4.1, p. 52','https://www.ricelake.com/media/n15aotjp/m_119201_480_tech_enus_revp.pdf','Procédure frontale du 480 et du 480 Plus. TARE valide; les flèches du clavier servent à naviguer.',[
 step('Accéder à CALIBR','Avec l’accès SETUP autorisé, retirer la vis d’accès arrière et presser le commutateur avec un outil non conducteur. Depuis CONFIG, ouvrir CALIBR.','CONFIG → CALIBR'),
 step('Zéro','Retirer les charges; laisser les crochets ou chaînes s’ils seront utilisés. Dans WZERO, lancer CAL, attendre la capture puis ENTER pour enregistrer.','WZERO → CAL → ENTER'),
 step('Masse et span','Dans WVAL, saisir la masse exacte et valider. Appliquer cette masse, lancer CAL dans WSPAN, attendre la capture puis ENTER.','WVAL → WSPAN'),
 step('Terminer','Si des crochets ou chaînes ont été utilisés, retirer ces accessoires et les masses puis exécuter REZERO. Remonter à CONFIG et quitter SETUP. Vérifier le zéro et plusieurs charges.','REZERO si nécessaire')
]);
const rice1280=documented('Rice Lake 1280 — 167659 Rev J, §4.2.1, p. 57–58','https://www.ricelake.com/media/cnkhmjm5/m_167659_1280_tech_enus_revj.pdf','Calibration standard de la voie analogique sélectionnée. Vérifier la voie et les unités avant de capturer les valeurs.',[
 step('Ouvrir l’assistant','Dans la configuration autorisée de la balance concernée, choisir Calibrate Scale → Standard Calibration → Next.','Standard Calibration'),
 step('Zéro','Indiquer si des crochets ou chaînes sont utilisés. Plateau vide, avec ces accessoires seulement si nécessaires, choisir Calibrate Zero. Attendre Zero Calibration Complete puis Next.','Calibrate Zero'),
 step('Span','Saisir la masse de calibration exacte. Poser cette masse, attendre la stabilité puis Calibrate Span. Consulter les résultats, Next puis Finish.','Calibrate Span → Finish'),
 step('Vérifier','Pour les crochets ou chaînes, retirer accessoires et masses puis exécuter ReZero. Vérifier ensuite zéro et charges connues.')
]);
const ind131=documented('METTLER TOLEDO IND131 / IND331 — 64067481 Rev 10, §3.6.3','https://www.mt.com/dam/product_organizations/industry/IndustrialTerminals/64067481_10_MAN_UG_IND131-331_EN.pdf','Calibration dans le Setup autorisé. La linéarité désactivée utilise zéro et un point de span; activée, elle ajoute un point intermédiaire.',[
 step('Sélectionner la calibration','Ouvrir Scale → Calibration, groupe F1.3. Contrôler F1.3.1 : conserver le choix de linéarité approprié.','F1.3'),
 step('Capturer le zéro','Vider le plateau et lancer Set Zero (F1.3.2). Attendre la stabilité et le résultat de la capture. En cas d’échec ou de mouvement, corriger la cause avant de poursuivre.','F1.3.2'),
 step('Capturer le span','Dans Set Span (F1.3.3), saisir la valeur exacte des masses puis suivre les invites pour les appliquer et capturer la charge stable. Avec la linéarité activée, effectuer aussi le point intermédiaire demandé.','F1.3.3'),
 step('Contrôler','Terminer les invites du Setup et revenir au pesage. Retirer les masses; vérifier zéro et plusieurs charges avant de confirmer la procédure sur le terrain.')
]);
const adventurer=documented('OHAUS Adventurer — manuel 2024, §5.2.5, p. EN-33','https://ohaus.ca/product/pdf/AX_Adventurer_IM_EN_ES_FR_DE_IT_2024.pdf','Ajustage externe en grammes. La variante /E utilise des masses externes.',[
 step('Préparer','Mettre la balance de niveau, laisser stabiliser et vider le plateau. Dans Menu → Calibration, choisir Span Calibration.','Span Calibration'),
 step('Appliquer la masse','Lire la masse demandée. Une autre valeur proposée peut être choisie à l’écran. À l’invite, placer exactement la masse sélectionnée puis suivre les instructions. Aucun poids fixe n’est présumé.'),
 step('Vérifier','Attendre le résultat et le retour à l’application. Retirer les masses, contrôler le zéro et plusieurs charges connues; signaler un échec plutôt que le confirmer.')
]);
const procedures=new Map([['Rice Lake::480',rice480],['Rice Lake::480 Plus',rice480],['Rice Lake::1280',rice1280],['Mettler Toledo::IND131',ind131],['Ohaus::AX1502/E',adventurer]]);
const reasons={
 'Rice Lake::480i':'La demande mentionne 480i; le rapport client relu indique 480 Plus. Confirmer la plaque. La procédure du 480 / 480 Plus ne lui est pas attribuée automatiquement.',
 'Rice Lake::120i':'Référence 120i relevée dans un rapport client. Confirmer la plaque et obtenir le manuel exact avant de reprendre la procédure du 120.',
 'Mettler Toledo::IND130':'Modèle relevé dans les feuilles clients. Le manuel technique exact reste à obtenir; la procédure de l’IND131 ne lui est pas attribuée.',
 'Mettler Toledo::E1005':'Modèle relevé dans un rapport client. Obtenir le manuel de service et relever la version du terminal.',
 'Systec::IT4000E-AC':'Relever la version et obtenir le manuel de service de cette variante avant de détailler les touches et l’accès à la calibration.',
 'Transcell::TI-1520':'Référence relevée dans un rapport client. Le manuel de service exact et le clavier doivent être confirmés.',
 'Waterproof Indicateur::ATLAS-SSI':'« Waterproof Indicateur » est le texte du rapport, pas un fabricant confirmé. Vérifier la plaque ATLAS-SSI et le fabricant.',
 'Ohaus::NVT6201':'Modèle Navigator relevé dans un rapport client. La séquence du manuel exact doit être contrôlée avant confirmation.'
};
export function applyCalibrationModelsV2668(devices){for(const d of devices){const key=d.manufacturer+'::'+d.model,value=procedures.get(key);if(value){d.method=value;d.verified=true;d.status='documented';}else if(reasons[key])d.review={label:'Référence ou procédure à confirmer',reason:reasons[key],url:'',checkedAt:'2026-10-04'};}}
