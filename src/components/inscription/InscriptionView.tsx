import React, { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  ShieldCheck,
  Download,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Upload,
  Users,
  Send
} from 'lucide-react';
import {
  ApplicationDocument,
  ApplicationState,
  Candidate,
  DocumentTypeKey,
  InterviewPv,
  UserProfile
} from '../../domain/types';
import { DOCUMENT_REQUIREMENTS } from '../../domain/documents';
import { DragAndDropZone } from '../common/DragAndDropZone';
import { LifecycleTimeline } from '../common/LifecycleTimeline';

interface InscriptionViewProps {
  candidate: Candidate;
  documents: ApplicationDocument[];
  pvs: InterviewPv[];
  currentUser: UserProfile;
  onUpdateCandidate: (updated: Candidate) => void;
  onUploadDocument: (docType: DocumentTypeKey, file: File) => Promise<void>;
  onTransitionState: (targetState: ApplicationState, comment?: string) => Promise<void>;
  onOpenPdf: (
    type:
      | 'fiche_inscription'
      | 'demande_bourse'
      | 'charte_theses'
      | 'recu_depot'
      | 'rapport_activite'
  ) => void;
  onOpenOtpModal: () => void;
  onNavigateToCatalogue?: () => void;
}

export const InscriptionView: React.FC<InscriptionViewProps> = ({
  candidate,
  documents,
  pvs,
  currentUser,
  onUpdateCandidate,
  onUploadDocument,
  onTransitionState,
  onOpenPdf,
  onOpenOtpModal,
  onNavigateToCatalogue
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copiedHash, setCopiedHash] = useState(false);

  // Form State
  const [cinInput, setCinInput] = useState<string>(candidate.cin);
  const [cneInput, setCneInput] = useState<string>(candidate.cne);
  const [nameInput, setNameInput] = useState<string>(candidate.fullName);
  const [arabicNameInput, setArabicNameInput] = useState<string>(candidate.arabicName);
  const [diplomaInput, setDiplomaInput] = useState<string>(candidate.diploma);
  const [specialtyInput, setSpecialtyInput] = useState<string>(candidate.specialty);
  const [masterGradeInput, setMasterGradeInput] = useState<number>(candidate.masterGrade);

  const steps = [
    { number: 1, label: '1. Vœux de Thèse' },
    { number: 2, label: '2. Dossier & Pièces' },
    { number: 3, label: '3. Documents PDF' },
    { number: 4, label: '4. Signature & Soumission' }
  ];

  const appDocuments = documents.filter((d) => d.applicationId === candidate.id);

  const handleSaveStep2AndProceed = () => {
    onUpdateCandidate({
      ...candidate,
      fullName: nameInput.trim() || candidate.fullName,
      arabicName: arabicNameInput.trim() || candidate.arabicName,
      cin: cinInput.trim().toUpperCase() || candidate.cin,
      cne: cneInput.trim().toUpperCase() || candidate.cne,
      diploma: diplomaInput.trim() || candidate.diploma,
      specialty: specialtyInput.trim() || candidate.specialty,
      masterGrade: Number(masterGradeInput) || candidate.masterGrade
    });
    setCurrentStep(3);
  };

  const moveCandidateSubjectPriority = (index: number, direction: 'up' | 'down') => {
    if (!candidate.selectedSubjects || candidate.selectedSubjects.length <= 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= candidate.selectedSubjects.length) return;

    const list = [...candidate.selectedSubjects];
    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const renumbered = list.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }));

    const primary = renumbered[0];

    onUpdateCandidate({
      ...candidate,
      selectedSubjects: renumbered,
      subjectId: primary.id,
      subjectTitle: primary.title,
      supervisorName: primary.supervisorName,
      schoolName: primary.schoolName,
      labName: primary.labName
    });
  };

  const handleCopyHash = async () => {
    if (candidate.otpSignatureHash) {
      try {
        await navigator.clipboard.writeText(candidate.otpSignatureHash);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      } catch {
        // Fallback when clipboard access is blocked in restricted contexts
      }
    }
  };

  const handlePhysicalScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadDocument('ficheSigneePhysique', file);
  };

  const isCinValid = /^[A-Z]{1,2}[0-9]{5,7}$/i.test(cinInput.trim());
  const isCneValid = /^[A-Z0-9]{9,12}$/i.test(cneInput.trim());
  const isNameValid = nameInput.trim().length >= 4;

  const requiredDocs = DOCUMENT_REQUIREMENTS.filter((d) => d.required);
  const uploadedRequiredCount = requiredDocs.filter((req) =>
    appDocuments.some((d) => d.docType === req.key)
  ).length;
  const physicalSignedDoc = appDocuments.find((d) => d.docType === 'ficheSigneePhysique');

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Visual Lifecycle & Transition Tracker */}
      <LifecycleTimeline
        application={candidate}
        documents={appDocuments}
        pvs={pvs}
        currentUser={currentUser}
        onTriggerTransition={(targetState) => onTransitionState(targetState)}
      />

      {/* Multi-Actor Relationships Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> Candidat
          </span>
          <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5">{candidate.fullName}</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
            CIN : {candidate.cin}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Directeur de Thèse
          </span>
          <div className="font-bold text-teal-700 dark:text-teal-400 mt-0.5">
            {candidate.thesisDirectorName || `Pr. ${candidate.supervisorName}`}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
            {candidate.labName}
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Co-encadrant
          </span>
          <div className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
            {candidate.coSupervisorName || 'Pr. Jaouad EL MEKKAOUI'}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            Co-direction scientifique
          </div>
        </div>
        <div>
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Directeur de Structure
          </span>
          <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {candidate.structureDirectorName || 'Pr. Mohamed CHERGUI'}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
            {candidate.schoolName}
          </div>
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-2.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs overflow-x-auto gap-1">
        {steps.map((st) => {
          const isDone = currentStep > st.number || (st.number === 4 && candidate.otpSigned);
          const isCurrent = currentStep === st.number;

          return (
            <button
              key={st.number}
              type="button"
              onClick={() => setCurrentStep(st.number)}
              className={`flex-1 py-2 px-3 text-center rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                isCurrent
                  ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-bold shadow-xs'
                  : isDone
                  ? 'text-emerald-700 dark:text-emerald-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              {isDone && !isCurrent && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              )}
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: Vœux de Thèse */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 space-y-5">
          <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                1. Vos Vœux de Recherche Sélectionnés (Max 3)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                L’ordre défini ci-dessous détermine votre priorité (Vœu 1 = Sujet principal).
              </p>
            </div>
            {onNavigateToCatalogue && (
              <button
                type="button"
                onClick={onNavigateToCatalogue}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                + Modifier mes vœux au catalogue
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {candidate.selectedSubjects && candidate.selectedSubjects.length > 0 ? (
              candidate.selectedSubjects.map((sub, idx) => (
                <div
                  key={sub.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    idx === 0
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                      : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          idx === 0
                            ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                        }`}
                      >
                        Choix #{idx + 1}
                      </span>
                      <span className="text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                        Réf. #{sub.id}
                      </span>
                    </div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                      {sub.title}
                    </div>
                    <div className="text-stone-500 dark:text-stone-400 text-[11px]">
                      Pr. {sub.supervisorName} · {sub.labName} ({sub.schoolName})
                    </div>
                  </div>

                  {(candidate.selectedSubjects?.length ?? 0) > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveCandidateSubjectPriority(idx, 'up')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25"
                        title="Monter"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (candidate.selectedSubjects?.length ?? 0) - 1}
                        onClick={() => moveCandidateSubjectPriority(idx, 'down')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25"
                        title="Descendre"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                <div className="font-bold text-emerald-900 dark:text-emerald-300">Choix Principal :</div>
                <div className="text-stone-900 dark:text-stone-100 font-semibold">
                  {candidate.subjectTitle}
                </div>
                <div className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">
                  Pr. {candidate.supervisorName} · {candidate.labName}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Continuer vers le dossier & pièces</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Dossier & Pièces Justificatives */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 space-y-5">
          <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800 gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                2. Profil Académique & Gestion des Pièces Justificatives
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Formats autorisés : PDF, JPG, PNG (Max 5 Mo par fichier). Suivez le statut de validation de chaque pièce.
              </p>
            </div>
            <span className="text-xs font-semibold font-mono tabular-nums text-stone-600 dark:text-stone-300">
              {uploadedRequiredCount}/{requiredDocs.length} pièces obligatoires
            </span>
          </div>

          {/* Identity & Academic Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                Nom complet (Français)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 pr-7 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {isNameValid && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 absolute right-2 top-2.5" />
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                الاسم بالعربية
              </label>
              <input
                type="text"
                value={arabicNameInput}
                onChange={(e) => setArabicNameInput(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-right text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                CIN
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cinInput}
                  onChange={(e) => setCinInput(e.target.value.toUpperCase())}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 pr-7 font-mono tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {isCinValid && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 absolute right-2 top-2.5" />
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                CNE / Massar
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cneInput}
                  onChange={(e) => setCneInput(e.target.value.toUpperCase())}
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 pr-7 font-mono tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {isCneValid && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 absolute right-2 top-2.5" />
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                Dernier Diplôme d’accès (Master / Ingénieur)
              </label>
              <input
                type="text"
                value={diplomaInput}
                onChange={(e) => setDiplomaInput(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                Spécialité
              </label>
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block mb-1">
                Moyenne Master (/20)
              </label>
              <input
                type="number"
                step="0.01"
                min={10}
                max={20}
                value={masterGradeInput}
                onChange={(e) => setMasterGradeInput(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Real Document Uploads with Compliance Tracking */}
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            {DOCUMENT_REQUIREMENTS.filter((r) => r.key !== 'ficheSigneePhysique').map((req) => {
              const existing = appDocuments.find((d) => d.docType === req.key);
              return (
                <DragAndDropZone
                  key={req.key}
                  docType={req.key}
                  existingDoc={existing}
                  onFileSelected={(file) => onUploadDocument(req.key, file)}
                />
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
            >
              ← Retour aux vœux
            </button>
            <button
              type="button"
              onClick={handleSaveStep2AndProceed}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Enregistrer & Continuer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Documents PDF Pré-remplis */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 space-y-5">
          <div className="border-b pb-3 border-stone-100 dark:border-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              3. Génération Automatique des Documents Officiels
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Téléchargez ou imprimez votre fiche d’inscription pré-remplie pour signature physique.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Fiche d’Inscription (1/2)
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Comprend vos {candidate.selectedSubjects?.length || 1} vœux hiérarchisés
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenPdf('fiche_inscription')}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Voir
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Demande de Bourse Doctorale
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Doctorants à temps plein
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenPdf('demande_bourse')}
                className="px-2.5 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Voir
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">Charte des Thèses</div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Conforme Décret 1886.23
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenPdf('charte_theses')}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Voir
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Reçu Officiel avec QR Code
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Pour délivrance de la carte
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenPdf('recu_depot')}
                className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-700/60 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Voir
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
            >
              ← Retour au dossier
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Passer à la signature & soumission</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Signature Physique & Soumission Officielle */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 space-y-5">
          <div className="border-b pb-3 border-stone-100 dark:border-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              4. Signature Physique, Certification & Soumission
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Conformément à la réglementation, la signature reste physique (fiche imprimée, signée et téléversée).
            </p>
          </div>

          {/* Workflow 1: Physical Signature */}
          <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Procédure Officielle : Signature Physique & Téléversement du Scan
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  1. Téléchargez la fiche · 2. Signez-la manuellement · 3. Téléversez le scan PDF/JPG.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    Étape 1 : Télécharger pour impression
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    Fiche officielle avec cadre réservé à votre signature physique.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPdf('fiche_inscription')}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-950 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger la Fiche</span>
                </button>
              </div>

              <div className="p-3.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    Étape 2 : Déposer le scan signé physiquement
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {physicalSignedDoc
                      ? `Fichier déposé : ${physicalSignedDoc.fileName}`
                      : candidate.physicalSignedScanUploaded
                      ? 'Scan de votre signature physique enregistré.'
                      : 'PDF, JPG ou PNG (Max 5 Mo).'}
                  </div>
                </div>

                <label className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {candidate.physicalSignedScanUploaded
                      ? 'Remplacer le Scan Signé'
                      : 'Téléverser le Scan Signé (PDF/JPG)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handlePhysicalScanFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Complementary OTP Certification */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Certification Numérique & Reçu Horodaté</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Générez votre reçu de dépôt officiel avec QR code et scellement cryptographique.
                </p>
              </div>

              {!candidate.otpSigned ? (
                <button
                  type="button"
                  onClick={onOpenOtpModal}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sceller par Code OTP</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Scellé numériquement
                </span>
              )}
            </div>

            {candidate.otpSigned && candidate.otpSignatureHash && (
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-[11px] text-stone-600 dark:text-stone-300 flex items-center justify-between gap-2">
                <span>Certificat numérique horodaté enregistré</span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  title="Copier l’identifiant du certificat"
                  className="px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier le code</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Submit / Resubmit CTA */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
            >
              ← Retour aux documents
            </button>

            <div className="flex items-center gap-3">
              {(candidate.lifecycleState === 'brouillon' ||
                candidate.lifecycleState === 'pieces_a_completer') && (
                <button
                  type="button"
                  onClick={() =>
                    onTransitionState(
                      'soumise',
                      candidate.lifecycleState === 'pieces_a_completer'
                        ? 'Dossier complété et re-soumis par le candidat.'
                        : 'Candidature officiellement soumise.'
                    )
                  }
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {candidate.lifecycleState === 'pieces_a_completer'
                      ? 'Re-soumettre le Dossier Corrigé'
                      : 'Soumettre Officiellement ma Candidature'}
                  </span>
                </button>
              )}

              {onNavigateToCatalogue && (
                <button
                  type="button"
                  onClick={onNavigateToCatalogue}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                >
                  Retour au catalogue
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
