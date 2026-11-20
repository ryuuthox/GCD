import {
  ApplicationDocument,
  ApplicationState,
  AuditActionType,
  AuditLogEntry,
  Candidate,
  DoctoralCalendarEvent,
  DoctoralSubject,
  DocumentTypeKey,
  DocumentValidationStatus,
  GcdRole,
  InterviewPv,
  ManualRelance,
  NotificationCategory,
  NotificationItem,
  NotificationStatus,
  ReRegistration,
  UserAccount,
  UserProfile
} from '../domain/types';
import { hasPrivilege, normalizeRoles } from '../domain/rbac';
import {
  getDocumentConfig,
  INLINE_PREVIEW_MAX_BYTES,
  validateFileForDocumentType
} from '../domain/documents';
import {
  canTransitionApplication,
  getLifecycleStageInfo,
  mapLegacyStatusToLifecycleState,
  mapLifecycleStateToLegacyStatus
} from '../domain/lifecycle';
import {
  validateDocumentMetadataOnServer,
  validateDocumentReviewOnServer,
  validateTransitionOnServer
} from '../infrastructure/apiClient';
import {
  appendAuditLogDoc,
  deleteCalendarEventDoc,
  saveApplicationDocumentDoc,
  saveCalendarEventDoc,
  saveCandidateDoc,
  saveInterviewPvDoc,
  saveNotificationDoc,
  saveRelanceDoc,
  saveReRegistrationDoc,
  saveSubjectDoc,
  saveUserAccountDoc
} from '../infrastructure/firestoreService';

export interface UseCaseResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
  auditEntry?: AuditLogEntry;
  notifications?: NotificationItem[];
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function createAuditEntry(params: {
  actor: UserProfile;
  action: AuditActionType;
  actionLabel: string;
  targetType: AuditLogEntry['targetType'];
  targetId: string;
  targetLabel: string;
  details: string;
  previousState?: string;
  newState?: string;
}): AuditLogEntry {
  return {
    id: makeId('AUD'),
    timestamp: new Date().toISOString(),
    actorUid: params.actor.uid,
    actorName: params.actor.fullName,
    actorEmail: params.actor.email,
    actorRoles: normalizeRoles(params.actor.roles),
    action: params.action,
    actionLabel: params.actionLabel,
    targetType: params.targetType,
    targetId: params.targetId,
    targetLabel: params.targetLabel,
    details: params.details,
    previousState: params.previousState,
    newState: params.newState
  };
}

export function createNotificationItem(params: {
  recipientUid?: string;
  recipientEmail?: string;
  recipientRole?: GcdRole;
  triggerEvent: string;
  title: string;
  content: string;
  category: NotificationCategory;
  relatedTargetType?: NotificationItem['relatedTargetType'];
  relatedTargetId?: string;
  targetSection?: NotificationItem['targetSection'];
  actionLabel?: string;
}): NotificationItem {
  return {
    id: makeId('NOTIF'),
    recipientUid: params.recipientUid,
    recipientEmail: params.recipientEmail?.trim().toLowerCase(),
    recipientRole: params.recipientRole,
    triggerEvent: params.triggerEvent,
    title: params.title,
    content: params.content,
    category: params.category,
    status: 'unread',
    createdAt: new Date().toISOString(),
    relatedTargetType: params.relatedTargetType,
    relatedTargetId: params.relatedTargetId,
    targetSection: params.targetSection,
    actionLabel: params.actionLabel
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier sélectionné.'));
    reader.readAsDataURL(file);
  });
}

export async function saveApplicationProfileUseCase(params: {
  actor: UserProfile;
  application: Candidate;
  isNew?: boolean;
}): Promise<UseCaseResult<Candidate>> {
  const safeUid = params.application.userId || params.actor.uid;
  const safeId =
    params.application.userId === params.actor.uid || params.actor.roles.includes('admin')
      ? params.application.id
      : `CAND-${params.actor.uid.slice(0, 8).toUpperCase()}`;

  const updated: Candidate = {
    ...params.application,
    id: safeId,
    userId: safeUid,
    fullName: params.application.fullName?.trim() || params.actor.fullName || 'Candidat',
    cin: params.application.cin?.trim() || 'À compléter',
    email: (params.application.email || params.actor.email).trim().toLowerCase(),
    lifecycleState:
      params.application.lifecycleState || mapLegacyStatusToLifecycleState(params.application.status),
    lastModifiedAt: new Date().toISOString()
  };

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: params.isNew ? 'APPLICATION_CREATED' : 'APPLICATION_MODIFIED',
    actionLabel: params.isNew ? 'Création du dossier de candidature' : 'Modification du dossier de candidature',
    targetType: 'application',
    targetId: updated.id,
    targetLabel: `${updated.fullName} (#${updated.subjectId})`,
    details: `Mise à jour des données académiques et des vœux de recherche (${updated.selectedSubjects?.length || 1} vœu(x)).`
  });

  await saveCandidateDoc(updated);
  void appendAuditLogDoc(auditEntry);

  return { ok: true, data: updated, auditEntry };
}

