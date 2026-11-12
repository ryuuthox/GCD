export type GcdRole =
  | 'candidat'
  | 'enseignant'
  | 'directeur_these'
  | 'co_encadrant'
  | 'directeur_structure'
  | 'admin';

export type Privilege =
  | 'CATALOG_VIEW'
  | 'APPLICATION_CREATE'
  | 'APPLICATION_EDIT_OWN'
  | 'APPLICATION_SUBMIT'
  | 'APPLICATION_VIEW_ASSIGNED'
  | 'APPLICATION_VIEW_ALL'
  | 'DOCUMENT_UPLOAD_OWN'
  | 'DOCUMENT_VALIDATE'
  | 'INTERVIEW_SCHEDULE'
  | 'PV_WRITE'
  | 'PV_VALIDATE_STRUCTURE'
  | 'SUBJECT_PROPOSE'
  | 'SUBJECT_VALIDATE_STRUCTURE'
  | 'REPORT_SUBMIT_OWN'
  | 'REPORT_VALIDATE_STRUCTURE'
  | 'NOTIFICATION_SEND'
  | 'CALENDAR_MANAGE'
  | 'AUDIT_VIEW'
  | 'USER_MANAGE'
  | 'ROLE_ASSIGN'
  | 'LIFECYCLE_ADVANCE'
  | 'LIFECYCLE_REJECT';

export type GcdSection =
  | 'catalogue'
  | 'mon_dossier'
  | 'reinscription'
  | 'calendrier'
  | 'notifications'
  // Supervision (Enseignant / Directeur de Thèse / Co-encadrant)
  | 'candidatures_encadrant'
  | 'mes_sujets'
  | 'pv_entretiens'
  | 'relances_encadrant'
  // Structure Director
  | 'validation_sujets'
  | 'validation_pv'
  | 'validation_rapports'
  | 'profils_candidats'
  // Admin
  | 'gestion_comptes'
  | 'audit_logs'
  | 'universites_structures'
  | 'vue_globale';

export type ApplicationState =
  | 'brouillon'
  | 'soumise'
  | 'verification_docs'
  | 'pieces_a_completer'
  | 'examen_encadrement'
  | 'entretien_planifie'
  | 'evaluee'
  | 'validation_structure'
  | 'liste_principale'
  | 'liste_attente'
  | 'inscription_validee'
  | 'rejetee';

export type DocumentValidationStatus =
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'additional_info_required';

export type DocumentTypeKey =
  | 'cinCopy'
  | 'bacOriginal'
  | 'deugDutCopies'
  | 'licenceCopies'
  | 'masterOriginal'
  | 'cvPdf'
  | 'projetRecherchePdf'
  | 'ficheSigneePhysique';

