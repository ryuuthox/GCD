import React, { useState, useEffect } from 'react';
import {
  Building,
  CheckCircle2,
  FileText,
  BookOpen,
  Users,
  FileCheck,
  Clock,
  Download
} from 'lucide-react';
import {
  DoctoralSubject,
  InterviewPv,
  ReRegistration,
  Candidate,
  GcdSection,
  UserProfile
} from '../../domain/types';
import { hasPrivilege } from '../../domain/rbac';

interface StructureViewProps {
  activeSection?: GcdSection;
  currentUser: UserProfile;
  subjects: DoctoralSubject[];
  interviewPvs: InterviewPv[];
  reregistrations: ReRegistration[];
  candidates: Candidate[];
  onValidateSubject: (subject: DoctoralSubject, status: 'valide' | 'rejete') => Promise<void>;
  onValidatePv: (pv: InterviewPv, comments?: string) => Promise<void>;
  onValidateReport: (
    reregistration: ReRegistration,
    status: 'Validé' | 'Pour rectification'
  ) => Promise<void>;
  onOpenPdf: (
    type:
      | 'fiche_inscription'
      | 'demande_bourse'
      | 'charte_theses'
      | 'recu_depot'
      | 'rapport_activite',
    candidate?: Candidate
  ) => void;
  currentStructureName?: string;
}

