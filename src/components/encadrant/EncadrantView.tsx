import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  X,
  Download,
  AlertTriangle,
  MessageSquare,
  GraduationCap,
  Calendar
} from 'lucide-react';
import {
  ApplicationDocument,
  ApplicationState,
  Candidate,
  DoctoralSubject,
  DocumentValidationStatus,
  GcdSection,
  InterviewPv,
  ManualRelance,
  UserProfile
} from '../../domain/types';
import { hasPrivilege } from '../../domain/rbac';
import { formatFileSize, getDocumentStatusMeta } from '../../domain/documents';
import { getLifecycleStageInfo, mapLegacyStatusToLifecycleState } from '../../domain/lifecycle';
import { LifecycleTimeline } from '../common/LifecycleTimeline';

interface EncadrantViewProps {
  activeSection?: GcdSection;
  currentUser: UserProfile;
  subjects: DoctoralSubject[];
  candidates: Candidate[];
  documents: ApplicationDocument[];
  interviewPvs: InterviewPv[];
  relances: ManualRelance[];
  onAddSubject: (subject: DoctoralSubject) => void;
  onTransitionCandidate: (
    candidate: Candidate,
    targetState: ApplicationState,
    comment?: string
  ) => Promise<void>;
  onReviewDocument: (
    doc: ApplicationDocument,
    candidate: Candidate,
    status: DocumentValidationStatus,
    rejectionReason?: string
  ) => Promise<void>;
  onSubmitPv: (pv: InterviewPv, candidate: Candidate) => Promise<void>;
  onSendRelance: (relance: ManualRelance) => Promise<void>;
  onOpenPdf: (
    type:
      | 'fiche_inscription'
      | 'demande_bourse'
      | 'charte_theses'
      | 'recu_depot'
      | 'rapport_activite',
    candidate?: Candidate
  ) => void;
}