export async function transitionApplicationStateUseCase(params: {
  actor: UserProfile;
  application: Candidate;
  targetState: ApplicationState;
  documents: ApplicationDocument[];
  pvs: InterviewPv[];
  comment?: string;
}): Promise<UseCaseResult<Candidate>> {
  const localCheck = canTransitionApplication({
    user: params.actor,
    application: params.application,
    targetState: params.targetState,
    documents: params.documents,
    pvs: params.pvs
  });

  if (!localCheck.allowed) {
    return { ok: false, error: localCheck.reason || 'Transition non autorisée.' };
  }

  // Backend authorization and rule check
  try {
    const serverCheck = await validateTransitionOnServer({
      user: { roles: params.actor.roles, active: params.actor.active },
      application: params.application,
      targetState: params.targetState,
      documents: params.documents,
      pvs: params.pvs
    });
    if (!serverCheck.allowed) {
      return { ok: false, error: serverCheck.reason || 'Transition refusée par le serveur.' };
    }
  } catch (err) {
    console.warn('Server transition validation unavailable, using local domain validation:', err);
  }

  const prevState =
    params.application.lifecycleState || mapLegacyStatusToLifecycleState(params.application.status);
  const nextStageInfo = getLifecycleStageInfo(params.targetState);

  const historyEntry = {
    fromState: prevState,
    toState: params.targetState,
    event: localCheck.rule?.event || 'STATE_CHANGE',
    actorUid: params.actor.uid,
    actorName: params.actor.fullName,
    actorRoles: normalizeRoles(params.actor.roles),
    timestamp: new Date().toISOString(),
    comment: params.comment
  };

  const updated: Candidate = {
    ...params.application,
    lifecycleState: params.targetState,
    status: mapLifecycleStateToLegacyStatus(params.targetState),
    lastModifiedAt: new Date().toISOString(),
    transitionHistory: [...(params.application.transitionHistory || []), historyEntry]
  };

  await saveCandidateDoc(updated);

  let auditAction: AuditActionType = 'APPLICATION_MODIFIED';
  if (params.targetState === 'soumise') auditAction = 'APPLICATION_SUBMITTED';
  else if (params.targetState === 'rejetee') auditAction = 'APPLICATION_REJECTED';
  else if (params.targetState === 'examen_encadrement' || params.targetState === 'validation_structure') {
    auditAction = 'APPLICATION_TRANSMITTED';
  } else if (
    params.targetState === 'liste_principale' ||
    params.targetState === 'inscription_validee'
  ) {
    auditAction = 'APPLICATION_VALIDATED';
  }

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: auditAction,
    actionLabel: localCheck.rule?.label || `Transition vers ${nextStageInfo.label}`,
    targetType: 'application',
    targetId: updated.id,
    targetLabel: `${updated.fullName} (#${updated.subjectId})`,
    details: params.comment || `État modifié de "${getLifecycleStageInfo(prevState).label}" vers "${nextStageInfo.label}".`,
    previousState: prevState,
    newState: params.targetState
  });

  const notifications: NotificationItem[] = [];

  if (params.actor.email.toLowerCase() !== updated.email.toLowerCase()) {
    const isActionNeeded =
      params.targetState === 'pieces_a_completer' || params.targetState === 'liste_principale';
    notifications.push(
      createNotificationItem({
        recipientUid: updated.userId,
        recipientEmail: updated.email,
        recipientRole: 'candidat',
        triggerEvent: localCheck.rule?.event || 'STATUS_CHANGED',
        title: `Statut du dossier mis à jour : ${nextStageInfo.label}`,
        content:
          params.targetState === 'liste_principale'
            ? `Félicitations ! Votre candidature au sujet #${updated.subjectId} est admise sur Liste Principale. Veuillez télécharger, signer physiquement et déposer la fiche d'inscription.`
            : params.targetState === 'pieces_a_completer'
            ? `Des compléments ou remplacements de documents sont requis pour votre dossier (${params.comment || 'voir détails'}).`
            : `Votre dossier est passé à l'étape "${nextStageInfo.label}".`,
        category: isActionNeeded ? 'action_required' : 'informational',
        relatedTargetType: 'application',
        relatedTargetId: updated.id,
        targetSection: 'mon_dossier',
        actionLabel: isActionNeeded ? 'Compléter mon dossier' : 'Voir le suivi'
      })
    );
  }

  if (params.targetState === 'soumise') {
    notifications.push(
      createNotificationItem({
        recipientEmail: 'driss.alaoui@usmba.ac.ma',
        recipientRole: 'directeur_these',
        triggerEvent: 'APPLICATION_SUBMITTED',
        title: `Nouvelle candidature soumise : ${updated.fullName}`,
        content: `Le candidat ${updated.fullName} a soumis son dossier pour le sujet "${updated.subjectTitle}". Vérification documentaire requise.`,
        category: 'action_required',
        relatedTargetType: 'application',
        relatedTargetId: updated.id,
        targetSection: 'candidatures_encadrant',
        actionLabel: 'Examiner le dossier'
      })
    );
  } else if (params.targetState === 'validation_structure') {
    notifications.push(
      createNotificationItem({
        recipientEmail: 'directeur.lsig@usmba.ac.ma',
        recipientRole: 'directeur_structure',
        triggerEvent: 'TRANSMIT_TO_STRUCTURE',
        title: `Dossier & PV en attente de visa Structure : ${updated.fullName}`,
        content: `Le dossier évalué de ${updated.fullName} est transmis à la Direction de Structure pour validation officielle.`,
        category: 'action_required',
        relatedTargetType: 'application',
        relatedTargetId: updated.id,
        targetSection: 'validation_pv',
        actionLabel: 'Accorder le visa'
      })
    );
  }

  void Promise.all([
    appendAuditLogDoc(auditEntry),
    ...notifications.map((n) => saveNotificationDoc(n))
  ]);

  return { ok: true, data: updated, auditEntry, notifications };
}

