import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  FileText,
  Download,
  Upload,
  Save,
  Percent
} from 'lucide-react';
import { ReRegistration, Candidate } from '../../types';

interface ReinscriptionViewProps {
  reregistrations: ReRegistration[];
  onUpdateReRegistration: (updated: ReRegistration) => void;
  onOpenPdf: (
    type:
      | 'fiche_inscription'
      | 'demande_bourse'
      | 'charte_theses'
      | 'recu_depot'
      | 'rapport_activite',
    candidate?: Candidate,
    reregistration?: ReRegistration
  ) => void;
  currentCandidate?: Candidate;
}

export const ReinscriptionView: React.FC<ReinscriptionViewProps> = ({
  reregistrations,
  onUpdateReRegistration,
  onOpenPdf,
  currentCandidate
}) => {
  // Resolve personal re-registration record when signed-in user owns a dossier; fallback to demo sample only in preview/staff context
  const ownedReg = currentCandidate?.userId
    ? reregistrations.find((r) => r.userId === currentCandidate.userId)
    : reregistrations[0];

  const currentRe: ReRegistration = ownedReg || {
    id: currentCandidate?.userId
      ? `REG-${currentCandidate.userId.slice(0, 8).toUpperCase()}`
      : 'REINSC-2026-01',
    userId: currentCandidate?.userId,
    studentName: currentCandidate?.fullName || 'Amine EL MANSOURI',
    studentArabicName: currentCandidate?.arabicName || 'أمين المنصوري',
    studentCin: currentCandidate?.cin || 'CD712948',
    studentCne: currentCandidate?.cne || 'N134098214',
    year: 2,
    thesisTitle:
      currentCandidate?.subjectTitle ||
      "Optimisation de l'alignement des grands modèles de langage",
    supervisorName: currentCandidate?.supervisorName || 'ALAOUI DRISS',
    labName: currentCandidate?.labName || 'Laboratoire Sciences Ingénierie et Gestion (LSIG)',
    schoolName: currentCandidate?.schoolName || 'École Supérieure de Technologie (EST Fès)',
    university:
      currentCandidate?.university || 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    firstRegistrationYear: '2025/2026',
    activityReport: {
      contexte: '',
      contributions: '',
      publications: '',
      communications: '',
      mobilites: '',
      activitesTransversales: '',
      thesisProgressPercent: 25,
      submittedDate: new Date().toLocaleDateString('fr-FR'),
      validatedByStructure: false
    },
    validatedCredits: 0,
    publicationsCount: 0,
    communicationsCount: 0,
    structureApproval: 'En attente',
    physicalSignedScanUploaded: false
  };

  const [contexte, setContexte] = useState(currentRe.activityReport.contexte);
  const [contributions, setContributions] = useState(currentRe.activityReport.contributions);
  const [publications, setPublications] = useState(currentRe.activityReport.publications);
  const [communications, setCommunications] = useState(currentRe.activityReport.communications);
  const [mobilites, setMobilites] = useState(currentRe.activityReport.mobilites);
  const [activitesTransversales, setActivitesTransversales] = useState(
    currentRe.activityReport.activitesTransversales
  );
  const [thesisProgressPercent, setThesisProgressPercent] = useState(
    currentRe.activityReport.thesisProgressPercent || 25
  );
  const [isSaved, setIsSaved] = useState(false);
  const [scanUploaded, setScanUploaded] = useState(Boolean(currentRe.physicalSignedScanUploaded));

  useEffect(() => {
    setContexte(currentRe.activityReport.contexte);
    setContributions(currentRe.activityReport.contributions);
    setPublications(currentRe.activityReport.publications);
    setCommunications(currentRe.activityReport.communications);
    setMobilites(currentRe.activityReport.mobilites);
    setActivitesTransversales(currentRe.activityReport.activitesTransversales);
    setThesisProgressPercent(currentRe.activityReport.thesisProgressPercent || 25);
    setScanUploaded(Boolean(currentRe.physicalSignedScanUploaded));
  }, [currentRe.id]);

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ReRegistration = {
      ...currentRe,
      activityReport: {
        ...currentRe.activityReport,
        contexte,
        contributions,
        publications,
        communications,
        mobilites,
        activitesTransversales,
        thesisProgressPercent,
        submittedDate: new Date().toLocaleDateString('fr-FR')
      },
      physicalSignedScanUploaded: scanUploaded
    };
    onUpdateReRegistration(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleRealScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    setScanUploaded(true);
    const updated: ReRegistration = {
      ...currentRe,
      physicalSignedScanUploaded: true
    };
    onUpdateReRegistration(updated);
  };

  const textareaClass =
    'w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
            <RefreshCw className="w-4 h-4" />
            <span>Espace Réinscription & Dépôt du Rapport d'Activité Annuel</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            Réinscription Doctorale · {currentRe.year}ème Année
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Complétez votre rapport d'activités, téléchargez la fiche pour signature physique et déposez le scan certifié.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              currentRe.structureApproval === 'Validé'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            Statut Structure : {currentRe.structureApproval}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Doctorant
          </span>
          <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
            {currentRe.studentName}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
            CIN: {currentRe.studentCin} · CNE: {currentRe.studentCne}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Année de Thèse
          </span>
          <div className="font-bold text-sm text-teal-700 dark:text-teal-400 tabular-nums">
            {currentRe.year}ème Année (Cycle 2026/2027)
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
            1ère Inscription : {currentRe.firstRegistrationYear}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Encadrement
          </span>
          <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
            Pr. {currentRe.supervisorName}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
            {currentRe.labName}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Avancement Thèse
          </span>
          <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1 tabular-nums">
            <Percent className="w-4 h-4" />
            <span>{thesisProgressPercent}% achevé</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            Validation par Directeur de Structure
          </div>
        </div>
      </div>

      {/* Activity Report Submission Form */}
      <form
        onSubmit={handleSaveReport}
        className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5"
      >
        <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Rapport d'Activités & État d'Avancement Annuel
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Conforme au Décret 1886.23 pour validation par le Directeur de Thèse et le Chef de Laboratoire.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPdf('rapport_activite', currentCandidate, currentRe)}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Aperçu PDF Officiel</span>
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer le Rapport</span>
            </button>
          </div>
        </div>

        {isSaved && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Votre rapport d'activités a été enregistré et mis à jour pour la direction de structure.
            </span>
          </div>
        )}

        {/* Progress Slider */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-stone-900 dark:text-stone-100">
              Estimation du pourcentage d'avancement du manuscrit de thèse :
            </label>
            <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              {thesisProgressPercent}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={thesisProgressPercent}
            onChange={(e) => setThesisProgressPercent(Number(e.target.value))}
            className="w-full accent-emerald-700 dark:accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400 tabular-nums">
            <span>10% (Phase bibliographique)</span>
            <span>50% (Expérimentations / Rédaction)</span>
            <span>100% (Prêt pour pré-soutenance)</span>
          </div>
        </div>

        {/* Fields Grid */}
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 dark:text-stone-300 block">
              1. Contexte & Problématique Scientifique Traitée
            </label>
            <textarea
              rows={3}
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
              className={textareaClass}
              placeholder="Décrivez brièvement le contexte de vos travaux au cours de cette année..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 dark:text-stone-300 block">
              2. Contributions Méthodologiques & Résultats Obtenus
            </label>
            <textarea
              rows={3}
              value={contributions}
              onChange={(e) => setContributions(e.target.value)}
              className={textareaClass}
              placeholder="Résultats théoriques, prototypes développés, benchmarks..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 dark:text-stone-300 block">
              3. Publications Scientifiques (Revues indexées & brevets)
            </label>
            <textarea
              rows={3}
              value={publications}
              onChange={(e) => setPublications(e.target.value)}
              className={textareaClass}
              placeholder="Articles soumis, acceptés ou publiés (Q1/Q2/Scopus)..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 dark:text-stone-300 block">
              4. Communications Orales & Posters (Congrès / Séminaires)
            </label>
            <textarea
              rows={3}
              value={communications}
              onChange={(e) => setCommunications(e.target.value)}
              className={textareaClass}
              placeholder="Conférences nationales ou internationales..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 dark:text-stone-300 block">
              5. Mobilités de Recherche & Séjours de Laboratoire
            </label>
            <textarea
              rows={2}
              value={mobilites}
              onChange={(e) => setMobilites(e.target.value)}
              className={textareaClass}
              placeholder="Stages à l'étranger, collaborations inter-universités..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-700 dark:text-stone-300 block">
              6. Activités Pédagogiques & Formations Complémentaires
            </label>
            <textarea
              rows={2}
              value={activitesTransversales}
              onChange={(e) => setActivitesTransversales(e.target.value)}
              className={textareaClass}
              placeholder="Animation de TP, modules transversaux suivis au CED..."
            />
          </div>
        </div>

        {/* Physical Signature Section */}
        <div className="p-4 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Workflow de Signature Physique Officielle</span>
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                1. Téléchargez la fiche de réinscription · 2. Signez-la manuellement avec votre encadrant · 3. Déposez le scan numérisé.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenPdf('rapport_activite', currentCandidate, currentRe)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>1. Télécharger pour signature</span>
              </button>

              <label className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>2. Déposer le scan signé</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleRealScanUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {scanUploaded && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>
                  Scan de la fiche de réinscription signée physiquement téléversé avec succès.
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                PDF Certifié ✓
              </span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
