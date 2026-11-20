import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { normalizeRoles } from '../domain/rbac';
import type {
  ApplicationDocument,
  AuditLogEntry,
  Candidate,
  DoctoralCalendarEvent,
  DoctoralSubject,
  GcdRole,
  InterviewPv,
  ManualRelance,
  NotificationItem,
  ReRegistration,
  UserAccount,
  UserProfile
} from '../domain/types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'ryuuthox@gmail.com';

const DEMO_SEED_IDS = new Set([
  'CAND-001',
  'CAND-002',
  'CAND-003',
  'DOC-001',
  'DOC-002',
  'DOC-003',
  'DOC-004',
  'DOC-005',
  'DOC-006',
  'DOC-007',
  'DOC-008',
  'PV-2026-001',
  'PV-2026-002',
  'REINSC-2026-01',
  'REL-001',
  'REL-002'
]);

async function canWriteTargetDoc(collectionName: string, docId: string): Promise<boolean> {
  if (!DEMO_SEED_IDS.has(docId)) return true;
  const email = auth.currentUser?.email?.trim().toLowerCase() || '';
  if (email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists();
  } catch {
    return false;
  }
}

// Recursively remove undefined keys so Firestore never rejects payloads
export function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

function sanitizeLegacyString(input: string): string {
  if (!/(hachmoud|adil\.hachmoud|\bpr\.?\s*adil\b|\badil\s+hachmoud\b)/i.test(input)) {
    return input;
  }
  return input
    .replace(/adil\.hachmoud@usmba\.ac\.ma/gi, 'driss.alaoui@usmba.ac.ma')
    .replace(/adil\.hachmoud/gi, 'driss.alaoui')
    .replace(/\bPr\.?\s*Adil\s+HACHMOUD\b/gi, 'Pr. Driss ALAOUI')
    .replace(/\bPr\.?\s*HACHMOUD\s+Adil\b/gi, 'Pr. Driss ALAOUI')
    .replace(/\bHACHMOUD\s+ADIL\b/g, 'ALAOUI DRISS')
    .replace(/\bADIL\s+HACHMOUD\b/g, 'DRISS ALAOUI')
    .replace(/\bHACHMOUD\s+Adil\b/g, 'ALAOUI DRISS')
    .replace(/\bAdil\s+HACHMOUD\b/g, 'Driss ALAOUI')
    .replace(/\b(?:Adil\s+Hachmoud|Hachmoud\s+Adil)\b/gi, 'Driss ALAOUI')
    .replace(/\bA\.?\s*Hachmoud\b/gi, 'D. Alaoui')
    .replace(/\bPr\.?\s*Adil\b/gi, 'Pr. Driss')
    .replace(/\bHACHMOUD\b/g, 'ALAOUI')
    .replace(/\bHachmoud\b/gi, 'Alaoui');
}

function sanitizeLegacyNamesDeep<T>(value: T): { cleaned: T; changed: boolean } {
  if (typeof value === 'string') {
    const next = sanitizeLegacyString(value);
    return { cleaned: next as unknown as T, changed: next !== value };
  }
  if (Array.isArray(value)) {
    let anyChanged = false;
    const nextArr = value.map((item) => {
      const res = sanitizeLegacyNamesDeep(item);
      if (res.changed) anyChanged = true;
      return res.cleaned;
    });
    return { cleaned: (anyChanged ? nextArr : value) as unknown as T, changed: anyChanged };
  }
  if (value !== null && typeof value === 'object') {
    let anyChanged = false;
    const nextObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const res = sanitizeLegacyNamesDeep(v);
      if (res.changed) anyChanged = true;
      nextObj[k] = res.cleaned;
    }
    return { cleaned: (anyChanged ? nextObj : value) as T, changed: anyChanged };
  }
  return { cleaned: value, changed: false };
}