export async function uploadApplicationDocumentUseCase(params: {
  actor: UserProfile;
  application: Candidate;
  docType: DocumentTypeKey;
  file: File;
}): Promise<UseCaseResult<{ document: ApplicationDocument; updatedCandidate: Candidate }>> {
  if (
    !hasPrivilege(params.actor, 'DOCUMENT_UPLOAD_OWN') &&
    !hasPrivilege(params.actor, 'DOCUMENT_VALIDATE')
  ) {
    return { ok: false, error: 'Privilège insuffisant pour téléverser une pièce justificative.' };
  }

  const localValidation = validateFileForDocumentType(params.file, params.docType);
  if (!localValidation.valid) {
    return { ok: false, error: localValidation.error };
  }

  try {
    const serverCheck = await validateDocumentMetadataOnServer({
      user: { roles: params.actor.roles, active: params.actor.active },
      docType: params.docType,
      fileName: params.file.name,
      mimeType: params.file.type || 'application/pdf',
      fileSizeBytes: params.file.size
    });
    if (!serverCheck.valid) {
      return { ok: false, error: serverCheck.error };
    }
  } catch {
    // Allow local domain validation if offline
  }

  const config = getDocumentConfig(params.docType);
  let previewDataUrl: string | undefined;
  if (params.file.size <= INLINE_PREVIEW_MAX_BYTES) {
    previewDataUrl = await readFileAsDataUrl(params.file);
  } else {
    previewDataUrl = URL.createObjectURL(params.file);
  }

  const docRecord: ApplicationDocument = {
    id: makeId('DOC'),
    applicationId: params.application.id,
    docType: params.docType,
    label: config.label,
    fileName: params.file.name,
    mimeType: params.file.type || 'application/pdf',
    fileSizeBytes: params.file.size,
    uploadedByUid: params.actor.uid,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
    previewDataUrl
  };

  // Persist Firestore-safe copy (strip blob: URLs from Firestore while keeping in-memory state previewable)
  const firestoreDocRecord: ApplicationDocument = {
    ...docRecord,
    previewDataUrl:
      previewDataUrl && previewDataUrl.startsWith('data:') ? previewDataUrl : undefined
  };
  const updatedCandidate: Candidate = {
    ...params.application,
    physicalSignedScanUploaded:
      params.docType === 'ficheSigneePhysique'
        ? true
        : params.application.physicalSignedScanUploaded,
    documents: {
      ...params.application.documents,
      [params.docType]: true
    },
    lastModifiedAt: new Date().toISOString()
  };

  await Promise.all([
    saveApplicationDocumentDoc(firestoreDocRecord),
    saveCandidateDoc(updatedCandidate)
  ]);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'DOCUMENT_UPLOADED',
    actionLabel: 'Téléversement de pièce justificative',
    targetType: 'document',
    targetId: docRecord.id,
    targetLabel: `${config.label} (${params.file.name})`,
    details: `Fichier ${params.file.name} (${params.file.type}, ${params.file.size} octets) déposé sur le dossier ${params.application.id}.`
  });

  const notif = createNotificationItem({
    recipientEmail: 'driss.alaoui@usmba.ac.ma',
    recipientRole: 'directeur_these',
    triggerEvent: 'DOCUMENT_UPLOADED',
    title: `Nouveau document déposé par ${params.application.fullName}`,
    content: `La pièce "${config.label}" (${params.file.name}) a été téléversée et attend vérification.`,
    category: 'informational',
    relatedTargetType: 'document',
    relatedTargetId: docRecord.id,
    targetSection: 'candidatures_encadrant',
    actionLabel: 'Vérifier la pièce'
  });

  void Promise.all([appendAuditLogDoc(auditEntry), saveNotificationDoc(notif)]);

  return {
    ok: true,
    data: { document: docRecord, updatedCandidate },
    auditEntry,
    notifications: [notif]
  };
}