export interface RoleDefinition {
  id: GcdRole;
  label: string;
  description: string;
  privileges: Privilege[];
  badgeColor: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  arabicName?: string;
  roles: GcdRole[];
  cin?: string;
  cne?: string;
  phone?: string;
  title?: string;
  university?: string;
  school?: string;
  lab?: string;
  active: boolean;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DoctoralSubject {
  id: string;
  title: string;
  supervisorName: string;
  supervisorUid?: string;
  supervisorTitle: string;
  supervisorEmail?: string;
  coSupervisorName?: string;
  coSupervisorUid?: string;
  labName: string;
  schoolName: string;
  university: string;
  academicYear: string;
  domain: string;
  eligibleMajors: string[];
  totalApplicants: number;
  remainingSlots: number;
  status: 'valide' | 'en_attente_structure' | 'rejete';
  structureApprovalDate?: string;
  description: string;
  prerequisites: string;
  keywords?: string[];
  contactEmail?: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  docType: DocumentTypeKey;
  label: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedByUid: string;
  uploadedAt: string;
  status: DocumentValidationStatus;
  reviewerUid?: string;
  reviewerName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  previewDataUrl?: string; // Stored for small files (<450KB) or visual inspection
}

export interface CandidateDocumentStatus {
  ficheInscription: boolean;
  charteTheses: boolean;
  recuDepot: boolean;
  cinCopy: boolean;
  bacOriginal: boolean;
  deugDutCopies: boolean;
  licenceCopies: boolean;
  masterOriginal: boolean;
  photoIdentite: boolean;
  cvPdf: boolean;
  projetRecherchePdf: boolean;
  ficheSigneePhysique?: boolean;
}

export interface StateTransitionEntry {
  fromState: ApplicationState | null;
  toState: ApplicationState;
  event: string;
  actorUid: string;
  actorName: string;
  actorRoles: GcdRole[];
  timestamp: string;
  comment?: string;
}

export interface Candidate {
  id: string;
  userId?: string;
  fullName: string;
  arabicName: string;
  cin: string;
  cne: string;
  birthDate: string;
  birthPlace: string;
  email: string;
  phone: string;
  isEmployed: boolean;
  originUniversity: string;
  diploma: string;
  specialty: string;
  masterGrade: number;
  licenceGrade: number;
  priorWorks?: string;
  skills: string[];
  subjectId: string;
  subjectTitle: string;
  // Multi-actor relationships
  supervisorName: string; // Enseignant / Directeur de Thèse
  teacherSupervisorUid?: string;
  thesisDirectorName?: string;
  thesisDirectorUid?: string;
  coSupervisorName?: string;
  coSupervisorUid?: string;
  structureDirectorName?: string;
  structureDirectorUid?: string;
  labName: string;
  schoolName: string;
  university: string;
  selectedSubjects?: {
    id: string;
    title: string;
    supervisorName: string;
    schoolName: string;
    university: string;
    labName: string;
    priority: number;
  }[];
  academicYear: string;
  // Lifecycle state
  lifecycleState: ApplicationState;
  status: 'en_attente' | 'convoque_oral' | 'liste_principale' | 'liste_attente' | 'rejete' | 'inscrit_valide';
  interviewDate?: string;
  interviewLocation?: string;
  oralNote?: number;
  submissionDate: string;
  lastModifiedAt?: string;
  transitionHistory?: StateTransitionEntry[];
  documents: CandidateDocumentStatus;
  physicalSignedScanUploaded?: boolean;
  physicalSignedScanUrl?: string;
  otpSigned?: boolean;
  otpSignatureHash?: string;
  otpSignedAt?: string;
}

export interface InterviewPv {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateCin: string;
  subjectId: string;
  subjectTitle: string;
  supervisorName: string;
  supervisorUid?: string;
  labName: string;
  schoolName: string;
  interviewDate: string;
  oralGrade: number;
  decision: 'admis_principal' | 'liste_attente' | 'non_admis';
  juryMembers: string[];
  comments: string;
  submittedBySupervisor: boolean;
  validatedByStructure: boolean;
  validatedByUid?: string;
  validationDate?: string;
  structureComments?: string;
}

export interface ManualRelance {
  id: string;
  date: string;
  senderUid?: string;
  senderName: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: 'candidat' | 'directeur_structure';
  subjectTitle: string;
  reason: 'absence_entretien' | 'dossier_incomplet' | 'rapport_activite_retard' | 'validation_requise';
  message: string;
  status: 'envoye';
}

export interface UserAccount {
  id: string;
  uid?: string;
  email: string;
  fullName: string;
  roles: GcdRole[];
  role: GcdRole;
  title: string;
  university: string;
  school: string;
  lab: string;
  active: boolean;
  createdAt: string;
}

export type AuditActionType =
  | 'APPLICATION_CREATED'
  | 'APPLICATION_MODIFIED'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_VALIDATED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_TRANSMITTED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VALIDATED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_REPLACEMENT_REQUESTED'
  | 'PV_SUBMITTED'
  | 'PV_VALIDATED'
  | 'SUBJECT_PROPOSED'
  | 'SUBJECT_VALIDATED'
  | 'SUBJECT_REJECTED'
  | 'REPORT_SUBMITTED'
  | 'REPORT_VALIDATED'
  | 'ROLE_ASSIGNED'
  | 'ACCOUNT_STATUS_CHANGED'
  | 'CALENDAR_UPDATED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRoles: GcdRole[];
  action: AuditActionType;
  actionLabel: string;
  targetType: 'application' | 'document' | 'subject' | 'pv' | 'report' | 'user' | 'calendar';
  targetId: string;
  targetLabel: string;
  details: string;
  previousState?: string;
  newState?: string;
}

export type NotificationCategory = 'informational' | 'action_required';
export type NotificationStatus = 'unread' | 'read' | 'resolved';

export interface NotificationItem {
  id: string;
  recipientUid?: string;
  recipientEmail?: string;
  recipientRole?: GcdRole;
  triggerEvent: string;
  title: string;
  content: string;
  category: NotificationCategory;
  status: NotificationStatus;
  createdAt: string;
  relatedTargetType?: 'application' | 'document' | 'pv' | 'subject' | 'report' | 'calendar';
  relatedTargetId?: string;
  targetSection?: GcdSection;
  actionLabel?: string;
}

export interface DoctoralCalendarEvent {
  id: string;
  title: string;
  description: string;
  stageCode: 'campagne_sujets' | 'depot_candidatures' | 'verification_docs' | 'entretiens_oraux' | 'visa_structure' | 'inscription_finale' | 'reinscription';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  responsibleRoles: GcdRole[];
  isCriticalDeadline: boolean;
  university?: string;
}

export interface ActivityReport {
  contexte: string;
  contributions: string;
  publications: string;
  communications: string;
  mobilites: string;
  activitesTransversales: string;
  justificationDerogation?: string;
  thesisProgressPercent?: number;
  submittedDate?: string;
  validatedByStructure?: boolean;
}

export interface ReRegistration {
  id: string;
  userId?: string;
  studentName: string;
  studentArabicName: string;
  studentCin: string;
  studentCne: string;
  year: number;
  thesisTitle: string;
  supervisorName: string;
  labName: string;
  schoolName: string;
  university: string;
  firstRegistrationYear: string;
  activityReport: ActivityReport;
  validatedCredits: number;
  publicationsCount: number;
  communicationsCount: number;
  structureApproval: 'Validé' | 'En attente' | 'Pour rectification';
  structureComments?: string;
  committeeAvis?: string;
  committeeComments?: string;
  physicalSignedScanUploaded?: boolean;
}
