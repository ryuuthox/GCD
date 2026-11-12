import React, { useState } from 'react';
import { X, Download, Printer, CheckCircle, QrCode, FileText, ShieldCheck } from 'lucide-react';
import { Candidate, ReRegistration } from '../../types';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'fiche_inscription' | 'demande_bourse' | 'charte_theses' | 'recu_depot' | 'avis_comite' | 'rapport_activite';
  candidate?: Candidate;
  reregistration?: ReRegistration;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  candidate,
  reregistration
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const currentCandidate = candidate || {
    fullName: reregistration?.studentName || 'Amine EL MANSOURI',
    arabicName: reregistration?.studentArabicName || 'أمين المنصوري',
    cin: reregistration?.studentCin || 'CD712948',
    cne: reregistration?.studentCne || 'N134098214',
    email: 'amine.elmansouri@usmba.ac.ma',
    birthDate: '14/05/2001',
    birthPlace: 'Fès',
    subjectTitle: reregistration?.thesisTitle || "Optimisation de l'alignement des grands modèles de langage : concilier sécurité, robustesse et performance",
    supervisorName: reregistration?.supervisorName || 'HACHMOUD ADIL',
    labName: reregistration?.labName || 'Laboratoire Sciences Ingénierie et Gestion (LSIG)',
    schoolName: reregistration?.schoolName || 'École Supérieure de Technologie (EST Fès)',
    academicYear: '2026/2027',
    diploma: 'Master Recherche Informatique et Systèmes Intelligents',
    originUniversity: 'Faculté des Sciences Dhar El Mahraz - USMBA',
    masterGrade: 16.8,
    isEmployed: false
  };

  const handleDownload = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Document Officiel GCD - ${documentType} - ${currentCandidate.cin}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; max-width: 780px; margin: 32px auto; line-height: 1.5; font-size: 13px; }
    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
    .title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 16px; }
    .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; margin-top: 24px; }
    .sig-box { border: 1px dashed #94a3b8; padding: 16px 8px; min-height: 90px; }
  </style>
</head>
<body>
  <div class="header">
    <div><strong>PLATEFORME DE GESTION DU CYCLE DOCTORAL (GCD)</strong><br/>Université Sidi Mohamed Ben Abdellah de Fès</div>
    <div style="text-align:right">Pôle des Études Doctorales (CED)<br/>Décret 1886.23</div>
  </div>
  <div class="title">${documentType.replace(/_/g, ' ')}</div>
  <div class="box">
    <div><strong>Candidat :</strong> ${currentCandidate.fullName} (${currentCandidate.arabicName})</div>
    <div><strong>CIN :</strong> ${currentCandidate.cin} · <strong>CNE :</strong> ${currentCandidate.cne}</div>
    <div><strong>Diplôme :</strong> ${currentCandidate.diploma} (${currentCandidate.originUniversity})</div>
    <div><strong>Sujet de Thèse :</strong> ${currentCandidate.subjectTitle}</div>
    <div><strong>Directeur de Thèse :</strong> Pr. ${currentCandidate.supervisorName} · ${currentCandidate.labName}</div>
  </div>
  <div class="sig-grid">
    <div class="sig-box"><strong>Signature du Doctorant</strong><br/><small>(Signature manuscrite physique)</small></div>
    <div class="sig-box"><strong>Visa du Directeur de Thèse</strong><br/><small>Pr. ${currentCandidate.supervisorName}</small></div>
    <div class="sig-box"><strong>Visa Directeur de Structure</strong><br/><small>Cachet officiel du Laboratoire</small></div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GCD_${documentType}_${currentCandidate.cin}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Document Officiel · Décret 1886.23
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Téléchargé !
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Télécharger PDF Certifié
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Simulated Paper View */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/80 flex justify-center">
          <div className="w-full max-w-2xl bg-white text-slate-900 p-8 shadow-md rounded-lg border border-slate-200 text-xs font-sans leading-relaxed space-y-6">
            
            {/* USMBA Official Header */}
            <div className="flex justify-between items-center border-b pb-4 border-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full border-2 border-blue-700 flex items-center justify-center font-bold text-blue-800 text-sm">
                  GCD
                </div>
                <div>
                  <div className="font-extrabold text-[13px] text-blue-900 tracking-tight">
                    PLATEFORME DE GESTION DU CYCLE DOCTORAL
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Université Sidi Mohamed Ben Abdellah de Fès
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-800">
                  جامعة سيدي محمد بن عبد الله بفاس
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  +o.0۸.U٤+ OΣΛΣ ㄈ:۸ㄈㄈ.۸ ΘΙ ҺΘ۸ИИ.Φ I ⵊ.O
                </div>
                <div className="text-[10px] font-semibold text-blue-800">
                  Pôle des Études Doctorales (CED)
                </div>
              </div>
            </div>

            {/* Document Specific Body */}
            {documentType === 'fiche_inscription' && (
              <div className="space-y-4">
                <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
                  <h2 className="text-sm font-bold uppercase text-slate-900">
                    Fiche d'Inscription Administrative en Doctorat (1/2)
                  </h2>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Année Universitaire : {currentCandidate.academicYear} · 1ère Année de Thèse
                  </div>
                </div>

                {/* Identity Box */}
                <div>
                  <div className="font-bold text-[11px] bg-slate-100 px-2 py-1 rounded border-l-2 border-blue-700 mb-2">
                    1. Identité du Candidat / Doctorant
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] border p-2.5 rounded border-slate-200 bg-slate-50/40">
                    <div><span className="font-semibold text-slate-600">Nom & Prénom :</span> {currentCandidate.fullName}</div>
                    <div className="text-right"><span className="font-semibold text-slate-600">الاسم والنسب :</span> {currentCandidate.arabicName}</div>
                    <div><span className="font-semibold text-slate-600">CIN :</span> {currentCandidate.cin}</div>
                    <div><span className="font-semibold text-slate-600">Code Massar / CNE :</span> {currentCandidate.cne}</div>
                    <div><span className="font-semibold text-slate-600">Date & Lieu de Naissance :</span> {currentCandidate.birthDate} à {currentCandidate.birthPlace}</div>
                    <div><span className="font-semibold text-slate-600">Email Académique :</span> {currentCandidate.email}</div>
                    <div><span className="font-semibold text-slate-600">Dernier Diplôme :</span> {currentCandidate.diploma}</div>
                    <div><span className="font-semibold text-slate-600">Établissement d'Origine :</span> {currentCandidate.originUniversity}</div>
                  </div>
                </div>

                {/* Subject Box */}
                <div>
                  <div className="font-bold text-[11px] bg-slate-100 px-2 py-1 rounded border-l-2 border-blue-700 mb-2">
                    2. Thèse Préparée & Rattachement Scientifique
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 text-[11px]">
                    {(candidate?.selectedSubjects && candidate.selectedSubjects.length > 0) ? (
                      <div className="space-y-2">
                        {candidate.selectedSubjects.map((sub, idx) => (
                          <div key={sub.id} className="pb-1.5 border-b border-slate-200/60 last:border-0 last:pb-0">
                            <div>
                              <strong className="text-blue-900">Vœu N° {idx + 1} {idx === 0 ? '(Choix Principal)' : ''} :</strong> {sub.title}
                            </div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              Directeur : Pr. {sub.supervisorName} · Structure : {sub.labName} ({sub.schoolName})
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div><span className="font-semibold text-slate-600">Sujet de Thèse :</span> {currentCandidate.subjectTitle}</div>
                        <div><span className="font-semibold text-slate-600">Directeur de Thèse :</span> Pr. {currentCandidate.supervisorName}</div>
                        <div><span className="font-semibold text-slate-600">Structure de Recherche :</span> {currentCandidate.labName}</div>
                        <div><span className="font-semibold text-slate-600">Établissement d'Accueil :</span> {currentCandidate.schoolName}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures Grid */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <div className="font-bold text-[11px] bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                    3. Signatures et Avis (Conformité Décret 1886.23)
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-slate-200 text-[10px] text-center min-h-[100px]">
                    <div className="p-3 flex flex-col justify-between">
                      <div className="font-bold text-slate-700">Le Doctorant</div>
                      <div className="py-2 text-emerald-700 font-medium">
                        ✓ Signé Électroniquement OTP<br />
                        <span className="text-[8px] font-mono text-slate-400">SHA-256 certifié</span>
                      </div>
                      <div className="text-[9px] text-slate-500">{currentCandidate.fullName}</div>
                    </div>
                    <div className="p-3 flex flex-col justify-between">
                      <div className="font-bold text-slate-700">Le Directeur de Thèse</div>
                      <div className="py-2 text-emerald-700 font-medium">
                        ✓ Avis Favorable<br />
                        <span className="text-[8px] font-mono text-slate-400">Signature Numérique GCD</span>
                      </div>
                      <div className="text-[9px] text-slate-500">Pr. {currentCandidate.supervisorName}</div>
                    </div>
                    <div className="p-3 flex flex-col justify-between">
                      <div className="font-bold text-slate-700">Le Directeur de Structure</div>
                      <div className="py-2 text-slate-400 italic">
                        Cachet & Visa Électronique CED
                      </div>
                      <div className="text-[9px] text-slate-500">Pr. M. CHERGUI</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {documentType === 'recu_depot' && (
              <div className="space-y-5">
                <div className="text-center py-2.5 bg-blue-50 border border-blue-200 rounded">
                  <h2 className="text-sm font-bold uppercase text-blue-900">
                    Reçu Officiel de Dépôt de Dossier d'Inscription en Doctorat
                  </h2>
                  <div className="text-[11px] text-blue-800 font-semibold mt-0.5">
                    Quittance N° : GCD-2026-USMBA-{currentCandidate.cin}
                  </div>
                </div>

                <div className="p-4 border border-dashed border-slate-300 rounded-lg space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 text-[11px]">
                      <div><span className="font-semibold text-slate-600">Nom du Candidat :</span> {currentCandidate.fullName} ({currentCandidate.arabicName})</div>
                      <div><span className="font-semibold text-slate-600">CIN :</span> {currentCandidate.cin} · <span className="font-semibold text-slate-600">CNE :</span> {currentCandidate.cne}</div>
                      <div><span className="font-semibold text-slate-600">Formation Doctorale :</span> Sciences et Technologies de l'Ingénieur</div>
                      <div><span className="font-semibold text-slate-600">Établissement de domiciliation :</span> {currentCandidate.schoolName}</div>
                      <div><span className="font-semibold text-slate-600">Statut Sélection :</span> <span className="text-emerald-700 font-bold">Retenu sur Liste Principale</span></div>
                      {(candidate?.selectedSubjects && candidate.selectedSubjects.length > 0) && (
                        <div className="pt-1">
                          <span className="font-semibold text-slate-600">Vœux de Thèse Enregistrés :</span>
                          <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[10px] text-slate-700">
                            {candidate.selectedSubjects.map((s, idx) => (
                              <li key={s.id}>
                                <strong>Vœu {idx + 1} :</strong> {s.title} (Pr. {s.supervisorName})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-300 p-2 bg-white rounded text-center shrink-0">
                      <QrCode className="w-16 h-16 text-slate-800 mx-auto" />
                      <div className="text-[8px] font-mono text-slate-500 mt-1">VERIFY-USMBA-2026</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">Note Importante (Extrait de la Procédure) :</div>
                    <p>
                      Ce reçu fait foi du dépôt de votre demande d'inscription administrative. Il est à conserver précieusement et sera exigé obligatoirement lors du retrait de votre <strong>Carte d'Étudiant Chercheur / Doctorant</strong> auprès du service recherche de l'établissement.
                    </p>
                  </div>
                </div>

                {/* Security Footnote */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 border-t pt-2 font-mono">
                  <span>Horodatage : {new Date().toLocaleDateString('fr-FR')} 10:24 GMT+1</span>
                  <span>Sceau d'authenticité SHA-256 : 9f86d081884c7d65...</span>
                </div>
              </div>
            )}

            {documentType === 'charte_theses' && (
              <div className="space-y-4">
                <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
                  <h2 className="text-sm font-bold uppercase text-slate-900">
                    Charte Nationale des Thèses de Doctorat
                  </h2>
                  <div className="text-[10px] text-slate-600">
                    Établie selon le décret n° 1886.23 (B.O. n° 7343 du 14 Octobre 2024)
                  </div>
                </div>

                <div className="text-[10.5px] space-y-2 text-slate-700 text-justify">
                  <p>
                    <strong>Article 1 :</strong> La thèse de doctorat constitue à la fois un travail de recherche original et une expérience professionnelle de formation à et par la recherche.
                  </p>
                  <p>
                    <strong>Article 5 :</strong> Le doctorant s'engage à consacrer le temps nécessaire à ses travaux de recherche, à participer aux formations obligatoires (30 crédits) et à respecter les règles d'intégrité scientifique et anti-plagiat fixées par le CNRST.
                  </p>
                  <p>
                    <strong>Article 11 :</strong> L'obtention du diplôme de doctorat nécessite la validation de 180 crédits (150 pour la thèse et 30 pour les modules obligatoires : 10 disciplinaires, 6 langues, 3 numérique, 11 compétences d'autonomie/éthique) ainsi que la publication d'au moins deux articles dans des revues indexées.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 flex items-center gap-2 text-emerald-800 text-[10px]">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Charte acceptée et certifiée par signature électronique OTP de {currentCandidate.fullName} et de Pr. {currentCandidate.supervisorName}.
                  </span>
                </div>
              </div>
            )}

            {documentType === 'demande_bourse' && (
              <div className="space-y-4">
                <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
                  <h2 className="text-sm font-bold uppercase text-slate-900">
                    Demande de Bourse Doctorale du Ministère
                  </h2>
                  <div className="text-[10px] text-slate-600">
                    Réservée aux étudiants non salariés et n'exerçant aucune activité rémunérée
                  </div>
                </div>

                <div className="border p-3 rounded text-[11px] space-y-2">
                  <div><span className="font-semibold">Demandeur :</span> {currentCandidate.fullName} (CIN : {currentCandidate.cin})</div>
                  <div><span className="font-semibold">Situation professionnelle déclarée :</span> Étudiant chercheur à temps plein (Non fonctionnaire)</div>
                  <div><span className="font-semibold">Moyenne de Master :</span> {currentCandidate.masterGrade}/20</div>
                  <div><span className="font-semibold">Déclaration sur l'honneur :</span> Je soussigné(e) atteste sur l'honneur n'exercer aucune activité rémunérée dans les secteurs public ou privé.</div>
                </div>
              </div>
            )}

            {documentType === 'rapport_activite' && (
              <div className="space-y-4">
                <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
                  <h2 className="text-sm font-bold uppercase text-slate-900">
                    Rapport d'Activités pour Réinscription (1/2)
                  </h2>
                  <div className="text-[10px] text-slate-600">
                    6 Rubriques Pédagogiques Obligatoires + Volet Dérogation
                  </div>
                </div>

                <div className="space-y-2 text-[10.5px]">
                  <div className="border p-2 rounded">
                    <strong>1. Contexte & Problématique :</strong>
                    <p className="text-slate-600 mt-0.5">{reregistration?.activityReport.contexte || 'Définition des défis technologiques et verrous scientifiques abordés.'}</p>
                  </div>
                  <div className="border p-2 rounded">
                    <strong>2. Contributions Scientifiques :</strong>
                    <p className="text-slate-600 mt-0.5">{reregistration?.activityReport.contributions || 'Développement d\'algorithmes originaux et bancs de tests.'}</p>
                  </div>
                  <div className="border p-2 rounded">
                    <strong>3. Publications & Brevets :</strong>
                    <p className="text-slate-600 mt-0.5">{reregistration?.activityReport.publications || '2 articles soumis dans des revues internationales indexées.'}</p>
                  </div>
                </div>
              </div>
            )}

            {documentType === 'avis_comite' && (
              <div className="space-y-4">
                <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
                  <h2 className="text-sm font-bold uppercase text-slate-900">
                    Avis Motivé du Comité de Thèse (2/2)
                  </h2>
                  <div className="text-[10px] text-slate-600">
                    Comité de 3 membres institué conformément aux articles 8 et 12 du CNSPCD
                  </div>
                </div>

                <div className="border p-3 rounded text-[11px] space-y-2">
                  <div className="font-bold text-slate-800">Évaluation Globale :</div>
                  <p className="text-slate-700 italic">
                    "{reregistration?.committeeComments || 'Le comité de thèse donne un avis favorable à la réinscription au vu de l\'avancement satisfaisant des travaux.'}"
                  </p>
                  <div className="mt-3 pt-2 border-t font-semibold text-emerald-700">
                    Avis Collégial : {reregistration?.committeeAvis || 'Favorable'}
                  </div>
                </div>
              </div>
            )}

            {/* Footer with USMBA contact */}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[9px] text-slate-400">
              <div>Généré numériquement via la Plateforme GCD-USMBA · reclamation.gcd@usmba.ac.ma</div>
              <div>Page 1/1</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