export async function reviewApplicationDocumentUseCase(params: {
  actor: UserProfile;
  document: ApplicationDocument;
  application: Candidate;
  status: DocumentValidationStatus;
  rejectionReason?: string;
}): Promise<UseCaseResult<{ document: ApplicationDocument; updatedCandidate?: Candidate }>> {
  if (!hasPrivilege(params.actor, 'DOCUMENT_VALIDATE')) {
    return {
      ok: false,
      error: 'Privilège DOCUMENT_VALIDATE requis pour valider ou rejeter une pièce.'
    };
  }

  if (
    (params.status === 'rejected' || params.status === 'additional_info_required') &&
    (!params.rejectionReason || params.rejectionReason.trim().length < 5)
  ) {
    return {
      ok: false,
      error: 'Veuillez préciser un motif détaillé (minimum 5 caractères) pour le candidat.'
    };
  }

  try {
    const serverCheck = await validateDocumentReviewOnServer({
      user: { roles: params.actor.roles, active: params.actor.active },
      status: params.status,
      rejectionReason: params.rejectionReason
    });
    if (!serverCheck.valid) {
      return { ok: false, error: serverCheck.error };
    }
  } catch {
    // Offline fallback uses local check above
  }

  const updatedDoc: ApplicationDocument = {
    ...params.document,
    status: params.status,
    reviewerUid: params.actor.uid,
    reviewerName: params.actor.fullName,
    reviewedAt: new Date().toISOString(),
    rejectionReason:
      params.status === 'validated' ? undefined : params.rejectionReason?.trim()
  };

  const writes: Promise<unknown>[] = [
    saveApplicationDocumentDoc({
      ...updatedDoc,
      previewDataUrl:
        updatedDoc.previewDataUrl && updatedDoc.previewDataUrl.startsWith('data:')
          ? updatedDoc.previewDataUrl
          : undefined
    })
  ];

  let updatedCandidate: Candidate | undefined;
  const currentState =
    params.application.lifecycleState || mapLegacyStatusToLifecycleState(params.application.status);

  if (
    (params.status === 'rejected' || params.status === 'additional_info_required') &&
    (currentState === 'soumise' ||
      currentState === 'verification_docs' ||
      currentState === 'examen_encadrement')
  ) {
    updatedCandidate = {
      ...params.application,
      lifecycleState: 'pieces_a_completer',
      status: mapLifecycleStateToLegacyStatus('pieces_a_completer'),
      lastModifiedAt: new Date().toISOString(),
      transitionHistory: [
        ...(params.application.transitionHistory || []),
        {
          fromState: currentState,
          toState: 'pieces_a_completer',
          event: 'DOCUMENT_COMPLIANCE_ISSUE',
          actorUid: params.actor.uid,
          actorName: params.actor.fullName,
          actorRoles: normalizeRoles(params.actor.roles),
          timestamp: new Date().toISOString(),
          comment: `${params.document.label} : ${params.rejectionReason}`
        }
      ]
    };
    writes.push(saveCandidateDoc(updatedCandidate));
  }

  await Promise.all(writes);

  const auditAction: AuditActionType =
    params.status === 'validated'
      ? 'DOCUMENT_VALIDATED'
      : params.status === 'rejected'
      ? 'DOCUMENT_REJECTED'
      : 'DOCUMENT_REPLACEMENT_REQUESTED';

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: auditAction,
    actionLabel:
      params.status === 'validated'
        ? 'Validation de pièce justificative'
        : params.status === 'rejected'
        ? 'Rejet de pièce justificative'
        : 'Demande de complément documentaire',
    targetType: 'document',
    targetId: updatedDoc.id,
    targetLabel: `${updatedDoc.label} — ${params.application.fullName}`,
    details:
      params.status === 'validated'
        ? `Pièce "${updatedDoc.fileName}" approuvée conforme.`
        : `Motif communiqué au candidat : ${params.rejectionReason}`
  });

  const notifications: NotificationItem[] = [];
  if (params.status === 'rejected' || params.status === 'additional_info_required') {
    notifications.push(
      createNotificationItem({
        recipientUid: params.application.userId,
        recipientEmail: params.application.email,
        recipientRole: 'candidat',
        triggerEvent: auditAction,
        title:
          params.status === 'rejected'
            ? `Document rejeté : ${updatedDoc.label}`
            : `Information complémentaire requise : ${updatedDoc.label}`,
        content: `Motif : ${params.rejectionReason}. Veuillez déposer un nouveau document conforme dans votre dossier.`,
        category: 'action_required',
        relatedTargetType: 'document',
        relatedTargetId: updatedDoc.id,
        targetSection: 'mon_dossier',
        actionLabel: 'Remplacer le document'
      })
    );
  } else if (params.status === 'validated') {
    notifications.push(
      createNotificationItem({
        recipientUid: params.application.userId,
        recipientEmail: params.application.email,
        recipientRole: 'candidat',
        triggerEvent: 'DOCUMENT_VALIDATED',
        title: `Pièce validée : ${updatedDoc.label}`,
        content: `Votre document "${updatedDoc.fileName}" a été validé par ${params.actor.fullName}.`,
        category: 'informational',
        relatedTargetType: 'document',
        relatedTargetId: updatedDoc.id,
        targetSection: 'mon_dossier'
      })
    );
  }

  void Promise.all([
    appendAuditLogDoc(auditEntry),
    ...notifications.map((n) => saveNotificationDoc(n))
  ]);

  return { ok: true, data: { document: updatedDoc, updatedCandidate }, auditEntry, notifications };
}

