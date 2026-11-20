import { GcdRole, GcdSection, Privilege, RoleDefinition, UserProfile } from './types';

export const ROLE_DEFINITIONS: Record<GcdRole, RoleDefinition> = {
  candidat: {
    id: 'candidat',
    label: 'Candidat Doctorant',
    description: 'Consultation du catalogue, dépôt de candidature (3 vœux max), suivi du dossier et réinscription.',
    badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    privileges: [
      'CATALOG_VIEW',
      'APPLICATION_CREATE',
      'APPLICATION_EDIT_OWN',
      'APPLICATION_SUBMIT',
      'DOCUMENT_UPLOAD_OWN',
      'REPORT_SUBMIT_OWN'
    ]
  },
  enseignant: {
    id: 'enseignant',
    label: 'Enseignant / Encadrant',
    description: 'Proposition de sujets, examen des dossiers assignés, vérification documentaire et participation aux jurys.',
    badgeColor: 'bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300',
    privileges: [
      'CATALOG_VIEW',
      'APPLICATION_VIEW_ASSIGNED',
      'DOCUMENT_VALIDATE',
      'INTERVIEW_SCHEDULE',
      'PV_WRITE',
      'SUBJECT_PROPOSE',
      'NOTIFICATION_SEND',
      'LIFECYCLE_ADVANCE'
    ]
  },
  directeur_these: {
    id: 'directeur_these',
    label: 'Directeur de Thèse',
    description: 'Direction principale de thèse, sélection finale des candidats, rédaction des PV et validation académique.',
    badgeColor: 'bg-teal-100 text-teal-900 dark:bg-teal-900/60 dark:text-teal-200',
    privileges: [
      'CATALOG_VIEW',
      'APPLICATION_VIEW_ASSIGNED',
      'DOCUMENT_VALIDATE',
      'INTERVIEW_SCHEDULE',
      'PV_WRITE',
      'SUBJECT_PROPOSE',
      'NOTIFICATION_SEND',
      'LIFECYCLE_ADVANCE',
      'LIFECYCLE_REJECT'
    ]
  },
  co_encadrant: {
    id: 'co_encadrant',
    label: 'Co-encadrant',
    description: 'Co-direction scientifique, examen des pièces justificatives et avis consultatif sur les entretiens.',
    badgeColor: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
    privileges: [
      'CATALOG_VIEW',
      'APPLICATION_VIEW_ASSIGNED',
      'DOCUMENT_VALIDATE',
      'PV_WRITE',
      'NOTIFICATION_SEND',
      'LIFECYCLE_ADVANCE'
    ]
  },
  directeur_structure: {
    id: 'directeur_structure',
    label: 'Directeur de Structure',
    description: 'Visa des PV d’entretiens, validation des sujets de laboratoire, validation des rapports annuels et inscription finale.',
    badgeColor: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200',
    privileges: [
      'CATALOG_VIEW',
      'APPLICATION_VIEW_ALL',
      'DOCUMENT_VALIDATE',
      'PV_VALIDATE_STRUCTURE',
      'SUBJECT_VALIDATE_STRUCTURE',
      'REPORT_VALIDATE_STRUCTURE',
      'NOTIFICATION_SEND',
      'CALENDAR_MANAGE',
      'LIFECYCLE_ADVANCE',
      'LIFECYCLE_REJECT'
    ]
  },
  admin: {
    id: 'admin',
    label: 'Administrateur Central',
    description: 'Gestion complète des comptes, attribution multi-rôles, calendrier de campagne et consultation du journal d’audit.',
    badgeColor: 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300',
    privileges: [
      'CATALOG_VIEW',
      'APPLICATION_VIEW_ALL',
      'CALENDAR_MANAGE',
      'AUDIT_VIEW',
      'USER_MANAGE',
      'ROLE_ASSIGN'
    ]
  }
};

