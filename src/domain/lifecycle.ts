import {
  ApplicationDocument,
  ApplicationState,
  Candidate,
  InterviewPv,
  Privilege,
  UserProfile
} from './types';
import { hasPrivilege } from './rbac';
import { checkAllRequiredDocumentsUploaded } from './documents';

export interface LifecycleStageInfo {
  state: ApplicationState;
  order: number;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  isTerminal?: boolean;
}

export const LIFECYCLE_STAGES: LifecycleStageInfo[] = [
  {
    state: 'brouillon',
    order: 1,
    label: 'Brouillon en cours',
    shortLabel: 'Brouillon',
    description: 'Le candidat complète son profil académique et dépose ses pièces justificatives.',
    colorClass: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
  },
  {
    state: 'soumise',
    order: 2,
    label: 'Candidature Soumise',
    shortLabel: 'Soumise',
    description: 'Dossier soumis par le candidat, en attente de contrôle de recevabilité documentaire.',
    colorClass: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800'
  },
  {
    state: 'verification_docs',
    order: 3,
    label: 'Vérification Documentaire',
    shortLabel: 'Vérif. Docs',
    description: 'Contrôle de conformité des diplômes, relevés de notes, CIN et projet de recherche.',
    colorClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-800'
  },
  {
    state: 'pieces_a_completer',
    order: 3,
    label: 'Pièces à Compléter / Remplacer',
    shortLabel: 'Corrections',
    description: 'Un ou plusieurs documents ont été rejetés ou nécessitent des informations complémentaires.',
    colorClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
  },
  {
    state: 'examen_encadrement',
    order: 4,
    label: 'Examen Scientifique (Encadrement)',
    shortLabel: 'Encadrement',
    description: 'Évaluation du dossier par l’enseignant, le directeur de thèse et le co-encadrant.',
    colorClass: 'bg-stone-200/80 text-stone-900 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700'
  },
  {
    state: 'entretien_planifie',
    order: 5,
    label: 'Convoqué à l’Entretien Oral',
    shortLabel: 'Entretien Oral',
    description: 'Entretien scientifique programmé devant la commission de sélection.',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  },
  {
    state: 'evaluee',
    order: 6,
    label: 'Évaluée (PV Rédigé)',
    shortLabel: 'Évaluée',
    description: 'Procès-verbal d’entretien oral enregistré, prêt pour transmission au Directeur de Structure.',
    colorClass: 'bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800'
  },
  {
    state: 'validation_structure',
    order: 7,
    label: 'Visa Direction de Structure',
    shortLabel: 'Visa Structure',
    description: 'Dossier et PV transmis au Directeur de la Structure de Recherche pour décision officielle.',
    colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    state: 'liste_principale',
    order: 8,
    label: 'Admis sur Liste Principale',
    shortLabel: 'Liste Principale',
    description: 'Candidat retenu. Doit déposer la fiche d’inscription signée physiquement.',
    colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    state: 'liste_attente',
    order: 8,
    label: 'Liste d’Attente',
    shortLabel: 'Liste d’Attente',
    description: 'Candidat classé en liste d’attente selon le mérite scientifique.',
    colorClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
  },
  {
    state: 'inscription_validee',
    order: 9,
    label: 'Inscription Doctorale Définitive',
    shortLabel: 'Inscrit',
    description: 'Inscription administrative confirmée après dépôt du dossier signé physiquement.',
    colorClass: 'bg-emerald-700 text-white border-emerald-800 dark:bg-emerald-600 dark:border-emerald-500',
    isTerminal: true
  },
  {
    state: 'rejetee',
    order: 9,
    label: 'Candidature Rejetée',
    shortLabel: 'Rejetée',
    description: 'Candidature non retenue à l’issue de la procédure de sélection.',
    colorClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
    isTerminal: true
  }
];

export interface TransitionRule {
  from: ApplicationState;
  to: ApplicationState;
  event: string;
  label: string;
  requiredPrivilege: Privilege;
  guard?: (ctx: {
    application: Candidate;
    documents: ApplicationDocument[];
    pvs: InterviewPv[];
  }) => { allowed: boolean; reason?: string };
}