export async function submitPvUseCase(params: {
  actor: UserProfile;
  pv: InterviewPv;
  application: Candidate;
}): Promise<UseCaseResult<{ pv: InterviewPv; updatedCandidate: Candidate }>> {
  if (!hasPrivilege(params.actor, 'PV_WRITE')) {
    return { ok: false, error: 'Privilège PV_WRITE requis pour rédiger un PV d’entretien.' };
  }

  const pvRecord: InterviewPv = {
    ...params.pv,
    supervisorUid: params.actor.uid,
    submittedBySupervisor: true
  };

  const currentState =
    params.application.lifecycleState || mapLegacyStatusToLifecycleState(params.application.status);
  const nextState: ApplicationState = 'validation_structure';

  const updatedCandidate: Candidate = {
    ...params.application,
    oralNote: pvRecord.oralGrade,
    lifecycleState: nextState,
    status: mapLifecycleStateToLegacyStatus(nextState),
    lastModifiedAt: new Date().toISOString(),
    transitionHistory: [
      ...(params.application.transitionHistory || []),
      {
        fromState: currentState,
        toState: nextState,
        event: 'RECORD_PV_AND_TRANSMIT',
        actorUid: params.actor.uid,
        actorName: params.actor.fullName,
        actorRoles: normalizeRoles(params.actor.roles),
        timestamp: new Date().toISOString(),
        comment: `PV ${pvRecord.id} (${pvRecord.oralGrade}/20, ${pvRecord.decision}) transmis au Directeur de Structure.`
      }
    ]
  };

  await Promise.all([saveInterviewPvDoc(pvRecord), saveCandidateDoc(updatedCandidate)]);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'PV_SUBMITTED',
    actionLabel: 'Rédaction & transmission du PV d’entretien',
    targetType: 'pv',
    targetId: pvRecord.id,
    targetLabel: `${pvRecord.candidateName} (${pvRecord.oralGrade}/20)`,
    details: `Décision proposée : ${pvRecord.decision}. Transmis au Directeur de Structure pour visa.`,
    previousState: currentState,
    newState: nextState
  });

  const notif = createNotificationItem({
    recipientEmail: 'directeur.lsig@usmba.ac.ma',
    recipientRole: 'directeur_structure',
    triggerEvent: 'PV_SUBMITTED',
    title: `PV d’entretien à viser : ${pvRecord.candidateName} (#${pvRecord.id})`,
    content: `${params.actor.fullName} a enregistré la note d’oral (${pvRecord.oralGrade}/20 - ${pvRecord.decision}). Votre visa de structure est requis.`,
    category: 'action_required',
    relatedTargetType: 'pv',
    relatedTargetId: pvRecord.id,
    targetSection: 'validation_pv',
    actionLabel: 'Viser le PV'
  });

  void Promise.all([appendAuditLogDoc(auditEntry), saveNotificationDoc(notif)]);

  return { ok: true, data: { pv: pvRecord, updatedCandidate }, auditEntry, notifications: [notif] };
}

export async function validatePvUseCase(params: {
  actor: UserProfile;
  pv: InterviewPv;
  application?: Candidate;
  comments?: string;
}): Promise<UseCaseResult<{ pv: InterviewPv; updatedCandidate?: Candidate }>> {
  if (!hasPrivilege(params.actor, 'PV_VALIDATE_STRUCTURE')) {
    return { ok: false, error: 'Privilège PV_VALIDATE_STRUCTURE requis pour viser un PV.' };
  }

  const today = new Date().toLocaleDateString('fr-FR');
  const updatedPv: InterviewPv = {
    ...params.pv,
    validatedByStructure: true,
    validatedByUid: params.actor.uid,
    validationDate: today,
    structureComments: params.comments || 'Visa officiel accordé par la direction de structure.'
  };

  let updatedCandidate: Candidate | undefined;
  let targetState: ApplicationState = 'liste_principale';
  if (updatedPv.decision === 'liste_attente') targetState = 'liste_attente';
  if (updatedPv.decision === 'non_admis') targetState = 'rejetee';

  const writes: Promise<unknown>[] = [saveInterviewPvDoc(updatedPv)];
  if (params.application) {
    const prevState =
      params.application.lifecycleState || mapLegacyStatusToLifecycleState(params.application.status);
    updatedCandidate = {
      ...params.application,
      lifecycleState: targetState,
      status: mapLifecycleStateToLegacyStatus(targetState),
      lastModifiedAt: new Date().toISOString(),
      transitionHistory: [
        ...(params.application.transitionHistory || []),
        {
          fromState: prevState,
          toState: targetState,
          event: 'STRUCTURE_PV_VISA',
          actorUid: params.actor.uid,
          actorName: params.actor.fullName,
          actorRoles: normalizeRoles(params.actor.roles),
          timestamp: new Date().toISOString(),
          comment: updatedPv.structureComments
        }
      ]
    };
    writes.push(saveCandidateDoc(updatedCandidate));
  }
  await Promise.all(writes);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'PV_VALIDATED',
    actionLabel: 'Visa officiel du PV par la Structure',
    targetType: 'pv',
    targetId: updatedPv.id,
    targetLabel: `${updatedPv.candidateName} (${updatedPv.oralGrade}/20)`,
    details: updatedPv.structureComments || 'PV validé.',
    previousState: 'validation_structure',
    newState: targetState
  });

  const notifications: NotificationItem[] = [];
  if (params.application) {
    notifications.push(
      createNotificationItem({
        recipientUid: params.application.userId,
        recipientEmail: params.application.email,
        recipientRole: 'candidat',
        triggerEvent: 'PV_VALIDATED',
        title:
          targetState === 'liste_principale'
            ? 'Résultat officiel : Admis sur Liste Principale'
            : `Décision officielle : ${getLifecycleStageInfo(targetState).label}`,
        content:
          targetState === 'liste_principale'
            ? `Votre admission au sujet "${updatedPv.subjectTitle}" est confirmée. Imprimez et déposez votre fiche d'inscription signée physiquement.`
            : `La direction de structure a statué sur votre entretien oral : ${getLifecycleStageInfo(targetState).label}.`,
        category: targetState === 'liste_principale' ? 'action_required' : 'informational',
        relatedTargetType: 'application',
        relatedTargetId: params.application.id,
        targetSection: 'mon_dossier',
        actionLabel: targetState === 'liste_principale' ? 'Finaliser mon inscription' : 'Consulter'
      })
    );
  }

  void Promise.all([
    appendAuditLogDoc(auditEntry),
    ...notifications.map((n) => saveNotificationDoc(n))
  ]);

  return { ok: true, data: { pv: updatedPv, updatedCandidate }, auditEntry, notifications };
}