function healMigratedDocIfAuthorized<T extends object>(
  collectionName: string,
  docId: string,
  cleanedData: T,
  allowNonAdminOwner = false
): void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const isBootstrapped = user.email?.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
  if (!isBootstrapped && !allowNonAdminOwner) return;
  void setDoc(
    doc(db, collectionName, docId),
    stripUndefined(cleanedData) as Record<string, unknown>,
    { merge: true }
  ).catch(() => {
    // Silent best-effort migration
  });
}

export async function getUserProfileDoc(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      if (uid.startsWith('test-')) {
        const emailMap: Record<string, string> = {
          'test-candidat': 'candidat@gmail.com',
          'test-enseignant': 'enseignant@gmail.com',
          'test-dirthese': 'dirthese@gmail.com',
          'test-coencadrant': 'coencadrant@gmail.com',
          'test-dirstructure': 'dirstructure@gmail.com'
        };
        const email = emailMap[uid] || `${uid.replace('test-', '')}@gmail.com`;
        const preauth = await findPreauthorizedAccountByEmail(email);
        if (preauth) {
          return {
            uid,
            email,
            fullName: preauth.fullName,
            roles: preauth.roles,
            title: preauth.title,
            university: preauth.university,
            school: preauth.school,
            lab: preauth.lab,
            active: true,
            createdAt: new Date().toISOString()
          };
        }
      }
      return null;
    }
    const raw = snap.data();
    const { cleaned, changed } = sanitizeLegacyNamesDeep(raw as UserProfile);
    if (changed) {
      healMigratedDocIfAuthorized('users', uid, cleaned, auth.currentUser?.uid === uid);
    }
    return {
      ...cleaned,
      uid,
      roles: normalizeRoles(cleaned.roles || (cleaned as unknown as { role?: GcdRole }).role),
      active: cleaned.active !== false
    };
  } catch (err) {
    if (uid.startsWith('test-')) {
      const emailMap: Record<string, string> = {
        'test-candidat': 'candidat@gmail.com',
        'test-enseignant': 'enseignant@gmail.com',
        'test-dirthese': 'dirthese@gmail.com',
        'test-coencadrant': 'coencadrant@gmail.com',
        'test-dirstructure': 'dirstructure@gmail.com'
      };
      const email = emailMap[uid] || `${uid.replace('test-', '')}@gmail.com`;
      return {
        uid,
        email,
        fullName: 'Utilisateur Test',
        roles: ['candidat'],
        active: true,
        createdAt: new Date().toISOString()
      };
    }
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function findPreauthorizedAccountByEmail(email: string): Promise<UserAccount | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const testAccountsMap: Record<string, { fullName: string; roles: GcdRole[]; title: string; lab: string; school: string }> = {
    'candidat@gmail.com': { fullName: 'Amine EL MANSOURI (Candidat Test)', roles: ['candidat'], title: 'Candidat Doctorant', lab: 'LSIG', school: 'EST Fès' },
    'enseignant@gmail.com': { fullName: 'Pr. Enseignant Test', roles: ['enseignant'], title: 'Professeur', lab: 'LSIG', school: 'EST Fès' },
    'dirthese@gmail.com': { fullName: 'Pr. Directeur Thèse Test', roles: ['directeur_these', 'enseignant'], title: 'PES', lab: 'LSIG', school: 'EST Fès' },
    'coencadrant@gmail.com': { fullName: 'Pr. Co-encadrant Test', roles: ['co_encadrant', 'enseignant'], title: 'PH', lab: 'LSIG', school: 'EST Fès' },
    'dirstructure@gmail.com': { fullName: 'Pr. Directeur Structure Test', roles: ['directeur_structure', 'directeur_these'], title: 'Directeur de Laboratoire', lab: 'LSIG', school: 'EST Fès' }
  };

  if (testAccountsMap[normalized]) {
    const acc = testAccountsMap[normalized];
    return {
      id: normalized,
      email: normalized,
      fullName: acc.fullName,
      role: acc.roles[0],
      roles: acc.roles,
      title: acc.title,
      university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
      school: acc.school,
      lab: acc.lab,
      active: true,
      createdAt: new Date().toISOString()
    };
  }

  try {
    const q = query(collection(db, 'userAccounts'), where('email', '==', normalized), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const { cleaned } = sanitizeLegacyNamesDeep(snap.docs[0].data() as UserAccount);
      return {
        ...cleaned,
        id: snap.docs[0].id,
        roles: normalizeRoles(cleaned.roles || cleaned.role)
      };
    }

    const grantSnap = await getDoc(doc(db, 'roleGrants', normalized));
    if (grantSnap.exists()) {
      const grantData = grantSnap.data() as {
        email: string;
        roles: GcdRole[];
        active: boolean;
      };
      const roles = normalizeRoles(grantData.roles);
      return {
        id: normalized,
        email: normalized,
        fullName: '',
        roles,
        role: roles[0],
        title: '',
        university: 'Université Sidi Mohamed Ben Abdellah (USMBA Fès)',
        school: '',
        lab: '',
        active: grantData.active !== false,
        createdAt: new Date().toISOString()
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveUserProfileDoc(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(profile);
    const payload = stripUndefined({
      ...cleaned,
      email: cleaned.email.trim().toLowerCase(),
      roles: normalizeRoles(cleaned.roles),
      active: cleaned.active !== false,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'users', profile.uid), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncAdminMarkerIfAuthorized(uid: string, roles: GcdRole[]): Promise<void> {
  if (!roles.includes('admin')) return;
  try {
    await setDoc(
      doc(db, 'admins', uid),
      { uid, grantedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch {
    // Only bootstrapped or existing admins can create admin markers per firestore.rules
  }
}

export async function listSubjectsFromFirestore(): Promise<DoctoralSubject[] | null> {
  try {
    const snap = await getDocs(collection(db, 'subjects'));
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as DoctoralSubject),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('subjects', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveSubjectDoc(subject: DoctoralSubject): Promise<void> {
  const path = `subjects/${subject.id}`;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(subject);
    await setDoc(doc(db, 'subjects', subject.id), stripUndefined(cleaned), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listCalendarEventsFromFirestore(): Promise<DoctoralCalendarEvent[] | null> {
  try {
    const snap = await getDocs(collection(db, 'calendarEvents'));
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as DoctoralCalendarEvent),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('calendarEvents', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveCalendarEventDoc(event: DoctoralCalendarEvent): Promise<void> {
  const path = `calendarEvents/${event.id}`;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(event);
    await setDoc(doc(db, 'calendarEvents', event.id), stripUndefined(cleaned), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCalendarEventDoc(eventId: string): Promise<void> {
  const path = `calendarEvents/${eventId}`;
  try {
    await deleteDoc(doc(db, 'calendarEvents', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function listCandidatesForUser(user: UserProfile): Promise<Candidate[] | null> {
  const path = 'candidates';
  try {
    const isStaff = user.roles.some((r) =>
      ['enseignant', 'directeur_these', 'co_encadrant', 'directeur_structure', 'admin'].includes(r)
    );
    const q = isStaff
      ? collection(db, 'candidates')
      : query(collection(db, 'candidates'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as Candidate),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('candidates', d.id, cleaned);
      }
      return cleaned;
    });
  } catch (err) {
    console.warn('Candidates fetch fallback:', err);
    return null;
  }
}

export async function saveCandidateDoc(candidate: Candidate): Promise<void> {
  const path = `candidates/${candidate.id}`;
  if (!(await canWriteTargetDoc('candidates', candidate.id))) return;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(candidate);
    await setDoc(
      doc(db, 'candidates', candidate.id),
      stripUndefined({
        ...cleaned,
        lastModifiedAt: new Date().toISOString()
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listDocumentsForUser(user: UserProfile): Promise<ApplicationDocument[] | null> {
  try {
    const isStaff = user.roles.some((r) =>
      ['enseignant', 'directeur_these', 'co_encadrant', 'directeur_structure', 'admin'].includes(r)
    );
    const q = isStaff
      ? collection(db, 'applicationDocuments')
      : query(collection(db, 'applicationDocuments'), where('uploadedByUid', '==', user.uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as ApplicationDocument),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('applicationDocuments', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveApplicationDocumentDoc(docItem: ApplicationDocument): Promise<void> {
  const path = `applicationDocuments/${docItem.id}`;
  if (!(await canWriteTargetDoc('applicationDocuments', docItem.id))) return;
  try {
    // Enforce Firestore 1MB safety: never write huge inline base64 previews over 500KB
    const { cleaned: safeItem } = sanitizeLegacyNamesDeep({ ...docItem });
    if (safeItem.previewDataUrl && safeItem.previewDataUrl.length > 650_000) {
      delete safeItem.previewDataUrl;
    }
    await setDoc(doc(db, 'applicationDocuments', docItem.id), stripUndefined(safeItem), {
      merge: true
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listInterviewPvsFromFirestore(): Promise<InterviewPv[] | null> {
  try {
    const snap = await getDocs(collection(db, 'interviewPvs'));
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as InterviewPv),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('interviewPvs', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveInterviewPvDoc(pv: InterviewPv): Promise<void> {
  const path = `interviewPvs/${pv.id}`;
  if (!(await canWriteTargetDoc('interviewPvs', pv.id))) return;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(pv);
    await setDoc(doc(db, 'interviewPvs', pv.id), stripUndefined(cleaned), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listRelancesFromFirestore(): Promise<ManualRelance[] | null> {
  try {
    const snap = await getDocs(collection(db, 'relances'));
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as ManualRelance),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('relances', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveRelanceDoc(relance: ManualRelance): Promise<void> {
  const path = `relances/${relance.id}`;
  if (!(await canWriteTargetDoc('relances', relance.id))) return;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(relance);
    await setDoc(doc(db, 'relances', relance.id), stripUndefined(cleaned), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listReRegistrationsForUser(user: UserProfile): Promise<ReRegistration[] | null> {
  try {
    const isStaff = user.roles.some((r) =>
      ['directeur_these', 'directeur_structure', 'admin'].includes(r)
    );
    const q = isStaff
      ? collection(db, 'reregistrations')
      : query(collection(db, 'reregistrations'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as ReRegistration),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('reregistrations', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveReRegistrationDoc(reg: ReRegistration): Promise<void> {
  const path = `reregistrations/${reg.id}`;
  if (!(await canWriteTargetDoc('reregistrations', reg.id))) return;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(reg);
    const payload =
      !DEMO_SEED_IDS.has(reg.id) && !cleaned.userId && auth.currentUser?.uid
        ? { ...cleaned, userId: auth.currentUser.uid }
        : cleaned;
    await setDoc(doc(db, 'reregistrations', reg.id), stripUndefined(payload), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listUserAccountsFromFirestore(): Promise<UserAccount[] | null> {
  try {
    const snap = await getDocs(collection(db, 'userAccounts'));
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep(d.data() as UserAccount);
      const normalized: UserAccount = {
        ...cleaned,
        id: d.id,
        roles: normalizeRoles(cleaned.roles || cleaned.role)
      };
      if (changed) {
        healMigratedDocIfAuthorized('userAccounts', d.id, normalized);
      }
      return normalized;
    });
  } catch {
    return null;
  }
}

export async function saveUserAccountDoc(account: UserAccount): Promise<void> {
  const path = `userAccounts/${account.id}`;
  const { cleaned: cleanedAccount } = sanitizeLegacyNamesDeep(account);
  const normalizedEmail = cleanedAccount.email.trim().toLowerCase();
  const normalizedRoles = normalizeRoles(cleanedAccount.roles || cleanedAccount.role);
  const isActive = cleanedAccount.active !== false;
  try {
    await setDoc(
      doc(db, 'userAccounts', cleanedAccount.id),
      stripUndefined({
        ...cleanedAccount,
        email: normalizedEmail,
        roles: normalizedRoles,
        role: normalizedRoles[0],
        active: isActive
      }),
      { merge: true }
    );

    await setDoc(
      doc(db, 'roleGrants', normalizedEmail),
      {
        email: normalizedEmail,
        roles: normalizedRoles,
        active: isActive,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Sync any already-registered user profile in /users matching this email
    try {
      const userSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(5))
      );
      await Promise.all(
        userSnap.docs.map(async (uDoc) => {
          await setDoc(
            doc(db, 'users', uDoc.id),
            stripUndefined({
              roles: normalizedRoles,
              active: isActive,
              title: cleanedAccount.title || undefined,
              university: cleanedAccount.university || undefined,
              school: cleanedAccount.school || undefined,
              lab: cleanedAccount.lab || undefined,
              updatedAt: new Date().toISOString()
            }),
            { merge: true }
          );
          if (normalizedRoles.includes('admin')) {
            await syncAdminMarkerIfAuthorized(uDoc.id, normalizedRoles);
          }
        })
      );
    } catch {
      // Non-bootstrapped admins still succeed via /roleGrants/{email} lookup at next login
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listAuditLogsFromFirestore(): Promise<AuditLogEntry[] | null> {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map((d) => sanitizeLegacyNamesDeep({ ...(d.data() as AuditLogEntry), id: d.id }).cleaned);
  } catch {
    return null;
  }
}

export async function appendAuditLogDoc(entry: AuditLogEntry): Promise<void> {
  const path = `auditLogs/${entry.id}`;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(entry);
    await setDoc(doc(db, 'auditLogs', entry.id), stripUndefined(cleaned));
  } catch (err) {
    // Non-blocking fallback when unprivileged user triggers audit trace in demo/offline context,
    // while still logging structured Firestore error for diagnostics
    console.warn('Audit log Firestore persistence note:', path, err);
  }
}

export async function listNotificationsForUser(user: UserProfile): Promise<NotificationItem[] | null> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientEmail', '==', user.email.trim().toLowerCase()),
      limit(100)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map((d) => {
      const { cleaned, changed } = sanitizeLegacyNamesDeep({
        ...(d.data() as NotificationItem),
        id: d.id
      });
      if (changed) {
        healMigratedDocIfAuthorized('notifications', d.id, cleaned);
      }
      return cleaned;
    });
  } catch {
    return null;
  }
}

export async function saveNotificationDoc(notif: NotificationItem): Promise<void> {
  const path = `notifications/${notif.id}`;
  try {
    const { cleaned } = sanitizeLegacyNamesDeep(notif);
    await setDoc(
      doc(db, 'notifications', notif.id),
      stripUndefined({
        ...cleaned,
        recipientEmail: cleaned.recipientEmail?.trim().toLowerCase()
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Notification Firestore persistence note:', path, err);
  }
}

export async function seedCatalogAndCalendarIfEmpty(
  initialSubjects: DoctoralSubject[],
  initialEvents: DoctoralCalendarEvent[]
): Promise<void> {
  try {
    const existingSubs = await getDocs(query(collection(db, 'subjects'), limit(1)));
    if (existingSubs.empty) {
      await Promise.all(initialSubjects.map((s) => saveSubjectDoc(s)));
    }
    const existingCal = await getDocs(query(collection(db, 'calendarEvents'), limit(1)));
    if (existingCal.empty) {
      await Promise.all(initialEvents.map((ev) => saveCalendarEventDoc(ev)));
    }
  } catch {
    // Safe no-op if current user does not have write rights to public catalog
  }
}