export function normalizeRoles(input: unknown): GcdRole[] {
  const validRoles: GcdRole[] = [
    'candidat',
    'enseignant',
    'directeur_these',
    'co_encadrant',
    'directeur_structure',
    'admin'
  ];

  const mapAlias = (r: string): GcdRole | null => {
    if (r === 'encadrant') return 'directeur_these';
    if ((validRoles as string[]).includes(r)) return r as GcdRole;
    return null;
  };

  if (Array.isArray(input)) {
    const mapped = input
      .map((item) => (typeof item === 'string' ? mapAlias(item) : null))
      .filter((r): r is GcdRole => r !== null);
    return mapped.length > 0 ? Array.from(new Set(mapped)) : ['candidat'];
  }

  if (typeof input === 'string') {
    const mapped = mapAlias(input);
    return mapped ? [mapped] : ['candidat'];
  }

  return ['candidat'];
}

export function getUserPrivileges(user?: Pick<UserProfile, 'roles' | 'active'> | null): Set<Privilege> {
  if (!user || user.active === false) {
    return new Set<Privilege>(['CATALOG_VIEW']);
  }

  const privileges = new Set<Privilege>();
  const roles = normalizeRoles(user.roles);

  for (const role of roles) {
    const def = ROLE_DEFINITIONS[role];
    if (def) {
      def.privileges.forEach((p) => privileges.add(p));
    }
  }

  return privileges;
}

export function hasPrivilege(
  user: Pick<UserProfile, 'roles' | 'active'> | null | undefined,
  privilege: Privilege
): boolean {
  if (!user || user.active === false) {
    return privilege === 'CATALOG_VIEW';
  }
  return getUserPrivileges(user).has(privilege);
}

export function hasAnyPrivilege(
  user: Pick<UserProfile, 'roles' | 'active'> | null | undefined,
  required: Privilege[]
): boolean {
  if (!user || user.active === false) {
    return required.includes('CATALOG_VIEW');
  }
  const userPrivs = getUserPrivileges(user);
  return required.some((p) => userPrivs.has(p));
}

export const SECTION_REQUIRED_PRIVILEGES: Record<GcdSection, Privilege[]> = {
  catalogue: ['CATALOG_VIEW'],
  mon_dossier: ['APPLICATION_CREATE', 'APPLICATION_EDIT_OWN'],
  reinscription: ['REPORT_SUBMIT_OWN'],
  calendrier: ['CATALOG_VIEW'],
  notifications: [
    'APPLICATION_CREATE',
    'APPLICATION_VIEW_ASSIGNED',
    'PV_VALIDATE_STRUCTURE',
    'USER_MANAGE',
    'AUDIT_VIEW'
  ],
  candidatures_encadrant: ['APPLICATION_VIEW_ASSIGNED'],
  mes_sujets: ['SUBJECT_PROPOSE'],
  pv_entretiens: ['PV_WRITE'],
  relances_encadrant: ['INTERVIEW_SCHEDULE', 'PV_WRITE'],
  validation_pv: ['PV_VALIDATE_STRUCTURE'],
  validation_sujets: ['SUBJECT_VALIDATE_STRUCTURE'],
  validation_rapports: ['REPORT_VALIDATE_STRUCTURE'],
  profils_candidats: ['PV_VALIDATE_STRUCTURE', 'REPORT_VALIDATE_STRUCTURE'],
  gestion_comptes: ['USER_MANAGE', 'ROLE_ASSIGN'],
  audit_logs: ['AUDIT_VIEW'],
  universites_structures: ['USER_MANAGE'],
  vue_globale: ['APPLICATION_VIEW_ALL', 'AUDIT_VIEW']
};

export function canAccessSection(
  user: Pick<UserProfile, 'roles' | 'active'> | null | undefined,
  section: GcdSection
): boolean {
  if (section === 'catalogue' || section === 'calendrier') {
    return true;
  }
  if (!user || user.active === false) {
    return false;
  }
  const required = SECTION_REQUIRED_PRIVILEGES[section];
  return hasAnyPrivilege(user, required);
}

export function getDefaultSectionForUser(
  user: Pick<UserProfile, 'roles' | 'active'> | null | undefined
): GcdSection {
  if (!user) return 'catalogue';
  if (hasPrivilege(user, 'USER_MANAGE')) return 'gestion_comptes';
  if (hasPrivilege(user, 'PV_VALIDATE_STRUCTURE')) return 'validation_pv';
  if (hasPrivilege(user, 'APPLICATION_VIEW_ASSIGNED')) return 'candidatures_encadrant';
  if (hasPrivilege(user, 'APPLICATION_CREATE')) return 'mon_dossier';
  return 'catalogue';
}