export const EncadrantView: React.FC<EncadrantViewProps> = ({
  activeSection,
  currentUser,
  subjects,
  candidates,
  documents,
  interviewPvs,
  relances,
  onAddSubject,
  onTransitionCandidate,
  onReviewDocument,
  onSubmitPv,
  onSendRelance,
  onOpenPdf
}) => {
  const sectionToTab = (sec?: GcdSection) => {
    if (sec === 'mes_sujets') return 'mes_sujets';
    if (sec === 'pv_entretiens') return 'pv_entretiens';
    if (sec === 'relances_encadrant') return 'relances';
    return 'candidatures';
  };

  const [activeTab, setActiveTab] = useState<'candidatures' | 'mes_sujets' | 'pv_entretiens' | 'relances'>(
    sectionToTab(activeSection)
  );

  useEffect(() => {
    if (activeSection) {
      setActiveTab(sectionToTab(activeSection));
    }
  }, [activeSection]);

  // Split-Screen Candidate & Document Inspection
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?.id || '');
  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0] || null;
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [reviewReasonInput, setReviewReasonInput] = useState<string>('');
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<'rejected' | 'additional_info_required'>('rejected');

  // New Subject Modal State
  const [newSubjectModal, setNewSubjectModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCoSupervisor, setNewCoSupervisor] = useState('Pr. Jaouad EL MEKKAOUI');
  const [newDomain, setNewDomain] = useState('Intelligence Artificielle & Traitement du Langage');
  const [newUniversity, setNewUniversity] = useState(
    'Université Sidi Mohamed Ben Abdellah (USMBA Fès)'
  );
  const [newSchool, setNewSchool] = useState('École Supérieure de Technologie (EST Fès)');
  const [newLab, setNewLab] = useState('Laboratoire Sciences Ingénierie et Gestion (LSIG)');
  const [newMajors, setNewMajors] = useState('Master Informatique, Ingénieur Data');
  const [newSlots, setNewSlots] = useState(1);
  const [newDesc, setNewDesc] = useState('');
  const [newPrereq, setNewPrereq] = useState('');

  // Write PV Modal State
  const [pvModalOpen, setPvModalOpen] = useState(false);
  const [pvCandidateId, setPvCandidateId] = useState(candidates[0]?.id || '');
  const [pvOralGrade, setPvOralGrade] = useState<number>(17);
  const [pvDecision, setPvDecision] = useState<'admis_principal' | 'liste_attente' | 'non_admis'>(
    'admis_principal'
  );
  const [pvComments, setPvComments] = useState('');
  const [pvJury, setPvJury] = useState(
    'Pr. Adil HACHMOUD, Pr. Jaouad EL MEKKAOUI, Pr. Mohamed CHERGUI'
  );

  // Manual Relance Modal State
  const [relanceModalOpen, setRelanceModalOpen] = useState(false);
  const [relanceRecipientRole, setRelanceRecipientRole] = useState<'candidat' | 'directeur_structure'>(
    'candidat'
  );
  const [relanceRecipientName, setRelanceRecipientName] = useState(candidates[0]?.fullName || '');
  const [relanceRecipientEmail, setRelanceRecipientEmail] = useState(candidates[0]?.email || '');
  const [relanceReason, setRelanceReason] = useState<
    'absence_entretien' | 'dossier_incomplet' | 'rapport_activite_retard' | 'validation_requise'
  >('absence_entretien');
  const [relanceMessage, setRelanceMessage] = useState(
    "Bonjour, nous constatons une absence lors de la séance d'entretien oral. Merci de contacter le laboratoire d'urgence."
  );

  const canValidateDocs = hasPrivilege(currentUser, 'DOCUMENT_VALIDATE');
  const canScheduleInterview = hasPrivilege(currentUser, 'INTERVIEW_SCHEDULE');
  const canWritePv = hasPrivilege(currentUser, 'PV_WRITE');
  const canProposeSubject = hasPrivilege(currentUser, 'SUBJECT_PROPOSE');
  const canSendNotification = hasPrivilege(currentUser, 'NOTIFICATION_SEND');

  const candidateDocs = selectedCandidate
    ? documents.filter((d) => d.applicationId === selectedCandidate.id)
    : [];
  const activeDoc =
    candidateDocs.find((d) => d.id === selectedDocId) || candidateDocs[0] || null;

  const mySubjects = subjects;
  const myCandidates = candidates;

  const handleCreateSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSub: DoctoralSubject = {
      id: `${Date.now().toString().slice(-5)}`,
      title: newTitle,
      supervisorName: currentUser.fullName.replace(/^Pr\.\s*/i, ''),
      supervisorUid: currentUser.uid,
      supervisorTitle: currentUser.title || "Professeur de l'Enseignement Supérieur (PES)",
      supervisorEmail: currentUser.email,
      coSupervisorName: newCoSupervisor || undefined,
      labName: newLab,
      schoolName: newSchool,
      university: newUniversity,
      academicYear: '2026/2027',
      domain: newDomain,
      eligibleMajors: newMajors.split(',').map((m) => m.trim()),
      totalApplicants: 0,
      remainingSlots: newSlots,
      status: 'en_attente_structure',
      description: newDesc,
      prerequisites: newPrereq
    };
    onAddSubject(newSub);
    setNewSubjectModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewPrereq('');
  };

  const handleSubmitPvForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find((c) => c.id === pvCandidateId) || candidates[0];
    if (!cand) return;
    const newPv: InterviewPv = {
      id: `PV-${Date.now().toString().slice(-4)}`,
      candidateId: cand.id,
      candidateName: cand.fullName,
      candidateCin: cand.cin,
      subjectId: cand.subjectId,
      subjectTitle: cand.subjectTitle,
      supervisorName: currentUser.fullName,
      supervisorUid: currentUser.uid,
      labName: cand.labName,
      schoolName: cand.schoolName,
      interviewDate: new Date().toLocaleDateString('fr-FR'),
      oralGrade: pvOralGrade,
      decision: pvDecision,
      juryMembers: pvJury.split(',').map((j) => j.trim()),
      comments: pvComments,
      submittedBySupervisor: true,
      validatedByStructure: false
    };
    await onSubmitPv(newPv, cand);
    setPvModalOpen(false);
    setPvComments('');
  };

  const handleSendRelanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRel: ManualRelance = {
      id: `REL-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
      senderUid: currentUser.uid,
      senderName: currentUser.fullName,
      recipientName: relanceRecipientName,
      recipientEmail: relanceRecipientEmail,
      recipientRole: relanceRecipientRole,
      subjectTitle: 'Gestion du Cycle Doctoral - Relance officielle',
      reason: relanceReason,
      message: relanceMessage,
      status: 'envoye'
    };
    await onSendRelance(newRel);
    setRelanceModalOpen(false);
  };

  const handleConfirmDocRejection = async () => {
    if (!activeDoc || !selectedCandidate) return;
    await onReviewDocument(activeDoc, selectedCandidate, reviewMode, reviewReasonInput);
    setReviewingDocId(null);
    setReviewReasonInput('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-4 h-4" />
            <span>
              Espace Encadrement Scientifique · Enseignant / Directeur de Thèse / Co-encadrant
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Tableau de Bord d’Encadrement ({currentUser.fullName})
          </h1>
          <p className="text-xs text-slate-500">
            {currentUser.lab || 'Laboratoire Sciences Ingénierie et Gestion (LSIG)'} ·{' '}
            {currentUser.university || 'USMBA Fès'}
          </p>
        </div>

        {canProposeSubject && (
          <button
            type="button"
            onClick={() => setNewSubjectModal(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Proposer un Nouveau Sujet</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('candidatures')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'candidatures'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Candidatures & Vérification Pièces</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] font-bold">
            {myCandidates.length}
          </span>
        </button>

        {canProposeSubject && (
          <button
            type="button"
            onClick={() => setActiveTab('mes_sujets')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'mes_sujets'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Sujets de Thèse ({mySubjects.length})</span>
          </button>
        )}

        {canWritePv && (
          <button
            type="button"
            onClick={() => setActiveTab('pv_entretiens')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pv_entretiens'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PV des Entretiens Oraux ({interviewPvs.length})</span>
          </button>
        )}

        {canSendNotification && (
          <button
            type="button"
            onClick={() => setActiveTab('relances')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'relances'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Relances Manuelles</span>
          </button>
        )}
      </div>

      {/* TAB 1: Candidatures with Split-Screen Preview & Document Validation */}
      {activeTab === 'candidatures' && (
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Candidatures assignées ({myCandidates.length})
              </span>
              <span className="text-[11px]">Sélectionnez un dossier</span>
            </div>

            <div className="space-y-2.5">
              {myCandidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const stage = getLifecycleStageInfo(
                  cand.lifecycleState || mapLegacyStatusToLifecycleState(cand.status)
                );

                return (
                  <div
                    key={cand.id}
                    onClick={() => {
                      setSelectedCandidateId(cand.id);
                      setReviewingDocId(null);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {cand.fullName}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-mono">
                          CIN: {cand.cin} · CNE: {cand.cne}
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.colorClass}`}>
                        {stage.shortLabel}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                      {cand.subjectTitle}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <span>
                        Master : <strong className="text-slate-800 dark:text-slate-200">{cand.masterGrade}/20</strong>
                      </span>
                      <span className="text-indigo-600 font-medium flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Inspecter
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Split-Screen Preview, Document Compliance & Guarded Lifecycle */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            {selectedCandidate ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      Contrôle Scientifique & Conformité Documentaire · #{selectedCandidate.cin}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedCandidate.fullName} ({selectedCandidate.arabicName})
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedCandidate.diploma} · {selectedCandidate.originUniversity}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Directeur : {selectedCandidate.thesisDirectorName || `Pr. ${selectedCandidate.supervisorName}`}
                      {selectedCandidate.coSupervisorName && ` · Co-encadrant : ${selectedCandidate.coSupervisorName}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canScheduleInterview &&
                      (selectedCandidate.lifecycleState === 'examen_encadrement' ||
                        selectedCandidate.lifecycleState === 'verification_docs') && (
                        <button
                          type="button"
                          onClick={() =>
                            onTransitionCandidate(
                              selectedCandidate,
                              'entretien_planifie',
                              'Convocation à l’entretien oral devant la commission.'
                            )
                          }
                          className="px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Convoquer Oral
                        </button>
                      )}
                    {canWritePv && (
                      <button
                        type="button"
                        onClick={() => {
                          setPvCandidateId(selectedCandidate.id);
                          setPvModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                      >
                        Rédiger PV
                      </button>
                    )}
                  </div>
                </div>

                {/* Guarded Lifecycle Progress & Allowed Transitions */}
                <LifecycleTimeline
                  application={selectedCandidate}
                  documents={candidateDocs}
                  pvs={interviewPvs}
                  currentUser={currentUser}
                  onTriggerTransition={(targetState) =>
                    onTransitionCandidate(selectedCandidate, targetState)
                  }
                  compact
                />

                {/* Real Application Documents Compliance Panel */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pièces Justificatives Déposées ({candidateDocs.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => onOpenPdf('fiche_inscription', selectedCandidate)}
                      className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Fiche PDF
                    </button>
                  </div>

                  {candidateDocs.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
                      Aucune pièce justificative numérisée attachée à ce dossier pour le moment.
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {candidateDocs.map((docItem) => {
                          const meta = getDocumentStatusMeta(docItem.status);
                          const isCurrentDoc = activeDoc?.id === docItem.id;
                          return (
                            <button
                              key={docItem.id}
                              type="button"
                              onClick={() => {
                                setSelectedDocId(docItem.id);
                                setReviewingDocId(null);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap flex items-center gap-1.5 transition-all ${
                                isCurrentDoc
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate max-w-[140px]">{docItem.label}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  isCurrentDoc ? 'bg-white/20 text-white' : meta.badgeClass
                                }`}
                              >
                                {meta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {activeDoc && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {activeDoc.label}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {activeDoc.fileName} · {formatFileSize(activeDoc.fileSizeBytes)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Déposé le{' '}
                                {new Date(activeDoc.uploadedAt).toLocaleString('fr-FR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short'
                                })}
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                getDocumentStatusMeta(activeDoc.status).badgeClass
                              }`}
                            >
                              {getDocumentStatusMeta(activeDoc.status).label}
                            </span>
                          </div>

                          {activeDoc.previewDataUrl && (
                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 max-h-56 flex justify-center">
                              {activeDoc.mimeType.startsWith('image/') ? (
                                <img
                                  src={activeDoc.previewDataUrl}
                                  alt={activeDoc.fileName}
                                  className="max-h-52 object-contain"
                                />
                              ) : (
                                <iframe
                                  src={activeDoc.previewDataUrl}
                                  title={activeDoc.fileName}
                                  className="w-full h-48"
                                />
                              )}
                            </div>
                          )}

                          {activeDoc.rejectionReason && (
                            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px]">
                              <strong>Motif enregistré :</strong> {activeDoc.rejectionReason}
                            </div>
                          )}

                          {canValidateDocs && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onReviewDocument(activeDoc, selectedCandidate, 'validated')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Valider la pièce
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingDocId(activeDoc.id);
                                    setReviewMode('additional_info_required');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-semibold flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Demander complément
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingDocId(activeDoc.id);
                                    setReviewMode('rejected');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Rejeter la pièce
                                </button>
                              </div>

                              {reviewingDocId === activeDoc.id && (
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                    Motif obligatoire communiqué au candidat :
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={reviewReasonInput}
                                    onChange={(e) => setReviewReasonInput(e.target.value)}
                                    placeholder="Expliquez pourquoi la pièce est rejetée ou quel complément est attendu..."
                                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReviewingDocId(null);
                                        setReviewReasonInput('');
                                      }}
                                      className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-lg"
                                    >
                                      Annuler
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleConfirmDocRejection}
                                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
                                    >
                                      Confirmer & Notifier le Candidat
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Manual Relance Footer */}
                {canSendNotification && (
                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setRelanceRecipientName(selectedCandidate.fullName);
                        setRelanceRecipientEmail(selectedCandidate.email);
                        setRelanceRecipientRole('candidat');
                        setRelanceModalOpen(true);
                      }}
                      className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 font-medium flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Envoyer une relance manuelle au candidat</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                Sélectionnez un candidat pour afficher son dossier et ses pièces justificatives.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Mes Sujets de Thèse */}
      {activeTab === 'mes_sujets' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sujets Doctoraux Déposés pour la Session 2026/2027
            </h3>
            <span className="text-xs text-slate-500">{mySubjects.length} sujet(s)</span>
          </div>

          <div className="space-y-3">
            {mySubjects.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      #{s.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'valide'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'rejete'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status === 'valide'
                        ? 'Validé par la Structure'
                        : s.status === 'rejete'
                        ? 'Rejeté'
                        : 'En attente de visa Structure'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.title}</h4>
                  <div className="text-slate-500">
                    {s.labName} · {s.schoolName} ({s.university})
                    {s.coSupervisorName && ` · Co-encadrant : Pr. ${s.coSupervisorName}`}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {s.totalApplicants} postulant(s)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {s.remainingSlots} place(s) disponible(s)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PV des Entretiens Oraux */}
      {activeTab === 'pv_entretiens' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Procès-Verbaux (PV) des Entretiens Oraux
              </h3>
              <p className="text-xs text-slate-500">
                Transmis automatiquement au Directeur de Structure pour visa officiel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPvCandidateId(selectedCandidate?.id || candidates[0]?.id || '');
                setPvModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              + Nouveau PV d’Entretien
            </button>
          </div>

          <div className="space-y-3">
            {interviewPvs.map((pv) => (
              <div
                key={pv.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 mr-2">{pv.id}</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {pv.candidateName}
                    </strong>
                    <span className="text-slate-400 ml-1.5">({pv.candidateCin})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      pv.validatedByStructure
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pv.validatedByStructure
                      ? '✓ Visé par Structure'
                      : 'En attente de visa Structure'}
                  </span>
                </div>

                <div className="text-slate-600 dark:text-slate-400">Sujet : {pv.subjectTitle}</div>

                <div className="grid sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg text-[11px]">
                  <div>
                    Date : <strong>{pv.interviewDate}</strong>
                  </div>
                  <div>
                    Note orale : <strong className="text-indigo-600">{pv.oralGrade}/20</strong>
                  </div>
                  <div>
                    Décision :{' '}
                    <strong className="text-emerald-600 uppercase">
                      {pv.decision.replace('_', ' ')}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-100 dark:border-slate-700">
                  "{pv.comments}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Relances Manuelles */}
      {activeTab === 'relances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Historique des Relances Manuelles
              </h3>
              <p className="text-xs text-slate-500">
                Chaque relance génère également une notification d’action requise dans le centre de notifications du destinataire.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!relanceRecipientEmail) {
                  setRelanceRecipientRole('candidat');
                  setRelanceRecipientName(selectedCandidate?.fullName || candidates[0]?.fullName || '');
                  setRelanceRecipientEmail(selectedCandidate?.email || candidates[0]?.email || '');
                }
                setRelanceModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              + Déclencher une Relance
            </button>
          </div>

          <div className="space-y-3">
            {relances.map((rel) => (
              <div
                key={rel.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600">{rel.recipientName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                      {rel.recipientRole === 'candidat' ? 'Candidat' : 'Chef de Structure'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{rel.date}</span>
                </div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  Motif : {rel.reason.replace(/_/g, ' ')}
                </div>
                <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg text-[11px]">
                  {rel.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Propose New Subject */}
      {newSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Proposer un Nouveau Sujet de Thèse
              </h3>
              <button onClick={() => setNewSubjectModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubjectSubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Titre / Intitulé du sujet *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: Conception de jumeaux numériques pour..."
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Université *</label>
                  <select
                    value={newUniversity}
                    onChange={(e) => setNewUniversity(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  >
                    <option value="Université Sidi Mohamed Ben Abdellah (USMBA Fès)">USMBA Fès</option>
                    <option value="Université Mohammed V de Rabat (UM5)">UM5 Rabat</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Co-encadrant éventuel</label>
                  <input
                    type="text"
                    value={newCoSupervisor}
                    onChange={(e) => setNewCoSupervisor(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Établissement *</label>
                  <input
                    type="text"
                    required
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Laboratoire *</label>
                  <input
                    type="text"
                    required
                    value={newLab}
                    onChange={(e) => setNewLab(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Domaine</label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Places ouvertes</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newSlots}
                    onChange={(e) => setNewSlots(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Filières admissibles (séparées par virgule)
                </label>
                <input
                  type="text"
                  value={newMajors}
                  onChange={(e) => setNewMajors(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Descriptif & Objectifs scientifiques *</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Prérequis académiques</label>
                <textarea
                  rows={2}
                  value={newPrereq}
                  onChange={(e) => setNewPrereq(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewSubjectModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg"
                >
                  Déposer pour validation Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Write PV */}
      {pvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Rédiger le Procès-Verbal (PV) d’Entretien
              </h3>
              <button onClick={() => setPvModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPvForm} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Candidat évalué</label>
                <select
                  value={pvCandidateId}
                  onChange={(e) => setPvCandidateId(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.cin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Note d’oral (/20) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={20}
                    required
                    value={pvOralGrade}
                    onChange={(e) => setPvOralGrade(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Décision proposée *</label>
                  <select
                    value={pvDecision}
                    onChange={(e) =>
                      setPvDecision(e.target.value as 'admis_principal' | 'liste_attente' | 'non_admis')
                    }
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 font-bold"
                  >
                    <option value="admis_principal">Admis Liste Principale</option>
                    <option value="liste_attente">Liste d’Attente</option>
                    <option value="non_admis">Non Admis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Membres du jury d’entretien</label>
                <input
                  type="text"
                  value={pvJury}
                  onChange={(e) => setPvJury(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Observations du Jury *</label>
                <textarea
                  required
                  rows={3}
                  value={pvComments}
                  onChange={(e) => setPvComments(e.target.value)}
                  placeholder="Appréciation technique, motivation, prérequis maîtrisés..."
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPvModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg"
                >
                  Enregistrer & Transmettre au Chef de Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manual Relance */}
      {relanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Déclencher une Relance Manuelle
              </h3>
              <button onClick={() => setRelanceModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendRelanceSubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Destinataire</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRelanceRecipientRole('candidat');
                      setRelanceRecipientName(candidates[0]?.fullName || '');
                      setRelanceRecipientEmail(candidates[0]?.email || '');
                    }}
                    className={`p-2 rounded-lg border font-semibold ${
                      relanceRecipientRole === 'candidat'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200'
                    }`}
                  >
                    Un Candidat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRelanceRecipientRole('directeur_structure');
                      setRelanceRecipientName('Pr. Mohamed CHERGUI');
                      setRelanceRecipientEmail('directeur.lsig@usmba.ac.ma');
                    }}
                    className={`p-2 rounded-lg border font-semibold ${
                      relanceRecipientRole === 'directeur_structure'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200'
                    }`}
                  >
                    Le Chef de Structure
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Nom :</label>
                  <input
                    type="text"
                    required
                    value={relanceRecipientName}
                    onChange={(e) => setRelanceRecipientName(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Email :</label>
                  <input
                    type="email"
                    required
                    value={relanceRecipientEmail}
                    onChange={(e) => setRelanceRecipientEmail(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Motif</label>
                <select
                  value={relanceReason}
                  onChange={(e) => {
                    const r = e.target.value as typeof relanceReason;
                    setRelanceReason(r);
                    if (r === 'absence_entretien')
                      setRelanceMessage(
                        "Bonjour, nous avons constaté votre absence à la convocation de l'entretien oral. Merci de contacter le département."
                      );
                    if (r === 'dossier_incomplet')
                      setRelanceMessage(
                        'Bonjour, votre dossier nécessite le téléversement d’une pièce justificative conforme.'
                      );
                    if (r === 'rapport_activite_retard')
                      setRelanceMessage(
                        "Bonjour, votre rapport annuel d'activité de recherche n'a pas encore été déposé."
                      );
                    if (r === 'validation_requise')
                      setRelanceMessage(
                        "Cher Directeur, le PV d'oral et les dossiers de candidature sont en attente de votre validation officielle."
                      );
                  }}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="absence_entretien">Absence à l’entretien</option>
                  <option value="dossier_incomplet">Pièce justificative manquante</option>
                  <option value="rapport_activite_retard">Retard de dépôt de rapport</option>
                  <option value="validation_requise">Relance validation Chef de Structure</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Message</label>
                <textarea
                  required
                  rows={3}
                  value={relanceMessage}
                  onChange={(e) => setRelanceMessage(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRelanceModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg"
                >
                  Envoyer & Notifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
