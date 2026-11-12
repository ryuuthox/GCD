import type {
  ApplicationDocument,
  ApplicationState,
  Candidate,
  DocumentTypeKey,
  DocumentValidationStatus,
  InterviewPv,
  Privilege,
  UserProfile
} from '../domain/types';

async function fetchJsonWithTimeout(url: string, body: unknown, timeoutMs = 2500): Promise<{ ok: boolean; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function validateTransitionOnServer(params: {
  user: Pick<UserProfile, 'roles' | 'active'> | null;
  application: Candidate;
  targetState: ApplicationState;
  documents: ApplicationDocument[];
  pvs: InterviewPv[];
}): Promise<{ allowed: boolean; reason?: string; event?: string; label?: string }> {
  const { ok, data } = await fetchJsonWithTimeout('/api/applications/validate-transition', params);
  if (!ok) {
    return {
      allowed: false,
      reason: data.reason || data.error || 'Transition refusée par le serveur.'
    };
  }
  return data;
}

export async function validateDocumentMetadataOnServer(params: {
  user: Pick<UserProfile, 'roles' | 'active'> | null;
  docType: DocumentTypeKey;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}): Promise<{ valid: boolean; error?: string; label?: string }> {
  const { ok, data } = await fetchJsonWithTimeout('/api/documents/validate-metadata', params);
  if (!ok) {
    return {
      valid: false,
      error: data.error || 'Métadonnées de document invalides.'
    };
  }
  return data;
}

export async function validateDocumentReviewOnServer(params: {
  user: Pick<UserProfile, 'roles' | 'active'> | null;
  status: DocumentValidationStatus;
  rejectionReason?: string;
}): Promise<{ valid: boolean; error?: string }> {
  const { ok, data } = await fetchJsonWithTimeout('/api/documents/validate-review', params);
  if (!ok) {
    return {
      valid: false,
      error: data.error || 'Décision de vérification refusée.'
    };
  }
  return data;
}

export async function checkRbacOnServer(params: {
  user: Pick<UserProfile, 'roles' | 'active'> | null;
  requiredPrivilege: Privilege;
}): Promise<{ authorized: boolean; privileges: Privilege[] }> {
  const { data } = await fetchJsonWithTimeout('/api/rbac/check', params);
  return data;
}