export const StructureView: React.FC<StructureViewProps> = ({
  activeSection,
  currentUser,
  subjects,
  interviewPvs,
  reregistrations,
  candidates,
  onValidateSubject,
  onValidatePv,
  onValidateReport,
  onOpenPdf,
  currentStructureName = 'Laboratoire Sciences Ingénierie et Gestion (LSIG)'
}) => {
  const sectionToTab = (sec?: GcdSection) => {
    if (sec === 'validation_sujets') return 'sujets';
    if (sec === 'validation_rapports') return 'rapports';
    if (sec === 'profils_candidats') return 'candidats';
    return 'pv';
  };

  const [activeTab, setActiveTab] = useState<'pv' | 'sujets' | 'rapports' | 'candidats'>(
    sectionToTab(activeSection)
  );

  useEffect(() => {
    if (activeSection) {
      setActiveTab(sectionToTab(activeSection));
    }
  }, [activeSection]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?.id || '');
  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0] || null;

  const canValidatePv = hasPrivilege(currentUser, 'PV_VALIDATE_STRUCTURE');
  const canValidateSubjects = hasPrivilege(currentUser, 'SUBJECT_VALIDATE_STRUCTURE');
  const canValidateReports = hasPrivilege(currentUser, 'REPORT_VALIDATE_STRUCTURE');

  const pendingPvs = interviewPvs.filter((pv) => !pv.validatedByStructure);
  const validatedPvs = interviewPvs.filter((pv) => pv.validatedByStructure);
  const pendingSubjects = subjects.filter((s) => s.status === 'en_attente_structure');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Building className="w-4 h-4" />
            <span>Direction de la Structure de Recherche (Chef de Laboratoire)</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Validation & Contrôle Officiel · {currentStructureName}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Visa officiel des PV d’entretiens, validation des sujets de thèse et des rapports d’activité.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 text-xs gap-2 overflow-x-auto">
        {canValidatePv && (
          <button
            type="button"
            onClick={() => setActiveTab('pv')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pv'
                ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Validation des PV d’Entretien</span>
            {pendingPvs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold tabular-nums">
                {pendingPvs.length} en attente
              </span>
            )}
          </button>
        )}

        {canValidateSubjects && (
          <button
            type="button"
            onClick={() => setActiveTab('sujets')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sujets'
                ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Validation des Sujets Proposés</span>
            {pendingSubjects.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold tabular-nums">
                {pendingSubjects.length}
              </span>
            )}
          </button>
        )}

        {canValidateReports && (
          <button
            type="button"
            onClick={() => setActiveTab('rapports')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rapports'
                ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="tabular-nums">
              Validation des Rapports Annuels ({reregistrations.length})
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('candidats')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'candidats'
              ? 'border-emerald-700 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Consultation des Profils Candidats</span>
        </button>
      </div>

      {/* TAB 1: Validation PV d'Entretien */}
      {activeTab === 'pv' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 tabular-nums">
              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              PV Déposés par les Encadrants en Attente de Visa ({pendingPvs.length})
            </h3>

            {pendingPvs.length === 0 ? (
              <div className="text-stone-500 dark:text-stone-400 text-xs py-6 text-center">
                Tous les procès-verbaux d’entretien soumis ont été visés par la direction de structure.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPvs.map((pv) => (
                  <div
                    key={pv.id}
                    className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold tabular-nums text-teal-700 dark:text-teal-400 mr-2">
                          {pv.id}
                        </span>
                        <strong className="text-stone-900 dark:text-stone-100 text-sm">
                          {pv.candidateName}
                        </strong>
                        <span className="text-stone-500 dark:text-stone-400 ml-1.5 font-mono tabular-nums">
                          CIN: {pv.candidateCin}
                        </span>
                      </div>
                      <span className="text-amber-800 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md text-[11px]">
                        Déposé par {pv.supervisorName}
                      </span>
                    </div>

                    <div className="text-stone-700 dark:text-stone-300">
                      Sujet : <strong>{pv.subjectTitle}</strong>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800 tabular-nums">
                      <div>
                        Note d’oral :{' '}
                        <strong className="font-mono text-teal-700 dark:text-teal-400 font-bold">
                          {pv.oralGrade}/20
                        </strong>
                      </div>
                      <div>
                        Décision proposée :{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {pv.decision.replace('_', ' ')}
                        </strong>
                      </div>
                      <div>
                        Date entretien : <strong>{pv.interviewDate}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-stone-300 italic bg-white/80 dark:bg-stone-900 p-2.5 rounded border border-stone-200 dark:border-stone-800">
                      Appréciation du jury : "{pv.comments}"
                    </p>

                    {canValidatePv && (
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            onValidatePv(
                              pv,
                              'Visa officiel accordé après délibération de structure.'
                            )
                          }
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Valider et Accorder le Visa Officiel</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {validatedPvs.length > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 tabular-nums">
                PV d’Entretien Visés et Enregistrés ({validatedPvs.length})
              </h4>
              <div className="space-y-2">
                {validatedPvs.map((pv) => (
                  <div
                    key={pv.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex justify-between items-center text-xs gap-2 flex-wrap"
                  >
                    <div>
                      <strong className="text-stone-900 dark:text-stone-100 mr-2">
                        {pv.candidateName}
                      </strong>
                      <span className="text-stone-500 dark:text-stone-400 tabular-nums">
                        Note : {pv.oralGrade}/20 ({pv.decision})
                      </span>
                    </div>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Visé le{' '}
                      {pv.validationDate || '29/10/2026'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Validation des Sujets */}
      {activeTab === 'sujets' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            Sujets de Recherche Doctorale Déposés ({subjects.length})
          </h3>

          <div className="space-y-3">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mr-2">
                      #{s.id}
                    </span>
                    <strong className="text-stone-900 dark:text-stone-100 text-sm">{s.title}</strong>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      s.status === 'valide'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : s.status === 'rejete'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {s.status === 'valide'
                      ? 'Validé'
                      : s.status === 'rejete'
                      ? 'Rejeté'
                      : 'En attente de visa'}
                  </span>
                </div>

                <div className="text-stone-500 dark:text-stone-400">
                  Encadrant : <strong className="text-stone-700 dark:text-stone-300">Pr. {s.supervisorName}</strong> ({s.supervisorTitle}) ·{' '}
                  {s.schoolName}
                </div>

                <p className="text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-lg text-[11px]">
                  {s.description}
                </p>

                {s.status === 'en_attente_structure' && canValidateSubjects && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => onValidateSubject(s, 'rejete')}
                      className="px-3 py-1.5 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg font-semibold transition-colors"
                    >
                      Rejeter
                    </button>
                    <button
                      type="button"
                      onClick={() => onValidateSubject(s, 'valide')}
                      className="px-4 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg font-bold shadow-xs transition-colors"
                    >
                      Valider et Publier au Catalogue
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Validation des Rapports Annuels */}
      {activeTab === 'rapports' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Rapports d’Activité Annuels Soumis par les Doctorants
          </h3>

          <div className="space-y-3">
            {reregistrations.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {r.studentName}
                    </h4>
                    <div className="text-stone-500 dark:text-stone-400 text-[11px] tabular-nums">
                      Doctorant en {r.year}ème année de thèse · Directeur : Pr. {r.supervisorName}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      r.structureApproval === 'Validé'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    Avis Structure : {r.structureApproval}
                  </span>
                </div>

                <div className="text-stone-800 dark:text-stone-200">
                  Thèse : <strong>{r.thesisTitle}</strong>
                </div>

                <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl space-y-1.5">
                  <div className="font-semibold text-stone-700 dark:text-stone-300">
                    Contributions & Publications Déclarées :
                  </div>
                  <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                    {r.activityReport.contributions}
                  </p>
                  <div className="pt-1 text-[11px] text-stone-500 dark:text-stone-400">
                    Publications : <strong>{r.activityReport.publications}</strong>
                  </div>
                </div>

                {canValidateReports && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => onValidateReport(r, 'Pour rectification')}
                      className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg font-medium transition-colors"
                    >
                      Demander Rectification
                    </button>
                    <button
                      type="button"
                      onClick={() => onValidateReport(r, 'Validé')}
                      className="px-4 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg font-bold shadow-xs transition-colors"
                    >
                      Valider le Rapport Annuel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Consultation des Profils Candidats (Strictement sans progression interne du dossier) */}
      {activeTab === 'candidats' && (
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 space-y-2.5">
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 tabular-nums">
              Candidats de la structure ({candidates.length})
            </h4>
            {candidates.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCandidateId(c.id)}
                className={`p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                  selectedCandidate?.id === c.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-600 dark:border-emerald-500'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="font-bold text-stone-900 dark:text-stone-100">{c.fullName}</div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                  CIN: {c.cin} · CNE: {c.cne}
                </div>
                <div className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-1">
                  {c.diploma}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
            {selectedCandidate ? (
              <div className="space-y-3 text-xs">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-2">
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                    {selectedCandidate.fullName}
                  </h3>
                  <div className="text-stone-500 dark:text-stone-400">
                    {selectedCandidate.email} · {selectedCandidate.phone}
                  </div>
                </div>
                <div>
                  Diplôme : <strong>{selectedCandidate.diploma}</strong>
                </div>
                <div>Université d’origine : {selectedCandidate.originUniversity}</div>
                <div className="tabular-nums">
                  Moyenne Master :{' '}
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    {selectedCandidate.masterGrade}/20
                  </strong>
                </div>
                <div className="tabular-nums">
                  Moyenne Licence :{' '}
                  <strong className="font-mono text-stone-700 dark:text-stone-300">
                    {selectedCandidate.licenceGrade}/20
                  </strong>
                </div>
                <div>
                  Directeur pressenti :{' '}
                  {selectedCandidate.thesisDirectorName || `Pr. ${selectedCandidate.supervisorName}`}
                </div>
                {selectedCandidate.coSupervisorName && (
                  <div>Co-encadrant : {selectedCandidate.coSupervisorName}</div>
                )}
                <div>Sujet : {selectedCandidate.subjectTitle}</div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => onOpenPdf('fiche_inscription', selectedCandidate)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Fiche d’Inscription Officielle</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
