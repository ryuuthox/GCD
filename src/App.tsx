import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { PublicSubjectsCatalog } from './components/public/PublicSubjectsCatalog';
import { AuthModal } from './components/modals/AuthModal';
import { auth, logoutUser, testConnection } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const InscriptionView = lazy(() =>
  import('./components/inscription/InscriptionView').then((m) => ({ default: m.InscriptionView }))
);
const EncadrantView = lazy(() =>
  import('./components/encadrant/EncadrantView').then((m) => ({ default: m.EncadrantView }))
);
const StructureView = lazy(() =>
  import('./components/structure/StructureView').then((m) => ({ default: m.StructureView }))
);
const AdminView = lazy(() =>
  import('./components/admin/AdminView').then((m) => ({ default: m.AdminView }))
);
const ReinscriptionView = lazy(() =>
  import('./components/reinscription/ReinscriptionView').then((m) => ({
    default: m.ReinscriptionView
  }))
);
const CalendarTrackingView = lazy(() =>
  import('./components/calendar/CalendarTrackingView').then((m) => ({
    default: m.CalendarTrackingView
  }))
);
const NotificationCenterView = lazy(() =>
  import('./components/notifications/NotificationCenterView').then((m) => ({
    default: m.NotificationCenterView
  }))
);
const PdfPreviewModal = lazy(() =>
  import('./components/modals/PdfPreviewModal').then((m) => ({ default: m.PdfPreviewModal }))
);
const OtpSignatureModal = lazy(() =>
  import('./components/modals/OtpSignatureModal').then((m) => ({ default: m.OtpSignatureModal }))
);
import {
  INITIAL_APPLICATION_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_CANDIDATES,
  INITIAL_INTERVIEW_PVS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RELANCES,
  INITIAL_REREGISTRATIONS,
  INITIAL_SUBJECTS,
  INITIAL_USER_ACCOUNTS
} from './data/mockData';
import {
  ApplicationDocument,
  ApplicationState,
  AuditLogEntry,
  Candidate,
  DoctoralCalendarEvent,
  DoctoralSubject,
  DocumentTypeKey,
  DocumentValidationStatus,
  GcdRole,
  GcdSection,
  InterviewPv,
  ManualRelance,
  NotificationItem,
  NotificationStatus,
  ReRegistration,
  UserAccount,
  UserProfile
} from './domain/types';
import {
  canAccessSection,
  getDefaultSectionForUser,
  hasPrivilege,
  normalizeRoles
} from './domain/rbac';
import { getDocumentConfig, validateFileForDocumentType } from './domain/documents';
import { mapLifecycleStateToLegacyStatus } from './domain/lifecycle';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  findPreauthorizedAccountByEmail,
  getUserProfileDoc,
  listAuditLogsFromFirestore,
  listCalendarEventsFromFirestore,
  listCandidatesForUser,
  listDocumentsForUser,
  listInterviewPvsFromFirestore,
  listNotificationsForUser,
  listRelancesFromFirestore,
  listReRegistrationsForUser,
  listSubjectsFromFirestore,
  listUserAccountsFromFirestore,
  saveUserProfileDoc,
  seedCatalogAndCalendarIfEmpty,
  syncAdminMarkerIfAuthorized
} from './infrastructure/firestoreService';
import {
  deleteCalendarEventUseCase,
  proposeSubjectUseCase,
  reviewApplicationDocumentUseCase,
  saveApplicationProfileUseCase,
  saveCalendarEventUseCase,
  saveRelanceUseCase,
  saveReportUseCase,
  saveUserAccountRolesUseCase,
  submitPvUseCase,
  toggleAccountStatusUseCase,
  transitionApplicationStateUseCase,
  updateNotificationStatusUseCase,
  uploadApplicationDocumentUseCase,
  validatePvUseCase,
  validateReportUseCase,
  validateSubjectUseCase
} from './application/useCases';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function buildCandidateFromSubjects(
  user: UserProfile,
  subjectsChosen: DoctoralSubject[],
  base?: Candidate
): Candidate {
  const primary = subjectsChosen[0];
  const ownedBase = base && base.userId === user.uid ? base : undefined;
  const personalId = `CAND-${user.uid.slice(0, 8).toUpperCase()}`;

  if (ownedBase) {
    return {
      ...ownedBase,
      id: ownedBase.id,
      userId: user.uid,
      fullName: user.fullName || ownedBase.fullName,
      arabicName: user.arabicName || ownedBase.arabicName || '',
      cin: user.cin || ownedBase.cin || 'À compléter',
      cne: user.cne || ownedBase.cne || 'À compléter',
      email: user.email,
      phone: user.phone || ownedBase.phone || '0600000000',
      university: user.university || primary?.university || ownedBase.university,
      subjectId: primary ? primary.id : ownedBase.subjectId,
      subjectTitle: primary ? primary.title : ownedBase.subjectTitle,
      supervisorName: primary ? primary.supervisorName : ownedBase.supervisorName,
      thesisDirectorName: primary ? primary.supervisorName : ownedBase.thesisDirectorName,
      coSupervisorName: primary?.coSupervisorName || ownedBase.coSupervisorName,
      schoolName: primary ? primary.schoolName : ownedBase.schoolName,
      labName: primary ? primary.labName : ownedBase.labName,
      selectedSubjects: subjectsChosen.map((s, idx) => ({
        id: s.id,
        title: s.title,
        supervisorName: s.supervisorName,
        schoolName: s.schoolName,
        university: s.university,
        labName: s.labName,
        priority: idx + 1
      }))
    };
  }

  return {
    id: personalId,
    userId: user.uid,
    fullName: user.fullName || user.email.split('@')[0] || 'Candidat',
    arabicName: user.arabicName || '',
    cin: user.cin || 'À compléter',
    cne: user.cne || 'À compléter',
    birthDate: '01/01/2000',
    birthPlace: 'Maroc',
    email: user.email,
    phone: user.phone || '0600000000',
    isEmployed: false,
    originUniversity: user.university || 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    diploma: "Master / Diplôme d'Ingénieur",
    specialty: primary?.domain || 'Sciences & Ingénierie',
    masterGrade: 14,
    licenceGrade: 13,
    priorWorks: '',
    skills: [],
    subjectId: primary ? primary.id : '14064',
    subjectTitle: primary ? primary.title : 'Sujet Doctoral Sélectionné',
    supervisorName: primary ? primary.supervisorName : 'Directeur de Thèse',
    thesisDirectorName: primary ? `Pr. ${primary.supervisorName}` : 'Directeur de Thèse',
    coSupervisorName: primary?.coSupervisorName || '',
    structureDirectorName: 'Direction de Structure',
    labName: primary ? primary.labName : 'Laboratoire de Recherche',
    schoolName: primary ? primary.schoolName : 'Établissement d’accueil',
    university:
      user.university ||
      primary?.university ||
      'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    selectedSubjects: subjectsChosen.map((s, idx) => ({
      id: s.id,
      title: s.title,
      supervisorName: s.supervisorName,
      schoolName: s.schoolName,
      university: s.university,
      labName: s.labName,
      priority: idx + 1
    })),
    academicYear: primary?.academicYear || '2026/2027',
    lifecycleState: 'brouillon',
    status: 'en_attente',
    submissionDate: new Date().toLocaleDateString('fr-FR'),
    lastModifiedAt: new Date().toISOString(),
    transitionHistory: [],
    documents: {
      ficheInscription: false,
      charteTheses: false,
      recuDepot: false,
      cinCopy: false,
      bacOriginal: false,
      deugDutCopies: false,
      licenceCopies: false,
      masterOriginal: false,
      photoIdentite: false,
      cvPdf: false,
      projetRecherchePdf: false,
      ficheSigneePhysique: false
    },
    physicalSignedScanUploaded: false,
    otpSigned: false
  };
}