export const APPLICATION_TRANSITIONS: TransitionRule[] = [
  {
    from: 'brouillon',
    to: 'soumise',
    event: 'SUBMIT_APPLICATION',
    label: 'Soumettre la candidature',
    requiredPrivilege: 'APPLICATION_SUBMIT',
    guard: ({ application, documents }) => {
      if (!application.cin?.trim() || !application.cne?.trim() || !application.fullName?.trim()) {
        return { allowed: false, reason: 'Identité incomplète (Nom, CIN et CNE obligatoires).' };
      }
      if (!application.subjectId) {
        return { allowed: false, reason: 'Au moins un sujet de thèse doit être sélectionné.' };
      }
      if (documents.length > 0) {
        const docCheck = checkAllRequiredDocumentsUploaded(documents);
        if (!docCheck.complete) {
          return {
            allowed: false,
            reason: `Pièces manquantes ou invalides : ${docCheck.missingLabels.join(', ')}`
          };
        }
      } else {
        const docs = application.documents;
        if (!docs.masterOriginal || !docs.bacOriginal || !docs.cinCopy) {
          return {
            allowed: false,
            reason: 'Veuillez déposer les pièces obligatoires (Master, Baccalauréat, CIN).'
          };
        }
      }
      return { allowed: true };
    }
  },
  {
    from: 'soumise',
    to: 'verification_docs',
    event: 'START_DOC_REVIEW',
    label: 'Démarrer la vérification documentaire',
    requiredPrivilege: 'DOCUMENT_VALIDATE'
  },
  {
    from: 'soumise',
    to: 'pieces_a_completer',
    event: 'REQUEST_CORRECTIONS',
    label: 'Demander compléments / corrections',
    requiredPrivilege: 'DOCUMENT_VALIDATE'
  },
  {
    from: 'verification_docs',
    to: 'pieces_a_completer',
    event: 'REQUEST_CORRECTIONS',
    label: 'Renvoyer pour pièces manquantes/rejetées',
    requiredPrivilege: 'DOCUMENT_VALIDATE'
  },
  {
    from: 'pieces_a_completer',
    to: 'soumise',
    event: 'RESUBMIT_APPLICATION',
    label: 'Re-soumettre le dossier corrigé',
    requiredPrivilege: 'APPLICATION_SUBMIT',
    guard: ({ documents }) => {
      const rejected = documents.filter((d) => d.status === 'rejected');
      if (rejected.length > 0) {
        return {
          allowed: false,
          reason: `Veuillez d'abord remplacer les documents rejetés (${rejected.map((r) => r.label).join(', ')}).`
        };
      }
      return { allowed: true };
    }
  },
  {
    from: 'verification_docs',
    to: 'examen_encadrement',
    event: 'TRANSMIT_TO_SUPERVISOR',
    label: 'Transmettre à l’encadrement',
    requiredPrivilege: 'LIFECYCLE_ADVANCE',
    guard: ({ documents }) => {
      const rejected = documents.filter(
        (d) => d.status === 'rejected' || d.status === 'additional_info_required'
      );
      if (rejected.length > 0) {
        return {
          allowed: false,
          reason: 'Impossible de transmettre tant que des pièces sont rejetées ou en attente de complément.'
        };
      }
      return { allowed: true };
    }
  },
  {
    from: 'soumise',
    to: 'examen_encadrement',
    event: 'TRANSMIT_TO_SUPERVISOR',
    label: 'Transmettre directement à l’encadrement',
    requiredPrivilege: 'LIFECYCLE_ADVANCE'
  },
  {
    from: 'examen_encadrement',
    to: 'entretien_planifie',
    event: 'SCHEDULE_INTERVIEW',
    label: 'Convoquer à l’entretien oral',
    requiredPrivilege: 'INTERVIEW_SCHEDULE'
  },
  {
    from: 'entretien_planifie',
    to: 'evaluee',
    event: 'RECORD_PV',
    label: 'Enregistrer le PV d’entretien',
    requiredPrivilege: 'PV_WRITE',
    guard: ({ application, pvs }) => {
      const hasPv = pvs.some((p) => p.candidateId === application.id);
      if (!hasPv && application.oralNote === undefined) {
        return {
          allowed: false,
          reason: 'Un procès-verbal (PV) d’entretien avec note orale doit être saisi.'
        };
      }
      return { allowed: true };
    }
  },
  {
    from: 'evaluee',
    to: 'validation_structure',
    event: 'TRANSMIT_TO_STRUCTURE',
    label: 'Transmettre au Directeur de Structure',
    requiredPrivilege: 'LIFECYCLE_ADVANCE'
  },
  {
    from: 'validation_structure',
    to: 'liste_principale',
    event: 'APPROVE_PRINCIPAL',
    label: 'Admettre sur Liste Principale',
    requiredPrivilege: 'PV_VALIDATE_STRUCTURE'
  },
  {
    from: 'validation_structure',
    to: 'liste_attente',
    event: 'PLACE_WAITLIST',
    label: 'Classer en Liste d’Attente',
    requiredPrivilege: 'PV_VALIDATE_STRUCTURE'
  },
  {
    from: 'liste_attente',
    to: 'liste_principale',
    event: 'PROMOTE_FROM_WAITLIST',
    label: 'Promouvoir sur Liste Principale',
    requiredPrivilege: 'PV_VALIDATE_STRUCTURE'
  },
  {
    from: 'liste_principale',
    to: 'inscription_validee',
    event: 'FINALIZE_REGISTRATION',
    label: 'Valider l’Inscription Définitive',
    requiredPrivilege: 'LIFECYCLE_ADVANCE',
    guard: ({ application }) => {
      if (!application.physicalSignedScanUploaded && !application.otpSigned) {
        return {
          allowed: false,
          reason: 'Le scan de la fiche d’inscription signée physiquement (ou scellée) est requis.'
        };
      }
      return { allowed: true };
    }
  },
  // Rejection transitions (strictly gated by LIFECYCLE_REJECT)
  {
    from: 'verification_docs',
    to: 'rejetee',
    event: 'REJECT_APPLICATION',
    label: 'Rejeter (Non-recevable)',
    requiredPrivilege: 'LIFECYCLE_REJECT'
  },
  {
    from: 'examen_encadrement',
    to: 'rejetee',
    event: 'REJECT_APPLICATION',
    label: 'Rejeter la candidature',
    requiredPrivilege: 'LIFECYCLE_REJECT'
  },
  {
    from: 'evaluee',
    to: 'rejetee',
    event: 'REJECT_APPLICATION',
    label: 'Rejeter après entretien',
    requiredPrivilege: 'LIFECYCLE_REJECT'
  },
  {
    from: 'validation_structure',
    to: 'rejetee',
    event: 'REJECT_APPLICATION',
    label: 'Rejeter (Décision Structure)',
    requiredPrivilege: 'LIFECYCLE_REJECT'
  }
];