export async function proposeSubjectUseCase(params: {
  actor: UserProfile;
  subject: DoctoralSubject;
}): Promise<UseCaseResult<DoctoralSubject>> {
  if (!hasPrivilege(params.actor, 'SUBJECT_PROPOSE')) {
    return { ok: false, error: 'Privilège SUBJECT_PROPOSE requis pour déposer un sujet.' };
  }

  const record: DoctoralSubject = {
    ...params.subject,
    supervisorUid: params.actor.uid,
    supervisorEmail: params.subject.supervisorEmail || params.actor.email,
    status: 'en_attente_structure'
  };
  await saveSubjectDoc(record);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'SUBJECT_PROPOSED',
    actionLabel: 'Proposition de sujet doctoral',
    targetType: 'subject',
    targetId: record.id,
    targetLabel: record.title,
    details: `Sujet déposé pour ${record.labName} (${record.university}), en attente de validation structure.`,
    newState: 'en_attente_structure'
  });
  await appendAuditLogDoc(auditEntry);

  const notif = createNotificationItem({
    recipientEmail: 'directeur.lsig@usmba.ac.ma',
    recipientRole: 'directeur_structure',
    triggerEvent: 'SUBJECT_PROPOSED',
    title: `Nouveau sujet de thèse à valider (#${record.id})`,
    content: `${params.actor.fullName} propose le sujet "${record.title}". Validation requise avant publication au catalogue.`,
    category: 'action_required',
    relatedTargetType: 'subject',
    relatedTargetId: record.id,
    targetSection: 'validation_sujets',
    actionLabel: 'Valider le sujet'
  });
  await saveNotificationDoc(notif);

  return { ok: true, data: record, auditEntry, notifications: [notif] };
}

export async function validateSubjectUseCase(params: {
  actor: UserProfile;
  subject: DoctoralSubject;
  status: 'valide' | 'rejete';
}): Promise<UseCaseResult<DoctoralSubject>> {
  if (!hasPrivilege(params.actor, 'SUBJECT_VALIDATE_STRUCTURE')) {
    return {
      ok: false,
      error: 'Privilège SUBJECT_VALIDATE_STRUCTURE requis pour valider un sujet.'
    };
  }

  const updated: DoctoralSubject = {
    ...params.subject,
    status: params.status,
    structureApprovalDate: new Date().toLocaleDateString('fr-FR')
  };
  await saveSubjectDoc(updated);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: params.status === 'valide' ? 'SUBJECT_VALIDATED' : 'SUBJECT_REJECTED',
    actionLabel:
      params.status === 'valide' ? 'Validation d’un sujet doctoral' : 'Rejet d’un sujet doctoral',
    targetType: 'subject',
    targetId: updated.id,
    targetLabel: updated.title,
    details:
      params.status === 'valide'
        ? 'Sujet approuvé et publié dans le catalogue national.'
        : 'Sujet non retenu par la direction de structure.',
    previousState: params.subject.status,
    newState: params.status
  });
  await appendAuditLogDoc(auditEntry);

  const notif = createNotificationItem({
    recipientEmail: updated.supervisorEmail || 'driss.alaoui@usmba.ac.ma',
    recipientRole: 'directeur_these',
    triggerEvent: 'SUBJECT_DECISION',
    title:
      params.status === 'valide'
        ? `Sujet validé et publié : #${updated.id}`
        : `Sujet refusé : #${updated.id}`,
    content: `Votre sujet "${updated.title}" a reçu la décision : ${params.status}.`,
    category: 'informational',
    relatedTargetType: 'subject',
    relatedTargetId: updated.id,
    targetSection: 'mes_sujets'
  });
  await saveNotificationDoc(notif);

  return { ok: true, data: updated, auditEntry, notifications: [notif] };
}

