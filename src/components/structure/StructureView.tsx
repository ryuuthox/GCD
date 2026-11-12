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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Building className="w-4 h-4" />
            <span>Direction de la Structure de Recherche (Chef de Laboratoire)</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Validation & Contrôle Officiel · {currentStructureName}
          </h1>
          <p className="text-xs text-slate-500">
            Visa officiel des PV d’entretiens, validation des sujets de thèse et des rapports d’activité.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs gap-2 overflow-x-auto">
        {canValidatePv && (
          <button
            type="button"
            onClick={() => setActiveTab('pv')}
            className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pv'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Validation des PV d’Entretien</span>
            {pendingPvs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
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
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Validation des Sujets Proposés</span>
            {pendingSubjects.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
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
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Validation des Rapports Annuels ({reregistrations.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('candidats')}
          className={`py-2.5 px-4 font-semibold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'candidats'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Consultation des Profils Candidats</span>
        </button>
      </div>

      {/* TAB 1: Validation PV d'Entretien */}
      {activeTab === 'pv' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              PV Déposés par les Encadrants en Attente de Visa ({pendingPvs.length})
            </h3>

            {pendingPvs.length === 0 ? (
              <div className="text-slate-400 text-xs py-6 text-center">
                Tous les procès-verbaux d’entretien soumis ont été visés par la direction de structure.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPvs.map((pv) => (
                  <div
                    key={pv.id}
                    className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-600 mr-2">
                          {pv.id}
                        </span>
                        <strong className="text-slate-900 dark:text-white text-sm">
                          {pv.candidateName}
                        </strong>
                        <span className="text-slate-500 ml-1.5 font-mono">
                          CIN: {pv.candidateCin}
                        </span>
                      </div>
                      <span className="text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        Déposé par {pv.supervisorName}
                      </span>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300">
                      Sujet : <strong>{pv.subjectTitle}</strong>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <div>
                        Note d’oral :{' '}
                        <strong className="text-indigo-600 font-bold">{pv.oralGrade}/20</strong>
                      </div>
                      <div>
                        Décision proposée :{' '}
                        <strong className="text-emerald-700 uppercase">
                          {pv.decision.replace('_', ' ')}
                        </strong>
                      </div>
                      <div>
                        Date entretien : <strong>{pv.interviewDate}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
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
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs"
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                PV d’Entretien Visés et Enregistrés ({validatedPvs.length})
              </h4>
              <div className="space-y-2">
                {validatedPvs.map((pv) => (
                  <div
                    key={pv.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div>
                      <strong className="text-slate-900 dark:text-white mr-2">
                        {pv.candidateName}
                      </strong>
                      <span className="text-slate-500">
                        Note : {pv.oralGrade}/20 ({pv.decision})
                      </span>
                    </div>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Sujets de Recherche Doctorale Déposés ({subjects.length})
          </h3>

          <div className="space-y-3">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600 mr-2">#{s.id}</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{s.title}</strong>
                  </div>
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
                      ? 'Validé'
                      : s.status === 'rejete'
                      ? 'Rejeté'
                      : 'En attente de visa'}
                  </span>
                </div>

                <div className="text-slate-500">
                  Encadrant : <strong>Pr. {s.supervisorName}</strong> ({s.supervisorTitle}) ·{' '}
                  {s.schoolName}
                </div>

                <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded text-[11px]">
                  {s.description}
                </p>

                {s.status === 'en_attente_structure' && canValidateSubjects && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onValidateSubject(s, 'rejete')}
                      className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold"
                    >
                      Rejeter
                    </button>
                    <button
                      type="button"
                      onClick={() => onValidateSubject(s, 'valide')}
                      className="px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold shadow-xs"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Rapports d’Activité Annuels Soumis par les Doctorants
          </h3>

          <div className="space-y-3">
            {reregistrations.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {r.studentName}
                    </h4>
                    <div className="text-slate-500 text-[11px]">
                      Doctorant en {r.year}ème année de thèse · Directeur : Pr. {r.supervisorName}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.structureApproval === 'Validé'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Avis Structure : {r.structureApproval}
                  </span>
                </div>

                <div className="text-slate-800 dark:text-slate-200">
                  Thèse : <strong>{r.thesisTitle}</strong>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-1.5">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Contributions & Publications Déclarées :
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {r.activityReport.contributions}
                  </p>
                  <div className="pt-1 text-[11px] text-slate-500">
                    Publications : <strong>{r.activityReport.publications}</strong>
                  </div>
                </div>

                {canValidateReports && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onValidateReport(r, 'Pour rectification')}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Demander Rectification
                    </button>
                    <button
                      type="button"
                      onClick={() => onValidateReport(r, 'Validé')}
                      className="px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold shadow-xs"
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
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Candidats de la structure ({candidates.length})
            </h4>
            {candidates.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCandidateId(c.id)}
                className={`p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                  selectedCandidate?.id === c.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white">{c.fullName}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  CIN: {c.cin} · CNE: {c.cne}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-1">
                  {c.diploma}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            {selectedCandidate ? (
              <div className="space-y-3 text-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedCandidate.fullName}
                  </h3>
                  <div className="text-slate-500">
                    {selectedCandidate.email} · {selectedCandidate.phone}
                  </div>
                </div>
                <div>
                  Diplôme : <strong>{selectedCandidate.diploma}</strong>
                </div>
                <div>Université d’origine : {selectedCandidate.originUniversity}</div>
                <div>
                  Moyenne Master :{' '}
                  <strong className="text-emerald-700">{selectedCandidate.masterGrade}/20</strong>
                </div>
                <div>
                  Moyenne Licence :{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
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

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenPdf('fiche_inscription', selectedCandidate)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5"
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