const PREVIEW_ACTOR_PROFILES: Record<GcdRole, UserProfile> = {
  candidat: {
    uid: 'preview-candidat',
    email: 'candidat@usmba.ac.ma',
    fullName: 'Amine EL MANSOURI',
    arabicName: 'أمين المنصوري',
    roles: ['candidat'],
    cin: 'CD712948',
    cne: 'N134098214',
    university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  enseignant: {
    uid: 'preview-enseignant',
    email: 'driss.alaoui@usmba.ac.ma',
    fullName: 'Pr. Driss ALAOUI',
    roles: ['enseignant'],
    title: "Professeur de l'Enseignement Supérieur (PES)",
    lab: 'Laboratoire Sciences Ingénierie et Gestion (LSIG)',
    school: 'École Supérieure de Technologie (EST Fès)',
    university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  directeur_these: {
    uid: 'preview-directeur-these',
    email: 'driss.alaoui@usmba.ac.ma',
    fullName: 'Pr. Driss ALAOUI',
    roles: ['directeur_these', 'enseignant'],
    title: "Professeur de l'Enseignement Supérieur (PES)",
    lab: 'Laboratoire Sciences Ingénierie et Gestion (LSIG)',
    school: 'École Supérieure de Technologie (EST Fès)',
    university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  co_encadrant: {
    uid: 'preview-co-encadrant',
    email: 'jaouad.elmekkaoui@usmba.ac.ma',
    fullName: 'Pr. Jaouad EL MEKKAOUI',
    roles: ['co_encadrant', 'enseignant'],
    title: 'Professeur Habilité (PH)',
    lab: 'Laboratoire Sciences Ingénierie et Gestion (LSIG)',
    school: 'École Supérieure de Technologie (EST Fès)',
    university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  directeur_structure: {
    uid: 'preview-directeur-structure',
    email: 'directeur.lsig@usmba.ac.ma',
    fullName: 'Pr. Mohamed CHERGUI',
    roles: ['directeur_structure', 'directeur_these'],
    title: 'Directeur du Laboratoire LSIG',
    lab: 'Laboratoire Sciences Ingénierie et Gestion (LSIG)',
    school: 'EST Fès / FST Fès',
    university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  admin: {
    uid: 'preview-admin',
    email: 'admin@usmba.ac.ma',
    fullName: 'Administration Centrale GCD',
    roles: ['admin'],
    university: 'Centre National de Coordination Universitaire',
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  }
};

export default function App() {
  const [activeSection, setActiveSection] = useState<GcdSection>('catalogue');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Core Application State
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [subjects, setSubjects] = useState<DoctoralSubject[]>(INITIAL_SUBJECTS);
  const [applicationDocuments, setApplicationDocuments] = useState<ApplicationDocument[]>(
    INITIAL_APPLICATION_DOCUMENTS
  );
  const [interviewPvs, setInterviewPvs] = useState<InterviewPv[]>(INITIAL_INTERVIEW_PVS);
  const [relances, setRelances] = useState<ManualRelance[]>(INITIAL_RELANCES);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [reregistrations, setReRegistrations] =
    useState<ReRegistration[]>(INITIAL_REREGISTRATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [calendarEvents, setCalendarEvents] =
    useState<DoctoralCalendarEvent[]>(INITIAL_CALENDAR_EVENTS);

  // Authenticated User Profile (multi-role RBAC)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  // Temporary interface shortcut override (bypasses UI access control for inspecting any actor view)
  const [previewActorRole, setPreviewActorRole] = useState<GcdRole | null>(null);

  const effectiveUser: UserProfile | null = useMemo(() => {
    if (!previewActorRole) return currentUser;
    const preset = PREVIEW_ACTOR_PROFILES[previewActorRole];
    return {
      ...preset,
      uid: currentUser?.uid || preset.uid,
      photoURL: currentUser?.photoURL
    };
  }, [currentUser, previewActorRole]);

  // Selected subjects for application (max 3 allowed)
  const [selectedSubjects, setSelectedSubjects] = useState<DoctoralSubject[]>([]);
  const [targetSubjectsForAuth, setTargetSubjectsForAuth] = useState<DoctoralSubject[]>([]);

  // Modals & Toast
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfDocType, setPdfDocType] = useState<
    | 'fiche_inscription'
    | 'demande_bourse'
    | 'charte_theses'
    | 'recu_depot'
    | 'avis_comite'
    | 'rapport_activite'
  >('fiche_inscription');
  const [activePdfCandidate, setActivePdfCandidate] = useState<Candidate | undefined>(undefined);
  const [activePdfReRegistration, setActivePdfReRegistration] = useState<
    ReRegistration | undefined
  >(undefined);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3800);
  };

  const hydratedUidRef = useRef<string | null>(null);
  const publicCatalogLoadedRef = useRef<boolean>(false);

  // Boot: non-blocking connection check + initial public catalog & calendar load
  useEffect(() => {
    void testConnection();
    (async () => {
      const [cloudSubjects, cloudEvents] = await Promise.all([
        listSubjectsFromFirestore(),
        listCalendarEventsFromFirestore()
      ]);
      if (cloudSubjects && cloudSubjects.length > 0) setSubjects(cloudSubjects);
      if (cloudEvents && cloudEvents.length > 0) setCalendarEvents(cloudEvents);
      publicCatalogLoadedRef.current = true;
    })();
  }, []);

  // Hydrate authenticated user's scoped Firestore data (deduplicated per UID/roles)
  const hydrateCloudDataForUser = async (user: UserProfile, force = false) => {
    const cacheKey = `${user.uid}:${user.roles.join(',')}`;
    if (!force && hydratedUidRef.current === cacheKey) {
      return;
    }
    hydratedUidRef.current = cacheKey;

    try {
      if (
        hasPrivilege(user, 'USER_MANAGE') ||
        hasPrivilege(user, 'CALENDAR_MANAGE') ||
        hasPrivilege(user, 'SUBJECT_VALIDATE_STRUCTURE')
      ) {
        void seedCatalogAndCalendarIfEmpty(INITIAL_SUBJECTS, INITIAL_CALENDAR_EVENTS);
      }

      const [
        cloudSubjects,
        cloudEvents,
        cloudCandidates,
        cloudDocs,
        cloudPvs,
        cloudRelances,
        cloudRegs,
        cloudNotifs,
        cloudAccounts,
        cloudLogs
      ] = await Promise.all([
        publicCatalogLoadedRef.current ? Promise.resolve(null) : listSubjectsFromFirestore(),
        publicCatalogLoadedRef.current ? Promise.resolve(null) : listCalendarEventsFromFirestore(),
        listCandidatesForUser(user),
        listDocumentsForUser(user),
        listInterviewPvsFromFirestore(),
        listRelancesFromFirestore(),
        listReRegistrationsForUser(user),
        listNotificationsForUser(user),
        hasPrivilege(user, 'USER_MANAGE') || hasPrivilege(user, 'ROLE_ASSIGN')
          ? listUserAccountsFromFirestore()
          : Promise.resolve(null),
        hasPrivilege(user, 'AUDIT_VIEW')
          ? listAuditLogsFromFirestore()
          : Promise.resolve(null)
      ]);

      if (cloudSubjects && cloudSubjects.length > 0) setSubjects(cloudSubjects);
      if (cloudEvents && cloudEvents.length > 0) setCalendarEvents(cloudEvents);
      if (cloudCandidates && cloudCandidates.length > 0) {
        setCandidates((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          cloudCandidates.forEach((c) => map.set(c.id, c));
          return Array.from(map.values());
        });
      }
      if (cloudDocs && cloudDocs.length > 0) {
        setApplicationDocuments((prev) => {
          const map = new Map(prev.map((d) => [d.id, d]));
          cloudDocs.forEach((d) => map.set(d.id, d));
          return Array.from(map.values());
        });
      }
      if (cloudPvs && cloudPvs.length > 0) setInterviewPvs(cloudPvs);
      if (cloudRelances && cloudRelances.length > 0) setRelances(cloudRelances);
      if (cloudRegs && cloudRegs.length > 0) setReRegistrations(cloudRegs);
      if (cloudNotifs && cloudNotifs.length > 0) {
        setNotifications((prev) => {
          const map = new Map(prev.map((n) => [n.id, n]));
          cloudNotifs.forEach((n) => map.set(n.id, n));
          return Array.from(map.values());
        });
      }
      if (cloudAccounts && cloudAccounts.length > 0) setUserAccounts(cloudAccounts);
      if (cloudLogs && cloudLogs.length > 0) {
        setAuditLogs((prev) => {
          const map = new Map(prev.map((l) => [l.id, l]));
          cloudLogs.forEach((l) => map.set(l.id, l));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Cloud data hydration fallback active:', err);
    }
  };

  // Listen to real Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        if (!firebaseUser.emailVerified) {
          setAuthModalOpen(true);
          return;
        }
        try {
          const normalizedEmail = firebaseUser.email.trim().toLowerCase();
          const [existingProfile, preauth] = await Promise.all([
            getUserProfileDoc(firebaseUser.uid),
            findPreauthorizedAccountByEmail(normalizedEmail)
          ]);

          if (existingProfile) {
            let effectiveRoles: GcdRole[] = normalizeRoles(existingProfile.roles);
            if (normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
              effectiveRoles =
                preauth && preauth.active
                  ? Array.from(new Set<GcdRole>([...normalizeRoles(preauth.roles), 'admin']))
                  : ['admin'];
            } else if (preauth && preauth.active) {
              effectiveRoles = normalizeRoles(preauth.roles);
            }

            const hydrated: UserProfile = {
              ...existingProfile,
              email: normalizedEmail,
              roles: effectiveRoles,
              active: preauth ? preauth.active : existingProfile.active,
              photoURL: firebaseUser.photoURL || existingProfile.photoURL
            };

            if (effectiveRoles.join(',') !== existingProfile.roles.join(',')) {
              try {
                await saveUserProfileDoc(hydrated);
              } catch {
                // Non-blocking if role sync waits on next admin update
              }
            }
            void syncAdminMarkerIfAuthorized(hydrated.uid, hydrated.roles);
            setCurrentUser(hydrated);
            await hydrateCloudDataForUser(hydrated);
          } else {
            setAuthModalOpen(true);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        hydratedUidRef.current = null;
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync dark class on html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Privilege-based Navigation Guard (uses effectiveUser so temporary shortcuts bypass UI lock)
  useEffect(() => {
    if (!canAccessSection(effectiveUser, activeSection)) {
      const fallback = getDefaultSectionForUser(effectiveUser);
      setActiveSection(fallback);
      showToast(
        effectiveUser
          ? 'Accès refusé : privilèges insuffisants pour cette section.'
          : 'Veuillez vous connecter pour accéder à cet espace.',
        true
      );
    }
  }, [effectiveUser, activeSection]);

  // Resolve active candidate dossier for the signed-in candidate (never fall back to shared mock CAND-001)
  const currentCandidate: Candidate = useMemo(() => {
    if (previewActorRole === 'candidat') {
      if (currentUser) {
        const owned = candidates.find((c) => c.userId && c.userId === currentUser.uid);
        if (owned) return owned;
      }
      return candidates[0];
    }
    if (effectiveUser) {
      const owned = candidates.find((c) => c.userId && c.userId === effectiveUser.uid);
      if (owned) return owned;
      const defaultSubjects =
        selectedSubjects.length > 0
          ? selectedSubjects
          : subjects.length > 0
          ? [subjects[0]]
          : [INITIAL_SUBJECTS[0]];
      return buildCandidateFromSubjects(effectiveUser, defaultSubjects);
    }
    return candidates[0];
  }, [candidates, currentUser, effectiveUser, previewActorRole, selectedSubjects, subjects]);

  // Helper to merge new audit logs & notifications into state
  const mergeUseCaseEffects = (auditEntry?: AuditLogEntry, newNotifs?: NotificationItem[]) => {
    if (auditEntry) {
      setAuditLogs((prev) => [auditEntry, ...prev]);
    }
    if (newNotifs && newNotifs.length > 0) {
      setNotifications((prev) => [...newNotifs, ...prev]);
    }
  };

  // Scoped unread notifications count for Header badge (strictly personal or active-role targeted)
  const unreadNotificationsCount = useMemo(() => {
    if (!effectiveUser) return 0;
    const email = effectiveUser.email.trim().toLowerCase();
    return notifications.filter((n) => {
      if (n.status !== 'unread') return false;
      const matchEmail = n.recipientEmail && n.recipientEmail.toLowerCase() === email;
      const matchUid = n.recipientUid && n.recipientUid === effectiveUser.uid;
      const matchRole =
        n.recipientRole &&
        effectiveUser.roles.includes(n.recipientRole) &&
        !n.recipientEmail &&
        !n.recipientUid;
      return Boolean(matchEmail || matchUid || matchRole);
    }).length;
  }, [notifications, effectiveUser]);

  // =========================================================================
  // USE-CASE ACTION HANDLERS
  // =========================================================================

  const handleUpdateCandidate = async (updated: Candidate) => {
    const exists = candidates.some((c) => c.id === updated.id);
    if (previewActorRole !== null) {
      setCandidates((prev) =>
        exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...prev]
      );
      showToast(`Aperçu : dossier de ${updated.fullName} mis à jour localement.`);
      return;
    }

    const actor: UserProfile = effectiveUser || {
      uid: updated.userId || 'guest',
      email: updated.email,
      fullName: updated.fullName,
      roles: ['candidat'],
      active: true,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await saveApplicationProfileUseCase({
        actor,
        application: updated,
        isNew: !exists
      });

      if (!res.ok || !res.data) {
        showToast(res.error || 'Erreur lors de la sauvegarde du dossier.', true);
        return;
      }

      setCandidates((prev) =>
        exists ? prev.map((c) => (c.id === res.data!.id ? res.data! : c)) : [res.data!, ...prev]
      );
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Dossier de ${res.data.fullName} enregistré et tracé dans l’audit.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Erreur lors de l’enregistrement du dossier.',
        true
      );
    }
  };

  const handleUploadDocument = async (docType: DocumentTypeKey, file: File) => {
    if (!effectiveUser) {
      setAuthModalOpen(true);
      return;
    }

    if (previewActorRole !== null) {
      const check = validateFileForDocumentType(file, docType);
      if (!check.valid) {
        showToast(check.error || 'Fichier non conforme.', true);
        return;
      }
      const cfg = getDocumentConfig(docType);
      const localDoc: ApplicationDocument = {
        id: `DOC-PREVIEW-${Date.now()}`,
        applicationId: currentCandidate.id,
        docType,
        label: cfg.label,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileSizeBytes: file.size,
        uploadedByUid: effectiveUser.uid,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        previewDataUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      };
      setApplicationDocuments((prev) => [
        localDoc,
        ...prev.filter((d) => !(d.applicationId === currentCandidate.id && d.docType === docType))
      ]);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === currentCandidate.id
            ? {
                ...c,
                documents: { ...c.documents, [docType]: true },
                ...(docType === 'ficheSigneePhysique' ? { physicalSignedScanUploaded: true } : {})
              }
            : c
        )
      );
      showToast(`Aperçu : pièce « ${cfg.label} » simulée localement.`);
      return;
    }

    try {
      const res = await uploadApplicationDocumentUseCase({
        actor: effectiveUser,
        application: currentCandidate,
        docType,
        file
      });

      if (!res.ok || !res.data) {
        showToast(res.error || 'Échec du téléversement.', true);
        return;
      }

      setApplicationDocuments((prev) => [
        res.data!.document,
        ...prev.filter(
          (d) => !(d.applicationId === currentCandidate.id && d.docType === docType)
        )
      ]);
      setCandidates((prev) =>
        prev.map((c) => (c.id === res.data!.updatedCandidate.id ? res.data!.updatedCandidate : c))
      );
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Pièce « ${res.data.document.label} » déposée avec succès.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors du dépôt du document.', true);
    }
  };

  const handleTransitionApplication = async (
    targetCand: Candidate,
    targetState: ApplicationState,
    comment?: string
  ) => {
    if (!effectiveUser) {
      setAuthModalOpen(true);
      return;
    }

    if (previewActorRole !== null) {
      const updated: Candidate = {
        ...targetCand,
        lifecycleState: targetState,
        status: mapLifecycleStateToLegacyStatus(targetState),
        lastModifiedAt: new Date().toISOString(),
        transitionHistory: [
          ...(targetCand.transitionHistory || []),
          {
            fromState: targetCand.lifecycleState || null,
            toState: targetState,
            event: 'PREVIEW_TRANSITION',
            actorUid: effectiveUser.uid,
            actorName: effectiveUser.fullName,
            actorRoles: effectiveUser.roles,
            timestamp: new Date().toISOString(),
            comment
          }
        ]
      };
      setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast(`Aperçu : statut mis à jour localement (${targetState}).`);
      return;
    }

    try {
      const res = await transitionApplicationStateUseCase({
        actor: effectiveUser,
        application: targetCand,
        targetState,
        documents: applicationDocuments,
        pvs: interviewPvs,
        comment
      });

      if (!res.ok || !res.data) {
        showToast(res.error || 'Transition refusée par les règles métier.', true);
        return;
      }

      setCandidates((prev) => prev.map((c) => (c.id === res.data!.id ? res.data! : c)));
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Statut du dossier mis à jour (${res.data.lifecycleState}).`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la transition.', true);
    }
  };

  const handleReviewDocument = async (
    docItem: ApplicationDocument,
    cand: Candidate,
    status: DocumentValidationStatus,
    rejectionReason?: string
  ) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setApplicationDocuments((prev) =>
        prev.map((d) =>
          d.id === docItem.id
            ? {
                ...d,
                status,
                rejectionReason,
                reviewerName: effectiveUser.fullName,
                reviewedAt: new Date().toISOString()
              }
            : d
        )
      );
      if (status === 'rejected' || status === 'additional_info_required') {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === cand.id
              ? { ...c, lifecycleState: 'pieces_a_completer', status: 'en_attente' }
              : c
          )
        );
      }
      showToast(`Aperçu : statut du document mis à jour localement.`);
      return;
    }

    try {
      const res = await reviewApplicationDocumentUseCase({
        actor: effectiveUser,
        document: docItem,
        application: cand,
        status,
        rejectionReason
      });

      if (!res.ok || !res.data) {
        showToast(res.error || 'Action refusée sur la pièce justificative.', true);
        return;
      }

      setApplicationDocuments((prev) =>
        prev.map((d) => (d.id === res.data!.document.id ? res.data!.document : d))
      );
      if (res.data.updatedCandidate) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === res.data!.updatedCandidate!.id ? res.data!.updatedCandidate! : c
          )
        );
      }
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(
        status === 'validated'
          ? `Pièce "${docItem.label}" approuvée.`
          : `Demande envoyée au candidat pour "${docItem.label}".`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la vérification.', true);
    }
  };

  const handleAddSubject = async (newSub: DoctoralSubject) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setSubjects((prev) => [newSub, ...prev]);
      showToast(`Aperçu : sujet ajouté localement.`);
      return;
    }

    try {
      const res = await proposeSubjectUseCase({ actor: effectiveUser, subject: newSub });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Impossible de proposer le sujet.', true);
        return;
      }
      setSubjects((prev) => [res.data!, ...prev]);
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Sujet "${res.data.title.slice(0, 32)}..." soumis à la direction de structure.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la soumission du sujet.', true);
    }
  };

  const handleValidateSubject = async (subject: DoctoralSubject, status: 'valide' | 'rejete') => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? { ...s, status } : s)));
      showToast(`Aperçu : décision sujet appliquée localement.`);
      return;
    }

    try {
      const res = await validateSubjectUseCase({ actor: effectiveUser, subject, status });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Action refusée sur le sujet.', true);
        return;
      }
      setSubjects((prev) => prev.map((s) => (s.id === res.data!.id ? res.data! : s)));
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(status === 'valide' ? 'Sujet validé et publié au catalogue !' : 'Sujet rejeté.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la validation du sujet.', true);
    }
  };

  const handleSubmitPv = async (newPv: InterviewPv, cand: Candidate) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setInterviewPvs((prev) => [newPv, ...prev]);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === cand.id
            ? { ...c, oralNote: newPv.oralGrade, lifecycleState: 'evaluee' }
            : c
        )
      );
      showToast(`Aperçu : PV enregistré localement.`);
      return;
    }

    try {
      const res = await submitPvUseCase({ actor: effectiveUser, pv: newPv, application: cand });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Erreur lors de l’enregistrement du PV.', true);
        return;
      }
      setInterviewPvs((prev) => [res.data!.pv, ...prev]);
      setCandidates((prev) =>
        prev.map((c) => (c.id === res.data!.updatedCandidate.id ? res.data!.updatedCandidate : c))
      );
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(
        `PV d’entretien enregistré pour ${res.data.pv.candidateName} (${res.data.pv.oralGrade}/20). Transmis pour visa.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement du PV.', true);
    }
  };

  const handleValidatePv = async (pv: InterviewPv, comments?: string) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setInterviewPvs((prev) =>
        prev.map((item) =>
          item.id === pv.id
            ? { ...item, validatedByStructure: true, structureComments: comments }
            : item
        )
      );
      const nextState: ApplicationState =
        pv.decision === 'admis_principal'
          ? 'liste_principale'
          : pv.decision === 'liste_attente'
          ? 'liste_attente'
          : 'rejetee';
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === pv.candidateId
            ? {
                ...c,
                lifecycleState: nextState,
                status: mapLifecycleStateToLegacyStatus(nextState)
              }
            : c
        )
      );
      showToast(`Aperçu : visa PV appliqué localement.`);
      return;
    }

    try {
      const targetCandidate = candidates.find((c) => c.id === pv.candidateId);
      const res = await validatePvUseCase({
        actor: effectiveUser,
        pv,
        application: targetCandidate,
        comments
      });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Erreur lors du visa du PV.', true);
        return;
      }
      setInterviewPvs((prev) => prev.map((item) => (item.id === res.data!.pv.id ? res.data!.pv : item)));
      if (res.data.updatedCandidate) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === res.data!.updatedCandidate!.id ? res.data!.updatedCandidate! : c
          )
        );
      }
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Visa officiel apposé sur le PV #${pv.id}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors du visa du PV.', true);
    }
  };

  const handleUpdateReRegistration = async (updated: ReRegistration) => {
    if (!effectiveUser || previewActorRole !== null) {
      setReRegistrations((prev) =>
        prev.some((r) => r.id === updated.id)
          ? prev.map((r) => (r.id === updated.id ? updated : r))
          : [updated, ...prev]
      );
      showToast(`Dossier de réinscription de ${updated.studentName} mis à jour localement.`);
      return;
    }

    try {
      const res = await saveReportUseCase({ actor: effectiveUser, reregistration: updated });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Erreur lors de la sauvegarde du rapport.', true);
        return;
      }
      setReRegistrations((prev) =>
        prev.some((r) => r.id === res.data!.id)
          ? prev.map((r) => (r.id === res.data!.id ? res.data! : r))
          : [res.data!, ...prev]
      );
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Rapport annuel de ${res.data.studentName} enregistré et transmis.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du rapport.', true);
    }
  };

  const handleValidateReport = async (
    reregistration: ReRegistration,
    status: 'Validé' | 'Pour rectification'
  ) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setReRegistrations((prev) =>
        prev.map((r) => (r.id === reregistration.id ? { ...r, structureApproval: status } : r))
      );
      showToast(`Aperçu : rapport ${status} localement.`);
      return;
    }

    try {
      const res = await validateReportUseCase({ actor: effectiveUser, reregistration, status });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Action refusée sur le rapport annuel.', true);
        return;
      }
      setReRegistrations((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Rapport d’activité annuel : ${status}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la validation du rapport.', true);
    }
  };

  const handleSendRelance = async (newRelance: ManualRelance) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setRelances((prev) => [newRelance, ...prev]);
      showToast(`Aperçu : relance simulée localement.`);
      return;
    }

    try {
      const res = await saveRelanceUseCase({ actor: effectiveUser, relance: newRelance });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Envoi de relance refusé.', true);
        return;
      }
      setRelances((prev) => [res.data!, ...prev]);
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Relance envoyée avec succès à ${res.data.recipientName}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de l’envoi de la relance.', true);
    }
  };

  const handleSaveAccountWithRoles = async (
    account: UserAccount,
    roles: GcdRole[],
    isNew?: boolean
  ) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      const normalized = normalizeRoles(roles);
      const localAcc: UserAccount = { ...account, roles: normalized, role: normalized[0] };
      setUserAccounts((prev) =>
        prev.some((a) => a.id === localAcc.id)
          ? prev.map((a) => (a.id === localAcc.id ? localAcc : a))
          : [localAcc, ...prev]
      );
      showToast(`Aperçu : compte mis à jour localement.`);
      return;
    }

    try {
      const res = await saveUserAccountRolesUseCase({ actor: effectiveUser, account, roles, isNew });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Privilèges insuffisants pour modifier les comptes.', true);
        return;
      }
      setUserAccounts((prev) => {
        const exists = prev.some((a) => a.id === res.data!.id);
        return exists
          ? prev.map((a) => (a.id === res.data!.id ? res.data! : a))
          : [res.data!, ...prev];
      });
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Compte & rôles mis à jour pour ${res.data.fullName}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du compte.', true);
    }
  };

  const handleToggleAccountStatus = async (account: UserAccount) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setUserAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, active: !a.active } : a))
      );
      showToast(`Aperçu : statut du compte basculé localement.`);
      return;
    }

    try {
      const res = await toggleAccountStatusUseCase({ actor: effectiveUser, account });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Action refusée.', true);
        return;
      }
      setUserAccounts((prev) => prev.map((a) => (a.id === res.data!.id ? res.data! : a)));
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(
        `Compte de ${res.data.fullName} ${res.data.active ? 'activé' : 'désactivé'}.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors du changement de statut.', true);
    }
  };

  const handleSaveCalendarEvent = async (event: DoctoralCalendarEvent) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setCalendarEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
      showToast(`Aperçu : échéance ajoutée localement.`);
      return;
    }

    try {
      const res = await saveCalendarEventUseCase({ actor: effectiveUser, event });
      if (!res.ok || !res.data) {
        showToast(res.error || 'Action refusée sur le calendrier.', true);
        return;
      }
      setCalendarEvents((prev) => [res.data!, ...prev.filter((e) => e.id !== res.data!.id)]);
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Échéance « ${res.data.title} » ajoutée au calendrier.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de l’ajout au calendrier.', true);
    }
  };

  const handleDeleteCalendarEvent = async (event: DoctoralCalendarEvent) => {
    if (!effectiveUser) return;
    if (previewActorRole !== null) {
      setCalendarEvents((prev) => prev.filter((e) => e.id !== event.id));
      showToast(`Aperçu : échéance supprimée localement.`);
      return;
    }

    try {
      const res = await deleteCalendarEventUseCase({ actor: effectiveUser, event });
      if (!res.ok) {
        showToast(res.error || 'Suppression refusée.', true);
        return;
      }
      setCalendarEvents((prev) => prev.filter((e) => e.id !== event.id));
      mergeUseCaseEffects(res.auditEntry, res.notifications);
      showToast(`Échéance supprimée.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la suppression.', true);
    }
  };

  const handleUpdateNotificationStatus = async (
    notif: NotificationItem,
    status: NotificationStatus
  ) => {
    if (previewActorRole !== null) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, status } : n)));
      return;
    }
    try {
      const updated = await updateNotificationStatusUseCase(notif, status);
      setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, status } : n)));
    }
  };

  // =========================================================================
  // SUBJECT SELECTION & APPLICATION (MAX 3)
  // =========================================================================

  const handleToggleSelectSubject = (subject: DoctoralSubject) => {
    setSelectedSubjects((prev) => {
      const exists = prev.some((s) => s.id === subject.id);
      if (exists) {
        showToast(`Vœu retiré : ${subject.title.slice(0, 32)}...`);
        return prev.filter((s) => s.id !== subject.id);
      }
      if (prev.length >= 3) {
        showToast('Limite maximale : 3 sujets autorisés au maximum.', true);
        return prev;
      }
      showToast(`Vœu N° ${prev.length + 1} ajouté : ${subject.title.slice(0, 32)}...`);
      return [...prev, subject];
    });
  };

  const handleReorderSubjects = (reordered: DoctoralSubject[]) => {
    setSelectedSubjects(reordered);
    if (currentCandidate.selectedSubjects && currentCandidate.selectedSubjects.length > 0) {
      const primary = reordered[0];
      const updatedCand: Candidate = {
        ...currentCandidate,
        selectedSubjects: reordered.map((s, idx) => ({
          id: s.id,
          title: s.title,
          supervisorName: s.supervisorName,
          schoolName: s.schoolName,
          university: s.university,
          labName: s.labName,
          priority: idx + 1
        })),
        ...(primary
          ? {
              subjectId: primary.id,
              subjectTitle: primary.title,
              supervisorName: primary.supervisorName,
              schoolName: primary.schoolName,
              labName: primary.labName
            }
          : {})
      };
      setCandidates((prev) => prev.map((c) => (c.id === updatedCand.id ? updatedCand : c)));
    }
  };

  const handleApplySelected = async (subjectsToApply: DoctoralSubject[]) => {
    if (subjectsToApply.length === 0) {
      showToast('Veuillez sélectionner au moins un sujet de recherche.', true);
      return;
    }
    setTargetSubjectsForAuth(subjectsToApply);

    const actorForApply = previewActorRole ? effectiveUser : currentUser;
    if (!actorForApply || !hasPrivilege(actorForApply, 'APPLICATION_CREATE')) {
      setAuthModalOpen(true);
      return;
    }

    const existingOwned = candidates.find((c) => c.userId && c.userId === actorForApply.uid);
    const updated = buildCandidateFromSubjects(actorForApply, subjectsToApply, existingOwned);
    await handleUpdateCandidate(updated);
    setActiveSection('mon_dossier');
    showToast(
      `Candidature préparée pour ${subjectsToApply.length} sujet(s). Complétez et soumettez votre dossier.`
    );
  };

  const handleAuthSuccess = async (user: UserProfile) => {
    setPreviewActorRole(null);
    setCurrentUser(user);
    setAuthModalOpen(false);
    await hydrateCloudDataForUser(user);

    const subjectsChosen =
      targetSubjectsForAuth.length > 0 ? targetSubjectsForAuth : selectedSubjects;

    if (hasPrivilege(user, 'APPLICATION_CREATE') && subjectsChosen.length > 0) {
      const existingOwned = candidates.find((c) => c.userId && c.userId === user.uid);
      const updated = buildCandidateFromSubjects(user, subjectsChosen, existingOwned);
      try {
        const res = await saveApplicationProfileUseCase({
          actor: user,
          application: updated,
          isNew: !existingOwned
        });
        if (res.ok && res.data) {
          setCandidates((prev) =>
            existingOwned
              ? prev.map((c) => (c.id === res.data!.id ? res.data! : c))
              : [res.data!, ...prev]
          );
          mergeUseCaseEffects(res.auditEntry, res.notifications);
        }
      } catch (err) {
        console.warn('Initial subject application save deferred:', err);
      }
      setActiveSection('mon_dossier');
      showToast(`Bienvenue ${user.fullName} ! Vos vœux ont été liés à votre dossier.`);
      return;
    }

    const defaultSec = getDefaultSectionForUser(user);
    setActiveSection(defaultSec);
    showToast(`Bienvenue ${user.fullName} ! Espace activé selon vos privilèges.`);
  };

  const handleLogout = async () => {
    await logoutUser();
    setPreviewActorRole(null);
    setCurrentUser(null);
    setTargetSubjectsForAuth([]);
    setSelectedSubjects([]);
    setActiveSection('catalogue');
    showToast('Vous avez été déconnecté avec succès.');
  };

  const handleOpenPdf = (
    type:
      | 'fiche_inscription'
      | 'demande_bourse'
      | 'charte_theses'
      | 'recu_depot'
      | 'avis_comite'
      | 'rapport_activite',
    candidate?: Candidate,
    reregistration?: ReRegistration
  ) => {
    setPdfDocType(type);
    setActivePdfCandidate(candidate || currentCandidate);
    setActivePdfReRegistration(reregistration);
    setPdfModalOpen(true);
  };

  const handleOtpSignComplete = async (signatureHash: string, timestamp: string) => {
    const updated: Candidate = {
      ...currentCandidate,
      otpSigned: true,
      otpSignatureHash: signatureHash,
      otpSignedAt: timestamp,
      documents: {
        ...currentCandidate.documents,
        ficheInscription: true,
        charteTheses: true,
        recuDepot: true
      }
    };
    await handleUpdateCandidate(updated);
    showToast('Signature électronique scellée avec succès ! Reçu de dépôt généré.');
  };

  // =========================================================================
  // PRIVILEGE-DRIVEN VIEW RENDERING
  // =========================================================================

  const renderMainContent = () => {
    if (activeSection === 'catalogue') {
      return (
        <PublicSubjectsCatalog
          subjects={subjects}
          selectedSubjects={selectedSubjects}
          onToggleSelectSubject={handleToggleSelectSubject}
          onApplySelected={handleApplySelected}
          onReorderSubjects={handleReorderSubjects}
          currentUser={effectiveUser}
          maxAllowed={3}
          canApply={!effectiveUser || hasPrivilege(effectiveUser, 'APPLICATION_CREATE')}
          calendarEvents={calendarEvents}
          onNavigateToCalendar={() => setActiveSection('calendrier')}
        />
      );
    }

    if (activeSection === 'calendrier') {
      return (
        <CalendarTrackingView
          events={calendarEvents}
          currentUser={effectiveUser}
          candidateApplication={effectiveUser ? currentCandidate : undefined}
          documents={applicationDocuments}
          pvs={interviewPvs}
          onSaveEvent={handleSaveCalendarEvent}
          onDeleteEvent={handleDeleteCalendarEvent}
        />
      );
    }

    if (activeSection === 'notifications' && effectiveUser) {
      return (
        <NotificationCenterView
          notifications={notifications}
          currentUser={effectiveUser}
          onUpdateNotificationStatus={handleUpdateNotificationStatus}
          onNavigateSection={(sec) => setActiveSection(sec)}
        />
      );
    }

    if (
      activeSection === 'mon_dossier' &&
      effectiveUser &&
      canAccessSection(effectiveUser, 'mon_dossier')
    ) {
      return (
        <InscriptionView
          key={currentCandidate.id}
          candidate={currentCandidate}
          documents={applicationDocuments}
          pvs={interviewPvs}
          currentUser={effectiveUser}
          onUpdateCandidate={handleUpdateCandidate}
          onUploadDocument={handleUploadDocument}
          onTransitionState={(targetState, comment) =>
            handleTransitionApplication(currentCandidate, targetState, comment)
          }
          onOpenPdf={(type) => handleOpenPdf(type, currentCandidate)}
          onOpenOtpModal={() => setOtpModalOpen(true)}
          onNavigateToCatalogue={() => setActiveSection('catalogue')}
        />
      );
    }

    if (
      activeSection === 'reinscription' &&
      effectiveUser &&
      canAccessSection(effectiveUser, 'reinscription')
    ) {
      return (
        <ReinscriptionView
          key={currentCandidate.id}
          reregistrations={reregistrations}
          onUpdateReRegistration={handleUpdateReRegistration}
          onOpenPdf={handleOpenPdf}
          currentCandidate={currentCandidate}
        />
      );
    }

    if (
      (activeSection === 'candidatures_encadrant' ||
        activeSection === 'mes_sujets' ||
        activeSection === 'pv_entretiens' ||
        activeSection === 'relances_encadrant') &&
      effectiveUser &&
      canAccessSection(effectiveUser, activeSection)
    ) {
      return (
        <EncadrantView
          activeSection={activeSection}
          currentUser={effectiveUser}
          subjects={subjects}
          candidates={candidates}
          documents={applicationDocuments}
          interviewPvs={interviewPvs}
          relances={relances}
          onAddSubject={handleAddSubject}
          onTransitionCandidate={handleTransitionApplication}
          onReviewDocument={handleReviewDocument}
          onSubmitPv={handleSubmitPv}
          onSendRelance={handleSendRelance}
          onOpenPdf={(type, cand) => handleOpenPdf(type, cand)}
        />
      );
    }

    if (
      (activeSection === 'validation_pv' ||
        activeSection === 'validation_sujets' ||
        activeSection === 'validation_rapports' ||
        activeSection === 'profils_candidats') &&
      effectiveUser &&
      canAccessSection(effectiveUser, activeSection)
    ) {
      return (
        <StructureView
          activeSection={activeSection}
          currentUser={effectiveUser}
          subjects={subjects}
          interviewPvs={interviewPvs}
          reregistrations={reregistrations}
          candidates={candidates}
          onValidateSubject={handleValidateSubject}
          onValidatePv={handleValidatePv}
          onValidateReport={handleValidateReport}
          onOpenPdf={(type, cand) => handleOpenPdf(type, cand)}
          currentStructureName={
            effectiveUser.lab || 'Laboratoire Sciences Ingénierie et Gestion (LSIG)'
          }
        />
      );
    }

    if (
      (activeSection === 'gestion_comptes' ||
        activeSection === 'audit_logs' ||
        activeSection === 'universites_structures' ||
        activeSection === 'vue_globale') &&
      effectiveUser &&
      canAccessSection(effectiveUser, activeSection)
    ) {
      return (
        <AdminView
          activeSection={activeSection}
          currentUser={effectiveUser}
          userAccounts={userAccounts}
          subjects={subjects}
          candidates={candidates}
          auditLogs={auditLogs}
          onSaveAccountWithRoles={handleSaveAccountWithRoles}
          onToggleAccountStatus={handleToggleAccountStatus}
        />
      );
    }

    return (
      <PublicSubjectsCatalog
        subjects={subjects}
        selectedSubjects={selectedSubjects}
        onToggleSelectSubject={handleToggleSelectSubject}
        onApplySelected={handleApplySelected}
        onReorderSubjects={handleReorderSubjects}
        currentUser={effectiveUser}
        maxAllowed={3}
        canApply={!effectiveUser || hasPrivilege(effectiveUser, 'APPLICATION_CREATE')}
        calendarEvents={calendarEvents}
        onNavigateToCalendar={() => setActiveSection('calendrier')}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-200">
      <Header
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        currentUser={effectiveUser}
        onLogout={handleLogout}
        candidate={currentCandidate}
        unreadNotificationsCount={unreadNotificationsCount}
        isPreviewMode={previewActorRole !== null}
        onExitPreview={() => {
          setPreviewActorRole(null);
          setActiveSection(getDefaultSectionForUser(currentUser));
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div className="py-16 flex items-center justify-center text-xs text-stone-500 dark:text-stone-400">
              Chargement de l’espace...
            </div>
          }
        >
          {renderMainContent()}
        </Suspense>
      </main>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${
            toast.isError
              ? 'bg-rose-700 text-white border-rose-600'
              : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200'
          }`}
        >
          {toast.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-700 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        targetSubject={selectedSubjects[0] || null}
        targetSubjects={selectedSubjects}
        onAuthSuccess={handleAuthSuccess}
      />

      <Suspense fallback={null}>
        {pdfModalOpen && (
          <PdfPreviewModal
            isOpen={pdfModalOpen}
            onClose={() => setPdfModalOpen(false)}
            documentType={pdfDocType}
            candidate={activePdfCandidate}
            reregistration={activePdfReRegistration}
          />
        )}

        {otpModalOpen && (
          <OtpSignatureModal
            isOpen={otpModalOpen}
            onClose={() => setOtpModalOpen(false)}
            documentTitle="Fiche d'Inscription, Charte des Thèses & Engagement sur l'Honneur"
            signatoryName={effectiveUser?.fullName || currentCandidate.fullName}
            signatoryRole={`Candidat Doctorat (CIN: ${effectiveUser?.cin || currentCandidate.cin})`}
            onSignComplete={handleOtpSignComplete}
          />
        )}
      </Suspense>

      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-6 text-xs text-stone-500 dark:text-stone-400 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-stone-900 dark:text-white">GCD</span>
            <span aria-hidden="true">·</span>
            <span>Plateforme de Gestion du Cycle Doctoral</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Décret 1886.23 & Loi 09-08 CNDP</span>
            <span aria-hidden="true">·</span>
            <span>Universités du Royaume du Maroc</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