export async function saveRelanceUseCase(params: {
  actor: UserProfile;
  relance: ManualRelance;
}): Promise<UseCaseResult<ManualRelance>> {
  if (!hasPrivilege(params.actor, 'NOTIFICATION_SEND')) {
    return { ok: false, error: 'Privilège NOTIFICATION_SEND requis pour envoyer une relance.' };
  }

  const record: ManualRelance = {
    ...params.relance,
    senderUid: params.actor.uid,
    senderName: params.actor.fullName
  };
  await saveRelanceDoc(record);

  const notif = createNotificationItem({
    recipientEmail: record.recipientEmail,
    recipientRole: record.recipientRole,
    triggerEvent: `RELANCE_${record.reason.toUpperCase()}`,
    title: `Relance officielle (${record.reason.replace(/_/g, ' ')})`,
    content: record.message,
    category: 'action_required',
    targetSection: record.recipientRole === 'candidat' ? 'mon_dossier' : 'validation_pv',
    actionLabel: 'Traiter la relance'
  });
  await saveNotificationDoc(notif);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'APPLICATION_MODIFIED',
    actionLabel: 'Envoi de relance officielle',
    targetType: 'application',
    targetId: record.id,
    targetLabel: `${record.recipientName} (${record.recipientEmail})`,
    details: `Motif : ${record.reason}. Message : ${record.message}`
  });
  await appendAuditLogDoc(auditEntry);

  return { ok: true, data: record, auditEntry, notifications: [notif] };
}

export async function saveReportUseCase(params: {
  actor: UserProfile;
  reregistration: ReRegistration;
}): Promise<UseCaseResult<ReRegistration>> {
  const isOwnerOrAdmin =
    params.reregistration.userId === params.actor.uid || params.actor.roles.includes('admin');
  const updated: ReRegistration = {
    ...params.reregistration,
    id: isOwnerOrAdmin
      ? params.reregistration.id
      : `REG-${params.actor.uid.slice(0, 8).toUpperCase()}`,
    userId: params.reregistration.userId || params.actor.uid,
    studentName: params.reregistration.studentName?.trim() || params.actor.fullName || 'Doctorant'
  };
  await saveReRegistrationDoc(updated);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'REPORT_SUBMITTED',
    actionLabel: 'Dépôt du rapport annuel d’activité',
    targetType: 'report',
    targetId: updated.id,
    targetLabel: `${updated.studentName} (${updated.year}e année)`,
    details: `Avancement déclaré : ${updated.activityReport.thesisProgressPercent || 0}%.`
  });
  await appendAuditLogDoc(auditEntry);

  const notif = createNotificationItem({
    recipientEmail: 'directeur.lsig@usmba.ac.ma',
    recipientRole: 'directeur_structure',
    triggerEvent: 'REPORT_SUBMITTED',
    title: `Rapport d’activité soumis : ${updated.studentName}`,
    content: `${updated.studentName} (${updated.year}e année) a mis à jour son rapport annuel de réinscription.`,
    category: 'action_required',
    relatedTargetType: 'report',
    relatedTargetId: updated.id,
    targetSection: 'validation_rapports',
    actionLabel: 'Examiner le rapport'
  });
  await saveNotificationDoc(notif);

  return { ok: true, data: updated, auditEntry, notifications: [notif] };
}

export async function validateReportUseCase(params: {
  actor: UserProfile;
  reregistration: ReRegistration;
  status: 'Validé' | 'Pour rectification';
}): Promise<UseCaseResult<ReRegistration>> {
  if (!hasPrivilege(params.actor, 'REPORT_VALIDATE_STRUCTURE')) {
    return {
      ok: false,
      error: 'Privilège REPORT_VALIDATE_STRUCTURE requis pour valider un rapport.'
    };
  }

  const updated: ReRegistration = {
    ...params.reregistration,
    structureApproval: params.status,
    activityReport: {
      ...params.reregistration.activityReport,
      validatedByStructure: params.status === 'Validé'
    }
  };
  await saveReRegistrationDoc(updated);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'REPORT_VALIDATED',
    actionLabel: 'Décision sur rapport annuel d’activité',
    targetType: 'report',
    targetId: updated.id,
    targetLabel: updated.studentName,
    details: `Décision Direction de Structure : ${params.status}.`,
    previousState: params.reregistration.structureApproval,
    newState: params.status
  });
  await appendAuditLogDoc(auditEntry);

  const notif = createNotificationItem({
    recipientUid: updated.userId,
    recipientEmail: 'candidat@usmba.ac.ma',
    recipientRole: 'candidat',
    triggerEvent: 'REPORT_VALIDATED',
    title: `Rapport annuel : ${params.status}`,
    content: `La direction de structure a statué sur votre rapport d'activité : ${params.status}.`,
    category: params.status === 'Pour rectification' ? 'action_required' : 'informational',
    relatedTargetType: 'report',
    relatedTargetId: updated.id,
    targetSection: 'reinscription',
    actionLabel: 'Consulter'
  });
  await saveNotificationDoc(notif);

  return { ok: true, data: updated, auditEntry, notifications: [notif] };
}

