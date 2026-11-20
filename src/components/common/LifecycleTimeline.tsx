import React from 'react';
import {
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  AlertTriangle,
  XCircle,
  History
} from 'lucide-react';
import {
  ApplicationDocument,
  ApplicationState,
  Candidate,
  InterviewPv,
  UserProfile
} from '../../domain/types';
import {
  getAvailableTransitionsForUser,
  getLifecycleStageInfo,
  mapLegacyStatusToLifecycleState
} from '../../domain/lifecycle';

interface LifecycleTimelineProps {
  application: Candidate;
  documents: ApplicationDocument[];
  pvs: InterviewPv[];
  currentUser: UserProfile | null;
  onTriggerTransition?: (targetState: ApplicationState, comment?: string) => void;
  compact?: boolean;
}

const ORDERED_MAIN_PATH: ApplicationState[] = [
  'brouillon',
  'soumise',
  'verification_docs',
  'examen_encadrement',
  'entretien_planifie',
  'evaluee',
  'validation_structure',
  'liste_principale',
  'inscription_validee'
];

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({
  application,
  documents,
  pvs,
  currentUser,
  onTriggerTransition,
  compact = false
}) => {
  const currentState =
    application.lifecycleState || mapLegacyStatusToLifecycleState(application.status);
  const currentInfo = getLifecycleStageInfo(currentState);

  const availableTransitions = currentUser
    ? getAvailableTransitionsForUser({
        user: currentUser,
        application,
        documents,
        pvs
      })
    : [];

  const getStepStatus = (stage: ApplicationState): 'completed' | 'current' | 'remaining' => {
    if (currentState === stage) return 'current';
    if (currentState === 'rejetee') {
      const stageOrder = getLifecycleStageInfo(stage).order;
      return stageOrder <= 5 ? 'completed' : 'remaining';
    }
    if (currentState === 'pieces_a_completer') {
      const stageOrder = getLifecycleStageInfo(stage).order;
      if (stageOrder < 3) return 'completed';
      return 'remaining';
    }
    if (currentState === 'liste_attente') {
      const stageOrder = getLifecycleStageInfo(stage).order;
      if (stageOrder < 8) return 'completed';
      return 'remaining';
    }
    const currentIdx = ORDERED_MAIN_PATH.indexOf(currentState);
    const stageIdx = ORDERED_MAIN_PATH.indexOf(stage);
    if (stageIdx !== -1 && currentIdx !== -1) {
      if (stageIdx < currentIdx) return 'completed';
      if (stageIdx === currentIdx) return 'current';
    }
    return 'remaining';
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-4">
      {/* Header status summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div>
          <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            Cycle de Vie Officiel de la Candidature
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${currentInfo.colorClass}`}>
              {currentInfo.label}
            </span>
            {currentState === 'pieces_a_completer' && (
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Action du candidat requise
              </span>
            )}
            {currentState === 'rejetee' && (
              <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> État terminal
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md">
          {currentInfo.description}
        </p>
      </div>

      {/* Visual Stepper Track */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-2 min-w-[680px]">
          {ORDERED_MAIN_PATH.map((stage, idx) => {
            const info = getLifecycleStageInfo(stage);
            const status = getStepStatus(stage);
            return (
              <div key={stage} className="flex-1 flex flex-col items-center text-center relative">
                <div className="flex items-center w-full justify-center">
                  {idx > 0 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        status === 'completed' || status === 'current'
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-stone-200 dark:bg-stone-800'
                      }`}
                    />
                  )}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0 transition-all tabular-nums ${
                      status === 'completed'
                        ? 'bg-emerald-700 text-white border-emerald-700 dark:bg-emerald-600 dark:border-emerald-600'
                        : status === 'current'
                        ? 'bg-teal-700 text-white border-teal-700 ring-4 ring-teal-600/20 dark:bg-teal-600 dark:border-teal-500'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === 'current' ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < ORDERED_MAIN_PATH.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        status === 'completed'
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-stone-200 dark:bg-stone-800'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[10px] leading-tight px-1 ${
                    status === 'current'
                      ? 'font-bold text-teal-800 dark:text-teal-300'
                      : status === 'completed'
                      ? 'font-semibold text-emerald-800 dark:text-emerald-400'
                      : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {info.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guarded Transitions Available to Current Actor */}
      {onTriggerTransition && availableTransitions.length > 0 && (
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <div className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
            Transitions autorisées pour votre profil :
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map((tr) => (
              <div key={`${tr.from}-${tr.to}`} className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={!tr.guardAllowed}
                  onClick={() => onTriggerTransition(tr.to)}
                  title={tr.guardReason || tr.label}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    !tr.guardAllowed
                      ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 border border-stone-200 dark:border-stone-700 cursor-not-allowed'
                      : tr.to === 'rejetee' || tr.to === 'pieces_a_completer'
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                      : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white'
                  }`}
                >
                  {tr.guardAllowed ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{tr.label}</span>
                </button>
                {!tr.guardAllowed && tr.guardReason && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 max-w-xs">
                    {tr.guardReason}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition History Log */}
      {!compact && application.transitionHistory && application.transitionHistory.length > 0 && (
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>Historique des transitions ({application.transitionHistory.length})</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {[...application.transitionHistory].reverse().map((h, i) => (
              <div
                key={`${h.timestamp}-${i}`}
                className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {getLifecycleStageInfo(h.toState).label}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400 ml-1.5">
                    par {h.actorName}
                  </span>
                  {h.comment && (
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 italic">
                      {h.comment}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-stone-400 shrink-0 tabular-nums">
                  {new Date(h.timestamp).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