export function getLifecycleStageInfo(state: ApplicationState): LifecycleStageInfo {
  return (
    LIFECYCLE_STAGES.find((s) => s.state === state) || LIFECYCLE_STAGES[0]
  );
}

export function mapLegacyStatusToLifecycleState(status: Candidate['status']): ApplicationState {
  switch (status) {
    case 'en_attente':
      return 'soumise';
    case 'convoque_oral':
      return 'entretien_planifie';
    case 'liste_principale':
      return 'liste_principale';
    case 'liste_attente':
      return 'liste_attente';
    case 'inscrit_valide':
      return 'inscription_validee';
    case 'rejete':
      return 'rejetee';
    default:
      return 'soumise';
  }
}

export function mapLifecycleStateToLegacyStatus(state: ApplicationState): Candidate['status'] {
  switch (state) {
    case 'brouillon':
    case 'soumise':
    case 'verification_docs':
    case 'pieces_a_completer':
    case 'examen_encadrement':
      return 'en_attente';
    case 'entretien_planifie':
    case 'evaluee':
    case 'validation_structure':
      return 'convoque_oral';
    case 'liste_principale':
      return 'liste_principale';
    case 'liste_attente':
      return 'liste_attente';
    case 'inscription_validee':
      return 'inscrit_valide';
    case 'rejetee':
      return 'rejete';
  }
}

export function canTransitionApplication(params: {
  user: Pick<UserProfile, 'roles' | 'active'> | null | undefined;
  application: Candidate;
  targetState: ApplicationState;
  documents: ApplicationDocument[];
  pvs: InterviewPv[];
}): { allowed: boolean; rule?: TransitionRule; reason?: string } {
  const currentState =
    params.application.lifecycleState ||
    mapLegacyStatusToLifecycleState(params.application.status);

  const rule = APPLICATION_TRANSITIONS.find(
    (t) => t.from === currentState && t.to === params.targetState
  );

  if (!rule) {
    return {
      allowed: false,
      reason: `Transition interdite : impossible de passer directement de "${getLifecycleStageInfo(currentState).label}" à "${getLifecycleStageInfo(params.targetState).label}".`
    };
  }

  if (!hasPrivilege(params.user, rule.requiredPrivilege)) {
    return {
      allowed: false,
      rule,
      reason: `Privilège insuffisant (${rule.requiredPrivilege} requis pour cette opération).`
    };
  }

  if (rule.guard) {
    const guardResult = rule.guard({
      application: params.application,
      documents: params.documents,
      pvs: params.pvs
    });
    if (!guardResult.allowed) {
      return {
        allowed: false,
        rule,
        reason: guardResult.reason
      };
    }
  }

  return { allowed: true, rule };
}

export function getAvailableTransitionsForUser(params: {
  user: Pick<UserProfile, 'roles' | 'active'> | null | undefined;
  application: Candidate;
  documents: ApplicationDocument[];
  pvs: InterviewPv[];
}): Array<TransitionRule & { guardAllowed: boolean; guardReason?: string }> {
  const currentState =
    params.application.lifecycleState ||
    mapLegacyStatusToLifecycleState(params.application.status);

  return APPLICATION_TRANSITIONS.filter(
    (t) => t.from === currentState && hasPrivilege(params.user, t.requiredPrivilege)
  ).map((rule) => {
    const check = rule.guard
      ? rule.guard({
          application: params.application,
          documents: params.documents,
          pvs: params.pvs
        })
      : { allowed: true };

    return {
      ...rule,
      guardAllowed: check.allowed,
      guardReason: check.reason
    };
  });
}