export async function saveUserAccountRolesUseCase(params: {
  actor: UserProfile;
  account: UserAccount;
  roles: GcdRole[];
  isNew?: boolean;
}): Promise<UseCaseResult<UserAccount>> {
  if (!hasPrivilege(params.actor, 'USER_MANAGE') && !hasPrivilege(params.actor, 'ROLE_ASSIGN')) {
    return { ok: false, error: 'Privilège USER_MANAGE ou ROLE_ASSIGN requis.' };
  }

  const normalized = normalizeRoles(params.roles);
  const updated: UserAccount = {
    ...params.account,
    email: params.account.email.trim().toLowerCase(),
    roles: normalized,
    role: normalized[0]
  };
  await saveUserAccountDoc(updated);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'ROLE_ASSIGNED',
    actionLabel: params.isNew ? 'Création de compte & attribution de rôles' : 'Mise à jour des rôles RBAC',
    targetType: 'user',
    targetId: updated.id,
    targetLabel: `${updated.fullName} (${updated.email})`,
    details: `Rôles attribués : ${normalized.join(', ')}.`,
    previousState: params.isNew ? undefined : params.account.roles?.join(', '),
    newState: normalized.join(', ')
  });

  const notif = createNotificationItem({
    recipientEmail: updated.email,
    recipientRole: normalized[0],
    triggerEvent: 'ROLE_ASSIGNED',
    title: 'Mise à jour de vos privilèges sur la plateforme GCD',
    content: `Vos rôles actifs ont été configurés par l'administration : ${normalized.join(', ')}.`,
    category: 'informational',
    targetSection: 'catalogue'
  });

  void Promise.all([appendAuditLogDoc(auditEntry), saveNotificationDoc(notif)]);

  return { ok: true, data: updated, auditEntry, notifications: [notif] };
}

export async function toggleAccountStatusUseCase(params: {
  actor: UserProfile;
  account: UserAccount;
}): Promise<UseCaseResult<UserAccount>> {
  if (!hasPrivilege(params.actor, 'USER_MANAGE')) {
    return { ok: false, error: 'Privilège USER_MANAGE requis.' };
  }

  const updated: UserAccount = {
    ...params.account,
    active: !params.account.active
  };
  await saveUserAccountDoc(updated);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'ACCOUNT_STATUS_CHANGED',
    actionLabel: updated.active ? 'Activation de compte' : 'Suspension de compte',
    targetType: 'user',
    targetId: updated.id,
    targetLabel: `${updated.fullName} (${updated.email})`,
    details: `Statut du compte basculé vers : ${updated.active ? 'Actif' : 'Désactivé'}.`,
    previousState: params.account.active ? 'Actif' : 'Désactivé',
    newState: updated.active ? 'Actif' : 'Désactivé'
  });
  void appendAuditLogDoc(auditEntry);

  return { ok: true, data: updated, auditEntry };
}

export async function saveCalendarEventUseCase(params: {
  actor: UserProfile;
  event: DoctoralCalendarEvent;
}): Promise<UseCaseResult<DoctoralCalendarEvent>> {
  if (!hasPrivilege(params.actor, 'CALENDAR_MANAGE')) {
    return { ok: false, error: 'Privilège CALENDAR_MANAGE requis.' };
  }

  await saveCalendarEventDoc(params.event);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'CALENDAR_UPDATED',
    actionLabel: 'Mise à jour du calendrier doctoral',
    targetType: 'calendar',
    targetId: params.event.id,
    targetLabel: params.event.title,
    details: `Période : ${params.event.startDate} → ${params.event.endDate}.`
  });
  void appendAuditLogDoc(auditEntry);

  return { ok: true, data: params.event, auditEntry };
}

export async function deleteCalendarEventUseCase(params: {
  actor: UserProfile;
  event: DoctoralCalendarEvent;
}): Promise<UseCaseResult<string>> {
  if (!hasPrivilege(params.actor, 'CALENDAR_MANAGE')) {
    return { ok: false, error: 'Privilège CALENDAR_MANAGE requis.' };
  }

  await deleteCalendarEventDoc(params.event.id);

  const auditEntry = createAuditEntry({
    actor: params.actor,
    action: 'CALENDAR_UPDATED',
    actionLabel: 'Suppression d’échéance du calendrier',
    targetType: 'calendar',
    targetId: params.event.id,
    targetLabel: params.event.title,
    details: `Événement supprimé du calendrier de campagne.`
  });
  await appendAuditLogDoc(auditEntry);

  return { ok: true, data: params.event.id, auditEntry };
}

export async function updateNotificationStatusUseCase(
  notification: NotificationItem,
  status: NotificationStatus
): Promise<NotificationItem> {
  const updated: NotificationItem = { ...notification, status };
  await saveNotificationDoc(updated);
  return updated;
}
